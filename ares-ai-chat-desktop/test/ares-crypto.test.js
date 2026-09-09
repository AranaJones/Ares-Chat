const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { d64, d67Placeholder, verifyD64 } = require('../ares-crypto');

test('d64 validates inputs and returns a transformed buffer', () => {
  assert.deepEqual(
    [...d64(Buffer.from([0x54]), 24884)],
    [0x35]
  );
  assert.deepEqual(
    [...d64(new Uint8Array([0x54, 0x00]), 1)],
    [0x54, 0x84]
  );
  assert.throws(() => d64('bad', 1), /Buffer or Uint8Array/);
  assert.throws(() => d64(Buffer.from([1]), 1.5), /initialKey must be an integer/);
});

test('verifyD64 exposes the documented discrepancy', () => {
  assert.deepEqual(verifyD64(), {
    key: 24884,
    expectedFirstXorByte: 0xC2,
    actualFirstXorByte: 0x61,
    matches: false,
    note: 'The published example disagrees with the documented high-byte XOR step, so d64 should not be treated as handshake-proof.'
  });
});

test('d67Placeholder fails closed until constants are verified', () => {
  assert.throws(() => d67Placeholder(Buffer.from([1]), 1), /unavailable/);
});

test('index.html no longer interpolates message HTML', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.equal(html.includes('.innerHTML'), false);
  assert.match(html, /textContent = message\.text/);
});
