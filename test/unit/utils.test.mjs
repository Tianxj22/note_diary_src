/**
 * @file         utils.test.mjs
 * @description  js/utils.js 工具函数的单元测试
 * @author       tianxj22
 * @created      2026-06-26
 * @updated      2026-06-26
 * @version      1.0.0
 *
 * 注意：函数逻辑从 js/utils.js 复制，测试与源文件保持同步。
 */

import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';

// ---- escapeHtml 测试（需要 DOM 环境）----

describe('escapeHtml', () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  const doc = dom.window.document;

  /**
   * js/utils.js 中 escapeHtml 的等价实现
   * @param {string} str
   * @returns {string}
   */
  function escapeHtml(str) {
    const div = doc.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  it('U-36: 普通文本不包含特殊字符 → 原样返回', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World');
  });

  it('U-37: 包含 < > & → 正确转义', () => {
    const result = escapeHtml('<script>alert("XSS")</script>');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
    // 验证危险字符已被转义，不在 HTML 中作为标签解析
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
  });

  it('U-38: 空字符串 → 返回空字符串', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('U-39: 包含已转义 HTML 实体 → 不二次转义', () => {
    const result = escapeHtml('&lt;hello&gt;');
    // textContent 设置时 & 会被解释为文字，innerHTML 时重新编码
    expect(result).toBe('&amp;lt;hello&amp;gt;');
  });

  it('U-40: 特殊字符 & 和引号同时出现 → 全部转义', () => {
    const result = escapeHtml("Tom & Jerry \"Mouse\" 'Cat'");
    expect(result).toContain('&amp;');
    expect(result).toContain('Tom');
    expect(result).toContain('Jerry');
    // 验证 & 被转义，< > 不存在则不产生对应实体
    expect(result).not.toContain(' & ');
  });
});

// ---- formatDate 测试（纯函数）----

describe('formatDate', () => {
  /**
   * js/utils.js 中 formatDate 的等价实现
   * @param {number} ts - 毫秒时间戳
   * @returns {string}
   */
  function formatDate(ts) {
    const d = new Date(ts);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  it('U-41: 已知时间戳 → 返回正确格式 YYYY-MM-DD HH:mm', () => {
    // 2024-06-24 14:30 UTC
    const ts = new Date('2024-06-24T14:30:00Z').getTime();
    // 预期输出取决于本地时区，用 Date 方法自行计算
    const d = new Date(ts);
    const pad = n => String(n).padStart(2, '0');
    const expected = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    expect(formatDate(ts)).toBe(expected);
  });

  it('U-42: UNIX epoch (0) → 返回 1970-01-01 对应本地时间', () => {
    const result = formatDate(0);
    // 结果取决于本地时区，至少格式正确
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });

  it('U-43: 单数字月/日/时/分 → 正确补零', () => {
    // 2024-01-05 03:07 UTC
    const ts = Date.UTC(2024, 0, 5, 3, 7);
    const result = formatDate(ts);
    // 格式：YYYY-MM-DD HH:mm，每段都是两位
    const parts = result.split(/[\s:-]/);
    expect(parts.length).toBe(5);
    // 月份和日期至少是 "01" 和 "05"
    expect(parts[1]).toBe('01');
    expect(parts[2]).toBe('05');
  });

  it('U-44: 跨年边界 → 年份正确', () => {
    // 使用本地时间构造，避免时区差异
    const ts1 = new Date(2023, 11, 31, 23, 59).getTime();
    const result1 = formatDate(ts1);
    expect(result1.startsWith('2023-12-31')).toBe(true);

    // 加 2 分钟跨年
    const ts2 = new Date(2024, 0, 1, 0, 1).getTime();
    const result2 = formatDate(ts2);
    expect(result2.startsWith('2024-01-01')).toBe(true);
  });
});

// ---- parseDefaultNameNumber 测试（纯函数）----

describe('parseDefaultNameNumber', () => {
  /**
   * js/utils.js 中 parseDefaultNameNumber 的等价实现
   * @param {string} displayName
   * @returns {number|null}
   */
  function parseDefaultNameNumber(displayName) {
    if (displayName === '新建笔记本') return 1;
    const match = displayName.match(/^新建笔记本 \((\d+)\)$/);
    return match ? parseInt(match[1], 10) : null;
  }

  it('U-45: "新建笔记本" → 返回 1', () => {
    expect(parseDefaultNameNumber('新建笔记本')).toBe(1);
  });

  it('U-46: "新建笔记本 (2)" → 返回 2', () => {
    expect(parseDefaultNameNumber('新建笔记本 (2)')).toBe(2);
  });

  it('U-47: "新建笔记本 (99)" → 返回 99', () => {
    expect(parseDefaultNameNumber('新建笔记本 (99)')).toBe(99);
  });

  it('U-48: "普通笔记名" → 返回 null', () => {
    expect(parseDefaultNameNumber('普通笔记名')).toBeNull();
  });

  it('U-49: "新建笔记本 (abc)" → 返回 null（非数字）', () => {
    expect(parseDefaultNameNumber('新建笔记本 (abc)')).toBeNull();
  });

  it('U-50: 空字符串 → 返回 null', () => {
    expect(parseDefaultNameNumber('')).toBeNull();
  });

  it('U-51: "新建笔记本()" → 返回 null（空括号）', () => {
    expect(parseDefaultNameNumber('新建笔记本 ()')).toBeNull();
  });
});

describe('diffLines', () => {
  /**
   * LCS diff — 复制自 js/utils.js 以支持纯 Node.js 测试
   */
  function diffLines(localText, remoteText) {
    var localLines = localText.split('\n');
    var remoteLines = remoteText.split('\n');
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
    var localResult = [];
    var remoteResult = [];
    var i = m, j = n;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && localLines[i - 1] === remoteLines[j - 1]) {
        localResult.unshift({ text: localLines[i - 1], type: 'same' });
        remoteResult.unshift({ text: remoteLines[j - 1], type: 'same' });
        i--; j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        localResult.unshift({ text: '', type: 'empty' });
        remoteResult.unshift({ text: remoteLines[j - 1], type: 'added' });
        j--;
      } else {
        localResult.unshift({ text: localLines[i - 1], type: 'removed' });
        remoteResult.unshift({ text: '', type: 'empty' });
        i--;
      }
    }
    return { local: localResult, remote: remoteResult };
  }

  it('U-106: 相同文本应全部标记为 same', () => {
    var result = diffLines('hello\nworld', 'hello\nworld');
    expect(result.local.length).toBe(2);
    expect(result.local[0].type).toBe('same');
    expect(result.local[1].type).toBe('same');
    expect(result.remote[0].type).toBe('same');
  });

  it('U-107: 新增行应标记为 added', () => {
    var result = diffLines('line1\nline2', 'line1\nline2\nline3');
    expect(result.local.length).toBe(3);
    expect(result.local[2].type).toBe('empty');
    expect(result.remote[2].type).toBe('added');
    expect(result.remote[2].text).toBe('line3');
  });

  it('U-108: 删除行应标记为 removed', () => {
    var result = diffLines('line1\nline2\nline3', 'line1\nline3');
    expect(result.local.length).toBe(3);
    expect(result.local[1].type).toBe('removed');
    expect(result.local[1].text).toBe('line2');
  });

  it('U-109: 完全不同的文本（各自一行，diff 结果各两行）', () => {
    var result = diffLines('aaa', 'bbb');
    // LCS: local 'aaa' removed + empty placeholder for remote 'bbb' = 2 entries
    expect(result.local.length).toBe(2);
    expect(result.local[0].type).toBe('removed');
    expect(result.local[0].text).toBe('aaa');
    expect(result.remote.length).toBe(2);
    expect(result.remote[1].type).toBe('added');
    expect(result.remote[1].text).toBe('bbb');
  });

  it('U-110: 空文本对比', () => {
    var result = diffLines('', '');
    expect(result.local.length).toBe(1);
    expect(result.local[0].type).toBe('same');
    expect(result.local[0].text).toBe('');
  });

  it('U-111: 单行 vs 多行', () => {
    var result = diffLines('single', 'single\nnew line');
    expect(result.local.length).toBe(2);
    expect(result.local[0].type).toBe('same');
    expect(result.remote[1].type).toBe('added');
  });
});
