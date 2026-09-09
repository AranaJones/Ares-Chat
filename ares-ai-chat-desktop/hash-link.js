(function registerAresHashLink(globalScope) {
  const MAX_HASH_PARAM_LENGTH = 8000;
  const SHARE_PARAM = 'share';

  function encodeUtf8Base64Url(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function decodeUtf8Base64Url(value) {
    if (!/^[A-Za-z0-9_-]+$/.test(value)) {
      throw new Error('Malformed hash payload.');
    }
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(normalized + padding);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function normalizeState(state) {
    if (!state || typeof state !== 'object' || Array.isArray(state)) {
      throw new Error('Share state must be an object.');
    }

    const normalized = {};
    if (typeof state.channel === 'string' && state.channel.trim()) {
      normalized.channel = state.channel.trim();
    }
    if (typeof state.text === 'string' && state.text.length > 0) {
      normalized.text = state.text;
    }

    if (!normalized.channel && !normalized.text) {
      throw new Error('Share state is empty.');
    }

    return normalized;
  }

  function createShareUrl(state, baseUrl) {
    const normalized = normalizeState(state);
    const payload = encodeUtf8Base64Url(JSON.stringify(normalized));
    const url = new URL(baseUrl || globalScope.location.href);
    const params = new URLSearchParams(url.hash.replace(/^#/, ''));
    params.set(SHARE_PARAM, payload);
    url.hash = params.toString();
    return url.toString();
  }

  function parseHash(hashValue) {
    const rawHash = typeof hashValue === 'string' ? hashValue : globalScope.location.hash;
    const hash = rawHash.replace(/^#/, '');
    if (!hash) {
      return { ok: true, hasShare: false, state: null };
    }

    const params = new URLSearchParams(hash);
    const payload = params.get(SHARE_PARAM);
    if (!payload) {
      return { ok: true, hasShare: false, state: null };
    }

    if (payload.length > MAX_HASH_PARAM_LENGTH) {
      return { ok: false, hasShare: false, state: null, error: 'Hash payload is too large.' };
    }

    try {
      const parsed = JSON.parse(decodeUtf8Base64Url(payload));
      const state = normalizeState(parsed);
      return { ok: true, hasShare: true, state };
    } catch (error) {
      return { ok: false, hasShare: false, state: null, error: 'Hash payload is invalid.' };
    }
  }

  globalScope.aresHashLink = {
    createShareUrl,
    parseHash
  };
}(window));
