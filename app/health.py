import os
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Optional

FILES_DIR = Path(os.environ.get("HUB_FILES", "/opt/data/hub/files"))
HEALTH_FILE = FILES_DIR / "health.json"

DEFAULT = {"water_goal": 2.0, "water_log": {}, "sleep_log": {}, "last_check": None}


def _load() -> Dict:
    if not HEALTH_FILE.exists():
        return {"water_goal": 2.0, "water_log": {}, "sleep_log": {}, "last_check": None}
    try:
        with open(HEALTH_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        merged = {"water_goal": 2.0, "water_log": {}, "sleep_log": {}, "last_check": None}
        if isinstance(data, dict):
            merged.update(data)
        merged.setdefault("water_log", {})
        merged.setdefault("sleep_log", {})
        return merged
    except Exception:
        return {"water_goal": 2.0, "water_log": {}, "sleep_log": {}, "last_check": None}


def _save(data: Dict) -> bool:
    try:
        FILES_DIR.mkdir(parents=True, exist_ok=True)
        with open(HEALTH_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception:
        return False


def _today() -> str:
    return datetime.now().strftime("%Y-%m-%d")


def get_health() -> Dict:
    data = _load()
    today = _today()
    goal = round(float(data.get("water_goal", 2.0) or 2.0), 2)
    water = round(float(data.get("water_log", {}).get(today, 0) or 0), 2)
    week_water: Dict[str, float] = {}
    week_sleep: Dict[str, float] = {}
    for i in range(6, -1, -1):
        d = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
        week_water[d] = round(float(data.get("water_log", {}).get(d, 0) or 0), 2)
        week_sleep[d] = round(float(data.get("sleep_log", {}).get(d, 0) or 0), 2)
    return {
        "today": today,
        "water": water,
        "goal": goal,
        "remaining": round(max(goal - water, 0), 2),
        "done": water >= goal,
        "pct": round(water / goal * 100, 1) if goal else 0,
        "week_water": week_water,
        "sleep": data.get("sleep_log", {}),
        "week_sleep": week_sleep,
        "last_check": data.get("last_check"),
    }


def add_water(amount: float) -> Dict:
    try:
        amount = float(amount)
    except (TypeError, ValueError):
        return {"ok": False, "error": "Ungültiger Betrag"}
    if amount <= 0:
        return {"ok": False, "error": "Betrag muss positiv sein"}
    data = _load()
    today = _today()
    current = round(float(data.get("water_log", {}).get(today, 0) or 0), 2)
    data["water_log"][today] = round(current + amount, 2)
    data["last_check"] = datetime.now().isoformat(timespec="seconds")
    _save(data)
    result = get_health()
    result["ok"] = True
    return result


def set_goal(goal: float) -> Dict:
    try:
        goal = float(goal)
    except (TypeError, ValueError):
        return {"ok": False, "error": "Ungültiges Ziel"}
    if goal <= 0:
        return {"ok": False, "error": "Ziel muss positiv sein"}
    data = _load()
    data["water_goal"] = round(goal, 2)
    _save(data)
    result = get_health()
    result["ok"] = True
    return result


def add_sleep(hours: float, date: str = "") -> Dict:
    try:
        hours = float(hours)
    except (TypeError, ValueError):
        return {"ok": False, "error": "Ungültige Stunden"}
    if hours <= 0 or hours > 24:
        return {"ok": False, "error": "Stunden zwischen 0 und 24"}
    data = _load()
    # Default: die letzte Nacht (gestern)
    day = (date or "").strip() or (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    data["sleep_log"][day] = round(hours, 1)
    _save(data)
    result = get_health()
    result["ok"] = True
    return result
