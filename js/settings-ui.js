/**
 * @file         js/settings-ui.js
 * @description  Note Diary — 设置弹窗 UI 逻辑（加载/填充/保存/关闭/测试连接）
 * @author       tianxj22
 * @created      2026-06-29
 * @updated      2026-06-29
 * @version      1.0.0
 */

(function () {
  const ND = window.ND;

  /** 当前设置缓存（从主进程加载） */
  let cachedSettings = null;

  /**
   * 显示设置弹窗
   */
  ND.showSettingsModal = async function () {
    // 从主进程加载最新设置
    try {
      cachedSettings = await window.electronAPI.getSettings();
    } catch (e) {
      console.error('Failed to load settings:', e);
      return;
    }

    populateSettingsForm(cachedSettings);
    updateAutoSyncUI(cachedSettings.sync.autoSync);

    ND.settingsOverlay.classList.add('visible');
  };

  /**
   * 隐藏设置弹窗（不保存）
   */
  function hideSettingsModal() {
    ND.settingsOverlay.classList.remove('visible');
    // 清除测试连接结果
    const testResult = document.getElementById('test-connection-result');
    if (testResult) testResult.textContent = '';
  }

  /**
   * 填充设置表单
   * @param {object} settings - 完整设置对象
   */
  function populateSettingsForm(settings) {
    const s = settings;

    // 云同步
    document.getElementById('settings-sync-enabled').checked = s.sync.enabled;
    document.getElementById('settings-auto-sync').checked = s.sync.autoSync;
    document.getElementById('settings-sync-interval').value = s.sync.autoSyncIntervalMinutes;

    // Git 配置
    document.getElementById('settings-git-remote-url').value = s.sync.git.remoteUrl || '';
    document.getElementById('settings-git-branch').value = s.sync.git.branch || 'main';
    document.getElementById('settings-git-author-name').value = s.sync.git.authorName || '';
    document.getElementById('settings-git-author-email').value = s.sync.git.authorEmail || '';

    // Token 字段：_tokenMasked 是 IPC 返回的掩码标记（tokenEncrypted 已从渲染进程响应中删除）
    const tokenInput = document.getElementById('settings-git-token');
    if (s.sync.git._tokenMasked) {
      tokenInput.value = '••••••••••••••••';
      tokenInput.dataset.hasExisting = 'true';
    } else {
      tokenInput.value = '';
      tokenInput.dataset.hasExisting = 'false';
    }

    // 通用
    document.getElementById('settings-file-extension').value = s.general.fileExtension;
  }

  /**
   * 根据自动同步开关显示/隐藏间隔设置
   * @param {boolean} enabled
   */
  function updateAutoSyncUI(enabled) {
    const intervalRow = document.getElementById('sync-interval-row');
    intervalRow.style.display = enabled ? 'flex' : 'none';
  }

  /**
   * 搜集表单数据，构建 partial 设置对象
   * @returns {object}
   */
  function collectFormData() {
    const tokenInput = document.getElementById('settings-git-token');

    const partial = {
      sync: {
        enabled: document.getElementById('settings-sync-enabled').checked,
        mode: 'git',
        autoSync: document.getElementById('settings-auto-sync').checked,
        autoSyncIntervalMinutes: parseInt(document.getElementById('settings-sync-interval').value) || 15,
        git: {
          remoteUrl: document.getElementById('settings-git-remote-url').value.trim(),
          branch: document.getElementById('settings-git-branch').value.trim() || 'main',
          authorName: document.getElementById('settings-git-author-name').value.trim(),
          authorEmail: document.getElementById('settings-git-author-email').value.trim(),
        },
      },
      general: {
        fileExtension: document.getElementById('settings-file-extension').value,
      },
    };

    // 检测 Token 是否被修改
    const tokenRaw = tokenInput.value.trim();
    const hasExisting = tokenInput.dataset.hasExisting === 'true';
    let newToken = null;
    if (tokenRaw === '' && hasExisting) {
      // 用户清空了 token → 清除
      newToken = '';
    } else if (tokenRaw !== '' && tokenRaw !== '••••••••••••••••') {
      // 用户输入了新 token
      newToken = tokenRaw;
    }
    // 如果 tokenRaw === '••••••••••••••••' 且 hasExisting，newToken 为 null → 不更新

    return { partial, newToken };
  }

  /**
   * 保存设置
   */
  async function saveSettings() {
    const { partial, newToken } = collectFormData();

    try {
      cachedSettings = await window.electronAPI.updateSettings(partial, newToken);
      hideSettingsModal();
      // 更新状态栏提示
      if (ND.statusLeft) {
        ND.statusLeft.textContent = '设置已保存';
        setTimeout(() => {
          if (ND.statusLeft.textContent === '设置已保存') {
            ND.statusLeft.textContent = '就绪';
          }
        }, 2000);
      }
    } catch (e) {
      console.error('Failed to save settings:', e);
      alert('保存设置失败: ' + e.message); // eslint-disable-line no-alert
    }
  }

  /**
   * 测试 Git 连接
   */
  async function testGitConnection() {
    const remoteUrl = document.getElementById('settings-git-remote-url').value.trim();
    const tokenInput = document.getElementById('settings-git-token');
    const resultEl = document.getElementById('test-connection-result');

    if (!remoteUrl) {
      resultEl.textContent = '请输入远程仓库 URL';
      resultEl.className = 'test-result failure';
      return;
    }

    resultEl.textContent = '测试中...';
    resultEl.className = 'test-result';

    try {
      // 使用当前输入的 token（如果是掩码则使用已存储的）
      const tokenRaw = tokenInput.value.trim();
      const hasExisting = tokenInput.dataset.hasExisting === 'true';
      let token = null;
      if (tokenRaw === '••••••••••••••••' && hasExisting) {
        // 使用已存储的 token（通过 getSettings 获取明文 → 已在 cachedSettings._tokenPlain）
        token = cachedSettings && cachedSettings.sync && cachedSettings.sync.git
          ? cachedSettings.sync.git._tokenPlain || ''
          : '';
      } else {
        token = tokenRaw;
      }

      const result = await window.electronAPI.testGitConnection({ remoteUrl, token });
      if (result.success) {
        resultEl.textContent = '✓ 连接成功';
        resultEl.className = 'test-result success';
      } else {
        resultEl.textContent = '✗ ' + (result.message || '连接失败');
        resultEl.className = 'test-result failure';
      }
    } catch (e) {
      resultEl.textContent = '✗ 测试失败: ' + e.message;
      resultEl.className = 'test-result failure';
    }
  }

  // ---- 事件绑定 ----
  document.addEventListener('DOMContentLoaded', function () {
    // 关闭按钮
    const closeBtn = document.getElementById('settings-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', hideSettingsModal);
    }

    // 取消按钮
    const cancelBtn = document.getElementById('settings-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', hideSettingsModal);
    }

    // 保存按钮
    const saveBtn = document.getElementById('settings-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', saveSettings);
    }

    // 点击遮罩关闭
    const overlay = document.getElementById('settings-overlay');
    if (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
          hideSettingsModal();
        }
      });
    }

    // 自动同步开关切换
    const autoSyncCheckbox = document.getElementById('settings-auto-sync');
    if (autoSyncCheckbox) {
      autoSyncCheckbox.addEventListener('change', function () {
        updateAutoSyncUI(this.checked);
      });
    }

    // 测试连接按钮
    const testBtn = document.getElementById('btn-test-connection');
    if (testBtn) {
      testBtn.addEventListener('click', testGitConnection);
    }

    // Token 输入框聚焦时清除掩码
    const tokenInput = document.getElementById('settings-git-token');
    if (tokenInput) {
      tokenInput.addEventListener('focus', function () {
        if (this.dataset.hasExisting === 'true' && this.value === '••••••••••••••••') {
          this.value = '';
          this.dataset.hasExisting = 'false';
        }
      });
    }
  });
})();
