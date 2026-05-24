import difflib
from pathlib import Path
from typing import Any, List, Optional
from django.utils import timezone as dj_tz
from .utils import _cfg, emit, _normalize_for_match
from .ytdlp import _ytdlp_download, _is_duplicate
from .navidrome import navidrome_rescan
from .storage import purge_oldest_songs

def fetch_all_sources(job: Optional[Any] = None) -> List[Path]:
    cfg = _cfg()
    sources = eval(cfg["SOURCES"]) if isinstance(cfg["SOURCES"], str) else cfg["SOURCES"]
    temp = Path(cfg["TEMP_FOLDER"])
    temp.mkdir(parents=True, exist_ok=True)
    all_files = []
    limit = int(cfg.get("MAX_SONGS_PER_SOURCE", 10))
    for label, urls in sources.items():
        emit(f"Source: {label}", job=job)
        for url in urls:
            all_files.extend(_ytdlp_download(url, temp, label, max_items=limit, job=job))
    return all_files

def register_songs(files: List[Path], source: str = "", job: Optional[Any] = None) -> List[Any]:
    from ..models import Song
    from .tagger import _read_basic_tags, search_musicbrainz_api
    added = []
    for f in files:
        if not f.exists():
            continue
        
        # Read Video ID if it exists
        video_id = ""
        vid_file = Path(str(f) + ".vid")
        if vid_file.exists():
            try:
                video_id = vid_file.read_text(encoding="utf-8").strip()
                vid_file.unlink()
            except Exception:
                pass

        t, a, al, aa = _read_basic_tags(f)
        needs_tagging, query_term, pending_conf = True, t if t else f.stem, False
        if query_term:
            match = search_musicbrainz_api(query_term, limit=1)
            if match:
                res = match[0]
                if difflib.SequenceMatcher(None, query_term.lower(), res['title'].lower()).ratio() > 0.9:
                    if not res.get("album"): res["album"] = res["title"]
                    if not res.get("album_artist"): res["album_artist"] = res.get("artist")
                    t, a, al, aa, needs_tagging, pending_conf = res['title'], res['artist'], res['album'], res['album_artist'], False, True
                    emit(f"Auto-Tag Suggested (needs confirmation): {t}", job=job)
        
        song, created = Song.objects.get_or_create(
            filename=f.name, 
            defaults={
                "filepath": str(f), 
                "video_id": video_id,
                "title": t, 
                "artist": a, 
                "album": al, 
                "source": source, 
                "file_size": f.stat().st_size, 
                "status": "active", 
                "needs_tagging": needs_tagging, 
                "pending_confirmation": pending_conf
            }
        )
        if not created: 
            song.status, song.title, song.artist, song.needs_tagging, song.pending_confirmation = "active", t, a, needs_tagging, pending_conf
            if video_id: song.video_id = video_id
            song.save()
        if job:
            job.songs_added.add(song)
        added.append(song)
    return added

def run_pipeline(job: Optional[Any] = None) -> None:
    from ..models import DownloadJob
    if not job:
        job = DownloadJob.objects.create(job_type="cron", status="running")
    emit("Scheduled Pipeline Started", job=job)
    files = fetch_all_sources(job=job)
    if files: 
        register_songs(files, source="cron", job=job)
        navidrome_rescan(job=job)
    purge_oldest_songs(job=job)
    job.status="done"
    job.finished_at = dj_tz.now()
    job.save()
    emit("Scheduled Pipeline Complete ✓", job=job)

def retry_interrupted_jobs() -> None:
    from ..models import DownloadJob
    DownloadJob.objects.filter(status="running").update(status="failed", error="Interrupted")
