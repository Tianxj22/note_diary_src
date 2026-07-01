/**
 * @file         js/conflict-ui.js
 * @description  Note Diary — 冲突解决 UI：侧边栏冲突列表 + 分栏对比预览 + 逐文件/批量解决
 * @author       tianxj22
 * @created      2026-06-29
 * @updated      2026-06-29
 * @version      1.0.0
 */

(function () {
  var ND = window.ND;

  /** 当前冲突文件列表缓存 */
  ND.conflictFiles = [];

  /**
   * 从 Git 同步模块加载冲突文件列表（渲染进程侧通过 IPC 调用）
   */
  async function loadConflictList() {
    try {
      var result = await window.electronAPI.gitHasConflicts();
      if (result && result.hasConflicts) {
        ND.conflictFiles = result.conflictFiles || [];
      } else {
        ND.conflictFiles = [];
      }
    } catch (e) {
      ND.conflictFiles = [];
    }
    renderConflictList();
  }

  /**
   * 渲染侧边栏冲突列表
   */
  function renderConflictList() {
    // 始终更新冲突标签页徽标和批量操作栏（即使不在冲突视图）
    var badge = document.querySelector('.sidebar-tab.conflict-tab .badge');
    if (badge) {
      badge.textContent = ND.conflictFiles.length;
      badge.classList.toggle('hidden', ND.conflictFiles.length === 0);
    }

    var bulkBar = document.getElementById('conflict-bulk-actions');
    if (bulkBar) {
      bulkBar.classList.toggle('visible', ND.conflictFiles.length > 0);
    }

    // 只有当前在冲突视图时才渲染列表项（避免覆盖工作区/回收站列表）
    var el = ND.noteListEl;
    if (!el || ND.activeView !== 'conflicts') return;

    el.innerHTML = '';

    if (ND.conflictFiles.length === 0) {
      el.innerHTML = '<div class="empty">无冲突</div>';
      return;
    }

    ND.conflictFiles.forEach(function (fileName) {
      var div = document.createElement('div');
      div.className = 'note-item conflict-item';

      var info = document.createElement('div');
      info.className = 'conflict-info';
      var displayName = fileName.replace(/\.(html|txt)$/, '');
      info.innerHTML = '<div class="title">⚠ ' + escapeHtml(displayName) + '</div>';

      var actions = document.createElement('div');
      actions.className = 'conflict-actions';

      var btnLocal = document.createElement('button');
      btnLocal.className = 'conflict-btn local';
      btnLocal.textContent = '本地';
      btnLocal.title = '保留本地版本';
      btnLocal.addEventListener('click', function (e) {
        e.stopPropagation();
        resolveConflict(fileName, 'local');
      });

      var btnRemote = document.createElement('button');
      btnRemote.className = 'conflict-btn remote';
      btnRemote.textContent = '远程';
      btnRemote.title = '保留远程版本';
      btnRemote.addEventListener('click', function (e) {
        e.stopPropagation();
        resolveConflict(fileName, 'remote');
      });

      var btnBoth = document.createElement('button');
      btnBoth.className = 'conflict-btn both';
      btnBoth.textContent = '保留双方';
      btnBoth.title = '两者都保留';
      btnBoth.addEventListener('click', function (e) {
        e.stopPropagation();
        resolveConflict(fileName, 'both');
      });

      actions.appendChild(btnLocal);
      actions.appendChild(btnRemote);
      actions.appendChild(btnBoth);

      div.appendChild(info);
      div.appendChild(actions);

      // 点击预览对比
      div.addEventListener('click', function () {
        previewConflict(fileName);
      });

      el.appendChild(div);
    });
  }

  /**
   * 解决单个冲突
   * @param {string} fileName
   * @param {string} strategy - 'local' | 'remote' | 'both'
   */
  async function resolveConflict(fileName, strategy) {
    ND.statusLeft.textContent = '解决冲突中...';
    try {
      if (strategy === 'both') {
        // 保留双方：先保留本地，再将远程文件重命名保留
        await window.electronAPI.gitResolve('local', fileName);
        // 远程版本保留为独立文件（由文件系统操作，在 main 进程处理）
        var remoteResult = await window.electronAPI.gitCheckoutTheirs(fileName);
        if (!remoteResult || !remoteResult.success) {
          ND.statusLeft.textContent = '保留双方失败';
          return;
        }
      } else {
        await window.electronAPI.gitResolve(strategy, fileName);
      }
      ND.statusLeft.textContent = '冲突已解决: ' + fileName;
      hideConflictPreview();
      await loadConflictList();
      await loadNoteList();
      renderNoteList();
    } catch (e) {
      ND.statusLeft.textContent = '解决冲突失败: ' + e.message;
    }
  }

  /**
   * 批量解决所有冲突
   * @param {string} strategy - 'local' | 'remote'
   */
  async function resolveAllConflicts(strategy) {
    ND.statusLeft.textContent = '批量解决冲突中...';
    try {
      await window.electronAPI.gitResolve(strategy);
      ND.statusLeft.textContent = '全部冲突已解决';
      hideConflictPreview();
      await loadConflictList();
      await loadNoteList();
      renderNoteList();
    } catch (e) {
      ND.statusLeft.textContent = '批量解决失败: ' + e.message;
    }
  }

  /**
   * 打开冲突对比预览
   * @param {string} fileName
   */
  async function previewConflict(fileName) {
    // 读取本地当前文件内容
    var raw = '';
    try {
      // 从当前加载的笔记中获取，或直接调用 git show
      // 简单方案：显示冲突标记本身作为对比
      var remoteResult = await window.electronAPI.readNote(
        ND.currentNote ? ND.currentNote.filePath.replace(ND.currentNote.fileName, fileName) : ''
      );
    } catch (_) {}

    // 使用 git show 获取不同版本
    try {
      var localContent = await window.electronAPI.gitShowLocal(fileName);
      var remoteContent = await window.electronAPI.gitShowRemote(fileName);

      var diff = diffLines(localContent || '', remoteContent || '');

      // 渲染分栏对比
      var localPanel = document.getElementById('conflict-local-panel');
      var remotePanel = document.getElementById('conflict-remote-panel');
      var previewTitle = document.getElementById('conflict-preview-title');

      if (previewTitle) previewTitle.textContent = '对比: ' + fileName;
      if (localPanel) localPanel.innerHTML = renderDiffPanel(diff.local, '本地版本');
      if (remotePanel) remotePanel.innerHTML = renderDiffPanel(diff.remote, '远程版本');

      // 设置预览中的解决按钮
      var resolveBtns = document.querySelectorAll('.conflict-preview-actions .resolve-btn');
      resolveBtns.forEach(function (btn) {
        btn.onclick = function () {
          resolveConflict(fileName, btn.dataset.strategy);
        };
      });

      var overlay = document.getElementById('conflict-preview-overlay');
      if (overlay) overlay.classList.add('visible');
    } catch (e) {
      ND.statusLeft.textContent = '无法加载差异对比: ' + e.message;
    }
  }

  /**
   * 渲染分栏 diff 面板
   * @param {Array<{text:string, type:string}>} lines
   * @param {string} label
   * @returns {string} HTML
   */
  function renderDiffPanel(lines, label) {
    var html = '<div class="panel-label">' + label + '</div>';
    lines.forEach(function (line) {
      html += '<div class="diff-line ' + line.type + '">' + escapeHtml(line.text) + '</div>';
    });
    return html;
  }

  /**
   * 隐藏冲突预览
   */
  function hideConflictPreview() {
    var overlay = document.getElementById('conflict-preview-overlay');
    if (overlay) overlay.classList.remove('visible');
  }

  // ---- 事件绑定 ----

  // 批量操作按钮
  document.addEventListener('DOMContentLoaded', function () {
    var btnBulkLocal = document.getElementById('btn-bulk-local');
    var btnBulkRemote = document.getElementById('btn-bulk-remote');
    if (btnBulkLocal) btnBulkLocal.addEventListener('click', function () { resolveAllConflicts('local'); });
    if (btnBulkRemote) btnBulkRemote.addEventListener('click', function () { resolveAllConflicts('remote'); });

    // 预览关闭按钮
    var closeBtn = document.getElementById('conflict-preview-close');
    if (closeBtn) closeBtn.addEventListener('click', hideConflictPreview);

    // 点击遮罩关闭
    var overlay = document.getElementById('conflict-preview-overlay');
    if (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) hideConflictPreview();
      });
    }
  });

  // 暴露到 ND
  ND.loadConflictList = loadConflictList;
  ND.renderConflictList = renderConflictList;
})();
