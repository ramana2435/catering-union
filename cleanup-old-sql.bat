@echo off
REM Cleanup Old SQL Debugging Scripts
REM This script moves old SQL files to an archive folder

echo.
echo 🧹 Cleaning up old SQL debugging scripts...
echo.

REM Create archive directory
if not exist archive\old-sql-scripts mkdir archive\old-sql-scripts

echo 📁 Created archive directory: archive\old-sql-scripts\
echo.

REM Move files to archive
set count=0

if exist FIX_SIGNUP_401_ERROR.sql (
    move FIX_SIGNUP_401_ERROR.sql archive\old-sql-scripts\ >nul
    echo ✅ Archived: FIX_SIGNUP_401_ERROR.sql
    set /a count+=1
)

if exist FIX_SIGNUP_SIMPLE.sql (
    move FIX_SIGNUP_SIMPLE.sql archive\old-sql-scripts\ >nul
    echo ✅ Archived: FIX_SIGNUP_SIMPLE.sql
    set /a count+=1
)

if exist COMPLETE_FIX_ALL_ISSUES.sql (
    move COMPLETE_FIX_ALL_ISSUES.sql archive\old-sql-scripts\ >nul
    echo ✅ Archived: COMPLETE_FIX_ALL_ISSUES.sql
    set /a count+=1
)

if exist FIX_POLICIES_ONLY.sql (
    move FIX_POLICIES_ONLY.sql archive\old-sql-scripts\ >nul
    echo ✅ Archived: FIX_POLICIES_ONLY.sql
    set /a count+=1
)

if exist FINAL_FIX_422_ERROR.sql (
    move FINAL_FIX_422_ERROR.sql archive\old-sql-scripts\ >nul
    echo ✅ Archived: FINAL_FIX_422_ERROR.sql
    set /a count+=1
)

if exist FIX_PROFILE_DEFAULTS.sql (
    move FIX_PROFILE_DEFAULTS.sql archive\old-sql-scripts\ >nul
    echo ✅ Archived: FIX_PROFILE_DEFAULTS.sql
    set /a count+=1
)

if exist NUCLEAR_FIX.sql (
    move NUCLEAR_FIX.sql archive\old-sql-scripts\ >nul
    echo ✅ Archived: NUCLEAR_FIX.sql
    set /a count+=1
)

if exist DEBUG_SIGNUP.sql (
    move DEBUG_SIGNUP.sql archive\old-sql-scripts\ >nul
    echo ✅ Archived: DEBUG_SIGNUP.sql
    set /a count+=1
)

if exist DIAGNOSE_ISSUE.sql (
    move DIAGNOSE_ISSUE.sql archive\old-sql-scripts\ >nul
    echo ✅ Archived: DIAGNOSE_ISSUE.sql
    set /a count+=1
)

if exist TEST_PROFILE_INSERT.sql (
    move TEST_PROFILE_INSERT.sql archive\old-sql-scripts\ >nul
    echo ✅ Archived: TEST_PROFILE_INSERT.sql
    set /a count+=1
)

if exist ALTERNATIVE_FIX_WITH_TRIGGER.sql (
    move ALTERNATIVE_FIX_WITH_TRIGGER.sql archive\old-sql-scripts\ >nul
    echo ✅ Archived: ALTERNATIVE_FIX_WITH_TRIGGER.sql
    set /a count+=1
)

if exist PERMANENT_FIX_RLS.sql (
    move PERMANENT_FIX_RLS.sql archive\old-sql-scripts\ >nul
    echo ✅ Archived: PERMANENT_FIX_RLS.sql
    set /a count+=1
)

if exist SIMPLEST_FIX.sql (
    move SIMPLEST_FIX.sql archive\old-sql-scripts\ >nul
    echo ✅ Archived: SIMPLEST_FIX.sql
    set /a count+=1
)

if exist DISABLE_RLS_FOR_TESTING.sql (
    move DISABLE_RLS_FOR_TESTING.sql archive\old-sql-scripts\ >nul
    echo ✅ Archived: DISABLE_RLS_FOR_TESTING.sql
    set /a count+=1
)

echo.
echo 🎉 Cleanup complete!
echo 📊 Archived %count% files
echo.
echo ✅ Kept important files:
echo    - ENABLE_RLS_WITH_POLICIES.sql
echo    - DISABLE_ALL_RLS.sql
echo    - CHECK_RLS_STATUS.sql
echo.
echo 📦 Old files moved to: archive\old-sql-scripts\
echo.
pause
