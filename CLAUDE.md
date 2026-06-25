# CLAUDE.md

## 项目概述

Note Diary — 基于 Electron 的桌面笔记日记应用。

## 技术栈

- **运行时**: Electron ^33.0.0
- **语言**: JavaScript (Node.js + 浏览器端)
- **安全模型**: contextIsolation + preload 桥接（无 nodeIntegration）
- **包管理**: npm
- **版本管理**: Git

## 项目结构

```
note_diary/
├── package.json              # 项目配置与依赖
├── main.js                   # Electron 主进程
├── preload.js                # 预加载脚本（contextBridge 安全桥接）
├── file-store.js             # 笔记文件存储模块
├── index.html                # 渲染进程入口页面（HTML 骨架）
├── css/                      # 样式表（按功能区拆分）
│   ├── base.css              # Reset, body grid, status bar
│   ├── sidebar.css           # 侧边栏
│   ├── toolbar.css           # 工具栏、按钮、tooltip
│   ├── editor.css            # 编辑区、标记、图片
│   ├── overlays.css          # 右键菜单、下拉菜单、窗口选择器
│   └── image-resize.css      # 图片缩放手柄
├── js/                       # 渲染进程脚本（按功能区拆分，ND 命名空间）
│   ├── state.js              # 全局状态 + DOM 引用
│   ├── utils.js              # 工具函数
│   ├── sidebar-render.js     # 侧边栏渲染
│   ├── sidebar-ops.js        # 笔记 CRUD 操作
│   ├── editor-core.js        # 编辑器核心（showEditor/save/selectNote）
│   ├── editor-events.js      # 键盘事件（Enter/Backspace）、标记检测、undo/redo
│   ├── editor-markers.js     # 清单/时间戳标记创建与切换
│   ├── insert-features.js    # 图片插入、窗口选择器
│   ├── image-resize.js       # 图片缩放手柄
│   ├── style-toolbar.js      # 样式按钮、格式刷
│   ├── context-menus.js      # 右键上下文菜单
│   ├── view-switching.js     # 视图切换、排序、标签页
│   └── init.js               # 启动入口、全局事件绑定
├── CLAUDE.md                 # 本文件 — 项目指令与规则
├── feature_list.json         # 结构化功能追踪（状态/依赖/验证条件）
├── progress.md               # 开发进度记录（含恢复点 / Restart Marker）
├── init.sh                   # 项目验证入口（一键检查可开发状态）
├── session-handoff.md        # 会话交接模板
├── docs/
│   ├── architecture.md       # 系统框架设计
│   ├── coding_conventions.md # 代码与注释规范
│   ├── feature_list.md       # 功能清单与项目任务（人工可读）
│   ├── git_workflow.md       # Git 工作流规范
│   └── test_feedback.md      # 测试反馈记录
└── test/
    ├── README.md             # 测试使用说明 + TDD 工作流
    ├── vitest.config.mjs     # 测试运行器配置
    ├── unit/                 # 单元测试
    └── e2e/                  # E2E 测试
```

## Startup Workflow / 启动工作流

Before writing code, start every session:

1. 阅读 `progress.md` 顶部的「Restart Marker」— Current Objective, Blockers, Recommended Next Step
2. 阅读 `feature_list.json` — 了解所有功能状态和依赖关系
3. 运行 `bash init.sh` — 验证环境可开发（依赖安装 + 测试通过）
4. 如上次会话有交接，阅读 `session-handoff.md`

## 开发规则

- 在开发时，如果可能，载入 `harness-creator` skill，以保持项目 harness 处于良好状态。
- **One feature at a time / 一次一个功能**: 聚焦当前活跃功能，不跨越 feature_list.json 中定义的 scope boundary。
- **Stay in scope**: 只实现 feature_list.json 中当前活跃功能描述的内容，不引入未规划的特性。
- **TDD 工作流**: 新需求 → 设计测试用例 → 用户确认 → 实现 → 跑测试。

## Definition of Done / 完成定义

A feature is done only when ALL of the following are met:

- [ ] 对应代码已实现且通过 code review
- [ ] `npm test` 全部通过（含新增测试用例）
- [ ] 手动验证 `npm start` 功能可用
- [ ] `feature_list.json` 中状态已更新为 `done`，`completedAt` 已填写
- [ ] `progress.md` 恢复点已更新
- [ ] Verification evidence 已记录在 `progress.md` 的 Verification Evidence 表格中

## End of Session / 会话结束流程

Before ending a session:

1. 更新 `progress.md` 顶部的 Restart Marker（Current Objective, Blockers, Recommended Next Step, Last Updated）
2. 填写 `session-handoff.md`（如果功能未完成）
3. 确保 `npm test` 通过
4. 提交代码（遵循 `docs/git_workflow.md` 规范）

## 常用命令

```bash
bash init.sh      # 验证入口：检查环境 + 安装依赖 + 运行测试（Next steps 见脚本输出）
npm install       # 安装依赖
npm start         # 启动应用
npm test          # 运行全部测试（vitest）
npm run test:unit # 仅单元测试
npm run test:e2e  # 仅 E2E 测试
npm run test:watch # 监听模式
```

## 规范文档索引

所有开发约束按类型拆分到以下文档，执行相关任务时须遵守：

| 规则类型 | 文档 | 说明 |
|---|---|---|
| 代码风格、封装、注释 | `docs/coding_conventions.md` | 文件头/函数注释模板、DRY 原则、命名规范 |
| Git 提交流程 | `docs/git_workflow.md` | 提交信息格式、粒度、提交前检查清单 |
| 系统架构 | `docs/architecture.md` | 进程模型、安全模型、数据流 |
| 功能规划（结构化） | `feature_list.json` | 结构化功能清单（状态/依赖/验证），机器可读 |
| 功能规划（可读） | `docs/feature_list.md` | 功能清单、优先级、里程碑 |
| 进度追踪 | `progress.md` | 每次会话后更新恢复点和进展概要 |
| 测试反馈 | `docs/test_feedback.md` | 测试用例、Bug 跟踪 |

## IPC 通信约定

- 渲染进程 → 主进程：通过 preload 暴露的 API 调用
- 主进程 → 渲染进程：通过 webContents.send / ipcRenderer.on
- 所有 IPC 通道名使用 `namespace:action` 格式（如 `note:save`、`note:load`）

## 当前状态

- [x] M1: Hello World — 项目初始化、窗口创建、安全桥接
- [x] M2: 基础编辑 — 存储模块、IPC CRUD、侧边栏列表、编辑器、自动保存、笔记管理
- [ ] M3: 体验版 — 日历视图、全文搜索、标签系统
- [ ] M4: 正式版 — 导出、主题切换、自动保存增强
