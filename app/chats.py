import os
import json
import time
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional

FILES_DIR = Path(os.environ.get("HUB_FILES", "/opt/data/hub/files"))
CHATS_FILE = FILES_DIR / "chats.json"


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _load() -> Dict:
    """Robustes Laden: fehlende/kaputte Datei oder falsche Struktur -> Defaults."""
    if not CHATS_FILE.exists():
        return {"threads": []}
    try:
        with open(CHATS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        return {"threads": []}
    if not isinstance(data, dict):
        return {"threads": []}
    threads = data.get("threads")
    if not isinstance(threads, list):
        threads = []
    valid = []
    for t in threads:
        if not isinstance(t, dict) or not t.get("id"):
            continue
        t.setdefault("title", "Neuer Chat")
        t.setdefault("project", "")
        t.setdefault("created_at", _now())
        t.setdefault("updated_at", t.get("created_at", _now()))
        msgs = t.get("messages")
        if not isinstance(msgs, list):
            msgs = []
        cleaned = []
        for m in msgs:
            if isinstance(m, dict) and m.get("role") in ("user", "assistant"):
                cleaned.append({
                    "role": m["role"],
                    "content": str(m.get("content", "")),
                    "ts": str(m.get("ts", _now())),
                })
        t["messages"] = cleaned
        valid.append(t)
    return {"threads": valid}


def _save(data: Dict) -> bool:
    try:
        FILES_DIR.mkdir(parents=True, exist_ok=True)
        with open(CHATS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception:
        return False


def _meta(thread: Dict) -> Dict:
    msgs = thread.get("messages", [])
    preview = ""
    if msgs:
        last = msgs[-1].get("content", "")
        preview = last if isinstance(last, str) else ""
    return {
        "id": thread["id"],
        "title": thread.get("title", "Neuer Chat"),
        "project": thread.get("project", ""),
        "created_at": thread.get("created_at", ""),
        "updated_at": thread.get("updated_at", ""),
        "message_count": len(msgs),
        "last_preview": preview[:140],
    }


def list_threads() -> List[Dict]:
    data = _load()
    threads = sorted(data["threads"], key=lambda t: t.get("updated_at", ""), reverse=True)
    return [_meta(t) for t in threads]


def get_thread(thread_id: str) -> Optional[Dict]:
    data = _load()
    for t in data["threads"]:
        if t.get("id") == thread_id:
            return t
    return None


def create_thread(title: str = "Neuer Chat", project: str = "") -> Dict:
    data = _load()
    now = _now()
    thread = {
        "id": f"chat_{int(time.time() * 1000)}",
        "title": (title or "Neuer Chat").strip()[:80],
        "project": (project or "").strip()[:80],
        "created_at": now,
        "updated_at": now,
        "messages": [],
    }
    data["threads"].append(thread)
    _save(data)
    return _meta(thread)


def rename_thread(thread_id: str, title: str) -> Dict:
    data = _load()
    for t in data["threads"]:
        if t.get("id") == thread_id:
            t["title"] = (title or "Neuer Chat").strip()[:80]
            t["updated_at"] = _now()
            _save(data)
            return {"ok": True, "thread": _meta(t)}
    return {"ok": False, "error": "Chat nicht gefunden"}


def delete_thread(thread_id: str) -> Dict:
    data = _load()
    before = len(data["threads"])
    data["threads"] = [t for t in data["threads"] if t.get("id") != thread_id]
    if len(data["threads"]) == before:
        return {"ok": False, "error": "Chat nicht gefunden"}
    _save(data)
    return {"ok": True}


def add_message(thread_id: str, role: str, content: str) -> Optional[Dict]:
    data = _load()
    role = role if role in ("user", "assistant") else "user"
    content = (content or "").strip()
    for t in data["threads"]:
        if t.get("id") == thread_id:
            t.setdefault("messages", [])
            msg = {"role": role, "content": content, "ts": _now()}
            t["messages"].append(msg)
            t["updated_at"] = _now()
            _save(data)
            return msg
    return None


def threads_for_project(project: str) -> List[Dict]:
    data = _load()
    return [_meta(t) for t in data["threads"] if t.get("project", "") == project]
