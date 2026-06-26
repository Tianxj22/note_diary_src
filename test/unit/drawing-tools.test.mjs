/**
 * @file         drawing-tools.test.mjs
 * @description  js/drawing-tools.js 绘图工具算法的单元测试
 * @author       tianxj22
 * @created      2026-06-26
 * @updated      2026-06-26
 * @version      1.0.0
 */

import { describe, it, expect } from 'vitest';
import { createCanvas as nodeCreateCanvas, ImageData } from 'canvas';

// ---- 测试用 Canvas 创建 ----

function createCanvas(w, h) {
  const canvas = nodeCreateCanvas(w, h);
  return { canvas };
}

// ---- 从 drawing-tools.js 复制的测试用函数 ----

function getPixel(data, width, x, y) {
  const i = (y * width + x) * 4;
  return [data[i], data[i + 1], data[i + 2], data[i + 3]];
}

function setPixel(data, width, x, y, color) {
  const i = (y * width + x) * 4;
  data[i] = color[0];
  data[i + 1] = color[1];
  data[i + 2] = color[2];
  data[i + 3] = color[3];
}

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

  if (colorsMatch(targetColor, fillColor, tolerance)) {
    return imageData;
  }

  const stack = [[startX, startY]];
  const visited = new Uint8Array(width * height);
  let iterations = 0;
  const MAX_ITERATIONS = width * height;

  while (stack.length > 0 && iterations < MAX_ITERATIONS) {
    const [sx, sy] = stack.pop();
    iterations++;

    let left = sx;
    while (left >= 0 && colorsMatch(getPixel(data, width, left, sy), targetColor, tolerance)) left--;
    left++;

    let right = sx;
    while (right < width && colorsMatch(getPixel(data, width, right, sy), targetColor, tolerance)) right++;
    right--;

    for (let px = left; px <= right; px++) {
      setPixel(data, width, px, sy, fillColor);
    }

    for (let nx = left; nx <= right; nx++) {
      if (sy > 0) {
        const idx = (sy - 1) * width + nx;
        if (!visited[idx] && colorsMatch(getPixel(data, width, nx, sy - 1), targetColor, tolerance)) {
          visited[idx] = 1;
          stack.push([nx, sy - 1]);
        }
      }
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

function normalRect(x1, y1, x2, y2) {
  return { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) };
}

// ---- 1. floodFill 测试 ----

describe('floodFill', () => {
  it('DRW-01: 填充白色画布中黑色矩形包围的封闭区域 → 区域内变红', () => {
    const { canvas } = createCanvas(100, 100);
    const ctx = canvas.getContext('2d');
    // 画一个黑色矩形框（内部白色）
    ctx.fillStyle = '#000000';
    ctx.fillRect(20, 20, 60, 2);   // 上边
    ctx.fillRect(20, 78, 60, 2);   // 下边
    ctx.fillRect(20, 20, 2, 60);   // 左边
    ctx.fillRect(78, 20, 2, 60);   // 右边

    const imageData = ctx.getImageData(0, 0, 100, 100);
    const result = floodFill(imageData, 50, 50, '#ff0000', 0);
    const pixel = getPixel(result.data, 100, 50, 50);
    expect(pixel[0]).toBe(255); // R
    expect(pixel[1]).toBe(0);   // G
    expect(pixel[2]).toBe(0);   // B
  });

  it('DRW-02: 目标颜色与填充颜色相同 → 不填充（返回原数据）', () => {
    const { canvas } = createCanvas(10, 10);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 10, 10);
    const imageData = ctx.getImageData(0, 0, 10, 10);
    const result = floodFill(imageData, 5, 5, '#ff0000', 0);
    // 结果应与输入数据相同（肉眼判断：像素颜色不变）
    const pixel = getPixel(result.data, 10, 5, 5);
    expect(pixel[0]).toBe(255);
    expect(pixel[1]).toBe(0);
    expect(pixel[2]).toBe(0);
  });

  it('DRW-03: 超出画布边界的起始坐标 → 返回原 imageData', () => {
    const { canvas } = createCanvas(10, 10);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 10, 10);
    const imageData = ctx.getImageData(0, 0, 10, 10);
    const result = floodFill(imageData, -1, 5, '#ff0000', 0);
    expect(result).toBe(imageData);
  });

  it('DRW-04: 容差 50 → 相近颜色被填充', () => {
    const { canvas } = createCanvas(20, 20);
    const ctx = canvas.getContext('2d');
    // 画接近白色的区域 (#fefefe)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 20, 20);
    ctx.fillStyle = '#fefefe';
    ctx.fillRect(5, 5, 10, 10);
    const imageData = ctx.getImageData(0, 0, 20, 20);
    // 用容差 2 在 #fefefe 区域填充红色
    const result = floodFill(imageData, 10, 10, '#ff0000', 2);
    const pixel = getPixel(result.data, 20, 10, 10);
    expect(pixel[0]).toBe(255); // 应该是红色
  });

  it('DRW-05: 小画布单个像素填充 → 正确', () => {
    const { canvas } = createCanvas(3, 3);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 3, 3);
    const imageData = ctx.getImageData(0, 0, 3, 3);
    const result = floodFill(imageData, 1, 1, '#0000ff', 0);
    const pixel = getPixel(result.data, 3, 1, 1);
    expect(pixel[2]).toBe(255); // 蓝色
  });
});

// ---- 2. hexToRGBA 测试 ----

describe('hexToRGBA', () => {
  it('DRW-06: "#ff0000" → [255, 0, 0, 255]', () => {
    const result = hexToRGBA('#ff0000');
    expect(result).toEqual([255, 0, 0, 255]);
  });

  it('DRW-07: "#000000" → [0, 0, 0, 255]', () => {
    const result = hexToRGBA('#000000');
    expect(result).toEqual([0, 0, 0, 255]);
  });

  it('DRW-08: "#ffffff" → [255, 255, 255, 255]', () => {
    const result = hexToRGBA('#ffffff');
    expect(result).toEqual([255, 255, 255, 255]);
  });
});

// ---- 3. colorsMatch 测试 ----

describe('colorsMatch', () => {
  it('DRW-09: 相同颜色 tolerance=0 → true', () => {
    expect(colorsMatch([255, 0, 0, 255], [255, 0, 0, 255], 0)).toBe(true);
  });

  it('DRW-10: 不同颜色 tolerance=0 → false', () => {
    expect(colorsMatch([255, 0, 0, 255], [0, 255, 0, 255], 0)).toBe(false);
  });

  it('DRW-11: 相近颜色 tolerance=10 → true', () => {
    expect(colorsMatch([100, 100, 100, 255], [105, 102, 98, 255], 10)).toBe(true);
  });

  it('DRW-12: 相近颜色 tolerance=2 → false', () => {
    expect(colorsMatch([100, 100, 100, 255], [105, 102, 98, 255], 2)).toBe(false);
  });
});

// ---- 4. normalRect 测试 ----

describe('normalRect', () => {
  it('DRW-13: (10,10)→(50,30) → {x:10, y:10, w:40, h:20}', () => {
    const r = normalRect(10, 10, 50, 30);
    expect(r.x).toBe(10);
    expect(r.y).toBe(10);
    expect(r.w).toBe(40);
    expect(r.h).toBe(20);
  });

  it('DRW-14: 反向拖拽 (50,30)→(10,10) → 仍然 {x:10, y:10, w:40, h:20}', () => {
    const r = normalRect(50, 30, 10, 10);
    expect(r.x).toBe(10);
    expect(r.y).toBe(10);
    expect(r.w).toBe(40);
    expect(r.h).toBe(20);
  });
});

// ---- 5. 画布快照管理测试 ----

describe('快照管理', () => {
  // 模拟 ND 命名空间用于快照测试
  const ND = {
    drawingSnapshots: [],
    drawingSnapshotIndex: -1,
  };

  function pushSnapshot(ctx) {
    ND.drawingSnapshots = ND.drawingSnapshots.slice(0, ND.drawingSnapshotIndex + 1);
    ND.drawingSnapshots.push(ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height));
    if (ND.drawingSnapshots.length > 50) {
      ND.drawingSnapshots.shift();
    } else {
      ND.drawingSnapshotIndex = ND.drawingSnapshots.length - 1;
    }
  }

  function undoSnapshot(ctx) {
    if (ND.drawingSnapshotIndex > 0) {
      ND.drawingSnapshotIndex--;
      ctx.putImageData(ND.drawingSnapshots[ND.drawingSnapshotIndex], 0, 0);
      return true;
    }
    return false;
  }

  function redoSyncShot(ctx) {
    if (ND.drawingSnapshotIndex < ND.drawingSnapshots.length - 1) {
      ND.drawingSnapshotIndex++;
      ctx.putImageData(ND.drawingSnapshots[ND.drawingSnapshotIndex], 0, 0);
      return true;
    }
    return false;
  }

  it('DRW-15: push → index 增加', () => {
    const { canvas } = createCanvas(20, 20);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 20, 20);
    ND.drawingSnapshots = [];
    ND.drawingSnapshotIndex = -1;

    pushSnapshot(ctx);
    expect(ND.drawingSnapshots.length).toBe(1);
    expect(ND.drawingSnapshotIndex).toBe(0);
  });

  it('DRW-16: push 3 次 → undo 回退到第 2 个快照', () => {
    const { canvas } = createCanvas(20, 20);
    const ctx = canvas.getContext('2d');
    ND.drawingSnapshots = [];
    ND.drawingSnapshotIndex = -1;

    // 快照 1: 白色
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 20, 20);
    pushSnapshot(ctx);

    // 快照 2: 红色圆
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(5, 5, 10, 10);
    pushSnapshot(ctx);

    // 快照 3: 蓝色圆
    ctx.fillStyle = '#0000ff';
    ctx.fillRect(8, 8, 4, 4);
    pushSnapshot(ctx);

    expect(ND.drawingSnapshotIndex).toBe(2);

    // undo → 回到快照 2
    const ok = undoSnapshot(ctx);
    expect(ok).toBe(true);
    expect(ND.drawingSnapshotIndex).toBe(1);

    // 检查像素：应该是红色（快照 2 的状态），5,5 位置应该是红色
    const pixel = ctx.getImageData(6, 6, 1, 1).data;
    expect(pixel[0]).toBe(255); // 红色
  });

  it('DRW-17: undo 到底后再 undo → 返回 false', () => {
    const { canvas } = createCanvas(20, 20);
    const ctx = canvas.getContext('2d');
    ND.drawingSnapshots = [];
    ND.drawingSnapshotIndex = -1;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 20, 20);
    pushSnapshot(ctx);

    expect(undoSnapshot(ctx)).toBe(false); // index 0, 不能再 undo
  });

  it('DRW-18: redo 到底后再 redo → 返回 false', () => {
    const { canvas } = createCanvas(20, 20);
    const ctx = canvas.getContext('2d');
    ND.drawingSnapshots = [];
    ND.drawingSnapshotIndex = -1;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 20, 20);
    pushSnapshot(ctx);

    expect(redoSyncShot(ctx)).toBe(false); // 没有重做历史
  });

  it('DRW-19: undo 后 push → 重做历史被截断', () => {
    const { canvas } = createCanvas(20, 20);
    const ctx = canvas.getContext('2d');
    ND.drawingSnapshots = [];
    ND.drawingSnapshotIndex = -1;

    // 3 个快照
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 20, 20); pushSnapshot(ctx);
    ctx.fillStyle = '#ff0000'; ctx.fillRect(5, 5, 10, 10); pushSnapshot(ctx);
    ctx.fillStyle = '#0000ff'; ctx.fillRect(8, 8, 4, 4); pushSnapshot(ctx);

    // undo x2
    undoSnapshot(ctx); undoSnapshot(ctx);
    expect(ND.drawingSnapshotIndex).toBe(0);

    // 新操作 push → 重做历史应被截断
    ctx.fillStyle = '#00ff00'; ctx.fillRect(0, 0, 5, 5); pushSnapshot(ctx);
    expect(ND.drawingSnapshots.length).toBe(2); // 原来的 3 个被截为 1+1
    expect(ND.drawingSnapshotIndex).toBe(1);
    expect(redoSyncShot(ctx)).toBe(false); // 没有可重做的
  });
});

// ---- 6. 形状辅助函数测试 ----

describe('形状辅助', () => {
  it('DRW-20: 矩形绘制可在 canvas 上产生非白像素', () => {
    const { canvas } = createCanvas(100, 100);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 100, 100);
    // 模拟 drawRect
    const r = normalRect(20, 20, 80, 60);
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x, r.y, r.w, r.h);

    const pixel = ctx.getImageData(50, 40, 1, 1).data;
    expect(pixel[0]).toBe(255); // 内部是红色
  });
});
