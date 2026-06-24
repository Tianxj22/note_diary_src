/**
 * @file         file-store.js
 * @description  笔记文件的基础读写操作模块，封装 notes 目录下的文件 CRUD
 * @author       tianxj22
 * @created      2024-06-24
 * @updated      2024-06-24
 * @version      1.0.0
 */

const fs = require('fs');
const path = require('path');

/**
 * 获取笔记存储目录路径，不存在则自动创建
 * @param {string} baseDir - Electron userData 目录路径
 * @returns {string} notes 目录的绝对路径
 */
function ensureNotesDir(baseDir) {
  const notesDir = path.join(baseDir, 'notes');
  if (!fs.existsSync(notesDir)) {
    fs.mkdirSync(notesDir, { recursive: true });
  }
  return notesDir;
}

/**
 * 创建一篇新笔记（空文件）
 * @param {string} notesDir - notes 目录路径
 * @param {string} title - 笔记标题
 * @returns {{ filePath: string, fileName: string }} 新笔记的文件路径和文件名
 */
function createNote(notesDir, title) {
  const safeTitle = title || '未命名笔记';
  const timestamp = Date.now();
  const fileName = `${safeTitle}_${timestamp}.txt`;
  const filePath = path.join(notesDir, fileName);
  fs.writeFileSync(filePath, '', 'utf-8');
  return { filePath, fileName };
}

/**
 * 列出所有笔记文件，按修改时间倒序排列
 * @param {string} notesDir - notes 目录路径
 * @returns {Array<{ fileName: string, filePath: string, mtime: number }>} 笔记信息数组
 */
function listNotes(notesDir) {
  if (!fs.existsSync(notesDir)) {
    return [];
  }
  return fs.readdirSync(notesDir)
    .filter(f => f.endsWith('.txt'))
    .map(f => {
      const filePath = path.join(notesDir, f);
      const stat = fs.statSync(filePath);
      const displayName = f.replace(/\.txt$/, '').replace(/_\d+$/, '');
      return {
        fileName: f,
        filePath,
        displayName,
        mtime: stat.mtimeMs,
      };
    })
    .sort((a, b) => b.mtime - a.mtime);
}

/**
 * 读取指定笔记文件的全部内容
 * @param {string} filePath - 笔记文件的绝对路径
 * @returns {string} 笔记文本内容，文件不存在则返回空字符串
 */
function readNote(filePath) {
  if (!fs.existsSync(filePath)) {
    return '';
  }
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * 将内容写入指定笔记文件
 * @param {string} filePath - 笔记文件的绝对路径
 * @param {string} content - 要保存的文本内容
 * @returns {boolean} 保存成功返回 true，失败返回 false
 */
function saveNote(filePath, content) {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  } catch (err) {
    console.error('保存笔记失败:', err.message);
    return false;
  }
}

module.exports = { ensureNotesDir, createNote, listNotes, readNote, saveNote };
