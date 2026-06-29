# 测试使用说明

## 快速开始

```bash
# 运行单元测试（默认，始终可用）
npm test

# 仅运行单元测试（无需启动 Electron）
npm run test:unit

# 仅运行 E2E 测试（需要桌面环境 + 兼容的 Electron 版本）
npm run test:e2e

# 运行全部测试（单元 + E2E）
npm run test:all

# 监听模式，文件变更自动重跑
npm run test:watch
```

> **注意**: `npm test` 默认仅运行单元测试，确保在任何环境下都能快速验证核心逻辑。
> E2E 测试需要 Electron 与 Playwright 版本兼容（当前 Electron 33 与 Playwright 1.61 存在已知兼容性问题）。

## 测试结构

```
test/
├── unit/
│   ├── file-store.test.mjs       # 笔记文件读写模块（45 条）
│   ├── utils.test.mjs            # 工具函数（16 条）
│   ├── image-resize.test.mjs     # 图片缩放编辑（33 条）
│   └── drawing-tools.test.mjs    # 绘图算法（24 条）
├── integration/                  # ★ 集成测试（64 条，详见 docs/integration_test.md）
│   ├── helpers.mjs               # 共享环境
│   ├── full-workflow.test.mjs    # 全功能端到端流程
│   ├── drawing-shapes-workflow.test.mjs # 全形状工具切换
│   ├── serialization.test.mjs    # 内容编解码往返
│   ├── image-lifecycle.test.mjs  # 图片完整生命周期
│   ├── marker-richtext.test.mjs  # 标记+富文本共存
│   ├── drawing-mode.test.mjs     # 绘图模式状态机
│   ├── mixed-content-save-load.test.mjs # 混合内容持久化
│   ├── undo-redo-cross-content.test.mjs # 跨内容撤销重做
│   ├── format-painter.test.mjs   # 格式刷跨类型
│   ├── cross-tab-workflow.test.mjs # 标签切换工作流
│   └── state-cleanup.test.mjs    # 状态清理验证
├── e2e/
│   ├── editor.test.mjs           # 编辑器 UI（15 条）
│   ├── delete-edit.test.mjs      # 删除后编辑专项（12 条）
│   ├── editor-title.test.mjs     # 标题栏同步（8 条）
│   ├── editor-style.test.mjs     # 富文本样式工具栏（15 条）
│   ├── checklist-log.test.mjs    # 清单+时间戳（14 条）
│   └── image-insert.test.mjs     # 图片插入（22 条）
├── vitest.config.mjs             # Vitest 配置
└── README.md                     # 本文件
```

### 集成测试

运行集成测试（无需桌面环境，使用 jsdom 模拟）：

```bash
npx vitest run test/integration/
```

集成测试模拟真实用户工作流，覆盖多模块协作、工具切换、状态传递等场景。详细文档见 [`docs/integration_test.md`](../docs/integration_test.md)。

## 测试用例索引

### 单元测试 (file-store.js)

| 编号 | 函数 | 测试内容 |
|---|---|---|
| U-01 | ensureNotesDir | 创建目录并返回路径 |
| U-02 | ensureNotesDir | 复用已有目录不报错 |
| U-03 | createNote | 创建文件并返回路径信息 |
| U-04 | createNote | 空标题使用默认名称 |
| U-05 | listNotes | 空目录返回空数组 |
| U-06 | listNotes | 按时间倒序返回所有笔记 |
| U-07 | listNotes | 过滤非 .txt 文件 |
| U-08 | readNote | 返回完整文本内容 |
| U-09 | readNote | 不存在文件返回空串 |
| U-10 | saveNote | 写入内容返回 true |
| U-11 | saveNote | 无效路径返回 false |
| U-12~U-35 | 全部函数 | 删除/重命名/复制/剪切/命名栈/回收站/排序 — 34 条 |

### E2E 测试

| 文件 | 编号范围 | 测试内容 |
|---|---|---|
| `editor.test.mjs` | E-01 ~ E-15 | 新建/切换/保存/撤销/重做/右键菜单/关闭笔记 |
| `delete-edit.test.mjs` | DE-01 ~ DE-12 | 删除后编辑/竞态条件/关闭按钮/聚焦防御 |
| `editor-title.test.mjs` | ET-01 ~ ET-08 | 标题栏与侧边栏双向同步 |
| `editor-style.test.mjs` | ES-01 ~ ES-15 | 加粗/斜体/下划线/字体/字号/颜色/对齐/格式刷 |
| `checklist-log.test.mjs` | CL-01 ~ CL-14 | 清单插入/切换/时间戳/Enter继承/Backspace删除 |
| `image-insert.test.mjs` | IMG-01 ~ IMG-22 | 5种图片插入方式/窗口选择器/撤销重做联动 |

## 新功能 TDD 工作流

当你需要添加新功能时，按以下流程进行：

```
1. 新需求提出
       │
       ▼
2. 设计测试用例（描述操作 + 预期结果）
       │
       ▼
3. 与用户核对测试用例是否合适
       │
   ┌───┴───┐
   │ 确认？ │── 否 ──→ 调整用例
   └───┬───┘
       │ 是
       ▼
4. 实现功能代码
       │
       ▼
5. 运行 npm test
       │
   ┌───┴───┐
   │ 通过？ │── 否 ──→ 修复代码 → 回到步骤 5
   └───┬───┘
       │ 是
       ▼
6. 更新 feature_list.md + progress.md
       │
       ▼
7. Git 提交
```

## 编写测试用例规范

### 单元测试

```javascript
import { describe, it, expect } from 'vitest';

describe('模块名', () => {
  it('编号: 应做什么操作 → 预期什么结果', () => {
    // 1. 准备数据
    // 2. 执行操作
    // 3. 断言结果
    expect(result).toBe(expected);
  });
});
```

### E2E 测试

```javascript
import { _electron as electron } from '@playwright/test';

describe('功能名', () => {
  let app, page;

  beforeAll(async () => {
    app = await electron.launch({ args: ['main.js'] });
    page = await app.firstWindow();
  });

  afterAll(async () => {
    await app.close();
  });

  it('编号: 用户做什么 → 预期看到什么', async () => {
    // 模拟用户操作
    await page.click('#button-id');
    // 断言 UI 状态
    const text = await page.textContent('.selector');
    expect(text).toBe('预期文本');
  });
});
```

## 注意事项

1. **单元测试**可以在任何环境运行，不依赖桌面
2. **E2E 测试**需要图形桌面环境，在 headless CI 中可能无法运行
3. 测试数据使用临时目录，每次测试后自动清理
4. 新增源文件后记得同步更新 `.gitignore`（排除 `node_modules/` 和临时文件）
