type SearchBarProps = {
  value: string
  onChange: (value: string) => void
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <input
      className="searchbar-input"
      onChange={(event) => onChange(event.target.value)}
      placeholder="搜索路由名称或地址..."
      type="search"
      value={value}
    />
  )
}
