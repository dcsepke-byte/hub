import os
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Optional

FILES_DIR = Path(os.environ.get("HUB_FILES", "/opt/data/hub/files"))
TIMETRACK_FILE = FILES_DIR / "timetrack.json"

DEFAULT = {
    "project": "",
    "task_title": "",
    "started_at": None,
    "elapsed_seconds": 0,
    "running": False,
    "segments": [],
}


def _load() -> Dict:
    if not TIMETRACK_FILE.exists():
        return dict(DEFAULT)
    try:
        with open(TIMETRACK_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        merged = dict(DEFAULT)
        if isinstance(data, dict):
            merged.update(data)
        return merged
    except Exception:
        return dict(DEFAULT)


def _save(data: Dict) -> bool:
    try:
        FILES_DIR.mkdir(parents=True, exist_ok=True)
        with open(TIMETRACK_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception:
        return False


def _now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _current_seconds(state: Dict) -> int:
    secs = int(state.get("elapsed_seconds", 0) or 0)
    if state.get("running") and state.get("started_at"):
        try:
            started = datetime.fromisoformat(state["started_at"])
            secs += max(0, int((datetime.now() - started).total_seconds()))
        except Exception:
            pass
    return secs


def _running_seconds(state: Dict) -> int:
    if not state.get("running") or not state.get("started_at"):
        return 0
    try:
        started = datetime.fromisoformat(state["started_at"])
        return max(0, int((datetime.now() - started).total_seconds()))
    except Exception:
        return 0


def start(project: str = "", task: str = "") -> Dict:
    state = _load()
    if state.get("running"):
        state["elapsed_seconds"] = _current_seconds(state)
        state["running"] = False
        state["started_at"] = None
    state["project"] = (project or "").strip() or "Ohne Projekt"
    state["task_title"] = (task or "").strip()
    state["started_at"] = _now_iso()
    state["running"] = True
    _save(state)
    return {"ok": True, "state": get_state()}


def stop() -> Dict:
    state = _load()
    if not state.get("running"):
        return {"ok": False, "error": "Kein laufender Timer"}
    now = datetime.now()
    started = datetime.fromisoformat(state["started_at"])
    seconds = max(0, int((now - started).total_seconds()))
    state["elapsed_seconds"] = int(state.get("elapsed_seconds", 0)) + seconds
    state["segments"].append({
        "project": state.get("project", ""),
        "task_title": state.get("task_title", ""),
        "start": state["started_at"],
        "end": now.isoformat(timespec="seconds"),
        "seconds": seconds,
    })
    state["segments"] = state["segments"][-500:]
    state["running"] = False
    state["started_at"] = None
    _save(state)
    return {"ok": True, "state": get_state()}


def toggle(project: str = "", task: str = "") -> Dict:
    state = _load()
    if state.get("running"):
        return stop()
    return start(project or state.get("project", ""), task or state.get("task_title", ""))


def today_summary() -> int:
    state = _load()
    today = datetime.now().strftime("%Y-%m-%d")
    seconds = 0
    for seg in state.get("segments", []):
        try:
            if (seg.get("start") or "").startswith(today):
                seconds += int(seg.get("seconds", 0) or 0)
        except Exception:
            pass
    if state.get("running") and (state.get("started_at") or "").startswith(today):
        seconds += _running_seconds(state)
    return seconds


def week_summary() -> Dict[str, int]:
    state = _load()
    days: Dict[str, int] = {}
    for i in range(6, -1, -1):
        d = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
        days[d] = 0
    for seg in state.get("segments", []):
        start = (seg.get("start") or "")[:10]
        if start in days:
            days[start] += int(seg.get("seconds", 0) or 0)
    if state.get("running"):
        d = (state.get("started_at") or "")[:10]
        if d in days:
            days[d] += _running_seconds(state)
    return days


def get_state() -> Dict:
    state = _load()
    state["current_seconds"] = _current_seconds(state)
    state["running_seconds"] = _running_seconds(state)
    state["today_seconds"] = today_summary()
    state["week"] = week_summary()
    return state
