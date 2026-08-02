# HUB v2 Konzept

## Vision
HUB wird von einer schicken Web-Dashboard-App zu einem echten persönlichen Betriebssystem.
Stufe 1 ist live. Stufe 2 macht HUB offline-fähiger, automatisierter und relevanter für Danny's Alltag.

---

## Stufe 1 – WAS BEREITS FERTIG IST
- iOS-ähnliche UI mit App-Grid, Bottom-Nav, Home-Button-Topbar
- Projekte, To-Do, Listen, Explorer, Wetter, Aktien, News, Chat
- Kalender mit Wochenansicht, Terminen + Google-Maps-Routing
- PWA, Service Worker, Theme-Toggle, Skeletons, Pull-to-Refresh, Page-Transitions
- Action Sheets, Keyboard-Shortcuts, Suggestion-Chip, Auto-Refresh
- SQLite für Projekte, lokale JSON für Listen, Datei-Uploads in `files/`
- Notion-Sync für Tasks

---

## Stufe 2 – NÄCHSTE VERSION (HUB v2)

### Ziele
1. Noch mehr wie eine native App fühlen (PWA-Install, offline First)
2. Danny's wiederkehrende Abläufe automatisieren
3. Wichtige Infos proaktiv an die richtige Stelle bringen
4. Sicherheit + Performance verbessern
5. Vorbereitung für den späteren Home-Server

---

## 1. PWA / Install / Offline

### Push Notifications
- Web Push für: überfällige Tasks, wichtige Termine, Aktien-Alerts
- Voraussetzung: VAPID-Keys + Service-Worker-Push-Handler
- Danny kann pro Kategorie entscheiden (Settings)

### App-Icon Badge
- Badge auf dem HUB-Icon mit Anzahl offener / überfälliger Tasks
- Nur möglich nach PWA-Installation + Berechtigung

### Offline-First
- Lokale IndexedDB für Tasks, Listen, Projekte, Termine
- Änderungen werden lokal gespeichert und bei Verbindung synchronisiert
- Konflikt-Regel: letzte Änderung gewinnt + manuelles Mergen bei Konflikt

### Install-Prompt
- Banner „Zum Home-Bildschirm hinzufügen“ nach 2. Besuch
- Kurzanleitung in Settings

---

## 2. Smart Home-Integration

### Home Assistant Panel
- Widget auf Home zeigt Status: Licht an/aus, Temperatur, offene Fenster
- Klick öffnet Detail-Ansicht mit schnellen Schaltern
- Voraussetzung: Home Assistant läuft später auf Danny's KI-Server

### Energy-Widget
- Stromverbrauch / Solar-Ertrag des Tages (falls verfügbar)

---

## 3. KI-Automatisierung

### Hermes-Assistent verbessern
- Kontextbewusst: Hermes sieht aktuelle Seite, aktuelles Projekt, offene Tasks
- Voice-to-Text über Web Speech API (wenn Danny mal sprechen will)
- Schnellbefehle: „Erstelle Task X in Projekt Y“, „Zeige Termine morgen“, „Was ist meine Watchlist?"

### Smart Suggestions
- Vorschläge basierend auf Uhrzeit / Wochentag:
  - Morgens: Wetter + heutige Termine
  - Abends: offene Tasks + Tagesrückblick
  - Wochenende: Wunschliste / Persönliches

### Auto-Kategorisierung
- Neue Tasks automatisch Projekt zuordnen anhand Keywords
- Termine automatisch mit Maps-Link anreichern wenn Location erkannt

---

## 4. Productivity-Erweiterungen

### Notizen / Wiki
- Markdown-Notizen pro Projekt
- Volltextsuche über alle Notizen
- Verlinkung zwischen Notizen, Projekten, Tasks

### Time-Tracking
- Timer pro Projekt/Task starten/stoppen
- Wochenbericht: Zeit pro Projekt
- Einfacher Button „Start / Pause / Stop“ in Task-Detailansicht

### Eisenhower-Matrix
- To-Do-Ansicht optional als Matrix: Wichtig + Dringend
- Hilft Danny bei Priorisierung

### Focus Mode
- Ein Klick blendet alles außer aktuellen Task aus
- Timer (Pomodoro) einstellbar

---

## 5. Finanzen / Budget

### Monatsbudget-Widget
- Verbleibendes Budget für Kategorien (z. B. Hochzeit, Reise)
- Manuelle Eingabe von Ausgaben
- Einfacher Graph: geplant vs. ausgegeben

### Wunschliste erweitern
- Preis pro Wunsch eintragen
- Gesamtwert, Priorisierung
- Kategorie (Technik, Reise, Haushalt)

---

## 6. Health / Lifestyle

### Wasser-Trink-Reminder
- Tägliches Ziel einstellbar
- Erinnerung alle 2 Stunden (Push)
- Fortschrittsbalken auf Home

### Schlaf-Tracking
- Manuelle Eingabe Bettzeit / Aufstehzeit
- Wochenverlauf als kleiner Graph

### Gym-Tracker
- Trainingsplan mit Übungen, Sätzen, Gewichten
- Historie pro Übung

---

## 7. Social / Shared

### Lydia-Modus
- Extra-UI ohne Fachbegriffe für Lydia
- Schnellzugriff auf Hochzeit, Einkauf, Wetter, Rezepte

### Shared Listen
- Einkaufsliste, Wunschliste, Packlisten für gemeinsame Events
- Echtzeit-Sync über SocketIO

---

## 8. Sicherheit

### Auto-Logout nach Inaktivität
- Einstellbar: 5 / 15 / 30 / 60 Minuten
- Warnung 1 Minute vorher

### 2FA via TOTP
- Optional für Login
- QR-Code in Settings einrichten

### API-Rate-Limiting
- pro IP / Session
- Schutz gegen Brute-Force

---

## 9. Performance / Hosting

### Produktiv-Deployment
- Gunicorn + Nginx oder direkt auf Hostinger VPS
- Domain `hub.danny-csepke.de` (DNS bei Hostinger einrichten)
- SSL via Let's Encrypt oder Cloudflare

### Backup
- Tägliches Backup von `files/` + SQLite zu GitHub oder S3-kompatibel
- Cronjob auf Server

### Logging
- Einfaches Fehler-Log in `files/logs/hub.log`
- Rotation: 7 Tage

---

## 10. Roadmap / Phasen

| Phase | Fokus | Dauer |
|---|---|---|
| **v2.0** | PWA Push + Offline-First + IndexedDB | 1 Woche |
| **v2.1** | Hermes-Assistent + Smart Suggestions | 1 Woche |
| **v2.2** | Smart Home / Home Assistant Panel | 1 Woche |
| **v2.3** | Notizen/Wiki + Time-Tracking | 1 Woche |
| **v2.4** | Finanzen + Health-Widgets | 1 Woche |
| **v2.5** | Lydia-Modus + Shared Listen + Security | 1 Woche |

---

## Entscheidungen

- Keine neue externe API ohne Danny's OK
- Kostentreiber vermeiden wo möglich
- Fokus auf mobile Nutzung
- Kein haptisches Feedback (Danny's Wunsch)
- Notion bleibt zentrale Datenbasis für Tasks

---

## Nächste To-Dos

1. VAPID-Keys generieren und Push-Notifications vorbereiten
2. IndexedDB-Schema für Offline-First entwerfen
3. Hermes-Assistent kontextbewusst machen
4. Home Assistant API anbinden (sowie verfügbar)
5. Notizen/Wiki Backend + Editor bauen
6. Monatsbudget-Widget entwerfen
7. Auto-Logout implementieren
8. Produktiv-Deployment auf Hostinger planen
9. Backup-Cronjob einrichten
10. Lydia-Modus UI skizzieren

---

## Files
- Dieses Konzept: `/opt/data/hub/docs/hub-v2-konzept.md`
- Code: `/opt/data/hub`
- Live-URL: `https://karen-galleries-chairs-violin.trycloudflare.com`
- Repo: `https://github.com/dcsepke-byte/hub`
