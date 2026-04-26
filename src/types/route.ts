export type RouteItem = {
  id: string
  url: string
  path: string
  title: string
  icon?: string
  groupId?: string
  tags: string[]
  note?: string
  env?: "dev" | "staging" | "prod"
  starred: boolean
  createdAt: string
  updatedAt: string
  lastVisitedAt?: string
  visitCount: number
}
