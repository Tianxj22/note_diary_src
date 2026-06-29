/**
 * @file         resize-icon.js
 * @description  从原始图标生成各平台所需尺寸的图标文件
 * @author       tianxj22
 * @created      2026-06-29
 * @updated      2026-06-29
 * @version      1.0.0
 */

const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SOURCE = path.join(ROOT, 'icons.png');
const BUILD = path.join(ROOT, 'build');
const ICONS_DIR = path.join(BUILD, 'icons');

// Linux .desktop 所需尺寸
const SIZES = [16, 32, 48, 256, 512];

/**
 * 将源图标缩放到指定尺寸并保存
 * @param {number} size - 目标正方形边长（像素）
 */
async function resizeTo(size) {
  const sourceImg = await loadImage(SOURCE);
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(sourceImg, 0, 0, size, size);

  const outPath = path.join(ICONS_DIR, `${size}x${size}.png`);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outPath, buffer);
  console.log(`  ✓ ${size}x${size}.png (${buffer.length} bytes)`);
}

async function main() {
  // 确保目录存在
  if (!fs.existsSync(BUILD)) fs.mkdirSync(BUILD, { recursive: true });
  if (!fs.existsSync(ICONS_DIR)) fs.mkdirSync(ICONS_DIR, { recursive: true });

  // 复制源文件到 build/icon.png（electron-builder 约定名）
  const dest = path.join(BUILD, 'icon.png');
  fs.copyFileSync(SOURCE, dest);
  console.log(`✓ build/icon.png (from icons.png)`);

  // 生成各尺寸
  console.log('Generating multi-size icons for Linux...');
  for (const size of SIZES) {
    await resizeTo(size);
  }

  console.log('Icon preparation complete.');
}

main().catch(err => {
  console.error('Icon preparation failed:', err);
  process.exit(1);
});
