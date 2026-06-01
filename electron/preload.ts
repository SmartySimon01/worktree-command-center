import { ipcRenderer } from 'electron';

// contextIsolation is OFF (the renderer needs direct Node access), so `contextBridge`
// can't be used — it throws "contextBridge API can only be used when contextIsolation
// is enabled". With isolation off, the preload shares the renderer's window, so we
// assign the bridge object directly.
(window as unknown as { wcc: unknown }).wcc = {
	paths: () => ipcRenderer.invoke('paths'),
	getConfig: () => ipcRenderer.invoke('config:get'),
	setConfig: (c: unknown) => ipcRenderer.invoke('config:set', c),
	addFolder: () => ipcRenderer.invoke('addFolder'),
};
