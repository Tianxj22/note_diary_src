/**
 * @file         js/search-ui.js
 * @description  Note Diary — 全文搜索 UI：搜索框 + 结果列表 + 编辑器内高亮
 * @author       tianxj22
 * @created      2026-07-08
 * @version      1.0.0
 */

// ============================================================
// search-ui.js — 全文搜索 UI
// ============================================================

(function () {
  var ND = window.ND;
  var searchTimer = null;

  /**
   * 初始化搜索 UI 事件
   */
  function initSearch() {
    var searchInput = document.getElementById('search-input');
    var searchCaseBtn = document.getElementById('search-case-btn');
    var searchClearBtn = document.getElementById('search-clear-btn');

    if (searchInput) {
      searchInput.addEventListener('input', function () {
        var val = this.value;
        if (searchTimer) clearTimeout(searchTimer);
        if (val.trim() === '') {
          clearSearch();
          return;
        }
        searchTimer = setTimeout(function () {
          performSearch(val);
        }, 300);
      });
    }

    if (searchCaseBtn) {
      searchCaseBtn.addEventListener('click', function () {
        ND.searchCaseSensitive = !ND.searchCaseSensitive;
        this.classList.toggle('active', ND.searchCaseSensitive);
        if (ND.searchQuery) performSearch(ND.searchQuery);
      });
    }

    if (searchClearBtn) {
      searchClearBtn.addEventListener('click', clearSearch);
    }
  }

  /**
   * 执行搜索
   * @param {string} query
   */
  async function performSearch(query) {
    ND.searchQuery = query;
    if (!query.trim()) { clearSearch(); return; }

    try {
      var results = await window.electronAPI.searchNotes(query, { caseSensitive: ND.searchCaseSensitive });
      ND.searchResults = results;
      renderSearchResults(results);
      var countEl = document.getElementById('search-count');
      if (countEl) {
        if (results.length === 0) {
          countEl.textContent = '未找到匹配';
        } else {
          var totalMatches = results.reduce(function (s, r) { return s + r.matchCount; }, 0);
          countEl.textContent = results.length + ' 篇笔记, ' + totalMatches + ' 处匹配';
        }
      }
      var resultsInfo = document.getElementById('search-results-info');
      if (resultsInfo) resultsInfo.style.display = '';
    } catch (_) {}
  }

  /**
   * 渲染搜索结果（替换笔记列表）
   */
  function renderSearchResults(results) {
    if (!ND.noteListEl) return;
    ND.noteListEl.innerHTML = '';

    if (results.length === 0) {
      ND.noteListEl.innerHTML = '<div class="empty">未找到匹配的笔记</div>';
      return;
    }

    results.forEach(function (r) {
      var item = document.createElement('div');
      item.className = 'note-item search-result-item';

      var titleDiv = document.createElement('div');
      titleDiv.className = 'title';
      titleDiv.textContent = r.displayName;

      var snippetDiv = document.createElement('div');
      snippetDiv.className = 'search-snippet';
      // 高亮匹配词（在 snippet 中）
      var q = ND.searchQuery;
      var escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      var regex = new RegExp('(' + escaped + ')', ND.searchCaseSensitive ? 'g' : 'gi');
      snippetDiv.innerHTML = escapeHtml(r.snippet || '').replace(regex, '<mark>$1</mark>');

      var metaDiv = document.createElement('div');
      metaDiv.className = 'meta';
      metaDiv.textContent = r.matchCount + ' 处匹配';

      item.appendChild(titleDiv);
      item.appendChild(snippetDiv);
      item.appendChild(metaDiv);

      item.addEventListener('click', function () {
        clearSearch();
        var note = { filePath: r.filePath, fileName: r.fileName, displayName: r.displayName, mtime: r.mtime };
        selectNote(note).then(function () {
          highlightInEditor(q);
        });
      });

      ND.noteListEl.appendChild(item);
    });
  }

  /**
   * 清除搜索
   */
  function clearSearch() {
    ND.searchQuery = '';
    ND.searchResults = [];
    var searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    var resultsInfo = document.getElementById('search-results-info');
    if (resultsInfo) resultsInfo.style.display = 'none';
    clearHighlights();
    loadNoteList();
    renderNoteList();
  }

  /**
   * 在编辑器中高亮匹配文本
   * @param {string} query
   */
  function highlightInEditor(query) {
    if (!ND.editorDiv || !query) return;
    clearHighlights();

    var escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var regex = new RegExp(escaped, ND.searchCaseSensitive ? 'g' : 'gi');

    var walker = document.createTreeWalker(ND.editorDiv, NodeFilter.SHOW_TEXT, null, false);
    var textNodes = [];
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }

    textNodes.forEach(function (node) {
      var text = node.textContent;
      if (!regex.test(text)) return;
      regex.lastIndex = 0;

      var frag = document.createDocumentFragment();
      var lastIdx = 0;
      var match;
      while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIdx) {
          frag.appendChild(document.createTextNode(text.substring(lastIdx, match.index)));
        }
        var mark = document.createElement('mark');
        mark.className = 'search-highlight';
        mark.textContent = match[0];
        frag.appendChild(mark);
        lastIdx = match.index + match[0].length;
        if (match[0].length === 0) { regex.lastIndex++; lastIdx++; } // 防止死循环
      }
      if (lastIdx < text.length) {
        frag.appendChild(document.createTextNode(text.substring(lastIdx)));
      }
      node.parentNode.replaceChild(frag, node);
    });

    // 滚动到第一个高亮
    var firstMark = ND.editorDiv.querySelector('mark.search-highlight');
    if (firstMark) firstMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /**
   * 清除编辑器内所有高亮
   */
  function clearHighlights() {
    if (!ND.editorDiv) return;
    var marks = ND.editorDiv.querySelectorAll('mark.search-highlight');
    marks.forEach(function (mark) {
      var parent = mark.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent), mark);
        parent.normalize();
      }
    });
  }

  // 暴露到 ND
  ND.initSearch = initSearch;
  ND.performSearch = performSearch;
  ND.clearSearch = clearSearch;
  ND.highlightInEditor = highlightInEditor;
  ND.clearHighlights = clearHighlights;

  // 页面加载后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSearch);
  } else {
    initSearch();
  }
})();
