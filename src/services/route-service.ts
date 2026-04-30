import { DEFAULT_GROUP_ID } from "../lib/constants"
import { findRouteByUrl } from "../lib/dedupe"
import { nowIsoString } from "../lib/time"
import { isSupportedRouteUrl, toRoutePath } from "../lib/url"
import { getRoutes, saveRoutes } from "../repositories/local-repo"
import type { Environment, RouteItem } from "../types/route"

export type SaveRouteInput = {
  title: string
  url: string
  path?: string
  icon?: string
  groupId?: string
  environments?: Environment[]
  activeEnv?: string
  repoUrl?: string
  httpMethod?: string
  headers?: Record<string, string>
}

function toFallbackTitle(url: string) {
  try {
    const parsedUrl = new URL(url)
    return parsedUrl.hostname.replace(/^www\./, "")
  } catch {
    return "未命名页面"
  }
}

export async function saveRoute(input: SaveRouteInput) {
  if (!isSupportedRouteUrl(input.url.trim())) {
    throw new Error("只能保存可访问的 http(s) 地址。")
  }

  const routes = await getRoutes()
  const normalizedUrl = input.url.trim()
  const existing = findRouteByUrl(routes, normalizedUrl)
  const timestamp = nowIsoString()
  const resolvedPath = input.path || toRoutePath(normalizedUrl)
  const resolvedTitle = input.title.trim() || toFallbackTitle(normalizedUrl)

  if (existing) {
    const updatedRoutes = routes.map((route) =>
      route.id === existing.id
        ? {
            ...route,
            title: resolvedTitle || route.title,
            url: normalizedUrl,
            path: resolvedPath,
            icon: input.icon ?? route.icon,
            groupId: input.groupId ?? route.groupId,
            environments: input.environments ?? route.environments,
            activeEnv: input.activeEnv ?? route.activeEnv,
            repoUrl: input.repoUrl ?? route.repoUrl,
            httpMethod: input.httpMethod ?? route.httpMethod,
            headers: input.headers ?? route.headers,
            updatedAt: timestamp
          }
        : route
    )

    await saveRoutes(updatedRoutes)
    return updatedRoutes.find((route) => route.id === existing.id) ?? existing
  }

  const route: RouteItem = {
    id: crypto.randomUUID(),
    title: resolvedTitle,
    url: normalizedUrl,
    path: resolvedPath,
    icon: input.icon,
    groupId: input.groupId ?? DEFAULT_GROUP_ID,
    tags: [],
    starred: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    visitCount: 0,
    sortOrder: Date.now(),
    environments: input.environments,
    activeEnv: input.activeEnv,
    repoUrl: input.repoUrl,
    httpMethod: input.httpMethod,
    headers: input.headers
  }

  const nextRoutes = [route, ...routes]
  await saveRoutes(nextRoutes)
  return route
}

export async function listRoutes() {
  const routes = await getRoutes()
  return routes.sort((left, right) => {
    const leftOrder = left.sortOrder ?? Number.MAX_SAFE_INTEGER
    const rightOrder = right.sortOrder ?? Number.MAX_SAFE_INTEGER
    if (leftOrder !== rightOrder) return leftOrder - rightOrder
    return left.createdAt.localeCompare(right.createdAt)
  })
}

export async function removeRoute(routeId: string) {
  const routes = await getRoutes()
  const nextRoutes = routes.filter((route) => route.id !== routeId)
  await saveRoutes(nextRoutes)
}

export async function toggleRouteStar(routeId: string) {
  const routes = await getRoutes()
  const timestamp = nowIsoString()
  const nextRoutes = routes.map((route) =>
    route.id === routeId
      ? {
          ...route,
          starred: !route.starred,
          updatedAt: timestamp
        }
      : route
  )

  await saveRoutes(nextRoutes)
}

export async function moveRouteToGroup(routeId: string, groupId: string = DEFAULT_GROUP_ID) {
  const routes = await getRoutes()
  const timestamp = nowIsoString()
  const nextRoutes = routes.map((route) =>
    route.id === routeId
      ? {
          ...route,
          groupId,
          updatedAt: timestamp
        }
      : route
  )

  await saveRoutes(nextRoutes)
}

export async function updateRoute(
  routeId: string,
  input: {
    title: string
    url: string
    note?: string
    tags?: string
    environments?: Environment[]
    activeEnv?: string
    repoUrl?: string
    httpMethod?: string
    headers?: Record<string, string>
  }
) {
  if (!isSupportedRouteUrl(input.url.trim())) {
    throw new Error("只能保存可访问的 http(s) 地址。")
  }

  const routes = await getRoutes()
  const timestamp = nowIsoString()
  const normalizedTags = (input.tags ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
  const nextRoutes = routes.map((route) =>
    route.id === routeId
      ? {
          ...route,
          title: input.title.trim() || route.title,
          url: input.url.trim() || route.url,
          path: toRoutePath(input.url.trim() || route.url),
          note: input.note ?? route.note,
          tags: normalizedTags,
          environments: input.environments ?? route.environments,
          activeEnv: input.activeEnv ?? route.activeEnv,
          repoUrl: input.repoUrl ?? route.repoUrl,
          httpMethod: input.httpMethod ?? route.httpMethod,
          headers: input.headers ?? route.headers,
          updatedAt: timestamp
        }
      : route
  )

  await saveRoutes(nextRoutes)
}

export async function reorderRoutes(groupId: string, orderedRouteIds: string[]) {
  const routes = await getRoutes()
  const orderMap = new Map(orderedRouteIds.map((id, index) => [id, index]))
  const nextRoutes = routes.map((route) => {
    const order = orderMap.get(route.id)
    if (order === undefined) return route
    return { ...route, sortOrder: order, updatedAt: nowIsoString() }
  })

  await saveRoutes(nextRoutes)
}
