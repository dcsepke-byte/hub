"""
Hub — Danny's Central Workspace
Flask + SocketIO + Notion API + Open-Meteo + Google Calendar
"""
import os
import json
import hashlib
import secrets
from datetime import datetime, timedelta
from pathlib import Path
from functools import wraps

from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from flask_socketio import SocketIO, emit
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import requests
from dotenv import load_dotenv

load_dotenv('/opt/data/.env')

# ── Config ──────────────────────────────────────────────────────────────
BASE_DIR = Path('/opt/data/hub')
FILES_DIR = BASE_DIR / 'files'
FILES_DIR.mkdir(parents=True, exist_ok=True)

PASSWORD_HASH_FILE = BASE_DIR / '.password_hash'
SECRET_KEY_FILE = BASE_DIR / '.secret_key'

if SECRET_KEY_FILE.exists():
    SECRET_KEY = SECRET_KEY_FILE.read_text().strip()
else:
    SECRET_KEY = secrets.token_hex(32)
    SECRET_KEY_FILE.write_text(SECRET_KEY)

if PASSWORD_HASH_FILE.exists():
    PASSWORD_HASH = PASSWORD_HASH_FILE.read_text().strip()
else:
    PASSWORD_HASH = generate_password_hash('admin')
    PASSWORD_HASH_FILE.write_text(PASSWORD_HASH)

NOTION_KEY = os.environ.get('NOTION_API_KEY', '')
NOTION_DB_TASKS = '3a337b21-9b91-813f-a116-f62d656dbc9b'
NOTION_HEADERS = {
    'Authorization': f'Bearer {NOTION_KEY}',
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json'
}

# ── App Setup ───────────────────────────────────────────────────────────
app = Flask(__name__)
app.config['SECRET_KEY'] = SECRET_KEY
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB
socketio = SocketIO(app, async_mode='threading', cors_allowed_origins='*')

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# ── User Model ──────────────────────────────────────────────────────────
class User(UserMixin):
    def __init__(self, user_id):
        self.id = user_id

@login_manager.user_loader
def load_user(user_id):
    return User(user_id)

# ── Auth Decorator ──────────────────────────────────────────────────────
def auth_required(f):
    """Like @login_required but returns JSON for API calls"""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not current_user.is_authenticated:
            if request.is_json or request.path.startswith('/api/'):
                return jsonify({'error': 'Unauthorized'}), 401
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated

# ── Helpers ─────────────────────────────────────────────────────────────
def get_notion_tasks(status_filter=None, project_filter=None):
    """Fetch tasks from Notion database"""
    if not NOTION_KEY:
        return []
    try:
        payload = {'page_size': 50, 'sorts': [{'property': 'Fällig', 'direction': 'ascending'}]}
        filter_parts = []
        if status_filter:
            filter_parts.append({'property': 'Status', 'status': {'equals': status_filter}})
        if project_filter:
            filter_parts.append({'property': 'Projekt', 'select': {'equals': project_filter}})
        if filter_parts:
            payload['filter'] = {'and': filter_parts} if len(filter_parts) > 1 else filter_parts[0]

        r = requests.post(
            f'https://api.notion.com/v1/databases/{NOTION_DB_TASKS}/query',
            headers=NOTION_HEADERS, json=payload, timeout=10
        )
        if r.status_code != 200:
            return []

        tasks = []
        for item in r.json().get('results', []):
            props = item['properties']
            title = ''.join([t.get('plain_text', '') for t in props.get('Aufgabe', {}).get('title', [])])
            status = props.get('Status', {}).get('status', {}).get('name', 'Offen')
            projekt = props.get('Projekt', {}).get('select', {}).get('name', '')
            faellig = props.get('Fällig', {}).get('date', {})
            faellig_str = faellig.get('start', '') if faellig else ''
            tasks.append({
                'id': item['id'],
                'title': title,
                'status': status,
                'project': projekt,
                'due': faellig_str
            })
        return tasks
    except Exception:
        return []

def update_notion_task_status(task_id, status):
    """Update task status in Notion"""
    if not NOTION_KEY:
        return False
    try:
        r = requests.patch(
            f'https://api.notion.com/v1/pages/{task_id}',
            headers=NOTION_HEADERS,
            json={'properties': {'Status': {'status': {'name': status}}}},
            timeout=10
        )
        return r.status_code == 200
    except Exception:
        return False

def create_notion_task(title, project='', due_date=''):
    """Create a new task in Notion"""
    if not NOTION_KEY:
        return None
    try:
        props = {
            'Aufgabe': {'title': [{'text': {'content': title}}]},
            'Status': {'status': {'name': 'Offen'}}
        }
        if project:
            props['Projekt'] = {'select': {'name': project}}
        if due_date:
            props['Fällig'] = {'date': {'start': due_date}}

        r = requests.post(
            'https://api.notion.com/v1/pages',
            headers=NOTION_HEADERS,
            json={'parent': {'database_id': NOTION_DB_TASKS}, 'properties': props},
            timeout=10
        )
        if r.status_code == 200:
            return r.json()['id']
        return None
    except Exception:
        return None

def get_weather():
    """Get current weather from Open-Meteo (free, no key)"""
    try:
        # Braunschweig coordinates
        r = requests.get(
            'https://api.open-meteo.com/v1/forecast',
            params={
                'latitude': 52.2689, 'longitude': 10.5268,
                'current': 'temperature_2m,weather_code,relative_humidity_2m',
                'timezone': 'Europe/Berlin'
            },
            timeout=5
        )
        if r.status_code != 200:
            return None
        data = r.json()
        current = data.get('current', {})
        weather_codes = {
            0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
            45: '🌫️', 48: '🌫️', 51: '🌧️', 53: '🌧️', 55: '🌧️',
            61: '🌧️', 63: '🌧️', 65: '🌧️', 71: '🌨️', 73: '🌨️',
            75: '🌨️', 77: '🌨️', 80: '🌧️', 81: '🌧️', 82: '🌧️',
            85: '🌨️', 86: '🌨️', 95: '⛈️', 96: '⛈️', 99: '⛈️'
        }
        return {
            'temp': current.get('temperature_2m', '?'),
            'icon': weather_codes.get(current.get('weather_code', 0), '🌤️'),
            'humidity': current.get('relative_humidity_2m', '?')
        }
    except Exception:
        return None

def get_calendar_events():
    """Get today's events from Google Calendar (placeholder)"""
    # TODO: Google Calendar API integration
    return []

def get_file_tree(path=None):
    """Get directory tree for explorer"""
    if path is None:
        path = FILES_DIR
    p = Path(path)
    if not p.exists():
        return []
    items = []
    for item in sorted(p.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower())):
        stat = item.stat()
        items.append({
            'name': item.name,
            'path': str(item.relative_to(FILES_DIR)),
            'is_dir': item.is_dir(),
            'size': stat.st_size,
            'modified': datetime.fromtimestamp(stat.st_mtime).isoformat()
        })
    return items

# ── Routes ──────────────────────────────────────────────────────────────
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        password = request.form.get('password', '')
        if check_password_hash(PASSWORD_HASH, password):
            user = User('danny')
            login_user(user, remember=True)
            next_url = request.args.get('next', url_for('home'))
            return redirect(next_url)
        return render_template('login.html', error='Falsches Passwort')
    return render_template('login.html')

@app.route('/logout')
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/')
@login_required
def home():
    return render_template('index.html', page='home')

@app.route('/projects')
@login_required
def projects():
    return render_template('index.html', page='projects')

@app.route('/todos')
@login_required
def todos():
    return render_template('index.html', page='todos')

@app.route('/explorer')
@login_required
def explorer():
    return render_template('index.html', page='explorer')

@app.route('/settings')
@login_required
def settings():
    return render_template('index.html', page='settings')

# ── API Routes ──────────────────────────────────────────────────────────
@app.route('/api/tasks')
@auth_required
def api_tasks():
    status = request.args.get('status')
    project = request.args.get('project')
    tasks = get_notion_tasks(status_filter=status, project_filter=project)
    return jsonify(tasks)

@app.route('/api/tasks', methods=['POST'])
@auth_required
def api_create_task():
    data = request.get_json()
    title = data.get('title', '')
    project = data.get('project', '')
    due = data.get('due', '')
    if not title:
        return jsonify({'error': 'Title required'}), 400
    task_id = create_notion_task(title, project, due)
    if task_id:
        return jsonify({'id': task_id, 'title': title, 'status': 'Offen', 'project': project, 'due': due})
    return jsonify({'error': 'Failed to create task'}), 500

@app.route('/api/tasks/<task_id>', methods=['PATCH'])
@auth_required
def api_update_task(task_id):
    data = request.get_json()
    status = data.get('status')
    if status:
        ok = update_notion_task_status(task_id, status)
        return jsonify({'success': ok})
    return jsonify({'error': 'No status provided'}), 400

@app.route('/api/weather')
@auth_required
def api_weather():
    w = get_weather()
    return jsonify(w or {})

@app.route('/api/calendar')
@auth_required
def api_calendar():
    events = get_calendar_events()
    return jsonify(events)

@app.route('/api/files')
@auth_required
def api_files():
    subpath = request.args.get('path', '')
    p = FILES_DIR / subpath
    if not p.resolve().is_relative_to(FILES_DIR.resolve()):
        return jsonify({'error': 'Invalid path'}), 403
    items = get_file_tree(p)
    return jsonify(items)

@app.route('/api/files/upload', methods=['POST'])
@auth_required
def api_upload():
    subpath = request.form.get('path', '')
    file = request.files.get('file')
    if not file:
        return jsonify({'error': 'No file'}), 400
    target_dir = FILES_DIR / subpath
    if not target_dir.resolve().is_relative_to(FILES_DIR.resolve()):
        return jsonify({'error': 'Invalid path'}), 403
    target_dir.mkdir(parents=True, exist_ok=True)
    filename = secure_filename(file.filename)
    file.save(target_dir / filename)
    return jsonify({'success': True, 'name': filename})

@app.route('/api/files/mkdir', methods=['POST'])
@auth_required
def api_mkdir():
    data = request.get_json()
    subpath = data.get('path', '')
    name = data.get('name', '')
    if not name:
        return jsonify({'error': 'No name'}), 400
    target = FILES_DIR / subpath / name
    if not target.resolve().is_relative_to(FILES_DIR.resolve()):
        return jsonify({'error': 'Invalid path'}), 403
    target.mkdir(parents=True, exist_ok=True)
    return jsonify({'success': True})

@app.route('/api/files/delete', methods=['POST'])
@auth_required
def api_delete_file():
    data = request.get_json()
    subpath = data.get('path', '')
    target = FILES_DIR / subpath
    if not target.resolve().is_relative_to(FILES_DIR.resolve()):
        return jsonify({'error': 'Invalid path'}), 403
    if target.is_dir():
        import shutil
        shutil.rmtree(target)
    else:
        target.unlink()
    return jsonify({'success': True})

@app.route('/api/password', methods=['POST'])
@auth_required
def api_change_password():
    data = request.get_json()
    old = data.get('old', '')
    new = data.get('new', '')
    if not check_password_hash(PASSWORD_HASH, old):
        return jsonify({'error': 'Altes Passwort falsch'}), 400
    if len(new) < 4:
        return jsonify({'error': 'Passwort zu kurz (min. 4 Zeichen)'}), 400
    new_hash = generate_password_hash(new)
    PASSWORD_HASH_FILE.write_text(new_hash)
    global PASSWORD_HASH
    PASSWORD_HASH = new_hash
    return jsonify({'success': True})

# ── SocketIO (Hermes Chat) ─────────────────────────────────────────────
@socketio.on('chat_message')
def handle_chat(data):
    """Receive message from user, relay to Hermes, send response back"""
    message = data.get('message', '').strip()
    if not message:
        return

    # Echo the user message back to confirm
    emit('chat_response', {
        'role': 'user',
        'content': message,
        'timestamp': datetime.now().isoformat()
    })

    # For now: placeholder response
    # TODO: Connect to Hermes Agent API for real responses
    response = f"Ich habe deine Nachricht erhalten: „{message}“\n\n(Direkte Hermes-Integration kommt in Kürze. Aktuell läuft der Chat über Telegram.)"

    emit('chat_response', {
        'role': 'assistant',
        'content': response,
        'timestamp': datetime.now().isoformat()
    })

@socketio.on('connect')
def handle_connect():
    emit('chat_response', {
        'role': 'system',
        'content': 'Verbunden mit Hub. Hallo Danny! 👋',
        'timestamp': datetime.now().isoformat()
    })

# ── Main ────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5126, debug=False, allow_unsafe_werkzeug=True)
