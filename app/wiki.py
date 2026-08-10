import os
import json
import time
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional

FILES_DIR = Path(os.environ.get("HUB_FILES", "/opt/data/hub/files"))
WIKI_FILE = FILES_DIR / "wiki.json"


def _load() -> List[Dict]:
    if not WIKI_FILE.exists():
        return []
    try:
        with open(WIKI_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, list) else []
    except Exception:
        return []


def _save(data: List[Dict]) -> bool:
    try:
        FILES_DIR.mkdir(parents=True, exist_ok=True)
        with open(WIKI_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception:
        return False


def list_entries(q: str = "", category: str = "", tag: str = "", entry_type: str = "") -> List[Dict]:
    entries = _load()
    q = (q or "").strip().lower()
    category = (category or "").strip()
    tag = (tag or "").strip().lower()
    entry_type = (entry_type or "").strip().lower()

    result = []
    for e in entries:
        if q:
            title = (e.get("title") or "").lower()
            content = (e.get("content") or "").lower()
            tags_str = " ".join(t.lower() for t in (e.get("tags") or []))
            cat = (e.get("category") or "").lower()
            if q not in title and q not in content and q not in tags_str and q not in cat:
                continue
        if category and e.get("category", "") != category:
            continue
        if tag:
            entry_tags = [t.lower() for t in (e.get("tags") or [])]
            if tag not in entry_tags:
                continue
        if entry_type and e.get("type", "note") != entry_type:
            continue
        result.append(e)

    result.sort(key=lambda e: e.get("updated_at", ""), reverse=True)
    return result


def create_entry(title: str, content: str = "", category: str = "Allgemein",
                 tags: Optional[List[str]] = None, entry_type: str = "note",
                 difficulty: str = "") -> Dict:
    entries = _load()
    now = datetime.now().isoformat(timespec="seconds")
    entry = {
        "id": str(int(time.time() * 1000)),
        "title": title.strip(),
        "content": content or "",
        "category": (category or "Allgemein").strip(),
        "tags": [t.strip() for t in (tags or []) if t.strip()],
        "type": entry_type if entry_type in ("note", "tutorial", "reference") else "note",
        "difficulty": difficulty if difficulty in ("beginner", "intermediate", "advanced") else "",
        "created_at": now,
        "updated_at": now,
    }
    entries.append(entry)
    _save(entries)
    return {"ok": True, "entry": entry}


def update_entry(entry_id: str, **fields) -> Dict:
    entries = _load()
    for e in entries:
        if e.get("id") == entry_id:
            allowed = {"title", "content", "category", "tags", "type", "difficulty"}
            for key, value in fields.items():
                if key in allowed:
                    if key == "tags":
                        if isinstance(value, list):
                            e[key] = [t.strip() for t in value if t.strip()]
                    elif key == "type":
                        if value in ("note", "tutorial", "reference"):
                            e[key] = value
                    elif key == "difficulty":
                        if value in ("beginner", "intermediate", "advanced", ""):
                            e[key] = value
                    elif key in ("title", "category"):
                        e[key] = str(value).strip() or e[key]
                    else:
                        e[key] = value
            e["updated_at"] = datetime.now().isoformat(timespec="seconds")
            _save(entries)
            return {"ok": True, "entry": e}
    return {"ok": False, "error": "Eintrag nicht gefunden"}


def delete_entry(entry_id: str) -> Dict:
    entries = _load()
    remaining = [e for e in entries if e.get("id") != entry_id]
    if len(remaining) == len(entries):
        return {"ok": False, "error": "Eintrag nicht gefunden"}
    _save(remaining)
    return {"ok": True}


def get_categories() -> List[str]:
    entries = _load()
    cats = sorted(set(e.get("category", "Allgemein") for e in entries if e.get("category")))
    return cats


def get_tags() -> List[str]:
    entries = _load()
    tag_set = set()
    for e in entries:
        for t in (e.get("tags") or []):
            tag_set.add(t)
    return sorted(tag_set)


def import_entries(items: List[Dict]) -> Dict:
    if not isinstance(items, list):
        return {"ok": False, "error": "Array erwartet"}
    entries = _load()
    now = datetime.now().isoformat(timespec="seconds")
    count = 0
    for item in items:
        entry = {
            "id": str(int(time.time() * 1000)) + "_" + str(count),
            "title": str(item.get("title", "")).strip(),
            "content": str(item.get("content", "")),
            "category": str(item.get("category", "Allgemein")).strip() or "Allgemein",
            "tags": [t.strip() for t in (item.get("tags") or []) if t.strip()],
            "type": item.get("type", "note") if item.get("type") in ("note", "tutorial", "reference") else "note",
            "difficulty": item.get("difficulty", "") if item.get("difficulty") in ("beginner", "intermediate", "advanced") else "",
            "created_at": now,
            "updated_at": now,
        }
        entries.append(entry)
        count += 1
        time.sleep(0.002)
    _save(entries)
    return {"ok": True, "imported": count}


def _seed_godot_tutorials():
    """Seed die Godot-Tutorials, wenn wiki.json leer ist."""
    entries = _load()
    if entries:
        return  # Nur seeden wenn leer

    tutorials = [
        {
            "title": "Godot Editor Grundlagen",
            "category": "Godot",
            "tags": ["Editor", "Grundlagen", "UI"],
            "type": "tutorial",
            "difficulty": "beginner",
            "content": """# Godot Editor Grundlagen

Der Godot-Editor ist das Herzstück der Entwicklungsumgebung. In diesem Tutorial lernst du die wichtigsten Bereiche kennen.

## Die wichtigsten Panels

- **Scene-Tree (links oben)**: Zeigt alle Nodes deiner aktuellen Szene hierarchisch an. Jede Szene ist ein Baum aus Nodes.
- **Inspector (rechts)**: Hier bearbeitest du die Eigenschaften der ausgewählten Node — Position, Größe, Skript-Variablen, Signale.
- **FileSystem (links unten)**: Dein Projekt-Dateisystem. Alle Assets, Skripte, Szenen.
- **Viewport (Mitte)**: Die 2D/3D-Ansicht deiner Szene. Hier platzierst und bearbeitest du Objekte visuell.
- **Bottom Panel**: Output, Debugger, Audio, Animation — kontextabhängig.

## Nützliche Shortcuts

- `F5` — Projekt starten (mit aktueller Szene)
- `F6` — Aktuelle Szene starten
- `F8` — Projekt stoppen
- `Ctrl+S` — Szene speichern
- `Ctrl+Shift+S` — Szene speichern unter

## Projekteinstellungen

Unter **Project → Project Settings** findest du alle globalen Einstellungen:
- Display-Auflösung
- Input Map (Tastatur/Maus/Gamepad)
- Autoload-Skripte (Singletons)
- Rendering-Qualität

## Tipp

Gewöhne dir an, den FileSystem-Reiter zu nutzen statt externe Explorer. Rechtsklick im FileSystem bietet Schnellzugriff auf **New Script**, **New Scene** und **New Folder**.

```gdscript
# Erstes Test-Skript an eine Node anhängen:
extends Node

func _ready():
    print("Hallo Godot!")
```
"""
        },
        {
            "title": "GDScript Syntax — Der Einstieg",
            "category": "Godot",
            "tags": ["GDScript", "Programmierung", "Grundlagen"],
            "type": "tutorial",
            "difficulty": "beginner",
            "content": """# GDScript Syntax — Der Einstieg

GDScript ist Godots eigene, Python-ähnliche Skriptsprache. Sie ist speziell für die Spieleentwicklung optimiert.

## Variablen und Typen

```gdscript
var health: int = 100
var name: String = "Player"
var speed: float = 200.0
var is_alive: bool = true
```

Du kannst Typen weglassen — GDScript ist dynamisch typisiert:
```gdscript
var points = 0  # Automatisch int
```

## Funktionen

```gdscript
func take_damage(amount: int) -> void:
    health -= amount
    if health <= 0:
        die()

func die() -> void:
    queue_free()
```

## Conditions und Loops

```gdscript
if health > 50:
    print("Alles gut!")
elif health > 0:
    print("Vorsicht!")
else:
    print("Game Over")

for i in range(5):
    print(i)

while health > 0:
    health -= 1
```

## Arrays und Dictionaries

```gdscript
var items: Array = ["Schwert", "Schild", "Trank"]
items.append("Helm")

var stats: Dictionary = {
    "strength": 10,
    "agility": 8,
    "intelligence": 5
}
```

## Wichtige Unterschiede zu Python

- `_ready()` statt `__init__()` für Node-Initialisierung
- `_process(delta)` läuft jeden Frame
- Signale statt Callbacks für Ereignisse
- `@export` statt Decorator zum Exposen von Variablen im Inspector

```gdscript
@export var jump_height: float = 300.0
```
"""
        },
        {
            "title": "Nodes & Scenes — Das Baukasten-Prinzip",
            "category": "Godot",
            "tags": ["Nodes", "Scenes", "Architektur"],
            "type": "tutorial",
            "difficulty": "beginner",
            "content": """# Nodes & Scenes — Das Baukasten-Prinzip

Godot basiert auf einem mächtigen Konzept: Alles ist eine **Node**, und jede **Scene** ist eine Zusammenstellung von Nodes.

## Was ist eine Node?

Eine Node ist das fundamentale Bauelement in Godot. Jede Node hat spezifische Fähigkeiten:
- `Sprite2D` — Zeigt ein Bild an
- `CollisionShape2D` — Definiert eine Kollisionsform
- `Area2D` — Erkennt Überlappungen
- `Timer` — Löst nach einer Zeit ein Signal aus
- `AnimationPlayer` — Spielt Animationen ab

## Nodes zu Bäumen zusammenfügen

```gdscript
# Typischer Spieler-Aufbau:
CharacterBody2D (Player)
├── Sprite2D (Grafik)
├── CollisionShape2D (Hitbox)
├── AnimationPlayer (Animationen)
└── Area2D (Interaktion)
    └── CollisionShape2D
```

## Was ist eine Scene?

Eine Scene ist eine gespeicherte Node-Hierarchie (`.tscn`-Datei). Szenen können ineinander verschachtelt werden:

```gdscript
# Hauptszene (main.tscn)
Node2D (World)
├── Player (player.tscn)    # Instanz einer anderen Scene
├── TileMap (Boden)
└── Enemies
    ├── Enemy (enemy.tscn)
    └── Enemy2 (enemy.tscn)
```

## Instanziieren per Code

```gdscript
@export var bullet_scene: PackedScene

func shoot():
    var bullet = bullet_scene.instantiate()
    bullet.position = global_position
    get_parent().add_child(bullet)
```

## Best Practice

- **Eine Scene pro Konzept** — Player, Enemy, Bullet, UI sind eigene Szenen
- **Wiederverwendbarkeit** — Eine gute Scene kannst du mehrfach instanziieren
- **Prefabs vermeiden** — Godot hat keine Prefabs; Scenes erfüllen denselben Zweck
"""
        },
        {
            "title": "Signals — Kommunikation zwischen Nodes",
            "category": "Godot",
            "tags": ["Signals", "Events", "Kommunikation"],
            "type": "tutorial",
            "difficulty": "beginner",
            "content": """# Signals — Kommunikation zwischen Nodes

Signale sind Godots Event-System. Sie ermöglichen lose gekoppelte Kommunikation zwischen Nodes.

## Was sind Signale?

Eine Node sendet ein Signal, andere Nodes können darauf reagieren — ohne direkte Referenz. Das ist das Observer-Pattern, nativ in Godot.

## Eingebaute Signale

Jede Node bringt eigene Signale mit:
```gdscript
# Button wurde gedrückt
$Button.pressed.connect(_on_button_pressed)

# Timer abgelaufen
$Timer.timeout.connect(_on_timeout)

# Body betritt eine Area
$Area2D.body_entered.connect(_on_body_entered)
```

## Eigene Signale definieren

```gdscript
extends Node

signal player_died
signal score_changed(new_score: int)
signal item_collected(item_name: String)

func take_damage(amount: int):
    health -= amount
    if health <= 0:
        player_died.emit()
```

## Verbinden per Code vs. Editor

**Per Code:**
```gdscript
func _ready():
    $Player.player_died.connect(_on_player_died)

func _on_player_died():
    print("Game Over")
```

**Per Editor:**
Im Node-Tab auf Signal klicken → "Connect..." → Ziel-Node und Methode wählen. Das spart Boilerplate.

## Mit Parametern

```gdscript
signal item_collected(item_name: String, value: int)

# Emitten:
item_collected.emit("Goldmünze", 100)

# Empfangen:
func _on_item_collected(name: String, value: int):
    print("Gesammelt: ", name, " +", value, " Punkte")
```

## Tipp: Callables statt Strings

Godot 4 verwendet Callables:
```gdscript
# Godot 4
$Timer.timeout.connect(_on_timeout)  # Callable

# Godot 3 (veraltet)
$Timer.connect("timeout", self, "_on_timeout")  # String
```
"""
        },
        {
            "title": "2D Movement — Spielersteuerung",
            "category": "Godot",
            "tags": ["2D", "Movement", "Input", "CharacterBody"],
            "type": "tutorial",
            "difficulty": "beginner",
            "content": """# 2D Movement — Spielersteuerung

Die Bewegung des Spielers ist eine der ersten Mechaniken, die du implementierst. Hier zeige ich die moderne `CharacterBody2D`-Methode.

## Projekt-Setup

```gdscript
# Input Map einrichten unter Project → Input Map:
# move_left: A / Left Arrow
# move_right: D / Right Arrow
# move_up: W / Up Arrow
# move_down: S / Down Arrow
# jump: Space
```

## Basis-Movement mit CharacterBody2D

```gdscript
extends CharacterBody2D

@export var speed: float = 300.0
@export var jump_velocity: float = -400.0

var gravity: float = ProjectSettings.get_setting("physics/2d/default_gravity")

func _physics_process(delta):
    # Gravity anwenden wenn nicht am Boden
    if not is_on_floor():
        velocity.y += gravity * delta

    # Jump
    if Input.is_action_just_pressed("jump") and is_on_floor():
        velocity.y = jump_velocity

    # Horizontale Bewegung
    var direction = Input.get_axis("move_left", "move_right")
    if direction:
        velocity.x = direction * speed
    else:
        velocity.x = move_toward(velocity.x, 0, speed)

    move_and_slide()
```

## 8-Wege-Movement (Top-Down)

```gdscript
func _physics_process(delta):
    var input_dir = Input.get_vector("move_left", "move_right", "move_up", "move_down")
    velocity = input_dir * speed
    move_and_slide()
```

## Animationen an die Bewegung koppeln

```gdscript
@onready var anim = $AnimationPlayer

func _physics_process(delta):
    # ... movement code ...
    
    if velocity.length() > 10:
        anim.play("walk")
    else:
        anim.play("idle")
```

## Plattformer vs. Top-Down

- **Plattformer**: Gravity + Jump, `is_on_floor()` prüfen
- **Top-Down**: 8-Wege-Input, keine Gravity, `Input.get_vector()`

## Physics Process vs. Process

- `_physics_process(delta)` — konsistentes Delta (60fps Physik-Ticks), ideal für Bewegung
- `_process(delta)` — visueller Frame (varriabel), für Animationen/UI
"""
        },
        {
            "title": "Physics & Collisions — Kollisionserkennung",
            "category": "Godot",
            "tags": ["Physics", "Collisions", "2D"],
            "type": "tutorial",
            "difficulty": "intermediate",
            "content": """# Physics & Collisions — Kollisionserkennung

Godot bietet drei Haupttypen für Physik und Kollisionen. Hier lernst du, wann du welchen verwendest.

## Die drei Physik-Bodies

| Typ | Verwendung |
|-----|-----------|
| `CharacterBody2D` | Spieler-gesteuerte Bewegung (kein Rigidbody-Verhalten) |
| `RigidBody2D` | Physik-simulierte Objekte (Schwerkraft, Kräfte, Stöße) |
| `StaticBody2D` | Unbewegliche Hindernisse (Wände, Boden) |

## CharacterBody2D — Kontrollierte Bewegung

```gdscript
extends CharacterBody2D

func _physics_process(delta):
    move_and_slide()
    
    # Kollisionen auswerten:
    for i in get_slide_collision_count():
        var collision = get_slide_collision(i)
        var collider = collision.get_collider()
        
        if collider.is_in_group("enemies"):
            take_damage(10)
```

## Area2D — Überlappung erkennen

```gdscript
extends Area2D

func _ready():
    body_entered.connect(_on_body_entered)
    area_entered.connect(_on_area_entered)

func _on_body_entered(body):
    if body.is_in_group("player"):
        print("Player entered!")

func _on_area_entered(area):
    if area.is_in_group("pickup"):
        area.queue_free()  # Item einsammeln
```

## RigidBody2D — Physik-Simulation

```gdscript
extends RigidBody2D

func _ready():
    # Wurf in eine Richtung
    apply_impulse(Vector2(200, -300))
    # Oder zentral:
    apply_central_impulse(Vector2(200, -300))

func _integrate_forces(state):
    # Custom Physik-Logik
    linear_velocity.x = clamp(linear_velocity.x, -400, 400)
```

## Collision Layers & Masks

- **Layer**: Auf welchen Ebenen liegt dieses Objekt?
- **Mask**: Welche Ebenen scannt dieses Objekt?

Beispiel: Player hat Layer 1, Mask 1+2 (Wände + Gegner). Gegner hat Layer 2, Mask 1 (nur Player).

## Groups verwenden

```gdscript
# Im Editor: Node → Groups → "enemies" hinzufügen
# Per Code:
add_to_group("enemies")

# Prüfen:
if body.is_in_group("enemies"):
    die()
```
"""
        },
        {
            "title": "UI & Controls — Menüs und HUD",
            "category": "Godot",
            "tags": ["UI", "Controls", "HUD", "Theme"],
            "type": "tutorial",
            "difficulty": "beginner",
            "content": """# UI & Controls — Menüs und HUD

Godots Control-Nodes sind ein vollständiges UI-System mit Themes, Containern und Scaling.

## Grundlegende Control-Nodes

- **Label** — Text anzeigen
- **Button** — Klickbare Schaltfläche
- **LineEdit** — Eingabefeld
- **TextureRect** — Bild anzeigen
- **ProgressBar** — Fortschrittsbalken
- **ColorRect** — Farbige Fläche (Hintergründe)
- **Panel** — Container mit Style

## Layout mit Containern

```gdscript
# Typische HUD-Struktur:
CanvasLayer (HUD)
└── MarginContainer
    └── HBoxContainer
        ├── Label ("Score: 0")
        ├── Spacer (Control mit Expand)
        └── TextureRect (Health Icon)
```

## Themes für konsistentes Styling

Themes definieren das Aussehen aller UI-Elemente. Erstelle ein Theme:
1. Rechtsklick im FileSystem → **New Resource → Theme**
2. Theme auswählen → Im Inspector Styles für Nodes definieren
3. Theme im Projekt unter **Project Settings → GUI → Theme** setzen

## Signale von UI-Elementen

```gdscript
extends Control

func _ready():
    $PlayButton.pressed.connect(_on_play_pressed)
    $OptionsButton.pressed.connect(_on_options_pressed)
    $QuitButton.pressed.connect(_on_quit_pressed)

func _on_play_pressed():
    get_tree().change_scene_to_file("res://scenes/game.tscn")

func _on_options_pressed():
    $OptionsMenu.show()

func _on_quit_pressed():
    get_tree().quit()
```

## Anchors & Margins

Jede Control-Node hat Anker. Im Editor ziehst du die grünen Punkte um Elemente relativ zum Parent zu positionieren.
- **Full Rect**: Deckt das ganze Parent ab
- **Center**: Bleibt zentriert
- **Custom**: Manuelle Positionierung

## Dynamische UI-Updates

```gdscript
extends Label

var score: int = 0

func add_points(points: int):
    score += points
    text = "Score: %d" % score
```
"""
        },
        {
            "title": "Animationen mit AnimationPlayer",
            "category": "Godot",
            "tags": ["Animation", "AnimationPlayer", "Tween"],
            "type": "tutorial",
            "difficulty": "beginner",
            "content": """# Animationen mit AnimationPlayer

Der `AnimationPlayer` ist Godots mächtigstes Werkzeug für Animationen. Er kann fast jede Property animieren.

## Grundaufbau

Jeder `AnimationPlayer` verwaltet mehrere **Animationen**. Jede Animation besteht aus **Tracks**, die jeweils eine Property über die Zeit verändern.

## Eine einfache Animation erstellen

1. `AnimationPlayer` als Child hinzufügen
2. Im Bottom Panel → **Animation** Tab
3. "New Animation" → Name vergeben (z.B. "walk")
4. Länge einstellen (z.B. 0.6s)
5. Property auswählen → Keyframe setzen (Schlüssel-Icon)

## Keyframe-Arten

- **Position**: Bewege Nodes über den Bildschirm
- **Rotation**: Drehe Objekte
- **Scale**: Vergrößern/Verkleinern
- **Modulate**: Farbe/Transparenz ändern
- **Frame**: Spritesheet-Frames (Sprite-Animation)
- **Method Call**: Funktionen zu bestimmten Zeitpunkten aufrufen

## Per Code steuern

```gdscript
@onready var anim = $AnimationPlayer

func _ready():
    # Looping-Animation starten
    anim.play("idle")
    
    # Einmal abspielen
    anim.play("attack")
    await anim.animation_finished
    anim.play("idle")

func walk():
    anim.play("walk")

func jump():
    anim.play("jump")
```

## Tweens (Alternative für Code-Animationen)

```gdscript
var tween = create_tween()
tween.tween_property($Sprite, "position", Vector2(200, 0), 1.0)
tween.tween_property($Sprite, "modulate:a", 0.0, 0.5)
tween.tween_callback(queue_free)

# Easing:
tween.set_ease(Tween.EASE_OUT)
tween.set_trans(Tween.TRANS_BOUNCE)
```

## AnimationTree für komplexe State Machines

Bei komplexen Charakteranimationen (Blend Spaces, State Machines) nutze `AnimationTree` statt `AnimationPlayer`. Ideal für 2D- und 3D-Charaktere mit vielen Zuständen (idle, walk, run, jump, fall).
"""
        },
        {
            "title": "Tilemaps — Level-Design mit Kacheln",
            "category": "Godot",
            "tags": ["Tilemap", "Level-Design", "2D", "Tileset"],
            "type": "tutorial",
            "difficulty": "intermediate",
            "content": """# Tilemaps — Level-Design mit Kacheln

Tilemaps sind das effizienteste Werkzeug für 2D-Level-Design. Eine Tilemap rendert Hunderte Kacheln als ein optimiertes Mesh.

## Tilemap anlegen

1. **TileMap-Node** zur Szene hinzufügen
2. Neues **TileSet** erstellen oder importieren
3. TileSet im Inspector zuweisen
4. Im Bottom Panel → **TileMap** Tab

## TileSet konfigurieren

- **Atlas-Textur** importieren (dein Spritesheet)
- **Autotiling** aktivieren für automatische Übergänge
- **Physics-Layer** hinzufügen: `Collision` → Polygon zeichnen
- **Navigation-Layer**: Für Pathfinding
- **Terrain-Sets**: Definiere, wie Kacheln ineinander übergehen

## Terrains & Autotiling

```gdscript
# Godot 4 Terrain-Setup:
# 1. Im TileSet → Terrains Tab
# 2. Terrain-Set "Dirt" erstellen
# 3. "Dirt" und "Grass" als Terrains hinzufügen
# 4. Jede Kachel einem Terrain zuweisen
# 5. Autotiling-Regeln konfigurieren
```

## Per Code auf Tilemap zugreifen

```gdscript
@onready var tilemap = $TileMap

func get_tile_at(pos: Vector2) -> Vector2i:
    var map_pos = tilemap.local_to_map(pos)
    return tilemap.get_cell_atlas_coords(0, map_pos)

func set_tile(map_pos: Vector2i, atlas_coords: Vector2i):
    tilemap.set_cell(0, map_pos, 0, atlas_coords)

func remove_tile(map_pos: Vector2i):
    tilemap.set_cell(0, map_pos, -1)  # -1 = keine Kachel
```

## Prozedurale Tilemap-Generierung

```gdscript
func generate_ground(width: int, height: int):
    for x in range(width):
        for y in range(height):
            if y > height / 2:
                tilemap.set_cell(0, Vector2i(x, y), 0, Vector2i(1, 0))  # Dirt
            else:
                tilemap.set_cell(0, Vector2i(x, y), 0, Vector2i(0, 0))  # Grass
```

## Performance-Tipps

- Eine TileMap ist performanter als Hunderte einzelne Sprites
- Nutze **Layers** (0, 1, 2...) für verschiedene Ebenen (Boden, Dekoration, Collision)
- **YSort** aktivieren für korrekte Tiefensortierung
"""
        },
        {
            "title": "Audio — Soundeffekte und Musik",
            "category": "Godot",
            "tags": ["Audio", "Sound", "Music", "AudioStreamPlayer"],
            "type": "tutorial",
            "difficulty": "beginner",
            "content": """# Audio — Soundeffekte und Musik

Godot unterstützt WAV, OGG und MP3. Das Audio-System ist einfach, aber leistungsfähig.

## Audio-Player-Typen

- **AudioStreamPlayer** — Für Soundeffekte (positionierbar in 2D/3D)
- **AudioStreamPlayer2D** — Positionsabhängig (lauter/leiser je nach Distanz)
- **AudioStreamPlayer3D** — 3D-Raumklang
- **AudioStreamPlayer (Autoload)** — Globale Musik (als Singleton)

## Soundeffekte abspielen

```gdscript
# Direkt von einer Node:
$AudioStreamPlayer2D.play()

# Mit Pitch-Variation für Abwechslung:
func play_random_sound(player: AudioStreamPlayer2D):
    player.pitch_scale = randf_range(0.9, 1.1)
    player.play()
```

## Musik-Manager (Autoload Singleton)

```gdscript
# audio_manager.gd als Autoload registrieren
extends Node

var music_player: AudioStreamPlayer

func _ready():
    music_player = AudioStreamPlayer.new()
    add_child(music_player)
    music_player.bus = "Music"

func play_music(stream: AudioStream, fade_in: float = 1.0):
    music_player.stream = stream
    music_player.play()

func stop_music(fade_out: float = 1.0):
    music_player.stop()

func set_volume(linear: float):
    music_player.volume_db = linear_to_db(linear)
```

## Audio-Busse

Unter **Audio** Tab im Bottom Panel kannst du Busse anlegen:
- **Master** — Gesamtlautstärke
- **Music** — Nur Musik
- **SFX** — Nur Soundeffekte
- **Voice** — Sprachausgabe

Jeder Bus kann eigene Effekte haben: Reverb, EQ, Compressor, Delay.

## AudioStreamPlayer2D für räumlichen Sound

```gdscript
extends AudioStreamPlayer2D

func _ready():
    max_distance = 400  # Maximale Hörweite
    attenuation = 0.8   # Lautstärkeabfall über Distanz
    play()
```

## Soundeffekte poolen

```gdscript
# Für viele gleichzeitige Sounds (Schüsse, Explosionen):
var audio_pool: Array[AudioStreamPlayer2D] = []

func get_player() -> AudioStreamPlayer2D:
    for p in audio_pool:
        if not p.playing:
            return p
    var p = AudioStreamPlayer2D.new()
    add_child(p)
    audio_pool.append(p)
    return p
```
"""
        },
        {
            "title": "Saving & Loading — Spielstände speichern",
            "category": "Godot",
            "tags": ["Save", "Load", "JSON", "FileAccess"],
            "type": "tutorial",
            "difficulty": "intermediate",
            "content": """# Saving & Loading — Spielstände speichern

Speichern ist essentiell für jedes Spiel. Godot bietet `FileAccess` und `ConfigFile` für persistente Daten.

## Speicherort

```gdscript
# User-spezifischer Pfad (funktioniert auf allen Plattformen):
var save_path = "user://savegame.json"
```

## JSON-basiertes Save-System

```gdscript
class_name SaveManager
extends Node

const SAVE_PATH = "user://savegame.json"

func save_game(data: Dictionary) -> void:
    var file = FileAccess.open(SAVE_PATH, FileAccess.WRITE)
    if file == null:
        push_error("Save failed: ", FileAccess.get_open_error())
        return
    file.store_string(JSON.stringify(data, "\t"))
    file.close()

func load_game() -> Dictionary:
    if not FileAccess.file_exists(SAVE_PATH):
        return {}  # Leeres Dictionary = kein Save
    var file = FileAccess.open(SAVE_PATH, FileAccess.READ)
    if file == null:
        return {}
    var content = file.get_as_text()
    file.close()
    var result = JSON.parse_string(content)
    return result if result is Dictionary else {}

func delete_save() -> void:
    if FileAccess.file_exists(SAVE_PATH):
        DirAccess.remove_absolute(SAVE_PATH)
```

## Spielstand-Struktur

```gdscript
func create_save_data() -> Dictionary:
    return {
        "player": {
            "position_x": $Player.global_position.x,
            "position_y": $Player.global_position.y,
            "health": $Player.health,
            "level": $Player.level,
        },
        "inventory": $Player.inventory.serialize(),
        "world": {
            "scene": get_tree().current_scene.scene_file_path,
            "defeated_enemies": defeated_enemies,
            "collected_items": collected_items,
        },
        "meta": {
            "playtime": total_playtime,
            "save_date": Time.get_datetime_string_from_system(),
        }
    }
```

## Autosave / Checkpoints

```gdscript
func _ready():
    # Alle 60 Sekunden autosaven
    var timer = Timer.new()
    timer.wait_time = 60.0
    timer.timeout.connect(_autosave)
    add_child(timer)
    timer.start()

func _autosave():
    save_game(create_save_data())
    print("Autosaved!")
```

## Resource-basiertes Speichern

Für große Datenmengen (z.B. prozedurale Welten) ist `ResourceSaver` performanter:

```gdscript
# Statt JSON:
var save_resource = SaveResource.new()
save_resource.data = my_large_array
ResourceSaver.save(save_resource, "user://save.res")
```
"""
        },
        {
            "title": "Particle Effects mit GPUParticles2D",
            "category": "Godot",
            "tags": ["Particles", "VFX", "GPU"],
            "type": "tutorial",
            "difficulty": "intermediate",
            "content": """# Particle Effects mit GPUParticles2D

Partikel-Effekte machen dein Spiel lebendig. Godots GPU-Partikelsystem ist schnell und flexibel.

## GPUParticles2D Grundsetup

1. `GPUParticles2D`-Node zur Szene hinzufügen
2. Neues **ParticleProcessMaterial** (oder ShaderMaterial) zuweisen
3. **Texture** für die Partikel setzen (z.B. Kreis, Stern, Rauch)
4. **Amount** (Anzahl) und **Lifetime** (Lebensdauer) einstellen

## Wichtige Parameter

| Parameter | Bedeutung |
|-----------|-----------|
| `amount` | Anzahl Partikel |
| `lifetime` | Lebensdauer in Sekunden |
| `emitting` | Partikel aktiv/aus |
| `one_shot` | Einmalig emittieren (Explosionen) |
| `explosiveness` | 0 = kontinuierlich, 1 = alles auf einmal |
| `speed_scale` | Geschwindigkeits-Multiplikator |
| `gravity` | Gravitations-Vektor |

## Common Effects

```gdscript
# Explosion:
func create_explosion(pos: Vector2):
    $ExplosionParticles.global_position = pos
    $ExplosionParticles.one_shot = true
    $ExplosionParticles.explosiveness = 1.0
    $ExplosionParticles.emitting = true

# Trail / Rauch:
func enable_trail(enable: bool):
    $TrailParticles.emitting = enable
```

## ParticleProcessMaterial

```gdscript
# Per Code konfigurieren:
var mat = $GPUParticles2D.process_material as ParticleProcessMaterial
mat.direction = Vector3(0, -1, 0)  # Nach oben
mat.spread = 45.0                  # 45° Streuung
mat.initial_velocity_min = 100.0
mat.initial_velocity_max = 200.0
mat.gravity = Vector3(0, 98, 0)
mat.scale_min = 0.5
mat.scale_max = 1.5

# Farbe über Lebenszeit:
mat.color_ramp = Gradient.new()
# ... Gradient-Punkte setzen
```

## Performance-Tipps

- **Max 500-1000 Partikel** pro System für Mobile
- **Atlas-Textur** nutzen (mehrere Varianten in einem Bild)
- **One-shot** für seltene Effekte, **continuous** für dauerhafte
- **Visibility-AABB** setzen um außerhalb des Bildschirms zu cullen

## Häufige Anwendungen

- **Explosionen**: one_shot, explosiveness=1, kurze lifetime, nach außen gerichtet
- **Regen/Schnee**: große amount, lange lifetime, gravity nach unten, spread=gering
- **Feuer**: kontinuierlich, gravity nach oben, scale abnehmend, modulate fade-out
- **Sternenstaub**: spread=360°, langsam, keine gravity, kleine scale
"""
        },
        {
            "title": "Shader Basics in Godot",
            "category": "Godot",
            "tags": ["Shader", "GLSL", "Visual", "Rendering"],
            "type": "tutorial",
            "difficulty": "advanced",
            "content": """# Shader Basics in Godot

Shader laufen direkt auf der GPU und ermöglichen visuelle Effekte, die mit normalen Nodes nicht möglich sind.

## Shader-Typen

- **CanvasItem Shader** — Für 2D-Nodes (ColorRect, Sprite, Control)
- **Spatial Shader** — Für 3D-Meshes
- **Particle Shader** — Für Partikelsysteme
- **Sky Shader** — Für Himmelshintergründe

## Einfacher CanvasItem Shader

```glsl
shader_type canvas_item;

uniform vec4 tint_color : source_color = vec4(1.0, 1.0, 1.0, 1.0);
uniform float time_scale = 1.0;

void fragment() {
    // Original-Texturfarbe
    vec4 color = texture(TEXTURE, UV);
    
    // Pulsierende Helligkeit
    float pulse = sin(TIME * time_scale) * 0.3 + 0.7;
    
    COLOR = color * tint_color * pulse;
}
```

## Outlines (Sprite-Umriss)

```glsl
shader_type canvas_item;

uniform vec4 outline_color : source_color = vec4(0.0, 0.0, 0.0, 1.0);
uniform float outline_width = 1.0;

void fragment() {
    vec4 color = texture(TEXTURE, UV);
    
    // Pixel um uns herum sampeln
    vec2 pixel_size = 1.0 / vec2(textureSize(TEXTURE, 0));
    
    float alpha_left = texture(TEXTURE, UV + vec2(-pixel_size.x * outline_width, 0.0)).a;
    float alpha_right = texture(TEXTURE, UV + vec2(pixel_size.x * outline_width, 0.0)).a;
    float alpha_up = texture(TEXTURE, UV + vec2(0.0, -pixel_size.y * outline_width)).a;
    float alpha_down = texture(TEXTURE, UV + vec2(0.0, pixel_size.y * outline_width)).a;
    
    float outline_alpha = max(max(alpha_left, alpha_right), max(alpha_up, alpha_down));
    float inside = color.a;
    float outline = outline_alpha - inside;
    
    COLOR = mix(color, outline_color, outline);
    COLOR.a = max(inside, outline * outline_color.a);
}
```

## Dissolve-Effekt

```glsl
shader_type canvas_item;

uniform float dissolve_amount : hint_range(0.0, 1.0) = 0.0;
uniform sampler2D noise_texture;

void fragment() {
    vec4 color = texture(TEXTURE, UV);
    float noise = texture(noise_texture, UV).r;
    
    float edge = 0.05;
    float alpha = smoothstep(dissolve_amount - edge, dissolve_amount + edge, noise);
    
    COLOR = color;
    COLOR.a *= alpha;
}
```

## Nützliche Built-ins

- `TIME` — Zeit in Sekunden seit Spielstart
- `UV` — Textur-Koordinaten (0-1)
- `TEXTURE` — Die Node-Textur
- `COLOR` — Ausgabe-Farbe
- `SCREEN_TEXTURE` — Der aktuelle Framebuffer (für Screen-Effekte)
- `VERTEX` — Vertex-Position (vertex shader)
"""
        },
        {
            "title": "Web Export — Dein Spiel im Browser",
            "category": "Godot",
            "tags": ["Web", "Export", "HTML5", "Browser"],
            "type": "tutorial",
            "difficulty": "intermediate",
            "content": """# Web Export — Dein Spiel im Browser

Der HTML5-Export macht dein Godot-Spiel im Browser spielbar — auf Desktop und Mobile.

## Voraussetzungen

1. Godot mit Web-Export-Templates (Download von godotengine.org)
2. Im Editor: **Editor → Manage Export Templates**
3. Ggf. separate Web-Templates installieren

## Export-Konfiguration

**Project → Export → Add → Web**

Wichtige Einstellungen:
- **Head Include**: Custom HTML im `<head>`
- **Progressive Web App**: Aktivieren für "Add to Home Screen"
- **Extensions**: Nur notwendige Features aktivieren (reduziert WASM-Größe)

## Empfohlene Einstellungen

```ini
[html5]
# Größere Textur-Kompression = kleinere Download-Größe
vram_texture_compression/for_desktop=true
vram_texture_compression/for_mobile=false

# Threads deaktivieren für bessere Kompatibilität
threads/enabled=false

# GDNative/GDExtension funktioniert nicht im Web
# Nur GDScript oder C# (mit Einschränkungen)
```

## CORS und Hosting

Dein Webserver muss SharedArrayBuffer unterstützen:

```nginx
# nginx config
location / {
    add_header Cross-Origin-Opener-Policy "same-origin";
    add_header Cross-Origin-Embedder-Policy "require-corp";
}
```

Oder nutze `coi-serviceworker.js`:
```html
<script src="coi-serviceworker.js"></script>
```

## Einschränkungen des Web-Exports

- **Kein FileAccess zu `user://`** — Nutze JavaScriptBridge oder LocalStorage
- **Keine Threads** (optional, aber instabil)
- **Weniger Shader-Features** als Desktop
- **Kein C#** (nur GDScript)
- **Audio** kann verzögert starten (User-Interaktion erforderlich)

## Mobile Web optimieren

```gdscript
func _ready():
    if OS.get_name() == "Web":
        # Touch-Steuerung aktivieren
        $TouchControls.show()
        # Auflösung anpassen
        get_window().size = Vector2i(720, 1280)
        # Performance-Modus
        Engine.max_fps = 30
```

## Responsive Canvas

```gdscript
# Auto-Resize im Browser:
func _ready():
    get_tree().root.size_changed.connect(_on_window_resize)

func _on_window_resize():
    var viewport_size = get_viewport().get_visible_rect().size
    # Skaliere dein Spiel entsprechend
```
"""
        },
        {
            "title": "Mobile Optimierung für Godot-Spiele",
            "category": "Godot",
            "tags": ["Mobile", "Performance", "Optimierung", "Android", "iOS"],
            "type": "tutorial",
            "difficulty": "advanced",
            "content": """# Mobile Optimierung für Godot-Spiele

Mobile Geräte haben weniger Leistung als Desktop-PCs. Diese Optimierungen machen dein Spiel flüssig.

## Rendering-Optimierungen

```gdscript
# Project Settings für Mobile:
[rendering]
# Niedrigere Auflösung rendern, dann hochskalieren:
renderer/rendering_method=gl_compatibility  # Kompatibler als Vulkan

[display]
window/stretch/mode=canvas_items  # Oder viewport
window/stretch/aspect=expand
```

## Draw Calls reduzieren

- **Atlas-Texturen** statt vieler Einzeltexturen
- **TileMaps** statt einzelner Sprites
- **MultiMeshInstance2D** für viele identische Objekte
- **Batching** — Nodes mit gleichem Material werden automatisch gebatched

## MultiMeshInstance2D

```gdscript
extends MultiMeshInstance2D

func setup_grass(count: int):
    multimesh = MultiMesh.new()
    multimesh.transform_format = MultiMesh.TRANSFORM_2D
    multimesh.instance_count = count
    multimesh.mesh = QuadMesh.new()  # Oder dein Custom-Mesh
    
    for i in range(count):
        var t = Transform2D(0, Vector2(randf_range(0, 1000), randf_range(0, 600)))
        multimesh.set_instance_transform_2d(i, t)
```

## Mobile-spezifische Anpassungen

```gdscript
func _ready():
    if OS.get_name() in ["Android", "iOS"]:
        # Auflösung begrenzen
        get_window().size = Vector2i(720, 1280)
        
        # FPS auf 30 begrenzen
        Engine.max_fps = 30
        
        # Partikel reduzieren
        for particles in get_tree().get_nodes_in_group("particles"):
            particles.amount = int(particles.amount * 0.5)
        
        # Keine Schatten (2D)
        # Keine Post-Processing-Effekte
```

## Input für Touch

```gdscript
# Virtueller Joystick statt Keyboard
extends Control

var joystick_active = false
var joystick_vector = Vector2.ZERO

func _input(event):
    if event is InputEventScreenTouch:
        joystick_active = event.pressed
    if event is InputEventScreenDrag and joystick_active:
        joystick_vector = (event.position - joystick_center).limit_length(radius)
```

## Speicher-Optimierung

- Texturen: Max 1024x1024, keine 4K-Texturen
- Audio: OGG Vorbis statt WAV, Mono statt Stereo
- Assets lazy laden mit `ResourceLoader.load()`
- Szenen nur laden wenn gebraucht

```gdscript
func load_level(path: String):
    var loader = ResourceLoader.load_threaded_request(path)
    # ... später:
    var scene = ResourceLoader.load_threaded_get(path)
    get_tree().change_scene_to_packed(scene)
```
"""
        },
        {
            "title": "Multiplayer Grundlagen mit ENet",
            "category": "Godot",
            "tags": ["Multiplayer", "Networking", "ENet", "RPC"],
            "type": "tutorial",
            "difficulty": "advanced",
            "content": """# Multiplayer Grundlagen mit ENet

Godot hat ein eingebautes Multiplayer-System auf Basis von ENet (UDP-basiert, zuverlässig).

## Grundkonzepte

- **Authority**: Wer kontrolliert eine Node (Server oder Client)
- **RPC** (Remote Procedure Call): Funktion auf anderen Peers aufrufen
- **MultiplayerSpawner**: Nodes automatisch über Netzwerk synchronisieren
- **MultiplayerSynchronizer**: Properties automatisch synchronisieren

## Server starten

```gdscript
extends Node

const PORT = 4242

func host_game():
    var peer = ENetMultiplayerPeer.new()
    peer.create_server(PORT, 4)  # Max 4 Clients
    multiplayer.multiplayer_peer = peer
    print("Server gestartet auf Port ", PORT)

func join_game(address: String):
    var peer = ENetMultiplayerPeer.new()
    peer.create_client(address, PORT)
    multiplayer.multiplayer_peer = peer
    print("Verbinde zu ", address)
```

## RPC — Remote Procedure Calls

```gdscript
# Auf dem Server:
@rpc("any_peer", "call_local")
func send_message(text: String):
    print("Nachricht: ", text)
    # An alle anderen weiterleiten:
    rpc("receive_message", text)

@rpc("authority", "call_remote")
func receive_message(text: String):
    $ChatLog.text += text + "\n"
```

RPC-Annotations:
- `@rpc("authority")` — Nur der Server (Authority) darf aufrufen
- `@rpc("any_peer")` — Jeder Peer darf aufrufen
- `@rpc("call_local")` — Wird auch lokal ausgeführt
- `@rpc("call_remote")` — Nur auf Remote-Peers

## MultiplayerSpawner

```gdscript
# Im Editor:
# 1. MultiplayerSpawner zur Szene hinzufügen
# 2. spawn_path = NodePath zu spawnenden Kindern
# 3. Auto-Spawn-Liste konfigurieren

func spawn_player(id: int):
    var player = player_scene.instantiate()
    player.name = str(id)
    $Spawner.add_child(player, true)  # true = wird gespawnt
```

## MultiplayerSynchronizer

```gdscript
extends CharacterBody2D

func _ready():
    # Wenn wir nicht die Authority sind, nur replizieren
    if not is_multiplayer_authority():
        set_physics_process(false)

func _physics_process(delta):
    if not is_multiplayer_authority():
        return
    # Movement-Logik nur auf dem autoritativen Peer
    # MultiplayerSynchronizer repliziert position automatisch
```

## Wichtige Signale

```gdscript
func _ready():
    multiplayer.peer_connected.connect(_on_player_connected)
    multiplayer.peer_disconnected.connect(_on_player_disconnected)
    multiplayer.connected_to_server.connect(_on_connected_ok)
    multiplayer.connection_failed.connect(_on_connection_failed)
```
"""
        },
        {
            "title": "Pathfinding mit Navigation2D",
            "category": "Godot",
            "tags": ["Pathfinding", "AI", "Navigation", "A*"],
            "type": "tutorial",
            "difficulty": "intermediate",
            "content": """# Pathfinding mit Navigation2D

Godots Navigation-System berechnet automatisch Wege um Hindernisse — perfekt für Gegner-KI.

## Setup

```gdscript
# Szenen-Struktur:
NavigationRegion2D
├── NavigationPolygon (gezeichnete begehbare Fläche)
└── (Deine Tilemap/Welt)
```

1. **NavigationRegion2D** zur Szene hinzufügen
2. **NavigationPolygon** erstellen und begehbare Fläche zeichnen
3. Optional: `NavigationObstacle2D` für bewegliche Hindernisse

## Einfaches Pathfinding

```gdscript
extends CharacterBody2D

@onready var nav_agent = $NavigationAgent2D
var move_speed: float = 200.0

func move_to(target: Vector2):
    nav_agent.target_position = target

func _physics_process(delta):
    if nav_agent.is_navigation_finished():
        return
    
    var next_pos = nav_agent.get_next_path_position()
    var direction = global_position.direction_to(next_pos)
    velocity = direction * move_speed
    move_and_slide()
```

## Gegner-KI mit Pathfinding

```gdscript
extends CharacterBody2D

@onready var nav_agent = $NavigationAgent2D
@export var detection_range: float = 300.0
@export var move_speed: float = 150.0

var player: CharacterBody2D

func _ready():
    player = get_tree().get_first_node_in_group("player")
    # Pathfinding-Timer (nicht jeden Frame updaten)
    var timer = Timer.new()
    timer.wait_time = 0.2
    timer.timeout.connect(_update_path)
    add_child(timer)
    timer.start()

func _update_path():
    if not player:
        return
    var dist = global_position.distance_to(player.global_position)
    if dist < detection_range:
        nav_agent.target_position = player.global_position

func _physics_process(delta):
    if nav_agent.is_navigation_finished():
        velocity = Vector2.ZERO
        return
    var next = nav_agent.get_next_path_position()
    velocity = global_position.direction_to(next) * move_speed
    move_and_slide()
```

## Navigation mit TileMaps

Bei TileMaps kannst du den Navigation-Layer direkt im TileSet definieren:
1. TileSet öffnen → **Navigation** Tab
2. Für jede Kachel Navigation-Polygon zeichnen
3. `TileMap` + `NavigationRegion2D` kombiniert = automatische Navigation

## Optimierung

- **Nicht jeden Frame** den Pfad updaten (Timer mit 0.1-0.3s)
- **Pathfinding pausieren**, wenn Spieler außer Reichweite
- Mehrere **NavigationRegions** für große Welten (Chunking)
- `navigation_finished` prüfen bevor neue Ziele gesetzt werden
"""
        },
        {
            "title": "State Machines für Charakter-KI",
            "category": "Godot",
            "tags": ["State Machine", "AI", "Enemy", "FSM"],
            "type": "tutorial",
            "difficulty": "intermediate",
            "content": """# State Machines für Charakter-KI

Eine Finite State Machine (FSM) organisiert das Verhalten von Charakteren in klare Zustände.

## Warum State Machines?

Ohne FSM wird dein Code schnell ein Chaos aus if-else-Abfragen:
```gdscript
# Schlecht — unübersichtlich:
if is_attacking:
    ...
elif is_patrolling:
    ...
elif is_chasing:
    ...
```

## Basis-Implementierung

```gdscript
class_name StateMachine
extends Node

var current_state: State
var states: Dictionary = {}

func _ready():
    for child in get_children():
        if child is State:
            states[child.name.to_lower()] = child
            child.state_machine = self

func change_state(new_state: String):
    if current_state:
        current_state.exit()
    current_state = states.get(new_state)
    if current_state:
        current_state.enter()

func _physics_process(delta):
    if current_state:
        current_state.physics_update(delta)

func _process(delta):
    if current_state:
        current_state.update(delta)
```

## State-Klasse

```gdscript
class_name State
extends Node

var state_machine: StateMachine

func enter(): pass
func exit(): pass
func update(delta: float): pass
func physics_update(delta: float): pass
```

## Beispiel: Gegner-Zustände

```gdscript
# enemy_states/idle.gd
class_name IdleState
extends State

@export var patrol_speed: float = 50.0

func enter():
    pass

func physics_update(delta):
    # Nach kurzer Zeit zu Patrol wechseln
    await get_tree().create_timer(2.0).timeout
    state_machine.change_state("patrol")

# enemy_states/patrol.gd
class_name PatrolState
extends State

var waypoints: Array[Vector2]
var current_index: int = 0

func enter():
    waypoints = get_parent().waypoints

func physics_update(delta):
    # Zwischen Wegpunkten bewegen
    var target = waypoints[current_index]
    # ... Bewegung ...
    if global_position.distance_to(target) < 10:
        current_index = (current_index + 1) % waypoints.size()

# enemy_states/chase.gd
class_name ChaseState
extends State

func physics_update(delta):
    var player = get_tree().get_first_node_in_group("player")
    if player:
        # Zum Spieler bewegen
        nav_agent.target_position = player.global_position
    else:
        state_machine.change_state("patrol")

# enemy_states/attack.gd
class_name AttackState
extends State

func enter():
    # Angriff starten
    animation_player.play("attack")
    await animation_player.animation_finished
    state_machine.change_state("chase")
```

## Szenen-Struktur

```
Enemy (CharacterBody2D)
├── Sprite2D
├── AnimationPlayer
├── StateMachine
│   ├── IdleState
│   ├── PatrolState
│   ├── ChaseState
│   └── AttackState
└── DetectionArea (Area2D)
```

## Transition Logic

Wechsel per Signal oder Distanz-Check:
```gdscript
func _on_detection_area_body_entered(body):
    if body.is_in_group("player"):
        state_machine.change_state("chase")
```
"""
        },
        {
            "title": "Inventory System — ein flexibles Inventar",
            "category": "Godot",
            "tags": ["Inventory", "Items", "RPG", "Data"],
            "type": "tutorial",
            "difficulty": "intermediate",
            "content": """# Inventory System — ein flexibles Inventar

Ein Inventar-System besteht aus Daten (Resources) und UI (Control-Nodes).

## Item als Resource

```gdscript
# item.gd
class_name Item
extends Resource

@export var id: String = ""
@export var name: String = "Unbekannt"
@export var description: String = ""
@export var icon: Texture2D
@export var stackable: bool = true
@export var max_stack: int = 99
@export var category: String = "misc"  # weapon, armor, consumable, misc

# Item-Datenbank:
# items/sword.tres
# items/potion.tres
```

## Inventory-Manager (Singleton)

```gdscript
# inventory_manager.gd — als Autoload registrieren
extends Node

signal inventory_changed

var slots: Array[Dictionary] = []
const MAX_SLOTS = 30

func _ready():
    for i in range(MAX_SLOTS):
        slots.append({"item": null, "count": 0})

func add_item(item: Item, count: int = 1) -> bool:
    # Zuerst existierende Stacks auffüllen
    if item.stackable:
        for slot in slots:
            if slot.item == item and slot.count < item.max_stack:
                var space = item.max_stack - slot.count
                var to_add = min(count, space)
                slot.count += to_add
                count -= to_add
                if count <= 0:
                    inventory_changed.emit()
                    return true
    
    # Neue Slots belegen
    for slot in slots:
        if slot.item == null:
            slot.item = item
            slot.count = min(count, item.max_stack)
            inventory_changed.emit()
            return true
    
    return false  # Inventar voll

func remove_item(item: Item, count: int = 1) -> bool:
    for slot in slots:
        if slot.item == item:
            var to_remove = min(count, slot.count)
            slot.count -= to_remove
            if slot.count <= 0:
                slot.item = null
                slot.count = 0
            inventory_changed.emit()
            return true
    return false

func has_item(item: Item, count: int = 1) -> bool:
    var total = 0
    for slot in slots:
        if slot.item == item:
            total += slot.count
    return total >= count

func get_count(item: Item) -> int:
    var total = 0
    for slot in slots:
        if slot.item == item:
            total += slot.count
    return total
```

## Inventory UI

```gdscript
# inventory_ui.gd
extends Control

@onready var grid = $GridContainer

func _ready():
    InventoryManager.inventory_changed.connect(refresh)
    refresh()

func refresh():
    for i in grid.get_child_count():
        grid.get_child(i).queue_free()
    
    for slot in InventoryManager.slots:
        var slot_ui = preload("res://ui/inventory_slot.tscn").instantiate()
        if slot.item:
            slot_ui.set_item(slot.item, slot.count)
        grid.add_child(slot_ui)
```

## Drag & Drop

```gdscript
# inventory_slot.gd
extends Panel

var item: Item = null
var count: int = 0

func _get_drag_data(_at_position):
    if not item: return null
    var preview = TextureRect.new()
    preview.texture = item.icon
    preview.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
    preview.size = Vector2(48, 48)
    set_drag_preview(preview)
    return {"item": item, "count": count, "source": self}

func _can_drop_data(_at_position, data):
    return data is Dictionary and data.has("item")

func _drop_data(_at_position, data):
    var source_item = data.item
    var source_count = data.count
    var source_slot = data.source
    
    if item == source_item and item.stackable:
        # Stacken
        pass
    else:
        # Tauschen
        pass
    InventoryManager.inventory_changed.emit()
```
"""
        },
        {
            "title": "Dialog System — NPC-Gespräche",
            "category": "Godot",
            "tags": ["Dialog", "NPC", "Narrative", "JSON"],
            "type": "tutorial",
            "difficulty": "intermediate",
            "content": """# Dialog System — NPC-Gespräche

Ein flexibles Dialog-System für story-getriebene Spiele. Wir nutzen JSON für die Dialog-Daten.

## Dialog-Datenstruktur (JSON)

```json
{
  "dialogues": [
    {
      "id": "blacksmith_intro",
      "speaker": "Schmied",
      "portrait": "res://assets/portraits/blacksmith.png",
      "lines": [
        {
          "text": "Willkommen, Abenteurer!",
          "emotion": "happy"
        },
        {
          "text": "Ich habe dein Schwert geschärft.",
          "emotion": "neutral",
          "choices": [
            {"text": "Danke! Wie viel schulde ich dir?", "next": "blacksmith_pay"},
            {"text": "Zeig mir deine Waren.", "next": "blacksmith_shop"},
            {"text": "Tschüss.", "next": "exit"}
          ]
        }
      ]
    }
  ]
}
```

## Dialog-Manager

```gdscript
# dialog_manager.gd — Autoload
extends Node

signal dialog_started(dialogue_data: Dictionary)
signal dialog_line(line: Dictionary, index: int, total: int)
signal dialog_choices(choices: Array)
signal dialog_ended

var current_dialogue: Dictionary
var current_line_index: int = 0
var all_dialogues: Dictionary = {}

func _ready():
    load_dialogues()

func load_dialogues():
    var file = FileAccess.open("res://data/dialogues.json", FileAccess.READ)
    if file:
        var data = JSON.parse_string(file.get_as_text())
        for d in data.dialogues:
            all_dialogues[d.id] = d

func start_dialogue(dialogue_id: String):
    if not all_dialogues.has(dialogue_id):
        return
    current_dialogue = all_dialogues[dialogue_id]
    current_line_index = -1
    dialog_started.emit(current_dialogue)
    advance()

func advance():
    current_line_index += 1
    if current_line_index >= current_dialogue.lines.size():
        dialog_ended.emit()
        return
    var line = current_dialogue.lines[current_line_index]
    dialog_line.emit(line, current_line_index, current_dialogue.lines.size())
    
    if line.has("choices"):
        dialog_choices.emit(line.choices)

func select_choice(choice_index: int):
    var line = current_dialogue.lines[current_line_index]
    var next_id = line.choices[choice_index].next
    if next_id == "exit":
        dialog_ended.emit()
    else:
        start_dialogue(next_id)
```

## Dialog-UI

```gdscript
# dialog_ui.gd
extends CanvasLayer

@onready var speaker_label = $Panel/SpeakerLabel
@onready var text_label = $Panel/TextLabel
@onready var portrait = $Panel/Portrait
@onready var choices_container = $Panel/Choices
@onready var continue_indicator = $Panel/ContinueIndicator

func _ready():
    DialogManager.dialog_started.connect(_on_dialog_started)
    DialogManager.dialog_line.connect(_on_dialog_line)
    DialogManager.dialog_choices.connect(_on_dialog_choices)
    DialogManager.dialog_ended.connect(_on_dialog_ended)
    hide()

func _on_dialog_started(data):
    speaker_label.text = data.speaker
    if data.has("portrait"):
        portrait.texture = load(data.portrait)
    show()

func _on_dialog_line(line, index, total):
    # Text Buchstabe für Buchstabe anzeigen
    type_text(line.text)
    if line.has("emotion"):
        # Portrait je nach Emotion anpassen
        pass

func _on_dialog_choices(choices):
    choices_container.show()
    # Alte Buttons löschen
    for child in choices_container.get_children():
        child.queue_free()
    for i in choices.size():
        var btn = Button.new()
        btn.text = choices[i].text
        btn.pressed.connect(func(): 
            DialogManager.select_choice(i))
        choices_container.add_child(btn)

func _on_dialog_ended():
    hide()

func _input(event):
    if event.is_action_pressed("ui_accept") and visible:
        DialogManager.advance()
```

## NPC-Interaktion

```gdscript
extends Area2D

@export var dialogue_id: String = ""

func _on_body_entered(body):
    if body.is_in_group("player"):
        show_interact_prompt()

func interact():
    DialogManager.start_dialogue(dialogue_id)
```
"""
        },
        {
            "title": "Prozedurale Level-Generierung",
            "category": "Godot",
            "tags": ["Prozedural", "Generation", "RNG", "Level-Design"],
            "type": "tutorial",
            "difficulty": "advanced",
            "content": """# Prozedurale Level-Generierung

Prozedurale Generierung macht jedes Spieldurchlauf einzigartig — von Dungeons bis zu Landschaften.

## Seeded Random

```gdscript
# Reproduzierbar durch Seed:
var rng = RandomNumberGenerator.new()

func _ready():
    var seed_value = 12345  # Oder Time.get_unix_time_from_system()
    rng.seed = seed_value

func generate():
    var x = rng.randi_range(0, 100)
    var f = rng.randf_range(0.0, 1.0)
```

## Dungeon Generator (BSP — Binary Space Partition)

```gdscript
class_name DungeonGenerator
extends Node

var rng = RandomNumberGenerator.new()
var rooms: Array[Rect2i] = []

func generate(seed_val: int, map_size: Vector2i, min_room_size: int = 6):
    rng.seed = seed_val
    rooms.clear()
    
    # BSP: Raum rekursiv teilen
    _split(Rect2i(Vector2i.ZERO, map_size), min_room_size, 4)
    
    # Räume mit Korridoren verbinden
    _connect_rooms()

func _split(area: Rect2i, min_size: int, depth: int):
    if depth <= 0 or area.size.x < min_size * 2 or area.size.y < min_size * 2:
        # Raum platzieren
        var room_size = Vector2i(
            rng.randi_range(min_size, area.size.x - 2),
            rng.randi_range(min_size, area.size.y - 2)
        )
        var room_pos = Vector2i(
            area.position.x + rng.randi_range(1, area.size.x - room_size.x - 1),
            area.position.y + rng.randi_range(1, area.size.y - room_size.y - 1)
        )
        rooms.append(Rect2i(room_pos, room_size))
        return
    
    # Horizontal oder vertikal teilen
    var split_h = rng.randi_range(0, 1) == 0
    if area.size.x > area.size.y * 1.25:
        split_h = true
    
    if split_h:
        var split_x = rng.randi_range(area.size.x / 3, area.size.x * 2 / 3)
        _split(Rect2i(area.position, Vector2i(split_x, area.size.y)), min_size, depth - 1)
        _split(Rect2i(Vector2i(area.position.x + split_x, area.position.y), Vector2i(area.size.x - split_x, area.size.y)), min_size, depth - 1)

func _connect_rooms():
    for i in range(rooms.size() - 1):
        var a = rooms[i].get_center()
        var b = rooms[i + 1].get_center()
        # L-Korridor zeichnen
        # ... Tilemap-Zellen setzen
```

## Cellular Automata (Höhlen)

```gdscript
func generate_cave(width: int, height: int, fill_pct: float = 0.45) -> Array:
    var map = []
    for y in range(height):
        map.append([])
        for x in range(width):
            map[y].append(rng.randf() < fill_pct)  # true = Wand
    
    # Glättung (4 Iterationen)
    for _iter in range(4):
        map = _smooth(map)
    
    return map

func _smooth(old_map: Array) -> Array:
    var new_map = []
    for y in range(old_map.size()):
        new_map.append([])
        for x in range(old_map[0].size()):
            var walls = _count_neighbor_walls(old_map, x, y)
            new_map[y].append(walls > 4)
    return new_map

func _count_neighbor_walls(map: Array, x: int, y: int) -> int:
    var count = 0
    for dy in [-1, 0, 1]:
        for dx in [-1, 0, 1]:
            if dx == 0 and dy == 0: continue
            var nx = x + dx; var ny = y + dy
            if nx >= 0 and nx < map[0].size() and ny >= 0 and ny < map.size():
                if map[ny][nx]: count += 1
            else:
                count += 1  # Rand = Wand
    return count
```

## Perlin Noise (Landschaften)

```gdscript
var noise = FastNoiseLite.new()

func _ready():
    noise.noise_type = FastNoiseLite.TYPE_PERLIN
    noise.frequency = 0.05
    noise.seed = rng.randi()

func get_height(x: float) -> float:
    return noise.get_noise_1d(x) * 200  # -200 bis +200

func generate_terrain(width: int):
    for x in range(width):
        var h = get_height(x)
        # TileMap-Boden setzen
```
"""
        },
    ]

    # Alle Tutorials importieren
    import_entries(tutorials)
    print(f"[wiki] {len(tutorials)} Godot-Tutorials importiert.")


# Automatisch seeden beim Import
_seed_godot_tutorials()
