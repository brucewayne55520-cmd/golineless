#!/usr/bin/env bash
set -euo pipefail

# Go LineLess — Database Migration Script
# Usage: bash scripts/migrate.sh [generate|push|drop]
#   generate — Generate SQL migration from schema changes
#   push     — Apply pending migrations to the database
#   drop     — Drop all tables (DESTRUCTIVE — use with extreme caution)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT/lib/db"

case "${1:-help}" in
  generate)
    echo "🔧 Generating migration from schema changes..."
    npx drizzle-kit generate
    echo "✅ Migration generated. Review the SQL in lib/db/drizzle/ before pushing."
    ;;
  push)
    echo "📦 Applying pending migrations..."
    npx drizzle-kit push
    echo "✅ Migrations applied."
    ;;
  drop)
    echo "⚠️  WARNING: This will DROP ALL TABLES in the target database."
    read -rp "Type 'DROP' to confirm: " confirm
    if [ "$confirm" = "DROP" ]; then
      npx drizzle-kit drop
      echo "🗑️  All tables dropped."
    else
      echo "Cancelled."
    fi
    ;;
  *)
    echo "Go LineLess DB Migration Manager"
    echo ""
    echo "Usage: bash scripts/migrate.sh <command>"
    echo ""
    echo "Commands:"
    echo "  generate   Generate SQL migration from schema changes"
    echo "  push       Apply pending migrations to the database"
    echo "  drop       Drop all tables (DESTRUCTIVE)"
    ;;
esac
