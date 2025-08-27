# BWL-Lernapp

## 📖 Die Hauptaufgabe
Die **BWL-Lernapp** ist eine interaktive Lern- und Prüfungsplattform für Oberstufenschüler:innen im Fach Betriebswirtschaftslehre.  
Sie läuft offline im Browser (PC & iOS) und enthält alle Fragen/Antworten aus den Unterrichtsunterlagen, Wiederholungen und Prüfungen, Fragen müssen richtige antworten haben, nutze dazu das BUCH verzeichniss dort sine alle korrekten antworten, auch bei fülltexten einfügen die Richtigen Antworten,
    alle fragen aus den json dateien in die apps einbauen, und schon verhandene test nutzen um auch komplexere quiz nach deren vorlage zu erstellen mit den punkten entsprechend der vorlage und schwierigkeit vergeben. Es könne auch fragen in verschiedenen kontexten in folge gefragt werden,
        dies auch berücksichtigen. bei unklarheiten, keine frage auslassen sondern in eine gesonderte datei für die manuelle korrektur legen,
        frage, antwort (oder auch nicht), solle dort abgelegt werden. der rest wird hier in der readme.md vollständig aufgeführt, diese soll kommplet umgesetzt werden. bei problemen error.txt schreibe

---

## 📂 Projektstruktur

```
lernapp/
│
├── BWL-App/                # Hauptversion für PC/Web
│   ├── index.html           # Startseite
│   ├── app.js               # Hauptlogik (Fragen laden, Quiz, Prüfung)
│   ├── sw.js                # Service Worker (Offline, kein Cache für JSON)
│   ├── files.json           # Liste aller JSON im Ordner
│   ├── manifest.json        # PWA-Manifest
│   ├── *.json               # Fragenkataloge
│   └── json_fill_report.txt # Report der Korrekturen
│
├── BWL-iOS/                 # iOS-Version (Safari/PWA)
│   ├── index.html
│   ├── app.js
│   ├── sw.js
│   ├── files.json
│   └── *.json
│
├── update.ps1               # Update-Skript (Windows)
├── install_local.ps1        # Lokale Installation (Windows)
├── uninstall.ps1            # Entfernen der App (Windows)
└── README.md                # Projektbeschreibung
```

---

## ⚙️ Funktionen

### Lernmodus
- Anzeige aller Fragen aus den JSON-Dateien.
- Antworten als Buttons (Checkliste).
- Sofortige Rückmeldung:
  - ✅ grün = korrekt
  - ❌ rot = falsch
- Nur vollständig richtige Antwortkombination zählt.
- Begründung wird angezeigt, warum die Lösung korrekt ist.

### Prüfungsmodus
- Zufällige Auswahl von **10 Fragen**.
- Am Ende Auswertung: Punktzahl + Note nach Notentabelle.
- Variierende Erfolgsmeldungen zur Motivation.
- Ab **91%**: kleines 🎆 Feuerwerk.
- Ergebnisse:
  - lokal gespeichert (Verlaufsanzeige)
  - als JSON exportierbar (→ GitHub)
  - per Mail an Lehrer (`roland.simmer@me.com`) versendbar

### Datenverwaltung
- Alle `.json` liegen zentral in `BWL-App/` und `BWL-iOS/`.
- Automatische Erkennung neuer JSONs über `files.json`.
- Keine Hardcodierung → Updates ohne Codeänderungen.

### Bedienung
- Startseite mit Buttons:
  - **Lernen**
  - **Prüfen**
  - **Daten aktualisieren**
- Installationsoptionen:
  - Windows sichtbar
  - Mac/Linux ausgeblendet (vorbereitet)
- Für iOS: `BWL-iOS/` Version → als Web-App zum Homescreen hinzufügen.

---

## 🛠️ Technische Details
- **Offlinefähig** mit Service Worker.
- **Keine Platzhalter-Fragen**: Alle Fragen wurden bereinigt und ergänzt.
- **Kaskaden-Logik**: zusammenhängende Fragen/Antworten im Kontext vervollständigt.
- **Quiz-Logik** prüft streng: Nur vollständige richtige Auswahl zählt.
- **GitHub-Integration** vorbereitet:
  - Ergebnisse als JSON im Repo speicherbar.
  - Automatisiertes Push-Skript (`update.ps1`).
- **Update-Mechanismus**:
  - Button „Daten aktualisieren“ → Cache + SW löschen, App neu laden.
  - Windows-Skripte für Installation/Update/Uninstall.

---

## 🚀 Nutzung

### PC (Windows/Linux/Mac)
1. ZIP entpacken.  
2. `BWL-App/index.html` öffnen.  
   - Falls Browser `file://` blockiert → im Ordner starten:  
     ```bash
     python3 -m http.server 8000
     ```  
     und `http://localhost:8000/BWL-App/` öffnen.
3. „Daten aktualisieren“ regelmäßig ausführen.

### iOS (iPhone/iPad)
1. `BWL-iOS/index.html` im Safari öffnen.  
2. „Zum Home-Bildschirm“ hinzufügen.  
3. App wie native Anwendung nutzen.

---

## 📊 Fragenkataloge
- `questions_all_completed_marked_filled.json`
- `external_teacher_questions_marked_filled.json`
- ggf. weitere archivierte Versionen (`*_cleaned.json`, `*_marked.json`)

Alle enthalten:
- `question_text` → Frage (normalisiert)
- `possible_answers` → Antwortoptionen
- `correct_answer` → richtige Lösung(en)

---

## 📨 Lehrerfunktionen
- Prüfungsergebnisse automatisch:
  - lokal speichern
  - per E-Mail an `roland.simmer@me.com`
  - als JSON im Repo sichern
- Transparente Auswertung:
  - richtige/falsche Antworten sichtbar
  - Lernfortschritte dokumentiert

---

## ✅ Status
Die App ist **funktionsfähig** und enthält:
- vollständigen Fragenpool
- Lern- und Prüfungsmodus
- JSON-Auto-Loader
- Cache- und SW-Management
- motivierende Erfolgselemente (Feuerwerk, Meldungen)
- GitHub-/Mail-Integration vorbereitet
