/**
 * @file         preload.js
 * @description  预加载脚本，通过 contextBridge 向渲染进程暴露安全的 Node.js 能力
 * @author       tianxj22
 * @created      2024-06-24
 * @updated      2024-06-24
 * @version      1.0.0
 */

const { contextBridge } = require('electron');

/**
 * 暴露安全的 electronAPI 到渲染进程的 window 对象
 */
contextBridge.exposeInMainWorld('electronAPI', {
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
});
