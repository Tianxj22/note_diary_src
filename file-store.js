/**
 * @file         file-store.js
 * @description  笔记文件的基础读写操作模块，封装 notes 目录下的文件 CRUD
 * @author       tianxj22
 * @created      2024-06-24
 * @updated      2024-06-24
 * @version      1.1.0
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

/**
 * 删除指定笔记文件
 * @param {string} filePath - 笔记文件的绝对路径
 * @returns {boolean} 删除成功返回 true，文件不存在或失败返回 false
 */
function deleteNote(filePath) {
  try {
    if (!fs.existsSync(filePath)) return false;
    fs.unlinkSync(filePath);
    return true;
  } catch (err) {
    console.error('删除笔记失败:', err.message);
    return false;
  }
}

/**
 * 重命名笔记文件（移动/改名）
 * @param {string} oldPath - 原文件绝对路径
 * @param {string} newTitle - 新标题（不含时间戳，会自动追加）
 * @returns {{ filePath: string, fileName: string } | null} 新文件路径信息，失败返回 null
 */
function renameNote(oldPath, newTitle) {
  try {
    if (!fs.existsSync(oldPath)) return null;
    const dir = path.dirname(oldPath);
    const timestamp = Date.now();
    const safeTitle = newTitle || '未命名笔记';
    const newFileName = `${safeTitle}_${timestamp}.txt`;
    const newPath = path.join(dir, newFileName);
    fs.renameSync(oldPath, newPath);
    return { filePath: newPath, fileName: newFileName };
  } catch (err) {
    console.error('重命名笔记失败:', err.message);
    return null;
  }
}

/**
 * 复制笔记文件（创建副本）
 * @param {string} filePath - 原文件绝对路径
 * @returns {{ filePath: string, fileName: string } | null} 副本路径信息，失败返回 null
 */
function duplicateNote(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const baseName = path.basename(filePath, ext).replace(/_\d+$/, '');
    const timestamp = Date.now();
    const newFileName = `${baseName} - 副本_${timestamp}${ext}`;
    const newPath = path.join(dir, newFileName);
    fs.copyFileSync(filePath, newPath);
    return { filePath: newPath, fileName: newFileName };
  } catch (err) {
    console.error('复制笔记失败:', err.message);
    return null;
  }
}

/**
 * 剪切笔记文件（移动至剪贴板目录）
 * @param {string} notesDir - notes 目录路径
 * @param {string} filePath - 原文件绝对路径
 * @returns {{ filePath: string, fileName: string } | null} 剪贴板中的文件路径信息，失败返回 null
 */
function cutNote(notesDir, filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const clipboardDir = path.join(notesDir, '.clipboard');
    if (!fs.existsSync(clipboardDir)) {
      fs.mkdirSync(clipboardDir, { recursive: true });
    }
    const fileName = path.basename(filePath);
    const destPath = path.join(clipboardDir, fileName);
    // 如果目标已存在，追加时间戳
    const finalDest = fs.existsSync(destPath)
      ? path.join(clipboardDir, fileName.replace(/\.txt$/, `_${Date.now()}.txt`))
      : destPath;
    fs.renameSync(filePath, finalDest);
    return { filePath: finalDest, fileName: path.basename(finalDest) };
  } catch (err) {
    console.error('剪切笔记失败:', err.message);
    return null;
  }
}

module.exports = { ensureNotesDir, createNote, listNotes, readNote, saveNote, deleteNote, renameNote, duplicateNote, cutNote };
