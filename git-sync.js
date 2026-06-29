/**
 * @file         git-sync.js
 * @description  Git 云端同步模块 — init/pull/push/status/conflict，基于 simple-git
 * @author       tianxj22
 * @created      2026-06-29
 * @updated      2026-06-29
 * @version      1.0.0
 */

const fs = require('fs');
const path = require('path');
const simpleGit = require('simple-git');

const SYNC_STATE_FILE = '.sync-state.json';
const GITIGNORE_CONTENT = `.trash/
.trash-meta.json
.clipboard/
.name-stack.json
.sync-state.json
settings.json
`;

/**
 * 构造带 Token 认证的远程 URL
 * @param {string} remoteUrl - 原始 URL
 * @param {string} token - Access Token
 * @returns {string}
 */
/**
 * 根据远程 URL 判断 Git 托管平台
 * @param {string} remoteUrl
 * @returns {'github'|'gitlab'|'generic'}
 */
function detectProvider(remoteUrl) {
  const host = (new URL(remoteUrl)).hostname.toLowerCase();
  if (host.includes('github.com')) return 'github';
  if (host.includes('gitlab.com') || host.includes('gitlab.')) return 'gitlab';
  return 'generic';
}

function buildAuthUrl(remoteUrl, token) {
  if (!token || !remoteUrl.startsWith('https://')) return remoteUrl;
  const urlObj = new URL(remoteUrl);
  const provider = detectProvider(remoteUrl);

  switch (provider) {
    case 'github':
      // GitHub: token 作为用户名，x-oauth-basic 作为密码
      urlObj.username = token;
      urlObj.password = 'x-oauth-basic';
      break;
    case 'gitlab':
      // GitLab: oauth2 作为用户名，token 作为密码
      urlObj.username = 'oauth2';
      urlObj.password = token;
      break;
    default:
      // 通用: token 作为密码，用户名任意
      urlObj.username = 'token';
      urlObj.password = token;
      break;
  }
  return urlObj.toString();
}

/**
 * 初始化 Git 仓库
 * @param {string} notesDir - notes 目录路径
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function initRepo(notesDir) {
  try {
    const git = simpleGit(notesDir);
    const isRepo = await git.checkIsRepo();

    if (!isRepo) {
      await git.init();
    }

    // 写入 .gitignore
    const gitignorePath = path.join(notesDir, '.gitignore');
    if (!fs.existsSync(gitignorePath)) {
      fs.writeFileSync(gitignorePath, GITIGNORE_CONTENT, 'utf-8');
    }

    return { success: true, message: 'Git 仓库已初始化' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * 设置远程仓库
 * @param {string} notesDir
 * @param {string} remoteUrl
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function setRemote(notesDir, remoteUrl) {
  try {
    const git = simpleGit(notesDir);
    const remotes = await git.getRemotes(true);
    const hasOrigin = remotes.some(r => r.name === 'origin');

    if (hasOrigin) {
      await git.remote(['set-url', 'origin', remoteUrl]);
    } else {
      await git.addRemote('origin', remoteUrl);
    }
    return { success: true, message: '远程仓库已配置' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * 配置 Git 用户信息
 * @param {string} notesDir
 * @param {string} name
 * @param {string} email
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function configureUser(notesDir, name, email) {
  try {
    const git = simpleGit(notesDir);
    if (name) await git.addConfig('user.name', name);
    if (email) await git.addConfig('user.email', email);
    return { success: true, message: '用户信息已配置' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * 获取工作树状态
 * @param {string} notesDir
 * @returns {Promise<{files: Array, changedCount: number, clean: boolean}>}
 */
async function getStatus(notesDir) {
  try {
    const git = simpleGit(notesDir);
    const status = await git.status();
    const files = [
      ...(status.created || []).map(f => ({ path: f, type: 'created' })),
      ...(status.modified || []).map(f => ({ path: f, type: 'modified' })),
      ...(status.deleted || []).map(f => ({ path: f, type: 'deleted' })),
      ...(status.not_added || []).map(f => ({ path: f, type: 'untracked' })),
      ...(status.renamed || []).map(f => ({ path: f.to, type: 'renamed' })),
    ];
    return {
      files,
      changedCount: files.length,
      clean: status.isClean(),
    };
  } catch (err) {
    return { files: [], changedCount: 0, clean: true, error: err.message };
  }
}

/**
 * 提交所有变更
 * @param {string} notesDir
 * @param {string} message - 提交信息
 * @returns {Promise<{success: boolean, message: string, commitHash?: string}>}
 */
async function commit(notesDir, message) {
  try {
    const git = simpleGit(notesDir);
    await git.add('./*');
    const result = await git.commit(message || 'sync: auto commit');
    return { success: true, message: '已提交', commitHash: result.commit };
  } catch (err) {
    // 如果无可提交内容，不算错误
    if (err.message.includes('nothing to commit') || err.message.includes('no changes added')) {
      return { success: true, message: '无变更需要提交' };
    }
    return { success: false, message: err.message };
  }
}

/**
 * 从远程拉取
 * @param {string} notesDir
 * @param {string} branch - 分支名
 * @param {string} token - Access Token
 * @returns {Promise<{success: boolean, message: string, hasConflicts: boolean}>}
 */
async function pull(notesDir, branch, token) {
  try {
    const git = simpleGit(notesDir);
    const remoteUrl = await getRemoteUrl(notesDir);
    if (!remoteUrl) {
      return { success: false, message: '未配置远程仓库', hasConflicts: false };
    }

    const authUrl = buildAuthUrl(remoteUrl, token);
    // 使用带认证的 URL 进行 pull
    await git.pull(authUrl, branch, { '--no-edit': null, '--no-rebase': null });
    return { success: true, message: '拉取成功', hasConflicts: false };
  } catch (err) {
    const msg = err.message || '';
    if (msg.includes('CONFLICT') || msg.includes('conflict') || msg.includes('Merge conflict')) {
      return { success: false, message: '存在合并冲突', hasConflicts: true };
    }
    if (msg.includes('could not resolve host') || msg.includes('Could not read from remote')) {
      return { success: false, message: '网络连接失败，请检查远程 URL', hasConflicts: false };
    }
    if (msg.includes('Authentication failed') || msg.includes('401') || msg.includes('403')) {
      return { success: false, message: '认证失败，请检查 Token', hasConflicts: false };
    }
    return { success: false, message: msg.substring(0, 200), hasConflicts: false };
  }
}

/**
 * 推送到远程
 * @param {string} notesDir
 * @param {string} branch - 分支名
 * @param {string} token - Access Token
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function push(notesDir, branch, token) {
  try {
    const git = simpleGit(notesDir);
    const remoteUrl = await getRemoteUrl(notesDir);
    if (!remoteUrl) {
      return { success: false, message: '未配置远程仓库' };
    }

    const authUrl = buildAuthUrl(remoteUrl, token);
    await git.push(authUrl, branch);
    return { success: true, message: '推送成功' };
  } catch (err) {
    const msg = err.message || '';
    if (msg.includes('rejected') || msg.includes('non-fast-forward')) {
      return { success: false, message: '推送被拒绝，请先拉取远程更新' };
    }
    if (msg.includes('Authentication failed') || msg.includes('401') || msg.includes('403')) {
      return { success: false, message: '认证失败，请检查 Token' };
    }
    return { success: false, message: msg.substring(0, 200) };
  }
}

/**
 * 获取远程 URL
 * @param {string} notesDir
 * @returns {Promise<string|null>}
 */
async function getRemoteUrl(notesDir) {
  try {
    const git = simpleGit(notesDir);
    const remotes = await git.getRemotes(true);
    const origin = remotes.find(r => r.name === 'origin');
    return origin ? origin.refs.fetch : null;
  } catch (_) {
    return null;
  }
}

/**
 * 检查是否存在合并冲突标记
 * @param {string} notesDir
 * @returns {Promise<{hasConflicts: boolean, conflictFiles: string[]}>}
 */
async function hasConflicts(notesDir) {
  const conflictFiles = [];
  try {
    const files = fs.readdirSync(notesDir).filter(f => /\.(html|txt)$/.test(f));
    for (const f of files) {
      const content = fs.readFileSync(path.join(notesDir, f), 'utf-8');
      if (content.includes('<<<<<<<') || content.includes('=======') || content.includes('>>>>>>>')) {
        conflictFiles.push(f);
      }
    }
  } catch (_) { /* ignore */ }
  return { hasConflicts: conflictFiles.length > 0, conflictFiles };
}

/**
 * 解决冲突
 * @param {string} notesDir
 * @param {string} strategy - 'local' | 'remote'
 * @param {string} [fileName] - 可选：指定文件名；不指定则处理所有冲突文件
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function resolveConflict(notesDir, strategy, fileName) {
  try {
    const git = simpleGit(notesDir);
    if (strategy === 'local') {
      await git.raw(['checkout', '--ours', fileName || '.']);
    } else if (strategy === 'remote') {
      await git.raw(['checkout', '--theirs', fileName || '.']);
    }
    // 标记为已解决
    if (fileName) {
      await git.add(fileName);
    } else {
      await git.add('./*');
    }
    return { success: true, message: '冲突已解决' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * 获取最近的提交历史
 * @param {string} notesDir
 * @param {number} [count=20]
 * @returns {Promise<Array<{hash: string, date: string, message: string, author: string}>>}
 */
async function getHistory(notesDir, count = 20) {
  try {
    const git = simpleGit(notesDir);
    const log = await git.log({ n: count });
    return log.all.map(entry => ({
      hash: entry.hash.substring(0, 7),
      date: entry.date,
      message: entry.message,
      author: entry.author_name,
    }));
  } catch (_) {
    return [];
  }
}

/**
 * 完整的同步流程：pull → push
 * @param {string} notesDir
 * @param {string} branch
 * @param {string} token
 * @param {string} [commitMsg]
 * @returns {Promise<{success: boolean, message: string, hasConflicts: boolean}>}
 */
async function fullSync(notesDir, branch, token, commitMsg) {
  // 1. 先提交本地变更
  const commitResult = await commit(notesDir, commitMsg || 'sync: auto sync');

  // 2. 拉取远程
  const pullResult = await pull(notesDir, branch, token);
  if (pullResult.hasConflicts) {
    return { success: false, message: '存在合并冲突，请手动解决', hasConflicts: true };
  }
  if (!pullResult.success) {
    // 拉取失败但可能是网络问题，返回错误
    return { success: false, message: pullResult.message, hasConflicts: false };
  }

  // 3. 推送
  const pushResult = await push(notesDir, branch, token);
  return { success: pushResult.success, message: pushResult.message, hasConflicts: false };
}

/**
 * 保存/读取同步状态
 * @param {string} notesDir
 * @returns {{ lastPull: number, lastPush: number }}
 */
function getSyncState(notesDir) {
  const statePath = path.join(notesDir, SYNC_STATE_FILE);
  try {
    if (fs.existsSync(statePath)) {
      return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    }
  } catch (_) { /* ignore */ }
  return { lastPull: 0, lastPush: 0 };
}

/**
 * 更新同步状态
 * @param {string} notesDir
 * @param {'pull'|'push'} operation
 */
function updateSyncState(notesDir, operation) {
  const state = getSyncState(notesDir);
  if (operation === 'pull') state.lastPull = Date.now();
  if (operation === 'push') state.lastPush = Date.now();
  const statePath = path.join(notesDir, SYNC_STATE_FILE);
  fs.writeFileSync(statePath, JSON.stringify(state), 'utf-8');
}

module.exports = {
  initRepo, setRemote, configureUser, getStatus, commit,
  pull, push, hasConflicts, resolveConflict, getHistory,
  fullSync, getSyncState, updateSyncState, buildAuthUrl,
  detectProvider,
};
