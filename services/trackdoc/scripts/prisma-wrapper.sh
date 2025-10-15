#!/bin/bash
set -e

# ============================================================================
# prisma-wrapper.sh - Safety wrapper for Prisma CLI
# ============================================================================
#
# This wrapper blocks dangerous Prisma commands that could cause data loss
# and redirects to safe alternatives.
#
# USAGE:
#   ./scripts/prisma-wrapper.sh [prisma-command] [args...]
#   npm run prisma [command] [args...]
#
# BLOCKED COMMANDS:
#   - db push         → Use: npm run db:migrate
#   - migrate reset   → Use: Manual rollback with backup
#   - db execute      → Use: Prisma migrations
#
# ALLOWED COMMANDS:
#   - migrate dev     → Safe (creates migrations)
#   - migrate deploy  → Safe (applies existing migrations)
#   - generate        → Safe (generates client)
#   - studio          → Safe (GUI)
#   - All other commands
#
# ============================================================================

# Dangerous commands that can cause data loss
DANGEROUS_COMMANDS=(
    "db push"
    "migrate reset"
    "db execute"
)

# Get full command string
FULL_COMMAND="$*"

# Check if any dangerous command is present
for DANGEROUS in "${DANGEROUS_COMMANDS[@]}"; do
    if [[ " $FULL_COMMAND " == *" $DANGEROUS "* ]]; then
        echo "========================================"
        echo "🚨 BLOCKED: Dangerous Prisma Command"
        echo "========================================"
        echo ""
        echo "Command: prisma $FULL_COMMAND"
        echo ""
        echo "This command is blocked for safety reasons."
        echo ""

        case "$DANGEROUS" in
            "db push")
                echo "❌ 'db push' can DROP tables without migrations"
                echo ""
                echo "✅ Use instead:"
                echo "   npm run db:migrate \"description\""
                echo ""
                echo "This creates a proper migration file that can be:"
                echo "  - Reviewed before applying"
                echo "  - Rolled back if needed"
                echo "  - Versioned in git"
                ;;
            "migrate reset")
                echo "❌ 'migrate reset' DELETES all data"
                echo ""
                echo "✅ Use instead:"
                echo "   1. Create backup: npm run db:backup"
                echo "   2. Review what needs to be reset"
                echo "   3. Restore from backup: npm run db:restore <file>"
                echo "   4. Apply specific migrations if needed"
                ;;
            "db execute")
                echo "❌ 'db execute' runs arbitrary SQL without tracking"
                echo ""
                echo "✅ Use instead:"
                echo "   1. Create a Prisma migration: npm run db:migrate"
                echo "   2. Write the SQL in the migration file"
                echo "   3. Apply with safe-migrate.sh (includes backup)"
                ;;
        esac

        echo ""
        echo "See MIGRATION_GUIDELINES.md for more information."
        echo "========================================"
        exit 1
    fi
done

# If no dangerous command detected, execute Prisma normally
npx prisma "$@"
