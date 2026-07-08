/**
 * @file         js/editor-core.js
 * @description  Note Diary — 笔记选择/新建/保存/编辑器显示隐藏 + 状态栏
 * @author       tianxj22
 * @created      2026-06-25
 * @updated      2026-06-29
 * @version      1.1.0
 */

// ============================================================
// editor-core.js — 笔记选择/新建/保存/编辑器显示隐藏 + 状态栏
// ============================================================

// ---- 选择笔记 ----
async function selectNote(note) {
  if (ND.currentNote && ND.currentNote.filePath === note.filePath) return;
  // 清除搜索高亮
  if (ND.clearHighlights) ND.clearHighlights();
  // 在 async gap 前清空 currentNote，防止 autoSave 写入错误的笔记
  const prevNote = ND.currentNote;
  ND.currentNote = null;
  if (ND.saveTimer) { clearTimeout(ND.saveTimer); ND.saveTimer = null; }
  // 保存上一个笔记（含绘图层数据 + 元数据）
  if (prevNote && ND.editorDiv) {
    await saveDrawCanvasData();
    var prevDrawing = ND.drawingCanvasData || '';
    var prevText = await extractImagesFromHTML(ND.editorDiv.innerHTML, prevNote.filePath);
    var prevMeta = prevNote._meta || { title: prevNote.displayName, created: prevNote.createdAt || Date.now(), modified: Date.now() };
    prevMeta.title = prevNote.displayName;
    prevMeta.modified = Date.now();
    var prevContent = encodeNoteContent(prevText, prevDrawing, prevMeta);
    if (prevContent !== ND.lastSavedContent) {
      await window.electronAPI.saveNote(prevNote.filePath, prevContent);
    }
  }
  ND.currentNote = note;
  var raw = await window.electronAPI.readNote(note.filePath);
  var decoded = decodeNoteContent(raw);
  ND.drawingCanvasData = decoded.drawing;
  ND.currentContent = decoded.text;
  // 存储解码出的元数据，用于后续编码
  ND.currentNote._meta = decoded.metadata || { title: note.displayName, created: note.createdAt || Date.now(), modified: Date.now() };
  ND.currentNote.createdAt = (decoded.metadata && decoded.metadata.created) || note.createdAt || Date.now();
  // 从标签文件加载标签
  try {
    var tagsFromFile = await window.electronAPI.readNoteTags(note.filePath);
    ND.currentTags = Array.isArray(tagsFromFile) ? tagsFromFile : [];
  } catch (_) {
    ND.currentTags = [];
  }
  // 兼容旧纯文本笔记：将换行转换为 HTML <br>
  if (!/^\s*</.test(ND.currentContent)) {
    ND.currentContent = ND.currentContent.split('\n').map(function(line) {
      return line ? escapeHtml(line) : '<br>';
    }).join('<br>');
  }

  // 向后兼容：自动迁移旧格式 base64 图片
  var needsMigration = ND.currentContent.indexOf('data:image/') !== -1;
  var drawingNeedsMigration = decoded.drawing && decoded.drawing.startsWith('data:image/');

  if (needsMigration) {
    ND.currentContent = await extractImagesFromHTML(ND.currentContent, ND.currentNote.filePath);
  }
  if (drawingNeedsMigration) {
    ND.drawingCanvasData = await window.electronAPI.saveDrawingAsset(ND.currentNote.filePath, decoded.drawing);
  }

  // 如果有迁移发生，立即重新保存
  if (needsMigration || drawingNeedsMigration) {
    var migratedMeta = ND.currentNote._meta;
    migratedMeta.modified = Date.now();
    var migratedContent = encodeNoteContent(ND.currentContent, ND.drawingCanvasData || '', migratedMeta);
    ND.lastSavedContent = migratedContent;
    await window.electronAPI.saveNote(ND.currentNote.filePath, migratedContent);
  } else {
    // 以当前格式重新编码作为基准（包含元数据头），用于后续变更检测
    ND.lastSavedContent = encodeNoteContent(decoded.text, decoded.drawing, ND.currentNote._meta);
  }

  // 解析资源路径为 file:// URL
  ND.currentContent = await resolveAssetPaths(ND.currentContent, ND.currentNote.filePath);

  // 解析绘图数据路径
  if (ND.drawingCanvasData && ND.drawingCanvasData.startsWith('assets/')) {
    var drawAssetDir = await window.electronAPI.getAssetDir(ND.currentNote.filePath);
    ND.drawingCanvasData = 'file:///' + drawAssetDir.replace(/\\/g, '/') + '/' + ND.drawingCanvasData.replace('assets/', '');
  }

  showEditor();
  ND.editorTitleInput.value = note.displayName;
  ND.editorDiv.innerHTML = ND.currentContent;
  ND.editorDiv.focus();
  // 恢复绘图模式
  if (ND.drawingActive && ND.drawCanvas) {
    ND.drawCanvas.classList.add('drawing-active');
    updateCanvasCursor();
    ND.editorDiv.contentEditable = 'false';
    ND.switchToolbarTab('draw');
  }
  renderNoteList();
  updateStatus();
}

// ---- 新建笔记 ----
async function createNewNote() {
  await saveCurrentNote();
  const defaultName = await window.electronAPI.getNextDefaultName();
  const title = defaultName.title;
  const result = await window.electronAPI.createNote(title);
  ND.currentNote = { filePath: result.filePath, fileName: result.fileName, displayName: title, mtime: Date.now() };
  ND.currentContent = '';
  ND.lastSavedContent = '';
  showEditor();
  ND.editorTitleInput.value = title;
  ND.editorDiv.innerHTML = '';
  ND.editorDiv.focus();
  // 恢复绘图模式
  if (ND.drawingActive && ND.drawCanvas) {
    ND.drawCanvas.classList.add('drawing-active');
    updateCanvasCursor();
    ND.editorDiv.contentEditable = 'false';
    ND.switchToolbarTab('draw');
  }
  await loadNoteList();
  renderNoteList();
  updateStatus();
}

// ---- 保存当前笔记 ----
async function saveCurrentNote() {
  if (!ND.currentNote || !ND.editorDiv) return;
  await saveDrawCanvasData();
  var drawingData = ND.drawingCanvasData || '';
  var textHtml = await extractImagesFromHTML(ND.editorDiv.innerHTML, ND.currentNote.filePath);
  var meta = ND.currentNote._meta || { title: ND.currentNote.displayName, created: Date.now(), modified: Date.now() };
  meta.title = ND.currentNote.displayName;
  meta.modified = Date.now();
  var content = encodeNoteContent(textHtml, drawingData, meta);
  if (content === ND.lastSavedContent) return;
  var ok = await window.electronAPI.saveNote(ND.currentNote.filePath, content);
  if (ok) {
    ND.lastSavedContent = content;
    ND.currentNote.mtime = Date.now();
    ND.statusLeft.textContent = '已保存';
    setTimeout(function() { if (ND.statusLeft.textContent === '已保存') updateStatus(); }, 1500);
    // 保存成功，清除恢复数据
    try { await window.electronAPI.clearRecovery(); } catch (_) {}
  }
}

// ---- 自动保存（防抖） ----
function autoSave() {
  if (!ND.autoSaveEnabled) return;
  if (!ND.currentNote || !ND.editorDiv) return;
  if (ND.saveTimer) clearTimeout(ND.saveTimer);
  ND.saveTimer = setTimeout(async () => {
    // 写入崩溃恢复数据
    try {
      await window.electronAPI.writeRecovery({
        filePath: ND.currentNote.filePath,
        content: ND.editorDiv.innerHTML,
        title: ND.currentNote.displayName,
        timestamp: Date.now(),
      });
    } catch (_) { /* 恢复写入失败不阻塞保存 */ }
    await saveCurrentNote();
    // 保存成功后清除恢复数据
    try { await window.electronAPI.clearRecovery(); } catch (_) {}
    ND.lastAutoSaveTime = Date.now();
    ND.statusLeft.textContent = '自动保存';
    setTimeout(function() {
      if (ND.statusLeft.textContent === '自动保存') updateStatus();
    }, 1500);
  }, ND.autoSaveDelay);
}

// ---- 手动保存 ----
async function manualSave() {
  if (!ND.currentNote || !ND.editorDiv) return;
  await saveDrawCanvasData();
  var drawingData = ND.drawingCanvasData || '';
  var textHtml = await extractImagesFromHTML(ND.editorDiv.innerHTML, ND.currentNote.filePath);
  var meta = ND.currentNote._meta || { title: ND.currentNote.displayName, created: Date.now(), modified: Date.now() };
  meta.title = ND.currentNote.displayName;
  meta.modified = Date.now();
  var content = encodeNoteContent(textHtml, drawingData, meta);
  if (content === ND.lastSavedContent) return;
  var ok = await window.electronAPI.saveNote(ND.currentNote.filePath, content);
  if (ok) {
    ND.lastSavedContent = content;
    ND.currentNote.mtime = Date.now();
    ND.statusLeft.textContent = '已保存';
    setTimeout(function() { if (ND.statusLeft.textContent === '已保存') updateStatus(); }, 1500);
    await loadNoteList();
    renderNoteList();
  }
}

// ---- 关闭当前笔记 ----
async function closeCurrentNote() {
  if (!ND.currentNote) return;
  // 先保存当前内容
  if (ND.editorDiv) {
    await saveDrawCanvasData();
    var drawingData = ND.drawingCanvasData || '';
    var textHtml = await extractImagesFromHTML(ND.editorDiv.innerHTML, ND.currentNote.filePath);
    var meta = ND.currentNote._meta || { title: ND.currentNote.displayName, created: Date.now(), modified: Date.now() };
    meta.title = ND.currentNote.displayName;
    meta.modified = Date.now();
    var content = encodeNoteContent(textHtml, drawingData, meta);
    if (content !== ND.lastSavedContent) {
      await window.electronAPI.saveNote(ND.currentNote.filePath, content);
    }
  }
  if (ND.saveTimer) { clearTimeout(ND.saveTimer); ND.saveTimer = null; }
  deselectImage();
  ND.currentNote = null;
  ND.currentContent = '';
  ND.lastSavedContent = '';
  ND.drawingCanvasData = null;
  hideEditor();
  updateStatus();
}

// ---- 编辑器显示 ----
function showEditor() {
  ND.editorArea.innerHTML = '';

  // 关闭按钮
  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn-close-note';
  closeBtn.textContent = '×';
  closeBtn.title = '关闭当前笔记';
  closeBtn.addEventListener('click', function(e) { e.stopPropagation(); closeCurrentNote(); });
  ND.editorArea.appendChild(closeBtn);

  // 标题输入
  ND.editorTitleInput = document.createElement('input');
  ND.editorTitleInput.type = 'text';
  ND.editorTitleInput.className = 'editor-title-input';
  ND.editorTitleInput.placeholder = '笔记标题...';
  ND.editorTitleInput.addEventListener('keydown', async function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (ND.currentNote) {
        var newTitle = ND.editorTitleInput.value.trim();
        if (newTitle && newTitle !== ND.currentNote.displayName) {
          var result = await window.electronAPI.renameNote(ND.currentNote.filePath, newTitle);
          if (result) {
            ND.currentNote.filePath = result.filePath;
            ND.currentNote.fileName = result.fileName;
            ND.currentNote.displayName = newTitle;
            await loadNoteList();
            renderNoteList();
            updateStatus();
            ND.statusLeft.textContent = '已重命名';
          }
        }
      }
      ND.editorDiv && ND.editorDiv.focus();
    }
  });
  ND.editorArea.appendChild(ND.editorTitleInput);

  // 标签编辑区
  if (ND.renderTagEditor) ND.renderTagEditor(ND.currentTags);

  // 滚动容器（包裹文字层 + 绘图层）
  var scrollDiv = document.createElement('div');
  scrollDiv.className = 'editor-scroll';
  ND.editorScroll = scrollDiv;

  // 行号栏（纯视觉，不保存到文件）
  var lineGutter = document.createElement('div');
  lineGutter.className = 'line-gutter';
  lineGutter.id = 'line-gutter';
  scrollDiv.appendChild(lineGutter);

  // 文字层
  ND.editorDiv = document.createElement('div');
  ND.editorDiv.className = 'editor-content';
  ND.editorDiv.contentEditable = 'true';
  // 应用首选项中的字体大小和行高
  if (ND.prefFontSize) ND.editorDiv.style.fontSize = ND.prefFontSize + 'rem';
  if (ND.prefLineHeight) ND.editorDiv.style.lineHeight = ND.prefLineHeight;
  ND.editorDiv.addEventListener('input', onEditorInput);
  ND.editorDiv.addEventListener('keydown', onEditorKeydown);
  ND.editorDiv.addEventListener('paste', onEditorPaste);
  scrollDiv.appendChild(ND.editorDiv);

  // 绘图层（透明 canvas，覆盖在文字上方）
  var canvas = document.createElement('canvas');
  canvas.id = 'draw-canvas';
  ND.drawCanvas = canvas;
  ND.drawCtx = canvas.getContext('2d');
  scrollDiv.appendChild(canvas);

  // 选区边框 overlay（不绘入画布）
  var selOverlay = document.createElement('div');
  selOverlay.id = 'selection-overlay';
  scrollDiv.appendChild(selOverlay);

  ND.editorArea.appendChild(scrollDiv);

  // 图片缩放手柄容器
  var resizeCtn = document.createElement('div');
  resizeCtn.className = 'image-resize-container';
  resizeCtn.id = 'image-resize-container';
  ND.editorArea.appendChild(resizeCtn);

  // 绑定画布鼠标事件 + 初始化画布尺寸
  initDrawCanvas();
}

// ---- 编辑器隐藏 ----
function hideEditor() {
  ND.editorArea.innerHTML = '<div class="no-note">选择或新建一篇笔记开始编辑</div>';
  ND.editorDiv = null;
  ND.editorTitleInput = null;
  ND.selectedImage = null;
  ND.resizeHandles = [];
  ND.drawCanvas = null;
  ND.drawCtx = null;
  ND.editorScroll = null;
  // 保留 drawingActive 状态，以便新笔记恢复
}

// ---- 资源文件提取 ----

/**
 * 保存前处理 HTML：提取 base64 图片 + 将 file:/// URL 还原为相对路径
 * @param {string} html - 编辑器 innerHTML
 * @param {string} noteFilePath - 笔记文件绝对路径
 * @returns {Promise<string>} 处理后的 HTML
 */
async function extractImagesFromHTML(html, noteFilePath) {
  var tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // 计算当前笔记的 assets 目录对应的 file:// 前缀
  var notePath = noteFilePath.replace(/\\/g, '/');
  var lastSlash = notePath.lastIndexOf('/');
  var noteDir = notePath.substring(0, lastSlash);
  var noteFile = notePath.substring(lastSlash + 1);
  var lastDot = noteFile.lastIndexOf('.');
  var noteBasename = lastDot > 0 ? noteFile.substring(0, lastDot) : noteFile;
  var fileAssetsPrefix = 'file:///' + noteDir + '/assets/' + noteBasename + '/';

  // Pass 1: 提取 base64 图片 → 保存为文件 → 替换为相对路径
  var imgs = tempDiv.querySelectorAll('img[src^="data:image/"]');
  for (var i = 0; i < imgs.length; i++) {
    var dataUrl = imgs[i].src;
    var relativePath = await window.electronAPI.saveBase64Asset(noteFilePath, dataUrl);
    if (relativePath) {
      imgs[i].src = relativePath;
    }
    if (imgs[i].dataset.originalSrc && imgs[i].dataset.originalSrc.startsWith('data:image/')) {
      var origPath = await window.electronAPI.saveBase64Asset(noteFilePath, imgs[i].dataset.originalSrc);
      if (origPath) {
        imgs[i].dataset.originalSrc = origPath;
      }
    }
  }

  // Pass 2: 将 file:/// 显示 URL 还原为相对路径（图片 + 视频）
  var allImgs = tempDiv.querySelectorAll('img[src^="file:///"]');
  for (var j = 0; j < allImgs.length; j++) {
    var src = allImgs[j].getAttribute('src') || '';
    if (src.startsWith(fileAssetsPrefix)) {
      allImgs[j].setAttribute('src', 'assets/' + src.substring(fileAssetsPrefix.length));
    }
    if (allImgs[j].dataset.originalSrc && allImgs[j].dataset.originalSrc.startsWith(fileAssetsPrefix)) {
      allImgs[j].dataset.originalSrc = 'assets/' + allImgs[j].dataset.originalSrc.substring(fileAssetsPrefix.length);
    }
  }

  var allVideos = tempDiv.querySelectorAll('video[src^="file:///"]');
  for (var k = 0; k < allVideos.length; k++) {
    var vsrc = allVideos[k].getAttribute('src') || '';
    if (vsrc.startsWith(fileAssetsPrefix)) {
      allVideos[k].setAttribute('src', 'assets/' + vsrc.substring(fileAssetsPrefix.length));
    }
  }

  return tempDiv.innerHTML;
}

/**
 * 将 HTML 中的资源相对路径解析为 file:// 绝对路径（用于加载显示）
 * @param {string} html - 编辑器 innerHTML
 * @param {string} noteFilePath - 笔记文件绝对路径
 * @returns {Promise<string>} 处理后的 HTML
 */
async function resolveAssetPaths(html, noteFilePath) {
  var tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  var assetDir = await window.electronAPI.getAssetDir(noteFilePath);

  // 处理图片
  var imgs = tempDiv.querySelectorAll('img');
  for (var i = 0; i < imgs.length; i++) {
    var src = imgs[i].getAttribute('src') || '';
    if (src.startsWith('assets/')) {
      // Windows 路径反斜杠转正斜杠
      var absPath = assetDir.replace(/\\/g, '/') + '/' + src.replace('assets/', '');
      imgs[i].src = 'file:///' + absPath;
    }
    // 处理 dataset.originalSrc（裁剪原图）
    if (imgs[i].dataset.originalSrc && imgs[i].dataset.originalSrc.startsWith('assets/')) {
      var absOrigPath = assetDir.replace(/\\/g, '/') + '/' + imgs[i].dataset.originalSrc.replace('assets/', '');
      imgs[i].dataset.originalSrc = 'file:///' + absOrigPath;
    }
  }

  // 处理视频
  var videos = tempDiv.querySelectorAll('video');
  for (var j = 0; j < videos.length; j++) {
    var vsrc = videos[j].getAttribute('src') || '';
    if (vsrc.startsWith('assets/')) {
      var absVPath = assetDir.replace(/\\/g, '/') + '/' + vsrc.replace('assets/', '');
      videos[j].src = 'file:///' + absVPath;
    }
  }

  return tempDiv.innerHTML;
}

// ---- 绘图层数据管理 ----

/**
 * 保存当前绘图层数据为资源文件
 */
async function saveDrawCanvasData() {
  if (ND.drawCanvas && ND.drawCtx && ND.currentNote) {
    var dataUrl = ND.drawCanvas.toDataURL('image/png');
    ND.drawingCanvasData = await window.electronAPI.saveDrawingAsset(ND.currentNote.filePath, dataUrl);
  }
}

/**
 * 初始化画布尺寸 + 恢复保存的绘图层数据 + 绑定鼠标事件
 */
function initDrawCanvas() {
  if (!ND.drawCanvas || !ND.editorScroll) return;
  var scrollEl = ND.editorScroll;
  var contentEl = ND.editorDiv;
  // 画布尺寸跟随滚动容器内容
  var resizeCanvas = function() {
    var newW = scrollEl.clientWidth;
    var newH = Math.max(scrollEl.clientHeight, contentEl.scrollHeight);
    if (newW === ND.drawCanvas.width && newH === ND.drawCanvas.height) return;
    // 保存当前像素，resize 会清空画布
    var savedData = null;
    if (ND.drawCtx && ND.drawCanvas.width > 0 && ND.drawCanvas.height > 0) {
      savedData = ND.drawCtx.getImageData(0, 0, ND.drawCanvas.width, ND.drawCanvas.height);
    }
    ND.drawCanvas.width = newW;
    ND.drawCanvas.height = newH;
    ND.drawCanvas.style.width = newW + 'px';
    ND.drawCanvas.style.height = newH + 'px';
    // 恢复像素
    if (savedData && ND.drawCtx) {
      ND.drawCtx.putImageData(savedData, 0, 0);
    }
  };
  resizeCanvas();

  // 内容变化时重设画布高度
  if (ND.editorDiv) {
    ND.editorDiv.addEventListener('input', function() {
      setTimeout(resizeCanvas, 10);
    });
  }

  // 恢复绘图层数据
  if (ND.drawingCanvasData) {
    var img = new Image();
    img.onload = function() {
      if (ND.drawCtx) {
        ND.drawCtx.drawImage(img, 0, 0);
      }
    };
    img.src = ND.drawingCanvasData;
  }

  // 绑定画布鼠标事件
  bindCanvasEvents();
}

// ---- 组合格式：---DRAWING--- / ---TEXT--- ----

var DRAWING_SEP = '\n---DRAWING---\n';
var TEXT_SEP = '\n---TEXT---\n';
var METADATA_HEADER_START = '<!--';
var METADATA_HEADER_END = '-->';

/**
 * 编码笔记内容为持久化格式（含元数据头）
 * @param {string} textHtml - HTML 文本内容
 * @param {string} drawingDataUrl - 绘图层 base64 data URI
 * @param {object} [meta] - 元数据 { title, created, modified }
 * @returns {string}
 */
function encodeNoteContent(textHtml, drawingDataUrl, meta) {
  var d = drawingDataUrl || '';
  var t = textHtml || '';
  var body = DRAWING_SEP.trim() + '\n' + d + '\n' + TEXT_SEP.trim() + '\n' + t;

  // 如果有元数据，添加 JSON 头
  if (meta) {
    var headerMeta = {
      title: meta.title || '',
      created: meta.created || Date.now(),
      modified: meta.modified || Date.now(),
      version: (meta.version || 0) + 1,
    };
    return METADATA_HEADER_START + '\n' + JSON.stringify(headerMeta, null, 2) + '\n' + METADATA_HEADER_END + '\n' + body;
  }
  return body;
}

/**
 * 解码笔记内容（剥离元数据头）
 * @param {string} raw - 原始文件内容
 * @returns {{ drawing: string|null, text: string, metadata: object|null }}
 */
function decodeNoteContent(raw) {
  var content = raw;
  var metadata = null;

  // 剥离元数据头 <!--\n{...}\n-->
  if (content.startsWith(METADATA_HEADER_START)) {
    var endIdx = content.indexOf(METADATA_HEADER_END);
    if (endIdx !== -1) {
      try {
        var jsonStr = content.substring(METADATA_HEADER_START.length, endIdx).trim();
        metadata = JSON.parse(jsonStr);
      } catch (_) { /* ignore parse errors */ }
      content = content.substring(endIdx + METADATA_HEADER_END.length + 1); // +1 for \n
    }
  }

  var dIdx = content.indexOf(DRAWING_SEP.trim());
  var tIdx = content.indexOf(TEXT_SEP.trim());
  if (dIdx === -1 || tIdx === -1) {
    // 旧格式：整个内容作为文本
    return { drawing: null, text: content, metadata: metadata };
  }
  var drawing = content.substring(dIdx + DRAWING_SEP.trim().length + 1, tIdx).trim();
  var text = content.substring(tIdx + TEXT_SEP.trim().length + 1);
  return { drawing: drawing || null, text: text, metadata: metadata };
}

// ---- 状态栏 ----
function updateStatus() {
  if (ND.currentNote) {
    ND.statusLeft.textContent = `当前: ${ND.currentNote.displayName}`;
  } else {
    ND.statusLeft.textContent = '就绪';
  }
}
