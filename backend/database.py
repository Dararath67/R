import sqlite3
import json
import os
import hashlib
import bcrypt
from datetime import datetime
from typing import Optional

DB_PATH = os.path.join(os.path.dirname(__file__), 'movies.db')

def hash_password(password: str) -> str:
    if not password:
        return ""
    salt = bcrypt.gensalt(12)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    if not password or not hashed:
        return False
    try:
        if len(hashed) == 64 and not hashed.startswith('$2b$'):
            return hashlib.sha256(password.encode('utf-8')).hexdigest() == hashed
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False

FAILED_LOGIN_ATTEMPTS = {}

def record_failed_login_attempt(ip_address: str, email: str = "") -> bool:
    """
    Records a failed login attempt for an IP.
    If 5 or more failures occur within 15 minutes, auto-bans the IP and logs BRUTE_FORCE_ATTACK_DETECTED.
    Returns True if auto-banned.
    """
    if not ip_address:
        return False
    
    now = datetime.now()
    cutoff = now.timestamp() - 900 # 15 minutes window
    
    if ip_address not in FAILED_LOGIN_ATTEMPTS:
        FAILED_LOGIN_ATTEMPTS[ip_address] = []
        
    FAILED_LOGIN_ATTEMPTS[ip_address] = [
        t for t in FAILED_LOGIN_ATTEMPTS[ip_address] if t > cutoff
    ]
    
    FAILED_LOGIN_ATTEMPTS[ip_address].append(now.timestamp())
    
    if len(FAILED_LOGIN_ATTEMPTS[ip_address]) >= 5:
        reason = f"Auto-Banned: Brute-Force Login Attack (5 failed attempts for {email or 'User'})"
        ban_ip_in_db(ip_address, reason)
        log_security_audit("BRUTE_FORCE_ATTACK_DETECTED", reason, ip_address)
        return True
        
    return False

def clear_failed_login_attempts(ip_address: str):
    if ip_address in FAILED_LOGIN_ATTEMPTS:
        del FAILED_LOGIN_ATTEMPTS[ip_address]

def is_ip_banned(ip_address: str) -> bool:
    if not ip_address:
        return False
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT ip_address FROM banned_ips WHERE ip_address = ?", (ip_address,))
        row = cursor.fetchone()
        conn.close()
        return row is not None
    except Exception:
        return False

def ban_ip_in_db(ip_address: str, reason: str = "Security Attack Detection"):
    if not ip_address:
        return
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT OR REPLACE INTO banned_ips (ip_address, reason, banned_at) VALUES (?, ?, ?)",
            (ip_address, reason, datetime.now().isoformat())
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print("Ban IP DB error:", e)

def unban_ip_in_db(ip_address: str):
    if not ip_address:
        return
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM banned_ips WHERE ip_address = ?", (ip_address,))
        conn.commit()
        conn.close()
    except Exception as e:
        print("Unban IP DB error:", e)

def create_session(user_id: str, user_email: str, ip_address: str, user_agent: str, jti: str):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        cursor.execute('''
            INSERT OR REPLACE INTO user_sessions (id, user_id, user_email, ip_address, user_agent, last_active, jti)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (jti, user_id, user_email, ip_address, user_agent, now, jti))
        conn.commit()
        conn.close()
    except Exception as e:
        print("create_session error:", e)

def get_active_sessions():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM user_sessions ORDER BY last_active DESC LIMIT 100")
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]
    except Exception as e:
        print("get_active_sessions error:", e)
        return []

def revoke_session(session_id: str):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM user_sessions WHERE id = ? OR jti = ?", (session_id, session_id))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("revoke_session error:", e)
        return False

def is_session_valid(jti: str) -> bool:
    if not jti:
        return True # Fallback for legacy tokens without JTI
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM user_sessions WHERE jti = ? OR id = ?", (jti, jti))
        row = cursor.fetchone()
        conn.close()
        return row is not None
    except Exception:
        return True

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Movies / Series Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS content (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            poster_url TEXT,
            backdrop_url TEXT,
            trailer_url TEXT,
            video_url TEXT NOT NULL,
            release_year INTEGER,
            rating REAL,
            duration TEXT,
            type TEXT NOT NULL, -- 'movie' or 'series'
            genres TEXT, -- JSON array
            is_featured INTEGER DEFAULT 0,
            is_trending INTEGER DEFAULT 0,
            is_popular INTEGER DEFAULT 0,
            is_latest INTEGER DEFAULT 0,
            is_published INTEGER DEFAULT 1,
            views INTEGER DEFAULT 0,
            cast TEXT, -- JSON array
            director TEXT,
            created_at TEXT
        )
    ''')

    # Migration for User Upload & Approval status columns
    content_cols = [col[1] for col in cursor.execute("PRAGMA table_info(content)").fetchall()]
    if "uploaded_by_user_id" not in content_cols:
        cursor.execute("ALTER TABLE content ADD COLUMN uploaded_by_user_id TEXT")
    if "uploaded_by_user_name" not in content_cols:
        cursor.execute("ALTER TABLE content ADD COLUMN uploaded_by_user_name TEXT")
    if "uploaded_by_avatar" not in content_cols:
        cursor.execute("ALTER TABLE content ADD COLUMN uploaded_by_avatar TEXT")
    if "approval_status" not in content_cols:
        cursor.execute("ALTER TABLE content ADD COLUMN approval_status TEXT DEFAULT 'approved'")
    if "rejection_reason" not in content_cols:
        cursor.execute("ALTER TABLE content ADD COLUMN rejection_reason TEXT")

    # Episodes Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS episodes (
            id TEXT PRIMARY KEY,
            series_id TEXT NOT NULL,
            season_number INTEGER NOT NULL,
            episode_number INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            duration TEXT,
            video_url TEXT NOT NULL,
            thumbnail_url TEXT,
            views INTEGER DEFAULT 0,
            FOREIGN KEY (series_id) REFERENCES content (id) ON DELETE CASCADE
        )
    ''')

    # Create Database Indexes for Lightning-Fast Queries
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_content_type ON content (type, is_published)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_content_created ON content (created_at DESC)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_episodes_series ON episodes (series_id)")

    # Genres Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS genres (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            slug TEXT NOT NULL
        )
    ''')

    # Users Table with password_hash
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT,
            avatar TEXT,
            role TEXT NOT NULL, -- 'ADMIN' or 'USER'
            status TEXT DEFAULT 'active', -- 'active' or 'banned'
            created_at TEXT
        )
    ''')

    # Ensure password_hash and is_vip columns exist
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN password_hash TEXT")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN is_vip INTEGER DEFAULT 0")
    except Exception:
        pass

    # User Favorites Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS favorites (
            user_id TEXT NOT NULL,
            content_id TEXT NOT NULL,
            PRIMARY KEY (user_id, content_id)
        )
    ''')

def toggle_favorite_in_db(user_id: str, content_id: str) -> dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM favorites WHERE user_id = ? AND content_id = ?", (user_id, content_id))
    row = cursor.fetchone()
    if row:
        cursor.execute("DELETE FROM favorites WHERE user_id = ? AND content_id = ?", (user_id, content_id))
        is_fav = False
    else:
        cursor.execute("INSERT OR REPLACE INTO favorites (user_id, content_id) VALUES (?, ?)", (user_id, content_id))
        is_fav = True
    conn.commit()

    cursor.execute("SELECT content_id FROM favorites WHERE user_id = ?", (user_id,))
    favs = [r["content_id"] for r in cursor.fetchall()]
    conn.close()
    return {"favorites": favs, "isFavorite": is_fav}

    # Watch History Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS watch_history (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            content_id TEXT NOT NULL,
            content_type TEXT NOT NULL,
            episode_id TEXT,
            progress INTEGER DEFAULT 0,
            duration INTEGER DEFAULT 0,
            current_time INTEGER DEFAULT 0,
            watched_at TEXT NOT NULL
        )
    ''')

    # System Settings Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS system_settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    ''')

    # User Sessions Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            user_email TEXT,
            ip_address TEXT,
            user_agent TEXT,
            last_active TEXT NOT NULL,
            jti TEXT
        )
    ''')

    # 2FA Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS two_factor_auth (
            user_id TEXT PRIMARY KEY,
            secret TEXT NOT NULL,
            enabled INTEGER DEFAULT 0
        )
    ''')

    # Movie/Series Comments Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS comments (
            id TEXT PRIMARY KEY,
            content_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            user_name TEXT NOT NULL,
            user_avatar TEXT,
            comment TEXT NOT NULL,
            rating REAL DEFAULT 5.0,
            created_at TEXT NOT NULL
        )
    ''')

    # In-Web Live Chat Messages Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS chat_messages (
            id TEXT PRIMARY KEY,
            room_type TEXT NOT NULL, -- 'GROUP', 'PRIVATE', 'SUPPORT'
            sender_id TEXT NOT NULL,
            sender_name TEXT NOT NULL,
            sender_avatar TEXT,
            recipient_id TEXT, -- NULL for GROUP chat
            message TEXT NOT NULL,
            media_url TEXT,
            media_type TEXT,
            timestamp TEXT NOT NULL
        )
    ''')
    try:
        cursor.execute("ALTER TABLE chat_messages ADD COLUMN media_url TEXT")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE chat_messages ADD COLUMN media_type TEXT")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE chat_messages ADD COLUMN reply_to_id TEXT")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE chat_messages ADD COLUMN reply_to_sender TEXT")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE chat_messages ADD COLUMN reply_to_text TEXT")
    except Exception:
        pass

    # Banned IPs Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS banned_ips (
            ip_address TEXT PRIMARY KEY,
            reason TEXT,
            banned_at TEXT NOT NULL
        )
    ''')

    # Security Audit Logs Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS security_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT NOT NULL,
            details TEXT,
            ip_address TEXT,
            timestamp TEXT NOT NULL
        )
    ''')

    # Dynamic Real System Notifications Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            type TEXT NOT NULL,
            user_id TEXT,
            target_url TEXT,
            created_at TEXT NOT NULL,
            read INTEGER DEFAULT 0
        )
    ''')
    try:
        cursor.execute("ALTER TABLE notifications ADD COLUMN user_id TEXT")
    except Exception:
        pass

    # Watch Parties Cinema Sync Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS watch_parties (
            room_id TEXT PRIMARY KEY,
            movie_id TEXT NOT NULL,
            host_id TEXT NOT NULL,
            host_name TEXT NOT NULL,
            current_time REAL DEFAULT 0,
            is_playing INTEGER DEFAULT 1,
            created_at TEXT NOT NULL
        )
    ''')

    # External API Movies Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS api_movies (
            id TEXT PRIMARY KEY,
            api_name TEXT NOT NULL,
            api_url TEXT NOT NULL,
            api_key TEXT,
            title TEXT NOT NULL,
            poster_url TEXT,
            video_url TEXT NOT NULL,
            release_year INTEGER DEFAULT 2024,
            rating REAL DEFAULT 8.0,
            status TEXT DEFAULT 'active',
            created_at TEXT NOT NULL
        )
    ''')

    # Video Reports Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS video_reports (
            id TEXT PRIMARY KEY,
            content_id TEXT NOT NULL,
            content_title TEXT NOT NULL,
            episode_id TEXT,
            episode_title TEXT,
            user_id TEXT NOT NULL,
            user_name TEXT NOT NULL,
            reason TEXT NOT NULL,
            details TEXT,
            status TEXT DEFAULT 'pending',
            created_at TEXT NOT NULL
        )
    ''')

    # Movie Requests Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS movie_requests (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            user_name TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            genre TEXT,
            status TEXT DEFAULT 'pending',
            admin_note TEXT,
            created_at TEXT NOT NULL
        )
    ''')

    # Series Follows Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS series_follows (
            user_id TEXT NOT NULL,
            content_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            PRIMARY KEY (user_id, content_id)
        )
    ''')

    # Seed Default Admin & Users with hashed passwords
    cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'ADMIN'")
    if cursor.fetchone()[0] == 0:
        admin_pass = hash_password("admin123")
        user_pass = hash_password("user123")
        cursor.execute('''
            INSERT INTO users (id, name, email, password_hash, avatar, role, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ''', ('admin-1', 'Master Admin', 'admin@stream.com', admin_pass, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 'ADMIN', 'active'))
        
        cursor.execute('''
            INSERT INTO users (id, name, email, password_hash, avatar, role, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ''', ('user-1', 'Standard User', 'user@stream.com', user_pass, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'USER', 'active'))

    cursor.execute("SELECT COUNT(*) FROM genres")
    if cursor.fetchone()[0] == 0:
        default_genres = [
            'សកម្មភាព (Action)', 'វិទ្យាសាស្ត្រ (Sci-Fi)', 'រឿងភាគ (Drama)',
            'ផ្សងព្រេង (Adventure)', 'កំប្លែង (Comedy)', 'រំភើប (Thriller)',
            'រន្ធត់ (Horror)', 'ភាពយន្តខ្មែរ (Khmer Cinema)'
        ]
        for idx, g_name in enumerate(default_genres, 1):
            cursor.execute('''
                INSERT INTO genres (id, name, slug) VALUES (?, ?, ?)
            ''', (str(idx), g_name, g_name.lower().replace(' ', '-')))

    conn.commit()
    conn.close()

def get_setting(key: str, default: str = "") -> str:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM system_settings WHERE key = ?", (key,))
        row = cursor.fetchone()
        conn.close()
        return row['value'] if row else default
    except Exception:
        return default

def set_setting(key: str, value: str):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)",
            (key, value)
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print("set_setting error:", e)

def send_telegram_alert(message: str):
    try:
        token = get_setting("telegram_bot_token")
        chat_id = get_setting("telegram_chat_id")
        if not token or not chat_id:
            return
        import urllib.request
        import urllib.parse
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        data = urllib.parse.urlencode({"chat_id": chat_id, "text": message, "parse_mode": "HTML"}).encode('utf-8')
        req = urllib.request.Request(url, data=data)
        urllib.request.urlopen(req, timeout=3)
    except Exception as e:
        print("Telegram alert error:", e)

def create_session(user_id: str, user_email: str, ip_address: str, user_agent: str, jti: str):
    try:
        import uuid
        conn = get_db_connection()
        cursor = conn.cursor()
        session_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        cursor.execute('''
            INSERT INTO user_sessions (id, user_id, user_email, ip_address, user_agent, last_active, jti)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (session_id, user_id, user_email, ip_address, user_agent, now, jti))
        conn.commit()
        conn.close()
        return session_id
    except Exception as e:
        print("create_session error:", e)
        return None

def get_active_sessions():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM user_sessions ORDER BY last_active DESC")
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]
    except Exception:
        return []

def revoke_session(session_id: str):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM user_sessions WHERE id = ?", (session_id,))
        conn.commit()
        conn.close()
        return True
    except Exception:
        return False

def add_comment(content_id: str, user_id: str, user_name: str, user_avatar: str, comment: str, rating: float = 5.0):
    try:
        import uuid
        conn = get_db_connection()
        cursor = conn.cursor()
        comment_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        cursor.execute('''
            INSERT INTO comments (id, content_id, user_id, user_name, user_avatar, comment, rating, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (comment_id, content_id, user_id, user_name, user_avatar or "", comment, rating, now))
        conn.commit()
        conn.close()
        return comment_id
    except Exception as e:
        print("add_comment error:", e)
        return None

def get_comments(content_id: str):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM comments WHERE content_id = ? ORDER BY created_at DESC", (content_id,))
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]
    except Exception:
        return []

def delete_comment(comment_id: str):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM comments WHERE id = ?", (comment_id,))
        conn.commit()
        conn.close()
        return True
    except Exception:
        return False

def save_chat_message(room_type: str, sender_id: str, sender_name: str, sender_avatar: str, message: str, recipient_id: str = None, media_url: str = None, media_type: str = "text", reply_to_id: str = None, reply_to_sender: str = None, reply_to_text: str = None):
    try:
        import uuid
        conn = get_db_connection()
        cursor = conn.cursor()
        msg_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        cursor.execute('''
            INSERT INTO chat_messages (id, room_type, sender_id, sender_name, sender_avatar, recipient_id, message, media_url, media_type, reply_to_id, reply_to_sender, reply_to_text, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (msg_id, room_type, sender_id, sender_name, sender_avatar or "", recipient_id, message, media_url, media_type or "text", reply_to_id, reply_to_sender, reply_to_text, now))
        conn.commit()
        conn.close()
        return msg_id
    except Exception as e:
        print("save_chat_message error:", e)
        return None

def get_chat_messages(room_type: str = "GROUP", user1: str = None, user2: str = None, limit: int = 100):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        is_admin = False
        if user1:
            cursor.execute("SELECT role FROM users WHERE id = ?", (user1,))
            u_row = cursor.fetchone()
            if u_row and u_row["role"] == "ADMIN":
                is_admin = True

        if room_type == "GROUP":
            cursor.execute("SELECT * FROM chat_messages WHERE room_type = 'GROUP' ORDER BY timestamp ASC LIMIT ?", (limit,))
        elif room_type == "SUPPORT":
            if is_admin:
                target_user = user2 if (user2 and user2 != 'admin') else None
                if target_user:
                    cursor.execute('''
                        SELECT * FROM chat_messages 
                        WHERE room_type = 'SUPPORT' 
                          AND (sender_id = ? OR recipient_id = ?)
                        ORDER BY timestamp ASC LIMIT ?
                    ''', (target_user, target_user, limit))
                else:
                    cursor.execute("SELECT * FROM chat_messages WHERE room_type = 'SUPPORT' ORDER BY timestamp ASC LIMIT ?", (limit,))
            else:
                if user1:
                    cursor.execute('''
                        SELECT * FROM chat_messages 
                        WHERE room_type = 'SUPPORT' 
                          AND (sender_id = ? OR recipient_id = ?)
                        ORDER BY timestamp ASC LIMIT ?
                    ''', (user1, user1, limit))
                else:
                    conn.close()
                    return []
        else:
            if user1 and user2:
                cursor.execute('''
                    SELECT * FROM chat_messages 
                    WHERE room_type = 'PRIVATE' 
                      AND ((sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?))
                    ORDER BY timestamp ASC LIMIT ?
                ''', (user1, user2, user2, user1, limit))
            else:
                conn.close()
                return []
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]
    except Exception as e:
        print("get_chat_messages error:", e)
        return []

def get_support_conversations():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Fetch all admin user IDs to properly identify user threads regardless of sender/recipient
        cursor.execute("SELECT id FROM users WHERE role = 'ADMIN'")
        admin_rows = cursor.fetchall()
        admin_ids = set(r['id'] for r in admin_rows)
        admin_ids.add('admin')

        cursor.execute('''
            SELECT 
                sender_id,
                recipient_id,
                timestamp
            FROM chat_messages
            WHERE room_type = 'SUPPORT'
            ORDER BY timestamp DESC
        ''')
        messages = cursor.fetchall()
        
        # Group by non-admin user_id
        user_threads = {}
        for m in messages:
            s_id = m['sender_id']
            r_id = m['recipient_id']
            
            # Determine which side is the regular user
            target_user_id = None
            if s_id and not (s_id in admin_ids or s_id.startswith('admin')):
                target_user_id = s_id
            elif r_id and not (r_id in admin_ids or r_id.startswith('admin')):
                target_user_id = r_id
                
            if target_user_id and target_user_id not in user_threads:
                user_threads[target_user_id] = m['timestamp']

        conversations = []
        for u_id, last_ts in user_threads.items():
            cursor.execute('''
                SELECT * FROM chat_messages 
                WHERE room_type = 'SUPPORT' AND (sender_id = ? OR recipient_id = ?)
                ORDER BY timestamp DESC LIMIT 1
            ''', (u_id, u_id))
            last_msg = cursor.fetchone()
            
            cursor.execute("SELECT name, avatar, email FROM users WHERE id = ?", (u_id,))
            u_info = cursor.fetchone()
            
            user_name = u_info['name'] if u_info else (last_msg['sender_name'] if last_msg and last_msg['sender_id'] == u_id else f"User ({u_id})")
            user_avatar = u_info['avatar'] if u_info else (last_msg['sender_avatar'] if last_msg else "")
            
            conversations.append({
                "user_id": u_id,
                "user_name": user_name,
                "user_avatar": user_avatar,
                "last_message": last_msg['message'] if last_msg else "",
                "last_timestamp": last_ts,
                "last_sender_id": last_msg['sender_id'] if last_msg else ""
            })
            
        conn.close()
        return conversations
    except Exception as e:
        print("get_support_conversations error:", e)
        return []

def delete_chat_message(msg_id: str):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM chat_messages WHERE id = ?", (msg_id,))
        conn.commit()
        conn.close()
        return True
    except Exception:
        return False

def add_notification(*args, **kwargs):
    try:
        import uuid
        conn = get_db_connection()
        cursor = conn.cursor()
        notif_id = str(uuid.uuid4())
        now = datetime.now().isoformat()

        title = "សារជូនដំណឹង"
        message = ""
        type_str = "info"
        target_url = "/"
        user_id = None

        if len(args) == 2:
            title, message = args[0], args[1]
        elif len(args) >= 3 and str(args[0]).startswith("notif"):
            notif_id = args[0]
            title = args[1]
            message = args[2]
            if len(args) > 3: type_str = args[3]
            if len(args) > 4: user_id = args[4]
            if len(args) > 5: target_url = args[5]
        elif len(args) >= 3:
            title, message, type_str = args[0], args[1], args[2]
            if len(args) > 3: target_url = args[3]
            if len(args) > 4: user_id = args[4]
        
        if "title" in kwargs: title = kwargs["title"]
        if "message" in kwargs: message = kwargs["message"]
        if "type_str" in kwargs: type_str = kwargs["type_str"]
        if "type" in kwargs: type_str = kwargs["type"]
        if "target_url" in kwargs: target_url = kwargs["target_url"]
        if "targetUrl" in kwargs: target_url = kwargs["targetUrl"]
        if "user_id" in kwargs: user_id = kwargs["user_id"]

        cursor.execute('''
            INSERT INTO notifications (id, title, message, type, target_url, user_id, created_at, read)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0)
        ''', (notif_id, title, message, type_str, target_url, user_id, now))
        conn.commit()
        conn.close()
        return notif_id
    except Exception as e:
        print("add_notification error:", e)
        return None

def get_notifications_from_db(user_id: Optional[str] = None, limit: Optional[int] = 15):
    try:
        lim = 15 if (limit is None or not isinstance(limit, (int, str))) else int(limit)
        conn = get_db_connection()
        cursor = conn.cursor()
        if user_id:
            cursor.execute(
                f"SELECT * FROM notifications WHERE user_id IS NULL OR user_id = '' OR user_id = ? ORDER BY created_at DESC LIMIT {lim}",
                (user_id,)
            )
        else:
            cursor.execute(f"SELECT * FROM notifications WHERE user_id IS NULL OR user_id = '' ORDER BY created_at DESC LIMIT {lim}")

        rows = cursor.fetchall()
        
        res = []
        if rows:
            for r in rows:
                cols = r.keys()
                res.append({
                    "id": r["id"],
                    "title": r["title"],
                    "message": r["message"],
                    "type": r["type"],
                    "targetUrl": r["target_url"],
                    "userId": r["user_id"] if "user_id" in cols else None,
                    "createdAt": r["created_at"],
                    "read": bool(r["read"])
                })
        conn.close()
        return res
    except Exception as e:
        print("get_notifications_from_db error:", e)
        return []

def delete_notification_from_db(notif_id: str):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        if notif_id == "ALL":
            cursor.execute("DELETE FROM notifications")
        else:
            cursor.execute("DELETE FROM notifications WHERE id = ?", (notif_id,))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("delete_notification_from_db error:", e)
        return False

def mark_notifications_read():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE notifications SET read = 1")
        conn.commit()
        conn.close()
        return True
    except Exception:
        return False

def add_comment_to_db(content_id: str, user_id: str, user_name: str, comment: str, rating: float = 5.0, user_avatar: str = ""):
    import uuid
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cid = str(uuid.uuid4())
        now = datetime.now().isoformat()
        cursor.execute('''
            INSERT INTO comments (id, content_id, user_id, user_name, user_avatar, comment, rating, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (cid, content_id, user_id, user_name, user_avatar, comment, rating, now))
        conn.commit()
        conn.close()
        return {
            "id": cid,
            "content_id": content_id,
            "user_id": user_id,
            "user_name": user_name,
            "user_avatar": user_avatar,
            "comment": comment,
            "rating": rating,
            "created_at": now
        }
    except Exception as e:
        print("add_comment_to_db error:", e)
        return None

def get_comments_for_content(content_id: str):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM comments WHERE content_id = ? ORDER BY created_at DESC", (content_id,))
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]
    except Exception as e:
        print("get_comments_for_content error:", e)
        return []

def delete_comment_from_db(comment_id: str):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM comments WHERE id = ?", (comment_id,))
        conn.commit()
        conn.close()
        return True
    except Exception:
        return False

def create_watch_party_in_db(room_id: str, movie_id: str, host_id: str, host_name: str):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        cursor.execute('''
            INSERT OR REPLACE INTO watch_parties (room_id, movie_id, host_id, host_name, current_time, is_playing, created_at)
            VALUES (?, ?, ?, ?, 0, 1, ?)
        ''', (room_id, movie_id, host_id, host_name, now))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("create_watch_party_in_db error:", e)
        return False

def get_watch_party_from_db(room_id: str):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM watch_parties WHERE room_id = ?", (room_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None
    except Exception:
        return None

def update_watch_party_sync(room_id: str, current_time: float, is_playing: bool):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE watch_parties SET current_time = ?, is_playing = ? WHERE room_id = ?
        ''', (current_time, 1 if is_playing else 0, room_id))
        conn.commit()
        conn.close()
        return True
    except Exception:
        return False

def add_api_movie_to_db(api_name: str, api_url: str, title: str, video_url: str, poster_url: str = "", release_year: int = 2024, rating: float = 8.0, api_key: str = "", status: str = "active"):
    import uuid
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        mid = f"api-{uuid.uuid4().hex[:8]}"
        now = datetime.now().isoformat()
        cursor.execute('''
            INSERT INTO api_movies (id, api_name, api_url, api_key, title, poster_url, video_url, release_year, rating, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (mid, api_name, api_url, api_key, title, poster_url, video_url, release_year, rating, status, now))
        conn.commit()
        conn.close()
        return {
            "id": mid,
            "apiName": api_name,
            "apiUrl": api_url,
            "apiKey": api_key,
            "title": title,
            "posterUrl": poster_url,
            "videoUrl": video_url,
            "releaseYear": release_year,
            "rating": rating,
            "status": status,
            "createdAt": now
        }
    except Exception as e:
        print("add_api_movie_to_db error:", e)
        return None

def get_api_movies_from_db():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM api_movies ORDER BY created_at DESC")
        rows = cursor.fetchall()
        conn.close()
        return [{
            "id": r["id"],
            "apiName": r["api_name"],
            "apiUrl": r["api_url"],
            "apiKey": r["api_key"],
            "title": r["title"],
            "posterUrl": r["poster_url"],
            "videoUrl": r["video_url"],
            "releaseYear": r["release_year"],
            "rating": r["rating"],
            "status": r["status"],
            "createdAt": r["created_at"]
        } for r in rows]
    except Exception as e:
        print("get_api_movies_from_db error:", e)
        return []

def update_api_movie_in_db(mid: str, api_name: str, api_url: str, title: str, video_url: str, poster_url: str = "", release_year: int = 2024, rating: float = 8.0, api_key: str = "", status: str = "active"):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE api_movies 
            SET api_name = ?, api_url = ?, api_key = ?, title = ?, poster_url = ?, video_url = ?, release_year = ?, rating = ?, status = ?
            WHERE id = ?
        ''', (api_name, api_url, api_key, title, poster_url, video_url, release_year, rating, status, mid))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("update_api_movie_in_db error:", e)
        return False

def delete_api_movie_from_db(mid: str):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM api_movies WHERE id = ?", (mid,))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("delete_api_movie_from_db error:", e)
        return False



def mark_notifications_read():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE notifications SET read = 1")
        conn.commit()
        conn.close()
        return True
    except Exception:
        return False

# --- Video Reports ---
def add_video_report(content_id: str, content_title: str, user_id: str, user_name: str, reason: str, details: str = "", episode_id: str = None, episode_title: str = None):
    try:
        import uuid
        rid = f"rep-{uuid.uuid4().hex[:8]}"
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO video_reports (id, content_id, content_title, episode_id, episode_title, user_id, user_name, reason, details, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
        ''', (rid, content_id, content_title, episode_id, episode_title, user_id, user_name, reason, details, datetime.now().isoformat()))
        conn.commit()
        conn.close()
        return {"id": rid, "status": "pending", "message": "រាយការណ៍វីដេអូត្រូវបានផ្ញើជោគជ័យ"}
    except Exception as e:
        print("add_video_report error:", e)
        raise e

def get_video_reports(status: str = None):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        if status and status != 'all':
            cursor.execute("SELECT * FROM video_reports WHERE status = ? ORDER BY created_at DESC", (status,))
        else:
            cursor.execute("SELECT * FROM video_reports ORDER BY created_at DESC")
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]
    except Exception as e:
        print("get_video_reports error:", e)
        return []

def update_video_report_status(report_id: str, status: str):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE video_reports SET status = ? WHERE id = ?", (status, report_id))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("update_video_report_status error:", e)
        return False

# --- Movie Requests ---
def add_movie_request(user_id: str, user_name: str, title: str, description: str = "", genre: str = ""):
    try:
        import uuid
        req_id = f"req-{uuid.uuid4().hex[:8]}"
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO movie_requests (id, user_id, user_name, title, description, genre, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
        ''', (req_id, user_id, user_name, title, description, genre, datetime.now().isoformat()))
        conn.commit()
        conn.close()
        return {"id": req_id, "status": "pending", "message": "សំណើសុំរឿងត្រូវផ្ញើជោគជ័យ"}
    except Exception as e:
        print("add_movie_request error:", e)
        raise e

def get_movie_requests(status: str = None):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        if status and status != 'all':
            cursor.execute("SELECT * FROM movie_requests WHERE status = ? ORDER BY created_at DESC", (status,))
        else:
            cursor.execute("SELECT * FROM movie_requests ORDER BY created_at DESC")
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]
    except Exception as e:
        print("get_movie_requests error:", e)
        return []

def update_movie_request_status(request_id: str, status: str, admin_note: str = ""):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE movie_requests SET status = ?, admin_note = ? WHERE id = ?", (status, admin_note, request_id))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("update_movie_request_status error:", e)
        return False

# --- Series Follows ---
def toggle_series_follow(user_id: str, content_id: str):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM series_follows WHERE user_id = ? AND content_id = ?", (user_id, content_id))
        row = cursor.fetchone()
        if row:
            cursor.execute("DELETE FROM series_follows WHERE user_id = ? AND content_id = ?", (user_id, content_id))
            is_following = False
        else:
            cursor.execute("INSERT INTO series_follows (user_id, content_id, created_at) VALUES (?, ?, ?)",
                           (user_id, content_id, datetime.now().isoformat()))
            is_following = True
        conn.commit()
        conn.close()
        return is_following
    except Exception as e:
        print("toggle_series_follow error:", e)
        return False

def get_series_follow_status(user_id: str, content_id: str):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM series_follows WHERE user_id = ? AND content_id = ?", (user_id, content_id))
        row = cursor.fetchone()
        conn.close()
        return row is not None
    except Exception:
        return False

def get_series_followers(content_id: str):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT user_id FROM series_follows WHERE content_id = ?", (content_id,))
        rows = cursor.fetchall()
        conn.close()
        return [r["user_id"] for r in rows]
    except Exception:
        return []

# --- Admin Analytics ---
def get_admin_analytics():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM content WHERE is_published = 1")
        total_movies = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM users")
        total_users = cursor.fetchone()[0]

        cursor.execute("SELECT SUM(views) FROM content")
        sum_views = cursor.fetchone()[0] or 0

        cursor.execute("SELECT COUNT(*) FROM video_reports WHERE status = 'pending'")
        pending_reports = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM movie_requests WHERE status = 'pending'")
        pending_requests = cursor.fetchone()[0]

        cursor.execute("SELECT id, title, poster_url, views, type, rating FROM content ORDER BY views DESC LIMIT 5")
        top_movies = [dict(r) for r in cursor.fetchall()]

        conn.close()
        return {
            "totalMovies": total_movies,
            "totalUsers": total_users,
            "totalViews": sum_views,
            "pendingReports": pending_reports,
            "pendingRequests": pending_requests,
            "topMovies": top_movies
        }
    except Exception as e:
        print("get_admin_analytics error:", e)
        return {
            "totalMovies": 0,
            "totalUsers": 0,
            "totalViews": 0,
            "pendingReports": 0,
            "pendingRequests": 0,
            "topMovies": []
        }

if __name__ == '__main__':
    init_db()
    print("FastAPI SQLite database initialized successfully!")

