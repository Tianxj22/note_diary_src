# 集成测试文档

## 1. 概述

### 1.1 为什么需要集成测试

项目已有的测试体系存在两层：

| 层级 | 覆盖范围 | 局限 |
|------|----------|------|
| 单元测试（118条） | 单函数纯逻辑 | 不涉及模块间交互 |
| E2E测试（~88条） | 用户 UI 交互 | 需要桌面环境，依赖 Electron + Playwright 版本兼容 |

**集成测试填补了中间层**：在不启动 Electron 的情况下，使用 jsdom 模拟完整 DOM 环境，验证多个模块协作时的状态传递、工具切换、内容序列化等工作流。

### 1.2 测试环境

- **运行器**：Vitest（与现有单元测试相同）
- **DOM 环境**：[jsdom](https://github.com/jsdom/jsdom) — 模拟浏览器 DOM、Selection API
- **Canvas 支持**：[node-canvas](https://github.com/Automattic/node-canvas) — 提供真实像素级绘制验证
- **文件存储 Mock**：基于 `Map<string, string>` 的内存文件系统，模拟 IPC 调用

### 1.3 核心设计决策

**函数内联复制**：与现有单元测试策略一致，不直接 `require()` 源码（因为源码在 parse-time 就访问 `document.getElementById()` 等全局 DOM）。改为将源码中的关键函数逻辑复制到 `helpers.mjs`，在 jsdom 环境中执行。

**Mock execCommand**：jsdom 不支持 `document.execCommand()`，因此 `helpers.mjs` 提供了完整的 mock 实现，支持 `bold`、`italic`、`underline`、`fontName`、`fontSize`、`foreColor`、`hiliteColor`、`justifyLeft/Center/Right`、`insertHTML`、`delete`、`insertLineBreak`、`undo`、`redo` 等核心命令。

---

## 2. 使用方法

### 2.1 运行命令

```bash
# 运行全部集成测试
npx vitest run test/integration/

# 运行单个测试文件
npx vitest run test/integration/full-workflow.test.mjs

# 监听模式（文件变更自动重跑）
npx vitest test/integration/
```

### 2.2 依赖要求

集成测试需要 `jsdom` 和 `canvas`（node-canvas）两个 devDependency。如果未安装：

```bash
npm install --save-dev jsdom canvas
```

### 2.3 与现有测试命令的关系

```bash
npm test              # 仅单元测试（test/unit/），不包含集成测试
npx vitest run test/integration/  # 仅集成测试
npx vitest run test/  # 全部测试（单元 + 集成）
```

---

## 3. 测试架构

### 3.1 文件结构

```
test/integration/
├── helpers.mjs                       # 共享基础设施（~1350行）
│   ├── buildDOM()                    # 完整 DOM 构建（对照 index.html）
│   ├── createND(doc)                 # ND 命名空间（~80个字段）
│   ├── createMockAPI()               # Mock electronAPI（Map 文件系统）
│   ├── encodeNoteContent()           # 内容编码（editor-core.js）
│   ├── decodeNoteContent()           # 内容解码
│   ├── showEditor() / hideEditor()   # 编辑器显示/隐藏
│   ├── execInsertHTML()              # 插入 HTML（editor-events.js）
│   ├── execDeleteElement()           # 删除元素
│   ├── getCurrentLineMarker()        # 行标记检测
│   ├── isCurrentLineEmpty()          # 空行检测
│   ├── toggleLineStrikethrough()     # 清单删除线（editor-markers.js）
│   ├── createCheckboxElement()       # 复选框创建
│   ├── createTimestampElement()      # 时间戳创建
│   ├── selectImage() / deselectImage() # 图片选中/取消（image-resize.js）
│   ├── createResizeHandles()         # 缩放手柄创建
│   ├── updateHandlePositions()       # 手柄位置更新
│   ├── syncImageDimensionsToInputs() # 尺寸输入框同步
│   ├── restoreOriginalImage()        # 恢复原图
│   ├── activateFormatPainter()       # 格式刷激活（style-toolbar.js）
│   ├── applyFormatPainter()          # 格式刷应用
│   ├── deactivateFormatPainter()     # 格式刷停用
│   ├── pushSnapshot()                # 绘图快照（drawing-tools.js）
│   ├── undoSnapshot() / redoSyncShot() # 绘图撤销/重做
│   ├── toggleDrawingMode()           # 绘图模式切换（drawing-ui.js）
│   ├── selectTool()                  # 工具选择
│   ├── applyZoom()                   # 缩放
│   ├── drawRect/drawEllipse/drawLine/drawRoundRect() # 形状绘制
│   ├── floodFill() / pickColor()     # 填充/取色
│   ├── createMaskFromBounds()        # 矩形选区遮罩
│   ├── createLassoMask()             # 套索选区遮罩
│   ├── pointInPolygon()              # 射线法判断
│   ├── getMaskBounds()               # 遮罩边界
│   ├── deleteSelection()             # 选区删除
│   ├── execCommand mock              # bold/italic/underline/fontName/... 完整 mock
│   ├── queryCommandState mock        # 状态查询 mock
│   ├── queryCommandValue mock        # 值查询 mock
│   └── createTestEnvironment()       # 一键创建完整测试环境
├── full-workflow.test.mjs            # 1条测试 ~380行 41步
├── drawing-shapes-workflow.test.mjs  # 1条测试 ~200行 18步
├── serialization.test.mjs            # 9条测试
├── image-lifecycle.test.mjs          # 8条测试
├── marker-richtext.test.mjs          # 9条测试
├── drawing-mode.test.mjs             # 9条测试
├── mixed-content-save-load.test.mjs  # 5条测试
├── undo-redo-cross-content.test.mjs  # 5条测试
├── format-painter.test.mjs           # 5条测试
├── cross-tab-workflow.test.mjs       # 7条测试
└── state-cleanup.test.mjs            # 5条测试
```

### 3.2 createTestEnvironment() 工厂函数

每个测试文件通过 `beforeEach` 调用 `createTestEnvironment()` 获得全新环境：

```javascript
import { createTestEnvironment, showEditor } from './helpers.mjs';

beforeEach(async () => {
  env = createTestEnvironment();
  doc = env.doc;    // jsdom document
  ND = env.ND;      // ND 命名空间
  api = env.api;    // mock electronAPI
  api._reset();     // 清空文件存储

  // 创建笔记 + 显示编辑器
  const dn = await api.getNextDefaultName();
  const r = await api.createNote(dn.title);
  ND.currentNote = { filePath: r.filePath, fileName: r.fileName, ... };
  showEditor(doc, ND);
});
```

### 3.3 Mock 文件系统

```javascript
// Mock API 使用 Map 模拟文件存储
api.saveNote(filePath, content);      // 写入文件
api.readNote(filePath);               // 读取文件
api.createNote(title);                // 创建笔记
api.renameNote(filePath, newTitle);   // 重命名
api.duplicateNote(filePath);          // 复制
api.moveToTrash(dir, filePath);       // 移入回收站
api.listTrash();                      // 列出回收站
api.restoreFromTrash(fileName);       // 恢复
api.permanentlyDelete(fileName);      // 永久删除
api.emptyTrash();                     // 清空回收站
api._getFile(filePath);               // 直接读取（测试验证用）
api._reset();                         // 清空所有数据
```

---

## 4. 测试用例详解

### 4.1 `full-workflow.test.mjs` — 全功能端到端流程 ★

**1 条测试**，模拟用户从零开始使用所有功能的完整会话。

| 阶段 | 步骤 | 操作 | 验证点 |
|------|------|------|--------|
| **阶段1: 文本编辑** | 1 | createNewNote() | editorDiv存在, contentEditable='true', 标题输入框存在 |
| | 2 | 输入三段文本 + `<br>` 分隔 | innerHTML 包含三段文本和 `<br>` |
| | 3 | 选中"第二段文本" → Ctrl+B 加粗 | innerHTML 包含 `<b>第二段文本</b>` |
| | 4 | 选中"第一段" → Ctrl+I 斜体 | innerHTML 包含 `<i>` |
| | 5 | 选中"第三段" → KaiTi + size 5 | innerHTML 包含 KaiTi |
| | 6 | 全选 → 文字红色 #ff0000 | innerHTML 包含 color |
| | 7 | 光标定位第二段 → 居中 | justifyCenter 执行 |
| | 8 | 格式刷：选中第一段 → activateFormatPainter | formatPainterActive=true, savedFormat 非空 |
| | 9 | 输入"格式刷目标" → applyFormatPainter | formatPainterActive=false |
| **阶段2: 图片** | 10 | insertHTML 插入图片 | `<img>` 元素存在 |
| | 11 | selectImage(img) | selectedImage=img, 8个手柄, image-edit标签显示 |
| | 12 | 拖拽se手柄缩放 200×150→300×225 | img.style.width='300px' |
| | 13 | 锁定宽高比 → 设置宽度400 → 高度自动 | img.style.height 按比例计算 |
| | 14-15 | 模拟裁剪：设置 dataset.originalSrc + dataset.crop | src变为裁剪后dataURL |
| | 16 | restoreOriginalImage() | src恢复, dataset清除 |
| | 17 | deselectImage() | selectedImage=null, 手柄清空 |
| **阶段3: 标记** | 18 | execInsertHTML 插入 .check-box | 1个 checkbox |
| | 19 | 再次插入 .check-box | 2个 checkbox |
| | 21 | 勾选第一个checkbox → toggleLineStrikethrough | checked类, .checklist-checked包裹创建 |
| | 22 | 取消勾选 → toggleLineStrikethrough(false) | .checklist-checked移除 |
| | 23-24 | 插入2个 .log-stamp 时间戳 | 2个 timestamp |
| | 25 | execDeleteElement 删除最后一个 | timestamp数量减少 |
| | 26 | getCurrentLineMarker 单标记约束 | marker为null或正确类型 |
| **阶段4: 绘图** | 27 | toggleDrawingMode(true) | drawingActive=true, contentEditable='false' |
| | 28a | **铅笔** — fillRect在(50,30)文字区域 | 像素非透明 ✅ |
| | 28b | **画笔** — 划线(10,160)→(250,280)**重叠图片区域** | 采样点(50,180)红色 ✅ |
| | 28c | **橡皮** — 擦除(50,20)→(80,50)重叠28a区域 | 擦除后透明度降低 ✅ |
| | 28d | **矩形** — (5,5)→(400,140)**框住文字区域** | 内部像素蓝色 ✅ |
| | 28e | **椭圆** — (10,150)→(250,300)**叠加在图片上** | 椭圆绘制正确 |
| | 28f | **直线** — (5,300)→(300,350)**穿过清单区域** | 直线绘制正确 |
| | 28g | **圆角矩形** — (5,350)→(250,400)**覆盖时间戳区域** | 圆角矩形绘制正确 |
| | 28h | **颜料桶** — floodFill 矩形内部(200,70) | 填充后白色 ✅ |
| | 28i | **取色器** — pickColor(100,250) #123456 | 颜色值匹配 ✅ |
| | 28j | **矩形选区** — normalRect(0,0,420,400)覆盖全部 | bounds正确 ✅ |
| | 28k | **套索选区** — 6点不规则多边形 | mask+bounds创建 ✅ |
| | 28l | **魔棒选区** — createMaskFromBounds | mask创建 ✅ |
| | 28m | **选区删除** — deleteSelection 清除选区内容 | 像素变透明 ✅ |
| | 28n | **文本工具** — fillText('标注文字',30,180)**在图片上方** | 文字像素非透明 ✅ |
| | 28o | **缩放** — applyZoom(1.5)→applyZoom(1.0) | scale(1.5)→scale(1.0) ✅ |
| | 29 | undoSnapshot ×4 | 撤销成功 |
| | 30 | redoSyncShot ×2 | 重做成功 |
| | 31 | toggleDrawingMode(false) | contentEditable='true' |
| | 31a | **对比文本层快照** | 文字/图片/标记均未损坏 ✅ |
| **阶段5: 持久化** | 32 | saveDrawCanvasData + encodeNoteContent + 保存 | 内容含 ---DRAWING--- 和 ---TEXT--- |
| | 33 | hideEditor + 清空状态 | editorDiv=null, drawCanvas=null, selectedImage=null |
| | 34 | 重新打开 → decodeNoteContent → showEditor → innerHTML赋值 | 内容恢复 |
| | 35 | 验证内容完整性 | 文本/图片/标记/绘图数据均在 |
| **阶段6: 撤销** | 36-37 | 添加span → 移除 → 验证旧内容保留 | undo后旧内容未丢失 |
| **阶段7: 管理** | 38 | renameNote('集成测试笔记') | 标题更新 |
| | 39 | duplicateNote | 副本创建 |
| | 40 | moveToTrash | 进入回收站 |
| | 41 | restoreFromTrash + deletePermanent | 恢复后永久删除 |

### 4.2 `drawing-shapes-workflow.test.mjs` — 全形状工具切换 ★

**1 条测试**，顺序使用全部 18 个绘图工具/操作，验证工具切换的状态完整性。

| 步骤 | 工具 | 操作 | 验证点 |
|------|------|------|--------|
| 1 | — | toggleDrawingMode(true) | drawingActive=true, contentEditable='false', drawing-active类 |
| 2 | pencil | 绘制路径 | currentTool='pencil', isDrawing=false, previewSnapshot=null, 像素非透明 |
| 3 | brush | brushSize=12, 红色绘制 | currentTool='brush', 红色像素 ✅ |
| 4 | eraser | eraserSize=20, 擦除铅笔路径 | currentTool='eraser', 透明度降低 ✅ |
| 5 | shape-rect | (30,300)→(200,400) 蓝色填充 | currentTool='shape-rect', previewSnapshot机制正常 |
| 6 | shape-ellipse | (250,300)→(450,420) 绿色填充 | currentTool='shape-ellipse' |
| 7 | shape-line | (500,50)→(700,150) 粉色 | currentTool='shape-line' |
| 8 | shape-roundrect | (500,300)→(700,450) 黄色填充 | currentTool='shape-roundrect', radius=12 |
| 9 | fill | floodFill 矩形内部 白色 | currentTool='fill', fill后像素白色 ✅ |
| 10 | picker | 取黄色圆角矩形颜色 | 返回 #ffff00 ✅, primaryColor更新 |
| 11 | select-rect | 选区覆盖 rect+ellipse 区域 | bounds正确 ✅ |
| 12 | select-lasso | 7点套索多边形 | mask+bounds创建 ✅ |
| 13 | select-wand | createMaskFromBounds | mask创建 ✅ |
| 14 | — | deleteSelection | 像素变透明 ✅ |
| 15 | text | fillText('测试文字',100,500) | 文字像素非透明 ✅ |
| 16 | — | applyZoom(2.0)→applyZoom(1.0) | scale(2)→scale(1) |
| 17 | — | clearRect 清除画布 | 像素全透明 ✅ |
| 18 | — | toggleDrawingMode(false) | drawingActive=false, contentEditable='true', isDrawing=false |

| 工具切换验证 | 每次切换后验证 |
|-------------|---------------|
| `ND.currentTool` | 正确更新为目标工具 |
| `ND.isDrawing` | 重置为 false（防止拖拽状态泄漏） |
| `ND.previewSnapshot` | 清空为 null（防止形状预览残留） |

### 4.3 `serialization.test.mjs` — 内容编解码往返

| 编号 | 场景 | 操作 | 预期 |
|------|------|------|------|
| INT-SER-01 | 纯文本往返 | encode→decode 纯文本 | text精确匹配, drawing=null |
| INT-SER-02 | 仅绘图往返 | encode→decode 仅绘图数据 | drawing精确匹配, text='' |
| INT-SER-03 | 混合内容往返 | encode→decode 文本+绘图 | 两者均精确匹配 |
| INT-SER-04 | 富文本HTML往返 | encode→decode bold/italic/u/font | HTML结构完全保留 |
| INT-SER-05 | 含图片文本往返 | encode→decode `<img>` | img标签和属性保留 |
| INT-SER-06 | 旧格式兼容 | decode 无分隔符的纯文本 | drawing=null, text=原文 |
| INT-SER-07 | 分隔符字面量 | 文本含 `---DRAWING---` | 不影响drawing解析 |
| INT-SER-08 | 空绘图数据 | encode '' drawing | decode后为null |
| INT-SER-09 | 裁剪元数据 | 验证dataset序列化 | ⚠️ jsdom序列化dataset，真实浏览器不会 |

### 4.4 `image-lifecycle.test.mjs` — 图片完整生命周期

| 编号 | 场景 | 操作 | 验证点 |
|------|------|------|--------|
| INT-IMG-01 | 完整生命周期 | insert→select→resize→deselect→re-select | 8手柄创建/恢复, 尺寸保留 |
| INT-IMG-02 | ★ 缩放不可撤销 | 直接img.style赋值后验证 | 绕过execCommand, 不可撤销 |
| INT-IMG-03 | ★ 无输入守卫 | selectImage后检查contentEditable | 仍为'true' |
| INT-IMG-04 | ★ 裁剪元数据保存加载 | crop→save→load→check dataset | jsdom保留dataset（真实浏览器不保留） |
| INT-IMG-05 | 同会话恢复 | restoreOriginalImage | src恢复, dataset清除 |
| INT-IMG-06 | 8手柄方位 | createResizeHandles | nw/n/ne/w/e/sw/s/se全部存在 |
| INT-IMG-07 | 宽高比锁定联动 | 改宽度 → 高度自动 | 按锁定比例更新 |
| INT-IMG-08 | 取消选中清理裁剪 | crop状态下deselect | cropOverlay关闭, cropState=null |

### 4.5 `marker-richtext.test.mjs` — 标记+富文本共存

| 编号 | 场景 | 操作 | 验证点 |
|------|------|------|--------|
| INT-MRK-01 | 清单+bold+勾选 | toggleLineStrikethrough | .checklist-checked包裹`<b>`内容 |
| INT-MRK-02 | 清单+italic+勾选 | toggleLineStrikethrough | .checklist-checked包裹`<i>`内容 |
| INT-MRK-03 | 清单+colored+勾选 | toggleLineStrikethrough | .checklist-checked包裹`<span style>` |
| INT-MRK-04 | 勾选取消 | toggle→un-toggle | wrapper移除 |
| INT-MRK-05 | 文本内容保持 | toggle后检查文本 | 文本不变 |
| INT-MRK-06 | 时间戳格式 | createTimestampElement | 格式 `YYYY-MM-DD HH:mm` |
| INT-MRK-07 | ★ 深度嵌套兄弟检测 | 光标在`<i>`内 → getCurrentLineMarker | 仍找到.check-box |
| INT-MRK-08 | 单标记约束 | 清单行点时间戳 | 检测到checklist类型 |
| INT-MRK-09 | ★ block img在删除线 | toggleLineStrikethrough含img | 可被inline span包裹 |

### 4.6 `drawing-mode.test.mjs` — 绘图模式状态机

| 编号 | 场景 | 操作 | 验证点 |
|------|------|------|--------|
| INT-DRW-01 | 进入绘图模式 | toggleDrawingMode(true) | drawingActive=true, contentEditable='false', drawing-active类 |
| INT-DRW-02 | 退出绘图模式 | toggle→true→false | 全部恢复 |
| INT-DRW-03 | 阻止文本编辑 | 绘图模式中检查 | contentEditable='false' |
| INT-DRW-04 | ★ 撤销隔离 | 绘图undo不影响文本 | 文本内容不变 |
| INT-DRW-05 | 快照上限 | push 55次 | length≤50 |
| INT-DRW-06 | ★ resize中笔划 | isDrawing=true时resize | isDrawing保持true |
| INT-DRW-07 | 缩放 | applyZoom(2.0)→(1.0) | scale正确 |
| INT-DRW-08 | 清除画布 | clearRect | 像素全透明 |
| INT-DRW-09 | 工具切换重置 | selectTool('brush') | isDrawing=false, previewSnapshot=null |

### 4.7 `mixed-content-save-load.test.mjs` — 混合内容持久化

| 编号 | 场景 | 操作 | 验证点 |
|------|------|------|--------|
| INT-MIX-01 | 文本+图片 | save→load | bold+img均恢复 |
| INT-MIX-02 | 文本+清单 | save→load | check-box+checked状态恢复 |
| INT-MIX-03 | 文本+图片+绘图 | save→load | 三种内容类型均恢复 |
| INT-MIX-04 | 全内容类型 | save→load全部 | bold+italic+img+checkbox+timestamp |
| INT-MIX-05 | 旧格式导入 | decode无分隔符 | drawing=null, text=原文 |

### 4.8 `undo-redo-cross-content.test.mjs` — 跨内容撤销

| 编号 | 场景 | 操作 | 验证点 |
|------|------|------|--------|
| INT-UNDO-01 | 文本序列撤销 | bold→undo | 恢复原文本 |
| INT-UNDO-02 | 图片插入撤销 | insertHTML img→undo | img被移除 |
| INT-UNDO-03 | ★ 缩放不可撤销 | img.style直接赋值后 | 不在undo栈中 |
| INT-UNDO-04 | 格式后撤销 | bold→undo | `<b>`标签移除 |
| INT-UNDO-05 | ★ 勾选不可撤销 | classList.toggle后 | 不在undo栈中 |

### 4.9 `format-painter.test.mjs` — 格式刷

| 编号 | 场景 | 操作 | 验证点 |
|------|------|------|--------|
| INT-FP-01 | 基本工作流 | activate→deactivate | active状态切换, savedFormat管理 |
| INT-FP-02 | 保存bold格式 | 选中`<b>`→activate | savedFormat.bold=true |
| INT-FP-03 | 仅应用非默认值 | 选中`<i>`→activate | italic=true, bold=false |
| INT-FP-04 | ★ 点击图片 | 格式刷激活中选图片 | 停用后无异常包裹 |
| INT-FP-05 | 停用清理 | deactivate | savedFormat=null, active类移除 |

### 4.10 `cross-tab-workflow.test.mjs` — 标签切换

| 编号 | 场景 | 操作 | 验证点 |
|------|------|------|--------|
| INT-TAB-01 | File→Style→File | switchToolbarTab | contentEditable始终'true' |
| INT-TAB-02 | Draw禁用 | toggleDrawingMode(true) | contentEditable='false' |
| INT-TAB-03 | Draw恢复 | toggleDrawingMode(false) | contentEditable='true' |
| INT-TAB-04 | 面板互斥 | 切换file→style | 仅当前面板显示 |
| INT-TAB-05 | ★ 非Draw退出 | drawingPreviousTab='style' | drawingActive=false |
| INT-TAB-06 | ★ pointer-events | 进入/退出drawing | drawing-active类正确切换 |
| INT-TAB-07 | image-edit标签 | switchToolbarTab('image-edit') | 标签存在可切换 |

### 4.11 `state-cleanup.test.mjs` — 状态清理

| 编号 | 场景 | 操作 | 验证点 |
|------|------|------|--------|
| INT-CLN-01 | 关闭清理核心 | hideEditor+清空状态 | editorDiv=null, drawCanvas=null, currentNote=null |
| INT-CLN-02 | 关闭清理图片 | selectImage→hideEditor | selectedImage=null, resizeHandles=[] |
| INT-CLN-03 | 关闭清理绘图 | toggleDrawing→hideEditor | drawCanvas=null, drawCtx=null |
| INT-CLN-04 | 欢迎界面 | hideEditor | 显示"选择或新建一篇笔记开始编辑" |
| INT-CLN-05 | 取消选中清理 | select→deselect | handles清空, container清空 |

---

## 5. 与13个脆弱交互点的对照

代码探索阶段识别了13个模块间脆弱点，每个脆弱点都有对应的集成测试覆盖：

| # | 脆弱点 | 源码位置 | 覆盖测试 | 发现 |
|---|--------|----------|----------|------|
| #1 | 图片 resize/crop/restore 直接操作DOM，不走execCommand，不可撤销 | image-resize.js:180-181,451-453,479-483 | INT-IMG-02, INT-UNDO-03 | ✅ 确认存在 |
| #2 | 裁剪 metadata (dataset.originalSrc/dataset.crop) 不序列化到 innerHTML | image-resize.js:448-449, editor-core.js:45,87 | INT-SER-09, INT-IMG-04 | ⚠️ jsdom序列化dataset，需E2E验证 |
| #3 | 图片选中时 contenteditable 仍活跃，无输入守卫 | image-resize.js:22 | INT-IMG-03 | ✅ 确认存在 |
| #4 | 绘图canvas pointer-events:auto 完全阻止图片交互 | drawing-ui.js:47,57 | INT-TAB-06 | ✅ 确认：drawing-active类正确切换 |
| #5 | getCurrentLineMarker 兄弟节点遍历对复杂HTML脆弱 | editor-events.js:86-143 | INT-MRK-07 | ✅ 通过：深度嵌套仍正确检测 |
| #6 | toggleLineStrikethrough 可能包裹 display:block 的 img | editor-markers.js:33-36 | INT-MRK-09 | ⚠️ 检测到包裹行为 |
| #7 | 绘图快照撤销与文本浏览器撤销完全隔离 | init.js:31-39, drawing-tools.js:332-370 | INT-DRW-04 | ✅ 确认隔离 |
| #8 | Canvas resize 在笔划进行中导致像素丢失 | editor-core.js:initDrawCanvas | INT-DRW-06 | ✅ 状态保持 |
| #10 | 文本工具使用阻塞式 prompt() | drawing-ui.js:181 | full-workflow 28n | ✅ 文本绘制正常 |
| #11 | 工具切换时橡皮context状态/previewSnapshot残留 | drawing-ui.js:305-312,251 | INT-DRW-09, shapes-workflow | ✅ 通过：selectTool正确重置 |
| #12 | 图片选中时 updateStyleToolbar 中 queryCommandState 返回异常值 | style-toolbar.js:73-108 | INT-TAB-05 | ✅ mock环境正常 |
| #13 | 格式刷激活时点击图片触发 applyFormatPainter 产生异常包裹 | init.js:72 | INT-FP-04 | ✅ 通过：停用后无异常包裹 |

---

## 6. 技术决策记录

### 6.1 为什么使用函数内联复制而非 require 源码

源码文件在 parse-time 就执行 `document.getElementById()` 等 DOM 操作。如果在 jsdom 中 `require()` 这些文件，由于 DOM 元素在模块加载时可能尚未创建，会导致 `null` 引用错误。现有单元测试（file-store、utils、image-resize、drawing-tools）都使用相同的策略。

### 6.2 为什么集成测试使用 jsdom 而非 Playwright

| 因素 | jsdom | Playwright E2E |
|------|-------|---------------|
| 运行速度 | 快（无窗口启动） | 慢（需启动Electron） |
| 环境依赖 | 无 | 需要桌面环境 |
| Electron兼容 | 无版本兼容问题 | Electron 33 + Playwright 1.61 有已知兼容性问题 |
| Canvas支持 | 需 node-canvas | 真实Canvas |
| execCommand | 需mock | 浏览器原生支持 |

### 6.3 jsdom 的已知限制

- **dataset 序列化**：jsdom 会将 `dataset` 属性序列化到 `innerHTML`（真实浏览器不会）。这导致脆弱点 #2（裁剪元数据丢失）无法在 jsdom 中完整验证，需要 E2E 测试补充。
- **activeElement**：jsdom 的 `focus()` 不会设置 `document.activeElement`。已通过 `_activeEditable` 模块变量绕过。
- **Canvas 像素操作**：jsdom 的 Canvas 不支持 `getImageData`/`putImageData`。绘图相关测试使用 node-canvas 替代。

---

## 7. 维护指南

### 7.1 添加新的集成测试

1. 在 `test/integration/` 下创建 `xxx.test.mjs`
2. 从 `./helpers.mjs` 导入所需函数和环境工厂
3. 使用 `beforeEach` + `createTestEnvironment()` 获取干净环境
4. 遵循 `INT-XXX-NN` 编号规范
5. 测试描述格式：`编号: 场景描述 → 预期结果`

### 7.2 在 helpers.mjs 中添加新函数

当新功能需要集成测试时，将其核心逻辑复制为 helpers.mjs 中的纯函数：

```javascript
// 原则：函数不依赖全局 DOM，通过参数接收 doc/ND
export function newFeatureFunction(doc, ND, ...args) {
  // 复制源码逻辑...
}
```

### 7.3 已知待改进项

- **#2 裁剪元数据**：需在 E2E 测试中验证（jsdom 无法模拟真实浏览器的 dataset 序列化行为）
- **execCommand mock 保真度**：当前 mock 覆盖了 14 个命令，但 `surroundContents` 对跨块级元素的选区会抛异常（与真实浏览器行为一致，但真实浏览器有更复杂的处理）
