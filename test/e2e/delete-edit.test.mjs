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

  it('DE-01: 删除当前打开的笔记后，点击剩余笔记应可编辑并保存', async () => {
    await createNoteWithContent('笔记A的内容');
    await createNoteWithContent('笔记B的内容');

    const noteCount = await page.locator('.note-item').count();
    expect(noteCount).toBe(2);

    // B 最后创建，排在最前且为当前笔记
    await page.locator('.note-item').first().click();
    await page.waitForTimeout(300);

    const textarea = page.locator('.editor-area textarea');
    expect(await textarea.inputValue()).toBe('笔记B的内容');

    // 删除当前笔记 B
    await deleteFirstNote();

    expect(await page.locator('.note-item').count()).toBe(1);
    expect(await page.$('.editor-area .no-note')).not.toBeNull();

    // 点击剩余笔记 A
    await page.locator('.note-item').first().click();
    await page.waitForTimeout(300);

    // 验证编辑区可交互：逐一键入字符并验证值改变
    const ta = page.locator('.editor-area textarea');
    await ta.fill('');  // 清空
    await ta.pressSequentially('Hello from DE-01');
    await page.waitForTimeout(800);

    expect(await ta.inputValue()).toBe('Hello from DE-01');
    const statusText = await page.textContent('#status-left');
    expect(statusText).toContain('已保存');
  });

  it('DE-01a: 删除当前笔记后点击剩余笔记，键盘输入可触发保存', async () => {
    await createNoteWithContent('原内容');
    await createNoteWithContent('待删除');

    await page.locator('.note-item').first().click();
    await page.waitForTimeout(300);

    expect(await page.locator('.editor-area textarea').inputValue()).toBe('待删除');

    const countBefore = await page.locator('.note-item').count();
    await deleteFirstNote();
    const countAfter = await page.locator('.note-item').count();
    expect(countAfter).toBe(countBefore - 1);

    // 点击剩余笔记
    await page.locator('.note-item').first().click();
    await page.waitForSelector('.editor-area textarea', { timeout: 3000 });

    // 模拟真实键盘输入
    await page.locator('.editor-area textarea').click();
    await page.keyboard.type('键盘输入测试');
    await page.waitForTimeout(800);

    // 验证内容确实已写入
    const content = await page.locator('.editor-area textarea').inputValue();
    expect(content).toContain('键盘输入测试');
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

  it('DE-06: 删除当前笔记后立即点击另一篇（selectNote 竞态窗口）', async () => {
    // 创建三篇笔记
    await createNoteWithContent('笔记1内容XXXX');
    await createNoteWithContent('笔记2内容YYYY');
    await createNoteWithContent('笔记3内容ZZZZ');

    // 点击第一篇（笔记3，最新），使其成为当前笔记
    await page.locator('.note-item').first().click();
    await page.waitForTimeout(300);

    // 修改内容触发 autoSave 计时器
    const textarea = page.locator('.editor-area textarea');
    await textarea.fill('笔记3修改后内容AAAA');

    // 不等待 autoSave —— 立即删除当前笔记
    const countBefore = await page.locator('.note-item').count();
    await deleteFirstNote();
    // 此时 autoSave 的 500ms 定时器可能刚触发
    const countAfter = await page.locator('.note-item').count();
    expect(countAfter).toBe(countBefore - 1);

    // 立即点击剩余的第一篇笔记（原笔记2，现在排第一）
    await page.locator('.note-item').first().click();
    await page.waitForSelector('.editor-area textarea', { timeout: 3000 });

    // 验证内容已加载（非空）
    const loadedContent = await page.locator('.editor-area textarea').inputValue();
    expect(loadedContent.length).toBeGreaterThan(0);

    // 键入新内容并验证保存
    await page.locator('.editor-area textarea').fill('竞态后笔记新内容BBBB');
    await page.waitForTimeout(800);

    const statusText = await page.textContent('#status-left');
    expect(statusText).toContain('已保存');

    // 点击另一篇笔记，验证它也可以正常加载
    const noteItems = page.locator('.note-item');
    const noteCount = await noteItems.count();
    if (noteCount >= 2) {
      await noteItems.nth(1).click();
      await page.waitForTimeout(300);
      const otherContent = await page.locator('.editor-area textarea').inputValue();
      expect(otherContent.length).toBeGreaterThan(0);
    }
  });

  it('DE-07: 点击关闭按钮应回到欢迎界面', async () => {
    await createNoteWithContent('关闭按钮测试内容');

    // 确认编辑区可见
    expect(await page.$('.editor-area textarea')).not.toBeNull();
    // 确认关闭按钮存在
    expect(await page.$('.btn-close-note')).not.toBeNull();

    // 点击关闭按钮
    await page.click('.btn-close-note');
    await page.waitForTimeout(300);

    // 应显示欢迎界面
    expect(await page.$('.editor-area .no-note')).not.toBeNull();
    expect(await page.textContent('.editor-area .no-note')).toContain('选择或新建一篇笔记开始编辑');
  });

  it('DE-08: 关闭后再打开笔记，内容应保留', async () => {
    await createNoteWithContent('关闭前的内容ABC');

    // 修改内容
    await page.locator('.editor-area textarea').fill('关闭前修改DEF');
    await page.waitForTimeout(600); // 等待保存

    // 关闭笔记
    await page.click('.btn-close-note');
    await page.waitForTimeout(300);

    expect(await page.$('.editor-area .no-note')).not.toBeNull();

    // 重新打开同一笔记
    await page.locator('.note-item').first().click();
    await page.waitForSelector('.editor-area textarea', { timeout: 3000 });

    // 内容应为关闭前保存的内容
    const content = await page.locator('.editor-area textarea').inputValue();
    expect(content).toBe('关闭前修改DEF');
  });

  it('DE-09: 关闭笔记不影响删除操作', async () => {
    await createNoteWithContent('待关闭删除笔记');
    await createNoteWithContent('保留笔记');

    const countBefore = await page.locator('.note-item').count();

    // 打开第一篇
    await page.locator('.note-item').first().click();
    await page.waitForTimeout(300);

    // 通过关闭按钮关闭
    await page.click('.btn-close-note');
    await page.waitForTimeout(300);

    // 右键第一篇并删除
    const firstNote = page.locator('.note-item').first();
    await firstNote.click({ button: 'right' });
    await page.waitForTimeout(200);

    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });

    await page.click('.menu-item[data-action="delete"]');
    await page.waitForTimeout(500);

    // 删除成功
    expect(await page.locator('.note-item').count()).toBe(countBefore - 1);

    // 点击剩余笔记应可编辑
    await page.locator('.note-item').first().click();
    await page.waitForSelector('.editor-area textarea', { timeout: 3000 });
    const loaded = await page.locator('.editor-area textarea').inputValue();
    expect(loaded.length).toBeGreaterThan(0);
  });
});
