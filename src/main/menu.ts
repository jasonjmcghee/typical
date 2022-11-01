import {
  app,
  Menu,
  shell,
  BrowserWindow,
  MenuItemConstructorOptions,
} from 'electron';

interface DarwinMenuItemConstructorOptions extends MenuItemConstructorOptions {
  selector?: string;
  submenu?: DarwinMenuItemConstructorOptions[] | Menu;
}

export default class MenuBuilder {
  mainWindow: BrowserWindow;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  buildMenu(): Menu {
    const isDevelopment =
      process.env.NODE_ENV === 'development' ||
      process.env.DEBUG_PROD === 'true';

    this.createContextMenu(isDevelopment);

    const template =
      process.platform === 'darwin'
        ? this.buildDarwinTemplate(isDevelopment)
        : this.buildDefaultTemplate();

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    return menu;
  }

  createContextMenu(isDevelopment: boolean): void {
    this.mainWindow.webContents.on('context-menu', (_, props) => {
      const { x, y } = props;

      const options = [
        {
          label: 'New Browser',
          click: () => {
            this.mainWindow.webContents.send('add-webview', [
              { url: 'https://google.com', position: { x, y: y - 40 } },
            ]);
          },
        },
        {
          label: 'New Text',
          click: () => {
            this.mainWindow.webContents.send('add-text', [
              { text: 'New text', position: { x, y: y - 40 } },
            ]);
          },
        },
        {
          label: 'Command Palette',
          click: () => {
            this.mainWindow.webContents.send('open-command-palette');
          },
        },
        {
          label: 'Copy Workspace URL to Clipboard',
          click: () => {
            this.mainWindow.webContents.send('copy-workspace-to-clipboard');
          },
        },
      ];

      if (isDevelopment) {
        options.push({
          label: 'New Mosaic',
          click: () => {
            this.mainWindow.webContents.send('add-mosaic', [
              { position: { x, y: y - 40 } },
            ]);
          },
        });
      }

      Menu.buildFromTemplate(options).popup({ window: this.mainWindow });
    });
  }

  buildDarwinTemplate(isDevelopment: boolean): MenuItemConstructorOptions[] {
    const subMenuAbout: DarwinMenuItemConstructorOptions = {
      label: 'Typical',
      submenu: [
        {
          label: 'About',
          selector: 'orderFrontStandardAboutPanel:',
        },
        { type: 'separator' },
        { label: 'Services', submenu: [] },
        { type: 'separator' },
        {
          label: 'Hide',
          accelerator: 'Command+H',
          selector: 'hide:',
        },
        {
          label: 'Hide Everything Else',
          accelerator: 'Command+Shift+H',
          selector: 'hideOtherApplications:',
        },
        { label: 'Show All', selector: 'unhideAllApplications:' },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    };
    const subMenuFileSubMenu: DarwinMenuItemConstructorOptions[] = [
      {
        label: 'New Browser',
        accelerator: 'Command+N',
        click: () => {
          this.mainWindow.webContents.send('add-webview', [
            { url: 'https://google.com' },
          ]);
        },
      },
      {
        label: 'New Text',
        accelerator: 'Command+T',
        click: () => {
          this.mainWindow.webContents.send('add-text', [{ text: 'New text' }]);
        },
      },
      {
        label: 'Command Palette',
        accelerator: 'Command+K',
        click: () => {
          this.mainWindow.webContents.send('open-command-palette');
        },
      },
      {
        label: 'Input Box',
        accelerator: 'Command+L',
        click: () => {
          this.mainWindow.webContents.send('request-edit-input');
        },
      },
    ];
    if (isDevelopment) {
      subMenuFileSubMenu.push({
        label: 'New Mosaic',
        click: () => {
          this.mainWindow.webContents.send('add-mosaic');
        },
      });
    }
    const subMenuFile: DarwinMenuItemConstructorOptions = {
      label: 'File',
      submenu: subMenuFileSubMenu,
    };
    const subMenuEdit: DarwinMenuItemConstructorOptions = {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'Command+Z', selector: 'undo:' },
        { label: 'Redo', accelerator: 'Shift+Command+Z', selector: 'redo:' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'Command+X', selector: 'cut:' },
        { label: 'Copy', accelerator: 'Command+C', selector: 'copy:' },
        { label: 'Paste', accelerator: 'Command+V', selector: 'paste:' },
        {
          label: 'Select All',
          accelerator: 'Command+A',
          selector: 'selectAll:',
        },
      ],
    };
    const subMenuViewDev: MenuItemConstructorOptions = {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'Command+R',
          click: () => {
            this.mainWindow.webContents.reload();
          },
        },
        {
          label: 'Toggle Full Screen',
          accelerator: 'Ctrl+Command+F',
          click: () => {
            this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
          },
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'Alt+Command+I',
          click: () => {
            this.mainWindow.webContents.toggleDevTools();
          },
        },
        {
          label: 'Zoom Out Node',
          accelerator: 'CommandOrControl+-',
          click: () => {
            this.mainWindow.webContents.send('zoom-out');
          },
        },
        {
          label: 'Zoom In Node',
          accelerator: 'CommandOrControl+=',
          click: () => {
            this.mainWindow.webContents.send('zoom-in');
          },
        },
        {
          label: 'Zoom Out All',
          accelerator: 'CommandOrControl+Shift+-',
          click: () => {
            this.mainWindow.webContents.send('zoom-out-all');
          },
        },
        {
          label: 'Zoom In All',
          accelerator: 'CommandOrControl+Shift+=',
          click: () => {
            this.mainWindow.webContents.send('zoom-in-all');
          },
        },
      ],
    };
    const subMenuViewProd: MenuItemConstructorOptions = {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Full Screen',
          accelerator: 'Ctrl+Command+F',
          click: () => {
            this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
          },
        },
      ],
    };
    const subMenuWindow: DarwinMenuItemConstructorOptions = {
      label: 'Window',
      submenu: [
        {
          label: 'Minimize',
          accelerator: 'Command+M',
          selector: 'performMiniaturize:',
        },
        { label: 'Close', accelerator: 'Command+W', selector: 'performClose:' },
        { type: 'separator' },
        { label: 'Bring All to Front', selector: 'arrangeInFront:' },
      ],
    };
    const subMenuHelp: MenuItemConstructorOptions = {
      role: 'help',
      submenu: [],
    };

    const subMenuView =
      process.env.NODE_ENV === 'development' ||
      process.env.DEBUG_PROD === 'true'
        ? subMenuViewDev
        : subMenuViewProd;

    return [
      subMenuAbout,
      subMenuFile,
      subMenuEdit,
      subMenuView,
      subMenuWindow,
      subMenuHelp,
    ];
  }

  buildDefaultTemplate() {
    const templateDefault = [
      {
        label: '&File',
        submenu: [
          {
            label: '&Open',
            accelerator: 'Ctrl+O',
          },
          {
            label: '&Close',
            accelerator: 'Ctrl+W',
            click: () => {
              this.mainWindow.close();
            },
          },
        ],
      },
      {
        label: '&View',
        submenu:
          process.env.NODE_ENV === 'development' ||
          process.env.DEBUG_PROD === 'true'
            ? [
                {
                  label: '&Reload',
                  accelerator: 'Ctrl+R',
                  click: () => {
                    this.mainWindow.webContents.reload();
                  },
                },
                {
                  label: 'Toggle &Full Screen',
                  accelerator: 'F11',
                  click: () => {
                    this.mainWindow.setFullScreen(
                      !this.mainWindow.isFullScreen()
                    );
                  },
                },
                {
                  label: 'Toggle &Developer Tools',
                  accelerator: 'Alt+Ctrl+I',
                  click: () => {
                    this.mainWindow.webContents.toggleDevTools();
                  },
                },
              ]
            : [
                {
                  label: 'Toggle &Full Screen',
                  accelerator: 'F11',
                  click: () => {
                    this.mainWindow.setFullScreen(
                      !this.mainWindow.isFullScreen()
                    );
                  },
                },
              ],
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'Learn More',
            click() {
              shell.openExternal('https://electronjs.org');
            },
          },
          {
            label: 'Documentation',
            click() {
              shell.openExternal(
                'https://github.com/electron/electron/tree/main/docs#readme'
              );
            },
          },
          {
            label: 'Community Discussions',
            click() {
              shell.openExternal('https://www.electronjs.org/community');
            },
          },
          {
            label: 'Search Issues',
            click() {
              shell.openExternal('https://github.com/electron/electron/issues');
            },
          },
        ],
      },
    ];

    return templateDefault;
  }
}
