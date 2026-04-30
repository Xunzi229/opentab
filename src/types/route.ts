export interface Environment {
  name: string
  url: string
}

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
  environments?: Environment[]
  activeEnv?: string
  repoUrl?: string
  httpMethod?: string
  headers?: Record<string, string>
  starred: boolean
  createdAt: string
  updatedAt: string
  lastVisitedAt?: string
  visitCount: number
  sortOrder?: number
}
