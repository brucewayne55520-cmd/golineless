#!/usr/bin/env bash
set -euo pipefail

# Go LineLess — Database Backup & Recovery Script
# Usage:
#   bash scripts/backup.sh backup              — Create a timestamped backup
#   bash scripts/backup.sh restore <file>       — Restore from a backup file
#   bash scripts/backup.sh list                 — List available backups
#   bash scripts/backup.sh rotate <keep>        — Keep only the N most recent backups

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_URL="${DATABASE_URL:-}"

mkdir -p "$BACKUP_DIR"

case "${1:-help}" in
  backup)
    if [ -z "$DB_URL" ]; then
      # Try to load from .env
      if [ -f "$PROJECT_ROOT/.env" ]; then
        # shellcheck disable=SC1091
        DB_URL=$(grep -E '^DATABASE_URL=' "$PROJECT_ROOT/.env" | cut -d= -f2-)
      fi
    fi

    if [ -z "$DB_URL" ]; then
      echo "❌ DATABASE_URL is not set. Set it or create a .env file."
      exit 1
    fi

    BACKUP_FILE="$BACKUP_DIR/golineless_${TIMESTAMP}.sql.gz"
    echo "📀 Backing up to $BACKUP_FILE ..."
    pg_dump "$DB_URL" --no-owner --no-acl | gzip > "$BACKUP_FILE"
    echo "✅ Backup created: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"
    ;;

  restore)
    RESTORE_FILE="${2:-}"
    if [ -z "$RESTORE_FILE" ]; then
      echo "❌ Usage: bash scripts/backup.sh restore <backup-file>"
      exit 1
    fi
    if [ ! -f "$RESTORE_FILE" ]; then
      echo "❌ File not found: $RESTORE_FILE"
      exit 1
    fi

    echo "⚠️  WARNING: This will DESTROY all data and restore from backup."
    read -rp "Type 'RESTORE' to confirm: " confirm
    if [ "$confirm" != "RESTORE" ]; then
      echo "Cancelled."
      exit 0
    fi

    echo "🔄 Restoring from $RESTORE_FILE ..."
    if [[ "$RESTORE_FILE" == *.gz ]]; then
      gunzip -c "$RESTORE_FILE" | psql "$DB_URL"
    else
      psql "$DB_URL" < "$RESTORE_FILE"
    fi
    echo "✅ Restore complete."
    ;;

  list)
    echo "📋 Available backups:"
    echo ""
    if [ -z "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]; then
      echo "  No backups found in $BACKUP_DIR"
    else
      ls -1th "$BACKUP_DIR"/*.sql.gz 2>/dev/null | while read -r f; do
        echo "  $(basename "$f")  ($(du -h "$f" | cut -f1))"
      done
    fi
    ;;

  rotate)
    KEEP="${2:-7}"
    echo "🔄 Rotating backups, keeping last $KEEP ..."
    ls -1t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | tail -n +$((KEEP + 1)) | while read -r f; do
      echo "  🗑️  Removing $(basename "$f")"
      rm "$f"
    done
    echo "✅ Rotation complete."
    ;;

  *)
    echo "Go LineLess — Database Backup Manager"
    echo ""
    echo "Usage: bash scripts/backup.sh <command> [args]"
    echo ""
    echo "Commands:"
    echo "  backup              Create a timestamped backup"
    echo "  restore <file>      Restore from a backup file"
    echo "  list                List available backups"
    echo "  rotate <keep>       Keep only N most recent backups (default: 7)"
    echo ""
    echo "Set BACKUP_DIR to change the backup location (default: ./backups)"
    ;;
esac
