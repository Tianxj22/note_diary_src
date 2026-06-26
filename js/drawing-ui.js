/**
 * @file         js/drawing-ui.js
 * @description  Note Diary — 绘图模式切换 + 工具栏事件 + 画布鼠标事件分发
 * @author       tianxj22
 * @created      2026-06-26
 * @updated      2026-06-26
 * @version      1.1.0
 *
 * 双层架构：画布嵌入在 editor-scroll 中，始终可见。
 * 绘图模式仅切换 pointer-events（穿透/拦截）+ 光标。
 */

// ============================================================
// 坐标转换
// ============================================================

function getCanvasPos(e) {
  var rect = ND.drawCanvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) / ND.zoomLevel,
    y: (e.clientY - rect.top) / ND.zoomLevel,
  };
}

// ============================================================
// 绘图模式切换
// ============================================================

function toggleDrawingMode(active) {
  if (active === undefined) active = !ND.drawingActive;
  if (active && !ND.editorDiv) {
    ND.statusLeft.textContent = '请先选择或新建一篇笔记';
    return;
  }
  ND.drawingActive = active;
  var canvas = ND.drawCanvas;
  if (!canvas) return;

  if (active) {
    canvas.classList.add('drawing-active');
    updateCanvasCursor();
    ND.switchToolbarTab('draw');
    // 禁止编辑文字
    if (ND.editorDiv) ND.editorDiv.contentEditable = 'false';
    // 初始化快照（如果没有）
    if (ND.drawingSnapshots.length === 0 && ND.drawCtx) {
      pushSnapshot(ND.drawCtx);
    }
    ND.statusLeft.textContent = '绘图模式 — ' + getToolName(ND.currentTool);
  } else {
    canvas.classList.remove('drawing-active');
    canvas.classList.remove('cursor-eraser', 'cursor-fill', 'cursor-picker');
    // 恢复文字编辑
    if (ND.editorDiv) ND.editorDiv.contentEditable = 'true';
    ND.isDrawing = false;
    ND.previewSnapshot = null;
    // 切换回之前的标签
    if (ND.drawingPreviousTab && ND.drawingPreviousTab !== 'draw') {
      ND.switchToolbarTab(ND.drawingPreviousTab);
    }
  }
}

function getToolName(tool) {
  var names = {
    'pencil': '铅笔', 'brush': '画笔', 'eraser': '橡皮', 'fill': '颜料桶',
    'picker': '取色器',
    'shape-rect': '矩形', 'shape-ellipse': '圆形', 'shape-line': '直线',
    'shape-roundrect': '圆角矩形',
    'select-rect': '矩形选框', 'select-lasso': '套索', 'select-wand': '魔术棒',
    'text': '文字工具'
  };
  return names[tool] || tool;
}

// ============================================================
// 画布鼠标事件
// ============================================================

// 存储 bound 函数引用用于 unbind
var _boundMouseDown = null;
var _boundMouseMove = null;
var _boundMouseUp = null;

function bindCanvasEvents() {
  if (!ND.drawCanvas) return;
  unbindCanvasEvents();
  _boundMouseDown = function(e) { onCanvasMouseDown(e); };
  _boundMouseMove = function(e) { onCanvasMouseMove(e); };
  _boundMouseUp = function(e) { onCanvasMouseUp(e); };
  ND.drawCanvas.addEventListener('mousedown', _boundMouseDown);
  document.addEventListener('mousemove', _boundMouseMove);
  document.addEventListener('mouseup', _boundMouseUp);
}

function unbindCanvasEvents() {
  if (_boundMouseDown && ND.drawCanvas) ND.drawCanvas.removeEventListener('mousedown', _boundMouseDown);
  if (_boundMouseMove) document.removeEventListener('mousemove', _boundMouseMove);
  if (_boundMouseUp) document.removeEventListener('mouseup', _boundMouseUp);
  _boundMouseDown = _boundMouseMove = _boundMouseUp = null;
}

function onCanvasMouseDown(e) {
  if (!ND.drawingActive || e.button !== 0) return;
  e.preventDefault();
  var pos = getCanvasPos(e);
  var ctx = ND.drawCtx;
  if (!ctx) return;

  // 形状/选框工具：保存快照用于预览
  if (ND.currentTool.indexOf('shape-') === 0 || ND.currentTool === 'select-rect') {
    pushSnapshot(ctx);
    ND.previewSnapshot = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  switch (ND.currentTool) {
    case 'pencil':
      pushSnapshot(ctx);
      pencilStart(ctx, pos.x, pos.y, ND.primaryColor);
      ND.isDrawing = true;
      break;
    case 'brush':
      pushSnapshot(ctx);
      brushStart(ctx, pos.x, pos.y, ND.primaryColor, ND.brushSize);
      ND.isDrawing = true;
      break;
    case 'eraser':
      pushSnapshot(ctx);
      eraserStart(ctx, pos.x, pos.y, ND.eraserSize);
      ND.isDrawing = true;
      break;
    case 'fill':
      pushSnapshot(ctx);
      var imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
      var filled = floodFill(imageData, pos.x, pos.y, ND.primaryColor, 10);
      ctx.putImageData(filled, 0, 0);
      pushSnapshot(ctx);
      ND.statusLeft.textContent = '绘图模式 — 颜料桶';
      break;
    case 'picker':
      var color = pickColor(ctx, pos.x, pos.y);
      ND.primaryColor = color;
      ND.btnPrimaryColor.value = color;
      ND.swatchPrimary.style.background = color;
      ND.statusLeft.textContent = '绘图模式 — 取色: ' + color;
      break;
    // 选区工具
    case 'select-wand':
      pushSnapshot(ctx);
      var idata = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
      var sel = magicWandSelect(idata, pos.x, pos.y, 20);
      if (sel) {
        ND.selectionMask = sel.mask;
        ND.selectionBounds = sel.bounds;
        drawSelectionOutline(ctx, sel.mask);
        ND.statusLeft.textContent = '绘图模式 — 魔术棒选区已创建';
      }
      break;
    case 'select-lasso':
      ND.lassoPoints = [{x: pos.x, y: pos.y}];
      ND.isDrawing = true;
      break;
    case 'select-rect':
      ND.drawStartX = pos.x;
      ND.drawStartY = pos.y;
      ND.isDrawing = true;
      break;
    // 文字工具
    case 'text':
      pushSnapshot(ctx);
      var txt = prompt('输入文字:', '');
      if (txt && ND.drawCtx) {
        ND.drawCtx.font = '18px sans-serif';
        ND.drawCtx.fillStyle = ND.primaryColor;
        ND.drawCtx.fillText(txt, pos.x, pos.y);
        pushSnapshot(ctx);
      }
      ND.statusLeft.textContent = '绘图模式 — 文字';
      break;
    case 'shape-rect':
    case 'shape-ellipse':
    case 'shape-line':
    case 'shape-roundrect':
      ND.drawStartX = pos.x;
      ND.drawStartY = pos.y;
      ND.isDrawing = true;
      break;
  }
}

function onCanvasMouseMove(e) {
  if (!ND.drawingActive || !ND.isDrawing) return;
  var pos = getCanvasPos(e);
  var ctx = ND.drawCtx;

  switch (ND.currentTool) {
    case 'pencil':
      pencilMove(ctx, pos.x, pos.y);
      break;
    case 'brush':
      brushMove(ctx, pos.x, pos.y);
      break;
    case 'eraser':
      eraserMove(ctx, pos.x, pos.y);
      break;
    case 'select-rect':
      if (ND.previewSnapshot) ctx.putImageData(ND.previewSnapshot, 0, 0);
      drawDashedRect(ctx, ND.drawStartX, ND.drawStartY, pos.x, pos.y);
      break;
    case 'select-lasso':
      ND.lassoPoints.push({x: pos.x, y: pos.y});
      if (ND.previewSnapshot) ctx.putImageData(ND.previewSnapshot, 0, 0);
      drawLassoPreview(ctx, ND.lassoPoints);
      break;
    case 'shape-rect':
      if (ND.previewSnapshot) ctx.putImageData(ND.previewSnapshot, 0, 0);
      drawRect(ctx, ND.drawStartX, ND.drawStartY, pos.x, pos.y,
        ND.primaryColor, ND.primaryColor, ND.shapeFill, ND.shapeStroke);
      break;
    case 'shape-ellipse':
      if (ND.previewSnapshot) ctx.putImageData(ND.previewSnapshot, 0, 0);
      drawEllipse(ctx, ND.drawStartX, ND.drawStartY, pos.x, pos.y,
        ND.primaryColor, ND.primaryColor, ND.shapeFill, ND.shapeStroke);
      break;
    case 'shape-line':
      if (ND.previewSnapshot) ctx.putImageData(ND.previewSnapshot, 0, 0);
      drawLine(ctx, ND.drawStartX, ND.drawStartY, pos.x, pos.y, ND.primaryColor);
      break;
    case 'shape-roundrect':
      if (ND.previewSnapshot) ctx.putImageData(ND.previewSnapshot, 0, 0);
      drawRoundRect(ctx, ND.drawStartX, ND.drawStartY, pos.x, pos.y, 12,
        ND.primaryColor, ND.primaryColor, ND.shapeFill, ND.shapeStroke);
      break;
  }
}

function onCanvasMouseUp(e) {
  if (!ND.drawingActive) return;
  var ctx = ND.drawCtx;

  switch (ND.currentTool) {
    case 'eraser':
      eraserEnd(ctx);
      break;
    case 'select-rect':
      if (ND.previewSnapshot) ctx.putImageData(ND.previewSnapshot, 0, 0);
      var rpos = getCanvasPos(e);
      drawDashedRect(ctx, ND.drawStartX, ND.drawStartY, rpos.x, rpos.y);
      var rb = normalRect(ND.drawStartX, ND.drawStartY, rpos.x, rpos.y);
      ND.selectionBounds = rb;
      ND.selectionMask = createMaskFromBounds(ctx.canvas.width, ctx.canvas.height, rb);
      ND.previewSnapshot = null;
      ND.statusLeft.textContent = '绘图模式 — 矩形选区已创建';
      break;
    case 'select-lasso':
      if (ND.previewSnapshot) ctx.putImageData(ND.previewSnapshot, 0, 0);
      if (ND.lassoPoints.length > 2) {
        var mask = createLassoMask(ctx.canvas.width, ctx.canvas.height, ND.lassoPoints);
        ND.selectionMask = mask;
        ND.selectionBounds = getMaskBounds(mask);
        drawSelectionOutline(ctx, mask);
      }
      ND.lassoPoints = [];
      ND.previewSnapshot = null;
      ND.statusLeft.textContent = '绘图模式 — 套索选区已创建';
      break;
    case 'shape-rect':
    case 'shape-ellipse':
    case 'shape-line':
    case 'shape-roundrect':
      if (ND.previewSnapshot) ctx.putImageData(ND.previewSnapshot, 0, 0);
      var pos = getCanvasPos(e);
      switch (ND.currentTool) {
        case 'shape-rect':
          drawRect(ctx, ND.drawStartX, ND.drawStartY, pos.x, pos.y,
            ND.primaryColor, ND.primaryColor, ND.shapeFill, ND.shapeStroke);
          break;
        case 'shape-ellipse':
          drawEllipse(ctx, ND.drawStartX, ND.drawStartY, pos.x, pos.y,
            ND.primaryColor, ND.primaryColor, ND.shapeFill, ND.shapeStroke);
          break;
        case 'shape-line':
          drawLine(ctx, ND.drawStartX, ND.drawStartY, pos.x, pos.y, ND.primaryColor);
          break;
        case 'shape-roundrect':
          drawRoundRect(ctx, ND.drawStartX, ND.drawStartY, pos.x, pos.y,
            12, ND.primaryColor, ND.primaryColor, ND.shapeFill, ND.shapeStroke);
          break;
      }
      ND.previewSnapshot = null;
      pushSnapshot(ctx);
      break;
  }
  ND.isDrawing = false;
}

// ============================================================
// 工具切换 + 光标
// ============================================================

function selectTool(toolId) {
  ND.currentTool = toolId;
  ND.isDrawing = false;
  ND.previewSnapshot = null;
  updateActiveToolButton();
  updateCanvasCursor();
  ND.statusLeft.textContent = '绘图模式 — ' + getToolName(toolId);
}

function updateActiveToolButton() {
  var btns = document.querySelectorAll('.draw-tool-btn');
  for (var i = 0; i < btns.length; i++) {
    var tool = btns[i].dataset.tool;
    var match = (tool === ND.currentTool) || (tool && ND.currentTool.indexOf(tool) === 0);
    btns[i].classList.toggle('active', match);
  }
}

function updateCanvasCursor() {
  var canvas = ND.drawCanvas;
  if (!canvas) return;
  var classes = ['cursor-eraser', 'cursor-fill', 'cursor-picker'];
  for (var i = 0; i < classes.length; i++) canvas.classList.remove(classes[i]);
  switch (ND.currentTool) {
    case 'eraser': canvas.classList.add('cursor-eraser'); break;
    case 'fill': canvas.classList.add('cursor-fill'); break;
    case 'picker': canvas.classList.add('cursor-picker'); break;
  }
}

// ============================================================
// 清空绘图层
// ============================================================

function clearDrawCanvas() {
  if (!ND.drawCtx || !ND.drawCanvas) return;
  ND.drawCtx.clearRect(0, 0, ND.drawCanvas.width, ND.drawCanvas.height);
  pushSnapshot(ND.drawCtx);
  ND.drawingCanvasData = null;
  ND.statusLeft.textContent = '绘图模式 — 绘图层已清除';
}

// ============================================================
// 事件绑定（加载时执行一次）
// ============================================================

// 绘图标签点击 → 切换绘图模式
(function() {
  var drawTab = document.querySelector('.toolbar-tab[data-tab="draw"]');
  if (drawTab) {
    drawTab.addEventListener('click', function() {
      toggleDrawingMode(!ND.drawingActive);
    });
  }
})();

// 切换到其他标签时自动退出绘图
document.querySelector('.toolbar-tabs').addEventListener('click', function(e) {
  var tab = e.target.closest('.toolbar-tab');
  if (tab && tab.dataset.tab !== 'draw' && ND.drawingActive) {
    ND.drawingPreviousTab = tab.dataset.tab;
    toggleDrawingMode(false);
  }
}, true);

// 工具栏面板按钮委托 + 下拉菜单 toggle
document.getElementById('toolbar-draw').addEventListener('click', function(e) {
  // 阻止事件穿透到 canvas
  e.stopPropagation();

  // 如果有打开的选区下拉，先关闭
  var selectMenu = document.getElementById('dropdown-select-menu');
  var shapeMenu = document.getElementById('dropdown-shape-menu');

  // 点击选区下拉切换按钮 → toggle
  var selectBtn = e.target.closest('#btn-tool-select');
  if (selectBtn) {
    selectMenu.classList.toggle('visible');
    if (shapeMenu) shapeMenu.classList.remove('visible');
    return;
  }
  // 点击形状下拉切换按钮 → toggle
  var shapeBtn = e.target.closest('#btn-tool-shape');
  if (shapeBtn) {
    shapeMenu.classList.toggle('visible');
    if (selectMenu) selectMenu.classList.remove('visible');
    return;
  }

  // 关闭所有下拉（点击了其他区域）
  if (selectMenu) selectMenu.classList.remove('visible');
  if (shapeMenu) shapeMenu.classList.remove('visible');

  // 普通工具按钮
  var btn = e.target.closest('.draw-tool-btn');
  if (btn && btn.dataset.tool) {
    selectTool(btn.dataset.tool);
    return;
  }
});

// 清除按钮：点击两次铅笔按钮触发清除（简化：用画笔大小选择器旁边的空间）
// 添加清除按钮到绘图面板（通过 js 动态添加）
(function() {
  var panel = document.getElementById('toolbar-draw');
  if (panel) {
    var sep = document.createElement('span');
    sep.className = 'separator';
    panel.appendChild(sep);
    var clearBtn = document.createElement('button');
    clearBtn.id = 'btn-draw-clear';
    clearBtn.className = 'style-btn';
    clearBtn.setAttribute('data-tooltip', '清除绘图层');
    clearBtn.textContent = '🗑';
    clearBtn.addEventListener('click', clearDrawCanvas);
    panel.appendChild(clearBtn);
  }
})();

// 画笔/橡皮大小
ND.btnBrushSize.addEventListener('change', function() {
  ND.brushSize = parseInt(ND.btnBrushSize.value, 10);
});
ND.btnEraserSize.addEventListener('change', function() {
  ND.eraserSize = parseInt(ND.btnEraserSize.value, 10);
});

// 颜色选择
ND.btnPrimaryColor.addEventListener('input', function(e) {
  ND.primaryColor = e.target.value;
  ND.swatchPrimary.style.background = e.target.value;
});
ND.btnSecondaryColor.addEventListener('input', function(e) {
  ND.secondaryColor = e.target.value;
  ND.swatchSecondary.style.background = e.target.value;
});

// 交换颜色
document.getElementById('btn-color-swap').addEventListener('click', function() {
  var tmp = ND.primaryColor;
  ND.primaryColor = ND.secondaryColor;
  ND.secondaryColor = tmp;
  ND.btnPrimaryColor.value = ND.primaryColor;
  ND.btnSecondaryColor.value = ND.secondaryColor;
  ND.swatchPrimary.style.background = ND.primaryColor;
  ND.swatchSecondary.style.background = ND.secondaryColor;
});

// 形状下拉菜单
(function() {
  var items = ND.btnShapeMenu.querySelectorAll('.menu-item');
  for (var i = 0; i < items.length; i++) {
    items[i].addEventListener('click', function(e) {
      e.stopPropagation();
      var tool = this.dataset.tool;
      selectTool(tool);
      document.getElementById('btn-tool-shape').dataset.tool = tool;
      var allItems = ND.btnShapeMenu.querySelectorAll('.menu-item');
      for (var j = 0; j < allItems.length; j++) {
        allItems[j].classList.toggle('active', allItems[j].dataset.tool === tool);
      }
    });
  }
})();

// Esc 退出绘图模式（若有选区则先取消选区）
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && ND.drawingActive) {
    if (ND.selectionMask) {
      clearSelectionOutline(ND.drawCtx);
      ND.selectionMask = null;
      ND.selectionBounds = null;
      ND.statusLeft.textContent = '绘图模式 — 选区已取消';
      return;
    }
    ND.drawingPreviousTab = 'file';
    toggleDrawingMode(false);
  }
  // Delete 键删除选区内容
  if (e.key === 'Delete' && ND.drawingActive && ND.selectionMask && ND.drawCtx) {
    pushSnapshot(ND.drawCtx);
    deleteSelection(ND.drawCtx, ND.selectionMask);
    ND.selectionMask = null;
    ND.selectionBounds = null;
    ND.statusLeft.textContent = '绘图模式 — 选区已删除';
  }
});

// 选区下拉菜单
(function() {
  if (!ND.btnSelectMenu) return;
  var items = ND.btnSelectMenu.querySelectorAll('.menu-item');
  for (var i = 0; i < items.length; i++) {
    items[i].addEventListener('click', function(e) {
      e.stopPropagation();
      var tool = this.dataset.tool;
      selectTool(tool);
      document.getElementById('btn-tool-select').dataset.tool = tool;
      var allItems = ND.btnSelectMenu.querySelectorAll('.menu-item');
      for (var j = 0; j < allItems.length; j++) {
        allItems[j].classList.toggle('active', allItems[j].dataset.tool === tool);
      }
    });
  }
})();

// 缩放控件（通用，右下角浮动）
(function() {
  var btnZoomIn = document.getElementById('btn-zoom-in');
  var btnZoomOut = document.getElementById('btn-zoom-out');
  if (btnZoomIn) btnZoomIn.addEventListener('click', function() {
    var lv = Math.min(3, ND.zoomLevel + 0.25);
    applyZoom(lv);
  });
  if (btnZoomOut) btnZoomOut.addEventListener('click', function() {
    var lv = Math.max(0.25, ND.zoomLevel - 0.25);
    applyZoom(lv);
  });
})();
