# Git 工作流规范

## 1. 核心原则

- **每次对话结束前提交** — 与 AI 助手对话完成一个开发阶段后，立即 `git commit`，不攒多次改动
- **提交信息详尽** — 每次提交说明清楚改了什么、为什么改
- **保持 main 可运行** — main 分支上的任何 commit 都应能正常启动和运行

## 2. 分支策略

```
main          ← 主分支，始终可运行
  ├── feat/xxx   ← 新功能开发
  ├── fix/xxx    ← Bug 修复
  └── chore/xxx  ← 工程化改动（依赖、配置等）
```

- 小改动（< 3 文件）直接在 main 提交
- 大功能（需要多轮对话）在 `feat/xxx` 分支开发，完成后合并回 main

## 3. 提交信息格式

```
<类型>: <简短标题>

<详细正文，列出每项改动>

Co-Authored-By: Claude <noreply@anthropic.com>
```

### 3.1 类型前缀

| 前缀 | 用途 | 示例 |
|---|---|---|
| `feat` | 新功能 | `feat: 添加笔记保存功能` |
| `fix` | Bug 修复 | `fix: 修复窗口关闭时未释放内存的问题` |
| `docs` | 文档变更 | `docs: 新增编码规范文档` |
| `style` | 格式调整（不影响逻辑） | `style: 统一缩进为 2 空格` |
| `refactor` | 重构（不增删功能） | `refactor: 抽取公共文件操作模块` |
| `test` | 测试相关 | `test: 添加笔记存储单元测试` |
| `chore` | 工程化/工具 | `chore: 升级 Electron 到 34.x` |

### 3.2 示例

```
feat: 实现笔记本地保存功能

- 新增 utils/file-store.js，封装文件读写操作
- 主进程新增 note:save IPC 处理器
- preload.js 暴露 saveNote() 接口
- 渲染进程新增保存按钮及交互逻辑
- 更新 feature_list.md，标记 F-011 为已完成
- 更新 progress.md 记录本次进展

Co-Authored-By: Claude <noreply@anthropic.com>
```

## 4. 提交前检查清单

- [ ] 应用能正常启动 (`npm start`)
- [ ] 无 ESLint 报错（如有配置）
- [ ] 新功能已在 `docs/feature_list.md` 登记或更新状态
- [ ] 本次进展已在 `docs/progress.md` 记录
- [ ] 无调试用的 `console.log` 残留
- [ ] 无临时文件被提交（检查 `git status`）

## 5. 提交粒度

- 一个功能点 = 一次 commit
- 不要混入无关改动（如"修 bug 顺便改了缩进"）
- 如果发现无关的文件被修改，先 `git stash` 再提交

## 6. 与文档同步

```
每次 commit
    │
    ├── 功能变动 → 更新 docs/feature_list.md
    ├── 进展概要 → 更新 docs/progress.md
    ├── 测试相关 → 更新 docs/test_feedback.md
    └── 架构调整 → 更新 docs/architecture.md
```

## 7. 禁止事项

- 禁止 `git push --force` 到 main 分支
- 禁止提交 `node_modules/`、`.env`、密钥文件
- 禁止在提交信息中写"update"、"fix bug"等笼统描述
- 禁止跳过 pre-commit 检查（`--no-verify`）
