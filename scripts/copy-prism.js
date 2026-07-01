/**
 * @file         scripts/copy-prism.js
 * @description  从 node_modules/prismjs 复制 core + 语言组件 + 主题到项目目录
 * @author       tianxj22
 * @created      2026-07-01
 * @updated      2026-07-01
 * @version      1.0.0
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PRISM_SRC = path.join(ROOT, 'node_modules', 'prismjs');
const JS_DEST = path.join(ROOT, 'js', 'prism');
const CSS_DEST = path.join(ROOT, 'css');

// 支持的语言列表
const LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'markup',   // HTML + XML + SVG
  'css',
  'json',
  'bash',
  'sql',
];

// 确保目标目录存在
if (!fs.existsSync(JS_DEST)) {
  fs.mkdirSync(JS_DEST, { recursive: true });
}

// 1. 复制 Prism core
var coreSrc = path.join(PRISM_SRC, 'prism.js');
var coreDest = path.join(JS_DEST, 'prism-core.js');
fs.copyFileSync(coreSrc, coreDest);
console.log('✓ Copied prism-core.js');

// 2. 复制语言组件
LANGUAGES.forEach(function (lang) {
  var langFile = 'prism-' + lang + '.min.js';
  var src = path.join(PRISM_SRC, 'components', langFile);
  if (fs.existsSync(src)) {
    var dest = path.join(JS_DEST, 'prism-' + lang + '.js');
    fs.copyFileSync(src, dest);
    console.log('✓ Copied prism-' + lang + '.js');
  } else {
    // 尝试非 min 版本
    var nonMinFile = 'prism-' + lang + '.js';
    var nonMinSrc = path.join(PRISM_SRC, 'components', nonMinFile);
    if (fs.existsSync(nonMinSrc)) {
      var nonMinDest = path.join(JS_DEST, 'prism-' + lang + '.js');
      fs.copyFileSync(nonMinSrc, nonMinDest);
      console.log('✓ Copied prism-' + lang + '.js (non-min)');
    } else {
      console.error('✗ Language file not found: ' + langFile);
    }
  }
});

// 3. 复制主题 CSS（使用 Tomorrow Night 暗色主题）
var themeSrc = path.join(PRISM_SRC, 'themes', 'prism-tomorrow.css');
var themeDest = path.join(CSS_DEST, 'prism.css');
if (fs.existsSync(themeSrc)) {
  fs.copyFileSync(themeSrc, themeDest);
  console.log('✓ Copied prism.css (Tomorrow Night theme)');
} else {
  // fallback to default
  var defaultSrc = path.join(PRISM_SRC, 'themes', 'prism.css');
  fs.copyFileSync(defaultSrc, themeDest);
  console.log('✓ Copied prism.css (default theme, fallback)');
}

console.log('\nPrism assets copy complete.');
