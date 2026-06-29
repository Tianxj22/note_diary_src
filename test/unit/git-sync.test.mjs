/**
 * @file         git-sync.test.mjs
 * @description  git-sync.js Git 同步模块的单元测试
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
const gitSync = require('../../git-sync.js');

describe('git-sync', () => {
  let tmpDir, notesDir;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `note-diary-git-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    notesDir = path.join(tmpDir, 'notes');
    fs.mkdirSync(notesDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('buildAuthUrl', () => {
    it('U-91: GitHub URL 应使用 token:x-oauth-basic 认证格式', () => {
      const url = gitSync.buildAuthUrl('https://github.com/user/repo.git', 'ghp_token123');
      expect(url).toContain('ghp_token123');
      expect(url).toContain('x-oauth-basic');
      expect(url).toContain('github.com');
    });

    it('U-91a: GitLab URL 应使用 oauth2:token 认证格式', () => {
      const url = gitSync.buildAuthUrl('https://gitlab.com/user/repo.git', 'glpat-abc123');
      expect(url).toContain('oauth2');
      expect(url).toContain('glpat-abc123');
      expect(url).toContain('gitlab.com');
    });

    it('U-91b: 自托管 GitLab URL 应使用 oauth2:token 认证格式', () => {
      const url = gitSync.buildAuthUrl('https://gitlab.example.com/user/repo.git', 'glpat-xyz');
      expect(url).toContain('oauth2');
      expect(url).toContain('glpat-xyz');
      expect(url).toContain('gitlab.example.com');
    });

    it('U-91c: 通用 Git 托管应使用 token:token 格式', () => {
      const url = gitSync.buildAuthUrl('https://gitee.com/user/repo.git', 'my-token');
      expect(url).toContain('token');
      expect(url).toContain('my-token');
      expect(url).toContain('gitee.com');
    });

    it('U-92: 无 Token 时应返回原 URL', () => {
      const url = gitSync.buildAuthUrl('https://github.com/user/repo.git', '');
      expect(url).toBe('https://github.com/user/repo.git');
    });
  });

  describe('initRepo', () => {
    it('U-93: 应在空目录中初始化 Git 仓库', async () => {
      const result = await gitSync.initRepo(notesDir);
      expect(result.success).toBe(true);
      expect(fs.existsSync(path.join(notesDir, '.git'))).toBe(true);
      expect(fs.existsSync(path.join(notesDir, '.gitignore'))).toBe(true);

      const gitignore = fs.readFileSync(path.join(notesDir, '.gitignore'), 'utf-8');
      expect(gitignore).toContain('.trash/');
      expect(gitignore).toContain('.name-stack.json');
    });

    it('U-94: 重复 init 应幂等（不报错）', async () => {
      await gitSync.initRepo(notesDir);
      const result = await gitSync.initRepo(notesDir);
      expect(result.success).toBe(true);
    });
  });

  describe('getStatus + commit', () => {
    it('U-95: initRepo 后 .gitignore 应为未跟踪文件', async () => {
      await gitSync.initRepo(notesDir);
      // initRepo 创建了 .gitignore（未跟踪），所以仓库不 clean
      const status = await gitSync.getStatus(notesDir);
      expect(status.clean).toBe(false); // .gitignore is untracked
      expect(status.changedCount).toBeGreaterThanOrEqual(1);

      // 提交后应 clean
      await gitSync.commit(notesDir, 'init');
      const status2 = await gitSync.getStatus(notesDir);
      expect(status2.clean).toBe(true);
    });

    it('U-96: 新增文件应被检测到', async () => {
      await gitSync.initRepo(notesDir);
      // 创建一个笔记文件
      fs.writeFileSync(path.join(notesDir, 'test_1700000000000.html'), 'content', 'utf-8');

      const status = await gitSync.getStatus(notesDir);
      expect(status.clean).toBe(false);
      expect(status.changedCount).toBeGreaterThanOrEqual(1);
    });

    it('U-97: commit 应成功提交文件', async () => {
      await gitSync.initRepo(notesDir);
      fs.writeFileSync(path.join(notesDir, 'test_1700000000000.html'), 'test content', 'utf-8');

      const result = await gitSync.commit(notesDir, 'test commit');
      expect(result.success).toBe(true);
      expect(result.commitHash).toBeDefined();

      // 提交后应 clean
      const status = await gitSync.getStatus(notesDir);
      expect(status.clean).toBe(true);
    });

    it('U-98: 无变更时 commit 应返回成功', async () => {
      await gitSync.initRepo(notesDir);
      const result = await gitSync.commit(notesDir, 'empty commit');
      expect(result.success).toBe(true);
    });
  });

  describe('hasConflicts', () => {
    it('U-99: 无冲突文件应返回 false', async () => {
      fs.writeFileSync(path.join(notesDir, 'normal.html'), 'normal content', 'utf-8');
      const result = await gitSync.hasConflicts(notesDir);
      expect(result.hasConflicts).toBe(false);
    });

    it('U-100: 含冲突标记的文件应被检测到', async () => {
      const conflictContent = 'some text\n<<<<<<< HEAD\nlocal change\n=======\nremote change\n>>>>>>> branch\nmore text';
      fs.writeFileSync(path.join(notesDir, 'conflict.html'), conflictContent, 'utf-8');

      const result = await gitSync.hasConflicts(notesDir);
      expect(result.hasConflicts).toBe(true);
      expect(result.conflictFiles).toContain('conflict.html');
    });
  });

  describe('getSyncState / updateSyncState', () => {
    it('U-101: 初始状态应返回零值', () => {
      const state = gitSync.getSyncState(notesDir);
      expect(state.lastPull).toBe(0);
      expect(state.lastPush).toBe(0);
    });

    it('U-102: updateSyncState 应更新并持久化', () => {
      gitSync.updateSyncState(notesDir, 'pull');
      const state = gitSync.getSyncState(notesDir);
      expect(state.lastPull).toBeGreaterThan(0);
      expect(state.lastPush).toBe(0);

      gitSync.updateSyncState(notesDir, 'push');
      const state2 = gitSync.getSyncState(notesDir);
      expect(state2.lastPush).toBeGreaterThan(0);
    });
  });

  describe('configureUser', () => {
    it('U-103: 应配置 Git 用户名和邮箱', async () => {
      await gitSync.initRepo(notesDir);
      const result = await gitSync.configureUser(notesDir, 'Test User', 'test@example.com');
      expect(result.success).toBe(true);
    });
  });

  describe('pull/push 错误处理', () => {
    it('U-104: 未配置远程时 pull 应返回错误', async () => {
      await gitSync.initRepo(notesDir);
      const result = await gitSync.pull(notesDir, 'main', '');
      expect(result.success).toBe(false);
      expect(result.message).toContain('未配置远程');
    });

    it('U-105: 未配置远程时 push 应返回错误', async () => {
      await gitSync.initRepo(notesDir);
      const result = await gitSync.push(notesDir, 'main', '');
      expect(result.success).toBe(false);
      expect(result.message).toContain('未配置远程');
    });
  });
});
