const { contextBridge, ipcRenderer } = require('electron');
const { version } = require('./package.json');

contextBridge.exposeInMainWorld('aresNet', {
  probeNode: (host, port) => ipcRenderer.invoke('probe-node', { host, port }),
  loadSNodesFile: () => ipcRenderer.invoke('load-snodes-file')
});

contextBridge.exposeInMainWorld('aresApp', {
  version
});
