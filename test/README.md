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
│   └── file-store.test.js    # 笔记文件读写模块单元测试（11 条）
├── e2e/
│   └── editor.test.js        # 编辑器 UI 端到端测试（8 条）
├── vitest.config.js          # Vitest 配置
└── README.md                 # 本文件
```

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

### E2E 测试 (编辑器 UI)

| 编号 | 测试内容 |
|---|---|
| E-01 | 应用启动：窗口标题 + 空状态显示 |
| E-02 | 新建笔记（按钮）：编辑区出现 + 列表更新 |
| E-03 | 新建笔记（快捷键）：Ctrl+N |
| E-04 | 输入文字后自动保存 |
| E-05 | 撤销操作 |
| E-06 | 重做操作 |
| E-07 | 多笔记间切换 |
| E-08 | 数据持久化验证 |

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
