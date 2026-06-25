/**
 * @file         editor-style.test.mjs
 * @description  富文本样式按钮 E2E 测试 — 加粗/倾斜/下划线/字体/字号/对齐/颜色
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

describe('富文本样式按钮 E2E', () => {
  let app;
  let page;
  let userDataDir;

  beforeAll(async () => {
    userDataDir = path.join(os.tmpdir(), `note-diary-e2e-style-${Date.now()}`);
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

  /** 辅助：新建笔记并切换到样式标签 */
  async function prepareEditor() {
    await page.click('#btn-new');
    await page.waitForSelector('.editor-area .editor-content', { timeout: 3000 });
    // 切换到样式标签
    await page.click('.toolbar-tab[data-tab="style"]');
    await page.waitForTimeout(200);
  }

  /** 辅助：在编辑器中选中全部文字 */
  async function selectAll() {
    await page.locator('.editor-area .editor-content').click();
    // Ctrl+A 全选
    await page.keyboard.press('Control+a');
    await page.waitForTimeout(100);
  }

  // ===== 加粗 / 倾斜 / 下划线 =====

  it('ES-01: 选中文字后点击加粗按钮，文字被 <b> 包裹', async () => {
    await prepareEditor();
    const editor = page.locator('.editor-area .editor-content');
    await editor.fill('测试加粗文字');
    await selectAll();
    await page.click('#btn-bold');
    await page.waitForTimeout(200);

    const html = await editor.innerHTML();
    expect(html).toMatch(/<b>/);
  });

  it('ES-02: 选中文字后点击倾斜按钮，文字被 <i> 包裹', async () => {
    await prepareEditor();
    const editor = page.locator('.editor-area .editor-content');
    await editor.fill('测试倾斜文字');
    await selectAll();
    await page.click('#btn-italic');
    await page.waitForTimeout(200);

    const html = await editor.innerHTML();
    expect(html).toMatch(/<i>/);
  });

  it('ES-03: 选中文字后点击下划线按钮，文字被 <u> 包裹', async () => {
    await prepareEditor();
    const editor = page.locator('.editor-area .editor-content');
    await editor.fill('测试下划线文字');
    await selectAll();
    await page.click('#btn-underline');
    await page.waitForTimeout(200);

    const html = await editor.innerHTML();
    expect(html).toMatch(/<u>/);
  });

  // ===== 字体 / 字号 =====

  it('ES-04: 选中文字后选择字体，font-family 发生变化', async () => {
    await prepareEditor();
    const editor = page.locator('.editor-area .editor-content');
    await editor.fill('测试字体选择');
    await selectAll();
    await page.selectOption('#btn-font-family', 'KaiTi');
    await page.waitForTimeout(200);

    const html = await editor.innerHTML();
    // 应包含 font-family 引用 KaiTi
    expect(html).toMatch(/KaiTi/i);
  });

  it('ES-05: 选中文字后选择字号，font-size 发生变化', async () => {
    await prepareEditor();
    const editor = page.locator('.editor-area .editor-content');
    await editor.fill('测试字号选择');
    await selectAll();
    await page.selectOption('#btn-font-size', '5'); // 20px (size 5)
    await page.waitForTimeout(200);

    const html = await editor.innerHTML();
    expect(html).toMatch(/font-size/);
  });

  // ===== 对齐 =====

  it('ES-06: 光标定位段落后点击左对齐', async () => {
    await prepareEditor();
    const editor = page.locator('.editor-area .editor-content');
    await editor.fill('测试左对齐');
    await editor.click();
    await page.click('#btn-align-left');
    await page.waitForTimeout(200);

    const html = await editor.innerHTML();
    expect(html).toMatch(/text-align:\s*left/);
  });

  it('ES-07: 光标定位段落后点击居中', async () => {
    await prepareEditor();
    const editor = page.locator('.editor-area .editor-content');
    await editor.fill('测试居中');
    await editor.click();
    await page.click('#btn-align-center');
    await page.waitForTimeout(200);

    const html = await editor.innerHTML();
    expect(html).toMatch(/text-align:\s*center/);
  });

  it('ES-08: 光标定位段落后点击右对齐', async () => {
    await prepareEditor();
    const editor = page.locator('.editor-area .editor-content');
    await editor.fill('测试右对齐');
    await editor.click();
    await page.click('#btn-align-right');
    await page.waitForTimeout(200);

    const html = await editor.innerHTML();
    expect(html).toMatch(/text-align:\s*right/);
  });

  // ===== 颜色 =====

  it('ES-09: 选中文字后选择字体颜色，文字颜色变化', async () => {
    await prepareEditor();
    const editor = page.locator('.editor-area .editor-content');
    await editor.fill('测试字体颜色');
    await selectAll();
    // 通过 input 事件设置颜色值
    await page.$eval('#btn-forecolor', (el, value) => {
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, '#ff0000');
    await page.waitForTimeout(200);

    const html = await editor.innerHTML();
    expect(html).toMatch(/color/);
  });

  it('ES-10: 选中文字后选择字体底色，背景色变化', async () => {
    await prepareEditor();
    const editor = page.locator('.editor-area .editor-content');
    await editor.fill('测试字体底色');
    await selectAll();
    await page.$eval('#btn-hilitecolor', (el, value) => {
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, '#ffff00');
    await page.waitForTimeout(200);

    const html = await editor.innerHTML();
    expect(html).toMatch(/background/);
  });

  // ===== 按钮状态联动 =====

  it('ES-11: 选中加粗文字后 B 按钮应有 active 类', async () => {
    await prepareEditor();
    const editor = page.locator('.editor-area .editor-content');
    await editor.fill('测试加粗联动');
    await selectAll();
    await page.click('#btn-bold');
    await page.waitForTimeout(200);

    // B 按钮应有 active 类
    const hasActive = await page.$eval('#btn-bold', el => el.classList.contains('active'));
    expect(hasActive).toBe(true);
  });

  it('ES-12: 字体下拉应显示当前选中文字的字体', async () => {
    await prepareEditor();
    const editor = page.locator('.editor-area .editor-content');
    await editor.fill('测试字体联动');
    await selectAll();
    await page.selectOption('#btn-font-family', 'KaiTi');
    await page.waitForTimeout(200);

    // 下拉框应显示当前字体值
    const fontVal = await page.$eval('#btn-font-family', el => el.value);
    expect(fontVal).toBe('KaiTi');
  });

  it('ES-13: 颜色色块应反映当前选中文字的颜色', async () => {
    await prepareEditor();
    const editor = page.locator('.editor-area .editor-content');
    await editor.fill('颜色联动测试');
    await selectAll();
    await page.$eval('#btn-forecolor', (el, value) => {
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, '#ff0000');
    await page.waitForTimeout(200);

    const swatchBg = await page.$eval('#swatch-forecolor', el => el.style.background);
    expect(swatchBg).toMatch(/rgb\(255,\s*0,\s*0\)/);
  });

  it('ES-14: 格式刷应能复制格式并应用到新选区', async () => {
    await prepareEditor();
    const editor = page.locator('.editor-area .editor-content');

    // 输入一段带加粗格式的文字
    await editor.fill('格式源文字');
    await selectAll();
    await page.click('#btn-bold');
    await page.waitForTimeout(200);

    // 验证加粗成功
    let html = await editor.innerHTML();
    expect(html).toMatch(/<b>/);

    // 点击格式刷
    await page.click('#btn-format-painter');
    await page.waitForTimeout(200);

    // 格式刷按钮应高亮
    const painterActive = await page.$eval('#btn-format-painter', el => el.classList.contains('active'));
    expect(painterActive).toBe(true);

    // 选中另一段文字（先按 End 到末尾，输入新文字，再选中）
    await editor.click();
    await page.keyboard.press('End');
    await editor.pressSequentially(' 格式目标文字');
    // 选中刚才输入的新文字
    await page.keyboard.press('Shift+Home');
    await page.keyboard.press('Shift+ArrowLeft');
    await page.waitForTimeout(300);

    // 新文字应被应用了加粗格式
    html = await editor.innerHTML();
    // 应有两个 <b> 标签（源和目标）
    const boldCount = (html.match(/<b>/g) || []).length;
    expect(boldCount).toBeGreaterThanOrEqual(2);
  });

  it('ES-15: 对齐按钮应高亮当前段落的对齐方式', async () => {
    await prepareEditor();
    const editor = page.locator('.editor-area .editor-content');
    await editor.fill('测试对齐联动');
    await editor.click();
    await page.click('#btn-align-center');
    await page.waitForTimeout(200);

    const centerActive = await page.$eval('#btn-align-center', el => el.classList.contains('active'));
    expect(centerActive).toBe(true);
  });
});
