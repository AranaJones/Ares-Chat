const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const net = require('net');
const fs = require('fs');
const { parseSNodesText } = require('./ares-nodes');
const { AresRoomClient } = require('./ares-room-client');
const { DEFAULT_LIVE_CHANNEL_FEED_URL, fetchLiveChannelFeed, parseRoomTarget, queryLiveChannel } = require('./ares-chatrooms');
const { loginToSupernode, loginWithCandidates, parseHostPort } = require('./ares-supernode');

let activeRoomClient = null;
let activeRoomKey = null;
let activeRoomSender = null;
let lastSupernodeSession = null;

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

function emitRoomEvent(type, payload = {}) {
  if (!activeRoomSender || activeRoomSender.isDestroyed()) {
    return;
  }
  activeRoomSender.send('ares-live-room-event', {
    type,
    roomKey: activeRoomKey,
    ...payload
  });
}

function closeActiveRoom() {
  if (activeRoomClient) {
    try {
      activeRoomClient.close();
    } catch (error) {
      // ignore close errors
    }
  }
  activeRoomClient = null;
  activeRoomKey = null;
  activeRoomSender = null;
}

// Plain TCP connect probe - this matches what the real Ares client does in
// tthread_check_supernode.connect(): just check if something answers on
// host:port.
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

ipcMain.handle('login-supernode', async (event, { target, username, timeoutMs }) => {
  const { host, port } = parseHostPort(target);
  const session = await loginToSupernode({ host, port, username, timeoutMs });
  lastSupernodeSession = session;
  return session;
});

ipcMain.handle('login-any-supernode', async (event, { nodes, username, timeoutMs }) => {
  if (!Array.isArray(nodes) || nodes.length === 0) {
    throw new Error('No supernode candidates were provided');
  }
  const session = await loginWithCandidates(nodes, username, timeoutMs);
  lastSupernodeSession = session;
  return session;
});

ipcMain.handle('fetch-live-channel-feed', async (event, { url }) => {
  const channels = await fetchLiveChannelFeed(url || DEFAULT_LIVE_CHANNEL_FEED_URL);
  return { url: url || DEFAULT_LIVE_CHANNEL_FEED_URL, channels };
});

ipcMain.handle('parse-live-channel-target', async (event, { value }) => {
  return parseRoomTarget(value);
});

ipcMain.handle('validate-live-channel', async (event, { host, port, timeoutMs }) => {
  return queryLiveChannel({ host, port, timeoutMs });
});

ipcMain.handle('join-live-channel', async (event, { channel, username, timeoutMs }) => {
  if (!channel || !channel.host || !channel.port || !channel.name) {
    throw new Error('A live channel host, port, and name are required');
  }

  const validated = await queryLiveChannel({
    host: channel.host,
    port: channel.port,
    timeoutMs: timeoutMs || 5000
  });

  closeActiveRoom();

  activeRoomKey = `${channel.host}:${channel.port}|${channel.name}`;
  activeRoomSender = event.sender;
  activeRoomClient = new AresRoomClient({
    host: channel.host,
    port: channel.port,
    roomName: channel.name,
    username,
    supernode: lastSupernodeSession ? { host: lastSupernodeSession.host, port: lastSupernodeSession.port } : null,
    timeoutMs: timeoutMs || 7000
  });

  activeRoomClient.on('status', (payload) => emitRoomEvent('status', payload));
  activeRoomClient.on('login-ack', () => emitRoomEvent('login-ack'));
  activeRoomClient.on('topic', (payload) => emitRoomEvent('topic', payload));
  activeRoomClient.on('userlist-user', (payload) => emitRoomEvent('userlist-user', payload));
  activeRoomClient.on('userlist-end', (payload) => emitRoomEvent('userlist-end', payload));
  activeRoomClient.on('join', (payload) => emitRoomEvent('join', payload));
  activeRoomClient.on('part', (payload) => emitRoomEvent('part', payload));
  activeRoomClient.on('public', (payload) => emitRoomEvent('public', payload));
  activeRoomClient.on('emote', (payload) => emitRoomEvent('emote', payload));
  activeRoomClient.on('private', (payload) => emitRoomEvent('private', payload));
  activeRoomClient.on('system', (payload) => emitRoomEvent('system', payload));
  activeRoomClient.on('redirect', (payload) => emitRoomEvent('redirect', payload));
  activeRoomClient.on('raw', (payload) => emitRoomEvent('raw', payload));
  activeRoomClient.on('error', (error) => emitRoomEvent('error', { message: error.message }));
  activeRoomClient.on('close', () => {
    emitRoomEvent('close');
    activeRoomClient = null;
    activeRoomKey = null;
    activeRoomSender = null;
  });

  try {
    await activeRoomClient.connect();
  } catch (error) {
    closeActiveRoom();
    throw error;
  }

  return {
    roomKey: activeRoomKey,
    validated,
    supernode: lastSupernodeSession ? { host: lastSupernodeSession.host, port: lastSupernodeSession.port } : null
  };
});

ipcMain.handle('leave-live-channel', async () => {
  closeActiveRoom();
  return true;
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

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  closeActiveRoom();
  if (process.platform !== 'darwin') app.quit();
});
