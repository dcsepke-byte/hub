import os
import json
import time
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional

FILES_DIR = Path(os.environ.get("HUB_FILES", "/opt/data/hub/files"))
NOTES_FILE = FILES_DIR / "notes.json"


def _load() -> List[Dict]:
    if not NOTES_FILE.exists():
        return []
    try:
        with open(NOTES_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, list) else []
    except Exception:
        return []


def _save(data: List[Dict]) -> bool:
    try:
        FILES_DIR.mkdir(parents=True, exist_ok=True)
        with open(NOTES_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception:
        return False


def list_notes(q: str = "", project: str = "") -> List[Dict]:
    notes = _load()
    q = (q or "").strip().lower()
    project = (project or "").strip()
    result = []
    for n in notes:
        if q and q not in n.get("title", "").lower() and q not in n.get("content", "").lower():
            continue
        if project and n.get("project", "") != project:
            continue
        result.append(n)
    # Gepinnte zuerst, dann nach updated_at absteigend (pinned immer vor unpinned)
    result.sort(key=lambda n: (0 if n.get("pinned") else 1, n.get("updated_at", "")), reverse=False)
    # innerhalb derselben Pinned-Gruppe nach updated_at absteigend sortieren
    pinned = [n for n in result if n.get("pinned")]
    unpinned = [n for n in result if not n.get("pinned")]
    pinned.sort(key=lambda n: n.get("updated_at", ""), reverse=True)
    unpinned.sort(key=lambda n: n.get("updated_at", ""), reverse=True)
    return pinned + unpinned


def create_note(title: str, content: str = "", project: str = "") -> Dict:
    notes = _load()
    now = datetime.now().isoformat(timespec="seconds")
    note = {
        "id": str(int(time.time() * 1000)),
        "title": title.strip(),
        "content": content or "",
        "project": (project or "Persoenlich").strip(),
        "updated_at": now,
        "pinned": False,
    }
    notes.append(note)
    _save(notes)
    return {"ok": True, "note": note}


def update_note(note_id: str, **fields) -> Dict:
    notes = _load()
    for n in notes:
        if n.get("id") == note_id:
            allowed = {"title", "content", "project", "pinned"}
            for key, value in fields.items():
                if key in allowed:
                    if key == "pinned":
                        n[key] = bool(value)
                    elif key in ("title", "project"):
                        n[key] = str(value).strip() or n[key]
                    else:
                        n[key] = value
            n["updated_at"] = datetime.now().isoformat(timespec="seconds")
            _save(notes)
            return {"ok": True, "note": n}
    return {"ok": False, "error": "Notiz nicht gefunden"}


def delete_note(note_id: str) -> Dict:
    notes = _load()
    remaining = [n for n in notes if n.get("id") != note_id]
    if len(remaining) == len(notes):
        return {"ok": False, "error": "Notiz nicht gefunden"}
    _save(remaining)
    return {"ok": True}
