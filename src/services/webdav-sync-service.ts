import { decodeBackup, encodeBackup } from "../lib/backup"
import { getAppSnapshot, saveAppSnapshot } from "../repositories/local-repo"
import { loadSettings } from "./settings-service"

function buildAuthorization(username: string, password: string) {
  return `Basic ${btoa(`${username}:${password}`)}`
}

function joinWebdavUrl(baseUrl: string, filePath: string) {
  const normalizedBase = baseUrl.replace(/\/+$/, "")
  const normalizedPath = filePath.replace(/^\/+/, "")
  return `${normalizedBase}/${normalizedPath}`
}

async function createHeaders() {
  const settings = await loadSettings()
  if (!settings.webdavUrl.trim()) {
    throw new Error("请先填写 WebDAV 地址。")
  }

  if (!settings.webdavUsername.trim()) {
    throw new Error("请先填写 WebDAV 用户名。")
  }

  if (!settings.webdavPassword.trim()) {
    throw new Error("请先填写 WebDAV 密码。")
  }

  if (!settings.webdavFilePath.trim()) {
    throw new Error("请先填写 WebDAV 备份路径。")
  }

  return {
    url: joinWebdavUrl(settings.webdavUrl.trim(), settings.webdavFilePath.trim()),
    headers: {
      Authorization: buildAuthorization(settings.webdavUsername.trim(), settings.webdavPassword.trim())
    }
  }
}

export async function uploadSnapshotToWebdav() {
  const snapshot = await getAppSnapshot()
  const encoded = await encodeBackup(snapshot)
  const { url, headers } = await createHeaders()

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      ...headers,
      "Content-Type": "application/octet-stream"
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

  const raw = await response.text()
  const snapshot = await decodeBackup(raw)
  await saveAppSnapshot(snapshot)
}

export async function verifyWebdavConnection() {
  const { url, headers } = await createHeaders()
  const response = await fetch(url, {
    method: "HEAD",
    headers
  })

  if (!response.ok && response.status !== 404) {
    throw new Error(`WebDAV 连接失败：${response.status} ${response.statusText}`)
  }
}
