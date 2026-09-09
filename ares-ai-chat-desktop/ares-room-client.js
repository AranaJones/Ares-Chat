const crypto = require('crypto');
const net = require('net');
const { EventEmitter } = require('events');
const pkg = require('./package.json');

const ROOM_OPCODES = {
  SERVER_LOGIN_ACK: 3,
  PUBLIC: 10,
  EMOTE: 11,
  PERSONAL_MESSAGE: 13,
  FAST_PING: 14,
  SERVER_JOIN: 20,
  SERVER_PART: 22,
  PMT: 25,
  SERVER_CHANNEL_USERLIST: 30,
  SERVER_TOPIC: 31,
  SERVER_TOPIC_FIRST: 32,
  SERVER_USERLIST_END: 35,
  SERVER_NOSUCH: 44,
  SERVER_REDIRECT: 6
};

function encodeIpv4BE(host) {
  const parts = String(host || '').split('.').map((part) => Number.parseInt(part, 10));
  const buffer = Buffer.alloc(4);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return buffer;
  }
  for (let index = 0; index < 4; index += 1) {
    buffer[index] = parts[index];
  }
  return buffer;
}

function decodeIpv4BE(buffer, offset) {
  return [buffer[offset], buffer[offset + 1], buffer[offset + 2], buffer[offset + 3]].join('.');
}

function encodeString(value) {
  return Buffer.concat([Buffer.from(String(value || ''), 'utf8'), Buffer.from([0x00])]);
}

function readCString(buffer, offset = 0) {
  const end = buffer.indexOf(0x00, offset);
  if (end === -1) {
    throw new Error('Missing null-terminated string');
  }
  return {
    value: buffer.subarray(offset, end).toString('utf8'),
    nextOffset: end + 1
  };
}

function encodeFrame(opcode, payload = Buffer.alloc(0)) {
  const frame = Buffer.alloc(3 + payload.length);
  frame.writeUInt16LE(payload.length, 0);
  frame[2] = opcode;
  payload.copy(frame, 3);
  return frame;
}

function extractFrames(state) {
  const frames = [];
  while (state.buffer.length >= 3) {
    const length = state.buffer.readUInt16LE(0);
    if (state.buffer.length < length + 3) {
      break;
    }
    frames.push({
      opcode: state.buffer[2],
      payload: state.buffer.subarray(3, length + 3)
    });
    state.buffer = state.buffer.subarray(length + 3);
  }
  return frames;
}

function parseJoinLikePayload(payload) {
  if (payload.length < 18) {
    throw new Error('Join payload too short');
  }

  let offset = 0;
  const fileCount = payload.readUInt16LE(offset);
  offset += 2;
  offset += 4;
  const externalIp = decodeIpv4BE(payload, offset);
  offset += 4;
  const dataPort = payload.readUInt16LE(offset);
  offset += 2;
  const nodeIp = decodeIpv4BE(payload, offset);
  offset += 4;
  const nodePort = payload.readUInt16LE(offset);
  offset += 2;
  offset += 1;

  const nameField = readCString(payload, offset);
  offset = nameField.nextOffset;
  const localIp = decodeIpv4BE(payload, offset);
  offset += 4;

  if (offset + 5 > payload.length) {
    throw new Error('Join payload truncated');
  }

  const browsable = payload[offset] > 0;
  offset += 1;
  const level = payload[offset];
  offset += 1;
  const age = payload[offset];
  offset += 1;
  const sex = payload[offset];
  offset += 1;
  const country = payload[offset];
  offset += 1;

  const regionField = readCString(payload, offset);
  offset = regionField.nextOffset;
  const features = offset < payload.length ? payload[offset] : 0;

  return {
    name: nameField.value,
    fileCount,
    externalIp,
    dataPort,
    nodeIp,
    nodePort,
    localIp,
    browsable,
    level,
    age,
    sex,
    country,
    region: regionField.value,
    features
  };
}

function parseMessagePayload(payload) {
  const fromField = readCString(payload, 0);
  const textField = readCString(payload, fromField.nextOffset);
  return {
    from: fromField.value,
    text: textField.value
  };
}

function parseRedirectPayload(payload) {
  if (payload.length < 10) {
    throw new Error('Redirect payload too short');
  }
  let offset = 0;
  const host = decodeIpv4BE(payload, offset);
  offset += 4;
  const port = payload.readUInt16LE(offset);
  offset += 2;
  offset += 4;
  const roomField = readCString(payload, offset);
  offset = roomField.nextOffset;
  const messageField = readCString(payload, offset);
  return {
    host,
    port,
    room: roomField.value,
    message: messageField.value
  };
}

function buildLoginPayload({ username, supernode, localAddress }) {
  const nodePort = supernode && Number.isInteger(supernode.port) ? supernode.port : 0;
  return Buffer.concat([
    crypto.randomBytes(16),
    Buffer.from([0x00, 0x00]),
    Buffer.from([0x00]),
    Buffer.from([0x00, 0x00]),
    encodeIpv4BE(supernode && supernode.host),
    Buffer.from([nodePort & 0xFF, (nodePort >> 8) & 0xFF]),
    Buffer.alloc(4),
    encodeString(username || 'Guest'),
    encodeString(`Ares Chat ${pkg.version}`),
    encodeIpv4BE(localAddress),
    Buffer.alloc(4),
    Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
    Buffer.from([0x00])
  ]);
}

class AresRoomClient extends EventEmitter {
  constructor({ host, port, roomName, username, supernode, timeoutMs = 7000 }) {
    super();
    this.host = host;
    this.port = port;
    this.roomName = roomName;
    this.username = username || 'Guest';
    this.supernode = supernode || null;
    this.timeoutMs = timeoutMs;
    this.socket = null;
    this.state = { buffer: Buffer.alloc(0) };
    this.connected = false;
    this.userCount = 0;
  }

  async connect() {
    this.socket = await new Promise((resolve, reject) => {
      const socket = net.createConnection({ host: this.host, port: this.port });
      const fail = (error) => {
        socket.destroy();
        reject(error);
      };
      socket.setTimeout(this.timeoutMs, () => fail(new Error('Timed out connecting to live channel')));
      socket.once('error', fail);
      socket.once('connect', () => {
        socket.setTimeout(0);
        socket.off('error', fail);
        resolve(socket);
      });
    });

    this.socket.on('data', (chunk) => this.handleData(chunk));
    this.socket.on('close', () => {
      this.connected = false;
      this.emit('close');
    });
    this.socket.on('error', (error) => this.emit('error', error));

    this.sendFrame(2, buildLoginPayload({
      username: this.username,
      supernode: this.supernode,
      localAddress: this.socket.localAddress
    }));
    this.emit('status', { text: `Sent room login to ${this.host}:${this.port}` });
  }

  handleData(chunk) {
    this.state.buffer = Buffer.concat([this.state.buffer, chunk]);
    for (const frame of extractFrames(this.state)) {
      try {
        this.handleFrame(frame);
      } catch (error) {
        this.emit('error', error);
      }
    }
  }

  handleFrame(frame) {
    switch (frame.opcode) {
      case ROOM_OPCODES.SERVER_LOGIN_ACK:
        this.connected = true;
        this.emit('login-ack');
        return;
      case ROOM_OPCODES.SERVER_TOPIC_FIRST:
      case ROOM_OPCODES.SERVER_TOPIC: {
        const topic = readCString(frame.payload, 0).value;
        this.emit('topic', { topic, first: frame.opcode === ROOM_OPCODES.SERVER_TOPIC_FIRST });
        return;
      }
      case ROOM_OPCODES.SERVER_CHANNEL_USERLIST: {
        const user = parseJoinLikePayload(frame.payload);
        this.userCount += 1;
        this.emit('userlist-user', user);
        return;
      }
      case ROOM_OPCODES.SERVER_USERLIST_END:
        this.emit('userlist-end', { userCount: this.userCount });
        return;
      case ROOM_OPCODES.SERVER_JOIN: {
        const user = parseJoinLikePayload(frame.payload);
        this.userCount += 1;
        this.emit('join', user);
        return;
      }
      case ROOM_OPCODES.SERVER_PART: {
        const part = readCString(frame.payload, 0).value;
        this.userCount = Math.max(0, this.userCount - 1);
        this.emit('part', { name: part });
        return;
      }
      case ROOM_OPCODES.PUBLIC:
        this.emit('public', parseMessagePayload(frame.payload));
        return;
      case ROOM_OPCODES.EMOTE:
        this.emit('emote', parseMessagePayload(frame.payload));
        return;
      case ROOM_OPCODES.PERSONAL_MESSAGE:
      case ROOM_OPCODES.PMT:
        this.emit('private', parseMessagePayload(frame.payload));
        return;
      case ROOM_OPCODES.FAST_PING:
        this.sendFrame(ROOM_OPCODES.FAST_PING);
        return;
      case ROOM_OPCODES.SERVER_NOSUCH:
        this.emit('system', { text: readCString(frame.payload, 0).value });
        return;
      case ROOM_OPCODES.SERVER_REDIRECT:
        this.emit('redirect', parseRedirectPayload(frame.payload));
        return;
      default:
        this.emit('raw', { opcode: frame.opcode, length: frame.payload.length });
    }
  }

  sendFrame(opcode, payload = Buffer.alloc(0)) {
    if (!this.socket || this.socket.destroyed) {
      return;
    }
    this.socket.write(encodeFrame(opcode, payload));
  }

  close() {
    if (this.socket && !this.socket.destroyed) {
      this.socket.destroy();
    }
  }
}

module.exports = {
  AresRoomClient,
  buildLoginPayload,
  encodeFrame,
  parseJoinLikePayload,
  parseMessagePayload,
  ROOM_OPCODES
};
