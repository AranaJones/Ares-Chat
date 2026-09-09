const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('aresNet', {
  probeNode: (host, port) => ipcRenderer.invoke('probe-node', { host, port }),
  loadSNodesFile: () => ipcRenderer.invoke('load-snodes-file'),
  getLaunchRoomTarget: () => ipcRenderer.invoke('get-launch-room-target'),
  getChannelDirectory: () => ipcRenderer.invoke('get-channel-directory'),
  onRoomTarget: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (event, target) => callback(target);
    ipcRenderer.on('room-target', listener);
    return () => ipcRenderer.removeListener('room-target', listener);
  }
});
