# OpenTab — Chrome 扩展开发指南

## 项目简介

OpenTab 是一个 Chrome Manifest V3 扩展，用于日常开发和后端工作流管理。用户可以收藏当前路由、管理分组、追踪最近访问、通过 WebDAV 跨设备同步数据。

当前版本：`0.1.34`，构建时自增 patch 版本号。

---

## 技术栈

- **平台**: Chrome Extension Manifest V3
- **语言**: TypeScript 5.8 (strict mode)
- **UI**: React 19.1 + JSX (react-jsx transform)
- **构建**: Vite 7 + @vitejs/plugin-react 5
- **样式**: 纯 CSS（无 CSS-in-JS）
- **无测试框架、无 linter**

## 目录结构

```
popup.html / sidepanel.html / options.html / manager.html  — 四个 HTML 入口
src/
├── background/index.ts          — Service Worker（侧栏初始化、访问追踪）
├── popup/                       — 弹出窗口（快速添加、最近列表）
│   ├── main.tsx / App.tsx / styles.css
│   └── components/ (QuickAddCard, RecentList, SyncStatus)
├── sidepanel/                   — 侧栏面板（主工作区）
│   ├── main.tsx / App.tsx / styles.css
│   ├── components/ (Sidebar, SearchBar, RouteCard, GroupSection 等)
│   └── pages/ (Dashboard, AllRoutes, RecentVisits, Tags, Backup 等)
├── options/                     — 设置页
│   ├── main.tsx / App.tsx / styles.css / hooks.ts
│   └── pages/ (SyncSettings, ImportExport, Privacy)
├── services/                    — 业务逻辑层
│   ├── route-service.ts         — 路由 CRUD、星标、移动、编辑
│   ├── group-service.ts         — 分组 CRUD（分组名唯一）
│   ├── history-service.ts        — 最近访问记录（最多 10 条）
│   ├── tag-service.ts           — 标签 CRUD（标签名唯一）
│   ├── settings-service.ts      — 设置加载/更新
│   └── webdav-sync-service.ts   — WebDAV 客户端（PUT/GET/DELETE/PROPFIND）
├── repositories/
│   └── local-repo.ts            — chrome.storage.local 所有读写 + 快照管理
├── lib/
│   ├── chrome.ts                — Chrome Tab API 封装、路由探测
│   ├── storage.ts               — chrome.storage.local/sync 泛型封装
│   ├── url.ts                   — URL 解析（路径提取、favicon、标准化）
│   ├── dedupe.ts                — 基于 URL 的去重
│   ├── time.ts                  — 时间戳/日期格式化/近期判断
│   ├── constants.ts             — 存储键、默认分组、默认设置
│   └── backup.ts                — gzip 压缩的 .opentab 备份编解码
├── types/                       — TypeScript 类型定义
│   ├── route.ts (RouteItem)
│   ├── group.ts (RouteGroup)
│   ├── settings.ts (AppSettings)
│   ├── history.ts (VisitRecord)
│   └── tag.ts (RouteTag)
├── stores/                      — 占位（计划使用 Zustand）
├── global.css                   — 全局重置样式
└── manifest.ts                  — 占位
```

## 构建命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Vite 开发服务器 |
| `npm run build` | 自增 patch 版本 → tsc 类型检查 → vite 打包到 dist/ |
| `npm run preview` | 预览构建产物 |

构建流程：`scripts/bump-extension-version.mjs` 自动递增 `package.json` 版本号。

## 架构分层

```
React 组件  →  Services（业务逻辑）  →  Repositories（数据访问）  →  Lib（工具函数）
                 ↓ 使用 Chrome API、WebDAV 等外部服务
```

## 数据存储

- **chrome.storage.local**: 所有业务数据持久化
- **chrome.storage.sync**: 计划中（占位文件）
- **WebDAV**: 快照备份/恢复、跨设备同步（基本认证）

## 重要约束

- 分组名称必须唯一
- 路由通过 URL 去重
- 最近访问最多保留 10 条
- 标签名称必须唯一
- 构建时自动更新 manifest.json 版本号
- 备份格式：gzip 压缩 JSON，魔数头 `OPENTAB_BACKUP_V1`

## 外部集成

- Chrome Extension API（tabs, storage, sidePanel, runtime, scripting, windows）
- WebDAV 服务（用户配置 URL/账号/密码）
- Google Favicon 服务（`https://www.google.com/s2/favicons?domain=...`）

## 开发约定

- 代码风格：优先自解释代码，少写注释
- 在已有文件上编辑，不轻易新建文件
- 不使用 emoji
- 技术决策优先参考 `docs/frozen-requirements.md`（硬性冻结需求，不可随意修改）
