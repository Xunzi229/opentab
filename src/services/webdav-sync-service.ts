import { decodeBackup, encodeBackup } from "../lib/backup"
import { getAppBackupArchive, saveAppBackupArchive } from "../repositories/local-repo"
import { loadSettings } from "./settings-service"
import type { AppSettings } from "../types/settings"

type WebdavConfig = {
  webdavUrl: string
  webdavUsername: string
  webdavPassword: string
}

function buildAuthorization(username: string, password: string) {
  return `Basic ${btoa(`${username}:${password}`)}`
}

function joinWebdavUrl(baseUrl: string, filePath: string) {
  const normalizedBase = baseUrl.replace(/\/+$/, "")
  const normalizedPath = filePath.replace(/^\/+/, "")
  return normalizedPath ? `${normalizedBase}/${normalizedPath}` : normalizedBase
}

function normalizeRemotePath(remotePath: string) {
  return remotePath.trim().replace(/^\/+/, "").replace(/\/+$/, "")
}

function buildWebdavHeaders(config: WebdavConfig) {
  return {
    Authorization: buildAuthorization(config.webdavUsername, config.webdavPassword)
  }
}

function getParentDirectory(remotePath: string) {
  const normalizedPath = normalizeRemotePath(remotePath)
  if (!normalizedPath.includes("/")) {
    return ""
  }

  return normalizedPath.slice(0, normalizedPath.lastIndexOf("/"))
}

function buildAncestorDirectories(remotePath: string) {
  const parentDirectory = getParentDirectory(remotePath)
  if (!parentDirectory) {
    return []
  }

  const segments = parentDirectory.split("/").filter(Boolean)
  return segments.map((_, index) => segments.slice(0, index + 1).join("/"))
}

export function resolveWebdavConfigDirectory(remotePath: string) {
  const normalizedPath = normalizeRemotePath(remotePath)
  if (!normalizedPath) {
    return ""
  }

  const lastSegment = normalizedPath.split("/").pop() || ""
  if (lastSegment.includes(".")) {
    return getParentDirectory(normalizedPath)
  }

  return normalizedPath
}

async function loadRequiredWebdavConfig(config?: WebdavConfig) {
  let webdavUrl: string
  let webdavUsername: string
  let webdavPassword: string

  if (config) {
    webdavUrl = config.webdavUrl.trim()
    webdavUsername = config.webdavUsername.trim()
    webdavPassword = config.webdavPassword.trim()
  } else {
    const settings: AppSettings = await loadSettings()
    webdavUrl = (settings.webdavUrl || "").trim()
    webdavUsername = (settings.webdavUsername || "").trim()
    webdavPassword = (settings.webdavPassword || "").trim()
  }

  if (!webdavUrl) {
    throw new Error("请先填写 WebDAV 地址。")
  }
  if (!webdavUsername) {
    throw new Error("请先填写 WebDAV 用户名。")
  }
  if (!webdavPassword) {
    throw new Error("请先填写 WebDAV 密码。")
  }

  return { webdavUrl, webdavUsername, webdavPassword }
}

async function createHeaders() {
  const settings = await loadSettings()
  const webdavUrl = (settings.webdavUrl || "").trim()
  const webdavUsername = (settings.webdavUsername || "").trim()
  const webdavPassword = (settings.webdavPassword || "").trim()
  const webdavFilePath = (settings.webdavFilePath || "").trim()

  if (!webdavUrl) {
    throw new Error("请先填写 WebDAV 地址。")
  }
  if (!webdavUsername) {
    throw new Error("请先填写 WebDAV 用户名。")
  }
  if (!webdavPassword) {
    throw new Error("请先填写 WebDAV 密码。")
  }
  if (!webdavFilePath) {
    throw new Error("请先填写 WebDAV 备份路径。")
  }

  return {
    url: joinWebdavUrl(webdavUrl, webdavFilePath),
    headers: buildWebdavHeaders({ webdavUrl, webdavUsername, webdavPassword }),
    config: { webdavUrl, webdavUsername, webdavPassword },
    filePath: webdavFilePath
  }
}

async function ensureRemoteDirectories(remotePath: string, config: WebdavConfig) {
  const directories = buildAncestorDirectories(remotePath)
  if (directories.length === 0) {
    return
  }

  const headers = buildWebdavHeaders(config)

  for (const directory of directories) {
    const directoryUrl = joinWebdavUrl(config.webdavUrl, directory)
    const propfindResponse = await fetch(directoryUrl, {
      method: "PROPFIND",
      headers: {
        ...headers,
        Depth: "0"
      }
    })

    if (propfindResponse.ok) {
      continue
    }

    if (propfindResponse.status !== 404) {
      throw new Error(`WebDAV 目录检查失败：${propfindResponse.status} ${propfindResponse.statusText}`)
    }

    const createResponse = await fetch(directoryUrl, {
      method: "MKCOL",
      headers
    })

    if (createResponse.ok || createResponse.status === 405) {
      continue
    }

    throw new Error(`WebDAV 目录创建失败：${createResponse.status} ${createResponse.statusText}`)
  }
}

export async function uploadSnapshotToWebdav() {
  const archive = await getAppBackupArchive()
  const encoded = await encodeBackup(archive)
  const { url, headers, config, filePath } = await createHeaders()

  await ensureRemoteDirectories(filePath, config)

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      ...headers,
      "Content-Type": "application/zip"
    },
    body: encoded
  })

  if (!response.ok) {
    throw new Error(`WebDAV 上传失败：${response.status} ${response.statusText}`)
  }
}

export async function downloadSnapshotFromWebdav() {
  const { url, headers } = await createHeaders()
  const response = await fetch(url, {
    method: "GET",
    headers
  })

  if (!response.ok) {
    throw new Error(`WebDAV 下载失败：${response.status} ${response.statusText}`)
  }

  const raw = await response.arrayBuffer()
  const archive = await decodeBackup(raw)
  await saveAppBackupArchive(archive)
}

export async function verifyWebdavConnection() {
  const { url, headers } = await createHeaders()
  const response = await fetch(url, {
    method: "PROPFIND",
    headers: {
      ...headers,
      Depth: "0"
    }
  })

  if (!response.ok && response.status !== 404) {
    throw new Error(`WebDAV 连接失败：${response.status} ${response.statusText}`)
  }
}

export async function uploadFileToWebdav(remotePath: string, content: string, contentType = "application/json", config?: WebdavConfig) {
  const resolvedConfig = await loadRequiredWebdavConfig(config)
  const normalizedPath = normalizeRemotePath(remotePath)
  const url = joinWebdavUrl(resolvedConfig.webdavUrl, normalizedPath)

  await ensureRemoteDirectories(normalizedPath, resolvedConfig)

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      ...buildWebdavHeaders(resolvedConfig),
      "Content-Type": contentType
    },
    body: content
  })

  if (!response.ok) {
    throw new Error(`WebDAV 上传失败：${response.status} ${response.statusText}`)
  }
}

export async function deleteFileFromWebdav(remotePath: string, config?: WebdavConfig) {
  const resolvedConfig = await loadRequiredWebdavConfig(config)
  const url = joinWebdavUrl(resolvedConfig.webdavUrl, normalizeRemotePath(remotePath))

  const response = await fetch(url, {
    method: "DELETE",
    headers: buildWebdavHeaders(resolvedConfig)
  })

  if (!response.ok && response.status !== 404) {
    throw new Error(`WebDAV 删除失败：${response.status} ${response.statusText}`)
  }
}

export async function downloadFileFromWebdav(remotePath: string, config?: WebdavConfig): Promise<string> {
  const resolvedConfig = await loadRequiredWebdavConfig(config)
  const url = joinWebdavUrl(resolvedConfig.webdavUrl, normalizeRemotePath(remotePath))

  const response = await fetch(url, {
    method: "GET",
    headers: buildWebdavHeaders(resolvedConfig)
  })

  if (!response.ok) {
    throw new Error(`WebDAV 下载失败：${response.status} ${response.statusText}`)
  }

  return await response.text()
}

export async function listWebdavFiles(remoteDir: string, config?: WebdavConfig): Promise<string[]> {
  const resolvedConfig = await loadRequiredWebdavConfig(config)
  const normalizedDir = normalizeRemotePath(remoteDir)
  const url = joinWebdavUrl(resolvedConfig.webdavUrl, normalizedDir)

  const response = await fetch(url, {
    method: "PROPFIND",
    headers: {
      ...buildWebdavHeaders(resolvedConfig),
      Depth: "1"
    }
  })

  if (!response.ok && response.status !== 404) {
    throw new Error(`WebDAV 列表获取失败：${response.status} ${response.statusText}`)
  }

  if (response.status === 404) {
    return []
  }

  const xml = await response.text()
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, "text/xml")
  const hrefs = doc.querySelectorAll("d\\:href, href")

  const files: string[] = []
  hrefs.forEach((href) => {
    const fullPath = href.textContent || ""
    const decodedPath = decodeURIComponent(fullPath)
    const normalizedHref = decodedPath.replace(/\/+$/, "")
    const fileName = normalizedHref.split("/").pop() || ""
    if (fileName && fileName !== normalizedDir.split("/").pop()) {
      files.push(fileName)
    }
  })

  return files
}
