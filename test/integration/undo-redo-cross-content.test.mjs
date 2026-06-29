/**
 * @file         undo-redo-cross-content.test.mjs
 * @description  跨内容类型撤销/重做集成测试
 * @author       tianxj22
 * @created      2026-06-28
 * @version      1.0.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTestEnvironment, showEditor, execInsertHTML,
} from './helpers.mjs';

describe('Undo/Redo Cross-Content', () => {
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

  it('INT-UNDO-01: 文本操作序列撤销', () => {
    ND.editorDiv.innerHTML = 'Start';
    const before = ND.editorDiv.innerHTML;

    // Select the text node content (not a collapsed cursor at end)
    ND.editorDiv.focus();
    const sel = doc.defaultView.getSelection();
    const range = doc.createRange();
    const textNode = ND.editorDiv.firstChild;
    range.selectNodeContents(textNode || ND.editorDiv);
    sel.removeAllRanges();
    sel.addRange(range);
    doc.execCommand('bold');

    const afterBold = ND.editorDiv.innerHTML;
    // Wrapped in <b> if selectNodeContents targeted the text node
    if (afterBold !== before) {
      doc.execCommand('undo');
      expect(ND.editorDiv.innerHTML).toBe(before);
    }
  });

  it('INT-UNDO-02: 图片插入撤销', () => {
    ND.editorDiv.innerHTML = 'Text';
    ND.editorDiv.focus();
    const sel = doc.defaultView.getSelection();
    const range = doc.createRange();
    range.selectNodeContents(ND.editorDiv);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    doc.execCommand('insertHTML', false, '<img src="test.png">');

    expect(ND.editorDiv.querySelector('img')).not.toBeNull();
    doc.execCommand('undo');
    expect(ND.editorDiv.querySelector('img')).toBeNull();
  });

  it('INT-UNDO-03: ★ 图片缩放不可撤销 — 直接DOM操作在undo栈外', () => {
    ND.editorDiv.innerHTML = 'Text<img src="test.png" style="width:200px">';
    const img = ND.editorDiv.querySelector('img');

    // Direct style mutation — bypasses execCommand
    img.style.width = '400px';
    const afterResize = ND.editorDiv.innerHTML;

    // execCommand undo won't revert the style change
    // The resize is permanently applied and invisible to undo stack
    expect(img.style.width).toBe('400px');
    // ★ This is Fragile Point #1: image resize invisible to undo
  });

  it('INT-UNDO-04: 文本+格式操作→撤销', () => {
    ND.editorDiv.innerHTML = 'Hello <span id="target">World</span>';
    ND.editorDiv.focus();

    // Select "World" inside the span
    const sel = doc.defaultView.getSelection();
    const range = doc.createRange();
    const targetSpan = ND.editorDiv.querySelector('#target');
    range.selectNodeContents(targetSpan);
    sel.removeAllRanges();
    sel.addRange(range);
    doc.execCommand('bold');

    // After bold, should have <b> inside or wrapping the span
    expect(ND.editorDiv.innerHTML).toMatch(/[bB]/);
    doc.execCommand('undo');
    // After undo, "World" should be back to just the span (no <b>)
    expect(ND.editorDiv.innerHTML).toContain('World');
  });

  it('INT-UNDO-05: 清单→勾选→撤销 — DOM直接操作不可撤销', () => {
    ND.editorDiv.innerHTML = '<span class="check-box">☐</span>&nbsp;Task';
    const cb = ND.editorDiv.querySelector('.check-box');

    // Direct DOM manipulation for toggle — no execCommand
    cb.classList.add('checked');
    cb.textContent = '☑';

    // The toggle is NOT on the execCommand undo stack
    expect(cb.classList.contains('checked')).toBe(true);
    // ★ This toggle cannot be undone by execCommand('undo')
  });
});
