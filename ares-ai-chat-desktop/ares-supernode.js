const crypto = require('crypto');
const net = require('net');

const MSG_CLIENT_LOGIN_REQ = 0;
const MSG_CLIENT_STAT_REQ = 30;
const MSG_CLIENT_FIRST_LOG = 90;
const MSG_SERVER_LOGIN_OK = 1;
const MSG_SERVER_YOUR_NICK = 5;
const MSG_SERVER_STATS = 30;
const MSG_SERVER_YOUR_IP = 37;
const MSG_SERVER_PRELOGIN_OK = 51;
const MSG_SERVER_PRELGNOK = 56;
const MSG_SERVER_PRELOGFAILLOGSECURTYIP = 58;
const MSG_SERVER_PRELOGFAILLOGBUSY = 59;
const MSG_SERVER_PRELGNOKNOCRYPT = 60;
const CHAR_MARKER_NOCRYPT = 6;
const CHAR_MARKER_NEWSTACK = 5;
const CMD_TAG_SUPPORTDIRECTCHAT = 1;

const SUPERNODE_PRELOGIN = Buffer.from([
  0x03,
  0x00,
  MSG_CLIENT_FIRST_LOG,
  CHAR_MARKER_NOCRYPT,
  CHAR_MARKER_NOCRYPT,
  CHAR_MARKER_NEWSTACK
]);

const FA = [52134, 7230, 24750, 14415, 26624, 45495, 37999, 52683, 64694, 57972, 56248, 20725, 38396, 16091, 27066, 26549, 28433, 41892, 54333, 7654, 7653, 33766, 46557, 124, 51949, 28766, 33408, 13298, 20804, 10239, 2588, 61943, 25348, 48577, 26025, 6745, 3556, 40867, 19041, 49970, 15379, 35587, 65344, 62547, 3413, 47648, 28858, 63983, 9309, 55021, 7863, 64138, 17515, 32538, 57557, 48162, 56103, 25950, 48351, 50333, 21181, 23559, 19337, 16755, 18491, 54470, 26479, 25245, 553, 41397, 8782, 5310, 50024, 938, 15491, 18065, 54861, 20929, 39618, 9620, 27646, 50724, 30232, 65012, 44045, 15391, 16932, 43449, 36949, 60258, 34195, 47924, 26898, 27799, 8411, 52902, 9541, 37669, 48953, 44851, 47943, 59459, 28142, 15111, 19885, 54082, 38326, 12999, 59484, 47892, 53899, 24636, 61934, 44322, 26009, 49212, 44357, 21837, 15746, 39898, 26479, 21315, 53460, 48335, 11706, 14597, 18121, 10536, 10264, 48822, 43583, 4658, 62391, 63399, 8952, 58020, 39385, 38050, 28948, 38925, 65275, 32628, 9932, 54142, 58916, 23486, 23665, 19833, 58506, 47357, 55974, 39194, 57708, 472, 63195, 25221, 65069, 29867, 40459, 38033, 686, 45394, 18872, 4532, 43503, 43065, 56100, 60463, 27366, 63138, 39122, 18811, 39328, 64566, 51774, 23796, 64663, 13776, 44505, 9669, 12884, 43398, 50505, 56340, 33606, 28666, 46048, 14704, 64483, 42720, 11099, 2169, 60158, 22737, 41693, 42959, 8296, 9808, 54315, 27710, 34763, 48154, 15147, 3624, 64452, 25268, 5016, 36404, 27969, 13104, 37129, 15670, 47899, 48448, 19746, 54111, 54772, 10879, 10266, 49830, 3156, 11005, 5998, 12407, 39680, 14089, 40677, 17052, 56731, 62020, 61381, 43882, 48001, 48099, 59989, 41261, 11488, 47173, 32148, 44246, 62489, 57271, 8504, 64485, 59223, 56964, 26090, 8594, 26223, 53825, 55234, 29504, 55544, 12376, 44799, 27684];
const FB = [30591, 39407, 26039, 39326, 366, 41611, 16698, 19010, 16323, 47272, 35270, 32681, 60394, 38349, 9008, 49649, 55073, 56231, 44808, 22235, 46041, 29396, 38549, 25523, 28493, 47856, 11023, 32391, 46946, 38878, 6173, 55942, 35007, 43097, 42128, 31670, 57646, 12732, 32094, 7643, 62003, 36112, 1763, 47780, 28651, 8532, 28756, 56089, 55336, 14098, 1412, 8259, 52683, 12575, 31452, 44827, 58467, 63155, 12182, 27573, 30725, 39595, 41531, 12206, 28011, 35867, 37725, 26580, 63056, 56344, 37526, 50454, 46604, 25797, 61890, 60588, 57965, 56732, 23161, 21384, 15574, 10496, 33233, 45310, 65436, 26369, 46675, 46256, 7070, 39280, 17468, 60349, 25123, 58660, 60406, 298, 30458, 48268, 59095, 50578, 42701, 32630, 13850, 43531, 64966, 23583, 14364, 39513, 14951, 32125, 49113, 25175, 30884, 53961, 10918, 2724, 45378, 64593, 12337, 55435, 26997, 10622, 26808, 56629, 11958, 62498, 50567, 16402, 47843, 34052, 30646, 45190, 56476, 36270, 289, 43730, 32730, 58231, 27560, 31811, 29393, 51149, 58025, 12958, 49928, 10694, 10940, 58060, 52919, 27880, 45999, 62147, 26210, 33077, 16579, 21174, 39605, 22651, 25382, 53630, 4768, 1244, 17073, 63561, 1460, 3225, 28900, 6530, 14014, 48932, 49695, 32513, 35490, 38758, 26916, 58229, 6011, 63311, 53451, 41744, 51186, 51357, 61445, 20338, 61148, 52974, 5140, 37592, 26392, 46857, 23818, 36486, 7080, 12138, 26753, 8307, 5135, 38414, 59034, 48181, 24811, 1919, 5433, 49965, 34004, 56096, 23935, 34804, 13686, 55482, 36746, 26886, 37098, 45896, 30826, 44718, 9051, 38144, 52836, 6195, 22743, 51364, 44907, 17473, 14195, 52233, 11741, 24731, 32164, 22501, 42875, 52481, 32986, 10462, 58029, 40285, 26718, 38353, 11765, 10034, 41071, 16225, 64945, 1607, 41369, 25793, 50198, 17552, 26711, 43460, 65386, 37214, 14570, 23075, 47747, 46025];
const FF = [0, 2056, 56428, 13276, 17885, 44016, 20885, 10603, 24394, 27896, 5374, 31115, 4624, 55105, 3914, 19221, 60114, 24110, 50767, 21490, 45722, 55322, 47053, 20095, 10657, 21593, 30540, 16164, 54110, 18286, 31572, 9776, 57299, 18827, 50642, 63992, 32277, 58190, 54215, 1330, 9244, 9404, 32820, 1420, 38857, 632, 50755, 42640, 50493, 46405, 36536, 13502, 44634, 38852, 62615, 42208, 65428, 15976, 44312, 19378, 5628, 50614, 32458, 57781, 33420, 37572, 62467, 44880, 22197, 498, 46225, 64810, 50727, 49123, 12956, 9413, 59872, 51392, 38618, 56668, 45177, 18863, 6136, 41216, 18351, 57486, 10566, 17903, 35630, 62965, 11426, 10293, 17571, 11629, 37800, 32646, 18689, 10219, 39960, 48475, 48915, 5265, 5002, 3917, 6981, 52134, 52813, 25008, 40109, 28627, 48550, 32369, 22366, 53665, 53544, 9266, 6127, 4401, 3951, 12708, 44102, 14907, 37378, 16677, 23979, 54858, 20615, 20635, 43018, 45367, 59177, 20882, 31370, 19429, 50248, 48530, 36173, 47420, 26977, 35523, 39047, 57705, 43838, 7365, 30914, 26453, 7520, 3531, 35953, 44132, 5290, 60406, 54964, 44656, 60751, 18170, 45932, 48134, 32767, 43500, 10369, 15073, 62030, 23915, 8303, 64677, 20070, 3569, 6680, 56798, 36335, 45688, 6598, 43833, 1084, 20305, 59263, 35075, 21432, 28994, 59023, 22752, 23184, 31968, 4689, 55757, 49826, 11821, 60478, 32345, 8360, 58481, 26426, 13601, 52894, 38495, 7196, 40842, 60794, 35426, 21372, 29380, 14862, 12102, 45250, 65276, 41270, 45325, 35436, 6370, 48967, 9745, 15265, 57692, 46777, 28759, 64243, 10122, 2580, 12084, 635, 24826, 25881, 23843, 5393, 29742, 33075, 30182, 44264, 53580, 37150, 16605, 24403, 38181, 57303, 39844, 16852, 45674, 36549, 57586, 23650, 23851, 40742, 51118, 29949, 13457, 45757, 54867, 49269, 59101, 12219, 50824, 17528, 19362, 46059, 29945];

function encodeWord(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value & 0xFFFF, 0);
  return buffer;
}

function encodeDword(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0, 0);
  return buffer;
}

function parseHostPort(target) {
  if (!target || typeof target !== 'string') {
    throw new Error('Expected host:port');
  }
  const trimmed = target.trim();
  const separator = trimmed.lastIndexOf(':');
  if (separator <= 0 || separator === trimmed.length - 1) {
    throw new Error('Expected host:port');
  }
  const host = trimmed.slice(0, separator).trim();
  const port = Number.parseInt(trimmed.slice(separator + 1).trim(), 10);
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Expected host:port');
  }
  return { host, port };
}

function parseIpv4(host) {
  const parts = host.split('.').map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return 0;
  }
  return ((parts[0]) | (parts[1] << 8) | (parts[2] << 16) | (parts[3] << 24)) >>> 0;
}

function dwordToIpv4(value) {
  return [
    value & 0xFF,
    (value >>> 8) & 0xFF,
    (value >>> 16) & 0xFF,
    (value >>> 24) & 0xFF
  ].join('.');
}

function transformDecrypt(bytes, seed, mult, add) {
  let key = seed & 0xFFFF;
  const output = Buffer.alloc(bytes.length);
  for (let index = 0; index < bytes.length; index += 1) {
    const inputByte = bytes[index];
    output[index] = inputByte ^ ((key >>> 8) & 0xFF);
    key = ((inputByte + key) * mult + add) & 0xFFFF;
  }
  return output;
}

function transformEncrypt(bytes, seed, mult, add) {
  let key = seed & 0xFFFF;
  const output = Buffer.alloc(bytes.length);
  for (let index = 0; index < bytes.length; index += 1) {
    const outputByte = bytes[index] ^ ((key >>> 8) & 0xFF);
    output[index] = outputByte;
    key = ((outputByte + key) * mult + add) & 0xFFFF;
  }
  return output;
}

function d2(bytes, seed) {
  return transformDecrypt(bytes, seed, 52845, 22719);
}

function e2(bytes, seed) {
  return transformEncrypt(bytes, seed, 52845, 22719);
}

function d3a(bytes, seed) {
  return transformDecrypt(bytes, seed, 23712, 5612);
}

function a1(baseWord, challengeByte, tableWord) {
  let value = tableWord;
  for (let index = 0; index < 4; index += 1) {
    value = (FA[challengeByte] - FB[challengeByte] + (value - (challengeByte * 3)) + baseWord);
  }
  return value & 0xFFFF;
}

function e1(fc, sc, bytes) {
  const challengeByte = crypto.randomInt(1, 255);
  const spacerByte = crypto.randomInt(1, 251);
  const seed = a1(sc, challengeByte, FF[fc]);
  return Buffer.concat([
    Buffer.from([challengeByte, spacerByte]),
    e2(bytes, seed)
  ]);
}

function d1(fc, sc, bytes) {
  if (bytes.length < 2) {
    return Buffer.alloc(0);
  }
  const seed = a1(sc, bytes[0], FF[fc]);
  return d2(bytes.subarray(2), seed);
}

function buildPacket(command, payload) {
  return Buffer.concat([encodeWord(payload.length), Buffer.from([command]), payload]);
}

function parsePacket(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 3) {
    throw new Error('Packet too short');
  }
  const length = buffer.readUInt16LE(0);
  if (buffer.length !== length + 3) {
    throw new Error('Packet length mismatch');
  }
  return { length, command: buffer[2], payload: buffer.subarray(3) };
}

function createReadState() {
  return { buffer: Buffer.alloc(0) };
}

function tryExtractPacket(state) {
  if (state.buffer.length < 3) {
    return null;
  }
  const length = state.buffer.readUInt16LE(0);
  if (state.buffer.length < length + 3) {
    return null;
  }
  const packet = parsePacket(state.buffer.subarray(0, length + 3));
  state.buffer = state.buffer.subarray(length + 3);
  return packet;
}

function readPacket(socket, state, timeoutMs) {
  const packet = tryExtractPacket(state);
  if (packet) {
    return Promise.resolve(packet);
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      socket.off('data', onData);
      socket.off('error', onError);
      socket.off('close', onClose);
      clearTimeout(timer);
    };

    const finish = (callback, value) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      callback(value);
    };

    const onData = (chunk) => {
      state.buffer = Buffer.concat([state.buffer, chunk]);
      const nextPacket = tryExtractPacket(state);
      if (nextPacket) {
        finish(resolve, nextPacket);
      }
    };

    const onError = (error) => finish(reject, error);
    const onClose = () => finish(reject, new Error('Socket closed'));
    const timer = setTimeout(() => finish(reject, new Error('Timed out waiting for supernode reply')), timeoutMs);

    socket.on('data', onData);
    socket.once('error', onError);
    socket.once('close', onClose);
  });
}

function writePacket(socket, packet) {
  return new Promise((resolve, reject) => {
    socket.write(packet, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function decodeNickPayload(payload) {
  const nullIndex = payload.indexOf(0x00);
  if (nullIndex === -1) {
    return {};
  }
  return {
    serverNick: payload.subarray(0, nullIndex).toString('utf8'),
    supportDirectChat: payload.length > nullIndex + 1 && payload[nullIndex + 1] === CMD_TAG_SUPPORTDIRECTCHAT
  };
}

function decodeStatsPayload(payload) {
  const related = [];
  for (let offset = 12; offset + 6 <= payload.length && related.length < 8; offset += 6) {
    related.push({
      host: dwordToIpv4(payload.readUInt32LE(offset)),
      port: payload.readUInt16LE(offset + 4)
    });
  }
  return { relatedSupernodes: related };
}

function decodeYourIpPayload(payload) {
  if (payload.length < 4) {
    return {};
  }
  return { externalIp: dwordToIpv4(payload.readUInt32LE(0)) };
}

function buildLoginBody({ challenge, username, localAddress, port = 0, noCrypt = false, fc = 0, sc = 0 }) {
  const safeUsername = (username || 'Guest').trim().slice(0, 20) || 'Guest';
  const clientGuid = crypto.randomBytes(16);
  const plain = Buffer.concat([
    Buffer.from('00000000000000000000', 'ascii'),
    encodeWord(10),
    Buffer.from([1, 2, 0, 0]),
    encodeWord(port),
    Buffer.from(safeUsername, 'utf8'),
    Buffer.from([0x00]),
    clientGuid,
    Buffer.from([0x00, 0x00]),
    Buffer.from('Ares Chat', 'utf8'),
    Buffer.from([0x00]),
    encodeDword(parseIpv4(localAddress)),
    Buffer.from([CMD_TAG_SUPPORTDIRECTCHAT])
  ]);

  if (noCrypt) {
    return plain;
  }

  if (!challenge || challenge.length !== 16) {
    throw new Error('Supernode did not provide a valid login challenge');
  }

  return e1(fc, sc, plain);
}

async function openSocket(host, port, timeoutMs) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    const fail = (error) => {
      socket.destroy();
      reject(error);
    };
    socket.setTimeout(timeoutMs, () => fail(new Error('Timed out connecting to supernode')));
    socket.once('error', fail);
    socket.once('connect', () => {
      socket.setTimeout(0);
      socket.off('error', fail);
      resolve(socket);
    });
  });
}

async function loginToSupernode({ host, port, username = 'Guest', timeoutMs = 7000 }) {
  const socket = await openSocket(host, port, timeoutMs);
  const state = createReadState();
  const transcript = [];

  try {
    await writePacket(socket, SUPERNODE_PRELOGIN);
    transcript.push('sent MSG_CLIENT_FIRST_LOG prelogin');

    const preloginPacket = await readPacket(socket, state, timeoutMs);
    transcript.push(`received prelogin reply ${preloginPacket.command}`);

    if (preloginPacket.command === MSG_SERVER_PRELOGFAILLOGBUSY) {
      throw new Error('Supernode reported it is busy');
    }
    if (preloginPacket.command === MSG_SERVER_PRELOGFAILLOGSECURTYIP) {
      throw new Error('Supernode rejected the client IP during prelogin');
    }
    if (![MSG_SERVER_PRELOGIN_OK, MSG_SERVER_PRELGNOK, MSG_SERVER_PRELGNOKNOCRYPT].includes(preloginPacket.command)) {
      throw new Error(`Unexpected prelogin reply ${preloginPacket.command}`);
    }

    const preloginBody = d3a(preloginPacket.payload, port);
    if (preloginBody.length < 21) {
      throw new Error('Supernode prelogin reply was too short');
    }

    const challenge = preloginBody.subarray(2, 18);
    const sc = preloginBody.readUInt16LE(18);
    const fc = preloginBody[20];
    const oldProtocol = preloginPacket.command === MSG_SERVER_PRELOGIN_OK;
    const noCrypt = preloginPacket.command === MSG_SERVER_PRELGNOKNOCRYPT;

    if (oldProtocol) {
      throw new Error('Legacy MSG_SERVER_PRELOGIN_OK supernodes are not implemented yet');
    }

    const loginBody = buildLoginBody({
      challenge,
      username,
      localAddress: socket.localAddress,
      port: socket.localPort || 0,
      noCrypt,
      fc,
      sc
    });

    await writePacket(socket, buildPacket(MSG_CLIENT_LOGIN_REQ, loginBody));
    transcript.push(`sent MSG_CLIENT_LOGIN_REQ (${noCrypt ? 'no crypt' : 'e1 encrypted'})`);

    const info = {
      host,
      port,
      fc,
      sc,
      noCrypt,
      challenge: challenge.toString('hex'),
      transcript
    };

    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const packet = await readPacket(socket, state, Math.max(250, deadline - Date.now()));
      const payload = packet.length === 0
        ? Buffer.alloc(0)
        : (noCrypt ? packet.payload : d1(fc, sc, packet.payload));
      transcript.push(`received command ${packet.command}`);

      if (packet.command === MSG_SERVER_YOUR_NICK) {
        Object.assign(info, decodeNickPayload(payload));
        continue;
      }

      if (packet.command === MSG_SERVER_YOUR_IP) {
        Object.assign(info, decodeYourIpPayload(payload));
        continue;
      }

      if (packet.command === MSG_SERVER_STATS) {
        Object.assign(info, decodeStatsPayload(payload));
        continue;
      }

      if (packet.command === MSG_SERVER_LOGIN_OK) {
        return info;
      }
    }

    throw new Error('Supernode login never completed');
  } finally {
    socket.destroy();
  }
}

async function loginWithCandidates(nodes, username, timeoutMs = 7000) {
  const attempts = [];
  for (const node of nodes.slice(0, 20)) {
    try {
      const result = await loginToSupernode({
        host: node.host,
        port: node.port,
        username,
        timeoutMs
      });
      result.attempts = attempts;
      return result;
    } catch (error) {
      attempts.push({
        host: node.host,
        port: node.port,
        error: error.message
      });
    }
  }
  const details = attempts.map((attempt) => `${attempt.host}:${attempt.port} - ${attempt.error}`).join('; ');
  throw new Error(details || 'No supernode candidates were provided');
}

module.exports = {
  SUPERNODE_PRELOGIN,
  buildPacket,
  createReadState,
  d1,
  d3a,
  e1,
  loginToSupernode,
  loginWithCandidates,
  parseHostPort
};
