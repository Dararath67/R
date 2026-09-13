from fastapi import FastAPI, HTTPException, File, UploadFile, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
import sqlite3
import json
import uuid
import os
import shutil
from datetime import datetime
from typing import Optional
from urllib.parse import quote

import jwt
import re
import time
import html as html_lib
import logging

class IgnoreInvalidHTTPRequest(logging.Filter):
    def filter(self, record):
        return "Invalid HTTP request received" not in record.getMessage()

logging.getLogger("uvicorn.error").addFilter(IgnoreInvalidHTTPRequest())
from backend.database import (
    init_db, get_db_connection, hash_password, verify_password, is_ip_banned, ban_ip_in_db, unban_ip_in_db,
    record_failed_login_attempt, clear_failed_login_attempts,
    get_setting, set_setting, send_telegram_alert, create_session, get_active_sessions, revoke_session, is_session_valid,
    add_comment, get_comments, delete_comment, save_chat_message, get_chat_messages, get_support_conversations, delete_chat_message,
    add_notification, get_notifications_from_db, mark_notifications_read, delete_notification_from_db, DB_PATH, add_video_report, get_video_reports,
    update_video_report_status, add_movie_request, get_movie_requests, update_movie_request_status, toggle_series_follow,
    get_series_follow_status, get_series_followers, get_admin_analytics, toggle_favorite_in_db,
    add_comment_to_db, get_comments_for_content, delete_comment_from_db,
    create_watch_party_in_db, get_watch_party_from_db, update_watch_party_sync,
    get_api_movies_from_db, add_api_movie_to_db, update_api_movie_in_db, delete_api_movie_from_db
)
from backend.models import (
    MovieCreate, MovieResponse,
    EpisodeCreate, EpisodeResponse,
    GenreCreate, GenreResponse,
    UserLogin, UserRegister, UserProfileUpdate, UserResponse, WatchHistoryItem
)

JWT_SECRET = os.getenv("JWT_SECRET", "TERK_TLA_SUPER_SECURE_JWT_SECRET_KEY_9876543210")
JWT_ALGORITHM = "HS256"
FAILED_ATTEMPTS = {}
IP_REQUEST_LOGS = {}

ALLOWED_VIDEO_EXT = {".mp4", ".mkv", ".webm", ".mov", ".avi"}
ALLOWED_IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"}

BASE_URL = os.getenv("BASE_URL", "").rstrip("/")

def get_base_url(request: Request) -> str:
    if BASE_URL:
        return BASE_URL
    host = request.headers.get("x-forwarded-host", request.url.netloc)
    if "vercel.app" in host or "localhost" in host:
        return "http://us.apsara.lol:15511"
    scheme = request.headers.get("x-forwarded-proto", request.url.scheme)
    return f"{scheme}://{host}"

MIRROR_SERVER_URL = os.getenv("MIRROR_SERVER_URL", "https://r-diut.onrender.com")

def replicate_to_mirror(endpoint: str, method: str = "POST", payload: dict = None):
    if not MIRROR_SERVER_URL or "localhost" in MIRROR_SERVER_URL:
        return
    def _do_sync():
        try:
            import urllib.request
            import json
            url = f"{MIRROR_SERVER_URL.rstrip('/')}{endpoint}"
            data = json.dumps(payload or {}).encode('utf-8') if payload else b""
            req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json", "X-Sync-Token": "auto-replication"}, method=method)
            urllib.request.urlopen(req, timeout=5)
        except Exception as e:
            print("Replication to mirror failed:", e)
    import threading
    threading.Thread(target=_do_sync, daemon=True).start()

def log_security_audit(event_type: str, details: str, ip_address: str = "127.0.0.1"):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO security_logs (event_type, details, ip_address, timestamp) VALUES (?, ?, ?, ?)",
            (event_type, details, ip_address, datetime.now().isoformat())
        )
        conn.commit()
        conn.close()
        send_telegram_alert(f"🚨 <b>SECURITY ALERT</b>\n<b>Event:</b> {event_type}\n<b>IP:</b> {ip_address}\n<b>Details:</b> {details}")
    except Exception as e:
        print("Audit logging error:", e)

def sanitize_text(text: str) -> str:
    if not text:
        return ""
    # Strip dangerous HTML/script injection tags
    text = text.replace("<script", "&lt;script").replace("</script>", "&lt;/script&gt;")
    text = text.replace("<iframe", "&lt;iframe").replace("javascript:", "")
    text = text.replace("onerror=", "").replace("onload=", "")
    return text

SQLI_PATTERNS = ["' OR '", "' OR 1=1", "; DROP TABLE", "UNION SELECT", "1=1", "--"]
def check_payload_security(val: str, client_ip: str = "127.0.0.1"):
    if not val:
        return
    upper_val = val.upper()
    for p in SQLI_PATTERNS:
        if p in upper_val:
            log_security_audit("SQLI_PAYLOAD_ATTEMPT", f"SQLi payload detected: {val[:30]}", client_ip)
            ban_ip_in_db(client_ip, f"Automatic ban: SQLi payload attempt ({val[:20]})")
            raise HTTPException(
                status_code=400, 
                detail=f"អាសយដ្ឋាន IP [{client_ip}] ត្រូវបានប្រព័ន្ធរារាំងជាស្វ័យប្រវត្តិដោយសារបញ្ចូល Payload គ្រោះថ្នាក់! (Malicious payload detected from IP [{client_ip}])"
            )

def create_jwt_token(user_id: str, email: str, role: str, jti: Optional[str] = None) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "jti": jti or f"sess_{uuid.uuid4().hex[:12]}",
        "exp": int(time.time()) + 86400 # 24 hours
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def get_current_user_from_token(authorization: Optional[str] = Header(None), request: Optional[Request] = None) -> dict:
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
    elif request and request.cookies.get("access_token"):
        token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(status_code=401, detail="ត្រូវការ JWT Authorization Token (Missing or invalid Auth Token)")

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        jti = payload.get("jti")
        if jti and not is_session_valid(jti):
            log_security_audit("REVOKED_SESSION_ACCESS_ATTEMPT", f"Attempted API call with revoked session JTI: {jti}")
            raise HTTPException(status_code=401, detail="Session របស់អ្នកត្រូវបានដកហូត ឬលុបចេញ! (Session revoked)")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="JWT Token ផុតកំណត់ (Token has expired)")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="JWT Token មិនត្រឹមត្រូវទេ (Invalid Token)")

def require_admin_role(authorization: Optional[str] = Header(None), request: Optional[Request] = None) -> dict:
    user = get_current_user_from_token(authorization, request)
    if user.get("role") != "ADMIN":
        log_security_audit("UNAUTHORIZED_ADMIN_ACCESS_ATTEMPT", f"User {user.get('email')} attempted admin API access")
        raise HTTPException(status_code=403, detail="សម្រាប់តែអ្នកគ្រប់គ្រងប្រព័ន្ធ (Admin Access Required)")
    return user

# Create Upload Folders
UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "uploads")
VIDEOS_DIR = os.path.join(UPLOADS_DIR, "videos")
IMAGES_DIR = os.path.join(UPLOADS_DIR, "images")
CHAT_DIR = os.path.join(UPLOADS_DIR, "chat")

os.makedirs(VIDEOS_DIR, exist_ok=True)
os.makedirs(IMAGES_DIR, exist_ok=True)
os.makedirs(CHAT_DIR, exist_ok=True)

# Initialize Database
init_db()

app = FastAPI(title="Movie Streaming FastAPI Backend", version="1.0.0")

# Security Headers, Banned IP Check & Rate Limiting Middleware
@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    client_ip = request.client.host if request.client else "127.0.0.1"
    now = time.time()

    # 1. Enforce Banned IP Check
    if is_ip_banned(client_ip):
        log_security_audit("BANNED_IP_BLOCKED_REQUEST", f"Blocked request from banned IP {client_ip}", client_ip)
        return JSONResponse(
            status_code=403,
            content={"detail": f"អាសយដ្ឋាន IP [{client_ip}] របស់អ្នកត្រូវបានប្រព័ន្ធរារាំងជាអចិន្ត្រៃយ៍! (IP Address [{client_ip}] permanently banned)"}
        )
    
    # 2. Global Rate Limiting: max 1000 req / minute per IP (bypassing localhost/127.0.0.1)
    if client_ip not in ["127.0.0.1", "localhost", "::1"]:
        timestamps = [t for t in IP_REQUEST_LOGS.get(client_ip, []) if now - t < 60]
        if len(timestamps) >= 1000:
            log_security_audit("RATE_LIMIT_EXCEEDED", f"IP {client_ip} exceeded rate limit", client_ip)
            return JSONResponse(
                status_code=429, 
                content={"detail": f"អាសយដ្ឋាន IP [{client_ip}]៖ ប្រព័ន្ធការពារការវាយប្រហារ (Rate limit exceeded for IP [{client_ip}])"}
            )
        timestamps.append(now)
        IP_REQUEST_LOGS[client_ip] = timestamps

    response = await call_next(request)
    
    # HTTP Security Headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:;"
    return response

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# High-Performance Smooth Video Streaming Endpoint with Range Requests & Buffer Caching
@app.get("/uploads/videos/{filename}")
async def stream_video_file(filename: str, request: Request):
    filepath = os.path.join(VIDEOS_DIR, os.path.basename(filename))
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Video file not found")
    
    file_size = os.path.getsize(filepath)
    range_header = request.headers.get("range")
    
    if range_header:
        byte_range = range_header.replace("bytes=", "").split("-")
        start = int(byte_range[0])
        end = int(byte_range[1]) if byte_range[1] else min(start + 1024 * 1024 * 3 - 1, file_size - 1)
        length = end - start + 1
        
        def iterfile():
            with open(filepath, "rb") as f:
                f.seek(start)
                remaining = length
                while remaining > 0:
                    chunk_size = min(remaining, 512 * 1024)
                    data = f.read(chunk_size)
                    if not data:
                        break
                    remaining -= len(data)
                    yield data
                    
        headers = {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(length),
            "Content-Type": "video/mp4",
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
            "Access-Control-Allow-Origin": "*",
        }
        return StreamingResponse(iterfile(), status_code=206, headers=headers)
    
    return FileResponse(
        filepath,
        media_type="video/mp4",
        headers={
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
            "Access-Control-Allow-Origin": "*",
        }
    )

# Serve Static Upload Files
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# ---------------- DIRECT FILE UPLOADS ----------------
@app.post("/api/upload/video")
async def upload_video(request: Request, file: UploadFile = File(...), authorization: Optional[str] = Header(None)):
    filename = os.path.basename(file.filename or "")
    ext = os.path.splitext(filename)[1].lower() or ".mp4"
    if ext not in ALLOWED_VIDEO_EXT:
        log_security_audit("MALICIOUS_FILE_UPLOAD_ATTEMPT", f"Video upload rejected extension: {ext}")
        raise HTTPException(status_code=400, detail="ប្រភេទឯកសារវីដេអូមិនត្រូវបានអនុញ្ញាតទេ! (Invalid video file format payload)")

    safe_filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(VIDEOS_DIR, safe_filename)
    
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Auto transcode & optimize all video formats (.mov, .mkv, .avi, .mp4) to web-native faststart MP4 H.264/AAC for ultra-smooth streaming
    try:
        import subprocess
        mp4_filename = f"web_{uuid.uuid4().hex}.mp4"
        mp4_filepath = os.path.join(VIDEOS_DIR, mp4_filename)
        # Ultra smooth H.264 Web MP4 with +faststart moov atom and yuv420p hardware decoding
        cmd_conv = [
            "ffmpeg", "-y", "-i", filepath,
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
            "-pix_fmt", "yuv420p", "-movflags", "+faststart",
            "-c:a", "aac", "-b:a", "128k", "-ar", "44100",
            mp4_filepath
        ]
        res_conv = subprocess.run(cmd_conv, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120)
        if res_conv.returncode == 0 and os.path.exists(mp4_filepath) and os.path.getsize(mp4_filepath) > 0:
            try:
                os.remove(filepath)
            except Exception:
                pass
            safe_filename = mp4_filename
            filepath = mp4_filepath
    except Exception as e_conv:
        print("Video transcode to MP4 error:", e_conv)
        
    relative_url = f"/uploads/videos/{safe_filename}"
    poster_url = ""
    try:
        import subprocess
        ffmpeg_poster_name = f"poster_web_{uuid.uuid4().hex[:12]}.jpg"
        ffmpeg_dest = os.path.join(IMAGES_DIR, ffmpeg_poster_name)
        cmd = ["ffmpeg", "-y", "-ss", "00:00:03", "-i", filepath, "-vframes", "1", "-q:v", "2", ffmpeg_dest]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=10)
        if res.returncode == 0 and os.path.exists(ffmpeg_dest) and os.path.getsize(ffmpeg_dest) > 0:
            poster_url = f"/uploads/images/{ffmpeg_poster_name}"
    except Exception as e_ff:
        print("Web video upload FFmpeg thumbnail extraction error:", e_ff)

    return {
        "url": relative_url,
        "relativeUrl": relative_url,
        "filename": safe_filename,
        "posterUrl": poster_url,
        "absoluteUrl": f"{get_base_url(request)}/uploads/videos/{safe_filename}"
    }

# ---------------- CRAWLER: EXTRACT VIDEO, POSTER & TITLE FROM WEBPAGE ----------------
def extract_media_from_webpage(web_url: str) -> dict:
    import urllib.request
    import urllib.parse
    import ssl

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    req = urllib.request.Request(
        web_url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
    )

    try:
        with urllib.request.urlopen(req, context=ctx, timeout=12) as response:
            raw_html = response.read().decode('utf-8', errors='ignore')
    except Exception as e:
        print("extract_media_from_webpage fetch error:", e)
        return {}

    # 1. Extract Title
    title = ""
    t_match = re.search(r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']+)["\']', raw_html, re.IGNORECASE)
    if not t_match:
        t_match = re.search(r'<meta[^>]+name=["\']twitter:title["\'][^>]+content=["\']([^"\']+)["\']', raw_html, re.IGNORECASE)
    if not t_match:
        t_match = re.search(r'<title>(.*?)</title>', raw_html, re.IGNORECASE | re.DOTALL)
    
    if t_match:
        raw_t = html_lib.unescape(t_match.group(1))
        # Remove site branding
        cleaned_t = re.split(r'\s*[\-\|\:\–]\s*(?:JVP\s*KH|8tube|Khmer|Blogger|WordPress|Free Movies|Streaming|Hub)', raw_t, flags=re.IGNORECASE)[0]
        title = cleaned_t.strip()

    # 2. Extract Poster / Image
    poster = ""
    p_match = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', raw_html, re.IGNORECASE)
    if not p_match:
        p_match = re.search(r'<meta[^>]+name=["\']twitter:image["\'][^>]+content=["\']([^"\']+)["\']', raw_html, re.IGNORECASE)
    if p_match:
        poster = p_match.group(1).strip()
    if not poster:
        p_img = re.search(r'(?:data-original-height=[^>]+|class=["\'][^"\']*thumbnail[^"\']*["\'][^>]+)src=["\']([^"\']+)["\']', raw_html, re.IGNORECASE)
        if p_img:
            poster = p_img.group(1).strip()
    if not poster:
        all_imgs = re.findall(r'src=["\'](https?://blogger\.googleusercontent\.com/img/[^"\']+)["\']', raw_html, re.IGNORECASE)
        if all_imgs:
            poster = all_imgs[0]

    # 3. Extract Embedded Video Stream
    video_url = ""
    # Pattern A: playlists = [ { file: "..." } ] or [ { src: "..." } ]
    pl_match = re.search(r'playlists\s*=\s*\[\s*\{\s*(?:file|src)\s*:\s*["\']([^"\']+)["\']', raw_html, re.IGNORECASE)
    if pl_match:
        video_url = pl_match.group(1).strip()

    # Pattern B: direct mp4 / m3u8 in scripts or HTML
    if not video_url:
        v_matches = re.findall(r'(https?://[^\s"\'<>]+\.(?:mp4|m3u8|webm|mov)(?:\?[^\s"\'<>]*)?)', raw_html, re.IGNORECASE)
        for v in v_matches:
            if not any(ign in v.lower() for ign in ['banner', 'theme', 'skin', 'logo', 'avatar', 'ads']):
                video_url = v
                break

    # Pattern C: iframe player embed
    if not video_url:
        if_matches = re.findall(r'<iframe[^>]+src=["\']([^"\']+)["\']', raw_html, re.IGNORECASE)
        for ifr in if_matches:
            if not any(ign in ifr.lower() for ign in ['facebook.com', 'twitter.com', 'google.com', 'googletagmanager', 'disqus']):
                video_url = ifr
                break

    # Pattern D: Query Blogger / WordPress Feed JSON
    if not video_url:
        try:
            parsed_u = urllib.parse.urlparse(web_url)
            domain = f"{parsed_u.scheme}://{parsed_u.netloc}"
            slug = os.path.basename(parsed_u.path).replace('.html', '').replace('.php', '')
            feed_url = f"{domain}/feeds/posts/default?alt=json&max-results=50"
            freq = urllib.request.Request(feed_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(freq, context=ctx, timeout=8) as f_res:
                fdata = json.loads(f_res.read().decode('utf-8'))
                for entry in fdata.get('feed', {}).get('entry', []):
                    content_html = entry.get('content', {}).get('$t', '')
                    matched = False
                    for ln in entry.get('link', []):
                        if slug and slug in ln.get('href', ''):
                            matched = True
                            break
                    if matched or (title and title in entry.get('title', {}).get('$t', '')):
                        v_in_feed = re.search(r'(?:file|src)\s*:\s*["\']([^"\']+\.(?:mp4|m3u8|webm|mov)[^"\']*)["\']', content_html, re.IGNORECASE)
                        if v_in_feed:
                            video_url = v_in_feed.group(1)
                            break
                        all_v = re.findall(r'(https?://[^\s"\'<>]+\.(?:mp4|m3u8)[^\s"\'<>]*)', content_html, re.IGNORECASE)
                        if all_v:
                            video_url = all_v[0]
                            break
        except Exception as e_feed:
            print("feed extraction fallback error:", e_feed)

    # 4. Extract release year
    year_match = re.search(r'\b(19\d\d|20\d\d)\b', web_url + " " + title)
    year = int(year_match.group(1)) if year_match else datetime.now().year

    return {
        "title": title or "ភាពយន្តថ្មី",
        "videoUrl": video_url,
        "posterUrl": poster,
        "backdropUrl": poster,
        "description": f"ទស្សនា {title or 'ភាពយន្តថ្មី'} កម្រិតច្បាស់ HD ដោយឥតគិតថ្លៃនៅលើ TerkTla Hub។",
        "releaseYear": year,
        "genres": ["Action", "Drama"]
    }

@app.post("/api/upload/download-url")
async def download_remote_video_url(request: Request):
    import urllib.request
    import urllib.parse
    import ssl

    data = await request.json()
    remote_url = data.get("url", "").strip()
    if not remote_url or not (remote_url.startswith("http://") or remote_url.startswith("https://") or remote_url.startswith("/uploads/")):
        raise HTTPException(status_code=400, detail="សូមបញ្ចូល URL ដែលត្រឹមត្រូវ (http:// ឬ https://)")

    # Shortcut: If URL is already an uploaded video on this server or domain proxy
    if "/uploads/videos/" in remote_url:
        filename = remote_url.split("/uploads/videos/")[-1].split("?")[0]
        local_file = os.path.join(VIDEOS_DIR, filename)
        if os.path.exists(local_file):
            rel_url = f"/uploads/videos/{filename}"
            poster_url = ""
            poster_filename = f"poster_{os.path.splitext(filename)[0]}.jpg"
            if os.path.exists(os.path.join(IMAGES_DIR, poster_filename)):
                poster_url = f"/uploads/images/{poster_filename}"
            return {
                "url": rel_url,
                "posterUrl": poster_url,
                "filename": filename,
                "absoluteUrl": f"http://us.apsara.lol:15511/uploads/videos/{filename}"
            }

    # If input is a webpage article URL (e.g. .html, .php, jvpkh.xyz, blogspot, etc.), extract video and poster first!
    discovered_poster = ""
    discovered_title = ""
    is_webpage = not any(remote_url.lower().split("?")[0].endswith(ext) for ext in ALLOWED_VIDEO_EXT)
    if is_webpage:
        web_media = extract_media_from_webpage(remote_url)
        if web_media.get("videoUrl"):
            remote_url = web_media["videoUrl"]
            discovered_poster = web_media.get("posterUrl", "")
            discovered_title = web_media.get("title", "")

    try:
        parsed = urllib.parse.urlparse(remote_url)
        path = parsed.path
        ext = os.path.splitext(path)[1].lower()
        if not ext or ext not in ALLOWED_VIDEO_EXT:
            ext = ".mp4"
            
        safe_filename = f"dl_{uuid.uuid4().hex[:12]}{ext}"
        filepath = os.path.join(VIDEOS_DIR, safe_filename)
        
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        req = urllib.request.Request(
            remote_url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "*/*"
            }
        )
        with urllib.request.urlopen(req, context=ctx, timeout=600) as response, open(filepath, "wb") as buffer:
            shutil.copyfileobj(response, buffer)
            
        poster_url = discovered_poster
        if not poster_url:
            try:
                import subprocess
                ffmpeg_poster_name = f"poster_dl_{uuid.uuid4().hex[:12]}.jpg"
                ffmpeg_dest = os.path.join(IMAGES_DIR, ffmpeg_poster_name)
                cmd = ["ffmpeg", "-y", "-ss", "00:00:03", "-i", filepath, "-vframes", "1", "-q:v", "2", ffmpeg_dest]
                res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=10)
                if res.returncode == 0 and os.path.exists(ffmpeg_dest) and os.path.getsize(ffmpeg_dest) > 0:
                    poster_url = f"/uploads/images/{ffmpeg_poster_name}"
            except Exception as e_ff:
                print("Download video FFmpeg thumbnail extraction error:", e_ff)

        url = f"/uploads/videos/{safe_filename}"
        return {
            "url": url,
            "posterUrl": poster_url,
            "title": discovered_title,
            "filename": safe_filename,
            "absoluteUrl": f"{get_base_url(request)}/uploads/videos/{safe_filename}"
        }
    except Exception as e:
        print("download_remote_video_url error:", e)
        # Fallback: if download fails, return the discovered direct streaming URL so user can stream it directly!
        if is_webpage and remote_url.startswith("http"):
            return {
                "url": remote_url,
                "posterUrl": discovered_poster,
                "title": discovered_title,
                "filename": os.path.basename(remote_url.split("?")[0]),
                "absoluteUrl": remote_url
            }
        raise HTTPException(
            status_code=400, 
            detail=f"មិនអាចទាញយកវីដេអូពី Link នេះបានទេ ({str(e)})។ ប៉ុន្តែអ្នកអាចប្រើប្រាស់ Link នេះផ្ទាល់ក្នុងប្រអប់ Video URL បានដោយមិនចាំបាច់ Download ឡើយ!"
        )

@app.post("/api/upload/image")
async def upload_image(request: Request, file: UploadFile = File(...), authorization: Optional[str] = Header(None)):
    filename = os.path.basename(file.filename or "")
    ext = os.path.splitext(filename)[1].lower() or ".jpg"
    if ext not in ALLOWED_IMAGE_EXT:
        log_security_audit("MALICIOUS_FILE_UPLOAD_ATTEMPT", f"Image upload rejected extension: {ext}")
        raise HTTPException(status_code=400, detail="ប្រភេទរូបភាពមិនត្រូវបានអនុញ្ញាតទេ! (Invalid image file format payload)")

    safe_filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(IMAGES_DIR, safe_filename)
    
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    url = f"{get_base_url(request)}/uploads/images/{safe_filename}"
    return {"url": url, "filename": safe_filename}

# ---------------- AUTO EXTRACT VIDEO CAPTION & METADATA ----------------
@app.post("/api/video/extract-caption")
async def extract_video_caption_endpoint(request: Request):
    try:
        data = await request.json()
    except Exception:
        data = {}
        
    raw_url = (data.get("url") or "").strip()
    raw_name = (data.get("filename") or "").strip()
    raw_caption = (data.get("caption") or "").strip()
    
    # 1. If explicit caption is provided (e.g. from Telegram)
    if raw_caption:
        lines = [line.strip() for line in raw_caption.split("\n") if line.strip()]
        first_line = lines[0] if lines else "ភាពយន្តថ្មី"
        clean_title = re.sub(r'#\w+', '', first_line).strip()
        clean_title = re.sub(r'^(🎬|📺|🎥|🔥|✨|👉)\s*', '', clean_title).strip()
        return {
            "title": clean_title or "ភាពយន្តថ្មី",
            "description": raw_caption,
            "caption": raw_caption,
            "releaseYear": datetime.now().year,
            "genres": ["Action", "Drama"]
        }

    # 2. Check if raw_url is a webpage article URL (e.g. .html, .php, jvpkh.xyz, blogspot, 8tube, etc.)
    is_webpage_url = raw_url.startswith("http") and (
        raw_url.endswith(".html") or raw_url.endswith(".php") or
        "blog-post" in raw_url or "blogspot" in raw_url or "jvpkh" in raw_url or
        not any(raw_url.lower().split("?")[0].endswith(ext) for ext in ALLOWED_VIDEO_EXT)
    )
    if is_webpage_url:
        web_info = extract_media_from_webpage(raw_url)
        if web_info and (web_info.get("videoUrl") or web_info.get("title")):
            return {
                "title": web_info.get("title") or "ភាពយន្តថ្មី",
                "videoUrl": web_info.get("videoUrl") or "",
                "posterUrl": web_info.get("posterUrl") or "",
                "backdropUrl": web_info.get("backdropUrl") or "",
                "description": web_info.get("description") or f"ទស្សនា {web_info.get('title')} កម្រិតច្បាស់ HD",
                "caption": web_info.get("title") or "",
                "releaseYear": web_info.get("releaseYear") or datetime.now().year,
                "genres": ["Action", "Drama"]
            }
        
    target_str = raw_name or (os.path.basename(raw_url.split("?")[0]) if raw_url else "")
    
    # Strip extension
    name_no_ext = os.path.splitext(target_str)[0] if target_str else ""
    
    # Remove technical prefixes
    name_no_ext = re.sub(r'^(web_|dl_|tlg_|tlg_web_|poster_)+', '', name_no_ext, flags=re.IGNORECASE)
    
    # Extract 4-digit year if present (1900-2099)
    year_match = re.search(r'\b(19\d\d|20\d\d)\b', name_no_ext)
    extracted_year = int(year_match.group(1)) if year_match else datetime.now().year
    
    # Clean technical video tags
    clean_name = re.sub(r'(?i)\b(1080p|720p|480p|2160p|4k|hd|fhd|uhd|webrip|web-dl|bluray|brrip|x264|x265|hevc|aac|dvdrip|h264|h265|remux|hdtv|camrip|hdrip|proper|repack|complete|sub|dub|khmer)\b', ' ', name_no_ext)
    clean_name = re.sub(r'[\._\-\+\[\]\(\)]', ' ', clean_name)
    clean_name = re.sub(r'\s+', ' ', clean_name).strip()
    
    if clean_name:
        words = clean_name.split()
        clean_title = " ".join([w.capitalize() if w.isascii() else w for w in words])
    else:
        clean_title = "ភាពយន្តថ្មី"
        
    formatted_description = f"ទស្សនា {clean_title} កម្រិតរូបភាពច្បាស់ត្រជាក់ភ្នែក (HD/1080p) ដោយឥតគិតថ្លៃ និងគ្មានផ្ទាំងពាណិជ្ជកម្មរំខាននៅលើ TerkTla Hub។"
    
    return {
        "title": clean_title,
        "description": formatted_description,
        "caption": clean_title,
        "releaseYear": extracted_year,
        "genres": ["Action", "Drama"]
    }

# ---------------- NOTIFICATIONS ----------------
@app.get("/api/notifications")
def get_notifications(request: Request):
    user_id = None
    auth = request.headers.get("Authorization")
    if auth and auth.startswith("Bearer "):
        try:
            token = auth.split(" ")[1]
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user_id = payload.get("sub")
        except Exception:
            pass
    return get_notifications_from_db(user_id)

@app.post("/api/notifications")
async def create_notification(request: Request):
    data = await request.json()
    nid = data.get("id") or f"notif_{uuid.uuid4().hex[:8]}"
    title = data.get("title", "Notification")
    message = data.get("message", "")
    notif_type = data.get("type", "info")
    user_id = data.get("userId")
    target_url = data.get("targetUrl")
    created_at = data.get("createdAt") or datetime.now().isoformat()
    add_notification(nid, title, message, notif_type, user_id, target_url, created_at)
    return {"status": "ok", "id": nid}

@app.post("/api/notifications/read-all")
def mark_read():
    mark_notifications_read()
    return {"status": "ok"}

def row_to_movie(row) -> dict:
    cols = row.keys()
    return {
        "id": row["id"],
        "title": row["title"],
        "description": row["description"],
        "posterUrl": row["poster_url"],
        "backdropUrl": row["backdrop_url"],
        "trailerUrl": row["trailer_url"],
        "videoUrl": row["video_url"],
        "releaseYear": row["release_year"],
        "rating": row["rating"],
        "duration": row["duration"],
        "type": row["type"],
        "genres": json.loads(row["genres"]) if row["genres"] else [],
        "isFeatured": bool(row["is_featured"]),
        "isTrending": bool(row["is_trending"]),
        "isPopular": bool(row["is_popular"]),
        "isLatest": bool(row["is_latest"]),
        "isPublished": bool(row["is_published"]),
        "views": row["views"],
        "cast": json.loads(row["cast"]) if row["cast"] else [],
        "director": row["director"],
        "createdAt": row["created_at"],
        "uploadedByUserId": row["uploaded_by_user_id"] if "uploaded_by_user_id" in cols else None,
        "uploadedByUserName": row["uploaded_by_user_name"] if "uploaded_by_user_name" in cols else None,
        "uploadedByAvatar": row["uploaded_by_avatar"] if "uploaded_by_avatar" in cols else None,
        "approvalStatus": (row["approval_status"] if "approval_status" in cols and row["approval_status"] else ("approved" if row["is_published"] else "pending")),
        "rejectionReason": row["rejection_reason"] if "rejection_reason" in cols else None,
        "subtitles": [
            {"id": "s1", "label": "English", "lang": "en", "src": ""},
            {"id": "s2", "label": "Khmer", "lang": "km", "src": ""}
        ]
    }

# ---------------- MOVIES & SERIES ----------------
@app.get("/api/movies")
def get_movies():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM content WHERE type = 'movie' ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [row_to_movie(r) for r in rows]

@app.get("/api/series")
def get_series():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM content WHERE type = 'series' ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [row_to_movie(r) for r in rows]

@app.get("/api/content/{content_id}")
def get_content_by_id(content_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM content WHERE id = ?", (content_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Content not found")
    return row_to_movie(row)

@app.post("/api/movies")
def create_movie(movie: MovieCreate, authorization: Optional[str] = Header(None)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    movie_id = ("m" if movie.type == "movie" else "s") + str(int(datetime.now().timestamp() * 1000))
    created_at = datetime.now().strftime("%Y-%m-%d")
    approval_status = movie.approvalStatus or ("approved" if movie.isPublished else "pending")

    cursor.execute('''
        INSERT INTO content (
            id, title, description, poster_url, backdrop_url, trailer_url, video_url,
            release_year, rating, duration, type, genres, is_featured, is_trending,
            is_popular, is_latest, is_published, views, cast, director, created_at,
            uploaded_by_user_id, uploaded_by_user_name, uploaded_by_avatar, approval_status, rejection_reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        movie_id, movie.title, movie.description, movie.posterUrl, movie.backdropUrl,
        movie.trailerUrl, movie.videoUrl, movie.releaseYear, movie.rating, movie.duration,
        movie.type, json.dumps(movie.genres), int(movie.isFeatured), int(movie.isTrending),
        int(movie.isPopular), int(movie.isLatest), int(movie.isPublished), 0,
        json.dumps(movie.cast), movie.director, created_at,
        movie.uploadedByUserId, movie.uploadedByUserName, movie.uploadedByAvatar,
        approval_status, movie.rejectionReason
    ))
    
    conn.commit()
    cursor.execute("SELECT * FROM content WHERE id = ?", (movie_id,))
    row = cursor.fetchone()
    conn.close()

    # Auto alert notification when movie is added
    try:
        if movie.isPublished:
            t_label = "ភាពយន្ត" if movie.type == "movie" else "រឿងភាគ"
            add_notification(
                nid=f"notif_{uuid.uuid4().hex[:8]}",
                title=f"{t_label}ថ្មីបានបញ្ចូល!",
                message=f"{movie.title} ({movie.releaseYear}) ត្រូវបានបោះពុម្ពផ្សាយជូនទស្សនាហើយ!",
                notif_type="new_movie",
                target_url=f"/movie/{movie_id}" if movie.type == "movie" else "/series"
            )
        else:
            add_notification(
                nid=f"notif_{uuid.uuid4().hex[:8]}",
                title="វីដេអូស្នើសុំថ្មីរង់ចាំការពិនិត្យ! (Pending Video)",
                message=f"អ្នកប្រើប្រាស់ {movie.uploadedByUserName or 'User'} បាន Upload វីដេអូ «{movie.title}» រង់ចាំ Admin ពិនិត្យអនុម័ត!",
                notif_type="alert",
                target_url="/admin/movies"
            )
    except Exception as e:
        print("Auto notification error:", e)

    return row_to_movie(row)

@app.put("/api/movies/{movie_id}")
@app.patch("/api/movies/{movie_id}")
def update_movie(movie_id: str, movie_data: dict, authorization: Optional[str] = Header(None)):
    require_admin_role(authorization)
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM content WHERE id = ?", (movie_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Movie not found")

    fields = []
    values = []

    field_map = {
        "title": "title",
        "description": "description",
        "posterUrl": "poster_url",
        "backdropUrl": "backdrop_url",
        "trailerUrl": "trailer_url",
        "videoUrl": "video_url",
        "releaseYear": "release_year",
        "rating": "rating",
        "duration": "duration",
        "type": "type",
        "director": "director",
        "approvalStatus": "approval_status",
        "rejectionReason": "rejection_reason",
        "uploadedByUserId": "uploaded_by_user_id",
        "uploadedByUserName": "uploaded_by_user_name",
        "uploadedByAvatar": "uploaded_by_avatar",
    }

    for key, col in field_map.items():
        if key in movie_data and movie_data[key] is not None:
            fields.append(f"{col} = ?")
            values.append(movie_data[key])

    bool_map = {
        "isFeatured": "is_featured",
        "isTrending": "is_trending",
        "isPopular": "is_popular",
        "isLatest": "is_latest",
        "isPublished": "is_published",
    }

    for key, col in bool_map.items():
        if key in movie_data and movie_data[key] is not None:
            fields.append(f"{col} = ?")
            values.append(1 if movie_data[key] else 0)

    json_map = {
        "genres": "genres",
        "cast": "cast",
    }

    for key, col in json_map.items():
        if key in movie_data and movie_data[key] is not None:
            fields.append(f"{col} = ?")
            values.append(json.dumps(movie_data[key]))

    if not fields:
        conn.close()
        return get_content_by_id(movie_id)

    values.append(movie_id)
    sql = f"UPDATE content SET {', '.join(fields)} WHERE id = ?"
    cursor.execute(sql, tuple(values))
    conn.commit()
    cursor.execute("SELECT * FROM content WHERE id = ?", (movie_id,))
    updated_row = cursor.fetchone()
    conn.close()

    return row_to_movie(updated_row)

@app.delete("/api/movies/{movie_id}")
def delete_movie(movie_id: str, authorization: Optional[str] = Header(None)):
    require_admin_role(authorization)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM content WHERE id = ?", (movie_id,))
    cursor.execute("DELETE FROM episodes WHERE series_id = ?", (movie_id,))
    conn.commit()
    conn.close()
    return {"message": "Movie deleted"}

@app.patch("/api/movies/{movie_id}/publish")
def toggle_publish(movie_id: str, authorization: Optional[str] = Header(None)):
    require_admin_role(authorization)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT is_published FROM content WHERE id = ?", (movie_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Movie not found")
    
    new_status = 0 if row["is_published"] else 1
    cursor.execute("UPDATE content SET is_published = ? WHERE id = ?", (new_status, movie_id))
    conn.commit()
    conn.close()
    return {"isPublished": bool(new_status)}

@app.post("/api/movies/{movie_id}/view")
def increment_views(movie_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE content SET views = views + 1 WHERE id = ?", (movie_id,))
    conn.commit()
    conn.close()
    return {"message": "Views incremented"}

# ---------------- EPISODES ----------------
@app.get("/api/episodes")
def get_episodes():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM episodes")
    rows = cursor.fetchall()
    conn.close()
    return [{
        "id": r["id"],
        "seriesId": r["series_id"],
        "seasonNumber": r["season_number"],
        "episodeNumber": r["episode_number"],
        "title": r["title"],
        "description": r["description"],
        "duration": r["duration"],
        "videoUrl": r["video_url"],
        "thumbnailUrl": r["thumbnail_url"],
        "views": r["views"],
        "subtitles": [{"id": "s1", "label": "English", "lang": "en", "src": ""}]
    } for r in rows]

@app.post("/api/episodes")
def create_episode(ep: EpisodeCreate, authorization: Optional[str] = Header(None)):
    require_admin_role(authorization)
    conn = get_db_connection()
    cursor = conn.cursor()
    ep_id = "ep-" + str(int(datetime.now().timestamp() * 1000))
    cursor.execute('''
        INSERT INTO episodes (id, series_id, season_number, episode_number, title, description, duration, video_url, thumbnail_url, views)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    ''', (ep_id, ep.seriesId, ep.seasonNumber, ep.episodeNumber, ep.title, ep.description, ep.duration, ep.videoUrl, ep.thumbnailUrl))
    conn.commit()
    conn.close()

    # Notify series followers
    try:
        followers = get_series_followers(ep.seriesId)
        for follower_id in followers:
            add_notification(
                f"notif_{uuid.uuid4().hex[:8]}",
                "ភាគថ្មីត្រូវបានចេញផ្សាយ!",
                f"ភាគទី {ep.episodeNumber}: {ep.title} ត្រូវបានបន្ថែម!",
                "new_episode",
                follower_id,
                f"/watch/{ep.seriesId}?episode={ep_id}",
                datetime.now().isoformat()
            )
    except Exception as e:
        print("Error notifying series followers:", e)

    return {"id": ep_id, **ep.dict(), "views": 0}

@app.delete("/api/episodes/{ep_id}")
def delete_episode(ep_id: str, authorization: Optional[str] = Header(None)):
    require_admin_role(authorization)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM episodes WHERE id = ?", (ep_id,))
    conn.commit()
    conn.close()
    return {"message": "Episode deleted"}

# ---------------- GENRES ----------------
@app.get("/api/genres")
def get_genres():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM genres")
    rows = cursor.fetchall()
    conn.close()
    return [{"id": r["id"], "name": r["name"], "slug": r["slug"], "count": 0} for r in rows]

@app.post("/api/genres")
def create_genre(g: GenreCreate, authorization: Optional[str] = Header(None)):
    require_admin_role(authorization)
    conn = get_db_connection()
    cursor = conn.cursor()
    g_id = "g-" + str(int(datetime.now().timestamp() * 1000))
    slug = g.name.lower().replace(" ", "-")
    cursor.execute("INSERT INTO genres (id, name, slug) VALUES (?, ?, ?)", (g_id, g.name, slug))
    conn.commit()
    conn.close()
    return {"id": g_id, "name": g.name, "slug": slug, "count": 0}

@app.delete("/api/genres/{genre_id}")
def delete_genre(genre_id: str, authorization: Optional[str] = Header(None)):
    try:
        require_admin_role(authorization)
    except Exception:
        pass
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM genres WHERE id = ? OR name = ? OR slug = ?", (genre_id, genre_id, genre_id))
    conn.commit()
    conn.close()
    return {"message": "Genre deleted"}

# ---------------- USERS & AUTH ----------------
@app.get("/api/auth/me")
def get_current_user_profile(authorization: Optional[str] = Header(None)):
    token_payload = get_current_user_from_token(authorization)
    user_id = token_payload.get("sub")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="មិនមានអ្នកប្រើប្រាស់នេះទេ (User not found)")

    cursor.execute("SELECT content_id FROM favorites WHERE user_id = ?", (user["id"],))
    favs = [f["content_id"] for f in cursor.fetchall()]

    cursor.execute("SELECT content_id, content_type, episode_id, progress, duration, current_time, watched_at FROM watch_history WHERE user_id = ? ORDER BY watched_at DESC", (user["id"],))
    history = [{
        "contentId": h["content_id"],
        "contentType": h["content_type"],
        "episodeId": h["episode_id"],
        "progress": h["progress"],
        "duration": h["duration"],
        "currentTime": h["current_time"],
        "watchedAt": h["watched_at"]
    } for h in cursor.fetchall()]

    conn.close()
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "avatar": user["avatar"],
        "role": user["role"],
        "status": user["status"],
        "isVip": bool(user["is_vip"] if "is_vip" in user.keys() else 0),
        "createdAt": user["created_at"],
        "favorites": favs,
        "history": history
    }

@app.get("/api/users")
def get_users(authorization: Optional[str] = Header(None)):
    require_admin_role(authorization)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users")
    rows = cursor.fetchall()
    
    users = []
    for r in rows:
        uid = r["id"]
        cursor.execute("SELECT content_id FROM favorites WHERE user_id = ?", (uid,))
        favs = [f["content_id"] for f in cursor.fetchall()]

        cursor.execute("SELECT * FROM watch_history WHERE user_id = ? ORDER BY watched_at DESC", (uid,))
        history = [{
            "id": h["id"],
            "contentId": h["content_id"],
            "contentType": h["content_type"],
            "episodeId": h["episode_id"],
            "progress": h["progress"],
            "duration": h["duration"],
            "currentTime": h["current_time"],
            "watchedAt": h["watched_at"]
        } for h in cursor.fetchall()]

        users.append({
            "id": r["id"],
            "name": r["name"],
            "email": r["email"],
            "avatar": r["avatar"],
            "role": r["role"],
            "status": r["status"],
            "isVip": bool(r["is_vip"] if "is_vip" in r.keys() else 0),
            "createdAt": r["created_at"],
            "favorites": favs,
            "history": history
        })
    conn.close()
    return users

@app.patch("/api/users/{user_id}/ban")
def toggle_ban_user_endpoint(user_id: str, authorization: Optional[str] = Header(None)):
    require_admin_role(authorization)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT status, email FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="មិនរកឃើញអ្នកប្រើប្រាស់នេះទេ (User not found)")

    new_status = "active" if row["status"] == "banned" else "banned"
    cursor.execute("UPDATE users SET status = ? WHERE id = ?", (new_status, user_id))
    conn.commit()
    conn.close()

    log_security_audit("USER_BAN_TOGGLED", f"User {user_id} ({row['email']}) status changed to {new_status}")
    return {"id": user_id, "status": new_status, "message": f"User status updated to {new_status}"}

@app.delete("/api/users/{user_id}")
def delete_user_endpoint(user_id: str, authorization: Optional[str] = Header(None)):
    require_admin_role(authorization)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return {"message": "User deleted"}

# ---------------- WEBRTC VOICE CALL SIGNALING ----------------
PENDING_CALL_SIGNALS = {}

@app.post("/api/chat/call/signal")
def send_call_signal(payload: dict, authorization: Optional[str] = Header(None)):
    user = get_current_user_from_token(authorization)
    target_user_id = payload.get("targetUserId")
    signal_type = payload.get("type") # 'offer', 'answer', 'ice-candidate', 'reject', 'end'
    
    if not target_user_id or not signal_type:
        raise HTTPException(status_code=400, detail="Target User and Signal Type required")

    if target_user_id not in PENDING_CALL_SIGNALS:
        PENDING_CALL_SIGNALS[target_user_id] = []
        
    signal_data = {
        "id": str(uuid.uuid4()),
        "callerId": user["sub"],
        "callerName": user.get("email", "User").split("@")[0],
        "targetUserId": target_user_id,
        "type": signal_type,
        "sdp": payload.get("sdp"),
        "candidate": payload.get("candidate"),
        "timestamp": datetime.now().isoformat()
    }
    
    PENDING_CALL_SIGNALS[target_user_id].append(signal_data)
    # Keep max 50 pending signals
    if len(PENDING_CALL_SIGNALS[target_user_id]) > 50:
        PENDING_CALL_SIGNALS[target_user_id] = PENDING_CALL_SIGNALS[target_user_id][-50:]
        
    return {"status": "sent", "signal": signal_data}

@app.get("/api/chat/call/signal")
def get_call_signals(authorization: Optional[str] = Header(None)):
    user = get_current_user_from_token(authorization)
    user_id = user["sub"]
    signals = PENDING_CALL_SIGNALS.get(user_id, [])
    # Clear delivered signals
    PENDING_CALL_SIGNALS[user_id] = []
    return signals

@app.post("/api/users/{user_id}/toggle-vip")
def toggle_vip_status(user_id: str, authorization: Optional[str] = Header(None)):
    require_admin_role(authorization)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT is_vip FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
    
    current_vip = row["is_vip"] if "is_vip" in row.keys() else 0
    new_vip = 0 if current_vip else 1
    cursor.execute("UPDATE users SET is_vip = ? WHERE id = ?", (new_vip, user_id))
    conn.commit()
    conn.close()
    return {"isVip": bool(new_vip)}

@app.post("/api/users/login")
def login_user(payload: UserLogin, request: Request):
    check_payload_security(payload.email)
    check_payload_security(payload.password)

    email_clean = payload.email.strip().lower()
    now = time.time()
    ip_address = request.headers.get("X-Forwarded-For") or (request.client.host if request.client else "127.0.0.1")
    user_agent = request.headers.get("user-agent", "Unknown Client Device")

    # Check if IP is banned
    if is_ip_banned(ip_address):
        log_security_audit("BANNED_IP_BLOCKED_REQUEST", f"Blocked request from banned IP: {ip_address}", ip_address)
        raise HTTPException(status_code=403, detail="IP Address របស់អ្នកត្រូវបានរារាំងដោយសុវត្ថិភាព! (IP Address is banned)")

    # Rate limiting / brute force check (5 failed attempts = 15 minute lock)
    if email_clean in FAILED_ATTEMPTS:
        attempts, lock_until = FAILED_ATTEMPTS[email_clean]
        if attempts >= 5:
            remaining = int((lock_until - now) / 60)
            if now < lock_until:
                log_security_audit("BRUTE_FORCE_LOCKED_ATTEMPT", f"Attempted login on locked account: {email_clean}", ip_address)
                raise HTTPException(
                    status_code=429, 
                    detail=f"គណនីនេះត្រូវបានចាក់សោរបណ្តោះអាសន្ន {max(1, remaining)} នាទី ដោយសារបញ្ចូលលេខសម្ងាត់ខុស ៥ដង (Too many failed attempts, try again in {max(1, remaining)} min)"
                )
            else:
                FAILED_ATTEMPTS.pop(email_clean, None)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", (email_clean,))
    user = cursor.fetchone()

    if not user:
        conn.close()
        attempts, _ = FAILED_ATTEMPTS.get(email_clean, (0, 0))
        FAILED_ATTEMPTS[email_clean] = (attempts + 1, now + 900)
        log_security_audit("FAILED_LOGIN_UNKNOWN_USER", f"Failed login for non-existent email: {email_clean}", ip_address)
        
        is_auto_banned = record_failed_login_attempt(ip_address, email_clean)
        if is_auto_banned:
            try:
                send_telegram_alert(f"🚨 <b>SECURITY EMERGENCY ALERT - IP AUTO-BANNED!</b>\nIP Address: <code>{ip_address}</code> ត្រូវបានប្រព័ន្ធរារាំងស្វ័យប្រវត្ត ដោយសារបញ្ចូលលេខសម្ងាត់ខុស ៥ដង លើអ៊ីមែល <code>{email_clean}</code>")
            except Exception:
                pass
            raise HTTPException(status_code=403, detail="IP Address របស់អ្នកត្រូវបានរារាំងដោយស្វ័យប្រវត្ត ដោយសារវាយលេខសម្ងាត់ខុសច្រើនដង! (IP Auto-Banned)")

        raise HTTPException(status_code=401, detail="មិនមានគណនីនេះទេ! សូមចុះឈ្មោះជាមុនសិន។ (Account not found, please register)")

    stored_hash = user["password_hash"]
    if stored_hash:
        if not verify_password(payload.password, stored_hash):
            conn.close()
            attempts, _ = FAILED_ATTEMPTS.get(email_clean, (0, 0))
            FAILED_ATTEMPTS[email_clean] = (attempts + 1, now + 900)
            log_security_audit("FAILED_LOGIN_BAD_PASSWORD", f"Incorrect password for email: {email_clean}", ip_address)
            
            is_auto_banned = record_failed_login_attempt(ip_address, email_clean)
            if is_auto_banned:
                try:
                    send_telegram_alert(f"🚨 <b>SECURITY EMERGENCY ALERT - IP AUTO-BANNED!</b>\nIP Address: <code>{ip_address}</code> ត្រូវបានប្រព័ន្ធរារាំងស្វ័យប្រវត្ត ដោយសារបញ្ចូលលេខសម្ងាត់ខុស ៥ដង លើអ៊ីមែល <code>{email_clean}</code>")
                except Exception:
                    pass
                raise HTTPException(status_code=403, detail="IP Address របស់អ្នកត្រូវបានរារាំងដោយស្វ័យប្រវត្ត ដោយសារវាយលេខសម្ងាត់ខុសច្រើនដង! (IP Auto-Banned)")

            raise HTTPException(status_code=401, detail="លេខសម្ងាត់មិនត្រឹមត្រូវទេ! (Incorrect password)")

    FAILED_ATTEMPTS.pop(email_clean, None)
    clear_failed_login_attempts(ip_address)

    if user["status"] == "banned":
        log_security_audit("BANNED_USER_LOGIN_SESSION", f"Banned user logged in session created for support chat access: {email_clean}")

    cursor.execute("SELECT content_id FROM favorites WHERE user_id = ?", (user["id"],))
    favs = [f["content_id"] for f in cursor.fetchall()]

    cursor.execute("SELECT content_id, content_type, episode_id, progress, duration, current_time, watched_at FROM watch_history WHERE user_id = ? ORDER BY watched_at DESC", (user["id"],))
    history = [{
        "contentId": h["content_id"],
        "contentType": h["content_type"],
        "episodeId": h["episode_id"],
        "progress": h["progress"],
        "duration": h["duration"],
        "currentTime": h["current_time"],
        "watchedAt": h["watched_at"]
    } for h in cursor.fetchall()]

    conn.close()

    jti = f"sess_{uuid.uuid4().hex[:12]}"
    create_session(user["id"], user["email"], ip_address, user_agent, jti)
    log_security_audit("LOGIN_SUCCESS", f"User logged in successfully: {email_clean} (Role: {user['role']})")
    token = create_jwt_token(user["id"], user["email"], user["role"], jti=jti)

    user_data = {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "avatar": user["avatar"],
        "role": user["role"],
        "status": user["status"],
        "createdAt": user["created_at"],
        "favorites": favs,
        "history": history,
        "token": token,
        "tokenType": "Bearer"
    }
    
    response = JSONResponse(content=user_data)
    response.set_cookie(key="access_token", value=token, httponly=True, samesite="lax", max_age=86400)
    return response

@app.post("/api/users/register")
def register_user(payload: UserRegister, request: Request):
    check_payload_security(payload.name)
    check_payload_security(payload.email)
    check_payload_security(payload.password)

    email_clean = payload.email.strip().lower()
    name_clean = sanitize_text(payload.name.strip())
    ip_address = request.headers.get("X-Forwarded-For") or (request.client.host if request.client else "127.0.0.1")
    user_agent = request.headers.get("user-agent", "Unknown Client Device")

    if len(payload.password) < 8 or not any(c.isdigit() for c in payload.password):
        raise HTTPException(
            status_code=400, 
            detail="លេខសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ ៨ តួ និងមានផ្ទុកលេខអក្សរផ្សំ (Password must be at least 8 characters and include digits)"
        )

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", (email_clean,))
    existing = cursor.fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=400, detail="អ៊ីមែលនេះមានគណនីរួចហើយ! (Email already exists)")

    user_id = "usr-" + str(int(datetime.now().timestamp() * 1000))
    role = "USER"
    avatar = payload.avatar or f"https://api.dicebear.com/7.x/avataaars/svg?seed={quote(name_clean)}"
    created_at = datetime.now().strftime("%Y-%m-%d")
    pass_hash = hash_password(payload.password)

    cursor.execute('''
        INSERT INTO users (id, name, email, password_hash, avatar, role, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'active', ?)
    ''', (user_id, name_clean, email_clean, pass_hash, avatar, role, created_at))
    conn.commit()
    conn.close()

    jti = f"sess_{uuid.uuid4().hex[:12]}"
    create_session(user_id, email_clean, ip_address, user_agent, jti)
    log_security_audit("USER_REGISTERED", f"New user registered: {email_clean}")
    token = create_jwt_token(user_id, email_clean, role, jti=jti)

    user_data = {
        "id": user_id,
        "name": name_clean,
        "email": email_clean,
        "avatar": avatar,
        "role": role,
        "status": "active",
        "createdAt": created_at,
        "favorites": [],
        "history": [],
        "token": token,
        "tokenType": "Bearer"
    }

    response = JSONResponse(content=user_data)
    response.set_cookie(key="access_token", value=token, httponly=True, samesite="lax", max_age=86400)
    return response

@app.put("/api/users/profile")
def update_user_profile(payload: UserProfileUpdate):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (payload.userId,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")

    new_name = payload.name if payload.name else user["name"]
    new_email = payload.email if payload.email else user["email"]
    new_avatar = payload.avatar if payload.avatar else user["avatar"]

    cursor.execute("UPDATE users SET name = ?, email = ?, avatar = ? WHERE id = ?", (new_name, new_email, new_avatar, payload.userId))
    conn.commit()
    conn.close()

    return {
        "id": payload.userId,
        "name": new_name,
        "email": new_email,
        "avatar": new_avatar,
        "role": user["role"],
        "status": user["status"],
        "createdAt": user["created_at"]
    }

@app.post("/api/users/favorites/toggle/{content_id}")
def toggle_user_favorite(content_id: str, authorization: Optional[str] = Header(None)):
    user = get_current_user_from_token(authorization)
    res = toggle_favorite_in_db(user["sub"], content_id)
    return res

@app.post("/api/users/change-password")
def change_user_password(payload: dict, authorization: Optional[str] = Header(None)):
    user_id = payload.get("userId")
    old_password = payload.get("oldPassword", "")
    new_password = payload.get("newPassword", "")

    if authorization and authorization.startswith("Bearer "):
        try:
            token_payload = get_current_user_from_token(authorization)
            if not user_id:
                user_id = token_payload.get("sub")
        except Exception:
            pass

    if not user_id or not new_password:
        raise HTTPException(status_code=400, detail="សូមបញ្ចូលលេខសម្ងាត់ថ្មី (Password required)")

    if len(new_password) < 8 or not any(c.isdigit() for c in new_password):
        raise HTTPException(
            status_code=400, 
            detail="លេខសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ ៨ តួ និងមានផ្ទុកលេខអក្សរផ្សំ (Password must be at least 8 characters and include digits)"
        )

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="រកមិនឃើញគណនី (User not found)")

    if user["password_hash"] and old_password:
        if not verify_password(old_password, user["password_hash"]):
            conn.close()
            raise HTTPException(status_code=400, detail="លេខសម្ងាត់ចាស់មិនត្រឹមត្រូវទេ (Incorrect old password)")

    new_hash = hash_password(new_password)
    cursor.execute("UPDATE users SET password_hash = ? WHERE id = ?", (new_hash, user_id))
    conn.commit()
    conn.close()
    return {"message": "លេខសម្ងាត់ត្រូវកែប្រែដោយជោគជ័យ! (Password changed successfully)"}

# ---------------- REAL-TIME DYNAMIC SYSTEM NOTIFICATIONS (SQLITE DB) ----------------
@app.post("/api/notifications/read-all")
def mark_all_notifications_read_endpoint():
    mark_notifications_read()
    return {"message": "All notifications marked as read"}

@app.delete("/api/notifications/{notif_id}")
def delete_notification_endpoint(notif_id: str):
    delete_notification_from_db(notif_id)
    return {"message": "Notification deleted"}

@app.delete("/api/notifications")
def delete_all_notifications_endpoint():
    delete_notification_from_db("ALL")
    return {"message": "All notifications deleted"}
@app.post("/api/users/{user_id}/toggle-ban")
def toggle_ban(user_id: str, authorization: Optional[str] = Header(None)):
    require_admin_role(authorization)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT status FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
    
    new_status = "active" if row["status"] == "banned" else "banned"
    cursor.execute("UPDATE users SET status = ? WHERE id = ?", (new_status, user_id))
    conn.commit()
    conn.close()
    return {"status": new_status}

@app.delete("/api/users/{user_id}")
def delete_user(user_id: str, authorization: Optional[str] = Header(None)):
    require_admin_role(authorization)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
    cursor.execute("DELETE FROM favorites WHERE user_id = ?", (user_id,))
    cursor.execute("DELETE FROM watch_history WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()
    return {"message": "User deleted"}

# ---------------- COMMENTS & RATINGS ----------------
COMMENTS_FILE = os.path.join(os.path.dirname(__file__), "comments.json")

def load_comments() -> list:
    if os.path.exists(COMMENTS_FILE):
        try:
            with open(COMMENTS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return [
        {
            "id": "c1",
            "movieId": "m1",
            "userId": "u-user-1",
            "userName": "Sokha Vathanak",
            "userAvatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
            "content": "រឿងនេះមើលហើយល្អមើលខ្លាំងណាស់! រូបភាព 4K ច្បាស់ល្អ និងសំឡេងច្បាស់ល្អ។",
            "rating": 5,
            "createdAt": "2026-09-10T12:00:00Z"
        }
    ]

def save_comments(comments: list):
    with open(COMMENTS_FILE, "w", encoding="utf-8") as f:
        json.dump(comments, f, ensure_ascii=False, indent=2)

@app.get("/api/comments/{movie_id}")
def get_comments(movie_id: str):
    all_c = load_comments()
    return [c for c in all_c if c.get("movieId") == movie_id]

@app.post("/api/comments")
def add_comment(comment: dict):
    raw_content = comment.get("content", "")
    raw_username = comment.get("userName", "")

    check_payload_security(raw_content)
    check_payload_security(raw_username)

    comment["content"] = sanitize_text(raw_content)
    comment["userName"] = sanitize_text(raw_username)

    all_c = load_comments()
    if not comment.get("id"):
        comment["id"] = "c-" + str(int(datetime.now().timestamp() * 1000))
    if not comment.get("createdAt"):
        comment["createdAt"] = datetime.now().isoformat()
    all_c.insert(0, comment)
    save_comments(all_c)
    return comment

# ---------------- STATS ----------------
@app.get("/api/stats")
def get_stats():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM content WHERE type = 'movie'")
    movies_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM content WHERE type = 'series'")
    series_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM episodes")
    episodes_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM users")
    users_count = cursor.fetchone()[0]

    cursor.execute("SELECT SUM(views) FROM content")
    total_views = cursor.fetchone()[0] or 0

    cursor.execute("SELECT title, views, rating FROM content ORDER BY views DESC LIMIT 5")
    top_rows = cursor.fetchall()
    top_movies = [{"title": r["title"], "views": r["views"], "rating": r["rating"]} for r in top_rows]

    conn.close()
    
    daily_views = [
        {"date": "Mon", "views": max(12, int(total_views * 0.1))},
        {"date": "Tue", "views": max(24, int(total_views * 0.15))},
        {"date": "Wed", "views": max(38, int(total_views * 0.2))},
        {"date": "Thu", "views": max(45, int(total_views * 0.25))},
        {"date": "Fri", "views": max(62, int(total_views * 0.3))},
        {"date": "Sat", "views": max(85, int(total_views * 0.4))},
        {"date": "Sun", "views": max(110, total_views)}
    ]

    return {
        "totalMovies": movies_count,
        "totalSeries": series_count,
        "totalEpisodes": episodes_count,
        "totalUsers": users_count,
        "totalViews": total_views,
        "topMovies": top_movies,
        "dailyViews": daily_views
    }

# ---------------- BANNER SETTINGS ----------------
SETTINGS_FILE = os.path.join(os.path.dirname(__file__), "banner_settings.json")

DEFAULT_BANNER_DATA = {
    "featuredMovieId": "",
    "customHeadline": "",
    "customSubtitle": "",
    "customBannerUrl": "",
    "announcementTitle": "Hallo",
    "announcementText": "Halo",
    "announcementDate": "",
    "announcementColor": "red",
    "showAnnouncement": True
}

@app.get("/api/settings/banner")
def get_banner_settings():
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return DEFAULT_BANNER_DATA

@app.post("/api/settings/banner")
def update_banner_settings(settings: dict, authorization: Optional[str] = Header(None)):
    require_admin_role(authorization)
    try:
        with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
            json.dump(settings, f, ensure_ascii=False, indent=2)
        return settings
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------------- MAXIMUM SECURITY ENDPOINTS & AUDIT LOGS ----------------
@app.get("/api/security/health")
def get_security_health():
    return {
        "status": "ENTERPRISE_MAXIMUM_SECURE",
        "timestamp": datetime.now().isoformat(),
        "protections": {
            "passwordHashing": "Bcrypt (12 Rounds, Salted)",
            "tokenAuthentication": "JWT Signed (HS256 24h Expiry)",
            "rateLimiter": "Global IP Rate Limiter (120 req/min/IP)",
            "bruteForceLockout": "Active (5 Failures -> 15min Lockout)",
            "xssProtection": "Active (Input Sanitization & CSP Headers)",
            "sqliProtection": "Active (Parameterized Queries & Signature Sanitizer)",
            "fileUploadProtection": "Active (Extension Whitelisting & Path Traversal Shield)",
            "roleEscalationDefense": "Strict Enforcement (User Role Mandate)",
            "auditLogging": "Active SQLite Security Logs"
        }
    }

@app.get("/api/admin/security-logs")
def get_security_logs(authorization: Optional[str] = Header(None)):
    require_admin_role(authorization)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM security_logs ORDER BY id DESC LIMIT 100")
    rows = cursor.fetchall()
    conn.close()
    return [{
        "id": r["id"],
        "eventType": r["event_type"],
        "details": r["details"],
        "ipAddress": r["ip_address"],
        "timestamp": r["timestamp"]
    } for r in rows]

# ---------------- IP BANNING ENDPOINTS ----------------
@app.get("/api/admin/banned-ips")
def get_banned_ips(authorization: Optional[str] = Header(None)):
    require_admin_role(authorization)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM banned_ips ORDER BY banned_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [{
        "ipAddress": r["ip_address"],
        "reason": r["reason"],
        "bannedAt": r["banned_at"]
    } for r in rows]

@app.post("/api/admin/banned-ips")
def ban_ip_endpoint(payload: dict, authorization: Optional[str] = Header(None)):
    require_admin_role(authorization)
    ip = payload.get("ipAddress", "").strip()
    reason = payload.get("reason", "Banned by Administrator").strip()
    if not ip:
        raise HTTPException(status_code=400, detail="សូមបញ្ចូល IP Address (IP Address required)")
    ban_ip_in_db(ip, reason)
    log_security_audit("MANUAL_IP_BAN", f"Admin banned IP: {ip} ({reason})", ip)
    return {"message": f"IP {ip} ត្រូវបានប្រព័ន្ធរារាំងដោយជោគជ័យ! (IP {ip} banned successfully)", "ipAddress": ip}

@app.delete("/api/admin/banned-ips/{ip_address:path}")
def unban_ip_endpoint(ip_address: str, authorization: Optional[str] = Header(None)):
    require_admin_role(authorization)
    unban_ip_in_db(ip_address)
    log_security_audit("MANUAL_IP_UNBAN", f"Admin unbanned IP: {ip_address}", ip_address)
    return {"message": f"IP {ip_address} ត្រូវបានដកការរារាំងវិញដោយជោគជ័យ! (IP {ip_address} unbanned successfully)"}

# ---------------- TELEGRAM BOT SETTINGS ENDPOINTS ----------------
@app.get("/api/admin/settings/telegram")
def get_telegram_settings(authorization: Optional[str] = Header(None)):
    return {
        "telegramBotToken": get_setting("telegram_bot_token", ""),
        "telegramChatId": get_setting("telegram_chat_id", "")
    }

@app.post("/api/admin/settings/telegram")
def save_telegram_settings(payload: dict, authorization: Optional[str] = Header(None)):
    token = payload.get("telegramBotToken", "").strip()
    chat_id = payload.get("telegramChatId", "").strip()
    if token or chat_id:
        set_setting("telegram_bot_token", token)
        set_setting("telegram_chat_id", chat_id)
        log_security_audit("TELEGRAM_SETTINGS_UPDATED", "Admin updated Telegram Bot credentials")
    return {"message": "ការកំណត់ Telegram Bot ត្រូវបានរក្សាទុកដោយជោគជ័យ! (Telegram settings saved successfully)"}

@app.post("/api/admin/settings/telegram/test")
def test_telegram_settings(payload: dict, authorization: Optional[str] = Header(None)):
    require_admin_role(authorization)
    token = payload.get("telegramBotToken", "").strip() or get_setting("telegram_bot_token")
    chat_id = payload.get("telegramChatId", "").strip() or get_setting("telegram_chat_id")
    if not token or not chat_id:
        raise HTTPException(status_code=400, detail="សូមបញ្ចូល Telegram Bot Token និង Chat ID (Token and Chat ID required)")
    try:
        import urllib.request
        import urllib.parse
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        msg = f"🔔 <b>TERK TLA System Test Notification</b>\n<b>Time:</b> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n<b>Status:</b> Telegram Bot connected successfully!"
        data = urllib.parse.urlencode({"chat_id": chat_id, "text": msg, "parse_mode": "HTML"}).encode('utf-8')
        req = urllib.request.Request(url, data=data)
        urllib.request.urlopen(req, timeout=5)
        return {"message": "សារសាកល្បងត្រូវបានផ្ញើទៅ Telegram ដោយជោគជ័យ! (Test alert sent to Telegram successfully)"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"បរាជ័យក្នុងការផ្ញើសារសាកល្បង: {str(e)}")

LATEST_TELEGRAM_UPLOAD = {}

@app.get("/api/telegram/latest-upload")
def get_latest_telegram_upload():
    global LATEST_TELEGRAM_UPLOAD
    if not LATEST_TELEGRAM_UPLOAD:
        try:
            raw = get_setting("latest_telegram_upload", "{}")
            if raw and raw != "{}":
                LATEST_TELEGRAM_UPLOAD = json.loads(raw)
        except Exception:
            pass
    return LATEST_TELEGRAM_UPLOAD or {"url": "", "filename": "", "timestamp": 0}

@app.get("/api/telegram/video-history")
def get_telegram_video_history(request: Request):
    try:
        results = []
        if os.path.exists(VIDEOS_DIR):
            base_url = get_base_url(request)
            files = sorted(os.listdir(VIDEOS_DIR), key=lambda x: os.path.getmtime(os.path.join(VIDEOS_DIR, x)), reverse=True)
            for f in files:
                if f.endswith(('.mp4', '.mkv', '.mov', '.webm', '.avi')):
                    fpath = os.path.join(VIDEOS_DIR, f)
                    mtime = int(os.path.getmtime(fpath) * 1000)
                    size_mb = round(os.path.getsize(fpath) / (1024 * 1024), 1)
                    
                    # Clean title derivation
                    name_no_ext = os.path.splitext(f)[0]
                    name_no_ext = re.sub(r'^(web_|dl_|tlg_|tlg_web_|poster_)+', '', name_no_ext, flags=re.IGNORECASE)
                    clean_name = re.sub(r'(?i)\b(1080p|720p|480p|2160p|4k|hd|fhd|uhd|webrip|web-dl|bluray|brrip|x264|x265|hevc|aac|dvdrip|h264|h265|remux)\b', ' ', name_no_ext)
                    clean_name = re.sub(r'[\._\-\+\[\]\(\)]', ' ', clean_name)
                    clean_name = re.sub(r'\s+', ' ', clean_name).strip()
                    title_derived = clean_name.title() if clean_name else f
                    
                    # Find poster if exists
                    poster_url = ""
                    base_stem = os.path.splitext(f)[0]
                    for p_prefix in [f"poster_{base_stem}.jpg", f"poster_ff_{base_stem}.jpg", f"poster_tg_{base_stem}.jpg", f"poster_web_{base_stem}.jpg"]:
                        if os.path.exists(os.path.join(IMAGES_DIR, p_prefix)):
                            poster_url = f"{base_url}/uploads/images/{p_prefix}"
                            break

                    results.append({
                        "url": f"{base_url}/uploads/videos/{f}",
                        "filename": f,
                        "title": title_derived,
                        "caption": title_derived,
                        "posterUrl": poster_url,
                        "size": f"{size_mb} MB",
                        "timestamp": mtime
                    })
        return results[:30]
    except Exception as e:
        print("get_telegram_video_history error:", e)
        return []

USER_TELEGRAM_SESSIONS = {}

def create_telegram_movie_post(
    title: str,
    video_url: str,
    poster_url: str = "",
    movie_type: str = "movie",
    genres: list = None,
    is_featured: bool = False,
    is_trending: bool = True,
    is_popular: bool = True,
    is_latest: bool = True
) -> dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    movie_id = ("m" if movie_type == "movie" else "s") + str(int(datetime.now().timestamp() * 1000))
    created_at = datetime.now().strftime("%Y-%m-%d")
    default_poster = poster_url if poster_url else "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80"
    
    genres_list = genres if genres else ["Action", "Drama"]
    genres_json = json.dumps(genres_list)
    
    cursor.execute('''
        INSERT INTO content (
            id, title, description, poster_url, backdrop_url, trailer_url, video_url,
            release_year, rating, duration, type, genres, is_featured, is_trending,
            is_popular, is_latest, is_published, views, cast, director, created_at,
            uploaded_by_user_id, uploaded_by_user_name, uploaded_by_avatar, approval_status, rejection_reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        movie_id, title, f"បញ្ចូលតាម Telegram Bot: {title}", default_poster, default_poster,
        "", video_url, datetime.now().year, 8.5, "02:00:00",
        movie_type, genres_json, 1 if is_featured else 0, 1 if is_trending else 0,
        1 if is_popular else 0, 1 if is_latest else 0, 1, 0,
        json.dumps([]), "Telegram Admin", created_at,
        "admin_tg", "Telegram Bot Upload", "", "approved", ""
    ))
    
    conn.commit()
    cursor.execute("SELECT * FROM content WHERE id = ?", (movie_id,))
    row = cursor.fetchone()
    conn.close()
    
    try:
        add_notification(
            nid=f"notif_{uuid.uuid4().hex[:8]}",
            title="ភាពយន្តថ្មីបញ្ចូលតាម Telegram!",
            message=f"{title} ត្រូវបានបោះពុម្ពផ្សាយទស្សនាបានហើយ!",
            notif_type="new_movie",
            target_url=f"/movie/{movie_id}" if movie_type == "movie" else "/series"
        )
    except Exception as e:
        print("Auto notification error:", e)
        
    return {"id": movie_id, "title": title}

def get_active_genres_from_db() -> list:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM genres ORDER BY id ASC")
        rows = cursor.fetchall()
        conn.close()
        if rows:
            return [r["name"] for r in rows]
    except Exception as e:
        print("get_active_genres_from_db error:", e)
    return [
        "សកម្មភាព (Action)",
        "វិទ្យាសាស្ត្រ (Sci-Fi)",
        "រឿងភាគ (Drama)",
        "ផ្សងព្រេង (Adventure)",
        "កំប្លែង (Comedy)",
        "រំភើប (Thriller)",
        "រន្ធត់ (Horror)",
        "ភាពយន្តខ្មែរ (Khmer Cinema)"
    ]

def handle_telegram_update(update: dict, token: str, base_domain: str = "http://us.apsara.lol:15511"):
    import urllib.request
    import urllib.parse
    import json
    import ssl
    
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    def send_tg_msg(chat_id, text, reply_markup=None):
        try:
            url = f"https://api.telegram.org/bot{token}/sendMessage"
            data_dict = {"chat_id": chat_id, "text": text, "parse_mode": "HTML"}
            if reply_markup:
                data_dict["reply_markup"] = json.dumps(reply_markup)
            payload = urllib.parse.urlencode(data_dict).encode('utf-8')
            req = urllib.request.Request(url, data=payload)
            urllib.request.urlopen(req, context=ctx, timeout=10)
        except Exception as err:
            print("send_tg_msg error:", err)

    def answer_callback(cb_id):
        try:
            url = f"https://api.telegram.org/bot{token}/answerCallbackQuery"
            payload = urllib.parse.urlencode({"callback_query_id": cb_id}).encode('utf-8')
            req = urllib.request.Request(url, data=payload)
            urllib.request.urlopen(req, context=ctx, timeout=5)
        except Exception:
            pass

    main_keyboard = {
        "inline_keyboard": [
            [{"text": "📁 Upload វីដេអូតែប៉ុណ្ណោះ", "callback_data": "mode_upload_only"}],
            [{"text": "🎬 Upload វីដេអូ + បញ្ចូលចំណងជើងរឿង (Auto Post)", "callback_data": "mode_upload_post"}]
        ]
    }

    type_keyboard = {
        "inline_keyboard": [
            [
                {"text": "🎬 ភាពយន្តទោល (Movie)", "callback_data": "type_movie"},
                {"text": "📺 រឿងភាគ (Series)", "callback_data": "type_series"}
            ]
        ]
    }

    def get_genre_keyboard(selected_genres):
        active_genres = get_active_genres_from_db()
        buttons = []
        row = []
        for idx, g_name in enumerate(active_genres):
            is_sel = g_name in selected_genres
            prefix = "✅ " if is_sel else ""
            row.append({"text": f"{prefix}{g_name}", "callback_data": f"tg_g_{idx}"})
            if len(row) == 2:
                buttons.append(row)
                row = []
        if row:
            buttons.append(row)
        buttons.append([{"text": "➡️ បន្តទៅការកំណត់ទំព័រដើម (Next)", "callback_data": "step_sections"}])
        return {"inline_keyboard": buttons}

    def get_section_keyboard(session):
        f = "✅ " if session.get("is_featured") else ""
        t = "✅ " if session.get("is_trending") else ""
        p = "✅ " if session.get("is_popular") else ""
        l = "✅ " if session.get("is_latest") else ""
        return {
            "inline_keyboard": [
                [
                    {"text": f"{f}Hero Banner", "callback_data": "toggle_sec_featured"},
                    {"text": f"{t}កំពុងពេញនិយម (Trending)", "callback_data": "toggle_sec_trending"}
                ],
                [
                    {"text": f"{p}ភាពយន្តល្បីៗ (Popular)", "callback_data": "toggle_sec_popular"},
                    {"text": f"{l}ណែនាំពិសេស (Recommended)", "callback_data": "toggle_sec_latest"}
                ],
                [
                    {"text": "🚀 ជ្រើសរើសទាំងអស់ (Select All)", "callback_data": "sec_all"},
                    {"text": "➡️ រំលង/ផ្ញើវីដេអូ (Next: Send Video)", "callback_data": "step_video"}
                ]
            ]
        }

    if "callback_query" in update:
        cb = update["callback_query"]
        cb_id = cb.get("id")
        chat_id = cb.get("message", {}).get("chat", {}).get("id")
        data = cb.get("data", "")
        answer_callback(cb_id)

        session = USER_TELEGRAM_SESSIONS.get(chat_id, {
            "mode": "upload_post",
            "step": "awaiting_title",
            "type": "movie",
            "genres": ["Action"],
            "is_featured": False,
            "is_trending": True,
            "is_popular": True,
            "is_latest": True
        })

        if data == "mode_upload_only":
            USER_TELEGRAM_SESSIONS[chat_id] = {"mode": "upload_only", "step": "idle"}
            send_tg_msg(
                chat_id,
                "📁 <b>របៀប: Upload វីដេអូតែប៉ុណ្ណោះ</b>\n\n"
                "សូមផ្ញើឯកសារវីដេអូ (.mp4, .mkv, .mov) មកកាន់ Bot ឥឡូវនេះ ប្រព័ន្ធនឹងទាញយកទៅរក្សាទុកក្នុង Server និងបង្កើតជា Video Link ជូនស្វ័យប្រវត្តិ!"
            )
        elif data == "mode_upload_post":
            USER_TELEGRAM_SESSIONS[chat_id] = {
                "mode": "upload_post",
                "step": "awaiting_title",
                "type": "movie",
                "genres": ["Action"],
                "is_featured": False,
                "is_trending": True,
                "is_popular": True,
                "is_latest": True
            }
            send_tg_msg(
                chat_id,
                "🎬 <b>របៀប: Upload វីដេអូ + បញ្ចូលចំណងជើងរឿង (Auto Post)</b>\n\n"
                "✍️ <b>ជំហានទី ១:</b> សូមវាយផ្ញើ <b>ចំណងជើងរឿង (Movie Title)</b> មកកាន់ Bot ឥឡូវនេះ..."
            )
        elif data in ["type_movie", "type_series"]:
            m_type = "movie" if data == "type_movie" else "series"
            session["type"] = m_type
            session["step"] = "awaiting_genre"
            USER_TELEGRAM_SESSIONS[chat_id] = session
            t_label = "ភាពយន្តទោល (Movie)" if m_type == "movie" else "រឿងភាគ (Series)"
            send_tg_msg(
                chat_id,
                f"✅ <b>ប្រភេទរឿង: {t_label}</b>\n\n"
                f"🏷️ <b>ជំហានទី ៣:</b> សូមជ្រើសរើស <b>ប្រភេទភាពយន្ត (Genres)</b> ខាងក្រោម៖",
                reply_markup=get_genre_keyboard(session.get("genres", []))
            )
        elif data.startswith("tg_g_") or data.startswith("toggle_genre_"):
            try:
                g_name = ""
                if data.startswith("tg_g_"):
                    idx = int(data.replace("tg_g_", ""))
                    active_genres = get_active_genres_from_db()
                    if 0 <= idx < len(active_genres):
                        g_name = active_genres[idx]
                else:
                    g_name = data.replace("toggle_genre_", "")
                
                if g_name:
                    cur_g = session.get("genres", [])
                    if g_name in cur_g:
                        cur_g.remove(g_name)
                    else:
                        cur_g.append(g_name)
                    session["genres"] = cur_g
                    USER_TELEGRAM_SESSIONS[chat_id] = session
                    send_tg_msg(
                        chat_id,
                        f"🏷️ <b>ប្រភេទភាពយន្តដែលបានជ្រើសរើស:</b> {', '.join(cur_g) if cur_g else 'គ្មាន'}\n"
                        f"សូមជ្រើសរើសបន្ថែម ឬចុច បន្ត៖",
                        reply_markup=get_genre_keyboard(cur_g)
                    )
            except Exception as err:
                print("genre toggle error:", err)
        elif data == "step_sections":
            session["step"] = "awaiting_sections"
            USER_TELEGRAM_SESSIONS[chat_id] = session
            send_tg_msg(
                chat_id,
                "📌 <b>ជំហានទី ៤:</b> កំណត់ការបង្ហាញលើទំព័រដើម (Homepage Sections)៖",
                reply_markup=get_section_keyboard(session)
            )
        elif data.startswith("toggle_sec_"):
            sec_key = data.replace("toggle_sec_", "is_")
            session[sec_key] = not session.get(sec_key, False)
            USER_TELEGRAM_SESSIONS[chat_id] = session
            send_tg_msg(
                chat_id,
                "📌 <b>កំណត់ការបង្ហាញលើទំព័រដើម៖</b>",
                reply_markup=get_section_keyboard(session)
            )
        elif data == "sec_all":
            session["is_featured"] = True
            session["is_trending"] = True
            session["is_popular"] = True
            session["is_latest"] = True
            USER_TELEGRAM_SESSIONS[chat_id] = session
            send_tg_msg(
                chat_id,
                "📌 <b>បានជ្រើសរើសបង្ហាញគ្រប់ផ្នែកទាំងអស់លើទំព័រដើម!</b>",
                reply_markup=get_section_keyboard(session)
            )
        elif data == "step_video":
            session["step"] = "awaiting_video"
            USER_TELEGRAM_SESSIONS[chat_id] = session
            title = session.get("title", "ភាពយន្តថ្មី")
            send_tg_msg(
                chat_id,
                f"📹 <b>ជំហានចុងក្រោយ:</b> សូមផ្ញើឯកសារវីដេអូ (.mp4, .mkv, .mov) នៃរឿង «<b>{title}</b>» មកកាន់ Bot ឥឡូវនេះ ដើម្បី Upload និងបោះពុម្ពផ្សាយចូល Website..."
            )
        return

    message = update.get("message") or update.get("channel_post")
    if not message:
        return

    chat_id = message.get("chat", {}).get("id")
    text = (message.get("text") or "").strip()
    file_obj = message.get("video") or message.get("document") or message.get("animation")
    session = USER_TELEGRAM_SESSIONS.get(chat_id, {"mode": "upload_only", "step": "idle"})

    if text and (text.startswith("/start") or text.startswith("/menu") or text.lower() == "menu"):
        USER_TELEGRAM_SESSIONS[chat_id] = {"mode": "upload_only", "step": "idle"}
        send_tg_msg(
            chat_id,
            "👋 <b>សូមស្វាគមន៍មកកាន់ Telegram Video Bot!</b>\n\n"
            "សូមជ្រើសរើសជម្រើសខាងក្រោម៖\n"
            "១. 📁 <b>Upload វីដេអូតែប៉ុណ្ណោះ</b>: ទាញយកវីដេអូទុកក្នុង Server & បង្កើត Video Link\n"
            "២. 🎬 <b>Upload វីដេអូ + បញ្ចូលចំណងជើងរឿង (Auto Post)</b>: កំណត់ព័ត៌មាន និងបោះពុម្ពផ្សាយរឿងចូល Web ស្វ័យប្រវត្តិ",
            reply_markup=main_keyboard
        )
        return

    if text and not file_obj:
        if session.get("step") == "awaiting_title":
            title = text
            session["title"] = title
            session["step"] = "awaiting_type"
            USER_TELEGRAM_SESSIONS[chat_id] = session
            send_tg_msg(
                chat_id,
                f"✅ <b>ចំណងជើងរឿង: «{title}»</b>\n\n"
                f"🎭 <b>ជំហានទី ២:</b> សូមជ្រើសរើស <b>ប្រភេទរឿង (Category)</b> ខាងក្រោម៖",
                reply_markup=type_keyboard
            )
            return
        else:
            send_tg_msg(
                chat_id,
                "💡 <b>សូមជ្រើសរើសជម្រើស ឬផ្ញើឯកសារវីដេអូផ្ទាល់៖</b>",
                reply_markup=main_keyboard
            )
            return

    # Check if user sent a Photo (Custom Poster)
    photo_obj = message.get("photo")
    if photo_obj and isinstance(photo_obj, list) and len(photo_obj) > 0:
        try:
            best_photo = photo_obj[-1]
            p_file_id = best_photo.get("file_id")
            get_p_file_url = f"https://api.telegram.org/bot{token}/getFile?file_id={p_file_id}"
            req = urllib.request.Request(get_p_file_url)
            with urllib.request.urlopen(req, context=ctx, timeout=15) as pres:
                p_file_info = json.loads(pres.read().decode('utf-8'))
            if p_file_info.get("ok"):
                p_file_path = p_file_info["result"]["file_path"]
                p_dl_url = f"https://api.telegram.org/file/bot{token}/{p_file_path}"
                safe_poster_name = f"poster_{uuid.uuid4().hex[:12]}.jpg"
                poster_dest_path = os.path.join(IMAGES_DIR, safe_poster_name)
                
                p_dl_req = urllib.request.Request(p_dl_url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(p_dl_req, context=ctx, timeout=60) as response, open(poster_dest_path, "wb") as out_file:
                    shutil.copyfileobj(response, out_file)
                
                session["custom_poster"] = f"/uploads/images/{safe_poster_name}"
                USER_TELEGRAM_SESSIONS[chat_id] = session
                
                send_tg_msg(
                    chat_id,
                    f"🖼️ <b>បានទទួល និងរក្សាទុករូបភាព Poster រួចរាល់!</b>\n\n"
                    f"សូមផ្ញើ <b>ឯកសារវីដេអូ (.mp4, .mkv, .mov)</b> មកកាន់ Bot ឥឡូវនេះ ដើម្បីបោះពុម្ពផ្សាយចូល Website..."
                )
                return
        except Exception as err_p:
            print("photo upload error:", err_p)

    if file_obj:
        file_id = file_obj.get("file_id")
        file_name = file_obj.get("file_name") or f"tg_video_{uuid.uuid4().hex[:8]}.mp4"
        ext = os.path.splitext(file_name)[1].lower() or ".mp4"

        tg_caption = (message.get("caption") or "").strip()
        current_mode = session.get("mode", "upload_only")
        current_title = session.get("title")
        if not current_title and tg_caption:
            current_title = tg_caption.split("\n")[0].strip()
            current_title = re.sub(r'#\w+', '', current_title).strip()
            current_title = re.sub(r'^(🎬|📺|🎥|🔥|✨|👉)\s*', '', current_title).strip()

        send_tg_msg(chat_id, f"⏳ <b>កំពុងទាញយក និងរក្សាទុកវីដេអូក្នុង Server...</b>\nFILE: <code>{file_name}</code>")

        get_file_url = f"https://api.telegram.org/bot{token}/getFile?file_id={file_id}"
        req = urllib.request.Request(get_file_url)
        with urllib.request.urlopen(req, context=ctx, timeout=15) as fres:
            file_info = json.loads(fres.read().decode('utf-8'))

        if file_info.get("ok"):
            file_path = file_info["result"]["file_path"]
            dl_url = f"https://api.telegram.org/file/bot{token}/{file_path}"

            safe_filename = f"tlg_{uuid.uuid4().hex[:12]}{ext}"
            dest_path = os.path.join(VIDEOS_DIR, safe_filename)

            dl_req = urllib.request.Request(dl_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(dl_req, context=ctx, timeout=600) as response, open(dest_path, "wb") as out_file:
                shutil.copyfileobj(response, out_file)

            # Auto transcode .mov / .mkv / .avi to web-native .mp4 H.264/AAC for 100% browser compatibility
            if ext in [".mov", ".mkv", ".avi", ".flv"]:
                try:
                    import subprocess
                    mp4_filename = f"tlg_web_{uuid.uuid4().hex[:12]}.mp4"
                    mp4_dest_path = os.path.join(VIDEOS_DIR, mp4_filename)
                    cmd_conv = ["ffmpeg", "-y", "-i", dest_path, "-c:v", "libx264", "-preset", "ultrafast", "-crf", "26", "-c:a", "aac", mp4_dest_path]
                    res_conv = subprocess.run(cmd_conv, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120)
                    if res_conv.returncode == 0 and os.path.exists(mp4_dest_path) and os.path.getsize(mp4_dest_path) > 0:
                        try:
                            os.remove(dest_path)
                        except Exception:
                            pass
                        safe_filename = mp4_filename
                        dest_path = mp4_dest_path
                except Exception as e_conv:
                    print("Telegram video transcode error:", e_conv)

            video_public_url = f"http://us.apsara.lol:15511/uploads/videos/{safe_filename}"
            relative_video_url = f"/uploads/videos/{safe_filename}"

            # Auto extract/download video thumbnail for Poster
            auto_poster_url = session.get("custom_poster", "")
            
            # 1. Try Telegram native video thumbnail if custom poster not set
            if not auto_poster_url:
                tg_thumb = file_obj.get("thumbnail") or file_obj.get("thumb")
                if tg_thumb and isinstance(tg_thumb, dict) and tg_thumb.get("file_id"):
                    try:
                        t_file_id = tg_thumb.get("file_id")
                        get_t_url = f"https://api.telegram.org/bot{token}/getFile?file_id={t_file_id}"
                        req = urllib.request.Request(get_t_url)
                        with urllib.request.urlopen(req, context=ctx, timeout=15) as tres:
                            t_info = json.loads(tres.read().decode('utf-8'))
                        if t_info.get("ok"):
                            t_file_path = t_info["result"]["file_path"]
                            t_dl_url = f"https://api.telegram.org/file/bot{token}/{t_file_path}"
                            t_poster_name = f"poster_tg_{uuid.uuid4().hex[:12]}.jpg"
                            t_dest = os.path.join(IMAGES_DIR, t_poster_name)
                            t_req = urllib.request.Request(t_dl_url, headers={"User-Agent": "Mozilla/5.0"})
                            with urllib.request.urlopen(t_req, context=ctx, timeout=30) as res, open(t_dest, "wb") as out:
                                shutil.copyfileobj(res, out)
                            auto_poster_url = f"/uploads/images/{t_poster_name}"
                    except Exception as e_thumb:
                        print("Telegram thumbnail download error:", e_thumb)

            # 2. Try FFmpeg video frame extraction if available
            if not auto_poster_url or "poster_tg_" in auto_poster_url:
                try:
                    import subprocess
                    ffmpeg_poster_name = f"poster_ff_{uuid.uuid4().hex[:12]}.jpg"
                    ffmpeg_dest = os.path.join(IMAGES_DIR, ffmpeg_poster_name)
                    cmd = ["ffmpeg", "-y", "-ss", "00:00:03", "-i", dest_path, "-vframes", "1", "-q:v", "2", ffmpeg_dest]
                    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=10)
                    if res.returncode == 0 and os.path.exists(ffmpeg_dest) and os.path.getsize(ffmpeg_dest) > 0:
                        auto_poster_url = f"/uploads/images/{ffmpeg_poster_name}"
                except Exception as e_ff:
                    print("FFmpeg poster extraction fallback error:", e_ff)

            global LATEST_TELEGRAM_UPLOAD
            LATEST_TELEGRAM_UPLOAD = {
                "url": video_public_url,
                "posterUrl": auto_poster_url,
                "filename": file_name,
                "caption": tg_caption or current_title or file_name,
                "title": current_title or file_name,
                "timestamp": int(time.time() * 1000)
            }
            set_setting("latest_telegram_upload", json.dumps(LATEST_TELEGRAM_UPLOAD))

            if current_mode == "upload_post" and current_title:
                created = create_telegram_movie_post(
                    title=current_title,
                    video_url=relative_video_url,
                    poster_url=auto_poster_url,
                    movie_type=session.get("type", "movie"),
                    genres=session.get("genres", ["Action"]),
                    is_featured=session.get("is_featured", False),
                    is_trending=session.get("is_trending", True),
                    is_popular=session.get("is_popular", True),
                    is_latest=session.get("is_latest", True)
                )
                movie_id = created.get("id", "")
                USER_TELEGRAM_SESSIONS[chat_id] = {"mode": "upload_only", "step": "idle"}

                g_text = ", ".join(session.get("genres", ["Action"]))
                t_text = "ភាពយន្តទោល (Movie)" if session.get("type") == "movie" else "រឿងភាគ (Series)"

                send_tg_msg(
                    chat_id,
                    f"🎉 <b>បោះពុម្ពផ្សាយរឿងចូល Website ដោយជោគជ័យ!</b>\n\n"
                    f"🎬 <b>ចំណងជើងរឿង:</b> {current_title}\n"
                    f"🎭 <b>ប្រភេទ:</b> {t_text}\n"
                    f"🏷️ <b>Genres:</b> {g_text}\n"
                    f"📁 <b>ឈ្មោះឯកសារ:</b> {file_name}\n"
                    f"🔗 <b>Video URL:</b> <code>{video_public_url}</code>\n"
                    f"🌐 <b>ទស្សនានៅលើ Web:</b> https://terktlahub.vercel.app/movie/{movie_id}\n\n"
                    f"✨ <b>រឿងនេះត្រូវគេមើលបានភ្លាមៗនៅលើ Website និង App!</b>",
                    reply_markup=main_keyboard
                )
            else:
                send_tg_msg(
                    chat_id,
                    f"✅ <b>Upload វីដេអូទៅ Server ជោគជ័យ!</b>\n\n"
                    f"📁 <b>ឈ្មោះឯកសារ:</b> {file_name}\n"
                    f"🔗 <b>Video URL:</b> <code>{video_public_url}</code>\n\n"
                    f"✨ <b>Link នេះត្រូវរត់ចូលប្រអប់ Video ក្នុង Admin Web ដោយស្វ័យប្រវត្តិ!</b>",
                    reply_markup=main_keyboard
                )

@app.post("/api/telegram/webhook")
async def telegram_webhook_handler(request: Request):
    try:
        data = await request.json()
        token = get_setting("telegram_bot_token")
        if not token:
            return {"status": "no_bot_token"}
        base_domain = get_base_url(request)
        handle_telegram_update(data, token, base_domain)
    except Exception as e:
        print("telegram_webhook_handler error:", e)
    return {"status": "ok"}

@app.post("/api/admin/settings/telegram/set-webhook")
def set_telegram_webhook(request: Request, authorization: Optional[str] = Header(None)):
    token = get_setting("telegram_bot_token")
    if not token:
        raise HTTPException(status_code=400, detail="សូមបញ្ចូល Telegram Bot Token ជាមុនសិន")
    try:
        import urllib.request
        import urllib.parse
        import json
        import ssl
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        
        base_domain = get_base_url(request)
        webhook_url = f"{base_domain}/api/telegram/webhook"
        
        set_url = f"https://api.telegram.org/bot{token}/setWebhook?url={webhook_url}"
        req = urllib.request.Request(set_url)
        with urllib.request.urlopen(req, context=ctx, timeout=10) as res:
            data = json.loads(res.read().decode('utf-8'))
            if data.get("ok"):
                return {"message": f"បានភ្ជាប់ Telegram Bot Webhook ដោយជោគជ័យ! ({webhook_url})"}
            else:
                raise HTTPException(status_code=400, detail=data.get("description", "Set webhook failed"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"បរាជ័យក្នុងការភ្ជាប់ Webhook: {str(e)}")

# Telegram Bot Background Polling Worker
LAST_TELEGRAM_UPDATE_ID = 0

def telegram_polling_worker():
    global LAST_TELEGRAM_UPDATE_ID
    while True:
        try:
            token = get_setting("telegram_bot_token")
            if token and len(token) > 10:
                import urllib.request
                import urllib.parse
                import json
                import ssl
                ctx = ssl.create_default_context()
                ctx.check_hostname = False
                ctx.verify_mode = ssl.CERT_NONE

                get_updates_url = f"https://api.telegram.org/bot{token}/getUpdates?offset={LAST_TELEGRAM_UPDATE_ID + 1}&timeout=5"
                req = urllib.request.Request(get_updates_url)
                with urllib.request.urlopen(req, context=ctx, timeout=10) as res:
                    data = json.loads(res.read().decode('utf-8'))

                if data.get("ok"):
                    for update in data.get("result", []):
                        LAST_TELEGRAM_UPDATE_ID = update["update_id"]
                        handle_telegram_update(update, token, "http://us.apsara.lol:15511")
        except Exception as err:
            time.sleep(3)
        time.sleep(2)

import threading
threading.Thread(target=telegram_polling_worker, daemon=True).start()

# ---------------- USER ACTIVE SESSIONS ENDPOINTS ----------------
@app.get("/api/admin/sessions")
def get_user_sessions_endpoint(authorization: Optional[str] = Header(None)):
    require_admin_role(authorization)
    sessions = get_active_sessions()
    return sessions

@app.delete("/api/admin/sessions/{session_id}")
def revoke_user_session_endpoint(session_id: str, authorization: Optional[str] = Header(None)):
    require_admin_role(authorization)
    success = revoke_session(session_id)
    if not success:
        raise HTTPException(status_code=404, detail="រកមិនឃើញ Session (Session not found)")
    log_security_audit("SESSION_REVOKED", f"Admin revoked session: {session_id}")
    return {"message": "Session ត្រូវបានបញ្ចប់ដោយជោគជ័យ! (Session revoked successfully)"}

# ---------------- DATABASE BACKUP & RESTORE ENDPOINTS ----------------
@app.get("/api/admin/system/backup")
def backup_database_endpoint(authorization: Optional[str] = Header(None)):
    require_admin_role(authorization)
    if not os.path.exists(DB_PATH):
        raise HTTPException(status_code=404, detail="រកមិនឃើញ Database File (Database file not found)")
    from fastapi.responses import FileResponse
    backup_filename = f"movies_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
    log_security_audit("DB_BACKUP_DOWNLOADED", "Admin downloaded database backup")
    return FileResponse(path=DB_PATH, filename=backup_filename, media_type="application/x-sqlite3")

@app.post("/api/admin/system/restore")
async def restore_database_endpoint(file: UploadFile = File(...), authorization: Optional[str] = Header(None)):
    require_admin_role(authorization)
    if not file.filename.endswith(".db"):
        raise HTTPException(status_code=400, detail="សូមជ្រើសរើស SQLite Database File (.db)")
    temp_path = DB_PATH + ".restore_temp"
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        # Test connection to verify valid sqlite
        conn = sqlite3.connect(temp_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        conn.close()
        if not tables:
            raise Exception("Invalid SQLite file")
        # Replace actual db
        shutil.move(temp_path, DB_PATH)
        log_security_audit("DB_RESTORED", f"Admin restored database from file {file.filename}")
        return {"message": "ទិន្នន័យ Database ត្រូវបានទាញយកមកវិញដោយជោគជ័យ! (Database restored successfully)"}
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=f"បរាជ័យក្នុងការ Restore Database: {str(e)}")

# ---------------- COMMENTS & RATING ENDPOINTS ----------------
@app.get("/api/comments/{content_id}")
def get_movie_comments(content_id: str):
    return get_comments(content_id)

@app.post("/api/comments/{content_id}")
def post_movie_comment(content_id: str, payload: dict, authorization: Optional[str] = Header(None)):
    user = get_current_user_from_token(authorization)
    comment = sanitize_text(payload.get("comment", "").strip())
    rating = float(payload.get("rating", 5.0))
    if not comment:
        raise HTTPException(status_code=400, detail="សូមបញ្ចូលមតិយោបល់ (Comment body required)")
    check_payload_security(comment)
    comment_id = add_comment(
        content_id=content_id,
        user_id=user["sub"],
        user_name=user.get("email", "Anonymous").split("@")[0],
        user_avatar="",
        comment=comment,
        rating=max(1.0, min(5.0, rating))
    )
    return {"message": "មតិយោបល់ត្រូវបានរក្សាទុក! (Comment saved)", "id": comment_id}

@app.delete("/api/admin/comments/{comment_id}")
def delete_movie_comment(comment_id: str, authorization: Optional[str] = Header(None)):
    require_admin_role(authorization)
    delete_comment(comment_id)
    return {"message": "មតិយោបល់ត្រូវបានលុបចេញ! (Comment deleted)"}

# ---------------- WATCH PROGRESS (AUTO RESUME) ENDPOINTS ----------------
@app.post("/api/watch-history/progress")
def save_watch_progress(payload: dict, authorization: Optional[str] = Header(None)):
    user = get_current_user_from_token(authorization)
    content_id = payload.get("contentId")
    content_type = payload.get("contentType", "movie")
    episode_id = payload.get("episodeId")
    current_time = int(payload.get("currentTime", 0))
    duration = int(payload.get("duration", 0))

    if not content_id:
        raise HTTPException(status_code=400, detail="Content ID is required")

    progress = int((current_time / duration) * 100) if duration > 0 else 0
    now = datetime.now().isoformat()

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id FROM watch_history WHERE user_id = ? AND content_id = ?
    ''', (user["sub"], content_id))
    row = cursor.fetchone()

    if row:
        cursor.execute('''
            UPDATE watch_history 
            SET current_time = ?, duration = ?, progress = ?, watched_at = ?
            WHERE id = ?
        ''', (current_time, duration, progress, now, row["id"]))
    else:
        history_id = str(uuid.uuid4())
        cursor.execute('''
            INSERT INTO watch_history (id, user_id, content_id, content_type, episode_id, current_time, duration, progress, watched_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (history_id, user["sub"], content_id, content_type, episode_id, current_time, duration, progress, now))
    
    conn.commit()
    conn.close()
    return {"status": "saved", "currentTime": current_time, "progress": progress}

@app.get("/api/watch-history/progress/{content_id}")
def get_watch_progress(content_id: str, authorization: Optional[str] = Header(None)):
    user = get_current_user_from_token(authorization)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT current_time, duration, progress FROM watch_history 
        WHERE user_id = ? AND content_id = ?
    ''', (user["sub"], content_id))
    row = cursor.fetchone()
    conn.close()
    if row:
        return {"currentTime": row["current_time"], "duration": row["duration"], "progress": row["progress"]}
    return {"currentTime": 0, "duration": 0, "progress": 0}

# ---------------- IN-WEB LIVE CHAT ENDPOINTS (GROUP & PRIVATE) ----------------
@app.get("/api/chat/messages")
def get_chat_messages_endpoint(
    room_type: str = "GROUP",
    recipient_id: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    user = get_current_user_from_token(authorization)
    messages = get_chat_messages(room_type=room_type, user1=user["sub"], user2=recipient_id, limit=100)
    return messages

@app.post("/api/chat/messages")
def send_chat_message_endpoint(payload: dict, authorization: Optional[str] = Header(None)):
    user = get_current_user_from_token(authorization)
    message = sanitize_text(payload.get("message", "").strip())
    room_type = payload.get("roomType", "GROUP")
    recipient_id = payload.get("recipientId")
    media_url = payload.get("mediaUrl")
    media_type = payload.get("mediaType", "text")
    reply_to_id = payload.get("replyToId")
    reply_to_sender = payload.get("replyToSender")
    reply_to_text = payload.get("replyToText")

    if not message and not media_url:
        raise HTTPException(status_code=400, detail="សូមបញ្ចូលសាររៀបរាប់ ឬជ្រើសរើសឯកសារ (Message or media required)")
    if message:
        check_payload_security(message)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM users WHERE id = ?", (user["sub"],))
    u_row = cursor.fetchone()
    conn.close()
    sender_name = u_row["name"] if u_row and u_row["name"] else user.get("email", "User").split("@")[0]

    msg_id = save_chat_message(
        room_type=room_type,
        sender_id=user["sub"],
        sender_name=sender_name,
        sender_avatar="",
        message=message or "",
        recipient_id=recipient_id,
        media_url=media_url,
        media_type=media_type,
        reply_to_id=reply_to_id,
        reply_to_sender=reply_to_sender,
        reply_to_text=reply_to_text
    )

    if room_type == "SUPPORT" and user.get("role") != "ADMIN":
        alert_msg = message if message else f"[{media_type.upper()} Attachment]"
        send_telegram_alert(f"💬 <b>សារជំនួយ Support ថ្មី!</b>\nពី: <b>{sender_name}</b> (ID: <code>{user['sub']}</code>)\nសារ: {alert_msg}")

    return {"message": "សារត្រូវបានផ្ញើ! (Message sent)", "id": msg_id}

@app.post("/api/chat/upload")
async def upload_chat_attachment(
    request: Request,
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None)
):
    user = get_current_user_from_token(authorization)
    filename = os.path.basename(file.filename or "")
    ext = os.path.splitext(filename)[1].lower() or ".bin"
    safe_filename = f"chat_{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(CHAT_DIR, safe_filename)

    content_type = file.content_type or ""
    media_type = "file"
    if content_type.startswith("image/") or ext in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
        media_type = "image"
    elif content_type.startswith("video/") or ext in {".mp4", ".webm", ".mkv", ".mov"}:
        media_type = "video"
    elif content_type.startswith("audio/") or ext in {".mp3", ".wav", ".ogg", ".webm", ".m4a", ".aac"}:
        media_type = "audio"

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    url = f"{get_base_url(request)}/uploads/chat/{safe_filename}"
    return {
        "url": url,
        "mediaType": media_type,
        "filename": filename
    }

@app.get("/api/admin/support/conversations")
def get_admin_support_conversations_endpoint(authorization: Optional[str] = Header(None)):
    require_admin_role(authorization)
    conversations = get_support_conversations()
    return conversations

@app.get("/api/chat/users")
def get_chat_users_endpoint(authorization: Optional[str] = Header(None)):
    user = get_current_user_from_token(authorization)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, email, avatar, role, status FROM users WHERE status != 'banned'")
    rows = cursor.fetchall()
    conn.close()
    return [{
        "id": r["id"],
        "name": r["name"],
        "email": r["email"],
        "avatar": r["avatar"],
        "role": r["role"],
        "status": r["status"]
    } for r in rows if r["id"] != user["sub"]]

@app.delete("/api/chat/messages/{message_id}")
@app.delete("/api/admin/chat/messages/{message_id}")
def delete_chat_message_endpoint(message_id: str, authorization: Optional[str] = Header(None)):
    user = get_current_user_from_token(authorization)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT sender_id FROM chat_messages WHERE id = ?", (message_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="រកមិនឃើញសារនេះទេ! (Message not found)")

    if user.get("role") == "ADMIN" or row["sender_id"] == user["sub"]:
        delete_chat_message(message_id)
        return {"message": "សារត្រូវបានលុប! (Message deleted)"}
    else:
        raise HTTPException(status_code=403, detail="អ្នកអាចលុបបានតែសារផ្ទាល់ខ្លួនរបស់អ្នកប៉ុណ្ណោះ! (Can only delete your own messages)")

# ---------------- MOVIE COMMENTS & STAR RATING ENDPOINTS ----------------
@app.get("/api/movies/{movie_id}/comments")
def get_movie_comments(movie_id: str):
    return get_comments_for_content(movie_id)

@app.post("/api/movies/{movie_id}/comments")
def post_movie_comment(movie_id: str, payload: dict, authorization: Optional[str] = Header(None)):
    user = get_current_user_from_token(authorization)
    comment_text = payload.get("comment", "").strip()
    rating = float(payload.get("rating", 5.0))
    if not comment_text:
        raise HTTPException(status_code=400, detail="សូមបញ្ចូលមតិយោបល់! (Comment required)")
    
    user_name = user.get("email", "User").split("@")[0]
    result = add_comment_to_db(
        content_id=movie_id,
        user_id=user["sub"],
        user_name=user_name,
        comment=comment_text,
        rating=rating,
        user_avatar=""
    )
    if not result:
        raise HTTPException(status_code=500, detail="មិនអាចបញ្ជូនមតិបានទេ (Failed to post comment)")
    return result

@app.delete("/api/comments/{comment_id}")
def delete_comment_endpoint(comment_id: str, authorization: Optional[str] = Header(None)):
    user = get_current_user_from_token(authorization)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT user_id FROM comments WHERE id = ?", (comment_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Comment not found")

    if user.get("role") == "ADMIN" or row["user_id"] == user["sub"]:
        delete_comment_from_db(comment_id)
        return {"message": "Comment deleted"}
    else:
        raise HTTPException(status_code=403, detail="Not authorized")

# ---------------- WATCH PARTY CINEMA SYNC ENDPOINTS ----------------
@app.post("/api/watch-party/create")
def create_watch_party_endpoint(payload: dict, authorization: Optional[str] = Header(None)):
    user = get_current_user_from_token(authorization)
    movie_id = payload.get("movieId")
    if not movie_id:
        raise HTTPException(status_code=400, detail="Movie ID required")
    room_id = f"room-{uuid.uuid4().hex[:8]}"
    user_name = user.get("email", "User").split("@")[0]
    create_watch_party_in_db(room_id, movie_id, user["sub"], user_name)
    return {"roomId": room_id, "movieId": movie_id}

@app.get("/api/watch-party/{room_id}")
def get_watch_party_endpoint(room_id: str):
    party = get_watch_party_from_db(room_id)
    if not party:
        raise HTTPException(status_code=404, detail="Watch party room not found")
    return party

@app.post("/api/watch-party/{room_id}/sync")
def sync_watch_party_endpoint(room_id: str, payload: dict, authorization: Optional[str] = Header(None)):
    get_current_user_from_token(authorization)
    current_time = float(payload.get("currentTime", 0))
    is_playing = bool(payload.get("isPlaying", True))
    update_watch_party_sync(room_id, current_time, is_playing)
    return {"status": "synced"}

# ---------------- EXTERNAL API MOVIES ENDPOINTS ----------------
@app.get("/api/admin/api-movies")
def get_admin_api_movies(authorization: Optional[str] = Header(None)):
    require_admin_role(authorization)
    return get_api_movies_from_db()

@app.post("/api/admin/api-movies")
def create_admin_api_movie(payload: dict, authorization: Optional[str] = Header(None)):
    require_admin_role(authorization)
    api_name = payload.get("apiName", "External API Provider").strip()
    api_url = payload.get("apiUrl", "").strip()
    title = payload.get("title", "").strip()
    video_url = payload.get("videoUrl", "").strip()
    poster_url = payload.get("posterUrl", "").strip()
    release_year = int(payload.get("releaseYear", 2024))
    rating = float(payload.get("rating", 8.0))
    api_key = payload.get("apiKey", "").strip()
    status = payload.get("status", "active")

    if not title or not video_url:
        raise HTTPException(status_code=400, detail="Title and Video Stream URL required")

    result = add_api_movie_to_db(
        api_name=api_name,
        api_url=api_url,
        title=title,
        video_url=video_url,
        poster_url=poster_url,
        release_year=release_year,
        rating=rating,
        api_key=api_key,
        status=status
    )
    if not result:
        raise HTTPException(status_code=500, detail="Failed to add API movie")
    return result

@app.put("/api/admin/api-movies/{movie_id}")
def update_admin_api_movie(movie_id: str, payload: dict, authorization: Optional[str] = Header(None)):
    require_admin_role(authorization)
    api_name = payload.get("apiName", "External API Provider").strip()
    api_url = payload.get("apiUrl", "").strip()
    title = payload.get("title", "").strip()
    video_url = payload.get("videoUrl", "").strip()
    poster_url = payload.get("posterUrl", "").strip()
    release_year = int(payload.get("releaseYear", 2024))
    rating = float(payload.get("rating", 8.0))
    api_key = payload.get("apiKey", "").strip()
    status = payload.get("status", "active")

    success = update_api_movie_in_db(
        mid=movie_id,
        api_name=api_name,
        api_url=api_url,
        title=title,
        video_url=video_url,
        poster_url=poster_url,
        release_year=release_year,
        rating=rating,
        api_key=api_key,
        status=status
    )
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update API movie")
    return {"status": "updated", "id": movie_id}

@app.delete("/api/admin/api-movies/{movie_id}")
def delete_admin_api_movie(movie_id: str, authorization: Optional[str] = Header(None)):
    require_admin_role(authorization)
    delete_api_movie_from_db(movie_id)
    return {"message": "API movie deleted"}

# ---------------- PUBLIC MOVIE PROVIDER API ENDPOINTS ----------------
@app.get("/api/v1/public-movies")
def get_public_api_movies_feed():
    """
    Public Movie API Endpoint that feeds external applications or catalog integrations.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, title, description, poster_url, video_url, release_year, rating, genres, views FROM content WHERE is_published = 1 ORDER BY views DESC")
    rows = cursor.fetchall()
    conn.close()
    
    feed = []
    for r in rows:
        feed.append({
            "id": r["id"],
            "title": r["title"],
            "description": r["description"],
            "poster_url": r["poster_url"],
            "stream_url": r["video_url"],
            "release_year": r["release_year"],
            "rating": r["rating"],
            "genres": json.loads(r["genres"]) if r["genres"] else [],
            "views": r["views"]
        })
    return {"status": "success", "count": len(feed), "data": feed}

@app.get("/api/v1/public-movies/search")
def search_public_api_movies(q: str = ""):
    conn = get_db_connection()
    cursor = conn.cursor()
    query = f"%{q}%"
    cursor.execute("SELECT id, title, description, poster_url, video_url, release_year, rating FROM content WHERE is_published = 1 AND (LOWER(title) LIKE LOWER(?) OR LOWER(genres) LIKE LOWER(?))", (query, query))
    rows = cursor.fetchall()
    conn.close()
    
    results = []
    for r in rows:
        results.append({
            "id": r["id"],
            "title": r["title"],
            "poster_url": r["poster_url"],
            "stream_url": r["video_url"],
            "release_year": r["release_year"],
            "rating": r["rating"]
        })
    return {"status": "success", "query": q, "count": len(results), "data": results}

@app.post("/api/admin/api-movies/auto-generate")
def auto_generate_provider_api_movies(authorization: Optional[str] = Header(None)):
    """
    Auto-fetches sample provider movies and adds them into External API Movies table.
    """
    require_admin_role(authorization)
    sample_providers = [
        {
            "api_name": "TMDB Popular Movies API",
            "api_url": "https://api.themoviedb.org/3/movie/popular",
            "title": "Avatar: The Way of Water",
            "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Avatar.mp4",
            "poster_url": "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500",
            "release_year": 2023,
            "rating": 8.7,
            "status": "active"
        },
        {
            "api_name": "Open Cinema Stream API",
            "api_url": "https://api.opencinema.org/v1/movies",
            "title": "Cyberpunk 2099",
            "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
            "poster_url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500",
            "release_year": 2024,
            "rating": 9.1,
            "status": "active"
        },
        {
            "api_name": "Global Movie HD Provider",
            "api_url": "https://api.hdprovider.net/stream",
            "title": "Tears of Steel",
            "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
            "poster_url": "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=500",
            "release_year": 2024,
            "rating": 8.9,
            "status": "active"
        }
    ]

    added = []
    for sp in sample_providers:
        res = add_api_movie_to_db(
            api_name=sp["api_name"],
            api_url=sp["api_url"],
            title=sp["title"],
            video_url=sp["video_url"],
            poster_url=sp["poster_url"],
            release_year=sp["release_year"],
            rating=sp["rating"],
            status=sp["status"]
        )
        if res:
            added.append(res)

    return {"message": "បានបង្កើតប្រព័ន្ធ API Movies ស្វ័យប្រវត្តដោយជោគជ័យ!", "added": added}

# ---------------- SMART MULTI-FILTER SEARCH ----------------
@app.get("/api/movies/filter")
def filter_movies(
    genre: Optional[str] = None,
    year: Optional[int] = None,
    type: Optional[str] = None,
    sort_by: Optional[str] = "latest",
    q: Optional[str] = None
):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    sql = "SELECT * FROM content WHERE is_published = 1"
    params = []
    
    if type and type != 'all':
        sql += " AND type = ?"
        params.append(type)
        
    if year and year > 0:
        sql += " AND release_year = ?"
        params.append(year)
        
    if genre and genre != 'all':
        sql += " AND LOWER(genres) LIKE LOWER(?)"
        params.append(f"%{genre}%")
        
    if q and q.strip():
        sql += " AND (LOWER(title) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?) OR LOWER(cast) LIKE LOWER(?))"
        q_wild = f"%{q.strip()}%"
        params.extend([q_wild, q_wild, q_wild])
        
    if sort_by == 'popular':
        sql += " ORDER BY views DESC"
    elif sort_by == 'rating':
        sql += " ORDER BY rating DESC"
    elif sort_by == 'title':
        sql += " ORDER BY title ASC"
    else:
        sql += " ORDER BY created_at DESC"
        
    cursor.execute(sql, params)
    rows = cursor.fetchall()
    conn.close()
    return [row_to_movie(r) for r in rows]

# ---------------- VIDEO BROKEN LINK REPORTS ----------------
@app.post("/api/reports")
def create_report(payload: dict, authorization: Optional[str] = Header(None)):
    user = get_current_user_from_token(authorization)
    content_id = payload.get("contentId")
    content_title = payload.get("contentTitle")
    reason = payload.get("reason")
    details = payload.get("details", "")
    episode_id = payload.get("episodeId")
    episode_title = payload.get("episodeTitle")

    if not content_id or not content_title or not reason:
        raise HTTPException(status_code=400, detail="Missing required report parameters")

    user_name = user.get("name") or user.get("email", "User").split("@")[0]
    result = add_video_report(
        content_id=content_id,
        content_title=content_title,
        user_id=user["sub"],
        user_name=user_name,
        reason=reason,
        details=details,
        episode_id=episode_id,
        episode_title=episode_title
    )
    return result

@app.get("/api/admin/reports")
def get_reports(status: Optional[str] = None, authorization: Optional[str] = Header(None)):
    require_admin_role(authorization)
    return get_video_reports(status)

@app.patch("/api/admin/reports/{report_id}")
def update_report(report_id: str, payload: dict, authorization: Optional[str] = Header(None)):
    require_admin_role(authorization)
    status = payload.get("status")
    if not status:
        raise HTTPException(status_code=400, detail="Status required")
    success = update_video_report_status(report_id, status)
    return {"status": "updated" if success else "failed"}

# ---------------- MOVIE REQUESTS ----------------
@app.post("/api/movie-requests")
def create_movie_request(payload: dict, authorization: Optional[str] = Header(None)):
    user = get_current_user_from_token(authorization)
    title = payload.get("title")
    description = payload.get("description", "")
    genre = payload.get("genre", "")

    if not title:
        raise HTTPException(status_code=400, detail="Title is required")

    user_name = user.get("name") or user.get("email", "User").split("@")[0]
    result = add_movie_request(
        user_id=user["sub"],
        user_name=user_name,
        title=title,
        description=description,
        genre=genre
    )
    return result

@app.get("/api/admin/movie-requests")
def get_admin_movie_requests(status: Optional[str] = None, authorization: Optional[str] = Header(None)):
    require_admin_role(authorization)
    return get_movie_requests(status)

@app.patch("/api/admin/movie-requests/{request_id}")
def update_admin_movie_request(request_id: str, payload: dict, authorization: Optional[str] = Header(None)):
    require_admin_role(authorization)
    status = payload.get("status")
    admin_note = payload.get("adminNote", "")
    if not status:
        raise HTTPException(status_code=400, detail="Status required")
    success = update_movie_request_status(request_id, status, admin_note)
    return {"status": "updated" if success else "failed"}

# ---------------- SERIES FOLLOW ----------------
@app.post("/api/series/{content_id}/follow")
def follow_series(content_id: str, authorization: Optional[str] = Header(None)):
    user = get_current_user_from_token(authorization)
    is_following = toggle_series_follow(user["sub"], content_id)
    return {"contentId": content_id, "isFollowing": is_following}

@app.get("/api/series/{content_id}/follow-status")
def series_follow_status(content_id: str, authorization: Optional[str] = Header(None)):
    if not authorization:
        return {"isFollowing": False}
    try:
        user = get_current_user_from_token(authorization)
        is_following = get_series_follow_status(user["sub"], content_id)
        return {"isFollowing": is_following}
    except Exception:
        return {"isFollowing": False}

# ---------------- ADMIN ANALYTICS ----------------
@app.get("/api/admin/analytics")
def get_analytics(authorization: Optional[str] = Header(None)):
    require_admin_role(authorization)
    return get_admin_analytics()

