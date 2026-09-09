// Ares Galaxy used a family of keyed XOR stream ciphers (named d64, d67, etc.
// in the original Delphi source) to obfuscate local registry values and
// on-disk data files. This file implements the algorithm as documented in:
//
//   Kolenbrander, Le-Khac, Kechadi - "Forensic Analysis of Ares Galaxy
//   Peer-to-Peer Network" (2016), section 4.2.2.
//
// Per-byte: outByte = inByte XOR (key >> 8)
// Key evolves each step using the INPUT byte just processed:
//   key = ((inByte + key) * MULT + ADD) & 0xFFFF   (16-bit wraparound)
//
// This helper applies the paper's documented byte transform to the input bytes
// you pass in. Because the published worked example also contains a byte-level
// discrepancy (surfaced by verifyD64() below), this should be treated as a
// narrow utility for documented local-data experiments, not as a confirmed
// live-network handshake implementation.
function normalizeBytes(bytes) {
  if (Buffer.isBuffer(bytes)) return bytes;
  if (bytes instanceof Uint8Array) return Buffer.from(bytes);
  throw new TypeError('bytes must be a Buffer or Uint8Array');
}

function normalizeKey(initialKey) {
  if (!Number.isInteger(initialKey)) {
    throw new TypeError('initialKey must be an integer');
  }
  return initialKey & 0xFFFF;
}
//
// CONFIRMED constants (from the paper's worked example, function "d64"):
//   MULT = 12559, ADD = 14926
//
// The paper only worked through d64 in detail. Other named variants (d67,
// etc.) exist in the real source with their own hardcoded MULT/ADD - those
// constants are NOT confirmed here. Do not trust d67Placeholder for real
// data until verified against either the actual helper_crypt.pas source or
// a known plaintext/ciphertext pair.

function d64(bytes, initialKey) {
  const input = normalizeBytes(bytes);
  let key = normalizeKey(initialKey);
  const out = Buffer.alloc(input.length);
  for (let i = 0; i < input.length; i++) {
    const inByte = input[i];
    const xorByte = (key >> 8) & 0xFF;
    out[i] = inByte ^ xorByte;
    key = ((inByte + key) * 12559 + 14926) & 0xFFFF;
  }
  return out;
}

// Verification against the paper's worked example:
// d64(0x54, key=24884) should XOR-decrypt using high byte of 24884.
// 24884 = 0x6134 -> high byte 0x61... wait the paper says high byte 0xC2 for
// key 24884. Let's derive: 24884 in binary is 0110 0001 0011 0100 = 0x6134.
// The paper states the first XOR byte is 11000010 (0xC2). This does not
// match a simple (key >> 8) of 0x6134 (which is 0x61). This is a known
// discrepancy - see verifyD64() below, which surfaces this rather than
// silently assuming correctness.
function verifyD64() {
  const key = 24884;
  const expectedFirstXorByte = 0xC2;
  const actualFirstXorByte = (key >> 8) & 0xFF;
  return {
    key,
    expectedFirstXorByte,
    actualFirstXorByte,
    matches: expectedFirstXorByte === actualFirstXorByte,
    note: 'The published example disagrees with the documented high-byte XOR step, so d64 should not be treated as handshake-proof.'
  };
}

// Placeholder for the d67 variant used in the nested example
// d67(d64(s,24884),7193). The constants are still unverified, so returning any
// transformed data here would be misleading.
function d67Placeholder() {
  throw new Error('d67Placeholder is unavailable until the real d67 constants are verified');
}

module.exports = { d64, d67Placeholder, verifyD64 };
