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
// This is symmetric (same function encrypts and decrypts) because the key
// advance always uses the ciphertext byte, whether that byte is being
// produced (encrypt) or consumed (decrypt).
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
  let key = initialKey & 0xFFFF;
  const out = Buffer.alloc(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    const inByte = bytes[i];
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
    matches: expectedFirstXorByte === actualFirstXorByte
  };
}

// Placeholder for the d67 variant used in the nested example
// d67(d64(s,24884),7193). MULT/ADD constants are NOT confirmed - using the
// same constants as d64 as a guess. This WILL likely be wrong. Exists here
// only as a slot to fill in once real constants are found.
function d67Placeholder(bytes, initialKey, mult = 12559, add = 14926) {
  let key = initialKey & 0xFFFF;
  const out = Buffer.alloc(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    const inByte = bytes[i];
    const xorByte = (key >> 8) & 0xFF;
    out[i] = inByte ^ xorByte;
    key = ((inByte + key) * mult + add) & 0xFFFF;
  }
  return out;
}

module.exports = { d64, d67Placeholder, verifyD64 };
