import type { Environment } from "../types/route"

export function replaceEnvVariables(url: string, variables: Record<string, string>): string {
  return url.replace(/\{(\w+)\}/g, (_, key) => variables[key] ?? `{${key}}`)
}

export function getEnvUrl(environments: Environment[], activeEnv: string): string | undefined {
  return environments.find(e => e.name === activeEnv)?.url
}

export function toCurl(url: string, method?: string, headers?: Record<string, string>): string {
  const parts = ["curl"]
  if (method && method !== "GET") parts.push(`-X ${method}`)
  if (headers) {
    Object.entries(headers).forEach(([k, v]) => parts.push(`-H "${k}: ${v}"`))
  }
  parts.push(`"${url}"`)
  return parts.join(" ")
}

export function toFetch(url: string, method?: string, headers?: Record<string, string>): string {
  const opts: Record<string, unknown> = {}
  if (method && method !== "GET") opts.method = method
  if (headers && Object.keys(headers).length > 0) opts.headers = headers
  if (Object.keys(opts).length === 0) return `fetch("${url}")`
  return `fetch("${url}", ${JSON.stringify(opts, null, 2)})`
}

export function toRepoDisplayName(repoUrl: string): string {
  try {
    const url = new URL(repoUrl)
    const parts = url.pathname.split("/").filter(Boolean)
    if (parts.length >= 2) return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`
    return repoUrl
  } catch {
    return repoUrl
  }
}
