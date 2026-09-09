const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const net = require('net');
const fs = require('fs');
const { spawnSync } = require('child_process');
const { parseSNodesText } = require('./ares-nodes');

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

  win.loadFile('index.html');
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

const hashLinkProgramPath = path.join(__dirname, 'hashlink', 'bin', 'ares_hashlink.hl');

function hashLinkStatus() {
  const programExists = fs.existsSync(hashLinkProgramPath);
  if (!programExists) {
    return { available: false, reason: 'HashLink program is not built yet. Run npm run build:hashlink.' };
  }

  const versionProbe = spawnSync('hl', ['--version'], { encoding: 'utf8' });
  if (versionProbe.error) {
    return { available: false, reason: 'HashLink runtime (hl) is not installed or not in PATH.' };
  }

  return { available: true, programPath: hashLinkProgramPath };
}

ipcMain.handle('hashlink-status', async () => {
  return hashLinkStatus();
});

ipcMain.handle('hashlink-run', async () => {
  const status = hashLinkStatus();
  if (!status.available) return { ok: false, ...status };

  const result = spawnSync('hl', [hashLinkProgramPath, 'ping'], {
    encoding: 'utf8',
    timeout: 5000,
    maxBuffer: 1024 * 1024
  });

  if (result.error) {
    return { ok: false, error: result.error.message };
  }

  return {
    ok: result.status === 0,
    code: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || ''
  };
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
