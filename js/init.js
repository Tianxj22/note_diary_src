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
  if (e.key === 'Escape') {
    hideContextMenu();
    hideEmptyContextMenu();
    ND.contextMenuTrash.classList.remove('visible');
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault();
    createNewNote();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    manualSave();
  }
  // 绘图模式下 Ctrl+Z/Ctrl+Y → 快照撤销/重做
  if (ND.drawingActive && ND.drawCtx && (e.ctrlKey || e.metaKey)) {
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

// ---- 猴子补丁：showEditor 中追加 style toolbar 事件绑定 ----
const origShowEditor = showEditor;
showEditor = function () {
  origShowEditor();
  if (ND.editorDiv) {
    ND.editorDiv.addEventListener('click', updateStyleToolbar);
    ND.editorDiv.addEventListener('keyup', updateStyleToolbar);
  }
};

// ---- 启动 ----
loadNoteList();
