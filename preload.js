/**
 * @file         preload.js
 * @description  预加载脚本，通过 contextBridge 向渲染进程暴露笔记操作及版本信息的 API
 * @author       tianxj22
 * @created      2024-06-24
 * @updated      2024-06-24
 * @version      1.1.0
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  /**
   * 创建一篇新笔记
   * @param {string} title - 笔记标题
   * @returns {Promise<{filePath: string, fileName: string}>}
   */
  createNote: (title) => ipcRenderer.invoke('note:create', title),
  /**
   * 列出所有笔记
   * @returns {Promise<Array<{fileName: string, filePath: string, displayName: string, mtime: number}>>}
   */
  listNotes: () => ipcRenderer.invoke('note:list'),
  /**
   * 读取笔记内容
   * @param {string} filePath - 笔记文件绝对路径
   * @returns {Promise<string>}
   */
  readNote: (filePath) => ipcRenderer.invoke('note:read', filePath),
  /**
   * 保存笔记内容
   * @param {string} filePath - 笔记文件绝对路径
   * @param {string} content - 文本内容
   * @returns {Promise<boolean>}
   */
  saveNote: (filePath, content) => ipcRenderer.invoke('note:save', filePath, content),
  /**
   * 删除笔记文件
   * @param {string} filePath - 笔记文件绝对路径
   * @returns {Promise<boolean>}
   */
  deleteNote: (filePath) => ipcRenderer.invoke('note:delete', filePath),
  /**
   * 重命名笔记文件
   * @param {string} filePath - 原文件绝对路径
   * @param {string} newTitle - 新标题
   * @returns {Promise<{filePath: string, fileName: string} | null>}
   */
  renameNote: (filePath, newTitle) => ipcRenderer.invoke('note:rename', filePath, newTitle),
  /**
   * 复制笔记文件（创建副本）
   * @param {string} filePath - 原文件绝对路径
   * @returns {Promise<{filePath: string, fileName: string} | null>}
   */
  duplicateNote: (filePath) => ipcRenderer.invoke('note:duplicate', filePath),
  /**
   * 剪切笔记文件（移至剪贴板目录）
   * @param {string} filePath - 原文件绝对路径
   * @returns {Promise<{filePath: string, fileName: string} | null>}
   */
  cutNote: (filePath) => ipcRenderer.invoke('note:cut', filePath),
  /**
   * 获取下一个可用的默认笔记名称（栈式序号管理）
   * @returns {Promise<{title: string, number: number}>}
   */
  getNextDefaultName: () => ipcRenderer.invoke('note:next-default-name'),
  /**
   * 归还默认笔记序号到栈（删除时调用）
   * @param {number} num - 要归还的序号
   */
  releaseNameNumber: (num) => ipcRenderer.invoke('note:release-name-number', num),
});
