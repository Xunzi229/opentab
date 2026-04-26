import { useSettings } from "./hooks"
import { ImportExportPage } from "./pages/ImportExportPage"
import { PrivacyPage } from "./pages/PrivacyPage"
import { SyncSettingsPage } from "./pages/SyncSettingsPage"

export function App() {
  const { settings, refresh } = useSettings()

  return (
    <main className="options-shell">
      <SyncSettingsPage settings={settings} onUpdated={refresh} />
      <ImportExportPage onUpdated={refresh} />
      <PrivacyPage />
    </main>
  )
}
