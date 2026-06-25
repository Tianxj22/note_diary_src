/**
 * @file         main.js
 * @description  Electron 主进程入口，管理应用生命周期、窗口创建、系统托盘、全局快捷键及笔记文件 IPC 处理
 * @author       tianxj22
 * @created      2024-06-24
 * @updated      2026-06-25
 * @version      1.2.0
 */

const { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut, nativeImage, dialog, clipboard, desktopCapturer, screen } = require('electron');
const path = require('path');
const fs = require('fs');
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

  // ---- 图片插入 ----

  ipcMain.handle('image:open-file', async () => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win, {
      title: '选择图片',
      filters: [
        { name: '图片文件', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'] },
        { name: '所有文件', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const filePath = result.filePaths[0];
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap = {
      '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.gif': 'image/gif', '.bmp': 'image/bmp', '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
    };
    const mime = mimeMap[ext] || 'image/png';
    const buffer = fs.readFileSync(filePath);
    return `data:${mime};base64,${buffer.toString('base64')}`;
  });

  ipcMain.handle('image:read-clipboard', () => {
    const img = clipboard.readImage();
    if (img.isEmpty()) return null;
    return img.toDataURL();
  });

  ipcMain.handle('image:capture-fullscreen', async () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return null;
    win.hide();
    await new Promise(resolve => setTimeout(resolve, 300));
    try {
      const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1920, height: 1080 } });
      if (sources.length === 0) return null;
      return sources[0].thumbnail.toDataURL();
    } finally {
      win.show();
      win.focus();
    }
  });

  ipcMain.handle('image:capture-area', async () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return null;

    // 计算所有显示器的合并边界
    const displays = screen.getAllDisplays();
    let minX = 0, minY = 0, maxX = 0, maxY = 0;
    displays.forEach(d => {
      if (d.bounds.x < minX) minX = d.bounds.x;
      if (d.bounds.y < minY) minY = d.bounds.y;
      if (d.bounds.x + d.bounds.width > maxX) maxX = d.bounds.x + d.bounds.width;
      if (d.bounds.y + d.bounds.height > maxY) maxY = d.bounds.y + d.bounds.height;
    });
    const totalW = maxX - minX;
    const totalH = maxY - minY;

    return new Promise((resolve) => {
      const overlay = createAreaScreenshotOverlay(minX, minY, totalW, totalH, (rect) => {
        if (!rect) { resolve(null); return; }
        win.hide();
        setTimeout(async () => {
          try {
            const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: totalW, height: totalH } });
            if (sources.length === 0) { resolve(null); return; }
            const full = sources[0].thumbnail;
            const cropped = full.crop({ x: rect.x, y: rect.y, width: rect.width, height: rect.height });
            resolve(cropped.toDataURL());
          } catch (err) {
            console.error('Area screenshot error:', err);
            resolve(null);
          } finally {
            win.show();
            win.focus();
          }
        }, 200);
      });

      // 30 秒超时保护
      setTimeout(() => {
        if (overlay && !overlay.isDestroyed()) overlay.close();
      }, 30000);
    });
  });

  ipcMain.handle('image:list-windows', async () => {
    const sources = await desktopCapturer.getSources({ types: ['window'], thumbnailSize: { width: 320, height: 240 } });
    return sources
      .filter(s => s.name && s.name.trim() !== '')
      .map(s => ({ id: s.id, name: s.name, thumbnail: s.thumbnail.toDataURL() }));
  });

  ipcMain.handle('image:capture-window-by-id', async (_event, sourceId) => {
    const sources = await desktopCapturer.getSources({ types: ['window'], thumbnailSize: { width: 1920, height: 1080 } });
    const found = sources.find(s => s.id === sourceId);
    if (!found) return null;
    return found.thumbnail.toDataURL();
  });
}

/**
 * 创建框选截图覆盖层窗口
 * @param {Function} callback - 接收 {x,y,width,height} 或 null（取消）
 * @returns {BrowserWindow}
 */
function createAreaScreenshotOverlay(minX, minY, totalW, totalH, callback) {
  const overlay = new BrowserWindow({
    x: minX, y: minY,
    width: totalW, height: totalH,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
    },
  });

  overlay.setAlwaysOnTop(true, 'screen-saver');

  // 纯静态 HTML（无 <script>），避免 data: URL 中 require 不可用的问题
  const overlayHTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{width:100vw;height:100vh;background:rgba(0,0,0,0.25);cursor:crosshair;user-select:none;overflow:hidden;}
    #sel{position:absolute;border:2px dashed #6c9fff;background:rgba(108,159,255,0.12);display:none;pointer-events:none;}
    #info{position:fixed;bottom:8px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.7);color:#fff;padding:4px 12px;border-radius:4px;font-size:12px;font-family:sans-serif;}
  </style></head><body>
    <div id="sel"></div><div id="info">拖拽选择截图区域，Esc 取消</div>
  </body></html>`;

  // 在 did-finish-load 之后通过 executeJavaScript 注入交互脚本
  overlay.webContents.on('did-finish-load', () => {
    overlay.webContents.executeJavaScript(`
      const {ipcRenderer} = require('electron');
      const sel = document.getElementById('sel');
      const MIN_X = ${minX}, MIN_Y = ${minY};
      let sx=0, sy=0, dragging=false;

      document.addEventListener('mousedown', e => {
        sx = e.screenX; sy = e.screenY;
        dragging = true;
        sel.style.display = 'block';
      });

      document.addEventListener('mousemove', e => {
        if (!dragging) return;
        const x = Math.min(sx, e.screenX) - MIN_X;
        const y = Math.min(sy, e.screenY) - MIN_Y;
        const w = Math.abs(e.screenX - sx);
        const h = Math.abs(e.screenY - sy);
        sel.style.left = x + 'px';
        sel.style.top = y + 'px';
        sel.style.width = w + 'px';
        sel.style.height = h + 'px';
      });

      document.addEventListener('mouseup', e => {
        if (!dragging) return;
        dragging = false;
        const x = Math.min(sx, e.screenX) - MIN_X;
        const y = Math.min(sy, e.screenY) - MIN_Y;
        const w = Math.abs(e.screenX - sx);
        const h = Math.abs(e.screenY - sy);
        if (w < 5 || h < 5) { sel.style.display = 'none'; return; }
        ipcRenderer.send('image:area-selected', { x, y, width: w, height: h });
      });

      document.addEventListener('keydown', e => {
        if (e.key === 'Escape') ipcRenderer.send('image:area-selected', null);
      });
    `).catch(err => console.error('Overlay script injection failed:', err));
  });

  overlay.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(overlayHTML)}`);

  const handler = (_event, rect) => {
    ipcMain.removeListener('image:area-selected', handler);
    if (overlay && !overlay.isDestroyed()) overlay.close();
    callback(rect);
  };
  ipcMain.on('image:area-selected', handler);

  overlay.on('closed', () => {
    ipcMain.removeListener('image:area-selected', handler);
    callback(null);
  });

  return overlay;
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
