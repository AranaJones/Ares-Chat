const { contextBridge, ipcRenderer } = require('electron');
const { DEFAULT_LIVE_CHANNEL_FEED_URL } = require('./ares-chatrooms');

contextBridge.exposeInMainWorld('aresNet', {
  defaults: {
    liveChannelFeedUrl: DEFAULT_LIVE_CHANNEL_FEED_URL
  },
  onLiveRoomEvent: (handler) => {
    const listener = (event, payload) => handler(payload);
    ipcRenderer.on('ares-live-room-event', listener);
    return () => ipcRenderer.removeListener('ares-live-room-event', listener);
  },
  probeNode: (host, port) => ipcRenderer.invoke('probe-node', { host, port }),
  loginSupernode: (target, username, timeoutMs = 7000) => ipcRenderer.invoke('login-supernode', { target, username, timeoutMs }),
  loginAnySupernode: (nodes, username, timeoutMs = 7000) => ipcRenderer.invoke('login-any-supernode', { nodes, username, timeoutMs }),
  fetchLiveChannelFeed: (url) => ipcRenderer.invoke('fetch-live-channel-feed', { url }),
  parseLiveChannelTarget: (value) => ipcRenderer.invoke('parse-live-channel-target', { value }),
  validateLiveChannel: (host, port, timeoutMs = 5000) => ipcRenderer.invoke('validate-live-channel', { host, port, timeoutMs }),
  joinLiveChannel: (channel, username, timeoutMs = 7000) => ipcRenderer.invoke('join-live-channel', { channel, username, timeoutMs }),
  leaveLiveChannel: () => ipcRenderer.invoke('leave-live-channel'),
  loadSNodesFile: () => ipcRenderer.invoke('load-snodes-file')
});
