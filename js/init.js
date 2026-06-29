/**
 * @file         js/init.js
 * @description  Note Diary — 启动入口、全局事件绑定、初始化
 * @author       tianxj22
 * @created      2026-06-25
 * @updated      2026-06-25
 * @version      1.0.0
 */

// ---- 事件绑定（按钮） ----
document.getElementById('btn-sidebar-new').addEventListener('click', createNewNote);
document.getElementById('btn-new').addEventListener('click', createNewNote);
document.getElementById('btn-save').addEventListener('click', () => manualSave());
document.getElementById('btn-settings').addEventListener('click', () => ND.showSettingsModal());

// ---- 全局快捷键 ----
document.addEventListener('keydown', (e) => {
  var ctrl = e.ctrlKey || e.metaKey;

  // Escape: 关闭所有弹出层
  if (e.key === 'Escape') {
    hideContextMenu();
    hideEmptyContextMenu();
    hideEditorContextMenu();
    ND.contextMenuTrash.classList.remove('visible');
  }

  // 仅在有编辑器时生效的快捷键
  if (ND.editorDiv) {
    // 文本格式
    if (ctrl && e.key === 'd') { e.preventDefault(); document.execCommand('strikeThrough'); return; }
    if (ctrl && e.key === '\\') { e.preventDefault(); document.execCommand('removeFormat'); return; }
    if (ctrl && e.shiftKey && (e.key === 'o' || e.key === 'O')) { e.preventDefault(); document.execCommand('insertOrderedList'); return; }
    if (ctrl && e.shiftKey && (e.key === 'u' || e.key === 'U')) { e.preventDefault(); document.execCommand('insertUnorderedList'); return; }

    // 插入
    if (ctrl && e.shiftKey && (e.key === 'c' || e.key === 'C')) { e.preventDefault(); insertChecklist(); return; }
    if (ctrl && e.shiftKey && (e.key === 't' || e.key === 'T')) { e.preventDefault(); insertTimestamp(); return; }
    if (ctrl && e.shiftKey && (e.key === 'i' || e.key === 'I')) { e.preventDefault(); insertImageFromFile(); return; }

    // 绘图切换
    if (ctrl && e.shiftKey && (e.key === 'd' || e.key === 'D')) { e.preventDefault(); toggleDrawingMode(); return; }

    // 查找替换
    if (ctrl && e.key === 'h') {
      e.preventDefault();
      var bar = document.getElementById('find-bar');
      if (bar && !bar.classList.contains('visible')) ND.toggleFindBar();
      var repInput = document.getElementById('replace-input');
      if (repInput) setTimeout(function () { repInput.focus(); repInput.select(); }, 50);
      return;
    }

    // 关闭当前笔记
    if (ctrl && e.key === 'w') { e.preventDefault(); closeCurrentNote(); return; }

    // Tab/Shift+Tab 缩进
    if (e.key === 'Tab' && !ctrl) {
      e.preventDefault();
      if (e.shiftKey) document.execCommand('outdent');
      else document.execCommand('indent');
      return;
    }
  }

  if (ctrl && e.key === 'n') {
    e.preventDefault();
    createNewNote();
  }
  if (ctrl && e.key === 's') {
    e.preventDefault();
    manualSave();
  }
  // 绘图模式下 Ctrl+Z/Ctrl+Y → 快照撤销/重做
  if (ND.drawingActive && ND.drawCtx && ctrl) {
    if (e.key === 'z' || e.key === 'Z') {
      e.preventDefault();
      undoSnapshot(ND.drawCtx);
    } else if (e.key === 'y' || e.key === 'Y') {
      e.preventDefault();
      redoSyncShot(ND.drawCtx);
    }
  }
});

// ---- 防御：点击编辑区任意位置自动聚焦到 editorDiv ----
ND.editorArea.addEventListener('click', (e) => {
  if (ND.editorDiv && !e.target.closest('.btn-close-note')) {
    ND.editorDiv.focus();
  }
});

// ---- 撤销/重做按钮 ----
ND.btnUndo.addEventListener('click', () => {
  if (ND.drawingActive && ND.drawCtx) {
    undoSnapshot(ND.drawCtx);
    return;
  }
  if (ND.editorDiv) {
    ND.editorDiv.focus();
    document.execCommand('undo');
  }
});
ND.btnRedo.addEventListener('click', () => {
  if (ND.drawingActive && ND.drawCtx) {
    redoSyncShot(ND.drawCtx);
    return;
  }
  if (ND.editorDiv) {
    ND.editorDiv.focus();
    document.execCommand('redo');
  }
});

// ---- 编辑器内 mouseup 时，若格式刷激活则应用格式 ----
ND.editorArea.addEventListener('mouseup', (e) => {
  if (ND.formatPainterActive && ND.editorDiv && ND.editorDiv.contains(e.target)) {
    setTimeout(() => {
      if (ND.formatPainterActive) applyFormatPainter();
    }, 50);
  }
});

// ---- 滚动/窗口大小变化时更新手柄位置 ----
document.addEventListener('scroll', () => {
  if (ND.selectedImage) updateHandlePositions();
}, true);
window.addEventListener('resize', () => {
  if (ND.selectedImage) updateHandlePositions();
});

// ---- 选区变化时更新工具栏 ----
document.addEventListener('selectionchange', () => {
  if (!ND.formatPainterActive) updateStyleToolbar();
});

// ---- 猴子补丁：showEditor 中追加 style toolbar + 行号事件绑定 ----
var origShowEditor = showEditor;
showEditor = function () {
  origShowEditor();
  if (ND.editorDiv) {
    ND.editorDiv.addEventListener('click', updateStyleToolbar);
    ND.editorDiv.addEventListener('keyup', updateStyleToolbar);
    // 行号更新
    setTimeout(updateLineNumbers, 50);
  }
  if (ND.editorScroll) {
    ND.editorScroll.addEventListener('scroll', updateLineNumbers);
  }
};

// ---- 行号随编辑更新 ----
document.addEventListener('input', function (e) {
  if (ND.editorDiv && ND.editorDiv.contains(e.target)) {
    updateLineNumbers();
  }
});
window.addEventListener('resize', updateLineNumbers);

// ---- 启动 ----
loadNoteList();
