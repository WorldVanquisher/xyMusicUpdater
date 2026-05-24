import pytest
import os
from pathlib import Path
from core.logic.storage import get_storage_info, purge_oldest_songs
from core.models import SystemConfig, Song

@pytest.mark.django_db
def test_get_storage_info(tmp_path):
    temp_dir = tmp_path / "temp"
    temp_dir.mkdir()
    
    # Create a 1MB file
    test_file = temp_dir / "test.mp3"
    test_file.write_bytes(b"\0" * (1024 * 1024))
    
    SystemConfig.objects.create(key="TEMP_FOLDER", value=str(temp_dir))
    SystemConfig.objects.create(key="MAX_STORAGE_SIZE", value="1") # 1 GB
    
    info = get_storage_info()
    assert info["used_bytes"] == 1024 * 1024
    assert info["total_gb"] == 1.0

@pytest.mark.django_db
def test_purge_oldest_songs(tmp_path, mocker):
    temp_dir = tmp_path / "temp"
    temp_dir.mkdir()
    perm_dir = tmp_path / "perm"
    perm_dir.mkdir()
    
    SystemConfig.objects.create(key="TEMP_FOLDER", value=str(temp_dir))
    SystemConfig.objects.create(key="PERMANENT_SAVING_DIR", value=str(perm_dir))
    SystemConfig.objects.create(key="HOLD_PERIOD_DAYS", value="0") # Immediate purge
    SystemConfig.objects.create(key="MAX_DELETE_PER_PURGE", value="10")
    
    # Create an old file
    old_file = temp_dir / "old.mp3"
    old_file.touch()
    old_time = 0
    os.utime(old_file, (old_time, old_time))
    
    # Mock Navidrome map (no protected songs)
    mocker.patch('core.logic.storage._get_playlist_track_map', return_value={})
    mocker.patch('core.logic.storage._delete_from_navidrome_db')
    
    purge_oldest_songs()
    
    assert not old_file.exists()
