# Pionus Neovim Terminal Editor

VS Code extension from Pionus GmbH for opening the active file in Neovim inside
a terminal editor. It also provides current-file diagnostic navigation and
commands for opening and closing rendered previews.

## Requirements

- macOS 15 Sequoia or newer, on Intel or Apple Silicon
- Visual Studio Code 1.100 or newer
- Neovim available on `PATH` or in a standard Homebrew location

## Installation

From a checkout of the Pionus configuration repository, run:

```sh
./Common/vscode/install
```

The installer clones or fast-forwards this repository under
`${PIONUS_VSCODE_REPOS_DIR:-$HOME/clouds/github-dirk-deckert}` and creates the
versioned symlink in `${VSCODE_EXTENSIONS_DIR:-$HOME/.vscode/extensions}`.
After installation, run **Developer: Reload Window** in VS Code.

### Native VS Code keybinding

Open **Preferences: Open Keyboard Shortcuts (JSON)** and add a binding for the
extension command. This macOS example uses `cmd+k n`; replace the key with any
available native VS Code shortcut:

```jsonc
{
  "key": "cmd+k n",
  "command": "pionus.nvimTerminalEditor.openCurrentFile",
  "when": "editorTextFocus && resourceScheme == file"
}
```

### VSCodeVim `<leader>vim` binding

If VSCodeVim is installed, append this object to the existing
`vim.normalModeKeyBindingsNonRecursive` array in VS Code's `settings.json`:

```jsonc
"vim.normalModeKeyBindingsNonRecursive": [
  // Keep any existing mappings in this array.
  {
    "before": ["<leader>", "v", "i", "m"],
    "commands": ["pionus.nvimTerminalEditor.openCurrentFile"]
  }
]
```

`<leader>` uses the current VSCodeVim `vim.leader` setting. The extension does
not modify VSCodeVim settings automatically.

## Development

```sh
npm install
npm test
npm run package
```

## License

MIT. Copyright Pionus GmbH.
