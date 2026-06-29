/**
 * @file         mixed-content-save-load.test.mjs
 * @description  混合内容保存/加载集成测试
 * @author       tianxj22
 * @created      2026-06-28
 * @version      1.0.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTestEnvironment, showEditor, saveDrawCanvasData,
  encodeNoteContent, decodeNoteContent, execInsertHTML,
} from './helpers.mjs';

describe('Mixed Content Save/Load', () => {
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

  it('INT-MIX-01: 文本+图片保存加载', async () => {
    ND.editorDiv.innerHTML = 'Text <b>bold</b> <img src="data:image/png;base64,test" style="width:200px;height:150px">';
    const content = encodeNoteContent(ND.editorDiv.innerHTML, '');
    await api.saveNote(ND.currentNote.filePath, content);

    const raw = await api.readNote(ND.currentNote.filePath);
    const decoded = decodeNoteContent(raw);
    expect(decoded.text).toContain('bold');
    expect(decoded.text).toContain('img');
  });

  it('INT-MIX-02: 文本+清单标记保存加载（含勾选状态）', async () => {
    ND.editorDiv.innerHTML = '<span class="check-box checked">☑</span>&nbsp;<span class="checklist-checked">Task</span>';
    const content = encodeNoteContent(ND.editorDiv.innerHTML, '');
    await api.saveNote(ND.currentNote.filePath, content);

    const raw = await api.readNote(ND.currentNote.filePath);
    const decoded = decodeNoteContent(raw);
    expect(decoded.text).toContain('check-box');
    expect(decoded.text).toContain('checked');
  });

  it('INT-MIX-03: 文本+图片+绘图保存加载', async () => {
    ND.editorDiv.innerHTML = 'Text <img src="data:image/png;base64,test">';
    ND.drawCtx.fillStyle = '#ff0000';
    ND.drawCtx.fillRect(10, 10, 50, 50);
    saveDrawCanvasData(ND);
    const drawing = ND.drawingCanvasData;

    const content = encodeNoteContent(ND.editorDiv.innerHTML, drawing);
    await api.saveNote(ND.currentNote.filePath, content);

    const raw = await api.readNote(ND.currentNote.filePath);
    const decoded = decodeNoteContent(raw);
    expect(decoded.text).toContain('img');
    expect(decoded.drawing).toBe(drawing);
  });

  it('INT-MIX-04: 全内容类型保存加载', async () => {
    ND.editorDiv.innerHTML = '<b>Bold</b> text <i>Italic</i> <img src="test.png"><span class="check-box">☐</span>&nbsp;Task <span class="log-stamp">2026-06-28 12:00</span>&nbsp;Log';
    saveDrawCanvasData(ND);
    const content = encodeNoteContent(ND.editorDiv.innerHTML, ND.drawingCanvasData || '');
    await api.saveNote(ND.currentNote.filePath, content);

    const raw = await api.readNote(ND.currentNote.filePath);
    const decoded = decodeNoteContent(raw);
    expect(decoded.text).toContain('Bold');
    expect(decoded.text).toContain('Italic');
    expect(decoded.text).toContain('check-box');
    expect(decoded.text).toContain('log-stamp');
    expect(decoded.text).toContain('img');
  });

  it('INT-MIX-05: 纯文本旧格式导入', () => {
    const raw = 'Hello\nWorld';
    const decoded = decodeNoteContent(raw);
    expect(decoded.drawing).toBeNull();
    expect(decoded.text).toBe(raw);
  });
});
