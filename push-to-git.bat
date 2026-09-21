@echo off
setlocal
echo ==============================================
echo   Hammam Nile - Envoi vers GitHub
echo ==============================================
echo.

set "GIT_CMD=git"
where git >nul 2>nul
if %errorlevel% neq 0 (
    if exist "C:\Program Files\Git\cmd\git.exe" (
        set "GIT_CMD=C:\Program Files\Git\cmd\git.exe"
    )
)

echo Utilisation de : %GIT_CMD%
echo.

"%GIT_CMD%" add -A
"%GIT_CMD%" commit -m "Suppression du code de verification par email pour l admin"
"%GIT_CMD%" branch -M main
echo.
echo Envoi vers https://github.com/Elhadj-OD/Hammam-Nile-.git ...
"%GIT_CMD%" push -u origin main

echo.
echo ==============================================
echo   Operation terminee !
echo ==============================================
pause
