#!/bin/bash
# HUB Backup — tägliches tar.gz von files/ Verzeichnis
# Cron: täglich 03:00 Uhr
set -euo pipefail

HUB_DIR="/opt/data/hub"
BACKUP_NAME="hub-backup-$(date +%Y%m%d)"
BACKUP_FILE="/tmp/${BACKUP_NAME}.tar.gz"
LOG_FILE="/tmp/hub-backup.log"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starte Backup..." >> "$LOG_FILE"

# files/ Verzeichnis sichern
tar czf "$BACKUP_FILE" -C "$HUB_DIR" files/

# Optional: .env mit sichern (falls vorhanden und lesbar)
if [ -f /opt/data/.env ] && [ -r /opt/data/.env ]; then
    tar czf "/tmp/${BACKUP_NAME}-with-env.tar.gz" -C /opt/data .env -C "$HUB_DIR" files/
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup erstellt: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))" >> "$LOG_FILE"

# Alte Backups >30 Tage löschen
find /tmp -name "hub-backup-*.tar.gz" -mtime +30 -delete 2>/dev/null || true

# Letzte 10 Zeilen Log behalten
tail -n 10 "$LOG_FILE" > "${LOG_FILE}.tmp" && mv "${LOG_FILE}.tmp" "$LOG_FILE"
