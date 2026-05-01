export function isGroupCollapsed(collapsedGroupIds: readonly string[], groupId: string) {
  return collapsedGroupIds.includes(groupId)
}

export function toggleCollapsedGroupId(collapsedGroupIds: readonly string[], groupId: string) {
  return collapsedGroupIds.includes(groupId)
    ? collapsedGroupIds.filter((id) => id !== groupId)
    : [...collapsedGroupIds, groupId]
}
