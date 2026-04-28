import { decodeBackup, encodeBackup } from "../lib/backup"
import { getAppSnapshot, saveAppSnapshot } from "../repositories/local-repo"
import { loadSettings } from "./settings-service"
import type { AppSettings } from "../types/settings"

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
  const webdavUrl = (settings.webdavUrl || "")
  const webdavUsername = (settings.webdavUsername || "")
  const webdavPassword = (settings.webdavPassword || "")
  const webdavFilePath = (settings.webdavFilePath || "")

  if (!webdavUrl.trim()) {
    throw new Error("请先填写 WebDAV 地址。")
  }
  if (!webdavUsername.trim()) {
    throw new Error("请先填写 WebDAV 用户名。")
  }
  if (!webdavPassword.trim()) {
    throw new Error("请先填写 WebDAV 密码。")
  }
  if (!webdavFilePath.trim()) {
    throw new Error("请先填写 WebDAV 备份路径。")
  }

  return {
    url: joinWebdavUrl(webdavUrl.trim(), webdavFilePath.trim()),
    headers: {
      Authorization: buildAuthorization(webdavUsername.trim(), webdavPassword.trim())
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

export async function uploadFileToWebdav(remotePath: string, content: string, contentType = "application/json", config?: { webdavUrl: string, webdavUsername: string, webdavPassword: string }) {
  let webdavUrl: string, webdavUsername: string, webdavPassword: string

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

  if (!webdavUrl) throw new Error("请先填写 WebDAV 地址。")
  if (!webdavUsername) throw new Error("请先填写 WebDAV 用户名。")
  if (!webdavPassword) throw new Error("请先填写 WebDAV 密码。")

  const url = joinWebdavUrl(webdavUrl, remotePath)

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: buildAuthorization(webdavUsername, webdavPassword),
      "Content-Type": contentType
    },
    body: content
  })

  if (!response.ok) {
    throw new Error(`WebDAV 上传失败：${response.status} ${response.statusText}`)
  }
}

export async function deleteFileFromWebdav(remotePath: string, config?: { webdavUrl: string, webdavUsername: string, webdavPassword: string }) {
  let webdavUrl: string, webdavUsername: string, webdavPassword: string

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

  if (!webdavUrl) throw new Error("请先填写 WebDAV 地址。")
  if (!webdavUsername) throw new Error("请先填写 WebDAV 用户名。")
  if (!webdavPassword) throw new Error("请先填写 WebDAV 密码。")

  const url = joinWebdavUrl(webdavUrl, remotePath)

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: buildAuthorization(webdavUsername, webdavPassword)
    }
  })

  if (!response.ok && response.status !== 404) {
    throw new Error(`WebDAV 删除失败：${response.status} ${response.statusText}`)
  }
}

export async function downloadFileFromWebdav(remotePath: string, config?: { webdavUrl: string, webdavUsername: string, webdavPassword: string }): Promise<string> {
  let webdavUrl: string, webdavUsername: string, webdavPassword: string

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

  if (!webdavUrl) throw new Error("请先填写 WebDAV 地址。")
  if (!webdavUsername) throw new Error("请先填写 WebDAV 用户名。")
  if (!webdavPassword) throw new Error("请先填写 WebDAV 密码。")

  const url = joinWebdavUrl(webdavUrl, remotePath)

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: buildAuthorization(webdavUsername, webdavPassword)
    }
  })

  if (!response.ok) {
    throw new Error(`WebDAV 下载失败：${response.status} ${response.statusText}`)
  }

  return await response.text()
}

export async function listWebdavFiles(remoteDir: string, config?: { webdavUrl: string, webdavUsername: string, webdavPassword: string }): Promise<string[]> {
  let webdavUrl: string, webdavUsername: string, webdavPassword: string

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

  if (!webdavUrl) throw new Error("请先填写 WebDAV 地址。")
  if (!webdavUsername) throw new Error("请先填写 WebDAV 用户名。")
  if (!webdavPassword) throw new Error("请先填写 WebDAV 密码。")

  const url = joinWebdavUrl(webdavUrl, remoteDir)

  const response = await fetch(url, {
    method: "PROPFIND",
    headers: {
      Authorization: buildAuthorization(webdavUsername, webdavPassword),
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
    const fileName = fullPath.split("/").pop() || ""
    if (fileName && fileName !== remoteDir) {
      files.push(fileName)
    }
  })

  return files
}
