const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseSNodesText,
  parseBinaryCandidates,
  encodeBinaryCandidate
} = require('../ares-nodes');

test('parseSNodesText ignores malformed and local-only entries', () => {
  const text = [
    'example.org 1234 7 6 5 4 3 2',
    '127.0.0.1 5555 1 1 1 1 1 1',
    'bad.example 70000 1 1 1 1 1 1',
    '# comment',
    '<marker>',
    'missing-port'
  ].join('\n');

  assert.deepEqual(parseSNodesText(text), [
    {
      host: 'example.org',
      port: 1234,
      reports: 7,
      attempts: 6,
      connects: 5,
      firstSeen: 4,
      lastSeen: 3,
      lastAttempt: 2
    }
  ]);
  assert.deepEqual(parseSNodesText(null), []);
});

test('parseBinaryCandidates accepts Uint8Array and skips invalid entries', () => {
  const bytes = new Uint8Array([
    1, 2, 3, 4, 0x39, 0x30,
    0, 0, 0, 0, 0x39, 0x30,
    127, 0, 0, 1, 0x39, 0x30,
    8, 8, 8, 8, 0x00, 0x00,
    9, 9, 9, 9, 0x01
  ]);

  assert.deepEqual(parseBinaryCandidates(bytes), [
    { host: '1.2.3.4', port: 12345 }
  ]);
  assert.deepEqual(parseBinaryCandidates('not-bytes'), []);
});

test('encodeBinaryCandidate validates IPv4 octets and port range', () => {
  assert.deepEqual(
    [...encodeBinaryCandidate('10.20.30.40', 5432)],
    [10, 20, 30, 40, 0x38, 0x15]
  );
  assert.throws(() => encodeBinaryCandidate('999.20.30.40', 5432), /invalid IPv4 host/);
  assert.throws(() => encodeBinaryCandidate('10.20.30.40', 0), /invalid port/);
});
