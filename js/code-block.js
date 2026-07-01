/**
 * @file         js/code-block.js
 * @description  Note Diary — 代码块模块：插入/编辑/删除/高亮（基于 Prism.js）
 * @author       tianxj22
 * @created      2026-07-01
 * @updated      2026-07-01
 * @version      1.0.0
 */

(function () {
  var ND = window.ND;

  /** 当前正在编辑的代码块 wrapper（编辑模式） */
  var editingWrapper = null;

  /**
   * 支持的语言列表
   */
  var SUPPORTED_LANGUAGES = [
    { id: 'javascript', label: 'JavaScript' },
    { id: 'typescript', label: 'TypeScript' },
    { id: 'python',     label: 'Python' },
    { id: 'markup',     label: 'HTML / XML' },
    { id: 'css',        label: 'CSS' },
    { id: 'json',       label: 'JSON' },
    { id: 'bash',       label: 'Bash / Shell' },
    { id: 'sql',        label: 'SQL' },
  ];

  /**
   * 语言 ID → 显示名称
   * @param {string} langId
   * @returns {string}
   */
  function getLangLabel(langId) {
    for (var i = 0; i < SUPPORTED_LANGUAGES.length; i++) {
      if (SUPPORTED_LANGUAGES[i].id === langId) {
        return SUPPORTED_LANGUAGES[i].label;
      }
    }
    return langId;
  }

  /**
   * 构建完整的代码块 wrapper HTML（含高亮）
   * @param {string} langId - 语言 ID
   * @param {string} codeText - 原始代码文本
   * @returns {string} 完整 HTML 字符串
   */
  function buildCodeBlockHTML(langId, codeText) {
    var highlighted;
    try {
      if (Prism.languages[langId]) {
        highlighted = Prism.highlight(codeText, Prism.languages[langId], langId);
      } else {
        highlighted = escapeHtml(codeText);
      }
    } catch (_) {
      highlighted = escapeHtml(codeText);
    }

    var label = getLangLabel(langId);

    return (
      '<div class="code-block-wrapper" contenteditable="false">' +
        '<div class="code-block-header">' +
          '<span class="code-lang-label">' + escapeHtml(label) + '</span>' +
          '<button class="code-block-edit-btn">编辑</button>' +
          '<button class="code-block-delete-btn">&times;</button>' +
        '</div>' +
        '<pre class="code-block" spellcheck="false">' +
          '<code class="language-' + langId + '">' + highlighted + '</code>' +
        '</pre>' +
      '</div>'
    );
  }

  /**
   * 从代码块 DOM 中提取原始代码文本（用于编辑时回填）
   * @param {HTMLElement} wrapper - .code-block-wrapper 元素
   * @returns {string}
   */
  function extractCodeFromBlock(wrapper) {
    var code = wrapper.querySelector('code');
    if (!code) return '';
    return code.textContent || '';
  }

  /**
   * 从代码块 DOM 中提取语言 ID
   * @param {HTMLElement} wrapper
   * @returns {string}
   */
  function extractLangFromBlock(wrapper) {
    var code = wrapper.querySelector('code');
    if (!code) return 'javascript';
    var cls = code.className || '';
    var match = cls.match(/language-(\S+)/);
    return match ? match[1] : 'javascript';
  }

  /**
   * 渲染语言下拉选项
   * @param {string} selectedId — 当前选中的语言
   */
  function populateLangSelect(selectedId) {
    var select = document.getElementById('code-block-lang');
    if (!select) return;
    select.innerHTML = '';
    SUPPORTED_LANGUAGES.forEach(function (lang) {
      var opt = document.createElement('option');
      opt.value = lang.id;
      opt.textContent = lang.label;
      if (lang.id === selectedId) opt.selected = true;
      select.appendChild(opt);
    });
  }

  /**
   * 弹出代码块模态框
   * @param {object|null} existingData — 编辑模式：{ wrapper, langId, code }
   */
  function showCodeBlockModal(existingData) {
    // 保存编辑器当前光标位置，以便插入时恢复
    ND._savedCodeBlockRange = null;
    if (!existingData && ND.editorDiv) {
      var sel = window.getSelection();
      if (sel.rangeCount > 0 && ND.editorDiv.contains(sel.anchorNode)) {
        ND._savedCodeBlockRange = sel.getRangeAt(0).cloneRange();
      }
    }

    var overlay = document.getElementById('code-block-overlay');
    var title = document.getElementById('code-block-modal-title');
    var textarea = document.getElementById('code-block-textarea');
    var confirmBtn = document.getElementById('code-block-confirm');

    if (!overlay || !title || !textarea) return;

    if (existingData) {
      editingWrapper = existingData.wrapper;
      title.textContent = '编辑代码块';
      populateLangSelect(existingData.langId);
      textarea.value = existingData.code;
      if (confirmBtn) confirmBtn.textContent = '保存';
    } else {
      editingWrapper = null;
      title.textContent = '插入代码块';
      populateLangSelect('javascript');
      textarea.value = '';
      if (confirmBtn) confirmBtn.textContent = '插入';
    }

    overlay.classList.add('visible');
    textarea.focus();
  }

  /**
   * 关闭代码块模态框
   */
  function hideCodeBlockModal() {
    var overlay = document.getElementById('code-block-overlay');
    if (overlay) overlay.classList.remove('visible');
    editingWrapper = null;
    ND._savedCodeBlockRange = null;
  }

  /**
   * 确认插入/编辑
   */
  function confirmCodeBlock() {
    var select = document.getElementById('code-block-lang');
    var textarea = document.getElementById('code-block-textarea');
    if (!select || !textarea) return;

    var langId = select.value;
    var code = textarea.value;

    if (editingWrapper) {
      // 编辑模式：替换已有代码块
      var newHTML = buildCodeBlockHTML(langId, code);
      editingWrapper.outerHTML = newHTML;
      // 触发保存
      if (ND.saveCurrentNote) ND.saveCurrentNote();
    } else {
      // 插入模式：恢复之前保存的光标位置
      if (!ND.editorDiv) return;
      if (ND._savedCodeBlockRange) {
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(ND._savedCodeBlockRange);
        ND._savedCodeBlockRange = null;
      }
      ND.editorDiv.focus();
      var html = buildCodeBlockHTML(langId, code);
      if (typeof execInsertHTML === 'function') {
        execInsertHTML(html);
      } else {
        document.execCommand('insertHTML', false, html);
      }
    }

    hideCodeBlockModal();
  }

  /**
   * 删除代码块
   * @param {HTMLElement} wrapper
   */
  function deleteCodeBlock(wrapper) {
    if (!wrapper) return;
    wrapper.remove();
    if (ND.saveCurrentNote) ND.saveCurrentNote();
  }

  /**
   * 代码块事件委托
   * - 双击 .code-block-wrapper → 编辑
   * - 点击 .code-block-edit-btn → 编辑
   * - 点击 .code-block-delete-btn → 删除
   */
  function handleCodeBlockEvent(e) {
    // 编辑按钮
    var editBtn = e.target.closest('.code-block-edit-btn');
    if (editBtn) {
      e.preventDefault();
      var w1 = editBtn.closest('.code-block-wrapper');
      if (w1) {
        var lang1 = extractLangFromBlock(w1);
        var code1 = extractCodeFromBlock(w1);
        showCodeBlockModal({ wrapper: w1, langId: lang1, code: code1 });
      }
      return;
    }

    // 删除按钮
    var deleteBtn = e.target.closest('.code-block-delete-btn');
    if (deleteBtn) {
      e.preventDefault();
      var w2 = deleteBtn.closest('.code-block-wrapper');
      deleteCodeBlock(w2);
      return;
    }

    // 双击代码块
    var wrapper = e.target.closest('.code-block-wrapper');
    if (wrapper && e.type === 'dblclick') {
      e.preventDefault();
      var lang = extractLangFromBlock(wrapper);
      var code = extractCodeFromBlock(wrapper);
      showCodeBlockModal({ wrapper: wrapper, langId: lang, code: code });
    }
  }

  /**
   * 初始化代码块事件委托
   */
  function initCodeBlockDelegation() {
    // 工具栏按钮
    var btnCodeBlock = document.getElementById('btn-code-block');
    if (btnCodeBlock) {
      btnCodeBlock.addEventListener('click', function () {
        if (ND.editorDiv) {
          ND.editorDiv.focus();
          ND.showCodeBlockModal(null);
        }
      });
    }

    if (ND.editorArea) {
      ND.editorArea.addEventListener('dblclick', handleCodeBlockEvent);
      ND.editorArea.addEventListener('click', handleCodeBlockEvent);
    }

    // 模态框按钮
    var confirmBtn = document.getElementById('code-block-confirm');
    var cancelBtn = document.getElementById('code-block-cancel');
    var overlay = document.getElementById('code-block-overlay');

    if (confirmBtn) confirmBtn.addEventListener('click', confirmCodeBlock);
    if (cancelBtn) cancelBtn.addEventListener('click', hideCodeBlockModal);
    if (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) hideCodeBlockModal();
      });
    }

    // Escape 关闭
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay && overlay.classList.contains('visible')) {
        hideCodeBlockModal();
      }
      // Enter + Ctrl 提交
      if (e.key === 'Enter' && e.ctrlKey && overlay && overlay.classList.contains('visible')) {
        confirmCodeBlock();
      }
    });
  }

  // ---- 暴露到 ND 命名空间 ----
  ND.showCodeBlockModal = showCodeBlockModal;
  ND.hideCodeBlockModal = hideCodeBlockModal;
  ND.insertCodeBlock = function (lang, code) {
    if (!ND.editorDiv) return;
    ND.editorDiv.focus();
    var html = buildCodeBlockHTML(lang, code);
    if (typeof execInsertHTML === 'function') {
      execInsertHTML(html);
    } else {
      document.execCommand('insertHTML', false, html);
    }
  };
  ND.buildCodeBlockHTML = buildCodeBlockHTML;
  ND.getLangLabel = getLangLabel;
  ND.extractCodeFromBlock = extractCodeFromBlock;

  // 页面加载后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCodeBlockDelegation);
  } else {
    initCodeBlockDelegation();
  }
})();
