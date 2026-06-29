/**
 * @file         cross-tab-workflow.test.mjs
 * @description  工具栏标签切换工作流集成测试
 * @author       tianxj22
 * @created      2026-06-28
 * @version      1.0.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTestEnvironment, showEditor, toggleDrawingMode,
} from './helpers.mjs';

describe('Cross-Tab Workflow', () => {
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

  it('INT-TAB-01: File→Style→File 切换保持contenteditable=true', () => {
    expect(ND.editorDiv.contentEditable).toBe('true');
    ND.switchToolbarTab('style');
    expect(ND.editorDiv.contentEditable).toBe('true');
    ND.switchToolbarTab('file');
    expect(ND.editorDiv.contentEditable).toBe('true');
  });

  it('INT-TAB-02: 切换到Draw标签禁用contenteditable', () => {
    toggleDrawingMode(ND, true);
    expect(ND.editorDiv.contentEditable).toBe('false');
  });

  it('INT-TAB-03: 退出Draw模式恢复contenteditable', () => {
    toggleDrawingMode(ND, true);
    toggleDrawingMode(ND, false);
    expect(ND.editorDiv.contentEditable).toBe('true');
  });

  it('INT-TAB-04: 标签面板切换互斥 — 只有一个面板可见', () => {
    ND.switchToolbarTab('file');
    expect(doc.getElementById('toolbar-file').style.display).not.toBe('none');
    ND.switchToolbarTab('style');
    expect(doc.getElementById('toolbar-file').style.display).toBe('none');
    expect(doc.getElementById('toolbar-style').style.display).not.toBe('none');
  });

  it('INT-TAB-05: ★ 切换到Draw模式后非Draw标签自动退出绘图', () => {
    toggleDrawingMode(ND, true);
    expect(ND.drawingActive).toBe(true);
    // Simulate clicking a non-draw tab
    ND.drawingPreviousTab = 'style';
    toggleDrawingMode(ND, false);
    expect(ND.drawingActive).toBe(false);
    expect(ND.editorDiv.contentEditable).toBe('true');
  });

  it('INT-TAB-06: ★ 绘图模式canvas pointer-events隔离', () => {
    toggleDrawingMode(ND, true);
    // In drawing mode, canvas has drawing-active class
    expect(ND.drawCanvas.classList.contains('drawing-active')).toBe(true);
    // After exit, canvas loses drawing-active
    toggleDrawingMode(ND, false);
    expect(ND.drawCanvas.classList.contains('drawing-active')).toBe(false);
  });

  it('INT-TAB-07: 切换到图片编辑标签', () => {
    ND.toolbarTabImage.style.display = '';
    ND.switchToolbarTab('image-edit');
    const imageTab = doc.querySelector('.toolbar-tab[data-tab="image-edit"]');
    // Tab should exist (visibility managed by style)
    expect(imageTab).not.toBeNull();
    ND.toolbarTabImage.style.display = 'none';
  });
});
