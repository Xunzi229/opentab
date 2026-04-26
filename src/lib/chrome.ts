import { isSupportedRouteUrl, toRoutePath } from "./url"

export type ActiveTabSnapshot = {
  title: string
  url: string
  path: string
  icon?: string
}

type InPageRouteProbe = {
  href: string
  title: string
  candidateHref?: string
}

export async function getCurrentActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab
}

function getPreferredSnapshotUrl(baseHref: string, candidateHref?: string) {
  if (!candidateHref) {
    return baseHref
  }

  try {
    return new URL(candidateHref, baseHref).href
  } catch {
    return baseHref
  }
}

async function probeRouteFromPage(tabId: number): Promise<InPageRouteProbe | null> {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const selectors = [
          '[aria-current="page"]',
          ".router-link-exact-active",
          ".router-link-active",
          ".ant-menu-item-selected a",
          ".ant-menu-submenu-selected a",
          ".el-menu-item.is-active a",
          ".el-sub-menu.is-active a",
          ".menu-item.active a",
          ".nav-item.active a",
          ".is-active a",
          ".active a"
        ]

        const findCandidateHref = () => {
          for (const selector of selectors) {
            const node = document.querySelector(selector)
            if (!node) {
              continue
            }

            const anchor =
              node instanceof HTMLAnchorElement
                ? node
                : node.querySelector?.("a[href]") instanceof HTMLAnchorElement
                  ? (node.querySelector("a[href]") as HTMLAnchorElement)
                  : null

            const href = anchor?.getAttribute("href") || anchor?.href
            if (href && href !== "/" && href !== "#") {
              return href
            }
          }

          return undefined
        }

        return {
          href: window.location.href,
          title: document.title || "未命名页面",
          candidateHref: findCandidateHref()
        }
      }
    })

    return (results[0]?.result as InPageRouteProbe | undefined) ?? null
  } catch (error) {
    console.warn("[OpenTab] route probe failed", error)
    return null
  }
}

export async function getCurrentActiveTabSnapshot(): Promise<ActiveTabSnapshot | null> {
  const tab = await getCurrentActiveTab()
  if (!tab?.id || !tab.url || !isSupportedRouteUrl(tab.url)) {
    return null
  }

  const inPageProbe = await probeRouteFromPage(tab.id)
  const baseUrl = inPageProbe?.href || tab.url
  const preferredUrl = getPreferredSnapshotUrl(baseUrl, inPageProbe?.candidateHref)
  const path = toRoutePath(preferredUrl)

  return {
    title: inPageProbe?.title || tab.title || "未命名页面",
    url: preferredUrl,
    path,
    icon: tab.favIconUrl
  }
}
