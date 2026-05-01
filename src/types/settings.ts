export type AppSettings = {
  dedupeByUrl: boolean
  syncProvider: "local" | "chrome-sync" | "webdav" | "rest"
  enableVisitTracking: boolean
  viewMode: "grid" | "list"
  collapsedGroupIds: readonly string[]
  webdavUrl: string
  webdavUsername: string
  webdavPassword: string
  webdavFilePath: string
  webdavBackupLimit: number
}
