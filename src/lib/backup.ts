import type { AppSnapshot } from "../repositories/local-repo"

const BACKUP_MAGIC = "OPENTAB_BACKUP_V1"

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

export function createBackupFilename() {
  return `backup_${formatTimestamp()}.opentab`
}

export async function encodeBackup(snapshot: AppSnapshot) {
  const payload = JSON.stringify(snapshot)
  const compressed = await compressText(payload)
  return `${BACKUP_MAGIC}\n${compressed}`
}

export async function decodeBackup(raw: string): Promise<AppSnapshot> {
  const [magic, ...rest] = raw.trim().split("\n")
  if (magic !== BACKUP_MAGIC) {
    throw new Error("备份文件格式不正确，无法识别。")
  }

  const decoded = await decompressText(rest.join("\n"))
  const parsed = JSON.parse(decoded)

  return {
    routes: Array.isArray(parsed.routes) ? parsed.routes : [],
    groups: Array.isArray(parsed.groups) ? parsed.groups : [],
    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    visits: Array.isArray(parsed.visits) ? parsed.visits : [],
    settings:
      parsed.settings && typeof parsed.settings === "object"
        ? parsed.settings
        : {
            dedupeByUrl: true,
            syncProvider: "local",
            enableVisitTracking: true,
            viewMode: "grid"
          }
  }
}
