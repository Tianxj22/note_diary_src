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
const settingsStore = require('./settings-store');
const formatMigration = require('./format-migration');
const gitSync = require('./git-sync');
const keybindingsStore = require('./keybindings-store');

// 必须在 app.whenReady() 之前设置，否则 Windows 任务栏图标与快捷方式无法正确关联
app.setName('Note Diary');
if (process.platform === 'win32') {
  app.setAppUserModelId('com.tianxj22.note-diary');
}

let notesDir = '';
let appSettings = settingsStore.getDefaults();
let isQuitting = false;
let userDataPath = ''; // 模块级存储，IPC handler 和启动逻辑共用
const isE2E = !!process.env.NOTE_DIARY_E2E_DIR;

/**
 * 获取当前笔记文件扩展名（从设置中读取）
 * @returns {string}
 */
function getNoteExtension() {
  return (appSettings && appSettings.general && appSettings.general.fileExtension) || '.txt';
}

/**
 * 获取 Git Token 明文（仅主进程内存中，不发送给渲染进程）
 * @returns {string}
 */
function getGitToken() {
  return (appSettings && appSettings.sync && appSettings.sync.git && appSettings.sync.git._tokenPlain) || '';
}

/** 自动同步定时器引用 */
let autoSyncTimer = null;

/**
 * 初始化/配置 Git 同步（设置保存后或启动时调用）
 */
function setupGitSync() {
  const gitCfg = appSettings.sync.git;
  if (!appSettings.sync.enabled || appSettings.sync.mode !== 'git' || !gitCfg.remoteUrl) {
    // 条件不满足：清除自动同步定时器
    if (autoSyncTimer) { clearInterval(autoSyncTimer); autoSyncTimer = null; }
    return;
  }

  // 初始化 Git 仓库 + 远程配置
  gitSync.initRepo(notesDir).then(() => {
    gitSync.setRemote(notesDir, gitCfg.remoteUrl);
    if (gitCfg.authorName || gitCfg.authorEmail) {
      gitSync.configureUser(notesDir, gitCfg.authorName, gitCfg.authorEmail);
    }
    console.log('Git sync initialized:', gitCfg.remoteUrl);
  }).catch(err => console.error('Git init error:', err.message));

  // 自动同步定时器
  if (autoSyncTimer) { clearInterval(autoSyncTimer); autoSyncTimer = null; }
  if (appSettings.sync.autoSync) {
    autoSyncTimer = setInterval(() => {
      const token = getGitToken();
      const branch = gitCfg.branch || 'main';
      gitSync.pull(notesDir, branch, token)
        .catch(err => console.error('Auto pull error:', err.message));
    }, appSettings.sync.autoSyncIntervalMinutes * 60 * 1000);
  }
}

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
    icon: path.join(__dirname, 'build', 'icon.png'),
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
    return fileStore.createNote(notesDir, title, getNoteExtension());
  });

  ipcMain.handle('note:list', (_event, opts) => {
    const listOpts = Object.assign({}, opts || {}, { ext: getNoteExtension() });
    return fileStore.listNotes(notesDir, listOpts);
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
    return fileStore.listTrash(notesDir, getNoteExtension());
  });

  ipcMain.handle('trash:restore', (_event, fileName) => {
    return fileStore.restoreFromTrash(notesDir, fileName);
  });

  ipcMain.handle('trash:delete-permanent', (_event, fileName) => {
    return fileStore.permanentlyDelete(notesDir, fileName);
  });

  ipcMain.handle('trash:empty', () => {
    return fileStore.emptyTrash(notesDir, getNoteExtension());
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

  // ---- 设置 ----

  /**
   * 获取当前设置（Token 明文仅在主进程内存中，不发送给渲染进程）
   * 返回给渲染进程的设置中 Token 字段用掩码替代
   */
  ipcMain.handle('settings:get', () => {
    appSettings = settingsStore.getSettings(userDataPath);

    // 构造发送给渲染进程的副本：掩码 token
    const forRenderer = JSON.parse(JSON.stringify(appSettings));
    if (forRenderer.sync.git.tokenEncrypted && forRenderer.sync.git.tokenEncrypted.data) {
      forRenderer.sync.git._tokenMasked = true;  // 标记存在已存储 token
    } else {
      forRenderer.sync.git._tokenMasked = false;
    }
    delete forRenderer.sync.git._tokenPlain;
    delete forRenderer.sync.git.tokenEncrypted;

    return forRenderer;
  });

  /**
   * 更新设置
   * @param {object} partial - 部分设置
   * @param {string|null} newToken - 新 Token 明文（null 表示不更新）
   */
  ipcMain.handle('settings:update', (_event, partial, newToken) => {
    appSettings = settingsStore.updateSettings(userDataPath, partial, newToken);
    return true;
  });

  /**
   * 测试 Git 连接（验证远程 URL + Token 是否有效）
   * @param {{ remoteUrl: string, token: string }} config
   * @returns {Promise<{success: boolean, message: string}>}
   */
  ipcMain.handle('settings:test-git-connection', async (_event, config) => {
    try {
      // 使用 git ls-remote 验证连接（不克隆仓库）
      const { execSync } = require('child_process');
      const remoteUrl = config.remoteUrl.trim();

      if (!remoteUrl) {
        return { success: false, message: '远程仓库 URL 为空' };
      }

      // 构造带认证的 URL
      let authUrl = remoteUrl;
      if (config.token && remoteUrl.startsWith('https://')) {
        const urlObj = new URL(remoteUrl);
        urlObj.username = config.token;
        urlObj.password = 'x-oauth-basic';
        authUrl = urlObj.toString();
      }

      execSync(`git ls-remote "${authUrl}"`, {
        timeout: 15000,
        stdio: 'pipe',
      });
      return { success: true, message: '连接成功' };
    } catch (err) {
      const stderr = (err.stderr || '').toString().toLowerCase();
      let message = '连接失败';
      if (stderr.includes('authentication') || stderr.includes('401') || stderr.includes('403')) {
        message = '认证失败，请检查 Token';
      } else if (stderr.includes('not found') || stderr.includes('404')) {
        message = '仓库未找到，请检查 URL';
      } else if (stderr.includes('could not resolve host') || stderr.includes('timeout')) {
        message = '网络连接失败，请检查 URL';
      } else if (stderr) {
        message = stderr.split('\n')[0].substring(0, 100);
      }
      return { success: false, message };
    }
  });

  /**
   * 打开原生文件夹选择对话框
   * @returns {Promise<string|null>}
   */
  ipcMain.handle('dialog:select-folder', async () => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win, {
      title: '选择文件夹',
      properties: ['openDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  /**
   * 获取当前用户数据存储绝对路径
   * @returns {Promise<string>}
   */
  ipcMain.handle('app:get-user-data-path', () => {
    return userDataPath;
  });

  /**
   * 更改用户数据存储路径（迁移现有数据到新目录）
   * @param {string} newPath - 新目录的绝对路径
   * @returns {Promise<{success: boolean, message: string}>}
   */
  ipcMain.handle('app:set-user-data-path', async (_event, newPath) => {
    if (!newPath || typeof newPath !== 'string') {
      return { success: false, message: '无效的路径' };
    }

    const oldPath = userDataPath;
    if (newPath === oldPath) {
      return { success: false, message: '新路径与当前路径相同' };
    }

    try {
      // 确保新目录存在
      if (!fs.existsSync(newPath)) {
        fs.mkdirSync(newPath, { recursive: true });
      }

      // 迁移现有数据（复制整个旧目录到新目录）
      copyDirectorySync(oldPath, newPath);

      // 更新模块级路径
      userDataPath = newPath;
      notesDir = fileStore.ensureNotesDir(userDataPath);

      // 重新加载设置（指向新路径）
      appSettings = settingsStore.getSettings(userDataPath);

      return { success: true, message: '数据路径已更改' };
    } catch (err) {
      console.error('Failed to migrate data path:', err);
      return { success: false, message: '迁移失败: ' + err.message };
    }
  });

  /**
   * 递归复制目录
   * @param {string} src - 源目录
   * @param {string} dest - 目标目录
   */
  function copyDirectorySync(src, dest) {
    if (!fs.existsSync(src)) return;
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        if (!fs.existsSync(destPath)) {
          fs.mkdirSync(destPath, { recursive: true });
        }
        copyDirectorySync(srcPath, destPath);
      } else {
        // 跳过已存在的文件（不覆盖）
        if (!fs.existsSync(destPath)) {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    }
  }

  // ---- 快捷键配置 ----

  ipcMain.handle('keybindings:get', () => {
    return keybindingsStore.loadKeybindings(userDataPath);
  });

  ipcMain.handle('keybindings:update', (_event, bindings) => {
    keybindingsStore.saveKeybindings(userDataPath, bindings);
    return true;
  });

  // ---- Git 同步 ----

  ipcMain.handle('sync:git-init', async () => {
    const settings = appSettings.sync.git;
    await gitSync.initRepo(notesDir);
    if (settings.remoteUrl) {
      await gitSync.setRemote(notesDir, settings.remoteUrl);
    }
    if (settings.authorName || settings.authorEmail) {
      await gitSync.configureUser(notesDir, settings.authorName, settings.authorEmail);
    }
    return { success: true, message: 'Git 仓库已初始化' };
  });

  ipcMain.handle('sync:git-status', async () => {
    return gitSync.getStatus(notesDir);
  });

  ipcMain.handle('sync:git-commit', async (_event, message) => {
    return gitSync.commit(notesDir, message);
  });

  ipcMain.handle('sync:git-pull', async () => {
    const token = getGitToken();
    const branch = (appSettings.sync.git && appSettings.sync.git.branch) || 'main';
    const result = await gitSync.pull(notesDir, branch, token);
    if (result.success) gitSync.updateSyncState(notesDir, 'pull');
    return result;
  });

  ipcMain.handle('sync:git-push', async () => {
    const token = getGitToken();
    const branch = (appSettings.sync.git && appSettings.sync.git.branch) || 'main';
    // 先提交再推送
    await gitSync.commit(notesDir, 'sync: auto commit');
    const result = await gitSync.push(notesDir, branch, token);
    if (result.success) gitSync.updateSyncState(notesDir, 'push');
    return result;
  });

  ipcMain.handle('sync:git-has-conflicts', async () => {
    return gitSync.hasConflicts(notesDir);
  });

  ipcMain.handle('sync:git-resolve', async (_event, strategy, fileName) => {
    return gitSync.resolveConflict(notesDir, strategy, fileName);
  });

  ipcMain.handle('sync:git-history', async () => {
    return gitSync.getHistory(notesDir);
  });

  /**
   * 获取冲突文件中本地版本的内容（git show :2:file）
   */
  ipcMain.handle('sync:git-show-local', async (_event, fileName) => {
    try {
      const git = require('simple-git')(notesDir);
      return await git.show([':2:' + fileName]);
    } catch (_) {
      // 如果 stage 2 不存在，返回文件当前内容
      try {
        const filePath = require('path').join(notesDir, fileName);
        return require('fs').readFileSync(filePath, 'utf-8');
      } catch (_) { return ''; }
    }
  });

  /**
   * 获取冲突文件中远程版本的内容（git show :3:file）
   */
  ipcMain.handle('sync:git-show-remote', async (_event, fileName) => {
    try {
      const git = require('simple-git')(notesDir);
      return await git.show([':3:' + fileName]);
    } catch (_) {
      return '';
    }
  });

  /**
   * 检出远程版本文件（用于"保留双方"策略）
   */
  ipcMain.handle('sync:git-checkout-theirs', async (_event, fileName) => {
    try {
      const git = require('simple-git')(notesDir);
      const remoteContent = await git.show([':3:' + fileName]);
      const fs = require('fs');
      const p = require('path');
      const ext = p.extname(fileName);
      const base = fileName.replace(new RegExp(ext.replace('.', '\\.') + '$'), '');
      const remoteFileName = base + '.remote-' + Date.now() + ext;
      fs.writeFileSync(p.join(notesDir, remoteFileName), remoteContent, 'utf-8');
      // 暂存以便提交
      await git.add(remoteFileName);
      return { success: true, fileName: remoteFileName };
    } catch (err) {
      return { success: false, message: err.message };
    }
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
 * 创建托盘图标（从 build/icon.png 加载并缩放至 16x16）
 * @returns {Electron.NativeImage}
 */
function createTrayIcon() {
  const iconPath = path.join(__dirname, 'build', 'icon.png');
  const img = nativeImage.createFromPath(iconPath);
  return img.resize({ width: 16, height: 16 });
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

// 单实例锁：防止多开，第二次启动时聚焦已有窗口
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    userDataPath = process.env.NOTE_DIARY_E2E_DIR || app.getPath('userData');
    notesDir = fileStore.ensureNotesDir(userDataPath);
    appSettings = settingsStore.getSettings(userDataPath); // 加载持久化设置
    keybindingsStore.loadKeybindings(userDataPath); // 首次运行自动生成 keybindings.json

    // 检查是否需要文件格式迁移（.txt → .html）
    const targetExt = getNoteExtension();
    if (formatMigration.needsMigration(notesDir, targetExt)) {
      const result = formatMigration.migrateNotesToFormat(notesDir, targetExt);
      console.log('Format migration completed:', result);
    }

    // 启动时初始化 Git 同步（如果已配置）
    setupGitSync();

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
}

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
