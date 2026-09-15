const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const net = require('net');
const fs = require('fs');
const { parseSNodesText } = require('./ares-nodes');
const { d64 } = require('./ares-crypto');

const ROOM_CACHE_TTL_MS = 30_000;
const roomDirectoryCache = new Map();

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

function normalizeRoom(rawRoom, fallbackId) {
  const roomId = String(
    rawRoom.id || rawRoom.roomId || rawRoom.name || rawRoom.channel || fallbackId || ''
  ).trim();
  if (!roomId) return null;

  const usersRaw = rawRoom.userCount ?? rawRoom.users ?? rawRoom.count;
  const userCount = Number.isFinite(Number(usersRaw)) ? Number(usersRaw) : null;
  const description = String(rawRoom.description || rawRoom.topic || '').trim();
  const category = String(rawRoom.category || rawRoom.genre || '').trim();

  return { roomId, userCount, description, category };
}

function parseRoomDirectoryPayload(payload) {
  const text = payload.toString('utf8').trim();
  if (!text) {
    throw new Error('empty_response');
  }

  if (text.startsWith('{') || text.startsWith('[')) {
    const parsed = JSON.parse(text);
    const list = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.rooms) ? parsed.rooms : []);
    const rooms = list
      .map((room, index) => normalizeRoom(room || {}, `room-${index + 1}`))
      .filter(Boolean);
    if (!rooms.length) throw new Error('invalid_response');
    return rooms;
  }

  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const rooms = [];
  for (const line of lines) {
    if (line.startsWith('#') || line.startsWith('//')) continue;
    const parts = line.split('|').map((part) => part.trim());
    if (!parts[0]) continue;
    rooms.push(normalizeRoom({
      id: parts[0],
      userCount: parts[1],
      description: parts[2],
      category: parts[3]
    }, parts[0]));
  }
  const filtered = rooms.filter(Boolean);
  if (!filtered.length) {
    throw new Error('invalid_response');
  }
  return filtered;
}

function querySupernodeRooms(host, port, timeoutMs = 6500) {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    const chunks = [];
    let settled = false;
    let responseTimer = null;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      if (responseTimer) {
        clearTimeout(responseTimer);
        responseTimer = null;
      }
      try { socket.destroy(); } catch (e) {}
      resolve(result);
    };
    const finalizeFromChunks = () => {
      if (settled) return;
      if (!chunks.length) {
        finish({ host, port, ok: false, error: 'no_response' });
        return;
      }
      try {
        const payload = Buffer.concat(chunks);
        const rooms = parseRoomDirectoryPayload(payload);
        finish({
          host,
          port,
          ok: true,
          latencyMs: Date.now() - start,
          rooms
        });
      } catch (err) {
        finish({
          host,
          port,
          ok: false,
          error: err.message || 'invalid_response'
        });
      }
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      const plainRequest = Buffer.from('LIST_ROOMS\n', 'utf8');
      socket.write(d64(Buffer.from(plainRequest), 24884));
    });

    socket.on('data', (chunk) => {
      if (!chunk || !chunk.length) return;
      chunks.push(chunk);
      const total = chunks.reduce((acc, item) => acc + item.length, 0);
      if (total >= 256 * 1024) {
        finish({ host, port, ok: false, error: 'response_too_large' });
        return;
      }
      if (responseTimer) clearTimeout(responseTimer);
      responseTimer = setTimeout(finalizeFromChunks, 400);
    });

    socket.once('timeout', () => {
      if (chunks.length) {
        finalizeFromChunks();
        return;
      }
      finish({ host, port, ok: false, error: 'timeout' });
    });

    socket.once('error', (err) => {
      finish({ host, port, ok: false, error: err.code || err.message || 'connection_error' });
    });

    socket.once('end', finalizeFromChunks);

    try {
      socket.connect(port, host);
    } catch (err) {
      finish({ host, port, ok: false, error: String(err) });
    }
  });
}

ipcMain.handle('probe-node', async (event, { host, port }) => {
  return probeNode(host, port);
});

ipcMain.handle('query-room-directory', async (event, { nodes, forceRefresh = false } = {}) => {
  const requestedNodes = Array.isArray(nodes) ? nodes : [];
  const now = Date.now();
  const results = await Promise.all(requestedNodes.map(async (node) => {
    const host = String((node && node.host) || '').trim();
    const port = Number((node && node.port) || 0);
    if (!host || !Number.isInteger(port) || port < 1 || port > 65535) {
      return { host, port, ok: false, error: 'invalid_node' };
    }

    const cacheKey = `${host}:${port}`;
    const cached = roomDirectoryCache.get(cacheKey);
    if (!forceRefresh && cached && now - cached.timestamp < ROOM_CACHE_TTL_MS) {
      return { ...cached.result, cached: true };
    }

    const result = await querySupernodeRooms(host, port);
    roomDirectoryCache.set(cacheKey, { timestamp: Date.now(), result });
    return { ...result, cached: false };
  }));

  return { queriedAt: now, ttlMs: ROOM_CACHE_TTL_MS, results };
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
  if (process.platform !== 'darwin') app.quit();
});
