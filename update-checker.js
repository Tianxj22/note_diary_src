/**
 * @file         update-checker.js
 * @description  应用自动更新模块 — 封装 electron-updater，连接 GitHub Releases 检查/下载/安装
 * @author       tianxj22
 * @created      2026-07-08
 * @updated      2026-07-08
 * @version      1.0.0
 */

const { autoUpdater } = require('electron-updater');
const { BrowserWindow } = require('electron');

/**
 * 向主窗口发送更新状态
 * @param {string} status - 状态类型
 * @param {object} [data={}] - 附加数据
 */
function sendStatus(status, data) {
  const dataObj = Object.assign({}, data || {}, { status: status });
  const win = BrowserWindow.getAllWindows()[0];
  if (win && !win.isDestroyed()) {
    win.webContents.send('update:status', dataObj);
  }
}

/**
 * 初始化 autoUpdater 事件监听
 */
function init() {
  // 日志（调试用）
  autoUpdater.logger = null; // 使用默认 console logger
  autoUpdater.autoDownload = true; // 检测到更新后自动下载

  autoUpdater.on('checking-for-update', () => {
    sendStatus('checking');
  });

  autoUpdater.on('update-available', (info) => {
    sendStatus('available', { version: info.version });
  });

  autoUpdater.on('update-not-available', () => {
    sendStatus('no-update');
  });

  autoUpdater.on('download-progress', (progress) => {
    sendStatus('progress', { percent: Math.floor(progress.percent) });
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendStatus('downloaded', { version: info.version });
  });

  autoUpdater.on('error', (err) => {
    sendStatus('error', { message: err.message || '未知错误' });
  });
}

/**
 * 手动触发检查更新
 */
function checkForUpdates() {
  autoUpdater.checkForUpdates().catch((err) => {
    sendStatus('error', { message: err.message || '检查更新失败' });
  });
}

/**
 * 获取当前应用版本
 * @returns {string}
 */
function getCurrentVersion() {
  return require('electron').app.getVersion();
}

/**
 * 立即退出并安装更新
 */
function installNow() {
  autoUpdater.quitAndInstall();
}

module.exports = { init, checkForUpdates, getCurrentVersion, installNow };
