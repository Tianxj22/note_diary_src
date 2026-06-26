/**
 * @file         js/drawing-tools.js
 * @description  Note Diary — 绘图工具算法：铅笔/画笔/橡皮/颜料桶/取色器/形状/快照/缩放
 * @author       tianxj22
 * @created      2026-06-26
 * @updated      2026-06-26
 * @version      1.0.0
 *
 * 所有函数接收 CanvasRenderingContext2D，不直接依赖 DOM。
 */

// ============================================================
// 铅笔工具 — 硬边缘 1px 线条
// ============================================================

function pencilStart(ctx, x, y, color) {
  ctx.beginPath();
  ctx.moveTo(x + 0.5, y + 0.5);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
  ctx.globalCompositeOperation = 'source-over';
}

function pencilMove(ctx, x, y) {
  ctx.lineTo(x + 0.5, y + 0.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 0.5, y + 0.5);
}

// ============================================================
// 画笔工具 — 圆头可变大小
// ============================================================

function brushStart(ctx, x, y, color, size) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalCompositeOperation = 'source-over';
}

function brushMove(ctx, x, y) {
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
}

// ============================================================
// 橡皮工具 — destination-out 擦除
// ============================================================

function eraserStart(ctx, x, y, size) {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineWidth = size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

function eraserMove(ctx, x, y) {
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
}

function eraserEnd(ctx) {
  ctx.restore();
}

// ============================================================
// 颜料桶 — 扫描线洪水填充（非递归栈实现，避免栈溢出）
// ============================================================

/**
 * 读取像素颜色
 */
function getPixel(data, width, x, y) {
  const i = (y * width + x) * 4;
  return [data[i], data[i + 1], data[i + 2], data[i + 3]];
}

/**
 * 设置像素颜色
 */
function setPixel(data, width, x, y, color) {
  const i = (y * width + x) * 4;
  data[i] = color[0];
  data[i + 1] = color[1];
  data[i + 2] = color[2];
  data[i + 3] = color[3];
}

/**
 * 判断两个 RGBA 颜色是否在容差范围内匹配
 */
function colorsMatch(c1, c2, tolerance) {
  if (tolerance === 0) {
    return c1[0] === c2[0] && c1[1] === c2[1] && c1[2] === c2[2] && c1[3] === c2[3];
  }
  const dr = Math.abs(c1[0] - c2[0]);
  const dg = Math.abs(c1[1] - c2[1]);
  const db = Math.abs(c1[2] - c2[2]);
  const da = Math.abs(c1[3] - c2[3]);
  return dr <= tolerance && dg <= tolerance && db <= tolerance && da <= tolerance;
}

/**
 * hex 颜色转 RGBA 数组
 * @param {string} hex - 如 "#ff0000" 或 "#ff0000ff"
 * @returns {[number,number,number,number]}
 */
function hexToRGBA(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 6) hex += 'ff';
  return [
    parseInt(hex.substring(0, 2), 16),
    parseInt(hex.substring(2, 4), 16),
    parseInt(hex.substring(4, 6), 16),
    parseInt(hex.substring(6, 8), 16),
  ];
}

/**
 * 扫描线洪水填充
 * @param {ImageData} imageData
 * @param {number} startX
 * @param {number} startY
 * @param {string} fillHex - 填充颜色 hex
 * @param {number} tolerance - 容差 0-255
 * @returns {ImageData}
 */
function floodFill(imageData, startX, startY, fillHex, tolerance) {
  const width = imageData.width;
  const height = imageData.height;
  const data = new Uint8ClampedArray(imageData.data);

  startX = Math.floor(startX);
  startY = Math.floor(startY);

  if (startX < 0 || startX >= width || startY < 0 || startY >= height) {
    return imageData;
  }

  const fillColor = hexToRGBA(fillHex);
  const targetColor = getPixel(data, width, startX, startY);

  // 相同颜色不填充
  if (colorsMatch(targetColor, fillColor, tolerance)) {
    return imageData;
  }

  const stack = [[startX, startY]];
  const visited = new Uint8Array(width * height);
  let iterations = 0;
  const MAX_ITERATIONS = width * height; // 安全上限

  while (stack.length > 0 && iterations < MAX_ITERATIONS) {
    const [sx, sy] = stack.pop();
    iterations++;

    // 扫描左边界
    let left = sx;
    while (left >= 0 && colorsMatch(getPixel(data, width, left, sy), targetColor, tolerance)) {
      left--;
    }
    left++;

    // 扫描右边界
    let right = sx;
    while (right < width && colorsMatch(getPixel(data, width, right, sy), targetColor, tolerance)) {
      right++;
    }
    right--;

    // 填充该行
    for (let px = left; px <= right; px++) {
      setPixel(data, width, px, sy, fillColor);
    }

    // 检查上一行和下一行
    for (let nx = left; nx <= right; nx++) {
      // 上一行
      if (sy > 0) {
        const idx = (sy - 1) * width + nx;
        if (!visited[idx] && colorsMatch(getPixel(data, width, nx, sy - 1), targetColor, tolerance)) {
          visited[idx] = 1;
          stack.push([nx, sy - 1]);
        }
      }
      // 下一行
      if (sy < height - 1) {
        const idx = (sy + 1) * width + nx;
        if (!visited[idx] && colorsMatch(getPixel(data, width, nx, sy + 1), targetColor, tolerance)) {
          visited[idx] = 1;
          stack.push([nx, sy + 1]);
        }
      }
    }
  }

  return new ImageData(data, width, height);
}

// ============================================================
// 取色器 — 从画布读取指定坐标颜色
// ============================================================

/**
 * 取色器
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - canvas 坐标
 * @param {number} y - canvas 坐标
 * @returns {string} hex 颜色
 */
function pickColor(ctx, x, y) {
  const pixel = ctx.getImageData(x, y, 1, 1).data;
  return '#' + [pixel[0], pixel[1], pixel[2]]
    .map(function(c) { return c.toString(16).padStart(2, '0'); }).join('');
}

// ============================================================
// 形状绘制
// ============================================================

/**
 * 标准化矩形坐标（确保 x1<=x2, y1<=y2）
 */
function normalRect(x1, y1, x2, y2) {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    w: Math.abs(x2 - x1),
    h: Math.abs(y2 - y1),
  };
}

/**
 * 绘制矩形
 */
function drawRect(ctx, x1, y1, x2, y2, fillColor, strokeColor, doFill, doStroke) {
  var r = normalRect(x1, y1, x2, y2);
  if (doFill) {
    ctx.fillStyle = fillColor;
    ctx.fillRect(r.x, r.y, r.w, r.h);
  }
  if (doStroke) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
  }
}

/**
 * 绘制椭圆/圆形
 */
function drawEllipse(ctx, x1, y1, x2, y2, fillColor, strokeColor, doFill, doStroke) {
  var r = normalRect(x1, y1, x2, y2);
  var cx = r.x + r.w / 2;
  var cy = r.y + r.h / 2;
  var rx = r.w / 2;
  var ry = r.h / 2;

  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  if (doFill) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (doStroke) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

/**
 * 绘制直线
 */
function drawLine(ctx, x1, y1, x2, y2, strokeColor) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.stroke();
}

/**
 * 绘制圆角矩形
 */
function drawRoundRect(ctx, x1, y1, x2, y2, radius, fillColor, strokeColor, doFill, doStroke) {
  var r = normalRect(x1, y1, x2, y2);
  var rad = Math.min(radius || 12, r.w / 2, r.h / 2);

  ctx.beginPath();
  ctx.moveTo(r.x + rad, r.y);
  ctx.lineTo(r.x + r.w - rad, r.y);
  ctx.arcTo(r.x + r.w, r.y, r.x + r.w, r.y + rad, rad);
  ctx.lineTo(r.x + r.w, r.y + r.h - rad);
  ctx.arcTo(r.x + r.w, r.y + r.h, r.x + r.w - rad, r.y + r.h, rad);
  ctx.lineTo(r.x + rad, r.y + r.h);
  ctx.arcTo(r.x, r.y + r.h, r.x, r.y + r.h - rad, rad);
  ctx.lineTo(r.x, r.y + rad);
  ctx.arcTo(r.x, r.y, r.x + rad, r.y, rad);
  ctx.closePath();

  if (doFill) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (doStroke) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

// ============================================================
// 快照管理（撤销/重做）
// ============================================================

/**
 * 保存当前画布状态
 */
function pushSnapshot(ctx) {
  // 截断当前位置之后的重做历史
  ND.drawingSnapshots = ND.drawingSnapshots.slice(0, ND.drawingSnapshotIndex + 1);
  ND.drawingSnapshots.push(ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height));
  // 限制历史层数
  if (ND.drawingSnapshots.length > 50) {
    ND.drawingSnapshots.shift();
  }
  ND.drawingSnapshotIndex = ND.drawingSnapshots.length - 1;
}

/**
 * 撤销
 * @returns {boolean} 是否成功
 */
function undoSnapshot(ctx) {
  if (ND.drawingSnapshotIndex > 0) {
    ND.drawingSnapshotIndex--;
    ctx.putImageData(ND.drawingSnapshots[ND.drawingSnapshotIndex], 0, 0);
    return true;
  }
  return false;
}

/**
 * 重做
 * @returns {boolean} 是否成功
 */
function redoSyncShot(ctx) {
  if (ND.drawingSnapshotIndex < ND.drawingSnapshots.length - 1) {
    ND.drawingSnapshotIndex++;
    ctx.putImageData(ND.drawingSnapshots[ND.drawingSnapshotIndex], 0, 0);
    return true;
  }
  return false;
}

// ============================================================
// 缩放
// ============================================================

/**
 * 缩放编辑器滚动容器（文字 + 绘图层同步缩放）
 */
function applyZoom(level) {
  if (!ND.editorScroll) return;
  ND.zoomLevel = level;
  ND.editorScroll.style.transform = 'scale(' + level + ')';
  ND.editorScroll.style.transformOrigin = 'top left';
  var label = document.getElementById('zoom-label');
  if (label) label.textContent = Math.round(level * 100) + '%';
}

// ============================================================
// 选区工具
// ============================================================

/**
 * 基于 floodFill 的魔术棒选区
 * @returns {{ mask: ImageData, bounds: {x,y,w,h} }}
 */
function magicWandSelect(imageData, startX, startY, tolerance) {
  var width = imageData.width, height = imageData.height;
  var data = new Uint8ClampedArray(imageData.data);
  startX = Math.floor(startX); startY = Math.floor(startY);
  if (startX < 0 || startX >= width || startY < 0 || startY >= height) return null;

  var targetColor = getPixel(data, width, startX, startY);
  // mask: alpha=255 for selected pixels
  var maskData = new Uint8ClampedArray(width * height * 4);
  var stack = [[startX, startY]];
  var minX = startX, maxX = startX, minY = startY, maxY = startY;

  while (stack.length > 0) {
    var pt = stack.pop();
    var sx = pt[0], sy = pt[1];
    var i = (sy * width + sx) * 4;
    if (maskData[i + 3] !== 0) continue;
    if (!colorsMatch(getPixel(data, width, sx, sy), targetColor, tolerance)) continue;

    maskData[i] = 255; maskData[i+1] = 255; maskData[i+2] = 255; maskData[i+3] = 255;
    if (sx < minX) minX = sx; if (sx > maxX) maxX = sx;
    if (sy < minY) minY = sy; if (sy > maxY) maxY = sy;

    if (sx > 0) stack.push([sx-1, sy]);
    if (sx < width-1) stack.push([sx+1, sy]);
    if (sy > 0) stack.push([sx, sy-1]);
    if (sy < height-1) stack.push([sx, sy+1]);
  }

  return {
    mask: new ImageData(maskData, width, height),
    bounds: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 }
  };
}

/**
 * 从矩形边界创建遮罩
 */
function createMaskFromBounds(w, h, bounds) {
  var data = new Uint8ClampedArray(w * h * 4);
  for (var y = bounds.y; y < bounds.y + bounds.h && y < h; y++) {
    for (var x = bounds.x; x < bounds.x + bounds.w && x < w; x++) {
      var i = (y * w + x) * 4;
      data[i] = 255; data[i+1] = 255; data[i+2] = 255; data[i+3] = 255;
    }
  }
  return new ImageData(data, w, h);
}

/**
 * 套索多边形遮罩（射线法判断点是否在多边形内）
 */
function createLassoMask(w, h, points) {
  var data = new Uint8ClampedArray(w * h * 4);
  var minX = w, maxX = 0, minY = h, maxY = 0;
  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      if (pointInPolygon(x, y, points)) {
        var i = (y * w + x) * 4;
        data[i] = 255; data[i+1] = 255; data[i+2] = 255; data[i+3] = 255;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  return new ImageData(data, w, h);
}

function pointInPolygon(x, y, points) {
  var inside = false;
  for (var i = 0, j = points.length - 1; i < points.length; j = i++) {
    var xi = points[i].x, yi = points[i].y;
    var xj = points[j].x, yj = points[j].y;
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function getMaskBounds(mask) {
  var w = mask.width, h = mask.height, d = mask.data;
  var minX = w, maxX = 0, minY = h, maxY = 0, found = false;
  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 0) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        found = true;
      }
    }
  }
  return found ? { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 } : null;
}

/**
 * 删除选区内容（设为透明）
 */
function deleteSelection(ctx, mask) {
  var imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  var d = imageData.data, m = mask.data;
  for (var i = 3; i < d.length; i += 4) {
    if (m[i] > 0) { d[i-3] = 0; d[i-2] = 0; d[i-1] = 0; d[i] = 0; }
  }
  ctx.putImageData(imageData, 0, 0);
}

// ============================================================
// 选区虚线框绘制
// ============================================================

function drawDashedRect(ctx, x1, y1, x2, y2) {
  var r = normalRect(x1, y1, x2, y2);
  ctx.save();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 3]);
  ctx.strokeRect(r.x, r.y, r.w, r.h);
  ctx.setLineDash([]);
  ctx.restore();
}

function drawLassoPreview(ctx, points) {
  if (points.length < 2) return;
  ctx.save();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 3]);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (var i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawSelectionOutline(ctx, mask) {
  var bounds = getMaskBounds(mask);
  if (!bounds) return;
  ctx.save();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 3]);
  ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);
  ctx.setLineDash([]);
  ctx.restore();
}

function clearSelectionOutline(ctx) {
  if (!ND.previewSnapshot) return;
  ctx.putImageData(ND.previewSnapshot, 0, 0);
}
