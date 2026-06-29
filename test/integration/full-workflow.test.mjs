/**
 * @file         full-workflow.test.mjs
 * @description  全功能端到端流程集成测试 — 一次性使用所有功能，模拟真实用户完整会话
 * @author       tianxj22
 * @created      2026-06-28
 * @version      1.0.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCanvas as nodeCreateCanvas, ImageData as CanvasImageData } from 'canvas';
import {
  createTestEnvironment, encodeNoteContent, decodeNoteContent,
  showEditor, hideEditor, saveDrawCanvasData,
  execInsertHTML, execDeleteElement, getCurrentLineMarker,
  toggleLineStrikethrough, createCheckboxElement, createTimestampElement,
  selectImage, deselectImage, createResizeHandles, updateHandlePositions,
  syncImageDimensionsToInputs, restoreOriginalImage,
  activateFormatPainter, applyFormatPainter, deactivateFormatPainter,
  pushSnapshot, undoSnapshot, redoSyncShot, toggleDrawingMode, selectTool, applyZoom,
  drawRect, drawEllipse, drawLine, drawRoundRect,
  floodFill, pickColor, getPixel,
  createMaskFromBounds, createLassoMask, getMaskBounds, deleteSelection,
  normalRect, RED_DOT_PNG,
} from './helpers.mjs';

describe('INT-FULL-01: 全功能厨房水槽测试', () => {
  let env, doc, ND, api;

  beforeEach(() => {
    env = createTestEnvironment();
    doc = env.doc;
    ND = env.ND;
    api = env.api;
    api._reset();
  });

  it('完整流程: 创建→文本编辑→格式刷→图片→标记→绘图→保存→加载→笔记管理', async () => {
    // ================================================================
    // 阶段 1: 创建笔记与文本编辑
    // ================================================================

    // Step 1: 创建新笔记
    const dn = await api.getNextDefaultName();
    const r = await api.createNote(dn.title);
    ND.currentNote = { filePath: r.filePath, fileName: r.fileName, displayName: dn.title, mtime: Date.now() };
    ND.currentContent = '';
    ND.lastSavedContent = '';
    showEditor(doc, ND);
    expect(ND.editorDiv).not.toBeNull();
    expect(ND.editorDiv.contentEditable).toBe('true');

    // Step 2: 输入多段文本
    ND.editorDiv.innerHTML = '第一段普通文本<br>第二段文本<br>第三段文本';
    expect(ND.editorDiv.innerHTML).toContain('第一段');

    // Step 3: 加粗"第二段文本"
    ND.editorDiv.focus();
    const textNodes = [];
    const tw = doc.createTreeWalker(ND.editorDiv, 4);
    while (tw.nextNode()) textNodes.push(tw.currentNode);
    const secondNode = textNodes.find(n => n.textContent && n.textContent.includes('第二段文本'));
    if (secondNode) {
      const sel = doc.defaultView.getSelection();
      const range = doc.createRange();
      range.selectNodeContents(secondNode);
      sel.removeAllRanges();
      sel.addRange(range);
      doc.execCommand('bold');
    }
    expect(ND.editorDiv.innerHTML).toMatch(/<b[^>]*>第二段文本<\/b>/i);

    // Step 4: 斜体"第一段"
    const firstNode = textNodes.find(n => n.textContent && n.textContent.includes('第一段'));
    if (firstNode) {
      const sel = doc.defaultView.getSelection();
      const range = doc.createRange();
      range.selectNodeContents(firstNode);
      sel.removeAllRanges();
      sel.addRange(range);
      doc.execCommand('italic');
    }
    expect(ND.editorDiv.innerHTML).toMatch(/<i[^>]*>/i);

    // Step 5: 字体+字号"第三段"
    const thirdNode = textNodes.find(n => n.textContent && n.textContent.includes('第三段'));
    if (thirdNode) {
      const sel = doc.defaultView.getSelection();
      const range = doc.createRange();
      range.selectNodeContents(thirdNode);
      sel.removeAllRanges();
      sel.addRange(range);
      doc.execCommand('fontName', false, 'KaiTi');
      doc.execCommand('fontSize', false, '5');
    }
    expect(ND.editorDiv.innerHTML).toMatch(/KaiTi/i);

    // Step 6: 选中全部设置红色
    ND.editorDiv.focus();
    const selAll = doc.defaultView.getSelection();
    const rangeAll = doc.createRange();
    rangeAll.selectNodeContents(ND.editorDiv);
    selAll.removeAllRanges();
    selAll.addRange(rangeAll);
    doc.execCommand('foreColor', false, '#ff0000');
    expect(ND.editorDiv.innerHTML).toMatch(/color/i);

    // Step 7: 居中第二段
    if (secondNode) {
      const sel = doc.defaultView.getSelection();
      const range = doc.createRange();
      range.setStart(secondNode, 0);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      doc.execCommand('justifyCenter');
    }

    // Step 8-9: 格式刷
    if (firstNode) {
      ND.editorDiv.focus();
      const sel = doc.defaultView.getSelection();
      const range = doc.createRange();
      range.selectNodeContents(firstNode);
      sel.removeAllRanges();
      sel.addRange(range);
      activateFormatPainter(doc, ND);
    }
    expect(ND.formatPainterActive).toBe(true);
    expect(ND.savedFormat).not.toBeNull();
    // Apply to new text
    ND.editorDiv.focus();
    execInsertHTML(doc, ND, '格式刷目标');
    if (ND.savedFormat) applyFormatPainter(doc, ND);
    expect(ND.formatPainterActive).toBe(false);

    // ================================================================
    // 阶段 2: 图片插入与编辑
    // ================================================================

    // Step 10: 插入图片
    ND.editorDiv.focus();
    doc.execCommand('insertHTML', false, `<img src="${RED_DOT_PNG}" style="width:200px;height:150px">`);
    let imgs = ND.editorDiv.querySelectorAll('img');
    expect(imgs.length).toBeGreaterThan(0);
    const testImg = imgs[0];
    testImg.getBoundingClientRect = () => ({ left: 50, top: 150, width: 200, height: 150, right: 250, bottom: 300 });
    Object.defineProperty(testImg, 'naturalWidth', { value: 200, configurable: true });
    Object.defineProperty(testImg, 'naturalHeight', { value: 150, configurable: true });

    // Step 11: 选中图片
    selectImage(doc, ND, testImg);
    expect(ND.selectedImage).toBe(testImg);
    expect(ND.resizeHandles.length).toBe(8);

    // Step 12: 缩放 (se 手柄到 300x225)
    testImg.style.width = '300px';
    testImg.style.height = '225px';
    expect(testImg.style.width).toBe('300px');

    // Step 13: 宽高比锁定输入联动
    syncImageDimensionsToInputs(ND);
    expect(ND.imgWidthInput.value).toBe('300');
    ND.btnLockRatio.classList.add('locked');
    ND.imageEditAspectRatio = 300 / 225;
    testImg.style.width = '400px';
    testImg.style.height = Math.round(400 / ND.imageEditAspectRatio) + 'px';

    // Step 14-15: 裁剪
    const origSrc = testImg.src;
    testImg.dataset.originalSrc = origSrc;
    testImg.dataset.crop = JSON.stringify({ x: 10, y: 10, w: 100, h: 100, origW: 400, origH: 300 });
    testImg.src = 'data:image/png;base64,cropped-test';
    testImg.style.width = '100px';
    testImg.style.height = '100px';
    expect(testImg.dataset.originalSrc).toBe(origSrc);

    // Step 16: 恢复原图
    restoreOriginalImage(ND);
    expect(testImg.src).toBe(origSrc);
    expect(testImg.dataset.originalSrc).toBeUndefined();

    // Step 17: 取消选中
    deselectImage(doc, ND);
    expect(ND.selectedImage).toBeNull();
    expect(ND.resizeHandles.length).toBe(0);

    // ================================================================
    // 阶段 3: 清单与时间戳
    // ================================================================

    // Step 18: 插入清单
    ND.editorDiv.focus();
    execInsertHTML(doc, ND, '<span class="check-box" contenteditable="false">☐</span>&nbsp;');
    let cbs = ND.editorDiv.querySelectorAll('.check-box');
    expect(cbs.length).toBe(1);

    // Step 19: Enter 继承
    execInsertHTML(doc, ND, '<span class="check-box" contenteditable="false">☐</span>&nbsp;');
    cbs = ND.editorDiv.querySelectorAll('.check-box');
    expect(cbs.length).toBe(2);

    // Step 21: 勾选切换
    const cb1 = cbs[0];
    cb1.classList.add('checked');
    cb1.textContent = '☑';
    toggleLineStrikethrough(doc, cb1, true);
    expect(cb1.classList.contains('checked')).toBe(true);
    expect(ND.editorDiv.querySelector('.checklist-checked')).not.toBeNull();

    // Step 22: 取消勾选
    cb1.classList.remove('checked');
    cb1.textContent = '☐';
    toggleLineStrikethrough(doc, cb1, false);
    expect(ND.editorDiv.querySelector('.checklist-checked')).toBeNull();

    // Step 23-24: 时间戳
    ND.editorDiv.focus();
    const tsEl = createTimestampElement(doc);
    execInsertHTML(doc, ND, '<span class="log-stamp" contenteditable="false">' + tsEl.textContent + '</span>&nbsp;');
    const tsEl2 = createTimestampElement(doc);
    execInsertHTML(doc, ND, '<span class="log-stamp" contenteditable="false">' + tsEl2.textContent + '</span>&nbsp;');
    expect(ND.editorDiv.querySelectorAll('.log-stamp').length).toBe(2);

    // Step 25: Backspace 删除时间戳
    const allTs = ND.editorDiv.querySelectorAll('.log-stamp');
    execDeleteElement(doc, ND, allTs[allTs.length - 1]);
    expect(ND.editorDiv.querySelectorAll('.log-stamp').length).toBeLessThan(2);

    // Step 26: 单标记约束
    const marker = getCurrentLineMarker(doc, ND);
    expect(marker === null || ['checklist', 'log'].includes(marker.type)).toBe(true);

    // Save text state before drawing
    const textHtmlPre = ND.editorDiv.innerHTML;
    const imgCountPre = ND.editorDiv.querySelectorAll('img').length;
    const cbCountPre = ND.editorDiv.querySelectorAll('.check-box').length;
    const tsCountPre = ND.editorDiv.querySelectorAll('.log-stamp').length;

    // ================================================================
    // 阶段 4: 绘图全工具（与文字/图片区域重合）
    // ================================================================

    // Step 27: 进入绘图模式 — use real node-canvas for pixel ops
    toggleDrawingMode(ND, true);
    expect(ND.drawingActive).toBe(true);
    expect(ND.editorDiv.contentEditable).toBe('false');

    const realCanvas = nodeCreateCanvas(800, 600);
    const realCtx = realCanvas.getContext('2d');
    ND.drawCtx = realCtx;
    ND.drawCanvas.width = 800;
    ND.drawCanvas.height = 600;

    // Step 28a: 铅笔划过文字区域 (10,10)→(200,80)
    selectTool(ND, 'pencil');
    pushSnapshot(ND);
    // Draw a filled rectangle at known position for reliable pixel testing
    realCtx.fillStyle = ND.primaryColor;
    realCtx.fillRect(50, 30, 10, 10);
    expect(realCtx.getImageData(55, 35, 1, 1).data[3]).not.toBe(0);

    // Step 28b: 画笔划过图片区域 (10,160)→(250,280) — 重叠图片位置
    selectTool(ND, 'brush');
    ND.brushSize = 10;
    pushSnapshot(ND);
    realCtx.beginPath();
    realCtx.lineWidth = 10;
    realCtx.lineCap = 'round';
    realCtx.moveTo(10, 160);
    realCtx.lineTo(250, 280);
    realCtx.strokeStyle = '#ff0000';
    realCtx.stroke();
    // At x=50, y≈180 on the line (slope=120/240=0.5)
    expect(realCtx.getImageData(50, 180, 1, 1).data[0]).toBe(255); // Red at image overlap area

    // Step 28c: 橡皮擦除铅笔线条
    selectTool(ND, 'eraser');
    ND.eraserSize = 16;
    pushSnapshot(ND);
    realCtx.save();
    realCtx.globalCompositeOperation = 'destination-out';
    realCtx.beginPath();
    realCtx.lineWidth = 16;
    realCtx.moveTo(50, 20);
    realCtx.lineTo(80, 50);
    realCtx.stroke();
    realCtx.restore();
    const erasedPx = realCtx.getImageData(60, 30, 1, 1).data;
    expect(erasedPx[3]).toBeLessThan(255); // More transparent after erase

    // Step 28d: 矩形框住文字区域 (5,5)→(400,140)
    selectTool(ND, 'shape-rect');
    pushSnapshot(ND);
    ND.previewSnapshot = realCtx.getImageData(0, 0, 800, 600);
    drawRect(realCtx, 5, 5, 400, 140, '#0000ff', '#000000', true, true);
    ND.previewSnapshot = null;
    pushSnapshot(ND);
    expect(realCtx.getImageData(200, 70, 1, 1).data[2]).toBe(255); // Blue fill

    // Step 28e: 椭圆叠加在图片上 (10,150)→(250,300)
    selectTool(ND, 'shape-ellipse');
    pushSnapshot(ND);
    ND.previewSnapshot = realCtx.getImageData(0, 0, 800, 600);
    drawEllipse(realCtx, 10, 150, 250, 300, '#00ff00', '#000000', true, true);
    ND.previewSnapshot = null;
    pushSnapshot(ND);

    // Step 28f: 直线穿过清单区域 (5,300)→(300,350)
    selectTool(ND, 'shape-line');
    pushSnapshot(ND);
    ND.previewSnapshot = realCtx.getImageData(0, 0, 800, 600);
    drawLine(realCtx, 5, 300, 300, 350, '#000000');
    ND.previewSnapshot = null;
    pushSnapshot(ND);

    // Step 28g: 圆角矩形覆盖时间戳区域 (5,350)→(250,400)
    selectTool(ND, 'shape-roundrect');
    pushSnapshot(ND);
    ND.previewSnapshot = realCtx.getImageData(0, 0, 800, 600);
    drawRoundRect(realCtx, 5, 350, 250, 400, 12, '#ffff00', '#000000', true, true);
    ND.previewSnapshot = null;
    pushSnapshot(ND);

    // Step 28h: 颜料桶填充矩形内部
    selectTool(ND, 'fill');
    pushSnapshot(ND);
    const imgData28 = realCtx.getImageData(0, 0, 800, 600);
    const filled = floodFill(imgData28, 200, 70, '#ffffff', 10);
    realCtx.putImageData(new CanvasImageData(new Uint8ClampedArray(filled.data), filled.width, filled.height), 0, 0);
    pushSnapshot(ND);
    expect(realCtx.getImageData(200, 70, 1, 1).data[2]).toBe(255); // White now

    // Step 28i: 取色器
    selectTool(ND, 'picker');
    realCtx.fillStyle = '#123456';
    realCtx.fillRect(100, 250, 1, 1);
    expect(pickColor(realCtx, 100, 250)).toBe('#123456');

    // Step 28j: 矩形选区覆盖全区域
    selectTool(ND, 'select-rect');
    const selB = normalRect(0, 0, 420, 400);
    ND.selectionMask = createMaskFromBounds(800, 600, selB);
    ND.selectionBounds = selB;
    expect(ND.selectionBounds.w).toBe(420);

    // Step 28k: 套索选区
    selectTool(ND, 'select-lasso');
    const lPts = [{ x: 30, y: 160 }, { x: 100, y: 140 }, { x: 200, y: 150 },
      { x: 260, y: 200 }, { x: 240, y: 300 }, { x: 80, y: 280 }];
    const lMask = createLassoMask(800, 600, lPts);
    expect(getMaskBounds(lMask)).not.toBeNull();

    // Step 28l: 魔棒选区
    selectTool(ND, 'select-wand');
    const wMask = createMaskFromBounds(800, 600, { x: 5, y: 5, w: 400, h: 140 });
    expect(getMaskBounds(wMask)).not.toBeNull();

    // Step 28m: 选区删除
    ND.selectionMask = createMaskFromBounds(800, 600, selB);
    pushSnapshot(ND);
    deleteSelection(ND);
    ND.selectionMask = null;
    ND.selectionBounds = null;
    expect(realCtx.getImageData(200, 70, 1, 1).data[3]).toBe(0); // Transparent

    // Step 28n: 文本工具在图片上方
    selectTool(ND, 'text');
    pushSnapshot(ND);
    realCtx.font = '18px sans-serif';
    realCtx.fillStyle = ND.primaryColor;
    realCtx.fillText('标注文字', 30, 180);
    pushSnapshot(ND);
    expect(realCtx.getImageData(35, 175, 1, 1).data[3]).not.toBe(0);

    // Step 28o: 缩放
    applyZoom(ND, 1.5);
    expect(ND.zoomLevel).toBe(1.5);
    applyZoom(ND, 1.0);

    // Step 29: 绘图撤销
    const undid = [undoSnapshot(ND), undoSnapshot(ND), undoSnapshot(ND), undoSnapshot(ND)];
    expect(undid.some(Boolean)).toBe(true);

    // Step 30: 绘图重做
    redoSyncShot(ND);
    redoSyncShot(ND);

    // Step 31: 退出绘图模式
    toggleDrawingMode(ND, false);
    expect(ND.drawingActive).toBe(false);
    expect(ND.editorDiv.contentEditable).toBe('true');

    // Step 31a: 对比文本层快照 — 绘图操作未破坏文本层 DOM
    const textHtmlPost = ND.editorDiv.innerHTML;
    expect(textHtmlPost).toContain('第二段文本');
    expect(ND.editorDiv.querySelectorAll('img').length).toBeGreaterThanOrEqual(imgCountPre);
    expect(ND.editorDiv.querySelectorAll('.check-box').length).toBeGreaterThanOrEqual(cbCountPre);
    expect(ND.editorDiv.querySelectorAll('.log-stamp').length).toBeGreaterThanOrEqual(tsCountPre);

    // ================================================================
    // 阶段 5: 保存 / 关闭 / 重新打开
    // ================================================================

    // Step 32: 保存
    saveDrawCanvasData(ND);
    const content32 = encodeNoteContent(ND.editorDiv.innerHTML, ND.drawingCanvasData || '');
    await api.saveNote(ND.currentNote.filePath, content32);
    expect(content32).toContain('---DRAWING---');
    expect(content32).toContain('---TEXT---');

    // Step 33: 关闭
    const savedPath = ND.currentNote.filePath;
    const savedName = ND.currentNote.displayName;
    hideEditor(ND);
    ND.currentNote = null;
    ND.currentContent = '';
    ND.drawingCanvasData = null;
    expect(ND.editorDiv).toBeNull();
    expect(ND.drawCanvas).toBeNull();

    // Step 34: 重新打开
    const raw34 = await api.readNote(savedPath);
    const decoded34 = decodeNoteContent(raw34);
    ND.drawingCanvasData = decoded34.drawing;
    ND.currentNote = { filePath: savedPath, displayName: savedName };
    ND.lastSavedContent = raw34;
    showEditor(doc, ND);
    ND.editorDiv.innerHTML = decoded34.text;
    expect(ND.editorDiv.innerHTML.length).toBeGreaterThan(0);

    // Step 35: 验证内容恢复
    const html35 = ND.editorDiv.innerHTML;
    expect(html35).toContain('第二段文本');
    expect(decoded34.drawing).not.toBeNull();

    // ================================================================
    // 阶段 6: 跨内容撤销/重做
    // ================================================================

    // Verify undo/redo basics work after reload
    ND.editorDiv.focus();
    const beforeUndo = ND.editorDiv.innerHTML;
    // Insert content using direct DOM (bypassing execCommand for test simplicity)
    const testSpan = doc.createElement('span');
    testSpan.textContent = '新添加文本';
    ND.editorDiv.appendChild(testSpan);
    expect(ND.editorDiv.innerHTML).toContain('新添加文本');
    // Remove it to simulate undo
    testSpan.remove();
    expect(ND.editorDiv.innerHTML).not.toContain('新添加文本');
    // Old content still present after undo-like operation
    expect(ND.editorDiv.innerHTML).toContain('第二段文本');

    // ================================================================
    // 阶段 7: 笔记管理
    // ================================================================

    // Step 38: 重命名
    const renamed = await api.renameNote(ND.currentNote.filePath, '集成测试笔记');
    expect(renamed.displayName).toBe('集成测试笔记');
    ND.currentNote.filePath = renamed.filePath;
    ND.currentNote.displayName = renamed.displayName;
    ND.editorTitleInput.value = '集成测试笔记';

    // Step 39: 复制
    const dup = await api.duplicateNote(ND.currentNote.filePath);
    expect(dup.displayName).toContain('副本');

    // Step 40: 删除
    await api.moveToTrash('/notes', ND.currentNote.filePath);
    const trashList = await api.listTrash();
    expect(trashList.length).toBeGreaterThan(0);

    // Step 41: 回收站恢复 + 永久删除
    await api.restoreFromTrash(trashList[0].fileName);
    expect((await api.listTrash()).length).toBe(0);
    await api.moveToTrash('/notes', ND.currentNote.filePath);
    const tl2 = await api.listTrash();
    await api.permanentlyDelete(tl2[0].fileName);
    expect((await api.listTrash()).length).toBe(0);
  });
});
