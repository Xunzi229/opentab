export const STORAGE_KEYS = {
  routes: "opentab_routes",
  groups: "opentab_groups",
  tags: "opentab_tags",
  visits: "opentab_visits",
  settings: "opentab_settings"
} as const

export const DEFAULT_GROUP_ID = "default"

export const DEFAULT_GROUPS = [
  {
    id: DEFAULT_GROUP_ID,
    name: "未分组",
    color: "#7c8aa5",
    sort: 0,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString()
  }
]

export const DEFAULT_SETTINGS = {
  dedupeByUrl: true,
  syncProvider: "local",
  enableVisitTracking: true,
  viewMode: "grid",
  webdavUrl: "",
  webdavUsername: "",
  webdavPassword: "",
  webdavFilePath: "opentab/backup.opentab"
} as const
