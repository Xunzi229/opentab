export type AppSettings = {
  dedupeByUrl: boolean
  syncProvider: "local" | "chrome-sync" | "webdav" | "rest"
  enableVisitTracking: boolean
  viewMode: "grid" | "list"
}
