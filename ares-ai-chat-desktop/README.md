# Ares Chat (desktop)

A small Electron desktop app that presents a retro-inspired multi-channel chat UI for Ares Chat.

## Requirements

- [Node.js](https://nodejs.org) 18 or newer

## Development

```bash
cd ares-ai-chat-desktop
npm install
npm start
```

## Build packages locally

Create an unpacked app for a quick smoke test:

```bash
npm run pack
```

Create release artifacts for the current platform:

```bash
npm run dist
```

Create a Windows NSIS installer on Windows:

```bash
npm run dist:win
```

## Publish a release

The repository includes a GitHub Actions workflow that builds and publishes the Windows installer when you push a version tag.

1. Update `ares-ai-chat-desktop/package.json` to the release version.
2. Refresh `.github/release-notes.md` with the notes for that release.
3. Commit the changes.
4. Create and push a matching tag such as `v1.0.0`.

The workflow will:

- install dependencies with `npm ci`
- build the Windows installer executable
- upload the installer as a workflow artifact
- publish the installer to the matching GitHub Release

## Notes

- Username and selected channel are stored locally in browser storage.
- Conversation history is kept in memory and resets when the app restarts.
- There is currently no automated test suite for this package; release validation is done with targeted packaging builds.
