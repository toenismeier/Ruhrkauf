// Q30 Stilprüfung: verbotene Muster als Skript (GESTALTUNG-UI.md). Läuft im Browser auf berechneten Stilen.
// Wird von tests/q30-panels.cjs und spiel-render.js --nur-panels in die Seite geladen (nicht im Spiel gebündelt).
// window.hartwigStilpruefung(selektor) → Liste von Verstößen als Text (leer = bestanden).
(function () {
  const VERBOTEN_TEXT = [/\bundefined\b/, /\bnull\b/, /\bNaN\b/, /\bhc-[a-z]/, /Max Mustermann/i, /Erika Musterfrau/i, /Lorem ipsum/i, /\[object Object\]/, /Infinity/];
  const TIPPBAR = 'button, a[href], input:not([type=hidden]), select, textarea, summary, [onclick], [role=button], [tabindex="0"]';
  const sichtbar = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    if (r.right < 0 || r.left > innerWidth) return false; // senkrecht: auch Inhalt unterhalb der Falz (per Scrollen erreichbar)
    const st = getComputedStyle(el);
    return st.visibility !== 'hidden' && st.display !== 'none' && Number(st.opacity) > 0.05 && !el.closest('[inert], [hidden], [aria-hidden=true]:not(.hk-person)');
  };
  const name = (el) => {
    const t = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28);
    const par = el.parentElement, pk = par && par.classList.length ? ' in ' + par.tagName.toLowerCase() + '.' + [...par.classList].slice(0, 2).join('.') : '';
    return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.classList.length ? '.' + [...el.classList].slice(0, 2).join('.') : '') + pk + (t ? ` „${t}“` : '');
  };
  const rgb = (s) => { const m = String(s).match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
  const eigenerText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
  const zahl = (s) => Number(String(s));

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
    return [...v];
  };
})();
