/**
 * @file         delete-edit.test.mjs
 * @description  删除笔记后编辑操作的 E2E 测试，覆盖 delete-then-edit 竞态条件修复
 * @author       tianxj22
 * @created      2026-06-24
 * @updated      2026-06-24
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

describe('删除后编辑场景 E2E', () => {
  let app;
  let page;
  let userDataDir;

  beforeAll(async () => {
    userDataDir = path.join(os.tmpdir(), `note-diary-e2e-delete-edit-${Date.now()}`);
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

  async function createNoteWithContent(content) {
    await page.click('#btn-new');
    await page.waitForSelector('.editor-area textarea', { timeout: 3000 });
    await page.locator('.editor-area textarea').fill(content);
    await page.waitForTimeout(600); // 等待 autoSave 完成
  }

  async function deleteFirstNote() {
    const firstNote = page.locator('.note-item').first();
    await firstNote.click({ button: 'right' });
    await page.waitForTimeout(200);

    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });

    await page.click('.menu-item[data-action="delete"]');
    await page.waitForTimeout(500);
  }

  it('DE-01: 删除当前打开的笔记后，点击剩余笔记应可编辑', async () => {
    await createNoteWithContent('笔记A的内容');
    await createNoteWithContent('笔记B的内容');

    const noteCount = await page.locator('.note-item').count();
    expect(noteCount).toBe(2);

    // B 最后创建，排在最前且为当前笔记；点击 B 确认已加载
    await page.locator('.note-item').first().click();
    await page.waitForTimeout(300);

    const textarea = page.locator('.editor-area textarea');
    expect(await textarea.inputValue()).toBe('笔记B的内容');

    // 删除当前笔记 B
    await deleteFirstNote();

    expect(await page.locator('.note-item').count()).toBe(1);

    // 编辑区应隐藏（当前笔记被删除）
    expect(await page.$('.editor-area .no-note')).not.toBeNull();

    // 点击剩余笔记 A
    await page.locator('.note-item').first().click();
    await page.waitForTimeout(300);

    // 验证编辑区出现且可编辑
    expect(await page.$('.editor-area textarea')).not.toBeNull();
    await page.locator('.editor-area textarea').fill('修改后的内容');
    await page.waitForTimeout(800);

    const statusText = await page.textContent('#status-left');
    expect(statusText).toContain('已保存');
  });

  it('DE-02: 删除当前打开的笔记后，新建笔记应可编辑', async () => {
    await createNoteWithContent('测试笔记内容');

    const noteCount = await page.locator('.note-item').count();
    expect(noteCount).toBeGreaterThanOrEqual(1);

    // 点击第一篇使其成为当前笔记
    await page.locator('.note-item').first().click();
    await page.waitForTimeout(300);

    await deleteFirstNote();

    // 新建笔记
    await page.click('#btn-new');
    await page.waitForSelector('.editor-area textarea', { timeout: 3000 });

    const textarea = page.locator('.editor-area textarea');
    expect(await page.$('.editor-area textarea')).not.toBeNull();

    await textarea.fill('新建笔记的内容');
    await page.waitForTimeout(800);

    const statusText = await page.textContent('#status-left');
    expect(statusText).toContain('已保存');
  });

  it('DE-03: 删除非当前笔记时，当前笔记仍可编辑', async () => {
    await createNoteWithContent('笔记X的内容');
    await createNoteWithContent('笔记Y的内容');

    const noteCount = await page.locator('.note-item').count();
    expect(noteCount).toBeGreaterThanOrEqual(2);

    // Y 是最后创建的，排在最前且为当前笔记
    const currentNote = page.locator('.note-item').first();
    await currentNote.click();
    await page.waitForTimeout(300);

    // 在 Y 中输入特征内容
    const textarea = page.locator('.editor-area textarea');
    await textarea.fill('当前笔记的特征内容');
    await page.waitForTimeout(600);

    // 右键点击第二篇笔记 X（非当前笔记）并删除
    const otherNote = page.locator('.note-item').nth(1);
    await otherNote.click({ button: 'right' });
    await page.waitForTimeout(200);

    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });

    await page.click('.menu-item[data-action="delete"]');
    await page.waitForTimeout(500);

    expect(await page.locator('.note-item').count()).toBe(noteCount - 1);

    // Y 仍是当前笔记，编辑区应保留且内容不丢失
    expect(await page.$('.editor-area textarea')).not.toBeNull();
    const contentAfter = await page.locator('.editor-area textarea').inputValue();
    expect(contentAfter).toBe('当前笔记的特征内容');
  });

  it('DE-04: 删除所有笔记后新建笔记应可编辑', async () => {
    // 确保至少有一篇笔记
    let noteCount = await page.locator('.note-item').count();
    if (noteCount < 1) {
      await createNoteWithContent('临时笔记');
      noteCount = 1;
    }

    // 逐个删除所有笔记
    while ((await page.locator('.note-item').count()) > 0) {
      await deleteFirstNote();
    }

    // 验证列表为空
    const emptyText = await page.textContent('.note-list .empty');
    expect(emptyText).toContain('暂无笔记');
    expect(await page.$('.editor-area .no-note')).not.toBeNull();

    // 新建笔记
    await page.click('#btn-new');
    await page.waitForSelector('.editor-area textarea', { timeout: 3000 });

    expect(await page.$('.editor-area textarea')).not.toBeNull();
    await page.locator('.editor-area textarea').fill('重新开始的内容');
    await page.waitForTimeout(800);

    const statusText = await page.textContent('#status-left');
    expect(statusText).toContain('已保存');
  });

  it('DE-05: 快速删除+编辑序列（竞态条件回归测试）', async () => {
    await createNoteWithContent('竞态测试初始内容');

    // 点击笔记使其成为当前笔记
    const firstNote = page.locator('.note-item').first();
    await firstNote.click();
    await page.waitForTimeout(300);

    // 快速输入（触发 autoSave 防抖计时器）
    const textarea = page.locator('.editor-area textarea');
    await textarea.fill('竞态测试修改内容');

    // 不等待 autoSave — 立即右键删除（竞态窗口）
    await firstNote.click({ button: 'right' });
    await page.waitForTimeout(200);

    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });

    await page.click('.menu-item[data-action="delete"]');
    // 等待足够长时间让竞态窗口完全过去
    await page.waitForTimeout(1000);

    // 新建笔记应正常工作
    await page.click('#btn-new');
    await page.waitForSelector('.editor-area textarea', { timeout: 3000 });

    await page.locator('.editor-area textarea').fill('竞态测试后新建的内容');
    await page.waitForTimeout(800);

    const statusText = await page.textContent('#status-left');
    expect(statusText).toContain('已保存');

    // 确认侧边栏没有"竞态测试"僵尸笔记
    const titles = await page.locator('.note-item .title').allTextContents();
    const zombieCount = titles.filter(t => t.includes('竞态测试')).length;
    expect(zombieCount).toBe(0);
  });
});
