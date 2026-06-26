/**
 * @file         js/editor-markers.js
 * @description  Note Diary — 清单复选框 / 日志时间戳标记创建与切换
 * @author       tianxj22
 * @created      2026-06-25
 * @updated      2026-06-26
 * @version      1.0.0
 */

// ============================================================
// editor-markers.js — 清单复选框 / 日志时间戳标记创建与切换
// ============================================================

/**
 * 切换当前行 checkbox 后的划线样式（仅作用于当前行，不影响其他行）
 * @param {Element} checkboxEl - 被切换的 .check-box 元素
 * @param {boolean} isChecked - 是否勾选
 */
function toggleLineStrikethrough(checkboxEl, isChecked) {
  if (isChecked) {
    // 收集当前行 checkbox 之后的所有节点（至 <br> 或块边界）
    let node = checkboxEl.nextSibling;
    const lineNodes = [];
    while (node) {
      if (node.nodeType === 1) {
        const tag = node.tagName.toLowerCase();
        if (tag === 'br' || tag === 'div' || tag === 'p' || tag === 'li') break;
      }
      lineNodes.push(node);
      node = node.nextSibling;
    }
    if (lineNodes.length > 0) {
      const wrapper = document.createElement('span');
      wrapper.className = 'checklist-checked';
      lineNodes[0].parentNode.insertBefore(wrapper, lineNodes[0]);
      for (const n of lineNodes) wrapper.appendChild(n);
    }
  } else {
    // 解包：找到紧跟 checkbox 的 .checklist-checked span
    let wrapper = checkboxEl.nextSibling;
    // 跳过纯空白文本节点（如 &nbsp;）
    while (wrapper && wrapper.nodeType === 3 && wrapper.textContent.trim() === '') {
      wrapper = wrapper.nextSibling;
    }
    if (wrapper && wrapper.nodeType === 1 && wrapper.classList.contains('checklist-checked')) {
      while (wrapper.firstChild) {
        wrapper.parentNode.insertBefore(wrapper.firstChild, wrapper);
      }
      wrapper.remove();
    }
  }
}

/** 在块中插入复选框 */
function insertCheckboxMarker(block) {
  const cb = document.createElement('span');
  cb.className = 'check-box';
  cb.contentEditable = 'false';
  cb.textContent = '☐';
  cb.title = '点击切换完成状态';
  block.insertBefore(cb, block.firstChild);
  const space = document.createTextNode(' ');
  if (cb.nextSibling) block.insertBefore(space, cb.nextSibling);
  else block.appendChild(space);
}

/** 在块中插入日志时间戳 */
function insertTimestampMarker(block) {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const span = document.createElement('span');
  span.className = 'log-stamp';
  span.contentEditable = 'false';
  span.textContent = ts;
  block.insertBefore(span, block.firstChild);
  const space = document.createTextNode(' ');
  if (span.nextSibling) block.insertBefore(space, span.nextSibling);
  else block.appendChild(space);
}

/**
 * 创建复选框元素（不插入 DOM）
 * @returns {HTMLSpanElement}
 */
function createCheckboxElement() {
  const cb = document.createElement('span');
  cb.className = 'check-box';
  cb.contentEditable = 'false';
  cb.textContent = '☐';
  cb.title = '点击切换完成状态';
  return cb;
}

/**
 * 创建日志时间戳元素（不插入 DOM）
 * @returns {HTMLSpanElement}
 */
function createTimestampElement() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const span = document.createElement('span');
  span.className = 'log-stamp';
  span.contentEditable = 'false';
  span.textContent = ts;
  return span;
}

// ---- 清单按钮点击 ----
document.getElementById('btn-checklist').addEventListener('click', () => {
  if (!ND.editorDiv) return;
  ND.editorDiv.focus();
  // 单标记约束：如果当前行已有标记，不重复插入（清单则切换状态）
  const existing = getCurrentLineMarker();
  if (existing) {
    if (existing.type === 'checklist') {
      // 已有清单标记：切换完成状态
      existing.el.classList.toggle('checked');
      const isChecked = existing.el.classList.contains('checked');
      existing.el.textContent = isChecked ? '☑' : '☐';
      toggleLineStrikethrough(existing.el, isChecked);
    }
    // 已有不同类型标记：不做任何操作
    return;
  }
  // 无标记：正常插入（可撤销）
  execInsertHTML('<span class="check-box" contenteditable="false">☐</span>&nbsp;');
});

// ---- 日志时间戳按钮点击 ----
document.getElementById('btn-timestamp').addEventListener('click', () => {
  if (!ND.editorDiv) return;
  ND.editorDiv.focus();
  // 单标记约束：如果当前行已有标记，不插入
  const existing = getCurrentLineMarker();
  if (existing) return;
  // 无标记：正常插入（可撤销）
  const el = createTimestampElement();
  execInsertHTML('<span class="log-stamp" contenteditable="false">' + el.textContent + '</span>&nbsp;');
});

// ---- 委托：点击复选框切换完成状态 ----
ND.editorArea.addEventListener('click', (e) => {
  const cb = e.target.closest('.check-box');
  if (!cb || !ND.editorDiv) return;
  e.stopPropagation();
  const isChecked = cb.classList.toggle('checked');
  cb.textContent = isChecked ? '☑' : '☐';
  toggleLineStrikethrough(cb, isChecked);
});
