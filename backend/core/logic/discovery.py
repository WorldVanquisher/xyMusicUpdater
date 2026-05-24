from datetime import timedelta
from pathlib import Path
from typing import Any, Optional
from django.utils import timezone as dj_tz
from .utils import _cfg, emit
from .ytdlp import _ytdlp_download
from .navidrome import navidrome_rescan
from .storage import purge_oldest_songs
from .pipeline import register_songs

def run_single_subscription(sub_id: int) -> int:
    from ..models import SearchSubscription, DownloadJob
    try:
        sub = SearchSubscription.objects.get(pk=sub_id)
        if not sub.active:
            return 0
    except SearchSubscription.DoesNotExist:
        return 0

    cfg = _cfg()
    temp = Path(cfg["TEMP_FOLDER"])
    job = DownloadJob.objects.create(job_type="manual", status="running", created_at=dj_tz.now(), url=f"Discovery: {sub.label}")
    emit(f"Discovery Started: {sub.label}", job=job)
    keywords = [k.strip() for k in sub.keywords.split(",") if k.strip()]
    newly_added = 0
    for kw in keywords:
        search_query = kw if kw.startswith("http") else f"ytsearch{sub.amount}:{kw}"
        files = _ytdlp_download(search_query, temp, f"discovery_{getattr(sub, 'id')}", max_items=sub.amount, job=job, allow_playlist=True)
        if files:
            newly_added += len(register_songs(files, source=f"discovery:{sub.label}", job=job))
    
    sub.last_run = dj_tz.now()
    sub.save()
    
    job.status = "done"
    job.finished_at = dj_tz.now()
    job.save()
    
    emit(f"Discovery Finished: {sub.label}", job=job)
    return newly_added

def run_search_subscriptions(force: bool = False) -> None:
    from ..models import SearchSubscription
    subs = SearchSubscription.objects.filter(active=True)
    any_added = False
    for sub in subs:
        if force or not sub.last_run or dj_tz.now() >= sub.last_run + timedelta(days=sub.cycle_days):
            added = run_single_subscription(getattr(sub, 'id'))
            if added and added > 0:
                any_added = True
                
    if any_added: 
        navidrome_rescan()
        purge_oldest_songs()
