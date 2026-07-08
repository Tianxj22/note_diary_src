/**
 * @file         js/tag-system.js
 * @description  Note Diary — 标签系统：+ 按钮下拉菜单 + 侧边栏标签过滤
 * @author       tianxj22
 * @created      2026-07-08
 * @version      2.0.0
 */

// ============================================================
// tag-system.js — 标签系统
// ============================================================

(function () {
  var ND = window.ND;

  // ---- 预设标签（内置，始终显示） ----
  var PRESET_TAGS = [
    { name: '工作', emoji: '💼' },
    { name: '购物清单', emoji: '🛒' },
    { name: '学习', emoji: '📚' },
    { name: '旅行', emoji: '✈️' },
    { name: '美食', emoji: '🍽️' },
    { name: '健身', emoji: '💪' },
    { name: '生活', emoji: '❤️' },
    { name: '目标', emoji: '🎯' },
    { name: '灵感', emoji: '📝' },
    { name: '重要', emoji: '⚠️' },
    { name: '待修复', emoji: '🐛' },
  ];

  /**
   * 获取合并后的完整标签列表（预设 + 自定义）
   * @returns {Array<{name: string, emoji: string}>}
   */
  function getAllTags() {
    var custom = ND.customTags || [];
    // 去重：如果自定义标签与预设有同名，以自定义的 emoji 为准
    var presetNames = {};
    PRESET_TAGS.forEach(function (t) { presetNames[t.name] = t; });
    var result = PRESET_TAGS.slice();
    custom.forEach(function (t) {
      if (!presetNames[t.name]) {
        result.push(t);
      }
    });
    return result;
  }

  // ===== Part A: 标签编辑器 =====

  /**
   * 在编辑器头部渲染标签编辑区
   * @param {string[]} tags - 当前笔记的标签名数组
   */
  function renderTagEditor(tags) {
    // 移除旧行
    var oldEl = document.getElementById('tag-editor-row');
    if (oldEl) oldEl.remove();
    // 移除旧下拉
    var oldDrop = document.getElementById('tag-dropdown-menu');
    if (oldDrop) oldDrop.remove();

    var row = document.createElement('div');
    row.id = 'tag-editor-row';
    row.className = 'tag-editor-row';

    // 已有标签 chips
    (tags || []).forEach(function (tag, i) {
      var tagInfo = findTagInfo(tag);
      var chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.innerHTML = (tagInfo ? tagInfo.emoji + ' ' : '') + escapeHtml(tag)
        + ' <span class="tag-chip-remove" data-index="' + i + '">&times;</span>';
      row.appendChild(chip);
    });

    // + 按钮
    var addBtn = document.createElement('button');
    addBtn.className = 'tag-add-btn';
    addBtn.textContent = '+';
    addBtn.title = '添加标签';
    row.appendChild(addBtn);

    // 下拉菜单（追加到 body，避免被编辑器 overflow 裁剪）
    var dropdown = document.createElement('div');
    dropdown.id = 'tag-dropdown-menu';
    dropdown.className = 'tag-dropdown-menu';
    document.body.appendChild(dropdown);

    // 插入到标题输入框之后
    var titleInput = ND.editorTitleInput;
    if (titleInput && titleInput.parentNode) {
      titleInput.parentNode.insertBefore(row, titleInput.nextSibling);
    }

    // 事件代理：移除标签
    row.addEventListener('click', function (e) {
      var removeEl = e.target.closest('.tag-chip-remove');
      if (removeEl) {
        e.stopPropagation();
        var idx = parseInt(removeEl.getAttribute('data-index'));
        if (!isNaN(idx)) removeTag(idx);
        return;
      }
    });

    // + 按钮：打开下拉
    addBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleTagDropdown(addBtn);
    });

    // 全局点击关闭下拉
    if (!ND._tagDropdownBound) {
      ND._tagDropdownBound = true;
      document.addEventListener('click', function (e) {
        var drop = document.getElementById('tag-dropdown-menu');
        if (drop && drop.classList.contains('visible')) {
          if (!e.target.closest('#tag-editor-row') && !e.target.closest('#tag-dropdown-menu')) {
            drop.classList.remove('visible');
          }
        }
      });
    }
  }

  /**
   * 查找标签信息（emoji）
   * @param {string} name
   * @returns {{name, emoji}|null}
   */
  function findTagInfo(name) {
    var all = getAllTags();
    for (var i = 0; i < all.length; i++) {
      if (all[i].name === name) return all[i];
    }
    return null;
  }

  /**
   * 切换下拉菜单
   * @param {HTMLElement} anchorBtn - + 按钮
   */
  function toggleTagDropdown(anchorBtn) {
    var dropdown = document.getElementById('tag-dropdown-menu');
    if (!dropdown) return;

    if (dropdown.classList.contains('visible')) {
      dropdown.classList.remove('visible');
      return;
    }

    // 定位到按钮下方
    var rect = anchorBtn.getBoundingClientRect();
    dropdown.style.left = rect.left + 'px';
    dropdown.style.top = (rect.bottom + 4) + 'px';
    dropdown.classList.add('visible');

    buildDropdownMenu(dropdown, anchorBtn);
  }

  /**
   * 构建下拉菜单内容
   */
  function buildDropdownMenu(dropdown, anchorBtn) {
    dropdown.innerHTML = '';

    var allTags = getAllTags();
    var currentNames = ND.currentTags || [];

    allTags.forEach(function (t) {
      // 如果当前笔记已有此标签，跳过
      if (currentNames.indexOf(t.name) !== -1) return;

      var item = document.createElement('div');
      item.className = 'menu-item';
      item.textContent = t.emoji + '  ' + t.name;
      item.addEventListener('click', function (e) {
        e.stopPropagation();
        dropdown.classList.remove('visible');
        addTag(t.name);
      });
      dropdown.appendChild(item);
    });

    // 分隔线
    var divider = document.createElement('div');
    divider.className = 'menu-divider';
    dropdown.appendChild(divider);

    // 自定义标签入口
    var customItem = document.createElement('div');
    customItem.className = 'menu-item';
    customItem.textContent = '➕  自定义标签...';
    customItem.addEventListener('click', function (e) {
      e.stopPropagation();
      showCustomTagForm(dropdown, anchorBtn);
    });
    dropdown.appendChild(customItem);
  }

  /**
   * 显示自定义标签表单
   */
  function showCustomTagForm(dropdown, anchorBtn) {
    dropdown.innerHTML = '';

    var form = document.createElement('div');
    form.style.padding = '8px 12px';
    form.style.minWidth = '200px';

    // 名称输入
    var nameLabel = document.createElement('div');
    nameLabel.style.cssText = 'font-size:0.78rem;color:#aaa;margin-bottom:4px;';
    nameLabel.textContent = '标签名称';
    form.appendChild(nameLabel);

    var nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.maxLength = 20;
    nameInput.placeholder = '例如：读书笔记';
    nameInput.style.cssText = 'width:100%;padding:5px 8px;border:1px solid #555;border-radius:4px;background:#3a3a3a;color:#ddd;font-size:0.84rem;outline:none;margin-bottom:8px;box-sizing:border-box;';
    form.appendChild(nameInput);

    // 符号输入
    var emojiLabel = document.createElement('div');
    emojiLabel.style.cssText = 'font-size:0.78rem;color:#aaa;margin-bottom:4px;';
    emojiLabel.textContent = '符号（选填）';
    form.appendChild(emojiLabel);

    var emojiInput = document.createElement('input');
    emojiInput.type = 'text';
    emojiInput.maxLength = 4;
    emojiInput.placeholder = '例如：📖';
    emojiInput.style.cssText = 'width:100%;padding:5px 8px;border:1px solid #555;border-radius:4px;background:#3a3a3a;color:#ddd;font-size:0.84rem;outline:none;margin-bottom:10px;box-sizing:border-box;';
    form.appendChild(emojiInput);

    // 按钮行
    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:6px;';

    var cancelBtn = document.createElement('button');
    cancelBtn.textContent = '← 返回';
    cancelBtn.style.cssText = 'flex:1;padding:5px 0;border:1px solid #555;border-radius:3px;background:transparent;color:#aaa;cursor:pointer;font-size:0.78rem;';
    cancelBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      buildDropdownMenu(dropdown, anchorBtn);
    });
    btnRow.appendChild(cancelBtn);

    var addBtn = document.createElement('button');
    addBtn.textContent = '✓ 添加';
    addBtn.style.cssText = 'flex:1;padding:5px 0;border:1px solid #6c9fff;border-radius:3px;background:#3a5a8a;color:#fff;cursor:pointer;font-size:0.78rem;';
    addBtn.addEventListener('click', async function (e) {
      e.stopPropagation();
      var name = nameInput.value.trim();
      if (!name) return;
      var emoji = emojiInput.value.trim() || '🏷';
      await addCustomTagToLibrary(name, emoji);
      addTag(name);
      dropdown.classList.remove('visible');
    });
    btnRow.appendChild(addBtn);

    form.appendChild(btnRow);
    dropdown.appendChild(form);

    // 自动聚焦
    setTimeout(function () { nameInput.focus(); }, 50);
  }

  /**
   * 添加自定义标签到标签库并持久化
   */
  async function addCustomTagToLibrary(name, emoji) {
    name = name.trim();
    if (!name) return;
    // 检查是否已存在
    for (var i = 0; i < ND.customTags.length; i++) {
      if (ND.customTags[i].name === name) return;
    }
    ND.customTags.push({ name: name, emoji: emoji || '🏷' });
    // 持久化
    try {
      await window.electronAPI.updateSettings({ general: { customTags: ND.customTags } }, null);
    } catch (_) {}
  }

  /**
   * 添加标签到当前笔记
   * @param {string} tag
   */
  async function addTag(tag) {
    tag = tag.trim().toLowerCase();
    if (!tag || tag.length > 50) return;
    if (ND.currentTags.indexOf(tag) !== -1) return;
    if (ND.currentTags.length >= 20) return;
    ND.currentTags.push(tag);
    renderTagEditor(ND.currentTags);
    if (ND.currentNote) {
      await window.electronAPI.updateNoteTags(ND.currentNote.filePath, ND.currentTags);
    }
  }

  /**
   * 移除标签
   * @param {number} index
   */
  async function removeTag(index) {
    ND.currentTags.splice(index, 1);
    renderTagEditor(ND.currentTags);
    if (ND.currentNote) {
      await window.electronAPI.updateNoteTags(ND.currentNote.filePath, ND.currentTags);
    }
  }

  // ===== Part B: 侧边栏标签过滤栏（保持不变） =====

  async function loadTagFilterBar() {
    var bar = document.getElementById('tag-filter-bar');
    if (!bar) return;

    // 绑定「全部」按钮（静态 HTML 中的元素）
    var allChip = bar.querySelector('.tag-filter-chip[data-tag=""]');
    if (allChip && !allChip._wired) {
      allChip._wired = true;
      allChip.addEventListener('click', function () { filterByTag(''); });
    }

    try {
      var tagList = await window.electronAPI.listAllTags();
      var existingChips = bar.querySelectorAll('.tag-filter-chip:not([data-tag=""])');
      existingChips.forEach(function (c) { c.remove(); });

      tagList.forEach(function (item) {
        var chip = document.createElement('span');
        chip.className = 'tag-filter-chip';
        if (ND.activeTagFilter === item.tag) chip.classList.add('active');
        chip.setAttribute('data-tag', item.tag);
        chip.textContent = item.tag + ' (' + item.count + ')';
        chip.addEventListener('click', function () {
          filterByTag(item.tag);
        });
        bar.appendChild(chip);
      });

      bar.style.display = tagList.length > 0 ? '' : 'none';
    } catch (_) {}
  }

  async function filterByTag(tag) {
    // "全部" 按钮：清空过滤
    if (!tag) {
      ND.activeTagFilter = null;
    } else if (ND.activeTagFilter === tag) {
      ND.activeTagFilter = null;
    } else {
      ND.activeTagFilter = tag;
    }
    var bar = document.getElementById('tag-filter-bar');
    if (bar) {
      bar.querySelectorAll('.tag-filter-chip').forEach(function (c) {
        var chipTag = c.getAttribute('data-tag');
        if (!chipTag) {
          c.classList.toggle('active', ND.activeTagFilter === null);
        } else {
          c.classList.toggle('active', chipTag === ND.activeTagFilter);
        }
      });
    }
    await loadNoteList();
    renderNoteList();
  }

  // 暴露到 ND
  ND.renderTagEditor = renderTagEditor;
  ND.loadTagFilterBar = loadTagFilterBar;
  ND.filterByTag = filterByTag;
})();
