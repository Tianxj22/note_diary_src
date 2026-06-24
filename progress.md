# 开发进度记录 / Development Progress

## 恢复点 / Restart Marker

> **Startup Workflow**: 新会话从此处开始。Read this section to resume work.

- **Current Objective / 当前活跃功能**: 无（M3 里程碑待启动，下一个功能 F-020 日记日历视图）
- **Current State**: M1/M2 完成 (100%), M3/M4 未开始 (0%)
- **Blockers / 阻塞项**: 无
- **Recommended Next Step / 下一步操作**:
  1. 阅读 `feature_list.json` 了解 F-020 日记日历视图详情
  2. 设计日历组件 UI 布局
  3. 实现日历视图的 IPC 通道和渲染
- **Files Modified / 最近修改文件**: `index.html` (saveCurrentNote/selectNote 修复), `test/e2e/delete-edit.test.mjs` (新增 DE-01a/DE-06)
- **Last Updated / 最后更新**: 2026-06-24

---

## 进度总览 / Progress Overview

```
M1: Hello World     ████████████████████ 100%
M2: 基础编辑         ████████████████████ 100%
M3: 体验版           ░░░░░░░░░░░░░░░░░░░░   0%
M4: 正式版           ░░░░░░░░░░░░░░░░░░░░   0%
```

| 里程碑 | 目标日期 | 状态 |
|---|---|---|
| M1: Hello World | 2024-06-24 | ✅ 已完成 |
| M2: 基础编辑 | 2024-06-24 | ✅ 已完成 |
| M3: 体验版 | TBD | ⚪ 未开始 |
| M4: 正式版 | TBD | ⚪ 未开始 |

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
