# Ares Chat (desktop)

Ares Chat is a lightweight Ares conversation client built with Electron and
plain web technologies. The UI can also be opened directly in a browser from
`index.html` for immediate local use.

## Features

- Responsive chat interface with separate user, AI, and system message styling
- Local conversation persistence via browser/Electron local storage
- Editable local profile (display name and avatar text)
- Simulated AI replies with a clear integration point in `app.js`
- Typing indicator, timestamps, and one-click conversation reset

## Requirements

- [Node.js](https://nodejs.org) 18 or newer (includes npm) for Electron usage

## Run it in development

```bash
cd ares-ai-chat-desktop
npm install
npm start
```

## Open it immediately in a browser

Open `/home/runner/work/Ares-AI/Ares-AI/ares-ai-chat-desktop/index.html` in a
browser. No build step is required for the local chat demo.

## Build a desktop installer

```bash
npm run dist
```

## Project structure

- `main.js` - Electron main process and desktop window bootstrap
- `preload.js` - Electron preload bridge
- `index.html` - chat app markup
- `styles.css` - responsive chat styling
- `app.js` - chat state, persistence, and AI simulation logic
- `ares-crypto.js` - repository utility kept for future integrations
- `ares-nodes.js` - repository utility kept for future integrations
- `package.json` - dependencies and build config
