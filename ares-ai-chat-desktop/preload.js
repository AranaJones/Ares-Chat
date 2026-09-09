const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('aresNet', {
  probeNode: (host, port) => ipcRenderer.invoke('probe-node', { host, port }),
  loadSNodesFile: () => ipcRenderer.invoke('load-snodes-file'),
  getLiveChannelConfig: () => ipcRenderer.invoke('get-live-channel-config')
});
