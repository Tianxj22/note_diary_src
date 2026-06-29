/**
 * @file         preload.js
 * @description  预加载脚本，通过 contextBridge 向渲染进程暴露笔记操作及版本信息的 API
 * @author       tianxj22
 * @created      2024-06-24
 * @updated      2026-06-29
 * @version      1.2.0
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
   * 列出所有笔记（支持排序选项）
   * @param {object} [opts] - { sortBy: 'name'|'created'|'mtime', sortDir: 'asc'|'desc' }
   * @returns {Promise<Array>}
   */
  listNotes: (opts) => ipcRenderer.invoke('note:list', opts),
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
  /**
   * 列出回收站中的笔记
   * @returns {Promise<Array<{fileName: string, displayName: string, deletedAt: number}>>}
   */
  listTrash: () => ipcRenderer.invoke('trash:list'),
  /**
   * 从回收站恢复笔记
   * @param {string} fileName - 文件名
   * @returns {Promise<{filePath: string, fileName: string} | null>}
   */
  restoreFromTrash: (fileName) => ipcRenderer.invoke('trash:restore', fileName),
  /**
   * 永久删除回收站中的笔记
   * @param {string} fileName - 文件名
   * @returns {Promise<boolean>}
   */
  permanentlyDelete: (fileName) => ipcRenderer.invoke('trash:delete-permanent', fileName),
  /**
   * 清空回收站
   * @returns {Promise<boolean>}
   */
  emptyTrash: () => ipcRenderer.invoke('trash:empty'),
  /**
   * 打开文件选择器选择图片，返回 base64 data URI
   * @returns {Promise<string|null>}
   */
  openImageFile: () => ipcRenderer.invoke('image:open-file'),
  /**
   * 读取系统剪贴板中的图片，返回 base64 data URI
   * @returns {Promise<string|null>}
   */
  readClipboardImage: () => ipcRenderer.invoke('image:read-clipboard'),
  /**
   * 全屏截图：隐藏窗口 → 截取全屏 → 恢复窗口
   * @returns {Promise<string|null>}
   */
  captureFullscreen: () => ipcRenderer.invoke('image:capture-fullscreen'),
  /**
   * 框选截图：打开覆盖层 → 拖拽选区 → 裁剪截图
   * @returns {Promise<string|null>}
   */
  captureArea: () => ipcRenderer.invoke('image:capture-area'),
  /**
   * 列出所有可截图的窗口
   * @returns {Promise<Array<{id:string, name:string, thumbnail:string}>>}
   */
  listWindows: () => ipcRenderer.invoke('image:list-windows'),
  /**
   * 根据窗口 source id 截图指定窗口
   * @param {string} sourceId
   * @returns {Promise<string|null>}
   */
  captureWindowById: (sourceId) => ipcRenderer.invoke('image:capture-window-by-id', sourceId),
  /**
   * 读取用户设置（Token 以掩码形式返回）
   * @returns {Promise<object>}
   */
  getSettings: () => ipcRenderer.invoke('settings:get'),
  /**
   * 保存用户设置
   * @param {object} partial - 部分设置对象
   * @param {string|null} newToken - 新 Token（null 表示不更新）
   * @returns {Promise<boolean>}
   */
  updateSettings: (partial, newToken) => ipcRenderer.invoke('settings:update', partial, newToken),
  /**
   * 测试 Git 连接
   * @param {{ remoteUrl: string, token: string }} config
   * @returns {Promise<{success: boolean, message: string}>}
   */
  testGitConnection: (config) => ipcRenderer.invoke('settings:test-git-connection', config),
  /**
   * 打开原生文件夹选择对话框
   * @returns {Promise<string|null>}
   */
  selectFolder: () => ipcRenderer.invoke('dialog:select-folder'),
  /**
   * 初始化 Git 仓库 + 远程配置
   * @returns {Promise<{success: boolean, message: string}>}
   */
  gitInit: () => ipcRenderer.invoke('sync:git-init'),
  /**
   * 获取 Git 工作树状态
   * @returns {Promise<object>}
   */
  gitStatus: () => ipcRenderer.invoke('sync:git-status'),
  /**
   * 提交本地变更
   * @param {string} message - 提交信息
   * @returns {Promise<{success: boolean, message: string}>}
   */
  gitCommit: (message) => ipcRenderer.invoke('sync:git-commit', message),
  /**
   * 从远程拉取
   * @returns {Promise<{success: boolean, message: string, hasConflicts: boolean}>}
   */
  gitPull: () => ipcRenderer.invoke('sync:git-pull'),
  /**
   * 推送到远程
   * @returns {Promise<{success: boolean, message: string}>}
   */
  gitPush: () => ipcRenderer.invoke('sync:git-push'),
  /**
   * 检查是否有合并冲突
   * @returns {Promise<{hasConflicts: boolean, conflictFiles: string[]}>}
   */
  gitHasConflicts: () => ipcRenderer.invoke('sync:git-has-conflicts'),
  /**
   * 解决冲突
   * @param {string} strategy - 'local' | 'remote'
   * @param {string} [fileName]
   * @returns {Promise<{success: boolean, message: string}>}
   */
  gitResolve: (strategy, fileName) => ipcRenderer.invoke('sync:git-resolve', strategy, fileName),
  /**
   * 获取提交历史
   * @returns {Promise<Array>}
   */
  gitHistory: () => ipcRenderer.invoke('sync:git-history'),
  /**
   * 获取冲突文件本地版本内容
   * @param {string} fileName
   * @returns {Promise<string>}
   */
  gitShowLocal: (fileName) => ipcRenderer.invoke('sync:git-show-local', fileName),
  /**
   * 获取冲突文件远程版本内容
   * @param {string} fileName
   * @returns {Promise<string>}
   */
  gitShowRemote: (fileName) => ipcRenderer.invoke('sync:git-show-remote', fileName),
  /**
   * 检出远程版本文件（保留双方时使用）
   * @param {string} fileName
   * @returns {Promise<{success: boolean, fileName?: string, message?: string}>}
   */
  gitCheckoutTheirs: (fileName) => ipcRenderer.invoke('sync:git-checkout-theirs', fileName),
});
