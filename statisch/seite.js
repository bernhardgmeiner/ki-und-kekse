/* KI & Kekse – Türchen öffnen, teilen, kopieren. Kein Tracking, keine Cookies. */
(function () {
  var K = window.KK || {};
  var TAG = 86400000;
  var doc = document, html = doc.documentElement;

  function lager(art) { try { return window[art]; } catch (e) { return null; } }
  function lies(art, k) { try { return lager(art).getItem(k); } catch (e) { return null; } }
  function setz(art, k, v) { try { v === null ? lager(art).removeItem(k) : lager(art).setItem(k, v); } catch (e) {} }

  // Vorschau nur für Bernhard: ?vorschau=<Code> schaltet ein, ?vorschau=aus schaltet ab,
  // ?tag=7 spielt den 7. Dezember durch.
  var frage = new URLSearchParams(location.search);
  var v = frage.get('vorschau');
  if (v === 'aus') { setz('localStorage', 'kk-vorschau', null); setz('sessionStorage', 'kk-tag', null); }
  else if (v && v === K.code) setz('localStorage', 'kk-vorschau', '1');
  var vorschau = !!K.immer || lies('localStorage', 'kk-vorschau') === '1';
  var tag = null;
  if (vorschau) {
    var ausHash = (location.hash.match(/^#tag-(\d+|alle)$/) || [])[1];
    var wunsch = frage.get('tag') || ausHash;
    if (wunsch) setz('sessionStorage', 'kk-tag', wunsch === 'alle' ? null : wunsch);
    tag = parseInt(wunsch === 'alle' ? '' : (wunsch || lies('sessionStorage', 'kk-tag')), 10) || null;
    if (tag > 24 || tag < 1) tag = null;
  }

  // Türchen n öffnet am n. Dezember 2026 um 0:00 Uhr Wiener Zeit (= 23:00 UTC am Vortag).
  function oeffnet(n) { return Date.UTC(2026, 11, n - 1, 23, 0, 0); }
  function jetzt() { return tag ? oeffnet(tag) + TAG / 2 : Date.now(); }
  function istOffen(n) { return (vorschau && !tag) || jetzt() >= oeffnet(n); }
  function heute() {
    if (vorschau && !tag) return 0;
    var n = Math.floor((jetzt() - oeffnet(1)) / TAG) + 1;
    return n >= 1 && n <= 24 ? n : 0;
  }

  var seitenTuer = K.tuer || 0;
  if (seitenTuer && !istOffen(seitenTuer)) html.classList.add('zu');

  function melde(text) {
    var alt = doc.querySelector('.meldung'); if (alt) alt.remove();
    var m = doc.createElement('div'); m.className = 'meldung'; m.setAttribute('role', 'status'); m.textContent = text;
    doc.body.appendChild(m); setTimeout(function () { m.remove(); }, 2600);
  }

  function kopiere(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return new Promise(function (ok, nein) {
      var t = doc.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
      doc.body.appendChild(t); t.select();
      try { doc.execCommand('copy') ? ok() : nein(); } catch (e) { nein(e); }
      t.remove();
    });
  }

  function start() {
    // Startseite: Türchen je nach Datum zu, heute oder offen
    var h = heute();
    doc.querySelectorAll('.tueren .tuer').forEach(function (el) {
      var n = +el.getAttribute('data-n');
      var ziel = K.tueren && K.tueren[n - 1];
      if (istOffen(n) && ziel) {
        var a = doc.createElement('a');
        a.className = el.className + (n === h ? ' ist-heute' : ' ist-offen');
        a.href = ziel + '/' + (K.datei || '');
        a.setAttribute('aria-label', 'Türchen ' + n + (n === h ? ', heute' : ', offen'));
        a.innerHTML = el.innerHTML;
        el.replaceWith(a);
      } else {
        el.setAttribute('aria-label', 'Türchen ' + n + ', öffnet sich am ' + n + '. Dezember');
        el.addEventListener('click', function () {
          el.classList.remove('wackelt'); void el.offsetWidth; el.classList.add('wackelt');
          melde('Türchen ' + n + ' öffnet sich am ' + n + '. Dezember.');
        });
      }
    });

    // Türchenseite: große Tür zeigt Keks, sobald offen
    var gross = doc.querySelector('.grosse-tuer .tuer');
    if (gross && istOffen(seitenTuer)) gross.classList.add('ist-offen');

    // Teilen
    doc.querySelectorAll('[data-teilen]').forEach(function (b) {
      b.addEventListener('click', function () {
        var url = b.getAttribute('data-url') || location.href.split('?')[0];
        var daten = { title: b.getAttribute('data-titel') || doc.title, text: b.getAttribute('data-text') || '', url: url };
        function alsLink() { kopiere(url).then(function () { melde('Link kopiert.'); }, function () { melde(url); }); }
        if (navigator.share) {
          navigator.share(daten).catch(function (e) { if (!e || e.name !== 'AbortError') alsLink(); });
          return;
        }
        alsLink();
      });
    });

    // Eingebettete Werkzeuge wachsen mit ihrem Inhalt (außer Timer und Turnier, die füllen den Rahmen)
    doc.querySelectorAll('.werkzeug iframe').forEach(function (f) {
      if (/^(gruppen-timer|quizturnier)$/.test(f.getAttribute('data-ordner'))) return;
      function passe() {
        try {
          var h = f.contentDocument.documentElement.scrollHeight;
          if (h > 120) f.style.height = (h + 4) + 'px';
        } catch (e) {}
      }
      f.addEventListener('load', function () {
        passe();
        try { new ResizeObserver(passe).observe(f.contentDocument.body); } catch (e) { setInterval(passe, 800); }
      });
    });

    // Instagram-Reel erst nach dem Tippen laden
    doc.querySelectorAll('.reel').forEach(function (f) {
      var b = f.querySelector('.reel-laden');
      if (!b) return;
      b.addEventListener('click', function () {
        var id = f.getAttribute('data-reel');
        var i = doc.createElement('iframe');
        i.src = 'https://www.instagram.com/reel/' + id + '/embed/';
        i.title = 'Instagram-Reel';
        i.setAttribute('allow', 'autoplay; encrypted-media; fullscreen');
        i.setAttribute('allowfullscreen', '');
        i.loading = 'lazy';
        var karte = f.querySelector('.reel-karte');
        karte.parentNode.replaceChild(i, karte);
        // Instagram zeigt das Reel im Format 4:5 mit Kopf- und Fußzeile
        i.style.height = Math.round(i.offsetWidth * 1.25 + 210) + 'px';
      });
    });

    // Prompts kopieren
    doc.querySelectorAll('.kopieren').forEach(function (b) {
      b.addEventListener('click', function () {
        var text = b.parentNode.querySelector('pre').textContent;
        var wort = b.querySelector('span');
        kopiere(text).then(function () {
          wort.textContent = 'Kopiert'; setTimeout(function () { wort.textContent = 'Kopieren'; }, 2000);
        }, function () { melde('Kopieren hat nicht geklappt. Bitte den Text markieren.'); });
      });
    });

    if (vorschau) {
      var l = doc.createElement('div'); l.className = 'vorschau-leiste';
      var wahl = '<option value="alle">alle Türchen offen</option>';
      for (var i = 1; i <= 24; i++) wahl += '<option value="' + i + '"' + (i === tag ? ' selected' : '') + '>Stand ' + i + '. Dezember</option>';
      l.innerHTML = '<label>Vorschau: <select>' + wahl + '</select></label>' + (K.immer ? '' : '<a href="?vorschau=aus">Vorschau beenden</a>');
      l.querySelector('select').addEventListener('change', function () {
        setz('sessionStorage', 'kk-tag', this.value === 'alle' ? null : this.value);
        location.hash = 'tag-' + this.value; location.reload();
      });
      doc.body.insertBefore(l, doc.body.firstChild);
    } else if (K.zaehler) {
      var s = doc.createElement('script'); s.async = true; s.src = '/statisch/goatcounter-count-v5.js'; // count.v5.js von gc.zgo.at, selbst gehostet (ISC-Lizenz)
      s.setAttribute('data-goatcounter', 'https://' + K.zaehler + '.goatcounter.com/count');
      doc.head.appendChild(s);
    }
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
})();
