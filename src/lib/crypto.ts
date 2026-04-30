const ENCRYPTION_KEY_NAME = "opentab_encryption_key"

async function getKey(): Promise<CryptoKey> {
  const stored = await chrome.storage.local.get(ENCRYPTION_KEY_NAME)
  if (stored[ENCRYPTION_KEY_NAME]) {
    const raw = Uint8Array.from(atob(stored[ENCRYPTION_KEY_NAME]), c => c.charCodeAt(0))
    return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"])
  }
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"])
  const exported = await crypto.subtle.exportKey("raw", key)
  const encoded = btoa(String.fromCharCode(...new Uint8Array(exported)))
  await chrome.storage.local.set({ [ENCRYPTION_KEY_NAME]: encoded })
  return key
}

export async function encryptText(plainText: string): Promise<string> {
  if (!plainText) {
    return ""
  }
  const key = await getKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plainText)
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded)
  return `${btoa(String.fromCharCode(...iv))}:${btoa(String.fromCharCode(...new Uint8Array(encrypted)))}`
}

export async function decryptText(encryptedText: string): Promise<string> {
  if (!encryptedText) {
    return ""
  }
  const separatorIndex = encryptedText.indexOf(":")
  if (separatorIndex === -1) {
    return encryptedText
  }
  try {
    const key = await getKey()
    const ivStr = encryptedText.slice(0, separatorIndex)
    const dataStr = encryptedText.slice(separatorIndex + 1)
    const iv = Uint8Array.from(atob(ivStr), c => c.charCodeAt(0))
    const data = Uint8Array.from(atob(dataStr), c => c.charCodeAt(0))
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data)
    return new TextDecoder().decode(decrypted)
  } catch {
    return encryptedText
  }
}
