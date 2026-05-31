import json
import queue
import pytest
from unittest.mock import patch
from core.logic.utils import (
    _sanitize_filename,
    _normalize_for_match,
    _get_safe_cfg,
    register_sse_listener,
    unregister_sse_listener,
    _broadcast,
    emit,
    _sse_listeners,
    _sse_lock,
)


# ── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def clean_sse():
    """Ensure SSE listener list is empty before and after each test."""
    with _sse_lock:
        original = list(_sse_listeners)
        _sse_listeners.clear()
    yield
    with _sse_lock:
        _sse_listeners.clear()
        _sse_listeners.extend(original)


# ── _sanitize_filename ────────────────────────────────────────────────────────

def test_sanitize_filename_removes_forbidden_chars():
    assert _sanitize_filename('Song: "Cool"') == 'Song Cool'
    assert _sanitize_filename('Artist / Title?') == 'Artist Title'
    assert _sanitize_filename('Hello*World') == 'Hello World'
    assert _sanitize_filename('<Track>') == 'Track'
    assert _sanitize_filename('Path|Pipe') == 'Path Pipe'

def test_sanitize_filename_collapses_whitespace():
    assert _sanitize_filename('Multiple    Spaces') == 'Multiple Spaces'
    assert _sanitize_filename('  leading trailing  ') == 'leading trailing'
    assert _sanitize_filename('a  b  c') == 'a b c'

def test_sanitize_filename_backslash_and_slash():
    assert _sanitize_filename('Path\\With/Slashes') == 'Path With Slashes'

def test_sanitize_filename_unicode_passthrough():
    assert _sanitize_filename('日本語タイトル') == '日本語タイトル'
    assert _sanitize_filename('Café du Monde') == 'Café du Monde'

def test_sanitize_filename_empty():
    assert _sanitize_filename('') == ''


# ── _normalize_for_match ──────────────────────────────────────────────────────

def test_normalize_for_match_strips_extension():
    assert _normalize_for_match('Testing Song.mp3') == 'testingsong'

def test_normalize_for_match_removes_punctuation():
    assert _normalize_for_match('Another Song! (2023)') == 'anothersong2023'

def test_normalize_for_match_empty_and_none():
    assert _normalize_for_match('') == ''
    assert _normalize_for_match(None) == ''

def test_normalize_for_match_unicode():
    result = _normalize_for_match('日本語.mp3')
    assert result == '日本語'

def test_normalize_for_match_lowercases():
    assert _normalize_for_match('UPPERCASE') == 'uppercase'

def test_normalize_for_match_no_extension():
    assert _normalize_for_match('no ext here') == 'noexthere'


# ── SSE infrastructure ────────────────────────────────────────────────────────

def test_register_and_unregister_listener():
    q = queue.Queue()
    register_sse_listener(q)
    assert q in _sse_listeners
    unregister_sse_listener(q)
    assert q not in _sse_listeners

def test_register_no_duplicates():
    q = queue.Queue()
    register_sse_listener(q)
    register_sse_listener(q)
    assert _sse_listeners.count(q) == 1

def test_broadcast_delivers_to_queue():
    q = queue.Queue()
    register_sse_listener(q)
    _broadcast({"type": "log", "message": "hello"})
    msg = q.get_nowait()
    data = json.loads(msg)
    assert data["message"] == "hello"
    assert data["type"] == "log"

def test_broadcast_delivers_to_multiple_queues():
    q1, q2 = queue.Queue(), queue.Queue()
    register_sse_listener(q1)
    register_sse_listener(q2)
    _broadcast({"type": "test", "message": "multi"})
    assert json.loads(q1.get_nowait())["message"] == "multi"
    assert json.loads(q2.get_nowait())["message"] == "multi"

def test_broadcast_removes_dead_listener():
    class BrokenQueue:
        def put_nowait(self, item):
            raise RuntimeError("queue is dead")

    dead = BrokenQueue()
    register_sse_listener(dead)
    assert dead in _sse_listeners
    _broadcast({"type": "test", "message": "purge"})
    assert dead not in _sse_listeners


# ── _get_safe_cfg ─────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_get_safe_cfg_masks_navidrome_password():
    from core.models import SystemConfig
    SystemConfig.objects.update_or_create(key="NAVIDROME_PASSWORD", defaults={"value": "secret123"})
    cfg = _get_safe_cfg()
    assert cfg.get("NAVIDROME_PASSWORD") == "********"

@pytest.mark.django_db
def test_get_safe_cfg_masks_ytdlp_password():
    from core.models import SystemConfig
    SystemConfig.objects.update_or_create(key="YTDLP_PASSWORD", defaults={"value": "mypassword"})
    cfg = _get_safe_cfg()
    assert cfg.get("YTDLP_PASSWORD") == "********"

@pytest.mark.django_db
def test_get_safe_cfg_does_not_mask_empty_strings():
    cfg = _get_safe_cfg()
    # Empty credentials must not be masked (condition: cfg[key] is truthy)
    assert cfg.get("YTDLP_COOKIES") == "" or cfg.get("YTDLP_COOKIES") is None or cfg.get("YTDLP_COOKIES") == "********" is False

@pytest.mark.django_db
def test_get_safe_cfg_returns_non_sensitive_keys_unmodified():
    from core.models import SystemConfig
    SystemConfig.objects.update_or_create(key="HOLD_PERIOD_DAYS", defaults={"value": "30"})
    cfg = _get_safe_cfg()
    assert cfg.get("HOLD_PERIOD_DAYS") == "30"


# ── emit ──────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_emit_broadcasts_message_to_listeners():
    q = queue.Queue()
    register_sse_listener(q)
    emit("Test broadcast", level="info")
    msg = q.get_nowait()
    data = json.loads(msg)
    assert data["message"] == "Test broadcast"
    assert data["level"] == "info"
    assert data["type"] == "log"

@pytest.mark.django_db
def test_emit_creates_activity_log_when_job_provided():
    from core.models import DownloadJob, ActivityLog
    job = DownloadJob.objects.create(job_type="manual", status="running")
    emit("Job log message", job=job, level="warning")
    log = ActivityLog.objects.filter(job=job, message="Job log message").first()
    assert log is not None
    assert log.level == "warning"

@pytest.mark.django_db
def test_emit_does_not_raise_without_job():
    emit("No job message")

@pytest.mark.django_db
def test_emit_custom_event_type():
    q = queue.Queue()
    register_sse_listener(q)
    emit("Delete event", event_type="purge_delete")
    data = json.loads(q.get_nowait())
    assert data["type"] == "purge_delete"
