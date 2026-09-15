# Ares AI Chat (desktop)

A retro Ares Galaxy-style chatroom window, running as a real desktop app
(Electron), with an LLM-powered chat participant called AI_Helper, plus an
experimental network panel for probing real Ares Galaxy supernodes.

## Requirements

- [Node.js](https://nodejs.org) 18 or newer (includes npm)
- An Anthropic API key from https://console.anthropic.com for the AI_Helper
  chat participant (not needed for the network probe panel)

## Run it in development

```bash
cd ares-ai-chat-desktop
npm install
npm start
```

Enter your API key in Settings when prompted to enable AI_Helper.

## Build a real installer (.exe / .app / .AppImage)

```bash
npm run dist
```

## Download a prebuilt installer

The latest Windows installer is available from GitHub Releases:
- https://github.com/AranaJones/Ares-Chat/releases

## What's real vs. simulated

**AI_Helper chat**: fully real - talks to the actual Anthropic API.

**"Browse Rooms" supernode flow**: this now includes:
- Loading supernode candidates from `SNodes.dat`
- Querying supernodes for room directory data
- Showing room IDs, optional user counts/categories, supernode latency, and
  join/copy actions
- Caching directory responses for a short window to avoid repeated requests to
  the same supernodes

The **Join** button currently opens a local chat tab for the selected room ID
inside this app UI. It does **not** yet authenticate to, or fully join, the
remote room session on the supernode.

You can:
- Paste `host:port` pairs manually if you have any from another source
- Load a real `SNodes.dat` file if you have an existing Ares Galaxy install
  (Windows only, `%localappdata%\ares\Data\SNodes.dat` typically)
- Click "Probe all" to see which ones respond

**What's still NOT implemented (and why)**: full authenticated supernode
session/login and protocol-complete room participation. That requires the full
client<->supernode handshake, which is encrypted with a keyed XOR stream
cipher family (`d64`/`d67` in the original source). `ares-crypto.js` implements
the `d64` variant as documented in a 2016 academic forensic paper on this exact
network, but the paper itself does not fully resolve the full live network
handshake.

If you want to push this further: capturing a real login handshake with
Wireshark against a live supernode (if any still exist) and comparing it
against `MSG_CLIENT_LOGIN_REQ` / `MSG_SUPERNODE_FIRST_LOG` in
`const_commands.pas` would be the way to actually finish it.

## Notes

- The Anthropic API key is stored in the app's local storage on your
  machine only.
- Conversation history resets each time you restart the app.

## Project structure

- `main.js` - Electron main process (window, IPC handlers for probing,
  loading SNodes.dat, and room-directory queries with caching)
- `preload.js` - exposes `window.aresNet` (probe/load/query) to the renderer
- `ares-crypto.js` - the d64 XOR stream cipher, with the discrepancy in the
  paper's worked example surfaced via `verifyD64()` rather than hidden
- `ares-nodes.js` - parses SNodes.dat text format and the binary node
  candidate wire format
- `index.html` - the UI and chat/network/browse-rooms logic
- `package.json` - dependencies and build config
