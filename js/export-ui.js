/**
 * @file         js/export-ui.js
 * @description  Note Diary — 导出 PDF/Markdown
 * @author       tianxj22
 * @created      2026-07-08
 * @version      1.0.0
 */

// ============================================================
// export-ui.js — 导出 PDF/Markdown
// ============================================================

(function () {
  var ND = window.ND;

  /**
   * 构建导出用 HTML 文档
   * @returns {string}
   */
  function buildExportHtml() {
    if (!ND.editorDiv) return '';
    var title = ND.currentNote ? ND.currentNote.displayName : '';
    var content = ND.editorDiv.innerHTML;

    // 图片保持 file:// 路径 — 主进程通过临时文件 + file:// 协议加载，可正常渲染
    var styles = 'body{font-family:"Segoe UI","Microsoft YaHei",sans-serif;font-size:14px;line-height:1.8;color:#333;padding:30px;max-width:800px;margin:0 auto}'
      + 'h1{font-size:22px;margin-bottom:20px;border-bottom:2px solid #6c9fff;padding-bottom:10px}'
      + 'img{max-width:100%;height:auto;margin:10px 0;border-radius:4px}'
      + 'video{max-width:100%;margin:10px 0}'
      + '.check-box{margin-right:4px}.log-stamp{color:#888;margin-right:4px;font-size:0.9em}'
      + 'pre.code-block-wrapper{background:#1e1e1e;color:#ccc;padding:12px;border-radius:6px;overflow-x:auto}'
      + '@media print{body{padding:0}}';

    return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>'
      + escapeHtml(title) + '</title><style>' + styles + '</style></head>'
      + '<body><h1>' + escapeHtml(title) + '</h1>' + content + '</body></html>';
  }

  /**
   * HTML 转 Markdown
   * @param {string} html
   * @returns {string}
   */
  function htmlToMarkdown(html) {
    // 使用临时 DOM 解析
    var div = document.createElement('div');
    div.innerHTML = html;
    return nodeToMarkdown(div);
  }

  function nodeToMarkdown(node) {
    var result = '';
    var children = node.childNodes;
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      if (child.nodeType === 3) {
        // 文本节点
        var text = child.textContent;
        // 跳过 pure whitespace between block elements
        result += text;
      } else if (child.nodeType === 1) {
        result += elementToMarkdown(child);
      }
    }
    // 规范化空白：保留内部结构化的双换行，只剥除首尾多余空行
    return result.replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '').replace(/\n+$/, '') + '\n';
  }

  function elementToMarkdown(el) {
    var tag = el.tagName.toLowerCase();
    var inner = nodeToMarkdown(el).replace(/\n$/, '');

    switch (tag) {
      case 'h1': return '\n# ' + inner + '\n\n';
      case 'h2': return '\n## ' + inner + '\n\n';
      case 'h3': return '\n### ' + inner + '\n\n';
      case 'h4': return '\n#### ' + inner + '\n\n';
      case 'h5': return '\n##### ' + inner + '\n\n';
      case 'h6': return '\n###### ' + inner + '\n\n';
      case 'p': return '\n' + inner + '\n\n';
      case 'br': return '\n';
      case 'b':
      case 'strong': return '**' + inner + '**';
      case 'i':
      case 'em': return '*' + inner + '*';
      case 's':
      case 'del':
      case 'strike': return '~~' + inner + '~~';
      case 'u': return inner; // Markdown 无下划线
      case 'a':
        var href = el.getAttribute('href') || '';
        return '[' + inner + '](' + href + ')';
      case 'img':
        var src = el.getAttribute('src') || '';
        var alt = el.getAttribute('alt') || '';
        return '![' + alt + '](' + src + ')';
      case 'ul':
      case 'ol':
        return '\n' + inner + '\n';
      case 'li':
        var parentTag = el.parentNode ? el.parentNode.tagName.toLowerCase() : 'ul';
        var prefix = parentTag === 'ol' ? '1. ' : '- ';
        return prefix + inner + '\n';
      case 'pre':
        var code = el.querySelector('code');
        if (code) {
          var lang = code.className.replace('language-', '') || '';
          return '\n```' + lang + '\n' + (code.textContent || '') + '\n```\n\n';
        }
        return '\n```\n' + inner + '\n```\n\n';
      case 'code':
        return '`' + (el.textContent || '') + '`';
      case 'blockquote':
        return '\n> ' + inner.replace(/\n/g, '\n> ') + '\n\n';
      case 'hr': return '\n---\n\n';
      case 'div':
        return '\n' + inner + '\n\n';
      case 'span':
      case 'section':
        return inner;
      default:
        return inner;
    }
  }

  /**
   * 导出 PDF
   */
  async function exportToPdf() {
    if (!ND.currentNote || !ND.editorDiv) {
      ND.statusLeft.textContent = '请先打开一篇笔记';
      return;
    }
    ND.statusLeft.textContent = '正在导出 PDF...';
    try {
      var html = buildExportHtml();
      var result = await window.electronAPI.exportToPdf(html, {
        pageSize: 'A4',
        landscape: false,
        margins: { top: 20, bottom: 20, left: 20, right: 20 },
        title: ND.currentNote.displayName,
      });
      if (result && result.success) {
        ND.statusLeft.textContent = 'PDF 已导出: ' + result.filePath.split(/[\\/]/).pop();
      } else {
        ND.statusLeft.textContent = result && result.cancelled ? '导出取消' : 'PDF 导出失败';
      }
    } catch (e) {
      ND.statusLeft.textContent = 'PDF 导出失败: ' + e.message;
    }
  }

  /**
   * 导出 Markdown
   */
  async function exportToMarkdown() {
    if (!ND.currentNote || !ND.editorDiv) {
      ND.statusLeft.textContent = '请先打开一篇笔记';
      return;
    }
    ND.statusLeft.textContent = '正在导出 Markdown...';
    try {
      var md = htmlToMarkdown(ND.editorDiv.innerHTML);
      var result = await window.electronAPI.exportToMarkdown(md, ND.currentNote.displayName);
      if (result && result.success) {
        ND.statusLeft.textContent = 'Markdown 已导出: ' + result.filePath.split(/[\\/]/).pop();
      } else {
        ND.statusLeft.textContent = result && result.cancelled ? '导出取消' : 'Markdown 导出失败';
      }
    } catch (e) {
      ND.statusLeft.textContent = 'Markdown 导出失败: ' + e.message;
    }
  }

  // 暴露到 ND
  ND.exportToPdf = exportToPdf;
  ND.exportToMarkdown = exportToMarkdown;
})();
