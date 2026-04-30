# OpenTab 全能型标签管理平台设计

## 定位

全能型标签管理平台：标签页工作区 + 开发者路由管理。两类用户（普通用户、开发者）平等对待，功能分层展示。

## 目标用户

- 普通用户：需要标签页管理、收藏、同步
- 开发者：需要路由管理、环境切换、API 调试

## 技术决策

- 同步策略：双通道（WebDAV + Chrome Storage Sync）
- AI 能力：轻量级（自动标签建议、智能分组）
- 浏览器：Chrome 优先，架构兼容多浏览器
- 方案类型：渐进增强型（分 4 阶段推进）

---

## 阶段一：OneTab 核心能力补齐

### 1. 一键收起所有标签页

- 点击 Popup 或 SidePanel 中的"收起所有标签"按钮
- 将当前窗口所有标签页保存为一个新的分组（自动命名为"收起于 YYYY-MM-DD HH:mm"）
- 关闭除当前标签外的所有标签页（保留一个空白标签或 SidePanel）
- 支持排除已固定的标签页（pinned tabs）
- 支持排除指定域名（白名单）

### 2. 单个/全部恢复标签页

- 分组详情中每个路由卡片显示"恢复"按钮
- 分组头部显示"全部恢复"按钮
- 恢复时在新标签页打开，不关闭当前 SidePanel
- 支持"恢复并删除"（恢复后从列表移除）

### 3. 拖拽排序

- 路由卡片支持拖拽排序（同分组内）
- 分组支持拖拽排序（调整分组顺序）
- 排序结果持久化到 storage
- 使用 HTML5 Drag and Drop API，不引入第三方库

### 4. 锁定分组

- 分组右键菜单或头部按钮切换锁定状态
- 锁定后：不可删除、不可重命名、路由不可移出
- 锁定图标显示在分组头部
- 锁定状态存储在 RouteGroup.isLocked 字段

### 5. 置顶分组

- 分组右键菜单或头部按钮切换置顶状态
- 置顶分组始终显示在列表顶部
- 置顶状态存储在 RouteGroup.pinned 字段
- 多个置顶分组按原始顺序排列

### 6. 分享为网页

- 分组右键菜单"生成分享链接"
- 方案：将分组数据 JSON 序列化后 Base64 编码，拼接到扩展自身的 HTML 页面 URL 的 hash 中
- 接收者打开链接 → 扩展的 share.html 页面解析 hash → 渲染分组内容
- 支持"一键导入"按钮（将分享的分组导入自己的 OpenTab）
- 数据量限制：单个分组最多 50 条路由（URL hash 长度限制约 8KB）

---

## 阶段二：半成品完善 + 基础体验优化

### 1. 空壳页面填充

- **RecentPage.tsx**：展示最近访问记录列表，支持按时间排序、搜索、清空
- **SettingsEntryPage.tsx**：设置入口页，集中展示所有设置项（同步、隐私、视图、备份等）

### 2. 视图模式切换生效

- 实现 grid/list 两种布局
- Grid 模式：卡片式展示，每行 2-3 个
- List 模式：列表式展示，每行一个，显示更多信息（URL、标签、备注）
- 切换时平滑过渡，状态持久化

### 3. Chrome Storage Sync 实现

- 实现 chrome.storage.sync 读写服务
- 同步策略：全量同步（数据量小，适合 chrome.storage.sync 的 100KB 限制）
- 冲突处理：以最新修改时间为准
- 同步状态显示：上次同步时间、同步中/成功/失败
- 同步范围：路由（RouteItem）、分组（RouteGroup）、标签（RouteTag）三项核心数据
- 不同步：AppSettings（设备相关）、VisitRecord（设备本地历史）
- 数据超限时提示用户清理或切换 WebDAV 同步

### 4. WebDAV 密码安全

- WebDAV 密码使用 chrome.storage.local 加密存储（至少不明文）
- 配置版本文件不再包含密码
- 密码字段在 UI 中显示为 password 类型

### 5. 其他体验优化

- 搜索结果高亮匹配文本
- 空状态引导（无路由时的引导页面）
- 快捷键支持（Ctrl+Shift+S 收起当前标签）

---

## 阶段三：开发者功能增强

### 1. 环境管理

- 路由支持多环境定义（dev/staging/prod）
- 每个路由可配置多个环境 URL（如 localhost:3000、staging.example.com、example.com）
- 一键切换环境：路由卡片显示环境标签，点击切换
- 环境模板：预设常用环境配置（本地开发、测试、生产）
- 环境变量：在 AppSettings 中定义全局变量（如 port=3000, domain=example.com），路由 URL 中使用 {port}、{domain} 引用
- 变量替换在打开标签页时实时计算，不修改存储的 URL 模板

### 2. 路径级路由管理增强

- 当前已有 path 字段，增强 UI 展示
- 路径树形结构：按路径层级展示路由（如 /api/v1 → /users、/orders）
- 路径搜索：支持按路径片段搜索
- 路径分组：自动按路径前缀分组

### 3. API 调试入口

- 路由卡片支持"复制 cURL"功能
- 支持自定义 HTTP 方法和 Headers
- 集成 Chrome DevTools Protocol（可选）
- API 响应预览（轻量级，不替代 Postman）

### 4. 代码仓库关联

- 路由支持关联 Git 仓库 URL
- 支持 GitHub/GitLab 链接
- 一键打开关联的代码仓库

### 5. 开发者工具集成

- 路由卡片支持"在 DevTools 中打开"
- 支持复制为 fetch 代码片段
- 支持导出为 Postman Collection 格式

---

## 阶段四：轻量 AI 能力

### 1. 自动标签建议

- 基于 URL 和页面标题自动建议标签
- 分析 URL 路径结构（如 /api/、/docs/、/admin/）
- 分析页面标题关键词
- 用户可一键接受或忽略建议
- 本地规则引擎，不依赖外部 API

### 2. 智能分组建议

- 基于 URL 域名和路径自动建议分组
- 识别相似路由（如同一域名下的不同页面）
- 识别同项目路由（如包含相同路径前缀）
- 用户可一键创建建议的分组

### 3. 重复路由检测

- 检测相似但不完全相同的路由（如带/不带 www、带/不带尾部斜杠）
- 提供合并建议
- 批量清理重复项

### 4. 智能搜索增强

- 搜索支持模糊匹配
- 搜索支持拼音匹配（中文用户友好）
- 搜索结果按相关性排序

---

## 数据模型变更

### RouteGroup 新增字段

```typescript
interface RouteGroup {
  // ...existing fields
  isLocked: boolean;   // 锁定状态
  pinned: boolean;     // 置顶状态
  sortOrder: number;   // 排序序号
}
```

### RouteItem 新增字段

```typescript
interface RouteItem {
  // ...existing fields
  environments: Environment[];  // 多环境配置
  repoUrl?: string;             // 关联代码仓库
  httpMethod?: string;          // HTTP 方法（API 调试）
  headers?: Record<string, string>; // 自定义 Headers
}

interface Environment {
  name: string;    // 环境名称（dev/staging/prod）
  url: string;     // 环境 URL
}
```

### AppSettings 新增字段

```typescript
interface AppSettings {
  // ...existing fields
  excludePinnedTabs: boolean;    // 收起时排除固定标签
  domainWhitelist: string[];     // 收起时排除的域名白名单
  viewMode: "grid" | "list";    // 视图模式（已存在，需实现）
  enableAI: boolean;             // 启用 AI 建议
  globalVariables: Record<string, string>; // 全局环境变量（如 port、domain）
}
```

---

## 技术实现要点

### 一键收起功能

- 使用 chrome.tabs.query 获取当前窗口所有标签
- 使用 chrome.tabs.remove 批量关闭标签
- 使用 chrome.tabs.create 保留空白标签或 SidePanel

### 拖拽排序

- 使用 HTML5 Drag and Drop API
- 拖拽开始：设置 dragImage、传递数据
- 拖拽经过：计算放置位置、显示占位符
- 拖拽结束：更新排序序号、持久化

### Chrome Storage Sync

- chrome.storage.sync 限制：100KB 总量、120 次/分钟写入
- 策略：只同步核心数据，压缩后存储
- 冲突：以 lastModified 时间戳为准

### 分享为网页

- 将分组数据 JSON → Base64 编码 → 拼接到扩展 share.html 的 hash
- 接收者无需安装扩展，浏览器直接打开查看
- 安装了扩展的用户可点击"一键导入"

---

## 验收标准

### 阶段一验收

- [ ] 一键收起所有标签页，自动创建分组
- [ ] 单个/全部恢复标签页
- [ ] 路由和分组支持拖拽排序
- [ ] 分组可锁定、可置顶
- [ ] 分组可生成分享链接

### 阶段二验收

- [ ] RecentPage 和 SettingsEntryPage 有完整 UI
- [ ] grid/list 视图模式可切换
- [ ] Chrome Storage Sync 可用
- [ ] WebDAV 密码不明文存储

### 阶段三验收

- [ ] 路由支持多环境配置
- [ ] 路径树形结构展示
- [ ] 支持复制 cURL、fetch 代码
- [ ] 支持关联代码仓库

### 阶段四验收

- [ ] 自动标签建议可用
- [ ] 智能分组建议可用
- [ ] 重复路由检测可用
- [ ] 搜索支持模糊匹配
