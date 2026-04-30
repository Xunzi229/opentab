# Phase 1: OneTab 核心能力补齐 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补齐 OpenTab 与 OneTab 的核心差距，实现一键收起/恢复标签页、拖拽排序、锁定/置顶分组、分享为网页。

**Architecture:** 新增 `tab-workspace-service` 处理标签页批量操作（收起/恢复），扩展现有 `group-service` 支持锁定/置顶/排序，使用 HTML5 Drag and Drop API 实现拖拽排序，新增 `share.html` 入口页面实现分享功能。

**Tech Stack:** TypeScript, React 19, Chrome Extension API (tabs, storage, sidePanel), HTML5 Drag and Drop

**注意:** 项目当前无测试框架，验收以手动功能测试为主。

---

## 文件结构总览

### 新建文件
- `src/services/tab-workspace-service.ts` — 标签页工作区服务（收起/恢复）
- `src/sidepanel/components/ShareDialog.tsx` — 分享对话框组件
- `src/sidepanel/components/ShareDialog.css` — 分享对话框样式
- `src/share.html` — 分享页面入口
- `src/share/main.tsx` — 分享页面 React 入口
- `src/share/App.tsx` — 分享页面组件
- `src/share/styles.css` — 分享页面样式

### 修改文件
- `src/types/group.ts` — 新增 isLocked, pinned, sortOrder 字段
- `src/services/group-service.ts` — 新增锁定/置顶/排序函数
- `src/services/route-service.ts` — 新增排序函数
- `src/repositories/local-repo.ts` — 新增批量保存路由函数
- `src/sidepanel/components/GroupSection.tsx` — 新增锁定/置顶按钮、拖拽支持
- `src/sidepanel/components/RouteCard.tsx` — 新增恢复按钮、拖拽支持
- `src/sidepanel/pages/DashboardPage.tsx` — 新增"收起所有标签"按钮
- `src/popup/App.tsx` — 新增"收起所有标签"按钮
- `src/sidepanel/components/Sidebar.tsx` — 视图类型无需变更
- `vite.config.ts` — 新增 share.html 入口

---

## Task 1: 数据模型扩展

**Files:**
- Modify: `src/types/group.ts`

- [ ] **Step 1: 扩展 RouteGroup 类型**

在 `src/types/group.ts` 中新增三个字段：

```typescript
export interface RouteGroup {
  id: string;
  name: string;
  color?: string;
  sort: number;
  isLocked: boolean;   // 锁定状态：不可删除、不可重命名、路由不可移出
  pinned: boolean;     // 置顶状态：始终显示在列表顶部
  createdAt: number;
  updatedAt: number;
}
```

- [ ] **Step 2: 更新 ensureDefaultGroups 默认值**

在 `src/services/group-service.ts` 的 `ensureDefaultGroups()` 中，创建默认分组时补充新字段默认值：

```typescript
const defaultGroup: RouteGroup = {
  id: generateId(),
  name: DEFAULT_GROUP_NAME,
  sort: 0,
  isLocked: false,
  pinned: false,
  createdAt: now,
  updatedAt: now,
};
```

- [ ] **Step 3: 更新 local-repo 数据迁移**

在 `src/repositories/local-repo.ts` 的 `getGroups()` 中添加向后兼容处理，确保旧数据缺少新字段时自动填充默认值：

```typescript
export async function getGroups(): Promise<RouteGroup[]> {
  const groups = await getStorageValue<RouteGroup[]>(STORAGE_KEYS.groups, []);
  const now = Date.now();
  return groups.map((g) => ({
    ...g,
    isLocked: g.isLocked ?? false,
    pinned: g.pinned ?? false,
    sort: g.sort ?? 0,
  }));
}
```

- [ ] **Step 4: 验证构建通过**

Run: `npm run build`
Expected: 构建成功，无类型错误

- [ ] **Step 5: Commit**

```bash
git add src/types/group.ts src/services/group-service.ts src/repositories/local-repo.ts
git commit -m "feat: extend RouteGroup with isLocked, pinned, sortOrder fields"
```

---

## Task 2: 分组锁定/置顶服务

**Files:**
- Modify: `src/services/group-service.ts`

- [ ] **Step 1: 新增锁定/置顶/排序函数**

在 `src/services/group-service.ts` 末尾追加：

```typescript
export async function toggleGroupLock(groupId: string): Promise<void> {
  const groups = await getGroups();
  const group = groups.find((g) => g.id === groupId);
  if (!group) return;
  group.isLocked = !group.isLocked;
  group.updatedAt = Date.now();
  await saveGroups(groups);
}

export async function toggleGroupPin(groupId: string): Promise<void> {
  const groups = await getGroups();
  const group = groups.find((g) => g.id === groupId);
  if (!group) return;
  group.pinned = !group.pinned;
  group.updatedAt = Date.now();
  await saveGroups(groups);
}

export async function reorderGroups(orderedIds: string[]): Promise<void> {
  const groups = await getGroups();
  const now = Date.now();
  orderedIds.forEach((id, index) => {
    const group = groups.find((g) => g.id === id);
    if (group) {
      group.sort = index;
      group.updatedAt = now;
    }
  });
  await saveGroups(groups);
}
```

- [ ] **Step 2: 修改 deleteGroup 检查锁定状态**

在 `src/services/group-service.ts` 的 `deleteGroup()` 开头添加锁定检查：

```typescript
export async function deleteGroup(groupId: string): Promise<void> {
  const groups = await getGroups();
  const group = groups.find((g) => g.id === groupId);
  if (!group) return;
  if (group.isLocked) {
    throw new Error("锁定的分组不可删除");
  }
  // ...existing logic
}
```

- [ ] **Step 3: 修改 renameGroup 检查锁定状态**

在 `src/services/group-service.ts` 的 `renameGroup()` 开头添加锁定检查：

```typescript
export async function renameGroup(groupId: string, newName: string): Promise<void> {
  const groups = await getGroups();
  const group = groups.find((g) => g.id === groupId);
  if (!group) return;
  if (group.isLocked) {
    throw new Error("锁定的分组不可重命名");
  }
  // ...existing logic
}
```

- [ ] **Step 4: 修改 getGroupedRoutes 排序逻辑**

在 `src/services/group-service.ts` 的 `getGroupedRoutes()` 中，修改排序逻辑使置顶分组始终在顶部：

```typescript
export async function getGroupedRoutes(): Promise<GroupedRoute[]> {
  // ...existing logic
  return groups
    .sort((a, b) => {
      // 置顶分组优先
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      // 同为置顶或非置顶，按 sort 排序
      return a.sort - b.sort;
    })
    .map(/* ...existing mapping logic */);
}
```

- [ ] **Step 5: 验证构建通过**

Run: `npm run build`
Expected: 构建成功

- [ ] **Step 6: Commit**

```bash
git add src/services/group-service.ts
git commit -m "feat: add group lock, pin, and reorder functions"
```

---

## Task 3: 标签页工作区服务

**Files:**
- Create: `src/services/tab-workspace-service.ts`

- [ ] **Step 1: 创建标签页工作区服务**

创建 `src/services/tab-workspace-service.ts`：

```typescript
import { getCurrentActiveTabSnapshot, type ActiveTabSnapshot } from "../lib/chrome";
import { saveRoute, type SaveRouteInput } from "./route-service";
import { createGroup } from "./group-service";
import { DEFAULT_GROUP_NAME } from "../lib/constants";

interface SendAllTabsOptions {
  excludePinned?: boolean;
  domainWhitelist?: string[];
}

/**
 * 收起当前窗口所有标签页，保存为新分组
 */
export async function sendAllTabsToGroup(
  options: SendAllTabsOptions = {}
): Promise<{ groupId: string; savedCount: number; skippedCount: number }> {
  const { excludePinned = true, domainWhitelist = [] } = options;

  // 获取当前窗口所有标签
  const tabs = await chrome.tabs.query({ currentWindow: true });

  // 过滤标签
  const filteredTabs = tabs.filter((tab) => {
    // 排除 chrome:// 等内部页面
    if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) {
      return false;
    }
    // 排除固定标签
    if (excludePinned && tab.pinned) {
      return false;
    }
    // 排除白名单域名
    if (domainWhitelist.length > 0) {
      try {
        const hostname = new URL(tab.url).hostname;
        if (domainWhitelist.some((d) => hostname.includes(d))) {
          return false;
        }
      } catch {
        return false;
      }
    }
    return true;
  });

  if (filteredTabs.length === 0) {
    return { groupId: "", savedCount: 0, skippedCount: tabs.length };
  }

  // 创建新分组
  const now = new Date();
  const groupName = `收起于 ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const group = await createGroup(groupName);

  // 保存路由
  let savedCount = 0;
  for (const tab of filteredTabs) {
    if (!tab.url) continue;
    const input: SaveRouteInput = {
      url: tab.url,
      title: tab.title || tab.url,
      icon: tab.favIconUrl,
      groupId: group.id,
    };
    await saveRoute(input);
    savedCount++;
  }

  // 关闭已保存的标签（保留当前标签和一个空白标签）
  const currentTab = tabs.find((t) => t.active);
  const tabIdsToClose = filteredTabs
    .filter((t) => t.id !== currentTab?.id)
    .map((t) => t.id!)
    .filter(Boolean);

  if (tabIdsToClose.length > 0) {
    await chrome.tabs.remove(tabIdsToClose);
  }

  return { groupId: group.id, savedCount, skippedCount: tabs.length - savedCount };
}

/**
 * 恢复单个路由为新标签页
 */
export async function restoreRoute(url: string): Promise<void> {
  await chrome.tabs.create({ url, active: false });
}

/**
 * 恢复分组中所有路由
 */
export async function restoreAllRoutes(
  routes: Array<{ url: string }>,
  deleteAfterRestore = false
): Promise<void> {
  for (const route of routes) {
    await chrome.tabs.create({ url: route.url, active: false });
  }
  // 注意：deleteAfterRestore 的删除逻辑由调用方处理（需要 groupId）
}
```

- [ ] **Step 2: 验证构建通过**

Run: `npm run build`
Expected: 构建成功

- [ ] **Step 3: Commit**

```bash
git add src/services/tab-workspace-service.ts
git commit -m "feat: add tab workspace service for send/restore tabs"
```

---

## Task 4: 路由拖拽排序服务

**Files:**
- Modify: `src/services/route-service.ts`
- Modify: `src/repositories/local-repo.ts`

- [ ] **Step 1: 在 RouteItem 类型中添加 sortOrder 字段**

在 `src/types/route.ts` 中：

```typescript
export interface RouteItem {
  // ...existing fields
  sortOrder: number;  // 排序序号，用于拖拽排序
}
```

- [ ] **Step 2: 在 local-repo 中添加批量保存函数**

在 `src/repositories/local-repo.ts` 末尾追加：

```typescript
export async function saveRoutes(routes: RouteItem[]): Promise<void> {
  await setStorageValue(STORAGE_KEYS.routes, routes);
}
```

注意：检查是否已存在 `saveRoutes` 函数，如已存在则跳过此步骤。

- [ ] **Step 3: 在 route-service 中添加排序函数**

在 `src/services/route-service.ts` 末尾追加：

```typescript
export async function reorderRoutes(groupId: string, orderedRouteIds: string[]): Promise<void> {
  const routes = await listRoutes();
  const now = Date.now();
  orderedRouteIds.forEach((id, index) => {
    const route = routes.find((r) => r.id === id);
    if (route) {
      route.sortOrder = index;
      route.updatedAt = now;
    }
  });
  await saveRoutes(routes);
}
```

- [ ] **Step 4: 更新 listRoutes 排序逻辑**

修改 `src/services/route-service.ts` 的 `listRoutes()`，按 sortOrder 排序：

```typescript
export async function listRoutes(): Promise<RouteItem[]> {
  const routes = await getRoutes();
  return routes.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}
```

- [ ] **Step 5: 更新 saveRoute 设置默认 sortOrder**

修改 `src/services/route-service.ts` 的 `saveRoute()`，新建路由时设置默认 sortOrder：

```typescript
const newRoute: RouteItem = {
  // ...existing fields
  sortOrder: existingRoutes.length,
};
```

- [ ] **Step 6: 验证构建通过**

Run: `npm run build`
Expected: 构建成功

- [ ] **Step 7: Commit**

```bash
git add src/types/route.ts src/services/route-service.ts src/repositories/local-repo.ts
git commit -m "feat: add route drag-and-drop reorder support"
```

---

## Task 5: UI — 收起所有标签按钮

**Files:**
- Modify: `src/sidepanel/pages/DashboardPage.tsx`
- Modify: `src/popup/App.tsx`

- [ ] **Step 1: 在 DashboardPage 添加"收起所有标签"按钮**

在 `src/sidepanel/pages/DashboardPage.tsx` 的顶部区域添加按钮：

```tsx
import { sendAllTabsToGroup } from "../../services/tab-workspace-service";

// 在组件内部添加状态
const [sending, setSending] = useState(false);
const [sendResult, setSendResult] = useState<string | null>(null);

// 添加按钮 JSX（放在页面顶部合适位置）
<button
  className="send-all-tabs-btn"
  disabled={sending}
  onClick={async () => {
    setSending(true);
    setSendResult(null);
    try {
      const result = await sendAllTabsToGroup();
      setSendResult(`已保存 ${result.savedCount} 个标签到新分组`);
      // 刷新分组列表
      await loadGroupedRoutes();
    } catch (err) {
      setSendResult(`操作失败: ${err}`);
    } finally {
      setSending(false);
    }
  }}
>
  {sending ? "收起中..." : "收起所有标签"}
</button>
{sendResult && <span className="send-result">{sendResult}</span>}
```

- [ ] **Step 2: 在 Popup 添加"收起所有标签"按钮**

在 `src/popup/App.tsx` 中添加：

```tsx
import { sendAllTabsToGroup } from "../services/tab-workspace-service";

// 在组件内部添加
const [sending, setSending] = useState(false);

// 添加按钮 JSX（放在"打开管理页面"按钮附近）
<button
  className="send-all-tabs-btn"
  disabled={sending}
  onClick={async () => {
    setSending(true);
    try {
      await sendAllTabsToGroup();
      // 刷新最近列表
      const routes = await listRoutes();
      setRecentRoutes(routes.slice(0, 5));
    } finally {
      setSending(false);
    }
  }}
>
  {sending ? "收起中..." : "收起所有标签"}
</button>
```

- [ ] **Step 3: 添加按钮样式**

在 `src/sidepanel/styles.css` 和 `src/popup/styles.css` 中添加：

```css
.send-all-tabs-btn {
  padding: 8px 16px;
  background: #1a73e8;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: background 0.2s;
}

.send-all-tabs-btn:hover:not(:disabled) {
  background: #1557b0;
}

.send-all-tabs-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.send-result {
  margin-left: 8px;
  font-size: 12px;
  color: #5f6368;
}
```

- [ ] **Step 4: 验证构建通过**

Run: `npm run build`
Expected: 构建成功

- [ ] **Step 5: Commit**

```bash
git add src/sidepanel/pages/DashboardPage.tsx src/popup/App.tsx src/sidepanel/styles.css src/popup/styles.css
git commit -m "feat: add 'send all tabs' button in sidepanel and popup"
```

---

## Task 6: UI — 恢复标签页按钮

**Files:**
- Modify: `src/sidepanel/components/GroupSection.tsx`
- Modify: `src/sidepanel/components/RouteCard.tsx`

- [ ] **Step 1: 在 RouteCard 添加"恢复"按钮**

在 `src/sidepanel/components/RouteCard.tsx` 中，操作按钮区域添加恢复按钮：

```tsx
import { restoreRoute } from "../../services/tab-workspace-service";

// 在操作按钮区域添加
<button
  className="route-action-btn restore-btn"
  title="在新标签页打开"
  onClick={() => restoreRoute(route.url)}
>
  ↗
</button>
```

- [ ] **Step 2: 在 GroupSection 添加"全部恢复"按钮**

在 `src/sidepanel/components/GroupSection.tsx` 的分组头部添加：

```tsx
import { restoreAllRoutes } from "../../services/tab-workspace-service";
import { removeRoute } from "../../services/route-service";

// 在分组头部按钮区域添加
<button
  className="group-action-btn restore-all-btn"
  title="全部恢复"
  onClick={async () => {
    await restoreAllRoutes(routes);
  }}
>
  全部恢复
</button>

// 添加"恢复并删除"按钮
<button
  className="group-action-btn restore-delete-btn"
  title="恢复并删除"
  onClick={async () => {
    await restoreAllRoutes(routes);
    for (const route of routes) {
      await removeRoute(route.id);
    }
    onRefresh?.();
  }}
>
  恢复并删除
</button>
```

- [ ] **Step 3: 添加样式**

在 `src/sidepanel/styles.css` 中：

```css
.restore-btn {
  color: #1a73e8;
}

.restore-all-btn {
  padding: 4px 8px;
  font-size: 12px;
  background: #e8f0fe;
  color: #1a73e8;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.restore-delete-btn {
  padding: 4px 8px;
  font-size: 12px;
  background: #fce8e6;
  color: #d93025;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-left: 4px;
}
```

- [ ] **Step 4: 验证构建通过**

Run: `npm run build`
Expected: 构建成功

- [ ] **Step 5: Commit**

```bash
git add src/sidepanel/components/GroupSection.tsx src/sidepanel/components/RouteCard.tsx src/sidepanel/styles.css
git commit -m "feat: add restore single/all tabs buttons in group and route cards"
```

---

## Task 7: UI — 拖拽排序

**Files:**
- Modify: `src/sidepanel/components/GroupSection.tsx`
- Modify: `src/sidepanel/components/RouteCard.tsx`
- Modify: `src/sidepanel/pages/DashboardPage.tsx` (或分组列表所在页面)

- [ ] **Step 1: 在 RouteCard 添加拖拽支持**

修改 `src/sidepanel/components/RouteCard.tsx`，添加拖拽属性：

```tsx
// 在组件的根元素上添加拖拽属性
<div
  className="route-card"
  draggable
  onDragStart={(e) => {
    e.dataTransfer.setData("application/opentab-route", JSON.stringify({
      routeId: route.id,
      groupId: route.groupId,
    }));
    e.dataTransfer.effectAllowed = "move";
  }}
  onDragOver={(e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    e.currentTarget.classList.add("drag-over");
  }}
  onDragLeave={(e) => {
    e.currentTarget.classList.remove("drag-over");
  }}
  onDrop={(e) => {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");
    // drop 逻辑由父组件 GroupSection 处理
    const data = JSON.parse(e.dataTransfer.getData("application/opentab-route"));
    onDropRoute?.(data.routeId, route.id);
  }}
>
```

- [ ] **Step 2: 在 GroupSection 处理路由拖拽**

在 `src/sidepanel/components/GroupSection.tsx` 中添加拖拽处理：

```tsx
import { reorderRoutes } from "../../services/route-service";

// 在 props 中新增
interface GroupSectionProps {
  // ...existing props
  onRefresh?: () => void;
}

// 添加拖拽处理函数
const handleDropRoute = async (draggedRouteId: string, targetRouteId: string) => {
  const routeIds = routes.map((r) => r.id);
  const dragIndex = routeIds.indexOf(draggedRouteId);
  const targetIndex = routeIds.indexOf(targetRouteId);
  if (dragIndex === -1 || targetIndex === -1 || dragIndex === targetIndex) return;

  // 重新排序
  const newOrder = [...routeIds];
  newOrder.splice(dragIndex, 1);
  newOrder.splice(targetIndex, 0, draggedRouteId);
  await reorderRoutes(group.id, newOrder);
  onRefresh?.();
};

// 传递给 RouteCard
<RouteCard
  // ...existing props
  onDropRoute={handleDropRoute}
/>
```

- [ ] **Step 3: 在分组列表页面添加分组拖拽**

修改 `src/sidepanel/pages/DashboardPage.tsx`（或分组列表所在页面），为 GroupSection 添加分组级拖拽：

```tsx
import { reorderGroups } from "../../services/group-service";

// 为每个 GroupSection 的容器添加拖拽属性
<div
  className="group-section-wrapper"
  draggable
  onDragStart={(e) => {
    e.dataTransfer.setData("application/opentab-group", group.id);
    e.dataTransfer.effectAllowed = "move";
  }}
  onDragOver={(e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    e.currentTarget.classList.add("group-drag-over");
  }}
  onDragLeave={(e) => {
    e.currentTarget.classList.remove("group-drag-over");
  }}
  onDrop={async (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove("group-drag-over");
    const draggedGroupId = e.dataTransfer.getData("application/opentab-group");
    if (draggedGroupId === group.id) return;
    const groupIds = groupedRoutes.map((g) => g.group.id);
    const dragIndex = groupIds.indexOf(draggedGroupId);
    const targetIndex = groupIds.indexOf(group.id);
    if (dragIndex === -1 || targetIndex === -1) return;
    const newOrder = [...groupIds];
    newOrder.splice(dragIndex, 1);
    newOrder.splice(targetIndex, 0, draggedGroupId);
    await reorderGroups(newOrder);
    await loadGroupedRoutes();
  }}
>
  <GroupSection ... />
</div>
```

- [ ] **Step 4: 添加拖拽样式**

在 `src/sidepanel/styles.css` 中：

```css
.route-card[draggable="true"] {
  cursor: grab;
}

.route-card[draggable="true"]:active {
  cursor: grabbing;
}

.route-card.drag-over {
  border-top: 2px solid #1a73e8;
  padding-top: calc(var(--card-padding, 8px) - 2px);
}

.group-section-wrapper[draggable="true"] {
  cursor: grab;
}

.group-section-wrapper[draggable="true"]:active {
  cursor: grabbing;
}

.group-section-wrapper.group-drag-over {
  border-top: 2px solid #1a73e8;
}
```

- [ ] **Step 5: 验证构建通过**

Run: `npm run build`
Expected: 构建成功

- [ ] **Step 6: Commit**

```bash
git add src/sidepanel/components/GroupSection.tsx src/sidepanel/components/RouteCard.tsx src/sidepanel/pages/DashboardPage.tsx src/sidepanel/styles.css
git commit -m "feat: add drag-and-drop sorting for routes and groups"
```

---

## Task 8: UI — 锁定/置顶分组

**Files:**
- Modify: `src/sidepanel/components/GroupSection.tsx`

- [ ] **Step 1: 在 GroupSection 添加锁定/置顶按钮**

在 `src/sidepanel/components/GroupSection.tsx` 的分组头部按钮区域：

```tsx
import { toggleGroupLock, toggleGroupPin } from "../../services/group-service";

// 锁定按钮
<button
  className={`group-action-btn lock-btn ${group.isLocked ? "locked" : ""}`}
  title={group.isLocked ? "解锁分组" : "锁定分组"}
  onClick={() => toggleGroupLock(group.id).then(onRefresh)}
>
  {group.isLocked ? "🔒" : "🔓"}
</button>

// 置顶按钮
<button
  className={`group-action-btn pin-btn ${group.pinned ? "pinned" : ""}`}
  title={group.pinned ? "取消置顶" : "置顶分组"}
  onClick={() => toggleGroupPin(group.id).then(onRefresh)}
>
  {group.pinned ? "📌" : "📍"}
</button>
```

- [ ] **Step 2: 锁定时禁用删除和重命名**

修改 GroupSection 的删除和重命名按钮，锁定时禁用：

```tsx
// 删除按钮
<button
  className="group-action-btn delete-btn"
  disabled={group.isLocked}
  title={group.isLocked ? "锁定的分组不可删除" : "删除分组"}
  onClick={() => {
    if (!group.isLocked) onDeleteGroup(group.id);
  }}
>
  删除
</button>

// 重命名逻辑：锁定时不允许进入编辑模式
const [editing, setEditing] = useState(false);
const startEdit = () => {
  if (!group.isLocked) setEditing(true);
};
```

- [ ] **Step 3: 在分组标题旁显示锁定图标**

```tsx
<h3 className="group-title">
  {group.name}
  {group.isLocked && <span className="lock-icon" title="已锁定">🔒</span>}
  {group.pinned && <span className="pin-icon" title="已置顶">📌</span>}
</h3>
```

- [ ] **Step 4: 添加样式**

在 `src/sidepanel/styles.css` 中：

```css
.lock-btn, .pin-btn {
  font-size: 14px;
  padding: 2px 4px;
  opacity: 0.5;
  transition: opacity 0.2s;
}

.lock-btn.locked, .pin-btn.pinned {
  opacity: 1;
}

.lock-icon, .pin-icon {
  font-size: 12px;
  margin-left: 4px;
  vertical-align: middle;
}
```

- [ ] **Step 5: 验证构建通过**

Run: `npm run build`
Expected: 构建成功

- [ ] **Step 6: Commit**

```bash
git add src/sidepanel/components/GroupSection.tsx src/sidepanel/styles.css
git commit -m "feat: add lock and pin group UI controls"
```

---

## Task 9: 分享为网页 — 入口页面

**Files:**
- Create: `src/share.html`
- Create: `src/share/main.tsx`
- Create: `src/share/App.tsx`
- Create: `src/share/styles.css`
- Modify: `vite.config.ts`

- [ ] **Step 1: 创建 share.html**

创建 `src/share.html`：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OpenTab - 分享的分组</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./share/main.tsx"></script>
</body>
</html>
```

- [ ] **Step 2: 创建 share/main.tsx**

创建 `src/share/main.tsx`：

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 3: 创建 share/App.tsx**

创建 `src/share/App.tsx`：

```tsx
import { useState, useEffect } from "react";

interface SharedRoute {
  url: string;
  title: string;
  icon?: string;
}

interface SharedGroup {
  name: string;
  routes: SharedRoute[];
}

export function App() {
  const [group, setGroup] = useState<SharedGroup | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const hash = window.location.hash.slice(1);
      if (!hash) {
        setError("没有分享数据");
        return;
      }
      const decoded = atob(hash);
      const data = JSON.parse(decoded) as SharedGroup;
      setGroup(data);
    } catch {
      setError("分享数据无效或已损坏");
    }
  }, []);

  const handleImport = async () => {
    if (!group) return;
    // 尝试通过消息发送给扩展
    try {
      await chrome.runtime.sendMessage({
        type: "IMPORT_SHARED_GROUP",
        data: group,
      });
      alert("导入成功！");
    } catch {
      alert("导入失败，请确保已安装 OpenTab 扩展");
    }
  };

  if (error) {
    return (
      <div className="share-page">
        <div className="share-error">
          <h1>OpenTab 分享</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="share-page">
        <div className="share-loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="share-page">
      <header className="share-header">
        <h1>OpenTab - {group.name}</h1>
        <p>共 {group.routes.length} 个链接</p>
        <button className="import-btn" onClick={handleImport}>
          一键导入到 OpenTab
        </button>
      </header>
      <ul className="share-list">
        {group.routes.map((route, i) => (
          <li key={i} className="share-item">
            {route.icon && <img src={route.icon} alt="" className="share-favicon" />}
            <a href={route.url} target="_blank" rel="noopener noreferrer">
              {route.title}
            </a>
            <span className="share-url">{route.url}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: 创建 share/styles.css**

创建 `src/share/styles.css`：

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #f8f9fa;
  color: #202124;
}

.share-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 32px 16px;
}

.share-header {
  margin-bottom: 24px;
}

.share-header h1 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
}

.share-header p {
  font-size: 13px;
  color: #5f6368;
  margin-bottom: 16px;
}

.import-btn {
  padding: 8px 20px;
  background: #1a73e8;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
}

.import-btn:hover {
  background: #1557b0;
}

.share-list {
  list-style: none;
}

.share-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: white;
  border: 1px solid #e8eaed;
  border-radius: 8px;
  margin-bottom: 6px;
}

.share-favicon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.share-item a {
  color: #1a73e8;
  text-decoration: none;
  font-size: 14px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.share-item a:hover {
  text-decoration: underline;
}

.share-url {
  font-size: 11px;
  color: #80868b;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.share-error {
  text-align: center;
  padding: 48px 16px;
}

.share-error h1 {
  font-size: 20px;
  margin-bottom: 12px;
}

.share-error p {
  color: #5f6368;
}

.share-loading {
  text-align: center;
  padding: 48px 16px;
  color: #5f6368;
}
```

- [ ] **Step 5: 更新 vite.config.ts 添加 share 入口**

修改 `vite.config.ts` 的 `build.rollupOptions.input`：

```typescript
input: {
  popup: "popup.html",
  sidepanel: "sidepanel.html",
  options: "options.html",
  manager: "manager.html",
  share: "share.html",  // 新增
},
```

- [ ] **Step 6: 验证构建通过**

Run: `npm run build`
Expected: `dist/share.html` 存在，构建成功

- [ ] **Step 7: Commit**

```bash
git add src/share.html src/share/ vite.config.ts
git commit -m "feat: add share page entry for shared group links"
```

---

## Task 10: 分享功能 — 生成链接

**Files:**
- Create: `src/sidepanel/components/ShareDialog.tsx`
- Create: `src/sidepanel/components/ShareDialog.css`
- Modify: `src/sidepanel/components/GroupSection.tsx`

- [ ] **Step 1: 创建 ShareDialog 组件**

创建 `src/sidepanel/components/ShareDialog.tsx`：

```tsx
import { useState } from "react";
import "./ShareDialog.css";

interface SharedRoute {
  url: string;
  title: string;
  icon?: string;
}

interface ShareDialogProps {
  groupName: string;
  routes: SharedRoute[];
  onClose: () => void;
}

export function ShareDialog({ groupName, routes, onClose }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);

  const shareData = {
    name: groupName,
    routes: routes.map((r) => ({ url: r.url, title: r.title, icon: r.icon })),
  };

  const encoded = btoa(JSON.stringify(shareData));
  const shareUrl = `${chrome.runtime.getURL("share.html")}#${encoded}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="share-dialog-overlay" onClick={onClose}>
      <div className="share-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>分享分组: {groupName}</h3>
        <p className="share-dialog-desc">
          分享链接包含 {routes.length} 个链接，接收者可在浏览器中查看。
        </p>
        <div className="share-url-box">
          <input type="text" readOnly value={shareUrl} onClick={(e) => (e.target as HTMLInputElement).select()} />
          <button onClick={handleCopy}>{copied ? "已复制" : "复制"}</button>
        </div>
        <div className="share-dialog-actions">
          <button className="share-close-btn" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 创建 ShareDialog 样式**

创建 `src/sidepanel/components/ShareDialog.css`：

```css
.share-dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.share-dialog {
  background: white;
  border-radius: 12px;
  padding: 24px;
  width: 90%;
  max-width: 480px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.share-dialog h3 {
  font-size: 16px;
  margin-bottom: 8px;
}

.share-dialog-desc {
  font-size: 13px;
  color: #5f6368;
  margin-bottom: 16px;
}

.share-url-box {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.share-url-box input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #e8eaed;
  border-radius: 6px;
  font-size: 12px;
  color: #202124;
  background: #f8f9fa;
}

.share-url-box button {
  padding: 8px 16px;
  background: #1a73e8;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  white-space: nowrap;
}

.share-dialog-actions {
  text-align: right;
}

.share-close-btn {
  padding: 6px 16px;
  background: transparent;
  border: 1px solid #e8eaed;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}
```

- [ ] **Step 3: 在 GroupSection 集成分享功能**

在 `src/sidepanel/components/GroupSection.tsx` 中：

```tsx
import { ShareDialog } from "./ShareDialog";

// 添加状态
const [showShare, setShowShare] = useState(false);

// 在分组头部按钮区域添加分享按钮
<button
  className="group-action-btn share-btn"
  title="生成分享链接"
  onClick={() => setShowShare(true)}
>
  分享
</button>

// 渲染对话框
{showShare && (
  <ShareDialog
    groupName={group.name}
    routes={routes.map((r) => ({ url: r.url, title: r.title, icon: r.icon }))}
    onClose={() => setShowShare(false)}
  />
)}
```

- [ ] **Step 4: 验证构建通过**

Run: `npm run build`
Expected: 构建成功

- [ ] **Step 5: Commit**

```bash
git add src/sidepanel/components/ShareDialog.tsx src/sidepanel/components/ShareDialog.css src/sidepanel/components/GroupSection.tsx
git commit -m "feat: add share dialog for generating shareable group links"
```

---

## Task 11: 分享功能 — 导入处理

**Files:**
- Modify: `src/background/index.ts`

- [ ] **Step 1: 在 background 处理导入消息**

在 `src/background/index.ts` 中添加消息监听：

```typescript
import { saveRoute } from "../services/route-service";
import { createGroup } from "../services/group-service";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "IMPORT_SHARED_GROUP") {
    handleImportSharedGroup(message.data)
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: String(err) }));
    return true; // 保持消息通道开放
  }
});

async function handleImportSharedGroup(data: { name: string; routes: Array<{ url: string; title: string; icon?: string }> }) {
  const group = await createGroup(data.name);
  for (const route of data.routes) {
    await saveRoute({
      url: route.url,
      title: route.title,
      icon: route.icon,
      groupId: group.id,
    });
  }
}
```

- [ ] **Step 2: 验证构建通过**

Run: `npm run build`
Expected: 构建成功

- [ ] **Step 3: Commit**

```bash
git add src/background/index.ts
git commit -m "feat: handle shared group import in background service worker"
```

---

## Task 12: 最终集成测试

- [ ] **Step 1: 完整构建验证**

Run: `npm run build`
Expected: 构建成功，无错误

- [ ] **Step 2: 手动功能测试清单**

在 Chrome 中加载 `dist/` 目录进行以下测试：

1. **收起所有标签**: 打开多个标签 → 点击"收起所有标签" → 验证新分组创建、标签关闭
2. **恢复单个标签**: 在分组中点击恢复按钮 → 验证新标签打开
3. **全部恢复**: 点击分组的"全部恢复" → 验证所有标签打开
4. **拖拽排序路由**: 在分组内拖拽路由卡片 → 验证顺序持久化
5. **拖拽排序分组**: 拖拽分组 → 验证顺序持久化
6. **锁定分组**: 锁定分组 → 尝试删除/重命名 → 验证被阻止
7. **置顶分组**: 置顶分组 → 验证始终在顶部
8. **分享**: 点击分享 → 复制链接 → 在新标签打开 → 验证内容正确

- [ ] **Step 3: 最终 Commit**

```bash
git add -A
git commit -m "feat: phase 1 complete - OneTab core capabilities"
```

---

## 阶段一完成标志

所有 12 个 Task 完成后，OpenTab 将具备以下能力：

- ✅ 一键收起所有标签页到新分组
- ✅ 单个/全部恢复标签页
- ✅ 路由和分组拖拽排序
- ✅ 分组锁定（防止误删/误改）
- ✅ 分组置顶（始终在顶部）
- ✅ 分组分享为网页链接
- ✅ 接收分享链接并一键导入
