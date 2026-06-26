/**
 * @file         js/drawing-ui.js
 * @description  Note Diary — 绘图模式 UI 控制：进入/退出、工具栏事件、画布鼠标事件、覆盖层管理
 * @author       tianxj22
 * @created      2026-06-26
 * @updated      2026-06-26
 * @version      1.0.0
 *
 * 依赖：drawing-tools.js（铅笔/画笔/橡皮/填充/取色器/形状/快照/缩放）
 */

// ============================================================
// 坐标转换：鼠标事件坐标 → canvas 像素坐标
// ============================================================

function getCanvasPos(e) {
  var rect = ND.drawCanvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) / ND.zoomLevel,
    y: (e.clientY - rect.top) / ND.zoomLevel,
  };
}

// ============================================================
// 进入/退出绘图模式
// ============================================================

function enterDrawingMode() {
  if (!ND.editorDiv) {
    ND.statusLeft.textContent = '请先选择或新建一篇笔记';
    return;
  }

  // 保存当前标签页
  var activeTab = document.querySelector('.toolbar-tab.active');
  ND.drawingPreviousTab = activeTab ? activeTab.dataset.tab : 'file';
  ND.switchToolbarTab('draw');

  // 获取或创建画布
  var canvas = document.getElementById('draw-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'draw-canvas';
    var ws = document.querySelector('.draw-workspace');
    if (ws) ws.appendChild(canvas);
  }

  // 设置画布大小（自适应编辑区）
  var areaRect = ND.editorArea.getBoundingClientRect();
  var w = Math.max(400, Math.min(areaRect.width - 64, 1200));
  var h = Math.max(300, Math.min(areaRect.height - 120, 800));
  canvas.width = w;
  canvas.height = h;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';

  ND.drawCanvas = canvas;
  ND.drawCtx = canvas.getContext('2d');

  // 白色背景
  ND.drawCtx.fillStyle = '#ffffff';
  ND.drawCtx.fillRect(0, 0, canvas.width, canvas.height);

  // 显示覆盖层
  ND.drawOverlay.classList.add('active');
  ND.drawingActive = true;

  // 设置默认工具
  ND.currentTool = 'pencil';
  updateActiveToolButton();
  updateCanvasCursor();

  // 初始快照
  ND.drawingSnapshots = [];
  ND.drawingSnapshotIndex = -1;
  pushSnapshot(ND.drawCtx);

  // 缩放重置
  ND.zoomLevel = 1;
  ND.drawZoomLabel.textContent = '100%';
  zoomCanvas(ND.drawCanvas, 1);

  // 绑定事件
  bindCanvasEvents();

  ND.statusLeft.textContent = '绘图模式 — 铅笔';
}

function exitDrawingMode() {
  ND.drawOverlay.classList.remove('active');
  ND.drawingActive = false;
  ND.isDrawing = false;
  ND.previewSnapshot = null;
  ND.drawingSnapshots = [];
  ND.drawingSnapshotIndex = -1;
  ND.zoomLevel = 1;
  unbindCanvasEvents();
  // 恢复标签
  ND.switchToolbarTab(ND.drawingPreviousTab);
  ND.statusLeft.textContent = '就绪';
}

function finalizeDrawing() {
  if (!ND.drawCanvas || !ND.editorDiv) return;
  var dataUrl = ND.drawCanvas.toDataURL('image/png');
  // 复用 insert-features.js 的插入函数
  insertImageAtCursor(dataUrl);
  ND.statusLeft.textContent = '绘图已插入';
  exitDrawingMode();
}

function clearCanvas() {
  if (!ND.drawCtx || !ND.drawCanvas) return;
  ND.drawCtx.globalCompositeOperation = 'source-over';
  ND.drawCtx.fillStyle = '#ffffff';
  ND.drawCtx.fillRect(0, 0, ND.drawCanvas.width, ND.drawCanvas.height);
  pushSnapshot(ND.drawCtx);
  ND.statusLeft.textContent = '画布已清除';
}

// ============================================================
// 画布鼠标事件
// ============================================================

var _canvasMouseDown = null;
var _canvasMouseMove = null;
var _canvasMouseUp = null;

function bindCanvasEvents() {
  _canvasMouseDown = function(e) { onCanvasMouseDown(e); };
  _canvasMouseMove = function(e) { onCanvasMouseMove(e); };
  _canvasMouseUp = function(e) { onCanvasMouseUp(e); };
  ND.drawCanvas.addEventListener('mousedown', _canvasMouseDown);
  document.addEventListener('mousemove', _canvasMouseMove);
  document.addEventListener('mouseup', _canvasMouseUp);
}

function unbindCanvasEvents() {
  if (_canvasMouseDown) ND.drawCanvas.removeEventListener('mousedown', _canvasMouseDown);
  if (_canvasMouseMove) document.removeEventListener('mousemove', _canvasMouseMove);
  if (_canvasMouseUp) document.removeEventListener('mouseup', _canvasMouseUp);
  _canvasMouseDown = _canvasMouseMove = _canvasMouseUp = null;
}

function onCanvasMouseDown(e) {
  if (!ND.drawingActive || e.button !== 0) return;
  e.preventDefault();
  var pos = getCanvasPos(e);
  var ctx = ND.drawCtx;

  // 形状/直线工具：保存快照用于预览
  if (ND.currentTool.indexOf('shape-') === 0 || ND.currentTool === 'shape-line') {
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
      ND.statusLeft.textContent = '颜料桶填充完成';
      break;
    case 'picker':
      var color = pickColor(ctx, pos.x, pos.y);
      ND.primaryColor = color;
      ND.btnPrimaryColor.value = color;
      ND.swatchPrimary.style.background = color;
      ND.statusLeft.textContent = '取色: ' + color;
      break;
    case 'zoom-in':
      ND.zoomLevel = Math.min(3, ND.zoomLevel + 0.25);
      ND.drawZoomLabel.textContent = Math.round(ND.zoomLevel * 100) + '%';
      zoomCanvas(ND.drawCanvas, ND.zoomLevel);
      break;
    case 'zoom-out':
      ND.zoomLevel = Math.max(0.25, ND.zoomLevel - 0.25);
      ND.drawZoomLabel.textContent = Math.round(ND.zoomLevel * 100) + '%';
      zoomCanvas(ND.drawCanvas, ND.zoomLevel);
      break;
    // 形状工具：记录起始坐标
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
    // 形状预览：恢复快照 → 画预览
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

  switch (ND.currentTool) {
    case 'eraser':
      eraserEnd(ND.drawCtx);
      break;
    // 形状：mouseup 时快照已包含最终形状（预览阶段已画）
    case 'shape-rect':
    case 'shape-ellipse':
    case 'shape-line':
    case 'shape-roundrect':
      // 最终绘制（清预览残留，正式画到画布）
      if (ND.previewSnapshot) ND.drawCtx.putImageData(ND.previewSnapshot, 0, 0);
      var pos = getCanvasPos(e);
      switch (ND.currentTool) {
        case 'shape-rect':
          drawRect(ND.drawCtx, ND.drawStartX, ND.drawStartY, pos.x, pos.y,
            ND.primaryColor, ND.primaryColor, ND.shapeFill, ND.shapeStroke);
          break;
        case 'shape-ellipse':
          drawEllipse(ND.drawCtx, ND.drawStartX, ND.drawStartY, pos.x, pos.y,
            ND.primaryColor, ND.primaryColor, ND.shapeFill, ND.shapeStroke);
          break;
        case 'shape-line':
          drawLine(ND.drawCtx, ND.drawStartX, ND.drawStartY, pos.x, pos.y, ND.primaryColor);
          break;
        case 'shape-roundrect':
          drawRoundRect(ND.drawCtx, ND.drawStartX, ND.drawStartY, pos.x, pos.y,
            12, ND.primaryColor, ND.primaryColor, ND.shapeFill, ND.shapeStroke);
          break;
      }
      ND.previewSnapshot = null;
      pushSnapshot(ND.drawCtx);
      break;
  }

  ND.isDrawing = false;
}

// ============================================================
// 工具切换
// ============================================================

function selectTool(toolId) {
  ND.currentTool = toolId;
  ND.isDrawing = false;
  ND.previewSnapshot = null;
  updateActiveToolButton();
  updateCanvasCursor();

  var names = {
    'pencil': '铅笔', 'brush': '画笔', 'eraser': '橡皮', 'fill': '颜料桶',
    'picker': '取色器', 'zoom-in': '放大', 'zoom-out': '缩小',
    'shape-rect': '矩形', 'shape-ellipse': '圆形', 'shape-line': '直线',
    'shape-roundrect': '圆角矩形'
  };
  ND.statusLeft.textContent = '绘图模式 — ' + (names[toolId] || toolId);
}

function updateActiveToolButton() {
  var btns = document.querySelectorAll('.draw-tool-btn');
  for (var i = 0; i < btns.length; i++) {
    var tool = btns[i].dataset.tool;
    if (tool === ND.currentTool || (tool && ND.currentTool.indexOf(tool) === 0)) {
      btns[i].classList.add('active');
    } else {
      btns[i].classList.remove('active');
    }
  }
}

function updateCanvasCursor() {
  var canvas = ND.drawCanvas;
  if (!canvas) return;
  // 清除所有光标类
  var cursorClasses = ['cursor-eraser', 'cursor-fill', 'cursor-picker', 'cursor-zoom-in', 'cursor-zoom-out'];
  for (var i = 0; i < cursorClasses.length; i++) {
    canvas.classList.remove(cursorClasses[i]);
  }
  // 设置新光标
  switch (ND.currentTool) {
    case 'eraser': canvas.classList.add('cursor-eraser'); break;
    case 'fill': canvas.classList.add('cursor-fill'); break;
    case 'picker': canvas.classList.add('cursor-picker'); break;
    case 'zoom-in': canvas.classList.add('cursor-zoom-in'); break;
    case 'zoom-out': canvas.classList.add('cursor-zoom-out'); break;
    default: /* crosshair (CSS default) */ break;
  }
}

// ============================================================
// 事件绑定（加载时执行一次）
// ============================================================

// 绘图标签页点击 → 进入绘图模式
(function() {
  var drawTab = document.querySelector('.toolbar-tab[data-tab="draw"]');
  if (drawTab) {
    drawTab.addEventListener('click', function() {
      if (!ND.drawingActive) enterDrawingMode();
    });
  }
})();

// 切换到其他标签时自动退出绘图
document.querySelector('.toolbar-tabs').addEventListener('click', function(e) {
  var tab = e.target.closest('.toolbar-tab');
  if (tab && tab.dataset.tab !== 'draw' && ND.drawingActive) {
    exitDrawingMode();
  }
}, true);

// 工具栏面板按钮点击委托
document.getElementById('toolbar-draw').addEventListener('click', function(e) {
  var btn = e.target.closest('.draw-tool-btn');
  if (btn && btn.dataset.tool) {
    selectTool(btn.dataset.tool);
    return;
  }
  // 缩放按钮（不是 draw-tool-btn）
  if (e.target.id === 'btn-tool-zoom-in') { selectTool('zoom-in'); return; }
  if (e.target.id === 'btn-tool-zoom-out') { selectTool('zoom-out'); return; }
});

// 画笔/橡皮大小变化
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
      // 更新下拉主按钮 data-tool
      document.getElementById('btn-tool-shape').dataset.tool = tool;
      // 更新菜单项 active 态
      var allItems = ND.btnShapeMenu.querySelectorAll('.menu-item');
      for (var j = 0; j < allItems.length; j++) {
        allItems[j].classList.toggle('active', allItems[j].dataset.tool === tool);
      }
    });
  }
})();

// 完成/取消/清除
ND.btnDrawDone.addEventListener('click', finalizeDrawing);
ND.btnDrawCancel.addEventListener('click', exitDrawingMode);
ND.btnDrawClear.addEventListener('click', clearCanvas);

// Escape 关闭
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && ND.drawingActive) {
    exitDrawingMode();
  }
});
