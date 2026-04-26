type StorageArea = "local" | "sync"

function getArea(area: StorageArea) {
  return area === "sync" ? chrome.storage.sync : chrome.storage.local
}

export async function getStorageValue<T>(key: string, fallback: T, area: StorageArea = "local") {
  const storageArea = getArea(area)
  const result = await storageArea.get(key)
  return (result[key] as T | undefined) ?? fallback
}

export async function setStorageValue<T>(key: string, value: T, area: StorageArea = "local") {
  const storageArea = getArea(area)
  await storageArea.set({ [key]: value })
}

export async function getStorageValues<T extends Record<string, unknown>>(
  defaults: T,
  area: StorageArea = "local"
) {
  const storageArea = getArea(area)
  const result = await storageArea.get(defaults)
  return result as T
}

export async function setStorageValues(values: Record<string, unknown>, area: StorageArea = "local") {
  const storageArea = getArea(area)
  await storageArea.set(values)
}
