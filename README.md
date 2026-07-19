# Pionus Vim Terminal Editor

VS Code extension from Pionus GmbH for opening the active file in Vim or Neovim
inside a terminal editor. It also provides current-file diagnostic navigation
and commands for opening and closing rendered previews.

## Requirements

- macOS 15 Sequoia or newer, on Intel or Apple Silicon
- Visual Studio Code 1.100 or newer
- Vim or Neovim available on `PATH` or in a standard macOS/Homebrew location

## Editor selection

Vim is the default. To select it explicitly in VS Code's `settings.json`:

```json
{
  "pionus.vimTerminalEditor.editor": "vim"
}
```

To use Neovim instead:

```json
{
  "pionus.vimTerminalEditor.editor": "nvim"
}
```

## Keybindings

Bind the command directly in VS Code's `keybindings.json`:

```json
{
  "key": "ctrl+alt+v",
  "command": "pionus.vimTerminalEditor.openCurrentFile",
  "when": "editorTextFocus"
}
```

With VSCodeVim, add an entry to `vim.normalModeKeyBindingsNonRecursive` in
`settings.json`:

```json
{
  "before": ["<leader>", "v", "i", "m"],
  "commands": ["pionus.vimTerminalEditor.openCurrentFile"]
}
```

## Development

```sh
npm install
npm test
npm run package
```

The Pionus configuration repository clones or updates this repository under
`${PIONUS_VSCODE_REPOS_DIR:-$HOME/clouds/github-dirk-deckert}`, downloads the
matching GitHub Release VSIX, and registers it through the official VS Code CLI.

## License

MIT. Copyright Pionus GmbH.
