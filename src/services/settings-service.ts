import { getSettings, saveSettings } from "../repositories/local-repo"

export async function loadSettings() {
  return getSettings()
}

export async function updateSettings<T extends keyof Awaited<ReturnType<typeof getSettings>>>(
  key: T,
  value: Awaited<ReturnType<typeof getSettings>>[T]
) {
  const settings = await getSettings()
  const nextSettings = {
    ...settings,
    [key]: value
  }

  await saveSettings(nextSettings)
  return nextSettings
}
