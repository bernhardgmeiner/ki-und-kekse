import { createRequire } from 'node:module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let ok = 0, nicht = 0; const pruef = (c, t) => { if (c) ok++; else { nicht++; console.log('FEHLER:', t); } };
for (const gesperrt of [false, true]) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  if (gesperrt) await ctx.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('gesperrt'); } }); });
  const p = await ctx.newPage(); p.setDefaultTimeout(2500);
  const fehler = []; p.on('pageerror', (e) => fehler.push(String(e)));
  await p.goto('http://localhost:8765/werkzeuge/uebungs-app/index.html');
  await p.fill('#spitzname', 'Krümel');
  for (const [id, v] of [['listening', 9], ['reading', 7], ['passive', 3], ['if', 6], ['vocab', 8], ['writing', 15]]) await p.fill('#p-' + id, String(v));
  const v = await p.textContent('#vorschlag');
  pruef(/Krümel, am meisten fehlt dir bei Passive Voice \(3 von 10\)/.test(v), 'Vorschlag Passive: ' + v.slice(0, 90));
  await p.fill('#p-listening', '1');
  const v2 = await p.textContent('#vorschlag');
  pruef(/Listening \(1 von 10\).*nicht üben.*Passive Voice/.test(v2), 'Listening am schwächsten, Vorschlag übbarer Bereich');
  await p.fill('#p-listening', '9');
  // Passive durchspielen: immer die richtige Antwort
  await p.click('#vorschlag .knopf');
  const A = await p.evaluate(() => window.__app.AUFGABEN.passive);
  for (let i = 0; i < A.length; i++) {
    const a = A[i];
    if (a.o) {
      const opts = await p.$$eval('#u-optionen button', (l) => l.map((x) => x.textContent));
      pruef(opts.length === 3 && opts.includes(a.o[0]), 'Optionen ' + i);
      if (i === 0) { const falsch = opts.find((o) => o !== a.o[0]); await p.click(`#u-optionen button:text-is("${falsch}")`); pruef(/Noch nicht/.test(await p.textContent('#u-rueck')), 'zweiter Versuch'); }
      await p.click(`#u-optionen button:text-is("${a.o[0]}")`);
    } else { await p.fill('#u-feld', a.t[0].toUpperCase() + '.'); await p.click('#u-eingabe .knopf'); }
    pruef(/Richtig/.test(await p.textContent('#u-rueck')), 'Rückmeldung richtig ' + i);
    await p.click('#u-weiter');
  }
  pruef(/ersten Versuch: 9\. Beim zweiten: 1\. Noch offen: 0/.test(await p.textContent('#e-ergebnis')), 'Übersicht am Ende');
  await p.click('#e-weiterlernen');
  const prompt = await p.textContent('#e-text');
  pruef(prompt === 'Ich bin in der 8. Schulstufe und habe bei der Englisch-Schularbeit im Passiv 3 von 10 Punkten erreicht. Erklär mir die Bildung des Passivs in drei Sätzen. Stell mir dann acht Übungssätze, einen nach dem anderen, und verrate die Lösung erst, wenn ich es versucht habe.', 'Weiterlernen-Prompt wie im Türchen');
  // Neu laden: Spitzname und Punkte bleiben (nur wenn Speicher frei)
  await p.reload();
  const name = await p.inputValue('#spitzname'), pk = await p.inputValue('#p-passive');
  if (gesperrt) pruef(name === '' && pk === '', 'gesperrt: nichts gespeichert, App läuft');
  else pruef(name === 'Krümel' && pk === '3', 'Spitzname und Punkte bleiben im Browser');
  // Alle Bereiche: Antworten eindeutig, keine doppelten Optionen
  const alle = await p.evaluate(() => window.__app.AUFGABEN);
  for (const [k, l] of Object.entries(alle)) { pruef(l.length === 10, k + ': 10 Aufgaben'); l.forEach((a, i) => pruef((a.o && new Set(a.o).size === 3) || (a.t && a.t.length), k + ' ' + i)); }
  pruef(!(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'kein seitliches Scrollen');
  pruef(fehler.length === 0, 'keine Fehler ' + fehler);
  await ctx.close();
}
// Baukasten
{
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.goto('http://localhost:8765/werkzeuge/prompt-baukasten/index.html');
  const t = await p.textContent('#prompt');
  pruef(t.startsWith('Bau ein Lernspiel als eine einzige HTML-Datei mit integriertem CSS und JavaScript.\n\nRahmen: Französisch, 1. Lernjahr, Thema En ville. Gespielt wird am Handy, eine Runde dauert etwa 2 Minuten;'), 'Baukasten Anfang');
  pruef(/Ablauf: 8 Aufgaben in zufälliger Reihenfolge\. Rückmeldung sofort nach jeder Aufgabe\./.test(t), 'Ablauf');
  pruef(/la gare – der Bahnhof/.test(t) && /Stell mir zuerst bis zu drei Rückfragen/.test(t), 'Inhalte und Rückfragen');
  await p.check('#schwer');
  pruef(/in der Reihenfolge meiner Liste; die leichten Aufgaben stehen oben/.test(await p.textContent('#prompt')), 'Option steigende Schwierigkeit');
  await p.click('#beispiele button:text-is("Mathematik")');
  pruef(/Rechentrainer.*erzeugt die Aufgaben selbst/s.test(await p.textContent('#prompt')), 'Rechentrainer');
  pruef(!(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'Baukasten ohne seitliches Scrollen');
}
console.log(`Bestanden: ${ok}, nicht bestanden: ${nicht}`);
await b.close();
