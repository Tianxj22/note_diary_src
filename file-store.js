/**
 * @file         file-store.js
 * @description  笔记文件的基础读写操作模块，封装 notes 目录下的文件 CRUD、回收站、排序
 * @author       tianxj22
 * @created      2024-06-24
 * @updated      2026-06-29
 * @version      1.3.0
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_NOTE_NAME = '新建笔记本';
const DEFAULT_EXT = '.txt';
const NAME_STACK_FILE = '.name-stack.json';
const TRASH_DIR = '.trash';
const TRASH_META_FILE = '.trash-meta.json';
const CLIPBOARD_DIR = '.clipboard';

// ===== 元数据头 =====

const METADATA_HEADER_START = '<!--';
const METADATA_HEADER_END = '-->';

/**
 * 从文件内容中解析元数据头
 * @param {string} filePath - 文件路径
 * @returns {{ title: string, created: number, modified: number, version: number }|null}
 */
function getMetadata(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    if (!raw.startsWith(METADATA_HEADER_START)) return null;

    const endIdx = raw.indexOf(METADATA_HEADER_END);
    if (endIdx === -1) return null;

    const jsonStr = raw.substring(METADATA_HEADER_START.length, endIdx).trim();
    return JSON.parse(jsonStr);
  } catch (_) {
    return null;
  }
}

/**
 * 构建元数据头字符串
 * @param {object} meta - { title, created, modified, version }
 * @returns {string}
 */
function buildMetadataString(meta) {
  return METADATA_HEADER_START + '\n' + JSON.stringify(meta, null, 2) + '\n' + METADATA_HEADER_END + '\n';
}

/**
 * 更新文件中的元数据头
 * @param {string} filePath - 文件路径
 * @param {object} meta - 要更新的元数据字段
 * @returns {boolean}
 */
function setMetadata(filePath, meta) {
  try {
    if (!fs.existsSync(filePath)) return false;
    const raw = fs.readFileSync(filePath, 'utf-8');
    const existing = getMetadata(filePath) || {};
    const merged = Object.assign({}, existing, meta, { version: (existing.version || 0) + 1 });
    const header = buildMetadataString(merged);

    let newContent;
    if (raw.startsWith(METADATA_HEADER_START)) {
      const endIdx = raw.indexOf(METADATA_HEADER_END);
      newContent = header + raw.substring(endIdx + METADATA_HEADER_END.length + 1); // +1 for \n
    } else {
      newContent = header + raw;
    }
    fs.writeFileSync(filePath, newContent, 'utf-8');
    return true;
  } catch (err) {
    console.error('setMetadata failed:', err.message);
    return false;
  }
}

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

function createNote(notesDir, title, ext) {
  const safeTitle = title || '未命名笔记';
  const timestamp = Date.now();
  const extension = ext || DEFAULT_EXT;
  const fileName = `${safeTitle}_${timestamp}${extension}`;
  const filePath = path.join(notesDir, fileName);
  // 写入元数据头
  const header = buildMetadataString({ title: safeTitle, created: timestamp, modified: timestamp, version: 1 });
  fs.writeFileSync(filePath, header, 'utf-8');
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
  const ext = opts.ext || DEFAULT_EXT;
  if (!fs.existsSync(notesDir)) return [];

  const ignored = new Set([TRASH_DIR, CLIPBOARD_DIR]);

  const notes = fs.readdirSync(notesDir)
    .filter(f => f.endsWith(ext))
    .map(f => {
      const filePath = path.join(notesDir, f);
      const stat = fs.statSync(filePath);
      // 优先读取元数据头，回退到文件名解析
      const meta = getMetadata(filePath);
      let displayName, createdAt;
      if (meta && meta.title) {
        displayName = meta.title;
        createdAt = meta.created || stat.birthtimeMs;
      } else {
        displayName = f.replace(new RegExp(ext.replace('.', '\\.') + '$'), '').replace(/_\d+$/, '');
        const tsMatch = f.match(/_(\d{13})/);
        createdAt = tsMatch ? parseInt(tsMatch[1], 10) : stat.birthtimeMs;
      }
      return {
        fileName: f,
        filePath,
        displayName,
        mtime: (meta && meta.modified) ? meta.modified : stat.mtimeMs,
        createdAt,
      };
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
    const ext = path.extname(fileName);
    const oldBasename = path.basename(filePath, ext);
    const destPath = path.join(trashDir, fileName);
    // 如果回收站已有同名文件，追加时间戳
    const finalName = fs.existsSync(destPath)
      ? fileName.replace(new RegExp(ext.replace('.', '\\.') + '$'), `_${Date.now()}${ext}`)
      : fileName;
    const finalPath = path.join(trashDir, finalName);
    const newBasename = path.basename(finalPath, ext);
    fs.renameSync(filePath, finalPath);

    // 同步移动资源文件夹到回收站
    const oldAssetDir = path.join(notesDir, 'assets', oldBasename);
    if (fs.existsSync(oldAssetDir)) {
      const trashAssetsDir = path.join(trashDir, 'assets');
      if (!fs.existsSync(trashAssetsDir)) {
        fs.mkdirSync(trashAssetsDir, { recursive: true });
      }
      const newAssetDir = path.join(trashAssetsDir, newBasename);
      fs.renameSync(oldAssetDir, newAssetDir);
    }

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
function listTrash(notesDir, ext) {
  const extension = ext || DEFAULT_EXT;
  const trashDir = path.join(notesDir, TRASH_DIR);
  if (!fs.existsSync(trashDir)) return [];
  const meta = loadTrashMeta(notesDir);
  return fs.readdirSync(trashDir)
    .filter(f => f.endsWith(extension))
    .map(f => ({
      fileName: f,
      displayName: f.replace(new RegExp(extension.replace('.', '\\.') + '$'), '').replace(/_\d+$/, ''),
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
    const ext = path.extname(fileName);
    const basename = path.basename(fileName, ext);
    const destPath = path.join(notesDir, fileName);
    fs.renameSync(srcPath, destPath);

    // 同步恢复资源文件夹
    const trashAssetsDir = path.join(trashDir, 'assets', basename);
    if (fs.existsSync(trashAssetsDir)) {
      const assetsDir = path.join(notesDir, 'assets');
      if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
      }
      const destAssetDir = path.join(assetsDir, basename);
      fs.renameSync(trashAssetsDir, destAssetDir);
    }

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
    const trashDir = path.join(notesDir, TRASH_DIR);
    const filePath = path.join(trashDir, fileName);
    if (!fs.existsSync(filePath)) return false;
    const ext = path.extname(fileName);
    const basename = path.basename(fileName, ext);
    fs.unlinkSync(filePath);

    // 同步删除资源文件夹
    const trashAssetsDir = path.join(trashDir, 'assets', basename);
    if (fs.existsSync(trashAssetsDir)) {
      fs.rmSync(trashAssetsDir, { recursive: true, force: true });
    }

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
function emptyTrash(notesDir, ext) {
  try {
    const trashDir = path.join(notesDir, TRASH_DIR);
    if (!fs.existsSync(trashDir)) return true;
    const extension = ext || DEFAULT_EXT;
    fs.readdirSync(trashDir)
      .filter(f => f.endsWith(extension))
      .forEach(f => fs.unlinkSync(path.join(trashDir, f)));
    const metaPath = path.join(trashDir, TRASH_META_FILE);
    if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);

    // 同步清空回收站中的资源文件夹
    const trashAssetsDir = path.join(trashDir, 'assets');
    if (fs.existsSync(trashAssetsDir)) {
      fs.rmSync(trashAssetsDir, { recursive: true, force: true });
    }
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
    const ext = path.extname(oldPath) || DEFAULT_EXT;
    const oldBasename = path.basename(oldPath, ext);
    const newFileName = `${safeTitle}_${timestamp}${ext}`;
    const newPath = path.join(dir, newFileName);
    const newBasename = path.basename(newPath, ext);

    // 先更新元数据头中的标题（在重命名之前）
    setMetadata(oldPath, { title: safeTitle, modified: timestamp });

    fs.renameSync(oldPath, newPath);

    // 同步重命名资源文件夹
    const oldAssetDir = path.join(dir, 'assets', oldBasename);
    const newAssetDir = path.join(dir, 'assets', newBasename);
    if (fs.existsSync(oldAssetDir)) {
      fs.renameSync(oldAssetDir, newAssetDir);
    }

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
    const oldBasename = path.basename(filePath, ext);
    const baseName = path.basename(filePath, ext).replace(/_\d+$/, '');
    const timestamp = Date.now();
    const newFileName = `${baseName} - 副本_${timestamp}${ext}`;
    const newPath = path.join(dir, newFileName);
    const newBasename = path.basename(newPath, ext);
    fs.copyFileSync(filePath, newPath);

    // 同步复制资源文件夹
    const oldAssetDir = path.join(dir, 'assets', oldBasename);
    if (fs.existsSync(oldAssetDir)) {
      const newAssetDir = path.join(dir, 'assets', newBasename);
      copyDirectorySync(oldAssetDir, newAssetDir);
    }

    return { filePath: newPath, fileName: newFileName };
  } catch (err) {
    console.error('复制笔记失败:', err.message);
    return null;
  }
}

/**
 * 递归复制目录
 * @param {string} src - 源目录
 * @param {string} dest - 目标目录
 */
function copyDirectorySync(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirectorySync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
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
    const ext = path.extname(fileName);
    const destPath = path.join(clipboardDir, fileName);
    const finalDest = fs.existsSync(destPath)
      ? path.join(clipboardDir, fileName.replace(new RegExp(ext.replace('.', '\\.') + '$'), `_${Date.now()}${ext}`))
      : destPath;
    fs.renameSync(filePath, finalDest);
    return { filePath: finalDest, fileName: path.basename(finalDest) };
  } catch (err) {
    console.error('剪切笔记失败:', err.message);
    return null;
  }
}

// ===== 资源文件夹管理 =====

/**
 * 获取笔记对应的资源文件夹路径
 * @param {string} noteFilePath - 笔记文件绝对路径
 * @param {string} notesDir - notes 目录路径
 * @returns {string} 资源文件夹绝对路径
 */
function getAssetDir(noteFilePath, notesDir) {
  const basename = path.basename(noteFilePath, path.extname(noteFilePath));
  return path.join(notesDir, 'assets', basename);
}

/**
 * 复制文件到笔记的资源文件夹
 * @param {string} noteFilePath - 笔记文件绝对路径
 * @param {string} sourceFilePath - 源文件绝对路径
 * @param {string} notesDir - notes 目录路径
 * @returns {string} 相对路径，如 'assets/xxx.ext'，失败返回 null
 */
function copyAssetFile(noteFilePath, sourceFilePath, notesDir) {
  try {
    if (!fs.existsSync(sourceFilePath)) return null;
    const ext = path.extname(sourceFilePath).toLowerCase();
    const assetDir = getAssetDir(noteFilePath, notesDir);
    if (!fs.existsSync(assetDir)) {
      fs.mkdirSync(assetDir, { recursive: true });
    }
    const filename = Date.now() + '_' + Math.random().toString(36).slice(2, 8) + ext;
    const destPath = path.join(assetDir, filename);
    fs.copyFileSync(sourceFilePath, destPath);
    return 'assets/' + filename;
  } catch (err) {
    console.error('copyAssetFile failed:', err.message);
    return null;
  }
}

/**
 * 将 base64 data URI 保存为资源文件
 * @param {string} noteFilePath - 笔记文件绝对路径
 * @param {string} base64DataUri - data URI（如 data:image/png;base64,...）
 * @param {string} notesDir - notes 目录路径
 * @returns {string} 相对路径，如 'assets/xxx.png'，失败返回 null
 */
function saveBase64Asset(noteFilePath, base64DataUri, notesDir) {
  try {
    const match = base64DataUri.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) return null;
    const mime = match[1];
    const b64 = match[2];
    let ext = mime.split('/')[1];
    if (ext === 'jpeg') ext = 'jpg';
    const buf = Buffer.from(b64, 'base64');

    const assetDir = getAssetDir(noteFilePath, notesDir);
    if (!fs.existsSync(assetDir)) {
      fs.mkdirSync(assetDir, { recursive: true });
    }
    const filename = Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '.' + ext;
    const destPath = path.join(assetDir, filename);
    fs.writeFileSync(destPath, buf);
    return 'assets/' + filename;
  } catch (err) {
    console.error('saveBase64Asset failed:', err.message);
    return null;
  }
}

/**
 * 保存绘图数据为 drawing.png（覆盖写）
 * @param {string} noteFilePath - 笔记文件绝对路径
 * @param {string} base64DataUri - data URI
 * @param {string} notesDir - notes 目录路径
 * @returns {string} 'assets/drawing.png' 或空字符串
 */
function saveDrawingAsset(noteFilePath, base64DataUri, notesDir) {
  try {
    const match = base64DataUri.match(/^data:image\/png;base64,(.+)$/);
    if (!match) return '';
    const buf = Buffer.from(match[1], 'base64');

    // 空画布检测：如果所有像素都是透明（alpha=0），跳过保存
    // PNG 文件头 + IHDR 检查，简化：检查 buffer 前几个字节
    if (buf.length < 100) return ''; // 太小的 PNG 大概率是空白

    const assetDir = getAssetDir(noteFilePath, notesDir);
    if (!fs.existsSync(assetDir)) {
      fs.mkdirSync(assetDir, { recursive: true });
    }
    const destPath = path.join(assetDir, 'drawing.png');
    fs.writeFileSync(destPath, buf);
    return 'assets/drawing.png';
  } catch (err) {
    console.error('saveDrawingAsset failed:', err.message);
    return '';
  }
}

/**
 * 删除笔记对应的资源文件夹
 * @param {string} noteFilePath - 笔记文件绝对路径
 * @param {string} notesDir - notes 目录路径
 */
function deleteAssetDir(noteFilePath, notesDir) {
  try {
    const assetDir = getAssetDir(noteFilePath, notesDir);
    if (fs.existsSync(assetDir)) {
      fs.rmSync(assetDir, { recursive: true, force: true });
    }
  } catch (err) {
    console.error('deleteAssetDir failed:', err.message);
  }
}

module.exports = {
  ensureNotesDir, createNote, listNotes, readNote, saveNote, deleteNote,
  moveToTrash, renameNote, duplicateNote, cutNote,
  getNextDefaultName, releaseNameNumber,
  listTrash, restoreFromTrash, permanentlyDelete, emptyTrash,
  getMetadata, setMetadata, buildMetadataString, DEFAULT_EXT,
  getAssetDir, copyAssetFile, saveBase64Asset, saveDrawingAsset, deleteAssetDir,
};
