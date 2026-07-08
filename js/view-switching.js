/**
 * @file         js/view-switching.js
 * @description  Note Diary — 侧边栏视图切换 + 排序控件 + 工具栏标签页 + 导入文件 + 回收站操作
 * @author       tianxj22
 * @created      2026-06-25
 * @updated      2026-06-26
 * @version      1.0.0
 */

// ============================================================
// view-switching.js — 侧边栏视图切换 + 排序控件 + 工具栏标签页
//                      + 导入文件 + 回收站操作
// ============================================================

// ---- 侧边栏视图切换 ----
document.getElementById('tab-workspace').addEventListener('click', () => switchView('workspace'));
document.getElementById('tab-trash').addEventListener('click', () => switchView('trash'));
document.getElementById('tab-conflicts').addEventListener('click', () => switchView('conflicts'));
document.getElementById('tab-calendar').addEventListener('click', () => switchView('calendar'));

function switchView(view) {
  ND.activeView = view;
  document.getElementById('tab-workspace').classList.toggle('active', view === 'workspace');
  document.getElementById('tab-trash').classList.toggle('active', view === 'trash');
  document.getElementById('tab-conflicts').classList.toggle('active', view === 'conflicts');
  document.getElementById('tab-calendar').classList.toggle('active', view === 'calendar');
  document.getElementById('sidebar-header-workspace').style.display = view === 'workspace' ? '' : 'none';
  document.getElementById('sort-controls').style.display = view === 'workspace' ? '' : 'none';
  var tagBar = document.getElementById('tag-filter-bar');
  if (tagBar) tagBar.style.display = view === 'workspace' ? '' : 'none';
  var searchBar = document.getElementById('search-bar');
  if (searchBar) searchBar.style.display = view === 'workspace' ? '' : 'none';
  var resultsInfo = document.getElementById('search-results-info');
  if (resultsInfo && view !== 'workspace') resultsInfo.style.display = 'none';
  document.getElementById('trash-actions').style.display = view === 'trash' ? '' : 'none';
  var bulkBar = document.getElementById('conflict-bulk-actions');
  if (bulkBar) bulkBar.style.display = view === 'conflicts' ? '' : 'none';
  // 切换到回收站/冲突/日历时，隐藏编辑区
  if ((view === 'trash' || view === 'conflicts' || view === 'calendar') && ND.currentNote) {
    closeCurrentNote();
  }

  // 隐藏/显示日历
  var calContainer = document.getElementById('calendar-container');
  if (calContainer) calContainer.style.display = view === 'calendar' ? '' : 'none';
  var noteList = document.getElementById('note-list');
  if (noteList) noteList.style.display = view === 'calendar' ? 'none' : '';

  // 隐藏/显示工作区控件
  var workspaceControls = document.getElementById('sidebar-header-workspace');
  var sortControls = document.getElementById('sort-controls');
  var searchBar = document.getElementById('search-bar');
  var resultsInfo = document.getElementById('search-results-info');
  if (view === 'calendar') {
    if (workspaceControls) workspaceControls.style.display = 'none';
    if (sortControls) sortControls.style.display = 'none';
    if (searchBar) searchBar.style.display = 'none';
    if (resultsInfo) resultsInfo.style.display = 'none';
  }

  if (view === 'workspace') {
    loadNoteList();
  } else if (view === 'trash') {
    loadTrashList();
  } else if (view === 'conflicts') {
    if (ND.loadConflictList) ND.loadConflictList();
  } else if (view === 'calendar') {
    loadNoteList(); // 加载笔记数据
    if (ND.loadCalendar) ND.loadCalendar();
  }
}

// ---- 排序控件 ----
const sortBySelect = document.getElementById('sort-by');
const sortAscBtn  = document.getElementById('sort-asc');
const sortDescBtn = document.getElementById('sort-desc');

sortBySelect.addEventListener('change', () => {
  ND.sortBy = sortBySelect.value;
  loadNoteList();
});

sortAscBtn.addEventListener('click', () => {
  ND.sortDir = 'asc';
  sortAscBtn.classList.add('active');
  sortDescBtn.classList.remove('active');
  loadNoteList();
});

sortDescBtn.addEventListener('click', () => {
  ND.sortDir = 'desc';
  sortDescBtn.classList.add('active');
  sortAscBtn.classList.remove('active');
  loadNoteList();
});

// ---- 回收站操作 ----
document.getElementById('btn-empty-trash').addEventListener('click', async () => {
  await window.electronAPI.emptyTrash();
  ND.statusLeft.textContent = '回收站已清空';
  await loadTrashList();
});

// ---- 导入按钮 ----
document.getElementById('btn-open').addEventListener('click', async () => {
  await saveCurrentNote();
  await handleImportNote();
});

// ---- 侧边栏空白区域右键菜单 ----
ND.noteListEl.addEventListener('contextmenu', (e) => {
  // 仅在点击空白区域（而非 .note-item）时显示空白区域菜单
  if (!e.target.closest('.note-item')) {
    showEmptyContextMenu(e);
  }
});

// ---- 导入文件处理 ----
ND.importFileInput.addEventListener('change', async () => {
  const file = ND.importFileInput.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const defaultName = await window.electronAPI.getNextDefaultName();
    const title = file.name.replace(/\.(txt|md|markdown)$/i, '') || defaultName.title;
    const result = await window.electronAPI.createNote(title);
    await window.electronAPI.saveNote(result.filePath, text);
    await saveCurrentNote();
    ND.currentNote = { filePath: result.filePath, fileName: result.fileName, displayName: title, mtime: Date.now() };
    ND.currentContent = text;
    ND.lastSavedContent = text;
    showEditor();
    if (ND.editorTitleInput) ND.editorTitleInput.value = title;
    // 将导入的纯文本转换为 HTML（换行 → <br>）
    ND.editorDiv.innerHTML = text.split('\n').map(line =>
      line ? escapeHtml(line) : '<br>'
    ).join('<br>');
    await loadNoteList();
    renderNoteList();
    updateStatus();
    ND.statusLeft.textContent = `已导入: ${title}`;
  } catch (err) {
    ND.statusLeft.textContent = '导入失败: ' + err.message;
  }
});

/**
 * 切换到指定工具栏标签页（支持动态数量的标签）
 * @param {string} targetTab - data-tab 值
 */
function switchToolbarTab(targetTab) {
  document.querySelectorAll('.toolbar-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === targetTab);
  });
  document.querySelectorAll('.toolbar-actions[id^="toolbar-"]').forEach(panel => {
    const panelTab = panel.id.replace('toolbar-', '');
    panel.style.display = panelTab === targetTab ? '' : 'none';
  });
}

// ---- 工具栏标签切换 ----
document.querySelectorAll('.toolbar-tab').forEach(tab => {
  tab.addEventListener('click', () => switchToolbarTab(tab.dataset.tab));
});

// 暴露到 ND 供其他模块调用
ND.switchToolbarTab = switchToolbarTab;
