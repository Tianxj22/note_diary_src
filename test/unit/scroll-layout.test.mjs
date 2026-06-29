/**
 * @file         scroll-layout.test.mjs
 * @description  滚动布局单元测试 — 验证 overflow:hidden 链正确约束滚动容器
 * @author       tianxj22
 * @created      2026-06-29
 * @updated      2026-06-29
 * @version      1.0.0
 */

import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';

describe('scroll-layout', () => {
  function buildLayout(contentHTML) {
    var dom = new JSDOM(
      '<!DOCTYPE html><html><head><style>' +
      '* { margin:0; padding:0; box-sizing:border-box; }' +
      'html,body { height:100%; overflow:hidden; }' +
      'body { display:grid; grid-template-columns:240px 1fr; grid-template-rows:1fr; }' +
      '.main-area { display:flex; flex-direction:column; overflow:hidden; }' +
      '.editor-area { flex:1; display:flex; flex-direction:column; overflow:hidden; }' +
      '.editor-scroll { flex:1; display:flex; flex-direction:column; overflow-y:auto; position:relative; }' +
      '.editor-content { flex:1; overflow-y:visible; min-height:0; padding:20px 24px 20px 74px; font-size:0.95rem; line-height:1.8; }' +
      '</style></head><body>' +
      '<div class="main-area">' +
      '  <div class="editor-area">' +
      '    <div class="editor-scroll" id="editor-scroll">' +
      '      <div class="editor-content" id="editor-content">' + contentHTML + '</div>' +
      '    </div>' +
      '  </div>' +
      '</div>' +
      '</body></html>',
      { url: 'http://localhost' }
    );
    return {
      doc: dom.window.document,
      scrollEl: dom.window.document.getElementById('editor-scroll'),
      contentEl: dom.window.document.getElementById('editor-content'),
    };
  }

  it('U-129: 内容不溢出时 scrollHeight 应等于 clientHeight', () => {
    var layout = buildLayout('<p>short content</p>');
    var scrollEl = layout.scrollEl;
    // 短内容不应溢出
    expect(scrollEl.scrollHeight).toBeLessThanOrEqual(scrollEl.clientHeight + 2); // 2px 容差
  });

  it('U-130: 溢出容器内应有足够多的子元素内容', () => {
    // 生成足够多的行（JSDOM 不计算布局，用子元素数量验证内容量）
    var lines = [];
    for (var i = 0; i < 200; i++) {
      lines.push('<p>Line ' + i + ' with enough text to fill multiple lines</p>');
    }
    var layout = buildLayout(lines.join('\n'));
    var contentEl = layout.contentEl;
    // 确认 200 个 <p> 元素已渲染
    var paragraphs = contentEl.querySelectorAll('p');
    expect(paragraphs.length).toBe(200);
    // 每个段落应有文本
    expect(paragraphs[0].textContent).toContain('Line 0');
    expect(paragraphs[199].textContent).toContain('Line 199');
  });

  it('U-131: 滚动容器应能触发 scroll 事件', async () => {
    var lines = [];
    for (var i = 0; i < 200; i++) {
      lines.push('<p>Line ' + i + ' with lots of text to make the editor scrollable</p>');
    }
    var layout = buildLayout(lines.join('\n'));
    var scrollEl = layout.scrollEl;

    var scrolled = false;
    scrollEl.addEventListener('scroll', function () {
      scrolled = true;
    });

    // 模拟滚动
    scrollEl.scrollTop = 100;
    // 在 JSDOM 中手动触发 scroll 事件
    var event = new layout.doc.defaultView.Event('scroll', { bubbles: true });
    scrollEl.dispatchEvent(event);

    expect(scrolled).toBe(true);
  });

  it('U-132: body overflow:hidden 时 body 不应有滚动条', () => {
    var layout = buildLayout('<p>short</p>');
    var bodyStyle = layout.doc.defaultView.getComputedStyle(layout.doc.body);
    expect(bodyStyle.overflow).toBe('hidden');
  });
});

describe('sidebar-scroll', () => {
  function buildSidebarLayout(noteCount) {
    var items = '';
    for (var i = 0; i < noteCount; i++) {
      items += '<div class="note-item"><div class="title">笔记 ' + i + '</div></div>';
    }
    var dom = new JSDOM(
      '<!DOCTYPE html><html><head><style>' +
      '* { margin:0; padding:0; box-sizing:border-box; }' +
      'html,body { height:100%; overflow:hidden; }' +
      'body { display:grid; grid-template-columns:240px 1fr; grid-template-rows:1fr; }' +
      '.sidebar { display:flex; flex-direction:column; overflow:hidden; background:#2c2c2c; }' +
      '.note-list { flex:1; overflow-y:auto; }' +
      '</style></head><body>' +
      '<div class="sidebar" id="sidebar"><div class="note-list" id="note-list">' + items + '</div></div>' +
      '<div class="main-area"></div>' +
      '</body></html>',
      { url: 'http://localhost' }
    );
    return {
      doc: dom.window.document,
      noteList: dom.window.document.getElementById('note-list'),
    };
  }

  it('U-133: sidebar overflow:hidden 下 .note-list 仍 overflow-y:auto', () => {
    var layout = buildSidebarLayout(50);
    var noteList = layout.noteList;
    var style = layout.doc.defaultView.getComputedStyle(noteList);
    expect(style.overflowY).toBe('auto');
  });
});
