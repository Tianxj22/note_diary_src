/**
 * @file         main.js
 * @description  Electron 主进程入口，管理应用生命周期、窗口创建、系统托盘、全局快捷键及笔记文件 IPC 处理
 * @author       tianxj22
 * @created      2024-06-24
 * @updated      2026-06-25
 * @version      1.2.0
 */

const { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut, nativeImage } = require('electron');
const path = require('path');
const fileStore = require('./file-store');

let notesDir = '';
let isQuitting = false;
const isE2E = !!process.env.NOTE_DIARY_E2E_DIR;

/**
 * 创建并配置主窗口
 * @returns {BrowserWindow}
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

  // 关闭窗口时隐藏到托盘而非退出（E2E 模式下跳过）
  if (!isE2E) {
    win.on('close', (e) => {
      if (!isQuitting) {
        e.preventDefault();
        win.hide();
      }
    });
  }

  return win;
}

/**
 * 注册所有 IPC 处理器
 */
function registerIpcHandlers() {
  ipcMain.handle('note:create', (_event, title) => {
    return fileStore.createNote(notesDir, title);
  });

  ipcMain.handle('note:list', (_event, opts) => {
    return fileStore.listNotes(notesDir, opts);
  });

  ipcMain.handle('note:read', (_event, filePath) => {
    return fileStore.readNote(filePath);
  });

  ipcMain.handle('note:save', (_event, filePath, content) => {
    return fileStore.saveNote(filePath, content);
  });

  ipcMain.handle('note:delete', (_event, filePath) => {
    return fileStore.moveToTrash(notesDir, filePath);
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

  ipcMain.handle('note:next-default-name', () => {
    return fileStore.getNextDefaultName(notesDir);
  });

  ipcMain.handle('note:release-name-number', (_event, num) => {
    return fileStore.releaseNameNumber(notesDir, num);
  });

  // 回收站
  ipcMain.handle('trash:list', () => {
    return fileStore.listTrash(notesDir);
  });

  ipcMain.handle('trash:restore', (_event, fileName) => {
    return fileStore.restoreFromTrash(notesDir, fileName);
  });

  ipcMain.handle('trash:delete-permanent', (_event, fileName) => {
    return fileStore.permanentlyDelete(notesDir, fileName);
  });

  ipcMain.handle('trash:empty', () => {
    return fileStore.emptyTrash(notesDir);
  });
}

/**
 * 切换主窗口的显示/隐藏状态
 */
function toggleWindow() {
  const win = BrowserWindow.getAllWindows()[0];
  if (win) {
    if (win.isVisible()) {
      win.hide();
    } else {
      win.show();
      win.focus();
    }
  }
}

/**
 * 创建托盘图标（16x16 蓝色方块，内嵌 base64 PNG）
 * @returns {Electron.NativeImage}
 */
function createTrayIcon() {
  // 16x16 蓝色方块 PNG 的 base64
  const base64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAK0lEQVQ4T2NkYPj/n4EBBhgZqYQYqYQYqYQYRv0w6gcq+oERAPljPCF52xJpAAAAAElFTkSuQmCC';
  return nativeImage.createFromDataURL('data:image/png;base64,' + base64);
}

/**
 * 创建系统托盘
 */
function createTray() {
  const tray = new Tray(createTrayIcon());
  tray.setToolTip('Note Diary');

  const contextMenu = Menu.buildFromTemplate([
    { label: '显示/隐藏', click: () => toggleWindow() },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => toggleWindow());
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  const userDataPath = process.env.NOTE_DIARY_E2E_DIR || app.getPath('userData');
  notesDir = fileStore.ensureNotesDir(userDataPath);
  registerIpcHandlers();
  createWindow();

  // E2E 测试模式下跳过托盘和全局快捷键（它们会干扰测试清理）
  if (!isE2E) {
    createTray();
    const registered = globalShortcut.register('CommandOrControl+Shift+N', () => {
      toggleWindow();
    });
    if (!registered) {
      console.error('全局快捷键 CommandOrControl+Shift+N 注册失败');
    }
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// macOS: 点击 dock 图标时重新显示窗口
app.on('activate', () => {
  const win = BrowserWindow.getAllWindows()[0];
  if (win) {
    win.show();
    win.focus();
  }
});
