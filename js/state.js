/**
 * @file         js/state.js
 * @description  Note Diary — 全局状态与 DOM 引用
 * @author       tianxj22
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
