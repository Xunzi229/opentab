# Phase 2: 半成品完善 + 基础体验优化 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 填充空壳页面、实现视图模式切换、实现 Chrome Storage Sync、修复 WebDAV 密码安全、增强搜索和快捷键体验。

**Architecture:** 扩展现有服务和组件，不引入新框架。Chrome Sync 复用现有 storage.ts 封装，WebDAV 密码使用 SubtleCrypto 加密，视图模式通过 App 层状态传递。

**Tech Stack:** TypeScript, React 19, Chrome Extension API (storage.sync), SubtleCrypto

**注意:** 项目无测试框架，验收以 `npm run build` + 手动功能测试为主。

---

## 文件结构总览

### 新建文件
- `src/services/chrome-sync-service.ts` — Chrome Storage Sync 服务
- `src/lib/crypto.ts` — 密码加密/解密工具

### 修改文件
- `src/sidepanel/pages/RecentPage.tsx` — 填充空壳页面
- `src/sidepanel/pages/SettingsEntryPage.tsx` — 填充空壳页面
- `src/sidepanel/components/ViewToggle.tsx` — 实现视图切换
- `src/sidepanel/App.tsx` — 传递 viewMode 到子页面
- `src/sidepanel/pages/DashboardPage.tsx` — 接收 viewMode，grid/list 布局
- `src/sidepanel/pages/AllRoutesPage.tsx` — 接收 viewMode，grid/list 布局
- `src/sidepanel/styles.css` — grid/list 布局样式
- `src/repositories/local-repo.ts` — WebDAV 配置版本不再存储密码
- `src/services/webdav-sync-service.ts` — 密码加密存储
- `src/options/pages/SyncSettingsPage.tsx` — Chrome Sync 选项、密码字段改 password 类型
- `src/sidepanel/components/SearchBar.tsx` — 搜索高亮
- `src/sidepanel/pages/DashboardPage.tsx` — 空状态引导
- `src/background/index.ts` — 快捷键监听

---

## Task 1: 填充 RecentPage

**Files:**
- Modify: `src/sidepanel/pages/RecentPage.tsx`

- [ ] **Step 1: 实现 RecentPage**

将 `src/sidepanel/pages/RecentPage.tsx` 从空壳改为完整实现：

```tsx
import { useState, useEffect } from "react"
import { getVisits } from "../../repositories/local-repo"
import type { VisitRecord } from "../../types/history"

export function RecentPage() {
  const [visits, setVisits] = useState<VisitRecord[]>([])
  const [search, setSearch] = useState("")

  const load = async () => {
    const data = await getVisits()
    setVisits(data.sort((a, b) => b.visitedAt.localeCompare(a.visitedAt)))
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const handler = () => load()
    chrome.storage.onChanged.addListener(handler)
    return () => chrome.storage.onChanged.removeListener(handler)
  }, [])

  const filtered = search
    ? visits.filter(v => v.title.toLowerCase().includes(search.toLowerCase()) || v.url.toLowerCase().includes(search.toLowerCase()))
    : visits

  const handleClear = async () => {
    const { saveVisits } = await import("../../repositories/local-repo")
    await saveVisits([])
    setVisits([])
  }

  return (
    <div className="recent-page">
      <div className="page-header">
        <h2>最近访问</h2>
        {visits.length > 0 && (
          <button className="clear-btn" onClick={handleClear}>清空</button>
        )}
      </div>
      <input
        className="search-input"
        placeholder="搜索最近访问..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>{visits.length === 0 ? "暂无访问记录" : "没有匹配的记录"}</p>
        </div>
      ) : (
        <ul className="visit-list">
          {filtered.map(v => (
            <li key={v.id} className="visit-item">
              <a href={v.url} target="_blank" rel="noopener noreferrer">{v.title}</a>
              <span className="visit-time">{new Date(v.visitedAt).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 添加样式**

在 `src/sidepanel/styles.css` 中添加：

```css
.recent-page { padding: 12px; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.page-header h2 { font-size: 16px; font-weight: 600; }
.clear-btn { padding: 4px 10px; font-size: 12px; background: #fce8e6; color: #d93025; border: none; border-radius: 4px; cursor: pointer; }
.search-input { width: 100%; padding: 8px 10px; border: 1px solid #e8eaed; border-radius: 6px; font-size: 13px; margin-bottom: 12px; box-sizing: border-box; }
.visit-list { list-style: none; }
.visit-item { padding: 8px 0; border-bottom: 1px solid #f1f3f4; display: flex; justify-content: space-between; align-items: center; }
.visit-item a { color: #1a73e8; text-decoration: none; font-size: 13px; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.visit-time { font-size: 11px; color: #80868b; margin-left: 8px; white-space: nowrap; }
.empty-state { text-align: center; padding: 32px 0; color: #80868b; font-size: 13px; }
```

- [ ] **Step 3: 验证构建**

Run: `npm run build`
Expected: 构建成功

- [ ] **Step 4: Commit**

```bash
git add src/sidepanel/pages/RecentPage.tsx src/sidepanel/styles.css
git commit -m "feat: implement RecentPage with search and clear"
```

---

## Task 2: 填充 SettingsEntryPage

**Files:**
- Modify: `src/sidepanel/pages/SettingsEntryPage.tsx`

- [ ] **Step 1: 实现 SettingsEntryPage**

将 SettingsEntryPage 改为设置入口页，集中展示设置项并链接到 Options 页面：

```tsx
import { useState, useEffect } from "react"
import { loadSettings, updateSettings } from "../../services/settings-service"
import type { AppSettings } from "../../types/settings"

export function SettingsEntryPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null)

  useEffect(() => {
    loadSettings().then(setSettings)
  }, [])

  const handleToggleVisitTracking = async () => {
    if (!settings) return
    const updated = await updateSettings({ enableVisitTracking: !settings.enableVisitTracking })
    setSettings(updated)
  }

  const handleOpenOptions = () => {
    chrome.runtime.openOptionsPage()
  }

  if (!settings) return <div className="settings-entry-page">加载中...</div>

  return (
    <div className="settings-entry-page">
      <h2>设置</h2>
      <div className="settings-list">
        <div className="settings-item">
          <div className="settings-item-info">
            <span className="settings-label">访问追踪</span>
            <span className="settings-desc">记录路由访问次数和最近访问</span>
          </div>
          <button
            className={`toggle-btn ${settings.enableVisitTracking ? "on" : "off"}`}
            onClick={handleToggleVisitTracking}
          >
            {settings.enableVisitTracking ? "开启" : "关闭"}
          </button>
        </div>
        <div className="settings-item clickable" onClick={handleOpenOptions}>
          <div className="settings-item-info">
            <span className="settings-label">同步与备份</span>
            <span className="settings-desc">WebDAV 同步、Chrome Sync、导入导出</span>
          </div>
          <span className="settings-arrow">→</span>
        </div>
        <div className="settings-item clickable" onClick={handleOpenOptions}>
          <div className="settings-item-info">
            <span className="settings-label">隐私与安全</span>
            <span className="settings-desc">数据存储、隐私说明</span>
          </div>
          <span className="settings-arrow">→</span>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 添加样式**

在 `src/sidepanel/styles.css` 中：

```css
.settings-entry-page { padding: 12px; }
.settings-entry-page h2 { font-size: 16px; font-weight: 600; margin-bottom: 16px; }
.settings-list { display: flex; flex-direction: column; gap: 2px; }
.settings-item { display: flex; align-items: center; justify-content: space-between; padding: 12px; background: #fff; border: 1px solid #e8eaed; border-radius: 8px; }
.settings-item.clickable { cursor: pointer; }
.settings-item.clickable:hover { background: #f8f9fa; }
.settings-item-info { display: flex; flex-direction: column; gap: 2px; }
.settings-label { font-size: 13px; font-weight: 500; }
.settings-desc { font-size: 11px; color: #80868b; }
.toggle-btn { padding: 4px 12px; border: none; border-radius: 4px; font-size: 12px; cursor: pointer; }
.toggle-btn.on { background: #e6f4ea; color: #137333; }
.toggle-btn.off { background: #fce8e6; color: #d93025; }
.settings-arrow { font-size: 14px; color: #80868b; }
```

- [ ] **Step 3: 验证构建**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/sidepanel/pages/SettingsEntryPage.tsx src/sidepanel/styles.css
git commit -m "feat: implement SettingsEntryPage with quick toggles"
```

---

## Task 3: 实现视图模式切换

**Files:**
- Modify: `src/sidepanel/components/ViewToggle.tsx`
- Modify: `src/sidepanel/App.tsx`
- Modify: `src/sidepanel/pages/DashboardPage.tsx`
- Modify: `src/sidepanel/pages/AllRoutesPage.tsx`
- Modify: `src/sidepanel/styles.css`

- [ ] **Step 1: 重写 ViewToggle 组件**

将 ViewToggle 从占位改为实际可用的切换组件：

```tsx
interface ViewToggleProps {
  mode: "grid" | "list"
  onChange: (mode: "grid" | "list") => void
}

export function ViewToggle({ mode, onChange }: ViewToggleProps) {
  return (
    <div className="view-toggle">
      <button
        className={`view-toggle-btn ${mode === "grid" ? "active" : ""}`}
        onClick={() => onChange("grid")}
        title="网格视图"
      >
        ▦
      </button>
      <button
        className={`view-toggle-btn ${mode === "list" ? "active" : ""}`}
        onClick={() => onChange("list")}
        title="列表视图"
      >
        ☰
      </button>
    </div>
  )
}
```

- [ ] **Step 2: 修改 App.tsx 管理 viewMode 状态**

在 App.tsx 中加载 viewMode 设置并传递给子页面：

```tsx
// 在 App 组件中添加
const [viewMode, setViewMode] = useState<"grid" | "list">("list")

useEffect(() => {
  loadSettings().then(s => setViewMode(s.viewMode || "list"))
}, [])

const handleViewModeChange = async (mode: "grid" | "list") => {
  setViewMode(mode)
  await updateSettings({ viewMode: mode })
}

// 传递给 DashboardPage 和 AllRoutesPage
<DashboardPage viewMode={viewMode} onViewModeChange={handleViewModeChange} />
<AllRoutesPage viewMode={viewMode} onViewModeChange={handleViewModeChange} />
```

- [ ] **Step 3: 修改 DashboardPage 接收 viewMode**

在 DashboardPage 中：
1. 接收 `viewMode` 和 `onViewModeChange` props
2. 将 `viewMode` 传递给 ViewToggle
3. 为路由卡片容器添加 `viewMode` class

```tsx
// props 中添加
viewMode?: "grid" | "list"
onViewModeChange?: (mode: "grid" | "list") => void

// ViewToggle 使用
<ViewToggle mode={viewMode || "list"} onChange={onViewModeChange || (() => {})} />

// 路由卡片容器
<div className={`route-list ${viewMode === "grid" ? "route-grid" : "route-list-view"}`}>
  {routes.map(r => <RouteCard ... />)}
</div>
```

- [ ] **Step 4: 修改 AllRoutesPage 同样接收 viewMode**

与 DashboardPage 相同的模式。

- [ ] **Step 5: 添加 grid/list 布局样式**

在 `src/sidepanel/styles.css` 中：

```css
.view-toggle { display: flex; gap: 2px; }
.view-toggle-btn { padding: 4px 8px; border: 1px solid #e8eaed; background: #fff; cursor: pointer; font-size: 14px; }
.view-toggle-btn.active { background: #e8f0fe; border-color: #1a73e8; color: #1a73e8; }
.view-toggle-btn:first-child { border-radius: 4px 0 0 4px; }
.view-toggle-btn:last-child { border-radius: 0 4px 4px 0; }

/* Grid 布局 */
.route-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.route-grid .route-card { margin: 0; }

/* List 布局 */
.route-list-view { display: flex; flex-direction: column; gap: 4px; }
.route-list-view .route-card { margin: 0; }
```

- [ ] **Step 6: 验证构建**

Run: `npm run build`

- [ ] **Step 7: Commit**

```bash
git add src/sidepanel/components/ViewToggle.tsx src/sidepanel/App.tsx src/sidepanel/pages/DashboardPage.tsx src/sidepanel/pages/AllRoutesPage.tsx src/sidepanel/styles.css
git commit -m "feat: implement grid/list view mode toggle"
```

---

## Task 4: Chrome Storage Sync 服务

**Files:**
- Create: `src/services/chrome-sync-service.ts`
- Modify: `src/options/pages/SyncSettingsPage.tsx`

- [ ] **Step 1: 创建 Chrome Sync 服务**

创建 `src/services/chrome-sync-service.ts`：

```typescript
import { getStorageValue, setStorageValue } from "../lib/storage"
import { STORAGE_KEYS } from "../lib/constants"
import type { RouteItem } from "../types/route"
import type { RouteGroup } from "../types/group"
import type { RouteTag } from "../types/tag"

interface SyncData {
  routes: RouteItem[]
  groups: RouteGroup[]
  tags: RouteTag[]
  lastSynced: string
}

const SYNC_KEY = "opentab_sync_data"
const SYNC_SIZE_LIMIT = 80 * 1024 // 80KB (留 20KB 余量)

export async function syncToChrome(): Promise<{ success: boolean; error?: string }> {
  try {
    const routes = await getStorageValue<RouteItem[]>(STORAGE_KEYS.routes, [])
    const groups = await getStorageValue<RouteGroup[]>(STORAGE_KEYS.groups, [])
    const tags = await getStorageValue<RouteTag[]>(STORAGE_KEYS.tags, [])

    const data: SyncData = { routes, groups, tags, lastSynced: new Date().toISOString() }
    const serialized = JSON.stringify(data)

    if (serialized.length > SYNC_SIZE_LIMIT) {
      return { success: false, error: `数据量 ${(serialized.length / 1024).toFixed(1)}KB 超出同步限制 80KB，请清理数据或使用 WebDAV 同步` }
    }

    await setStorageValue(SYNC_KEY, data, "sync")
    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function syncFromChrome(): Promise<{ success: boolean; error?: string }> {
  try {
    const data = await getStorageValue<SyncData | null>(SYNC_KEY, null, "sync")
    if (!data) {
      return { success: false, error: "云端无同步数据" }
    }

    await setStorageValue(STORAGE_KEYS.routes, data.routes)
    await setStorageValue(STORAGE_KEYS.groups, data.groups)
    await setStorageValue(STORAGE_KEYS.tags, data.tags)
    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function getChromeSyncStatus(): Promise<{ lastSynced: string | null; dataSize: number }> {
  const data = await getStorageValue<SyncData | null>(SYNC_KEY, null, "sync")
  return {
    lastSynced: data?.lastSynced ?? null,
    dataSize: data ? JSON.stringify(data).length : 0,
  }
}
```

- [ ] **Step 2: 修改 storage.ts 支持 area 参数**

检查 `src/lib/storage.ts` 的 `getStorageValue` 和 `setStorageValue` 是否已支持 `area` 参数。如已支持则跳过。如需修改，确保默认为 `"local"` 但可传 `"sync"`。

- [ ] **Step 3: 更新 SyncSettingsPage 添加 Chrome Sync 按钮**

在 `src/options/pages/SyncSettingsPage.tsx` 中添加 Chrome Sync 区域：

```tsx
import { syncToChrome, syncFromChrome, getChromeSyncStatus } from "../../services/chrome-sync-service"

// 在组件中添加状态和函数
const [syncStatus, setSyncStatus] = useState<{ lastSynced: string | null; dataSize: number }>({ lastSynced: null, dataSize: 0 })
const [syncing, setSyncing] = useState(false)

useEffect(() => {
  getChromeSyncStatus().then(setSyncStatus)
}, [])

const handlePushToChrome = async () => {
  setSyncing(true)
  const result = await syncToChrome()
  setSyncing(false)
  if (result.success) {
    getChromeSyncStatus().then(setSyncStatus)
    alert("同步成功")
  } else {
    alert(result.error)
  }
}

const handlePullFromChrome = async () => {
  setSyncing(true)
  const result = await syncFromChrome()
  setSyncing(false)
  if (result.success) {
    alert("拉取成功")
  } else {
    alert(result.error)
  }
}

// JSX
<div className="sync-section">
  <h3>Chrome Storage Sync</h3>
  <p className="sync-desc">通过 Chrome 账号同步，适合数据量小的场景（限制 80KB）</p>
  {syncStatus.lastSynced && <p className="sync-info">上次同步: {new Date(syncStatus.lastSynced).toLocaleString()}</p>}
  <p className="sync-info">数据大小: {(syncStatus.dataSize / 1024).toFixed(1)}KB / 80KB</p>
  <div className="sync-actions">
    <button onClick={handlePushToChrome} disabled={syncing}>推送数据到云端</button>
    <button onClick={handlePullFromChrome} disabled={syncing}>从云端拉取</button>
  </div>
</div>
```

- [ ] **Step 4: 验证构建**

Run: `npm run build`

- [ ] **Step 5: Commit**

```bash
git add src/services/chrome-sync-service.ts src/options/pages/SyncSettingsPage.tsx src/lib/storage.ts
git commit -m "feat: implement Chrome Storage Sync service"
```

---

## Task 5: WebDAV 密码安全

**Files:**
- Create: `src/lib/crypto.ts`
- Modify: `src/repositories/local-repo.ts`
- Modify: `src/options/pages/SyncSettingsPage.tsx`

- [ ] **Step 1: 创建加密工具**

创建 `src/lib/crypto.ts`：

```typescript
const ENCRYPTION_KEY_NAME = "opentab_encryption_key"

async function getKey(): Promise<CryptoKey> {
  const stored = await chrome.storage.local.get(ENCRYPTION_KEY_NAME)
  if (stored[ENCRYPTION_KEY_NAME]) {
    const raw = Uint8Array.from(atob(stored[ENCRYPTION_KEY_NAME]), c => c.charCodeAt(0))
    return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"])
  }
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"])
  const exported = await crypto.subtle.exportKey("raw", key)
  const encoded = btoa(String.fromCharCode(...new Uint8Array(exported)))
  await chrome.storage.local.set({ [ENCRYPTION_KEY_NAME]: encoded })
  return key
}

export async function encryptText(plainText: string): Promise<string> {
  const key = await getKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plainText)
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded)
  const ivStr = btoa(String.fromCharCode(...iv))
  const dataStr = btoa(String.fromCharCode(...new Uint8Array(encrypted)))
  return `${ivStr}:${dataStr}`
}

export async function decryptText(encryptedText: string): Promise<string> {
  const key = await getKey()
  const [ivStr, dataStr] = encryptedText.split(":")
  const iv = Uint8Array.from(atob(ivStr), c => c.charCodeAt(0))
  const data = Uint8Array.from(atob(dataStr), c => c.charCodeAt(0))
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data)
  return new TextDecoder().decode(decrypted)
}
```

- [ ] **Step 2: 修改 local-repo WebDAV 配置版本不存储密码**

在 `src/repositories/local-repo.ts` 的 `WebdavConfigVersion` 类型中移除 `password` 字段。保存配置版本时清除密码：

```typescript
export type WebdavConfigVersion = {
  url: string
  username: string
  filepath: string
  savedAt: string
}
```

- [ ] **Step 3: 修改 SyncSettingsPage 密码字段**

在 `src/options/pages/SyncSettingsPage.tsx` 中：
1. 密码输入框类型改为 `type="password"`
2. 保存 WebDAV 配置时使用 `encryptText` 加密密码
3. 加载配置时使用 `decryptText` 解密密码

- [ ] **Step 4: 修改 webdav-sync-service 解密密码**

在 `src/services/webdav-sync-service.ts` 中，使用 WebDAV 配置前先解密密码。

- [ ] **Step 5: 验证构建**

Run: `npm run build`

- [ ] **Step 6: Commit**

```bash
git add src/lib/crypto.ts src/repositories/local-repo.ts src/options/pages/SyncSettingsPage.tsx src/services/webdav-sync-service.ts
git commit -m "feat: encrypt WebDAV password with SubtleCrypto AES-GCM"
```

---

## Task 6: 搜索高亮 + 空状态引导

**Files:**
- Modify: `src/sidepanel/pages/AllRoutesPage.tsx`
- Modify: `src/sidepanel/pages/DashboardPage.tsx`
- Modify: `src/sidepanel/styles.css`

- [ ] **Step 1: 在 AllRoutesPage 添加搜索高亮**

创建高亮辅助函数，在搜索结果中高亮匹配文本：

```tsx
function highlightText(text: string, query: string): React.ReactNode {
  if (!query) return text
  const index = text.toLowerCase().indexOf(query.toLowerCase())
  if (index === -1) return text
  return (
    <>
      {text.slice(0, index)}
      <mark className="search-highlight">{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
  )
}

// 在 RouteCard 渲染时使用
// 由于 RouteCard 是独立组件，改为在 AllRoutesPage 中传递 highlightedTitle prop
```

由于 RouteCard 是独立组件，最佳方式是给 RouteCard 添加可选的 `highlightQuery` prop，在卡片内部高亮标题和 URL。

- [ ] **Step 2: 修改 RouteCard 支持高亮**

在 `src/sidepanel/components/RouteCard.tsx` 中：
1. 添加 `highlightQuery?: string` prop
2. 创建 `highlightText` 辅助函数
3. 在标题和 URL 渲染处使用高亮

- [ ] **Step 3: 在 DashboardPage 添加空状态引导**

当没有路由时显示引导页面：

```tsx
// 在分组列表为空时
{groupedRoutes.length === 0 && (
  <div className="empty-guide">
    <h3>欢迎使用 OpenTab</h3>
    <p>开始收藏你的第一个路由吧</p>
    <p>提示：点击上方"收起所有标签"可以快速保存当前打开的标签页</p>
  </div>
)}
```

- [ ] **Step 4: 添加样式**

```css
.search-highlight { background: #fff3cd; padding: 1px 2px; border-radius: 2px; }
.empty-guide { text-align: center; padding: 48px 24px; color: #5f6368; }
.empty-guide h3 { font-size: 18px; color: #202124; margin-bottom: 8px; }
.empty-guide p { font-size: 13px; margin-bottom: 4px; }
```

- [ ] **Step 5: 验证构建**

Run: `npm run build`

- [ ] **Step 6: Commit**

```bash
git add src/sidepanel/components/RouteCard.tsx src/sidepanel/pages/AllRoutesPage.tsx src/sidepanel/pages/DashboardPage.tsx src/sidepanel/styles.css
git commit -m "feat: add search highlight and empty state guide"
```

---

## Task 7: 快捷键支持

**Files:**
- Modify: `src/background/index.ts`
- Modify: `src/manifest.ts` 或 `dist/manifest.json` 构建逻辑

- [ ] **Step 1: 在 background 添加快捷键命令**

在 `src/background/index.ts` 中添加命令监听：

```typescript
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "send-all-tabs") {
    const { sendAllTabsToGroup } = await import("../services/tab-workspace-service")
    await sendAllTabsToGroup()
  }
})
```

- [ ] **Step 2: 在 manifest 中注册快捷键**

检查 `dist/manifest.json` 或构建脚本中的 `commands` 配置。需要添加：

```json
{
  "commands": {
    "send-all-tabs": {
      "suggested_key": {
        "default": "Ctrl+Shift+S",
        "mac": "Command+Shift+S"
      },
      "description": "收起所有标签页"
    }
  }
}
```

由于项目使用构建脚本生成 manifest.json，需要找到生成逻辑并添加 commands 配置。

- [ ] **Step 3: 验证构建**

Run: `npm run build`
检查 `dist/manifest.json` 中是否包含 commands 配置。

- [ ] **Step 4: Commit**

```bash
git add src/background/index.ts
git commit -m "feat: add keyboard shortcut Ctrl+Shift+S for send all tabs"
```

---

## Task 8: 最终集成测试

- [ ] **Step 1: 完整构建验证**

Run: `npm run build`
Expected: 构建成功，无错误

- [ ] **Step 2: 手动功能测试清单**

1. **RecentPage**: 打开侧栏 → 最近访问 → 验证列表显示、搜索、清空
2. **SettingsEntryPage**: 打开侧栏 → 设置 → 验证快捷开关、跳转选项页
3. **视图模式**: Dashboard → 切换 grid/list → 验证布局变化、刷新后保持
4. **Chrome Sync**: 选项页 → 推送数据 → 另一设备拉取 → 验证数据一致
5. **WebDAV 密码**: 选项页 → 配置 WebDAV → 验证密码不明文存储
6. **搜索高亮**: AllRoutes → 搜索 → 验证匹配文本高亮
7. **空状态**: 清空所有路由 → 验证引导页面显示
8. **快捷键**: Ctrl+Shift+S → 验证收起所有标签

- [ ] **Step 3: 最终 Commit**

```bash
git add -A
git commit -m "feat: phase 2 complete - UX improvements and sync"
```
