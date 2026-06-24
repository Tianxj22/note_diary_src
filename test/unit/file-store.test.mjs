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
  // U-12, U-13: 删除笔记
  describe('deleteNote', () => {
    it('U-12: 应删除存在的文件并返回 true', () => {
      const notesDir = fileStore.ensureNotesDir(tmpDir);
      const { filePath } = fileStore.createNote(notesDir, '待删除');

      expect(fs.existsSync(filePath)).toBe(true);
      const result = fileStore.deleteNote(filePath);
      expect(result).toBe(true);
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('U-13: 删除不存在的文件应返回 false', () => {
      const result = fileStore.deleteNote(path.join(tmpDir, '不存在.txt'));
      expect(result).toBe(false);
    });
  });

  // U-14, U-15: 重命名笔记
  describe('renameNote', () => {
    it('U-14: 应重命名文件并返回新路径信息', () => {
      const notesDir = fileStore.ensureNotesDir(tmpDir);
      const { filePath } = fileStore.createNote(notesDir, '旧标题');

      const result = fileStore.renameNote(filePath, '新标题');

      expect(result).not.toBeNull();
      expect(result.fileName).toMatch(/^新标题_\d+\.txt$/);
      expect(fs.existsSync(result.filePath)).toBe(true);
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('U-15: 重命名不存在的文件应返回 null', () => {
      const result = fileStore.renameNote(path.join(tmpDir, '不存在.txt'), 'X');
      expect(result).toBeNull();
    });
  });

  // U-16, U-17: 复制笔记
  describe('duplicateNote', () => {
    it('U-16: 应创建副本文件并返回路径信息', () => {
      const notesDir = fileStore.ensureNotesDir(tmpDir);
      const { filePath } = fileStore.createNote(notesDir, '原稿');
      const content = '副本测试内容';
      fs.writeFileSync(filePath, content, 'utf-8');

      const result = fileStore.duplicateNote(filePath);

      expect(result).not.toBeNull();
      expect(result.fileName).toContain('原稿 - 副本');
      expect(fs.existsSync(result.filePath)).toBe(true);
      expect(fs.readFileSync(result.filePath, 'utf-8')).toBe(content);
      // 原文件应保留
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('U-17: 复制不存在的文件应返回 null', () => {
      const result = fileStore.duplicateNote(path.join(tmpDir, '不存在.txt'));
      expect(result).toBeNull();
    });
  });

  describe('getNextDefaultName', () => {
    it('U-20: 首次调用应返回"新建笔记本"（不带序号）', () => {
      const notesDir = fileStore.ensureNotesDir(tmpDir);
      const result = fileStore.getNextDefaultName(notesDir);
      expect(result.title).toBe('新建笔记本');
      expect(result.number).toBe(1);
    });

    it('U-21: 连续调用应递增序号', () => {
      const notesDir = fileStore.ensureNotesDir(tmpDir);
      const r1 = fileStore.getNextDefaultName(notesDir);
      const r2 = fileStore.getNextDefaultName(notesDir);
      const r3 = fileStore.getNextDefaultName(notesDir);
      expect(r1.title).toBe('新建笔记本');
      expect(r2.title).toBe('新建笔记本 (2)');
      expect(r3.title).toBe('新建笔记本 (3)');
    });

    it('U-22: 归还序号后应复用最小可用序号（栈弹出）', () => {
      const notesDir = fileStore.ensureNotesDir(tmpDir);
      // 创建 1, 2, 3
      fileStore.getNextDefaultName(notesDir); // 1
      fileStore.getNextDefaultName(notesDir); // 2
      fileStore.getNextDefaultName(notesDir); // 3
      // 归还 2
      fileStore.releaseNameNumber(notesDir, 2);
      // 下一个应从栈中弹出 2
      const result = fileStore.getNextDefaultName(notesDir);
      expect(result.number).toBe(2);
      expect(result.title).toBe('新建笔记本 (2)');
    });

    it('U-23: 归还多个序号后应按从小到大顺序复用', () => {
      const notesDir = fileStore.ensureNotesDir(tmpDir);
      // 创建 1, 2, 3
      fileStore.getNextDefaultName(notesDir); // 1
      fileStore.getNextDefaultName(notesDir); // 2
      fileStore.getNextDefaultName(notesDir); // 3
      // 归还 3 和 2
      fileStore.releaseNameNumber(notesDir, 3);
      fileStore.releaseNameNumber(notesDir, 2);
      // 降序排列后栈为 [3, 2]，pop 返回 2（最小）
      const r1 = fileStore.getNextDefaultName(notesDir);
      expect(r1.number).toBe(2);
      const r2 = fileStore.getNextDefaultName(notesDir);
      expect(r2.number).toBe(3);
    });

    it('U-23a: 归还序号 3 再归还 2，应先复用 2', () => {
      const notesDir = fileStore.ensureNotesDir(tmpDir);
      fileStore.getNextDefaultName(notesDir); // 1
      fileStore.getNextDefaultName(notesDir); // 2
      fileStore.getNextDefaultName(notesDir); // 3
      fileStore.releaseNameNumber(notesDir, 3);
      fileStore.releaseNameNumber(notesDir, 2);
      expect(fileStore.getNextDefaultName(notesDir).number).toBe(2);
      expect(fileStore.getNextDefaultName(notesDir).number).toBe(3);
    });

    it('U-23b: 归还非连续序号应先复用最小的', () => {
      const notesDir = fileStore.ensureNotesDir(tmpDir);
      for (let i = 0; i < 5; i++) fileStore.getNextDefaultName(notesDir); // 1-5
      fileStore.releaseNameNumber(notesDir, 5);
      fileStore.releaseNameNumber(notesDir, 1);
      fileStore.releaseNameNumber(notesDir, 3);
      // 降序排列后栈为 [5, 3, 1]，pop 返回 1（最小）
      expect(fileStore.getNextDefaultName(notesDir).number).toBe(1);
      expect(fileStore.getNextDefaultName(notesDir).number).toBe(3);
      expect(fileStore.getNextDefaultName(notesDir).number).toBe(5);
    });

    it('U-23c: 归还后栈空应继续递增 maxNumber', () => {
      const notesDir = fileStore.ensureNotesDir(tmpDir);
      fileStore.getNextDefaultName(notesDir); // 1
      fileStore.getNextDefaultName(notesDir); // 2
      fileStore.releaseNameNumber(notesDir, 2);
      fileStore.releaseNameNumber(notesDir, 1);
      // 复用 1, 2
      expect(fileStore.getNextDefaultName(notesDir).number).toBe(1);
      expect(fileStore.getNextDefaultName(notesDir).number).toBe(2);
      // 栈空，递增
      expect(fileStore.getNextDefaultName(notesDir).number).toBe(3);
    });

    it('U-24: 栈空后应继续递增 maxNumber', () => {
      const notesDir = fileStore.ensureNotesDir(tmpDir);
      // 创建 1, 2
      fileStore.getNextDefaultName(notesDir); // 1
      fileStore.getNextDefaultName(notesDir); // 2
      // 归还 1, 2
      fileStore.releaseNameNumber(notesDir, 1);
      fileStore.releaseNameNumber(notesDir, 2);
      // 复用 2, 1
      fileStore.getNextDefaultName(notesDir); // 2
      fileStore.getNextDefaultName(notesDir); // 1
      // 栈空，应继续 3
      const result = fileStore.getNextDefaultName(notesDir);
      expect(result.number).toBe(3);
      expect(result.title).toBe('新建笔记本 (3)');
    });
  });

  describe('releaseNameNumber', () => {
    it('U-25: 重复归还同一序号不应重复入栈', () => {
      const notesDir = fileStore.ensureNotesDir(tmpDir);
      fileStore.getNextDefaultName(notesDir); // 1
      fileStore.releaseNameNumber(notesDir, 1);
      fileStore.releaseNameNumber(notesDir, 1);
      // 弹出一次
      const r1 = fileStore.getNextDefaultName(notesDir);
      expect(r1.number).toBe(1);
      // 栈应为空，下一个递增
      const r2 = fileStore.getNextDefaultName(notesDir);
      expect(r2.number).toBe(2);
    });

    it('U-26: 归还无效序号（0/负数）不应影响栈', () => {
      const notesDir = fileStore.ensureNotesDir(tmpDir);
      fileStore.releaseNameNumber(notesDir, 0);
      fileStore.releaseNameNumber(notesDir, -1);
      const result = fileStore.getNextDefaultName(notesDir);
      expect(result.number).toBe(1);
    });
  });

  // U-18, U-19: 剪切笔记
  describe('cutNote', () => {
    it('U-18: 应移动文件到剪贴板目录并返回路径信息', () => {
      const notesDir = fileStore.ensureNotesDir(tmpDir);
      const { filePath } = fileStore.createNote(notesDir, '要剪切的笔记');
      const content = '剪切测试';
      fs.writeFileSync(filePath, content, 'utf-8');

      const result = fileStore.cutNote(notesDir, filePath);

      expect(result).not.toBeNull();
      expect(result.filePath).toContain('.clipboard');
      expect(fs.existsSync(result.filePath)).toBe(true);
      expect(fs.readFileSync(result.filePath, 'utf-8')).toBe(content);
      // 原文件应消失
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('U-19: 剪切不存在的文件应返回 null', () => {
      const notesDir = fileStore.ensureNotesDir(tmpDir);
      const result = fileStore.cutNote(notesDir, path.join(tmpDir, '不存在.txt'));
      expect(result).toBeNull();
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
