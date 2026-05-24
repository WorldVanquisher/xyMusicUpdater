from pathlib import Path
import os
from django.http import HttpResponse
from django.utils import timezone as dj_tz
from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import Song
from ..serializers import SongSerializer
from ..logic import (
    confirm_pending_tags, reject_pending_tags, _get_playlist_track_map,
    apply_manual_tags, _delete_from_navidrome_db, navidrome_rescan,
    revert_song_to_original, auto_tag_all_untagged, cleanup_deleted_history,
    search_musicbrainz_api, get_compilation_candidates, merge_compilation
)

@api_view(["GET"])
def compilation_candidates_view(request):
    candidates = get_compilation_candidates()
    return Response(candidates)

@api_view(["POST"])
def merge_compilation_view(request):
    nd_song_ids = request.data.get("ids", [])
    if not nd_song_ids:
        return Response({"error": "No IDs provided"}, status=400)
    count = merge_compilation(nd_song_ids)
    return Response({"status": "ok", "merged": count})

def nd_song_cover_view(request, nd_id):
    import sqlite3
    from urllib.parse import unquote
    db_path = "/navidrome_data/navidrome.db"
    if not os.path.exists(db_path):
        return HttpResponse(status=404)
        
    path_str = ""
    try:
        with sqlite3.connect(db_path, timeout=5) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT path FROM media_file WHERE id = ?", (nd_id,))
            row = cursor.fetchone()
            if row:
                path_str = unquote(row[0])
    except Exception as e:
        print(f"DEBUG: DB error: {e}")
        return HttpResponse(status=404)
        
    if not path_str:
        print(f"DEBUG: Path not found for ID {nd_id}")
        return HttpResponse(status=404)
        
    # Robust path resolution
    variations = [
        Path("/music") / path_str,
        Path("/music") / unquote(path_str),
        Path(path_str) if path_str.startswith("/") else None,
    ]
    
    abs_path = None
    for v in variations:
        if v and v.exists():
            abs_path = v
            break

    if not abs_path:
        fname = os.path.basename(path_str)
        for folder in ["temp", "permanent"]:
            p = Path("/music") / folder / fname
            if p.exists():
                abs_path = p
                break

    if not abs_path:
        print(f"DEBUG: File not found for path {path_str}")
        return HttpResponse(status=404)
        
    cover_data = None
    mime_type = "image/jpeg"
    try:
        if abs_path.suffix.lower() == ".mp3":
            from mutagen.id3 import ID3
            tags = ID3(abs_path)
            # Find any APIC frame
            for key in tags.keys():
                if key.startswith("APIC"):
                    cover_data = tags[key].data
                    mime_type = tags[key].mime
                    break
        elif abs_path.suffix.lower() in [".flac", ".ogg", ".opus"]:
            from mutagen import File
            audio = File(abs_path)
            if audio and hasattr(audio, 'pictures') and audio.pictures:
                cover_data = audio.pictures[0].data
                mime_type = audio.pictures[0].mime
    except Exception as e:
        print(f"DEBUG: Cover extraction error: {e}")
        pass
        
    if cover_data:
        return HttpResponse(cover_data, content_type=mime_type)
    return HttpResponse(status=404)

@api_view(["GET"])
def songs_view(request):
    status_filter = request.query_params.get("status", "active")
    qs = Song.objects.all().order_by("-created_at")
    if status_filter == "pending":
        qs = qs.filter(pending_confirmation=True)
    elif status_filter:
        qs = qs.filter(status=status_filter)
    return Response(SongSerializer(qs, many=True).data)

@api_view(["POST"])
def confirm_tags_view(request):
    song_ids = request.data.get("ids", [])
    count = confirm_pending_tags(song_ids=song_ids)
    return Response({"status": "ok", "confirmed": count})

@api_view(["POST"])
def reject_tags_view(request):
    song_ids = request.data.get("ids", [])
    count = reject_pending_tags(song_ids=song_ids)
    return Response({"status": "ok", "rejected": count})

@api_view(["GET"])
def playlist_map_view(request):
    m = _get_playlist_track_map()
    # Convert sets to lists for JSON
    serializable_map = {k: list(v) for k, v in m.items()}
    return Response(serializable_map)

@api_view(["GET", "PATCH", "DELETE"])
def song_detail_view(request, pk):
    try:
        song = Song.objects.get(pk=pk)
    except Song.DoesNotExist:
        return Response({"error": "Not found"}, status=404)
        
    if request.method == "PATCH":
        try:
            updated_song = apply_manual_tags(song, request.data)
            return Response(SongSerializer(updated_song).data)
        except Exception as e:
            return Response({"error": str(e)}, status=400)
            
    if request.method == "DELETE":
        path = Path(song.filepath)
        path.unlink(missing_ok=True)
        path.with_suffix(".info.json").unlink(missing_ok=True)
        _delete_from_navidrome_db(path)
        song.status = "deleted"
        song.deleted_at = dj_tz.now()
        song.needs_tagging = False
        song.save()
        navidrome_rescan()
        return Response({"status": "deleted"})
    
    return Response(SongSerializer(song).data)

@api_view(["POST"])
def revert_song_view(request, pk):
    try:
        song = Song.objects.get(pk=pk)
    except Song.DoesNotExist:
        return Response({"error": "Not found"}, status=404)
    try:
        revert_song_to_original(song)
        return Response({"status": "ok"})
    except Exception as e:
        return Response({"error": str(e)}, status=400)

def song_cover_view(request, pk):
    try:
        song = Song.objects.get(pk=pk)
    except Song.DoesNotExist:
        return HttpResponse(status=404)
    
    path = Path(song.filepath)
    if not path.exists():
        return HttpResponse(status=404)
    
    cover_data = None
    mime_type = "image/jpeg"
    try:
        if path.suffix.lower() == ".mp3":
            from mutagen.id3 import ID3
            tags = ID3(path)
            for tag in tags.values():
                if tag.getID() == "APIC":
                    cover_data = tag.data
                    mime_type = tag.mime
                    break
        elif path.suffix.lower() in [".flac", ".ogg", ".opus"]:
            from mutagen import File
            audio = File(path)
            if audio.pictures:
                cover_data = audio.pictures[0].data
                mime_type = audio.pictures[0].mime
        if not mime_type:
            mime_type = "image/png"
    except Exception:
        pass
    if cover_data:
        return HttpResponse(cover_data, content_type=mime_type)
    return HttpResponse(status=404)

@api_view(["POST"])
def auto_tag_all_view(request):
    count = auto_tag_all_untagged()
    return Response({"status": "ok", "tagged": count})

@api_view(["POST"])
def cleanup_history_view(request):
    days = request.data.get("days")
    try:
        count = cleanup_deleted_history(days_override=int(days)) if days is not None else cleanup_deleted_history()
        return Response({"status": "ok", "count": count})
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(["GET"])
def search_musicbrainz_view(request):
    query = request.query_params.get("q", "")
    if not query:
        return Response([])
    results = search_musicbrainz_api(query)
    return Response(results)
