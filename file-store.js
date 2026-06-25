/**
 * @file         file-store.js
 * @description  笔记文件的基础读写操作模块，封装 notes 目录下的文件 CRUD、回收站、排序
 * @author       tianxj22
 * @created      2024-06-24
 * @updated      2026-06-25
 * @version      1.2.0
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_NOTE_NAME = '新建笔记本';
const NAME_STACK_FILE = '.name-stack.json';
const TRASH_DIR = '.trash';
const TRASH_META_FILE = '.trash-meta.json';
const CLIPBOARD_DIR = '.clipboard';

// ===== 命名栈 =====

function loadNameStack(notesDir) {
  const stackPath = path.join(notesDir, NAME_STACK_FILE);
  try {
    if (fs.existsSync(stackPath)) {
      return JSON.parse(fs.readFileSync(stackPath, 'utf-8'));
    }
  } catch (_) { /* 文件损坏则重建 */ }
  return { availableStack: [], maxNumber: 0 };
}

function saveNameStack(notesDir, state) {
  const stackPath = path.join(notesDir, NAME_STACK_FILE);
  fs.writeFileSync(stackPath, JSON.stringify(state), 'utf-8');
}

function getNextDefaultName(notesDir) {
  const state = loadNameStack(notesDir);
  let num;
  if (state.availableStack.length > 0) {
    num = state.availableStack.pop();
  } else {
    num = ++state.maxNumber;
  }
  saveNameStack(notesDir, state);
  const title = num === 1 ? DEFAULT_NOTE_NAME : `${DEFAULT_NOTE_NAME} (${num})`;
  return { title, number: num };
}

function releaseNameNumber(notesDir, num) {
  if (!num || num < 1) return;
  const state = loadNameStack(notesDir);
  if (!state.availableStack.includes(num)) {
    state.availableStack.push(num);
    state.availableStack.sort((a, b) => b - a);
    saveNameStack(notesDir, state);
  }
}

// ===== 目录 =====

function ensureNotesDir(baseDir) {
  const notesDir = path.join(baseDir, 'notes');
  if (!fs.existsSync(notesDir)) {
    fs.mkdirSync(notesDir, { recursive: true });
  }
  return notesDir;
}

// ===== 回收站元数据 =====

function loadTrashMeta(notesDir) {
  const trashDir = path.join(notesDir, TRASH_DIR);
  const metaPath = path.join(trashDir, TRASH_META_FILE);
  try {
    if (fs.existsSync(metaPath)) {
      return JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    }
  } catch (_) { /* 文件损坏则重建 */ }
  return {};
}

function saveTrashMeta(notesDir, meta) {
  const trashDir = path.join(notesDir, TRASH_DIR);
  if (!fs.existsSync(trashDir)) {
    fs.mkdirSync(trashDir, { recursive: true });
  }
  const metaPath = path.join(trashDir, TRASH_META_FILE);
  fs.writeFileSync(metaPath, JSON.stringify(meta), 'utf-8');
}

// ===== CRUD =====

function createNote(notesDir, title) {
  const safeTitle = title || '未命名笔记';
  const timestamp = Date.now();
  const fileName = `${safeTitle}_${timestamp}.txt`;
  const filePath = path.join(notesDir, fileName);
  fs.writeFileSync(filePath, '', 'utf-8');
  return { filePath, fileName };
}

/**
 * 列出所有笔记文件，支持排序，排除 .trash / .clipboard 目录
 * @param {string} notesDir - notes 目录路径
 * @param {object} [opts] - 排序选项
 * @param {string} [opts.sortBy='mtime'] - 'name' | 'created' | 'mtime'
 * @param {string} [opts.sortDir='desc'] - 'asc' | 'desc'
 * @returns {Array<{ fileName: string, filePath: string, displayName: string, mtime: number, createdAt: number }>}
 */
function listNotes(notesDir, opts = {}) {
  const { sortBy = 'mtime', sortDir = 'desc' } = opts;
  if (!fs.existsSync(notesDir)) return [];

  const ignored = new Set([TRASH_DIR, CLIPBOARD_DIR]);

  const notes = fs.readdirSync(notesDir)
    .filter(f => f.endsWith('.txt'))
    .map(f => {
      const filePath = path.join(notesDir, f);
      const stat = fs.statSync(filePath);
      const displayName = f.replace(/\.txt$/, '').replace(/_\d+$/, '');
      // 从文件名解析创建时间（格式：标题_时间戳.txt）
      const tsMatch = f.match(/_(\d{13})\.txt$/);
      const createdAt = tsMatch ? parseInt(tsMatch[1], 10) : stat.mtimeMs;
      return { fileName: f, filePath, displayName, mtime: stat.mtimeMs, createdAt };
    })
    // 排除回收站和剪贴板中的文件
    .filter(n => {
      const parent = path.basename(path.dirname(n.filePath));
      return !ignored.has(parent);
    });

  const dir = sortDir === 'asc' ? 1 : -1;
  if (sortBy === 'name') {
    notes.sort((a, b) => dir * a.displayName.localeCompare(b.displayName, 'zh-CN'));
  } else if (sortBy === 'created') {
    notes.sort((a, b) => dir * (a.createdAt - b.createdAt));
  } else {
    notes.sort((a, b) => dir * (a.mtime - b.mtime));
  }
  return notes;
}

function readNote(filePath) {
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf-8');
}

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
 * 删除笔记：移入回收站（非永久删除）
 * @param {string} notesDir - notes 目录路径
 * @param {string} filePath - 笔记文件绝对路径
 * @returns {boolean}
 */
function moveToTrash(notesDir, filePath) {
  try {
    if (!fs.existsSync(filePath)) return false;
    const trashDir = path.join(notesDir, TRASH_DIR);
    if (!fs.existsSync(trashDir)) {
      fs.mkdirSync(trashDir, { recursive: true });
    }
    const fileName = path.basename(filePath);
    const destPath = path.join(trashDir, fileName);
    // 如果回收站已有同名文件，追加时间戳
    const finalName = fs.existsSync(destPath)
      ? fileName.replace(/\.txt$/, `_${Date.now()}.txt`)
      : fileName;
    const finalPath = path.join(trashDir, finalName);
    fs.renameSync(filePath, finalPath);

    // 记录删除时间
    const meta = loadTrashMeta(notesDir);
    meta[finalName] = Date.now();
    saveTrashMeta(notesDir, meta);
    return true;
  } catch (err) {
    console.error('删除笔记失败:', err.message);
    return false;
  }
}

/**
 * 永久删除文件（已废弃，保留向后兼容）
 * @deprecated 使用 moveToTrash 代替
 */
function deleteNote(filePath) {
  try {
    if (!fs.existsSync(filePath)) return false;
    fs.unlinkSync(filePath);
    return true;
  } catch (err) {
    console.error('永久删除笔记失败:', err.message);
    return false;
  }
}

// ===== 回收站操作 =====

/** 列出回收站中的笔记 */
function listTrash(notesDir) {
  const trashDir = path.join(notesDir, TRASH_DIR);
  if (!fs.existsSync(trashDir)) return [];
  const meta = loadTrashMeta(notesDir);
  return fs.readdirSync(trashDir)
    .filter(f => f.endsWith('.txt'))
    .map(f => ({
      fileName: f,
      displayName: f.replace(/\.txt$/, '').replace(/_\d+$/, ''),
      deletedAt: meta[f] || 0,
    }))
    .sort((a, b) => b.deletedAt - a.deletedAt);
}

/** 从回收站恢复笔记 */
function restoreFromTrash(notesDir, fileName) {
  try {
    const trashDir = path.join(notesDir, TRASH_DIR);
    const srcPath = path.join(trashDir, fileName);
    if (!fs.existsSync(srcPath)) return null;
    const destPath = path.join(notesDir, fileName);
    fs.renameSync(srcPath, destPath);
    const meta = loadTrashMeta(notesDir);
    delete meta[fileName];
    saveTrashMeta(notesDir, meta);
    return { filePath: destPath, fileName };
  } catch (err) {
    console.error('恢复笔记失败:', err.message);
    return null;
  }
}

/** 永久删除回收站中的单个文件 */
function permanentlyDelete(notesDir, fileName) {
  try {
    const filePath = path.join(notesDir, TRASH_DIR, fileName);
    if (!fs.existsSync(filePath)) return false;
    fs.unlinkSync(filePath);
    const meta = loadTrashMeta(notesDir);
    delete meta[fileName];
    saveTrashMeta(notesDir, meta);
    return true;
  } catch (err) {
    console.error('永久删除失败:', err.message);
    return false;
  }
}

/** 清空回收站 */
function emptyTrash(notesDir) {
  try {
    const trashDir = path.join(notesDir, TRASH_DIR);
    if (!fs.existsSync(trashDir)) return true;
    fs.readdirSync(trashDir)
      .filter(f => f.endsWith('.txt'))
      .forEach(f => fs.unlinkSync(path.join(trashDir, f)));
    const metaPath = path.join(trashDir, TRASH_META_FILE);
    if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
    return true;
  } catch (err) {
    console.error('清空回收站失败:', err.message);
    return false;
  }
}

// ===== 重命名/复制 =====

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

function cutNote(notesDir, filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const clipboardDir = path.join(notesDir, CLIPBOARD_DIR);
    if (!fs.existsSync(clipboardDir)) {
      fs.mkdirSync(clipboardDir, { recursive: true });
    }
    const fileName = path.basename(filePath);
    const destPath = path.join(clipboardDir, fileName);
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

module.exports = {
  ensureNotesDir, createNote, listNotes, readNote, saveNote, deleteNote,
  moveToTrash, renameNote, duplicateNote, cutNote,
  getNextDefaultName, releaseNameNumber,
  listTrash, restoreFromTrash, permanentlyDelete, emptyTrash,
};
