# 架构概览

xyMusicUpdater 采用混合架构设计，旨在补充 Navidrome 的功能。

## 架构结构

*   **Navidrome**: 负责高速文件扫描、兼容 Subsonic API，并向终端用户客户端（手机 APP、Web 播放器）提供轻量级的音频流。
*   **xyMusicUpdater (Python/Django)**: 充当“管理器”节点。它负责处理复杂、耗费系统资源的任务，如网络数据抓取 (`yt-dlp`)、API 集成（MusicBrainz）、音频处理 (`ffmpeg`) 以及深度的数据库管理操作。我们特意没有采用 Navidrome 最新推出的插件系统，因为其框架自身的限制可能会阻碍某些高级功能的完整实现。

## 数据流与存储

系统利用几个共享的 Docker 数据卷在管理器和 Navidrome 之间传递数据：

1.  **`/music/temp`**: 主要的工作目录。`yt-dlp` 会将原始音频下载到此处。Navidrome 会扫描此文件夹以识别新内容。
2.  **`/music/permanent`**: 存档目录。在触发空间清理 (Purge) 时，受特定歌单保护或经过手动干预保护的歌曲会被移动到此处。
3.  **`/navidrome_data`**: 存放了 `navidrome.db`。xyMusicUpdater 直接使用 SQLite 查询与此数据库进行交互，绕过了 Navidrome 的只读 API 限制，从而实现合辑合并和即时的元数据同步等功能。
4.  **`/app/data`**: xyMusicUpdater 的持久化状态文件夹。它存放着 `db.sqlite3`（Django 数据模型）、自定义 UI 背景图以及用于音频编辑器的隔离的 `/previews` 文件夹。

## 核心业务逻辑模块 (`backend/core/logic/`)

后端被模块化为以下几个清晰的部分：

*   **`ytdlp.py`**: 封装了 `yt-dlp` 命令行工具。处理下载、净化输出，并通过本地和 Navidrome 数据库进行重复项检测。
*   **`tagger.py`**: 集成 MusicBrainz 和 iTunes API，获取元数据和封面图片。使用 `mutagen` 将 ID3 标签直接写入文件。
*   **`editor.py`**: 封装了 `ffmpeg`，实现精准的音频裁剪。在确认修改之前，会在安全的 `/app/data/previews` 中生成临时预览文件。
*   **`pipeline.py`**: 协调定时任务和手动下载操作，将下载、打标签和注册入库等步骤串联起来。
*   **`storage.py`**: 管理存储配额，根据保留策略和歌单保护逻辑执行清理 (Purge) 操作。
*   **`navidrome.py`**: 包含与 Navidrome 内部数据库交互的直接 SQLite 查询逻辑（如触发重新扫描、合并合辑专辑）。
*   **`utils.py`**: 提供共享的实用工具，包括服务器发送事件 (SSE) 广播和安全的系统配置检索。
