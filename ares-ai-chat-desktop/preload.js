const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('aresNet', {
  probeNode: (host, port) => ipcRenderer.invoke('probe-node', { host, port }),
  loadSNodesFile: () => ipcRenderer.invoke('load-snodes-file'),
  queryRoomDirectory: (nodes, forceRefresh = false) =>
    ipcRenderer.invoke('query-room-directory', { nodes, forceRefresh })
});
