/**
 * @file         js/image-resize.js
 * @description  Note Diary — 图片选中/取消 + 缩放手柄创建/更新/拖拽 + 裁剪遮罩 + 恢复原图
 * @author       tianxj22
 * @created      2026-06-25
 * @updated      2026-06-26
 * @version      1.0.0
 */

// ============================================================
// image-resize.js — 图片选中/取消 + 缩放手柄创建/更新/拖拽
// 依赖：ND.selectedImage, ND.resizeHandles, ND.isDragging, ND.dragState
// ============================================================

/**
 * 选中图片/视频，显示缩放手柄
 * @param {HTMLElement} el — img、video 或 .media-crop-wrapper
 */
function selectMediaElement(el) {
  if (ND.selectedImage === el) return;
  deselectImage();
  ND.selectedImage = el;
  el.classList.add('selected');
  createResizeHandles();
  updateHandlePositions();

  // 保存当前标签页并切换到媒体编辑
  const active = document.querySelector('.toolbar-tab.active');
  ND.previousToolbarTab = active ? active.dataset.tab : 'file';
  if (ND.toolbarTabImage) ND.toolbarTabImage.style.display = '';
  if (ND.switchToolbarTab) ND.switchToolbarTab('image-edit');
  syncImageDimensionsToInputs();

  // 裁剪按钮始终显示；恢复按钮根据是否有原始数据
  if (ND.btnCropImage) ND.btnCropImage.style.display = '';
}

// 向后兼容别名
var selectImage = selectMediaElement;

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
  syncWrapperVideoSize();
  syncImageDimensionsToInputs();
}

/**
 * 缩放 wrapper 时同步内部 video 的尺寸和偏移
 */
function syncWrapperVideoSize() {
  var el = ND.selectedImage;
  if (!el || !el.classList.contains('media-crop-wrapper')) return;
  var video = el.querySelector('video');
  if (!video) return;
  var crop = el.dataset.crop;
  if (!crop) return;
  try { crop = JSON.parse(crop); } catch (_) { return; }
  var newW = parseInt(el.style.width, 10) || crop.w || 320;
  var newH = parseInt(el.style.height, 10) || crop.h || 240;
  if (!newW || !newH || !crop.w || !crop.h) return;
  var scaleX = newW / crop.w;
  var scaleY = newH / crop.h;
  video.style.width = Math.round(crop.videoW * scaleX) + 'px';
  video.style.height = Math.round(crop.videoH * scaleY) + 'px';
  video.style.left = Math.round(-crop.x * scaleX) + 'px';
  video.style.top = Math.round(-crop.y * scaleY) + 'px';
}

/**
 * 将当前选中图片的尺寸同步到宽高输入框
 */
function syncImageDimensionsToInputs() {
  if (!ND.selectedImage) return;
  var el = ND.selectedImage;
  var isVideo = el.tagName === 'VIDEO';
  var isWrapper = el.classList.contains('media-crop-wrapper');
  var w, h;

  if (isWrapper) {
    w = parseInt(el.style.width, 10) || el.offsetWidth;
    h = parseInt(el.style.height, 10) || el.offsetHeight;
  } else if (isVideo) {
    w = parseInt(el.style.width, 10) || el.videoWidth || el.offsetWidth;
    h = parseInt(el.style.height, 10) || el.videoHeight || el.offsetHeight;
  } else {
    w = parseInt(el.style.width, 10) || el.naturalWidth || el.width;
    h = parseInt(el.style.height, 10) || el.naturalHeight || el.height;
  }

  if (ND.imgWidthInput) ND.imgWidthInput.value = w || '';
  if (ND.imgHeightInput) ND.imgHeightInput.value = h || '';
  if (w && h) ND.imageEditAspectRatio = w / h;
  // 有原始数据（裁剪过）时显示恢复按钮
  if (ND.btnRestoreImage) {
    var hasOriginal = el.dataset.originalSrc || el.dataset.originalHtml;
    ND.btnRestoreImage.style.display = hasOriginal ? '' : 'none';
  }
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
    syncWrapperVideoSize();
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
    syncWrapperVideoSize();
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
  var el = ND.selectedImage;

  // 视频：捕获当前帧进行裁剪预览
  if (el.tagName === 'VIDEO') {
    openVideoCropOverlay(el);
    return;
  }

  // 裁剪过的视频 wrapper：先解包再重新裁剪
  if (el.classList.contains('media-crop-wrapper') && el.dataset.originalHtml) {
    var tempDiv = document.createElement('div');
    tempDiv.innerHTML = el.dataset.originalHtml;
    var origVideo = tempDiv.firstChild;
    el.parentNode.insertBefore(origVideo, el);
    el.remove();
    deselectImage();
    // 短暂延迟后选中原始视频并打开裁剪
    setTimeout(function() {
      selectMediaElement(origVideo);
      openVideoCropOverlay(origVideo);
    }, 50);
    return;
  }

  // 图片：原有逻辑
  const img = el;
  // 非破坏性裁剪：如果有原始图片，加载原始图片到 canvas
  const srcToLoad = img.dataset.originalSrc || img.src;

  ND.cropOverlay.style.display = 'flex';
  ND.cropOverlayActive = true;

  // 加载原图到 Image 对象以获取真实尺寸
  const origImg = new Image();
  origImg.onload = () => {
    const canvas = ND.cropCanvas;
    const ctx = canvas.getContext('2d');
    canvas.width = origImg.naturalWidth;
    canvas.height = origImg.naturalHeight;
    ctx.drawImage(origImg, 0, 0);

    const workspace = ND.cropOverlay.querySelector('.crop-workspace');
    const maxW = workspace.clientWidth * 0.9;
    const maxH = workspace.clientHeight * 0.9;
    const scale = Math.min(maxW / canvas.width, maxH / canvas.height, 1);
    canvas.style.width = (canvas.width * scale) + 'px';
    canvas.style.height = (canvas.height * scale) + 'px';

    // 如果已有裁剪数据，恢复裁剪区；否则默认中央 80%
    let cropRect;
    if (img.dataset.crop) {
      const prev = JSON.parse(img.dataset.crop);
      cropRect = { x: prev.x, y: prev.y, w: prev.w, h: prev.h };
    } else {
      const marginX = canvas.width * 0.1;
      const marginY = canvas.height * 0.1;
      cropRect = { x: marginX, y: marginY, w: canvas.width - 2 * marginX, h: canvas.height - 2 * marginY };
    }

    ND.cropState = {
      rect: cropRect,
      mode: 'idle',
      scale: scale,
      startX: 0, startY: 0,
      startRect: null,
      origW: canvas.width,
      origH: canvas.height,
    };
    updateCropRectDisplay();
    createCropHandles();
  };
  origImg.src = srcToLoad;
}

function closeCropOverlay() {
  removeCropHandles();
  ND.cropOverlay.style.display = 'none';
  ND.cropOverlayActive = false;
  ND.cropState = null;
}

/**
 * 打开视频裁剪覆盖层：捕获当前帧到 canvas 供用户选择裁剪区域
 * @param {HTMLVideoElement} video
 */
function openVideoCropOverlay(video) {
  ND.cropOverlay.style.display = 'flex';
  ND.cropOverlayActive = true;

  var canvas = ND.cropCanvas;
  var ctx = canvas.getContext('2d');

  // 获取视频原始尺寸
  var vw = video.videoWidth || 640;
  var vh = video.videoHeight || 480;
  canvas.width = vw;
  canvas.height = vh;

  // 绘制当前帧
  try {
    ctx.drawImage(video, 0, 0, vw, vh);
  } catch (_) {
    // 如果 drawImage 失败（跨域等），绘制纯色占位
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, vw, vh);
  }

  // 缩放显示
  var workspace = ND.cropOverlay.querySelector('.crop-workspace');
  var maxW = workspace.clientWidth * 0.9;
  var maxH = workspace.clientHeight * 0.9;
  var scale = Math.min(maxW / canvas.width, maxH / canvas.height, 1);
  canvas.style.width = (canvas.width * scale) + 'px';
  canvas.style.height = (canvas.height * scale) + 'px';

  // 默认中央 80% 裁剪区
  var marginX = vw * 0.1;
  var marginY = vh * 0.1;
  var cropRect = { x: marginX, y: marginY, w: vw - 2 * marginX, h: vh - 2 * marginY };

  ND.cropState = {
    rect: cropRect, mode: 'idle', scale: scale,
    startX: 0, startY: 0, startRect: null,
    origW: vw, origH: vh,
    isVideo: true,
  };
  updateCropRectDisplay();
  createCropHandles();
}

/**
 * 对视频应用 CSS 容器裁剪
 * @param {HTMLVideoElement} video
 * @param {{x:number,y:number,w:number,h:number}} rect - 裁剪区域
 */
function applyVideoCrop(video, rect) {
  // 保存当前尺寸
  var videoW = parseInt(video.style.width, 10) || video.videoWidth || 640;
  var videoH = parseInt(video.style.height, 10) || video.videoHeight || 480;

  // 创建 wrapper
  var wrapper = document.createElement('span');
  wrapper.className = 'media-crop-wrapper';
  wrapper.style.display = 'inline-block';
  wrapper.style.overflow = 'hidden';
  wrapper.style.verticalAlign = 'top';
  wrapper.style.width = rect.w + 'px';
  wrapper.style.height = rect.h + 'px';
  wrapper.dataset.crop = JSON.stringify({
    x: rect.x, y: rect.y, w: rect.w, h: rect.h,
    videoW: videoW, videoH: videoH
  });
  wrapper.dataset.originalHtml = video.outerHTML;

  // 设置 video 偏移以露出裁剪区域
  video.style.maxWidth = 'none';
  video.style.width = videoW + 'px';
  video.style.height = videoH + 'px';
  video.style.position = 'relative';
  video.style.left = (-rect.x) + 'px';
  video.style.top = (-rect.y) + 'px';

  // 用 wrapper 包裹 video
  video.parentNode.insertBefore(wrapper, video);
  wrapper.appendChild(video);

  // 选中 wrapper
  ND.selectedImage = null;
  ND.resizeHandles = [];
  selectMediaElement(wrapper);
}

function createCropHandles() {
  removeCropHandles();
  const rect = document.getElementById('crop-rect');
  if (!rect) return;
  const positions = ['nw','n','ne','w','e','sw','s','se'];
  positions.forEach(pos => {
    const handle = document.createElement('div');
    handle.className = 'image-resize-handle handle-' + pos;
    handle.dataset.handle = pos;
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onCropHandleMouseDown(e, pos);
    });
    rect.appendChild(handle);
  });
}

function removeCropHandles() {
  const rect = document.getElementById('crop-rect');
  if (rect) rect.querySelectorAll('.image-resize-handle').forEach(h => h.remove());
}

function updateCropRectDisplay() {
  if (!ND.cropState || !ND.cropRect || !ND.cropCanvas) return;
  const { rect, scale } = ND.cropState;
  const canvasRect = ND.cropCanvas.getBoundingClientRect();
  const wsRect = ND.cropOverlay.querySelector('.crop-workspace').getBoundingClientRect();
  const left = canvasRect.left - wsRect.left + rect.x * scale;
  const top = canvasRect.top - wsRect.top + rect.y * scale;
  const w = rect.w * scale;
  const h = rect.h * scale;
  ND.cropRect.style.left = left + 'px';
  ND.cropRect.style.top = top + 'px';
  ND.cropRect.style.width = w + 'px';
  ND.cropRect.style.height = h + 'px';

  // 更新裁剪手柄位置
  const hw = 4;
  const positions = {
    nw: [ -hw, -hw ], n: [ w/2 - hw, -hw ], ne: [ w - hw, -hw ],
    w:  [ -hw, h/2 - hw ], e: [ w - hw, h/2 - hw ],
    sw: [ -hw, h - hw ], s: [ w/2 - hw, h - hw ], se: [ w - hw, h - hw ],
  };
  ND.cropRect.querySelectorAll('.image-resize-handle').forEach(handle => {
    const p = positions[handle.dataset.handle];
    if (p) { handle.style.left = p[0] + 'px'; handle.style.top = p[1] + 'px'; }
  });
}

function onCropHandleMouseDown(e, handleType) {
  if (!ND.cropState) return;
  ND.cropState.mode = 'resize';
  ND.cropState.handleType = handleType;
  ND.cropState.startX = e.clientX;
  ND.cropState.startY = e.clientY;
  ND.cropState.startRect = { ...ND.cropState.rect };
  ND.cropState.startRatio = ND.cropState.rect.w / ND.cropState.rect.h;
}

// 裁剪矩形移动（mousedown on rect itself）
if (ND.cropRect) {
  ND.cropRect.addEventListener('mousedown', (e) => {
    if (!ND.cropState || e.target.classList.contains('image-resize-handle')) return;
    e.preventDefault();
    ND.cropState.mode = 'move';
    ND.cropState.startX = e.clientX;
    ND.cropState.startY = e.clientY;
    ND.cropState.startRect = { ...ND.cropState.rect };
  });
}

document.addEventListener('mousemove', (e) => {
  if (!ND.cropState || ND.cropState.mode === 'idle' || !ND.cropState.startRect) return;
  const { startX, startY, startRect, scale, rect, mode } = ND.cropState;
  const canvas = ND.cropCanvas;
  const dx = (e.clientX - startX) / scale;
  const dy = (e.clientY - startY) / scale;

  if (mode === 'move') {
    rect.x = Math.max(0, Math.min(startRect.x + dx, canvas.width - rect.w));
    rect.y = Math.max(0, Math.min(startRect.y + dy, canvas.height - rect.h));
  } else if (mode === 'resize') {
    const hType = ND.cropState.handleType;
    let newW = startRect.w;
    let newH = startRect.h;
    if (hType.includes('e')) newW = startRect.w + dx;
    if (hType.includes('w')) { newW = startRect.w - dx; rect.x = startRect.x + dx; }
    if (hType.includes('s')) newH = startRect.h + dy;
    if (hType.includes('n')) { newH = startRect.h - dy; rect.y = startRect.y + dy; }
    // 角手柄保持宽高比
    if (hType.length === 2) {
      const absW = Math.abs(newW); const absH = Math.abs(newH);
      if (absW / ND.cropState.startRatio > absH) {
        newW = (newW >= 0 ? 1 : -1) * absH * ND.cropState.startRatio;
      } else {
        newH = (newH >= 0 ? 1 : -1) * absW / ND.cropState.startRatio;
      }
    }
    newW = Math.max(20, Math.abs(newW));
    newH = Math.max(20, Math.abs(newH));
    // 约束不超出 canvas
    if (hType.includes('w')) rect.x = Math.max(0, Math.min(startRect.x + startRect.w - newW, canvas.width - newW));
    if (hType.includes('n')) rect.y = Math.max(0, Math.min(startRect.y + startRect.h - newH, canvas.height - newH));
    rect.x = Math.max(0, rect.x); rect.y = Math.max(0, rect.y);
    rect.w = Math.min(newW, canvas.width - rect.x);
    rect.h = Math.min(newH, canvas.height - rect.y);
  }
  updateCropRectDisplay();
});

document.addEventListener('mouseup', () => {
  if (ND.cropState) { ND.cropState.mode = 'idle'; ND.cropState.startRect = null; }
});

// 裁剪确认
if (ND.btnCropConfirm) {
  ND.btnCropConfirm.addEventListener('click', async () => {
    if (!ND.selectedImage || !ND.cropState || !ND.cropCanvas) return;
    var img = ND.selectedImage;
    var { rect, origW, origH, isVideo } = ND.cropState;

    // 视频裁剪：CSS 容器方案
    if (isVideo && img.tagName === 'VIDEO') {
      applyVideoCrop(img, rect);
      closeCropOverlay();
      return;
    }

    const canvas = ND.cropCanvas;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = rect.w; tempCanvas.height = rect.h;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
    const dataUrl = tempCanvas.toDataURL('image/png');

    // 非破坏性：首次裁剪时保存原图
    if (!img.dataset.originalSrc) {
      img.dataset.originalSrc = img.src;
    }
    img.dataset.crop = JSON.stringify({ x: rect.x, y: rect.y, w: rect.w, h: rect.h, origW: origW, origH: origH });

    // 保存裁剪结果到资源文件夹
    if (ND.currentNote) {
      var relativePath = await window.electronAPI.saveBase64Asset(ND.currentNote.filePath, dataUrl);
      if (relativePath) {
        img.src = relativePath;
      } else {
        img.src = dataUrl; // 回退到 base64
      }
    } else {
      img.src = dataUrl;
    }
    img.style.width = rect.w + 'px';
    img.style.height = rect.h + 'px';

    // 显示恢复按钮
    if (ND.btnRestoreImage) ND.btnRestoreImage.style.display = '';

    syncImageDimensionsToInputs();
    updateHandlePositions();
    closeCropOverlay();
  });
}

// 裁剪取消
if (ND.btnCropCancel) {
  ND.btnCropCancel.addEventListener('click', closeCropOverlay);
}

// Escape 关闭裁剪遮罩
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && ND.cropOverlayActive) closeCropOverlay();
});

// 恢复原图
function restoreOriginalImage() {
  if (!ND.selectedImage) return;
  var el = ND.selectedImage;

  // 视频 wrapper 恢复：解包，还原原始 video
  if (el.classList.contains('media-crop-wrapper') && el.dataset.originalHtml) {
    var tempDiv = document.createElement('div');
    tempDiv.innerHTML = el.dataset.originalHtml;
    var originalVideo = tempDiv.firstChild;
    el.parentNode.insertBefore(originalVideo, el);
    el.remove();
    deselectImage();
    return;
  }

  // 图片恢复：原有逻辑
  if (el.tagName === 'IMG' && el.dataset.originalSrc) {
    el.src = el.dataset.originalSrc;
    el.style.width = '';
    el.style.height = '';
    delete el.dataset.originalSrc;
    delete el.dataset.crop;
    if (ND.btnRestoreImage) ND.btnRestoreImage.style.display = 'none';
    syncImageDimensionsToInputs();
    updateHandlePositions();
  }
}

if (ND.btnRestoreImage) {
  ND.btnRestoreImage.addEventListener('click', restoreOriginalImage);
}

// ---- 委托：点击编辑器中图片/视频 → 选中并显示缩放手柄 ----
ND.editorArea.addEventListener('click', (e) => {
  // 优先检测 wrapper（裁剪过的视频）
  var wrapper = e.target.closest('.media-crop-wrapper');
  if (wrapper && ND.editorDiv && ND.editorDiv.contains(wrapper)) {
    e.stopPropagation();
    selectMediaElement(wrapper);
    return;
  }
  // 检测普通 img / video
  var media = e.target.closest('img, video');
  if (media && ND.editorDiv && ND.editorDiv.contains(media)) {
    e.stopPropagation();
    selectMediaElement(media);
    return;
  }
  // 点击非媒体位置 → 取消选中
  if (!e.target.closest('.image-resize-handle')) {
    deselectImage();
  }
});
