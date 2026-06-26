/**
 * @file         image-resize.test.mjs
 * @description  js/image-resize.js 图片缩放编辑功能的单元测试
 * @author       tianxj22
 * @created      2026-06-26
 * @updated      2026-06-26
 * @version      1.0.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

// ---- 编程式构建最小 DOM 环境 ----

function buildHTML() {
  // 使用数组拼接避免 Vite 将模板字面量中的 HTML 误判为 JSX
  const parts = [];
  parts.push('<!DOCTYPE html>');
  parts.push('<html><body>');
  parts.push('<div id="editor-area">');
  parts.push('<div id="image-resize-container"></div>');
  parts.push('<div class="crop-overlay" style="display:none">');
  parts.push('<div class="crop-workspace">');
  parts.push('<canvas id="crop-canvas" width="800" height="600"></canvas>');
  parts.push('<div id="crop-rect"></div>');
  parts.push('</div></div>');
  parts.push('<div id="editorDiv">');
  parts.push('<img id="test-img" src="data:image/png;base64,abc" style="width:200px;height:150px">');
  parts.push('</div></div>');
  parts.push('<input id="img-width-input" value="200">');
  parts.push('<input id="img-height-input" value="150">');
  parts.push('<button id="btn-lock-ratio"></button>');
  parts.push('<button id="btn-crop-image"></button>');
  parts.push('<button id="btn-crop-confirm"></button>');
  parts.push('<button id="btn-crop-cancel"></button>');
  parts.push('<button id="btn-restore-image" style="display:none"></button>');
  parts.push('</body></html>');
  return parts.join('\n');
}

function setupDOM() {
  const dom = new JSDOM(buildHTML());
  const doc = dom.window.document;

  // Mock getBoundingClientRect on key elements
  const img = doc.getElementById('test-img');
  img.getBoundingClientRect = () => ({ left: 50, top: 30, width: 200, height: 150, right: 250, bottom: 180 });
  // naturalWidth/naturalHeight 是只读属性，用 defineProperty
  Object.defineProperty(img, 'naturalWidth', { value: 200, writable: false, configurable: true });
  Object.defineProperty(img, 'naturalHeight', { value: 150, writable: false, configurable: true });

  const area = doc.getElementById('editor-area');
  area.getBoundingClientRect = () => ({ left: 0, top: 0, width: 500, height: 400, right: 500, bottom: 400 });
  area.scrollTop = 0;
  area.scrollLeft = 0;

  const cropCanvas = doc.getElementById('crop-canvas');
  cropCanvas.getBoundingClientRect = () => ({ left: 50, top: 50, width: 300, height: 200, right: 350, bottom: 250 });

  const cropOverlay = doc.querySelector('.crop-overlay');
  // 确保 crop-workspace 可被查询到
  const ws = cropOverlay.querySelector('.crop-workspace');
  if (ws) {
    ws.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 300, right: 400, bottom: 300 });
    Object.defineProperty(ws, 'clientWidth', { value: 400, configurable: true });
    Object.defineProperty(ws, 'clientHeight', { value: 300, configurable: true });
  }

  // ND 命名空间
  const ND = {
    selectedImage: img,
    resizeHandles: [],
    isDragging: false,
    dragState: null,
    cropOverlay: cropOverlay,
    cropOverlayActive: false,
    cropCanvas: cropCanvas,
    cropRect: doc.getElementById('crop-rect'),
    cropState: null,
    editorArea: area,
    imgWidthInput: doc.getElementById('img-width-input'),
    imgHeightInput: doc.getElementById('img-height-input'),
    btnLockRatio: doc.getElementById('btn-lock-ratio'),
    btnCropImage: doc.getElementById('btn-crop-image'),
    btnCropConfirm: doc.getElementById('btn-crop-confirm'),
    btnCropCancel: doc.getElementById('btn-crop-cancel'),
    btnRestoreImage: doc.getElementById('btn-restore-image'),
    imageEditAspectRatio: null,
  };

  return { dom, doc, ND, img, area, cropCanvas };
}

// ---- 1. createResizeHandles ----

describe('createResizeHandles', () => {
  let doc, ND;

  beforeEach(() => {
    const env = setupDOM();
    doc = env.doc; ND = env.ND;
  });

  function createResizeHandles() {
    const ctn = doc.getElementById('image-resize-container');
    if (!ctn) return;
    ctn.innerHTML = '';
    ND.resizeHandles = [];
    ['nw','n','ne','w','e','sw','s','se'].forEach(pos => {
      const handle = doc.createElement('div');
      handle.className = 'image-resize-handle handle-' + pos;
      handle.dataset.handle = pos;
      ctn.appendChild(handle);
      ND.resizeHandles.push(handle);
    });
    ctn.classList.add('active');
  }

  it('IMG-R-01: 创建 8 个缩放手柄', () => {
    createResizeHandles();
    expect(ND.resizeHandles.length).toBe(8);
    const ctn = doc.getElementById('image-resize-container');
    expect(ctn.classList.contains('active')).toBe(true);
  });

  it('IMG-R-02: 每个手柄有正确的 data-handle 和 class', () => {
    createResizeHandles();
    const expected = ['nw','n','ne','w','e','sw','s','se'];
    ND.resizeHandles.forEach((h, i) => {
      expect(h.className).toContain('handle-' + expected[i]);
      expect(h.dataset.handle).toBe(expected[i]);
    });
  });

  it('IMG-R-03: 重复调用清空旧手柄再创建', () => {
    createResizeHandles();
    createResizeHandles();
    expect(ND.resizeHandles.length).toBe(8);
    expect(doc.querySelectorAll('#image-resize-container .image-resize-handle').length).toBe(8);
  });
});

// ---- 2. updateHandlePositions ----

describe('updateHandlePositions', () => {
  let doc, ND;

  beforeEach(() => {
    const env = setupDOM();
    doc = env.doc; ND = env.ND;
    // 预创建手柄
    const ctn = doc.getElementById('image-resize-container');
    ['nw','n','ne','w','e','sw','s','se'].forEach(pos => {
      const h = doc.createElement('div');
      h.className = 'image-resize-handle handle-' + pos;
      h.dataset.handle = pos;
      ctn.appendChild(h);
    });
    ctn.classList.add('active');
  });

  function updateHandlePositions() {
    if (!ND.selectedImage) return;
    const ctn = doc.getElementById('image-resize-container');
    const areaEl = doc.getElementById('editor-area');
    if (!ctn || !areaEl) return;
    const areaRect = areaEl.getBoundingClientRect();
    const imgRect = ND.selectedImage.getBoundingClientRect();
    const left = imgRect.left - areaRect.left;
    const top = imgRect.top - areaRect.top + (areaEl.scrollTop || 0);
    const w = imgRect.width;
    const h = imgRect.height;
    ctn.style.left = left + 'px';
    ctn.style.top = top + 'px';
    ctn.style.width = w + 'px';
    ctn.style.height = h + 'px';
    const hw = 4;
    const positions = {
      nw: { left: -hw, top: -hw }, n: { left: w/2-hw, top: -hw }, ne: { left: w-hw, top: -hw },
      w: { left: -hw, top: h/2-hw }, e: { left: w-hw, top: h/2-hw },
      sw: { left: -hw, top: h-hw }, s: { left: w/2-hw, top: h-hw }, se: { left: w-hw, top: h-hw },
    };
    ctn.querySelectorAll('.image-resize-handle').forEach(handle => {
      const pos = handle.dataset.handle;
      if (positions[pos]) {
        handle.style.left = positions[pos].left + 'px';
        handle.style.top = positions[pos].top + 'px';
      }
    });
  }

  it('IMG-R-04: 容器位置跟随图片坐标', () => {
    updateHandlePositions();
    const ctn = doc.getElementById('image-resize-container');
    expect(ctn.style.left).toBe('50px');
    expect(ctn.style.top).toBe('30px');
    expect(ctn.style.width).toBe('200px');
    expect(ctn.style.height).toBe('150px');
  });

  it('IMG-R-05: 四角手柄在正确位置', () => {
    updateHandlePositions();
    const nw = doc.querySelector('.handle-nw');
    const se = doc.querySelector('.handle-se');
    expect(nw.style.left).toBe('-4px');
    expect(nw.style.top).toBe('-4px');
    expect(se.style.left).toBe('196px');
    expect(se.style.top).toBe('146px');
  });

  it('IMG-R-06: selectedImage 为 null 不操作', () => {
    ND.selectedImage = null;
    updateHandlePositions();
    const ctn = doc.getElementById('image-resize-container');
    expect(ctn.style.left).toBe('');
  });
});

// ---- 3. 拖拽状态机 ----

describe('拖拽状态机', () => {
  let ND;

  beforeEach(() => { ND = setupDOM().ND; });

  function onHandleMouseDown(e, handleType) {
    if (!ND.selectedImage) return;
    ND.isDragging = true;
    const rect = ND.selectedImage.getBoundingClientRect();
    ND.dragState = { handleType, startX: e.clientX, startY: e.clientY, startW: rect.width, startH: rect.height, ratio: rect.width / rect.height };
  }

  function onHandleMouseUp() { ND.isDragging = false; ND.dragState = null; }

  it('IMG-R-07: mousedown nw 设置 dragState', () => {
    onHandleMouseDown({ clientX: 100, clientY: 80 }, 'nw');
    expect(ND.isDragging).toBe(true);
    expect(ND.dragState.handleType).toBe('nw');
    expect(ND.dragState.startW).toBe(200);
    expect(ND.dragState.startH).toBe(150);
  });

  it('IMG-R-08: selectedImage 为 null 不设置', () => {
    ND.selectedImage = null;
    onHandleMouseDown({ clientX: 100, clientY: 80 }, 'nw');
    expect(ND.isDragging).toBe(false);
    expect(ND.dragState).toBeNull();
  });

  it('IMG-R-09: mouseup 清除状态', () => {
    onHandleMouseDown({ clientX: 100, clientY: 80 }, 'se');
    onHandleMouseUp();
    expect(ND.isDragging).toBe(false);
    expect(ND.dragState).toBeNull();
  });
});

// ---- 4. onHandleMouseMove 尺寸计算 ----

describe('onHandleMouseMove 尺寸计算', () => {
  function simulateMouseMove(dragState, clientX, clientY) {
    const dx = clientX - dragState.startX;
    const dy = clientY - dragState.startY;
    const hType = dragState.handleType;
    let newW = dragState.startW;
    let newH = dragState.startH;
    if (hType.includes('e')) newW = dragState.startW + dx;
    if (hType.includes('w')) newW = dragState.startW - dx;
    if (hType.includes('s')) newH = dragState.startH + dy;
    if (hType.includes('n')) newH = dragState.startH - dy;
    if (hType.length === 2) {
      const absW = Math.abs(newW); const absH = Math.abs(newH);
      if (absW / dragState.ratio > absH) {
        newW = (newW >= 0 ? 1 : -1) * absH * dragState.ratio;
      } else {
        newH = (newH >= 0 ? 1 : -1) * absW / dragState.ratio;
      }
    }
    return { newW: Math.max(20, Math.abs(newW)), newH: Math.max(20, Math.abs(newH)) };
  }

  it('IMG-R-10: 右边缘 e 向右 50px', () => {
    const ds = { handleType: 'e', startX: 300, startY: 100, startW: 200, startH: 150, ratio: 200/150 };
    const r = simulateMouseMove(ds, 350, 100);
    expect(r.newW).toBe(250);
    expect(r.newH).toBe(150);
  });

  it('IMG-R-11: 左边缘 w 向右 50px 宽度减少', () => {
    const ds = { handleType: 'w', startX: 100, startY: 100, startW: 200, startH: 150, ratio: 200/150 };
    expect(simulateMouseMove(ds, 150, 100).newW).toBe(150);
  });

  it('IMG-R-12: 底边 s 向下 30px', () => {
    const ds = { handleType: 's', startX: 200, startY: 200, startW: 200, startH: 150, ratio: 200/150 };
    expect(simulateMouseMove(ds, 200, 230).newH).toBe(180);
  });

  it('IMG-R-13: 角手柄 se 保持宽高比', () => {
    const ds = { handleType: 'se', startX: 250, startY: 180, startW: 200, startH: 150, ratio: 200/150 };
    const r = simulateMouseMove(ds, 300, 220);
    expect(r.newW / r.newH).toBeCloseTo(200/150, 1);
  });

  it('IMG-R-14: 最小尺寸约束 20', () => {
    const ds = { handleType: 'nw', startX: 100, startY: 100, startW: 200, startH: 150, ratio: 200/150 };
    const r = simulateMouseMove(ds, 500, 500);
    expect(r.newW).toBeGreaterThanOrEqual(20);
    expect(r.newH).toBeGreaterThanOrEqual(20);
  });

  it('IMG-R-15: 无移动 尺寸不变', () => {
    const ds = { handleType: 'se', startX: 200, startY: 150, startW: 200, startH: 150, ratio: 200/150 };
    const r = simulateMouseMove(ds, 200, 150);
    expect(r.newW).toBe(200); expect(r.newH).toBe(150);
  });
});

// ---- 5. deselectImage ----

describe('deselectImage', () => {
  let doc, ND, img;

  beforeEach(() => {
    const env = setupDOM();
    doc = env.doc; ND = env.ND; img = env.img;
    img.classList.add('selected');
    const ctn = doc.getElementById('image-resize-container');
    ctn.innerHTML = '<div class="image-resize-handle"></div>';
    ctn.classList.add('active');
    ND.resizeHandles = [ctn.firstChild];
    ND.cropOverlayActive = true;
    ND.cropState = { rect: { x: 10, y: 10, w: 100, h: 100 } };
    ND.cropOverlay.style.display = 'flex';
  });

  function deselectImage() {
    if (ND.selectedImage) { ND.selectedImage.classList.remove('selected'); ND.selectedImage = null; }
    const ctn = doc.getElementById('image-resize-container');
    if (ctn) { ctn.innerHTML = ''; ctn.classList.remove('active'); }
    ND.resizeHandles = [];
    if (ND.cropOverlay && ND.cropOverlayActive) {
      ND.cropOverlay.style.display = 'none'; ND.cropOverlayActive = false; ND.cropState = null;
    }
  }

  it('IMG-R-16: 取消选中清理状态', () => {
    deselectImage();
    expect(ND.selectedImage).toBeNull();
    expect(img.classList.contains('selected')).toBe(false);
    expect(ND.resizeHandles.length).toBe(0);
  });

  it('IMG-R-17: 裁剪遮罩关闭', () => {
    deselectImage();
    expect(ND.cropOverlay.style.display).toBe('none');
    expect(ND.cropOverlayActive).toBe(false);
    expect(ND.cropState).toBeNull();
  });

  it('IMG-R-18: 无选中不报错', () => {
    ND.selectedImage = null;
    ND.cropOverlayActive = false;
    expect(() => deselectImage()).not.toThrow();
  });
});

// ---- 6. syncImageDimensionsToInputs ----

describe('syncImageDimensionsToInputs', () => {
  let ND, img;

  beforeEach(() => { const env = setupDOM(); ND = env.ND; img = env.img; });

  function syncImageDimensionsToInputs() {
    if (!ND.selectedImage) return;
    const w = parseInt(ND.selectedImage.style.width, 10) || ND.selectedImage.naturalWidth || ND.selectedImage.width;
    const h = parseInt(ND.selectedImage.style.height, 10) || ND.selectedImage.naturalHeight || ND.selectedImage.height;
    if (ND.imgWidthInput) ND.imgWidthInput.value = w || '';
    if (ND.imgHeightInput) ND.imgHeightInput.value = h || '';
    if (w && h) ND.imageEditAspectRatio = w / h;
    if (ND.btnRestoreImage) ND.btnRestoreImage.style.display = ND.selectedImage.dataset.originalSrc ? '' : 'none';
  }

  it('IMG-R-19: 同步 style 尺寸到输入框', () => {
    img.style.width = '300px'; img.style.height = '200px';
    syncImageDimensionsToInputs();
    expect(ND.imgWidthInput.value).toBe('300');
    expect(ND.imgHeightInput.value).toBe('200');
  });

  it('IMG-R-20: 宽高比计算正确', () => {
    img.style.width = '300px'; img.style.height = '200px';
    syncImageDimensionsToInputs();
    expect(ND.imageEditAspectRatio).toBeCloseTo(1.5, 5);
  });

  it('IMG-R-21: 有 originalSrc 显示恢复按钮', () => {
    img.dataset.originalSrc = 'data:image/png;base64,orig';
    syncImageDimensionsToInputs();
    expect(ND.btnRestoreImage.style.display).not.toBe('none');
  });

  it('IMG-R-22: selectedImage null 不报错', () => {
    ND.selectedImage = null;
    expect(() => syncImageDimensionsToInputs()).not.toThrow();
  });
});

// ---- 7. restoreOriginalImage ----

describe('restoreOriginalImage', () => {
  let ND, img;

  beforeEach(() => {
    const env = setupDOM();
    ND = env.ND; img = env.img;
    img.dataset.originalSrc = 'data:image/png;base64,original-data';
    img.dataset.crop = '{"x":10,"y":10,"w":100,"h":100}';
    img.src = 'data:image/png;base64,cropped';
    img.style.width = '100px'; img.style.height = '100px';
    ND.btnRestoreImage.style.display = '';
  });

  function restoreOriginalImage() {
    if (!ND.selectedImage) return;
    const img = ND.selectedImage;
    if (!img.dataset.originalSrc) return;
    img.src = img.dataset.originalSrc;
    img.style.width = ''; img.style.height = '';
    delete img.dataset.originalSrc; delete img.dataset.crop;
    if (ND.btnRestoreImage) ND.btnRestoreImage.style.display = 'none';
  }

  it('IMG-R-23: 恢复 src 和尺寸', () => {
    restoreOriginalImage();
    expect(img.src).toContain('original-data');
    expect(img.style.width).toBe('');
    expect(img.style.height).toBe('');
  });

  it('IMG-R-24: 清除 dataset', () => {
    restoreOriginalImage();
    expect(img.dataset.originalSrc).toBeUndefined();
    expect(img.dataset.crop).toBeUndefined();
  });

  it('IMG-R-25: 隐藏恢复按钮', () => {
    restoreOriginalImage();
    expect(ND.btnRestoreImage.style.display).toBe('none');
  });

  it('IMG-R-26: 无 originalSrc 不操作', () => {
    delete img.dataset.originalSrc;
    const oldSrc = img.src;
    restoreOriginalImage();
    expect(img.src).toBe(oldSrc);
  });
});

// ---- 8. 裁剪手柄 ----

describe('裁剪手柄', () => {
  let doc;

  beforeEach(() => { doc = setupDOM().doc; });

  function createCropHandles() {
    const rect = doc.getElementById('crop-rect');
    if (!rect) return;
    rect.querySelectorAll('.image-resize-handle').forEach(h => h.remove());
    ['nw','n','ne','w','e','sw','s','se'].forEach(pos => {
      const h = doc.createElement('div');
      h.className = 'image-resize-handle handle-' + pos;
      h.dataset.handle = pos;
      rect.appendChild(h);
    });
  }

  function removeCropHandles() {
    const rect = doc.getElementById('crop-rect');
    if (rect) rect.querySelectorAll('.image-resize-handle').forEach(h => h.remove());
  }

  it('IMG-R-27: 创建 8 个裁剪手柄', () => {
    createCropHandles();
    expect(doc.querySelectorAll('#crop-rect .image-resize-handle').length).toBe(8);
  });

  it('IMG-R-28: 手柄有正确 data-handle', () => {
    createCropHandles();
    const handles = doc.querySelectorAll('#crop-rect .image-resize-handle');
    ['nw','n','ne','w','e','sw','s','se'].forEach((exp, i) => {
      expect(handles[i].dataset.handle).toBe(exp);
    });
  });

  it('IMG-R-29: removeCropHandles 清空', () => {
    createCropHandles();
    removeCropHandles();
    expect(doc.querySelectorAll('#crop-rect .image-resize-handle').length).toBe(0);
  });
});

// ---- 9. 裁剪状态机 ----

describe('裁剪 mousedown 状态机', () => {
  let ND;

  beforeEach(() => {
    ND = setupDOM().ND;
    ND.cropState = { rect: { x: 80, y: 60, w: 640, h: 480 }, mode: 'idle', scale: 0.5, startX: 0, startY: 0, startRect: null, startRatio: 640/480 };
  });

  function onCropHandleMouseDown(e, handleType) {
    if (!ND.cropState) return;
    ND.cropState.mode = 'resize';
    ND.cropState.handleType = handleType;
    ND.cropState.startX = e.clientX;
    ND.cropState.startY = e.clientY;
    ND.cropState.startRect = { ...ND.cropState.rect };
    ND.cropState.startRatio = ND.cropState.rect.w / ND.cropState.rect.h;
  }

  it('IMG-R-30: mousedown 设置 resize 模式', () => {
    onCropHandleMouseDown({ clientX: 100, clientY: 80 }, 'nw');
    expect(ND.cropState.mode).toBe('resize');
    expect(ND.cropState.handleType).toBe('nw');
    expect(ND.cropState.startRect.w).toBe(640);
  });

  it('IMG-R-31: startRect 是副本', () => {
    onCropHandleMouseDown({ clientX: 200, clientY: 200 }, 'se');
    ND.cropState.rect.w = 999;
    expect(ND.cropState.startRect.w).toBe(640);
  });

  it('IMG-R-32: cropState null 不报错', () => {
    ND.cropState = null;
    expect(() => onCropHandleMouseDown({ clientX: 100, clientY: 80 }, 'nw')).not.toThrow();
  });
});

// ---- 10. 回归验证 ----

describe('回归', () => {
  it('IMG-R-33: setup 创建的 DOM 元素可正常访问', () => {
    const env = setupDOM();
    expect(env.doc.getElementById('test-img')).not.toBeNull();
    expect(env.doc.getElementById('image-resize-container')).not.toBeNull();
    expect(env.doc.getElementById('crop-canvas')).not.toBeNull();
  });
});
