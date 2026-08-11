import json
import os
from datetime import datetime, timedelta
from typing import List, Dict

CALENDAR_FILE = os.environ.get("HUB_CALENDAR_FILE", "/opt/data/hub/files/calendar.json")


def load_events() -> List[Dict]:
    if not os.path.exists(CALENDAR_FILE):
        return []
    try:
        with open(CALENDAR_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def save_events(events: List[Dict]) -> bool:
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


def week_events(reference: datetime = None) -> List[Dict]:
    events = load_events()
    ref = reference or datetime.now()
    monday = ref - timedelta(days=ref.weekday())
    week_days = [(monday + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(7)]
    matches = []
    for e in events:
        start = e.get("start", "")
        if not start:
            continue
        try:
            day = datetime.fromisoformat(start).strftime("%Y-%m-%d")
        except Exception:
            continue
        if day in week_days:
            matches.append(e)
    return sorted(matches, key=lambda x: x.get("start", ""))


def add_event(title: str, start: str, duration_minutes: int = 60, project: str = "", location: str = "", notes: str = "", color: str = "") -> Dict:
    events = load_events()
    # Assign color based on project hash if not provided
    if not color and project:
        colors = ["#7c3aed", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"]
        h = sum(ord(c) for c in project) % len(colors)
        color = colors[h]
    elif not color:
        color = "#6b7280"  # gray for no-project
    events.append({
        "id": len(events) + 1,
        "title": title,
        "start": start,
        "duration": duration_minutes,
        "project": project,
        "location": location.strip(),
        "notes": notes.strip(),
        "color": color,
        "created": datetime.now().isoformat(),
    })
    save_events(events)
    return {"ok": True}


def month_events(year: int, month: int) -> List[Dict]:
    """Return all events for a given month."""
    events = load_events()
    prefix = f"{year:04d}-{month:02d}"
    matches = []
    for e in events:
        start = e.get("start", "")
        if start and start.startswith(prefix):
            matches.append(e)
    return sorted(matches, key=lambda x: x.get("start", ""))


def update_event(event_id: int, title: str = None, start: str = None, duration_minutes: int = None, project: str = None, location: str = None, notes: str = None, color: str = None) -> Dict:
    events = load_events()
    for e in events:
        if e.get("id") == event_id:
            if title is not None:
                e["title"] = title
            if start is not None:
                e["start"] = start
            if duration_minutes is not None:
                e["duration"] = duration_minutes
            if project is not None:
                e["project"] = project
                if color is None and project:
                    colors = ["#7c3aed", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"]
                    h = sum(ord(c) for c in project) % len(colors)
                    e["color"] = colors[h]
                elif color is None:
                    e["color"] = "#6b7280"
            if location is not None:
                e["location"] = location.strip()
            if notes is not None:
                e["notes"] = notes.strip()
            if color is not None:
                e["color"] = color
            e["updated"] = datetime.now().isoformat()
            save_events(events)
            return {"ok": True}
    return {"ok": False, "error": "Event not found"}


def delete_event(event_id: int) -> Dict:
    events = load_events()
    new_events = [e for e in events if e.get("id") != event_id]
    if len(new_events) == len(events):
        return {"ok": False, "error": "Event not found"}
    save_events(new_events)
    return {"ok": True}
