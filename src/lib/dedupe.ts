import type { RouteItem } from "../types/route"
import { toNormalizedUrl } from "./url"

export function findRouteByUrl(items: RouteItem[], url: string) {
  const target = toNormalizedUrl(url)
  return items.find((item) => toNormalizedUrl(item.url) === target)
}
