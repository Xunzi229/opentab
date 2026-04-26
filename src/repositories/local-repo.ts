import { DEFAULT_GROUPS, DEFAULT_SETTINGS, STORAGE_KEYS } from "../lib/constants"
import { getStorageValue, getStorageValues, setStorageValue, setStorageValues } from "../lib/storage"
import { toRoutePath } from "../lib/url"
import type { RouteGroup } from "../types/group"
import type { VisitRecord } from "../types/history"
import type { RouteItem } from "../types/route"
import type { AppSettings } from "../types/settings"

export type AppSnapshot = {
  routes: RouteItem[]
  groups: RouteGroup[]
  visits: VisitRecord[]
  settings: AppSettings
}

function normalizeRouteItem(route: RouteItem) {
  if (!route.path || route.path === "/") {
    return {
      ...route,
      path: toRoutePath(route.url)
    }
  }

  return route
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

export async function getGroups() {
  return getStorageValue<RouteGroup[]>(STORAGE_KEYS.groups, [...DEFAULT_GROUPS])
}

export async function saveGroups(groups: RouteGroup[]) {
  await setStorageValue(STORAGE_KEYS.groups, groups)
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
  return getStorageValue<AppSettings>(STORAGE_KEYS.settings, {
    ...DEFAULT_SETTINGS
  } as AppSettings)
}

export async function saveSettings(settings: AppSettings) {
  await setStorageValue(STORAGE_KEYS.settings, settings)
}

export async function getAppSnapshot(): Promise<AppSnapshot> {
  return getStorageValues(
    {
      [STORAGE_KEYS.routes]: [],
      [STORAGE_KEYS.groups]: [...DEFAULT_GROUPS],
      [STORAGE_KEYS.visits]: [],
      [STORAGE_KEYS.settings]: { ...DEFAULT_SETTINGS } as AppSettings
    },
    "local"
  ).then((data) => ({
    routes: (data[STORAGE_KEYS.routes] as RouteItem[]).map(normalizeRouteItem),
    groups: data[STORAGE_KEYS.groups] as RouteGroup[],
    visits: (data[STORAGE_KEYS.visits] as VisitRecord[]).map(normalizeVisitRecord),
    settings: data[STORAGE_KEYS.settings] as AppSettings
  }))
}

export async function saveAppSnapshot(snapshot: AppSnapshot) {
  await setStorageValues({
    [STORAGE_KEYS.routes]: snapshot.routes,
    [STORAGE_KEYS.groups]: snapshot.groups,
    [STORAGE_KEYS.visits]: snapshot.visits,
    [STORAGE_KEYS.settings]: snapshot.settings
  })
}

export async function resetAppSnapshot() {
  await saveAppSnapshot({
    routes: [],
    groups: [...DEFAULT_GROUPS],
    visits: [],
    settings: { ...DEFAULT_SETTINGS } as AppSettings
  })
}
