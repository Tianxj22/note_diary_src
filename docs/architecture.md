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
- 文件系统读写（笔记持久化 + 回收站 + 命名栈管理）
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

## 6. IPC 通道清单

| 通道 | 方向 | 用途 |
|---|---|---|
| `note:create` | renderer→main | 创建新笔记文件 |
| `note:list` | renderer→main | 列出所有笔记 |
| `note:read` | renderer→main | 读取笔记内容 |
| `note:save` | renderer→main | 保存笔记内容 |
| `note:delete` | renderer→main | 删除笔记（已废弃，改用 move-to-trash） |
| `note:rename` | renderer→main | 重命名笔记 |
| `note:duplicate` | renderer→main | 复制笔记 |
| `note:cut` | renderer→main | 剪切笔记到剪贴板 |
| `note:next-default-name` | renderer→main | 获取下一个默认笔记名（命名栈） |
| `note:release-name-number` | renderer→main | 归还序号到命名栈 |
| `note:move-to-trash` | renderer→main | 移入回收站 |
| `trash:list` | renderer→main | 列出回收站内容 |
| `trash:restore` | renderer→main | 从回收站恢复 |
| `trash:delete-permanent` | renderer→main | 永久删除 |
| `trash:empty` | renderer→main | 清空回收站 |
| `note:import` | renderer→main | 导入外部文件 |
| `image:open-file` | renderer→main | 打开图片文件选择对话框 |
| `image:read-clipboard` | renderer→main | 读取剪贴板图片 |
| `image:capture-fullscreen` | renderer→main | 全屏截图 |
| `image:capture-area` | renderer→main | 区域截图 |
| `image:list-windows` | renderer→main | 获取桌面窗口列表 |
| `image:capture-window-by-id` | renderer→main | 按 ID 捕获窗口截图 |
| `app:versions` | renderer→main | 获取运行时版本信息 |

## 7. 后续演进方向

- 笔记编辑器：自定义 contenteditable + execCommand 富文本编辑器
- 本地存储：文件系统 .txt + .name-stack.json + .trash-meta.json
- 日记视图：日历组件 + 时间线展示
- 搜索：全文检索笔记内容
