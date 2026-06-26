/**
 * @file         js/sidebar-ops.js
 * @description  Note Diary — 侧边栏笔记操作（新建/删除/复制/剪切/重命名/导入）
 * @author       tianxj22
 * @created      2026-06-24
 * @updated      2026-06-26
 * @version      1.0.0
 */

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

/**
 * 导入外部文本文件作为新笔记
 */
async function handleImportNote() {
  hideEmptyContextMenu();
  ND.importFileInput.value = '';
  ND.importFileInput.click();
}

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
