const DAY_IN_MS = 24 * 60 * 60 * 1000

export function nowIsoString() {
  return new Date().toISOString()
}

export function formatDateTime(value?: string) {
  if (!value) {
    return "-"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date)
}

export function isWithinLastDays(value: string | undefined, days: number) {
  if (!value) {
    return false
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return false
  }

  return Date.now() - date.getTime() <= days * DAY_IN_MS
}
