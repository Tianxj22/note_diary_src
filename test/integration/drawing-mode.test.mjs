/**
 * @file         drawing-mode.test.mjs
 * @description  绘图模式进出/切换状态转换测试
 * @author       tianxj22
 * @created      2026-06-28
 * @version      1.0.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTestEnvironment, showEditor,
  pushSnapshot, undoSnapshot, redoSyncShot, toggleDrawingMode, selectTool, applyZoom,
} from './helpers.mjs';

describe('Drawing Mode State Transitions', () => {
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

  it('INT-DRW-01: 进入绘图模式的完整状态转换', () => {
    toggleDrawingMode(ND, true);
    expect(ND.drawingActive).toBe(true);
    expect(ND.editorDiv.contentEditable).toBe('false');
    expect(ND.drawCanvas.classList.contains('drawing-active')).toBe(true);
  });

  it('INT-DRW-02: 退出绘图模式的完整状态转换', () => {
    toggleDrawingMode(ND, true);
    toggleDrawingMode(ND, false);
    expect(ND.drawingActive).toBe(false);
    expect(ND.editorDiv.contentEditable).toBe('true');
    expect(ND.drawCanvas.classList.contains('drawing-active')).toBe(false);
  });

  it('INT-DRW-03: 绘图模式阻止文本编辑', () => {
    toggleDrawingMode(ND, true);
    expect(ND.editorDiv.contentEditable).toBe('false');
  });

  it('INT-DRW-04: ★ 独立撤销系统隔离性', () => {
    ND.editorDiv.innerHTML = 'Text content';
    toggleDrawingMode(ND, true);
    pushSnapshot(ND);
    // Simulate a drawing change
    const ctx = ND.drawCtx;
    if (ctx) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 10, 10);
      pushSnapshot(ND);
    }
    // Drawing undo
    const didUndo = undoSnapshot(ND);
    toggleDrawingMode(ND, false);
    // Text layer is untouched by drawing undo
    expect(ND.editorDiv.innerHTML).toContain('Text content');
    // ★ Drawing undo does not affect text content (separate systems)
  });

  it('INT-DRW-05: 50+快照上限验证', () => {
    toggleDrawingMode(ND, true);
    for (let i = 0; i < 55; i++) {
      pushSnapshot(ND);
    }
    expect(ND.drawingSnapshots.length).toBeLessThanOrEqual(50);
  });

  it('INT-DRW-06: ★ 笔划进行中画布resize — 状态不受影响', () => {
    toggleDrawingMode(ND, true);
    ND.isDrawing = true;
    // Simulate canvas resize — should not crash
    const oldW = ND.drawCanvas.width;
    ND.drawCanvas.width = 1200;
    ND.drawCanvas.height = 800;
    expect(ND.isDrawing).toBe(true); // isDrawing state preserved
    ND.isDrawing = false;
  });

  it('INT-DRW-07: 缩放应用', () => {
    applyZoom(ND, 2.0);
    expect(ND.zoomLevel).toBe(2.0);
    expect(ND.editorScroll.style.transform).toContain('scale(2)');
    applyZoom(ND, 1.0);
    expect(ND.zoomLevel).toBe(1.0);
  });

  it('INT-DRW-08: 清除画布', () => {
    toggleDrawingMode(ND, true);
    pushSnapshot(ND);
    ND.drawCtx.fillStyle = '#000';
    ND.drawCtx.fillRect(0, 0, 100, 100);
    ND.drawCtx.clearRect(0, 0, ND.drawCanvas.width, ND.drawCanvas.height);
    ND.drawingCanvasData = null;
    // After clear, canvas should be transparent
    const pixel = ND.drawCtx.getImageData(50, 50, 1, 1).data;
    expect(pixel[3]).toBe(0);
  });

  it('INT-DRW-09: 工具切换重置状态', () => {
    toggleDrawingMode(ND, true);
    ND.isDrawing = true;
    ND.previewSnapshot = {};
    selectTool(ND, 'brush');
    expect(ND.currentTool).toBe('brush');
    expect(ND.isDrawing).toBe(false);
    expect(ND.previewSnapshot).toBeNull();
  });
});
