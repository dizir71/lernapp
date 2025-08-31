#!/usr/bin/env python3
import subprocess, sys, os, datetime

REPO = os.path.abspath(os.path.dirname(__file__))
BRANCH = "main"   # ggf. ändern

def run(cmd):
    r = subprocess.run(cmd, cwd=REPO, text=True, capture_output=True, shell=False)
    if r.returncode != 0:
        print("FEHLER:", " ".join(cmd))
        print(r.stdout.strip())
        print(r.stderr.strip())
        sys.exit(r.returncode)
    return r.stdout.strip()

def maybe(cmd):
    r = subprocess.run(cmd, cwd=REPO, text=True, capture_output=True, shell=False)
    return r.returncode == 0

def main():
    # Vorbedingungen
    if not maybe(["git","--version"]):
        print("Git fehlt. Bitte Git installieren.")
        sys.exit(1)

    # Remote prüfen
    remotes = run(["git","remote","-v"])
    if "origin" not in remotes:
        print("Kein 'origin' konfiguriert. Beispiel:\n  git remote add origin git@github.com:USER/lernapp.git")
        sys.exit(1)

    # Aktuellen Branch prüfen
    cur = run(["git","rev-parse","--abbrev-ref","HEAD"])
    if cur != BRANCH:
        print(f"Aktiver Branch ist '{cur}'. Wechsle auf '{BRANCH}'.")
        run(["git","checkout",BRANCH])

    # Neueste Änderungen holen
    run(["git","fetch","origin"])
    run(["git","pull","--rebase","origin",BRANCH])

    # Änderungen aufnehmen
    run(["git","add","-A"])

    # Commit nur wenn Änderungen
    diff = subprocess.run(["git","diff","--cached","--quiet"], cwd=REPO)
    if diff.returncode != 0:
        msg = f"Auto-Update {datetime.datetime.now().isoformat(timespec='seconds')}"
        if len(sys.argv) > 1:
            msg = " ".join(sys.argv[1:])
        run(["git","commit","-m", msg])
    else:
        print("Keine neuen Änderungen zu committen.")

    # Push
    run(["git","push","origin",BRANCH])
    print("Fertig.")

if __name__ == "__main__":
    main()
