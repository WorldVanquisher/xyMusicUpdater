import pytest
from core.logic.utils import _sanitize_filename, _normalize_for_match

def test_sanitize_filename():
    assert _sanitize_filename('Artist / Title?') == 'Artist Title'
    assert _sanitize_filename('Song: "Cool"') == 'Song Cool'
    assert _sanitize_filename('Multiple    Spaces') == 'Multiple Spaces'
    assert _sanitize_filename('Path\\With/Slashes') == 'Path With/Slashes'.replace('/', ' ').replace('\\', ' ') # It replaces with space

def test_normalize_for_match():
    assert _normalize_for_match('Testing Song.mp3') == 'testingsong'
    assert _normalize_for_match('Another Song! (2023)') == 'anothersong2023'
    assert _normalize_for_match('') == ''
