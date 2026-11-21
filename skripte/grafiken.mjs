// Erzeugt die Grafiken für die Türchen (derzeit: die acht Rollen in Türchen 6).
//   node skripte/grafiken.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PIXEL_CSS, FARBEN } from './pixel.mjs';

const require = createRequire(process.env.PLAYWRIGHT_ORT || '/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const WURZEL = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const stil = fs.readFileSync(path.join(WURZEL, 'statisch/stil.css'), 'utf8').replace(/url\("schrift\//g, `url("${pathToFileURL(path.join(WURZEL, 'statisch/schrift')).href}/`) + PIXEL_CSS;

// Farben für die Pixelbilder
const F = { ...FARBEN, t: '#2f7a55', d: '#16432e', o: '#1f2e25', w: '#fffaf2', l: '#c9bfae', h: '#a8692f', c: '#dfa65f', r: '#c0303a', y: '#f2c14e', b: '#7fb8d6', '.': null };

// kleines Zeichenbrett für Pixelraster
function brett(W, H) {
  const g = Array.from({ length: H }, () => Array(W).fill('.'));
  const p = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = c; };
  const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) p(x, y, c); };
  const rahmen = (x0, y0, x1, y1, c) => { rect(x0, y0, x1, y0, c); rect(x0, y1, x1, y1, c); rect(x0, y0, x0, y1, c); rect(x1, y0, x1, y1, c); };
  const kreis = (cx, cy, r, c, innen = -1) => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const d = Math.hypot(x + .5 - cx, y + .5 - cy); if (d <= r && d > innen) p(x, y, c); } };
  return { g, p, rect, rahmen, kreis, text: () => g.map((z) => z.join('')).join('\n') };
}

// Szene von der Seite: Schüler:in und Roboter spielen Tischtennis
function szene() {
  const B = brett(100, 40), { p, rect } = B;
  rect(4, 38, 95, 38, 'l');                       // Boden
  // Tisch
  rect(30, 24, 70, 24, 'w'); rect(30, 25, 70, 26, 't'); rect(30, 27, 70, 27, 'd');
  rect(33, 28, 34, 37, 'o'); rect(66, 28, 67, 37, 'o'); rect(35, 31, 65, 31, 'o');
  // Netz
  rect(49, 17, 51, 17, 'w'); rect(49, 17, 49, 23, 'o'); rect(51, 17, 51, 23, 'o');
  for (let y = 18; y <= 23; y++) p(50, y, y % 2 ? 'l' : 'o');
  // Schüler:in links, schaut nach rechts
  rect(19, 12, 23, 13, 'o'); rect(18, 13, 19, 16, 'o');      // Haare
  rect(20, 14, 23, 17, 'c'); p(22, 15, 'o');                 // Gesicht, Auge
  rect(18, 18, 24, 27, 'r'); rect(18, 18, 24, 18, 'w');      // Pullover mit Kragen
  for (let x = 18; x <= 24; x += 2) p(x, 22, 'w');           // Norwegerpunkte
  rect(25, 20, 27, 21, 'r'); rect(28, 20, 28, 21, 'c');      // Arm, Hand
  rect(29, 16, 31, 20, 'o'); rect(28, 17, 32, 19, 'o'); rect(29, 21, 30, 22, 'h');   // Schläger
  rect(19, 28, 20, 36, 'd'); rect(22, 28, 23, 36, 'd'); rect(18, 37, 20, 37, 'o'); rect(22, 37, 24, 37, 'o');
  // Roboter rechts, schaut nach links
  p(78, 9, 'r'); rect(78, 10, 78, 11, 'o');
  rect(75, 12, 81, 17, 'o'); p(76, 14, 'y'); p(78, 14, 'y'); rect(76, 16, 78, 16, 'w');
  rect(74, 18, 82, 28, 'o'); rect(77, 21, 79, 23, 'y');
  rect(71, 20, 73, 21, 'o');                                  // Arm
  rect(67, 16, 69, 20, 'r'); rect(66, 17, 70, 19, 'r'); rect(68, 21, 69, 22, 'h');   // Schläger
  rect(75, 29, 76, 37, 'o'); rect(80, 29, 81, 37, 'o');
  // Ballflug
  const bahn = [[34, 15], [37, 12], [40, 10], [43, 9]];
  bahn.forEach(([x, y]) => p(x, y, 'l'));
  rect(46, 8, 47, 9, 'y');
  return B.text().split('\n').slice(6).join('\n');   // oben leere Zeilen weg
}

// Zeichen für die acht Rollen, je 16 × 16
function zeichen(n) {
  const B = brett(16, 16), { p, rect, rahmen, kreis } = B;
  if (n === 1) {          // steigt aus: Tür, Pfeil nach draußen
    rect(1, 1, 8, 15, 'h'); rect(2, 2, 7, 15, 'y'); p(6, 9, 'o');
    rect(7, 7, 13, 8, 'r'); rect(12, 5, 12, 10, 'r'); rect(13, 6, 13, 9, 'r'); rect(14, 7, 14, 8, 'r');
  } else if (n === 2) {   // verbietet: Schläger unter Verbotsschild
    kreis(7, 7, 3.6, 'o'); rect(9, 9, 10, 10, 'h'); rect(11, 11, 12, 12, 'h');
    kreis(8, 8, 7.6, 'r', 5.6);
    for (let i = 0; i < 12; i++) { p(3 + i, 3 + i, 'r'); p(3 + i, 2 + i, 'r'); }
  } else if (n === 3) {   // will den Stecker ziehen
    rect(0, 3, 5, 12, 'w'); rahmen(0, 3, 5, 12, 'o'); rect(2, 6, 3, 6, 'o'); rect(2, 9, 3, 9, 'o');
    rect(7, 6, 8, 6, 'y'); rect(7, 9, 8, 9, 'y');
    rect(9, 4, 12, 11, 'o'); rect(13, 7, 14, 8, 'o'); rect(15, 7, 15, 15, 'o');
    p(6, 2, 'r'); p(7, 1, 'r'); p(6, 13, 'r'); p(7, 14, 'r');
  } else if (n === 4) {   // schaut weg: Ball links, Blick nach rechts
    rect(1, 7, 2, 8, 'y');
    kreis(9.5, 8.5, 6.2, 'c'); rect(5, 2, 13, 3, 'o'); rect(4, 3, 5, 5, 'o');
    rect(7, 7, 8, 8, 'w'); rect(11, 7, 12, 8, 'w'); p(8, 7, 'o'); p(8, 8, 'o'); p(12, 7, 'o'); p(12, 8, 'o');
    rect(9, 12, 12, 12, 'o');
  } else if (n === 5) {   // nutzt KI nur selbst: Laptop mit Roboter, nur für sich
    rect(1, 2, 14, 11, 'o'); rect(2, 3, 13, 10, 't');
    rect(5, 5, 6, 6, 'y'); rect(9, 5, 10, 6, 'y'); rect(5, 8, 10, 8, 'w');
    rect(0, 12, 15, 13, 'l'); rect(0, 14, 15, 14, 'o');
  } else if (n === 6) {   // beobachtet: Auge
    for (let x = 0; x < 16; x++) { const h = Math.round(5.2 * Math.sin(Math.PI * (x + .5) / 16)); rect(x, 8 - h, x, 7 + h, 'w'); p(x, 8 - h, 'o'); p(x, 7 + h, 'o'); }
    kreis(8, 8, 3.4, 't'); rect(7, 7, 8, 8, 'o'); p(9, 6, 'w');
  } else if (n === 7) {   // setzt Regeln: gelbe und rote Karte
    rect(1, 1, 8, 12, 'o'); rect(2, 2, 7, 11, 'y');
    rect(7, 4, 14, 15, 'o'); rect(8, 5, 13, 14, 'r');
  } else if (n === 8) {   // begleitet aktiv: Klemmbrett mit Haken
    rect(2, 2, 13, 15, 'h'); rect(3, 4, 12, 14, 'w'); rect(6, 1, 9, 3, 'o');
    p(4, 7, 'g'); p(5, 8, 'g'); p(6, 7, 'g'); p(7, 6, 'g'); rect(8, 7, 11, 7, 'l');
    p(4, 11, 'g'); p(5, 12, 'g'); p(6, 11, 'g'); p(7, 10, 'g'); rect(8, 11, 11, 11, 'l');
  }
  return B.text();
}

function rasterSvg(r, stil = 'width:100%;height:auto;display:block') {
  const z = r.trim().split('\n'), w = Math.max(...z.map((x) => x.length)), h = z.length;
  let q = '';
  z.forEach((zeile, y) => [...zeile].forEach((c, x) => { if (F[c]) q += `<rect x="${x}" y="${y}" width="1" height="1" fill="${F[c]}"/>`; }));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" style="${stil}">${q}</svg>`;
}

const ROLLEN = [
  ['Verweigerer:in', 'steigt aus'], ['Spielverderber:in', 'verbietet'], ['Notbremser:in', 'will den Stecker ziehen'], ['Gleichgültige:r', 'schaut weg'],
  ['Ego-Spieler:in', 'nutzt KI nur selbst'], ['Zuschauer:in', 'beobachtet'], ['Schiedsrichter:in', 'setzt Regeln'], ['Coach', 'begleitet aktiv'],
];

const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>${stil}
html,body{width:1200px;height:1700px;overflow:hidden}
body{background:var(--creme);--m:12px}
.oben{position:relative;height:250px;background-color:var(--gruen);background-image:var(--strick);background-size:12px 12px}
.oben .band{position:absolute;left:0;right:0;top:22px}
.oben .marke{position:absolute;left:60px;bottom:28px;display:flex;align-items:center;gap:16px}
.oben .marke .zeichen{--z:5px}.oben .marke .schriftzug{--w:6px}
.titel{margin:46px 60px 0;font-weight:800;font-size:92px;line-height:1;color:var(--text)}
.unter{margin:14px 60px 0;font-family:var(--pixel);font-weight:600;font-size:40px;color:var(--rot)}
.tisch{margin:22px 60px 0;padding:0 30px;background:var(--papier);border:5px solid var(--gruen);box-shadow:0 6px 0 var(--gruen-dunkel)}
.rollen{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:22px 26px;margin:32px 60px 0}
.rolle{display:flex;gap:20px;align-items:center;min-height:140px;padding:16px 22px 16px 30px;background:var(--papier);border:5px solid var(--gruen);box-shadow:0 6px 0 var(--gruen-dunkel)}
.rolle .bild{position:relative;flex:none;width:112px;height:112px;padding:8px;background:var(--creme)}
.rolle .nr{position:absolute;left:-16px;top:-16px;display:flex;align-items:center;justify-content:center;width:52px;height:52px;background:var(--gelb);box-shadow:0 3px 0 rgba(0,0,0,.18)}
.rolle .nr .zahl{--p:8px;color:var(--rot)}
.rolle b{display:block;font-size:39px;line-height:1.05;font-weight:800}
.rolle span{display:block;margin-top:8px;font-size:32px;color:var(--leise)}
.quelle{margin:30px 60px 0;max-width:none;text-align:left;font-size:22px;line-height:1.35;color:var(--leise)}
</style></head><body>
<div class="oben"><div class="band"></div><div class="marke"><span class="px strick zeichen"></span><span class="px strick schriftzug"></span></div></div>
<p class="titel">Pingpong mit KI</p>
<p class="unter">Acht Rollen am Tisch</p>
<div class="tisch">${rasterSvg(szene())}</div>
<div class="rollen">${ROLLEN.map(([n, f], i) => `<div class="rolle"><div class="bild">${rasterSvg(zeichen(i + 1))}<div class="nr"><span class="zahl z${i + 1}" style="--zb:3"></span></div></div><div><b>${n}</b><span>${f}</span></div></div>`).join('')}</div>
<p class="quelle">Die acht Rollen aus Bernhard Gmeiners Kolumne „Pingpong mit KI“ (DER STANDARD) · KI &amp; Kekse, Türchen 6</p>
</body></html>`;

const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const seite = await browser.newPage({ viewport: { width: 1200, height: 1700 } });
const tmp = path.join(WURZEL, '_bild.html');
fs.writeFileSync(tmp, html);
await seite.goto(pathToFileURL(tmp).href);
await seite.evaluate(() => document.fonts.ready);
await seite.screenshot({ path: path.join(WURZEL, 'grafiken/dateien/pingpong-rollen.png') });
fs.rmSync(tmp);
await browser.close();

const alt = 'Grafik „Pingpong mit KI, acht Rollen am Tisch“: ' + ROLLEN.map(([n, f], i) => `${i + 1} ${n} (${f})`).join(', ');
fs.writeFileSync(path.join(WURZEL, 'grafiken/pingpong-rollen.html'),
  `<figure class="grafik"><img src="{{tiefe}}grafiken/pingpong-rollen.png" width="1200" height="1700" loading="lazy" alt="${alt}"><figcaption><a href="{{tiefe}}grafiken/pingpong-rollen.png" target="_blank" rel="noopener">Grafik in voller Größe öffnen (zum Ausdrucken)</a></figcaption></figure>\n`);
console.log('Grafik: pingpong-rollen.png');
