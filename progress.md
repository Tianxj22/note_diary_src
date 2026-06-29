# 开发进度记录 / Development Progress

## 恢复点 / Restart Marker

> **Startup Workflow**: 新会话从此处开始。Read this section to resume work.

- **Current Objective / 当前活跃功能**: M3 体验版进行中 (4/7 完成)；本次会话集中完成编辑体验增强
- **Current State**: M1/M2/M2-ext 完成 (100%), M3 进行中 (4/7 完成), M4 未开始 (0%), M5 完成 (100%)
- **Blockers / 阻塞项**: 无
- **Recommended Next Step / 下一步操作**:
  1. M3: F-020 日记日历视图 / F-021 全文搜索 / F-022 标签系统
  2. M4: F-030 导出 PDF/Markdown / F-031 主题切换 / F-032 自动保存增强
- **Files Modified / 最近修改文件**: `keybindings-store.js`, `js/init.js`, `js/settings-ui.js`, `index.html`, `css/settings.css`
- **Last Updated / 最后更新**: 2026-06-29

---

## 进度总览 / Progress Overview

```
M1: Hello World     ████████████████████ 100%
M2: 基础编辑         ████████████████████ 100%
M3: 体验版           ██████████████░░░░░░  57%  (4/7)
M4: 正式版           ░░░░░░░░░░░░░░░░░░░░   0%
M5: 云端同步         ████████████████████ 100%
```

| 里程碑 | 目标日期 | 状态 |
|---|---|---|
| M1: Hello World | 2024-06-24 | ✅ 已完成 |
| M2: 基础编辑 | 2024-06-24 | ✅ 已完成 |
| M3: 体验版 | TBD | 🔄 进行中 (4/7) |
| M4: 正式版 | TBD | ⚪ 未开始 |
| M5: 云端同步 | 2026-06-29 | ✅ 已完成 |

---

## 会话记录

### 2024-06-24 — 项目初始化 & Hello World

**目标**: 搭建 Electron Hello World 程序，建立开发文档体系。

**完成内容**:

1. ✅ `package.json` — 项目配置，Electron 33.x 依赖
2. ✅ `main.js` — 主进程，BrowserWindow 800x600，安全配置
3. ✅ `preload.js` — contextBridge 暴露版本信息 API
4. ✅ `index.html` — Hello World 页面，渐变背景，版本展示
5. ✅ `CLAUDE.md` — 项目指令文档
6. ✅ `docs/architecture.md` — 系统框架设计
7. ✅ `docs/feature_list.md` — 功能清单
8. ✅ `progress.md` — 本文件
9. ✅ `docs/test_feedback.md` — 测试反馈记录

**技术决策**:
- 采用 contextIsolation + preload 安全模型
- CSP 限制资源加载来源
- 不使用 TypeScript（保持初始阶段简洁）

**下一步**: 实现笔记编辑器基础功能 (F-010)

---

### 2024-06-24 — 笔记编辑器 DEMO 实现

**目标**: 实现笔记软件核心功能：侧边栏列表 + 文本编辑区 + 撤销/重做 + 自动保存。

**完成内容**:

1. ✅ `file-store.js` — 新建笔记存储模块
2. ✅ `main.js` — 窗口增大至 960×680，注册 4 个 IPC handler
3. ✅ `preload.js` — 暴露 createNote / listNotes / readNote / saveNote 四个 API
4. ✅ `index.html` — 完全重写为编辑器界面（侧边栏+工具栏+编辑区+状态栏）

**技术决策**:
- 文件存储使用 `app.getPath('userData')/notes/`，每篇笔记一个 .txt
- 撤销/重做在渲染进程维护快照栈，无需主进程介入
- 自动保存用 500ms 防抖，避免频繁写盘

**下一步**: 导入外部 .txt 文件、富文本编辑 (F-020)

---

### 2024-06-24 — 自动化测试体系建设

**目标**: 建立完整的自动化测试框架，覆盖所有已上线功能。

**完成内容**:

1. ✅ 安装 vitest + @playwright/test 依赖
2. ✅ `test/vitest.config.mjs` — 测试运行器配置
3. ✅ `test/unit/file-store.test.mjs` — file-store.js 单元测试，18 条用例全通过
4. ✅ `test/e2e/editor.test.mjs` — 编辑器 UI E2E 测试
5. ✅ `test/README.md` — 测试使用说明 + TDD 工作流文档
6. ✅ package.json 新增 test / test:unit / test:e2e / test:watch 命令

**技术决策**:
- 单元测试用 Vitest 纯 Node.js 跑，无需 Electron
- E2E 测试用 Playwright `electron.launch()` 驱动真实窗口
- 测试文件用 .mjs 扩展名（ESM），项目主体保持 CJS
- 采用 TDD 工作流：新需求 → 设计测试用例 → 用户确认 → 实现 → 跑测试

**测试结果**: 18/18 单元测试通过

**下一步**: 继续功能迭代，遵循 TDD 工作流

---

### 2024-06-24 — 笔记管理功能增强

**目标**: 实现笔记重命名、删除、复制、剪切及右键菜单。

**完成内容**:

1. ✅ 笔记右键上下文菜单
2. ✅ 重命名功能（内联编辑或对话框）
3. ✅ 删除笔记（含确认）
4. ✅ 复制/剪切笔记

**下一步**: 进入 M3 里程碑，实现日记日历视图 (F-020)

---

### 2026-06-24 — 侧边栏空白区域右键菜单 + 新建笔记栈式序号命名

**目标**: 侧边栏空白区域右键弹出菜单（新建/导入）+ 新建笔记默认名"新建笔记本"带栈式序号管理。

**完成内容**:

1. ✅ `file-store.js` — 新增 `getNextDefaultName` / `releaseNameNumber` 函数，持久化命名栈到 `.name-stack.json`
2. ✅ `main.js` — 注册 `note:next-default-name` / `note:release-name-number` IPC handler
3. ✅ `preload.js` — 暴露 `getNextDefaultName` / `releaseNameNumber` API
4. ✅ `index.html` — 空白区域右键菜单（新建笔记 + 导入笔记），新建笔记默认命名使用栈式序号机制，删除时自动归还序号
5. ✅ `test/unit/file-store.test.mjs` — 新增 7 条命名栈单元测试 (U-20 ~ U-26)

**技术决策**:
- 命名栈状态持久化到 `notesDir/.name-stack.json`，记录 `availableStack` 和 `maxNumber`
- 只在标题输入为空时消耗栈序号（自定义标题不消耗）
- 删除"新建笔记本*"格式笔记时自动归还序号到栈
- 导入功能使用隐藏 `<input type="file">` + FileReader API

**测试结果**: 49/49 全部通过

**下一步**: 进入 M3 里程碑，实现日记日历视图 (F-020)

---

### 2026-06-24 — 修复新建笔记命名：始终使用栈式默认命名

**问题**: 选中已有笔记后新建 → 新笔记与选中笔记同名；新建一次后 titleInput 被填入标题 → 后续新建全部复用该标题，栈机制完全被绕过。

**根因**: `createNewNote()` 优先取 `titleInput.value`，但 `selectNote()` 会将其设为当前笔记标题。

**修复**: `createNewNote()` 始终调用 `getNextDefaultName()` 获取栈式命名，不再读取 `titleInput`。

---

### 2026-06-24 — 修复删除/复制/剪切后侧边栏未刷新

**问题**: 删除/复制/剪切笔记后，`loadNoteList()` 刷新了数据但未调 `renderNoteList()`，侧边栏 DOM 残留已删除条目的"幽灵"，点击后底层文件不存在，导致编辑和重命名全部静默失败。

**修复**: `handleDelete` / `handleDuplicate` / `handleCut` 中 `loadNoteList()` 后补上 `renderNoteList()`。

---

### 2026-06-24 — 修复删除后无法编辑的竞态条件 + 命名栈排序优化

**问题**: 删除笔记后无法编辑任何文档。根因是 `handleDelete()` 中的竞态条件——`await deleteNote()` 异步期间，`autoSave` 的 500ms 定时器可能触发，`saveCurrentNote()` 通过 `fs.writeFileSync` 在原路径重建已删除的文件（"僵尸笔记"）。

**修复**:
- `handleDelete()` / `handleCut()`: 在 async IPC 调用前立即清空 `currentNote` 和 `saveTimer`，阻止 autoSave 复活文件；IPC 失败时恢复 `currentNote`
- `file-store.js` `releaseNameNumber()`: push 后降序排序，使 pop 返回最小可用序号
- 新增 `test/e2e/delete-edit.test.mjs` — 5 条 E2E 测试覆盖全部删除后编辑场景 (DE-01~DE-05)
- 更新 U-23，新增 U-23a/b/c 排序单元测试

**测试结果**: 57/57 全部通过 (39 单元 + 18 E2E)

---

### 2026-06-24 — 修复删除当前笔记后无法编辑的问题

**问题**: 删除当前选中的笔记后，所有内容处于无法编辑的状态。

**根因**: 两个竞态窗口——

1. `selectNote` 中 `currentNote = note` 到 `showEditor()` 之间存在 `await readNote()` 异步间隙。若 autoSave 在此期间触发，`saveCurrentNote()` 中 `content = textarea ? textarea.value : ''` 因 textarea 为 null 而得到空字符串，覆盖目标笔记内容。

2. `handleDelete` 清空 `currentNote` 后，旧的 textarea 尚未被 `hideEditor` 销毁。若 autoSave 恰在此时触发，`pushUndo(lastSavedContent)` 和 `loadNoteList/renderNoteList` 可能扰乱状态。

**修复**:
- `saveCurrentNote`: 新增 `!textarea` 守卫，textarea 为 null 时直接返回不保存
- `selectNote`: 在 async 间隙前清空 `currentNote` 并清除 `saveTimer`，防止 autoSave 在过渡期误操作；直接保存前一个笔记而非依赖全局状态；新增 `textarea.focus()` 确保编辑区可用
- E2E: 新增 DE-01a（键盘输入验证）和 DE-06（selectNote 竞态窗口专项测试）

**测试结果**: 59/59 全部通过 (39 单元 + 20 E2E)

---

### 2026-06-24 — 添加"关闭当前笔记"按钮，重构删除逻辑

**策略**: 用户反馈竞态修复仍未完全解决问题。采用更根本的方案——添加显式的"关闭当前笔记"操作，将"保存+清空状态"原子化，删除/剪切当前笔记时先关闭再操作文件。

**完成内容**:
- 编辑区右上角新增 × 关闭按钮，点击后保存内容并回到欢迎界面
- 新增 `closeCurrentNote()` 函数：保存内容 → 清空 timer → 清空 currentNote/textarea → hideEditor
- `handleDelete`/`handleCut` 重构：删除/剪切当前笔记时先 `await closeCurrentNote()` 再操作文件，彻底消除竞态窗口
- 新增 DE-07（关闭按钮→欢迎界面）、DE-08（关闭后再打开内容保留）、DE-09（关闭后删除笔记正常）

**测试结果**: 62/62 全部通过 (39 单元 + 23 E2E)

---

### 2026-06-24 — 编辑区聚焦防御 + DOM 简化 + 精确 focus 测试

**问题**: 用户反馈删除笔记后仍有"编辑区无光标、键盘无响应"问题。E2E 测试使用 `fill()` 不依赖焦点，漏检了焦点丢失问题。

**定位**: 新增 DE-10~DE-12 精确测试——模拟真实用户 `click` 聚焦 + `keyboard.type` 输入 + 检查 `document.activeElement`。Playwright 中全部通过，说明代码逻辑正确但可能存在渲染/焦点时序问题。

**防御性修复**:
- 移除 `.editor-wrapper` 中间层，关闭按钮和 textarea 直接放在 `.editor-area` 下，消除潜在布局干扰
- 给 `.editor-area` 添加 `position: relative`，确保关闭按钮定位正确
- 全局绑定 `editorArea` 的 click 事件：点击编辑区任意位置（关闭按钮除外）自动聚焦 textarea
- 关闭按钮加 `e.stopPropagation()` 防止触发聚焦

**测试结果**: 65/65 全部通过 (39 单元 + 26 E2E)

---

### 2026-06-24 — 删除/剪切当前笔记后自动恢复编辑状态

**问题**: 用户指出 `closeCurrentNote()` 调用 `hideEditor()` 把编辑框从页面中移除了，删除后用户无法继续输入。不能保留原编辑框，因为它的文件路径仍指向已删除文件。

**修复**: `handleDelete`/`handleCut` 中删除/剪切成功后：
- 有剩余笔记 → 自动 `selectNote(notes[0])` 打开第一篇
- 无剩余笔记 → 自动 `createNewNote()` 新建空白笔记
确保删除后编辑区始终可用。

**测试调整**: DE-01/DE-04/DE-12 适配新行为——删除后不再出现 `.no-note`，编辑区立即可用。

---

### 2026-06-24 — 工具栏重构 + 移除删除确认弹窗 + 弹窗使用规范

**目标**: 工具栏重构为双层分类标签布局；去掉删除笔记时的原生确认弹窗；编写弹窗使用规范文档。

**完成内容**:

1. ✅ `e5d0fb3` — 提取手动保存按钮，注释自动保存逻辑（为后续重构做准备）
2. ✅ `1f808f1` — 工具栏重构为双层分类标签布局（文件/插入/图片编辑三标签）
3. ✅ `4705510` — 去掉删除笔记时的原生 `confirm()` 弹窗，改用静默删除
4. ✅ `664883f` — 新增弹窗使用规范（`docs/coding_conventions.md` §6），禁止引入原生弹窗

**技术决策**:
- 临时注释自动保存逻辑，降低竞态调试成本，后续 M4 重新设计
- 静默删除 + 状态栏提示替代原生确认弹窗，符合规范要求

**下一步**: 富文本编辑器重构

---

### 2026-06-25 — 富文本编辑器重构 + 样式工具栏 + 格式刷

**目标**: 将 textarea 编辑器重构为 contenteditable 富文本编辑器，实现样式工具栏和格式刷。

**完成内容**:

1. ✅ `b2f2b50` — contenteditable 替代 textarea 作为编辑器
2. ✅ 样式工具栏：加粗/斜体/下划线/删除线/标题/字体/字号/对齐/文字颜色/背景高亮
3. ✅ 格式刷：复制选区格式 → 应用到新选区
4. ✅ 工具栏状态自动同步（`selectionchange` 事件）
5. ✅ 新增 `js/style-toolbar.js`（样式执行 + 工具栏同步 + 格式刷）

**技术决策**:
- 使用 `document.execCommand()` 实现富文本操作（兼容性最广）
- 格式刷状态存储在 `ND.formatPainter` 对象中
- 撤销/重做改用 `MutationObserver` + 快照机制配合 contenteditable

**下一步**: 系统托盘 + 全局快捷键

---

### 2026-06-25 — 系统托盘 + 全局快捷键唤起

**目标**: 添加系统托盘图标，支持最小化到托盘，Ctrl+Shift+N 全局快捷键唤起窗口。

**完成内容**:

1. ✅ `4ea105d` — `main.js` 新增 `createTray()` / `createTrayIcon()` / `toggleWindow()`
2. ✅ 系统托盘图标 + 右键菜单（显示/退出）
3. ✅ `Ctrl+Shift+N` 全局快捷键注册（`globalShortcut.register`）
4. ✅ 关闭窗口时隐藏到托盘而非退出（macOS 除外）

**技术决策**:
- 托盘图标使用 `nativeImage.createFromDataURL()` 生成 16x16 纯色图标
- E2E 测试环境通过 `isE2E` 标志跳过托盘创建，避免干扰测试

**下一步**: 侧边栏排序 + 回收站分栏

---

### 2026-06-25 — 侧边栏排序 + 工作区/回收站分栏

**目标**: 侧边栏新增排序控件（按名称/时间 + 升序/降序）；新增工作区/回收站双视图切换。

**完成内容**:

1. ✅ `314aa4d` — 排序下拉（名称/修改时间/创建时间）+ 方向切换按钮
2. ✅ 工作区/回收站视图标签页切换
3. ✅ `file-store.js` 新增 `moveToTrash` / `listTrash` / `restoreFromTrash` / `permanentlyDelete` / `emptyTrash`
4. ✅ `main.js` 注册 `trash:list` / `trash:restore` / `trash:delete-permanent` / `trash:empty` IPC handler
5. ✅ 新增 `js/view-switching.js`（视图切换 + 排序控件 + 工具栏标签页）

**技术决策**:
- 回收站使用 `.trash/` 子目录 + `.trash-meta.json` 记录原始路径
- 排序状态存储在 `ND.sortBy` / `ND.sortDir` 中

**测试结果**: 65/65 全部通过 (39 单元 + 26 E2E)

**下一步**: 插入标签页（清单 + 时间戳）

---

### 2026-06-25 — 测试覆盖规范 + 测试命令重组

**目标**: 编写测试覆盖规范文档，重组测试命令提升开发体验。

**完成内容**:

1. ✅ `dda2405` — `docs/coding_conventions.md` 新增「测试覆盖规范」节
2. ✅ `package.json` 新增 `test:all` / `test:watch` 命令
3. ✅ `test/README.md` 更新测试使用说明

**下一步**: 插入标签页功能

---

### 2026-06-25 — 插入标签页：清单复选框 + 日志时间戳

**目标**: 新增「插入」标签页，支持插入清单复选框 `- [ ]` 和日志时间戳标记。

**完成内容**:

1. ✅ `cb8f4ed` — 新增「插入」标签页，含清单按钮和日志时间戳按钮
2. ✅ 新增 `js/editor-markers.js`（清单/时间戳标记创建与切换）
3. ✅ `5d050d6` — Enter 继承清单/日志行标记格式，Backspace 删除空的标记元素
4. ✅ 按钮纯图标标准化（所有工具栏按钮移除文字标签，使用 `data-tooltip`）

**技术决策**:
- 清单使用 `contenteditable` 内的 `<span class="checklist-marker">` + 可点击切换
- 时间戳使用 `<span class="timestamp-marker">` 显示格式 `HH:mm:ss`
- 标记检测在 `editor-events.js` 的 `onEditorKeydown` 中处理

**下一步**: 图片编辑标签页

---

### 2026-06-25 — 图片编辑标签页 + 裁剪矩形手柄 + 非破坏性裁剪

**目标**: 新增「图片编辑」标签页，支持图片缩放手柄、矩形裁剪和恢复原图。

**完成内容**:

1. ✅ `8bc10b4` — 图片编辑标签页 + 代码结构重构 + 撤销/重做联动 + 框选截图修复
2. ✅ `8869c10` — 修复裁剪按钮点击无效的问题
3. ✅ `2b952c8` — 裁剪矩形 8 个缩放手柄 + 非破坏性裁剪保存
4. ✅ 新增 `js/image-resize.js`（图片选中/手柄拖拽/裁剪遮罩/恢复原图）
5. ✅ 锁定宽高比选项
6. ✅ 宽/高输入框双向同步

**技术决策**:
- 非破坏性裁剪：原图 `src` 保存到 `dataset.originalSrc`，裁剪应用 CSS clip 或 canvas 导出
- 8 个手柄覆盖四角 + 四边中点，支持等比缩放
- 裁剪遮罩使用 canvas 绘制半透明黑色背景 + 裁剪矩形透明天窗

**下一步**: 进入 M3 里程碑，实现日记日历视图 (F-020)

---

### 2026-06-29 — 快捷键体系 + 编辑器右键菜单 (F-048)

**目标**: 完整的快捷键体系 + 编辑器右键上下文菜单。

**完成内容**:

1. ✅ 快捷键新增：`Ctrl+D`(删除线) / `Ctrl+\`(清除格式) / `Ctrl+Shift+O`(有序列表) / `Ctrl+Shift+U`(无序列表) / `Ctrl+Shift+C`(清单) / `Ctrl+Shift+T`(时间) / `Ctrl+Shift+I`(图片) / `Ctrl+Shift+D`(绘图) / `Ctrl+H`(替换) / `Ctrl+W`(关闭笔记) / `Tab/Shift+Tab`(缩进)
2. ✅ 编辑器右键菜单：撤销/重做/剪切/复制/粘贴/全选 + 查找/替换 + 清单/时间/图片 + 加粗/斜体/下划线，显示快捷键提示
3. ✅ `js/context-menus.js` — `showEditorContextMenu`/`hideEditorContextMenu`，绑定右键事件到 `ND.editorArea`
4. ✅ `index.html` — `#context-menu-editor` 菜单 DOM + `.shortcut-hint` CSS

### 2026-06-29 — 快捷键 tooltip + 首选项面板 + 动态快捷键 + 列表迁移 (F-049)

**目标**: 工具栏 tooltip 显示快捷键 + 首选项系统（keybindings.json）+ 列表按钮迁移。

**完成内容**:

1. ✅ Tooltip 更新：插入清单/日志时间/图片/删除线/清除格式/缩进 追加快捷键提示
2. ✅ `keybindings-store.js` — 读/写 `{userData}/keybindings.json`，默认24个快捷键，启动时自动生成
3. ✅ 设置弹窗新增「首选项」section：快捷键参考表（按分类展示）+ 字体大小/行高选择器
4. ✅ 动态快捷键系统：`js/init.js` 从 keybindings IPC 加载 → `parseShortcut()` → `matchShortcut()` → `shortcutActions` 分发表，移除全部硬编码
5. ✅ 首选项应用：`ND.prefFontSize`/`ND.prefLineHeight` → `showEditor` 内联样式
6. ✅ 列表按钮 `btn-ordered-list`/`btn-unordered-list` 从编辑标签页移至插入标签页

**测试结果**: 203/203

**下一步**: M3 剩余功能（F-020 日历 / F-021 搜索 / F-022 标签）或 M4

---

### 2026-06-29 — M3: 编辑标签页 (F-046)

**目标**: 在「插入」标签右侧新增「编辑」标签页，包含搜索替换 + 文本编辑增强。

**完成内容**:

1. ✅ `css/edit-toolbar.css` — 查找栏样式（暗色浮动栏 + 紧凑输入框 + 匹配计数 + 分隔符 + Aa 大小写开关）
2. ✅ `js/edit-toolbar.js` — 编辑标签页逻辑：
   - 查找栏：`openFindBar`/`closeFindBar`/`toggleFindBar`（Ctrl+F 快捷键）
   - 查找导航：`doFind(backwards)` 基于 `window.find()` + 实时 `input` 搜索
   - 替换：`replaceCurrent()` 替换当前匹配 → 自动查找下一个；`replaceAll()` TreeWalker 全局替换
   - 匹配计数：`countMatches()` TreeWalker 遍历文本节点（跳过 contenteditable=false）
   - execCommand 按钮：删除线/清除格式/有序列表/无序列表/缩进/减少缩进/全选
   - 查找状态存储在 `ND.findState`（term/caseSensitive/matchCount/visible）
   - 修复 `contentEditable` → `getAttribute('contenteditable')` 兼容 JSDOM 测试
3. ✅ `index.html` — 编辑标签按钮 ✂️（插入和绘图之间）；编辑操作面板（9 个按钮）；查找栏 HTML（输入框×2 + 导航/替换按钮 + 关闭）；CSS + JS 加载
4. ✅ `test/unit/edit-toolbar.test.mjs` — 17 条测试 (U-112~U-128): 正则转义/match计数（普通/多次/大小写/跨元素/跳过非编辑）/替换（单次/多次/大小写/跳过非编辑）

**查找栏按键**:
- `Ctrl+F` → 打开/聚焦查找栏
- `Enter` → 下一个匹配
- `Shift+Enter` → 上一个匹配
- `Escape` → 关闭查找栏

**测试结果**: 198/198 全部通过 (+17 edit-toolbar)

**下一步**: 继续 M3（日历/搜索/标签）或 M4（导出/主题/自动保存）

---

### 2026-06-29 — M5 云端同步 Phase 4: 统一冲突解决 (F-045)

**目标**: 为 Git 同步提供完整的冲突解决体验：侧边栏冲突列表 + 分栏差异预览 + 逐文件/批量解决。

**完成内容**:

1. ✅ `js/utils.js` — 新增 `diffLines()`：LCS 行级 diff 算法，返回 `{local: [{text,type}], remote: [{text,type}]}` 格式
2. ✅ `css/conflict.css` — 冲突 UI 样式：冲突列表项（含操作按钮）、批量操作栏、分栏对比面板、diff 行着色（same/added/removed/empty）
3. ✅ `js/conflict-ui.js` — 冲突解决 UI 模块：
   - `loadConflictList()` — IPC 加载冲突文件列表
   - `renderConflictList()` — 渲染冲突列表项（含本地/远程/保留双方按钮）
   - `previewConflict(fileName)` — 打开分栏 diff 预览
   - `resolveConflict(fileName, strategy)` — 逐文件解决（local/remote/both）
   - `resolveAllConflicts(strategy)` — 批量解决
   - `renderDiffPanel()` — 渲染单侧 diff 面板
4. ✅ `main.js` — 新增 3 个 IPC：`sync:git-show-local`(git show :2:file)、`sync:git-show-remote`(git show :3:file)、`sync:git-checkout-theirs`(保留双方)
5. ✅ `preload.js` — 暴露 `gitShowLocal` / `gitShowRemote` / `gitCheckoutTheirs`
6. ✅ `index.html` — 侧边栏冲突标签页 ⚠ + 徽标；冲突批量操作栏（全部保留本地/远程）；冲突预览 overlay（分栏对比 + 解决按钮）；加载 conflict.css + conflict-ui.js
7. ✅ `js/view-switching.js` — `switchView('conflicts')` 扩展：切换冲突视图 → 加载冲突列表
8. ✅ `js/state.js` — `ND.tabConflicts` / `ND.conflictBulkActions` / `ND.conflictPreviewOverlay`
9. ✅ `css/sidebar.css` — 冲突标签页高亮样式 + 批量操作栏样式
10. ✅ `test/unit/utils.test.mjs` — 6 条 diff 测试 (U-106~U-111): 相同/新增/删除/完全不同/空文本/单vs多行

**冲突解决策略**:
- **保留本地** (`git checkout --ours`): 使用本地版本覆盖
- **保留远程** (`git checkout --theirs`): 使用远程版本覆盖
- **保留双方**: 保留本地版本 + 将远程版本另存为 `文件名.remote-{timestamp}.html`

**测试结果**: 181/181 全部通过 (+6 diff)

**M5 云端同步里程碑全部完成!**

---

### 2026-06-29 — 清理：移除云盘方案 + Bug 修复

**目标**: 精简云同步方案，只保留 Git 仓库方案；修复 Token 持久化显示问题。

**完成内容**:

1. ✅ 移除云盘相关 UI：删除设置弹窗中的同步模式切换 radio、云盘配置组、浏览文件夹按钮
2. ✅ `js/settings-ui.js` — 移除 `updateSyncModeUI` / `selectCloudFolder` / sync-mode 事件绑定；`collectFormData` 固定 `mode: 'git'`
3. ✅ `index.html` — 精简设置弹窗为纯 Git 配置
4. ✅ 修复 Token 持久化：`populateSettingsForm` 改为检查 `_tokenMasked`（而非已被 IPC 删除的 `tokenEncrypted`）
5. ✅ 计划文件更新：移除 Phase 4a/4b（云盘），Phase 5 → Phase 4
6. ✅ `feature_list.json` — 移除 F-043/F-044，新增 F-045

**技术决策**:
- 同步方案最终确定为纯 Git 仓库方案（GitHub/GitLab/自托管）
- 云盘文件夹同步和 API 直连方案从计划中移除
- M5 剩余工作精简为 1 个 Phase：F-045 统一冲突解决

**下一步**: 进入 Phase 4 (F-045 统一冲突解决)

---

### 2026-06-29 — M5 云端同步 Phase 3: Git 云端同步 (F-042)

**目标**: 笔记目录变成 Git 仓库，支持 GitHub/GitLab/任意 Git 远程的 pull/push/commit。

**完成内容**:

1. ✅ `npm install --save simple-git` — 首个生产依赖（周下载 300 万+，VS Code 同款）
2. ✅ `git-sync.js` — Git 操作模块：`initRepo` / `setRemote` / `configureUser` / `getStatus` / `commit` / `pull` / `push` / `hasConflicts` / `resolveConflict` / `getHistory` / `fullSync` / `getSyncState` / `updateSyncState` / `buildAuthUrl`
3. ✅ `js/sync-ui.js` — 同步工具栏标签页 UI（pull/push/commit 按钮 + 状态刷新 + 冲突提示）
4. ✅ `main.js` — 注册 8 个 `sync:git-*` IPC handler；`getGitToken()` 获取 Token 明文；启动时自动初始化 Git + 配置远程；auto-sync 定时器
5. ✅ `preload.js` — 暴露 `gitInit` / `gitStatus` / `gitCommit` / `gitPull` / `gitPush` / `gitHasConflicts` / `gitResolve` / `gitHistory`
6. ✅ `index.html` — 新增 ☁ 同步工具栏标签页 + 操作面板（拉取/推送/提交 + 状态标签）；加载 sync-ui.js
7. ✅ `css/toolbar.css` — 同步状态标签样式（ok/pending/warning/error）
8. ✅ `test/unit/git-sync.test.mjs` — 15 条测试 (U-91~U-105): Auth URL/init/status/commit/conflict/sync-state/pull-push-error

**认证方式**: Token 通过 URL 嵌入 `https://{token}:x-oauth-basic@github.com/user/repo.git`，仅在主进程中解密拼接

**`.gitignore` 自动生成**: 排除 `.trash/`、`.trash-meta.json`、`.clipboard/`、`.name-stack.json`、`.sync-state.json`、`settings.json`

**测试结果**: 172/172 全部通过 (+15 git-sync)

**下一步**: 进入 Phase 4a (F-043 云盘文件夹同步)

---

### 2026-06-29 — M5 云端同步 Phase 2: 文件格式优化 (F-041)

**目标**: 文件扩展名改为可配置（默认 .html），添加 JSON 元数据头，保持向后兼容旧 .txt 格式。

**完成内容**:

1. ✅ `format-migration.js` — 格式迁移模块：`buildMetadataHeader` / `parseFileName` / `needsMigration` / `migrateNotesToFormat`
2. ✅ `file-store.js` — 新增 `getMetadata` / `setMetadata` / `buildMetadataString`；`createNote` 接受 ext 参数并写入元数据头；`listNotes` 优先从元数据头读取 displayName/mtime；`renameNote` 更新元数据头；所有扩展名硬编码替换为动态参数；导出 `DEFAULT_EXT`
3. ✅ `js/editor-core.js` — `decodeNoteContent` 剥离 `<!--{JSON}-->` 元数据头后处理；`encodeNoteContent` 接受 meta 参数并添加头；`selectNote` 存储 `_meta` + `createdAt` 到 `ND.currentNote`；所有保存调用传递元数据
4. ✅ `main.js` — `getNoteExtension()` 从设置读取扩展名；`createNote`/`listNotes`/`listTrash`/`emptyTrash` 传递 ext；启动时 `formatMigration.needsMigration` 检测 + `migrateNotesToFormat` 自动迁移
5. ✅ `test/unit/file-store-metadata.test.mjs` — 11 条测试 (U-70~U-80): 元数据解析/写入/更新/创建/列表/重命名/扩展名过滤
6. ✅ `test/unit/format-migration.test.mjs` — 10 条测试 (U-81~U-90): 头生成/文件名解析/迁移检测/批量迁移/已有头文件
7. ✅ 更新旧测试 U-03/U-08 适配新行为（createNote 写入元数据头不再为空文件）

**文件格式**:
```html
<!--
{
  "title": "我的笔记",
  "created": 1719700000000,
  "modified": 1719701000000,
  "version": 1
}
-->
---DRAWING---
{base64 drawing data}
---TEXT---
<p>HTML 正文内容</p>
```

**技术决策**:
- 元数据头：HTML 注释 `<!--{JSON}-->` 包裹（浏览器不渲染，程序可解析）
- 扩展名：默认 `.html`（可在设置中切回 `.txt`）
- 向后兼容：`listNotes` 无元数据头时回退到文件名解析；`decodeNoteContent` 无头时按旧格式处理
- 迁移时机：启动时检测扩展名不匹配 → 自动批量重命名 + 补充元数据头
- 元数据版本号：每次 `setMetadata` 时 `version` 递增

**测试结果**: 157/157 全部通过 (+11 metadata +10 migration)

**下一步**: 进入 Phase 3 (F-042 Git 云端同步)

---

### 2026-06-29 — M5 云端同步 Phase 1: 设置基础设施 (F-040)

**目标**: 从零构建持久化配置存储 + 设置 UI + Token 加密，为后续云同步功能打基础。

**完成内容**:

1. ✅ `settings-store.js` — 设置持久化模块（读写 `{userData}/settings.json`，默认值 + 深度合并）
2. ✅ `crypto-utils.js` — AES-256-GCM Token 加密工具（密钥从 userData 路径 SHA-256 派生，机器绑定）
3. ✅ `js/settings-ui.js` — 设置弹窗 UI 逻辑（打开/填充/保存/取消/模式切换/Token 掩码）
4. ✅ `css/settings.css` — 设置弹窗样式（遮罩+卡片+表单+开关+分组）
5. ✅ `main.js` — 注册 `settings:get` / `settings:update` / `dialog:select-folder` / `settings:test-git-connection` IPC handler；启动时加载设置
6. ✅ `preload.js` — 暴露 `getSettings` / `updateSettings` / `testGitConnection` / `selectFolder`
7. ✅ `index.html` — 添加设置齿轮按钮（文件标签页）、设置弹窗 HTML、CSS 和 JS 加载
8. ✅ `js/init.js` — 绑定齿轮按钮 → `showSettingsModal()`
9. ✅ `js/state.js` — 新增 `ND.settingsOverlay` / `ND.btnSettings` DOM 引用
10. ✅ `test/unit/crypto-utils.test.mjs` — 9 条测试 (U-52~U-60): 密钥派生/加解密往返/随机IV/跨机器/边界
11. ✅ `test/unit/settings-store.test.mjs` — 9 条测试 (U-61~U-69): CRUD/Token加密存储/擦除/保留/范围/损坏恢复

**技术决策**:
- 设置文件路径：`{userData}/settings.json`，与 `notes/` 目录同级
- Token 安全：AES-256-GCM 加密 + 机器绑定密钥；渲染进程永远不可见明文 Token（返回掩码 `***masked***`）
- 设置 UI：模态弹窗模式（沿用 `window-picker-overlay` 的遮罩卡片风格）
- 忽略一次性依赖 `child_process.execSync` 用于 Git 连接测试（仅 `git ls-remote`，无持久依赖）
- vitest 配置新增 `pool: 'forks'`（解决 Node v24 + vitest 4.x 的 `import.meta.url` 兼容问题）

**测试结果**: 136/136 全部通过 (45 file-store + 16 utils + 33 image-resize + 9 crypto-utils + 9 settings-store + 24 drawing-tools)

**设置弹窗功能**:
- 云同步：启用开关 / 模式选择（Git 仓库/云盘文件夹）/ Git 配置组（URL/分支/Token/作者名/邮箱/测试连接）/ 云盘配置组（文件夹路径+浏览）/ 自动同步（开关+间隔）
- 文件：扩展名选择（.html / .txt）
- 安全：Token 输入框掩码显示（`••••••••••••••••`），聚焦时清除掩码

**下一步**: 进入 Phase 2 (F-041 文件格式优化) 或 Phase 3 (F-042 Git 云端同步)

---

### 2026-06-26 — Harness 审计与整改：文档修复 + 测试补充 + JSDoc 合规

**目标**: 全面审计项目 harness（文档/测试/代码注释），修复发现的问题，避免技术债积累。

**完成内容**:

1. ✅ **关键文档修复（Phase 1）**:
   - `progress.md` — 更新 Restart Marker，补充 6 条缺失会话记录（覆盖 13 个 commit），删除重复验证行，扩展 Change Log
   - `feature_list.json` — 新增 12 个 M2 扩展功能 ID（F-011~F-019, F-023~F-024），全部标记 `done`
   - `docs/feature_list.md` — 解决 F-010 ID 冲突，版本号更新至 v1.9.0，同步功能表
   - `docs/test_feedback.md` — 更新全部测试用例状态，填入 5 个历史 Bug 记录，添加测试统计

2. ✅ **中等文档修复（Phase 2）**:
   - `CLAUDE.md` — 修正 `npm test` 描述，补充 M2 扩展功能状态
   - `docs/architecture.md` — 删除过时措辞，添加 IPC 通道清单（23 个通道）
   - `docs/git_workflow.md` — 修正路径引用，替换不存在 ID 示例
   - `test/README.md` — 修正 `.js` → `.mjs` 扩展名，更新测试数量至 94+

3. ✅ **测试覆盖补充（Phase 3）**:
   - 新建 `test/unit/utils.test.mjs` — 16 条测试（escapeHtml 5 + formatDate 4 + parseDefaultNameNumber 7）
   - 新建 `test/unit/image-resize.test.mjs` — 33 条测试（手柄创建/位置/拖拽状态机/尺寸计算/取消选中/裁剪状态机/恢复原图）
   - 安装 `jsdom` devDependency 支持 DOM 依赖测试

4. ✅ **JSDoc 规范合规（Phase 4）**:
   - 为 8 个文件添加完整 JSDoc 文件头（editor-core/style-toolbar/context-menus/editor-events/editor-markers/insert-features/view-switching/image-resize）
   - 补全 4 个文件的部分头（utils/sidebar-render/sidebar-ops/state）— 添加 @created/@updated/@version

5. ✅ **收尾清理（Phase 5）**:
   - 删除从未使用的 `session-handoff.md`
   - 从 `CLAUDE.md` 移除 session-handoff 相关引用
   - 更新 `init.sh` 添加 JS/CSS 文件数量下限检查

**技术决策**:
- 测试使用 jsdom 提供 DOM 环境，image-resize 测试聚焦纯逻辑和状态机
- JSDoc 文件头保持与项目现有模板一致（`@file/@description/@author/@created/@updated/@version`）
- session-handoff.md 因从未使用（24 个 commit 无填充记录）故删除，由 progress.md Restart Marker 担任唯一交接点

**测试结果**: 94/94 全部通过 (45 file-store + 16 utils + 33 image-resize)

**下一步**: 进入 M3 里程碑，实现日记日历视图 (F-020)

---

## 记录约定

- **触发时机**: 每次开发会话结束、完成一次 git commit 后
- **恢复点更新**: 每次会话结束时更新顶部的「恢复点 / Restart Marker」信息
- **记录内容**: 本次实现了什么、做了什么技术决策、遇到并解决了什么问题
- **粒度**: 概括性记录大改动或进展，不逐行记录代码细节
- **关联**: 如有对应的 git commit，在记录中引用 commit hash

---

## Verification Evidence

验证通过后在此记录命令和输出:

| 日期 | 命令 | 结果 |
|---|---|---|
| 2024-06-24 | `npm test` | 18/18 单元测试通过 |
| 2026-06-24 | `npm test` | 49/49 全部通过 |
| 2026-06-24 | `npm test` | 57/57 全部通过 (39 单元 + 18 E2E) |
| 2026-06-24 | `npm test` | 59/59 全部通过 (39 单元 + 20 E2E) |
| 2026-06-24 | `npm test` | 62/62 全部通过 (39 单元 + 23 E2E) |
| 2026-06-24 | `npm test` | 65/65 全部通过 (39 单元 + 26 E2E) |
| 2026-06-26 | `npm test` | 94/94 全部通过 (45 file-store + 16 utils + 33 image-resize) |
| 2026-06-29 | `npm test` | 136/136 全部通过 (+9 crypto-utils + 9 settings-store + 24 drawing-tools) |
| 2026-06-29 | `npm test` | 157/157 全部通过 (+11 metadata +10 migration) |
| 2026-06-29 | `npm test` | 172/172 全部通过 (+15 git-sync) |
| 2026-06-29 | `npm test` | 181/181 全部通过 (+6 diff) |
| 2026-06-29 | `npm test` | 198/198 全部通过 (+17 edit-toolbar) |

---

## 变更日志

| 日期 | 版本 | 变更内容 | 关联 Commit |
|---|---|---|---|
| 2024-06-24 | 1.0.0 | 初始 Hello World 版本 | `592ffe1` |
| 2024-06-24 | 1.0.1 | 建立编码规范、Git 工作流，重组文档体系 | `592ffe1` |
| 2024-06-24 | 1.1.0 | 笔记编辑器 DEMO：侧边栏+编辑区+撤销/重做+自动保存 | `9dad08a` |
| 2024-06-24 | 1.2.0 | 建立自动化测试体系，18 条单元测试全部通过 | `1b428ba` |
| 2024-06-24 | 1.3.0 | 笔记管理功能增强：重命名/删除/复制/剪切+右键菜单 | `826f4de` |
| 2026-06-24 | — | Harness 审计与修复: feature_list.json, init.sh, session-handoff.md | — |
| 2026-06-24 | 1.4.0 | 工具栏重构为双层分类标签 + 移除删除确认弹窗 | `e5d0fb3`, `1f808f1`, `4705510` |
| 2026-06-24 | — | 文档：新增弹窗使用规范 | `664883f` |
| 2026-06-25 | 1.5.0 | 富文本编辑器重构：contenteditable + 样式工具栏 + 格式刷 | `b2f2b50` |
| 2026-06-25 | 1.6.0 | 系统托盘 + Ctrl+Shift+N 全局快捷键唤起 | `4ea105d` |
| 2026-06-25 | 1.7.0 | 侧边栏排序 + 工作区/回收站分栏 | `314aa4d` |
| 2026-06-25 | — | 文档：测试覆盖规范 + 测试命令重组 | `dda2405` |
| 2026-06-25 | 1.8.0 | 插入标签页（清单+时间戳）+ Enter继承 + Backspace删除 + 按钮纯图标 | `cb8f4ed`, `5d050d6` |
| 2026-06-25 | 1.9.0 | 图片编辑标签页 + 裁剪矩形手柄 + 非破坏性裁剪 | `8bc10b4`, `8869c10`, `2b952c8` |
| 2026-06-26 | — | Harness 审计与整改：文档修复 + 测试补充 + JSDoc 合规 | — |
| 2026-06-29 | 2.0.0 | M5 Phase 1: 设置基础设施 — 持久化配置 + Token 加密 + 设置弹窗 UI | — |
| 2026-06-29 | 2.1.0 | M5 Phase 2: 文件格式优化 — .html 扩展名 + JSON 元数据头 + 迁移 | — |
| 2026-06-29 | 2.2.0 | M5 Phase 3: Git 云端同步 — simple-git + pull/push/commit/conflict | — |
| 2026-06-29 | 2.2.1 | 清理：移除云盘方案 + Token 持久化修复 + 简化计划 | — |
| 2026-06-29 | 2.3.0 | M5 Phase 4: 统一冲突解决 — diff + 冲突列表 + 对比预览 + 逐文件/批量解决 | — |
