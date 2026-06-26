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
  // 保存上一个笔记（此时 textarea 仍有效）
  if (prevNote && ND.editorDiv) {
    const content = ND.editorDiv.innerHTML;
    if (content !== ND.lastSavedContent) {
      await window.electronAPI.saveNote(prevNote.filePath, content);
    }
  }
  ND.currentNote = note;
  ND.currentContent = await window.electronAPI.readNote(note.filePath);
  // 兼容旧纯文本笔记：将换行转换为 HTML <br>
  if (!/^\s*</.test(ND.currentContent)) {
    ND.currentContent = ND.currentContent.split('\n').map(line =>
      line ? escapeHtml(line) : '<br>'
    ).join('<br>');
  }
  ND.lastSavedContent = ND.currentContent;
  showEditor();
  ND.editorTitleInput.value = note.displayName;
  ND.editorDiv.innerHTML = ND.currentContent;
  ND.editorDiv.focus();
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
  await loadNoteList();
  renderNoteList();
  updateStatus();
}

// ---- 保存当前笔记 ----
async function saveCurrentNote() {
  if (!ND.currentNote || !ND.editorDiv) return;
  const content = ND.editorDiv.innerHTML;
  if (content === ND.lastSavedContent) return;
  const ok = await window.electronAPI.saveNote(ND.currentNote.filePath, content);
  if (ok) {
    ND.lastSavedContent = content;
    ND.currentNote.mtime = Date.now();
    ND.statusLeft.textContent = '已保存';
    setTimeout(() => { if (ND.statusLeft.textContent === '已保存') updateStatus(); }, 1500);
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
  const content = ND.editorDiv.innerHTML;
  if (content === ND.lastSavedContent) return;
  const ok = await window.electronAPI.saveNote(ND.currentNote.filePath, content);
  if (ok) {
    ND.lastSavedContent = content;
    ND.currentNote.mtime = Date.now();
    ND.statusLeft.textContent = '已保存';
    setTimeout(() => { if (ND.statusLeft.textContent === '已保存') updateStatus(); }, 1500);
    await loadNoteList();
    renderNoteList();
  }
}

// ---- 关闭当前笔记 ----
async function closeCurrentNote() {
  if (!ND.currentNote) return;
  // 先保存当前内容
  if (ND.editorDiv) {
    const content = ND.editorDiv.innerHTML;
    if (content !== ND.lastSavedContent) {
      await window.electronAPI.saveNote(ND.currentNote.filePath, content);
    }
  }
  if (ND.saveTimer) { clearTimeout(ND.saveTimer); ND.saveTimer = null; }
  deselectImage();
  ND.currentNote = null;
  ND.currentContent = '';
  ND.lastSavedContent = '';
  hideEditor();
  updateStatus();
}

// ---- 编辑器显示 ----
function showEditor() {
  ND.editorArea.innerHTML = '';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn-close-note';
  closeBtn.textContent = '×';
  closeBtn.title = '关闭当前笔记';
  closeBtn.addEventListener('click', (e) => { e.stopPropagation(); closeCurrentNote(); });
  ND.editorArea.appendChild(closeBtn);
  ND.editorTitleInput = document.createElement('input');
  ND.editorTitleInput.type = 'text';
  ND.editorTitleInput.className = 'editor-title-input';
  ND.editorTitleInput.placeholder = '笔记标题...';
  ND.editorTitleInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (ND.currentNote) {
        const newTitle = ND.editorTitleInput.value.trim();
        if (newTitle && newTitle !== ND.currentNote.displayName) {
          const result = await window.electronAPI.renameNote(ND.currentNote.filePath, newTitle);
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
  ND.editorDiv = document.createElement('div');
  ND.editorDiv.className = 'editor-content';
  ND.editorDiv.contentEditable = 'true';
  ND.editorDiv.addEventListener('input', onEditorInput);
  ND.editorDiv.addEventListener('keydown', onEditorKeydown);
  ND.editorDiv.addEventListener('paste', onEditorPaste);
  ND.editorArea.appendChild(ND.editorDiv);
  // 图片缩放手柄容器
  const resizeCtn = document.createElement('div');
  resizeCtn.className = 'image-resize-container';
  resizeCtn.id = 'image-resize-container';
  ND.editorArea.appendChild(resizeCtn);
}

// ---- 编辑器隐藏 ----
function hideEditor() {
  ND.editorArea.innerHTML = '<div class="no-note">选择或新建一篇笔记开始编辑</div>';
  ND.editorDiv = null;
  ND.editorTitleInput = null;
  ND.selectedImage = null;
  ND.resizeHandles = [];
}

// ---- 状态栏 ----
function updateStatus() {
  if (ND.currentNote) {
    ND.statusLeft.textContent = `当前: ${ND.currentNote.displayName}`;
  } else {
    ND.statusLeft.textContent = '就绪';
  }
}
