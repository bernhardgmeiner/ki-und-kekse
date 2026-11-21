# KI & Kekse – 24 Türchen KI für die Schule

Die Website zu advent.bernhardgmeiner.com.

## Tippfehler ausbessern

Jedes Türchen ist eine eigene Textdatei im Ordner `texte/`: `01.md` bis `24.md`. Datei auf GitHub öffnen, auf den Stift klicken, ändern, „Commit changes“. Nach etwa einer Minute ist die Änderung online.

Oben in jeder Datei steht zwischen zwei Zeilen mit `---` der Kopf:

- `nummer`: 1 bis 24, nicht ändern
- `titel`: Überschrift des Türchens
- `adresse`: optional; fehlt sie, wird die Adresse aus dem Titel gebildet. Nach dem Livegang den Titel nur noch ändern, wenn hier die alte Adresse eingetragen ist, sonst führen geteilte Links ins Leere.
- `nutzen`: der fette Satz unter der Überschrift
- `zeit`, `brauchst`: die Infozeile
- `credit`: Zeile am Ende, etwa `Idee: [Name](https://…)`
- `vorschautext`: Text unter geteilten Links (WhatsApp, LinkedIn)
- `teaser`: Text für die Story; erscheint nicht auf der Seite
- `karten: ja`: Tabellen erscheinen am Handy als Karten (Türchen 8 und 24)
- `plan_im_prompt: ja`: Der Tagesplan steht zusätzlich als Text in der Prompt-Box (Türchen 24)

Darunter steht der Text in Markdown. Ein Block zwischen drei Backticks wird zur Box mit Kopier-Knopf; mit ` ```prompt ` bekommt die Box die Überschrift „Prompt zum Kopieren“.

Eigene Zeilen für die Website:

- `{{werkzeug: ordner | Titel}}` bettet ein Mini-Tool aus `werkzeuge/` ein
- Eine Zeile, die nur aus einem Link auf ein Instagram-Reel besteht (`[Text](https://www.instagram.com/reel/ID/)`), wird zur Einbettung mit zwei Klicks: Instagram lädt erst, wenn jemand auf „Abspielen“ tippt
- `{{grafik: name}}` setzt eine Grafik aus `grafiken/` ein
- `{{platzhalter: Text}}` ist nur in der Vorschau sichtbar; auf der Live-Seite fällt die Zeile weg

Die Texte stammen aus den beiden Docs des Projekts. Neu einlesen: beide Docs als Markdown exportieren und `python3 skripte/texte_aus_docs.py GROSS.md KLEIN.md` laufen lassen (überschreibt `texte/`).

## Aufbau

- `texte/`: die 24 Türchen
- `einstellungen.json`: Adressen, Vorschau-Code, GoatCounter-Name (Statistik unter https://kiundkekse.goatcounter.com; das Zählskript liegt selbst gehostet in `statisch/goatcounter-count-v5.js`)
- `statisch/`: Stil, Skript, Schriften (selbst gehostet, kein Abruf bei Google), Vorschaubilder
- `werkzeuge/`: Mini-Tools, die in Türchen eingebettet sind (Bilderset 4, Timer 5, Übungs-App 12, Baukasten 19, Quizturnier 21); sie laden nichts aus dem Internet und speichern keine Namen. Das Bilderset liegt in `werkzeuge/echt-oder-ki/bilder/` unter neutralen Namen (bild-01 bis bild-12), damit kein Dateiname die Lösung verrät; welches Bild echt ist, samt Urheber:in, Lizenz und Commons-Datei, steht in der Liste `BILDER` in `werkzeuge/echt-oder-ki/index.html`
- `grafiken/`: Grafiken für Türchen (Rollen in Türchen 6); neu erzeugen mit `node skripte/grafiken.mjs`
- `bauen.mjs`: baut alles nach `_site/`; läuft bei jedem Commit automatisch (GitHub Actions)
- `skripte/tests/`: Browser-Tests für Bilderset, Turnier, Übungs-App und Sperre (Playwright, Server auf localhost:8765 mit `_site/` als Wurzel)
- `skripte/vorschaubilder.mjs`: erzeugt die Bilder für geteilte Links neu; nur nötig, wenn sich Titel ändern

## Vorschau

`https://advent.bernhardgmeiner.com/?vorschau=CODE` öffnet alle Türchen in diesem Browser (CODE steht in `einstellungen.json`). In der gelben Leiste lässt sich ein beliebiger Tag durchspielen. `?vorschau=aus` beendet die Vorschau.

## Wann ein Türchen aufgeht

Türchen n öffnet am n. Dezember 2026 um 0:00 Uhr Wiener Zeit. Die Sperre läuft im Browser; wer im Quelltext sucht, kann vorauslesen.
