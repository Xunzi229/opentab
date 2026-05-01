# OpenTab — Chrome 扩展开发指南

## 项目简介

OpenTab 是一个 Chrome Manifest V3 扩展，用于日常开发和后端工作流管理。用户可以收藏当前路由、管理分组、追踪最近访问、通过 WebDAV 跨设备同步数据。

当前版本：`0.1.112`，构建时自增 patch 版本号。

---

## 技术栈

- **平台**: Chrome Extension Manifest V3
- **语言**: TypeScript 5.8 (strict mode)
- **UI**: React 19.1 + JSX (react-jsx transform)
- **构建**: Vite 7 + @vitejs/plugin-react 5
- **样式**: 纯 CSS（无 CSS-in-JS）
- **测试**: Node.js 内置 test runner（`node --test`）
- **无 linter**

## 目录结构

```
popup.html / sidepanel.html / options.html / manager.html / share.html  — 五个 HTML 入口
src/
├── background/                  — Service Worker
│   ├── index.ts                 — 入口（侧栏初始化、访问追踪、命令监听、消息处理）
│   ├── listeners/               — 事件监听器（占位：runtime.ts, storage.ts, tabs.ts）
│   └── sync/                    — 同步模块（占位：chrome-sync.ts, sync-manager.ts, webdav-sync.ts）
├── popup/                       — 弹出窗口（快速添加、最近列表）
│   ├── main.tsx / App.tsx / styles.css
│   └── components/ (QuickAddCard, RecentList, SyncStatus)
├── sidepanel/                   — 侧栏面板（主工作区）
│   ├── main.tsx / App.tsx / styles.css
│   ├── components/ (Sidebar, SearchBar, RouteCard, RouteListRow, GroupSection,
│   │                HeroBanner, ViewToggle, RecentTable, ShareDialog, ToastProvider)
│   └── pages/ (Dashboard, AllRoutes, RecentVisits, RecentPage, Tags,
│              SettingsEntry, Import, Export, Backup)
├── share/                       — 分享页面（独立入口，导入分享的分组）
│   ├── main.tsx / App.tsx
├── options/                     — 设置页
│   ├── main.tsx / App.tsx / styles.css / hooks.ts
│   └── pages/ (SyncSettings, ImportExport, Privacy)
├── services/                    — 业务逻辑层
│   ├── route-service.ts         — 路由 CRUD、星标、移动、编辑、排序
│   ├── group-service.ts         — 分组 CRUD、锁定、置顶、排序
│   ├── history-service.ts       — 最近访问记录（最多 10 条）
│   ├── tag-service.ts           — 标签 CRUD（标签名唯一）
│   ├── settings-service.ts      — 设置加载/更新
│   ├── webdav-sync-service.ts   — WebDAV 客户端（PUT/GET/DELETE/PROPFIND + 版本化备份）
│   ├── chrome-sync-service.ts   — Chrome Storage Sync 同步（80KB 限制）
│   └── tab-workspace-service.ts — 批量标签页操作（收起全部标签、恢复路由）
├── repositories/
│   ├── local-repo.ts            — chrome.storage.local 所有读写 + 快照 + WebDAV 配置版本管理
│   └── sync-repo.ts             — 占位
├── lib/
│   ├── chrome.ts                — Chrome Tab API 封装、页面路由探测
│   ├── storage.ts               — chrome.storage.local/sync 泛型封装
│   ├── url.ts                   — URL 解析（路径提取、favicon、标准化）
│   ├── dedupe.ts                — 基于 URL 的去重
│   ├── time.ts                  — 时间戳/日期格式化/近期判断
│   ├── constants.ts             — 存储键、默认分组、默认设置
│   ├── backup.ts                — JSZip 压缩的 .opentab.zip 备份编解码（兼容旧版 gzip）
│   ├── crypto.ts                — AES-GCM 加密/解密（WebDAV 密码加密存储）
│   ├── env-utils.ts             — 环境变量替换、curl/fetch 代码生成
│   ├── group-collapse.ts        — 分组折叠状态管理
│   ├── group-ui.ts              — 分组 UI 辅助函数
│   ├── popup-ui.ts              — Popup UI 辅助函数
│   └── backup-ui.ts             — 备份 UI 消息格式化
├── stores/                      — 占位（均为空模块）
├── types/                       — TypeScript 类型定义
│   ├── route.ts (RouteItem, Environment)
│   ├── group.ts (RouteGroup)
│   ├── settings.ts (AppSettings)
│   ├── history.ts (VisitRecord)
│   └── tag.ts (RouteTag)
├── global.css                   — 全局重置样式
└── manifest.ts                  — 占位
```

## 构建命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Vite 开发服务器 |
| `npm run test` | 运行 Node.js 内置测试（`node --test`） |
| `npm run build` | 自增 patch 版本 → tsc 类型检查 → vite 打包到 dist/ |
| `npm run preview` | 预览构建产物 |

构建流程：`scripts/bump-extension-version.mjs` 自动递增 `package.json` 版本号。

## 架构分层

```
React 组件  →  Services（业务逻辑）  →  Repositories（数据访问）  →  Lib（工具函数）
                 ↓ 使用 Chrome API、WebDAV 等外部服务
```

## 数据存储

- **chrome.storage.local**: 所有业务数据持久化（路由、分组、标签、访问记录、设置、WebDAV 配置版本）
- **chrome.storage.sync**: Chrome 同步（80KB 限制，同步路由/分组/标签）
- **WebDAV**: 版本化快照备份/恢复、跨设备同步（基本认证，密码 AES-GCM 加密存储）

## 重要约束

- 分组名称必须唯一（去首尾空格后比较）
- 路由通过 URL 去重（标准化后比较）
- 最近访问最多保留 10 条
- 标签名称必须唯一（去首尾空格后比较）
- 构建时自动更新 manifest.json 版本号
- 备份格式：JSZip 压缩的 `.opentab.zip`，包含 `manifest.json`（魔数 `OPENTAB_BACKUP_V1`）、`archive.json`、`snapshot.json`、`webdav-configs.json`；兼容旧版 gzip 格式

## 外部集成

- Chrome Extension API（tabs, storage, sidePanel, runtime, scripting, windows, commands）
- WebDAV 服务（用户配置 URL/账号/密码，支持版本化备份轮转）
- Chrome Storage Sync（跨设备同步，80KB 限制）
- Google Favicon 服务（`https://www.google.com/s2/favicons?domain=...`）

## 开发约定

- 代码风格：优先自解释代码，少写注释
- 在已有文件上编辑，不轻易新建文件
- 不使用 emoji
- 技术决策优先参考 `docs/frozen-requirements.md`（硬性冻结需求，不可随意修改）
