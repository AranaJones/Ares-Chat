const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const net = require('net');
const fs = require('fs');
const { parseSNodesText, normalizeRoomName, parseRoomTarget } = require('./ares-nodes');

let mainWindow = null;
let currentRoomTarget = null;

function normalizeRoomTarget(target, fallbackSource = 'manual') {
  if (!target || typeof target !== 'object') return null;
  const roomName = normalizeRoomName(target.roomName || target.name || '');
  return {
    kind: 'chatroom',
    source: target.source || fallbackSource,
    roomName,
    host: target.host || null,
    port: Number.isInteger(target.port) ? target.port : null,
    original: target.original || null
  };
}

function extractRoomTargetFromArg(arg, source = 'argv') {
  if (!arg || typeof arg !== 'string') return null;

  if (/^arlnk:\/\//i.test(arg) || /^chatroom:/i.test(arg)) {
    return normalizeRoomTarget(parseRoomTarget(arg), source);
  }

  if (/^#\S+$/.test(arg)) {
    return normalizeRoomTarget({ roomName: arg, source }, source);
  }

  return null;
}

function getRoomTargetFromArgv(argv = []) {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg) continue;

    if (arg === '--hashurl' && argv[i + 1]) {
      return extractRoomTargetFromArg(argv[i + 1], 'argv');
    }
    if (arg.startsWith('--hashurl=')) {
      return extractRoomTargetFromArg(arg.slice('--hashurl='.length), 'argv');
    }
    if (arg === '--room' && argv[i + 1]) {
      return normalizeRoomTarget({ roomName: argv[i + 1], source: 'argv' }, 'argv');
    }
    if (arg.startsWith('--room=')) {
      return normalizeRoomTarget({ roomName: arg.slice('--room='.length), source: 'argv' }, 'argv');
    }

    const directTarget = extractRoomTargetFromArg(arg, 'argv');
    if (directTarget) return directTarget;
  }
  return null;
}

function getRoomQuery(target) {
  if (!target) return undefined;
  return {
    roomName: target.roomName || '',
    host: target.host || '',
    port: target.port ? String(target.port) : '',
    source: target.source || ''
  };
}

function focusMainWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
}

function broadcastRoomTarget(target) {
  const normalized = normalizeRoomTarget(target);
  if (!normalized) return;
  currentRoomTarget = normalized;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('room-target', currentRoomTarget);
  }
}

function handleIncomingRoomTarget(target, shouldFocus = true) {
  const normalized = normalizeRoomTarget(target);
  if (!normalized) return false;
  broadcastRoomTarget(normalized);
  if (shouldFocus) focusMainWindow();
  return true;
}

function registerProtocolClient() {
  try {
    if (process.defaultApp && process.argv[1]) {
      app.setAsDefaultProtocolClient('arlnk', process.execPath, [path.resolve(process.argv[1])]);
      return;
    }
    app.setAsDefaultProtocolClient('arlnk');
  } catch (err) {}
}

function createWindow() {
  mainWindow = new BrowserWindow({
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

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.loadFile('index.html', { query: getRoomQuery(currentRoomTarget) });
}

const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock) {
  app.quit();
} else {
  currentRoomTarget = normalizeRoomTarget(getRoomTargetFromArgv(process.argv), 'argv');

  app.on('second-instance', (event, argv) => {
    focusMainWindow();
    handleIncomingRoomTarget(getRoomTargetFromArgv(argv), false);
  });

  app.on('open-url', (event, url) => {
    event.preventDefault();
    const target = parseRoomTarget(url);
    if (target) target.source = 'open-url';
    handleIncomingRoomTarget(target, true);
  });
}

// Plain TCP connect probe - this matches what the real Ares client does in
// tthread_check_supernode.connect(): just check if something answers on
// host:port. No protocol-level login is attempted (we don't have a
// confirmed way to do that yet - see ares-crypto.js).
function probeNode(host, port, timeoutMs = 5000) {
  return new Promise((resolve) => {
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
      finish({ host, port, alive: true, ms: Date.now() - start });
    });
    socket.once('timeout', () => {
      finish({ host, port, alive: false, error: 'timeout' });
    });
    socket.once('error', (err) => {
      finish({ host, port, alive: false, error: err.code || err.message });
    });

    try {
      socket.connect(port, host);
    } catch (err) {
      finish({ host, port, alive: false, error: String(err) });
    }
  });
}

ipcMain.handle('probe-node', async (event, { host, port }) => {
  return probeNode(host, port);
});

ipcMain.handle('load-snodes-file', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Select SNodes.dat',
    properties: ['openFile'],
    filters: [{ name: 'Ares node list', extensions: ['dat', 'txt'] }, { name: 'All files', extensions: ['*'] }]
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const text = fs.readFileSync(result.filePaths[0], 'utf8');
  const nodes = parseSNodesText(text);
  return { filePath: result.filePaths[0], nodes };
});

ipcMain.handle('get-launch-room-target', async () => {
  return currentRoomTarget;
});

ipcMain.handle('get-channel-directory', async () => {
  return {
    status: 'unavailable',
    source: 'none',
    rooms: [],
    fetchedAt: new Date().toISOString(),
    message: 'Live Ares channel discovery is unavailable because the supernode/chatroom handshake is not verified in this app.'
  };
});

if (singleInstanceLock) {
  app.whenReady().then(() => {
    registerProtocolClient();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
