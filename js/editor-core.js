/**
 * @file         js/editor-core.js
 * @description  Note Diary — 笔记选择/新建/保存/编辑器显示隐藏 + 状态栏
 * @author       tianxj22
 * @created      2026-06-25
 * @updated      2026-06-26
 * @version      1.0.0
 */

// ============================================================
// editor-core.js — 笔记选择/新建/保存/编辑器显示隐藏 + 状态栏
// ============================================================

// ---- 选择笔记 ----
async function selectNote(note) {
  if (ND.currentNote && ND.currentNote.filePath === note.filePath) return;
  // 在 async gap 前清空 currentNote，防止 autoSave 写入错误的笔记
  const prevNote = ND.currentNote;
  ND.currentNote = null;
  if (ND.saveTimer) { clearTimeout(ND.saveTimer); ND.saveTimer = null; }
  // 保存上一个笔记（含绘图层数据）
  if (prevNote && ND.editorDiv) {
    saveDrawCanvasData();
    var prevDrawing = ND.drawingCanvasData || '';
    var prevText = ND.editorDiv.innerHTML;
    var prevContent = encodeNoteContent(prevText, prevDrawing);
    if (prevContent !== ND.lastSavedContent) {
      await window.electronAPI.saveNote(prevNote.filePath, prevContent);
    }
  }
  ND.currentNote = note;
  var raw = await window.electronAPI.readNote(note.filePath);
  var decoded = decodeNoteContent(raw);
  ND.drawingCanvasData = decoded.drawing;
  ND.currentContent = decoded.text;
  // 兼容旧纯文本笔记：将换行转换为 HTML <br>
  if (!/^\s*</.test(ND.currentContent)) {
    ND.currentContent = ND.currentContent.split('\n').map(function(line) {
      return line ? escapeHtml(line) : '<br>';
    }).join('<br>');
  }
  ND.lastSavedContent = raw;
  showEditor();
  ND.editorTitleInput.value = note.displayName;
  ND.editorDiv.innerHTML = ND.currentContent;
  ND.editorDiv.focus();
  // 恢复绘图模式
  if (ND.drawingActive && ND.drawCanvas) {
    ND.drawCanvas.classList.add('drawing-active');
    updateCanvasCursor();
    ND.switchToolbarTab('draw');
  }
  renderNoteList();
  updateStatus();
}

// ---- 新建笔记 ----
async function createNewNote() {
  await saveCurrentNote();
  const defaultName = await window.electronAPI.getNextDefaultName();
  const title = defaultName.title;
  const result = await window.electronAPI.createNote(title);
  ND.currentNote = { filePath: result.filePath, fileName: result.fileName, displayName: title, mtime: Date.now() };
  ND.currentContent = '';
  ND.lastSavedContent = '';
  showEditor();
  ND.editorTitleInput.value = title;
  ND.editorDiv.innerHTML = '';
  ND.editorDiv.focus();
  // 恢复绘图模式
  if (ND.drawingActive && ND.drawCanvas) {
    ND.drawCanvas.classList.add('drawing-active');
    updateCanvasCursor();
    ND.switchToolbarTab('draw');
  }
  await loadNoteList();
  renderNoteList();
  updateStatus();
}

// ---- 保存当前笔记 ----
async function saveCurrentNote() {
  if (!ND.currentNote || !ND.editorDiv) return;
  var textHtml = ND.editorDiv.innerHTML;
  saveDrawCanvasData();
  var drawingData = ND.drawingCanvasData || '';
  var content = encodeNoteContent(textHtml, drawingData);
  if (content === ND.lastSavedContent) return;
  var ok = await window.electronAPI.saveNote(ND.currentNote.filePath, content);
  if (ok) {
    ND.lastSavedContent = content;
    ND.currentNote.mtime = Date.now();
    ND.statusLeft.textContent = '已保存';
    setTimeout(function() { if (ND.statusLeft.textContent === '已保存') updateStatus(); }, 1500);
  }
}

// ---- 自动保存（防抖）—— 已禁用 ----
// function autoSave() {
//   if (ND.saveTimer) clearTimeout(ND.saveTimer);
//   ND.saveTimer = setTimeout(async () => {
//     if (ND.editorDiv && ND.editorDiv.innerHTML !== ND.lastSavedContent) {
//       pushUndo(ND.lastSavedContent);
//     }
//     await saveCurrentNote();
//     await loadNoteList();
//     renderNoteList();
//   }, 500);
// }

// ---- 手动保存 ----
async function manualSave() {
  if (!ND.currentNote || !ND.editorDiv) return;
  var textHtml = ND.editorDiv.innerHTML;
  saveDrawCanvasData();
  var drawingData = ND.drawingCanvasData || '';
  var content = encodeNoteContent(textHtml, drawingData);
  if (content === ND.lastSavedContent) return;
  var ok = await window.electronAPI.saveNote(ND.currentNote.filePath, content);
  if (ok) {
    ND.lastSavedContent = content;
    ND.currentNote.mtime = Date.now();
    ND.statusLeft.textContent = '已保存';
    setTimeout(function() { if (ND.statusLeft.textContent === '已保存') updateStatus(); }, 1500);
    await loadNoteList();
    renderNoteList();
  }
}

// ---- 关闭当前笔记 ----
async function closeCurrentNote() {
  if (!ND.currentNote) return;
  // 先保存当前内容
  if (ND.editorDiv) {
    saveDrawCanvasData();
    var textHtml = ND.editorDiv.innerHTML;
    var drawingData = ND.drawingCanvasData || '';
    var content = encodeNoteContent(textHtml, drawingData);
    if (content !== ND.lastSavedContent) {
      await window.electronAPI.saveNote(ND.currentNote.filePath, content);
    }
  }
  if (ND.saveTimer) { clearTimeout(ND.saveTimer); ND.saveTimer = null; }
  deselectImage();
  ND.currentNote = null;
  ND.currentContent = '';
  ND.lastSavedContent = '';
  ND.drawingCanvasData = null;
  hideEditor();
  updateStatus();
}

// ---- 编辑器显示 ----
function showEditor() {
  ND.editorArea.innerHTML = '';

  // 关闭按钮
  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn-close-note';
  closeBtn.textContent = '×';
  closeBtn.title = '关闭当前笔记';
  closeBtn.addEventListener('click', function(e) { e.stopPropagation(); closeCurrentNote(); });
  ND.editorArea.appendChild(closeBtn);

  // 标题输入
  ND.editorTitleInput = document.createElement('input');
  ND.editorTitleInput.type = 'text';
  ND.editorTitleInput.className = 'editor-title-input';
  ND.editorTitleInput.placeholder = '笔记标题...';
  ND.editorTitleInput.addEventListener('keydown', async function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (ND.currentNote) {
        var newTitle = ND.editorTitleInput.value.trim();
        if (newTitle && newTitle !== ND.currentNote.displayName) {
          var result = await window.electronAPI.renameNote(ND.currentNote.filePath, newTitle);
          if (result) {
            ND.currentNote.filePath = result.filePath;
            ND.currentNote.fileName = result.fileName;
            ND.currentNote.displayName = newTitle;
            await loadNoteList();
            renderNoteList();
            updateStatus();
            ND.statusLeft.textContent = '已重命名';
          }
        }
      }
      ND.editorDiv && ND.editorDiv.focus();
    }
  });
  ND.editorArea.appendChild(ND.editorTitleInput);

  // 滚动容器（包裹文字层 + 绘图层）
  var scrollDiv = document.createElement('div');
  scrollDiv.className = 'editor-scroll';
  ND.editorScroll = scrollDiv;

  // 文字层
  ND.editorDiv = document.createElement('div');
  ND.editorDiv.className = 'editor-content';
  ND.editorDiv.contentEditable = 'true';
  ND.editorDiv.addEventListener('input', onEditorInput);
  ND.editorDiv.addEventListener('keydown', onEditorKeydown);
  ND.editorDiv.addEventListener('paste', onEditorPaste);
  scrollDiv.appendChild(ND.editorDiv);

  // 绘图层（透明 canvas，覆盖在文字上方）
  var canvas = document.createElement('canvas');
  canvas.id = 'draw-canvas';
  ND.drawCanvas = canvas;
  ND.drawCtx = canvas.getContext('2d');
  scrollDiv.appendChild(canvas);

  ND.editorArea.appendChild(scrollDiv);

  // 图片缩放手柄容器
  var resizeCtn = document.createElement('div');
  resizeCtn.className = 'image-resize-container';
  resizeCtn.id = 'image-resize-container';
  ND.editorArea.appendChild(resizeCtn);

  // 绑定画布鼠标事件 + 初始化画布尺寸
  initDrawCanvas();
}

// ---- 编辑器隐藏 ----
function hideEditor() {
  // 保存绘图层数据
  saveDrawCanvasData();
  ND.editorArea.innerHTML = '<div class="no-note">选择或新建一篇笔记开始编辑</div>';
  ND.editorDiv = null;
  ND.editorTitleInput = null;
  ND.selectedImage = null;
  ND.resizeHandles = [];
  ND.drawCanvas = null;
  ND.drawCtx = null;
  ND.editorScroll = null;
  // 保留 drawingActive 状态，以便新笔记恢复
}

// ---- 绘图层数据管理 ----

/**
 * 保存当前绘图层数据到 ND.drawingCanvasData
 */
function saveDrawCanvasData() {
  if (ND.drawCanvas && ND.drawCtx) {
    var dataUrl = ND.drawCanvas.toDataURL('image/png');
    // 如果画布完全空白，不保存
    ND.drawingCanvasData = dataUrl;
  }
}

/**
 * 初始化画布尺寸 + 恢复保存的绘图层数据 + 绑定鼠标事件
 */
function initDrawCanvas() {
  if (!ND.drawCanvas || !ND.editorScroll) return;
  var scrollEl = ND.editorScroll;
  var contentEl = ND.editorDiv;
  // 画布尺寸跟随滚动容器内容
  var resizeCanvas = function() {
    var newW = scrollEl.clientWidth;
    var newH = Math.max(scrollEl.clientHeight, contentEl.scrollHeight);
    if (newW === ND.drawCanvas.width && newH === ND.drawCanvas.height) return;
    // 保存当前像素，resize 会清空画布
    var savedData = null;
    if (ND.drawCtx && ND.drawCanvas.width > 0 && ND.drawCanvas.height > 0) {
      savedData = ND.drawCtx.getImageData(0, 0, ND.drawCanvas.width, ND.drawCanvas.height);
    }
    ND.drawCanvas.width = newW;
    ND.drawCanvas.height = newH;
    ND.drawCanvas.style.width = newW + 'px';
    ND.drawCanvas.style.height = newH + 'px';
    // 恢复像素
    if (savedData && ND.drawCtx) {
      ND.drawCtx.putImageData(savedData, 0, 0);
    }
  };
  resizeCanvas();

  // 内容变化时重设画布高度
  if (ND.editorDiv) {
    ND.editorDiv.addEventListener('input', function() {
      setTimeout(resizeCanvas, 10);
    });
  }

  // 恢复绘图层数据
  if (ND.drawingCanvasData) {
    var img = new Image();
    img.onload = function() {
      if (ND.drawCtx) {
        ND.drawCtx.drawImage(img, 0, 0);
      }
    };
    img.src = ND.drawingCanvasData;
  }

  // 绑定画布鼠标事件
  bindCanvasEvents();
}

// ---- 组合格式：---DRAWING--- / ---TEXT--- ----

var DRAWING_SEP = '\n---DRAWING---\n';
var TEXT_SEP = '\n---TEXT---\n';

/**
 * 编码笔记内容为持久化格式
 */
function encodeNoteContent(textHtml, drawingDataUrl) {
  var d = drawingDataUrl || '';
  var t = textHtml || '';
  return DRAWING_SEP.trim() + '\n' + d + '\n' + TEXT_SEP.trim() + '\n' + t;
}

/**
 * 解码笔记内容
 * @returns {{ drawing: string|null, text: string }}
 */
function decodeNoteContent(raw) {
  var dIdx = raw.indexOf(DRAWING_SEP.trim());
  var tIdx = raw.indexOf(TEXT_SEP.trim());
  if (dIdx === -1 || tIdx === -1) {
    // 旧格式：整个内容作为文本
    return { drawing: null, text: raw };
  }
  var drawing = raw.substring(dIdx + DRAWING_SEP.trim().length + 1, tIdx).trim();
  var text = raw.substring(tIdx + TEXT_SEP.trim().length + 1);
  return { drawing: drawing || null, text: text };
}

// ---- 状态栏 ----
function updateStatus() {
  if (ND.currentNote) {
    ND.statusLeft.textContent = `当前: ${ND.currentNote.displayName}`;
  } else {
    ND.statusLeft.textContent = '就绪';
  }
}
