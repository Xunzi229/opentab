import { DEFAULT_GROUPS, DEFAULT_SETTINGS, STORAGE_KEYS } from "../lib/constants"
import { getStorageValue, getStorageValues, setStorageValue, setStorageValues } from "../lib/storage"
import { toRoutePath } from "../lib/url"
import type { RouteGroup } from "../types/group"
import type { VisitRecord } from "../types/history"
import type { RouteItem } from "../types/route"
import type { AppSettings } from "../types/settings"
import type { RouteTag } from "../types/tag"

export type AppSnapshot = {
  routes: RouteItem[]
  groups: RouteGroup[]
  tags: RouteTag[]
  visits: VisitRecord[]
  settings: AppSettings
}

function normalizeRouteItem(route: RouteItem, index: number) {
  return {
    ...route,
    path: (!route.path || route.path === "/") ? toRoutePath(route.url) : route.path,
    sortOrder: route.sortOrder ?? index
  }
}

function normalizeVisitRecord(visit: VisitRecord) {
  if (!visit.path || visit.path === "/") {
    return {
      ...visit,
      path: toRoutePath(visit.url)
    }
  }

  return visit
}

export async function getRoutes() {
  const routes = await getStorageValue<RouteItem[]>(STORAGE_KEYS.routes, [])
  const normalizedRoutes = routes.map(normalizeRouteItem)

  if (JSON.stringify(routes) !== JSON.stringify(normalizedRoutes)) {
    await saveRoutes(normalizedRoutes)
  }

  return normalizedRoutes
}

export async function saveRoutes(routes: RouteItem[]) {
  await setStorageValue(STORAGE_KEYS.routes, routes)
}

export async function getGroups(): Promise<RouteGroup[]> {
  const groups = await getStorageValue<RouteGroup[]>(STORAGE_KEYS.groups, [...DEFAULT_GROUPS])
  return groups.map((g) => ({
    ...g,
    isLocked: g.isLocked ?? false,
    pinned: g.pinned ?? false,
  }))
}

export async function saveGroups(groups: RouteGroup[]) {
  await setStorageValue(STORAGE_KEYS.groups, groups)
}

export async function getTags() {
  return getStorageValue<RouteTag[]>(STORAGE_KEYS.tags, [])
}

export async function saveTags(tags: RouteTag[]) {
  await setStorageValue(STORAGE_KEYS.tags, tags)
}

export async function getVisits() {
  const visits = await getStorageValue<VisitRecord[]>(STORAGE_KEYS.visits, [])
  const normalizedVisits = visits.map(normalizeVisitRecord)

  if (JSON.stringify(visits) !== JSON.stringify(normalizedVisits)) {
    await saveVisits(normalizedVisits)
  }

  return normalizedVisits
}

export async function saveVisits(visits: VisitRecord[]) {
  await setStorageValue(STORAGE_KEYS.visits, visits)
}

export async function getSettings() {
  const stored = await getStorageValue<AppSettings>(STORAGE_KEYS.settings, {
    ...DEFAULT_SETTINGS
  } as AppSettings)

  return {
    ...DEFAULT_SETTINGS,
    ...stored
  } as AppSettings
}

export async function saveSettings(settings: AppSettings) {
  await setStorageValue(STORAGE_KEYS.settings, settings)
}

export async function getAppSnapshot(): Promise<AppSnapshot> {
  return getStorageValues(
    {
      [STORAGE_KEYS.routes]: [],
      [STORAGE_KEYS.groups]: [...DEFAULT_GROUPS],
      [STORAGE_KEYS.tags]: [],
      [STORAGE_KEYS.visits]: [],
      [STORAGE_KEYS.settings]: { ...DEFAULT_SETTINGS } as AppSettings
    },
    "local"
  ).then((data) => ({
    routes: (data[STORAGE_KEYS.routes] as RouteItem[]).map(normalizeRouteItem),
    groups: data[STORAGE_KEYS.groups] as RouteGroup[],
    tags: data[STORAGE_KEYS.tags] as RouteTag[],
    visits: (data[STORAGE_KEYS.visits] as VisitRecord[]).map(normalizeVisitRecord),
    settings: data[STORAGE_KEYS.settings] as AppSettings
  }))
}

export async function saveAppSnapshot(snapshot: AppSnapshot) {
  await setStorageValues({
    [STORAGE_KEYS.routes]: snapshot.routes,
    [STORAGE_KEYS.groups]: snapshot.groups,
    [STORAGE_KEYS.tags]: snapshot.tags,
    [STORAGE_KEYS.visits]: snapshot.visits,
    [STORAGE_KEYS.settings]: snapshot.settings
  })
}

export async function resetAppSnapshot() {
  await saveAppBackupArchive({
    snapshot: {
      routes: [],
      groups: [...DEFAULT_GROUPS],
      tags: [],
      visits: [],
      settings: { ...DEFAULT_SETTINGS } as AppSettings
    },
    webdavConfigs: []
  })
}

export type WebdavConfigVersion = {
  id: string
  createdAt: string
  webdavUrl: string
  webdavUsername: string
  webdavFilePath: string
}

export type AppBackupArchive = {
  snapshot: AppSnapshot
  webdavConfigs: WebdavConfigVersion[]
}

export async function getWebdavConfigVersions() {
  return getStorageValue<WebdavConfigVersion[]>(STORAGE_KEYS.webdavConfigs, [])
}

export async function saveWebdavConfigVersion(version: WebdavConfigVersion) {
  const current = await getWebdavConfigVersions()
  const next = [version, ...current]
  await setStorageValue(STORAGE_KEYS.webdavConfigs, next)
}

export async function removeWebdavConfigVersion(id: string) {
  const current = await getWebdavConfigVersions()
  const next = current.filter((v) => v.id !== id)
  await setStorageValue(STORAGE_KEYS.webdavConfigs, next)
}

export async function getAppBackupArchive(): Promise<AppBackupArchive> {
  const [snapshot, webdavConfigs] = await Promise.all([
    getAppSnapshot(),
    getWebdavConfigVersions()
  ])

  return {
    snapshot,
    webdavConfigs
  }
}

export async function saveAppBackupArchive(archive: AppBackupArchive) {
  await saveAppSnapshot(archive.snapshot)
  await setStorageValue(STORAGE_KEYS.webdavConfigs, archive.webdavConfigs)
}
