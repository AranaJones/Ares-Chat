const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const net = require('net');
const fs = require('fs');
const { parseSNodesText } = require('./ares-nodes');

function normalizePort(value) {
  let port = value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) return null;
    port = Number.parseInt(trimmed, 10);
  }
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : null;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 780,
    height: 680,
    resizable: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, 'index.html'));
}

// Plain TCP connect probe - this matches what the real Ares client does in
// tthread_check_supernode.connect(): just check if something answers on
// host:port. No protocol-level login is attempted (we don't have a
// confirmed way to do that yet - see ares-crypto.js).
function probeNode(host, port, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const normalizedHost = typeof host === 'string' ? host.trim() : '';
    const normalizedPort = normalizePort(port);
    if (!normalizedHost) {
      resolve({ host: normalizedHost, port, alive: false, error: 'invalid-host' });
      return;
    }
    if (!normalizedPort) {
      resolve({ host: normalizedHost, port, alive: false, error: 'invalid-port' });
      return;
    }

    const start = Date.now();
    const socket = new net.Socket();
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      try { socket.destroy(); } catch (e) {}
      resolve(result);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      finish({ host: normalizedHost, port: normalizedPort, alive: true, ms: Date.now() - start });
    });
    socket.once('timeout', () => {
      finish({ host: normalizedHost, port: normalizedPort, alive: false, error: 'timeout' });
    });
    socket.once('error', (err) => {
      finish({ host: normalizedHost, port: normalizedPort, alive: false, error: err.code || err.message });
    });

    try {
      socket.connect(normalizedPort, normalizedHost);
    } catch (err) {
      finish({ host: normalizedHost, port: normalizedPort, alive: false, error: err.message || String(err) });
    }
  });
}

ipcMain.handle('probe-node', async (event, args = {}) => {
  return probeNode(args.host, args.port);
});

ipcMain.handle('load-snodes-file', async () => {
  try {
    const result = await dialog.showOpenDialog({
      title: 'Select SNodes.dat',
      properties: ['openFile'],
      filters: [{ name: 'Ares node list', extensions: ['dat', 'txt'] }, { name: 'All files', extensions: ['*'] }]
    });
    if (result.canceled || !result.filePaths[0]) return null;

    const filePath = result.filePaths[0];
    const text = fs.readFileSync(filePath, 'utf8');
    const nodes = parseSNodesText(text);
    return { filePath, nodes };
  } catch (err) {
    return { filePath: null, nodes: [], error: err.message || String(err) };
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
