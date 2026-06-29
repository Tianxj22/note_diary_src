# Note Diary

基于 Electron 的桌面笔记日记应用，支持富文本编辑、图片插入/编辑、绘图、Git 云端同步。

## 核心功能

- **富文本编辑器** — 基于 contenteditable，支持加粗/斜体/下划线/删除线/标题/字体/字号/颜色/高亮/对齐
- **多媒体插入** — 5 种图片插入方式（文件、剪贴板、全屏截图、区域截图、窗口截图）
- **图片编辑** — 8 点缩放手柄、矩形裁剪、宽高比锁定、恢复原图
- **绘图工具** — 铅笔/画笔/橡皮/颜料桶/取色器/图形/缩放
- **结构化笔记** — 清单复选框（`- [ ]` / `- [x]`）、日志时间戳，Enter 继承标记格式
- **笔记管理** — 重命名/删除/复制/剪切、右键菜单、回收站（软删除/恢复/永久删除/清空）
- **Git 云端同步** — 笔记目录作为 Git 仓库，支持 pull/push/commit/冲突解决
- **快捷键体系** — 24 个可配置快捷键，编辑器右键菜单
- **系统托盘** — 最小化到托盘，全局快捷键唤起（`Ctrl+Shift+N`）

## 技术栈

| 技术 | 用途 |
|---|---|
| Electron ^33 | 桌面应用框架 |
| JavaScript (Node.js + 浏览器端) | 全栈语言 |
| simple-git | Git 操作（云端同步） |
| electron-builder | 跨平台打包/分发 |
| Vitest + Playwright | 单元测试 + E2E 测试 |

## 开发环境要求

- **Node.js** >= 18.x
- **npm** >= 9.x
- **git**（云端同步功能需要）

## 本地开发

```bash
# 安装依赖
npm install

# 启动应用（开发模式）
npm start

# 运行测试
npm test

# 运行全部测试（含 E2E）
npm run test:all
```

## 构建部署

### 图标预处理（首次或图标更新后）

```bash
npm run icon:prepare
```

此命令将 `icons.png` 缩放为各平台所需尺寸，输出到 `build/` 目录。

### Windows

```bash
# 构建 NSIS 安装器 + 便携版
npm run build:win

# 仅便携版
npm run build:win:portable
```

输出文件位于 `dist/`：
- `Note-Diary-Setup-x.x.x.exe` — NSIS 安装器（桌面 + 开始菜单快捷方式）
- `Note-Diary-x.x.x-portable.exe` — 免安装便携版

### macOS

```bash
npm run build:mac
```

输出：`dist/Note-Diary-x.x.x.dmg`（拖拽至 Applications 完成安装）

### Linux

```bash
npm run build:linux
```

输出：
- `dist/Note-Diary-x.x.x.AppImage` — 免安装运行
- `dist/note-diary_x.x.x_amd64.deb` — Debian/Ubuntu 系统包

## 项目结构

```
note_diary/
├── package.json              # 项目配置、依赖、electron-builder 配置
├── main.js                   # Electron 主进程
├── preload.js                # 预加载脚本（contextBridge 安全桥接）
├── index.html                # 渲染进程入口
├── css/                      # 样式表
│   ├── base.css              # Reset / 布局
│   ├── sidebar.css           # 侧边栏
│   ├── toolbar.css           # 工具栏
│   ├── editor.css            # 编辑区
│   ├── overlays.css          # 右键菜单 / 弹窗
│   └── image-resize.css      # 图片缩放手柄
├── js/                       # 渲染进程脚本
│   ├── state.js              # 全局状态 + DOM 引用
│   ├── utils.js              # 工具函数
│   ├── editor-core.js        # 编辑器核心
│   ├── editor-events.js      # 键盘事件 / 撤销重做
│   ├── editor-markers.js     # 清单 / 时间戳标记
│   ├── style-toolbar.js      # 样式按钮 / 格式刷
│   ├── edit-toolbar.js       # 查找替换 / 文本编辑增强
│   ├── insert-features.js    # 图片插入 / 窗口选择器
│   ├── image-resize.js       # 图片缩放手柄
│   ├── context-menus.js      # 右键菜单
│   ├── view-switching.js     # 视图切换 / 排序
│   ├── sidebar-render.js     # 侧边栏渲染
│   ├── sidebar-ops.js        # 笔记 CRUD
│   ├── settings-ui.js        # 设置弹窗
│   ├── sync-ui.js            # Git 同步面板
│   ├── conflict-ui.js        # 冲突解决界面
│   └── init.js               # 启动入口
├── build/                    # 构建资源（图标等）
│   ├── icon.png
│   └── icons/                # Linux .desktop 多尺寸图标
├── scripts/
│   └── resize-icon.js        # 图标缩放脚本
├── docs/                     # 开发文档
│   ├── architecture.md       # 系统架构
│   ├── coding_conventions.md # 编码规范
│   ├── feature_list.md       # 功能清单
│   └── git_workflow.md       # Git 工作流
├── test/                     # 测试
│   ├── unit/                 # 单元测试
│   └── e2e/                  # E2E 测试
├── icons.png                 # 原始图标源文件
├── README.md                 # 本文件
└── CLAUDE.md                 # AI 开发指令
```

## 运行测试

```bash
npm test              # 单元测试
npm run test:e2e      # E2E 测试（需要桌面环境）
npm run test:all      # 全部测试
npm run test:watch    # 监听模式
```

## License

MIT
