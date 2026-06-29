/**
 * @file         file-store-metadata.test.mjs
 * @description  file-store.js 元数据头与扩展名功能单元测试
 * @author       tianxj22
 * @created      2026-06-29
 * @updated      2026-06-29
 * @version      1.0.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const fileStore = require('../../file-store.js');

describe('file-store metadata & extension', () => {
  let tmpDir, notesDir;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `note-diary-meta-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    notesDir = path.join(tmpDir, 'notes');
    fs.mkdirSync(notesDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('getMetadata', () => {
    it('U-70: 应正确解析文件中的元数据头', () => {
      const content = '<!--\n{\n  "title": "Test Note",\n  "created": 1719700000000,\n  "modified": 1719701000000,\n  "version": 1\n}\n-->\n---DRAWING---\n\n---TEXT---\n<p>Hello</p>';
      const filePath = path.join(notesDir, 'test.html');
      fs.writeFileSync(filePath, content, 'utf-8');

      const meta = fileStore.getMetadata(filePath);
      expect(meta).not.toBeNull();
      expect(meta.title).toBe('Test Note');
      expect(meta.created).toBe(1719700000000);
      expect(meta.modified).toBe(1719701000000);
      expect(meta.version).toBe(1);
    });

    it('U-71: 无元数据头的文件应返回 null', () => {
      const filePath = path.join(notesDir, 'old.txt');
      fs.writeFileSync(filePath, '---DRAWING---\n\n---TEXT---\nplain text', 'utf-8');

      const meta = fileStore.getMetadata(filePath);
      expect(meta).toBeNull();
    });

    it('U-72: 不存在文件应返回 null', () => {
      const meta = fileStore.getMetadata('/nonexistent/file.html');
      expect(meta).toBeNull();
    });
  });

  describe('setMetadata', () => {
    it('U-73: 应为无头文件添加元数据头', () => {
      const filePath = path.join(notesDir, 'test.txt');
      fs.writeFileSync(filePath, '---DRAWING---\n\n---TEXT---\nhello', 'utf-8');

      fileStore.setMetadata(filePath, { title: 'My Title', created: 1000, modified: 2000 });

      const raw = fs.readFileSync(filePath, 'utf-8');
      expect(raw.startsWith('<!--')).toBe(true);
      expect(raw).toContain('"title": "My Title"');
      expect(raw).toContain('---TEXT---');
      expect(raw).toContain('hello');
    });

    it('U-74: 应更新已有元数据头的文件', () => {
      const filePath = path.join(notesDir, 'test.html');
      const original = '<!--\n{\n  "title": "Old",\n  "created": 1000,\n  "modified": 2000,\n  "version": 1\n}\n-->\n---DRAWING---\n\n---TEXT---\nbody';
      fs.writeFileSync(filePath, original, 'utf-8');

      fileStore.setMetadata(filePath, { title: 'New Title', modified: 3000 });

      const meta = fileStore.getMetadata(filePath);
      expect(meta.title).toBe('New Title');
      expect(meta.modified).toBe(3000);
      expect(meta.created).toBe(1000); // 保持原有
      expect(meta.version).toBe(2);     // 版本递增

      // 检查正文未被破坏
      const raw = fs.readFileSync(filePath, 'utf-8');
      expect(raw).toContain('body');
    });
  });

  describe('createNote with extension', () => {
    it('U-75: 默认扩展名 .txt 创建笔记', () => {
      const result = fileStore.createNote(notesDir, '测试笔记');
      expect(result.fileName).toMatch(/\.txt$/);
      expect(fs.existsSync(result.filePath)).toBe(true);

      const meta = fileStore.getMetadata(result.filePath);
      expect(meta).not.toBeNull();
      expect(meta.title).toBe('测试笔记');
    });

    it('U-76: .html 扩展名创建笔记并包含元数据头', () => {
      const result = fileStore.createNote(notesDir, 'HTML笔记', '.html');
      expect(result.fileName).toMatch(/\.html$/);
      expect(fs.existsSync(result.filePath)).toBe(true);

      const raw = fs.readFileSync(result.filePath, 'utf-8');
      expect(raw.startsWith('<!--')).toBe(true);
      expect(raw).toContain('"title": "HTML笔记"');

      const meta = fileStore.getMetadata(result.filePath);
      expect(meta.title).toBe('HTML笔记');
    });
  });

  describe('listNotes with metadata', () => {
    it('U-77: 应优先从元数据头读取 displayName', () => {
      const f = fileStore.createNote(notesDir, '元数据笔记', '.html');
      // 直接修改文件中的元数据标题（不同于文件名）
      fileStore.setMetadata(f.filePath, { title: '自定义显示名' });

      const notes = fileStore.listNotes(notesDir, { ext: '.html' });
      expect(notes.length).toBe(1);
      expect(notes[0].displayName).toBe('自定义显示名');
    });

    it('U-78: 无元数据头时回退到文件名解析', () => {
      // 创建不含元数据头的旧格式文件
      const fileName = '旧笔记_1719700000000.txt';
      const filePath = path.join(notesDir, fileName);
      fs.writeFileSync(filePath, 'old content', 'utf-8');

      const notes = fileStore.listNotes(notesDir, { ext: '.txt' });
      expect(notes.length).toBe(1);
      expect(notes[0].displayName).toBe('旧笔记');
    });

    it('U-79: 指定扩展名过滤只返回对应文件', () => {
      fileStore.createNote(notesDir, 'TXT笔记', '.txt');
      fileStore.createNote(notesDir, 'HTML笔记', '.html');

      const txtNotes = fileStore.listNotes(notesDir, { ext: '.txt' });
      const htmlNotes = fileStore.listNotes(notesDir, { ext: '.html' });

      expect(txtNotes.length).toBe(1);
      expect(txtNotes[0].displayName).toBe('TXT笔记');
      expect(htmlNotes.length).toBe(1);
      expect(htmlNotes[0].displayName).toBe('HTML笔记');
    });
  });

  describe('renameNote with metadata', () => {
    it('U-80: 重命名应更新元数据头中的标题', () => {
      const f = fileStore.createNote(notesDir, '原名', '.html');
      const result = fileStore.renameNote(f.filePath, '新名称');
      expect(result).not.toBeNull();

      const meta = fileStore.getMetadata(result.filePath);
      expect(meta.title).toBe('新名称');
    });
  });
});
