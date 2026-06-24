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

    await page.waitForTimeout(800);

    const statusText = await page.textContent('#status-left');
    expect(statusText).toContain('已保存');
  });

  it('E-05: 输入文字后点击"撤销"应回退内容', async () => {
    const textarea = page.locator('.editor-area textarea');

    const before = await textarea.inputValue();
    await textarea.fill(before + '\n新增一行');
    await page.waitForTimeout(600); // 等待 autoSave 完成

    await page.click('#btn-undo');

    const after = await textarea.inputValue();
    expect(after).toBe(before);
  });

  it('E-06: 撤销后点击"重做"应恢复内容', async () => {
    const textarea = page.locator('.editor-area textarea');

    const baseContent = '重做测试内容';
    await textarea.fill(baseContent);
    await page.waitForTimeout(600); // 等待 autoSave 完成（防抖 500ms）
    const modifiedContent = baseContent + '\n新增行';
    await textarea.fill(modifiedContent);
    await page.waitForTimeout(600); // 等待 autoSave 完成

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
    await page.waitForTimeout(600);

    // 创建笔记 B 并写入特征内容
    await page.click('#btn-new');
    await page.waitForSelector('.editor-area textarea', { timeout: 3000 });
    await page.locator('.editor-area textarea').fill('笔记B的特征内容');
    await page.waitForTimeout(600);

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
});
