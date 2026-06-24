# 系统框架设计

## 1. 整体架构

```
┌─────────────────────────────────────────────┐
│                Electron App                  │
│                                              │
│  ┌──────────────┐    IPC     ┌────────────┐ │
│  │  主进程       │◄─────────►│ 渲染进程    │ │
│  │  (main.js)    │           │ (index.html)│ │
│  │              │           │            │ │
│  │ • 窗口管理    │           │ • UI 渲染   │ │
│  │ • 文件系统    │           │ • 用户交互   │ │
│  │ • 菜单/托盘   │           │ • 状态展示   │ │
│  └──────┬───────┘           └─────┬──────┘ │
│         │ preload.js              │         │
│         └──────────┬──────────────┘         │
│                    │                        │
│            ┌───────▼───────┐                │
│            │ contextBridge │                │
│            │ (安全桥接层)   │                │
│            └───────────────┘                │
└─────────────────────────────────────────────┘
```

## 2. 进程职责

### 主进程 (main.js)
- 管理应用生命周期（启动、退出、激活）
- 创建和管理 BrowserWindow
- 文件系统读写（未来的笔记持久化）
- 原生菜单与系统托盘

### 预加载脚本 (preload.js)
- 通过 `contextBridge.exposeInMainWorld` 暴露安全 API
- 所有主进程能力必须经由 preload 桥接
- 不允许直接暴露 `ipcRenderer`，只暴露封装后的函数

### 渲染进程 (index.html / 后续组件)
- 纯前端 UI 渲染
- 通过 `window.electronAPI` 调用主进程能力
- 不使用 `nodeIntegration`，保证沙箱安全

## 3. 数据流

```
用户操作 → 渲染进程 → electronAPI.xxx()
    → [IPC] → 主进程处理 → 文件系统/系统API
    → [IPC] → 渲染进程更新 UI
```

## 4. 安全模型

| 配置项 | 值 | 原因 |
|---|---|---|
| contextIsolation | true | 隔离渲染进程与 Node.js 上下文 |
| nodeIntegration | false | 禁止渲染进程直接访问 Node API |
| CSP | default-src 'self' | 限制资源加载来源 |
| preload | 指定脚本 | 唯一的安全桥接入口 |

## 5. 技术选型

| 技术 | 选型 | 理由 |
|---|---|---|
| 框架 | Electron | 跨平台桌面应用，Web 技术栈 |
| 语言 | JavaScript | 零配置，快速原型 |
| 安全 | contextBridge | Electron 官方推荐最佳实践 |
| 包管理 | npm | 与 Node.js 生态无缝集成 |

## 6. 后续演进方向

- 笔记编辑器：集成 Monaco Editor 或 TipTap
- 本地存储：使用 electron-store 或直接文件系统
- 日记视图：日历组件 + 时间线展示
- 搜索：全文检索笔记内容
