const fs = require("fs");
const path = require("path");
const vscode = require("vscode");

const NVIM_CANDIDATES = [
    "nvim",
    "/opt/homebrew/bin/nvim",
    "/usr/local/bin/nvim",
    "/usr/bin/nvim"
];

const MARKDOWN_LIKE_LANGUAGES = new Set([
    "markdown",
    "prompt",
    "instructions",
    "chatagent",
    "skill"
]);

const TEX_LIKE_LANGUAGES = new Set([
    "latex",
    "tex",
    "bibtex",
    "doctex",
    "latex-expl3"
]);

const IMAGE_LIKE_EXTENSIONS = new Set([
    ".avif",
    ".bmp",
    ".gif",
    ".ico",
    ".jpg",
    ".jpeg",
    ".png",
    ".svg",
    ".tif",
    ".tiff",
    ".webp"
]);

const PREVIEW_VIEW_TYPE_PATTERNS = [
    /markdown\.preview/i,
    /latex.*pdf/i,
    /pdf.*latex/i,
    /latex-workshop-pdf/i,
    /excalidraw/i,
    /imagePreview/i
];

function isExecutable(filePath) {
    try {
        fs.accessSync(filePath, fs.constants.X_OK);
        return true;
    } catch {
        return false;
    }
}

function resolveExecutable(name) {
    const pathValue = process.env.PATH || "";
    for (const directory of pathValue.split(path.delimiter)) {
        if (!directory) {
            continue;
        }

        const candidate = path.join(directory, name);
        if (isExecutable(candidate)) {
            return candidate;
        }
    }

    return undefined;
}

function resolveNvimPath() {
    for (const candidate of NVIM_CANDIDATES) {
        if (path.basename(candidate) === candidate) {
            const resolved = resolveExecutable(candidate);
            if (resolved) {
                return resolved;
            }
            continue;
        }

        if (isExecutable(candidate)) {
            return candidate;
        }
    }

    return undefined;
}

function toNvimByteColumn(lineText, utf16Column) {
    return Buffer.byteLength(lineText.slice(0, utf16Column), "utf8") + 1;
}

function localFilePath(document) {
    if (document.uri.scheme !== "file" && document.uri.scheme !== "vscode-userdata") {
        return undefined;
    }

    return document.uri.fsPath;
}

function compareDiagnostics(a, b) {
    const lineDelta = a.range.start.line - b.range.start.line;
    if (lineDelta !== 0) {
        return lineDelta;
    }

    const characterDelta = a.range.start.character - b.range.start.character;
    if (characterDelta !== 0) {
        return characterDelta;
    }

    return a.range.end.compareTo(b.range.end);
}

function diagnosticsForActiveEditor() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage("Open an editor before navigating diagnostics.");
        return undefined;
    }

    const diagnostics = vscode.languages
        .getDiagnostics(editor.document.uri)
        .filter((diagnostic) => diagnostic.range);

    diagnostics.sort(compareDiagnostics);

    return { editor, diagnostics };
}

function revealDiagnostic(editor, diagnostic) {
    const selection = new vscode.Selection(diagnostic.range.start, diagnostic.range.start);
    editor.selection = selection;
    editor.revealRange(diagnostic.range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
}

function registerDiagnosticNavigationCommand(context, command, selectDiagnostic) {
    context.subscriptions.push(vscode.commands.registerCommand(command, () => {
        const result = diagnosticsForActiveEditor();
        if (!result) {
            return;
        }

        const diagnostic = selectDiagnostic(result.diagnostics);
        if (!diagnostic) {
            vscode.window.showInformationMessage("No diagnostics in the current file.");
            return;
        }

        revealDiagnostic(result.editor, diagnostic);
    }));
}

function activeTabInput() {
    return vscode.window.tabGroups.activeTabGroup.activeTab?.input;
}

function activeResourceUri() {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        return editor.document.uri;
    }

    const input = activeTabInput();
    return input?.uri || undefined;
}

function activeResourcePath() {
    const uri = activeResourceUri();
    return uri?.scheme === "file" ? uri.fsPath : undefined;
}

function activeResourceExtension() {
    const filePath = activeResourcePath();
    return filePath ? path.extname(filePath).toLowerCase() : "";
}

function isExcalidrawPath(filePath) {
    return Boolean(filePath && (
        filePath.endsWith(".excalidraw") ||
        filePath.endsWith(".excalidraw.json")
    ));
}

async function openRenderedPreviewToSide() {
    const editor = vscode.window.activeTextEditor;
    const uri = activeResourceUri();
    const filePath = activeResourcePath();
    const extension = activeResourceExtension();
    const languageId = editor?.document.languageId;

    if (languageId && MARKDOWN_LIKE_LANGUAGES.has(languageId)) {
        await vscode.commands.executeCommand("markdown.showPreviewToSide");
        return;
    }

    if ((languageId && TEX_LIKE_LANGUAGES.has(languageId)) || extension === ".tex") {
        await vscode.commands.executeCommand("latex-workshop.view");
        return;
    }

    if (isExcalidrawPath(filePath)) {
        await vscode.commands.executeCommand("excalidraw.showEditorToSide");
        return;
    }

    if (uri && IMAGE_LIKE_EXTENSIONS.has(extension)) {
        await vscode.commands.executeCommand(
            "vscode.openWith",
            uri,
            "imagePreview.previewEditor",
            vscode.ViewColumn.Beside
        );
        return;
    }

    vscode.window.showInformationMessage("No rendered preview command is configured for the active file.");
}

function tabInputViewType(input) {
    if (!input || typeof input !== "object") {
        return "";
    }

    return String(input.viewType || "");
}

function tabInputKind(input) {
    return input?.constructor?.name || "";
}

function tabInputUri(input) {
    if (!input || typeof input !== "object") {
        return undefined;
    }

    return input.uri || undefined;
}

function isKnownRenderedPreviewTab(tab) {
    const input = tab.input;
    const viewType = tabInputViewType(input);
    if (PREVIEW_VIEW_TYPE_PATTERNS.some((pattern) => pattern.test(viewType))) {
        return true;
    }

    const uri = tabInputUri(input);
    if (!uri) {
        return false;
    }

    if (uri.scheme === "markdown" || uri.scheme === "vscode-markdown") {
        return true;
    }

    const filePath = uri.scheme === "file" ? uri.fsPath : "";
    const extension = path.extname(filePath).toLowerCase();
    const kind = tabInputKind(input);
    return kind !== "TabInputText" && (
        isExcalidrawPath(filePath) ||
        IMAGE_LIKE_EXTENSIONS.has(extension)
    );
}

async function closeRenderedPreview() {
    const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
    if (activeTab && isKnownRenderedPreviewTab(activeTab)) {
        await vscode.window.tabGroups.close(activeTab);
        return;
    }

    for (const group of vscode.window.tabGroups.all) {
        const tab = group.tabs.find(isKnownRenderedPreviewTab);
        if (tab) {
            await vscode.window.tabGroups.close(tab);
            return;
        }
    }

    vscode.window.showInformationMessage("No rendered preview tab is open.");
}

function activate(context) {
    const disposable = vscode.commands.registerCommand(
        "pionus.nvimTerminalEditor.openCurrentFile",
        async () => {
            const editor = vscode.window.activeTextEditor;
            const filePath = editor ? localFilePath(editor.document) : undefined;
            if (!editor || !filePath) {
                vscode.window.showWarningMessage("Open a local saved file before launching Neovim.");
                return;
            }

            const nvimPath = resolveNvimPath();
            if (!nvimPath) {
                vscode.window.showWarningMessage("Neovim was not found on PATH or in common install locations.");
                return;
            }

            if (editor.document.isDirty) {
                const saved = await editor.document.save();
                if (!saved) {
                    vscode.window.showWarningMessage("Save the file before launching Neovim.");
                    return;
                }
            }

            const sourceUri = editor.document.uri;
            const sourceViewColumn = editor.viewColumn || vscode.ViewColumn.Active;
            const sourceSelection = editor.selection;
            const cursor = editor.selection.active;
            const line = cursor.line + 1;
            const lineText = editor.document.lineAt(cursor.line).text;
            const byteColumn = toNvimByteColumn(lineText, cursor.character);
            const terminal = vscode.window.createTerminal({
                name: `nvim ${path.basename(filePath)}`,
                shellPath: nvimPath,
                shellArgs: [
                    "-c",
                    `call cursor(${line}, ${byteColumn})`,
                    filePath
                ],
                location: {
                    viewColumn: vscode.ViewColumn.Active
                },
                isTransient: true
            });

            const closeDisposable = vscode.window.onDidCloseTerminal(async (closedTerminal) => {
                if (closedTerminal !== terminal) {
                    return;
                }

                closeDisposable.dispose();

                await vscode.window.showTextDocument(sourceUri, {
                    viewColumn: sourceViewColumn,
                    preserveFocus: false,
                    selection: sourceSelection
                });
            });

            terminal.show();
        }
    );

    context.subscriptions.push(disposable);
    registerDiagnosticNavigationCommand(
        context,
        "pionus.nvimDiagnostics.goToFirst",
        (diagnostics) => diagnostics[0]
    );
    registerDiagnosticNavigationCommand(
        context,
        "pionus.nvimDiagnostics.goToLast",
        (diagnostics) => diagnostics[diagnostics.length - 1]
    );
    context.subscriptions.push(vscode.commands.registerCommand(
        "pionus.renderedPreview.openToSide",
        openRenderedPreviewToSide
    ));
    context.subscriptions.push(vscode.commands.registerCommand(
        "pionus.renderedPreview.close",
        closeRenderedPreview
    ));
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
