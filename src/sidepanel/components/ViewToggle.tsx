interface ViewToggleProps {
  mode: "grid" | "list"
  onChange: (mode: "grid" | "list") => void
}

export function ViewToggle({ mode, onChange }: ViewToggleProps) {
  return (
    <div className="view-toggle">
      <button
        className={mode === "grid" ? "is-active" : ""}
        onClick={() => onChange("grid")}
        title="网格视图"
        type="button"
      >
        ▦
      </button>
      <button
        className={mode === "list" ? "is-active" : ""}
        onClick={() => onChange("list")}
        title="列表视图"
        type="button"
      >
        ☰
      </button>
    </div>
  )
}
