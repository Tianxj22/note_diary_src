/**
 * @file         clipboard-media.test.mjs
 * @description  测试视频复制粘贴资源文件流程（copyAssetFile 跨笔记复制）
 * @author       tianxj22
 * @created      2026-07-08
 * @version      1.0.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const fileStore = require('../../file-store.js');

describe('clipboard-media (video copy-paste asset flow)', () => {
  let tmpDir, notesDir;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `note-diary-clipboard-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    notesDir = fileStore.ensureNotesDir(tmpDir);
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('copyAssetFile - 跨笔记复制', () => {
    it('C-01: 应将源笔记中的视频文件复制到目标笔记的 assets 文件夹', () => {
      // 模拟笔记 A：创建视频文件
      const noteA = path.join(notesDir, 'NoteA_1719700000000.txt');
      fs.writeFileSync(noteA, 'dummy', 'utf-8');
      const srcAssetDir = fileStore.getAssetDir(noteA, notesDir);
      fs.mkdirSync(srcAssetDir, { recursive: true });
      const srcVideo = path.join(srcAssetDir, 'test-video.mp4');
      fs.writeFileSync(srcVideo, Buffer.from('fake-video-data'));

      // 模拟笔记 B：目标笔记
      const noteB = path.join(notesDir, 'NoteB_1719700000001.txt');
      fs.writeFileSync(noteB, 'dummy', 'utf-8');

      // 复制：从笔记 A 的资源文件夹复制视频到笔记 B
      const relativePath = fileStore.copyAssetFile(noteB, srcVideo, notesDir);

      // 验证返回相对路径
      expect(relativePath).toBeTruthy();
      expect(relativePath.startsWith('assets/')).toBe(true);
      expect(relativePath.endsWith('.mp4')).toBe(true);

      // 验证文件实际存在于目标 assets 文件夹
      const destAssetDir = fileStore.getAssetDir(noteB, notesDir);
      const destFile = path.join(destAssetDir, path.basename(relativePath.replace('assets/', '')));
      expect(fs.existsSync(destFile)).toBe(true);
      expect(fs.readFileSync(destFile)).toEqual(Buffer.from('fake-video-data'));

      // 验证源文件未被删除
      expect(fs.existsSync(srcVideo)).toBe(true);
    });

    it('C-02: 源文件不存在时应返回 null', () => {
      const noteB = path.join(notesDir, 'NoteB_1719700000001.txt');
      fs.writeFileSync(noteB, 'dummy', 'utf-8');
      const nonExistent = path.join(notesDir, 'nonexistent.mp4');

      const result = fileStore.copyAssetFile(noteB, nonExistent, notesDir);
      expect(result).toBeNull();
    });

    it('C-03: 多次复制的文件应有不同的文件名', () => {
      const noteA = path.join(notesDir, 'NoteA_1719700000000.txt');
      fs.writeFileSync(noteA, 'dummy', 'utf-8');
      const srcAssetDir = fileStore.getAssetDir(noteA, notesDir);
      fs.mkdirSync(srcAssetDir, { recursive: true });
      const srcVideo = path.join(srcAssetDir, 'test.mp4');
      fs.writeFileSync(srcVideo, Buffer.from('data'));

      const noteB = path.join(notesDir, 'NoteB_1719700000001.txt');
      fs.writeFileSync(noteB, 'dummy', 'utf-8');

      // 连续复制两次
      const path1 = fileStore.copyAssetFile(noteB, srcVideo, notesDir);
      // 短暂延迟确保时间戳不同
      const start = Date.now();
      while (Date.now() === start) { /* busy wait */ }
      const path2 = fileStore.copyAssetFile(noteB, srcVideo, notesDir);

      expect(path1).toBeTruthy();
      expect(path2).toBeTruthy();
      expect(path1).not.toBe(path2); // 文件名应不同

      // 两个文件都存在
      const destDir = fileStore.getAssetDir(noteB, notesDir);
      const file1 = path.join(destDir, path.basename(path1.replace('assets/', '')));
      const file2 = path.join(destDir, path.basename(path2.replace('assets/', '')));
      expect(fs.existsSync(file1)).toBe(true);
      expect(fs.existsSync(file2)).toBe(true);
    });
  });

  describe('getAssetDir', () => {
    it('C-04: 应返回基于笔记文件名的 assets 子目录路径', () => {
      const notePath = path.join(notesDir, 'MyNote_1719700000000.txt');
      const assetDir = fileStore.getAssetDir(notePath, notesDir);
      expect(assetDir).toBe(path.join(notesDir, 'assets', 'MyNote_1719700000000'));
    });

    it('C-05: .html 扩展名的笔记也应正确推导资源目录', () => {
      const notePath = path.join(notesDir, 'MyNote_1719700000000.html');
      const assetDir = fileStore.getAssetDir(notePath, notesDir);
      expect(assetDir).toBe(path.join(notesDir, 'assets', 'MyNote_1719700000000'));
    });
  });
});
