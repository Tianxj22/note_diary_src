/**
 * @file         format-painter.test.mjs
 * @description  格式刷跨类型集成测试
 * @author       tianxj22
 * @created      2026-06-28
 * @version      1.0.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTestEnvironment, showEditor,
  activateFormatPainter, applyFormatPainter, deactivateFormatPainter,
} from './helpers.mjs';

describe('Format Painter', () => {
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

  it('INT-FP-01: 基本格式刷工作流', () => {
    ND.editorDiv.innerHTML = '<b>Source text</b>';
    ND.editorDiv.focus();
    const sel = doc.defaultView.getSelection();
    const range = doc.createRange();
    range.selectNodeContents(ND.editorDiv);
    sel.removeAllRanges();
    sel.addRange(range);

    activateFormatPainter(doc, ND);
    expect(ND.formatPainterActive).toBe(true);
    expect(ND.savedFormat).not.toBeNull();
    expect(ND.btnFormatPainter.classList.contains('active')).toBe(true);

    deactivateFormatPainter(ND);
    expect(ND.formatPainterActive).toBe(false);
    expect(ND.savedFormat).toBeNull();
  });

  it('INT-FP-02: 格式刷保存bold格式', () => {
    ND.editorDiv.innerHTML = '<b>Bold source</b>';
    ND.editorDiv.focus();
    const sel = doc.defaultView.getSelection();
    const range = doc.createRange();
    range.selectNodeContents(ND.editorDiv.querySelector('b'));
    sel.removeAllRanges();
    sel.addRange(range);

    activateFormatPainter(doc, ND);
    expect(ND.savedFormat.bold).toBe(true);
  });

  it('INT-FP-03: 格式刷仅应用非默认值', () => {
    ND.editorDiv.innerHTML = '<i>Italic only</i>';
    // Select the text inside <i> so queryCommandState finds the <i> ancestor
    const iEl = ND.editorDiv.querySelector('i');
    const sel = doc.defaultView.getSelection();
    const range = doc.createRange();
    range.selectNodeContents(iEl);
    sel.removeAllRanges();
    sel.addRange(range);
    ND.editorDiv.focus();

    activateFormatPainter(doc, ND);
    // source has italic=true, bold=false
    expect(ND.savedFormat.italic).toBe(true);
    expect(ND.savedFormat.bold).toBe(false);
    deactivateFormatPainter(ND);
  });

  it('INT-FP-04: ★ 格式刷激活时点击图片 — 不应用格式到图片', () => {
    ND.editorDiv.innerHTML = '<b>Bold</b> <img src="test.png">';
    const sel = doc.defaultView.getSelection();
    const range = doc.createRange();
    range.selectNodeContents(ND.editorDiv.querySelector('b'));
    sel.removeAllRanges();
    sel.addRange(range);
    ND.editorDiv.focus();
    activateFormatPainter(doc, ND);

    // Apply to image area — should not wrap img in <b>
    const img = ND.editorDiv.querySelector('img');
    const range2 = doc.createRange();
    range2.selectNode(img);
    sel.removeAllRanges();
    sel.addRange(range2);

    if (ND.savedFormat) applyFormatPainter(doc, ND);
    expect(ND.formatPainterActive).toBe(false);
    // ★ Fragile Point #13: format painter may apply unexpectedly to image selection
  });

  it('INT-FP-05: 格式刷停用清理状态', () => {
    ND.editorDiv.innerHTML = 'Text';
    ND.editorDiv.focus();
    const sel = doc.defaultView.getSelection();
    const range = doc.createRange();
    range.selectNodeContents(ND.editorDiv);
    sel.removeAllRanges();
    sel.addRange(range);
    activateFormatPainter(doc, ND);
    deactivateFormatPainter(ND);
    expect(ND.savedFormat).toBeNull();
    expect(ND.btnFormatPainter.classList.contains('active')).toBe(false);
  });
});
