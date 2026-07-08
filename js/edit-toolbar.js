/**
 * @file         js/edit-toolbar.js
 * @description  Note Diary — 编辑标签页：查找替换 + 删除线 + 清除格式 + 列表 + 缩进 + 全选
 * @author       tianxj22
 * @created      2026-06-29
 * @updated      2026-06-29
 * @version      1.0.0
 */

(function () {
  var ND = window.ND;

  // ---- 查找状态 ----
  ND.findState = {
    visible: false,
    term: '',
    caseSensitive: false,
    matchCount: 0,
    currentIndex: 0,
  };

  /**
   * 执行 contenteditable 命令（复用 style-toolbar.js 模式）
   * @param {string} command
   * @param {string} [value]
   */
  function execEditCommand(command, value) {
    if (ND.editorDiv) {
      ND.editorDiv.focus();
      document.execCommand(command, false, value);
      // 列表插入后添加空行
      if (command === 'insertOrderedList' || command === 'insertUnorderedList') {
        document.execCommand('insertHTML', false, '<br>');
      }
    }
  }

  // ---- 查找栏 ----

  var findBar, findInput, replaceInput, findCountEl, btnCase;

  /**
   * 初始化查找栏 DOM 引用（DOMContentLoaded 后调用）
   */
  function initFindBarRefs() {
    findBar = document.getElementById('find-bar');
    findInput = document.getElementById('find-input');
    replaceInput = document.getElementById('replace-input');
    findCountEl = document.getElementById('find-count');
    btnCase = document.getElementById('btn-find-case');
  }

  /**
   * 显示/隐藏查找栏
   */
  function toggleFindBar() {
    if (!ND.editorDiv) return;
    if (!findBar) initFindBarRefs();
    if (!findBar) return;

    if (findBar.classList.contains('visible')) {
      closeFindBar();
    } else {
      openFindBar();
    }
  }

  function openFindBar() {
    if (!findBar) initFindBarRefs();
    findBar.classList.add('visible');
    ND.findState.visible = true;
    findInput.value = ND.findState.term;
    findInput.focus();
    findInput.select();
    updateCaseButton();
  }

  function closeFindBar() {
    if (!findBar) return;
    findBar.classList.remove('visible');
    ND.findState.visible = false;
    // 清除浏览器查找高亮
    window.getSelection().removeAllRanges();
    if (ND.editorDiv) ND.editorDiv.focus();
  }

  /**
   * 执行查找（向前/向后）
   * @param {boolean} backwards
   */
  function doFind(backwards) {
    if (!ND.editorDiv) return;
    var term = findInput ? findInput.value : ND.findState.term;
    if (!term) return;

    ND.editorDiv.focus();
    ND.findState.term = term;

    var found = window.find(
      term,
      ND.findState.caseSensitive,  // caseSensitive
      backwards,                     // backwards
      true,                          // wrapAround
      false,                         // wholeWord
      false,                         // searchInFrames
      false                          // showDialog
    );

    if (found) {
      updateFindCount();
    } else if (ND.findState.matchCount === 0) {
      findCountEl.textContent = '无匹配';
    }
  }

  function findNext() { doFind(false); }
  function findPrev() { doFind(true); }

  /**
   * 更新匹配计数显示
   */
  function updateFindCount() {
    if (!ND.editorDiv || !ND.findState.term) {
      findCountEl.textContent = '';
      return;
    }
    // 粗略计数：通过文本节点统计
    var count = countMatches(ND.editorDiv, ND.findState.term, ND.findState.caseSensitive);
    ND.findState.matchCount = count;
    if (count > 0) {
      findCountEl.textContent = count + ' 个匹配';
    } else {
      findCountEl.textContent = '无匹配';
    }
  }

  /**
   * 统计编辑器内所有文本节点的匹配次数
   * @param {Node} root
   * @param {string} term
   * @param {boolean} caseSensitive
   * @returns {number}
   */
  function countMatches(root, term, caseSensitive) {
    var count = 0;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        // 跳过 contenteditable="false" 内的文本（清单、时间戳）
        var parent = node.parentElement;
        if (parent && parent.getAttribute('contenteditable') === 'false') return NodeFilter.FILTER_REJECT;
        // 跳过空白/脚本/样式节点
        if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    var searchTerm = caseSensitive ? term : term.toLowerCase();
    while (walker.nextNode()) {
      var text = caseSensitive ? walker.currentNode.textContent : walker.currentNode.textContent.toLowerCase();
      var idx = 0;
      while ((idx = text.indexOf(searchTerm, idx)) !== -1) {
        count++;
        idx += searchTerm.length;
      }
    }
    return count;
  }

  /**
   * 替换当前匹配项
   */
  function replaceCurrent() {
    if (!ND.editorDiv) return;
    var term = findInput.value;
    var replacement = replaceInput.value;
    if (!term) return;

    ND.editorDiv.focus();

    // 检查当前选区是否包含查找词
    var sel = window.getSelection();
    if (sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed) {
      var range = sel.getRangeAt(0);
      var selectedText = range.toString();
      var compareTerm = ND.findState.caseSensitive ? term : term.toLowerCase();
      var compareSelected = ND.findState.caseSensitive ? selectedText : selectedText.toLowerCase();
      if (compareSelected === compareTerm) {
        range.deleteContents();
        range.insertNode(document.createTextNode(replacement));
        // 查找下一个
        findNext();
        return;
      }
    }

    // 没有选中匹配项，先查找再替换
    var found = window.find(term, ND.findState.caseSensitive, false, true, false, false, false);
    if (found) {
      var sel2 = window.getSelection();
      if (sel2.rangeCount > 0) {
        var range2 = sel2.getRangeAt(0);
        range2.deleteContents();
        range2.insertNode(document.createTextNode(replacement));
      }
      findNext();
    }
  }

  /**
   * 全部替换
   */
  function replaceAll() {
    if (!ND.editorDiv) return;
    var term = findInput.value;
    var replacement = replaceInput.value;
    if (!term) return;

    var count = replaceAllInNode(ND.editorDiv, term, replacement, ND.findState.caseSensitive);
    ND.statusLeft.textContent = '已替换 ' + count + ' 处';
    ND.findState.matchCount = 0;
    findCountEl.textContent = count + ' 处已替换';
    // 标记为已修改以便保存
    ND.lastSavedContent = '';
    setTimeout(function () {
      if (ND.statusLeft.textContent.indexOf('已替换') === 0) {
        ND.statusLeft.textContent = '就绪';
      }
    }, 2000);
  }

  /**
   * 在节点树中全部替换文本
   * @param {Node} root
   * @param {string} term
   * @param {string} replacement
   * @param {boolean} caseSensitive
   * @returns {number} 替换次数
   */
  function replaceAllInNode(root, term, replacement, caseSensitive) {
    var count = 0;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var parent = node.parentElement;
        if (parent && parent.getAttribute('contenteditable') === 'false') return NodeFilter.FILTER_REJECT;
        if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    var nodesToReplace = [];
    while (walker.nextNode()) {
      nodesToReplace.push(walker.currentNode);
    }
    var flags = caseSensitive ? 'g' : 'gi';
    var regex = new RegExp(escapeRegex(term), flags);
    nodesToReplace.forEach(function (textNode) {
      var original = textNode.textContent;
      var replaced = original.replace(regex, replacement);
      if (replaced !== original) {
        count += (original.match(regex) || []).length;
        textNode.textContent = replaced;
      }
    });
    return count;
  }

  /**
   * 转义正则特殊字符
   * @param {string} str
   * @returns {string}
   */
  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 切换大小写敏感
   */
  function toggleCaseSensitive() {
    ND.findState.caseSensitive = !ND.findState.caseSensitive;
    updateCaseButton();
    // 重新搜索
    if (ND.findState.term) {
      updateFindCount();
      doFind(false);
    }
  }

  function updateCaseButton() {
    if (btnCase) {
      btnCase.classList.toggle('active-toggle', ND.findState.caseSensitive);
    }
  }

  // ---- 事件绑定 ----
  document.addEventListener('DOMContentLoaded', function () {
    initFindBarRefs();

    // 查找栏按钮
    document.getElementById('btn-find-open').addEventListener('click', toggleFindBar);
    document.getElementById('btn-find-next').addEventListener('click', findNext);
    document.getElementById('btn-find-prev').addEventListener('click', findPrev);
    document.getElementById('btn-find-case').addEventListener('click', toggleCaseSensitive);
    document.getElementById('btn-replace').addEventListener('click', replaceCurrent);
    document.getElementById('btn-replace-all').addEventListener('click', replaceAll);
    document.getElementById('btn-find-close').addEventListener('click', closeFindBar);

    // 查找输入框实时搜索
    if (findInput) {
      findInput.addEventListener('input', function () {
        ND.findState.term = this.value;
        if (this.value) {
          doFind(false);
        } else {
          findCountEl.textContent = '';
          ND.findState.matchCount = 0;
        }
      });
      findInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (e.shiftKey) findPrev();
          else findNext();
        }
        if (e.key === 'Escape') closeFindBar();
      });
    }

    // 替换输入框
    if (replaceInput) {
      replaceInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          replaceCurrent();
        }
        if (e.key === 'Escape') closeFindBar();
      });
    }

    // 编辑工具栏按钮
    document.getElementById('btn-strikethrough').addEventListener('click', function () {
      execEditCommand('strikeThrough');
    });
    document.getElementById('btn-remove-format').addEventListener('click', function () {
      execEditCommand('removeFormat');
    });
    document.getElementById('btn-ordered-list').addEventListener('click', function () {
      execEditCommand('insertOrderedList');
    });
    document.getElementById('btn-unordered-list').addEventListener('click', function () {
      execEditCommand('insertUnorderedList');
    });
    document.getElementById('btn-indent').addEventListener('click', function () {
      execEditCommand('indent');
    });
    document.getElementById('btn-outdent').addEventListener('click', function () {
      execEditCommand('outdent');
    });
    document.getElementById('btn-select-all').addEventListener('click', function () {
      execEditCommand('selectAll');
    });
  });

  // ---- 全局快捷键 ----
  document.addEventListener('keydown', function (e) {
    // Ctrl+F: 打开查找栏
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      // 不在输入框中时才能触发
      if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
      e.preventDefault();
      openFindBar();
    }
    // Escape: 关闭查找栏
    if (e.key === 'Escape' && ND.findState.visible) {
      closeFindBar();
    }
  });

  // 暴露到 ND
  ND.toggleFindBar = toggleFindBar;
})();
