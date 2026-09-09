const dgram = require('dgram');

const DEFAULT_LIVE_CHANNEL_FEED_URL = 'https://raw.githubusercontent.com/lexicon06/AresFix/main/rooms.json';
const OP_SERVERLIST_SENDINFO = 2;
const OP_SERVERLIST_ACKINFO = 3;

const LANGUAGE_MAP = {
  10: 'English',
  11: 'Arabic',
  12: 'Chinese_cn',
  13: 'Chinese_tw',
  14: 'Czech',
  15: 'Dansk',
  16: 'Dutch',
  17: 'Japanese',
  18: 'Kurdish',
  19: 'Kyrgyz',
  20: 'Polish',
  21: 'Portugues',
  22: 'Slovak',
  23: 'Spanish',
  24: 'SpanishLA',
  25: 'Swedish',
  26: 'Turkish',
  27: 'Finnish',
  28: 'French',
  29: 'German',
  30: 'Italian',
  31: 'Russian'
};

function parseRoomTarget(value) {
  if (!value || typeof value !== 'string') {
    throw new Error('Expected a live room target');
  }

  let raw = value.trim();
  if (!raw) {
    throw new Error('Expected a live room target');
  }

  const prefix = 'arlnk://chatroom:';
  if (raw.toLowerCase().startsWith(prefix)) {
    raw = raw.slice(prefix.length);
  }

  const pipeIndex = raw.indexOf('|');
  if (pipeIndex === -1) {
    throw new Error('Expected host:port|room or arlnk://chatroom:host:port|room');
  }

  const endpoint = raw.slice(0, pipeIndex).trim();
  const name = decodeURIComponent(raw.slice(pipeIndex + 1).trim().replace(/\/$/, ''));
  const separator = endpoint.lastIndexOf(':');
  if (separator <= 0) {
    throw new Error('Expected host:port|room or arlnk://chatroom:host:port|room');
  }

  const host = endpoint.slice(0, separator).trim();
  const port = Number.parseInt(endpoint.slice(separator + 1).trim(), 10);
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !name) {
    throw new Error('Expected host:port|room or arlnk://chatroom:host:port|room');
  }

  return { host, port, name };
}

function normalizeFeedEntry(item) {
  const host = item.externalIp || item.host || item.ip || item.address;
  const port = Number.parseInt(item.port, 10);
  const name = String(item.name || item.room || '').trim();
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !name) {
    return null;
  }

  return {
    host,
    port,
    name,
    users: Number.isFinite(Number(item.users)) ? Number(item.users) : null,
    source: 'rooms.json'
  };
}

async function fetchLiveChannelFeed(url = DEFAULT_LIVE_CHANNEL_FEED_URL) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Ares-Chat/1.0'
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to load live room feed (${response.status})`);
  }

  const data = await response.json();
  const rawItems = Array.isArray(data)
    ? data
    : Array.isArray(data.Items)
      ? data.Items
      : Array.isArray(data.items)
        ? data.items
        : [];

  const seen = new Set();
  const channels = [];
  for (const item of rawItems) {
    const normalized = normalizeFeedEntry(item);
    if (!normalized) {
      continue;
    }
    const key = `${normalized.host}:${normalized.port}|${normalized.name.toLowerCase()}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    channels.push(normalized);
  }

  channels.sort((left, right) => (right.users || 0) - (left.users || 0) || left.name.localeCompare(right.name));
  return channels;
}

function parseChannelInfoPacket(message, remoteAddress) {
  if (!Buffer.isBuffer(message) || message.length < 10 || message[0] !== OP_SERVERLIST_ACKINFO) {
    throw new Error('Invalid chatroom response');
  }

  let offset = 1;
  const port = message.readUInt16LE(offset);
  offset += 2;
  const users = message.readUInt16LE(offset);
  offset += 2;

  const readShortString = () => {
    if (offset + 2 > message.length) {
      throw new Error('Truncated chatroom response');
    }
    const length = message.readUInt16LE(offset);
    offset += 2;
    if (offset + length > message.length) {
      throw new Error('Truncated chatroom response');
    }
    const value = message.subarray(offset, offset + length).toString('utf8');
    offset += length;
    return value;
  };

  const name = readShortString();
  const topic = readShortString();

  if (offset >= message.length) {
    throw new Error('Truncated chatroom response');
  }
  const languageCode = message[offset];
  offset += 1;
  const version = readShortString();

  let suggestedServers = 0;
  if (offset < message.length) {
    suggestedServers = message[offset];
  }

  return {
    host: remoteAddress,
    port,
    users,
    name,
    topic,
    language: LANGUAGE_MAP[languageCode] || 'English',
    languageCode,
    version,
    suggestedServers
  };
}

async function queryLiveChannel({ host, port, timeoutMs = 5000 }) {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket('udp4');
    let settled = false;

    const finish = (callback, value) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      try {
        socket.close();
      } catch (error) {
        // ignore close errors
      }
      callback(value);
    };

    const timer = setTimeout(() => finish(reject, new Error('Timed out waiting for chatroom UDP reply')), timeoutMs);

    socket.once('error', (error) => finish(reject, error));
    socket.once('message', (message, remoteInfo) => {
      try {
        finish(resolve, parseChannelInfoPacket(message, remoteInfo.address));
      } catch (error) {
        finish(reject, error);
      }
    });

    socket.send(Buffer.from([OP_SERVERLIST_SENDINFO]), port, host, (error) => {
      if (error) {
        finish(reject, error);
      }
    });
  });
}

module.exports = {
  DEFAULT_LIVE_CHANNEL_FEED_URL,
  fetchLiveChannelFeed,
  parseChannelInfoPacket,
  parseRoomTarget,
  queryLiveChannel
};
