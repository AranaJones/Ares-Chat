const ARES_GALAXY_LIVE_CHANNELS_URL = 'https://raw.githubusercontent.com/lexicon06/AresFix/main/rooms.json';

function normalizeChannelName(rawName) {
  if (typeof rawName !== 'string') return '';
  const trimmed = rawName.trim().replace(/^#+/, '').trim();
  return trimmed.slice(0, 80);
}

function parseAresGalaxyLiveChannels(payload) {
  if (!payload || !Array.isArray(payload.Items)) return [];

  const seen = new Set();
  const channels = [];

  for (const item of payload.Items) {
    const name = normalizeChannelName(item && item.name);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    channels.push(name);
  }

  return channels;
}

module.exports = {
  ARES_GALAXY_LIVE_CHANNELS_URL,
  parseAresGalaxyLiveChannels,
  normalizeChannelName
};
