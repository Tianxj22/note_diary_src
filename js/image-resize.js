// ============================================================
// image-resize.js — 图片选中/取消 + 缩放手柄创建/更新/拖拽
// 依赖：ND.selectedImage, ND.resizeHandles, ND.isDragging, ND.dragState
// ============================================================

/**
 * 选中图片，显示缩放手柄
 * @param {HTMLImageElement} img
 */
function selectImage(img) {
  if (ND.selectedImage === img) return;
  deselectImage();
  ND.selectedImage = img;
  img.classList.add('selected');
  createResizeHandles();
  updateHandlePositions();

  // 保存当前标签页并切换到图片编辑
  const active = document.querySelector('.toolbar-tab.active');
  ND.previousToolbarTab = active ? active.dataset.tab : 'file';
  if (ND.toolbarTabImage) ND.toolbarTabImage.style.display = '';
  if (ND.switchToolbarTab) ND.switchToolbarTab('image-edit');
  syncImageDimensionsToInputs();
}

/**
 * 取消选中图片，隐藏缩放手柄
 */
function deselectImage() {
  if (ND.selectedImage) {
    ND.selectedImage.classList.remove('selected');
    ND.selectedImage = null;
  }
  const ctn = document.getElementById('image-resize-container');
  if (ctn) {
    ctn.innerHTML = '';
    ctn.classList.remove('active');
  }
  ND.resizeHandles = [];

  // 隐藏图片编辑标签页
  if (ND.toolbarTabImage) ND.toolbarTabImage.style.display = 'none';
  const activeTab = document.querySelector('.toolbar-tab.active');
  if (activeTab && activeTab.dataset.tab === 'image-edit') {
    if (ND.switchToolbarTab) ND.switchToolbarTab(ND.previousToolbarTab || 'file');
  }
  // 关闭裁剪遮罩
  if (ND.cropOverlay && ND.cropOverlayActive) {
    ND.cropOverlay.style.display = 'none';
    ND.cropOverlayActive = false;
    ND.cropState = null;
  }
}

/**
 * 创建 8 个缩放手柄
 */
function createResizeHandles() {
  const ctn = document.getElementById('image-resize-container');
  if (!ctn) return;
  ctn.innerHTML = '';
  ND.resizeHandles = [];
  const positions = ['nw','n','ne','w','e','sw','s','se'];
  positions.forEach(pos => {
    const handle = document.createElement('div');
    handle.className = 'image-resize-handle handle-' + pos;
    handle.dataset.handle = pos;
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onHandleMouseDown(e, pos);
    });
    ctn.appendChild(handle);
    ND.resizeHandles.push(handle);
  });
  ctn.classList.add('active');
}

/**
 * 更新缩放手柄位置（相对于 editorArea）
 */
function updateHandlePositions() {
  if (!ND.selectedImage) return;
  const ctn = document.getElementById('image-resize-container');
  const area = document.getElementById('editor-area');
  if (!ctn || !area) return;
  const areaRect = area.getBoundingClientRect();
  const imgRect = ND.selectedImage.getBoundingClientRect();
  const left = imgRect.left - areaRect.left;
  const top = imgRect.top - areaRect.top + area.scrollTop;
  const w = imgRect.width;
  const h = imgRect.height;

  ctn.style.left = left + 'px';
  ctn.style.top = top + 'px';
  ctn.style.width = w + 'px';
  ctn.style.height = h + 'px';

  const hw = 4; // 手柄半宽
  const positions = {
    nw: { left: -hw, top: -hw },
    n:  { left: w/2 - hw, top: -hw },
    ne: { left: w - hw, top: -hw },
    w:  { left: -hw, top: h/2 - hw },
    e:  { left: w - hw, top: h/2 - hw },
    sw: { left: -hw, top: h - hw },
    s:  { left: w/2 - hw, top: h - hw },
    se: { left: w - hw, top: h - hw },
  };
  ctn.querySelectorAll('.image-resize-handle').forEach(handle => {
    const pos = handle.dataset.handle;
    if (positions[pos]) {
      handle.style.left = positions[pos].left + 'px';
      handle.style.top = positions[pos].top + 'px';
    }
  });
}

/**
 * 手柄 mousedown：开始拖拽缩放
 */
function onHandleMouseDown(e, handleType) {
  if (!ND.selectedImage) return;
  ND.isDragging = true;
  const rect = ND.selectedImage.getBoundingClientRect();
  ND.dragState = {
    handleType: handleType,
    startX: e.clientX,
    startY: e.clientY,
    startW: rect.width,
    startH: rect.height,
    ratio: rect.width / rect.height,
  };
  document.addEventListener('mousemove', onHandleMouseMove);
  document.addEventListener('mouseup', onHandleMouseUp);
}

/**
 * 手柄 mousemove：计算新尺寸
 */
function onHandleMouseMove(e) {
  if (!ND.isDragging || !ND.dragState || !ND.selectedImage) return;
  const dx = e.clientX - ND.dragState.startX;
  const dy = e.clientY - ND.dragState.startY;
  const hType = ND.dragState.handleType;
  let newW = ND.dragState.startW;
  let newH = ND.dragState.startH;

  // 根据手柄类型计算新尺寸
  if (hType.includes('e')) newW = ND.dragState.startW + dx;
  if (hType.includes('w')) newW = ND.dragState.startW - dx;
  if (hType.includes('s')) newH = ND.dragState.startH + dy;
  if (hType.includes('n')) newH = ND.dragState.startH - dy;

  // 角手柄保持宽高比
  if (hType.length === 2) {
    // nw/ne/sw/se — 四角
    const absW = Math.abs(newW);
    const absH = Math.abs(newH);
    if (absW / ND.dragState.ratio > absH) {
      newW = (newW >= 0 ? 1 : -1) * absH * ND.dragState.ratio;
    } else {
      newH = (newH >= 0 ? 1 : -1) * absW / ND.dragState.ratio;
    }
  }

  // 最小尺寸约束
  newW = Math.max(20, Math.abs(newW));
  newH = Math.max(20, Math.abs(newH));

  ND.selectedImage.style.width = newW + 'px';
  ND.selectedImage.style.height = newH + 'px';
  updateHandlePositions();
}

/**
 * 手柄 mouseup：结束拖拽
 */
function onHandleMouseUp() {
  ND.isDragging = false;
  ND.dragState = null;
  document.removeEventListener('mousemove', onHandleMouseMove);
  document.removeEventListener('mouseup', onHandleMouseUp);
}

/**
 * 将当前选中图片的尺寸同步到宽高输入框
 */
function syncImageDimensionsToInputs() {
  if (!ND.selectedImage) return;
  const w = parseInt(ND.selectedImage.style.width, 10) || ND.selectedImage.naturalWidth || ND.selectedImage.width;
  const h = parseInt(ND.selectedImage.style.height, 10) || ND.selectedImage.naturalHeight || ND.selectedImage.height;
  if (ND.imgWidthInput) ND.imgWidthInput.value = w || '';
  if (ND.imgHeightInput) ND.imgHeightInput.value = h || '';
  if (w && h) ND.imageEditAspectRatio = w / h;
}

// ---- 尺寸输入框事件 ----
if (ND.imgWidthInput) {
  ND.imgWidthInput.addEventListener('input', () => {
    if (!ND.selectedImage) return;
    const newW = parseInt(ND.imgWidthInput.value, 10);
    if (isNaN(newW) || newW < 1) return;
    ND.selectedImage.style.width = newW + 'px';
    if (ND.btnLockRatio && ND.btnLockRatio.classList.contains('locked') && ND.imageEditAspectRatio) {
      const newH = Math.round(newW / ND.imageEditAspectRatio);
      ND.selectedImage.style.height = newH + 'px';
      if (ND.imgHeightInput) ND.imgHeightInput.value = newH;
    }
    updateHandlePositions();
  });
}

if (ND.imgHeightInput) {
  ND.imgHeightInput.addEventListener('input', () => {
    if (!ND.selectedImage) return;
    const newH = parseInt(ND.imgHeightInput.value, 10);
    if (isNaN(newH) || newH < 1) return;
    ND.selectedImage.style.height = newH + 'px';
    if (ND.btnLockRatio && ND.btnLockRatio.classList.contains('locked') && ND.imageEditAspectRatio) {
      const newW = Math.round(newH * ND.imageEditAspectRatio);
      ND.selectedImage.style.width = newW + 'px';
      if (ND.imgWidthInput) ND.imgWidthInput.value = newW;
    }
    updateHandlePositions();
  });
}

// ---- 宽高比锁定按钮 ----
if (ND.btnLockRatio) {
  ND.btnLockRatio.addEventListener('click', () => {
    ND.btnLockRatio.classList.toggle('locked');
    if (ND.btnLockRatio.classList.contains('locked') && ND.selectedImage) {
      const w = parseInt(ND.selectedImage.style.width, 10) || ND.selectedImage.naturalWidth || ND.selectedImage.width;
      const h = parseInt(ND.selectedImage.style.height, 10) || ND.selectedImage.naturalHeight || ND.selectedImage.height;
      if (w && h) ND.imageEditAspectRatio = w / h;
    }
  });
}

// ---- 裁剪功能 ----
if (ND.btnCropImage) {
  ND.btnCropImage.addEventListener('click', openCropOverlay);
}

function openCropOverlay() {
  if (!ND.selectedImage || !ND.cropOverlay || !ND.cropCanvas) return;
  const img = ND.selectedImage;
  const canvas = ND.cropCanvas;

  // 先显示遮罩，否则 workspace 的 clientWidth/Height 为 0
  ND.cropOverlay.style.display = 'flex';
  ND.cropOverlayActive = true;

  // 等待浏览器完成布局后再测量和绘制
  requestAnimationFrame(() => {
    const ctx = canvas.getContext('2d');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const workspace = ND.cropOverlay.querySelector('.crop-workspace');
    const maxW = workspace.clientWidth * 0.9;
    const maxH = workspace.clientHeight * 0.9;
    const scale = Math.min(maxW / canvas.width, maxH / canvas.height, 1);
    canvas.style.width = (canvas.width * scale) + 'px';
    canvas.style.height = (canvas.height * scale) + 'px';

    const marginX = canvas.width * 0.1;
    const marginY = canvas.height * 0.1;
    ND.cropState = {
      rect: { x: marginX, y: marginY, w: canvas.width - 2 * marginX, h: canvas.height - 2 * marginY },
      mode: 'idle',
      scale: scale,
      startX: 0, startY: 0,
      startRect: null,
    };
    updateCropRectDisplay();
  });
}

function updateCropRectDisplay() {
  if (!ND.cropState || !ND.cropRect || !ND.cropCanvas) return;
  const { rect, scale } = ND.cropState;
  const canvasRect = ND.cropCanvas.getBoundingClientRect();
  const wsRect = ND.cropOverlay.querySelector('.crop-workspace').getBoundingClientRect();
  ND.cropRect.style.left = (canvasRect.left - wsRect.left + rect.x * scale) + 'px';
  ND.cropRect.style.top = (canvasRect.top - wsRect.top + rect.y * scale) + 'px';
  ND.cropRect.style.width = (rect.w * scale) + 'px';
  ND.cropRect.style.height = (rect.h * scale) + 'px';
}

// 裁剪矩形交互
if (ND.cropRect) {
  ND.cropRect.addEventListener('mousedown', (e) => {
    if (!ND.cropState) return;
    e.preventDefault();
    ND.cropState.mode = 'move';
    ND.cropState.startX = e.clientX;
    ND.cropState.startY = e.clientY;
    ND.cropState.startRect = { ...ND.cropState.rect };
  });
}

document.addEventListener('mousemove', (e) => {
  if (!ND.cropState || ND.cropState.mode === 'idle') return;
  const { startX, startY, startRect, scale, rect } = ND.cropState;
  const canvas = ND.cropCanvas;
  const dx = (e.clientX - startX) / scale;
  const dy = (e.clientY - startY) / scale;

  if (ND.cropState.mode === 'move') {
    rect.x = Math.max(0, Math.min(startRect.x + dx, canvas.width - rect.w));
    rect.y = Math.max(0, Math.min(startRect.y + dy, canvas.height - rect.h));
  }
  updateCropRectDisplay();
});

document.addEventListener('mouseup', () => {
  if (ND.cropState) ND.cropState.mode = 'idle';
});

// 裁剪确认 / 取消
if (ND.btnCropConfirm) {
  ND.btnCropConfirm.addEventListener('click', () => {
    if (!ND.selectedImage || !ND.cropState || !ND.cropCanvas) return;
    const { rect } = ND.cropState;
    const canvas = ND.cropCanvas;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = rect.w;
    tempCanvas.height = rect.h;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
    const dataUrl = tempCanvas.toDataURL('image/png');
    ND.selectedImage.src = dataUrl;
    ND.selectedImage.style.width = rect.w + 'px';
    ND.selectedImage.style.height = rect.h + 'px';
    syncImageDimensionsToInputs();
    updateHandlePositions();
    ND.cropOverlay.style.display = 'none';
    ND.cropOverlayActive = false;
    ND.cropState = null;
  });
}

if (ND.btnCropCancel) {
  ND.btnCropCancel.addEventListener('click', () => {
    ND.cropOverlay.style.display = 'none';
    ND.cropOverlayActive = false;
    ND.cropState = null;
  });
}

// Escape 关闭裁剪遮罩
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && ND.cropOverlayActive) {
    ND.cropOverlay.style.display = 'none';
    ND.cropOverlayActive = false;
    ND.cropState = null;
  }
});

// ---- 委托：点击编辑器中图片 → 选中并显示缩放手柄 ----
ND.editorArea.addEventListener('click', (e) => {
  const img = e.target.closest('img');
  if (img && ND.editorDiv && ND.editorDiv.contains(img)) {
    e.stopPropagation();
    selectImage(img);
    return;
  }
  // 点击非图片位置 → 取消选中
  if (!e.target.closest('.image-resize-handle')) {
    deselectImage();
  }
});
