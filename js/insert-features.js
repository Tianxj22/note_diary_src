/**
 * @file         js/insert-features.js
 * @description  Note Diary — 图片插入下拉 + 执行插入 + 窗口截图选择器 + 粘贴
 * @author       tianxj22
 * @created      2026-06-25
 * @updated      2026-06-26
 * @version      1.0.0
 */

// ============================================================
// insert-features.js — 图片插入下拉 + 执行插入 + 窗口截图选择器 + 粘贴
// ============================================================

// ---- 图片插入下拉切换 ----
document.getElementById('btn-insert-image').addEventListener('click', (e) => {
  e.stopPropagation();
  ND.dropdownImageMenu.classList.toggle('visible');
});

ND.dropdownImageMenu.querySelectorAll('.menu-item').forEach(item => {
  item.addEventListener('click', async (e) => {
    e.stopPropagation();
    const method = item.dataset.method;
    ND.dropdownImageMenu.classList.remove('visible');
    await executeImageInsert(method);
  });
});

/**
 * 执行图片插入操作
 * @param {string} method - 'file' | 'clipboard' | 'fullscreen' | 'area' | 'window'
 */
async function executeImageInsert(method) {
  if (!ND.editorDiv) return;
  ND.editorDiv.focus();
  let dataUrl = null;
  try {
    switch (method) {
      case 'file':
        dataUrl = await window.electronAPI.openImageFile();
        break;
      case 'clipboard':
        dataUrl = await window.electronAPI.readClipboardImage();
        if (!dataUrl) {
          ND.statusLeft.textContent = '剪贴板中没有图片';
          return;
        }
        break;
      case 'fullscreen':
        ND.statusLeft.textContent = '正在全屏截图...';
        dataUrl = await window.electronAPI.captureFullscreen();
        if (!dataUrl) {
          ND.statusLeft.textContent = '全屏截图失败';
          return;
        }
        break;
      case 'area':
        ND.statusLeft.textContent = '请拖拽选择截图区域...';
        dataUrl = await window.electronAPI.captureArea();
        if (!dataUrl) {
          ND.statusLeft.textContent = '框选截图已取消';
          return;
        }
        break;
      case 'window':
        await showWindowPicker();
        return; // 窗口截图通过选择器回调处理
    }
    if (dataUrl) {
      insertImageAtCursor(dataUrl);
      ND.statusLeft.textContent = '图片已插入';
      setTimeout(() => updateStatus(), 1500);
    }
  } catch (err) {
    ND.statusLeft.textContent = '图片插入失败: ' + err.message;
  }
}

/**
 * 显示窗口截图选择器模态框
 */
async function showWindowPicker() {
  ND.statusLeft.textContent = '正在获取窗口列表...';
  const windows = await window.electronAPI.listWindows();
  if (!windows || windows.length === 0) {
    ND.statusLeft.textContent = '未找到可截图的窗口';
    return;
  }
  const listEl = document.getElementById('window-picker-list');
  listEl.innerHTML = windows.map(w =>
    `<div class="window-picker-item" data-id="${w.id}">
      <img src="${w.thumbnail}" alt="${w.name}">
      <div class="window-name">${escapeHtml(w.name)}</div>
    </div>`
  ).join('');

  // 绑定点击事件
  listEl.querySelectorAll('.window-picker-item').forEach(item => {
    item.addEventListener('click', async () => {
      const sourceId = item.dataset.id;
      hideWindowPicker();
      ND.statusLeft.textContent = '正在截图窗口...';
      const dataUrl = await window.electronAPI.captureWindowById(sourceId);
      if (dataUrl) {
        insertImageAtCursor(dataUrl);
        ND.statusLeft.textContent = '图片已插入';
        setTimeout(() => updateStatus(), 1500);
      } else {
        ND.statusLeft.textContent = '窗口截图失败';
      }
    });
  });

  document.getElementById('window-picker-overlay').classList.add('visible');
}

function hideWindowPicker() {
  document.getElementById('window-picker-overlay').classList.remove('visible');
}

// 窗口选择器关闭按钮
document.getElementById('window-picker-close').addEventListener('click', hideWindowPicker);
// 点击遮罩外部关闭
document.getElementById('window-picker-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) hideWindowPicker();
});
// Escape 关闭
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const overlay = document.getElementById('window-picker-overlay');
    if (overlay.classList.contains('visible')) hideWindowPicker();
  }
});

/**
 * 在光标位置插入图片
 * @param {string} dataUrl - base64 data URI
 */
function insertImageAtCursor(dataUrl) {
  // 使用 execCommand 插入图片（可撤销）
  const html = '<img src="' + dataUrl + '" alt="插入的图片">';
  execInsertHTML(html);
}

/**
 * 处理粘贴事件，支持 Ctrl+V 粘贴剪贴板中的图片
 * @param {ClipboardEvent} e
 */
function onEditorPaste(e) {
  const items = e.clipboardData && e.clipboardData.items;
  if (!items) return;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.startsWith('image/')) {
      e.preventDefault();
      const blob = item.getAsFile();
      const reader = new FileReader();
      reader.onload = () => {
        insertImageAtCursor(reader.result);
      };
      reader.readAsDataURL(blob);
      return;
    }
  }
}
