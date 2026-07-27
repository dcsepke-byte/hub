# HUB — Danny's Central Workspace

Flask-basierte Web-App als Stufe-1-MVP des HUB.

## Starten (lokal)

```bash
cd /opt/data/hub
source .venv/bin/activate
python run.py
```

Port: **5120**

## Produktion

```bash
cd /opt/data/hub
source .venv/bin/activate
gunicorn -k eventlet -w 1 -b 0.0.0.0:5120 "app:create_app()"
```

## Env-Variablen (`.env`)

```bash
HUB_SECRET_KEY=ein-zufälliger-string
HUB_PASSWORD_HASH=pbkdf2:sha256:...
NOTION_API_KEY=secret_...
NOTION_TASKS_DB=3a337b21-9b91-813f-a116-f62d656dbc9b
NOTION_KNOWLEDGE_DB=3a637b21-9b91-81ad-81e0-e164d4b3ef05
```

Passwort-Hash erzeugen:

```python
from werkzeug.security import generate_password_hash
print(generate_password_hash("dein-passwort", method="pbkdf2:sha256", salt_length=16))
```

## Tunnel

```bash
cloudflared tunnel --url http://localhost:5120
```

## Features Stufe 1 MVP

- Login mit Passwort + Brute-Force-Schutz
- Navigation: Home, Projekte, To-Do, Explorer, Settings
- Home: Wetter-Widget (Braunschweig), Hermes-Chat, heutige To-Do, Tagesbericht-Platzhalter
- Projekte: Grid mit offenen Task-Zahlen aus Notion
- To-Do: Notion-Aufgaben-DB Sync, Filter, Checkbox
- Explorer: Datei-Baum, Upload, Breadcrumb
- Settings: Dark-Mode, Passwort-Hash generieren
