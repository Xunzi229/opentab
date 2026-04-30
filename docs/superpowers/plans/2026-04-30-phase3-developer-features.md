# Phase 3: 开发者功能增强 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为开发者提供环境管理、API 调试辅助、代码仓库关联等专属能力，形成与 OneTab 的差异化。

**Architecture:** 扩展 RouteItem 数据模型支持多环境 URL 和开发者元数据，在 RouteCard 中增加环境切换和开发者工具按钮，新增 URL 工具函数处理环境变量替换。

**Tech Stack:** TypeScript, React 19, Chrome Extension API

---

## 文件结构总览

### 新建文件
- `src/lib/env-utils.ts` — 环境变量替换、cURL/fetch 代码生成

### 修改文件
- `src/types/route.ts` — 扩展 Environment 类型、repoUrl、httpMethod、headers
- `src/services/route-service.ts` — SaveRouteInput/updateRoute 支持新字段
- `src/sidepanel/components/RouteCard.tsx` — 环境切换、开发者工具按钮
- `src/sidepanel/styles.css` — 新增样式
- `src/sidepanel/pages/DashboardPage.tsx` — 传递新 props
- `src/sidepanel/pages/AllRoutesPage.tsx` — 传递新 props
- `src/sidepanel/components/GroupSection.tsx` — 透传新 props

---

## Task 1: 扩展数据模型

**Files:**
- Modify: `src/types/route.ts`
- Modify: `src/services/route-service.ts`

- [ ] **Step 1: 扩展 RouteItem 类型**

在 `src/types/route.ts` 中：

```typescript
export interface Environment {
  name: string    // "dev" | "staging" | "prod" | 自定义
  url: string     // 环境 URL
}

export interface RouteItem {
  // ...existing fields
  environments?: Environment[]           // 多环境配置
  activeEnv?: string                     // 当前激活的环境名称
  repoUrl?: string                       // 关联代码仓库 URL
  httpMethod?: string                    // HTTP 方法（GET/POST/PUT/DELETE）
  headers?: Record<string, string>       // 自定义请求头
}
```

- [ ] **Step 2: 扩展 SaveRouteInput**

在 `src/services/route-service.ts` 中扩展 SaveRouteInput：

```typescript
export type SaveRouteInput = {
  // ...existing fields
  environments?: Environment[]
  activeEnv?: string
  repoUrl?: string
  httpMethod?: string
  headers?: Record<string, string>
}
```

在 saveRoute 和 updateRoute 中传递新字段。

- [ ] **Step 3: 验证构建**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/types/route.ts src/services/route-service.ts
git commit -m "feat: extend RouteItem with environments, repoUrl, httpMethod, headers"
```

---

## Task 2: 环境工具函数

**Files:**
- Create: `src/lib/env-utils.ts`

- [ ] **Step 1: 创建环境工具函数**

```typescript
import type { Environment } from "../types/route"

/**
 * 替换 URL 中的环境变量 {varName}
 */
export function replaceEnvVariables(url: string, variables: Record<string, string>): string {
  return url.replace(/\{(\w+)\}/g, (_, key) => variables[key] ?? `{${key}}`)
}

/**
 * 根据环境名获取环境 URL
 */
export function getEnvUrl(environments: Environment[], activeEnv: string): string | undefined {
  return environments.find(e => e.name === activeEnv)?.url
}

/**
 * 生成 cURL 命令
 */
export function toCurl(url: string, method?: string, headers?: Record<string, string>): string {
  const parts = ["curl"]
  if (method && method !== "GET") parts.push(`-X ${method}`)
  if (headers) {
    Object.entries(headers).forEach(([k, v]) => parts.push(`-H "${k}: ${v}"`))
  }
  parts.push(`"${url}"`)
  return parts.join(" ")
}

/**
 * 生成 fetch 代码片段
 */
export function toFetch(url: string, method?: string, headers?: Record<string, string>): string {
  const opts: Record<string, unknown> = {}
  if (method && method !== "GET") opts.method = method
  if (headers && Object.keys(headers).length > 0) opts.headers = headers
  if (Object.keys(opts).length === 0) return `fetch("${url}")`
  return `fetch("${url}", ${JSON.stringify(opts, null, 2)})`
}

/**
 * 从 URL 推断 HTTP 方法（默认 GET）
 */
export function inferHttpMethod(url: string): string {
  return "GET"
}

/**
 * 解析 GitHub/GitLab 仓库 URL 为可读名称
 */
export function toRepoDisplayName(repoUrl: string): string {
  try {
    const url = new URL(repoUrl)
    const parts = url.pathname.split("/").filter(Boolean)
    if (parts.length >= 2) return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`
    return repoUrl
  } catch {
    return repoUrl
  }
}
```

- [ ] **Step 2: 验证构建**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/lib/env-utils.ts
git commit -m "feat: add env-utils for environment switching and code generation"
```

---

## Task 3: RouteCard 环境切换

**Files:**
- Modify: `src/sidepanel/components/RouteCard.tsx`
- Modify: `src/sidepanel/styles.css`

- [ ] **Step 1: 添加环境切换 UI**

在 RouteCard 中：
1. 接收 `environments` 和 `activeEnv` props
2. 当 environments 存在且长度 > 0 时，显示环境标签按钮组
3. 点击环境标签切换 `activeEnv`，调用 `onEnvChange?.(routeId, envName)`
4. 当前激活的环境高亮显示
5. 切换后用该环境的 URL 替换当前路由 URL 打开

```tsx
// 在 RouteCardProps 中添加
environments?: Environment[]
activeEnv?: string
onEnvChange?: (routeId: string, envName: string) => void

// 在卡片内容区域添加环境标签
{environments && environments.length > 0 && (
  <div className="env-tags">
    {environments.map(env => (
      <button
        key={env.name}
        className={`env-tag ${env.name === activeEnv ? "active" : ""}`}
        onClick={(e) => {
          e.stopPropagation()
          onEnvChange?.(route.id, env.name)
        }}
        title={env.url}
      >
        {env.name}
      </button>
    ))}
  </div>
)}
```

- [ ] **Step 2: 添加开发者工具按钮**

在操作按钮区域添加：

```tsx
// 复制 cURL
<button
  className="route-action-btn dev-btn"
  title="复制 cURL"
  onClick={() => {
    const curl = toCurl(route.url, route.httpMethod, route.headers)
    navigator.clipboard.writeText(curl)
  }}
>
  {"{}"}
</button>

// 复制 fetch
<button
  className="route-action-btn dev-btn"
  title="复制 fetch"
  onClick={() => {
    const code = toFetch(route.url, route.httpMethod, route.headers)
    navigator.clipboard.writeText(code)
  }}
>
  fn
</button>

// 打开代码仓库
{route.repoUrl && (
  <a
    className="route-action-btn dev-btn"
    href={route.repoUrl}
    target="_blank"
    rel="noopener noreferrer"
    title={`仓库: ${toRepoDisplayName(route.repoUrl)}`}
    onClick={e => e.stopPropagation()}
  >
    {"</>"}
  </a>
)}
```

- [ ] **Step 3: 添加样式**

在 `src/sidepanel/styles.css` 中：

```css
.env-tags { display: flex; gap: 4px; margin-top: 4px; flex-wrap: wrap; }
.env-tag { padding: 2px 8px; font-size: 11px; border: 1px solid #e8eaed; border-radius: 10px; background: #f8f9fa; cursor: pointer; transition: all 0.15s; }
.env-tag:hover { border-color: #1a73e8; color: #1a73e8; }
.env-tag.active { background: #e8f0fe; border-color: #1a73e8; color: #1a73e8; font-weight: 500; }
.dev-btn { font-size: 11px; font-family: monospace; color: #5f6368; }
.dev-btn:hover { color: #1a73e8; }
```

- [ ] **Step 4: 验证构建**

Run: `npm run build`

- [ ] **Step 5: Commit**

```bash
git add src/sidepanel/components/RouteCard.tsx src/sidepanel/styles.css
git commit -m "feat: add environment switcher and dev tools to RouteCard"
```

---

## Task 4: 路由编辑表单扩展

**Files:**
- Modify: `src/sidepanel/components/RouteCard.tsx`
- Modify: `src/services/route-service.ts`

- [ ] **Step 1: 扩展编辑表单**

在 RouteCard 的编辑模式中添加：
1. 环境配置区域：可添加/删除环境（name + url）
2. HTTP 方法下拉选择
3. 代码仓库 URL 输入框

```tsx
// 编辑表单中新增
<div className="edit-field">
  <label>HTTP 方法</label>
  <select value={editHttpMethod} onChange={e => setEditHttpMethod(e.target.value)}>
    <option value="GET">GET</option>
    <option value="POST">POST</option>
    <option value="PUT">PUT</option>
    <option value="DELETE">DELETE</option>
    <option value="PATCH">PATCH</option>
  </select>
</div>
<div className="edit-field">
  <label>代码仓库</label>
  <input value={editRepoUrl} onChange={e => setEditRepoUrl(e.target.value)} placeholder="https://github.com/..." />
</div>
<div className="edit-field">
  <label>环境配置</label>
  {editEnvironments.map((env, i) => (
    <div key={i} className="env-edit-row">
      <input value={env.name} placeholder="名称" onChange={e => updateEnvName(i, e.target.value)} />
      <input value={env.url} placeholder="URL" onChange={e => updateEnvUrl(i, e.target.value)} />
      <button onClick={() => removeEnv(i)}>x</button>
    </div>
  ))}
  <button className="add-env-btn" onClick={addEnv}>+ 添加环境</button>
</div>
```

- [ ] **Step 2: 扩展 updateRoute**

在 `src/services/route-service.ts` 的 updateRoute 中添加新字段：

```typescript
export async function updateRoute(routeId: string, input: {
  title?: string
  url?: string
  note?: string
  tags?: string[]
  environments?: Environment[]
  activeEnv?: string
  repoUrl?: string
  httpMethod?: string
  headers?: Record<string, string>
}): Promise<void> {
  // ...existing logic, add new fields to update
}
```

- [ ] **Step 3: 验证构建**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/sidepanel/components/RouteCard.tsx src/services/route-service.ts
git commit -m "feat: extend route edit form with env, httpMethod, repoUrl"
```

---

## Task 5: 透传 Props 到子组件

**Files:**
- Modify: `src/sidepanel/components/GroupSection.tsx`
- Modify: `src/sidepanel/pages/DashboardPage.tsx`
- Modify: `src/sidepanel/pages/AllRoutesPage.tsx`

- [ ] **Step 1: GroupSection 透传**

在 GroupSection 中透传环境相关 props 给 RouteCard：
- `onEnvChange` callback

- [ ] **Step 2: DashboardPage 传递**

在 DashboardPage 中：
- 添加 `handleEnvChange(routeId, envName)` 函数，调用 updateRoute 更新 activeEnv
- 传递给 GroupSection

- [ ] **Step 3: AllRoutesPage 传递**

同 DashboardPage 模式。

- [ ] **Step 4: 验证构建**

Run: `npm run build`

- [ ] **Step 5: Commit**

```bash
git add src/sidepanel/components/GroupSection.tsx src/sidepanel/pages/DashboardPage.tsx src/sidepanel/pages/AllRoutesPage.tsx
git commit -m "feat: pass environment props through component tree"
```

---

## Task 6: 最终验证

- [ ] **Step 1: 完整构建**

Run: `npm run build`

- [ ] **Step 2: 手动测试清单**

1. 编辑路由 → 添加环境（dev/staging/prod）→ 保存 → 验证环境标签显示
2. 点击环境标签 → 验证切换
3. 点击"复制 cURL" → 验证剪贴板内容
4. 点击"复制 fetch" → 验证剪贴板内容
5. 添加代码仓库 URL → 验证仓库按钮显示和链接
6. 编辑 HTTP 方法 → 验证 cURL/fetch 输出

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: phase 3 complete - developer features"
```
