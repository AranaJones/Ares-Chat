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

By default the desktop app now also starts a bundled WebSocket relay for the
real `#ares-live` room on `ws://127.0.0.1:34567/ares-live`, so multiple app
windows on the same machine can join the same live channel immediately.

## Build a real installer (.exe / .app / .AppImage)

```bash
npm run dist
```

The bundled `#ares-live` relay is included in the packaged app, so the
installer workflow stays the same.

## Download a prebuilt installer

The latest Windows installer is available from GitHub Releases:
- https://github.com/AranaJones/Ares-Chat/releases

## Live channel

`#ares-live` is a real shared channel backed by a small WebSocket relay:

- Open two copies of the desktop app and join `#ares-live` to see messages
  appear in both windows in real time.
- The other channels remain local-only, just like before.
- In **Settings**, you can optionally point the live channel at another relay
  URL (for example a relay running on a different PC).

To run the relay by itself for other machines on your network:

```bash
cd ares-ai-chat-desktop
npm install
npm run live-channel-server -- --host 0.0.0.0 --port 34567
```

Then set **Live channel server URL** in each app instance to:

```text
ws://YOUR_HOST_OR_IP:34567/ares-live
```

## What's real vs. simulated

**AI_Helper chat**: fully real - talks to the actual Anthropic API.

**`#ares-live` chatroom**: fully real - messages are broadcast over the live
WebSocket relay and replayed to new clients from recent history.

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
- The bundled live relay keeps recent `#ares-live` messages in memory only, so
  live history resets when that relay process stops.
- Local-only channel history remains local to each app instance.

## Project structure

- `main.js` - Electron main process (window, IPC handlers for TCP probing
  and loading SNodes.dat, plus the bundled live channel relay config)
- `preload.js` - exposes `window.aresNet` (probe/load/live channel config) to
  the renderer
- `live-channel-server.js` - the minimal WebSocket relay used by `#ares-live`
- `ares-crypto.js` - the d64 XOR stream cipher, with the discrepancy in the
  paper's worked example surfaced via `verifyD64()` rather than hidden
- `ares-nodes.js` - parses SNodes.dat text format and the binary node
  candidate wire format
- `index.html` - the UI and chat/network logic
- `package.json` - dependencies and build config
