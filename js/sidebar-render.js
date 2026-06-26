/**
 * @file         js/sidebar-render.js
 * @description  Note Diary — 侧边栏渲染与列表加载
 * @author       tianxj22
 * @created      2026-06-24
 * @updated      2026-06-26
 * @version      1.0.0
 */

// ---- 回收站缓存 ----
ND.trashNotes = [];

// ---- 渲染笔记列表 ----
function renderNoteList() {
  ND.noteListEl.innerHTML = '';
  if (ND.activeView !== 'workspace') return;
  if (ND.notes.length === 0) {
    ND.noteListEl.innerHTML = '<div class="empty">暂无笔记<br>点击上方按钮创建</div>';
    return;
  }
  ND.notes.forEach(n => {
    const div = document.createElement('div');
    div.className = 'note-item' + (ND.currentNote && ND.currentNote.filePath === n.filePath ? ' active' : '');
    div.innerHTML = `<div class="title">${escapeHtml(n.displayName)}</div>
                     <div class="meta">${formatDate(n.mtime)}</div>`;
    div.addEventListener('click', () => selectNote(n));
    div.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e, n);
    });
    ND.noteListEl.appendChild(div);
  });
}

/** 渲染回收站列表 */
function renderTrashList() {
  ND.noteListEl.innerHTML = '';
  if (ND.activeView !== 'trash') return;
  if (ND.trashNotes.length === 0) {
    ND.noteListEl.innerHTML = '<div class="empty">回收站为空</div>';
    return;
  }
  ND.trashNotes.forEach(n => {
    const div = document.createElement('div');
    div.className = 'note-item trash-item';
    div.innerHTML = `<div class="title">${escapeHtml(n.displayName)}</div>
                     <div class="meta">删除于 ${formatDate(n.deletedAt)}</div>`;
    div.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showTrashContextMenu(e, n);
    });
    ND.noteListEl.appendChild(div);
  });
}

// ---- 加载笔记列表 ----
async function loadNoteList() {
  ND.notes = await window.electronAPI.listNotes({ sortBy: ND.sortBy, sortDir: ND.sortDir });
  renderNoteList();
}

// ---- 加载回收站列表 ----
async function loadTrashList() {
  ND.trashNotes = await window.electronAPI.listTrash();
  renderTrashList();
}
