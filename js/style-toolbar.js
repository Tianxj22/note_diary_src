// ============================================================
// style-toolbar.js — 样式执行 + 工具栏状态同步 + 格式刷
// 依赖：ND.btnBold, ND.btnItalic, ND.btnUnderline, ND.btnFontFamily,
//       ND.btnFontSize, ND.btnAlignLeft, ND.btnAlignCenter, ND.btnAlignRight,
//       ND.btnForecolor, ND.btnHilitecolor, ND.swatchForecolor,
//       ND.swatchHilitecolor, ND.btnFormatPainter,
//       ND.editorDiv, ND.formatPainterActive, ND.savedFormat
// ============================================================

/**
 * 确保编辑器获得焦点后执行命令
 * @param {string} command - execCommand 命令名
 * @param {string} [value] - 可选参数值
 */
function execStyleCommand(command, value) {
  if (ND.editorDiv) {
    ND.editorDiv.focus();
    document.execCommand(command, false, value);
    updateStyleToolbar();
  }
}

/**
 * 将 rgb(r,g,b) 颜色转为 hex #rrggbb
 * @param {string} rgb - RGB 格式颜色字符串
 * @returns {string|null} hex 颜色或 null
 */
function rgbToHex(rgb) {
  if (!rgb || rgb === 'transparent' || rgb === 'rgba(0,0,0,0)') return null;
  const m = rgb.match(/\d+/g);
  if (!m) return null;
  return '#' + m.slice(0, 3).map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
}

/**
 * 检测当前段落对齐方式并更新按钮 active 态
 */
function updateAlignButtons() {
  if (!ND.editorDiv) return;
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  let node = sel.anchorNode;
  while (node && node !== ND.editorDiv) {
    if (node.nodeType === 1) {
      const ta = window.getComputedStyle(node).textAlign;
      if (ta && ta !== 'start' && ta !== 'justify') {
        ND.btnAlignLeft.classList.toggle('active', ta === 'left');
        ND.btnAlignCenter.classList.toggle('active', ta === 'center');
        ND.btnAlignRight.classList.toggle('active', ta === 'right');
        return;
      }
    }
    node = node.parentNode;
  }
  // 默认左对齐
  ND.btnAlignLeft.classList.toggle('active', true);
  ND.btnAlignCenter.classList.toggle('active', false);
  ND.btnAlignRight.classList.toggle('active', false);
}

/**
 * 根据当前选区/光标位置更新样式工具栏所有按钮状态
 */
function updateStyleToolbar() {
  if (!ND.editorDiv) return;
  const hasFocus = document.activeElement === ND.editorDiv || ND.editorDiv.contains(document.activeElement);
  if (!hasFocus && !ND.formatPainterActive) return;

  // Toggle 按钮
  ND.btnBold.classList.toggle('active', document.queryCommandState('bold'));
  ND.btnItalic.classList.toggle('active', document.queryCommandState('italic'));
  ND.btnUnderline.classList.toggle('active', document.queryCommandState('underline'));

  // 字体下拉同步
  const font = document.queryCommandValue('fontName');
  ND.btnFontFamily.value = font || '';

  // 字号下拉同步
  const size = document.queryCommandValue('fontSize');
  ND.btnFontSize.value = size || '';

  // 颜色色块同步
  const fore = rgbToHex(document.queryCommandValue('foreColor'));
  if (fore) {
    ND.btnForecolor.value = fore;
    ND.swatchForecolor.style.background = fore;
  }
  const hilite = rgbToHex(document.queryCommandValue('hiliteColor'));
  if (hilite) {
    ND.btnHilitecolor.value = hilite;
    ND.swatchHilitecolor.style.background = hilite;
  } else {
    ND.swatchHilitecolor.style.background = '#ff0';
    ND.btnHilitecolor.value = '#ffff00';
  }

  // 对齐按钮
  updateAlignButtons();
}

// ---- 样式按钮事件绑定 ----

// 加粗
ND.btnBold.addEventListener('click', () => { execStyleCommand('bold'); });

// 倾斜
ND.btnItalic.addEventListener('click', () => { execStyleCommand('italic'); });

// 下划线
ND.btnUnderline.addEventListener('click', () => { execStyleCommand('underline'); });

// 字体选择
ND.btnFontFamily.addEventListener('change', (e) => {
  if (e.target.value) {
    execStyleCommand('fontName', e.target.value);
  }
});

// 字号选择
ND.btnFontSize.addEventListener('change', (e) => {
  if (e.target.value) {
    execStyleCommand('fontSize', e.target.value);
  }
});

// 左对齐
ND.btnAlignLeft.addEventListener('click', () => { execStyleCommand('justifyLeft'); });

// 居中对齐
ND.btnAlignCenter.addEventListener('click', () => { execStyleCommand('justifyCenter'); });

// 右对齐
ND.btnAlignRight.addEventListener('click', () => { execStyleCommand('justifyRight'); });

// 字体颜色
ND.btnForecolor.addEventListener('input', (e) => {
  if (ND.editorDiv) {
    ND.editorDiv.focus();
    document.execCommand('foreColor', false, e.target.value);
    ND.swatchForecolor.style.background = e.target.value;
  }
});

// 字体底色
ND.btnHilitecolor.addEventListener('input', (e) => {
  if (ND.editorDiv) {
    ND.editorDiv.focus();
    document.execCommand('hiliteColor', false, e.target.value);
    ND.swatchHilitecolor.style.background = e.target.value;
  }
});

// ---- 格式刷 ----
function activateFormatPainter() {
  if (!ND.editorDiv) return;
  ND.editorDiv.focus();
  ND.savedFormat = {
    bold: document.queryCommandState('bold'),
    italic: document.queryCommandState('italic'),
    underline: document.queryCommandState('underline'),
    fontName: document.queryCommandValue('fontName'),
    fontSize: document.queryCommandValue('fontSize'),
    foreColor: document.queryCommandValue('foreColor'),
    hiliteColor: document.queryCommandValue('hiliteColor'),
  };
  ND.formatPainterActive = true;
  ND.btnFormatPainter.classList.add('active');
  ND.editorDiv.style.cursor = 'copy';
}

function applyFormatPainter() {
  if (!ND.formatPainterActive || !ND.savedFormat) return;
  if (ND.savedFormat.bold) document.execCommand('bold');
  if (ND.savedFormat.italic) document.execCommand('italic');
  if (ND.savedFormat.underline) document.execCommand('underline');
  if (ND.savedFormat.fontName) document.execCommand('fontName', false, ND.savedFormat.fontName);
  if (ND.savedFormat.fontSize) document.execCommand('fontSize', false, ND.savedFormat.fontSize);
  if (ND.savedFormat.foreColor && ND.savedFormat.foreColor !== 'rgb(0, 0, 0)' && ND.savedFormat.foreColor !== 'rgb(0,0,0)') {
    document.execCommand('foreColor', false, ND.savedFormat.foreColor);
  }
  if (ND.savedFormat.hiliteColor && ND.savedFormat.hiliteColor !== 'transparent' && ND.savedFormat.hiliteColor !== 'rgb(255, 255, 255)' && ND.savedFormat.hiliteColor !== 'rgb(255,255,255)') {
    document.execCommand('hiliteColor', false, ND.savedFormat.hiliteColor);
  }
  deactivateFormatPainter();
  updateStyleToolbar();
}

function deactivateFormatPainter() {
  ND.formatPainterActive = false;
  ND.savedFormat = null;
  ND.btnFormatPainter.classList.remove('active');
  if (ND.editorDiv) ND.editorDiv.style.cursor = '';
}

ND.btnFormatPainter.addEventListener('click', () => {
  if (ND.formatPainterActive) {
    deactivateFormatPainter();
  } else {
    activateFormatPainter();
  }
});
