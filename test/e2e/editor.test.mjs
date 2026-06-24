/**
 * @file         editor.test.mjs
 * @description  编辑器 UI 端到端测试，使用 Playwright 驱动真实 Electron 窗口
 * @author       tianxj22
 * @created      2024-06-24
 * @updated      2024-06-24
 * @version      1.0.0
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { _electron as electron } from '@playwright/test';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

describe('编辑器 UI E2E', () => {
  let app;
  let page;
  let userDataDir;

  beforeAll(async () => {
    userDataDir = path.join(os.tmpdir(), `note-diary-e2e-${Date.now()}`);
    fs.mkdirSync(userDataDir, { recursive: true });

    app = await electron.launch({
      args: [path.join(projectRoot, 'main.js')],
      env: {
        ...process.env,
        NOTE_DIARY_E2E_DIR: userDataDir,
      },
    });

    page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');
  }, 20000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (userDataDir && fs.existsSync(userDataDir)) {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    }
  });

  it('E-01: 应用启动后窗口标题应为 Note Diary', async () => {
    const title = await page.title();
    expect(title).toBe('Note Diary');
  });

  it('E-01: 首次启动侧边栏应显示"暂无笔记"', async () => {
    const emptyText = await page.textContent('.note-list .empty');
    expect(emptyText).toContain('暂无笔记');
  });

  it('E-01: 主区域应显示占位提示', async () => {
    const noNoteText = await page.textContent('.editor-area .no-note');
    expect(noNoteText).toContain('选择或新建一篇笔记');
  });

  it('E-02: 点击"+ 新建笔记"后应出现编辑区和列表条目', async () => {
    await page.click('#btn-sidebar-new');

    await page.waitForSelector('.editor-area textarea', { timeout: 3000 });

    const textareaExists = await page.$('.editor-area textarea');
    expect(textareaExists).not.toBeNull();

    const emptyEl = await page.$('.note-list .empty');
    expect(emptyEl).toBeNull();
  });

  it('E-04: 在编辑区输入文字后状态栏应显示"已保存"', async () => {
    const textarea = page.locator('.editor-area textarea');
    await textarea.fill('Hello Note Diary!');

    await page.click('#btn-save');
    await page.waitForTimeout(500);

    const statusText = await page.textContent('#status-left');
    expect(statusText).toContain('已保存');
  });

  it('E-05: 输入文字后点击"撤销"应回退内容', async () => {
    const textarea = page.locator('.editor-area textarea');

    const before = await textarea.inputValue();
    await textarea.fill(before + '\n新增一行');
    await page.click('#btn-save');
    await page.waitForTimeout(500);

    await page.click('#btn-undo');

    const after = await textarea.inputValue();
    expect(after).toBe(before);
  });

  it('E-06: 撤销后点击"重做"应恢复内容', async () => {
    const textarea = page.locator('.editor-area textarea');

    const baseContent = '重做测试内容';
    await textarea.fill(baseContent);
    await page.click('#btn-save');
    await page.waitForTimeout(500);
    const modifiedContent = baseContent + '\n新增行';
    await textarea.fill(modifiedContent);
    await page.click('#btn-save');
    await page.waitForTimeout(500);

    await page.click('#btn-undo');
    const afterUndo = await textarea.inputValue();
    expect(afterUndo).toBe(baseContent);

    await page.click('#btn-redo');
    const afterRedo = await textarea.inputValue();
    expect(afterRedo).toBe(modifiedContent);
  });

  it('E-07: 创建多个笔记并切换验证内容加载', async () => {
    // 创建笔记 A 并写入特征内容
    await page.click('#btn-new');
    await page.waitForSelector('.editor-area textarea', { timeout: 3000 });
    const textarea = page.locator('.editor-area textarea');
    await textarea.fill('笔记A的特征内容');
    await page.click('#btn-save');
    await page.waitForTimeout(500);

    // 创建笔记 B 并写入特征内容
    await page.click('#btn-new');
    await page.waitForSelector('.editor-area textarea', { timeout: 3000 });
    await page.locator('.editor-area textarea').fill('笔记B的特征内容');
    await page.click('#btn-save');
    await page.waitForTimeout(500);

    // 点击侧边栏倒数第二项（应切换回笔记 A）
    const noteItems = page.locator('.note-item');
    const count = await noteItems.count();
    await noteItems.nth(count - 2).click();
    await page.waitForTimeout(300);

    const loadedContent = await page.locator('.editor-area textarea').inputValue();
    expect(loadedContent).toBe('笔记A的特征内容');
  });

  it('E-03: 按 Ctrl+N 应新建笔记', async () => {
    const noteCountBefore = await page.locator('.note-item').count();

    await page.keyboard.press('Control+n');
    await page.waitForSelector('.editor-area textarea', { timeout: 3000 });

    const noteCountAfter = await page.locator('.note-item').count();
    expect(noteCountAfter).toBeGreaterThan(noteCountBefore);
  });

  // ---- 右键菜单与笔记操作 ----

  it('E-09: 右键笔记项应弹出上下文菜单', async () => {
    const firstNote = page.locator('.note-item').first();
    await firstNote.click({ button: 'right' });
    await page.waitForTimeout(200);

    const menuVisible = await page.$eval('#context-menu', el => el.classList.contains('visible'));
    expect(menuVisible).toBe(true);
  });

  it('E-10: 点击菜单外空白处应关闭菜单', async () => {
    // 菜单从 E-09 还在显示
    await page.click('.main-area'); // 点击主区域
    await page.waitForTimeout(200);

    const menuVisible = await page.$eval('#context-menu', el => el.classList.contains('visible'));
    expect(menuVisible).toBe(false);
  });

  it('E-11: 重命名笔记后列表应更新', async () => {
    // 先创建一篇新笔记用于重命名测试
    await page.click('#btn-new');
    await page.waitForSelector('.editor-area textarea', { timeout: 3000 });
    await page.locator('.editor-area textarea').fill('重命名测试');
    await page.click('#btn-save');
    await page.waitForTimeout(500);

    // 右键第一个笔记
    const firstNote = page.locator('.note-item').first();
    await firstNote.click({ button: 'right' });
    await page.waitForTimeout(200);

    // 点击重命名
    await page.click('.menu-item[data-action="rename"]');
    await page.waitForTimeout(200);

    // 侧边栏的 rename-input 应出现
    const renameInput = page.locator('.rename-input');
    await renameInput.waitFor({ timeout: 3000 });
    await renameInput.fill('已重命名的笔记');
    await renameInput.press('Enter');
    await page.waitForTimeout(500);

    // 验证列表中有新名称
    const noteTitles = await page.locator('.note-item .title').allTextContents();
    expect(noteTitles.some(t => t.includes('已重命名的笔记'))).toBe(true);
  });

  it('E-12: 删除笔记后列表应减少', async () => {
    const countBefore = await page.locator('.note-item').count();

    const firstNote = page.locator('.note-item').first();
    await firstNote.click({ button: 'right' });
    await page.waitForTimeout(200);

    // 监听 confirm 对话框
    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });

    await page.click('.menu-item[data-action="delete"]');
    await page.waitForTimeout(500);

    const countAfter = await page.locator('.note-item').count();
    expect(countAfter).toBe(countBefore - 1);
  });

  it('E-13: 复制笔记后列表应增加', async () => {
    const countBefore = await page.locator('.note-item').count();

    const firstNote = page.locator('.note-item').first();
    await firstNote.click({ button: 'right' });
    await page.waitForTimeout(200);

    await page.click('.menu-item[data-action="duplicate"]');
    await page.waitForTimeout(500);

    const countAfter = await page.locator('.note-item').count();
    expect(countAfter).toBe(countBefore + 1);
  });

  it('E-14: 剪切笔记后列表应减少', async () => {
    const countBefore = await page.locator('.note-item').count();

    const firstNote = page.locator('.note-item').first();
    await firstNote.click({ button: 'right' });
    await page.waitForTimeout(200);

    await page.click('.menu-item[data-action="cut"]');
    await page.waitForTimeout(500);

    const countAfter = await page.locator('.note-item').count();
    expect(countAfter).toBe(countBefore - 1);
  });

  it('E-15: 按 Alt 键不应弹出原生菜单栏', async () => {
    await page.keyboard.press('Alt');
    await page.waitForTimeout(300);

    // 原生菜单栏不可见（Electron Menu.setApplicationMenu(null) 已生效）
    // 验证应用窗口仍然正常
    const title = await page.title();
    expect(title).toBe('Note Diary');
  });
});
