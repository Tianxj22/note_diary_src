# CLAUDE.md

## 项目概述

Note Diary — 基于 Electron 的桌面笔记日记应用。当前为初始 Hello World 阶段。

## 技术栈

- **运行时**: Electron ^33.0.0
- **语言**: JavaScript (Node.js + 浏览器端)
- **安全模型**: contextIsolation + preload 桥接（无 nodeIntegration）
- **包管理**: npm
- **版本管理**: Git

## 项目结构

```
note_diary/
├── package.json            # 项目配置与依赖
├── main.js                 # Electron 主进程
├── preload.js              # 预加载脚本（contextBridge 安全桥接）
├── index.html              # 渲染进程入口页面
├── CLAUDE.md               # 本文件
└── docs/
    ├── architecture.md     # 系统框架设计
    ├── coding_conventions.md  # 代码与注释规范
    ├── feature_list.md     # 功能清单与项目任务
    ├── git_workflow.md     # Git 工作流规范
    ├── progress.md         # 开发进度记录
    └── test_feedback.md    # 测试反馈记录
```

## 常用命令

```bash
npm install       # 安装依赖
npm start         # 启动应用
```

## 规范文档索引

所有开发约束按类型拆分到以下文档，执行相关任务时须遵守：

| 规则类型 | 文档 | 说明 |
|---|---|---|
| 代码风格、封装、注释 | `docs/coding_conventions.md` | 文件头/函数注释模板、DRY 原则、命名规范 |
| Git 提交流程 | `docs/git_workflow.md` | 提交信息格式、粒度、提交前检查清单 |
| 系统架构 | `docs/architecture.md` | 进程模型、安全模型、数据流 |
| 功能规划 | `docs/feature_list.md` | 功能清单、优先级、里程碑 |
| 进度追踪 | `docs/progress.md` | 每次会话后更新进展概要 |
| 测试反馈 | `docs/test_feedback.md` | 测试用例、Bug 跟踪 |

## IPC 通信约定

- 渲染进程 → 主进程：通过 preload 暴露的 API 调用
- 主进程 → 渲染进程：通过 webContents.send / ipcRenderer.on
- 所有 IPC 通道名使用 `namespace:action` 格式（如 `note:save`、`note:load`）

## 当前状态

- [x] 项目初始化
- [x] Electron Hello World 窗口
- [x] 编码规范与 Git 工作流文档
- [ ] 笔记编辑器基础功能
- [ ] 本地文件持久化
