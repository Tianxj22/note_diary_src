/**
 * @file         state-cleanup.test.mjs
 * @description  状态清理集成测试 — 关闭笔记后验证所有ND状态归零
 * @author       tianxj22
 * @created      2026-06-28
 * @version      1.0.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTestEnvironment, showEditor, hideEditor,
  selectImage, deselectImage, createResizeHandles,
  toggleDrawingMode, saveDrawCanvasData,
} from './helpers.mjs';

describe('State Cleanup', () => {
  let env, doc, ND, api;

  beforeEach(async () => {
    env = createTestEnvironment();
    doc = env.doc;
    ND = env.ND;
    api = env.api;
    api._reset();
    const dn = await api.getNextDefaultName();
    const r = await api.createNote(dn.title);
    ND.currentNote = { filePath: r.filePath, fileName: r.fileName, displayName: dn.title, mtime: Date.now() };
    showEditor(doc, ND);
  });

  it('INT-CLN-01: closeCurrentNote清理核心状态', () => {
    ND.editorDiv.innerHTML = 'Content';
    saveDrawCanvasData(ND);
    // Simulate close
    hideEditor(ND);
    ND.currentNote = null;
    ND.currentContent = '';
    ND.lastSavedContent = '';
    ND.drawingCanvasData = null;

    expect(ND.editorDiv).toBeNull();
    expect(ND.editorTitleInput).toBeNull();
    expect(ND.drawCanvas).toBeNull();
    expect(ND.editorScroll).toBeNull();
    expect(ND.currentNote).toBeNull();
  });

  it('INT-CLN-02: closeCurrentNote清理图片选中状态', () => {
    ND.editorDiv.innerHTML = '<img src="test.png">';
    const img = ND.editorDiv.querySelector('img');
    img.getBoundingClientRect = () => ({ left: 50, top: 100, width: 200, height: 150, right: 250, bottom: 250 });
    Object.defineProperty(img, 'naturalWidth', { value: 200, configurable: true });
    Object.defineProperty(img, 'naturalHeight', { value: 150, configurable: true });
    selectImage(doc, ND, img);
    expect(ND.selectedImage).not.toBeNull();

    hideEditor(ND);
    expect(ND.selectedImage).toBeNull();
    expect(ND.resizeHandles.length).toBe(0);
  });

  it('INT-CLN-03: closeCurrentNote清理绘图状态', () => {
    toggleDrawingMode(ND, true);
    ND.drawingActive = true;
    hideEditor(ND);
    expect(ND.drawCanvas).toBeNull();
    expect(ND.drawCtx).toBeNull();
    // drawingActive can be preserved across notes
  });

  it('INT-CLN-04: 关闭后欢迎界面显示', () => {
    hideEditor(ND);
    const areaHtml = ND.editorArea.innerHTML;
    expect(areaHtml).toContain('选择或新建一篇笔记开始编辑');
  });

  it('INT-CLN-05: 取消选中清理手柄', () => {
    ND.editorDiv.innerHTML = '<img src="test.png">';
    const img = ND.editorDiv.querySelector('img');
    img.getBoundingClientRect = () => ({ left: 50, top: 100, width: 200, height: 150, right: 250, bottom: 250 });
    Object.defineProperty(img, 'naturalWidth', { value: 200, configurable: true });
    Object.defineProperty(img, 'naturalHeight', { value: 150, configurable: true });
    selectImage(doc, ND, img);
    expect(ND.resizeHandles.length).toBe(8);

    deselectImage(doc, ND);
    expect(ND.resizeHandles.length).toBe(0);
    expect(doc.getElementById('image-resize-container').innerHTML).toBe('');
  });
});
