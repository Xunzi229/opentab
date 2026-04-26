import { loadSettings } from "./settings-service"
import { nowIsoString } from "../lib/time"
import { toRoutePath } from "../lib/url"
import { getRoutes, getVisits, saveRoutes, saveVisits } from "../repositories/local-repo"
import type { VisitRecord } from "../types/history"

const MAX_VISIT_RECORDS = 10

export async function listVisits() {
  const visits = await getVisits()
  return visits.sort((left, right) => right.visitedAt.localeCompare(left.visitedAt))
}

export async function recordVisit(input: { routeId?: string; title: string; url: string }) {
  const settings = await loadSettings()
  if (!settings.enableVisitTracking) {
    return null
  }

  const timestamp = nowIsoString()
  const visit: VisitRecord = {
    id: crypto.randomUUID(),
    routeId: input.routeId,
    title: input.title,
    url: input.url,
    path: toRoutePath(input.url),
    visitedAt: timestamp
  }

  const [visits, routes] = await Promise.all([getVisits(), getRoutes()])
  const nextVisits = [visit, ...visits].slice(0, MAX_VISIT_RECORDS)
  await saveVisits(nextVisits)

  if (!input.routeId) {
    return visit
  }

  const nextRoutes = routes.map((route) =>
    route.id === input.routeId
      ? {
          ...route,
          lastVisitedAt: timestamp,
          visitCount: route.visitCount + 1,
          updatedAt: timestamp
        }
      : route
  )

  await saveRoutes(nextRoutes)
  return visit
}
