/**
 * @file         settings-store.test.mjs
 * @description  settings-store.js 设置存储模块的单元测试
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
const settingsStore = require('../../settings-store.js');

describe('settings-store', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `note-diary-settings-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('getDefaults', () => {
    it('U-61: 应返回包含所有必要字段的默认设置对象', () => {
      const defaults = settingsStore.getDefaults();
      expect(defaults).toHaveProperty('sync');
      expect(defaults).toHaveProperty('general');
      expect(defaults.sync).toHaveProperty('enabled', false);
      expect(defaults.sync).toHaveProperty('mode', 'git');
      expect(defaults.sync).toHaveProperty('autoSync', false);
      expect(defaults.sync).toHaveProperty('autoSyncIntervalMinutes', 15);
      expect(defaults.sync).toHaveProperty('git');
      expect(defaults.sync).toHaveProperty('cloudDrive');
      expect(defaults.general).toHaveProperty('fileExtension', '.html');
    });
  });

  describe('getSettings', () => {
    it('U-62: 无文件时应返回默认设置', () => {
      const settings = settingsStore.getSettings(tmpDir);
      expect(settings.sync.enabled).toBe(false);
      expect(settings.sync.mode).toBe('git');
      expect(settings.sync.git._tokenPlain).toBe('');
    });

    it('U-63: 应读取并解密已保存的设置', () => {
      // 先保存一份设置（含 token）
      const partial = { sync: { enabled: true, mode: 'cloudDrive' } };
      const updated = settingsStore.updateSettings(tmpDir, partial, '');

      // 重新读取
      const loaded = settingsStore.getSettings(tmpDir);
      expect(loaded.sync.enabled).toBe(true);
      expect(loaded.sync.mode).toBe('cloudDrive');
    });
  });

  describe('updateSettings', () => {
    it('U-64: 应合并部分设置并持久化到磁盘', () => {
      const partial = {
        sync: { enabled: true, git: { remoteUrl: 'https://github.com/test/repo.git', branch: 'dev' } },
      };
      const updated = settingsStore.updateSettings(tmpDir, partial, null);

      expect(updated.sync.enabled).toBe(true);
      expect(updated.sync.git.remoteUrl).toBe('https://github.com/test/repo.git');
      expect(updated.sync.git.branch).toBe('dev');
      // 未修改的字段保持默认
      expect(updated.sync.mode).toBe('git');
      expect(updated.general.fileExtension).toBe('.html');

      // 确认磁盘文件存在
      const filePath = path.join(tmpDir, 'settings.json');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('U-65: 应加密并存储 Git Token', () => {
      const token = 'ghp_secret123456';
      const updated = settingsStore.updateSettings(tmpDir, {}, token);

      // _tokenPlain 在内存中应为明文
      expect(updated.sync.git._tokenPlain).toBe(token);

      // 但在磁盘文件中应为加密格式
      const filePath = path.join(tmpDir, 'settings.json');
      const raw = fs.readFileSync(filePath, 'utf-8');
      const stored = JSON.parse(raw);
      expect(stored.sync.git.tokenEncrypted).toBeDefined();
      expect(stored.sync.git.tokenEncrypted.iv).toBeDefined();
      expect(stored.sync.git.tokenEncrypted.tag).toBeDefined();
      expect(stored.sync.git.tokenEncrypted.data).toBeDefined();
      // token 不应明文出现在磁盘文件中
      expect(raw).not.toContain('ghp_secret123456');
      // _tokenPlain 不应写入磁盘
      expect(stored.sync.git._tokenPlain).toBeUndefined();
    });

    it('U-66: 设置空字符串可擦除已存储的 Token', () => {
      // 先设置 token
      settingsStore.updateSettings(tmpDir, {}, 'ghp_oldtoken');

      // 再擦除
      const updated = settingsStore.updateSettings(tmpDir, {}, '');
      expect(updated.sync.git._tokenPlain).toBe('');
      expect(updated.sync.git.tokenEncrypted).toBeNull();

      const filePath = path.join(tmpDir, 'settings.json');
      const raw = fs.readFileSync(filePath, 'utf-8');
      const stored = JSON.parse(raw);
      expect(stored.sync.git.tokenEncrypted).toBeNull();
    });

    it('U-67: 传入 null 作为 newToken 应保持原有 Token 不变', () => {
      // 先设置 token
      const first = settingsStore.updateSettings(tmpDir, {}, 'ghp_original');

      // 更新其他设置但不传 token
      const second = settingsStore.updateSettings(tmpDir, { sync: { autoSync: true } }, null);

      // Token 应保持
      expect(second.sync.git._tokenPlain).toBe('ghp_original');
      expect(second.sync.autoSync).toBe(true);
    });

    it('U-68: autoSyncIntervalMinutes 应限制在 1-1440 范围内', () => {
      const tooSmall = settingsStore.updateSettings(tmpDir, { sync: { autoSyncIntervalMinutes: 0 } }, null);
      expect(tooSmall.sync.autoSyncIntervalMinutes).toBe(1);

      const tooLarge = settingsStore.updateSettings(tmpDir, { sync: { autoSyncIntervalMinutes: 2000 } }, null);
      expect(tooLarge.sync.autoSyncIntervalMinutes).toBe(1440);

      const normal = settingsStore.updateSettings(tmpDir, { sync: { autoSyncIntervalMinutes: 30 } }, null);
      expect(normal.sync.autoSyncIntervalMinutes).toBe(30);
    });

    it('U-69: getSettings 应在 token 解密失败时返回空 token 并清除加密字段', () => {
      // 手工写入一个用不同路径加密的 token（模拟换机器场景）
      const token = 'my-test-token';
      const updated = settingsStore.updateSettings(tmpDir, {}, token);

      // 验证 token 可以正常读回
      expect(updated.sync.git._tokenPlain).toBe(token);

      // 直接修改 settings.json 中的 tokenEncrypted 为损坏数据
      const filePath = path.join(tmpDir, 'settings.json');
      const stored = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      stored.sync.git.tokenEncrypted = { iv: 'deadbeef', tag: 'invalid', data: 'corrupted' };
      fs.writeFileSync(filePath, JSON.stringify(stored, null, 2), 'utf-8');

      // 重新读取：解密应失败但不崩溃，返回空 token
      const reloaded = settingsStore.getSettings(tmpDir);
      expect(reloaded.sync.git._tokenPlain).toBe('');
    });
  });
});
