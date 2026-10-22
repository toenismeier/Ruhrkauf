
import { geld, esc, kwVon } from './format.js';
import * as K from './komponenten.js';
import { portraetSVG } from '../kit/portraet.js';

// Q30: Posteingang als Hauspost. Hauptfrage: Was muss ich diese Woche entscheiden, und was läuft ab?
// Vorgänge sind Umlaufmappen mit Reiter (Art, Frist), sortiert nach Frist; Meldungen sind Hauspost-Zeilen.
const SEKRETARIAT = portraetSVG({ geschlecht: 'w', alter: 36, haar: 'bob', haarfarbe: 'braun', hautton: 'rosig', kleidung: 'blazer', kleidungFarbe: 'marine', seed: 821 }, 72);

// Zentraler Posteingang: reine Engine-Abfragen und bestehende Spieleraktionen.
export function posteingangModul(ctx) {
  const E = ctx.E, s = ctx.s;
  const ui = { aktiv: false, filter: 'Alle', verhandlung: null, ziel: null, mietAuswahl: new Map() };
  const einstellungen = () => ctx.zustand();
  const daten = () => E.posteingang(s());
  const wochen = (n) => n === 0 ? 'läuft diese Woche ab' : n === 1 ? 'noch 1 Woche' : 'noch ' + n + ' Wochen';
  const leer = (t, titel = '') => '<div class="postleer" role="status">' + K.leer(t, titel) + '</div>';

  function tabs(D) {
    const aktiv = einstellungen().reiter;
    const ungelesen = D.meldungen.filter((m) => !(einstellungen().gelesen ?? []).includes(m.id)).length;
    return '<div class="hk-seg posttabs" role="tablist">' + [
      ['handeln', 'Zu tun', D.handeln.length], ['meldungen', 'Meldungen', ungelesen], ['erledigt', 'Erledigt', 0],
    ].map(([v, t, n]) => '<button role="tab" type="button" aria-selected="' + (aktiv === v) + '" aria-pressed="' + (aktiv === v) + '" class="tab ' + (aktiv === v ? 'an' : '') + '" data-po-a="tab" data-v="' + v + '">' + t + (n ? ' · ' + n : '') + '</button>').join('') + '</div>';
  }
  function befund(D) {
    const ab = D.handeln.filter((x) => x.restWochen === 0).length, n = D.handeln.length;
    if (!n) return K.sprecher({ text: '<b>Nichts liegt zur Entscheidung.</b> Neue Vorgänge kommen mit dem Wochenabschluss.', unter: 'Sekretariat', person: SEKRETARIAT });
    const summe = D.handeln.reduce((a, p) => a + (p.wert?.betrag ?? 0), 0);
    return K.sprecher({ text: '<b>' + (ab ? ab + (ab === 1 ? ' Vorgang läuft' : ' Vorgänge laufen') + ' diese Woche ab.' : n + (n === 1 ? ' Vorgang wartet' : ' Vorgänge warten') + ' auf Sie.') + '</b>' + (ab && n > ab ? ' Dazu ' + (n - ab) + ' weitere.' : '') + (summe ? ' Es geht um ' + esc(geld(summe)) + '.' : '') + ' Ohne Entscheidung gilt der Standard.',
      unter: 'Sekretariat', person: SEKRETARIAT, ton: ab ? 'alarm' : 'engpass' });
  }
  const mietenOptionen = [
    ['verlaengern','Verlängern'], ['nachverhandeln','Nachverhandeln'], ['auslaufen','Auslaufen lassen / schließen'],
  ];
  function mietvertragKarte(p) {
    const aus = p.mietvertraege ?? [];
    const reihen = aus.map((m) => {
      if (!ui.mietAuswahl.has(m.entscheidungId))
        ui.mietAuswahl.set(m.entscheidungId, { aktiv: true, option: m.empfehlung });
      const wahl = ui.mietAuswahl.get(m.entscheidungId);
      const qual = (v) => v === undefined ? '—' : (100 * v).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' %';
      return '<div class="post-miete-zeile" data-miet-id="' + esc(m.entscheidungId) + '"><div>' +
        '<label><input type="checkbox" data-po-miet-check="' + esc(m.entscheidungId) + '"' +
        (wahl.aktiv ? ' checked' : '') + '><b>' + esc(m.haus) + '</b></label>' +
        '<small>' + esc(m.stadt) + ' · ' + esc(m.region) + ' · ' + esc(m.format) +
        ' · Restlaufzeit ' + m.restlaufzeit + ' Wochen</small>' +
        '<small>Vermieter: ' + esc(m.vermieter) + '</small>' +
        '<small>Miete p.a. ' + esc(geld(m.istMiete)) + ' → ' + esc(geld(m.angebotMiete)) +
        ' · Quote ' + qual(m.mietquoteIst) + ' → ' + qual(m.mietquoteNeu) + '</small>' +
        '<small>Haus-DB: ' + (m.ebitdaHaus === undefined ? 'Keine Buchung' : esc(geld(m.ebitdaHaus))) + '</small>' +
        '<small>Empfehlung Immobilien: ' + esc(mietenOptionen.find((x) => x[0] === m.empfehlung)?.[1] || m.empfehlung) + '</small></div>' +
        '<div><label>Entscheidung<select data-po-miet-option="' + esc(m.entscheidungId) + '">' +
          mietenOptionen.map(([value, text]) => '<option value="' + value + '"' +
            (wahl.option === value ? ' selected' : '') + '>' + esc(text) + '</option>').join('') +
          '</select></label><button type="button" class="hk-knopf zweit" data-po-a="mieteEinzel" data-id="' + esc(m.entscheidungId) +
          '">Entscheiden</button></div></div>';
    }).join('');
    return '<article class="postkarte postmappe" data-post-id="' + esc(p.id) + '">' +
      '<div class="post-reiter"><span>Immobilien · KW ' + kwVon(p.woche) + '</span><span class="post-frist ' + (p.restWochen === 0 ? 'ab' : p.dringend ? 'bald' : '') + '">' + wochen(p.restWochen) + '</span></div>' +
      '<div class="postkopf"><h3>' + esc(p.titel) + '</h3><p class="posthinweis">' + esc(p.text) + '</p></div>' + reihen +
      '<div class="postaktionen"><button type="button" class="hk-knopf" data-po-a="mieteAuswahl" data-id="' + esc(p.id) +
      '">Auswahl entscheiden</button>' +
      '<button type="button" class="hk-knopf zweit" data-po-a="mieteEmpfehlungen" data-id="' + esc(p.id) +
      '">Empfehlungen übernehmen</button></div></article>';
  }
  function handeln(D) {
    if (ui.verhandlung) return verhandeln();
    if (!D.handeln.length) return leer('Keine offenen Angebote oder Entscheidungen.', 'Mappe leer');
    return [...D.handeln].sort((a, b) => a.restWochen - b.restWochen || Number(b.dringend) - Number(a.dringend)).map((p) => {
      if (p.typ === 'mietvertraege') return mietvertragKarte(p);
      const frist = '<span class="post-frist ' + (p.restWochen === 0 ? 'ab' : p.dringend ? 'bald' : '') + '">' + wochen(p.restWochen) + '</span>';
      const wert = p.wert ? '<div class="postwert"><b>' + esc(geld(p.wert.betrag)) + '</b><span>' + esc(p.wert.einheit) + '</span></div>' : '';
      const prim = p.optionen.find((o) => o.id === 'annehmen')?.id;
      const buttons = p.optionen.map((o) => '<button type="button" class="hk-knopf ' + (o.id === prim ? '' : 'zweit') + '" data-po-a="option" data-id="' + esc(p.id) + '" data-v="' + esc(o.id) + '">' + esc(o.label) + '</button>').join('');
      const ort = p.bezug && (p.bezug.hausIds?.length || p.bezug.stadt || p.bezug.modul) ? '<button type="button" class="hk-knopf text postort" data-po-a="ort" data-id="' + esc(p.id) + '">Zum Ort</button>' : '';
      return '<article class="postkarte postmappe" data-post-id="' + esc(p.id) + '"><div class="post-reiter"><span>' + (p.art === 'angebot' ? 'Angebot' : 'Entscheidung') + ' · KW ' + kwVon(p.woche) + '</span>' + frist + '</div><div class="postkopf"><h3>' + esc(p.titel) + '</h3>' + wert + '</div><details class="postdetail"><summary>Worum es geht</summary><p>' + esc(p.text) + '</p></details><p class="poststandard">Ohne Entscheidung: ' + esc(p.standard) + '</p><div class="postaktionen">' + buttons + '</div>' + (ort ? '<div class="postfuss">' + ort + '</div>' : '') + '</article>';
    }).join('');
  }
  function verhandeln() {
    const a = s().angebote.find((x) => x.id === ui.verhandlung.id && x.status === 'offen');
    if (!a) { ui.verhandlung = null; return leer('Das Angebot ist nicht mehr offen.'); }
    const hauser = s().haeuser.filter((h) => h.status === 'offen' && h.etagen.includes(a.etage ?? 0)).sort((x, y) => x.stadt.localeCompare(y.stadt) || x.name.localeCompare(y.name));
    return '<button type="button" class="hk-knopf text postzurueck" data-po-a="zurueck">Zurück zu den Angeboten</button><div class="postmappe"><div class="postkopf"><div class="posttyp">Paketangebot verhandeln</div><h3>' + esc(a.titel) + '</h3><p class="posthinweis">Mindestens ' + (a.minHaeuser ?? 1) + ' Standorte auswählen. Die Engine prüft anschließend die Verhandlungsposition.</p></div><div class="posthausliste">' + hauser.map((h) => '<label class="posthaus"><input data-po-haus="' + esc(h.id) + '" type="checkbox" ' + (ui.verhandlung.haeuser.has(h.id) ? 'checked' : '') + '><span>' + esc(h.name) + '<small>' + esc(h.stadt) + '</small></span></label>').join('') +  '</div><div class="postaktionen"><button type="button" data-po-a="verhandeln" class="hk-knopf">Auswahl verhandeln (' + ui.verhandlung.haeuser.size + ')</button></div></div>';
  }
  function meldungen(D) {
    const filter = ui.filter;
    const liste = D.meldungen.filter((m) => filter === 'Alle' || m.kategorie === filter);
    const kategorien = ['Alle', 'Presse', 'Häuser', 'Finanzen', 'Personal', 'Konkurrenz', 'Eigentümer', 'IT'];
    let html = '<div class="post-filterzeile"><label class="postfilter">Rubrik <select data-po-filter aria-label="Meldungen filtern">' + kategorien.map((k) => '<option ' + (k === filter ? 'selected ' : '') + 'value="' + esc(k) + '">' + esc(k) + '</option>').join('') + '</select></label><button type="button" class="hk-knopf text postalle" data-po-a="alleLesen">Alle gelesen</button></div>';
    if (!liste.length) return html + leer('Keine Meldungen in dieser Rubrik.');
    const gelesen = new Set(einstellungen().gelesen ?? []);
    // Q06: Wettbewerb ist eine eigene, im Standard geschlossene Sammelrubrik.
    const wettbewerb = liste.filter((m) => m.kategorie === 'Konkurrenz');
    const andere = liste.filter((m) => m.kategorie !== 'Konkurrenz');
    const eintrag = (m) => {
      const bezug = m.bezug && (m.bezug.stadt || m.bezug.modul || m.bezug.hausIds?.length);
      const info = '<span class="postnachricht"><small><b>' + esc(m.kategorie) + '</b> · KW ' + kwVon(m.woche) + (gelesen.has(m.id) ? '' : ' · neu') + '</small><span>' + esc(m.text) + '</span></span>';
      return '<div class="postmeldung ' + (gelesen.has(m.id) ? '' : 'ungelesen') + '" data-post-id="' + esc(m.id) + '"><button type="button" data-po-a="lesen" data-id="' + esc(m.id) + '">' + info + '</button>' + (bezug ? '<button type="button" class="hk-knopf text postort" data-po-a="sprung" data-id="' + esc(m.id) + '">Zum Ort</button>' : '') + '</div>';
    };
    const regulär = andere.length ? '<div class="hk-liste postliste">' + andere.map(eintrag).join('') + '</div>' : '';
    const rubrik = wettbewerb.length
      ? '<details class="post-konkurrenz" ' + (filter === 'Konkurrenz' ? 'open' : '') +
        '><summary>Konkurrenz · ' + wettbewerb.length + ' Meldung' + (wettbewerb.length === 1 ? '' : 'en') +
        ' (anzeigen)</summary><div class="post-konkurrenz-inhalt">' + wettbewerb.map(eintrag).join('') + '</div></details>'
      : '';
    return html + regulär + rubrik;
  }
  function erledigt(D) {
    if (!D.erledigt.length) return leer('In den letzten 13 Wochen wurde noch nichts erledigt.');
    return '<div class="hk-liste">' + D.erledigt.map((p) => '<div class="hk-zeile posterledigt" data-post-id="' + esc(p.id) + '"><span class="hk-was">' + esc(p.titel) + '<small>' + (p.art === 'angebot' ? 'Angebot' : 'Entscheidung') + ' · KW ' + kwVon(p.woche) + ' · ' + esc(p.ergebnis) + (p.standard ? ' · automatisch bei Fristablauf' : '') + '</small></span></div>').join('') + '</div>';
  }
  function zeigen(scrollHalten = false) {
    const vorher = document.getElementById('pinhalt').scrollTop, D = daten();
    const inhalt = K.bereich('betrieb', 'post') + befund(D) + K.rumpf(tabs(D) + '<div class="postinhalt">' + (einstellungen().reiter === 'meldungen' ? meldungen(D) : einstellungen().reiter === 'erledigt' ? erledigt(D) : handeln(D)) + '</div>');
    ctx.panel('Posteingang', (D.handeln.length === 1 ? '1 Vorgang' : D.handeln.length + ' Vorgänge') + ' offen · KW ' + kwVon(s().woche), inhalt, 'gross');
    ui.aktiv = true;
    document.getElementById('pinhalt').scrollTop = scrollHalten ? vorher : 0;
    if (ui.ziel) {
      const el = [...document.querySelectorAll('[data-post-id]')].find((x) => x.dataset.postId === ui.ziel);
      if (el) el.scrollIntoView({ block: 'nearest' });
      ui.ziel = null;
    }
    badge();
  }
  function gelesen(id) {
    const z = einstellungen();
    if (!z.gelesen.includes(id)) {
      z.gelesen.push(id);
      // Nur Einträge im aktuellen 13-Wochen-Fenster speichern.
      const gueltig = new Set(daten().meldungen.map((m) => m.id));
      z.gelesen = z.gelesen.filter((x) => gueltig.has(x));
      ctx.nachZustand();
    }
  }
  function badge() {
    const D = daten(), n = D.handeln.length, dringend = D.handeln.some((x) => x.dringend);
    for (const id of ['postbadge', 'postmenubadge']) {
      const b = document.getElementById(id);
      if (b) { b.textContent = n; b.style.display = n ? '' : 'none'; b.classList.toggle('dringend', dringend); }
    }
    return n;
  }
  function klicken(el) {
    const a = el.dataset.poA, id = el.dataset.id, v = el.dataset.v;
    if (['mieteEinzel','mieteAuswahl','mieteEmpfehlungen'].includes(a)) {
      const alle = daten().handeln.flatMap((x) => x.mietvertraege ?? []);
      const gruppe = a === 'mieteEinzel' ? alle.filter((x) => x.entscheidungId === id) :
        (daten().handeln.find((x) => x.id === id)?.mietvertraege ?? []);
      let erledigt = 0, fehler = 0;
      for (const m of gruppe) {
        const aus = ui.mietAuswahl.get(m.entscheidungId);
        if (a === 'mieteAuswahl' && !aus?.aktiv) continue;
        const option = a === 'mieteEmpfehlungen' ? m.empfehlung : aus?.option ?? m.empfehlung;
        const res = E.fuehreAus(s(), { typ: 'entscheiden', id: m.entscheidungId, option });
        if (res.ok) { erledigt++; ui.mietAuswahl.delete(m.entscheidungId); }
        else fehler++;
      }
      ctx.meldung(erledigt + ' Mietvertragsentscheidungen bearbeitet' +
        (fehler ? ', ' + fehler + ' fehlgeschlagen' : '') + '.', fehler === 0 && erledigt > 0);
      if (erledigt) ctx.nachAktion?.();
      return zeigen(true);
    }
    if (a === 'tab') { einstellungen().reiter = v; ui.verhandlung = null; ctx.nachZustand(); return zeigen(); }
    if (a === 'alleLesen') { for (const m of daten().meldungen) gelesen(m.id); return zeigen(true); }
    if (a === 'lesen') { gelesen(id); return zeigen(true); }
    if (a === 'sprung') { gelesen(id); const m = daten().meldungen.find((x) => x.id === id); if (m?.bezug) ctx.springe(m.bezug); return; }
    if (a === 'ort') { const p = daten().handeln.find((x) => x.id === id); if (p?.bezug) ctx.springe(p.bezug); return; }
    if (a === 'zurueck') { ui.verhandlung = null; return zeigen(); }
    if (a === 'option' && v === 'verhandeln') {
      const an = s().angebote.find((x) => x.id === id);
      if (an?.typ === 'paket') ui.verhandlung = { id, haeuser: new Set(an.vorschlagHaeuser ?? an.wunschHaeuser ?? []) };
      return zeigen();
    }
    let aktion;
    if (a === 'option') aktion = id && v ? (daten().handeln.some((p) => p.id === id && p.art === 'entscheidung') ? { typ: 'entscheiden', id, option: v } : { typ: v === 'annehmen' ? 'angebotAnnehmen' : 'angebotAblehnen', angebot: id }) : null;
    if (a === 'verhandeln' && ui.verhandlung) aktion = { typ: 'angebotVerhandeln', angebot: ui.verhandlung.id, haeuser: [...ui.verhandlung.haeuser] };
    if (!aktion) return;
    const r = E.fuehreAus(s(), aktion);
    ctx.meldung(r.text, r.ok);
    if (a === 'verhandeln' && r.ok) ui.verhandlung = null;
    ctx.nachAktion?.();
    zeigen(true);
  }
  const inhalt = document.getElementById('pinhalt');
  inhalt.addEventListener('click', (event) => {
    if (!ui.aktiv) return;
    const el = event.target.closest('[data-po-a]');
    if (el && !el.disabled) klicken(el);
  });
  inhalt.addEventListener('change', (event) => {
    if (!ui.aktiv) return;
    if (event.target.matches('[data-po-miet-check]')) {
      const id = event.target.dataset.poMietCheck;
      const old = ui.mietAuswahl.get(id);
      if (old) old.aktiv = event.target.checked;
      return;
    }
    if (event.target.matches('[data-po-miet-option]')) {
      const id = event.target.dataset.poMietOption;
      const old = ui.mietAuswahl.get(id);
      if (old) old.option = event.target.value;
      return;
    }
    if (event.target.matches('[data-po-filter]')) { ui.filter = event.target.value; zeigen(); }
    if (event.target.matches('[data-po-haus]') && ui.verhandlung) {
      if (event.target.checked) ui.verhandlung.haeuser.add(event.target.dataset.poHaus);
      else ui.verhandlung.haeuser.delete(event.target.dataset.poHaus);
      zeigen(true);
    }
  });
  return {
    ui, oeffne: (reiter = einstellungen().reiter, ziel = null) => {
      einstellungen().reiter = reiter; ui.verhandlung = null; ui.ziel = ziel; ctx.nachZustand(); zeigen();
    },
    zu: () => { ui.aktiv = false; }, aktiv: () => ui.aktiv, neuZeichnen: () => { if (ui.aktiv) zeigen(true); },
    badge, pruefe: () => ({ soll: daten().handeln.length, badge: Number(document.getElementById('postbadge')?.textContent ?? 0), karten: document.querySelectorAll('.postkarte').length, seite: einstellungen().reiter }),
  };
}
