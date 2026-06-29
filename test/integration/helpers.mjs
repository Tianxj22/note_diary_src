/**
 * @file         helpers.mjs
 * @description  Integration test shared infrastructure — DOM, ND namespace, mock electronAPI, core functions
 * @author       tianxj22
 * @created      2026-06-28
 * @version      1.0.0
 */

import { JSDOM } from 'jsdom';

// ---- Test image data ----
export const RED_DOT_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

// ---- DOM construction ----
export function buildDOM() {
  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Note Diary</title></head><body>
<div id="sidebar">
  <div class="sidebar-tabs">
    <button id="tab-workspace" class="sidebar-tab active">工作区</button>
    <button id="tab-trash" class="sidebar-tab">回收站</button>
  </div>
  <div class="sidebar-header">
    <button id="btn-sidebar-new" title="新建笔记">+ 新建笔记</button>
    <select id="sort-by"><option value="mtime">修改时间</option><option value="name">名称</option><option value="ctime">创建时间</option></select>
    <button id="sort-asc" title="升序">↑</button><button id="sort-desc" class="active" title="降序">↓</button>
  </div>
  <div class="note-list" id="note-list"><div class="empty">暂无笔记</div></div>
  <div class="trash-actions" style="display:none">
    <button id="btn-empty-trash">清空回收站</button>
  </div>
</div>
<div id="main-container">
  <div class="toolbar-tabs">
    <button class="toolbar-tab active" data-tab="file">文件</button>
    <button class="toolbar-tab" data-tab="style">样式</button>
    <button class="toolbar-tab" data-tab="insert">插入</button>
    <button class="toolbar-tab" data-tab="draw">绘图</button>
    <button class="toolbar-tab" id="tab-image-edit" data-tab="image-edit" style="display:none">图片编辑</button>
  </div>
  <div class="toolbar-panels">
    <div id="toolbar-file" class="toolbar-panel">
      <button id="btn-new" title="新建笔记">📄</button>
      <button id="btn-open" title="导入">📂</button>
      <button id="btn-undo" title="撤销" disabled>↩</button>
      <button id="btn-redo" title="重做" disabled>↪</button>
      <button id="btn-save" title="保存">💾</button>
    </div>
    <div id="toolbar-style" class="toolbar-panel" style="display:none">
      <button id="btn-bold" title="加粗"><b>B</b></button>
      <button id="btn-italic" title="倾斜"><i>I</i></button>
      <button id="btn-underline" title="下划线"><u>U</u></button>
      <select id="btn-font-family">
        <option value="">字体</option>
        <option value="Arial">Arial</option>
        <option value="KaiTi">楷体</option>
        <option value="SimSun">宋体</option>
      </select>
      <select id="btn-font-size">
        <option value="">字号</option>
        <option value="1">1</option><option value="3">3</option><option value="5">5</option><option value="7">7</option>
      </select>
      <button id="btn-align-left" title="左对齐">⫷</button>
      <button id="btn-align-center" title="居中">≣</button>
      <button id="btn-align-right" title="右对齐">⫸</button>
      <input type="color" id="btn-forecolor" value="#000000"><span id="swatch-forecolor"></span>
      <input type="color" id="btn-hilitecolor" value="#ffff00"><span id="swatch-hilitecolor"></span>
      <button id="btn-format-painter" title="格式刷">🖌</button>
    </div>
    <div id="toolbar-insert" class="toolbar-panel" style="display:none">
      <button id="btn-checklist" title="清单">☐</button>
      <button id="btn-timestamp" title="时间戳">🕐</button>
      <button id="btn-insert-image" title="插入图片">🖼</button>
      <div id="dropdown-image-menu" class="dropdown-menu">
        <div class="menu-item" data-method="file">从文件插入</div>
        <div class="menu-divider"></div>
        <div class="menu-item" data-method="clipboard">从剪贴板粘贴</div>
        <div class="menu-item" data-method="fullscreen">全屏截图</div>
        <div class="menu-item" data-method="area">框选截图</div>
        <div class="menu-item" data-method="window">窗口截图</div>
      </div>
    </div>
    <div id="toolbar-draw" class="toolbar-panel" style="display:none">
      <button class="draw-tool-btn active" id="btn-tool-pencil" data-tool="pencil" title="铅笔">✏</button>
      <button class="draw-tool-btn" id="btn-tool-brush" data-tool="brush" title="画笔">🖌</button>
      <button class="draw-tool-btn" id="btn-tool-eraser" data-tool="eraser" title="橡皮">◻</button>
      <select id="btn-brush-size"><option value="2">2px</option><option value="6" selected>6px</option><option value="12">12px</option></select>
      <select id="btn-eraser-size"><option value="10">10px</option><option value="20" selected>20px</option><option value="40">40px</option></select>
      <button class="draw-tool-btn" id="btn-tool-fill" data-tool="fill" title="颜料桶">🪣</button>
      <button class="draw-tool-btn" id="btn-tool-picker" data-tool="picker" title="取色器">💉</button>
      <button class="draw-tool-btn" id="btn-tool-select" data-tool="select-rect" title="选区">⬜</button>
      <div id="dropdown-select-menu" class="dropdown-menu">
        <div class="menu-item" data-tool="select-rect">矩形选框</div>
        <div class="menu-item" data-tool="select-lasso">套索</div>
        <div class="menu-item" data-tool="select-wand">魔术棒</div>
      </div>
      <button class="draw-tool-btn" id="btn-tool-shape" data-tool="shape-rect" title="形状">⬛</button>
      <div id="dropdown-shape-menu" class="dropdown-menu">
        <div class="menu-item" data-tool="shape-rect">矩形</div>
        <div class="menu-item" data-tool="shape-ellipse">圆形</div>
        <div class="menu-item" data-tool="shape-line">直线</div>
        <div class="menu-item" data-tool="shape-roundrect">圆角矩形</div>
      </div>
      <input type="color" id="btn-primary-color" value="#000000"><span id="swatch-primary"></span>
      <input type="color" id="btn-secondary-color" value="#ffffff"><span id="swatch-secondary"></span>
      <button id="btn-color-swap" title="交换颜色">⇄</button>
    </div>
    <div id="toolbar-image-edit" class="toolbar-panel" style="display:none">
      <input type="number" id="img-width" value="" placeholder="宽">
      <input type="number" id="img-height" value="" placeholder="高">
      <button id="btn-lock-ratio" title="锁定宽高比">🔗</button>
      <button id="btn-crop-image" title="裁剪">✂</button>
      <button id="btn-restore-image" title="恢复原图" style="display:none">↩</button>
    </div>
  </div>
  <div class="main-area">
    <div id="editor-area" class="editor-area">
      <div class="no-note">选择或新建一篇笔记开始编辑</div>
    </div>
  </div>
  <div class="crop-overlay" id="crop-overlay" style="display:none">
    <div class="crop-workspace">
      <canvas id="crop-canvas" width="800" height="600"></canvas>
      <div id="crop-rect"></div>
    </div>
    <div class="crop-actions">
      <button id="btn-crop-confirm">确认</button>
      <button id="btn-crop-cancel">取消</button>
    </div>
  </div>
  <div id="image-resize-container" class="image-resize-container"></div>
</div>
<div id="status-bar">
  <span id="status-left">就绪</span>
  <span id="zoom-controls">
    <button id="btn-zoom-out">−</button>
    <span id="zoom-label">100%</span>
    <button id="btn-zoom-in">+</button>
  </span>
</div>
<div id="context-menu" class="context-menu">
  <div class="menu-item" data-action="rename">重命名</div>
  <div class="menu-item" data-action="duplicate">复制</div>
  <div class="menu-item" data-action="cut">剪切</div>
  <div class="menu-item" data-action="delete">删除</div>
</div>
<div id="context-menu-empty" class="context-menu">
  <div class="menu-item" data-action="new">新建笔记</div>
  <div class="menu-item" data-action="import">导入笔记</div>
</div>
<div id="context-menu-trash" class="context-menu">
  <div class="menu-item" data-action="restore">恢复</div>
  <div class="menu-item" data-action="delete-permanent">永久删除</div>
</div>
<div id="window-picker-overlay" class="window-picker-overlay" style="display:none">
  <div class="window-picker-dialog">
    <button id="window-picker-close">×</button>
    <div class="window-picker-list"></div>
  </div>
</div>
<input type="file" id="import-file-input" style="display:none">
</body></html>`;

  const dom = new JSDOM(html, { url: 'http://localhost' });
  const doc = dom.window.document;
  const win = dom.window;

  // Mock getBoundingClientRect on key elements
  const editorArea = doc.getElementById('editor-area');
  editorArea.getBoundingClientRect = () => ({ left: 0, top: 80, width: 800, height: 600, right: 800, bottom: 680 });

  return { dom, doc, win };
}

// ---- ND namespace factory ----
export function createND(doc) {
  const ND = {};

  // Core state
  ND.notes = [];
  ND.currentNote = null;
  ND.currentContent = '';
  ND.saveTimer = null;
  ND.lastSavedContent = '';

  // DOM refs
  ND.noteListEl = doc.getElementById('note-list');
  ND.editorArea = doc.getElementById('editor-area');
  ND.btnUndo = doc.getElementById('btn-undo');
  ND.btnRedo = doc.getElementById('btn-redo');
  ND.statusLeft = doc.getElementById('status-left');
  ND.editorDiv = null;
  ND.editorTitleInput = null;

  // Sort/view state
  ND.activeView = 'workspace';
  ND.sortBy = 'mtime';
  ND.sortDir = 'desc';

  // Style toolbar DOM
  ND.btnBold = doc.getElementById('btn-bold');
  ND.btnItalic = doc.getElementById('btn-italic');
  ND.btnUnderline = doc.getElementById('btn-underline');
  ND.btnFontFamily = doc.getElementById('btn-font-family');
  ND.btnFontSize = doc.getElementById('btn-font-size');
  ND.btnAlignLeft = doc.getElementById('btn-align-left');
  ND.btnAlignCenter = doc.getElementById('btn-align-center');
  ND.btnAlignRight = doc.getElementById('btn-align-right');
  ND.btnForecolor = doc.getElementById('btn-forecolor');
  ND.btnHilitecolor = doc.getElementById('btn-hilitecolor');
  ND.swatchForecolor = doc.getElementById('swatch-forecolor');
  ND.swatchHilitecolor = doc.getElementById('swatch-hilitecolor');
  ND.btnFormatPainter = doc.getElementById('btn-format-painter');

  // Format painter
  ND.formatPainterActive = false;
  ND.savedFormat = null;

  // Image resize state
  ND.selectedImage = null;
  ND.resizeHandles = [];
  ND.isDragging = false;
  ND.dragState = null;

  // Context menus
  ND.contextMenu = doc.getElementById('context-menu');
  ND.contextMenuEmpty = doc.getElementById('context-menu-empty');
  ND.contextMenuTrash = doc.getElementById('context-menu-trash');
  ND.importFileInput = doc.getElementById('import-file-input');
  ND.contextNote = null;
  ND.dropdownImageMenu = doc.getElementById('dropdown-image-menu');

  // Image edit tab
  ND.previousToolbarTab = 'file';
  ND.imageEditAspectRatio = null;
  ND.cropState = null;
  ND.cropOverlayActive = false;

  ND.toolbarTabImage = doc.getElementById('tab-image-edit');
  ND.toolbarImageEdit = doc.getElementById('toolbar-image-edit');
  ND.imgWidthInput = doc.getElementById('img-width');
  ND.imgHeightInput = doc.getElementById('img-height');
  ND.btnLockRatio = doc.getElementById('btn-lock-ratio');
  ND.btnCropImage = doc.getElementById('btn-crop-image');
  ND.cropOverlay = doc.getElementById('crop-overlay');
  ND.cropCanvas = doc.getElementById('crop-canvas');
  ND.cropRect = doc.getElementById('crop-rect');
  ND.btnCropConfirm = doc.getElementById('btn-crop-confirm');
  ND.btnCropCancel = doc.getElementById('btn-crop-cancel');
  ND.btnRestoreImage = doc.getElementById('btn-restore-image');

  // Drawing state
  ND.drawingActive = false;
  ND.drawCanvas = null;
  ND.drawCtx = null;
  ND.currentTool = 'pencil';
  ND.primaryColor = '#000000';
  ND.secondaryColor = '#ffffff';
  ND.brushSize = 6;
  ND.eraserSize = 20;
  ND.isDrawing = false;
  ND.drawStartX = 0;
  ND.drawStartY = 0;
  ND.drawingSnapshots = [];
  ND.drawingSnapshotIndex = -1;
  ND.shapeFill = true;
  ND.shapeStroke = true;
  ND.drawingPreviousTab = 'file';
  ND.zoomLevel = 1;
  ND.previewSnapshot = null;
  ND.drawingCanvasData = null;
  ND.editorScroll = null;

  // Drawing DOM
  ND.toolButtons = null;
  ND.swatchPrimary = doc.getElementById('swatch-primary');
  ND.swatchSecondary = doc.getElementById('swatch-secondary');
  ND.btnPrimaryColor = doc.getElementById('btn-primary-color');
  ND.btnSecondaryColor = doc.getElementById('btn-secondary-color');
  ND.btnBrushSize = doc.getElementById('btn-brush-size');
  ND.btnEraserSize = doc.getElementById('btn-eraser-size');
  ND.btnShapeMenu = doc.getElementById('dropdown-shape-menu');
  ND.btnSelectMenu = doc.getElementById('dropdown-select-menu');
  ND.zoomLabel = doc.getElementById('zoom-label');

  // Selection
  ND.selectionMask = null;
  ND.selectionBounds = null;
  ND.selectionMode = 'idle';
  ND.lassoPoints = [];

  // switchToolbarTab (needed by toggleDrawingMode, selectImage, etc.)
  ND.switchToolbarTab = function (tabName) {
    const tabs = doc.querySelectorAll('.toolbar-tab');
    tabs.forEach(t => t.classList.remove('active'));
    const target = doc.querySelector(`.toolbar-tab[data-tab="${tabName}"]`);
    if (target) target.classList.add('active');

    const panels = doc.querySelectorAll('.toolbar-panel');
    panels.forEach(p => p.style.display = 'none');
    const panel = doc.getElementById(`toolbar-${tabName}`);
    if (panel) panel.style.display = '';
  };

  // Mock canvas context
  ND._mockCtx = null;

  return ND;
}

// ---- Mock electronAPI ----
export function createMockAPI() {
  const files = new Map(); // filePath -> content
  const trashMeta = new Map(); // fileName -> { originalPath, deletedAt }
  const clipboard = new Map();
  let nameStack = { availableStack: [], maxNumber: 0 };
  let noteCounter = 0;

  function getDefaultName() {
    if (nameStack.availableStack.length > 0) {
      const num = nameStack.availableStack.pop();
      return { title: num === 1 ? '新建笔记本' : `新建笔记本 (${num})`, number: num };
    }
    nameStack.maxNumber++;
    const n = nameStack.maxNumber;
    return { title: n === 1 ? '新建笔记本' : `新建笔记本 (${n})`, number: n };
  }

  return {
    // Note CRUD
    createNote: async (title) => {
      noteCounter++;
      const ts = Date.now() + noteCounter;
      const fileName = `${title}_${ts}.txt`;
      const filePath = `/notes/${fileName}`;
      files.set(filePath, '');
      return { filePath, fileName, displayName: title, mtime: ts };
    },
    readNote: async (filePath) => {
      return files.get(filePath) || '';
    },
    saveNote: async (filePath, content) => {
      files.set(filePath, content);
      return true;
    },
    listNotes: async (notesDir, opts) => {
      const results = [];
      for (const [fp, content] of files) {
        if (fp.includes('.trash') || fp.includes('.clipboard')) continue;
        const fn = fp.split('/').pop();
        if (!fn || !fn.endsWith('.txt')) continue;
        results.push({
          fileName: fn,
          filePath: fp,
          displayName: fn.replace(/_\d+\.txt$/, ''),
          mtime: Date.now() - results.length * 1000,
        });
      }
      // Sort
      if (opts && opts.sortBy === 'name') {
        results.sort((a, b) => opts.sortDir === 'asc'
          ? a.displayName.localeCompare(b.displayName)
          : b.displayName.localeCompare(a.displayName));
      } else {
        results.sort((a, b) => opts.sortDir === 'asc'
          ? a.mtime - b.mtime
          : b.mtime - a.mtime);
      }
      return results;
    },
    renameNote: async (filePath, newTitle) => {
      const content = files.get(filePath) || '';
      files.delete(filePath);
      noteCounter++;
      const ts = Date.now() + noteCounter;
      const fileName = `${newTitle}_${ts}.txt`;
      const newPath = `/notes/${fileName}`;
      files.set(newPath, content);
      return { filePath: newPath, fileName, displayName: newTitle };
    },
    duplicateNote: async (filePath) => {
      const content = files.get(filePath) || '';
      const fn = filePath.split('/').pop().replace('.txt', '');
      noteCounter++;
      const ts = Date.now() + noteCounter;
      const fileName = `${fn} - 副本_${ts}.txt`;
      const newPath = `/notes/${fileName}`;
      files.set(newPath, content);
      return { filePath: newPath, fileName, displayName: fn + ' - 副本' };
    },
    cutNote: async (notesDir, filePath) => {
      const content = files.get(filePath) || '';
      const fn = filePath.split('/').pop();
      files.delete(filePath);
      const clipPath = `/notes/.clipboard/${fn}`;
      clipboard.set(clipPath, content);
      return { filePath: clipPath, fileName: fn };
    },
    deleteNote: async (filePath) => {
      return files.delete(filePath);
    },

    // Name stack
    getNextDefaultName: async () => getDefaultName(),
    releaseNameNumber: async (num) => {
      if (num > 0 && !nameStack.availableStack.includes(num)) {
        nameStack.availableStack.push(num);
        nameStack.availableStack.sort((a, b) => b - a); // descending for pop
      }
    },

    // Trash
    moveToTrash: async (notesDir, filePath) => {
      const content = files.get(filePath) || '';
      const fn = filePath.split('/').pop();
      files.delete(filePath);
      const trashPath = `/notes/.trash/${fn}`;
      files.set(trashPath, content);
      trashMeta.set(fn, { originalPath: filePath, deletedAt: Date.now() });
      return true;
    },
    listTrash: async () => {
      const results = [];
      for (const [fn, meta] of trashMeta) {
        results.push({
          fileName: fn,
          displayName: fn.replace(/_\d+\.txt$/, ''),
          deletedAt: meta.deletedAt,
          originalPath: meta.originalPath,
        });
      }
      return results;
    },
    restoreFromTrash: async (fileName) => {
      const meta = trashMeta.get(fileName);
      if (!meta) return null;
      const trashPath = `/notes/.trash/${fileName}`;
      const content = files.get(trashPath) || '';
      files.delete(trashPath);
      files.set(meta.originalPath, content);
      trashMeta.delete(fileName);
      return { filePath: meta.originalPath, fileName };
    },
    permanentlyDelete: async (fileName) => {
      const trashPath = `/notes/.trash/${fileName}`;
      files.delete(trashPath);
      trashMeta.delete(fileName);
      return true;
    },
    emptyTrash: async () => {
      for (const fn of trashMeta.keys()) {
        files.delete(`/notes/.trash/${fn}`);
      }
      trashMeta.clear();
    },

    // Image operations (mock)
    openImageFile: async () => RED_DOT_PNG,
    readClipboardImage: async () => null,
    captureFullscreen: async () => RED_DOT_PNG,
    captureArea: async () => RED_DOT_PNG,
    listWindows: async () => [],
    captureWindowById: async () => RED_DOT_PNG,

    // Direct file access for test verification
    _getFile: (filePath) => files.get(filePath),
    _setFile: (filePath, content) => files.set(filePath, content),
    _hasFile: (filePath) => files.has(filePath),
    _allFiles: () => new Map(files),
    _reset: () => {
      files.clear();
      trashMeta.clear();
      clipboard.clear();
      nameStack = { availableStack: [], maxNumber: 0 };
      noteCounter = 0;
    },
  };
}

// ---- Core functions replicated from source ----

// --- editor-core: encode/decode ---
const DRAWING_SEP = '\n---DRAWING---\n';
const TEXT_SEP = '\n---TEXT---\n';

export function encodeNoteContent(textHtml, drawingDataUrl) {
  const d = drawingDataUrl || '';
  const t = textHtml || '';
  return DRAWING_SEP.trim() + '\n' + d + '\n' + TEXT_SEP.trim() + '\n' + t;
}

export function decodeNoteContent(raw) {
  const dIdx = raw.indexOf(DRAWING_SEP.trim());
  const tIdx = raw.indexOf(TEXT_SEP.trim());
  if (dIdx === -1 || tIdx === -1) {
    return { drawing: null, text: raw };
  }
  const drawing = raw.substring(dIdx + DRAWING_SEP.trim().length + 1, tIdx).trim();
  const text = raw.substring(tIdx + TEXT_SEP.trim().length + 1);
  return { drawing: drawing || null, text: text };
}

// --- editor-core: showEditor / hideEditor ---
export function showEditor(doc, ND) {
  const area = ND.editorArea;
  area.innerHTML = '';

  // Close button
  const closeBtn = doc.createElement('button');
  closeBtn.className = 'btn-close-note';
  closeBtn.textContent = '×';
  closeBtn.title = '关闭当前笔记';
  area.appendChild(closeBtn);

  // Title input
  ND.editorTitleInput = doc.createElement('input');
  ND.editorTitleInput.type = 'text';
  ND.editorTitleInput.className = 'editor-title-input';
  ND.editorTitleInput.placeholder = '笔记标题...';
  area.appendChild(ND.editorTitleInput);

  // Scroll container
  const scrollDiv = doc.createElement('div');
  scrollDiv.className = 'editor-scroll';
  ND.editorScroll = scrollDiv;

  // Text layer
  ND.editorDiv = doc.createElement('div');
  ND.editorDiv.className = 'editor-content';
  ND.editorDiv.contentEditable = 'true';
  scrollDiv.appendChild(ND.editorDiv);

  // Drawing canvas
  const canvas = doc.createElement('canvas');
  canvas.id = 'draw-canvas';
  canvas.width = 800;
  canvas.height = 600;
  ND.drawCanvas = canvas;
  ND.drawCtx = canvas.getContext('2d');
  scrollDiv.appendChild(canvas);

  // Selection overlay
  const selOverlay = doc.createElement('div');
  selOverlay.id = 'selection-overlay';
  scrollDiv.appendChild(selOverlay);

  area.appendChild(scrollDiv);

  // Image resize container
  const resizeCtn = doc.createElement('div');
  resizeCtn.className = 'image-resize-container';
  resizeCtn.id = 'image-resize-container';
  area.appendChild(resizeCtn);

  // Track the active editable for execCommand mock
  _activeEditable = ND.editorDiv;
}

export function hideEditor(ND) {
  if (ND.editorArea) {
    ND.editorArea.innerHTML = '<div class="no-note">选择或新建一篇笔记开始编辑</div>';
  }
  ND.editorDiv = null;
  ND.editorTitleInput = null;
  ND.selectedImage = null;
  ND.resizeHandles = [];
  ND.drawCanvas = null;
  ND.drawCtx = null;
  ND.editorScroll = null;
}

export function saveDrawCanvasData(ND) {
  if (ND.drawCanvas && ND.drawCtx) {
    ND.drawingCanvasData = ND.drawCanvas.toDataURL('image/png');
  }
}

// --- editor-events: execInsertHTML / execDeleteElement ---
export function execInsertHTML(doc, ND, html) {
  if (!ND.editorDiv) return;
  ND.editorDiv.focus();
  doc.execCommand('insertHTML', false, html);
}

export function execDeleteElement(doc, ND, el) {
  if (!ND.editorDiv || !el) return;
  ND.editorDiv.focus();
  const sel = doc.defaultView.getSelection();
  const range = doc.createRange();
  range.selectNode(el);
  sel.removeAllRanges();
  sel.addRange(range);
  doc.execCommand('delete');
}

// --- editor-events: getCurrentLineMarker ---
export function getCurrentLineMarker(doc, ND) {
  if (!ND.editorDiv) return null;
  const sel = doc.defaultView.getSelection();
  if (!sel.rangeCount) return null;
  const range = sel.getRangeAt(0);

  let node = range.startContainer;
  let container = ND.editorDiv;

  while (node && node !== ND.editorDiv) {
    if (node.nodeType === 1) {
      const tag = node.tagName.toLowerCase();
      if (tag === 'div' || tag === 'p' || tag === 'li') { container = node; break; }
    }
    node = node.parentNode;
  }

  node = range.startContainer;
  while (node.parentNode && node.parentNode !== container) {
    node = node.parentNode;
  }

  let current = node;
  while (current) {
    if (current.nodeType === 1) {
      const tag = current.tagName.toLowerCase();
      if (tag === 'br' || tag === 'div' || tag === 'p' || tag === 'li') return null;
      if (current.classList) {
        if (current.classList.contains('check-box')) return { type: 'checklist', el: current };
        if (current.classList.contains('log-stamp')) return { type: 'log', el: current };
      }
      const cb = current.querySelector('.check-box');
      if (cb) return { type: 'checklist', el: cb };
      const log = current.querySelector('.log-stamp');
      if (log) return { type: 'log', el: log };
    }
    current = current.previousSibling;
  }
  return null;
}

export function isCurrentLineEmpty(doc, ND) {
  const marker = getCurrentLineMarker(doc, ND);
  if (!marker) return true;
  let node = marker.el.nextSibling;
  let text = '';
  while (node) {
    if (node.nodeType === 1) {
      const tag = node.tagName.toLowerCase();
      if (tag === 'br' || tag === 'div' || tag === 'p' || tag === 'li') break;
      if (!node.classList || (!node.classList.contains('check-box') && !node.classList.contains('log-stamp'))) {
        text += node.textContent || '';
      }
    } else if (node.nodeType === 3) {
      text += node.textContent;
    }
    node = node.nextSibling;
  }
  return text.trim() === '';
}

// --- editor-markers: toggleLineStrikethrough ---
export function toggleLineStrikethrough(doc, checkboxEl, isChecked) {
  if (isChecked) {
    let node = checkboxEl.nextSibling;
    const lineNodes = [];
    while (node) {
      if (node.nodeType === 1) {
        const tag = node.tagName.toLowerCase();
        if (tag === 'br' || tag === 'div' || tag === 'p' || tag === 'li') break;
      }
      lineNodes.push(node);
      node = node.nextSibling;
    }
    if (lineNodes.length > 0) {
      const wrapper = doc.createElement('span');
      wrapper.className = 'checklist-checked';
      lineNodes[0].parentNode.insertBefore(wrapper, lineNodes[0]);
      for (const n of lineNodes) wrapper.appendChild(n);
    }
  } else {
    let wrapper = checkboxEl.nextSibling;
    while (wrapper && wrapper.nodeType === 3 && wrapper.textContent.trim() === '') {
      wrapper = wrapper.nextSibling;
    }
    if (wrapper && wrapper.nodeType === 1 && wrapper.classList.contains('checklist-checked')) {
      while (wrapper.firstChild) {
        wrapper.parentNode.insertBefore(wrapper.firstChild, wrapper);
      }
      wrapper.remove();
    }
  }
}

export function createCheckboxElement(doc) {
  const cb = doc.createElement('span');
  cb.className = 'check-box';
  cb.contentEditable = 'false';
  cb.textContent = '☐';
  cb.title = '点击切换完成状态';
  return cb;
}

export function createTimestampElement(doc) {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const span = doc.createElement('span');
  span.className = 'log-stamp';
  span.contentEditable = 'false';
  span.textContent = ts;
  return span;
}

// --- image-resize: select/deselect ---
export function selectImage(doc, ND, img) {
  if (ND.selectedImage === img) return;
  deselectImage(doc, ND);
  ND.selectedImage = img;
  img.classList.add('selected');
  createResizeHandles(doc, ND);
  updateHandlePositions(doc, ND);
  // Show image-edit tab
  const active = doc.querySelector('.toolbar-tab.active');
  ND.previousToolbarTab = active ? active.dataset.tab : 'file';
  if (ND.toolbarTabImage) ND.toolbarTabImage.style.display = '';
  if (ND.switchToolbarTab) ND.switchToolbarTab('image-edit');
  syncImageDimensionsToInputs(ND);
}

export function deselectImage(doc, ND) {
  if (ND.selectedImage) {
    ND.selectedImage.classList.remove('selected');
    ND.selectedImage = null;
  }
  const ctn = doc.getElementById('image-resize-container');
  if (ctn) { ctn.innerHTML = ''; ctn.classList.remove('active'); }
  ND.resizeHandles = [];
  if (ND.toolbarTabImage) ND.toolbarTabImage.style.display = 'none';
  const activeTab = doc.querySelector('.toolbar-tab.active');
  if (activeTab && activeTab.dataset.tab === 'image-edit') {
    if (ND.switchToolbarTab) ND.switchToolbarTab(ND.previousToolbarTab || 'file');
  }
  if (ND.cropOverlay && ND.cropOverlayActive) {
    ND.cropOverlay.style.display = 'none';
    ND.cropOverlayActive = false;
    ND.cropState = null;
  }
}

export function createResizeHandles(doc, ND) {
  const ctn = doc.getElementById('image-resize-container');
  if (!ctn) return;
  ctn.innerHTML = '';
  ND.resizeHandles = [];
  ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'].forEach(pos => {
    const handle = doc.createElement('div');
    handle.className = 'image-resize-handle handle-' + pos;
    handle.dataset.handle = pos;
    ctn.appendChild(handle);
    ND.resizeHandles.push(handle);
  });
  ctn.classList.add('active');
}

export function updateHandlePositions(doc, ND) {
  if (!ND.selectedImage) return;
  const ctn = doc.getElementById('image-resize-container');
  const area = doc.getElementById('editor-area');
  if (!ctn || !area) return;
  const areaRect = area.getBoundingClientRect();
  const imgRect = ND.selectedImage.getBoundingClientRect();
  const left = imgRect.left - areaRect.left;
  const top = imgRect.top - areaRect.top + (area.scrollTop || 0);
  const w = imgRect.width;
  const h = imgRect.height;
  ctn.style.left = left + 'px';
  ctn.style.top = top + 'px';
  ctn.style.width = w + 'px';
  ctn.style.height = h + 'px';
  const hw = 4;
  const positions = {
    nw: { left: -hw, top: -hw }, n: { left: w / 2 - hw, top: -hw }, ne: { left: w - hw, top: -hw },
    w: { left: -hw, top: h / 2 - hw }, e: { left: w - hw, top: h / 2 - hw },
    sw: { left: -hw, top: h - hw }, s: { left: w / 2 - hw, top: h - hw }, se: { left: w - hw, top: h - hw },
  };
  ctn.querySelectorAll('.image-resize-handle').forEach(handle => {
    const pos = handle.dataset.handle;
    if (positions[pos]) {
      handle.style.left = positions[pos].left + 'px';
      handle.style.top = positions[pos].top + 'px';
    }
  });
}

export function syncImageDimensionsToInputs(ND) {
  if (!ND.selectedImage) return;
  const w = parseInt(ND.selectedImage.style.width, 10) || ND.selectedImage.naturalWidth || ND.selectedImage.width;
  const h = parseInt(ND.selectedImage.style.height, 10) || ND.selectedImage.naturalHeight || ND.selectedImage.height;
  if (ND.imgWidthInput) ND.imgWidthInput.value = w || '';
  if (ND.imgHeightInput) ND.imgHeightInput.value = h || '';
  if (w && h) ND.imageEditAspectRatio = w / h;
  if (ND.btnRestoreImage) {
    ND.btnRestoreImage.style.display = ND.selectedImage.dataset.originalSrc ? '' : 'none';
  }
}

export function restoreOriginalImage(ND) {
  if (!ND.selectedImage) return;
  const img = ND.selectedImage;
  if (!img.dataset.originalSrc) return;
  img.src = img.dataset.originalSrc;
  img.style.width = '';
  img.style.height = '';
  delete img.dataset.originalSrc;
  delete img.dataset.crop;
  if (ND.btnRestoreImage) ND.btnRestoreImage.style.display = 'none';
  syncImageDimensionsToInputs(ND);
}

// --- style-toolbar: format painter ---
export function activateFormatPainter(doc, ND) {
  if (!ND.editorDiv) return;
  ND.editorDiv.focus();
  ND.savedFormat = {
    bold: doc.queryCommandState('bold'),
    italic: doc.queryCommandState('italic'),
    underline: doc.queryCommandState('underline'),
    fontName: doc.queryCommandValue('fontName'),
    fontSize: doc.queryCommandValue('fontSize'),
    foreColor: doc.queryCommandValue('foreColor'),
    hiliteColor: doc.queryCommandValue('hiliteColor'),
  };
  ND.formatPainterActive = true;
  ND.btnFormatPainter.classList.add('active');
}

export function applyFormatPainter(doc, ND) {
  if (!ND.formatPainterActive || !ND.savedFormat) return;
  if (ND.savedFormat.bold) doc.execCommand('bold');
  if (ND.savedFormat.italic) doc.execCommand('italic');
  if (ND.savedFormat.underline) doc.execCommand('underline');
  if (ND.savedFormat.fontName) doc.execCommand('fontName', false, ND.savedFormat.fontName);
  if (ND.savedFormat.fontSize) doc.execCommand('fontSize', false, ND.savedFormat.fontSize);
  const fc = ND.savedFormat.foreColor;
  if (fc && fc !== 'rgb(0, 0, 0)' && fc !== 'rgb(0,0,0)') doc.execCommand('foreColor', false, fc);
  const hc = ND.savedFormat.hiliteColor;
  if (hc && hc !== 'transparent' && hc !== 'rgb(255, 255, 255)' && hc !== 'rgb(255,255,255)') doc.execCommand('hiliteColor', false, hc);
  deactivateFormatPainter(ND);
}

export function deactivateFormatPainter(ND) {
  ND.formatPainterActive = false;
  ND.savedFormat = null;
  ND.btnFormatPainter.classList.remove('active');
}

// --- drawing-tools: core algorithms ---

export function getPixel(data, width, x, y) {
  const i = (y * width + x) * 4;
  return [data[i], data[i + 1], data[i + 2], data[i + 3]];
}

export function setPixel(data, width, x, y, color) {
  const i = (y * width + x) * 4;
  data[i] = color[0]; data[i + 1] = color[1]; data[i + 2] = color[2]; data[i + 3] = color[3];
}

export function colorsMatch(c1, c2, tolerance) {
  if (tolerance === 0) return c1[0] === c2[0] && c1[1] === c2[1] && c1[2] === c2[2] && c1[3] === c2[3];
  const dr = Math.abs(c1[0] - c2[0]), dg = Math.abs(c1[1] - c2[1]);
  const db = Math.abs(c1[2] - c2[2]), da = Math.abs(c1[3] - c2[3]);
  return dr <= tolerance && dg <= tolerance && db <= tolerance && da <= tolerance;
}

export function hexToRGBA(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 6) hex += 'ff';
  return [parseInt(hex.substring(0, 2), 16), parseInt(hex.substring(2, 4), 16),
    parseInt(hex.substring(4, 6), 16), parseInt(hex.substring(6, 8), 16)];
}

export function floodFill(imageData, startX, startY, fillHex, tolerance) {
  const width = imageData.width, height = imageData.height;
  const data = new Uint8ClampedArray(imageData.data);
  startX = Math.floor(startX); startY = Math.floor(startY);
  if (startX < 0 || startX >= width || startY < 0 || startY >= height) return imageData;
  const fillColor = hexToRGBA(fillHex);
  const targetColor = getPixel(data, width, startX, startY);
  if (colorsMatch(targetColor, fillColor, tolerance)) return imageData;
  const stack = [[startX, startY]];
  const visited = new Uint8Array(width * height);
  let iterations = 0;
  const MAX_ITERATIONS = width * height;
  while (stack.length > 0 && iterations < MAX_ITERATIONS) {
    const [sx, sy] = stack.pop(); iterations++;
    let left = sx;
    while (left >= 0 && colorsMatch(getPixel(data, width, left, sy), targetColor, tolerance)) left--;
    left++;
    let right = sx;
    while (right < width && colorsMatch(getPixel(data, width, right, sy), targetColor, tolerance)) right++;
    right--;
    for (let px = left; px <= right; px++) setPixel(data, width, px, sy, fillColor);
    for (let nx = left; nx <= right; nx++) {
      if (sy > 0) {
        const idx = (sy - 1) * width + nx;
        if (!visited[idx] && colorsMatch(getPixel(data, width, nx, sy - 1), targetColor, tolerance)) {
          visited[idx] = 1; stack.push([nx, sy - 1]);
        }
      }
      if (sy < height - 1) {
        const idx = (sy + 1) * width + nx;
        if (!visited[idx] && colorsMatch(getPixel(data, width, nx, sy + 1), targetColor, tolerance)) {
          visited[idx] = 1; stack.push([nx, sy + 1]);
        }
      }
    }
  }
  return { data, width, height };
}

export function pickColor(ctx, x, y) {
  const pixel = ctx.getImageData(x, y, 1, 1).data;
  return '#' + [pixel[0], pixel[1], pixel[2]].map(c => c.toString(16).padStart(2, '0')).join('');
}

export function normalRect(x1, y1, x2, y2) {
  return { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) };
}

export function drawRect(ctx, x1, y1, x2, y2, fillColor, strokeColor, doFill, doStroke) {
  const r = normalRect(x1, y1, x2, y2);
  if (doFill) { ctx.fillStyle = fillColor; ctx.fillRect(r.x, r.y, r.w, r.h); }
  if (doStroke) { ctx.strokeStyle = strokeColor; ctx.lineWidth = 2; ctx.strokeRect(r.x, r.y, r.w, r.h); }
}

export function drawEllipse(ctx, x1, y1, x2, y2, fillColor, strokeColor, doFill, doStroke) {
  const r = normalRect(x1, y1, x2, y2);
  ctx.beginPath();
  ctx.ellipse(r.x + r.w / 2, r.y + r.h / 2, r.w / 2, r.h / 2, 0, 0, Math.PI * 2);
  if (doFill) { ctx.fillStyle = fillColor; ctx.fill(); }
  if (doStroke) { ctx.strokeStyle = strokeColor; ctx.lineWidth = 2; ctx.stroke(); }
}

export function drawLine(ctx, x1, y1, x2, y2, strokeColor) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
  ctx.strokeStyle = strokeColor; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke();
}

export function drawRoundRect(ctx, x1, y1, x2, y2, radius, fillColor, strokeColor, doFill, doStroke) {
  const r = normalRect(x1, y1, x2, y2);
  const rad = Math.min(radius || 12, r.w / 2, r.h / 2);
  ctx.beginPath();
  ctx.moveTo(r.x + rad, r.y); ctx.lineTo(r.x + r.w - rad, r.y);
  ctx.arcTo(r.x + r.w, r.y, r.x + r.w, r.y + rad, rad);
  ctx.lineTo(r.x + r.w, r.y + r.h - rad);
  ctx.arcTo(r.x + r.w, r.y + r.h, r.x + r.w - rad, r.y + r.h, rad);
  ctx.lineTo(r.x + rad, r.y + r.h);
  ctx.arcTo(r.x, r.y + r.h, r.x, r.y + r.h - rad, rad);
  ctx.lineTo(r.x, r.y + rad); ctx.arcTo(r.x, r.y, r.x + rad, r.y, rad);
  ctx.closePath();
  if (doFill) { ctx.fillStyle = fillColor; ctx.fill(); }
  if (doStroke) { ctx.strokeStyle = strokeColor; ctx.lineWidth = 2; ctx.stroke(); }
}

// --- drawing: snapshot management ---
export function pushSnapshot(ND) {
  if (!ND.drawCtx) return;
  ND.drawingSnapshots = ND.drawingSnapshots.slice(0, ND.drawingSnapshotIndex + 1);
  ND.drawingSnapshots.push(ND.drawCtx.getImageData(0, 0, ND.drawCanvas.width, ND.drawCanvas.height));
  if (ND.drawingSnapshots.length > 50) ND.drawingSnapshots.shift();
  ND.drawingSnapshotIndex = ND.drawingSnapshots.length - 1;
}

export function undoSnapshot(ND) {
  if (!ND.drawCtx || ND.drawingSnapshotIndex <= 0) return false;
  ND.drawingSnapshotIndex--;
  ND.drawCtx.putImageData(ND.drawingSnapshots[ND.drawingSnapshotIndex], 0, 0);
  return true;
}

export function redoSyncShot(ND) {
  if (!ND.drawCtx || ND.drawingSnapshotIndex >= ND.drawingSnapshots.length - 1) return false;
  ND.drawingSnapshotIndex++;
  ND.drawCtx.putImageData(ND.drawingSnapshots[ND.drawingSnapshotIndex], 0, 0);
  return true;
}

export function applyZoom(ND, level) {
  if (!ND.editorScroll) return;
  ND.zoomLevel = level;
  ND.editorScroll.style.transform = 'scale(' + level + ')';
  ND.editorScroll.style.transformOrigin = 'top left';
  if (ND.zoomLabel) ND.zoomLabel.textContent = Math.round(level * 100) + '%';
}

// --- drawing: selection ---
export function createMaskFromBounds(w, h, bounds) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = bounds.y; y < bounds.y + bounds.h && y < h; y++) {
    for (let x = bounds.x; x < bounds.x + bounds.w && x < w; x++) {
      const i = (y * w + x) * 4;
      data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = 255;
    }
  }
  return { data, width: w, height: h };
}

export function pointInPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x, yi = points[i].y;
    const xj = points[j].x, yj = points[j].y;
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function createLassoMask(w, h, points) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (pointInPolygon(x, y, points)) {
        const i = (y * w + x) * 4;
        data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = 255;
      }
    }
  }
  return { data, width: w, height: h };
}

export function getMaskBounds(mask) {
  const w = mask.width, h = mask.height, d = mask.data;
  let minX = w, maxX = 0, minY = h, maxY = 0, found = false;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 0) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        found = true;
      }
    }
  }
  return found ? { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 } : null;
}

export function deleteSelection(ND) {
  if (!ND.drawCtx || !ND.selectionMask) return;
  const imageData = ND.drawCtx.getImageData(0, 0, ND.drawCanvas.width, ND.drawCanvas.height);
  const d = imageData.data, m = ND.selectionMask.data;
  for (let i = 3; i < d.length; i += 4) {
    if (m[i] > 0) { d[i - 3] = 0; d[i - 2] = 0; d[i - 1] = 0; d[i] = 0; }
  }
  ND.drawCtx.putImageData(imageData, 0, 0);
}

// --- drawing: toggle mode ---
export function toggleDrawingMode(ND, active) {
  if (active === undefined) active = !ND.drawingActive;
  if (active && !ND.editorDiv) return;
  ND.drawingActive = active;
  const canvas = ND.drawCanvas;
  if (!canvas) return;
  if (active) {
    canvas.classList.add('drawing-active');
    if (ND.switchToolbarTab) ND.switchToolbarTab('draw');
    if (ND.editorDiv) ND.editorDiv.contentEditable = 'false';
    if (ND.drawingSnapshots.length === 0 && ND.drawCtx) pushSnapshot(ND);
  } else {
    canvas.classList.remove('drawing-active');
    if (ND.editorDiv) ND.editorDiv.contentEditable = 'true';
    ND.isDrawing = false;
    ND.previewSnapshot = null;
    if (ND.drawingPreviousTab && ND.drawingPreviousTab !== 'draw') {
      if (ND.switchToolbarTab) ND.switchToolbarTab(ND.drawingPreviousTab);
    }
  }
}

export function selectTool(ND, toolId) {
  ND.currentTool = toolId;
  ND.isDrawing = false;
  ND.previewSnapshot = null;
}

// ---- execCommand mock (jsdom doesn't support it) ----
let _undoStack = [];
let _redoStack = [];
let _activeEditable = null;

function findEditable(ed, sel) {
  // First try the tracked active editable element
  if (_activeEditable && _activeEditable.contentEditable === 'true') return _activeEditable;
  // Try activeElement
  if (ed && ed.contentEditable === 'true') return ed;
  if (ed) {
    let el = ed;
    while (el && el.nodeType !== 1) el = el.parentNode;
    while (el && el !== doc && el.contentEditable !== 'true') el = el.parentNode;
    if (el && el.contentEditable === 'true') return el;
  }
  // Try selection
  if (sel && sel.rangeCount) {
    let node = sel.anchorNode;
    while (node && node.nodeType !== 1) node = node.parentNode;
    while (node && node !== doc && node.contentEditable !== 'true') node = node.parentNode;
    if (node && node.contentEditable === 'true') return node;
  }
  return null;
}

function pushUndo(el) { if (el) { _undoStack.push(el.innerHTML); _redoStack = []; } }

function mockExecCommand(doc, command, showUI, value) {
  const sel = doc.defaultView.getSelection();
  const ed = findEditable(doc.activeElement, sel);

  switch (command) {
    case 'bold': {
      if (!sel.rangeCount) return false;
      const range = sel.getRangeAt(0);
      if (range.collapsed) return false;
      pushUndo(ed);
      const b = doc.createElement('b');
      try { range.surroundContents(b); sel.removeAllRanges(); sel.addRange(doc.createRange()); } catch (_) { return false; }
      return true;
    }
    case 'italic': {
      if (!sel.rangeCount) return false;
      const range = sel.getRangeAt(0);
      if (range.collapsed) return false;
      pushUndo(ed);
      const i = doc.createElement('i');
      try { range.surroundContents(i); } catch (_) { return false; }
      return true;
    }
    case 'underline': {
      if (!sel.rangeCount) return false;
      const range = sel.getRangeAt(0);
      if (range.collapsed) return false;
      pushUndo(ed);
      const u = doc.createElement('u');
      try { range.surroundContents(u); } catch (_) { return false; }
      return true;
    }
    case 'fontName': {
      if (!sel.rangeCount || !value) return false;
      const range = sel.getRangeAt(0);
      if (range.collapsed) return false;
      pushUndo(ed);
      const span = doc.createElement('font');
      span.setAttribute('face', value);
      try { range.surroundContents(span); } catch (_) { return false; }
      return true;
    }
    case 'fontSize': {
      if (!sel.rangeCount || !value) return false;
      const range = sel.getRangeAt(0);
      if (range.collapsed) return false;
      pushUndo(ed);
      const span = doc.createElement('font');
      span.setAttribute('size', value);
      try { range.surroundContents(span); } catch (_) { return false; }
      return true;
    }
    case 'foreColor': {
      if (!sel.rangeCount || !value) return false;
      const range = sel.getRangeAt(0);
      if (range.collapsed) return false;
      pushUndo(ed);
      // Apply to all text nodes in range
      const span = doc.createElement('span');
      span.style.color = value;
      try { range.surroundContents(span); } catch (_) { return false; }
      return true;
    }
    case 'hiliteColor': {
      if (!sel.rangeCount || !value) return false;
      const range = sel.getRangeAt(0);
      if (range.collapsed) return false;
      pushUndo(ed);
      const span = doc.createElement('span');
      span.style.backgroundColor = value;
      try { range.surroundContents(span); } catch (_) { return false; }
      return true;
    }
    case 'justifyLeft':
    case 'justifyCenter':
    case 'justifyRight': {
      if (!sel.rangeCount) return false;
      let node = sel.anchorNode;
      while (node && node !== ed && node.nodeType === 3) node = node.parentNode;
      if (node && node.nodeType === 1) {
        _undoStack.push(ed ? ed.innerHTML : '');
        _redoStack = [];
        const align = command === 'justifyCenter' ? 'center' : command === 'justifyRight' ? 'right' : 'left';
        node.style.textAlign = align;
      }
      return true;
    }
    case 'insertHTML': {
      if (!value || !ed) return false;
      pushUndo(ed);
      // If no selection, create one at end of editable
      if (!sel.rangeCount || sel.getRangeAt(0).collapsed === undefined) {
        const range = doc.createRange();
        range.selectNodeContents(ed);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const fragment = range.createContextualFragment(value);
      range.insertNode(fragment);
      range.collapse(false);
      return true;
    }
    case 'delete': {
      if (!sel.rangeCount) return false;
      pushUndo(ed);
      sel.getRangeAt(0).deleteContents();
      return true;
    }
    case 'insertLineBreak': {
      if (!sel.rangeCount || !ed) return false;
      pushUndo(ed);
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const br = doc.createElement('br');
      range.insertNode(br);
      range.setStartAfter(br);
      range.collapse(true);
      return true;
    }
    case 'undo': {
      if (_undoStack.length === 0 || !ed) return false;
      _redoStack.push(ed.innerHTML);
      ed.innerHTML = _undoStack.pop();
      return true;
    }
    case 'redo': {
      if (_redoStack.length === 0 || !ed) return false;
      _undoStack.push(ed.innerHTML);
      ed.innerHTML = _redoStack.pop();
      return true;
    }
    default:
      return false;
  }
}

function mockQueryCommandState(doc, command) {
  const sel = doc.defaultView.getSelection();
  if (!sel.rangeCount) return false;
  const range = sel.getRangeAt(0);
  if (range.collapsed) return false;
  let node = range.commonAncestorContainer;
  while (node) {
    if (node.nodeType === 1) {
      const tag = node.tagName.toLowerCase();
      if (command === 'bold' && tag === 'b') return true;
      if (command === 'italic' && tag === 'i') return true;
      if (command === 'underline' && tag === 'u') return true;
    }
    node = node.parentNode;
  }
  return false;
}

function mockQueryCommandValue(doc, command) {
  const sel = doc.defaultView.getSelection();
  if (!sel.rangeCount) return '';
  const range = sel.getRangeAt(0);
  let node = range.commonAncestorContainer;
  while (node && node !== doc.body) {
    if (node.nodeType === 1) {
      if (command === 'fontName') {
        if (node.tagName === 'FONT' && node.getAttribute('face')) return node.getAttribute('face');
      }
      if (command === 'fontSize') {
        if (node.tagName === 'FONT' && node.getAttribute('size')) return node.getAttribute('size');
      }
      if (command === 'foreColor') {
        const c = node.style && node.style.color;
        if (c && c !== '') return c;
      }
      if (command === 'hiliteColor') {
        const c = node.style && node.style.backgroundColor;
        if (c && c !== '') return c;
      }
    }
    node = node.parentNode;
  }
  return '';
}

function mockQueryCommandEnabled(doc, command) {
  if (command === 'undo') return _undoStack.length > 0;
  if (command === 'redo') return _redoStack.length > 0;
  return true;
}

function setupExecCommand(doc) {
  doc.execCommand = function (command, showUI, value) {
    return mockExecCommand(doc, command, showUI, value);
  };
  doc.queryCommandState = function (command) {
    return mockQueryCommandState(doc, command);
  };
  doc.queryCommandValue = function (command) {
    return mockQueryCommandValue(doc, command);
  };
  doc.queryCommandEnabled = function (command) {
    return mockQueryCommandEnabled(doc, command);
  };
}

// --- Full createTestEnvironment ---
export function createTestEnvironment() {
  const { dom, doc, win } = buildDOM();
  const ND = createND(doc);
  const api = createMockAPI();

  // Setup execCommand mock
  setupExecCommand(doc);

  // Expose ND on window
  win.ND = ND;
  // Mock electronAPI
  win.electronAPI = api;

  // Reset undo stacks + active editable
  _undoStack = [];
  _redoStack = [];
  _activeEditable = null;

  return { dom, doc, win, ND, api };
}
