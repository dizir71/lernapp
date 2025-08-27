import json
import sys
import glob

def read_all_questions(filename):
    """Lädt alle Fragen aus einer Datei, die ggf. mehrere Arrays direkt nacheinander enthält."""
    questions = []
    with open(filename, encoding="utf-8") as f:
        buffer = ""
        for line in f:
            buffer += line
        # Splitte an jeder schließenden eckigen Klammer gefolgt von einer öffnenden -> '][', so entstehen Einzelarrays:
        parts = buffer.replace('\n','').split('][')
        # Falls mehrteilig, sorge für korrektes Parsen
        for i, part in enumerate(parts):
            # Arrays zuordnen: Nur beim ersten am Anfang, beim letzten am Ende eckige Klammer anhängen
            if not part.startswith('['):
                part = '[' + part
            if not part.endswith(']'):
                part = part + ']'
            try:
                arr = json.loads(part)
                questions.extend(arr)
            except Exception as e:
                print(f"Fehler beim Parsen eines Teilstücks: {e}")
    return questions

def main():
    # Dateien automatisch finden oder Dateinamen übergeben
    print("Welche Datei möchtest du korrigieren? (z.B. full-1-chapter.json):")
    filename = input("> ").strip()
    questions = read_all_questions(filename)
    print(f"Fragen gefunden und zusammengeführt: {len(questions)}")

    # Zielname
    outname = filename.replace('.json', '_korrigiert.json')
    with open(outname, 'w', encoding='utf-8') as out:
        json.dump(questions, out, indent=2, ensure_ascii=False)

    print(f"Fertige Datei gespeichert als: {outname}")

if __name__ == "__main__":
    main()

