"""Lydia-Modus: Rezept-Verwaltung (einfach, keine Notion-Integration)"""
import os
import json
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional

FILES_DIR = Path(os.environ.get("HUB_FILES", "/opt/data/hub/files"))
RECIPES_FILE = FILES_DIR / "recipes.json"


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _load() -> List[Dict]:
    if not RECIPES_FILE.exists():
        return []
    try:
        with open(RECIPES_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        return []
    if not isinstance(data, list):
        return []
    return data


def _save(recipes: List[Dict]) -> bool:
    try:
        FILES_DIR.mkdir(parents=True, exist_ok=True)
        with open(RECIPES_FILE, "w", encoding="utf-8") as f:
            json.dump(recipes, f, ensure_ascii=False, indent=2)
        return True
    except Exception:
        return False


def list_recipes() -> List[Dict]:
    """Alle Rezepte (Titel + ID, ohne Details)."""
    data = _load()
    return sorted(data, key=lambda r: r.get("title", "").lower())


def get_recipe(recipe_id: str) -> Optional[Dict]:
    data = _load()
    for r in data:
        if r.get("id") == recipe_id:
            return r
    return None


def create_recipe(title: str, ingredients: str = "", instructions: str = "") -> Dict:
    data = _load()
    now = _now()
    recipe = {
        "id": f"recipe_{int(datetime.now().timestamp() * 1000)}",
        "title": (title or "Neues Rezept").strip()[:120],
        "ingredients": (ingredients or "").strip(),
        "instructions": (instructions or "").strip(),
        "created_at": now,
        "updated_at": now,
    }
    data.append(recipe)
    _save(data)
    return {"ok": True, "recipe": recipe}


def update_recipe(recipe_id: str, title: str = None, ingredients: str = None, instructions: str = None) -> Dict:
    data = _load()
    for r in data:
        if r.get("id") == recipe_id:
            if title is not None:
                r["title"] = title.strip()[:120]
            if ingredients is not None:
                r["ingredients"] = ingredients.strip()
            if instructions is not None:
                r["instructions"] = instructions.strip()
            r["updated_at"] = _now()
            _save(data)
            return {"ok": True, "recipe": r}
    return {"ok": False, "error": "Rezept nicht gefunden"}


def delete_recipe(recipe_id: str) -> Dict:
    data = _load()
    before = len(data)
    data = [r for r in data if r.get("id") != recipe_id]
    if len(data) == before:
        return {"ok": False, "error": "Rezept nicht gefunden"}
    _save(data)
    return {"ok": True}
