export function getBackupStatusIntro() {
  return "这里统一管理本地备份和 WebDAV 同步。"
}

export function formatWebdavUploadMessage(replaced: boolean) {
  if (replaced) {
    return "上传完成，当前本地数据已同步到 WebDAV，已覆盖最旧的一条远程备份并更新时间。"
  }

  return "上传完成，当前本地数据已同步到 WebDAV。"
}

export function formatWebdavDownloadMessage(sourcePath: string) {
  return `下载完成，已从 WebDAV 恢复远程备份：${sourcePath}。`
}

export function formatWebdavRefreshMessage(backupCount: number) {
  return backupCount > 0 ? `远程备份列表已刷新，当前共有 ${backupCount} 条备份。` : "远程备份列表已刷新，当前还没有可恢复的历史备份。"
}
