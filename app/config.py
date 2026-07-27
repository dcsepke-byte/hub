import os
from dotenv import load_dotenv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = Path("/opt/data/.env")

load_dotenv(ENV_FILE, override=False)

class Config:
    SECRET_KEY = os.environ.get("HUB_SECRET_KEY", "change-me-in-production")
    HUB_PASSWORD_HASH = os.environ.get(
        "HUB_PASSWORD_HASH",
        "pbkdf2:sha256:1000000$hub$abcdef1234567890abcdef1234567890"
    )
    NOTION_API_KEY = os.environ.get("NOTION_API_KEY")
    NOTION_TASKS_DB = os.environ.get("NOTION_TASKS_DB", "3a337b21-9b91-813f-a116-f62d656dbc9b")
    NOTION_KNOWLEDGE_DB = os.environ.get("NOTION_KNOWLEDGE_DB", "3a637b21-9b91-81ad-81e0-e164d4b3ef05")
    UPLOAD_FOLDER = BASE_DIR / "files"
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024
    SESSION_COOKIE_SECURE = False
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    PERMANENT_SESSION_LIFETIME = 60 * 60 * 24 * 7
