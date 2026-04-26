import { nowIsoString } from "../lib/time"
import { getRoutes, getTags, saveRoutes, saveTags } from "../repositories/local-repo"
import type { RouteTag } from "../types/tag"

function normalizeTagName(name: string) {
  return name.trim().toLowerCase()
}

function ensureUniqueTagName(tags: RouteTag[], name: string, excludeTagId?: string) {
  const normalizedName = normalizeTagName(name)
  const duplicatedTag = tags.find(
    (tag) => tag.id !== excludeTagId && normalizeTagName(tag.name) === normalizedName
  )

  if (duplicatedTag) {
    throw new Error("标签名称不能重复")
  }
}

export async function listTags() {
  const [tags, routes] = await Promise.all([getTags(), getRoutes()])
  return tags
    .map((tag) => ({
      ...tag,
      routeCount: routes.filter((route) => route.tags.includes(tag.name)).length
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "zh-CN"))
}

export async function createTag(name: string) {
  const tags = await getTags()
  const trimmedName = name.trim()
  if (!trimmedName) {
    throw new Error("标签名称不能为空")
  }

  ensureUniqueTagName(tags, trimmedName)

  const timestamp = nowIsoString()
  const nextTag: RouteTag = {
    id: crypto.randomUUID(),
    name: trimmedName,
    color: "#5b6fff",
    createdAt: timestamp,
    updatedAt: timestamp
  }

  await saveTags([...tags, nextTag])
  return nextTag
}

export async function renameTag(tagId: string, name: string) {
  const [tags, routes] = await Promise.all([getTags(), getRoutes()])
  const targetTag = tags.find((tag) => tag.id === tagId)
  if (!targetTag) {
    throw new Error("标签不存在")
  }

  const trimmedName = name.trim()
  if (!trimmedName) {
    throw new Error("标签名称不能为空")
  }

  ensureUniqueTagName(tags, trimmedName, tagId)

  const timestamp = nowIsoString()
  const nextTags = tags.map((tag) =>
    tag.id === tagId
      ? {
          ...tag,
          name: trimmedName,
          updatedAt: timestamp
        }
      : tag
  )

  const nextRoutes = routes.map((route) => ({
    ...route,
    tags: route.tags.map((tagName) => (tagName === targetTag.name ? trimmedName : tagName))
  }))

  await Promise.all([saveTags(nextTags), saveRoutes(nextRoutes)])
}

export async function deleteTag(tagId: string) {
  const [tags, routes] = await Promise.all([getTags(), getRoutes()])
  const targetTag = tags.find((tag) => tag.id === tagId)
  if (!targetTag) {
    return
  }

  const nextTags = tags.filter((tag) => tag.id !== tagId)
  const nextRoutes = routes.map((route) => ({
    ...route,
    tags: route.tags.filter((tagName) => tagName !== targetTag.name)
  }))

  await Promise.all([saveTags(nextTags), saveRoutes(nextRoutes)])
}
