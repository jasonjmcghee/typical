import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { TextRecipe, WebviewRecipe } from '../renderer/preload';

export type Channels =
  | 'ipc-example'
  | 'add-webview'
  | 'zoom-in'
  | 'zoom-out'
  | 'zoom-in-all'
  | 'zoom-out-all'
  | 'set-title'
  | 'add-text'
  | 'open-command-palette'
  | 'copy-workspace-to-clipboard'
  | 'swap-node-forward'
  | 'swap-node-release'
  | 'initial-load-finished'
  | 'focus'
  | 'open-url'
  | 'on-find'
  | 'webview-preload-script'
  | 'request-edit-input'
  | 'found-in-page';

const on = (channel: Channels, func: (...args: unknown[]) => void) => {
  const subscription = (_event: IpcRendererEvent, ...args: unknown[]) => {
    func(...args);
  };
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
  onRequestEditInput: (func: () => void) => {
    on('request-edit-input', func);
  },
  onCopyWorkspaceToClipboard: (func: () => void) => {
    on('copy-workspace-to-clipboard', func);
  },
  onFind: (func: () => void) => {
    on('on-find', func);
  },
  onFocusApp: (func: () => void) => {
    on('focus', func);
  },
  onZoomIn: (func: () => void) => {
    on('zoom-in', func);
  },
  onZoomOut: (func: () => void) => {
    on('zoom-out', func);
  },
  onZoomInAll: (func: () => void) => {
    on('zoom-in-all', func);
  },
  onZoomOutAll: (func: () => void) => {
    on('zoom-out-all', func);
  },
  onOpenUrl: (func: (url: string) => void) => {
    on('open-url', func);
  },
  setTitle: (title: string) => {
    ipcRenderer.send('set-title', title);
  },
  initialLoadFinished: () => {
    ipcRenderer.send('initial-load-finished');
  },
  doFind: (search: string, next?: boolean) => {
    ipcRenderer.send('find', search, next);
  },
  doStopFind: () => {
    ipcRenderer.send('stop-find');
  },
  onFoundInPage: (func: (results: unknown) => void) => {
    on('found-in-page', func);
  },
  // fromId: webContents.fromId,
  onSetPreloadScript: (func: (src: string) => void) => {
    on('webview-preload-script', func);
  },
  // preloadScript: webviewPreloadScript,
  version: '0.0.0',
});
