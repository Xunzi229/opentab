import { readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"

const rootDir = process.cwd()
const packageJsonPath = resolve(rootDir, "package.json")
const packageLockPath = resolve(rootDir, "package-lock.json")

function bumpPatchVersion(version) {
  const parts = version.split(".").map((part) => Number.parseInt(part, 10))
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part) || part < 0)) {
    throw new Error(`Unsupported version format: ${version}`)
  }

  parts[2] += 1
  return parts.join(".")
}

async function updateJsonFile(filePath, updateVersion) {
  const raw = await readFile(filePath, "utf8")
  const data = JSON.parse(raw)
  updateVersion(data)
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8")
}

const packageRaw = await readFile(packageJsonPath, "utf8")
const packageJson = JSON.parse(packageRaw)
const nextVersion = bumpPatchVersion(packageJson.version)

await updateJsonFile(packageJsonPath, (data) => {
  data.version = nextVersion
})

await updateJsonFile(packageLockPath, (data) => {
  data.version = nextVersion
  if (data.packages?.[""]) {
    data.packages[""].version = nextVersion
  }
})

console.log(`[OpenTab] version bumped to ${nextVersion}`)
