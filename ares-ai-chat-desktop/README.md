# Ares Chat (desktop)

A retro Ares Galaxy-style chatroom window, running as a desktop Electron app.
This build focuses on channel chat UI plus core Ares network/supernode utility
code used by the main process.

## Requirements

- [Node.js](https://nodejs.org) 18 or newer (includes npm)

## Run it in development

```bash
cd ares-ai-chat-desktop
npm install
npm start
```

## Build a real installer (.exe / .app / .AppImage)

```bash
npm run dist
```

## Notes

- Conversation history resets each time you restart the app.

## Project structure

- `main.js` - Electron main process (window, IPC handlers for TCP probing
  and loading SNodes.dat)
- `preload.js` - exposes `window.aresNet` (probe/load) to the renderer
- `ares-crypto.js` - the d64 XOR stream cipher, with the discrepancy in the
  paper's worked example surfaced via `verifyD64()` rather than hidden
- `ares-nodes.js` - parses SNodes.dat text format and the binary node
  candidate wire format
- `index.html` - the UI and chat logic
- `package.json` - dependencies and build config
