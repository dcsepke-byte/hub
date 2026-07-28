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
from app import hermes, search as search_module, news, calendar, lists
from app import projects as projects_module, stocks

PROJECTS_DATA = []

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


@app.route("/api/news")
@require_login
def api_news():
    return jsonify(news.fetch_news(limit=5))


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
    due = data.get("due", "").strip()
    status = data.get("status", "Offen").strip()
    if not title:
        return jsonify({"ok": False, "error": "Titel fehlt"}), 400
    return jsonify(notion.create_task(title, project, status, due))


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


@app.route("/api/explorer/tree")
@require_login
def api_explorer_tree():
    return jsonify(explorer.tree())


@app.route("/api/explorer/folder", methods=["POST"])
@require_login
def api_explorer_folder():
    data = request.get_json(silent=True) or {}
    return jsonify(explorer.create_folder(data.get("path", ""), data.get("name", "Neuer Ordner")))


@app.route("/api/explorer/rename", methods=["POST"])
@require_login
def api_explorer_rename():
    data = request.get_json(silent=True) or {}
    return jsonify(explorer.rename_item(data.get("path", ""), data.get("name", "")))


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
    projects_data = projects_module.list_projects()
    try:
        tasks = notion.get_tasks(status="Offen", limit=100)
        for p in projects_data:
            p["tasks"] = sum(1 for t in tasks if t.get("project") == p["name"])
            p["links"] = p.get("links", [])
    except Exception:
        for p in projects_data:
            p["tasks"] = 0
            p["links"] = p.get("links", [])
    return jsonify(projects_data)


@app.route("/api/projects", methods=["POST"])
@require_login
def api_create_project():
    data = request.get_json(silent=True) or {}
    return jsonify(projects_module.create_project(
        data.get("name", "").strip(),
        data.get("icon", "📁").strip(),
        data.get("color", "#6366f1").strip(),
        data.get("status", "In Arbeit").strip(),
        data.get("description", "").strip(),
        data.get("live_url", "").strip(),
        data.get("repo_url", "").strip(),
    ))


@app.route("/api/projects/<int:project_id>", methods=["PATCH"])
@require_login
def api_update_project(project_id):
    data = request.get_json(silent=True) or {}
    return jsonify(projects_module.update_project(project_id, **data))


@app.route("/api/projects/<int:project_id>", methods=["DELETE"])
@require_login
def api_delete_project(project_id):
    return jsonify(projects_module.delete_project(project_id))


@app.route("/api/projects/<int:project_id>")
@require_login
def api_project_detail(project_id):
    project = projects_module.get_project(project_id)
    if not project:
        return jsonify({"error": "Projekt nicht gefunden"}), 404
    project["tasks"] = notion.get_tasks(filter_project=project["name"], status="Offen")
    project["events"] = calendar.upcoming_events(days=14, limit=5)
    return jsonify(project)


@app.route("/api/calendar")
@require_login
def api_calendar():
    return jsonify({
        "today": calendar.today_events(limit=5),
        "upcoming": calendar.upcoming_events(days=7, limit=10),
    })


@app.route("/api/calendar", methods=["POST"])
@require_login
def api_create_event():
    data = request.get_json(silent=True) or {}
    title = data.get("title", "").strip()
    start = data.get("start", "").strip()
    if not title or not start:
        return jsonify({"ok": False, "error": "Titel und Startzeit erforderlich"}), 400
    return jsonify(calendar.add_event(title, start, data.get("duration", 60), data.get("project", ""), data.get("location", "")))


@app.route("/api/lists")
@require_login
def api_lists():
    return jsonify(lists.get_lists())


@app.route("/api/lists", methods=["POST"])
@require_login
def api_create_list():
    data = request.get_json(silent=True) or {}
    return jsonify(lists.create_list(data.get("name", "").strip()))


@app.route("/api/lists/<name>", methods=["DELETE"])
@require_login
def api_delete_list(name):
    return jsonify(lists.delete_list(name))


@app.route("/api/lists/<list_name>/items", methods=["POST"])
@require_login
def api_add_list_item(list_name):
    data = request.get_json(silent=True) or {}
    text = data.get("text", "").strip()
    url = data.get("url", "").strip()
    if not text:
        return jsonify({"ok": False, "error": "Text fehlt"}), 400
    return jsonify(lists.add_list_item(list_name, text, url))


@app.route("/api/lists/<list_name>/items/<int:item_id>", methods=["PATCH"])
@require_login
def api_update_list_item(list_name, item_id):
    data = request.get_json(silent=True) or {}
    return jsonify(lists.update_list_item(list_name, item_id, data.get("text", "").strip(), data.get("url", "").strip()))


@app.route("/api/lists/<list_name>/items/<int:item_id>/toggle", methods=["PATCH"])
@require_login
def api_toggle_list_item(list_name, item_id):
    return jsonify(lists.toggle_list_item(list_name, item_id))


@app.route("/api/lists/<list_name>/items/<int:item_id>", methods=["DELETE"])
@require_login
def api_delete_list_item(list_name, item_id):
    return jsonify(lists.delete_list_item(list_name, item_id))


@app.route("/api/stocks")
@require_login
def api_stocks():
    return jsonify(stocks.fetch_quotes())


@app.route("/api/stocks", methods=["POST"])
@require_login
def api_add_stock():
    data = request.get_json(silent=True) or {}
    return jsonify(stocks.add_symbol(data.get("symbol", "")))


@app.route("/api/stocks/<symbol>", methods=["DELETE"])
@require_login
def api_delete_stock(symbol):
    return jsonify(stocks.remove_symbol(symbol))


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
