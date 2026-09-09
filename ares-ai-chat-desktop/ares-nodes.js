// Parses the Ares Galaxy node bootstrap formats, based on
// helper_ares_nodes.pas (CWBudde/AresGalaxy fork, a real source mirror of
// the original Delphi project).
//
// Two formats are used:
//
// 1. On-disk SNodes.dat: plain text, one node per line:
//      host port reports attempts connects first_seen last_seen last_attempt
//    Lines containing '<' or '#' are skipped (comments/markers).
//
// 2. Wire format for exchanging node candidates between peers: packed
//    binary, 6 bytes per node (4-byte IP + 2-byte port), concatenated.
//    This matches aresnodes_add_candidates() in the real source.

function parseSNodesText(text) {
  const nodes = [];
  const lines = text.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.includes('<') || line.includes('#')) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 2) continue;
    const host = parts[0];
    const port = parseInt(parts[1], 10);
    if (!port || host === '127.0.0.1') continue;
    nodes.push({
      host,
      port,
      reports: parseInt(parts[2], 10) || 0,
      attempts: parseInt(parts[3], 10) || 0,
      connects: parseInt(parts[4], 10) || 0,
      firstSeen: parseInt(parts[5], 10) || 0,
      lastSeen: parseInt(parts[6], 10) || 0,
      lastAttempt: parseInt(parts[7], 10) || 0
    });
  }
  return nodes;
}

function parseBinaryCandidates(buffer) {
  const nodes = [];
  let offset = 0;
  while (offset + 6 <= buffer.length) {
    const ip =
      `${buffer[offset]}.${buffer[offset + 1]}.${buffer[offset + 2]}.${buffer[offset + 3]}`;
    const port = buffer.readUInt16LE(offset + 4);
    offset += 6;
    if (port === 0) continue;
    nodes.push({ host: ip, port });
  }
  return nodes;
}

function encodeBinaryCandidate(host, port) {
  const parts = host.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) {
    throw new Error('invalid IPv4 host: ' + host);
  }
  const buf = Buffer.alloc(6);
  for (let i = 0; i < 4; i++) buf[i] = parts[i];
  buf.writeUInt16LE(port, 4);
  return buf;
}

function normalizeRoomName(name) {
  const collapsed = String(name || '').trim().replace(/\s+/g, ' ');
  const safe = collapsed || 'ai-chat';
  return safe.startsWith('#') ? safe : '#' + safe;
}

function isValidRoomHost(host) {
  return typeof host === 'string' && /^[A-Za-z0-9.-]+$/.test(host);
}

function isValidRoomPort(port) {
  return Number.isInteger(port) && port > 0 && port <= 65535;
}

function parseRoomTarget(input) {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  const withoutScheme = trimmed.replace(/^arlnk:\/\//i, '');
  const lower = withoutScheme.toLowerCase();
  if (!lower.startsWith('chatroom:')) return null;

  const payload = withoutScheme.slice('chatroom:'.length);
  const separatorIndex = payload.indexOf('|');
  if (separatorIndex === -1) return null;

  const endpoint = payload.slice(0, separatorIndex).trim();
  const rawRoomName = payload.slice(separatorIndex + 1).trim();
  const portSeparatorIndex = endpoint.lastIndexOf(':');
  if (portSeparatorIndex === -1) return null;

  const host = endpoint.slice(0, portSeparatorIndex).trim();
  const port = parseInt(endpoint.slice(portSeparatorIndex + 1).trim(), 10);
  if (!isValidRoomHost(host) || !isValidRoomPort(port) || !rawRoomName) return null;

  return {
    kind: 'chatroom',
    source: 'hashurl',
    host,
    port,
    roomName: normalizeRoomName(rawRoomName),
    original: trimmed
  };
}

module.exports = {
  parseSNodesText,
  parseBinaryCandidates,
  encodeBinaryCandidate,
  normalizeRoomName,
  parseRoomTarget
};
