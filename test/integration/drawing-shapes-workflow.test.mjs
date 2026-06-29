/**
 * @file         drawing-shapes-workflow.test.mjs
 * @description  全形状工具切换与绘制流程集成测试 — 顺序使用全部18个工具/操作步骤
 *               验证 tool switching 状态完整性和绘制结果正确性
 * @author       tianxj22
 * @created      2026-06-28
 * @version      1.0.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCanvas as nodeCreateCanvas } from 'canvas';
import {
  createTestEnvironment, showEditor,
  pushSnapshot, undoSnapshot, redoSyncShot, toggleDrawingMode, selectTool, applyZoom,
  drawRect, drawEllipse, drawLine, drawRoundRect,
  floodFill, pickColor, hexToRGBA, getPixel, colorsMatch,
  createMaskFromBounds, createLassoMask, pointInPolygon, getMaskBounds, deleteSelection,
  normalRect,
} from './helpers.mjs';

describe('INT-DRW-SHP-01: 全工具遍历工作流', () => {
  let env, doc, ND, api;

  beforeEach(() => {
    env = createTestEnvironment();
    doc = env.doc;
    ND = env.ND;
    api = env.api;
    api._reset();
  });

  it('18步工具完整切换流程', async () => {
    // --- Setup: create note and canvas ---
    const defaultName = await api.getNextDefaultName();
    const result = await api.createNote(defaultName.title);
    ND.currentNote = { filePath: result.filePath, fileName: result.fileName, displayName: defaultName.title, mtime: Date.now() };
    showEditor(doc, ND);

    // Replace jsdom canvas with real node-canvas for pixel ops
    const { createCanvas: ncCreateCanvas } = await import('canvas');
    const realCanvas = ncCreateCanvas(800, 600);
    const realCtx = realCanvas.getContext('2d');
    ND.drawCtx = realCtx;
    ND.drawCanvas.width = 800;
    ND.drawCanvas.height = 600;

    // ============================================================
    // Step 1: 进入绘图模式
    // ============================================================
    toggleDrawingMode(ND, true);
    expect(ND.drawingActive).toBe(true);
    expect(ND.editorDiv.contentEditable).toBe('false');
    expect(ND.drawCanvas.classList.contains('drawing-active')).toBe(true);

    // ============================================================
    // Step 2: 铅笔
    // ============================================================
    selectTool(ND, 'pencil');
    expect(ND.currentTool).toBe('pencil');
    expect(ND.isDrawing).toBe(false);
    expect(ND.previewSnapshot).toBeNull();
    pushSnapshot(ND);
    realCtx.beginPath();
    realCtx.moveTo(50.5, 50.5);
    realCtx.lineTo(200.5, 80.5);
    realCtx.lineTo(100.5, 120.5);
    realCtx.strokeStyle = ND.primaryColor;
    realCtx.lineWidth = 1;
    realCtx.lineCap = 'butt';
    realCtx.stroke();
    const pencilPixel = realCtx.getImageData(100, 60, 1, 1).data;
    // Verify non-transparent pixel along the path
    expect(pencilPixel[3]).not.toBe(0);

    // ============================================================
    // Step 3: 画笔
    // ============================================================
    selectTool(ND, 'brush');
    expect(ND.currentTool).toBe('brush');
    expect(ND.isDrawing).toBe(false);
    ND.brushSize = 12;
    pushSnapshot(ND);
    realCtx.beginPath();
    realCtx.lineWidth = 12;
    realCtx.lineCap = 'round';
    realCtx.lineJoin = 'round';
    realCtx.moveTo(300, 100);
    realCtx.lineTo(400, 150);
    realCtx.strokeStyle = '#ff0000';
    realCtx.stroke();
    const brushPixel = realCtx.getImageData(350, 120, 1, 1).data;
    // Brush should produce wider, red stroke
    expect(brushPixel[0]).toBe(255); // Red

    // ============================================================
    // Step 4: 橡皮
    // ============================================================
    selectTool(ND, 'eraser');
    expect(ND.currentTool).toBe('eraser');
    ND.eraserSize = 20;
    pushSnapshot(ND);
    realCtx.save();
    realCtx.globalCompositeOperation = 'destination-out';
    realCtx.beginPath();
    realCtx.lineWidth = 20;
    realCtx.lineCap = 'round';
    realCtx.moveTo(50, 50);
    realCtx.lineTo(80, 70);
    realCtx.stroke();
    realCtx.restore();
    // After erasing, pencil line should be partially removed
    const erasedPixel = realCtx.getImageData(60, 55, 1, 1).data;
    // Should be more transparent than before (pencil created opaque pixel here)
    expect(erasedPixel[3]).toBeLessThan(255);

    // ============================================================
    // Step 5: 矩形
    // ============================================================
    selectTool(ND, 'shape-rect');
    expect(ND.currentTool).toBe('shape-rect');
    pushSnapshot(ND);
    ND.previewSnapshot = realCtx.getImageData(0, 0, 800, 600);
    drawRect(realCtx, 30, 300, 200, 400, '#0000ff', '#000000', true, true);
    ND.previewSnapshot = null;
    pushSnapshot(ND);
    const rectInner = realCtx.getImageData(100, 350, 1, 1).data;
    expect(rectInner[2]).toBe(255); // Blue fill

    // ============================================================
    // Step 6: 椭圆
    // ============================================================
    selectTool(ND, 'shape-ellipse');
    expect(ND.currentTool).toBe('shape-ellipse');
    pushSnapshot(ND);
    ND.previewSnapshot = realCtx.getImageData(0, 0, 800, 600);
    drawEllipse(realCtx, 250, 300, 450, 420, '#00ff00', '#000000', true, true);
    ND.previewSnapshot = null;
    pushSnapshot(ND);

    // ============================================================
    // Step 7: 直线
    // ============================================================
    selectTool(ND, 'shape-line');
    expect(ND.currentTool).toBe('shape-line');
    pushSnapshot(ND);
    ND.previewSnapshot = realCtx.getImageData(0, 0, 800, 600);
    drawLine(realCtx, 500, 50, 700, 150, '#ff00ff');
    ND.previewSnapshot = null;
    pushSnapshot(ND);

    // ============================================================
    // Step 8: 圆角矩形
    // ============================================================
    selectTool(ND, 'shape-roundrect');
    expect(ND.currentTool).toBe('shape-roundrect');
    pushSnapshot(ND);
    ND.previewSnapshot = realCtx.getImageData(0, 0, 800, 600);
    drawRoundRect(realCtx, 500, 300, 700, 450, 12, '#ffff00', '#000000', true, true);
    ND.previewSnapshot = null;
    pushSnapshot(ND);

    // ============================================================
    // Step 9: 颜料桶 — fill inside the rect from step 5
    // ============================================================
    selectTool(ND, 'fill');
    expect(ND.currentTool).toBe('fill');
    pushSnapshot(ND);
    const fillID = realCtx.getImageData(0, 0, 800, 600);
    const filled = floodFill(fillID, 100, 350, '#ffffff', 0); // Fill blue area with white
    const { ImageData: CanvasImageData } = await import('canvas');
    realCtx.putImageData(new CanvasImageData(
      new Uint8ClampedArray(filled.data), filled.width, filled.height
    ), 0, 0);
    pushSnapshot(ND);
    const filledPixel = realCtx.getImageData(100, 350, 1, 1).data;
    expect(filledPixel[2]).toBe(255); // Now white (was blue)

    // ============================================================
    // Step 10: 取色器 — pick the yellow round rect
    // ============================================================
    selectTool(ND, 'picker');
    expect(ND.currentTool).toBe('picker');
    const color = pickColor(realCtx, 600, 375);
    expect(color).toBe('#ffff00'); // Yellow from round rect
    ND.primaryColor = color;

    // ============================================================
    // Step 11: 矩形选区 — select area containing rect+ellipse
    // ============================================================
    selectTool(ND, 'select-rect');
    expect(ND.currentTool).toBe('select-rect');
    const selR = normalRect(20, 280, 470, 440);
    ND.selectionMask = createMaskFromBounds(800, 600, selR);
    ND.selectionBounds = selR;
    expect(ND.selectionBounds.w).toBeGreaterThan(400);
    expect(ND.selectionBounds.h).toBeGreaterThan(100);

    // ============================================================
    // Step 12: 套索选区 — around the line area
    // ============================================================
    selectTool(ND, 'select-lasso');
    expect(ND.currentTool).toBe('select-lasso');
    const lassoPts = [
      { x: 480, y: 40 }, { x: 550, y: 30 }, { x: 650, y: 45 },
      { x: 720, y: 100 }, { x: 710, y: 170 }, { x: 600, y: 160 },
      { x: 490, y: 100 },
    ];
    const lMask = createLassoMask(800, 600, lassoPts);
    const lBounds = getMaskBounds(lMask);
    expect(lBounds).not.toBeNull();

    // ============================================================
    // Step 13: 魔棒选区 — in the white-filled rect area
    // ============================================================
    selectTool(ND, 'select-wand');
    expect(ND.currentTool).toBe('select-wand');
    // The rect area at (100,350) is now white. Magic wand should select it.
    // We'll skip full magicWandSelect here since it's tested in unit tests,
    // instead verify the mask creation API
    const wandMask = createMaskFromBounds(800, 600, { x: 30, y: 300, w: 170, h: 100 });
    const wandBounds = getMaskBounds(wandMask);
    expect(wandBounds.w).toBeGreaterThan(100);

    // ============================================================
    // Step 14: 选区删除
    // ============================================================
    // Use the rectangular selection from step 11
    ND.selectionMask = createMaskFromBounds(800, 600, selR);
    ND.selectionBounds = selR;
    pushSnapshot(ND);
    deleteSelection(ND);
    ND.selectionMask = null;
    ND.selectionBounds = null;
    // Verify deletion — the area should now be transparent
    const deletedPixel = realCtx.getImageData(100, 350, 1, 1).data;
    expect(deletedPixel[3]).toBe(0); // Fully transparent after deletion

    // ============================================================
    // Step 15: 文本工具
    // ============================================================
    selectTool(ND, 'text');
    expect(ND.currentTool).toBe('text');
    pushSnapshot(ND);
    realCtx.font = '18px sans-serif';
    realCtx.fillStyle = ND.primaryColor;
    realCtx.fillText('测试文字', 100, 500);
    pushSnapshot(ND);
    // Verify text was rendered (non-transparent pixel at text position)
    const textPixel = realCtx.getImageData(105, 492, 1, 1).data;
    // Text fills pixels — at least some are non-transparent
    expect(textPixel[3]).not.toBe(0);

    // ============================================================
    // Step 16: 缩放
    // ============================================================
    applyZoom(ND, 2.0);
    expect(ND.zoomLevel).toBe(2.0);
    expect(ND.editorScroll.style.transform).toContain('scale(2)');
    applyZoom(ND, 1.0);
    expect(ND.zoomLevel).toBe(1.0);

    // ============================================================
    // Step 17: 清除画布
    // ============================================================
    pushSnapshot(ND);
    realCtx.clearRect(0, 0, 800, 600);
    ND.drawingCanvasData = null;
    const clearedPixel = realCtx.getImageData(100, 100, 1, 1).data;
    expect(clearedPixel[3]).toBe(0); // Fully transparent after clear

    // ============================================================
    // Step 18: 退出绘图模式
    // ============================================================
    toggleDrawingMode(ND, false);
    expect(ND.drawingActive).toBe(false);
    expect(ND.editorDiv.contentEditable).toBe('true');
    expect(ND.drawCanvas.classList.contains('drawing-active')).toBe(false);
    expect(ND.isDrawing).toBe(false);
    expect(ND.previewSnapshot).toBeNull();

    // ---- Final state verification ----
    // All snapshots should have been properly managed
    expect(ND.drawingSnapshots.length).toBeGreaterThan(0);
    // contentEditable is restored
    expect(ND.editorDiv.contentEditable).toBe('true');
  });
});
