# 代码与注释规范

## 1. 代码封装原则

### 1.1 单一职责

每个模块、文件、函数只做一件事。一个函数不应同时处理 UI 更新和文件 I/O。

### 1.2 避免重复（DRY）

- 相同逻辑出现 2 次以上，必须抽取为公共函数
- 公共工具函数放入独立模块（如 `utils/` 目录），通过 `require` 引用
- 配置常量集中管理，禁止魔法数字散落各处

### 1.3 模块化

- 主进程代码按功能拆分为独立模块（`window.js`、`menu.js`、`ipc-handlers.js`）
- 渲染进程组件化，每个 UI 组件独立文件
- 每个模块暴露最小接口，内部实现细节对外不可见

### 1.4 安全隔离

- 渲染进程禁止直接使用 Node.js API
- 所有主进程能力通过 `preload.js` 的 `contextBridge` 暴露
- preload 只暴露封装后的函数，不暴露原始 `ipcRenderer`

---

## 2. 文件头注释规范

每个代码文件必须在开头包含以下信息块：

```javascript
/**
 * @file         文件名
 * @description  文件功能简述
 * @author       创建人姓名
 * @created      创建日期 YYYY-MM-DD
 * @updated      最后修改日期 YYYY-MM-DD
 * @version      当前版本号
 */
```

示例：
```javascript
/**
 * @file         ipc-handlers.js
 * @description  笔记数据持久化相关的 IPC 处理器
 * @author       tianxj22
 * @created      2024-06-24
 * @updated      2024-06-25
 * @version      1.0.0
 */
```

HTML 文件等效形式：
```html
<!--
  @file         index.html
  @description  应用主渲染页面
  @author       tianxj22
  @created      2024-06-24
  @updated      2024-06-24
  @version      1.0.0
-->
```

---

## 3. 函数注释规范

每个函数必须包含以下 JSDoc 格式注释：

```javascript
/**
 * 函数功能的简短描述（一句话概括）
 * @param {Type} paramName - 参数含义说明
 * @param {Type} paramName2 - 参数含义说明
 * @returns {Type} 返回值格式与内容说明
 */
function foo(paramName, paramName2) {
  // ...
}
```

示例：
```javascript
/**
 * 保存笔记内容到本地文件
 * @param {string} filePath - 目标文件的绝对路径
 * @param {string} content - 要保存的笔记文本内容
 * @returns {Promise<boolean>} 保存成功返回 true，失败返回 false
 */
async function saveNote(filePath, content) {
  // ...
}
```

注意事项：
- 无参数时省略 `@param`
- 无返回值时写 `@returns {void}`
- 异步函数返回值用 `Promise<Type>` 标注
- 回调参数用 `@param {Function} callback - (err, result)` 标注签名

---

## 4. 命名规范

| 类别 | 规范 | 示例 |
|---|---|---|
| 文件名 | 小写 + 连字符 | `ipc-handlers.js` |
| 目录名 | 小写 + 连字符 | `docs/`, `utils/` |
| 函数名 | 小驼峰，动词开头 | `saveNote()`, `loadFile()` |
| 变量名 | 小驼峰，名词 | `noteList`, `currentFile` |
| 常量 | 全大写 + 下划线 | `MAX_FILE_SIZE`, `APP_NAME` |
| 类/构造函数 | 大驼峰 | `NoteEditor`, `FileManager` |
| IPC 通道 | `namespace:action` | `note:save`, `app:quit` |

---

## 5. 格式规范

- 缩进：2 空格
- 字符串：优先使用单引号，模板字符串用反引号
- 分号：必须写分号
- 行尾：LF（Unix 风格）
- 花括号：左括号不换行

---

## 6. 弹窗使用规范

### 6.1 避免使用原生弹窗

Electron 环境下，`confirm()`、`alert()`、`prompt()` 等原生弹窗存在已知问题：

- 弹窗关闭后，原窗口可能无法正确恢复焦点，导致编辑区无法选中、键盘输入无响应
- 弹窗会阻塞主进程事件循环，影响 IPC 通信时序

**原则：禁止在渲染进程中引入新的原生弹窗。**

如确需用户确认操作（如删除、覆盖保存），应使用页面内自定义组件（模态框、toast 通知等）替代。已存在的弹窗应逐步移除。

---

## 7. 测试覆盖规范

### 7.1 每次改动必须设计测试

任何代码改动（新功能、逻辑调整、Bug 修复）完成后，必须针对改动内容设计新的测试用例并加入 `npm test` 测试套件。

测试用例设计原则：
- E2E 测试覆盖用户可感知的行为变化（UI 结构、交互流程）
- 单元测试覆盖纯逻辑变更（数据处理、算法）
- 测试用例编号遵循现有约定（如 ET-01、U-27）
- 测试描述格式：`编号: 用户做什么 → 预期看到什么`

### 7.2 提交前必须运行 npm test

每次提交代码前，必须运行 `npm test` 确保所有单元测试通过：

```bash
npm test        # 单元测试（必须全部通过）
npm run test:e2e  # E2E 测试（需要桌面环境，条件允许时运行）
```

`npm test` 是代码质量的底线——任何未通过单元测试的代码不得提交。

### 7.3 测试即文档

测试用例本身就是功能的活文档。每个测试的 `it('...')` 描述应清楚表达：
- 什么场景下
- 用户做了什么操作
- 系统应该呈现什么结果
