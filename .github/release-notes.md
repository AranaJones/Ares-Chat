# Ares Chat release notes

Update this file before tagging a release so the published GitHub Release gets the right summary.

## Highlights

- Retro-styled Electron desktop chat UI with per-channel message history
- Username settings stored locally between launches
- Packaged Windows installer published automatically from version tags

## Build artifacts

- Windows installer executable (`*.exe`)

## Notes

- Installer builds are created by `.github/workflows/main.yml`
- The release tag must match `ares-ai-chat-desktop/package.json` (for example `v1.0.0`)
