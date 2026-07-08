/**
 * @file         js/editor-events.js
 * @description  Note Diary — 编辑器输入/键盘事件 + 块/行标记检测 + 撤销/重做
 * @author       tianxj22
 * @created      2026-06-25
 * @updated      2026-06-26
 * @version      1.0.0
 */

// ============================================================
// editor-events.js — 编辑器输入/键盘事件 + 块/行标记检测
// ============================================================

// ---- 编辑事件 ----
function onEditorInput() {
  updateUndoRedoButtons();
}

/**
 * 在光标位置插入 HTML（可撤销 — 使用 execCommand）
 * @param {string} html - 要插入的 HTML 字符串
 */
function execInsertHTML(html) {
  if (!ND.editorDiv) return;
  ND.editorDiv.focus();
  document.execCommand('insertHTML', false, html + '<br>');
}

/**
 * 选中指定元素并删除（可撤销 — 使用 execCommand）
 * @param {Element} el - 要删除的元素
 */
function execDeleteElement(el) {
  if (!ND.editorDiv || !el) return;
  ND.editorDiv.focus();
  const sel = window.getSelection();
  const range = document.createRange();
  range.selectNode(el);
  sel.removeAllRanges();
  sel.addRange(range);
  document.execCommand('delete');
}

/**
 * 复制选中的媒体（图片/视频）到系统剪贴板
 */
async function copySelectedMediaToClipboard() {
  if (!ND.selectedImage) return;
  var el = ND.selectedImage;
  var isWrapper = el.classList.contains('media-crop-wrapper');
  var mediaEl = isWrapper ? el.querySelector('video') : el;
  if (!mediaEl) return;

  var src = mediaEl.getAttribute('src') || mediaEl.src;
  if (!src) return;

  // 将 file:/// URL 转换为文件系统路径
  var filePath = src;
  if (filePath.startsWith('file:///')) {
    // Windows: file:///C:/path → C:/path
    filePath = filePath.replace(/^file:\/\/\//, '');
    // Unix: file:///path → /path
    if (filePath.match(/^[A-Z]:/i)) {
      // Windows path already correct
    }
    filePath = decodeURIComponent(filePath);
  }

  var mediaType = (mediaEl.tagName === 'VIDEO') ? 'video' : 'image';
  var ok = await window.electronAPI.copyMediaToClipboard(filePath, mediaType);
  if (ok) {
    ND.statusLeft.textContent = mediaType === 'image' ? '图片已复制到剪贴板' : '视频路径已复制到剪贴板';
  } else {
    ND.statusLeft.textContent = '复制失败';
  }
  setTimeout(function() { updateStatus(); }, 2000);
}

/**
 * 获取当前光标所在的块级元素
 * @returns {Element|null}
 */
function getCurrentBlock() {
  const sel = window.getSelection();
  if (!sel.rangeCount) return null;
  let node = sel.anchorNode;
  while (node && node !== ND.editorDiv) {
    if (node.nodeType === 1) {
      const tag = node.tagName ? node.tagName.toLowerCase() : '';
      if (tag === 'div' || tag === 'p' || tag === 'li') return node;
    }
    node = node.parentNode;
  }
  return null;
}

/** 获取块级元素中的标记元素（清单或日志） */
function getBlockMarker(block) {
  if (!block) return null;
  const cb = block.querySelector('.check-box');
  if (cb) return { type: 'checklist', el: cb };
  const log = block.querySelector('.log-stamp');
  if (log) return { type: 'log', el: log };
  return null;
}

/** 块的文本内容是否为空（仅标记元素） */
function isBlockContentEmpty(block) {
  if (!block) return true;
  // 克隆节点并移除标记元素，检查剩余文本
  const clone = block.cloneNode(true);
  clone.querySelectorAll('.check-box, .log-stamp').forEach(el => el.remove());
  return clone.textContent.trim() === '';
}

/**
 * 获取当前光标所在逻辑行的标记（清单或日志时间戳）
 * 使用行级 sibling-walking 检测，不依赖块级元素结构
 * @returns {{ type: 'checklist'|'log', el: Element } | null}
 */
function getCurrentLineMarker() {
  if (!ND.editorDiv) return null;
  const sel = window.getSelection();
  if (!sel.rangeCount) return null;
  const range = sel.getRangeAt(0);

  // Step 1: 找到行的容器和光标在容器中的位置
  let node = range.startContainer;
  let container = ND.editorDiv;

  // 向上查找最近的块级容器（div/p/li）
  while (node && node !== ND.editorDiv) {
    if (node.nodeType === 1) {
      const tag = node.tagName.toLowerCase();
      if (tag === 'div' || tag === 'p' || tag === 'li') {
        container = node;
        break;
      }
    }
    node = node.parentNode;
  }

  // Step 2: 从光标位置向上找到容器的直接子节点
  node = range.startContainer;
  while (node.parentNode && node.parentNode !== container) {
    node = node.parentNode;
  }
  // node 现在是容器的一个直接子节点（或等于 range.startContainer）

  // Step 3: 向前遍历兄弟节点，查找标记元素
  let current = node;
  while (current) {
    if (current.nodeType === 1) {
      const tag = current.tagName.toLowerCase();
      // 行边界：<br>、块级元素
      if (tag === 'br' || tag === 'div' || tag === 'p' || tag === 'li') {
        return null;
      }
      // 检查是否为标记元素
      if (current.classList) {
        if (current.classList.contains('check-box')) {
          return { type: 'checklist', el: current };
        }
        if (current.classList.contains('log-stamp')) {
          return { type: 'log', el: current };
        }
      }
      // 检查后代中是否有标记（处理 <b><span class="check-box"> 等嵌套情况）
      const cb = current.querySelector('.check-box');
      if (cb) return { type: 'checklist', el: cb };
      const log = current.querySelector('.log-stamp');
      if (log) return { type: 'log', el: log };
    }
    current = current.previousSibling;
  }

  return null;
}

/**
 * 检查当前逻辑行是否为空（仅含标记元素，无实际文本）
 * 仅在 getCurrentLineMarker() 返回非 null 时调用
 * @returns {boolean}
 */
function isCurrentLineEmpty() {
  const marker = getCurrentLineMarker();
  if (!marker) return true;
  // 从标记元素向后遍历兄弟节点，收集文本
  // 遇到 <br> 或块级元素边界时停止
  let node = marker.el.nextSibling;
  let text = '';
  while (node) {
    if (node.nodeType === 1) {
      const tag = node.tagName.toLowerCase();
      if (tag === 'br' || tag === 'div' || tag === 'p' || tag === 'li') break;
      // 跳过嵌套的标记元素，但收集其他元素的文本
      if (!node.classList ||
          (!node.classList.contains('check-box') && !node.classList.contains('log-stamp'))) {
        text += node.textContent || '';
      }
    } else if (node.nodeType === 3) {
      text += node.textContent;
    }
    node = node.nextSibling;
  }
  return text.trim() === '';
}

// ---- 编辑事件 ----
function onEditorInput() {
  updateUndoRedoButtons();
  autoSave();
}

function onEditorKeydown(e) {
  // Delete/Backspace: 删除选中的媒体元素
  if ((e.key === 'Delete' || e.key === 'Backspace') && ND.selectedImage) {
    e.preventDefault();
    var el = ND.selectedImage;
    el.remove();
    deselectImage();
    return;
  }
  // Ctrl+C: 复制选中的媒体到剪贴板
  if (e.ctrlKey && e.key === 'c' && ND.selectedImage) {
    e.preventDefault();
    copySelectedMediaToClipboard();
    return;
  }
  if (e.ctrlKey && e.key === 'n') {
    e.preventDefault();
    createNewNote();
    return;
  }
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    manualSave();
    return;
  }
  if (e.key === 'Enter') {
    const marker = getCurrentLineMarker();
    if (!marker) return; // 普通行，正常回车
    e.preventDefault();
    if (isCurrentLineEmpty()) {
      // 空行：删除标记（可撤销），创建普通换行
      execDeleteElement(marker.el);
      ND.editorDiv.normalize();
      document.execCommand('insertLineBreak');
    } else {
      // 有内容：拆分当前行，给新行也插入同类型标记（可撤销）
      document.execCommand('insertLineBreak');
      setTimeout(() => {
        if (marker.type === 'checklist') {
          execInsertHTML('<span class="check-box" contenteditable="false">☐</span>&nbsp;');
        } else {
          const now = new Date();
          const pad = n => String(n).padStart(2, '0');
          const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
          execInsertHTML('<span class="log-stamp" contenteditable="false">' + ts + '</span>&nbsp;');
        }
      }, 0);
    }
    return;
  }
  if (e.key === 'Backspace') {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (!range.collapsed) return; // 有选中内容，走默认行为
    const marker = getCurrentLineMarker();
    if (!marker) return; // 无标记，正常 Backspace
    // 检查光标是否在标记后（行首位置）
    if (range.startOffset !== 0) return;
    // 向前遍历确认光标与标记之间无实际文本
    let node = range.startContainer;
    let foundText = false;
    let foundMarker = false;
    while (node && node !== ND.editorDiv) {
      if (node === marker.el) {
        foundMarker = true;
        break;
      }
      if (node.nodeType === 3 && node.textContent.replace(/[  \s]/g, '').length > 0) {
        foundText = true;
        break;
      }
      if (node.nodeType === 1 && node.tagName === 'BR') {
        break;
      }
      if (node.previousSibling) {
        node = node.previousSibling;
      } else {
        node = node.parentNode;
      }
    }
    if (foundMarker) {
      e.preventDefault();
      const markerEl = marker.el;
      const nbspNode = markerEl.nextSibling;
      const isNbsp = nbspNode && nbspNode.nodeType === 3 && / /.test(nbspNode.textContent);
      const wrapperNode = isNbsp ? nbspNode.nextSibling : null;
      // 选中 marker + nbsp，用 execCommand 删除（可撤销）
      ND.editorDiv.focus();
      const sel2 = window.getSelection();
      const delRange = document.createRange();
      delRange.setStartBefore(markerEl);
      if (isNbsp) { delRange.setEndAfter(nbspNode); }
      else { delRange.setEndAfter(markerEl); }
      sel2.removeAllRanges();
      sel2.addRange(delRange);
      document.execCommand('delete');
      // 解包 .checklist-checked wrapper（手动清理）
      if (wrapperNode && wrapperNode.nodeType === 1 && wrapperNode.classList.contains('checklist-checked')) {
        while (wrapperNode.firstChild) {
          wrapperNode.parentNode.insertBefore(wrapperNode.firstChild, wrapperNode);
        }
        wrapperNode.remove();
      }
      ND.editorDiv.normalize();
    }
  }
}

// ---- 撤销/重做（使用浏览器原生 contenteditable 机制） ----
/**
 * 更新撤销/重做按钮的启用状态
 */
function updateUndoRedoButtons() {
  try {
    ND.btnUndo.disabled = !document.queryCommandEnabled('undo');
    ND.btnRedo.disabled = !document.queryCommandEnabled('redo');
  } catch (_) {
    // queryCommandEnabled 可能抛异常，忽略
  }
}

// ---- 行号（纯视觉，不保存到文件） ----

/**
 * 更新编辑区左侧逻辑行号
 *
 * 每个块级元素（<div>/<p>/<li>/heading）的第一个字符处标注一个行号；
 * <br> 产生额外行号；自动换行不标注。
 * 行号通过 getBoundingClientRect 计算绝对位置，对齐段落顶部。
 */
function updateLineNumbers() {
  var gutter = document.getElementById('line-gutter');
  if (!gutter || !ND.editorDiv || !ND.editorScroll) return;

  var contentEl = ND.editorDiv;
  var scrollEl = ND.editorScroll;
  var scrollRect = scrollEl.getBoundingClientRect();
  var scrollTop = scrollEl.scrollTop;

  var fragments = [];
  var lineNum = 0;

  // 需要跳过的特殊元素标签（列表/清单/时间戳不显示行号）
  var skipTags = { OL: true, UL: true };

  // 遍历 editor-content 的直接子元素
  var children = contentEl.children;
  for (var i = 0; i < children.length; i++) {
    var child = children[i];
    if (!child.tagName) continue;

    // 跳过列表容器（<ol>/<ul>）
    if (skipTags[child.tagName]) continue;

    // 跳过含清单或日志时间标记的块（无论有无额外内容）
    if (child.querySelector('.check-box, .log-stamp')) continue;

    // 该块的第一个逻辑行：标注行号
    lineNum++;
    var childRect = child.getBoundingClientRect();
    var childTop = childRect.top - scrollRect.top + scrollTop;
    fragments.push({ num: lineNum, top: childTop });

    // 块内 <br>：每个产生额外行号，但跳过空块的占位 <br>
    var blockText = child.textContent;
    var hasContent = blockText && blockText.trim().length > 0;
    if (hasContent) {
      var brs = child.querySelectorAll('br');
      for (var b = 0; b < brs.length; b++) {
        lineNum++;
        var range = document.createRange();
        range.setStartBefore(brs[b]);
        var brRect = range.getBoundingClientRect();
        var brTop = brRect.top - scrollRect.top + scrollTop;
        fragments.push({ num: lineNum, top: brTop });
      }
    }
  }

  // 如果连一个块都没有，至少显示行号 1
  if (fragments.length === 0 && contentEl.textContent.trim()) {
    fragments.push({ num: 1, top: 0 });
  }

  // 构建行号 HTML
  var html = '';
  for (var f = 0; f < fragments.length; f++) {
    html += '<span class="line-num" style="top:' + fragments[f].top + 'px">' + fragments[f].num + '</span>';
  }
  gutter.innerHTML = html;
}

