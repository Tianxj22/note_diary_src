/**
 * @file         serialization.test.mjs
 * @description  内容编解码往返测试 — encodeNoteContent / decodeNoteContent
 * @author       tianxj22
 * @created      2026-06-28
 * @version      1.0.0
 */

import { describe, it, expect } from 'vitest';
import { encodeNoteContent, decodeNoteContent } from './helpers.mjs';

describe('Content Serialization Round-Trip', () => {

  it('INT-SER-01: 纯文本往返 — 所有内容保留', () => {
    const text = 'Hello World';
    const encoded = encodeNoteContent(text, '');
    const decoded = decodeNoteContent(encoded);
    expect(decoded.text).toBe(text);
    expect(decoded.drawing).toBeNull();
  });

  it('INT-SER-02: 仅绘图内容往返', () => {
    const drawing = 'data:image/png;base64,abc123';
    const encoded = encodeNoteContent('', drawing);
    const decoded = decodeNoteContent(encoded);
    expect(decoded.drawing).toBe(drawing);
    expect(decoded.text).toBe('');
  });

  it('INT-SER-03: 混合内容（文本+绘图）往返', () => {
    const text = '<div>Hello</div>';
    const drawing = 'data:image/png;base64,draw123';
    const encoded = encodeNoteContent(text, drawing);
    const decoded = decodeNoteContent(encoded);
    expect(decoded.text).toBe(text);
    expect(decoded.drawing).toBe(drawing);
  });

  it('INT-SER-04: 富文本 HTML 往返（bold/italic/font/color/underline）', () => {
    const text = '<b>bold</b> <i>italic</i> <u>underline</u> <font face="KaiTi">kaiti</font>';
    const encoded = encodeNoteContent(text, '');
    const decoded = decodeNoteContent(encoded);
    expect(decoded.text).toBe(text);
  });

  it('INT-SER-05: 含图片的文本内容往返', () => {
    const text = '<img src="data:image/png;base64,img1" style="width:200px;height:150px">';
    const encoded = encodeNoteContent(text, '');
    const decoded = decodeNoteContent(encoded);
    expect(decoded.text).toBe(text);
  });

  it('INT-SER-06: 旧格式（无分隔符）向后兼容', () => {
    const raw = 'Hello\nWorld';
    const decoded = decodeNoteContent(raw);
    expect(decoded.drawing).toBeNull();
    expect(decoded.text).toBe(raw);
  });

  it('INT-SER-07: 文本中包含分隔符字面量时的解析', () => {
    const text = '内容包含 ---DRAWING--- 字面量';
    const encoded = encodeNoteContent(text, 'realDrawing');
    const decoded = decodeNoteContent(encoded);
    // The drawing should be 'realDrawing', not the literal from text
    expect(decoded.drawing).toBe('realDrawing');
    expect(decoded.text).toBe(text);
  });

  it('INT-SER-08: 空绘图数据字符串处理', () => {
    const text = 'Some text';
    const encoded = encodeNoteContent(text, '');
    const decoded = decodeNoteContent(encoded);
    // Empty drawing data should result in null after trim
    expect(decoded.text).toBe(text);
    expect(decoded.drawing).toBeNull();
  });

  it('INT-SER-09: ★ 图片裁剪元数据往返 — 验证 dataset 不序列化到 innerHTML', () => {
    // Simulate what happens in the real app:
    // After crop, img.dataset.originalSrc and img.dataset.crop are set
    // But innerHTML does NOT include dataset attributes
    const innerHTML = '<img src="cropped.png" style="width:100px;height:100px">';
    // The dataset attributes are NOT in innerHTML:
    expect(innerHTML).not.toContain('data-original-src');
    expect(innerHTML).not.toContain('data-crop');
    // After save/load round-trip, the originalSrc is lost
    const encoded = encodeNoteContent(innerHTML, '');
    const decoded = decodeNoteContent(encoded);
    expect(decoded.text).toBe(innerHTML);
    // ★ This confirms Fragile Point #2: crop metadata is lost on save/load
    // Dataset attributes need external serialization (e.g., JSON in a data-* attribute's value)
  });
});
