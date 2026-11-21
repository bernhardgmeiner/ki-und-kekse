#!/usr/bin/env python3
"""Zerlegt die Markdown-Exporte der beiden Docs in texte/01.md bis 24.md.
Aufruf: python3 skripte/texte_aus_docs.py GROSS.md KLEIN.md
Wortlaut bleibt unverändert; nur Kopfdaten (Nutzen, Infozeile, Credit, Teaser, Vorschautext)
wandern in den Kopf, und die Platzhalter für Paket G werden gegen Werkzeuge getauscht."""
import re, sys, pathlib

WURZEL = pathlib.Path(__file__).resolve().parent.parent

# Platzhalter aus den Docs -> Einbettung auf der Website
ERSATZ = {
    4: '{{werkzeug: echt-oder-ki | Bilderset mit Auflösung}}',
    5: '{{werkzeug: gruppen-timer | Gruppen-Zufall und Timer}}',
    6: '{{grafik: pingpong-rollen}}',
    12: '{{werkzeug: uebungs-app | Demo: Übungs-App nach der Schularbeit}}',
    19: '{{werkzeug: prompt-baukasten | Prompt-Baukasten für Lernspiele}}',
    21: '{{werkzeug: quizturnier | Quizturnier am Beamer}}\n\n{{platzhalter: Link zur öffentlichen Version des Quiz Rumble folgt.}}',
    24: '{{platzhalter: Link zum PDF mit allen 24 Türchen folgt, falls entschieden.}}',
}
KARTEN = {8, 24}          # Tabellen am Handy als Karten

def abschnitte(md):
    teile = re.split(r'^## Türchen (\d+): (.+)$', md, flags=re.M)
    for i in range(1, len(teile), 3):
        yield int(teile[i]), teile[i + 1].strip(), teile[i + 2]

def zerlege(n, titel, roh):
    zeilen = roh.strip('\n').split('\n')
    # Teaser und Vorschautext stehen nach der letzten Trennlinie
    trenn = max(i for i, z in enumerate(zeilen) if z.strip() == '---')
    fuss = '\n'.join(zeilen[trenn + 1:])
    teaser = re.search(r'^\*\*Story-Teaser:\*\*\s*(.+)$', fuss, re.M).group(1).strip()
    vorschau = re.search(r'^\*\*Vorschautext:\*\*\s*(.+)$', fuss, re.M).group(1).strip()
    koerper = [z for z in zeilen[:trenn]]
    while koerper and not koerper[0].strip(): koerper.pop(0)
    m = re.fullmatch(r'\*\*(.+)\*\*', koerper[0].strip())
    if not m: raise SystemExit(f'Türchen {n}: erster Absatz ist nicht fett')
    nutzen = m.group(1).strip()
    koerper.pop(0)
    while not koerper[0].strip(): koerper.pop(0)
    m = re.fullmatch(r'Zeitaufwand: (.+?) · Du brauchst: (.+)', koerper[0].strip())
    if not m: raise SystemExit(f'Türchen {n}: Infozeile nicht gefunden')
    zeit, brauchst = m.group(1).strip(), m.group(2).strip()
    koerper.pop(0)
    # Credit: letzte Zeile „Idee: …“ oder „Zum Weiterlesen: …“
    credit = ''
    for i in range(len(koerper) - 1, -1, -1):
        if re.match(r'^(Idee|Zum Weiterlesen): ', koerper[i]):
            credit = koerper.pop(i).strip(); break
        if koerper[i].strip() and not koerper[i].startswith(('Idee', 'Zum')) and i < len(koerper) - 3:
            break
    text = '\n'.join(koerper).strip()
    # Platzhalter tauschen
    platz = re.findall(r'^\*\\\[.*?\\\]\*$', text, re.M)
    if n in ERSATZ:
        if len(platz) != 1: raise SystemExit(f'Türchen {n}: erwartet 1 Platzhalter, gefunden {len(platz)}')
        text = text.replace(platz[0], ERSATZ[n])
    elif platz:
        raise SystemExit(f'Türchen {n}: unerwarteter Platzhalter {platz}')
    # Überschriften eine Ebene hinauf (### -> ##)
    text = re.sub(r'^(#{3,6}) ', lambda m: m.group(1)[1:] + ' ', text, flags=re.M)
    kopf = [f'nummer: {n}', f'titel: {titel}', f'nutzen: {nutzen}', f'zeit: {zeit}', f'brauchst: {brauchst}']
    if credit: kopf.append(f'credit: {credit}')
    kopf += [f'vorschautext: {vorschau}', f'teaser: {teaser}']
    if n in KARTEN: kopf.append('karten: ja')
    if n == 24: kopf.append('plan_im_prompt: ja')
    for z in kopf:
        if '\n' in z: raise SystemExit(f'Türchen {n}: Zeilenumbruch im Kopf')
    return '---\n' + '\n'.join(kopf) + '\n---\n\n' + text + '\n'

def main(gross, klein):
    alle = {}
    for datei in (gross, klein):
        md = pathlib.Path(datei).read_text(encoding='utf8')
        for n, titel, roh in abschnitte(md):
            if n in alle: raise SystemExit(f'Türchen {n} doppelt')
            alle[n] = zerlege(n, titel, roh)
    fehlt = set(range(1, 25)) - set(alle)
    if fehlt: raise SystemExit(f'Es fehlen Türchen: {sorted(fehlt)}')
    for n, inhalt in alle.items():
        (WURZEL / 'texte' / f'{n:02d}.md').write_text(inhalt, encoding='utf8')
    print('24 Türchen geschrieben.')

if __name__ == '__main__':
    main(*sys.argv[1:3])
