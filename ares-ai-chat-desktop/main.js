const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const net = require('net');
const fs = require('fs');
const { parseSNodesText } = require('./ares-nodes');
const { ensureLiveChannelServer, DEFAULT_HOST, DEFAULT_PORT, DEFAULT_PATH } = require('./live-channel-server');

let liveChannelRelay = null;

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

ipcMain.handle('get-live-channel-config', async () => {
  if (!liveChannelRelay) {
    liveChannelRelay = await ensureLiveChannelServer({
      host: DEFAULT_HOST,
      port: DEFAULT_PORT,
      pathname: DEFAULT_PATH
    });
  }

  return {
    channel: 'ares-live',
    url: liveChannelRelay.url,
    managedByApp: liveChannelRelay.owned
  };
});

app.whenReady().then(() => {
  ensureLiveChannelServer({
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
    pathname: DEFAULT_PATH
  })
    .then((relay) => {
      liveChannelRelay = relay;
    })
    .catch((error) => {
      console.error('Failed to prepare live channel relay:', error);
    })
    .finally(() => {
      createWindow();
    });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  if (liveChannelRelay && liveChannelRelay.owned && liveChannelRelay.wss && liveChannelRelay.server) {
    liveChannelRelay.wss.close();
    liveChannelRelay.server.close();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
