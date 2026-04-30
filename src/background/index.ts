import { getCurrentActiveTabSnapshot } from "../lib/chrome"
import { recordVisit } from "../services/history-service"
import { createGroup } from "../services/group-service"
import { listRoutes, saveRoute } from "../services/route-service"

async function setupSidePanel() {
  try {
    await chrome.sidePanel.setPanelBehavior({
      openPanelOnActionClick: false
    })

    await chrome.sidePanel.setOptions({
      path: "sidepanel.html",
      enabled: true
    })
  } catch (error) {
    console.warn("[OpenTab] side panel setup skipped", error)
  }
}

chrome.runtime.onInstalled.addListener(() => {
  console.info("[OpenTab] background installed")
  void setupSidePanel()
})

chrome.runtime.onStartup.addListener(() => {
  console.info("[OpenTab] background started")
  void setupSidePanel()
})

async function tryRecordCurrentTabVisit() {
  const snapshot = await getCurrentActiveTabSnapshot()
  if (!snapshot) {
    return
  }

  const routes = await listRoutes()
  const route = routes.find((item) => item.url === snapshot.url)
  if (!route) {
    return
  }

  await recordVisit({
    routeId: route.id,
    title: route.title,
    url: route.url
  })
}

chrome.tabs.onActivated.addListener(() => {
  void tryRecordCurrentTabVisit()
})

chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
  if (changeInfo.status === "complete") {
    void tryRecordCurrentTabVisit()
  }
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "IMPORT_SHARED_GROUP") {
    return false
  }

  const { name, routes } = message.payload ?? {}
  if (!name || !Array.isArray(routes)) {
    sendResponse({ success: false, error: "数据格式无效" })
    return false
  }

  ;(async () => {
    try {
      const group = await createGroup(name)
      for (const route of routes) {
        if (route?.url) {
          await saveRoute({
            url: route.url,
            title: route.title ?? "",
            icon: route.icon,
            groupId: group.id
          })
        }
      }
      sendResponse({ success: true, groupId: group.id })
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : "导入失败"
      })
    }
  })()

  return true
})
