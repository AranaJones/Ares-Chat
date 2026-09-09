const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');

const LIVE_CHANNEL = 'ares-live';
const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 34567;
const DEFAULT_PATH = '/ares-live';
const MAX_HISTORY = 100;
const MAX_MESSAGE_LENGTH = 500;
const MAX_USERNAME_LENGTH = 20;

function buildLiveChannelUrl(host = DEFAULT_HOST, port = DEFAULT_PORT, pathname = DEFAULT_PATH) {
  return `ws://${host}:${port}${pathname}`;
}

function clampText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function normalizeMessage(input) {
  const user = clampText(input && input.user, MAX_USERNAME_LENGTH) || 'Guest';
  const text = clampText(input && input.text, MAX_MESSAGE_LENGTH);

  if (!text) return null;

  return {
    channel: LIVE_CHANNEL,
    user,
    text,
    sentAt: new Date().toISOString()
  };
}

function broadcast(clients, payload) {
  const data = JSON.stringify(payload);

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

function createLiveChannelServer(options = {}) {
  const host = options.host || DEFAULT_HOST;
  const port = options.port ?? DEFAULT_PORT;
  const pathname = options.pathname || DEFAULT_PATH;
  const history = [];
  const server = http.createServer((req, res) => {
    res.writeHead(404);
    res.end();
  });
  const wss = new WebSocketServer({ server, path: pathname });

  wss.on('connection', (socket) => {
    socket.send(JSON.stringify({
      type: 'history',
      channel: LIVE_CHANNEL,
      messages: history
    }));

    socket.on('message', (buffer) => {
      let payload;

      try {
        payload = JSON.parse(buffer.toString());
      } catch (error) {
        return;
      }

      if (payload.type !== 'message' || payload.channel !== LIVE_CHANNEL) {
        return;
      }

      const message = normalizeMessage(payload);
      if (!message) return;

      history.push(message);
      if (history.length > MAX_HISTORY) {
        history.shift();
      }

      broadcast(wss.clients, { type: 'message', message });
    });
  });

  return new Promise((resolve, reject) => {
    const handleError = (error) => {
      server.removeListener('listening', handleListening);
      reject(error);
    };

    const handleListening = () => {
      server.removeListener('error', handleError);
      const address = server.address();
      const actualPort = address && typeof address === 'object' ? address.port : port;

      resolve({
        host,
        port: actualPort,
        pathname,
        url: buildLiveChannelUrl(host, actualPort, pathname),
        server,
        wss
      });
    };

    server.once('error', handleError);
    server.once('listening', handleListening);
    server.listen(port, host);
  });
}

async function ensureLiveChannelServer(options = {}) {
  try {
    const result = await createLiveChannelServer(options);
    return { ...result, owned: true };
  } catch (error) {
    if (error && error.code === 'EADDRINUSE') {
      const host = options.host || DEFAULT_HOST;
      const port = options.port ?? DEFAULT_PORT;
      const pathname = options.pathname || DEFAULT_PATH;

      return {
        host,
        port,
        pathname,
        url: buildLiveChannelUrl(host, port, pathname),
        owned: false
      };
    }

    throw error;
  }
}

function parseCliArgs(argv) {
  const options = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const value = argv[i + 1];

    if (arg === '--host' && value) {
      options.host = value;
      i += 1;
    } else if (arg === '--port' && value) {
      options.port = Number(value);
      i += 1;
    }
  }

  return options;
}

if (require.main === module) {
  const options = parseCliArgs(process.argv.slice(2));

  ensureLiveChannelServer(options)
    .then((result) => {
      console.log(`Ares live channel relay listening on ${result.url}`);
      console.log(`Use #${LIVE_CHANNEL} in the desktop app to join the shared room.`);

      if (!result.owned) {
        console.log('An existing relay was already using that address, so this process is reusing it.');
        return;
      }

      const close = () => {
        result.wss.close(() => {
          result.server.close(() => process.exit(0));
        });
      };

      process.on('SIGINT', close);
      process.on('SIGTERM', close);
    })
    .catch((error) => {
      console.error('Failed to start Ares live channel relay:', error);
      process.exit(1);
    });
}

module.exports = {
  LIVE_CHANNEL,
  DEFAULT_HOST,
  DEFAULT_PORT,
  DEFAULT_PATH,
  buildLiveChannelUrl,
  createLiveChannelServer,
  ensureLiveChannelServer
};
