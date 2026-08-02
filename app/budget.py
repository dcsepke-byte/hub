import os
import json
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

FILES_DIR = Path(os.environ.get("HUB_FILES", "/opt/data/hub/files"))
BUDGET_FILE = FILES_DIR / "budget.json"

DEFAULT = {"categories": {}, "transactions": []}


def _load() -> Dict:
    if not BUDGET_FILE.exists():
        return {k: (dict(v) if isinstance(v, dict) else list(v)) for k, v in DEFAULT.items()}
    try:
        with open(BUDGET_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, dict):
            return {"categories": {}, "transactions": []}
        data.setdefault("categories", {})
        data.setdefault("transactions", [])
        return data
    except Exception:
        return {"categories": {}, "transactions": []}


def _save(data: Dict) -> bool:
    try:
        FILES_DIR.mkdir(parents=True, exist_ok=True)
        with open(BUDGET_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception:
        return False


def add_category(name: str, limit: float = 0) -> Dict:
    name = (name or "").strip()
    if not name:
        return {"ok": False, "error": "Name fehlt"}
    data = _load()
    if name in data["categories"]:
        return {"ok": False, "error": "Kategorie existiert bereits"}
    data["categories"][name] = {"limit": max(0.0, float(limit or 0))}
    _save(data)
    return {"ok": True, "category": {"name": name, "limit": data["categories"][name]["limit"], "spent": 0}}


def set_limit(name: str, limit: float) -> Dict:
    data = _load()
    if name not in data["categories"]:
        return {"ok": False, "error": "Kategorie nicht gefunden"}
    data["categories"][name]["limit"] = max(0.0, float(limit or 0))
    _save(data)
    return {"ok": True, "category": {"name": name, "limit": data["categories"][name]["limit"]}}


def add_expense(category: str, amount: float, note: str = "") -> Dict:
    category = (category or "").strip()
    if not category:
        return {"ok": False, "error": "Kategorie fehlt"}
    try:
        amount = float(amount)
    except (TypeError, ValueError):
        return {"ok": False, "error": "Ungültiger Betrag"}
    if amount <= 0:
        return {"ok": False, "error": "Betrag muss positiv sein"}
    data = _load()
    if category not in data["categories"]:
        data["categories"][category] = {"limit": 0}
    tx = {
        "id": str(int(time.time() * 1000)),
        "category": category,
        "amount": round(amount, 2),
        "note": (note or "").strip(),
        "date": datetime.now().isoformat(timespec="seconds"),
    }
    data["transactions"].append(tx)
    # Historie begrenzen
    data["transactions"] = data["transactions"][-500:]
    _save(data)
    return {"ok": True, "transaction": tx}


def monthly_summary() -> Dict:
    data = _load()
    month = datetime.now().strftime("%Y-%m")
    spent_by_cat: Dict[str, float] = {}
    for tx in data.get("transactions", []):
        if (tx.get("date") or "").startswith(month):
            cat = tx.get("category", "")
            spent_by_cat[cat] = spent_by_cat.get(cat, 0) + float(tx.get("amount", 0))
    categories: Dict[str, Dict] = {}
    total_limit = 0.0
    total_spent = 0.0
    for name, cat in data.get("categories", {}).items():
        limit = round(float(cat.get("limit", 0)), 2)
        spent = round(spent_by_cat.get(name, 0), 2)
        total_limit += limit
        total_spent += spent
        categories[name] = {
            "limit": limit,
            "spent": spent,
            "pct": round(spent / limit * 100, 1) if limit else 0,
        }
    total_spent = round(total_spent, 2)
    return {
        "month": month,
        "total_limit": round(total_limit, 2),
        "total_spent": total_spent,
        "remaining": round(total_limit - total_spent, 2),
        "over": total_spent > total_limit > 0,
        "categories": categories,
        "transactions": data.get("transactions", [])[-20:],
    }
