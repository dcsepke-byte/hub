import os
import json
from datetime import datetime
from pathlib import Path
from typing import List, Dict

LISTS_DIR = Path(os.environ.get("HUB_FILES", "/opt/data/hub/files"))
LISTS_FILE = LISTS_DIR / "lists.json"

DEFAULT_LISTS = {
    "Einkauf": [],
    "Filme": [],
    "Geschenke": [],
    "Ideen": [],
    "Wünsche": [],
}


def _load() -> Dict[str, List[Dict]]:
    if not LISTS_FILE.exists():
        return {k: [] for k in DEFAULT_LISTS}
    try:
        with open(LISTS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {k: [] for k in DEFAULT_LISTS}


def _save(data: Dict[str, List[Dict]]) -> bool:
    try:
        LISTS_DIR.mkdir(parents=True, exist_ok=True)
        with open(LISTS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception:
        return False


def get_lists() -> Dict[str, List[Dict]]:
    data = _load()
    for name in DEFAULT_LISTS:
        if name not in data:
            data[name] = []
    return data


def create_list(name: str) -> Dict:
    data = _load()
    if name in data:
        return {"ok": False, "error": "Liste existiert bereits"}
    data[name] = []
    _save(data)
    return {"ok": True}


def delete_list(name: str) -> Dict:
    data = _load()
    if name in DEFAULT_LISTS:
        return {"ok": False, "error": "Standardliste kann nicht gelöscht werden"}
    if name in data:
        del data[name]
        _save(data)
        return {"ok": True}
    return {"ok": False, "error": "Liste nicht gefunden"}


def add_list_item(list_name: str, text: str, url: str = "") -> Dict:
    data = _load()
    if list_name not in data:
        data[list_name] = []
    item = {"id": int(datetime.now().timestamp() * 1000), "text": text, "url": url, "done": False, "created": datetime.now().isoformat()}
    data[list_name].append(item)
    _save(data)
    return {"ok": True, "item": item}


def update_list_item(list_name: str, item_id: int, text: str, url: str) -> Dict:
    data = _load()
    for item in data.get(list_name, []):
        if item.get("id") == item_id:
            item["text"] = text
            item["url"] = url
            _save(data)
            return {"ok": True}
    return {"ok": False, "error": "Item nicht gefunden"}


def toggle_list_item(list_name: str, item_id: int) -> Dict:
    data = _load()
    for item in data.get(list_name, []):
        if item.get("id") == item_id:
            item["done"] = not item.get("done", False)
            _save(data)
            return {"ok": True}
    return {"ok": False, "error": "Item nicht gefunden"}


def delete_list_item(list_name: str, item_id: int) -> Dict:
    data = _load()
    original = len(data.get(list_name, []))
    data[list_name] = [i for i in data.get(list_name, []) if i.get("id") != item_id]
    if len(data[list_name]) == original:
        return {"ok": False, "error": "Item nicht gefunden"}
    _save(data)
    return {"ok": True}
