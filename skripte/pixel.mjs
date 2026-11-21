// Pixelraster aus dem Design-Dokument „5A mit Keks“ und daraus erzeugte SVGs.
export const FARBEN = { e: '#a8692f', c: '#dfa65f', k: '#4a2a18', w: '#f6efe3', r: '#c0303a', g: '#1f5a3d', y: '#f2c14e', x: '#000000' };

export const RASTER = {
  zeichen: `
.....eeee.....
...eeccce.....
..eccccce.....
.ecckccce.....
.eccccccce....
eccccccccke...
eckcccccccceee
ecccccckccccce
ecccccccccccce
.ecccccccccce.
.eckccccckcce.
..ecccccccce..
...eeckccee...
.....eeee.....`,
  keks7: `
..eee..
.eccce.
eckccce
eccckce
eckccce
.eccke.
..eee..`,
  keks12: `
....eeee....
..eeccccee..
.ecckccccce.
.ecccccckce.
ecccccccccce
eckcccccccce
eccccckcccce
ecccccccckce
.eckcccccce.
.ecccccccce.
..eecckcee..
....eeee....`,
  // „KI & KEKSE“, 5×7-Buchstaben
  schriftzug: `
w...w.www.....ww......w...w.wwwww.w...w..wwww.wwwww
w..w...w.....w..w.....w..w..w.....w..w..w.....w....
w.w....w.....w.w......w.w...w.....w.w...w.....w....
ww.....w......w.......ww....wwww..ww.....www..wwww.
w.w....w.....w.w.w....w.w...w.....w.w.......w.w....
w..w...w.....w..w.....w..w..w.....w..w......w.w....
w...w.www.....ww.w....w...w.wwwww.w...w.wwww..wwwww`,
  // Norwegerband wie im Entwurf (50 Maschen); gekachelt wird der Ausschnitt 5 bis 44 (40 Maschen, Keks in der Mitte)
  bandEntwurf: `
w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.
..................................................
.w..w..w......r........eee........r......w..w..w..
..w.w.w......rrr......eccce......rrr......w.w.w...
...www......rrrrr....eckccce....rrrrr......www....
.www.www.....rrr.....eccckce.....rrr.....www.www..
...www......rrrrr....eckccce....rrrrr......www....
..w.w.w....rrrrrrr....eccke....rrrrrrr....w.w.w...
.w..w..w......r........eee........r......w..w..w..
..................................................
.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w`,
};

RASTER.band = RASTER.bandEntwurf.trim().split('\n').map((z) => z.slice(5, 45)).join('\n');

const ZIFFERN = {
  0: ['xxx', 'x.x', 'x.x', 'x.x', 'xxx'], 1: ['.x.', 'xx.', '.x.', '.x.', 'xxx'], 2: ['xxx', '..x', 'xxx', 'x..', 'xxx'],
  3: ['xxx', '..x', 'xxx', '..x', 'xxx'], 4: ['x.x', 'x.x', 'xxx', '..x', '..x'], 5: ['xxx', 'x..', 'xxx', '..x', 'xxx'],
  6: ['xxx', 'x..', 'xxx', 'x.x', 'xxx'], 7: ['xxx', '..x', '.x.', '.x.', '.x.'], 8: ['xxx', 'x.x', 'xxx', 'x.x', 'xxx'],
  9: ['xxx', 'x.x', 'xxx', '..x', 'xxx'],
};
export function zahlRaster(n) {
  const z = String(n).split('').map((d) => ZIFFERN[d]);
  return z[0].map((_, i) => z.map((d) => d[i]).join('.')).join('\n');
}

// Raster → SVG. Jede Masche ist ein Quadrat; gleiche Farben in einer Reihe werden zusammengefasst.
export function svg(raster, { rand = 0, grund = null, groesse = null, farbe = null } = {}) {
  const zeilen = raster.trim().split('\n');
  const b = zeilen[0].length + 2 * rand, h = zeilen.length + 2 * rand;
  let r = '';
  zeilen.forEach((zeile, y) => {
    let x = 0;
    while (x < zeile.length) {
      const c = zeile[x];
      let ende = x;
      while (ende < zeile.length && zeile[ende] === c) ende++;
      if (c !== '.') r += `<rect x="${x + rand}" y="${y + rand}" width="${ende - x}" height="1" fill="${farbe || FARBEN[c]}"/>`;
      x = ende;
    }
  });
  const mass = groesse ? ` width="${groesse}" height="${Math.round(groesse * h / b)}"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg"${mass} viewBox="0 0 ${b} ${h}" shape-rendering="crispEdges">${grund ? `<rect width="${b}" height="${h}" fill="${grund}"/>` : ''}${r}</svg>`;
}

export const alsUrl = (s) => `url("data:image/svg+xml,${encodeURIComponent(s).replace(/%20/g, ' ').replace(/%3D/g, '=').replace(/%2F/g, '/').replace(/%3A/g, ':')}")`;

export const PIXEL_CSS = [
  `.zeichen{--img:${alsUrl(svg(RASTER.zeichen))}}`,
  `.schriftzug{--img:${alsUrl(svg(RASTER.schriftzug))}}`,
  `.keks7{--img:${alsUrl(svg(RASTER.keks7))}}`,
  `.keks12{--img:${alsUrl(svg(RASTER.keks12))}}`,
  `.band{--img-band:${alsUrl(svg(RASTER.band))}}`,
  ...Array.from({ length: 24 }, (_, i) => `.z${i + 1}{--img:${alsUrl(svg(zahlRaster(i + 1)))}}`),
].join('\n') + '\n';
