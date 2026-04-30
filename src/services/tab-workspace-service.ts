import { saveRoute, type SaveRouteInput } from "./route-service"
import { createGroup } from "./group-service"

interface SendAllTabsOptions {
  excludePinned?: boolean
  domainWhitelist?: string[]
}

export async function sendAllTabsToGroup(
  options: SendAllTabsOptions = {}
): Promise<{ groupId: string; savedCount: number; skippedCount: number }> {
  const { excludePinned = true, domainWhitelist = [] } = options

  const tabs = await chrome.tabs.query({ currentWindow: true })

  const filteredTabs = tabs.filter((tab) => {
    if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) {
      return false
    }

    if (excludePinned && tab.pinned) {
      return false
    }

    if (domainWhitelist.length > 0) {
      try {
        const hostname = new URL(tab.url).hostname
        if (domainWhitelist.some((d) => hostname.includes(d))) {
          return false
        }
      } catch {
        return false
      }
    }

    return true
  })

  if (filteredTabs.length === 0) {
    return { groupId: "", savedCount: 0, skippedCount: tabs.length }
  }

  const now = new Date()
  const groupName = `收起于 ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
  const group = await createGroup(groupName)

  let savedCount = 0
  for (const tab of filteredTabs) {
    if (!tab.url) continue
    const input: SaveRouteInput = {
      url: tab.url,
      title: tab.title || tab.url,
      icon: tab.favIconUrl,
      groupId: group.id
    }
    await saveRoute(input)
    savedCount++
  }

  const currentTab = tabs.find((t) => t.active)
  const tabIdsToClose = filteredTabs
    .filter((t) => t.id !== currentTab?.id)
    .map((t) => t.id!)
    .filter(Boolean)

  if (tabIdsToClose.length > 0) {
    await chrome.tabs.remove(tabIdsToClose)
  }

  return { groupId: group.id, savedCount, skippedCount: tabs.length - savedCount }
}

export async function restoreRoute(url: string): Promise<void> {
  await chrome.tabs.create({ url, active: false })
}

export async function restoreAllRoutes(
  routes: Array<{ url: string }>,
  deleteAfterRestore = false
): Promise<void> {
  for (const route of routes) {
    await chrome.tabs.create({ url: route.url, active: false })
  }
}
