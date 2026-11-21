// Test für werkzeuge/echt-oder-ki. Erwartet einen Server auf localhost:8765 mit _site/ als Wurzel.
import { createRequire } from 'node:module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let ok = 0, nicht = 0; const pruef = (c, t) => { if (c) ok++; else { nicht++; console.log('FEHLER:', t); } };
for (const breite of [390, 1280]) {
  const ctx = await b.newContext({ viewport: { width: breite, height: breite < 500 ? 844 : 800 } });
  const p = await ctx.newPage(); p.setDefaultTimeout(2500);
  const fehler = [], fremd = [];
  p.on('pageerror', (e) => fehler.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') fehler.push(m.text()); });
  p.on('request', (r) => { if (!r.url().startsWith('http://localhost:8765/')) fremd.push(r.url()); });
  await p.goto('http://localhost:8765/werkzeuge/echt-oder-ki/index.html');
  await p.waitForLoadState('networkidle');
  pruef(await p.isHidden('#aufloesung'), breite + ': Auflösung anfangs verborgen');
  const B = await p.evaluate(() => window.__echtoderki.BILDER);
  pruef(B.length === 12 && B.filter((x) => x.ki).length === 6, 'zwölf Bilder, sechs generiert');
  pruef(B.every((x) => x.ki || (x.autor && x.lizenz && x.datei)), 'jedes Foto mit Urheber, Lizenz und Datei');
  for (let i = 0; i < 12; i++) {
    const bild = await p.$eval('#bild', (im) => ({ w: im.naturalWidth, alt: im.alt, src: im.getAttribute('src') }));
    pruef(bild.w > 0, breite + ': Bild ' + (i + 1) + ' geladen');
    pruef(!/echt|ki|generiert|gemini/i.test(bild.src + bild.alt.replace(/^Bild \d+ von 12: /, '')), 'Bild ' + (i + 1) + ': Dateiname und Alt-Text verraten nichts');
    pruef(await p.isHidden('#aufloesung'), 'Bild ' + (i + 1) + ': verborgen vor dem Tippen');
    await p.click('#aufloesen');
    const urteil = await p.textContent('#urteil');
    pruef(urteil === (B[i].ki ? 'Generiert' : 'Echt'), 'Bild ' + (i + 1) + ': Urteil ' + urteil);
    const quelle = await p.textContent('#quelle');
    pruef(B[i].ki ? /Gemini/.test(quelle) : quelle.includes(B[i].autor) && quelle.includes(B[i].lizenz), 'Bild ' + (i + 1) + ': Quelle');
    const links = await p.$$eval('#quelle a', (l) => l.map((a) => a.href));
    pruef(B[i].ki ? links.length === 0 : links.length === 2 && links[1].startsWith('https://commons.wikimedia.org/wiki/File:'), 'Bild ' + (i + 1) + ': Links');
    const sw = await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    pruef(sw, breite + ': kein seitliches Scrollen bei Bild ' + (i + 1));
    await p.click('#weiter');
  }
  pruef(await p.isVisible('#ueberblick'), breite + ': nach Bild 12 kommt der Überblick');
  const kacheln = await p.$$eval('.kachel', (l) => l.length);
  pruef(kacheln === 12, 'zwölf Kacheln');
  pruef(await p.isVisible('#summe'), 'Summe da, weil alle einzeln aufgelöst');
  await p.reload(); await p.click('#zumUeberblick');
  pruef(await p.isHidden('#summe') && (await p.$$eval('.kachel .marke', (l) => l.length)) === 0, 'frischer Überblick: nichts aufgedeckt');
  await p.click('.kachel:nth-child(3) .neben');
  pruef((await p.$$eval('.kachel .marke', (l) => l.map((x) => x.textContent))).join() === 'Generiert', 'einzelne Kachel aufdecken');
  await p.click('#alleAuf');
  const marken = await p.$$eval('.kachel .marke', (l) => l.map((x) => x.textContent));
  pruef(marken.length === 12 && marken.filter((m) => m === 'Generiert').length === 6, 'alle aufgedeckt');
  pruef(await p.isVisible('#summe'), 'Summe sichtbar');
  await p.click('.kachel:nth-child(5) button.bild');
  pruef(await p.textContent('#nr') === '5' && await p.isHidden('#aufloesung'), 'Kachel springt zu Bild 5, verdeckt');
  await p.keyboard.press('ArrowRight');
  pruef(await p.textContent('#nr') === '6', 'Pfeiltaste weiter');
  await p.keyboard.press('a');
  pruef(await p.isVisible('#aufloesung'), 'Taste A löst auf');
  await p.keyboard.press('ArrowLeft');
  pruef(await p.textContent('#nr') === '5' && await p.isHidden('#aufloesung'), 'Pfeiltaste zurück, wieder verdeckt');
  if (breite === 390) await p.screenshot({ path: '/tmp/eok_390.png', fullPage: true });
  else { await p.click('#aufloesen'); await p.screenshot({ path: '/tmp/eok_1280.png' }); }
  pruef(fehler.length === 0, breite + ': Konsole ' + fehler.join(' | '));
  pruef(fremd.length === 0, breite + ': fremde Anfragen ' + fremd.join(' | '));
  await ctx.close();
}
// Eingebettet im Türchen 4
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage(); await p.clock.setFixedTime(new Date('2026-12-05T12:00:00Z'));
await p.goto('http://localhost:8765/echt-oder-ki/index.html');
await p.waitForTimeout(1500);
const h = await p.$eval('.werkzeug iframe[data-ordner="echt-oder-ki"]', (f) => f.offsetHeight).catch(() => 0);
pruef(h > 400, 'Türchen 4: Werkzeug eingebettet, Höhe ' + h);
pruef(!(await p.$('.platzhalter')) || !(await p.textContent('body')).includes('Bilderset folgt'), 'Türchen 4: kein Platzhalter mehr');
await p.screenshot({ path: '/tmp/eok_tuer4.png', fullPage: false });
await ctx.close();
await b.close();
console.log(`Bilderset: ${ok} bestanden, ${nicht} nicht`);
