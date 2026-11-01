#!/bin/bash
# Cleanup Old SQL Debugging Scripts
# This script moves old SQL files to an archive folder

echo "🧹 Cleaning up old SQL debugging scripts..."
echo ""

# Create archive directory
mkdir -p archive/old-sql-scripts

echo "📁 Created archive directory: archive/old-sql-scripts/"
echo ""

# List of files to archive
files=(
    "FIX_SIGNUP_401_ERROR.sql"
    "FIX_SIGNUP_SIMPLE.sql"
    "COMPLETE_FIX_ALL_ISSUES.sql"
    "FIX_POLICIES_ONLY.sql"
    "FINAL_FIX_422_ERROR.sql"
    "FIX_PROFILE_DEFAULTS.sql"
    "NUCLEAR_FIX.sql"
    "DEBUG_SIGNUP.sql"
    "DIAGNOSE_ISSUE.sql"
    "TEST_PROFILE_INSERT.sql"
    "ALTERNATIVE_FIX_WITH_TRIGGER.sql"
    "PERMANENT_FIX_RLS.sql"
    "SIMPLEST_FIX.sql"
    "DISABLE_RLS_FOR_TESTING.sql"
)

# Move files to archive
count=0
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        mv "$file" archive/old-sql-scripts/
        echo "✅ Archived: $file"
        ((count++))
    fi
done

echo ""
echo "🎉 Cleanup complete!"
echo "📊 Archived $count files"
echo ""
echo "✅ Kept important files:"
echo "   - ENABLE_RLS_WITH_POLICIES.sql"
echo "   - DISABLE_ALL_RLS.sql"
echo "   - CHECK_RLS_STATUS.sql"
echo ""
echo "📦 Old files moved to: archive/old-sql-scripts/"
