import { DEFAULT_GROUP_ID, DEFAULT_GROUPS } from "../lib/constants"
import { isWithinLastDays, nowIsoString } from "../lib/time"
import { getGroups, getRoutes, getVisits, saveGroups, saveRoutes } from "../repositories/local-repo"
import type { RouteGroup } from "../types/group"

function normalizeGroupName(name: string) {
  return name.trim().toLowerCase()
}

function ensureUniqueGroupName(groups: RouteGroup[], name: string, excludeGroupId?: string) {
  const normalizedName = normalizeGroupName(name)
  const duplicatedGroup = groups.find(
    (group) => group.id !== excludeGroupId && normalizeGroupName(group.name) === normalizedName
  )

  if (duplicatedGroup) {
    throw new Error("分组名称不能重复")
  }
}

export async function listGroups() {
  const groups = await getGroups()
  return groups.sort((left, right) => left.sort - right.sort)
}

export async function getGroupedRoutes() {
  const [groups, routes, visits] = await Promise.all([listGroups(), getRoutes(), getVisits()])
  const safeGroups = groups.length > 0 ? groups : [...DEFAULT_GROUPS]
  const weeklyVisitCountByRouteId = visits.reduce<Record<string, number>>((accumulator, visit) => {
    if (!visit.routeId || !isWithinLastDays(visit.visitedAt, 7)) {
      return accumulator
    }

    accumulator[visit.routeId] = (accumulator[visit.routeId] ?? 0) + 1
    return accumulator
  }, {})

  return safeGroups.map((group) => {
    const items = routes
      .filter((route) => (route.groupId ?? DEFAULT_GROUP_ID) === group.id)
      .map((route) => ({
        ...route,
        visitCount: weeklyVisitCountByRouteId[route.id] ?? 0
      }))
      .sort((left, right) => {
        if (left.starred !== right.starred) {
          return left.starred ? -1 : 1
        }

        return right.updatedAt.localeCompare(left.updatedAt)
      })

    return {
      ...group,
      count: items.length,
      items
    }
  })
}

export async function ensureDefaultGroups() {
  const groups = await getGroups()
  if (groups.length === 0) {
    await saveGroups([...DEFAULT_GROUPS])
    return DEFAULT_GROUPS
  }

  return groups
}

export async function createGroup(name: string) {
  const groups = await ensureDefaultGroups()
  const trimmedName = name.trim()
  if (!trimmedName) {
    throw new Error("分组名称不能为空")
  }

  ensureUniqueGroupName(groups, trimmedName)

  const timestamp = nowIsoString()
  const nextGroup: RouteGroup = {
    id: crypto.randomUUID(),
    name: trimmedName,
    color: "#5b6fff",
    sort: groups.length,
    createdAt: timestamp,
    updatedAt: timestamp
  }

  await saveGroups([...groups, nextGroup])
  return nextGroup
}

export async function renameGroup(groupId: string, name: string) {
  const groups = await ensureDefaultGroups()
  const trimmedName = name.trim()
  if (!trimmedName) {
    throw new Error("分组名称不能为空")
  }

  ensureUniqueGroupName(groups, trimmedName, groupId)

  const timestamp = nowIsoString()
  const nextGroups = groups.map((group) =>
    group.id === groupId
      ? {
          ...group,
          name: trimmedName,
          updatedAt: timestamp
        }
      : group
  )

  await saveGroups(nextGroups)
}

export async function deleteGroup(groupId: string) {
  if (groupId === DEFAULT_GROUP_ID) {
    throw new Error("默认分组不能删除")
  }

  const [groups, routes] = await Promise.all([ensureDefaultGroups(), getRoutes()])
  const nextGroups = groups.filter((group) => group.id !== groupId)
  const timestamp = nowIsoString()
  const nextRoutes = routes.map((route) =>
    route.groupId === groupId
      ? {
          ...route,
          groupId: DEFAULT_GROUP_ID,
          updatedAt: timestamp
        }
      : route
  )

  await Promise.all([saveGroups(nextGroups), saveRoutes(nextRoutes)])
}
