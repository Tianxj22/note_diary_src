/**
 * @file         edit-toolbar.test.mjs
 * @description  编辑工具栏核心函数单元测试（match counting / replace / escape regex）
 * @author       tianxj22
 * @created      2026-06-29
 * @updated      2026-06-29
 * @version      1.0.0
 */

import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';

// 在模块顶层设置 JSDOM
var dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost' });
var doc = dom.window.document;

/**
 * 转义正则特殊字符 — 复制自 js/edit-toolbar.js
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 在节点树中全部替换文本 — 复制自 js/edit-toolbar.js（使用 JSDOM TreeWalker）
 * @param {Node} root
 * @param {string} term
 * @param {string} replacement
 * @param {boolean} caseSensitive
 * @returns {number}
 */
function replaceAllInNode(root, term, replacement, caseSensitive) {
  var count = 0;
  var walker = doc.createTreeWalker(root, dom.window.NodeFilter.SHOW_TEXT, {
    acceptNode: function (node) {
      var parent = node.parentElement;
      if (parent && parent.getAttribute('contenteditable') === 'false') return dom.window.NodeFilter.FILTER_REJECT;
      if (!node.textContent.trim()) return dom.window.NodeFilter.FILTER_REJECT;
      return dom.window.NodeFilter.FILTER_ACCEPT;
    },
  });
  var nodesToReplace = [];
  while (walker.nextNode()) {
    nodesToReplace.push(walker.currentNode);
  }
  var flags = caseSensitive ? 'g' : 'gi';
  var regex = new RegExp(escapeRegex(term), flags);
  nodesToReplace.forEach(function (textNode) {
    var original = textNode.textContent;
    var replaced = original.replace(regex, replacement);
    if (replaced !== original) {
      count += (original.match(regex) || []).length;
      textNode.textContent = replaced;
    }
  });
  return count;
}

/**
 * 统计编辑器内所有文本节点的匹配次数 — 复制自 js/edit-toolbar.js
 */
function countMatches(root, term, caseSensitive) {
  var count = 0;
  var walker = doc.createTreeWalker(root, dom.window.NodeFilter.SHOW_TEXT, {
    acceptNode: function (node) {
      var parent = node.parentElement;
      if (parent && parent.getAttribute('contenteditable') === 'false') return dom.window.NodeFilter.FILTER_REJECT;
      if (!node.textContent.trim()) return dom.window.NodeFilter.FILTER_REJECT;
      return dom.window.NodeFilter.FILTER_ACCEPT;
    },
  });
  var searchTerm = caseSensitive ? term : term.toLowerCase();
  while (walker.nextNode()) {
    var text = caseSensitive ? walker.currentNode.textContent : walker.currentNode.textContent.toLowerCase();
    var idx = 0;
    while ((idx = text.indexOf(searchTerm, idx)) !== -1) {
      count++;
      idx += searchTerm.length;
    }
  }
  return count;
}

describe('escapeRegex', () => {
  it('U-112: 普通文本不转义', () => {
    expect(escapeRegex('hello')).toBe('hello');
  });

  it('U-113: 点号应转义', () => {
    expect(escapeRegex('a.b')).toBe('a\\.b');
  });

  it('U-114: 括号应转义', () => {
    expect(escapeRegex('(test)')).toBe('\\(test\\)');
  });

  it('U-115: 星号加号问号应转义', () => {
    expect(escapeRegex('a*b+c?')).toBe('a\\*b\\+c\\?');
  });
});

describe('countMatches', () => {
  function makeDiv(html) {
    var div = doc.createElement('div');
    div.innerHTML = html;
    return div;
  }

  it('U-116: 单次精确匹配', () => {
    var root = makeDiv('<p>hello world</p>');
    expect(countMatches(root, 'hello', false)).toBe(1);
  });

  it('U-117: 多次匹配', () => {
    var root = makeDiv('<p>hello hello hello</p>');
    expect(countMatches(root, 'hello', false)).toBe(3);
  });

  it('U-118: 大小写不敏感匹配', () => {
    var root = makeDiv('<p>Hello HELLO hello</p>');
    expect(countMatches(root, 'hello', false)).toBe(3);
  });

  it('U-119: 大小写敏感匹配', () => {
    var root = makeDiv('<p>Hello HELLO hello</p>');
    expect(countMatches(root, 'Hello', true)).toBe(1);
  });

  it('U-120: 无匹配返回 0', () => {
    var root = makeDiv('<p>hello world</p>');
    expect(countMatches(root, 'xyz', false)).toBe(0);
  });

  it('U-121: 跨多元素匹配', () => {
    var root = makeDiv('<p>hello</p><div>hello world</div><span>say hello</span>');
    expect(countMatches(root, 'hello', false)).toBe(3);
  });

  it('U-122: contenteditable=false 应跳过', () => {
    var root = makeDiv('<p>hello</p><span contenteditable="false">hello</span>');
    expect(countMatches(root, 'hello', false)).toBe(1);
  });
});

describe('replaceAllInNode', () => {
  function makeDiv(html) {
    var div = doc.createElement('div');
    div.innerHTML = html;
    return div;
  }

  it('U-123: 替换单次出现', () => {
    var root = makeDiv('<p>hello world</p>');
    var count = replaceAllInNode(root, 'hello', 'hi', false);
    expect(count).toBe(1);
    expect(root.textContent).toBe('hi world');
  });

  it('U-124: 替换多次出现', () => {
    var root = makeDiv('<p>hello hello hello</p>');
    var count = replaceAllInNode(root, 'hello', 'hi', false);
    expect(count).toBe(3);
    expect(root.textContent).toBe('hi hi hi');
  });

  it('U-125: 大小写不敏感替换', () => {
    var root = makeDiv('<p>Hello HELLO hello</p>');
    var count = replaceAllInNode(root, 'hello', 'world', false);
    expect(count).toBe(3);
    expect(root.textContent).toBe('world world world');
  });

  it('U-126: 大小写敏感只替换匹配的', () => {
    var root = makeDiv('<p>Hello HELLO hello</p>');
    var count = replaceAllInNode(root, 'Hello', 'Hi', true);
    expect(count).toBe(1);
    expect(root.textContent).toBe('Hi HELLO hello');
  });

  it('U-127: 无匹配返回 0', () => {
    var root = makeDiv('<p>hello world</p>');
    var count = replaceAllInNode(root, 'xyz', 'abc', false);
    expect(count).toBe(0);
    expect(root.textContent).toBe('hello world');
  });

  it('U-128: contenteditable=false 应跳过', () => {
    var root = makeDiv('<p>hello</p><span contenteditable="false">hello</span>');
    var count = replaceAllInNode(root, 'hello', 'world', false);
    expect(count).toBe(1);
    var editableText = root.querySelector('p').textContent;
    var nonEditableText = root.querySelector('span').textContent;
    expect(editableText).toBe('world');
    expect(nonEditableText).toBe('hello');
  });
});
