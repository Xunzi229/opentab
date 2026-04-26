# OpenTab

一个面向日常开发与后台工作流的 Chrome 扩展，用来收藏当前路由、管理分组、记录最近访问，并在多设备之间同步。

当前仓库处于方案落地阶段。本文档的目标不是介绍概念，而是让项目可以直接进入开发。

## 固定要求

以下需求已经冻结，后续开发默认不得改变：

1. 分组名称不能重复
2. 收藏的网址必须可打开
3. 管理页面必须是独立 Tab 页面
4. 每次打包必须自动递增插件版本

详细约束见：

- [docs/frozen-requirements.md](/f:/github/opentab/docs/frozen-requirements.md)

## 1. 产品目标

OpenTab 解决的是“后台系统 / 多环境系统 / 多项目系统”的常见问题：

- 常用页面很多，但浏览器书签组织成本高
- 同一个系统里路由层级深，回到目标页面慢
- 每天需要恢复一批固定工作页
- 不同设备之间需要同步收藏

最终形态不是简单的“收藏夹”，而是一个 Chrome 扩展里的“路由工作台”：

- Popup：快速收藏当前页
- Side Panel：主工作台，负责浏览、搜索、分组、最近访问
- Options：同步、导入导出、隐私设置
- Background：事件监听、访问记录、同步调度

## 2. MVP 范围

第一阶段只做最短闭环：

- 收藏当前 Tab
- 本地持久化
- 分组管理
- 收藏列表展示
- 搜索
- 最近访问记录

不在 MVP 的内容：

- WebDAV / REST 同步
- 团队共享
- 脱敏规则
- 批量编辑
- 高级筛选

## 3. 页面与职责

### Popup

目标：轻操作、低打扰。

包含：

- 当前页面信息预览
- “收藏当前路由”按钮
- 最近收藏的若干条记录
- 同步状态摘要

### Side Panel

目标：承接主工作流，尽量贴近设计稿。

包含：

- 左侧导航
- 顶部横幅 / 主行动区
- 分组卡片区
- 搜索 / 排序 / 视图切换
- 最近访问表格

### Options

目标：放“低频但重要”的配置。

包含：

- Chrome Sync 开关
- 导入 / 导出
- 数据清理
- 隐私说明

### Background Service Worker

目标：让 UI 只关心交互，状态与监听放后台统一处理。

包含：

- 监听 tab 激活 / 更新
- 记录访问历史
- 存储同步
- 存储变更广播

## 4. 技术选型

- Chrome Extension Manifest V3
- TypeScript
- React
- Vite
- Zustand
- 样式层当前先用原生 CSS 起步，等主链路稳定后再接 Tailwind CSS

建议补充：

- `zod`：约束存储结构
- `dayjs`：时间展示
- `nanoid`：ID 生成
- `clsx`：样式拼接

## 5. 数据模型

```ts
export type RouteItem = {
  id: string
  url: string
  path: string
  title: string
  icon?: string
  groupId?: string
  tags: string[]
  note?: string
  env?: 'dev' | 'staging' | 'prod'
  starred: boolean
  createdAt: string
  updatedAt: string
  lastVisitedAt?: string
  visitCount: number
}

export type RouteGroup = {
  id: string
  name: string
  color?: string
  sort: number
  createdAt: string
  updatedAt: string
}

export type VisitRecord = {
  id: string
  routeId?: string
  title: string
  url: string
  path: string
  visitedAt: string
}

export type AppSettings = {
  dedupeByUrl: boolean
  syncProvider: 'local' | 'chrome-sync' | 'webdav' | 'rest'
  enableVisitTracking: boolean
  viewMode: 'grid' | 'list'
}
```

## 6. 存储策略

### 本地存储

默认使用 `chrome.storage.local` 存完整数据：

- `routes`
- `groups`
- `visits`
- `settings`

### Chrome 同步

第二阶段接入 `chrome.storage.sync`，策略如下：

- `local` 保存完整数据
- `sync` 保存精简快照或分片
- `sync` 失败时不影响本地使用

建议键名：

- `opentab_meta`
- `opentab_routes_0`
- `opentab_routes_1`
- `opentab_groups`
- `opentab_settings`

## 7. 目录结构

```text
docs/
  chrome-tab-tracker-spec.md
  chrome-usage.md
  development-rhythm.md
  frozen-requirements.md
  implementation-tasks.md

src/
  manifest.ts
  background/
    index.ts
    listeners/
      runtime.ts
      storage.ts
      tabs.ts
    sync/
      chrome-sync.ts
      sync-manager.ts
      webdav-sync.ts
  popup/
    main.tsx
    App.tsx
    components/
      QuickAddCard.tsx
      RecentList.tsx
      SyncStatus.tsx
  sidepanel/
    main.tsx
    App.tsx
    pages/
      DashboardPage.tsx
      AllRoutesPage.tsx
      RecentPage.tsx
      TagsPage.tsx
      SettingsEntryPage.tsx
    components/
      Sidebar.tsx
      HeroBanner.tsx
      SearchBar.tsx
      ViewToggle.tsx
      GroupSection.tsx
      RouteCard.tsx
      RouteListRow.tsx
      RecentTable.tsx
  options/
    main.tsx
    App.tsx
    pages/
      SyncSettingsPage.tsx
      ImportExportPage.tsx
      PrivacyPage.tsx
  stores/
    route-store.ts
    group-store.ts
    history-store.ts
    settings-store.ts
  services/
    route-service.ts
    group-service.ts
    history-service.ts
    settings-service.ts
  repositories/
    local-repo.ts
    sync-repo.ts
  lib/
    chrome.ts
    storage.ts
    url.ts
    dedupe.ts
    time.ts
    constants.ts
  types/
    route.ts
    group.ts
    settings.ts
    history.ts
```

## 8. 开发顺序

### 阶段 1：工程初始化

- 搭建 Vite + React + TypeScript
- 配置 MV3 manifest
- 配置 popup / sidepanel / options / background 入口
- 跑通本地构建与加载

## 本地开发

### 安装依赖

```bash
npm install
```

### 构建扩展

```bash
npm run build
```

构建完成后会生成 `dist/`，并且会自动把插件版本号递增 1 个 patch 版本。可以在 Chrome 扩展管理页通过“加载已解压的扩展程序”加载这个目录。

### 本地预览

```bash
npm run dev
```

当前已经接好三个页面入口：

- `popup.html`
- `sidepanel.html`
- `options.html`

### 阶段 2：数据底座

- 定义类型
- 封装 `chrome.storage.local`
- 建 repository / service / store 三层

### 阶段 3：MVP 页面

- popup 快速收藏
- sidepanel 收藏看板
- 分组 CRUD
- 最近访问表格

### 阶段 4：同步能力

- 接入 `chrome.storage.sync`
- 实现双写
- 存储变更刷新 UI
- 处理配额与降级

### 阶段 5：增强能力

- 导入导出
- 标签管理
- 批量打开分组
- WebDAV / REST 预留

## 9. 开发约定

### 状态分层

- `repositories/`：只负责读写存储
- `services/`：只负责业务规则
- `stores/`：只负责 UI 状态聚合

### 命名约定

- 页面组件：`xxxPage.tsx`
- 展示组件：`PascalCase.tsx`
- service / repo / store：`kebab-case.ts`

### 组件原则

- Popup 保持轻量
- Side Panel 承担主复杂度
- Background 不处理 UI
- 同步逻辑不要散落在页面组件里

## 10. 下一步建议

按现在的仓库状态，建议立刻进入这三个动作：

1. 初始化前端工程与扩展打包配置
2. 把 `types + repositories + services` 先写出来
3. 先做 popup 收藏当前页闭环

如果只选一个起点，优先做第 3 步，因为它最容易验证产品方向。
