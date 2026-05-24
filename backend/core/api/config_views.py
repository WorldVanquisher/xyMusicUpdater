from django.apps import apps
from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import SystemConfig
from ..logic import _cfg

ALLOWED_CONFIG_KEYS = [
    "HOLD_PERIOD_DAYS", 
    "MAX_DELETE_PER_PURGE", 
    "MONITORED_PLAYLISTS", 
    "MAX_SONGS_PER_SOURCE",
    "MAX_STORAGE_SIZE",
    "DAEMON_INTERVAL_HOURS",
    "NAVIDROME_URL",
    "NAVIDROME_USER",
    "NAVIDROME_PASSWORD",
    "YTDLP_COOKIES",
    "YTDLP_USERNAME",
    "YTDLP_PASSWORD",
    "YTDLP_PROXY"
]

@api_view(["GET"])
def get_config_view(request):
    cfg = _cfg()
    filtered_cfg = {k: v for k, v in cfg.items() if k in ALLOWED_CONFIG_KEYS}
    if "NAVIDROME_PASSWORD" in filtered_cfg and filtered_cfg["NAVIDROME_PASSWORD"]:
        filtered_cfg["NAVIDROME_PASSWORD"] = "********"
    if "YTDLP_COOKIES" in filtered_cfg and filtered_cfg["YTDLP_COOKIES"]:
        filtered_cfg["YTDLP_COOKIES"] = "********"
    if "YTDLP_PASSWORD" in filtered_cfg and filtered_cfg["YTDLP_PASSWORD"]:
        filtered_cfg["YTDLP_PASSWORD"] = "********"
    return Response(filtered_cfg)

@api_view(["POST"])
def update_config_view(request):
    for key, value in request.data.items():
        if key in ALLOWED_CONFIG_KEYS:
            if value == "********":
                continue
            SystemConfig.objects.update_or_create(key=key, defaults={"value": str(value)})
    
    try:
        apps.get_app_config("core").reload_scheduler()
    except Exception:
        pass

    cfg = _cfg()
    filtered_cfg = {k: v for k, v in cfg.items() if k in ALLOWED_CONFIG_KEYS}
    if "NAVIDROME_PASSWORD" in filtered_cfg and filtered_cfg["NAVIDROME_PASSWORD"]:
        filtered_cfg["NAVIDROME_PASSWORD"] = "********"
    if "YTDLP_COOKIES" in filtered_cfg and filtered_cfg["YTDLP_COOKIES"]:
        filtered_cfg["YTDLP_COOKIES"] = "********"
    if "YTDLP_PASSWORD" in filtered_cfg and filtered_cfg["YTDLP_PASSWORD"]:
        filtered_cfg["YTDLP_PASSWORD"] = "********"
    return Response(filtered_cfg)
