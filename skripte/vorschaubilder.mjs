// Erzeugt die Vorschaubilder für geteilte Links (1200 × 630) und die Favicon-PNGs.
// Läuft nicht bei jedem Bau, sondern nur, wenn sich Titel oder Adressen ändern:
//   node skripte/vorschaubilder.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PIXEL_CSS, svg, RASTER, FARBEN } from './pixel.mjs';

const require = createRequire(process.env.PLAYWRIGHT_ORT || '/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const WURZEL = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

const tueren = fs.readdirSync(path.join(WURZEL, 'texte')).filter((f) => /^\d\d\.md$/.test(f)).sort().map((f) => {
  const kopf = fs.readFileSync(path.join(WURZEL, 'texte', f), 'utf8').split('---')[1];
  const wert = (k) => (kopf.match(new RegExp(`^${k}:(.*)$`, 'm')) || [])[1]?.trim();
  const titel = wert('titel');
  const adresse = wert('adresse') || titel.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return { n: +wert('nummer'), titel, adresse };
});

const stil = fs.readFileSync(path.join(WURZEL, 'statisch/stil.css'), 'utf8').replace(/url\("schrift\//g, `url("${pathToFileURL(path.join(WURZEL, 'statisch/schrift')).href}/`) + PIXEL_CSS;
const rahmen = (inhalt) => `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>${stil}
html,body{width:1200px;height:630px;overflow:hidden}
body{--m:12px;background-color:var(--gruen);background-image:var(--strick);background-size:12px 12px;color:var(--creme);position:relative}
.band{position:absolute;left:0;right:0;top:24px}
.rippe{position:absolute;left:0;right:0;bottom:0;height:30px;background:repeating-linear-gradient(90deg,var(--gruen-dunkel) 0 6px,var(--gruen) 6px 12px)}
.tuer{--m:24px;position:absolute;left:84px;top:216px;width:264px;height:264px;background:var(--gelb);color:var(--rot);box-shadow:inset 0 0 0 12px rgba(0,0,0,.08),0 8px 0 rgba(0,0,0,.18)}
.tuer .zahl{--p:24px}
.rechts{position:absolute;left:408px;top:204px;right:72px}
.marke{display:flex;align-items:center;gap:16px}
.marke .zeichen{--z:5px}.marke .schriftzug{--w:6px}
.nr{margin:26px 0 0;font-weight:800;font-size:42px;line-height:1;color:var(--gelb)}
.titel{margin:14px 0 0;font-weight:700;font-size:62px;line-height:1.08;letter-spacing:-.01em;text-wrap:balance}
.unten{position:absolute;left:408px;bottom:62px;font-weight:600;font-size:27px}
.mitte{position:absolute;inset:176px 0 30px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.mitte .zeichen{--z:10px}.mitte .schriftzug{--w:12px;margin-top:26px}
.mitte .u{margin:26px 0 0;font-weight:600;font-size:42px;line-height:1.1}
.mitte .d{margin:14px 0 0;font-family:var(--pixel);font-weight:500;font-size:34px;color:var(--gelb)}
</style></head><body><div class="band"></div>${inhalt}<div class="rippe"></div></body></html>`;

const tuerBild = (t) => rahmen(`<div class="tuer"><span class="zahl z${t.n}" style="--zb:${t.n > 9 ? 7 : 3}"></span></div>
<div class="rechts"><div class="marke"><span class="px strick zeichen"></span><span class="px strick schriftzug"></span></div>
<p class="nr">Türchen ${t.n}</p><p class="titel">${esc(t.titel)}</p></div>
<div class="unten">24 Türchen KI für die Schule · Bernhard Gmeiner</div>`);
const startBild = rahmen(`<div class="mitte"><span class="px strick zeichen"></span><span class="px strick schriftzug"></span>
<p class="u">24 Türchen KI für die Schule</p><p class="d">Bernhard Gmeiner · 1. bis 24. Dezember 2026</p></div>`);

const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const seite = await browser.newPage({ viewport: { width: 1200, height: 630 } });
const ziel = path.join(WURZEL, 'statisch/vorschau');
fs.mkdirSync(ziel, { recursive: true });
for (const f of fs.readdirSync(ziel)) fs.rmSync(path.join(ziel, f));
const tmp = path.join(WURZEL, '_bild.html');
async function bild(html, datei) {
  fs.writeFileSync(tmp, html);
  await seite.goto(pathToFileURL(tmp).href);
  await seite.evaluate(() => document.fonts.ready);
  await seite.screenshot({ path: datei });
}
await bild(startBild, path.join(ziel, 'start.png'));
for (const t of tueren) await bild(tuerBild(t), path.join(ziel, `${t.adresse}.png`));

// Favicons: Zeichen auf Tannengrün
for (const [px, datei] of [[32, 'favicon-32.png'], [180, 'apple-touch-icon.png']]) {
  await seite.setViewportSize({ width: px, height: px });
  fs.writeFileSync(tmp, `<body style="margin:0">${svg(RASTER.zeichen, { rand: 1, grund: FARBEN.g, groesse: px })}</body>`);
  await seite.goto(pathToFileURL(tmp).href);
  await seite.screenshot({ path: path.join(WURZEL, 'statisch', datei) });
}
fs.rmSync(tmp);
await browser.close();
console.log(`Vorschaubilder: ${tueren.length + 1}, dazu zwei Favicons.`);
