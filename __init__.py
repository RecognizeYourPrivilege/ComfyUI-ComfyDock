WEB_DIRECTORY = "./js"
NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}
__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]

import os
import time
import shutil
import subprocess
import hashlib

_prev_cpu = None
_psutil = None
try:
    import psutil as _psutil
    _psutil.cpu_percent(interval=None)
except Exception:
    _psutil = None


def _read_proc_cpu():
    try:
        with open("/proc/stat", "r", encoding="utf-8") as f:
            parts = f.readline().split()
        vals = [int(x) for x in parts[1:8]]
        idle = vals[3] + (vals[4] if len(vals) > 4 else 0)
        total = sum(vals)
        return idle, total
    except Exception:
        return None


def _cpu_percent():
    global _prev_cpu
    if _psutil is not None:
        try:
            return float(_psutil.cpu_percent(interval=None))
        except Exception:
            pass
    now = _read_proc_cpu()
    if not now:
        return None
    if _prev_cpu is None:
        _prev_cpu = now
        return None
    idle_d = now[0] - _prev_cpu[0]
    total_d = now[1] - _prev_cpu[1]
    _prev_cpu = now
    if total_d <= 0:
        return 0.0
    return max(0.0, min(100.0, (1.0 - idle_d / total_d) * 100.0))


def _ram():
    if _psutil is not None:
        try:
            vm = _psutil.virtual_memory()
            return int(vm.used), int(vm.total), float(vm.percent)
        except Exception:
            pass
    try:
        info = {}
        with open("/proc/meminfo", "r", encoding="utf-8") as f:
            for line in f:
                k, v = line.split(":", 1)
                info[k] = int(v.strip().split()[0]) * 1024
        total = info.get("MemTotal", 0)
        avail = info.get("MemAvailable", info.get("MemFree", 0))
        used = max(0, total - avail)
        pct = (used / total * 100.0) if total else 0.0
        return used, total, pct
    except Exception:
        return 0, 0, 0.0


def _nvidia():
    if not shutil.which("nvidia-smi"):
        return []
    try:
        out = subprocess.check_output(
            [
                "nvidia-smi",
                "--query-gpu=name,utilization.gpu,memory.used,memory.total",
                "--format=csv,noheader,nounits",
            ],
            text=True,
            stderr=subprocess.DEVNULL,
            timeout=2,
        )
        gpus = []
        for line in out.strip().splitlines():
            parts = [p.strip() for p in line.split(",")]
            if len(parts) < 4:
                continue
            used_mb = float(parts[2])
            total_mb = float(parts[3])
            gpus.append(
                {
                    "name": parts[0],
                    "util": float(parts[1]),
                    "vram_used": int(used_mb * 1024 * 1024),
                    "vram_total": int(total_mb * 1024 * 1024),
                }
            )
        return gpus
    except Exception:
        return []


def snapshot():
    used, total, pct = _ram()
    return {
        "cpu_percent": _cpu_percent(),
        "ram_used": used,
        "ram_total": total,
        "ram_percent": pct,
        "gpus": _nvidia(),
        "ts": time.time(),
    }


try:
    from aiohttp import web
    from server import PromptServer
    import folder_paths

    IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tif", ".tiff", ".avif", ".jfif"}
    VIDEO_EXT = {".mp4", ".webm", ".mov", ".mkv"}
    MEDIA_EXT = IMAGE_EXT | VIDEO_EXT

    import asyncio
    from io import BytesIO

    try:
        from PIL import Image
    except Exception:
        Image = None

    _list_cache = {}

    def _safe_path(kind, subfolder, filename):
        root = folder_paths.get_directory_by_type(kind)
        if not root:
            return None
        root = os.path.realpath(root)
        rel = os.path.normpath(os.path.join(subfolder or "", filename or ""))
        if rel.startswith(".."):
            return None
        full = os.path.realpath(os.path.join(root, rel))
        if full != root and not full.startswith(root + os.sep):
            return None
        if not os.path.isfile(full):
            return None
        return full

    def _rel_ok(rel):
        parts = [p for p in str(rel or "").replace("\\", "/").split("/") if p and p != "."]
        if any(p == ".." for p in parts):
            return ""
        return "/".join(parts)

    def _safe_list(kind, subpath="", limit=400):
        subpath = _rel_ok(subpath)
        key = (kind, subpath, limit)
        now = time.time()
        hit = _list_cache.get(key)
        if hit and now - hit[0] < 15:
            return hit[1]
        root = folder_paths.get_directory_by_type(kind)
        empty = {
            "root": root or "",
            "kind": kind,
            "path": subpath,
            "parent": "/".join(subpath.split("/")[:-1]) if subpath else "",
            "folders": [],
            "items": [],
        }
        if not root or not os.path.isdir(root):
            _list_cache[key] = (now, empty)
            return empty
        root = os.path.realpath(root)
        folder = os.path.realpath(os.path.join(root, subpath)) if subpath else root
        if folder != root and not folder.startswith(root + os.sep):
            _list_cache[key] = (now, empty)
            return empty
        folders = []
        items = []
        try:
            entries = list(os.scandir(folder))
        except OSError:
            _list_cache[key] = (now, empty)
            return empty
        for e in entries:
            if e.name.startswith("."):
                continue
            try:
                is_dir = e.is_dir(follow_symlinks=False)
                is_file = e.is_file(follow_symlinks=False)
            except OSError:
                continue
            if is_dir:
                folders.append(
                    {
                        "name": e.name,
                        "path": "/".join(p for p in (subpath, e.name) if p),
                    }
                )
            elif is_file:
                ext = os.path.splitext(e.name)[1].lower()
                if ext not in MEDIA_EXT:
                    continue
                try:
                    st = e.stat()
                except OSError:
                    continue
                items.append(
                    {
                        "filename": e.name,
                        "subfolder": subpath,
                        "type": kind,
                        "kind": "video" if ext in VIDEO_EXT else "image",
                        "mtime": st.st_mtime,
                        "size": st.st_size,
                    }
                )
        folders.sort(key=lambda x: x["name"].lower())
        items.sort(key=lambda x: x["mtime"], reverse=True)
        data = {
            "root": root,
            "kind": kind,
            "path": subpath,
            "parent": "/".join(subpath.split("/")[:-1]) if subpath else "",
            "folders": folders,
            "items": items[:limit],
        }
        _list_cache[key] = (now, data)
        return data

    def _thumb_dir():
        try:
            base = folder_paths.get_temp_directory()
        except Exception:
            base = "/tmp"
        path = os.path.join(base, "dgm_thumbs")
        os.makedirs(path, exist_ok=True)
        return path

    def _make_thumb(kind, subfolder, filename, size, quality):
        path = _safe_path(kind, subfolder, filename)
        if not path:
            return None, None, None
        ext = os.path.splitext(path)[1].lower()
        if ext not in IMAGE_EXT:
            return None, None, None
        if Image is None:
            return None, None, None
        try:
            st = os.stat(path)
        except OSError:
            return None, None, None
        key = hashlib.md5(
            f"{path}:{st.st_mtime_ns}:{st.st_size}:{size}:{quality}".encode("utf-8")
        ).hexdigest()
        cache = os.path.join(_thumb_dir(), key + ".jpg")
        if os.path.isfile(cache) and os.path.getsize(cache) > 32:
            return cache, "file", "image/jpeg"
        try:
            im = Image.open(path)
            if getattr(im, "n_frames", 1) > 1:
                im.seek(0)
            if im.mode != "RGB":
                im = im.convert("RGB")
            resample = getattr(getattr(Image, "Resampling", Image), "BILINEAR", 2)
            im.thumbnail((size, size), resample)
            tmp = cache + ".tmp"
            im.save(tmp, format="JPEG", quality=quality, optimize=False, progressive=False)
            os.replace(tmp, cache)
            return cache, "file", "image/jpeg"
        except Exception:
            return None, None, None

    @PromptServer.instance.routes.get("/dgm/stats")
    async def dgm_stats(_request):
        return web.json_response(snapshot())

    @PromptServer.instance.routes.get("/dgm/gallery")
    async def dgm_gallery(request):
        kind = request.query.get("type", "output")
        if kind not in ("output", "input", "temp"):
            kind = "output"
        try:
            limit = min(800, max(20, int(request.query.get("limit", "400"))))
        except ValueError:
            limit = 400
        loop = asyncio.get_event_loop()
        data = await loop.run_in_executor(
            None, _safe_list, kind, request.query.get("path", ""), limit
        )
        return web.json_response(data)

    @PromptServer.instance.routes.get("/dgm/thumb")
    async def dgm_thumb(request):
        kind = request.query.get("type", "output")
        if kind not in ("output", "input", "temp"):
            kind = "output"
        filename = request.query.get("filename", "")
        subfolder = request.query.get("subfolder", "")
        try:
            size = min(640, max(64, int(request.query.get("size", "128"))))
        except ValueError:
            size = 128
        try:
            quality = min(40, max(10, int(request.query.get("q", "16"))))
        except ValueError:
            quality = 16
        loop = asyncio.get_event_loop()
        payload, kind_out, ctype = await loop.run_in_executor(
            None, _make_thumb, kind, subfolder, filename, size, quality
        )
        if payload is None:
            return web.Response(status=404)
        headers = {
            "Cache-Control": "public, max-age=604800, immutable",
        }
        if kind_out == "file":
            return web.FileResponse(payload, headers=headers)
        return web.Response(body=payload, content_type=ctype or "image/jpeg", headers=headers)
except Exception:
    pass
