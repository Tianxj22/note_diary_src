/**
 * @file         checklist-log.test.mjs
 * @description  清单/日志时间戳 E2E 测试 — 单标记约束、Enter 续行、Backspace 删除标记
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

describe('清单/日志时间戳 E2E', () => {
  let app;
  let page;
  let userDataDir;

  beforeAll(async () => {
    userDataDir = path.join(os.tmpdir(), `note-diary-e2e-checklist-${Date.now()}`);
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

  /** 辅助：新建笔记并切换到插入标签 */
  async function prepareEditor() {
    await page.click('#btn-new');
    await page.waitForSelector('.editor-area .editor-content', { timeout: 3000 });
    // 切换到插入标签
    await page.click('.toolbar-tab[data-tab="insert"]');
    await page.waitForTimeout(200);
  }

  /** 辅助：点击清单按钮 */
  async function insertChecklist() {
    await page.click('#btn-checklist');
    await page.waitForTimeout(200);
  }

  /** 辅助：点击时间戳按钮 */
  async function insertTimestamp() {
    await page.click('#btn-timestamp');
    await page.waitForTimeout(200);
  }

  /** 辅助：获取编辑器内 .check-box 元素数量 */
  async function countCheckboxes() {
    return await page.locator('.editor-content .check-box').count();
  }

  /** 辅助：获取编辑器内 .log-stamp 元素数量 */
  async function countTimestamps() {
    return await page.locator('.editor-content .log-stamp').count();
  }

  /** 辅助：在编辑器中输入文字 */
  async function typeInEditor(text) {
    await page.locator('.editor-area .editor-content').focus();
    await page.keyboard.type(text);
    await page.waitForTimeout(200);
  }

  /** 辅助：在编辑器中按 Enter */
  async function pressEnter() {
    await page.locator('.editor-area .editor-content').focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
  }

  /** 辅助：在编辑器中按 Backspace */
  async function pressBackspace() {
    await page.locator('.editor-area .editor-content').focus();
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(200);
  }

  // ===== 单标记约束 =====

  it('CL-01: 已有清单的行再次点清单按钮 → 不重复插入（切换状态）', async () => {
    await prepareEditor();
    await insertChecklist();
    // 再次点击清单按钮
    await insertChecklist();
    // 应该仍然只有 1 个 checkbox（不重复插入）
    const count = await countCheckboxes();
    expect(count).toBe(1);
  });

  it('CL-02: 已有时间戳的行再次点时间戳按钮 → 不插入', async () => {
    await prepareEditor();
    await insertTimestamp();
    // 再次点击时间戳按钮
    await insertTimestamp();
    // 应该仍然只有 1 个 timestamp
    const count = await countTimestamps();
    expect(count).toBe(1);
  });

  it('CL-03: 清单行点时间戳按钮 → 不插入', async () => {
    await prepareEditor();
    await insertChecklist();
    await insertTimestamp();
    // timestamp 不应插入
    const tsCount = await countTimestamps();
    expect(tsCount).toBe(0);
    // checklist 仍在
    const cbCount = await countCheckboxes();
    expect(cbCount).toBe(1);
  });

  it('CL-04: 时间戳行点清单按钮 → 不插入', async () => {
    await prepareEditor();
    await insertTimestamp();
    await insertChecklist();
    // checklist 不应插入
    const cbCount = await countCheckboxes();
    expect(cbCount).toBe(0);
    // timestamp 仍在
    const tsCount = await countTimestamps();
    expect(tsCount).toBe(1);
  });

  // ===== Enter 续行 =====

  it('CL-05: 插入清单 → 输入文字 → 按 Enter → 新行自动带清单', async () => {
    await prepareEditor();
    await insertChecklist();
    await typeInEditor('Task 1');
    await pressEnter();
    // 应有两个 checkbox
    const count = await countCheckboxes();
    expect(count).toBe(2);
  });

  it('CL-06: 插入时间戳 → 输入文字 → 按 Enter → 新行自动带时间戳', async () => {
    await prepareEditor();
    await insertTimestamp();
    await typeInEditor('Log entry');
    await pressEnter();
    // 应有两个 timestamp
    const count = await countTimestamps();
    expect(count).toBe(2);
  });

  it('CL-07: 空清单行按 Enter → 标记消失，变普通行', async () => {
    await prepareEditor();
    await insertChecklist();
    // 不输入文字，直接按 Enter
    await pressEnter();
    // checkbox 应被移除
    const count = await countCheckboxes();
    expect(count).toBe(0);
  });

  it('CL-08: 空时间戳行按 Enter → 标记消失，变普通行', async () => {
    await prepareEditor();
    await insertTimestamp();
    // 不输入文字，直接按 Enter
    await pressEnter();
    // timestamp 应被移除
    const count = await countTimestamps();
    expect(count).toBe(0);
  });

  it('CL-09: 普通行按 Enter → 不新增标记', async () => {
    await prepareEditor();
    await typeInEditor('Normal line');
    await pressEnter();
    await typeInEditor('Second line');
    // 不应有任何标记
    const cbCount = await countCheckboxes();
    const tsCount = await countTimestamps();
    expect(cbCount).toBe(0);
    expect(tsCount).toBe(0);
  });

  // ===== Backspace 删除标记 =====

  it('CL-10: 清单行首按 Backspace → 删除标记变普通行', async () => {
    await prepareEditor();
    await insertChecklist();
    await typeInEditor('Task');
    // 光标在文字末尾，移动到行首
    await page.keyboard.press('Home');
    await page.waitForTimeout(100);
    // 再按一次 Home 可能到行首（在 contentEditable 中）
    // 使用 Ctrl+Home 或多次左箭头
    // 将光标移到标记后方：按 Home 后应在行首，即标记后空格处
    // 实际上光标在文本开头（☐后的位置），再按 Backspace
    await pressBackspace();
    // checkbox 应被移除
    const count = await countCheckboxes();
    expect(count).toBe(0);
  });

  it('CL-11: 时间戳行首按 Backspace → 删除标记变普通行', async () => {
    await prepareEditor();
    await insertTimestamp();
    await typeInEditor('Log');
    // 移动光标到行首
    await page.keyboard.press('Home');
    await page.waitForTimeout(100);
    await pressBackspace();
    // timestamp 应被移除
    const count = await countTimestamps();
    expect(count).toBe(0);
  });

  it('CL-12: 删除标记后可正常编辑', async () => {
    await prepareEditor();
    await insertChecklist();
    await typeInEditor('Before delete');
    // 光标移到行首，删除标记
    await page.keyboard.press('Home');
    await page.waitForTimeout(100);
    await pressBackspace();
    // 确认标记已删除
    expect(await countCheckboxes()).toBe(0);
    // 应能正常输入
    await typeInEditor('After delete');
    // 获取编辑器内容，确认文字存在
    const content = await page.locator('.editor-area .editor-content').textContent();
    expect(content).toContain('After delete');
  });

  // ===== 清单连续行 =====

  it('CL-13: 连续清单行 — 每次 Enter 都带出新清单', async () => {
    await prepareEditor();
    await insertChecklist();
    await typeInEditor('Item 1');
    await pressEnter();
    await typeInEditor('Item 2');
    await pressEnter();
    await typeInEditor('Item 3');
    // 应有 3 个 checkbox
    const count = await countCheckboxes();
    expect(count).toBe(3);
  });

  it('CL-14: 连续清单行 — 空行 Enter 中断后下一行不带标记', async () => {
    await prepareEditor();
    await insertChecklist();
    await typeInEditor('Item 1');
    await pressEnter(); // 带出新清单
    // 在空清单行按 Enter（不带文字）
    await pressEnter(); // 清掉标记
    await typeInEditor('Plain text');
    // 总共应只有 1 个 checkbox
    const count = await countCheckboxes();
    expect(count).toBe(1);
  });
});
