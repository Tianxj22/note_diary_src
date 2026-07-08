/**
 * @file         settings-store.js
 * @description  用户设置持久化存储模块 — 读写 {userData}/settings.json，加密存储 API Token
 * @author       tianxj22
 * @created      2026-06-29
 * @updated      2026-06-29
 * @version      1.0.0
 */

const fs = require('fs');
const path = require('path');
const cryptoUtils = require('./crypto-utils');

const SETTINGS_FILE = 'settings.json';

/**
 * 默认设置
 * @returns {object}
 */
function getDefaults() {
  return {
    sync: {
      enabled: false,
      mode: 'git',               // 'git' | 'cloudDrive'
      autoSync: false,
      autoSyncIntervalMinutes: 15,
      git: {
        remoteUrl: '',
        branch: 'main',
        authorName: '',
        authorEmail: '',
        tokenEncrypted: null,    // { iv, tag, data } | null
      },
      cloudDrive: {
        folderPath: '',
      },
    },
    general: {
      fileExtension: '.html',    // '.html' | '.txt'
      fontSize: '0.95',          // rem
      lineHeight: '1.8',         // unitless
      theme: 'light',            // 'light' | 'dark'
      customTags: [],            // [{name: string, emoji: string}]
    },
    autoSave: {
      enabled: true,
      delayMs: 3000,
      backupDir: '',
    },
  };
}

/**
 * 深层合并对象（仅合并 settings 内部的已知 key，防止注入）
 * @param {object} target - 当前完整设置对象
 * @param {object} partial - 用户提交的部分设置
 * @returns {object} 合并后的完整设置
 */
function deepMerge(target, partial) {
  const result = JSON.parse(JSON.stringify(target)); // deep copy

  if (partial.sync) {
    if (typeof partial.sync.enabled === 'boolean') result.sync.enabled = partial.sync.enabled;
    if (typeof partial.sync.mode === 'string') result.sync.mode = partial.sync.mode;
    if (typeof partial.sync.autoSync === 'boolean') result.sync.autoSync = partial.sync.autoSync;
    if (typeof partial.sync.autoSyncIntervalMinutes === 'number') {
      result.sync.autoSyncIntervalMinutes = Math.max(1, Math.min(1440, partial.sync.autoSyncIntervalMinutes));
    }

    if (partial.sync.git) {
      if (typeof partial.sync.git.remoteUrl === 'string') result.sync.git.remoteUrl = partial.sync.git.remoteUrl;
      if (typeof partial.sync.git.branch === 'string') result.sync.git.branch = partial.sync.git.branch;
      if (typeof partial.sync.git.authorName === 'string') result.sync.git.authorName = partial.sync.git.authorName;
      if (typeof partial.sync.git.authorEmail === 'string') result.sync.git.authorEmail = partial.sync.git.authorEmail;
      if (partial.sync.git.tokenEncrypted !== undefined) result.sync.git.tokenEncrypted = partial.sync.git.tokenEncrypted;
    }

    if (partial.sync.cloudDrive) {
      if (typeof partial.sync.cloudDrive.folderPath === 'string') result.sync.cloudDrive.folderPath = partial.sync.cloudDrive.folderPath;
    }
  }

  if (partial.general) {
    if (typeof partial.general.fileExtension === 'string') result.general.fileExtension = partial.general.fileExtension;
    if (typeof partial.general.fontSize === 'string') result.general.fontSize = partial.general.fontSize;
    if (typeof partial.general.lineHeight === 'string') result.general.lineHeight = partial.general.lineHeight;
    if (typeof partial.general.theme === 'string') result.general.theme = partial.general.theme;
    if (Array.isArray(partial.general.customTags)) result.general.customTags = partial.general.customTags;
  }

  if (partial.autoSave) {
    if (!result.autoSave) result.autoSave = getDefaults().autoSave;
    if (typeof partial.autoSave.enabled === 'boolean') result.autoSave.enabled = partial.autoSave.enabled;
    if (typeof partial.autoSave.delayMs === 'number') result.autoSave.delayMs = partial.autoSave.delayMs;
    if (typeof partial.autoSave.backupDir === 'string') result.autoSave.backupDir = partial.autoSave.backupDir;
  }

  return result;
}

/**
 * 需要加密的字段映射：settings 路径 → 加密后存储的 target 路径
 */
const ENCRYPTED_FIELDS = [
  { source: 'sync.git.token', target: 'sync.git.tokenEncrypted' },
];

/**
 * 读取设置
 * @param {string} userDataPath - userData 目录路径
 * @returns {object} 完整设置对象（Token 已解密）
 */
function getSettings(userDataPath) {
  const filePath = path.join(userDataPath, SETTINGS_FILE);

  try {
    if (!fs.existsSync(filePath)) {
      const defaults = getDefaults();
      defaults.sync.git._tokenPlain = '';
      return defaults;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    const stored = JSON.parse(raw);

    // 深度合并默认值（覆盖新增字段的默认值）
    const merged = deepMerge(getDefaults(), stored);

    // 解密 token
    if (merged.sync.git.tokenEncrypted && merged.sync.git.tokenEncrypted.data) {
      try {
        merged.sync.git._tokenPlain = cryptoUtils.decryptToken(merged.sync.git.tokenEncrypted, userDataPath);
      } catch (e) {
        // 解密失败（可能是 userData 路径变更），token 设置为空
        merged.sync.git._tokenPlain = '';
        merged.sync.git.tokenEncrypted = null;
      }
    } else {
      merged.sync.git._tokenPlain = '';
    }

    return merged;
  } catch (err) {
    console.error('Failed to load settings:', err.message);
    const defaults = getDefaults();
    defaults.sync.git._tokenPlain = '';
    return defaults;
  }
}

/**
 * 保存设置（合并写入）
 * @param {string} userDataPath - userData 目录路径
 * @param {object} partial - 部分设置对象（仅包含要更新的字段）
 * @param {string|null} newToken - 新的 Git Token 明文（如果更新了 token），null 表示不更新
 * @returns {object} 更新后的完整设置
 */
function updateSettings(userDataPath, partial, newToken) {
  const filePath = path.join(userDataPath, SETTINGS_FILE);

  // 读取当前完整设置
  const current = getSettings(userDataPath);

  // 合并部分更新
  const merged = deepMerge(current, partial);

  // 如果有新 token，加密存储
  if (newToken !== null && newToken !== undefined) {
    if (newToken === '') {
      merged.sync.git.tokenEncrypted = null;
      merged.sync.git._tokenPlain = '';
    } else {
      merged.sync.git.tokenEncrypted = cryptoUtils.encryptToken(newToken, userDataPath);
      merged.sync.git._tokenPlain = newToken;
    }
  }

  // 清理内部标记（_tokenPlain 不写入磁盘）
  const toStore = JSON.parse(JSON.stringify(merged));
  delete toStore.sync.git._tokenPlain;

  // 确保目录存在
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  fs.writeFileSync(filePath, JSON.stringify(toStore, null, 2), 'utf-8');
  return merged;
}

module.exports = { getSettings, updateSettings, getDefaults };
