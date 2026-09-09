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

function isValidPort(port) {
  return Number.isInteger(port) && port > 0 && port <= 65535;
}

function parseStrictInteger(value) {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return Number.parseInt(trimmed, 10);
}

function parseCounter(value) {
  const parsed = parseStrictInteger(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function parseSNodesText(text) {
  if (typeof text !== 'string') return [];

  const nodes = [];
  const lines = text.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.includes('<') || line.includes('#')) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 2) continue;
    const host = parts[0].trim();
    const port = parseStrictInteger(parts[1]);
    if (!host || !isValidPort(port) || host === '127.0.0.1') continue;
    nodes.push({
      host,
      port,
      reports: parseCounter(parts[2]),
      attempts: parseCounter(parts[3]),
      connects: parseCounter(parts[4]),
      firstSeen: parseCounter(parts[5]),
      lastSeen: parseCounter(parts[6]),
      lastAttempt: parseCounter(parts[7])
    });
  }
  return nodes;
}

function parseBinaryCandidates(buffer) {
  if (!Buffer.isBuffer(buffer) && !(buffer instanceof Uint8Array)) return [];

  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const nodes = [];
  let offset = 0;
  while (offset + 6 <= bytes.length) {
    const ip =
      `${bytes[offset]}.${bytes[offset + 1]}.${bytes[offset + 2]}.${bytes[offset + 3]}`;
    const port = bytes.readUInt16LE(offset + 4);
    offset += 6;
    if (!isValidPort(port) || ip === '0.0.0.0' || ip === '127.0.0.1') continue;
    nodes.push({ host: ip, port });
  }
  return nodes;
}

function encodeBinaryCandidate(host, port) {
  if (typeof host !== 'string') {
    throw new TypeError('invalid IPv4 host: ' + host);
  }

  const parts = host.split('.').map((part) => parseStrictInteger(part));
  if (
    parts.length !== 4 ||
    parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)
  ) {
    throw new Error('invalid IPv4 host: ' + host);
  }
  if (!isValidPort(port)) {
    throw new Error('invalid port: ' + port);
  }
  const buf = Buffer.alloc(6);
  for (let i = 0; i < 4; i++) buf[i] = parts[i];
  buf.writeUInt16LE(port, 4);
  return buf;
}

module.exports = { parseSNodesText, parseBinaryCandidates, encodeBinaryCandidate };
