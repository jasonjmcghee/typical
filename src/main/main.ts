/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import Store from 'electron-store';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import * as os from 'os';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

ipcMain.on('set-title', (_, title) => {
  if (!mainWindow) {
    throw new Error('"mainWindow" is not defined');
  }
  mainWindow.setTitle(title);
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  const selectAppIcon = (): string => {
    switch (os.platform()) {
      case 'win32':
        return getAssetPath('icon.ico');
      case 'darwin':
        return getAssetPath('icon.icns');
      default:
        return getAssetPath('icon.png');
    }
  };

  const config = new Store();
  const { width, height } = config.get('winBounds', {});

  mainWindow = new BrowserWindow({
    show: false,
    width: width || 1024,
    height: height || 768,
    // vibrancy: 'light',
    icon: selectAppIcon(),
    // TODO: completely screws up dragging
    // titleBarStyle: 'hidden',
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
      webviewTag: true,
      partition: 'persist:mainSession',
    },
  });

  mainWindow.webContents.loadURL(resolveHtmlPath('index.html'));

  // const view = new BrowserView({
  //   webPreferences: {
  //     preload: app.isPackaged
  //       ? path.join(__dirname, 'preload.js')
  //       : path.join(__dirname, '../../.erb/dll/preload.js'),
  //     webviewTag: true,
  //   },
  // });
  // mainWindow.setBrowserView(view);
  // let {width, height} = mainWindow.getBounds();
  // view.setBounds({x: 0, y: 0, width, height});
  // view.setAutoResize({
  //   width: true, height: true, horizontal: true, vertical: true
  // });
  // view.webContents.loadURL(resolveHtmlPath('index.html'));
  // view.webContents.setVisualZoomLevelLimits(0.25, 2.0);

  // mainWindow.webContents.on('dom-ready', () => {
  //   if (!mainWindow) {
  //     throw new Error('"mainWindow" is not defined');
  //   }
  //   mainWindow.webContents.send('add-webview', [
  //     { url: 'https://electronjs.org' },
  //     { url: 'https://google.com' },
  //   ]);
  // });

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  ipcMain.on('initial-load-finished', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    mainWindow.show();
  });

  mainWindow.on('close', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    config.set('winBounds', mainWindow.getBounds());
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  mainWindow.webContents.on('did-attach-webview', (event, webContents) => {
    const { mainFrame } = webContents;
    webContents.setWindowOpenHandler((details) => {
      if (details.disposition === 'new-window') {
        return { action: 'allow' };
      }
      mainWindow.webContents.send('add-webview', [{ url: details.url }]);
      // shell.openExternal(details.url);
      return { action: 'deny' };
    });
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  // new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
