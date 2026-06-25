/**
 * @file         editor-title.test.mjs
 * @description  编辑区标题输入框 E2E 测试 — 标题位置/同步 + 滚动隔离
 * @author       tianxj22
 * @created      2026-06-25
 * @updated      2026-06-25
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

describe('编辑区标题与滚动隔离 E2E', () => {
  let app;
  let page;
  let userDataDir;

  beforeAll(async () => {
    userDataDir = path.join(os.tmpdir(), `note-diary-e2e-title-${Date.now()}`);
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

  // ===== 标题位置与结构 =====

  it('ET-01: 新建笔记后标题输入框应在编辑区顶部，toolbar 中无旧 #note-title', async () => {
    await page.click('#btn-new');
    await page.waitForSelector('.editor-title-input', { timeout: 3000 });

    // 标题输入框存在于编辑区内
    const titleInEditor = await page.$('.editor-area .editor-title-input');
    expect(titleInEditor).not.toBeNull();

    // toolbar 中不再有旧的 #note-title
    const oldTitleInput = await page.$('#note-title');
    expect(oldTitleInput).toBeNull();
  });

  it('ET-02: 标题输入框应显示当前笔记的默认名称', async () => {
    await page.click('#btn-new');
    await page.waitForSelector('.editor-title-input', { timeout: 3000 });

    const value = await page.$eval('.editor-title-input', el => el.value);
    expect(value.length).toBeGreaterThan(0);
    // 默认名称应为"新建笔记本"或"新建笔记本 (N)"
    expect(value).toMatch(/^新建笔记本/);
  });

  it('ET-03: 关闭笔记后标题输入框应消失，显示欢迎界面', async () => {
    await page.click('#btn-new');
    await page.waitForSelector('.editor-title-input', { timeout: 3000 });

    // 点击关闭按钮
    await page.click('.btn-close-note');
    await page.waitForTimeout(300);

    // 标题输入框已消失
    const titleInput = await page.$('.editor-title-input');
    expect(titleInput).toBeNull();

    // 欢迎界面显示
    const noNote = await page.$('.editor-area .no-note');
    expect(noNote).not.toBeNull();
    const noNoteText = await page.textContent('.editor-area .no-note');
    expect(noNoteText).toContain('选择或新建一篇笔记开始编辑');
  });

  // ===== 标题编辑双向同步 =====

  it('ET-04: 编辑区标题修改按 Enter → 侧边栏同步更新', async () => {
    await page.click('#btn-new');
    await page.waitForSelector('.editor-title-input', { timeout: 3000 });

    const newTitle = 'ET04测试标题';

    // 选中全部 + 键入新标题
    await page.locator('.editor-title-input').click();
    await page.locator('.editor-title-input').fill(newTitle);
    await page.locator('.editor-title-input').press('Enter');
    await page.waitForTimeout(500);

    // 侧边栏应显示新标题
    const sidebarTitle = await page.textContent('.note-item .title');
    expect(sidebarTitle).toBe(newTitle);
  });

  it('ET-05: 侧边栏右键重命名 → 编辑区标题同步更新', async () => {
    await page.click('#btn-new');
    await page.waitForSelector('.editor-title-input', { timeout: 3000 });

    const renamedTitle = 'ET05侧边栏重命名';

    // 右键点击侧边栏笔记项
    await page.locator('.note-item').first().click({ button: 'right' });
    await page.waitForTimeout(200);

    // 点击重命名菜单项
    await page.click('.menu-item[data-action="rename"]');
    await page.waitForTimeout(200);

    // 在侧边栏内联输入框中键入新名称并确认
    const renameInput = page.locator('.note-item .rename-input');
    await renameInput.fill(renamedTitle);
    await renameInput.press('Enter');
    await page.waitForTimeout(500);

    // 编辑区标题应同步更新
    const editorTitle = await page.$eval('.editor-title-input', el => el.value);
    expect(editorTitle).toBe(renamedTitle);
  });

  it('ET-06: 切换到另一个笔记 → 编辑区标题应更新为该笔记名', async () => {
    // 新建笔记A
    await page.click('#btn-new');
    await page.waitForSelector('.editor-title-input', { timeout: 3000 });
    await page.locator('.editor-title-input').fill('笔记A');
    await page.locator('.editor-title-input').press('Enter');
    await page.waitForTimeout(500);

    // 新建笔记B
    await page.click('#btn-new');
    await page.waitForSelector('.editor-title-input', { timeout: 3000 });
    await page.locator('.editor-title-input').fill('笔记B');
    await page.locator('.editor-title-input').press('Enter');
    await page.waitForTimeout(500);

    // 点击侧边栏中的笔记A
    const noteItems = page.locator('.note-item');
    // 笔记列表按 mtime 倒序，笔记B在前，笔记A在后
    const noteA = noteItems.nth(1); // 第二个是笔记A
    await noteA.click();
    await page.waitForTimeout(500);

    // 编辑区标题应变为"笔记A"
    const editorTitle = await page.$eval('.editor-title-input', el => el.value);
    expect(editorTitle).toBe('笔记A');
  });

  // ===== 滚动隔离 =====

  it('ET-07: 侧边栏 .note-list 应设置 overscroll-behavior: contain', async () => {
    const overscroll = await page.$eval('.note-list', el =>
      getComputedStyle(el).overscrollBehavior
    );
    // overscrollBehavior 可能是 "contain" 或 "contain contain"
    expect(overscroll).toContain('contain');
  });

  it('ET-08: 编辑区应设置 overflow-y: auto', async () => {
    const overflowY = await page.$eval('.editor-area .editor-content', el =>
      getComputedStyle(el).overflowY
    );
    expect(overflowY).toBe('auto');
  });
});
