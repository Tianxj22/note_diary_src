/**
 * @file         keybindings-store.js
 * @description  快捷键配置存储模块 — 读/写 {userData}/keybindings.json
 * @author       tianxj22
 * @created      2026-06-29
 * @updated      2026-06-29
 * @version      1.0.0
 */

const fs = require('fs');
const path = require('path');

const KEYBINDINGS_FILE = 'keybindings.json';

/**
 * 默认快捷键映射
 */
function getDefaultBindings() {
  return {
    version: 1,
    bindings: {
      'file.new':             'Ctrl+N',
      'file.save':            'Ctrl+S',
      'file.close':           'Ctrl+W',
      'file.import':          null,
      'edit.undo':            'Ctrl+Z',
      'edit.redo':            'Ctrl+Y',
      'edit.find':            'Ctrl+F',
      'edit.replace':         'Ctrl+H',
      'edit.selectAll':       'Ctrl+A',
      'format.bold':          'Ctrl+B',
      'format.italic':        'Ctrl+I',
      'format.underline':     'Ctrl+U',
      'format.strikethrough': 'Ctrl+D',
      'format.removeFormat':  'Ctrl+\\',
      'format.orderedList':   'Ctrl+Shift+O',
      'format.unorderedList': 'Ctrl+Shift+U',
      'format.indent':        'Tab',
      'format.outdent':       'Shift+Tab',
      'insert.checklist':     'Ctrl+Shift+C',
      'insert.timestamp':     'Ctrl+Shift+T',
      'insert.image':         'Ctrl+Shift+I',
      'view.toggleDraw':      'Ctrl+Shift+D',
    },
  };
}

/**
 * 解析快捷键字符串为 keydown 事件匹配参数
 * @param {string} shortcut - e.g. "Ctrl+Shift+O"
 * @returns {{ ctrl: boolean, shift: boolean, alt: boolean, key: string } | null}
 */
function parseShortcut(shortcut) {
  if (!shortcut) return null;
  var parts = shortcut.split('+');
  var result = { ctrl: false, shift: false, alt: false, key: '' };
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i].trim();
    if (p === 'Ctrl' || p === 'Control' || p === 'CommandOrControl') result.ctrl = true;
    else if (p === 'Shift') result.shift = true;
    else if (p === 'Alt') result.alt = true;
    else result.key = p;
  }
  return result;
}

/**
 * 加载快捷键配置
 * @param {string} userDataPath
 * @returns {object}
 */
function loadKeybindings(userDataPath) {
  var filePath = path.join(userDataPath, KEYBINDINGS_FILE);
  try {
    if (fs.existsSync(filePath)) {
      var stored = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (stored && stored.bindings) {
        // 合并默认值（补充新增的快捷键）
        var defaults = getDefaultBindings().bindings;
        for (var key in defaults) {
          if (!(key in stored.bindings)) {
            stored.bindings[key] = defaults[key];
          }
        }
        return stored;
      }
    }
  } catch (_) { /* ignore */ }
  return getDefaultBindings();
}

/**
 * 保存快捷键配置
 * @param {string} userDataPath
 * @param {object} bindings - 完整快捷键映射对象
 */
function saveKeybindings(userDataPath, bindings) {
  var filePath = path.join(userDataPath, KEYBINDINGS_FILE);
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify({ version: 1, bindings: bindings }, null, 2), 'utf-8');
}

module.exports = { loadKeybindings, saveKeybindings, getDefaultBindings, parseShortcut };
