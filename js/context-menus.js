// ============================================================
// context-menus.js — 右键上下文菜单显示/隐藏 + 菜单项绑定 + 关闭逻辑
// 依赖：ND.contextMenu, ND.contextMenuEmpty, ND.contextMenuTrash,
//       ND.contextNote, ND.noteListEl, ND.importFileInput, ND.editorTitleInput
// ============================================================

/**
 * 显示右键上下文菜单
 * @param {MouseEvent} e - 鼠标事件
 * @param {object} note - 笔记对象
 */
function showContextMenu(e, note) {
  ND.contextNote = note;
  ND.contextMenu.style.left = e.clientX + 'px';
  ND.contextMenu.style.top = e.clientY + 'px';
  ND.contextMenu.classList.add('visible');
}

/**
 * 隐藏右键上下文菜单
 */
function hideContextMenu() {
  ND.contextMenu.classList.remove('visible');
  ND.contextNote = null;
}

/**
 * 显示侧边栏空白区域右键菜单
 * @param {MouseEvent} e - 鼠标事件
 */
function showEmptyContextMenu(e) {
  e.preventDefault();
  ND.contextMenuEmpty.style.left = e.clientX + 'px';
  ND.contextMenuEmpty.style.top = e.clientY + 'px';
  ND.contextMenuEmpty.classList.add('visible');
}

/**
 * 隐藏侧边栏空白区域右键菜单
 */
function hideEmptyContextMenu() {
  ND.contextMenuEmpty.classList.remove('visible');
}

// ---- 回收站右键菜单 ----
function showTrashContextMenu(e, trashNote) {
  ND.contextNote = trashNote;
  ND.contextMenuTrash.style.left = e.clientX + 'px';
  ND.contextMenuTrash.style.top = e.clientY + 'px';
  ND.contextMenuTrash.classList.add('visible');
}

// ---- 导入外部文本文件作为新笔记 ----
async function handleImportNote() {
  hideEmptyContextMenu();
  ND.importFileInput.value = '';
  ND.importFileInput.click();
}

// ---- 笔记操作 ----

/**
 * 删除当前右键选中的笔记
 */
async function handleDelete() {
  if (!ND.contextNote) return;
  const name = ND.contextNote.displayName;
  // 如果删除的是当前笔记，先关闭（保存内容 + 清空状态），避免编辑框残留指向已删除文件
  const isCurrentNote = ND.currentNote && ND.currentNote.filePath === ND.contextNote.filePath;
  if (isCurrentNote) {
    await closeCurrentNote();
  }

  const nameNumber = parseDefaultNameNumber(name);
  const ok = await window.electronAPI.deleteNote(ND.contextNote.filePath);
  if (ok) {
    if (nameNumber !== null) {
      await window.electronAPI.releaseNameNumber(nameNumber);
    }
    ND.statusLeft.textContent = `已移至回收站: ${name}`;
    await loadNoteList();
    // 删除的是当前笔记：有剩余则打开第一篇，无则回欢迎页
    if (isCurrentNote) {
      if (ND.notes.length > 0) {
        await selectNote(ND.notes[0]);
      }
    }
    updateStatus();
  }
  hideContextMenu();
}

/**
 * 复制（创建副本）当前右键选中的笔记
 */
async function handleDuplicate() {
  if (!ND.contextNote) return;
  const result = await window.electronAPI.duplicateNote(ND.contextNote.filePath);
  if (result) {
    ND.statusLeft.textContent = `已复制: ${ND.contextNote.displayName}`;
    await loadNoteList();
    renderNoteList();
  }
  hideContextMenu();
}

/**
 * 剪切当前右键选中的笔记（移至剪贴板目录）
 */
async function handleCut() {
  if (!ND.contextNote) return;

  // 如果剪切的是当前笔记，先关闭再移动文件
  const isCurrentNote = ND.currentNote && ND.currentNote.filePath === ND.contextNote.filePath;
  if (isCurrentNote) {
    await closeCurrentNote();
  }

  const result = await window.electronAPI.cutNote(ND.contextNote.filePath);
  if (result) {
    ND.statusLeft.textContent = `已剪切: ${ND.contextNote.displayName}`;
    await loadNoteList();
    renderNoteList();
    if (isCurrentNote) {
      if (ND.notes.length > 0) {
        await selectNote(ND.notes[0]);
      } else {
        await createNewNote();
      }
    }
    updateStatus();
  }
  hideContextMenu();
}

/**
 * 开始内联重命名侧边栏中的笔记项
 * @param {object} note - 笔记对象
 */
async function startRename() {
  if (!ND.contextNote) return;
  const note = ND.contextNote;
  hideContextMenu();

  // 在侧边栏中找到对应 DOM 元素
  const items = ND.noteListEl.querySelectorAll('.note-item');
  let targetItem = null;
  items.forEach(item => {
    const titleEl = item.querySelector('.title');
    if (titleEl && titleEl.textContent === note.displayName) {
      targetItem = item;
    }
  });
  if (!targetItem) return;

  const titleEl = targetItem.querySelector('.title');
  const oldTitle = note.displayName;

  // 替换为 input
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'rename-input';
  input.value = oldTitle;
  titleEl.replaceWith(input);
  input.focus();
  input.select();

  /**
   * 确认重命名
   */
  const confirmRename = async () => {
    const newTitle = input.value.trim();
    if (!newTitle || newTitle === oldTitle) {
      // 取消：还原 title
      input.replaceWith(titleEl);
      return;
    }
    const result = await window.electronAPI.renameNote(note.filePath, newTitle);
    if (result) {
      ND.statusLeft.textContent = `已重命名: ${oldTitle} → ${newTitle}`;
      await loadNoteList();
      // 如果重命名的是当前打开的笔记，更新 currentNote
      if (ND.currentNote && ND.currentNote.filePath === note.filePath) {
        ND.currentNote.filePath = result.filePath;
        ND.currentNote.fileName = result.fileName;
        ND.currentNote.displayName = newTitle;
        if (ND.editorTitleInput) ND.editorTitleInput.value = newTitle;
      }
      updateStatus();
    } else {
      input.replaceWith(titleEl);
    }
  };

  input.addEventListener('blur', confirmRename);
  input.addEventListener('keydown', (ke) => {
    if (ke.key === 'Enter') {
      input.blur(); // 触发 blur → confirmRename
    } else if (ke.key === 'Escape') {
      input.value = oldTitle;
      input.blur();
    }
  });
}

// ---- 回收站操作 ----
async function handleRestoreFromTrash() {
  if (!ND.contextNote) return;
  const note = ND.contextNote;
  const result = await window.electronAPI.restoreFromTrash(note.fileName);
  if (result) {
    ND.statusLeft.textContent = `已恢复: ${note.displayName}`;
    await loadTrashList();
    await loadNoteList();
  }
  ND.contextMenuTrash.classList.remove('visible');
}

async function handlePermanentDelete() {
  if (!ND.contextNote) return;
  const note = ND.contextNote;
  const nameNumber = parseDefaultNameNumber(note.displayName);
  const ok = await window.electronAPI.permanentlyDelete(note.fileName);
  if (ok) {
    if (nameNumber !== null) {
      await window.electronAPI.releaseNameNumber(nameNumber);
    }
    ND.statusLeft.textContent = `已永久删除: ${note.displayName}`;
    await loadTrashList();
  }
  ND.contextMenuTrash.classList.remove('visible');
}

// ---- 右键菜单项点击绑定 ----

// 普通笔记右键菜单
ND.contextMenu.querySelectorAll('.menu-item').forEach(item => {
  item.addEventListener('click', () => {
    const action = item.dataset.action;
    if (action === 'rename') startRename();
    else if (action === 'duplicate') handleDuplicate();
    else if (action === 'cut') handleCut();
    else if (action === 'delete') handleDelete();
  });
});

// 空白区域右键菜单项点击
ND.contextMenuEmpty.querySelectorAll('.menu-item').forEach(item => {
  item.addEventListener('click', () => {
    const action = item.dataset.action;
    if (action === 'new-note') {
      hideEmptyContextMenu();
      createNewNote();
    } else if (action === 'import-note') {
      handleImportNote();
    }
  });
});

// 回收站右键菜单项点击
ND.contextMenuTrash.querySelectorAll('.menu-item').forEach(item => {
  item.addEventListener('click', () => {
    const action = item.dataset.action;
    if (action === 'restore') handleRestoreFromTrash();
    else if (action === 'delete-permanent') handlePermanentDelete();
  });
});

// ---- 点击菜单外部关闭 ----
document.addEventListener('click', (e) => {
  if (!ND.contextMenu.contains(e.target)) {
    hideContextMenu();
  }
  if (!ND.contextMenuEmpty.contains(e.target)) {
    hideEmptyContextMenu();
  }
  if (!ND.contextMenuTrash.contains(e.target)) {
    ND.contextMenuTrash.classList.remove('visible');
  }
  if (!e.target.closest('#dropdown-image')) {
    ND.dropdownImageMenu.classList.remove('visible');
  }
});
