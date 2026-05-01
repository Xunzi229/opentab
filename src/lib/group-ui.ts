export function formatGroupRouteCount(routeCount: number) {
  return `${routeCount} 条路由`
}

export function getCollapseGlyph(isCollapsed: boolean) {
  return isCollapsed ? "v" : "^"
}
