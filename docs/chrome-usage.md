# OpenTab 在 Chrome 中的使用说明

## 1. 当前打包产物

最新可加载目录：

- [dist](../dist)

关键文件包括：

- [dist/manifest.json](../dist/manifest.json)
- [dist/popup.html](../dist/popup.html)
- [dist/manager.html](../dist/manager.html)
- [dist/sidepanel.html](../dist/sidepanel.html)
- [dist/options.html](../dist/options.html)
- [dist/share.html](../dist/share.html)

说明：

- `manager.html` 是独立管理页（复用 sidepanel 代码）。
- `sidepanel.html` 用于 Chrome Side Panel。
- `share.html` 用于分享分组的导入页面。
- 通过 Popup 打开管理页时，会在原来的浏览器窗口中新建固定标签页。

## 2. 如何加载到 Chrome

1. 打开 `chrome://extensions/`
2. 开启右上角“开发者模式”
3. 点击“加载已解压的扩展程序”
4. 选择目录 `dist`

## 3. 当前版本怎么用

### 3.1 收藏当前页面

1. 打开任意普通网页。
2. 点击 Chrome 工具栏里的 `OpenTab` 图标。
3. 在 Popup 中点击“收藏当前页面”。

### 3.2 打开管理页面

1. 点击 Chrome 工具栏里的 `OpenTab` 图标。
2. 点击 Popup 顶部的“打开管理页面”。

行为说明：

- 如果管理页还没打开，会在当前浏览器窗口中新建一个固定标签页。
- 打开的页面是 `manager.html`，不是 `sidepanel.html`。
- 如果管理页已经打开，会优先切换并聚焦到已有标签页。

### 3.3 关于 Side Panel

- `sidepanel.html` 作为 Side Panel 入口使用。
- `manager.html` 复用 sidepanel 代码，作为独立管理页。
- 点击扩展图标时，不默认打开 Side Panel（`openPanelOnActionClick: false`）。

## 4. 管理页导航

管理页左侧现在支持这些入口：

- 仪表盘（Dashboard）
- 全部收藏
- 最近访问
- 标签管理
- 备份管理（本地备份 + WebDAV 同步）
- 导出
- 导入
- 设置

## 5. 导入 / 导出备份

当前版本不再直接使用裸 JSON 作为备份文件。

现在的规则是：

- 导出文件扩展名是 `.opentab.zip`
- 导出文件名格式是 `backup_时间戳.opentab.zip`
- 文件内部使用 JSZip 压缩，包含 `manifest.json`、`archive.json`、`snapshot.json`、`webdav-configs.json`
- 兼容旧版 gzip 格式的 `.opentab` 文件

使用方式：

1. 打开管理页左侧的”导出”或”导入”
2. 导出时点击”导出 .opentab.zip 备份”
3. 导入时选择之前导出的 `.opentab.zip` 文件

设置页中的导入 / 导出也使用同一套格式。

## 6. 固定要求

当前这些要求已经冻结：

1. 分组名称不能重复
2. 收藏的网址必须能打开
3. 管理页面必须是独立页面
4. 独立管理页必须使用 `manager.html`
5. 通过 Popup 打开管理页时必须在原来的浏览器窗口中新建固定标签页
6. 最近访问最多 10 条
7. 分组内路由必须采用单条列表展示
8. 必须支持批量打开分组中的地址
9. 备份文件必须使用 `.opentab.zip` 格式，而不是裸 JSON

对应文档见：

- [frozen-requirements.md](./frozen-requirements.md)

## 7. 重新打包的方法

在项目根目录执行：

```bash
npm run build
```

然后回到 `chrome://extensions/`：

1. 找到 `OpenTab`
2. 点击“刷新”
