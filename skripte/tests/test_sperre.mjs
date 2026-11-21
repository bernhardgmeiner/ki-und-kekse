import { createRequire } from 'node:module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let ok = 0, nicht = 0; const pruef = (c, t) => { if (c) ok++; else { nicht++; console.log('FEHLER:', t); } };
async function stand(zeit, tz) {
  const ctx = await b.newContext({ timezoneId: tz, viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage(); await p.clock.setFixedTime(new Date(zeit));
  await p.goto('http://localhost:8765/');
  const r = await p.evaluate(() => [...document.querySelectorAll('.tueren .tuer')].map((t) => (t.tagName === 'A' ? (t.classList.contains('ist-heute') ? 'H' : 'O') : 'Z')).join(''));
  return { p, ctx, r };
}
// Kurz vor und genau um Mitternacht in Wien, mit Browsern in Wien, Berlin und New York
for (const tz of ['Europe/Vienna', 'Europe/Berlin', 'America/New_York']) {
  let s = await stand('2026-11-30T22:59:59Z', tz); pruef(s.r === 'Z'.repeat(24), tz + ' 30.11. 23:59:59: alle zu ' + s.r); await s.ctx.close();
  s = await stand('2026-11-30T23:00:00Z', tz); pruef(s.r === 'H' + 'Z'.repeat(23), tz + ' 1.12. 0:00: Türchen 1 heute ' + s.r); await s.ctx.close();
  s = await stand('2026-12-06T22:59:59Z', tz); pruef(s.r === 'OOOOOH' + 'Z'.repeat(18), tz + ' 6.12. 23:59: 1–5 offen, 6 heute ' + s.r); await s.ctx.close();
  s = await stand('2026-12-06T23:00:00Z', tz); pruef(s.r === 'OOOOOOH' + 'Z'.repeat(17), tz + ' 7.12. 0:00: 7 heute ' + s.r); await s.ctx.close();
  s = await stand('2026-12-24T12:00:00Z', tz); pruef(s.r === 'O'.repeat(23) + 'H', tz + ' 24.12.: alle offen, 24 heute'); await s.ctx.close();
  s = await stand('2027-01-10T12:00:00Z', tz); pruef(s.r === 'O'.repeat(24), tz + ' Jänner: alle offen (Archiv)'); await s.ctx.close();
}
// Direkter Aufruf eines künftigen Türchens
{
  const ctx = await b.newContext(); const p = await ctx.newPage(); await p.clock.setFixedTime(new Date('2026-12-06T12:00:00Z'));
  await p.goto('http://localhost:8765/sitzplan-mit-bedingungen/');
  pruef(await p.isVisible('.gesperrt') && !(await p.isVisible('.inhalt')), 'Türchen 20 am 6.12. gesperrt');
  pruef(/Sonntag, 20\. Dezember/.test(await p.textContent('.gesperrt')), 'Hinweis nennt Sonntag, 20. Dezember');
  await p.goto('http://localhost:8765/gruppen-zufall-und-timer/');
  pruef(!(await p.isVisible('.gesperrt')) && await p.isVisible('.inhalt'), 'Türchen 5 am 6.12. offen');
  // geschlossenes Türchen antippen
  await p.goto('http://localhost:8765/'); await p.click('.tueren li:nth-child(10) .tuer');
  pruef(/öffnet sich am 10\. Dezember/.test(await p.textContent('.meldung')), 'Meldung beim Antippen');
  // Vorschau mit Tag-Auswahl
  await p.goto('http://localhost:8765/?vorschau=probe-7k4m2x');
  let r = await p.evaluate(() => [...document.querySelectorAll('.tueren .tuer')].filter((t) => t.tagName === 'A').length);
  pruef(r === 24, 'Vorschau: alle 24 offen');
  await p.selectOption('.vorschau-leiste select', '12'); await p.waitForTimeout(1200); await p.waitForLoadState();
  r = await p.evaluate(() => [...document.querySelectorAll('.tueren .tuer')].map((t) => (t.tagName === 'A' ? (t.classList.contains('ist-heute') ? 'H' : 'O') : 'Z')).join(''));
  pruef(r === 'O'.repeat(11) + 'H' + 'Z'.repeat(12), 'Vorschau Stand 12.12.: ' + r);
  await p.goto('http://localhost:8765/vier-varianten-abcd-karten/');
  pruef(await p.isVisible('.gesperrt'), 'Vorschau Stand 12.12.: Türchen 22 zu');
  await p.goto('http://localhost:8765/?vorschau=aus');
  r = await p.evaluate(() => [...document.querySelectorAll('.tueren .tuer')].filter((t) => t.tagName === 'A').length);
  pruef(r === 6 && !(await p.isVisible('.vorschau-leiste')), 'Vorschau beendet, wieder echtes Datum (6 offen am 6.12., inklusive heute)');
  await p.goto('http://localhost:8765/?vorschau=falsch');
  pruef(!(await p.isVisible('.vorschau-leiste')), 'falscher Code öffnet nichts');
  await ctx.close();
}
console.log(`Bestanden: ${ok}, nicht bestanden: ${nicht}`);
await b.close();
