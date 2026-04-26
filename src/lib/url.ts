export function isSupportedRouteUrl(url: string) {
  return url.startsWith("http://") || url.startsWith("https://")
}

function normalizeHashPath(hash: string) {
  if (!hash) {
    return ""
  }

  if (hash.startsWith("#/")) {
    return hash.slice(1)
  }

  if (hash.startsWith("#!/")) {
    return hash.slice(2)
  }

  return hash
}

export function toRoutePath(url: string) {
  try {
    const parsedUrl = new URL(url)
    const pathname = `${parsedUrl.pathname}${parsedUrl.search}`
    const hashPath = normalizeHashPath(parsedUrl.hash)

    if ((parsedUrl.pathname === "/" || parsedUrl.pathname === "") && hashPath) {
      return hashPath
    }

    if (parsedUrl.pathname === "/" && !parsedUrl.search && !parsedUrl.hash) {
      return `${parsedUrl.hostname}/`
    }

    return `${pathname}${hashPath && !hashPath.startsWith("#") ? parsedUrl.hash : ""}` || "/"
  } catch {
    return url
  }
}

export function toNormalizedUrl(url: string) {
  try {
    const parsedUrl = new URL(url)
    parsedUrl.hash = ""
    return parsedUrl.toString()
  } catch {
    return url
  }
}

export function toDisplayRouteText(path: string, url: string) {
  const trimmedPath = path.trim()
  if (trimmedPath && trimmedPath !== "/") {
    return trimmedPath
  }

  try {
    const parsedUrl = new URL(url)
    const hostname = parsedUrl.hostname
    const suffix = `${parsedUrl.search}${parsedUrl.hash}`
    return `${hostname}/${
      suffix ? suffix.replace(/^(\?|#)/, "") : ""
    }`.replace(/\/$/, "/")
  } catch {
    return url
  }
}
