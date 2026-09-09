#!/usr/bin/env bash
set -euo pipefail

echo "==> Checking for Node.js and npm"
if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is not installed. Please install Node.js (v18+ recommended) and try again."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is not installed. Please install npm and try again."
  exit 1
fi

echo "==> Installing dependencies"
npm install

echo "==> Install complete"
echo "You can now run the app with: npm start"
