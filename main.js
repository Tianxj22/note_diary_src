/**
 * @file         main.js
 * @description  Electron 主进程入口，管理应用生命周期、窗口创建及笔记文件 IPC 处理
 * @author       tianxj22
 * @created      2024-06-24
 * @updated      2024-06-24
 * @version      1.1.0
 */

const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fileStore = require('./file-store');

let notesDir = '';

/**
 * 创建并配置主窗口
 * @returns {void}
 */
function createWindow() {
  const win = new BrowserWindow({
    width: 960,
    height: 680,
    minWidth: 720,
    minHeight: 480,
    title: 'Note Diary',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile('index.html');
}

/**
 * 注册所有 IPC 处理器
 * @returns {void}
 */
function registerIpcHandlers() {
  ipcMain.handle('note:create', (_event, title) => {
    return fileStore.createNote(notesDir, title);
  });

  ipcMain.handle('note:list', () => {
    return fileStore.listNotes(notesDir);
  });

  ipcMain.handle('note:read', (_event, filePath) => {
    return fileStore.readNote(filePath);
  });

  ipcMain.handle('note:save', (_event, filePath, content) => {
    return fileStore.saveNote(filePath, content);
  });

  ipcMain.handle('note:delete', (_event, filePath) => {
    return fileStore.deleteNote(filePath);
  });

  ipcMain.handle('note:rename', (_event, filePath, newTitle) => {
    return fileStore.renameNote(filePath, newTitle);
  });

  ipcMain.handle('note:duplicate', (_event, filePath) => {
    return fileStore.duplicateNote(filePath);
  });

  ipcMain.handle('note:cut', (_event, filePath) => {
    return fileStore.cutNote(notesDir, filePath);
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  const userDataPath = process.env.NOTE_DIARY_E2E_DIR || app.getPath('userData');
  notesDir = fileStore.ensureNotesDir(userDataPath);
  registerIpcHandlers();
  createWindow();
});

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
