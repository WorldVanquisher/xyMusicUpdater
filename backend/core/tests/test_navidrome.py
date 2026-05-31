import pytest
from pathlib import Path
from core.logic.navidrome import (
    _get_playlist_track_map,
    _delete_from_navidrome_db,
    _write_latest_m3u,
    _sync_navidrome_metadata,
    navidrome_rescan,
)


# ── _get_playlist_track_map ───────────────────────────────────────────────────

def test_get_playlist_track_map_returns_empty_when_db_missing():
    result = _get_playlist_track_map()
    assert isinstance(result, dict)
    assert result == {}


def test_get_playlist_track_map_returns_empty_when_db_path_not_exists():
    result = _get_playlist_track_map()
    assert result == {}


# ── _delete_from_navidrome_db ─────────────────────────────────────────────────

def test_delete_from_navidrome_db_silent_when_db_missing(tmp_path):
    f = tmp_path / "song.mp3"
    f.touch()
    _delete_from_navidrome_db(f)


def test_delete_from_navidrome_db_accepts_any_path(tmp_path):
    p = tmp_path / "subdir" / "track.flac"
    _delete_from_navidrome_db(p)


# ── _sync_navidrome_metadata ──────────────────────────────────────────────────

def test_sync_navidrome_metadata_silent_when_db_missing():
    _sync_navidrome_metadata(
        "/music/temp/old.mp3",
        "/music/permanent/new.mp3",
        {"title": "Title", "artist": "Artist", "album": "Album", "album_artist": "Artist"}
    )


def test_sync_navidrome_metadata_accepts_empty_tags():
    _sync_navidrome_metadata("/old.mp3", "/new.mp3", {})


# ── _write_latest_m3u ─────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_write_latest_m3u_creates_file(tmp_path):
    from core.models import Song, SystemConfig
    temp_dir = tmp_path / "temp"
    temp_dir.mkdir()
    SystemConfig.objects.update_or_create(key="TEMP_FOLDER", defaults={"value": str(temp_dir)})

    Song.objects.create(filename="a.mp3", filepath=str(temp_dir / "a.mp3"), status="active")
    Song.objects.create(filename="b.mp3", filepath=str(temp_dir / "b.mp3"), status="moved")

    _write_latest_m3u()

    m3u = temp_dir / "latest.m3u"
    assert m3u.exists()
    content = m3u.read_text(encoding="utf-8")
    assert "#EXTM3U" in content


@pytest.mark.django_db
def test_write_latest_m3u_includes_active_and_moved(tmp_path):
    from core.models import Song, SystemConfig
    temp_dir = tmp_path / "temp"
    temp_dir.mkdir()
    SystemConfig.objects.update_or_create(key="TEMP_FOLDER", defaults={"value": str(temp_dir)})

    Song.objects.create(filename="active.mp3", filepath=str(temp_dir / "active.mp3"), status="active")
    Song.objects.create(filename="moved.mp3", filepath="/music/permanent/moved.mp3", status="moved")
    Song.objects.create(filename="deleted.mp3", filepath=str(temp_dir / "deleted.mp3"), status="deleted")

    _write_latest_m3u()

    content = (temp_dir / "latest.m3u").read_text(encoding="utf-8")
    assert "active.mp3" in content
    assert "moved.mp3" in content
    assert "deleted.mp3" not in content


@pytest.mark.django_db
def test_write_latest_m3u_empty_when_no_songs(tmp_path):
    from core.models import SystemConfig
    temp_dir = tmp_path / "temp"
    temp_dir.mkdir()
    SystemConfig.objects.update_or_create(key="TEMP_FOLDER", defaults={"value": str(temp_dir)})

    _write_latest_m3u()

    m3u = temp_dir / "latest.m3u"
    assert m3u.exists()
    assert "#EXTM3U" in m3u.read_text(encoding="utf-8")


# ── navidrome_rescan ──────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_navidrome_rescan_returns_true_and_runs_async(mocker):
    mocker.patch("core.logic.navidrome._write_latest_m3u")
    mock_get = mocker.patch("requests.get")
    mock_get.return_value.status_code = 200

    result = navidrome_rescan()
    assert result is True


@pytest.mark.django_db
def test_navidrome_rescan_with_job_runs_synchronously(mocker):
    from core.models import DownloadJob
    job = DownloadJob.objects.create(job_type="cron", status="running")
    mocker.patch("core.logic.navidrome._write_latest_m3u")
    mocker.patch("requests.get").return_value.status_code = 200
    mocker.patch("requests.post").return_value.status_code = 401

    result = navidrome_rescan(job=job, full_scan=True)
    assert result is True
