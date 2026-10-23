// Q30 Stilprüfung: verbotene Muster als Skript (GESTALTUNG-UI.md). Läuft im Browser auf berechneten Stilen.
// Wird von tests/q30-panels.cjs und spiel-render.js --nur-panels in die Seite geladen (nicht im Spiel gebündelt).
// window.hartwigStilpruefung(selektor) → Liste von Verstößen als Text (leer = bestanden).
(function () {
  const VERBOTEN_TEXT = [/\bQ\d{2}\b/, /(?<![\d.,])\d+\.\d{1,2}(?![\d.])/, /\bundefined\b/, /\bnull\b/, /\bNaN\b/, /\bhc-[a-z]/, /Max Mustermann/i, /Erika Musterfrau/i, /Lorem ipsum/i, /\[object Object\]/, /Infinity/];
  const TIPPBAR = 'button, a[href], input:not([type=hidden]), select, textarea, summary, [onclick], [role=button], [tabindex="0"]';
  const sichtbar = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    if (r.right < 0 || r.left > innerWidth) return false; // senkrecht: auch Inhalt unterhalb der Falz (per Scrollen erreichbar)
    const st = getComputedStyle(el);
    if (el.checkVisibility && !el.checkVisibility({ contentVisibilityAuto: true })) return false; // Q32: Inhalt geschlossener <details>
    let o = 1; for (let e = el; e && e.nodeType === 1; e = e.parentElement) o *= Number(getComputedStyle(e).opacity); // Q32: auch ausgeblendete Vorfahren
    return st.visibility !== 'hidden' && st.display !== 'none' && o > 0.05 && !el.closest('[inert], [hidden], [aria-hidden=true]:not(.hk-person)');
  };
  const name = (el) => {
    const t = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28);
    const par = el.parentElement, pk = par && par.classList.length ? ' in ' + par.tagName.toLowerCase() + '.' + [...par.classList].slice(0, 2).join('.') : '';
    return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.classList.length ? '.' + [...el.classList].slice(0, 2).join('.') : '') + pk + (t ? ` „${t}“` : '');
  };
  const rgb = (s) => { const m = String(s).match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
  const eigenerText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
  const zahl = (s) => Number(String(s));

  // Q32: Farbe, Hintergrund und Kontrast (WCAG 2.1)
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const lum = (f) => 0.2126 * lin(f.r) + 0.7152 * lin(f.g) + 0.0722 * lin(f.b);
  const kontrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const mische = (oben, unten) => ({ r: oben.r * oben.a + unten.r * (1 - oben.a), g: oben.g * oben.a + unten.g * (1 - oben.a), b: oben.b * oben.a + unten.b * (1 - oben.a), a: 1 });
  /** Wirksamer Hintergrund hinter el (Ebenen von unten gemischt); null, wenn ein Bild dahinter liegt. */
  const grund = (el) => {
    const ebenen = [];
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const st = getComputedStyle(e);
      if (/url\(/.test(st.backgroundImage) || /^(IMG|CANVAS|VIDEO)$/.test(e.tagName)) return null;
      const f = rgb(st.backgroundColor);
      if (f && f.a > 0) { ebenen.push(f); if (f.a >= 0.99) break; }
    }
    let g = { r: 255, g: 255, b: 255, a: 1 };
    for (const f of ebenen.reverse()) g = mische(f, g);
    return g;
  };
  const hell = (f) => f && f.a > 0.5 && lum(f) > 0.45;
  const deckung = (el) => { let o = 1; for (let e = el; e && e.nodeType === 1; e = e.parentElement) o *= Number(getComputedStyle(e).opacity); return o; };
  const geclippt = (el) => { for (let e = el.parentElement; e; e = e.parentElement) { const st = getComputedStyle(e); if (/hidden|clip/.test(st.overflowX) && e.id !== 'pinhalt') { const r = e.getBoundingClientRect(); if (r.left >= -1 && r.right <= innerWidth + 1) return true; } } return false; };
  const quer = (el, wurzel) => { for (let e = el.parentElement; e && e !== wurzel.parentElement; e = e.parentElement) { const ox = getComputedStyle(e).overflowX; if ((ox === 'auto' || ox === 'scroll') && e.id !== 'pinhalt') return e; } return null; };
  const ROT = (f) => f && f.a > 0.5 && f.r > 160 && f.g < 110 && f.b < 110 && f.r - f.g > 90;
  const GEFAHR = /Kündig|Entlass|Abriss|Schließ|Löschen|Räum|Insolvenz|Abbau|Ablehnen|Absagen|Auslisten|Einstellen der Marke|aufgeben/i;

  /** Q32: Stadt-HUD. Kennzahlenkacheln höchstens ein Sechstel der Bildhöhe; Chipleiste ohne abgeschnittene Chips
   *  (entweder passen alle Chips, oder die Leiste blendet am Rand aus). */
  window.hartwigHudPruefung = function () {
    const v = [];
    const c = document.getElementById('cockpit');
    if (c && c.getBoundingClientRect().height > innerHeight / 6 + 0.5) v.push(`Kennzahlenkacheln ${Math.round(c.getBoundingClientRect().height)} px hoch (höchstens ${Math.floor(innerHeight / 6)} px)`);
    const k = document.getElementById('stadt-chips');
    if (k && k.getBoundingClientRect().height > 0 && k.scrollWidth > k.clientWidth + 1) {
      const st = getComputedStyle(k), maske = st.maskImage || st.webkitMaskImage || '';
      if (!/gradient/.test(maske)) {
        const kr = k.getBoundingClientRect();
        for (const b of k.children) { const r = b.getBoundingClientRect(); if (r.width && ((r.left < kr.left - 1 && r.right > kr.left) || (r.right > kr.right + 1 && r.left < kr.right))) { v.push(`Chip abgeschnitten: „${b.textContent.trim().slice(0, 24)}“`); break; } }
      }
    }
    return v;
  };

  window.hartwigStilpruefung = function (selektor = '#panel') {
    const wurzeln = [...document.querySelectorAll(selektor)].filter((w) => w.getBoundingClientRect().height > 0);
    const v = new Set();
    for (const w of wurzeln) {
      const dunkel = !!w.querySelector?.('.hk-bereich:not([data-bereich=papier]), .hk-flaeche:not([data-bereich=papier])') || w.matches?.('.hk-flaeche:not([data-bereich=papier])');
      const alle = [w, ...w.querySelectorAll('*')];
      for (const el of alle) {
        if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
        if (!sichtbar(el)) continue;
        const st = getComputedStyle(el);
        // 1. Schwere Schatten
        for (const teil of st.boxShadow === 'none' ? [] : st.boxShadow.split(/,(?![^(]*\))/)) {
          if (/inset/.test(teil)) continue;
          const px = (teil.replace(/rgba?\([^)]*\)/, '').match(/-?[\d.]+px/g) || []).map(parseFloat);
          if ((px[2] ?? 0) > 8) v.add(`Schatten-Unschärfe ${px[2]} px: ${name(el)}`);
        }
        // 2. Verläufe und Glas (erlaubt: feiner senkrechter Streifengrund mit Alpha ≤ 0,03)
        const bg = st.backgroundImage;
        if (/gradient/.test(bg)) {
          const streifen = /^repeating-linear-gradient\(90deg/.test(bg) && (bg.match(/rgba\([^)]*\)/g) || []).every((c) => (rgb(c)?.a ?? 1) <= 0.03);
          if (!streifen) v.add(`Verlauf: ${name(el)}`);
        }
        if (/blur/.test(st.backdropFilter || st.webkitBackdropFilter || '')) v.add(`Glas (backdrop-filter): ${name(el)}`);
        // 3. Schrift unter 12 px
        if (eigenerText(el) && parseFloat(st.fontSize) < 11.95) v.add(`Schrift ${parseFloat(st.fontSize)} px: ${name(el)}`);
        // 4. Touch-Ziel unter 44 px
        if (el.matches(TIPPBAR) && !el.disabled) {
          const r = el.getBoundingClientRect();
          const huelle = el.closest('label, .hk-schalter');
          const hr = huelle && huelle !== el ? huelle.getBoundingClientRect() : null;
          const gross = (rr) => rr.width >= 43.5 && rr.height >= 43.5;
          if (!gross(r) && !(hr && gross(hr))) v.add(`Touch-Ziel ${Math.round(r.width)}×${Math.round(r.height)} px: ${name(el)}`);
        }
        // 5. Abgeschnittene Beschriftung (Ellipse mit Überlauf)
        if (st.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) v.add(`abgeschnitten: ${name(el)}`);
        // 6. Symbol in eingefärbtem Kreis
        const r = el.getBoundingClientRect(), fb = rgb(st.backgroundColor);
        if (r.width <= 52 && Math.abs(r.width - r.height) < 3 && parseFloat(st.borderTopLeftRadius) >= r.width / 2 - 1 && fb && fb.a > 0.3
          && (el.querySelector('svg, img') || /^\p{Extended_Pictographic}$/u.test(el.textContent.trim())) && !el.matches('.hk-person, .vbild, .vbild *')) v.add(`Symbol im Farbkreis: ${name(el)}`);
        // 7. Creme-Flächen als Ausweichpalette im dunklen Look
        if (dunkel && !el.closest('.hk-papier, [data-bereich=papier]') && fb && fb.a > 0.5 && fb.r > 225 && fb.g > 210 && fb.b > 180 && fb.r - fb.b > 15 && r.width > 120 && r.height > 40) v.add(`helle Cremefläche im dunklen Look: ${name(el)}`);
      }
      // 10. Q32: seitlicher Überlauf (Blatt, Karussellkarte, Elemente außerhalb des Bildes)
      for (const sc of [w, ...w.querySelectorAll('#pinhalt')]) if (getComputedStyle(sc).overflowX !== 'visible' && sc.scrollWidth > sc.clientWidth + 1 && sichtbar(sc)) v.add(`seitlicher Überlauf ${sc.scrollWidth - sc.clientWidth} px: ${name(sc)}`);
      for (const k of w.querySelectorAll('.kslot, .karussell > *, .hk-karussell > *')) {
        if (k.scrollWidth > k.clientWidth + 1) v.add(`Karussellkarte breiter als ihr Platz (${k.scrollWidth - k.clientWidth} px): ${name(k)}`);
        const kar = k.parentElement; if (kar && k.getBoundingClientRect().width > kar.clientWidth + 1) v.add(`Karussellkarte breiter als der Bildschirm: ${name(k)}`);
      }
      for (const el of alle) {
        if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1 || getComputedStyle(el).visibility === 'hidden' || el.closest('[inert], [hidden]')) continue;
        if ((r.right > innerWidth + 1 || r.left < -1) && !quer(el, w) && !geclippt(el) && !el.closest('.kslot, canvas')) v.add(`ragt seitlich aus dem Bild (${Math.round(r.left)} bis ${Math.round(r.right)} px): ${name(el)}`);
      }
      // 11. Q32: Kontrast WCAG AA für jeden sichtbaren Text (4,5:1, große Schrift 3:1; inaktive Bedienelemente ausgenommen)
      const papierW = !!w.closest?.('.hk-papier, [data-bereich=papier]') || !!w.querySelector?.('.hk-bereich[data-bereich=papier]');
      let hellFlaeche = 0;
      for (const el of alle) {
        if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
        if (!sichtbar(el)) continue;
        const st = getComputedStyle(el);
        if (eigenerText(el) && !el.closest(':disabled, [aria-disabled=true]')) {
          const g = grund(el), f = rgb(st.color);
          if (g && f) {
            const o = deckung(el), t = mische({ ...f, a: (f.a ?? 1) * o }, g), gr = parseFloat(st.fontSize), fett = Number(st.fontWeight) >= 700;
            const soll = gr >= 24 || (gr >= 18.66 && fett) ? 3 : 4.5, k = kontrast(t, g);
            if (k < soll - 0.05) v.add(`Kontrast ${k.toFixed(1).replace('.', ',')}:1 (Soll ${soll.toString().replace('.', ',')}): ${name(el)}`);
          }
        }
        // 12. Q32: helle Flächen im dunklen Blatt (Summe > 20 % der Blattfläche)
        const fb = rgb(st.backgroundColor);
        if (!papierW && hell(fb) && !el.closest('.hk-papier, [data-bereich=papier]') && !(el.parentElement && hell(grund(el.parentElement)))) {
          const r = el.getBoundingClientRect(); hellFlaeche += Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0)) * r.height;
        }
        // 13. Q32: unterstrichene Links und Rot ohne Gefahr
        if (eigenerText(el) && /underline/.test(st.textDecorationLine) && !el.closest('.hk-papier, [data-bereich=papier]')) v.add(`unterstrichener Link: ${name(el)}`);
        const rr = el.getBoundingClientRect();
        if (ROT(fb) && rr.width * rr.height > 300 && !el.closest('.hk-gefahr, .hk-marke, .vbild, .hk-person, [data-gefahr], .dringend, .post-frist.ab, .logo, .ein-logo, .wb-logo, .wb-vorfallkopf > span') && !GEFAHR.test(el.textContent) && !el.matches('.hk-gefahr, [data-gefahr]')) v.add(`Rot ohne Gefahr: ${name(el)}`);
      }
      const pi = w.querySelector('#pinhalt') ?? (w.id === 'pinhalt' ? w : null);
      const blatt = w.getBoundingClientRect().width * (w.getBoundingClientRect().height + (pi ? pi.scrollHeight - pi.clientHeight : 0));
      if (!papierW && blatt > 0 && hellFlaeche / blatt > 0.2) v.add(`helle Flächen ${Math.round(hellFlaeche / blatt * 100)} % im dunklen Blatt`);
      // 14. Q32: Kosten nie grün
      for (const k of w.querySelectorAll('.hk-gross > div')) if (/kosten|miete|aufwand/i.test(k.querySelector('span')?.textContent ?? '') && k.querySelector('b.gut')) v.add(`Kosten in Grün: ${name(k)}`);
      // 15. Q32: doppelte Titel (Kopf, Überschriften, Auswahlfeld zeigen denselben Namen)
      const titel = [...w.querySelectorAll('#ptitel, h1, h2, h3, h4, select, .khead, .hb-titel, [data-titel]')].filter((e) => sichtbar(e) && e.getBoundingClientRect().top < innerHeight)
        .flatMap((e) => (e.tagName === 'SELECT' ? e.selectedOptions[0]?.textContent ?? '' : e.textContent).split(' · ').map((t) => t.replace(/\s*\(\d+\)\s*$/, '').trim()).filter((t) => t.length >= 5).map((t) => [t, e]));
      const gesehen = new Map();
      for (const [t, e] of titel) { const vor = gesehen.get(t); if (vor && vor !== e) v.add(`doppelter Titel „${t}“`); gesehen.set(t, e); }
      // 16. Q32: Inhalt verschwindet unter der Reiterleiste (ganz nach unten gescrollt)
      const reiter = w.querySelector('.hk-reiter');
      if (pi && reiter && sichtbar(reiter)) {
        const alt = pi.scrollTop; pi.scrollTop = pi.scrollHeight;
        const oben = reiter.getBoundingClientRect().top;
        for (const el of pi.querySelectorAll('*')) {
          if (reiter.contains(el) || !eigenerText(el) || !sichtbar(el)) continue;
          const r = el.getBoundingClientRect(); if (r.bottom > oben + 1 && r.top < oben) { v.add(`unter der Reiterleiste abgeschnitten: ${name(el)}`); break; }
        }
        pi.scrollTop = alt;
      }
      // 8. Platzhalter und technische Werte im sichtbaren Text
      const text = alle.filter((el) => sichtbar(el)).map((el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ')).join(' ');
      for (const re of VERBOTEN_TEXT) { const m = text.match(re); if (m) v.add(`Text „${m[0]}“ sichtbar`); }
      // 9. Summen müssen aus den angezeigten Zeilen nachrechenbar sein
      for (const t of w.querySelectorAll('[data-summen="1"]')) {
        const zeilen = [...t.querySelectorAll('tbody tr')];
        const summe = zeilen.find((z) => z.classList.contains('summe'));
        if (!summe) { v.add('Summentabelle ohne Summenzeile'); continue; }
        const spalten = summe.querySelectorAll('td[data-w]').length;
        for (let i = 0; i < spalten; i++) {
          const soll = zahl(summe.querySelectorAll('td[data-w]')[i].dataset.w);
          const teile = zeilen.filter((z) => z !== summe).map((z) => z.querySelectorAll('td[data-w]')[i]).filter(Boolean);
          const ist = teile.reduce((a, td) => a + zahl(td.dataset.w), 0);
          if (Math.abs(ist - soll) > Math.max(1, teile.length)) v.add(`Summe stimmt nicht (${t.closest('[data-summen-name]')?.dataset.summenName ?? 'Tabelle'}, Spalte ${i + 1}): Zeilen ${ist}, Summe ${soll}`);
        }
      }
    }
    if (/(^|,\s*)\.oben/.test(selektor)) for (const x of window.hartwigHudPruefung()) v.add(x);
    return [...v];
  };
})();
