import json
import os
import re
import threading
from typing import Any, Dict, Optional
from django.utils import timezone as dj_tz

# ── SSE Logging & Messaging ───────────────────────────────────────────────

_sse_listeners: list[Any] = []
_sse_lock = threading.Lock()

def register_sse_listener(q: Any) -> None:
    with _sse_lock:
        if q not in _sse_listeners:
            _sse_listeners.append(q)

def unregister_sse_listener(q: Any) -> None:
    with _sse_lock:
        if q in _sse_listeners:
            _sse_listeners.remove(q)

def _broadcast(data: Dict[str, Any]) -> None:
    msg = json.dumps(data)
    with _sse_lock:
        cur = list(_sse_listeners)
    for q in cur:
        try:
            q.put_nowait(msg)
        except Exception:
            unregister_sse_listener(q)

def emit(msg: str, job: Optional[Any] = None, level: str = "info", event_type: str = "log") -> None:
    from ..models import ActivityLog
    print(f"[{level.upper()}] {msg}")
    now_iso = dj_tz.now().isoformat()
    if job:
        try:
            ActivityLog.objects.create(job=job, message=msg, level=level)
        except Exception:
            pass
    _broadcast({"type": event_type, "message": msg, "level": level, "ts": now_iso})

# ── Configuration & Helpers ───────────────────────────────────────────────

def _cfg() -> Dict[str, Any]:
    from django.conf import settings
    from ..models import SystemConfig
    base_cfg = settings.MUSIC_CONFIG.copy()
    try:
        for item in SystemConfig.objects.all():
            base_cfg[item.key] = item.value
    except Exception:
        pass
    return base_cfg

def _sanitize_filename(name: str) -> str:
    s = re.sub(r'[\\/*?:"<>|]', " ", name)
    s = re.sub(r'\s+', " ", s).strip()
    return s

def _normalize_for_match(s: str) -> str:
    if not s:
        return ""
    # Remove extensions from normalization key to avoid collision
    base = os.path.splitext(s.lower())[0]
    return re.sub(r'[^a-z0-9]', '', base)
