/**
 * @file         format-migration.test.mjs
 * @description  format-migration.js 格式迁移模块的单元测试
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
const formatMigration = require('../../format-migration.js');

describe('format-migration', () => {
  let tmpDir, notesDir;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `note-diary-migrate-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    notesDir = path.join(tmpDir, 'notes');
    fs.mkdirSync(notesDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('buildMetadataHeader', () => {
    it('U-81: 应生成正确的 JSON 元数据头', () => {
      const header = formatMigration.buildMetadataHeader('测试', 1000, 2000);
      expect(header.startsWith('<!--')).toBe(true);
      expect(header).toContain('"title": "测试"');
      expect(header).toContain('"created": 1000');
      expect(header).toContain('"modified": 2000');
      expect(header.endsWith('-->\n')).toBe(true);
    });
  });

  describe('parseFileName', () => {
    it('U-82: 应正确解析含时间戳的文件名', () => {
      const result = formatMigration.parseFileName('我的笔记_1719700000000.txt');
      expect(result.title).toBe('我的笔记');
      expect(result.created).toBe(1719700000000);
    });

    it('U-83: 无时间戳时应使用当前时间', () => {
      const before = Date.now();
      const result = formatMigration.parseFileName('simple.txt');
      const after = Date.now();
      expect(result.title).toBe('simple');
      expect(result.created).toBeGreaterThanOrEqual(before);
      expect(result.created).toBeLessThanOrEqual(after);
    });
  });

  describe('needsMigration', () => {
    it('U-84: 存在 .txt 文件且目标是 .html 时应返回 true', () => {
      fs.writeFileSync(path.join(notesDir, 'note1_1700000000000.txt'), 'content', 'utf-8');
      expect(formatMigration.needsMigration(notesDir, '.html')).toBe(true);
    });

    it('U-85: 仅存在 .html 文件时（目标 .txt）应返回 true', () => {
      fs.writeFileSync(path.join(notesDir, 'note1_1700000000000.html'), 'content', 'utf-8');
      expect(formatMigration.needsMigration(notesDir, '.txt')).toBe(true);
    });

    it('U-86: 已存在目标扩展名文件时应返回 false', () => {
      fs.writeFileSync(path.join(notesDir, 'note1_1700000000000.html'), 'content', 'utf-8');
      expect(formatMigration.needsMigration(notesDir, '.html')).toBe(false);
    });

    it('U-87: 空目录应返回 false', () => {
      expect(formatMigration.needsMigration(notesDir, '.html')).toBe(false);
    });
  });

  describe('migrateNotesToFormat', () => {
    it('U-88: 应将 .txt 文件重命名为 .html 并添加元数据头', () => {
      const oldPath = path.join(notesDir, '我的笔记_1719700000000.txt');
      fs.writeFileSync(oldPath, '---DRAWING---\n\n---TEXT---\nhello world', 'utf-8');

      const result = formatMigration.migrateNotesToFormat(notesDir, '.html');
      expect(result.migrated).toBe(1);
      expect(result.errors.length).toBe(0);

      // 确认旧文件不存在
      expect(fs.existsSync(oldPath)).toBe(false);
      // 确认新文件存在
      const files = fs.readdirSync(notesDir).filter(f => f.endsWith('.html'));
      expect(files.length).toBe(1);
      // 确认新文件有元数据头
      const newContent = fs.readFileSync(path.join(notesDir, files[0]), 'utf-8');
      expect(newContent.startsWith('<!--')).toBe(true);
      expect(newContent).toContain('"title": "我的笔记"');
      // 确认正文未被破坏
      expect(newContent).toContain('hello world');
    });

    it('U-89: 已有元数据头的文件只做重命名不重复添加头', () => {
      const content = '<!--\n{}\n-->\ncontent';
      const oldPath = path.join(notesDir, 'has_meta_1700000000000.txt');
      fs.writeFileSync(oldPath, content, 'utf-8');

      const result = formatMigration.migrateNotesToFormat(notesDir, '.html');
      expect(result.migrated).toBe(1);
      // 已有元数据头的文件：skipped 计数（内容未修改）+ migrated 计数（已重命名）
      expect(result.skipped).toBe(1);
      expect(result.errors.length).toBe(0);

      // 确认文件被重命名且内容未变
      const files = fs.readdirSync(notesDir).filter(f => f.endsWith('.html'));
      expect(files.length).toBe(1);
      const newContent = fs.readFileSync(path.join(notesDir, files[0]), 'utf-8');
      expect(newContent).toBe(content);
    });

    it('U-90: 空目录迁移应返回零迁移', () => {
      const result = formatMigration.migrateNotesToFormat(notesDir, '.html');
      expect(result.migrated).toBe(0);
      expect(result.errors.length).toBe(0);
    });
  });
});
