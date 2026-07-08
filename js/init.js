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
document.getElementById('btn-export-pdf').addEventListener('click', () => { if (ND.exportToPdf) ND.exportToPdf(); });
document.getElementById('btn-export-md').addEventListener('click', () => { if (ND.exportToMarkdown) ND.exportToMarkdown(); });
document.getElementById('btn-settings').addEventListener('click', () => ND.showSettingsModal());

// ---- 主题切换 ----
document.getElementById('btn-theme-toggle').addEventListener('click', toggleTheme);

/**
 * 应用主题
 * @param {string} theme - 'light' | 'dark'
 */
function applyTheme(theme) {
  ND.currentTheme = theme;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  // 更新按钮图标
  var themeBtn = document.getElementById('btn-theme-toggle');
  if (themeBtn) {
    themeBtn.textContent = theme === 'dark' ? '☀️' : '🌓';
  }
}

/**
 * 切换主题（含持久化）
 */
function toggleTheme() {
  var newTheme = ND.currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
  // 持久化到设置
  try {
    window.electronAPI.updateSettings({ general: { theme: newTheme } }, null);
  } catch (_) {}
}

// 暴露到 ND 供 settings 调用
ND.applyTheme = applyTheme;
ND.toggleTheme = toggleTheme;

// ---- 快捷键动作分发表 ----
var shortcutActions = {
  'file.new':       function () { createNewNote(); },
  'file.save':      function () { manualSave(); },
  'file.close':     function () { if (ND.editorDiv) closeCurrentNote(); },
  'file.import':    null,
  'edit.undo':      function () { if (ND.editorDiv) document.execCommand('undo'); },
  'edit.redo':      function () { if (ND.editorDiv) document.execCommand('redo'); },
  'edit.find':      function () { if (ND.editorDiv) ND.toggleFindBar(); },
  'edit.replace':   function () {
    if (!ND.editorDiv) return;
    var bar = document.getElementById('find-bar');
    if (bar && !bar.classList.contains('visible')) ND.toggleFindBar();
    var ri = document.getElementById('replace-input');
    if (ri) setTimeout(function () { ri.focus(); ri.select(); }, 50);
  },
  'edit.selectAll': function () { if (ND.editorDiv) document.execCommand('selectAll'); },
  'format.bold':        function () { if (ND.editorDiv) document.execCommand('bold'); },
  'format.italic':      function () { if (ND.editorDiv) document.execCommand('italic'); },
  'format.underline':   function () { if (ND.editorDiv) document.execCommand('underline'); },
  'format.strikethrough': function () { if (ND.editorDiv) document.execCommand('strikeThrough'); },
  'format.removeFormat':  function () { if (ND.editorDiv) document.execCommand('removeFormat'); },
  'format.orderedList':   function () { if (ND.editorDiv) { ND.editorDiv.focus(); document.execCommand('insertOrderedList'); document.execCommand('insertHTML', false, '<br>'); } },
  'format.unorderedList': function () { if (ND.editorDiv) { ND.editorDiv.focus(); document.execCommand('insertUnorderedList'); document.execCommand('insertHTML', false, '<br>'); } },
  'format.indent':    function () { if (ND.editorDiv) document.execCommand('indent'); },
  'format.outdent':   function () { if (ND.editorDiv) document.execCommand('outdent'); },
  'insert.checklist': function () { if (ND.editorDiv) insertChecklist(); },
  'insert.timestamp': function () { if (ND.editorDiv) insertTimestamp(); },
  'insert.image':     function () { if (ND.editorDiv) insertImageFromFile(); },
  'insert.codeblock': function () { if (ND.editorDiv) ND.showCodeBlockModal(null); },
  'insert.video':     function () { if (ND.editorDiv && ND.btnInsertVideo) ND.btnInsertVideo.click(); },
  'view.toggleDraw':  function () { if (ND.editorDiv) toggleDrawingMode(); },
  'search.global':    function () {
    if (ND.activeView !== 'workspace') switchView('workspace');
    var si = document.getElementById('search-input');
    if (si) { si.focus(); si.select(); }
  },
};

/** 解析后的快捷键映射: shortcutString → actionId */
var parsedBindings = {};

/**
 * 解析快捷键字符串为 keydown 匹配参数
 */
function parseShortcut(s) {
  if (!s) return null;
  var parts = s.split('+');
  var r = { ctrl: false, shift: false, alt: false, key: '' };
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i].trim();
    if (p === 'Ctrl' || p === 'Control') r.ctrl = true;
    else if (p === 'Shift') r.shift = true;
    else if (p === 'Alt') r.alt = true;
    else r.key = p;
  }
  return r;
}

/**
 * 匹配按键组合
 */
function matchShortcut(e, parsed) {
  if (!parsed) return false;
  if (parsed.ctrl !== (e.ctrlKey || e.metaKey)) return false;
  if (parsed.shift !== e.shiftKey) return false;
  if (parsed.alt !== e.altKey) return false;
  var ek = e.key;
  // 字母大小写不敏感
  if (parsed.key.toLowerCase() === ek.toLowerCase()) return true;
  // 处理特殊键名
  if (parsed.key === 'Tab' && ek === 'Tab') return true;
  return false;
}

/**
 * 重新加载快捷键映射
 */
async function reloadBindings() {
  try {
    var kb = await window.electronAPI.getKeybindings();
    parsedBindings = {};
    var b = kb.bindings;
    for (var id in b) {
      if (b[id]) parsedBindings[b[id]] = id;
    }
  } catch (_) { /* 使用空映射，快捷键不生效 */ }
}

// ---- 全局快捷键 ----
document.addEventListener('keydown', function (e) {
  var ctrl = e.ctrlKey || e.metaKey;

  // Escape: 关闭所有弹出层
  if (e.key === 'Escape') {
    hideContextMenu();
    hideEmptyContextMenu();
    hideEditorContextMenu();
    ND.contextMenuTrash.classList.remove('visible');
  }

  // 跳过在输入框中的快捷键（除了 Escape）
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  // 动态快捷键匹配
  for (var shortcut in parsedBindings) {
    var parsed = parseShortcut(shortcut);
    if (matchShortcut(e, parsed)) {
      e.preventDefault();
      var actionId = parsedBindings[shortcut];
      var fn = shortcutActions[actionId];
      if (fn) fn();
      return;
    }
  }

  // 绘图模式下 Ctrl+Z/Ctrl+Y → 快照撤销/重做（不受 keybindings 影响）
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

// 页面加载时加载快捷键配置 + 首选项
reloadBindings();
(async function loadPreferences() {
  try {
    var settings = await window.electronAPI.getSettings();
    if (settings && settings.general) {
      ND.prefFontSize = settings.general.fontSize || '0.95';
      ND.prefLineHeight = settings.general.lineHeight || '1.8';
    }
    // 加载自动保存设置
    if (settings && settings.autoSave) {
      ND.autoSaveEnabled = settings.autoSave.enabled !== false;  // 默认 true
      ND.autoSaveDelay = settings.autoSave.delayMs || 3000;
    }
    // 加载主题设置
    if (settings && settings.general && settings.general.theme) {
      applyTheme(settings.general.theme);
    }
    // 加载自定义标签
    if (settings && settings.general && Array.isArray(settings.general.customTags)) {
      ND.customTags = settings.general.customTags;
    }
  } catch (_) {
    ND.prefFontSize = '0.95';
    ND.prefLineHeight = '1.8';
  }
})();

// ---- 崩溃恢复检查 ----
(async function checkRecovery() {
  try {
    var recoveryData = await window.electronAPI.readRecovery();
    if (!recoveryData) return;
    // 有未保存的恢复数据，显示恢复弹窗
    var recoveryOverlay = document.getElementById('recovery-overlay');
    var recoveryNoteName = document.getElementById('recovery-note-name');
    var recoveryNoteTime = document.getElementById('recovery-note-time');
    if (recoveryOverlay && recoveryNoteName) {
      recoveryNoteName.textContent = recoveryData.title || '未知笔记';
      if (recoveryNoteTime) {
        var d = new Date(recoveryData.timestamp);
        recoveryNoteTime.textContent = d.toLocaleString('zh-CN');
      }
      recoveryOverlay.style.display = 'flex';
      // 绑定按钮事件
      document.getElementById('btn-recovery-restore').onclick = async function () {
        recoveryOverlay.style.display = 'none';
        // 恢复笔记：用 selectNote 正常打开获取元数据，然后覆盖为恢复内容
        if (recoveryData.filePath) {
          var noteObj = { filePath: recoveryData.filePath, fileName: recoveryData.filePath.split(/[\\/]/).pop(), displayName: recoveryData.title, mtime: recoveryData.timestamp };
          await selectNote(noteObj);
          // 用恢复内容覆盖编辑器（标记为未保存状态）
          if (ND.editorDiv && recoveryData.content) {
            ND.editorDiv.innerHTML = recoveryData.content;
            ND.statusLeft.textContent = '已恢复未保存内容 — 请手动保存';
          }
        }
      };
      document.getElementById('btn-recovery-discard').onclick = async function () {
        recoveryOverlay.style.display = 'none';
        await window.electronAPI.clearRecovery();
      };
    }
  } catch (_) {}
})();

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
