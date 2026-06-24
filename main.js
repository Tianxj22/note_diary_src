/**
 * @file         main.js
 * @description  Electron 主进程入口，管理应用生命周期与窗口创建
 * @author       tianxj22
 * @created      2024-06-24
 * @updated      2024-06-24
 * @version      1.0.0
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');

/**
 * 创建并配置主窗口
 * @returns {void}
 */
function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    title: 'Hello World - Electron',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
