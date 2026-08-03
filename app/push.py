"""
Push notification system for HUB.
Manages Web Push subscriptions and sends notifications via VAPID.
"""
import json
import os
from pathlib import Path
from typing import List, Dict
from pywebpush import webpush, WebPushException

FILES_DIR = Path(os.environ.get("HUB_FILES", "/opt/data/hub/files"))
VAPID_FILE = FILES_DIR / "vapid.json"
SUBS_FILE = FILES_DIR / "push_subscriptions.json"


def _load_vapid() -> dict:
    if not VAPID_FILE.exists():
        return {}
    with open(VAPID_FILE) as f:
        return json.load(f)


def get_public_key() -> str:
    return _load_vapid().get("public_key", "")


def _load_subs() -> List[Dict]:
    if not SUBS_FILE.exists():
        return []
    try:
        with open(SUBS_FILE) as f:
            data = json.load(f)
        return data if isinstance(data, list) else []
    except Exception:
        return []


def _save_subs(data: List[Dict]):
    FILES_DIR.mkdir(parents=True, exist_ok=True)
    with open(SUBS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def subscribe(subscription: dict) -> bool:
    subs = _load_subs()
    endpoint = subscription.get("endpoint", "")
    for s in subs:
        if s.get("endpoint") == endpoint:
            s.update(subscription)
            _save_subs(subs)
            return True
    subs.append(subscription)
    _save_subs(subs)
    return True


def unsubscribe(endpoint: str) -> bool:
    subs = _load_subs()
    new_subs = [s for s in subs if s.get("endpoint") != endpoint]
    if len(new_subs) == len(subs):
        return False
    _save_subs(new_subs)
    return True


def send_all(title: str, body: str, url: str = "/") -> dict:
    """Send push notification to all subscribers."""
    vapid = _load_vapid()
    if not vapid:
        return {"ok": False, "error": "VAPID keys missing"}
    subs = _load_subs()
    sent = 0
    failed = 0
    for sub in subs:
        try:
            webpush(
                subscription_info=sub,
                data=json.dumps({"title": title, "body": body, "url": url}),
                vapid_private_key=vapid["private_key"],
                vapid_claims={"sub": "mailto:danny@csepke.de"},
            )
            sent += 1
        except WebPushException:
            failed += 1
    return {"ok": True, "sent": sent, "failed": failed, "total": len(subs)}
