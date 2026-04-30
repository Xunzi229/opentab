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
const SYNC_SIZE_LIMIT = 80 * 1024

export async function syncToChrome(): Promise<{ success: boolean; error?: string }> {
  try {
    const routes = await getStorageValue<RouteItem[]>(STORAGE_KEYS.routes, [])
    const groups = await getStorageValue<RouteGroup[]>(STORAGE_KEYS.groups, [])
    const tags = await getStorageValue<RouteTag[]>(STORAGE_KEYS.tags, [])
    const data: SyncData = { routes, groups, tags, lastSynced: new Date().toISOString() }
    const serialized = JSON.stringify(data)
    if (serialized.length > SYNC_SIZE_LIMIT) {
      return { success: false, error: `数据量 ${(serialized.length / 1024).toFixed(1)}KB 超出限制 80KB` }
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
    if (!data) return { success: false, error: "云端无同步数据" }
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
  return { lastSynced: data?.lastSynced ?? null, dataSize: data ? JSON.stringify(data).length : 0 }
}
