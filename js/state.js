/**
 * @file         js/state.js
 * @description  Note Diary — 全局状态与 DOM 引用
 * @author       tianxj22
 * @created      2026-06-24
 * @updated      2026-06-29
 * @version      1.1.0
 */

window.ND = window.ND || {};

// ---- 核心状态 ----
ND.notes = [];
ND.currentNote = null;        // { fileName, filePath, displayName, mtime }
ND.currentContent = '';
ND.saveTimer = null;
ND.lastSavedContent = '';

// ---- DOM 引用 ----
ND.noteListEl = document.getElementById('note-list');
ND.editorArea = document.getElementById('editor-area');
ND.btnUndo = document.getElementById('btn-undo');
ND.btnRedo = document.getElementById('btn-redo');
ND.statusLeft = document.getElementById('status-left');

ND.editorDiv = null;
ND.editorTitleInput = null;

// ---- 排序 / 视图状态 ----
ND.activeView = 'workspace'; // 'workspace' | 'trash'
ND.sortBy = 'mtime';
ND.sortDir = 'desc';

// ---- 样式工具栏 DOM ----
ND.btnBold = document.getElementById('btn-bold');
ND.btnItalic = document.getElementById('btn-italic');
ND.btnUnderline = document.getElementById('btn-underline');
ND.btnFontFamily = document.getElementById('btn-font-family');
ND.btnFontSize = document.getElementById('btn-font-size');
ND.btnAlignLeft = document.getElementById('btn-align-left');
ND.btnAlignCenter = document.getElementById('btn-align-center');
ND.btnAlignRight = document.getElementById('btn-align-right');
ND.btnForecolor = document.getElementById('btn-forecolor');
ND.btnHilitecolor = document.getElementById('btn-hilitecolor');
ND.swatchForecolor = document.getElementById('swatch-forecolor');
ND.swatchHilitecolor = document.getElementById('swatch-hilitecolor');
ND.btnFormatPainter = document.getElementById('btn-format-painter');

// ---- 格式刷状态 ----
ND.formatPainterActive = false;
ND.savedFormat = null;

// ---- 图片缩放状态 ----
ND.selectedImage = null;
ND.resizeHandles = [];
ND.isDragging = false;
ND.dragState = null;

// ---- 右键菜单 DOM ----
ND.contextMenu = document.getElementById('context-menu');
ND.contextMenuEmpty = document.getElementById('context-menu-empty');
ND.contextMenuTrash = document.getElementById('context-menu-trash');
ND.contextMenuEditor = document.getElementById('context-menu-editor');
ND.importFileInput = document.getElementById('import-file-input');
ND.contextNote = null; // 当前右键操作的笔记对象
ND.dropdownImageMenu = document.getElementById('dropdown-image-menu');

// ---- 图片编辑标签页状态 ----
ND.previousToolbarTab = 'file';       // 进入图片编辑前的标签页
ND.imageEditAspectRatio = null;       // 宽高比锁定值
ND.cropState = null;                  // { rect:{x,y,w,h}, mode, scale }
ND.cropOverlayActive = false;

// ---- 图片编辑 DOM ----
ND.toolbarTabImage = document.getElementById('tab-image-edit');
ND.toolbarImageEdit = document.getElementById('toolbar-image-edit');
ND.imgWidthInput = document.getElementById('img-width');
ND.imgHeightInput = document.getElementById('img-height');
ND.btnLockRatio = document.getElementById('btn-lock-ratio');
ND.btnCropImage = document.getElementById('btn-crop-image');
ND.cropOverlay = document.getElementById('crop-overlay');
ND.cropCanvas = document.getElementById('crop-canvas');
ND.cropRect = document.getElementById('crop-rect');
ND.btnCropConfirm = document.getElementById('btn-crop-confirm');
ND.btnCropCancel = document.getElementById('btn-crop-cancel');
ND.btnRestoreImage = document.getElementById('btn-restore-image');

// ---- 绘图状态 ----
ND.drawingActive = false;               // 是否处于绘图模式
ND.drawCanvas = null;                   // HTMLCanvasElement
ND.drawCtx = null;                      // CanvasRenderingContext2D
ND.currentTool = 'pencil';              // 当前工具标识
ND.primaryColor = '#000000';            // 主颜色
ND.secondaryColor = '#ffffff';          // 副颜色
ND.brushSize = 6;                       // 画笔大小
ND.eraserSize = 20;                     // 橡皮大小
ND.isDrawing = false;                   // 鼠标按下中
ND.drawStartX = 0;                      // 绘制起始 X
ND.drawStartY = 0;                      // 绘制起始 Y
ND.drawingSnapshots = [];               // ImageData[] 快照栈
ND.drawingSnapshotIndex = -1;           // 当前快照位置
ND.shapeFill = true;                    // 形状填充
ND.shapeStroke = true;                  // 形状描边
ND.drawingPreviousTab = 'file';         // 进入绘图前的标签页
ND.zoomLevel = 1;                       // 缩放倍率
ND.previewSnapshot = null;              // 形状预览用的快照（mousemove 恢复用）

ND.drawingCanvasData = null;             // string|null: 持久化的绘图层 base64
ND.editorScroll = null;                  // .editor-scroll 滚动容器（showEditor 时创建）

// ---- 绘图 DOM ----
ND.toolButtons = null;                  // 运行时填充：.draw-tool-btn 列表
ND.swatchPrimary = document.getElementById('swatch-primary');
ND.swatchSecondary = document.getElementById('swatch-secondary');
ND.btnPrimaryColor = document.getElementById('btn-primary-color');
ND.btnSecondaryColor = document.getElementById('btn-secondary-color');
ND.btnBrushSize = document.getElementById('btn-brush-size');
ND.btnEraserSize = document.getElementById('btn-eraser-size');
ND.btnShapeMenu = document.getElementById('dropdown-shape-menu');
ND.btnSelectMenu = document.getElementById('dropdown-select-menu');
ND.zoomLabel = document.getElementById('zoom-label');

// ---- 设置 DOM ----
ND.settingsOverlay = document.getElementById('settings-overlay');
ND.btnSettings = document.getElementById('btn-settings');

// ---- 冲突 DOM ----
ND.tabConflicts = document.getElementById('tab-conflicts');
ND.conflictBulkActions = document.getElementById('conflict-bulk-actions');
ND.conflictPreviewOverlay = document.getElementById('conflict-preview-overlay');

// ---- 选区状态 ----
ND.selectionMask = null;                // ImageData|null: 选区遮罩
ND.selectionBounds = null;              // {x,y,w,h}|null: 选区边界
ND.selectionMode = 'idle';             // 'idle'|'moving'|'resizing'
ND.lassoPoints = [];                   // 套索路径点
