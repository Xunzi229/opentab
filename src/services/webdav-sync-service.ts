import { decodeBackup, encodeBackup } from "../lib/backup"
import { decryptText } from "../lib/crypto"
import { getAppBackupArchive, saveAppBackupArchive } from "../repositories/local-repo"
import { loadSettings } from "./settings-service"
import type { AppSettings } from "../types/settings"

export type WebdavConfig = {
  webdavUrl: string
  webdavUsername: string
  webdavPassword: string
}

export type WebdavBackupItem = {
  name: string
  remotePath: string
  createdAt: number | null
}

const DEFAULT_WEBDAV_SNAPSHOT_FILENAME = "backup.opentab.zip"

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

function normalizeBackupLimit(limit: number | undefined) {
  if (!Number.isFinite(limit)) {
    return 10
  }

  return Math.min(100, Math.max(1, Math.floor(limit as number)))
}

function splitFilename(filename: string) {
  const lastDotIndex = filename.lastIndexOf(".")
  if (lastDotIndex <= 0) {
    return {
      baseName: filename,
      extension: ""
    }
  }

  return {
    baseName: filename.slice(0, lastDotIndex),
    extension: filename.slice(lastDotIndex)
  }
}

function formatBackupTimestamp(date = new Date()) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  const hours = `${date.getHours()}`.padStart(2, "0")
  const minutes = `${date.getMinutes()}`.padStart(2, "0")
  const seconds = `${date.getSeconds()}`.padStart(2, "0")
  return `${year}${month}${day}_${hours}${minutes}${seconds}`
}

function parseBackupTimestamp(name: string) {
  const match = name.match(/_(\d{8}_\d{6})(?:\.[^.]+)+$/)
  if (!match) {
    return null
  }

  const raw = match[1]
  const year = Number(raw.slice(0, 4))
  const month = Number(raw.slice(4, 6))
  const day = Number(raw.slice(6, 8))
  const hours = Number(raw.slice(9, 11))
  const minutes = Number(raw.slice(11, 13))
  const seconds = Number(raw.slice(13, 15))
  return new Date(year, month - 1, day, hours, minutes, seconds).getTime()
}

function resolveSnapshotContext(remotePath: string) {
  const normalizedPath = normalizeRemotePath(remotePath)
  if (!normalizedPath) {
    return {
      latestFilename: DEFAULT_WEBDAV_SNAPSHOT_FILENAME,
      latestPath: DEFAULT_WEBDAV_SNAPSHOT_FILENAME,
      directory: "",
      versionPrefix: splitFilename(DEFAULT_WEBDAV_SNAPSHOT_FILENAME).baseName,
      versionExtension: splitFilename(DEFAULT_WEBDAV_SNAPSHOT_FILENAME).extension
    }
  }

  const lastSegment = normalizedPath.split("/").pop() || ""
  if (!lastSegment.includes(".")) {
    const latestFilename = DEFAULT_WEBDAV_SNAPSHOT_FILENAME
    return {
      latestFilename,
      latestPath: `${normalizedPath}/${latestFilename}`,
      directory: normalizedPath,
      versionPrefix: splitFilename(latestFilename).baseName,
      versionExtension: splitFilename(latestFilename).extension
    }
  }

  const directory = normalizedPath.includes("/") ? normalizedPath.slice(0, normalizedPath.lastIndexOf("/")) : ""
  const { baseName, extension } = splitFilename(lastSegment)
  return {
    latestFilename: lastSegment,
    latestPath: normalizedPath,
    directory,
    versionPrefix: baseName,
    versionExtension: extension
  }
}

function buildVersionedBackupName(remotePath: string, date = new Date()) {
  const context = resolveSnapshotContext(remotePath)
  return `${context.versionPrefix}_${formatBackupTimestamp(date)}${context.versionExtension || ".zip"}`
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

function buildWebdavError(action: string, response: Response) {
  return new Error(`${action}失败：${response.status} ${response.statusText}`)
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
    webdavPassword = await decryptText(settings.webdavPassword || "")
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

async function loadWebdavSnapshotSettings() {
  const settings = await loadSettings()
  const resolvedConfig = await loadRequiredWebdavConfig()
  const rawPath = (settings.webdavFilePath || "").trim()

  if (!rawPath) {
    throw new Error("请先填写 WebDAV 备份路径。")
  }

  return {
    config: resolvedConfig,
    rawPath,
    limit: normalizeBackupLimit(settings.webdavBackupLimit)
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
      throw buildWebdavError("WebDAV 目录检查", propfindResponse)
    }

    const createResponse = await fetch(directoryUrl, {
      method: "MKCOL",
      headers
    })

    if (createResponse.ok || createResponse.status === 405) {
      continue
    }

    throw buildWebdavError("WebDAV 目录创建", createResponse)
  }
}

export async function verifyWebdavConnection(config?: WebdavConfig) {
  const resolvedConfig = await loadRequiredWebdavConfig(config)
  const settings = config ? ({ webdavFilePath: DEFAULT_WEBDAV_SNAPSHOT_FILENAME } as Pick<AppSettings, "webdavFilePath">) : await loadSettings()
  const targetPath = resolveSnapshotContext((settings.webdavFilePath || "").trim()).latestPath
  const targetUrl = joinWebdavUrl(resolvedConfig.webdavUrl, targetPath)

  const response = await fetch(targetUrl, {
    method: "PROPFIND",
    headers: {
      ...buildWebdavHeaders(resolvedConfig),
      Depth: "0"
    }
  })

  if (!response.ok && response.status !== 404) {
    throw buildWebdavError("WebDAV 连接检查", response)
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
    throw buildWebdavError("WebDAV 上传", response)
  }
}

async function uploadBinaryToWebdav(remotePath: string, content: ArrayBuffer, config: WebdavConfig) {
  const normalizedPath = normalizeRemotePath(remotePath)
  const url = joinWebdavUrl(config.webdavUrl, normalizedPath)

  await ensureRemoteDirectories(normalizedPath, config)

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      ...buildWebdavHeaders(config),
      "Content-Type": "application/octet-stream"
    },
    body: content
  })

  if (!response.ok) {
    throw buildWebdavError("WebDAV 上传", response)
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
    throw buildWebdavError("WebDAV 删除", response)
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
    throw buildWebdavError("WebDAV 下载", response)
  }

  return await response.text()
}

async function downloadBinaryFromWebdav(remotePath: string, config: WebdavConfig) {
  const url = joinWebdavUrl(config.webdavUrl, normalizeRemotePath(remotePath))
  const response = await fetch(url, {
    method: "GET",
    headers: buildWebdavHeaders(config)
  })

  if (!response.ok) {
    throw buildWebdavError("WebDAV 下载", response)
  }

  const raw = await response.arrayBuffer()
  if (raw.byteLength === 0) {
    throw new Error("下载失败：WebDAV 返回的文件为空，请先上传有效备份。")
  }

  return raw
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
    throw buildWebdavError("WebDAV 列表获取", response)
  }

  if (response.status === 404) {
    return []
  }

  const xml = await response.text()
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, "text/xml")
  const hrefs = doc.querySelectorAll("d\\:href, href")
  const files = new Set<string>()
  const currentName = normalizedDir.split("/").pop() || ""

  hrefs.forEach((href) => {
    const fullPath = href.textContent || ""
    const decodedPath = decodeURIComponent(fullPath)
    const normalizedHref = decodedPath.replace(/\/+$/, "")
    const fileName = normalizedHref.split("/").pop() || ""
    if (fileName && fileName !== currentName) {
      files.add(fileName)
    }
  })

  return Array.from(files)
}

export async function listWebdavBackups(config?: WebdavConfig, remotePath?: string): Promise<WebdavBackupItem[]> {
  const settings = await loadSettings()
  const resolvedConfig = await loadRequiredWebdavConfig(config)
  const rawPath = ((remotePath ?? settings.webdavFilePath ?? "").trim()) || DEFAULT_WEBDAV_SNAPSHOT_FILENAME
  const context = resolveSnapshotContext(rawPath)
  const files = await listWebdavFiles(context.directory, resolvedConfig)

  return files
    .filter((file) => file.endsWith(".zip"))
    .filter((file) => file !== context.latestFilename)
    .filter((file) => file.startsWith(`${context.versionPrefix}_`))
    .map((file) => ({
      name: file,
      remotePath: context.directory ? `${context.directory}/${file}` : file,
      createdAt: parseBackupTimestamp(file)
    }))
    .sort((left, right) => (right.createdAt ?? 0) - (left.createdAt ?? 0) || right.name.localeCompare(left.name))
}

export async function enforceWebdavBackupLimit(config?: WebdavConfig) {
  const settings = await loadSettings()
  const resolvedConfig = await loadRequiredWebdavConfig(config)
  const rawPath = ((settings.webdavFilePath || "").trim() || DEFAULT_WEBDAV_SNAPSHOT_FILENAME)
  const limit = config ? 10 : normalizeBackupLimit(settings.webdavBackupLimit)
  const backups = await listWebdavBackups(resolvedConfig, rawPath)
  const removed = backups.slice(limit)

  for (const backup of removed) {
    await deleteFileFromWebdav(backup.remotePath, resolvedConfig)
  }

  return {
    removed
  }
}

export async function uploadSnapshotToWebdav() {
  const archive = await getAppBackupArchive()
  const encoded = await encodeBackup(archive)

  if (encoded.byteLength < 100) {
    throw new Error(`上传失败：备份数据异常小（${encoded.byteLength} bytes），请先确认本地数据是否正常。`)
  }

  const { config, rawPath, limit } = await loadWebdavSnapshotSettings()
  const context = resolveSnapshotContext(rawPath)
  const backups = await listWebdavBackups(config, rawPath)
  const oldestBackup = backups.length >= limit ? backups[backups.length - 1] : null
  const versionedName = buildVersionedBackupName(rawPath)
  const versionedPath = context.directory ? `${context.directory}/${versionedName}` : versionedName

  await uploadBinaryToWebdav(versionedPath, encoded, config)
  await uploadBinaryToWebdav(context.latestPath, encoded, config)

  if (oldestBackup && oldestBackup.remotePath !== versionedPath) {
    await deleteFileFromWebdav(oldestBackup.remotePath, config)
  }

  return {
    uploadedPath: versionedPath,
    latestPath: context.latestPath,
    replaced: oldestBackup
  }
}

async function restoreSnapshotFromBuffer(raw: ArrayBuffer) {
  const archive = await decodeBackup(raw)
  if (archive.snapshot.routes.length === 0 && archive.snapshot.groups.length === 0) {
    const localArchive = await getAppBackupArchive()
    if (localArchive.snapshot.routes.length > 0 || localArchive.snapshot.groups.length > 0) {
      throw new Error("下载的备份数据为空，但本地已有数据。为防止覆盖，本次恢复已中止。")
    }
  }

  await saveAppBackupArchive(archive)
}

export async function downloadSnapshotFromWebdav(remotePath?: string) {
  const { config, rawPath } = await loadWebdavSnapshotSettings()

  if (remotePath) {
    const raw = await downloadBinaryFromWebdav(remotePath, config)
    await restoreSnapshotFromBuffer(raw)
    return {
      sourcePath: normalizeRemotePath(remotePath)
    }
  }

  const backups = await listWebdavBackups(config, rawPath)
  if (backups.length > 0) {
    const raw = await downloadBinaryFromWebdav(backups[0].remotePath, config)
    await restoreSnapshotFromBuffer(raw)
    return {
      sourcePath: backups[0].remotePath
    }
  }

  const latestPath = resolveSnapshotContext(rawPath).latestPath
  const raw = await downloadBinaryFromWebdav(latestPath, config)
  await restoreSnapshotFromBuffer(raw)
  return {
    sourcePath: latestPath
  }
}

export async function deleteWebdavBackup(remotePath: string) {
  await deleteFileFromWebdav(remotePath)
}
