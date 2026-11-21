// KI & Kekse – baut die Website aus den Texten in texte/ nach _site/.
// Aufruf: node bauen.mjs            (für advent.bernhardgmeiner.com)
//         node bauen.mjs --vorschau  (Links mit index.html, für die Vorschau als Artifact)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import { PIXEL_CSS, svg, RASTER, zahlRaster, FARBEN } from './skripte/pixel.mjs';

const WURZEL = path.dirname(fileURLToPath(import.meta.url));
const ZIEL = path.join(WURZEL, '_site');
const E = JSON.parse(fs.readFileSync(path.join(WURZEL, 'einstellungen.json'), 'utf8'));
const VORSCHAU_BAU = process.argv.includes('--vorschau');
const DATEI = VORSCHAU_BAU ? 'index.html' : '';
const PLATZHALTER = [];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const WOCHENTAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

export function adresse(titel) {
  return titel.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ---------- Texte einlesen ----------
function liesTuerchen(datei) {
  const roh = fs.readFileSync(datei, 'utf8').replace(/\r\n/g, '\n');
  const m = roh.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`${datei}: Kopf zwischen --- und --- fehlt`);
  const kopf = {};
  for (const zeile of m[1].split('\n')) {
    if (!zeile.trim()) continue;
    const i = zeile.indexOf(':');
    if (i < 0) throw new Error(`${datei}: Zeile ohne Doppelpunkt im Kopf: ${zeile}`);
    kopf[zeile.slice(0, i).trim()] = zeile.slice(i + 1).trim();
  }
  const n = parseInt(kopf.nummer, 10);
  if (!(n >= 1 && n <= 24)) throw new Error(`${datei}: nummer muss 1 bis 24 sein`);
  if (!kopf.titel) throw new Error(`${datei}: titel fehlt`);
  return { ...kopf, n, adresse: kopf.adresse || adresse(kopf.titel), text: m[2].trim() };
}

const tueren = fs.readdirSync(path.join(WURZEL, 'texte')).filter((f) => /^\d\d\.md$/.test(f)).sort()
  .map((f) => liesTuerchen(path.join(WURZEL, 'texte', f)));
if (tueren.length !== 24) throw new Error(`Erwartet 24 Türchen, gefunden ${tueren.length}`);
tueren.forEach((t, i) => { if (t.n !== i + 1) throw new Error(`Türchen ${i + 1}: Nummer im Kopf ist ${t.n}`); });
if (new Set(tueren.map((t) => t.adresse)).size !== 24) throw new Error('Zwei Türchen haben dieselbe Adresse');

// ---------- Markdown ----------
const KOPIER_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"></rect><path d="M5 15V5a2 2 0 0 1 2-2h10"></path></svg>';
const TEIL_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"></path><path d="M12 3v13"></path><path d="M7 8l5-5 5 5"></path></svg>';

// Tagesplan (Tabelle unter „## Der Tagesplan“) als Text, für die Prompt-Box in Türchen 24
function planAlsText(md) {
  const ab = md.split(/^## Der Tagesplan\s*$/m)[1];
  if (!ab) throw new Error('plan_im_prompt: Abschnitt „Der Tagesplan“ fehlt');
  const zeilen = ab.split('\n').filter((z) => z.trim().startsWith('|'));
  const zellen = (z) => z.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim().replace(/\[([^\]]+)\]\([^)]*\)/g, '$1'));
  const kopf = zellen(zeilen[0]);
  return zeilen.slice(2).map((z) => {
    const c = zellen(z);
    return [c[0], ...c.slice(1).map((x, i) => `${kopf[i + 1]}: ${x}`)].join('\n');
  }).join('\n\n');
}

function zuHtml(md, tiefe, t = {}) {
  if (t.plan_im_prompt === 'ja') {
    const plan = planAlsText(md);
    let ersetzt = 0;
    md = md.replace(/^\[Plan\]$/m, () => { ersetzt++; return plan; });
    if (ersetzt !== 1) throw new Error(`Türchen ${t.n}: Zeile „[Plan]“ im Prompt nicht gefunden`);
  }
  const karten = t.karten === 'ja';
  const r = new marked.Renderer();
  r.code = ({ text, lang }) => `<div class="prompt">${lang === 'prompt' ? '<div class="titel">Prompt zum Kopieren</div>' : ''}<pre>${esc(text)}</pre><button type="button" class="kopieren">${KOPIER_ICON}<span>Kopieren</span></button></div>\n`;
  r.table = function (token) {
    const zelle = (c, tag) => `<${tag}>${this.parser.parseInline(c.tokens)}</${tag}>`;
    const kopf = `<tr>${token.header.map((c) => zelle(c, 'th')).join('')}</tr>`;
    const etikett = token.header.map((c) => esc(c.text.replace(/[*_`]/g, '')));
    const zeilen = token.rows.map((z) => `<tr>${z.map((c, i) => (karten && etikett[i] ? zelle(c, 'td').replace('<td>', `<td data-etikett="${etikett[i]}">`) : zelle(c, 'td'))).join('')}</tr>`).join('');
    return `<div class="tabelle${karten ? ' karten' : ''}"${karten ? '' : ' tabindex="0"'}><table><thead>${kopf}</thead><tbody>${zeilen}</tbody></table></div>\n`;
  };
  r.link = function ({ href, tokens }) {
    const aussen = /^https?:/.test(href);
    return `<a href="${esc(href)}"${aussen ? ' target="_blank" rel="noopener"' : ''}>${this.parser.parseInline(tokens)}</a>`;
  };
  r.heading = function ({ tokens, depth }) {
    return `<h${Math.max(2, depth)}>${this.parser.parseInline(tokens)}</h${Math.max(2, depth)}>\n`;
  };
  let html = marked.parse(md, { renderer: r, gfm: true });
  // {{werkzeug: ordner | Beschriftung}} bettet ein Mini-Tool aus werkzeuge/ ein
  html = html.replace(/<p>\{\{\s*werkzeug:\s*([a-z0-9-]+)\s*(?:\|\s*([^}]*))?\}\}<\/p>/g, (_, ordner, titel) => {
    if (!fs.existsSync(path.join(WURZEL, 'werkzeuge', ordner, 'index.html'))) {
      if (!VORSCHAU_BAU && !process.env.LUECKEN_ERLAUBT) throw new Error(`Werkzeug fehlt: werkzeuge/${ordner}`);
      PLATZHALTER.push(`Türchen ${t.n}: Werkzeug ${ordner} fehlt noch`);
      return VORSCHAU_BAU ? `<div class="platzhalter">Hier kommt noch: ${esc((titel || ordner).trim())}</div>` : '';
    }
    const ziel = `${tiefe}werkzeuge/${ordner}/${DATEI}`;
    return `<div class="werkzeug"><iframe src="${ziel}" allow="fullscreen" title="${esc((titel || 'Werkzeug').trim())}" data-ordner="${ordner}"></iframe><a class="gross" href="${ziel}" target="_blank" rel="noopener">Groß in eigenem Tab öffnen</a></div>`;
  });
  // Eine Zeile, die nur aus einem Link auf ein Instagram-Reel besteht, wird zur Einbettung mit zwei Klicks:
  // erst nach dem Tippen lädt Instagram (Cookies), vorher geht keine Anfrage an fremde Server.
  html = html.replace(/<p><a href="https:\/\/www\.instagram\.com\/reel\/([A-Za-z0-9_-]+)\/?[^"]*"[^>]*>([^<]+)<\/a><\/p>/g, (_, id, text) =>
    `<figure class="reel" data-reel="${id}"><div class="reel-karte"><span class="reel-zeichen" aria-hidden="true"></span><div><p class="reel-titel">${text}</p><p class="reel-hinweis">Erst wenn du auf „Abspielen“ tippst, lädt Instagram das Video und setzt dabei Cookies.</p><div class="reel-knoepfe"><button type="button" class="knopf reel-laden">Abspielen</button><a href="https://www.instagram.com/reel/${id}/" target="_blank" rel="noopener">Auf Instagram öffnen</a></div></div></div></figure>`);
  html = html.replace(/<p>\{\{\s*grafik:\s*([a-z0-9-]+)\s*\}\}<\/p>/g, (_, name) => {
    const datei = path.join(WURZEL, 'grafiken', `${name}.html`);
    if (!fs.existsSync(datei)) {
      if (!VORSCHAU_BAU) throw new Error(`Grafik fehlt: grafiken/${name}.html`);
      PLATZHALTER.push(`Türchen ${t.n}: Grafik ${name} fehlt noch`);
      return '<div class="platzhalter">Hier kommt die Grafik hin.</div>';
    }
    return fs.readFileSync(datei, 'utf8').replace(/\{\{tiefe\}\}/g, tiefe);
  });
  html = html.replace(/<p>\{\{\s*platzhalter:\s*([^}]*)\}\}<\/p>/g, (_, text) => {
    PLATZHALTER.push(`Türchen ${t.n}: ${text.trim()}`);
    return VORSCHAU_BAU ? `<div class="platzhalter">${text.trim()}</div>` : '';
  });
  return html;
}
const inline = (md) => marked.parseInline(md || '', { gfm: true }).replace(/<a href="(https?:[^"]*)"/g, '<a href="$1" target="_blank" rel="noopener"');

// ---------- Bausteine ----------
const zahl = (n) => `<span class="zahl z${n}" style="--zb:${n > 9 ? 7 : 3}"></span><span class="nur-vorlesen">${n}</span>`;
const marke = `<span class="px strick zeichen" aria-hidden="true"></span><span class="px strick schriftzug" aria-hidden="true"></span><span class="nur-vorlesen">KI &amp; Kekse</span>`;

function kopfbereich({ titel, beschreibung, url, bild, tiefe, tuer = 0, startseite = false }) {
  const kk = { code: E.vorschauCode, zaehler: E.goatcounter || '', datei: DATEI };
  if (VORSCHAU_BAU) kk.immer = true;
  if (tuer) kk.tuer = tuer;
  if (startseite) kk.tueren = tueren.map((t) => t.adresse);
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titel)}</title>
<meta name="description" content="${esc(beschreibung)}">
<meta name="theme-color" content="${FARBEN.g}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="${tuer ? 'article' : 'website'}">
<meta property="og:site_name" content="KI &amp; Kekse">
<meta property="og:locale" content="de_AT">
<meta property="og:title" content="${esc(titel)}">
<meta property="og:description" content="${esc(beschreibung)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${E.url}/${bild}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${tiefe}favicon.svg" type="image/svg+xml">
<link rel="icon" href="${tiefe}favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="${tiefe}apple-touch-icon.png">
<link rel="preload" href="${tiefe}statisch/schrift/figtree.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${tiefe}statisch/stil.css${V}">
<script>window.KK=${JSON.stringify(kk)};</script>
<script src="${tiefe}statisch/seite.js${V}"></script>
</head>
<body>
`;
}

const recht = `<a href="${E.impressum}">Impressum</a> · <a href="${E.datenschutz}">Datenschutz</a>`;

function startseite() {
  const liste = tueren.map((t) => `<li><button type="button" class="tuer" data-n="${t.n}">${zahl(t.n)}<span class="heute" aria-hidden="true">heute</span><span class="px keks keks7" aria-hidden="true"></span></button></li>`).join('\n');
  return kopfbereich({
    titel: 'KI & Kekse – 24 Türchen KI für die Schule',
    beschreibung: E.beschreibung, url: `${E.url}/`, bild: 'statisch/vorschau/start.png', tiefe: '', startseite: true,
  }) + `<div class="pullover">
<div style="padding-top:24px"><div class="band" aria-hidden="true"></div></div>
<header class="kopf">
<a class="name" href="${E.homepage}">Bernhard Gmeiner</a>
<span class="px strick zeichen" aria-hidden="true"></span>
<h1><span class="px strick schriftzug" aria-hidden="true"></span><span class="nur-vorlesen">KI &amp; Kekse</span></h1>
<p class="untertitel">24 Türchen KI für die Schule</p>
<p class="datum">1. bis 24. Dezember 2026</p>
</header>
<main>
<ol class="tueren">
${liste}
</ol>
</main>
</div>
<div class="buendchen" aria-hidden="true"></div>
<footer class="fuss">
<button type="button" class="knopf" data-teilen data-url="${E.url}/" data-titel="KI &amp; Kekse" data-text="24 Türchen KI für die Schule">${TEIL_ICON}Kalender teilen</button>
<p class="fuer-alle">Manche Türchen passen für den ersten Versuch mit KI, andere für alle, die schon eigene Werkzeuge bauen. Ist eines zu einfach für dich, schau morgen wieder rein.</p>
<div class="links"><a href="${E.homepage}">bernhardgmeiner.com</a><a href="${E.instagram}">@bernhard_gmeiner</a></div>
<p class="hinweis">Datenschutz: Namen und andere persönliche Daten von Schüler:innen gehören in kein KI-Tool.</p>
<div class="recht">${recht}</div>
</footer>
</body>
</html>
`;
}

function tuerseite(t) {
  const tag = WOCHENTAGE[new Date(Date.UTC(2026, 11, t.n)).getUTCDay()];
  const url = `${E.url}/${t.adresse}/`;
  const titel = `${t.titel} – KI & Kekse, Türchen ${t.n}`;
  const beschreibung = t.vorschautext || t.nutzen || E.beschreibung;
  const info = [t.zeit && `<div><dt>Zeitaufwand</dt><dd>${inline(t.zeit)}</dd></div>`, t.brauchst && `<div><dt>Du brauchst</dt><dd>${inline(t.brauchst)}</dd></div>`].filter(Boolean).join('');
  return kopfbereich({ titel, beschreibung, url, bild: `statisch/vorschau/${t.adresse}.png`, tiefe: '../', tuer: t.n }) + `<div class="pullover tuerkopf">
<div class="leiste">
<a class="zurueck" href="../${DATEI}">← Alle Türchen</a>
<a class="marke" href="../${DATEI}">${marke}</a>
</div>
<div class="band" aria-hidden="true"></div>
<div class="grosse-tuer"><div class="tuer">${zahl(t.n)}<span class="px keks keks12" aria-hidden="true"></span></div></div>
</div>
<div class="buendchen" aria-hidden="true"></div>
<main>
<div class="gesperrt">
<p>Türchen ${t.n} ist noch zu. Es öffnet sich am ${tag}, ${t.n}. Dezember, um Mitternacht.</p>
<a class="knopf" href="../${DATEI}">Zu den offenen Türchen</a>
</div>
<article class="inhalt">
<p class="dachzeile">Türchen ${t.n} · ${tag}, ${t.n}. Dezember</p>
<h1>${esc(t.titel)}</h1>
${t.nutzen ? `<p class="nutzen">${inline(t.nutzen)}</p>` : ''}
${info ? `<dl class="info">${info}</dl>` : ''}
<div class="text">
${zuHtml(t.text, '../', t)}
</div>
${t.credit ? `<p class="credit">${inline(t.credit)}</p>` : ''}
<button type="button" class="knopf" data-teilen data-url="${url}" data-titel="${esc(t.titel)}" data-text="${esc(beschreibung)}">${TEIL_ICON}Türchen teilen</button>
</article>
</main>
<footer class="mehr"><div class="rahmen">
<div class="ueber">Mehr von Bernhard Gmeiner</div>
<div class="links"><a href="${E.homepage}">bernhardgmeiner.com</a><a href="${E.instagram}">Instagram @bernhard_gmeiner</a></div>
<div class="recht">${recht}</div>
</div></footer>
</body>
</html>
`;
}

// ---------- Schreiben ----------
function schreib(rel, inhalt) {
  const ziel = path.join(ZIEL, rel);
  fs.mkdirSync(path.dirname(ziel), { recursive: true });
  fs.writeFileSync(ziel, inhalt);
}
function kopier(von, nach) {
  for (const e of fs.readdirSync(von, { withFileTypes: true })) {
    const a = path.join(von, e.name), b = path.join(nach, e.name);
    if (e.isDirectory()) kopier(a, b); else { fs.mkdirSync(nach, { recursive: true }); fs.copyFileSync(a, b); }
  }
}

const stil = fs.readFileSync(path.join(WURZEL, 'statisch/stil.css'), 'utf8') + '\n/* Pixelraster, erzeugt von skripte/pixel.mjs */\n' + PIXEL_CSS;
const VERSION = Buffer.from(stil + fs.readFileSync(path.join(WURZEL, 'statisch/seite.js'), 'utf8')).reduce((a, b) => (a * 31 + b) >>> 0, 7).toString(36);

const V = VORSCHAU_BAU ? '' : `?v=${VERSION}`;

fs.rmSync(ZIEL, { recursive: true, force: true });
kopier(path.join(WURZEL, 'statisch'), path.join(ZIEL, 'statisch'));
kopier(path.join(WURZEL, 'werkzeuge'), path.join(ZIEL, 'werkzeuge'));
if (fs.existsSync(path.join(WURZEL, 'grafiken/dateien'))) kopier(path.join(WURZEL, 'grafiken/dateien'), path.join(ZIEL, 'grafiken'));
schreib('statisch/stil.css', stil);
schreib('index.html', startseite());
for (const t of tueren) schreib(`${t.adresse}/index.html`, tuerseite(t));

// Favicon aus dem Keks-Zeichen
const zeichenAufGruen = svg(RASTER.zeichen, { rand: 1, grund: FARBEN.g, groesse: 64 });
schreib('favicon.svg', zeichenAufGruen);
for (const f of ['favicon-32.png', 'apple-touch-icon.png']) {
  const q = path.join(WURZEL, 'statisch', f);
  if (fs.existsSync(q)) { fs.copyFileSync(q, path.join(ZIEL, f)); fs.rmSync(path.join(ZIEL, 'statisch', f)); }
}
schreib('404.html', kopfbereich({ titel: 'Seite nicht gefunden – KI & Kekse', beschreibung: E.beschreibung, url: `${E.url}/`, bild: 'statisch/vorschau/start.png', tiefe: '/' }) +
  `<div class="pullover"><div class="leiste"><a class="marke" href="/">${marke}</a></div><div class="band" style="margin-top:18px" aria-hidden="true"></div><div style="height:26px"></div></div><div class="buendchen" aria-hidden="true"></div>\n<main><div class="gesperrt" style="display:block"><p>Diese Seite gibt es nicht.</p><a class="knopf" href="/">Zu den Türchen</a></div></main>\n</body>\n</html>\n`);
if (!VORSCHAU_BAU) { schreib('CNAME', new URL(E.url).hostname + '\n'); schreib('.nojekyll', ''); }

const fertig = tueren.filter((t) => t.stand !== 'platzhalter').map((t) => t.n);
console.log(`Gebaut: Startseite und 24 Türchen nach _site/ (${VORSCHAU_BAU ? 'Vorschau-Bau' : 'Live-Bau'}).`);
console.log(`Mit Text: ${fertig.length} von 24`);
if (PLATZHALTER.length) console.log(`Offene Platzhalter (${VORSCHAU_BAU ? 'in der Vorschau sichtbar' : 'auf der Live-Seite ausgeblendet'}):\n  ` + PLATZHALTER.join('\n  '));
