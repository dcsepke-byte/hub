"""Eisenhower-Prioritäten serverseitig in JSON-Datei speichern.

Struktur: {"task_id": "P1"|"P2"|"P3"|"P4"}
Fehlertolerant: leere/fehlende/kaputte Datei → leeres Dict.
"""
import json
from pathlib import Path

FILE = Path(__file__).resolve().parent.parent / "files" / "task_prios.json"

VALID_PRIOS = {"P1", "P2", "P3", "P4", ""}


def _load() -> dict:
    """Lade Prioritäten aus der JSON-Datei. Robust gegen Fehler."""
    try:
        if not FILE.exists():
            return {}
        raw = FILE.read_text(encoding="utf-8").strip()
        if not raw:
            return {}
        data = json.loads(raw)
        if not isinstance(data, dict):
            return {}
        # Nur gültige Werte behalten
        return {k: v for k, v in data.items() if isinstance(k, str) and v in VALID_PRIOS}
    except (json.JSONDecodeError, OSError):
        return {}


def _save(data: dict) -> None:
    """Speichere Prioritäten in die JSON-Datei."""
    FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp = FILE.with_suffix(".json.tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False, sort_keys=True)
    tmp.replace(FILE)


def get_prios() -> dict:
    """Alle Prioritäten als dict {task_id: prio} zurückgeben."""
    return _load()


def get_prio(task_id: str) -> str:
    """Priorität einer einzelnen Task-ID zurückgeben (leerer String = keine)."""
    return _load().get(task_id, "")


def set_prio(task_id: str, prio: str) -> dict:
    """Priorität für eine Task setzen.

    Args:
        task_id: Notion-Seiten-ID
        prio: "P1", "P2", "P3", "P4", oder "" zum Löschen

    Returns:
        {"ok": True, "task_id": ..., "prio": ...} oder {"ok": False, "error": ...}
    """
    if prio not in VALID_PRIOS:
        return {"ok": False, "error": f"Ungültige Priorität: {prio}. Erlaubt: P1, P2, P3, P4, ''"}
    if not task_id or not isinstance(task_id, str):
        return {"ok": False, "error": "task_id fehlt"}

    data = _load()
    if prio == "":
        data.pop(task_id, None)
    else:
        data[task_id] = prio
    _save(data)
    return {"ok": True, "task_id": task_id, "prio": prio or None}
