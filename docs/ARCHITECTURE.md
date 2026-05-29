# Architecture Overview

xyMusicUpdater is built with a hybrid architecture designed to complement Navidrome with extra features.

## Structure

*   **Navidrome**: Handles high-speed scanning, Subsonic API compatibility, and lightweight audio streaming to end-user clients (phones, web players).
*   **xyMusicUpdater (Python/Django)**: Acts as the "manager" node. It handles complex, resource-intensive tasks like web scraping (`yt-dlp`), API integrations (MusicBrainz), audio processing (`ffmpeg`), and detailed database administration. We intentionally avoid utilizing the latest Navidrome plugin system, as its framework restrictions could limit the implementation of certain advanced functionalities.

## Data Flow & Storage

The system utilizes several shared Docker volumes to pass data between the manager and Navidrome:

1.  **`/music/temp`**: The primary working directory. `yt-dlp` downloads raw audio here. Navidrome scans this folder for new additions.
2.  **`/music/permanent`**: The archive directory. Songs protected by specific playlists or manual intervention are moved here during a purge.
3.  **`/navidrome_data`**: Contains `navidrome.db`. xyMusicUpdater uses direct SQLite queries to interact with this database, bypassing Navidrome's read-only API to achieve features like compilation merging and immediate metadata syncing.
4.  **`/app/data`**: The persistent state folder for xyMusicUpdater. It houses `db.sqlite3` (Django models), custom UI backgrounds, and isolated `/previews` for the audio editor.

## Core Logic Modules (`backend/core/logic/`)

The backend is modularized for clarity:

*   **`ytdlp.py`**: Wraps the `yt-dlp` CLI. Handles downloading, sanitizing output, and checking for duplicates against both local and Navidrome databases.
*   **`tagger.py`**: Integrates with MusicBrainz and iTunes APIs to fetch metadata and cover art. Uses `mutagen` to write ID3 tags directly to files.
*   **`editor.py`**: Wraps `ffmpeg` for precise audio trimming. Generates temporary previews stored safely in `/app/data/previews` before finalizing changes.
*   **`pipeline.py`**: Orchestrates the cron jobs and manual downloads, linking downloading, tagging, and registering steps.
*   **`storage.py`**: Manages the storage quota, executing the purge logic based on retention policies and playlist protection.
*   **`navidrome.py`**: Contains the direct SQLite queries for interacting with Navidrome's internal database (e.g., triggering rescans, merging compilations).
*   **`utils.py`**: Provides shared utilities, including Server-Sent Events (SSE) broadcasting and secure configuration retrieval.
