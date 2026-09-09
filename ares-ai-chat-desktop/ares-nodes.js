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
    if (!Number.isInteger(port) || port < 1 || port > 65535 || host === '127.0.0.1') continue;
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
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('buffer must be a Buffer');
  }
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
  if (
    parts.length !== 4 ||
    parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)
  ) {
    throw new Error('invalid IPv4 host: ' + host);
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('invalid port: ' + port);
  }
  const buf = Buffer.alloc(6);
  for (let i = 0; i < 4; i++) buf[i] = parts[i];
  buf.writeUInt16LE(port, 4);
  return buf;
}

module.exports = { parseSNodesText, parseBinaryCandidates, encodeBinaryCandidate };
