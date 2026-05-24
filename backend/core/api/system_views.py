import json
import queue
from django.http import StreamingHttpResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import Song
from ..logic import get_storage_info, _cfg, register_sse_listener, unregister_sse_listener

@api_view(["GET"])
def status_view(request):
    info = get_storage_info()
    next_run = None
    try:
        from django.apps import apps
        scheduler = getattr(apps.get_app_config("core"), "_scheduler", None)
        if scheduler:
            job = scheduler.get_job("music_pipeline")
            if job:
                next_run = job.next_run_time
    except Exception:
        pass

    active_count = Song.objects.filter(status="active").count()
    deleted_count = Song.objects.filter(status="deleted").count()
    moved_count = Song.objects.filter(status="moved").count()
    cfg = _cfg()

    return Response({
        "storage": info,
        "songs": {"active": active_count, "deleted": deleted_count, "moved": moved_count},
        "next_cron_run": next_run,
        "config": cfg,
    })

import time
@csrf_exempt
def sse_stream(request):
    def event_generator():
        # Yield first to ensure headers are sent immediately
        yield "data: {\"type\": \"connected\"}\n\n"
        
        q = queue.Queue()
        register_sse_listener(q)
        try:
            while True:
                try:
                    msg = q.get(timeout=25)
                    yield f"data: {msg}\n\n"
                except queue.Empty:
                    yield "data: {\"type\": \"ping\"}\n\n"
        except GeneratorExit:
            pass
        except Exception:
            pass
        finally:
            unregister_sse_listener(q)

    response = StreamingHttpResponse(event_generator(), content_type="text/event-stream")
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"
    return response
