# Optional HashLink tooling scaffold

This folder is an optional HashLink (Haxe HL) scaffold. It does **not** change
the main Ares Chat desktop runtime, which remains HTML/JavaScript + Electron.

## Prerequisites

- [Haxe](https://haxe.org/download/)
- [HashLink](https://hashlink.haxe.org/)
- `haxe` and `hl` available in your terminal `PATH`

## Platform notes

- **Windows**: install Haxe and HashLink, then open a new terminal so `haxe` and
  `hl.exe` are available.
- **macOS/Linux**: install via your package manager or official installers and
  verify `haxe --version` and `hl --version` both work.

## Usage

From `ares-ai-chat-desktop/`:

```bash
npm run hl:check
npm run hl:build-sample
npm run hl:run-sample
```

The sample compiles `Main.hx` to `tools/hashlink/hello.hl` and runs it.
