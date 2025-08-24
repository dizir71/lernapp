#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
TARGET="$HOME/BWL-PWA"
DESKTOP="$HOME/Desktop"
mkdir -p "$TARGET"
rsync -a "$ROOT/" "$TARGET/"

# Python sicherstellen
if ! command -v python3 >/dev/null 2>&1; then
  sudo apt-get update && sudo apt-get install -y python3
fi

cat > "$TARGET/start_server.sh" <<'SH'
#!/usr/bin/env bash
cd "$HOME/BWL-PWA"
xdg-open "http://localhost:8000" >/dev/null 2>&1 || true
python3 -m http.server 8000
SH
chmod +x "$TARGET/start_server.sh"

# Desktop-Starter
mkdir -p "$DESKTOP"
cat > "$DESKTOP/BWL-Lernapp.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=BWL Lernapp
Exec=$TARGET/start_server.sh
Terminal=true
EOF
chmod +x "$DESKTOP/BWL-Lernapp.desktop"
echo "Fertig. Desktop-Link: $DESKTOP/BWL-Lernapp.desktop"

