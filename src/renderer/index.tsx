import { createRoot } from 'react-dom/client';
import App from './App';
import { AddWebview } from './util';

const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(<App />);

// calling IPC exposed from preload script
window.electron.ipcRenderer.once('ipc-example', (arg) => {
  // eslint-disable-next-line no-console
  console.log(arg);
});
window.electron.ipcRenderer.sendMessage('ipc-example', ['ping']);

// type TWebviewObj = { url: string };

// window.electron.ipcRenderer.on('add-webview', (args) => {
//   const webviewObjects: TWebviewObj[] = args as TWebviewObj[];
//   webviewObjects.forEach(({ url }) => {
//     AddWebview(url);
//   });
// });
