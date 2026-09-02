const { contextBridge, ipcRenderer } = require("electron");

const windowApi = {
  minimize: () => ipcRenderer.send("win:minimize"),
  maximize: () => ipcRenderer.send("win:maximize"),
  close: () => ipcRenderer.send("win:close"),
  hide: () => ipcRenderer.send("win:hide"),
  show: () => ipcRenderer.send("win:show"),
  quit: () => ipcRenderer.send("win:quit"),
};

contextBridge.exposeInMainWorld("torvaNative", {
  isNative: true,
  connect: (config) => ipcRenderer.invoke("tor:connect", config),
  disconnect: () => ipcRenderer.invoke("tor:disconnect"),
  newnym: () => ipcRenderer.invoke("tor:newnym"),
  newCircuit: () => ipcRenderer.invoke("tor:newcircuit"),
  setStartWithWindows: (on) => ipcRenderer.invoke("app:login-item", on),
  updateKillSwitch: (ks) => ipcRenderer.invoke("tor:killswitch", ks),
  restoreProxy: () => ipcRenderer.invoke("tor:restore-proxy"),
  window: windowApi,
  onEvent: (cb) => {
    const listener = (_event, payload) => cb(payload);
    ipcRenderer.on("tor:event", listener);
    return () => ipcRenderer.removeListener("tor:event", listener);
  },
});
