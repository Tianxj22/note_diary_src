/**
 * @file         js/utils.js
 * @description  Note Diary — 工具函数
 * @author       tianxj22
 * @created      2026-06-24
 * @updated      2026-06-29
 * @version      1.1.0
 */

/**
 * HTML 转义，防止 XSS
 * @param {string} str - 原始字符串
 * @returns {string} 转义后的 HTML 安全字符串
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * 格式化时间戳为可读日期字符串
 * @param {number} ts - 毫秒时间戳
 * @returns {string} 格式如 "2024-06-24 14:30"
 */
function formatDate(ts) {
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 解析"新建笔记本*"格式的笔记名称，提取序号
 * @param {string} displayName - 笔记显示名称
 * @returns {number|null} 序号（"新建笔记本"返回1，"新建笔记本 (2)"返回2），不匹配返回 null
 */
function parseDefaultNameNumber(displayName) {
  if (displayName === '新建笔记本') return 1;
  const match = displayName.match(/^新建笔记本 \((\d+)\)$/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * LCS (Longest Common Subsequence) 行级 diff
 * 返回带标记的行数组，用于冲突对比预览
 * @param {string} localText - 本地文本
 * @param {string} remoteText - 远程文本
 * @returns {{ local: Array<{text:string, type:'same'|'added'|'removed'}>, remote: Array<{text:string, type:'same'|'added'|'removed'}> }}
 */
function diffLines(localText, remoteText) {
  var localLines = localText.split('\n');
  var remoteLines = remoteText.split('\n');

  // 构建 LCS 表
  var m = localLines.length;
  var n = remoteLines.length;
  var dp = [];
  for (var i = 0; i <= m; i++) {
    dp[i] = [];
    for (var j = 0; j <= n; j++) {
      if (i === 0 || j === 0) {
        dp[i][j] = 0;
      } else if (localLines[i - 1] === remoteLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // 回溯构建 diff
  var localResult = [];
  var remoteResult = [];
  var i = m, j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && localLines[i - 1] === remoteLines[j - 1]) {
      // 相同行
      localResult.unshift({ text: localLines[i - 1], type: 'same' });
      remoteResult.unshift({ text: remoteLines[j - 1], type: 'same' });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      // 远程新增的行
      localResult.unshift({ text: '', type: 'empty' });
      remoteResult.unshift({ text: remoteLines[j - 1], type: 'added' });
      j--;
    } else {
      // 本地有但远程没有（本地删除的行）
      localResult.unshift({ text: localLines[i - 1], type: 'removed' });
      remoteResult.unshift({ text: '', type: 'empty' });
      i--;
    }
  }

  return { local: localResult, remote: remoteResult };
}
