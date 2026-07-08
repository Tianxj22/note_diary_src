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
    populateKeybindingTable();
    updateAutoSyncUI(cachedSettings.sync.autoSync);
    await populateDataPath();
    await populateVersion();

    ND.settingsOverlay.classList.add('visible');
  };

  /**
   * 填充数据存储路径到设置弹窗顶部
   */
  async function populateDataPath() {
    var el = document.getElementById('settings-data-path');
    if (!el) return;
    try {
      var p = await window.electronAPI.getUserDataPath();
      el.textContent = p || '—';
      el.title = p || '';
    } catch (_) {
      el.textContent = '无法获取路径';
    }
  }

  /**
   * 填充当前应用版本号
   */
  async function populateVersion() {
    var el = document.getElementById('settings-current-version');
    if (!el) return;
    try {
      var v = await window.electronAPI.getAppVersion();
      el.textContent = 'v' + v;
    } catch (_) {
      el.textContent = '—';
    }
  }

  /**
   * 填充快捷键参考表
   */
  async function populateKeybindingTable() {
    var table = document.getElementById('keybinding-table');
    if (!table) return;
    try {
      var kb = await window.electronAPI.getKeybindings();
      var bindings = kb.bindings;
      // 分类标签
      var groups = [
        { label: '文件', prefix: 'file.' },
        { label: '编辑', prefix: 'edit.' },
        { label: '格式', prefix: 'format.' },
        { label: '插入', prefix: 'insert.' },
        { label: '视图', prefix: 'view.' },
      ];
      var html = '';
      groups.forEach(function (g) {
        html += '<div class="kb-row" style="color:#999;font-size:0.72rem;padding:4px 12px;background:#fafafa">' + g.label + '</div>';
        Object.keys(bindings).forEach(function (id) {
          if (id.startsWith(g.prefix)) {
            var name = id.replace(g.prefix, '').replace(/([A-Z])/g, ' $1').replace(/^./, function (c) { return c.toUpperCase(); });
            var key = bindings[id] || '—';
            html += '<div class="kb-row"><span class="kb-action">' + name + '</span><span class="kb-key">' + key + '</span></div>';
          }
        });
      });
      table.innerHTML = html;
    } catch (_) {
      table.innerHTML = '<div class="kb-row"><span class="kb-action">无法加载快捷键</span></div>';
    }
  }

  /**
   * 隐藏设置弹窗（不保存）
   */
  function hideSettingsModal() {
    ND.settingsOverlay.classList.remove('visible');
    // 清除测试连接结果
    const testResult = document.getElementById('test-connection-result');
    if (testResult) testResult.textContent = '';
    // 重置更新状态 UI
    resetUpdateUI();
  }

  /**
   * 重置更新区域 UI
   */
  function resetUpdateUI() {
    const statusEl = document.getElementById('update-status-text');
    const progressBar = document.getElementById('update-progress-bar');
    const progressFill = document.getElementById('update-progress-fill');
    const actionArea = document.getElementById('update-action-area');
    if (statusEl) { statusEl.textContent = ''; statusEl.className = ''; }
    if (progressBar) progressBar.style.display = 'none';
    if (progressFill) progressFill.style.width = '0%';
    if (actionArea) actionArea.style.display = 'none';
  }

  /**
   * 处理更新状态回调
   * @param {{ status: string, version?: string, percent?: number, message?: string }} data
   */
  function handleUpdateStatus(data) {
    const statusEl = document.getElementById('update-status-text');
    const progressBar = document.getElementById('update-progress-bar');
    const progressFill = document.getElementById('update-progress-fill');
    const actionArea = document.getElementById('update-action-area');

    if (!statusEl) return;

    switch (data.status) {
      case 'checking':
        statusEl.textContent = '正在检查...';
        statusEl.className = '';
        if (progressBar) progressBar.style.display = 'none';
        if (actionArea) actionArea.style.display = 'none';
        break;
      case 'no-update':
        statusEl.textContent = '✅ 已是最新版本';
        statusEl.className = 'success';
        if (progressBar) progressBar.style.display = 'none';
        if (actionArea) actionArea.style.display = 'none';
        break;
      case 'available':
        statusEl.textContent = '⬇ 发现新版本 v' + (data.version || '?') + '，正在下载...';
        statusEl.className = '';
        if (progressBar) progressBar.style.display = 'block';
        if (progressFill) progressFill.style.width = '0%';
        if (actionArea) actionArea.style.display = 'none';
        break;
      case 'progress':
        if (progressBar) progressBar.style.display = 'block';
        if (progressFill) progressFill.style.width = (data.percent || 0) + '%';
        statusEl.textContent = '⬇ 下载中 ' + (data.percent || 0) + '%';
        statusEl.className = '';
        break;
      case 'downloaded':
        statusEl.textContent = '✅ 新版本已就绪 (v' + (data.version || '?') + ')';
        statusEl.className = 'success';
        if (progressBar) progressBar.style.display = 'none';
        if (actionArea) actionArea.style.display = 'flex';
        break;
      case 'error':
        statusEl.textContent = '❌ ' + (data.message || '更新检查失败');
        statusEl.className = 'error';
        if (progressBar) progressBar.style.display = 'none';
        if (actionArea) actionArea.style.display = 'none';
        break;
      default:
        break;
    }
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

      // 首选项
    var themeEl = document.getElementById('settings-theme');
    if (themeEl) themeEl.value = (s.general && s.general.theme) || 'light';
    var fontSizeEl = document.getElementById('settings-font-size');
    if (fontSizeEl) fontSizeEl.value = (s.general && s.general.fontSize) || '0.95';
    var lineHeightEl = document.getElementById('settings-line-height');
    if (lineHeightEl) lineHeightEl.value = (s.general && s.general.lineHeight) || '1.8';

    // 自动保存
    if (s.autoSave) {
      var autoSaveEnabledEl = document.getElementById('settings-auto-save-enabled');
      if (autoSaveEnabledEl) autoSaveEnabledEl.checked = s.autoSave.enabled !== false;
      var autoSaveDelayEl = document.getElementById('settings-auto-save-delay');
      if (autoSaveDelayEl) autoSaveDelayEl.value = s.autoSave.delayMs || 3000;
    }
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
        fontSize: document.getElementById('settings-font-size').value,
        lineHeight: document.getElementById('settings-line-height').value,
        theme: document.getElementById('settings-theme').value,
      },
      autoSave: {
        enabled: document.getElementById('settings-auto-save-enabled').checked,
        delayMs: parseInt(document.getElementById('settings-auto-save-delay').value) || 3000,
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
      // 即时应用自动保存设置
      if (partial.autoSave) {
        ND.autoSaveEnabled = partial.autoSave.enabled;
        ND.autoSaveDelay = partial.autoSave.delayMs || 3000;
      }
      // 即时应用主题设置
      if (partial.general && partial.general.theme && ND.applyTheme) {
        ND.applyTheme(partial.general.theme);
      }
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

    // 更改数据存储路径按钮
    var changePathBtn = document.getElementById('btn-change-data-path');
    if (changePathBtn) {
      changePathBtn.addEventListener('click', async function () {
        try {
          var newPath = await window.electronAPI.selectFolder();
          if (!newPath) return; // 用户取消
          var result = await window.electronAPI.setUserDataPath(newPath);
          if (result.success) {
            await populateDataPath();
            if (ND.statusLeft) {
              ND.statusLeft.textContent = '数据路径已更改';
              setTimeout(function () {
                if (ND.statusLeft.textContent === '数据路径已更改') {
                  ND.statusLeft.textContent = '就绪';
                }
              }, 2500);
            }
          } else {
            alert(result.message || '更改失败'); // eslint-disable-line no-alert
          }
        } catch (e) {
          console.error('Failed to change data path:', e);
          // eslint-disable-next-line no-alert
          alert('更改数据路径失败: ' + e.message);
        }
      });
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

    // 检查更新按钮
    const checkUpdateBtn = document.getElementById('btn-check-update');
    if (checkUpdateBtn) {
      checkUpdateBtn.addEventListener('click', async function () {
        resetUpdateUI();
        try {
          await window.electronAPI.checkForUpdate();
        } catch (_) {
          // 状态通过 onUpdateStatus 回调推送，此处忽略
        }
      });
    }

    // 立即安装更新按钮
    const installBtn = document.getElementById('btn-install-update');
    if (installBtn) {
      installBtn.addEventListener('click', async function () {
        try {
          await window.electronAPI.installUpdate();
        } catch (_) { /* ignore */ }
      });
    }

    // 稍后按钮 — 隐藏操作区域
    const dismissBtn = document.getElementById('btn-dismiss-update');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', function () {
        const actionArea = document.getElementById('update-action-area');
        if (actionArea) actionArea.style.display = 'none';
        const statusEl = document.getElementById('update-status-text');
        if (statusEl) { statusEl.textContent = ''; statusEl.className = ''; }
      });
    }

    // 监听主进程推送的更新状态
    window.electronAPI.onUpdateStatus(handleUpdateStatus);
  });
})();
