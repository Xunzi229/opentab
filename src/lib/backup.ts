import JSZip from "jszip"
import { DEFAULT_SETTINGS } from "./constants"
import type { AppBackupArchive, AppSnapshot } from "../repositories/local-repo"

const BACKUP_MAGIC = "OPENTAB_BACKUP_V1"
const BACKUP_ARCHIVE_VERSION = 2

function formatTimestamp(date = new Date()) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  const hours = `${date.getHours()}`.padStart(2, "0")
  const minutes = `${date.getMinutes()}`.padStart(2, "0")
  const seconds = `${date.getSeconds()}`.padStart(2, "0")
  return `${year}${month}${day}_${hours}${minutes}${seconds}`
}

async function compressText(text: string) {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"))
  const compressedBuffer = await new Response(stream).arrayBuffer()
  return arrayBufferToBase64(compressedBuffer)
}

async function decompressText(base64: string) {
  const compressedBuffer = base64ToArrayBuffer(base64)
  const stream = new Blob([compressedBuffer]).stream().pipeThrough(new DecompressionStream("gzip"))
  return new Response(stream).text()
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64: string) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes.buffer
}

function normalizeSnapshot(parsed: unknown): AppSnapshot {
  if (!parsed || typeof parsed !== "object") {
    return {
      routes: [],
      groups: [],
      tags: [],
      visits: [],
      settings: { ...DEFAULT_SETTINGS }
    }
  }

  const snapshot = parsed as Partial<AppSnapshot>

  return {
    routes: Array.isArray(snapshot.routes) ? snapshot.routes : [],
    groups: Array.isArray(snapshot.groups) ? snapshot.groups : [],
    tags: Array.isArray(snapshot.tags) ? snapshot.tags : [],
    visits: Array.isArray(snapshot.visits) ? snapshot.visits : [],
    settings:
      snapshot.settings && typeof snapshot.settings === "object"
        ? snapshot.settings
        : { ...DEFAULT_SETTINGS }
  }
}

function normalizeArchive(parsed: unknown): AppBackupArchive {
  if (!parsed || typeof parsed !== "object") {
    return {
      snapshot: normalizeSnapshot(null),
      webdavConfigs: []
    }
  }

  const archive = parsed as Partial<AppBackupArchive>
  return {
    snapshot: normalizeSnapshot(archive.snapshot),
    webdavConfigs: Array.isArray(archive.webdavConfigs) ? archive.webdavConfigs : []
  }
}

function isZipArchive(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04
}

async function decodeLegacyBackup(raw: string): Promise<AppBackupArchive> {
  const [magic, ...rest] = raw.trim().split("\n")
  if (magic !== BACKUP_MAGIC) {
    throw new Error("备份文件格式不正确，无法识别。")
  }

  const decoded = await decompressText(rest.join("\n"))
  const parsed = JSON.parse(decoded)

  return {
    snapshot: normalizeSnapshot(parsed),
    webdavConfigs: []
  }
}

async function decodeZipBackup(buffer: ArrayBuffer): Promise<AppBackupArchive> {
  const zip = await JSZip.loadAsync(buffer)
  const archiveFile = zip.file("archive.json")
  const snapshotFile = zip.file("snapshot.json")

  if (archiveFile) {
    const archiveJson = await archiveFile.async("string")
    return normalizeArchive(JSON.parse(archiveJson))
  }

  if (snapshotFile) {
    const snapshotJson = await snapshotFile.async("string")
    const webdavConfigsJson = await zip.file("webdav-configs.json")?.async("string")
    return {
      snapshot: normalizeSnapshot(JSON.parse(snapshotJson)),
      webdavConfigs: webdavConfigsJson ? JSON.parse(webdavConfigsJson) : []
    }
  }

  throw new Error("备份压缩包缺少必要文件，无法恢复。")
}

export function createBackupFilename() {
  return `backup_${formatTimestamp()}.opentab.zip`
}

export async function encodeBackup(archive: AppBackupArchive) {
  const zip = new JSZip()
  zip.file(
    "manifest.json",
    JSON.stringify(
      {
        magic: BACKUP_MAGIC,
        version: BACKUP_ARCHIVE_VERSION,
        exportedAt: new Date().toISOString()
      },
      null,
      2
    )
  )
  zip.file("archive.json", JSON.stringify(archive))
  zip.file("snapshot.json", JSON.stringify(archive.snapshot, null, 2))
  zip.file("webdav-configs.json", JSON.stringify(archive.webdavConfigs, null, 2))

  return zip.generateAsync({
    type: "arraybuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 9 }
  })
}

export async function decodeBackup(input: string | ArrayBuffer): Promise<AppBackupArchive> {
  if (typeof input === "string") {
    return decodeLegacyBackup(input)
  }

  if (isZipArchive(input)) {
    return decodeZipBackup(input)
  }

  const rawText = new TextDecoder().decode(input)
  return decodeLegacyBackup(rawText)
}
