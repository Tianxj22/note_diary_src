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

- 新增 file-store.js，封装文件读写操作
- 主进程新增 note:save IPC 处理器
- preload.js 暴露 saveNote() 接口
- 渲染进程新增保存按钮及交互逻辑
- 更新 feature_list.json，标记 F-013 为已完成
- 更新 progress.md 记录本次进展

Co-Authored-By: Claude <noreply@anthropic.com>
```

## 4. 提交前检查清单

- [ ] 应用能正常启动 (`npm start`)
- [ ] 无 ESLint 报错（如有配置）
- [ ] 新功能已在 `feature_list.json` 和 `docs/feature_list.md` 登记或更新状态
- [ ] 本次进展已在 `progress.md` 记录
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
    ├── 功能变动 → 更新 feature_list.json + docs/feature_list.md
    ├── 进展概要 → 更新 progress.md
    ├── 测试相关 → 更新 docs/test_feedback.md
    └── 架构调整 → 更新 docs/architecture.md
```

## 7. 禁止事项

- 禁止 `git push --force` 到 main 分支
- 禁止提交 `node_modules/`、`.env`、密钥文件
- 禁止在提交信息中写"update"、"fix bug"等笼统描述
- 禁止跳过 pre-commit 检查（`--no-verify`）

## 8. 发布新版本（GitHub Release）

应用使用 `electron-updater` 通过 GitHub Releases 提供自动更新。每次发版时按以下步骤操作：

### 8.1 准备工作

1. **更新版本号**
   - 修改 `package.json` 中的 `version` 字段（如 `1.11.0` → `1.12.0`）
   - 同步更新 `feature_list.json` 中的 `version` 字段

2. **提交版本号变更**
   ```bash
   git add package.json feature_list.json
   git commit -m "chore: bump version to X.Y.Z"
   ```

### 8.2 构建安装包

```bash
npm run build:win    # Windows: NSIS 安装器 + 便携版
# 或按需构建其他平台
npm run build:mac    # macOS: DMG
npm run build:linux  # Linux: AppImage + deb
```

构建产物在 `dist/` 目录下：
- `Note-Diary-Setup-X.Y.Z.exe` — NSIS 安装器
- `Note-Diary-X.Y.Z-portable.exe` — 便携版
- `latest.yml` — electron-updater 版本描述文件（**必须上传**）

### 8.3 创建 GitHub Release

1. 推送代码到 GitHub：
   ```bash
   git push origin master
   ```

2. 打开 GitHub 仓库的 [Releases](https://github.com/Tianxj22/note_diary_src/releases) 页面

3. 点击 **"Draft a new release"**

4. 填写发布信息：
   - **Tag version**: `vX.Y.Z`（与 `package.json` 版本号一致，前缀 `v`）
   - **Release title**: `vX.Y.Z`
   - **Describe this release**: 列出本版本的主要变更

5. 上传 `dist/` 目录下的以下文件：
   - `latest.yml`（必须，electron-updater 依赖此文件判断版本）
   - `Note-Diary-Setup-X.Y.Z.exe`
   - `Note-Diary-X.Y.Z-portable.exe`

6. 点击 **"Publish release"**

### 8.4 验证更新

1. 在旧版本应用中打开 **设置 → 更新 → 检查更新**
2. 确认能检测到新版本
3. 确认下载进度条正常显示
4. 下载完成后点击「立即重启安装」，验证安装成功
