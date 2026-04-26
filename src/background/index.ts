import { getCurrentActiveTabSnapshot } from "../lib/chrome"
import { recordVisit } from "../services/history-service"
import { listRoutes } from "../services/route-service"

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
