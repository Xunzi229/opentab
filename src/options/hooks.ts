import { useCallback, useEffect, useState } from "react"
import { loadSettings } from "../services/settings-service"
import type { AppSettings } from "../types/settings"

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null)

  const refresh = useCallback(async () => {
    const nextSettings = await loadSettings()
    setSettings(nextSettings)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    settings,
    refresh
  }
}
