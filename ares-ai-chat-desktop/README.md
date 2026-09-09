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

## Windows launcher (.exe)

A lightweight native Windows launcher lives in `../windows-launcher/ares-chat`.
It opens a small desktop window with a `Launch Ares Chat` button and then:

1. starts a built `ares-ai-chat-desktop/dist/win-unpacked/Ares Chat.exe` when one exists, or
2. falls back to `npm start` inside `ares-ai-chat-desktop`.

Build the launcher into a Windows `.exe` with:

```bash
cd ../windows-launcher/ares-chat
dotnet publish -c Release -r win-x64 --self-contained false
```

The published launcher executable will be written under:

```
windows-launcher/ares-chat/bin/Release/net8.0-windows/win-x64/publish/ares-chat.exe
```

## Build a real installer (.exe / .app / .AppImage)

```bash
npm run dist
```

## What's real vs. simulated

**AI_Helper chat**: fully real - talks to the actual Anthropic API.

**"Network (supernodes)" panel**: this is a genuine, working implementation
of the *first* step the real Ares Galaxy client does - a plain TCP connect
check against a list of supernode IP:port pairs, to see which ones still
answer. This part needed no unverified crypto and matches
`tthread_check_supernode.connect()` in the real (GPL) Ares Galaxy source.

You can:
- Paste `host:port` pairs manually if you have any from another source
- Load a real `SNodes.dat` file if you have an existing Ares Galaxy install
  (Windows only, `%localappdata%\ares\Data\SNodes.dat` typically)
- Click "Probe all" to see which ones respond

**What's NOT implemented (and why)**: actually logging into a supernode and
joining/reading a chat room. That requires the full client<->supernode
handshake, which is encrypted with a keyed XOR stream cipher family
(`d64`/`d67` in the original source). `ares-crypto.js` implements the `d64`
variant as documented in a 2016 academic forensic paper on this exact
network - but that paper itself never fully solved the live network
handshake (only local file/registry encryption), and I could not locate the
specific source file (`thread_client.pas`) that shows the exact handshake
sequence and which key negotiates it. Building that blind would produce
code that looks complete but silently fails - so it's left undone rather
than faked.

If you want to push this further: capturing a real login handshake with
Wireshark against a live supernode (if any still exist) and comparing it
against `MSG_CLIENT_LOGIN_REQ` / `MSG_SUPERNODE_FIRST_LOG` in
`const_commands.pas` would be the way to actually finish it.

## Notes

- The Anthropic API key is stored in the app's local storage on your
  machine only.
- Conversation history resets each time you restart the app.

## Project structure

- `main.js` - Electron main process (window, IPC handlers for TCP probing
  and loading SNodes.dat)
- `preload.js` - exposes `window.aresNet` (probe/load) to the renderer
- `ares-crypto.js` - the d64 XOR stream cipher, with the discrepancy in the
  paper's worked example surfaced via `verifyD64()` rather than hidden
- `ares-nodes.js` - parses SNodes.dat text format and the binary node
  candidate wire format
- `index.html` - the UI and chat/network logic
- `package.json` - dependencies and build config
