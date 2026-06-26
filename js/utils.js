/**
 * @file         js/utils.js
 * @description  Note Diary — 工具函数
 * @author       tianxj22
 * @created      2026-06-24
 * @updated      2026-06-26
 * @version      1.0.0
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
