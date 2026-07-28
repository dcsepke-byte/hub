import os
import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional

DB_PATH = Path(os.environ.get("HUB_DB", "/opt/data/hub/files/hub.db"))

def get_conn():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                icon TEXT DEFAULT '',
                color TEXT DEFAULT '#6366f1',
                status TEXT DEFAULT 'In Arbeit',
                description TEXT DEFAULT '',
                live_url TEXT DEFAULT '',
                repo_url TEXT DEFAULT '',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS project_links (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                url TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            )
        """)
        # seed defaults
        defaults = [
            ("Party Arena", "🎮", "#6366f1", "In Arbeit", "Mario-Party-ähnliches Minispiel.", "https://performer-lang-governmental-uploaded.trycloudflare.com", "https://github.com/dcsepke-byte/DC-Minigame"),
            ("KI-Videos", "🎬", "#ec4899", "Geplant", "Automatisierter Faceless-Video-Workflow.", "", ""),
            ("Hochzeit", "💍", "#a855f7", "In Planung", "Überraschungshochzeit 31.10.2026.", "", ""),
            ("Server", "🔧", "#f59e0b", "Aktiv", "Hostinger VPS, Docker, Hermes.", "", "https://hermes-agent.nousresearch.com/docs"),
            ("Klavier-Coach", "🎹", "#10b981", "Aktiv", "SM-2 basierter Klavier-Lern-Coach.", "https://coach.danny-csepke.de", ""),
            ("Bangkok", "🇹🇭", "#ef4444", "Vorbereitung", "ATS Training ORL, 28.07.-09.08.2026.", "", ""),
        ]
        for row in defaults:
            try:
                conn.execute("INSERT OR IGNORE INTO projects (name, icon, color, status, description, live_url, repo_url) VALUES (?,?,?,?,?,?,?)", row)
            except Exception:
                pass


def list_projects() -> List[Dict]:
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM projects ORDER BY name").fetchall()
        return [dict(r) for r in rows]


def get_project(pid: int) -> Optional[Dict]:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM projects WHERE id = ?", (pid,)).fetchone()
        if not row:
            return None
        proj = dict(row)
        links = conn.execute("SELECT name, url FROM project_links WHERE project_id = ?", (pid,)).fetchall()
        proj["links"] = [dict(l) for l in links]
        return proj


def create_project(name: str, icon: str, color: str, status: str, description: str, live_url: str, repo_url: str) -> Dict:
    with get_conn() as conn:
        try:
            cur = conn.execute(
                "INSERT INTO projects (name, icon, color, status, description, live_url, repo_url) VALUES (?,?,?,?,?,?,?)",
                (name, icon, color, status, description, live_url, repo_url),
            )
            pid = cur.lastrowid
            _sync_links(conn, pid, [{"name": "Live", "url": live_url}, {"name": "Repo", "url": repo_url}] if live_url or repo_url else [])
            return {"ok": True, "id": pid}
        except sqlite3.IntegrityError:
            return {"ok": False, "error": "Projektname existiert bereits"}


def update_project(pid: int, **fields) -> Dict:
    allowed = {"name", "icon", "color", "status", "description", "live_url", "repo_url"}
    updates = {k: v for k, v in fields.items() if k in allowed}
    if not updates:
        return {"ok": False, "error": "Keine Felder"}
    with get_conn() as conn:
        conn.execute(
            f"UPDATE projects SET {', '.join(f'{k}=?' for k in updates)} WHERE id=?",
            (*updates.values(), pid),
        )
        links = []
        if fields.get("live_url"):
            links.append({"name": "Live", "url": fields["live_url"]})
        if fields.get("repo_url"):
            links.append({"name": "Repo", "url": fields["repo_url"]})
        _sync_links(conn, pid, links)
        return {"ok": True}


def delete_project(pid: int) -> Dict:
    with get_conn() as conn:
        conn.execute("DELETE FROM projects WHERE id = ?", (pid,))
        return {"ok": True}


def _sync_links(conn, pid: int, links: List[Dict]):
    conn.execute("DELETE FROM project_links WHERE project_id = ?", (pid,))
    for l in links:
        if l.get("url"):
            conn.execute("INSERT INTO project_links (project_id, name, url) VALUES (?,?,?)", (pid, l["name"], l["url"]))


init_db()
