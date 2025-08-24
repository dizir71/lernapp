#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
TARGET="$HOME/BWL-PWA"
DESKTOP="$HOME/Desktop"
mkdir -p "$TARGET"
rsync -a "$ROOT/" "$TARGET/"

# Python sicherstellen (Homebrew optional)
if ! command -v python3 >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then brew install python; else echo "Bitte Python 3 installieren"; exit 1; fi
fi

cat > "$TARGET/start_server.command" <<'SH'
#!/usr/bin/env bash
cd "$HOME/BWL-PWA"
open "http://localhost:8000"
python3 -m http.server 8000
SH
chmod +x "$TARGET/start_server.command"
ln -sf "$TARGET/start_server.command" "$DESKTOP/BWL Lernapp.command"
echo "Fertig. Desktop-Link: $DESKTOP/BWL Lernapp.command"

