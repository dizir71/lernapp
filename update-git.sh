# 1. In dein Repo wechseln
cd ~/Desktop/GitHub/Gabriel\ BWL/lernapp

# 2. Alle Änderungen (neue/geänderte Dateien) vormerken
git add .

# 3. Commit mit Nachricht machen
git commit -m "Update Lernapp Stand $(date +%Y-%m-%d)"

# 4. Auf GitHub hochladen
git push origin main

# 5) Aktuelles holen und lokale Commits oben draufsetzen
# git fetch origin
# git pull --rebase --autostash origin main

# Falls Konflikte:
#   Dateien öffnen, Konfliktstellen <<<<<<< ======= >>>>>>> bereinigen
# git add -A
# git rebase --continue   # ggf. wiederholen bis fertig

# 2) Dann pushen
# git push origin main
