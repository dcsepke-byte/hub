import os
import json
from pathlib import Path
from flask import request, jsonify
from app.config import Config

BASE = Config.UPLOAD_FOLDER


def _resolve_path(subpath: str) -> Path:
    subpath = subpath.strip("/")
    target = (BASE / subpath).resolve()
    try:
        target.relative_to(BASE.resolve())
    except ValueError:
        return BASE
    return target if target.exists() or subpath == "" else BASE


def list_directory(subpath: str = "") -> list[dict]:
    target = _resolve_path(subpath)
    if target.is_file():
        target = target.parent
    items = []
    for entry in sorted(target.iterdir(), key=lambda e: (e.is_file(), e.name.lower())):
        rel = entry.relative_to(BASE).as_posix()
        items.append({
            "name": entry.name,
            "path": rel,
            "type": "folder" if entry.is_dir() else "file",
            "size": entry.stat().st_size if entry.is_file() else 0,
            "modified": entry.stat().st_mtime,
        })
    return items


def ensure_dir(path: str) -> Path:
    target = _resolve_path(path)
    target.mkdir(parents=True, exist_ok=True)
    return target


def save_file(subpath: str, file_storage) -> dict:
    target_dir = ensure_dir(subpath)
    dest = target_dir / file_storage.filename
    file_storage.save(dest)
    return {
        "name": dest.name,
        "path": dest.relative_to(BASE).as_posix(),
        "size": dest.stat().st_size,
    }


def read_text_file(subpath: str) -> str:
    target = _resolve_path(subpath)
    if not target.is_file():
        return ""
    try:
        return target.read_text(encoding="utf-8")
    except Exception:
        return ""


def write_text_file(subpath: str, content: str) -> bool:
    target = _resolve_path(subpath)
    if target.is_dir():
        return False
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")
    return True


def delete_item(subpath: str) -> bool:
    target = _resolve_path(subpath)
    if target == BASE:
        return False
    try:
        if target.is_dir():
            target.rmdir()  # only empty
        else:
            target.unlink()
        return True
    except Exception:
        return False
