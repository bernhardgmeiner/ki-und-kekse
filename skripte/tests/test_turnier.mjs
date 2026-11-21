// Spielt das Turnier mit 30 Fragen viele Male durch und prüft die Regeln.
import { createRequire } from 'node:module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); p.setDefaultTimeout(2500);
const fehler = []; p.on('pageerror', (e) => fehler.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') fehler.push(m.text()); });
await p.goto('http://localhost:8765/werkzeuge/quizturnier/index.html');
let ok = 0, nicht = 0; const pruef = (bed, txt) => { if (bed) ok++; else { nicht++; console.log('FEHLER:', txt); } };
const tab = ['Frage\tA\tB\tC\trichtig\tLernziel', ...Array.from({ length: 30 }, (_, i) => `Frage ${i + 1}?\tAntwort a${i + 1}\tAntwort b${i + 1}\tAntwort c${i + 1}\t${'ABC'[i % 3]}\tZiel ${i + 1}`)].join('\n');
const md = ['| Frage | A | B | C | richtig | Lernziel |', '|---|---|---|---|---|---|', ...Array.from({ length: 30 }, (_, i) => `| **Frage ${i + 1}?** | a | b | c | ${'ABC'[i % 3]} | Z |`)].join('\n');
// Einlesen
for (const [art, text] of [['Tabulator', tab], ['Markdown', md]]) {
  const r = await p.evaluate((t) => window.__turnier.liesFragen(t), text);
  pruef(r.fragen.length === 30 && r.fehler.length === 0, `${art}: 30 Fragen, keine Fehler (${r.fragen.length}, ${r.fehler})`);
  pruef(r.fragen[0].f === 'Frage 1?' && r.fragen[1].r === 1 && r.fragen[0].a.length === 3, `${art}: Spalten richtig`);
}
const kaputt = await p.evaluate(() => window.__turnier.liesFragen('Frage\tA\tB\tC\trichtig\nX?\t1\t2\t3\tD\nY?\t1\t2\t3\tB'));
pruef(kaputt.fragen.length === 1 && kaputt.fehler.length === 1, 'falsche Lösung „D“ wird gemeldet');
// Statusmeldung
await p.fill('#fragen', tab);
const status = await p.textContent('#status');
pruef(/30 Fragen erkannt/.test(status) && /7 Duelle/.test(status) && !/knapp/.test(status), 'Status bei 8 Teams und 30 Fragen: ' + status);
await p.fill('#fragen', tab.split('\n').slice(0, 11).join('\n'));
pruef(/knapp/.test(await p.textContent('#status')), 'Warnung bei 10 Fragen');

async function turnier(teams, wahl, fragenText = tab) {
  await p.evaluate(() => { const S = window.__turnier.zustand(); if (S) document.getElementById('abbruch').click(); });
  await p.evaluate(() => { document.querySelectorAll('section').forEach((s) => (s.hidden = s.id !== 's-start')); });
  await p.fill('#teams', teams.join('\n'));
  await p.fill('#fragen', fragenText);
  await p.click('#los');
  const gesehen = new Set(); let schritte = 0, ausgegangen = 0;
  while (schritte++ < 400) {
    if (await p.isVisible('#s-ende')) break;
    if (await p.isVisible('#s-baum')) { await p.click('#weiter-duell'); continue; }
    if (await p.isVisible('#aus')) { ausgegangen++; await p.click(Math.random() < 0.5 ? '#aus-a' : '#aus-b'); continue; }
    if (await p.isVisible('#naechste')) { await p.click('#naechste'); continue; }
    const S = await p.evaluate(() => window.__turnier.zustand());
    if (await p.isVisible('#aufloesen')) {
      pruef(!gesehen.has(S.frage), 'Frage doppelt: ' + S.frage); gesehen.add(S.frage);
      await p.click('#aufloesen'); continue;
    }
    await p.click('#w-' + wahl());
  }
  const S = await p.evaluate(() => window.__turnier.zustand());
  return { S, ausgegangen, gesehen };
}
// 1) Acht Teams, zufällige Wertungen, mehrere Durchläufe
for (let i = 0; i < 6; i++) {
  const { S } = await turnier(Array.from({ length: 8 }, (_, k) => 'Team ' + (k + 1)), () => ['a', 'b', 'beide', 'keins'][Math.floor(Math.random() * 4)]);
  const sieger = S.runden[S.runden.length - 1][0].sieger;
  pruef(await p.isVisible('#s-ende') && sieger !== null, 'Turnier endet mit Sieger');
  pruef(S.runden.length === 3 && S.runden[0].every((m) => !m.frei), '8 Teams: drei Runden, keine Freilose');
  const duelle = S.runden.flat().filter((m) => !m.frei).length;
  pruef(duelle === 7, '7 Duelle');
  const liste = await p.$$eval('#falsch li', (l) => l.length);
  pruef(liste === S.beideFalsch.length, 'Liste „beide falsch“ vollständig');
}
// 2) Sechs Teams: Freilose
{
  const { S } = await turnier(['A', 'B', 'C', 'D', 'E', 'F'], () => (Math.random() < 0.5 ? 'a' : 'b'));
  const frei = S.runden[0].filter((m) => m.frei);
  pruef(frei.length === 2 && frei.every((m) => m.sieger === m.a), '6 Teams: zwei Freilose, Team kommt weiter');
  pruef(S.runden[1].every((m) => !(S.runden[0][0].frei && S.runden[0][1].frei)), 'Freilose nicht im selben Ast');
  pruef(await p.isVisible('#s-ende'), '6 Teams: Turnier endet');
}
// 3) Fragen gehen aus (nur 5 Fragen, immer „beide falsch“)
{
  const wenig = tab.split('\n').slice(0, 6).join('\n');
  const { S, ausgegangen } = await turnier(Array.from({ length: 8 }, (_, k) => 'T' + k), () => 'keins', wenig);
  pruef(ausgegangen >= 1, 'Meldung, wenn die Fragen aus sind');
  pruef(await p.isVisible('#s-ende'), 'Turnier endet auch ohne Fragen');
  pruef(S.beideFalsch.length === 5, 'alle 5 Fragen in der Liste „beide falsch“');
}
// 4) Zurücknehmen
{
  await p.click('#abbruch').catch(() => {});
  await p.evaluate(() => { document.querySelectorAll('section').forEach((s) => (s.hidden = s.id !== 's-start')); });
  await p.fill('#teams', 'Rot\nBlau'); await p.fill('#fragen', tab); await p.click('#los');
  await p.click('#weiter-duell'); await p.click('#aufloesen');
  const vorher = await p.evaluate(() => JSON.stringify(window.__turnier.zustand().runden));
  await p.click('#w-a');
  pruef(await p.isVisible('#naechste'), '1 Punkt reicht zum Sieg');
  await p.click('#zurueck-duell');
  const nachher = await p.evaluate(() => JSON.stringify(window.__turnier.zustand().runden));
  pruef(vorher === nachher, 'Zurücknehmen stellt den Stand wieder her');
  pruef(await p.isVisible('#wertung'), 'nach dem Zurücknehmen wieder bei der Wertung');
  const erwartet = await p.evaluate(() => { const S = window.__turnier.zustand(); return S.teams[S.runden[0][0].b]; });
  await p.click('#w-b'); await p.click('#naechste');
  pruef(await p.isVisible('#s-ende') && (await p.textContent('#sieger')) === erwartet, 'Sieger nach geänderter Wertung');
  await p.click('#zurueck-ende');
  pruef(await p.isVisible('#s-duell'), 'Zurücknehmen auch vom Ende aus');
}
// 5) Zwei Punkte zum Weiterkommen
{
  await p.click('#zum-baum'); await p.click('#abbruch');
  await p.fill('#teams', 'Rot\nBlau'); await p.selectOption('#punkte', '2'); await p.fill('#fragen', tab); await p.click('#los');
  await p.click('#weiter-duell'); await p.click('#aufloesen'); await p.click('#w-a');
  pruef(await p.isVisible('#aufloesen') && !(await p.isVisible('#naechste')), 'mit 2 Punkten reicht einer nicht');
  await p.click('#aufloesen'); await p.click('#w-a');
  pruef(await p.isVisible('#naechste'), 'zweiter Punkt entscheidet');
  await p.selectOption('#punkte', '1').catch(() => {});
}
// 6) Handybreite ohne seitliches Scrollen
await p.setViewportSize({ width: 390, height: 844 });
await p.click('#naechste'); await p.click('#baum-ende');
const quer = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
pruef(!quer, 'kein seitliches Scrollen am Handy');
// 7) Nichts gespeichert, nichts nachgeladen
const speicher = await p.evaluate(() => { try { return localStorage.length + sessionStorage.length; } catch (e) { return 0; } });
pruef(speicher === 0, 'nichts im Browser gespeichert');
pruef(fehler.length === 0, 'keine Fehler in der Konsole: ' + fehler.join(' | '));
console.log(`Bestanden: ${ok}, nicht bestanden: ${nicht}`);
await b.close();
