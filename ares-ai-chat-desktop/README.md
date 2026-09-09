# Ares AI Chat (desktop)

A retro Ares Galaxy-style chatroom window, running as a real desktop app
(Electron), with local simulated rooms plus a live Ares Galaxy room flow that
can:

- log into a real supernode using the official prelogin/login handshake
- load real room targets from a community-maintained `rooms.json` feed or
  plain `arlnk://chatroom:host:port|room` links
- validate a room over the UDP room-list protocol
- open a real room TCP session and read live topic, user-list, join/part, and
  public chat traffic

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

**Supernode login**: the desktop app now implements the real Ares Galaxy
prelogin/login handshake used by the official Delphi client for newer
supernodes (`MSG_CLIENT_FIRST_LOG`, `MSG_CLIENT_LOGIN_REQ`, `d3a`, `e1/d1`).
You can enter a `host:port` manually or load a real `SNodes.dat` and let the
app try those candidates.

You can:
- Enter a supernode `host:port` manually and click **Login node**
- Load a real `SNodes.dat` file if you have an existing Ares Galaxy install
  (Windows only, `%localappdata%\\ares\\Data\\SNodes.dat` typically)
- Let the app try loaded supernode candidates with **Try loaded node list**

**Live room join**: the desktop app can now join a real Ares-compatible room
target once you know its `host:port`:

- Load live rooms from the default AresFix `rooms.json` feed, or
- Paste a plain `arlnk://chatroom:host:port|room` link (or `host:port|room`)

When you click a live room, the app:

1. optionally verifies a real supernode session first
2. validates the room over the UDP room-list protocol (`SENDINFO`/`ACKINFO`)
3. opens a room TCP socket
4. sends a real room login packet
5. renders live topic, roster, join/part, and public chat events in the UI

**What is still intentionally limited**:

- legacy `MSG_SERVER_PRELOGIN_OK` supernodes are still not implemented
- room crypto/key exchange (`AdvancedFeatures` / `ServerCryptoKey`) is not yet
  implemented, so the live room client currently uses plaintext room login
- sending messages into a live room is still disabled until the client->room
  public-message payload is verified against live traffic or additional source
  references

## Notes

- The Anthropic API key is stored in the app's local storage on your
  machine only.
- Conversation history resets each time you restart the app.
- The default live room feed URL is
  `https://raw.githubusercontent.com/lexicon06/AresFix/main/rooms.json`.

## Project structure

- `main.js` - Electron main process (window, IPC handlers for supernode login,
  live room validation, room join, and loading `SNodes.dat`)
- `preload.js` - exposes `window.aresNet` APIs to the renderer
- `ares-crypto.js` - the d64 XOR stream cipher, with the discrepancy in the
  paper's worked example surfaced via `verifyD64()` rather than hidden
- `ares-supernode.js` - official supernode prelogin/login packet handling
- `ares-chatrooms.js` - live room feed parsing and UDP room validation
- `ares-room-client.js` - live room TCP login and inbound event parsing
- `ares-nodes.js` - parses SNodes.dat text format and the binary node
  candidate wire format
- `index.html` - the local simulated chat UI plus the live Ares room controls
- `package.json` - dependencies and build config
