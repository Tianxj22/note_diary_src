/**
 * @file         code-block.test.mjs
 * @description  代码块模块核心函数单元测试（buildCodeBlockHTML / getLangLabel / extractCodeFromBlock / Prism 高亮）
 * @author       tianxj22
 * @created      2026-07-01
 * @updated      2026-07-01
 * @version      1.0.0
 */

import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { createRequire } from 'module';

var require = createRequire(import.meta.url);
var Prism = require('prismjs');
// 加载测试需要的语言组件
require('prismjs/components/prism-javascript');
require('prismjs/components/prism-json');
require('prismjs/components/prism-python');
require('prismjs/components/prism-bash');
require('prismjs/components/prism-sql');

/**
 * 支持的测试用语言列表（精简版）
 */
var TEST_LANGUAGES = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'python',     label: 'Python' },
  { id: 'json',       label: 'JSON' },
  { id: 'bash',       label: 'Bash / Shell' },
  { id: 'sql',        label: 'SQL' },
];

/**
 * 语言 ID → 显示名称（复制自 js/code-block.js）
 * @param {string} langId
 * @returns {string}
 */
function getLangLabel(langId) {
  var all = [
    { id: 'javascript', label: 'JavaScript' },
    { id: 'typescript', label: 'TypeScript' },
    { id: 'python',     label: 'Python' },
    { id: 'markup',     label: 'HTML / XML' },
    { id: 'css',        label: 'CSS' },
    { id: 'json',       label: 'JSON' },
    { id: 'bash',       label: 'Bash / Shell' },
    { id: 'sql',        label: 'SQL' },
  ];
  for (var i = 0; i < all.length; i++) {
    if (all[i].id === langId) return all[i].label;
  }
  return langId;
}

/**
 * HTML 转义（复制自 js/utils.js）
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 构建代码块 HTML（复制自 js/code-block.js 核心逻辑）
 * @param {string} langId
 * @param {string} codeText
 * @returns {string}
 */
function buildCodeBlockHTML(langId, codeText) {
  var highlighted;
  try {
    if (Prism.languages[langId]) {
      highlighted = Prism.highlight(codeText, Prism.languages[langId], langId);
    } else {
      highlighted = escapeHtml(codeText);
    }
  } catch (_) {
    highlighted = escapeHtml(codeText);
  }

  var label = getLangLabel(langId);

  return (
    '<div class="code-block-wrapper" contenteditable="false">' +
      '<div class="code-block-header">' +
        '<span class="code-lang-label">' + escapeHtml(label) + '</span>' +
        '<button class="code-block-edit-btn">编辑</button>' +
        '<button class="code-block-delete-btn">&times;</button>' +
      '</div>' +
      '<pre class="code-block" spellcheck="false">' +
        '<code class="language-' + langId + '">' + highlighted + '</code>' +
      '</pre>' +
    '</div>'
  );
}

/**
 * 从代码块 DOM 提取原始文本（复制自 js/code-block.js）
 * @param {HTMLElement} wrapper
 * @returns {string}
 */
function extractCodeFromBlock(wrapper) {
  var code = wrapper.querySelector('code');
  if (!code) return '';
  return code.textContent || '';
}

// ---------------------------------------------------------------------------

describe('getLangLabel', function () {
  it('U-129: getLangLabel 返回正确的显示名称', function () {
    expect(getLangLabel('javascript')).toBe('JavaScript');
    expect(getLangLabel('python')).toBe('Python');
    expect(getLangLabel('json')).toBe('JSON');
    expect(getLangLabel('bash')).toBe('Bash / Shell');
    expect(getLangLabel('sql')).toBe('SQL');
  });

  it('U-129a: 未知语言 ID 返回 ID 本身', function () {
    expect(getLangLabel('rust')).toBe('rust');
    expect(getLangLabel('unknown_lang')).toBe('unknown_lang');
  });
});

describe('buildCodeBlockHTML', function () {
  it('U-130: 生成正确的 wrapper 结构', function () {
    var html = buildCodeBlockHTML('javascript', 'const a = 1;');
    expect(html).toContain('class="code-block-wrapper"');
    expect(html).toContain('class="code-block-header"');
    expect(html).toContain('class="code-lang-label"');
    expect(html).toContain('<pre class="code-block"');
    expect(html).toContain('class="language-javascript"');
    expect(html).toContain('JavaScript');
  });

  it('U-131: wrapper 有 contenteditable="false"', function () {
    var html = buildCodeBlockHTML('python', 'print("hello")');
    expect(html).toContain('contenteditable="false"');
  });

  it('U-132: 代码文本被保留在输出中', function () {
    var html = buildCodeBlockHTML('bash', 'npm install prismjs');
    // 使用 JSDOM 解析后提取 textContent
    var dom = new JSDOM(html);
    var code = dom.window.document.querySelector('code');
    expect(code).not.toBeNull();
    expect(code.textContent).toContain('npm install prismjs');
  });

  it('U-133: 空代码也能生成有效块', function () {
    var html = buildCodeBlockHTML('javascript', '');
    expect(html).toContain('class="code-block-wrapper"');
    expect(html).toContain('<pre class="code-block"');
    expect(html).toContain('<code');
  });

  it('U-134: 多行代码保留换行', function () {
    var html = buildCodeBlockHTML('javascript', 'line1\nline2\nline3');
    var dom = new JSDOM(html);
    var code = dom.window.document.querySelector('code');
    var lines = code.textContent.split('\n');
    expect(lines.length).toBeGreaterThanOrEqual(3);
  });

  it('U-135: 包含编辑和删除按钮', function () {
    var html = buildCodeBlockHTML('sql', 'SELECT 1');
    expect(html).toContain('class="code-block-edit-btn"');
    expect(html).toContain('class="code-block-delete-btn"');
  });
});

describe('extractCodeFromBlock', function () {
  it('U-136: 从高亮后的 DOM 提取纯文本', function () {
    var html = buildCodeBlockHTML('javascript', 'const a = 1;');
    var dom = new JSDOM('<!DOCTYPE html><html><body>' + html + '</body></html>');
    var wrapper = dom.window.document.querySelector('.code-block-wrapper');
    expect(wrapper).not.toBeNull();
    var text = extractCodeFromBlock(wrapper);
    expect(text).toBe('const a = 1;');
  });

  it('U-136a: 提取操作忽略 HTML 标签', function () {
    var html = buildCodeBlockHTML('json', '{"key": "value"}');
    var dom = new JSDOM('<!DOCTYPE html><html><body>' + html + '</body></html>');
    var wrapper = dom.window.document.querySelector('.code-block-wrapper');
    var text = extractCodeFromBlock(wrapper);
    // 应是纯文本，不含 HTML 标签
    expect(text).not.toContain('<span');
    expect(text).toContain('"key"');
  });
});

describe('Prism 语法高亮', function () {
  it('U-137: JavaScript 关键字被高亮', function () {
    var result = Prism.highlight('const x = 1;', Prism.languages.javascript, 'javascript');
    expect(result).toContain('token keyword');
    expect(result).toContain('const');
  });

  it('U-138: JSON 字符串和数字被高亮', function () {
    var result = Prism.highlight('{"key": 42}', Prism.languages.json, 'json');
    expect(result).toContain('token');
  });

  it('U-138a: Python 关键字被高亮', function () {
    var result = Prism.highlight('def foo():\n    return True', Prism.languages.python, 'python');
    expect(result).toContain('token keyword');
    expect(result).toContain('def');
  });
});
