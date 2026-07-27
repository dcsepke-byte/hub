from datetime import datetime, timedelta
from typing import List, Dict
import os

CALENDAR_FILE = os.environ.get("HUB_CALENDAR_FILE", "/opt/data/hub/files/calendar.json")


def load_events() -> List[Dict]:
    import json
    if not os.path.exists(CALENDAR_FILE):
        return []
    try:
        with open(CALENDAR_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def save_events(events: List[Dict]) -> bool:
    import json
    try:
        os.makedirs(os.path.dirname(CALENDAR_FILE), exist_ok=True)
        with open(CALENDAR_FILE, "w", encoding="utf-8") as f:
            json.dump(events, f, ensure_ascii=False, indent=2)
        return True
    except Exception:
        return False


def today_events(limit: int = 5) -> List[Dict]:
    events = load_events()
    today = datetime.now().strftime("%Y-%m-%d")
    matches = []
    for e in events:
        start = e.get("start", "")
        if start and start.startswith(today):
            matches.append(e)
    return sorted(matches, key=lambda x: x.get("start", ""))[:limit]


def upcoming_events(days: int = 7, limit: int = 10) -> List[Dict]:
    events = load_events()
    now = datetime.now()
    end = now + timedelta(days=days)
    matches = []
    for e in events:
        start = e.get("start", "")
        try:
            dt = datetime.fromisoformat(start)
        except Exception:
            continue
        if now <= dt <= end:
            matches.append(e)
    return sorted(matches, key=lambda x: x.get("start", ""))[:limit]


def add_event(title: str, start: str, duration_minutes: int = 60, project: str = "") -> Dict:
    events = load_events()
    events.append({
        "id": len(events) + 1,
        "title": title,
        "start": start,
        "duration": duration_minutes,
        "project": project,
        "created": datetime.now().isoformat(),
    })
    save_events(events)
    return {"ok": True}
