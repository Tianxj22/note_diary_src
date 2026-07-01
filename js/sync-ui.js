/**
 * @file         js/sync-ui.js
 * @description  Note Diary — 同步工具栏标签页 UI 交互（pull/push/status/冲突提示）
 * @author       tianxj22
 * @created      2026-06-29
 * @updated      2026-06-29
 * @version      1.0.0
 */

(function () {
  var ND = window.ND;

  /** 同步状态刷新定时器 */
  var syncRefreshTimer = null;

  /**
   * 刷新同步状态显示
   */
  async function refreshSyncStatus() {
    try {
      var status = await window.electronAPI.gitStatus();
      var statusEl = document.getElementById('sync-status-text');
      if (!statusEl) return;

      if (!status || status.error) {
        statusEl.textContent = '⚠ 未初始化';
        statusEl.className = 'sync-status-label sync-error';
        return;
      }

      var hasConflicts = await window.electronAPI.gitHasConflicts();
      if (hasConflicts && hasConflicts.hasConflicts) {
        statusEl.textContent = '⚠ ' + hasConflicts.conflictFiles.length + ' 个冲突';
        statusEl.className = 'sync-status-label sync-warning';
        // 同步更新徽标（不切换视图，不重复 IPC 调用）
        ND.conflictFiles = hasConflicts.conflictFiles;
        if (ND.renderConflictList) ND.renderConflictList();
        return;
      }

      // 无冲突时也更新徽标（可能之前的冲突已被解决）
      if (ND.conflictFiles && ND.conflictFiles.length > 0) {
        ND.conflictFiles = [];
        if (ND.renderConflictList) ND.renderConflictList();
      }

      if (status.clean) {
        statusEl.textContent = '✓ 已同步';
        statusEl.className = 'sync-status-label sync-ok';
      } else {
        statusEl.textContent = status.changedCount + ' 个文件待同步';
        statusEl.className = 'sync-status-label sync-pending';
      }
    } catch (e) {
      var statusEl = document.getElementById('sync-status-text');
      if (statusEl) {
        statusEl.textContent = '未配置';
        statusEl.className = 'sync-status-label';
      }
    }
  }

  /**
   * 拉取远程更新
   */
  async function pullRemote() {
    setSyncStatus('拉取中...', '');
    try {
      var result = await window.electronAPI.gitPull();
      if (result.success) {
        setSyncStatus('✓ ' + result.message, 'sync-ok');
        // 刷新笔记列表
        await loadNoteList();
        renderNoteList();
      } else if (result.hasConflicts) {
        setSyncStatus('⚠ 有冲突，请手动解决', 'sync-warning');
        switchView('conflicts');
      } else {
        setSyncStatus('✗ ' + result.message, 'sync-error');
      }
    } catch (e) {
      setSyncStatus('✗ 拉取失败: ' + e.message, 'sync-error');
    }
    // 延迟刷新状态
    setTimeout(refreshSyncStatus, 1000);
  }

  /**
   * 推送本地更改
   */
  async function pushLocal() {
    setSyncStatus('推送中...', '');
    try {
      var result = await window.electronAPI.gitPush();
      if (result.success) {
        setSyncStatus('✓ ' + result.message, 'sync-ok');
      } else {
        setSyncStatus('✗ ' + result.message, 'sync-error');
      }
    } catch (e) {
      setSyncStatus('✗ 推送失败: ' + e.message, 'sync-error');
    }
    setTimeout(refreshSyncStatus, 1000);
  }

  /**
   * 设置同步状态文字
   * @param {string} text
   * @param {string} className
   */
  function setSyncStatus(text, className) {
    var el = document.getElementById('sync-status-text');
    if (el) {
      el.textContent = text;
      el.className = 'sync-status-label ' + (className || '');
    }
  }

  /**
   * 初始化同步标签页
   */
  function initSyncTab() {
    var pullBtn = document.getElementById('btn-sync-pull');
    var pushBtn = document.getElementById('btn-sync-push');
    var commitBtn = document.getElementById('btn-sync-commit');

    if (pullBtn) pullBtn.addEventListener('click', pullRemote);
    if (pushBtn) pushBtn.addEventListener('click', pushLocal);
    if (commitBtn) {
      commitBtn.addEventListener('click', async function () {
        setSyncStatus('提交中...', '');
        try {
          var result = await window.electronAPI.gitCommit('手动提交: ' + new Date().toLocaleString());
          if (result.success) {
            setSyncStatus('✓ ' + result.message, 'sync-ok');
          } else {
            setSyncStatus('✗ ' + result.message, 'sync-error');
          }
        } catch (e) {
          setSyncStatus('✗ 提交失败', 'sync-error');
        }
        setTimeout(refreshSyncStatus, 1000);
      });
    }

    // 切换到同步标签页时自动刷新状态
    document.addEventListener('click', function (e) {
      var tab = e.target.closest('.toolbar-tab');
      if (tab && tab.dataset.tab === 'sync') {
        refreshSyncStatus();
      }
    });

    // 定期刷新状态（如果同步标签页可见）
    syncRefreshTimer = setInterval(function () {
      var syncPanel = document.getElementById('toolbar-sync');
      if (syncPanel && syncPanel.style.display !== 'none') {
        refreshSyncStatus();
      }
    }, 30000); // 每 30 秒刷新
  }

  // 页面加载后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSyncTab);
  } else {
    initSyncTab();
  }
})();
