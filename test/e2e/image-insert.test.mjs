/**
 * @file         image-insert.test.mjs
 * @description  图片插入 E2E 测试 — 下拉菜单、5 种插入方式、窗口选择器、撤销/重做、持久化、异常处理
 * @author       tianxj22
 * @created      2026-06-25
 * @updated      2026-06-25
 * @version      2.0.0
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { _electron as electron } from '@playwright/test';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

// 1x1 红色 PNG 用于 mock 图片数据
const RED_DOT_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

// Mock 窗口列表
const MOCK_WINDOWS = [
  { id: 'win-1', name: '测试窗口 1', thumbnail: RED_DOT_PNG },
  { id: 'win-2', name: '测试窗口 2', thumbnail: RED_DOT_PNG },
];

describe('图片插入 E2E', () => {
  let app;
  let page;
  let userDataDir;

  beforeAll(async () => {
    userDataDir = path.join(os.tmpdir(), `note-diary-e2e-image-${Date.now()}`);
    fs.mkdirSync(userDataDir, { recursive: true });

    app = await electron.launch({
      args: [path.join(projectRoot, 'main.js')],
      env: { ...process.env, NOTE_DIARY_E2E_DIR: userDataDir },
    });

    page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');
  }, 20000);

  afterAll(async () => {
    if (app) await app.close();
    if (userDataDir && fs.existsSync(userDataDir)) {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    }
  });

  /** 辅助：新建笔记并切换到插入标签 */
  async function prepareEditor() {
    await page.click('#btn-new');
    await page.waitForSelector('.editor-area .editor-content', { timeout: 3000 });
    await page.click('.toolbar-tab[data-tab="insert"]');
    await page.waitForTimeout(200);
  }

  /** 辅助：mock window.electronAPI 的方法 */
  async function mockAPI(methodName, returnValue) {
    await page.evaluate(({ method, value }) => {
      const orig = window.electronAPI[method];
      window.electronAPI[method] = typeof value === 'function'
        ? value
        : () => Promise.resolve(value);
      window.electronAPI[`_orig_${method}`] = orig;
    }, { method: methodName, value: returnValue });
  }

  /** 辅助：打开下拉菜单 */
  async function openDropdown() {
    await page.click('#btn-insert-image');
    await page.waitForTimeout(150);
  }

  /** 辅助：点击某个下拉菜单项 */
  async function clickMenuItem(method) {
    await openDropdown();
    await page.click(`#dropdown-image-menu .menu-item[data-method="${method}"]`);
    await page.waitForTimeout(300);
  }

  /** 辅助：获取编辑器内 img 数量 */
  async function imgCount() {
    return page.locator('.editor-content img').count();
  }

  /** 辅助：获取状态栏文字 */
  async function statusText() {
    return page.textContent('#status-left');
  }

  // ================================================================
  // 一、下拉菜单 UI
  // ================================================================

  it('IMG-01: 图片按钮在插入标签中可见', async () => {
    await prepareEditor();
    await expect(page.locator('#btn-insert-image')).toBeVisible();
  });

  it('IMG-02: 点击按钮 → 下拉菜单展开', async () => {
    await prepareEditor();
    await page.click('#btn-insert-image');
    await page.waitForTimeout(150);
    await expect(page.locator('#dropdown-image-menu')).toHaveClass(/visible/);
  });

  it('IMG-03: 下拉菜单有 5 个选项（含分隔线）', async () => {
    await prepareEditor();
    await openDropdown();
    // 5 个 .menu-item
    await expect(page.locator('#dropdown-image-menu .menu-item')).toHaveCount(5);
    // 存在分隔线
    await expect(page.locator('#dropdown-image-menu .menu-divider')).toHaveCount(1);
    // 验证各项文本
    const texts = await page.locator('#dropdown-image-menu .menu-item').allTextContents();
    expect(texts[0]).toContain('从文件插入');
    expect(texts[1]).toContain('从剪贴板粘贴');
    expect(texts[2]).toContain('全屏截图');
    expect(texts[3]).toContain('框选截图');
    expect(texts[4]).toContain('窗口截图');
  });

  it('IMG-04: 点击菜单外部 → 菜单关闭', async () => {
    await prepareEditor();
    await openDropdown();
    // 点击编辑区
    await page.click('.editor-area .editor-content');
    await page.waitForTimeout(150);
    await expect(page.locator('#dropdown-image-menu')).not.toHaveClass(/visible/);
  });

  // ================================================================
  // 二、从文件插入
  // ================================================================

  it('IMG-05: 选择文件成功 → img 标签插入，src 为 data URI', async () => {
    await prepareEditor();
    await mockAPI('openImageFile', RED_DOT_PNG);
    await clickMenuItem('file');
    const count = await imgCount();
    expect(count).toBeGreaterThan(0);
    const src = await page.locator('.editor-content img').first().getAttribute('src');
    expect(src).toMatch(/^data:image\//);
    const st = await statusText();
    expect(st).toContain('图片已插入');
  });

  it('IMG-06: 取消文件选择 → 无 img 插入', async () => {
    await prepareEditor();
    await mockAPI('openImageFile', null);
    const before = await imgCount();
    await clickMenuItem('file');
    const after = await imgCount();
    expect(after).toBe(before);
  });

  // ================================================================
  // 三、从剪贴板粘贴
  // ================================================================

  it('IMG-07: 剪贴板有图片 → img 插入成功', async () => {
    await prepareEditor();
    await mockAPI('readClipboardImage', RED_DOT_PNG);
    await clickMenuItem('clipboard');
    expect(await imgCount()).toBeGreaterThan(0);
    const st = await statusText();
    expect(st).toContain('图片已插入');
  });

  it('IMG-08: 剪贴板无图片 → 状态栏提示', async () => {
    await prepareEditor();
    await mockAPI('readClipboardImage', null);
    const before = await imgCount();
    await clickMenuItem('clipboard');
    const st = await statusText();
    expect(st).toContain('剪贴板中没有图片');
    expect(await imgCount()).toBe(before);
  });

  // ================================================================
  // 四、全屏截图
  // ================================================================

  it('IMG-09: 全屏截图成功 → img 插入', async () => {
    await prepareEditor();
    await mockAPI('captureFullscreen', RED_DOT_PNG);
    await clickMenuItem('fullscreen');
    expect(await imgCount()).toBeGreaterThan(0);
    const st = await statusText();
    expect(st).toContain('图片已插入');
  });

  it('IMG-10: 全屏截图失败 → 状态栏提示', async () => {
    await prepareEditor();
    await mockAPI('captureFullscreen', null);
    const before = await imgCount();
    await clickMenuItem('fullscreen');
    const st = await statusText();
    expect(st).toContain('全屏截图失败');
    expect(await imgCount()).toBe(before);
  });

  // ================================================================
  // 五、框选截图
  // ================================================================

  it('IMG-11: 框选截图成功 → img 插入', async () => {
    await prepareEditor();
    await mockAPI('captureArea', RED_DOT_PNG);
    await clickMenuItem('area');
    expect(await imgCount()).toBeGreaterThan(0);
    const st = await statusText();
    expect(st).toContain('图片已插入');
  });

  it('IMG-12: 框选截图取消 → 状态栏提示', async () => {
    await prepareEditor();
    await mockAPI('captureArea', null);
    const before = await imgCount();
    await clickMenuItem('area');
    const st = await statusText();
    expect(st).toContain('框选截图已取消');
    expect(await imgCount()).toBe(before);
  });

  // ================================================================
  // 六、窗口截图
  // ================================================================

  it('IMG-13: 窗口列表为空 → 状态栏提示', async () => {
    await prepareEditor();
    await mockAPI('listWindows', []);
    await clickMenuItem('window');
    const st = await statusText();
    expect(st).toContain('未找到可截图的窗口');
    // 选择器不应显示
    await expect(page.locator('#window-picker-overlay')).not.toHaveClass(/visible/);
  });

  it('IMG-14: 窗口列表有内容 → 选择器弹出，显示窗口缩略图', async () => {
    await prepareEditor();
    await mockAPI('listWindows', MOCK_WINDOWS);
    await clickMenuItem('window');
    // 选择器可见
    await expect(page.locator('#window-picker-overlay')).toHaveClass(/visible/);
    // 2 个窗口项
    await expect(page.locator('.window-picker-item')).toHaveCount(2);
    // 窗口名称正确
    const names = await page.locator('.window-picker-item .window-name').allTextContents();
    expect(names[0]).toBe('测试窗口 1');
    expect(names[1]).toBe('测试窗口 2');
  });

  it('IMG-15: 点击窗口项 → 截图插入，选择器关闭', async () => {
    await prepareEditor();
    await mockAPI('listWindows', MOCK_WINDOWS);
    await mockAPI('captureWindowById', RED_DOT_PNG);
    await clickMenuItem('window');
    // 点击第一个窗口项
    await page.click('.window-picker-item[data-id="win-1"]');
    await page.waitForTimeout(300);
    // 选择器已关闭
    await expect(page.locator('#window-picker-overlay')).not.toHaveClass(/visible/);
    // img 插入成功
    expect(await imgCount()).toBeGreaterThan(0);
    const st = await statusText();
    expect(st).toContain('图片已插入');
  });

  it('IMG-16: 点击关闭按钮 → 选择器关闭，无插入', async () => {
    await prepareEditor();
    await mockAPI('listWindows', MOCK_WINDOWS);
    await clickMenuItem('window');
    const before = await imgCount();
    // 点击关闭按钮
    await page.click('#window-picker-close');
    await page.waitForTimeout(150);
    // 选择器已关闭
    await expect(page.locator('#window-picker-overlay')).not.toHaveClass(/visible/);
    // 无 img 插入
    expect(await imgCount()).toBe(before);
  });

  it('IMG-17: 点击遮罩外部 → 选择器关闭，无插入', async () => {
    await prepareEditor();
    await mockAPI('listWindows', MOCK_WINDOWS);
    await clickMenuItem('window');
    const before = await imgCount();
    // 点击 overlay 背景（非 dialog 区域）
    await page.click('#window-picker-overlay', { position: { x: 5, y: 5 } });
    await page.waitForTimeout(150);
    await expect(page.locator('#window-picker-overlay')).not.toHaveClass(/visible/);
    expect(await imgCount()).toBe(before);
  });

  // ================================================================
  // 七、撤销/重做
  // ================================================================

  it('IMG-18: 插入图片后 Ctrl+Z → 图片消失', async () => {
    await prepareEditor();
    await mockAPI('openImageFile', RED_DOT_PNG);
    await clickMenuItem('file');
    // 确认图片已插入
    expect(await imgCount()).toBeGreaterThan(0);
    // 撤销
    await page.locator('.editor-content').focus();
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(300);
    // 图片应被撤销
    expect(await imgCount()).toBe(0);
  });

  it('IMG-19: 撤销后 Ctrl+Y → 图片恢复', async () => {
    await prepareEditor();
    await mockAPI('openImageFile', RED_DOT_PNG);
    await clickMenuItem('file');
    // 记录 src
    const originalSrc = await page.locator('.editor-content img').first().getAttribute('src');
    // 撤销
    await page.locator('.editor-content').focus();
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(200);
    expect(await imgCount()).toBe(0);
    // 重做
    await page.keyboard.press('Control+y');
    await page.waitForTimeout(300);
    expect(await imgCount()).toBeGreaterThan(0);
    const restoredSrc = await page.locator('.editor-content img').first().getAttribute('src');
    expect(restoredSrc).toBe(originalSrc);
  });

  // ================================================================
  // 八、图片 CSS 与持久化
  // ================================================================

  it('IMG-20: 插入的图片 CSS max-width 不为 none', async () => {
    await prepareEditor();
    await mockAPI('openImageFile', RED_DOT_PNG);
    await clickMenuItem('file');
    const maxWidth = await page.$eval('.editor-content img', el =>
      window.getComputedStyle(el).maxWidth
    );
    expect(maxWidth).not.toBe('none');
  });

  it('IMG-21: 图片随笔记保存和加载', async () => {
    await prepareEditor();
    await mockAPI('openImageFile', RED_DOT_PNG);
    await clickMenuItem('file');
    const originalSrc = await page.locator('.editor-content img').first().getAttribute('src');
    // 保存
    await page.keyboard.press('Control+s');
    await page.waitForTimeout(500);
    // 关闭笔记
    const closeBtn = page.locator('#btn-close-note');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(300);
    }
    // 重新打开
    const firstNote = page.locator('.note-item').first();
    if (await firstNote.isVisible()) {
      await firstNote.click();
      await page.waitForTimeout(500);
    }
    // 图片仍在
    expect(await imgCount()).toBeGreaterThan(0);
    const loadedSrc = await page.locator('.editor-content img').first().getAttribute('src');
    expect(loadedSrc).toBe(originalSrc);
  });

  // ================================================================
  // 九、异常处理
  // ================================================================

  it('IMG-22: API 抛出异常 → 状态栏显示错误', async () => {
    await prepareEditor();
    await mockAPI('openImageFile', () => Promise.reject(new Error('测试错误')));
    await clickMenuItem('file');
    const st = await statusText();
    expect(st).toContain('图片插入失败');
    expect(st).toContain('测试错误');
  });
});
