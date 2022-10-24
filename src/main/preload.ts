import { app, contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { TextRecipe, WebviewRecipe } from '../renderer/preload';

export type Channels =
  | 'ipc-example'
  | 'add-webview'
  | 'set-title'
  | 'add-text'
  | 'open-command-palette'
  | 'swap-node-forward'
  | 'swap-node-release'
  | 'initial-load-finished'
  | 'focus'
  | 'webview-preload-script';

const on = (channel: Channels, func: (...args: unknown[]) => void) => {
  const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
    func(...args);
  ipcRenderer.on(channel, subscription);

  return () => {
    ipcRenderer.removeListener(channel, subscription);
  };
};

contextBridge.exposeInMainWorld('electron', {
  onAddWebview: (func: (objs: WebviewRecipe[]) => void) => {
    on('add-webview', (args) => {
      func(args as WebviewRecipe[]);
    });
  },
  onAddText: (func: (objs: TextRecipe[]) => void) => {
    on('add-text', (args) => func(args as TextRecipe[]));
  },
  onOpenCommandPalette: (func: () => void) => {
    on('open-command-palette', func);
  },
  onFocusApp: (func: () => void) => {
    on('focus', func);
  },
  setTitle: (title: string) => {
    ipcRenderer.send('set-title', title);
  },
  initialLoadFinished: () => {
    ipcRenderer.send('initial-load-finished');
  },
  // fromId: webContents.fromId,
  onSetPreloadScript: (func: (src: string) => void) => {
    on('webview-preload-script', func);
  },
  // preloadScript: webviewPreloadScript,
  version: '0.0.0',
});
