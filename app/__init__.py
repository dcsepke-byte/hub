import os
import json
import time
from datetime import datetime, timedelta
from pathlib import Path
from flask import Flask, render_template, request, redirect, url_for, session, jsonify, flash, send_from_directory
from werkzeug.security import generate_password_hash
from flask_socketio import SocketIO, emit

from app.config import Config
from app.auth import require_login, verify_password, LoginThrottle
from app import notion, weather, explorer
from app import hermes, search as search_module

BASE_DIR = Path(__file__).resolve().parent.parent

app = Flask(__name__, template_folder=str(BASE_DIR / "templates"), static_folder=str(BASE_DIR / "static"))
app.config.from_object(Config)
app.secret_key = Config.SECRET_KEY

socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")


@app.route("/login", methods=["GET", "POST"])
def login():
    ip = request.headers.get("X-Forwarded-For", request.remote_addr) or "unknown"
    locked = LoginThrottle.is_locked(ip)
    if request.method == "POST":
        if locked:
            flash("Zu viele Versuche. Bitte 5 Minuten warten.", "error")
            return render_template("login.html", locked=True), 429
        password = request.form.get("password", "")
        if verify_password(password):
            session.permanent = True
            session["hub_logged_in"] = True
            session["hub_login_at"] = datetime.utcnow().isoformat()
            return redirect(request.args.get("next") or url_for("index"))
        LoginThrottle.record(ip)
        flash("Falsches Passwort.", "error")
        return render_template("login.html", locked=False), 401
    return render_template("login.html", locked=locked)


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.route("/")
@require_login
def index():
    return render_template("index.html", page="home")


@app.route("/projects")
@require_login
def projects():
    return render_template("index.html", page="projects")


@app.route("/tasks")
@require_login
def tasks():
    return render_template("index.html", page="tasks")


@app.route("/explorer")
@require_login
def explorer_page():
    return render_template("index.html", page="explorer")


@app.route("/settings")
@require_login
def settings():
    return render_template("index.html", page="settings")


# --- API ---

@app.route("/api/weather")
@require_login
def api_weather():
    return jsonify(weather.get_weather())


@app.route("/api/search")
@require_login
def api_search():
    q = request.args.get("q", "").strip()
    return jsonify(search_module.search_all(q))


@app.route("/api/daily-report")
@require_login
def api_daily_report():
    tasks = notion.get_tasks(status="Offen", limit=50)
    w = weather.get_weather()
    weather_text = "nicht verfügbar"
    if w.get("ok"):
        c = w["current"]
        weather_text = f"{c['temp']}°C, Code {c['code']}"
    return jsonify({"text": hermes.generate_daily_report(tasks, weather_text)})


@app.route("/api/tasks")
@require_login
def api_tasks():
    project = request.args.get("project") or None
    status = request.args.get("status") or None
    return jsonify(notion.get_tasks(filter_project=project, status=status))


@app.route("/api/tasks/<page_id>/status", methods=["PATCH"])
@require_login
def api_task_status(page_id):
    data = request.get_json(silent=True) or {}
    new_status = data.get("status", "Erledigt")
    return jsonify({"ok": notion.update_task_status(page_id, new_status)})


@app.route("/api/tasks", methods=["POST"])
@require_login
def api_create_task():
    data = request.get_json(silent=True) or {}
    title = data.get("title", "").strip()
    project = data.get("project", "Persoenlich").strip()
    if not title:
        return jsonify({"ok": False, "error": "Titel fehlt"}), 400
    return jsonify(notion.create_task(title, project))


@app.route("/api/notes", methods=["POST"])
@require_login
def api_create_note():
    data = request.get_json(silent=True) or {}
    title = data.get("title", "").strip()
    project = data.get("project", "Persoenlich").strip()
    content = data.get("content", "").strip()
    if not title:
        return jsonify({"ok": False, "error": "Titel fehlt"}), 400
    return jsonify(notion.create_knowledge_entry(title, content, project))


@app.route("/api/explorer")
@require_login
def api_explorer_list():
    subpath = request.args.get("path", "")
    return jsonify(explorer.list_directory(subpath))


@app.route("/api/explorer/file")
@require_login
def api_explorer_read():
    subpath = request.args.get("path", "")
    return jsonify({"content": explorer.read_text_file(subpath), "path": subpath})


@app.route("/api/explorer/file", methods=["POST"])
@require_login
def api_explorer_write():
    data = request.get_json(silent=True) or {}
    ok = explorer.write_text_file(data.get("path", ""), data.get("content", ""))
    return jsonify({"ok": ok})


@app.route("/api/explorer/upload", methods=["POST"])
@require_login
def api_explorer_upload():
    subpath = request.args.get("path", "")
    if "file" not in request.files:
        return jsonify({"ok": False, "error": "Keine Datei"}), 400
    f = request.files["file"]
    return jsonify({"ok": True, "file": explorer.save_file(subpath, f)})


@app.route("/api/explorer/delete", methods=["POST"])
@require_login
def api_explorer_delete():
    data = request.get_json(silent=True) or {}
    return jsonify({"ok": explorer.delete_item(data.get("path", ""))})


@app.route("/api/settings/password", methods=["POST"])
@require_login
def api_change_password():
    data = request.get_json(silent=True) or {}
    current = data.get("current", "")
    new = data.get("new", "")
    if not verify_password(current):
        return jsonify({"ok": False, "error": "Aktuelles Passwort falsch"}), 401
    if len(new) < 6:
        return jsonify({"ok": False, "error": "Neues Passwort zu kurz"}), 400
    new_hash = generate_password_hash(new, method="pbkdf2:sha256", salt_length=16)
    return jsonify({"ok": True, "hash": new_hash, "note": "Hash in .env unter HUB_PASSWORD_HASH eintragen"})


@app.route("/api/projects")
@require_login
def api_projects():
    projects_data = [
        {"id": "party-arena", "name": "Party Arena", "icon": "🎮", "color": "#6366f1", "status": "In Arbeit", "tasks": 0},
        {"id": "ki-videos", "name": "KI-Videos", "icon": "🎬", "color": "#ec4899", "status": "Geplant", "tasks": 0},
        {"id": "hochzeit", "name": "Hochzeit", "icon": "💍", "color": "#a855f7", "status": "In Planung", "tasks": 0},
        {"id": "server", "name": "Server", "icon": "🔧", "color": "#f59e0b", "status": "Aktiv", "tasks": 0},
        {"id": "klavier", "name": "Klavier-Coach", "icon": "🎹", "color": "#10b981", "status": "Aktiv", "tasks": 0},
        {"id": "bangkok", "name": "Bangkok", "icon": "🇹🇭", "color": "#ef4444", "status": "Vorbereitung", "tasks": 0},
    ]
    try:
        tasks = notion.get_tasks(status="Offen", limit=100)
        for p in projects_data:
            p["tasks"] = sum(1 for t in tasks if t.get("project") == p["name"])
    except Exception:
        pass
    return jsonify(projects_data)


# --- SocketIO Hermes Chat ---

@socketio.on("chat_message")
def handle_chat_message(data):
    user_msg = str(data.get("text", "")).strip()
    if not user_msg:
        return
    emit("chat_message", {"role": "user", "text": user_msg}, broadcast=True)

    history = [{"role": "user", "content": user_msg}]
    res = hermes.answer_user_question(history)

    if res.get("ok"):
        emit("chat_message", {"role": "hermes", "text": res["text"]}, broadcast=True)
    else:
        emit("chat_message", {"role": "hermes", "text": f"KI nicht erreichbar: {res.get('error', 'Unbekannter Fehler')}"}, broadcast=True)


# --- Static file serving for uploads ---

@app.route("/files/<path:subpath>")
@require_login
def serve_file(subpath):
    return send_from_directory(Config.UPLOAD_FOLDER, subpath)


def create_app():
    return app


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5120, debug=False, allow_unsafe_werkzeug=True)
