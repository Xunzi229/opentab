import assert from "node:assert/strict"
import test from "node:test"
import {
  formatWebdavDownloadMessage,
  formatWebdavRefreshMessage,
  formatWebdavUploadMessage,
  getBackupStatusIntro
} from "../src/lib/backup-ui.ts"

test("getBackupStatusIntro returns the default backup page copy", () => {
  assert.equal(getBackupStatusIntro(), "这里统一管理本地备份和 WebDAV 同步。")
})

test("formatWebdavUploadMessage returns the replaced-backup detail when needed", () => {
  assert.equal(formatWebdavUploadMessage(false), "上传完成，当前本地数据已同步到 WebDAV。")
  assert.equal(formatWebdavUploadMessage(true), "上传完成，当前本地数据已同步到 WebDAV，已覆盖最旧的一条远程备份并更新时间。")
})

test("formatWebdavDownloadMessage includes the source path", () => {
  assert.equal(formatWebdavDownloadMessage("opentab/backup-2026-05-01.zip"), "下载完成，已从 WebDAV 恢复远程备份：opentab/backup-2026-05-01.zip。")
})

test("formatWebdavRefreshMessage reflects whether backups exist", () => {
  assert.equal(formatWebdavRefreshMessage(0), "远程备份列表已刷新，当前还没有可恢复的历史备份。")
  assert.equal(formatWebdavRefreshMessage(4), "远程备份列表已刷新，当前共有 4 条备份。")
})
