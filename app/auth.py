import time
import functools
from flask import session, redirect, url_for, request, flash
from werkzeug.security import check_password_hash
from app.config import Config

class LoginThrottle:
    attempts: dict[str, list[float]] = {}
    max_attempts = 5
    window = 300

    @classmethod
    def is_locked(cls, ip: str) -> bool:
        now = time.time()
        cls.attempts.setdefault(ip, [])
        cls.attempts[ip] = [t for t in cls.attempts[ip] if now - t < cls.window]
        return len(cls.attempts[ip]) >= cls.max_attempts

    @classmethod
    def record(cls, ip: str):
        cls.attempts.setdefault(ip, []).append(time.time())


def require_login(f):
    @functools.wraps(f)
    def wrapper(*args, **kwargs):
        if not session.get("hub_logged_in"):
            return redirect(url_for("login", next=request.url))
        return f(*args, **kwargs)
    return wrapper


def verify_password(password: str) -> bool:
    return check_password_hash(Config.HUB_PASSWORD_HASH, password)
