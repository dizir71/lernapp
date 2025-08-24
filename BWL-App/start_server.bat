@echo off
cd /d "%~dp0"
echo Starte lokalen Server auf http://localhost:8000 ...
echo Bitte im Browser öffnen: http://localhost:8000/BWL-App/
python -m http.server 8000
pause
