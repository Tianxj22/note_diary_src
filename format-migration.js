/**
 * @file         format-migration.js
 * @description  笔记文件格式迁移 — 批量重命名扩展名 + 补充元数据头
 * @author       tianxj22
 * @created      2026-06-29
 * @updated      2026-06-29
 * @version      1.0.0
 */

const fs = require('fs');
const path = require('path');

const TRASH_DIR = '.trash';
const CLIPBOARD_DIR = '.clipboard';
const NAME_STACK_FILE = '.name-stack.json';
const TRASH_META_FILE = '.trash-meta.json';

/**
 * 生成元数据头
 * @param {string} title - 笔记标题
 * @param {number} created - 创建时间戳
 * @param {number} modified - 修改时间戳
 * @returns {string}
 */
function buildMetadataHeader(title, created, modified) {
  const meta = { title, created, modified, version: 1 };
  return '<!--\n' + JSON.stringify(meta, null, 2) + '\n-->\n';
}

/**
 * 检测是否需要迁移
 * @param {string} notesDir - notes 目录路径
 * @param {string} targetExt - 目标扩展名（如 '.html'）
 * @returns {boolean}
 */
function needsMigration(notesDir, targetExt) {
  if (!fs.existsSync(notesDir)) return false;

  const oldExt = targetExt === '.html' ? '.txt' : '.html';
  const currentExtFiles = fs.readdirSync(notesDir)
    .filter(f => f.endsWith(targetExt) && !f.startsWith('.'));

  // 如果已经有目标扩展名的文件，不需要迁移
  if (currentExtFiles.length > 0) return false;

  const oldExtFiles = fs.readdirSync(notesDir)
    .filter(f => f.endsWith(oldExt) && !f.startsWith('.'));

  return oldExtFiles.length > 0;
}

/**
 * 从文件名解析标题和创建时间
 * @param {string} fileName - 文件名（如 "我的笔记_1719700000000.txt"）
 * @returns {{ title: string, created: number }}
 */
function parseFileName(fileName) {
  const baseName = fileName.replace(/\.(txt|html)$/, '');
  const tsMatch = baseName.match(/_(\d{13})$/);
  if (tsMatch) {
    return {
      title: baseName.substring(0, baseName.lastIndexOf('_')),
      created: parseInt(tsMatch[1], 10),
    };
  }
  return { title: baseName, created: Date.now() };
}

/**
 * 批量迁移笔记文件扩展名并补充元数据头
 * @param {string} notesDir - notes 目录路径
 * @param {string} targetExt - 目标扩展名（如 '.html'）
 * @returns {{ migrated: number, skipped: number, errors: string[] }}
 */
function migrateNotesToFormat(notesDir, targetExt) {
  const result = { migrated: 0, skipped: 0, errors: [] };

  if (!fs.existsSync(notesDir)) return result;

  const oldExt = targetExt === '.html' ? '.txt' : '.html';
  const ignored = new Set([TRASH_DIR, CLIPBOARD_DIR, NAME_STACK_FILE, TRASH_META_FILE]);

  const files = fs.readdirSync(notesDir)
    .filter(f => f.endsWith(oldExt) && !ignored.has(f));

  files.forEach(fileName => {
    const filePath = path.join(notesDir, fileName);
    try {
      const stat = fs.statSync(filePath);
      const parsed = parseFileName(fileName);
      const content = fs.readFileSync(filePath, 'utf-8');

      // 跳过已有元数据头的文件
      let newContent;
      if (content.startsWith('<!--')) {
        newContent = content;
        result.skipped++;
      } else {
        const header = buildMetadataHeader(
          parsed.title,
          parsed.created || stat.birthtimeMs,
          stat.mtimeMs
        );
        newContent = header + content;
      }

      // 重命名文件
      const newFileName = fileName.replace(new RegExp(oldExt.replace('.', '\\.') + '$'), targetExt);
      const newFilePath = path.join(notesDir, newFileName);

      fs.writeFileSync(filePath, newContent, 'utf-8');
      if (newFileName !== fileName) {
        fs.renameSync(filePath, newFilePath);
      }
      result.migrated++;
    } catch (err) {
      result.errors.push(`${fileName}: ${err.message}`);
      console.error('Migration error for', fileName, ':', err.message);
    }
  });

  return result;
}

module.exports = { needsMigration, migrateNotesToFormat, buildMetadataHeader, parseFileName };
