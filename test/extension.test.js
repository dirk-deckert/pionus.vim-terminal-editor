const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const Module = require("node:module");

const originalLoad = Module._load;
Module._load = function mockVscode(request, parent, isMain) {
    if (request === "vscode") {
        return {};
    }
    return originalLoad.call(this, request, parent, isMain);
};
const { __test } = require("../extension.js");
Module._load = originalLoad;

test("manifest exposes the renamed identity and Vim/Neovim selection", () => {
    const manifest = require("../package.json");
    const configuration = manifest.contributes.configuration.properties;
    const commandIds = manifest.contributes.commands.map(({ command }) => command);
    const commandTitles = manifest.contributes.commands.map(({ title }) => title);

    assert.equal(`${manifest.publisher}.${manifest.name}`, "pionus.vim-terminal-editor");
    assert.equal(manifest.displayName, "Pionus Vim Terminal Editor");
    assert.equal(manifest.contributes.configuration.title, "Pionus Vim Terminal Editor");
    assert.ok(commandTitles.every((title) => title.startsWith("Pionus Vim Terminal Editor: ")));
    assert.deepEqual(configuration["pionus.vimTerminalEditor.editor"].enum, ["vim", "nvim"]);
    assert.equal(configuration["pionus.vimTerminalEditor.editor"].default, "vim");
    assert.ok(commandIds.includes("pionus.vimTerminalEditor.openCurrentFile"));
    assert.ok(manifest.activationEvents.includes("onCommand:pionus.nvimTerminalEditor.openCurrentFile"));
});

test("converts UTF-16 cursor positions to Vim UTF-8 byte columns", () => {
    assert.equal(__test.toEditorByteColumn("aéb", 2), 4);
});

test("accepts local and VS Code userdata paths only", () => {
    assert.equal(__test.localFilePath({ uri: { scheme: "file", fsPath: "/tmp/a b.md" } }), "/tmp/a b.md");
    assert.equal(__test.localFilePath({ uri: { scheme: "untitled", fsPath: "/tmp/a" } }), undefined);
});

test("discovers configured Vim and Neovim executables through PATH", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pionus vim "));
    const nvimExecutable = path.join(directory, "nvim-test");
    const vimExecutable = path.join(directory, "vim-test");
    fs.writeFileSync(nvimExecutable, "#!/bin/sh\nexit 0\n", { mode: 0o755 });
    fs.writeFileSync(vimExecutable, "#!/bin/sh\nexit 0\n", { mode: 0o755 });
    const oldPath = process.env.PATH;
    process.env.PATH = directory;
    try {
        assert.equal(__test.resolveExecutable("nvim-test"), nvimExecutable);
        assert.equal(__test.resolveEditorPath("nvim", ["nvim-test"]), nvimExecutable);
        assert.equal(__test.resolveEditorPath("vim", ["vim-test"]), vimExecutable);
        assert.equal(__test.resolveEditorPath("unknown"), undefined);
    } finally {
        process.env.PATH = oldPath;
        fs.rmSync(directory, { recursive: true });
    }
});

test("recognizes Excalidraw resources", () => {
    assert.equal(__test.isExcalidrawPath("drawing.excalidraw"), true);
    assert.equal(__test.isExcalidrawPath("drawing.excalidraw.json"), true);
    assert.equal(__test.isExcalidrawPath("drawing.json"), false);
});
