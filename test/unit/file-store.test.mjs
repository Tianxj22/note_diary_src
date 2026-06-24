/**
 * @file         file-store.test.mjs
 * @description  file-store.js 模块的单元测试，覆盖所有函数的正常路径和边界情况
 * @author       tianxj22
 * @created      2024-06-24
 * @updated      2024-06-24
 * @version      1.0.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const fileStore = require('../../file-store.js');

describe('file-store', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `note-diary-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('ensureNotesDir', () => {
    it('U-01: 应创建 notes 目录并返回正确路径', () => {
      const notesDir = fileStore.ensureNotesDir(tmpDir);
      const expected = path.join(tmpDir, 'notes');
      expect(notesDir).toBe(expected);
      expect(fs.existsSync(notesDir)).toBe(true);
      expect(fs.statSync(notesDir).isDirectory()).toBe(true);
    });

    it('U-02: 对已存在的目录再次调用不应报错', () => {
      const first = fileStore.ensureNotesDir(tmpDir);
      const second = fileStore.ensureNotesDir(tmpDir);
      expect(second).toBe(first);
      expect(fs.existsSync(second)).toBe(true);
    });
  });

  describe('createNote', () => {
    it('U-03: 应创建笔记文件并返回路径信息', () => {
      const notesDir = fileStore.ensureNotesDir(tmpDir);
      const result = fileStore.createNote(notesDir, '测试笔记');

      expect(result).toHaveProperty('filePath');
      expect(result).toHaveProperty('fileName');
      expect(result.fileName).toMatch(/^测试笔记_\d+\.txt$/);
      expect(fs.existsSync(result.filePath)).toBe(true);
      expect(fs.readFileSync(result.filePath, 'utf-8')).toBe('');
    });

    it('U-04: 空标题应使用默认名称"未命名笔记"', () => {
      const notesDir = fileStore.ensureNotesDir(tmpDir);
      const result = fileStore.createNote(notesDir, '');

      expect(result.fileName).toMatch(/^未命名笔记_\d+\.txt$/);
    });

    it('U-04 补充: null/undefined 标题也应使用默认名称', () => {
      const notesDir = fileStore.ensureNotesDir(tmpDir);
      const result = fileStore.createNote(notesDir, null);

      expect(result.fileName).toMatch(/^未命名笔记_\d+\.txt$/);
    });
  });

  describe('listNotes', () => {
    it('U-05: 空目录应返回空数组', () => {
      const notesDir = fileStore.ensureNotesDir(tmpDir);
      const result = fileStore.listNotes(notesDir);
      expect(result).toEqual([]);
    });

    it('U-05 补充: 不存在的目录应返回空数组', () => {
      const result = fileStore.listNotes(path.join(tmpDir, 'nonexistent'));
      expect(result).toEqual([]);
    });

    it('U-06: 应返回所有笔记并按修改时间倒序排列', async () => {
      const notesDir = fileStore.ensureNotesDir(tmpDir);

      fileStore.createNote(notesDir, '笔记A');
      await sleep(10);
      fileStore.createNote(notesDir, '笔记B');
      await sleep(10);
      fileStore.createNote(notesDir, '笔记C');

      const result = fileStore.listNotes(notesDir);

      expect(result).toHaveLength(3);
      expect(result[0].displayName).toBe('笔记C');
      expect(result[1].displayName).toBe('笔记B');
      expect(result[2].displayName).toBe('笔记A');
    });

    it('U-06: 每条记录应包含 fileName/filePath/displayName/mtime', () => {
      const notesDir = fileStore.ensureNotesDir(tmpDir);
      fileStore.createNote(notesDir, '测试');

      const result = fileStore.listNotes(notesDir);
      const note = result[0];

      expect(note).toHaveProperty('fileName');
      expect(note).toHaveProperty('filePath');
      expect(note).toHaveProperty('displayName');
      expect(note).toHaveProperty('mtime');
      expect(typeof note.mtime).toBe('number');
    });

    it('U-07: 应过滤掉非 .txt 文件', () => {
      const notesDir = fileStore.ensureNotesDir(tmpDir);
      fileStore.createNote(notesDir, '笔记');
      fs.writeFileSync(path.join(notesDir, 'config.json'), '{}', 'utf-8');
      fs.writeFileSync(path.join(notesDir, 'readme.md'), '# readme', 'utf-8');

      const result = fileStore.listNotes(notesDir);
      expect(result).toHaveLength(1);
      expect(result[0].fileName).toMatch(/\.txt$/);
    });

    it('U-07: displayName 应正确去掉后缀和时间戳', () => {
      const notesDir = fileStore.ensureNotesDir(tmpDir);
      fileStore.createNote(notesDir, '我的灵感笔记');

      const result = fileStore.listNotes(notesDir);
      expect(result[0].displayName).toBe('我的灵感笔记');
    });
  });

  describe('readNote', () => {
    it('U-08: 应返回文件的完整文本内容', () => {
      const notesDir = fileStore.ensureNotesDir(tmpDir);
      const { filePath } = fileStore.createNote(notesDir, '测试');
      const content = '第一行\n第二行\n第三行';
      fs.writeFileSync(filePath, content, 'utf-8');

      const result = fileStore.readNote(filePath);
      expect(result).toBe(content);
    });

    it('U-09: 读取不存在的文件应返回空字符串', () => {
      const result = fileStore.readNote(path.join(tmpDir, 'does-not-exist.txt'));
      expect(result).toBe('');
    });

    it('U-08 补充: 空文件应返回空字符串', () => {
      const notesDir = fileStore.ensureNotesDir(tmpDir);
      const { filePath } = fileStore.createNote(notesDir, '空笔记');

      const result = fileStore.readNote(filePath);
      expect(result).toBe('');
    });
  });

  describe('saveNote', () => {
    it('U-10: 应写入内容到文件并返回 true', () => {
      const notesDir = fileStore.ensureNotesDir(tmpDir);
      const { filePath } = fileStore.createNote(notesDir, '测试');
      const content = 'Hello, Note Diary!';

      const result = fileStore.saveNote(filePath, content);

      expect(result).toBe(true);
      expect(fs.readFileSync(filePath, 'utf-8')).toBe(content);
    });

    it('U-10: 应覆盖已有内容', () => {
      const notesDir = fileStore.ensureNotesDir(tmpDir);
      const { filePath } = fileStore.createNote(notesDir, '测试');
      fs.writeFileSync(filePath, '旧内容', 'utf-8');

      fileStore.saveNote(filePath, '新内容');

      expect(fs.readFileSync(filePath, 'utf-8')).toBe('新内容');
    });

    it('U-11: 写入无效路径应返回 false 而不抛异常', () => {
      const invalidPath = process.platform === 'win32'
        ? 'Z:\\invalid\\path\\note.txt'
        : '/root/invalid/path/note.txt';

      let result;
      expect(() => {
        result = fileStore.saveNote(invalidPath, 'test');
      }).not.toThrow();

      expect(result).toBe(false);
    });

    it('U-10 补充: 保存空字符串也应成功', () => {
      const notesDir = fileStore.ensureNotesDir(tmpDir);
      const { filePath } = fileStore.createNote(notesDir, '测试');
      fs.writeFileSync(filePath, '有内容', 'utf-8');

      const result = fileStore.saveNote(filePath, '');

      expect(result).toBe(true);
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('');
    });
  });
});

/**
 * 异步延迟工具函数
 * @param {number} ms - 延迟毫秒数
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
