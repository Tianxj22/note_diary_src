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
