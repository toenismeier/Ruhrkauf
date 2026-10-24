
import { geld, esc, kwVon } from './format.js';
import * as K from './komponenten.js';
import { portraetSVG } from '../kit/portraet.js';

// E47: Posteingang als verdichtete Liste. Hauptfrage: Was muss ich diese Woche entscheiden, und was läuft ab?
// Vorgänge nach Frist gruppiert (diese Woche, nächste Woche, später); je Vorgang Titel, Frist, Betrag, eine Hauptaktion.
const SEKRETARIAT = portraetSVG({ geschlecht: 'w', alter: 36, haar: 'bob', haarfarbe: 'braun', hautton: 'rosig', kleidung: 'blazer', kleidungFarbe: 'marine', seed: 821 }, 72);
const MIET_OPTIONEN = [['verlaengern', 'Verlängern'], ['nachverhandeln', 'Nachverhandeln'], ['auslaufen', 'Auslaufen lassen']];
const RUBRIKEN = ['Presse', 'Häuser', 'Finanzen', 'Personal', 'Konkurrenz', 'Eigentümer', 'IT'];

// Zentraler Posteingang: reine Engine-Abfragen und bestehende Spieleraktionen.
export function posteingangModul(ctx) {
  const E = ctx.E, s = ctx.s;
  const ui = { aktiv: false, filter: 'Alle', verhandlung: null, ziel: null, mietAuswahl: new Map(), konkurrenzOffen: false };
  const einstellungen = () => ctx.zustand();
  const daten = () => E.posteingang(s());
  const frist = (n) => n === 0 ? 'läuft ab' : n === 1 ? 'noch 1 Woche' : 'noch ' + n + ' Wochen';
  const leer = (t, titel = '') => K.leer(t, titel);

  function tabs(D) {
    const aktiv = einstellungen().reiter;
    const ungelesen = D.meldungen.filter((m) => !(einstellungen().gelesen ?? []).includes(m.id)).length;
    return K.seg([['handeln', 'Zu tun' + (D.handeln.length ? ' · ' + D.handeln.length : '')], ['meldungen', 'Meldungen' + (ungelesen ? ' · ' + ungelesen : '')], ['erledigt', 'Erledigt']],
      aktiv, (v) => 'data-po-a="tab" data-v="' + v + '"').replace('class="hw-segment"', 'class="hw-segment eng" aria-label="Posteingang"');
  }
  function befund(D) {
    const ab = D.handeln.filter((x) => x.restWochen === 0).length, n = D.handeln.length;
    if (!n) return K.sprecher({ text: '<b>Nichts liegt zur Entscheidung.</b> Neue Vorgänge kommen mit dem Wochenabschluss.', unter: 'Sekretariat', person: SEKRETARIAT });
    const summe = D.handeln.reduce((a, p) => a + (p.wert?.betrag ?? 0), 0);
    const kopf = ab ? ab + (ab === 1 ? ' Vorgang läuft' : ' Vorgänge laufen') + ' diese Woche ab.' : n + (n === 1 ? ' Vorgang wartet' : ' Vorgänge warten') + ' auf Sie.';
    return K.sprecher({ text: '<b>' + kopf + '</b>' + (ab && n > ab ? ' ' + (n - ab) + ' weitere warten.' : '') + (summe ? ' Es geht um ' + esc(geld(summe)) + '.' : ''),
      unter: 'Sekretariat', person: SEKRETARIAT, ton: ab ? 'alarm' : 'engpass' });
  }
  // Wert rechts: Betrag (neutral) oder, ohne Betrag, die Frist mit Ton. Frist steht immer in der Unterzeile.
  const kopfzeile = (p) => K.zeile({ was: esc(p.titel),
    unter: '<span class="' + (p.restWochen === 0 ? 'hw-schlecht' : p.dringend ? 'hw-achtung' : '') + '">' + (p.restWochen === 0 ? 'Läuft diese Woche ab' : 'Frist KW ' + kwVon(p.frist) + ', ' + frist(p.restWochen)) + '</span>'
      + ' · ' + (p.art === 'angebot' ? 'Angebot' : 'Entscheidung') + ' · ohne Entscheidung: ' + esc(p.standard),
    wert: p.wert ? esc(geld(p.wert.betrag)) : (p.restWochen === 0 ? 'Diese Woche' : 'KW ' + kwVon(p.frist)), wertUnter: p.wert ? esc(p.wert.einheit) : frist(p.restWochen),
    ton: p.wert ? '' : p.restWochen === 0 ? 'schlecht' : p.dringend ? 'achtung' : '' });

  function mietvertrag(p) {
    const reihen = (p.mietvertraege ?? []).map((m) => {
      if (!ui.mietAuswahl.has(m.entscheidungId)) ui.mietAuswahl.set(m.entscheidungId, { aktiv: true, option: m.empfehlung });
      const wahl = ui.mietAuswahl.get(m.entscheidungId);
      const quote = (v) => v === undefined ? 'ohne Umsatz' : (100 * v).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' %';
      const empfehlung = MIET_OPTIONEN.find((x) => x[0] === m.empfehlung)?.[1] ?? m.empfehlung;
      return '<div class="hw-vorgang-miete" data-miet-id="' + esc(m.entscheidungId) + '">'
        + K.schalter({ text: m.haus, unter: m.stadt + ' · ' + m.format + ' · Restlaufzeit ' + m.restlaufzeit + ' Wochen · Vermieter ' + m.vermieter, an: wahl.aktiv,
          attr: 'data-po-a="mietCheck" data-id="' + esc(m.entscheidungId) + '"' })
        + K.liste([
          K.zeile({ was: 'Miete im Jahr', unter: 'Quote ' + quote(m.mietquoteIst) + ' auf ' + quote(m.mietquoteNeu), wert: esc(geld(m.angebotMiete)), wertUnter: 'bisher ' + esc(geld(m.istMiete)) }),
          K.zeile({ was: 'Haus-Deckungsbeitrag', unter: 'Empfehlung Immobilien: ' + esc(empfehlung), wert: m.ebitdaHaus === undefined ? 'keine Buchung' : esc(geld(m.ebitdaHaus)), ton: (m.ebitdaHaus ?? 0) < 0 ? 'schlecht' : '' })])
        + K.seg(MIET_OPTIONEN, wahl.option, (v) => 'data-po-a="mietOption" data-id="' + esc(m.entscheidungId) + '" data-v="' + v + '"').replace('class="hw-segment"', 'class="hw-segment eng" aria-label="Entscheidung ' + esc(m.haus) + '"')
        + K.knoepfe(K.knopf('Nur dieses Haus entscheiden', 'data-po-a="mieteEinzel" data-id="' + esc(m.entscheidungId) + '"', 'zweit')) + '</div>';
    }).join('');
    return '<div class="hw-vorgang" data-post-id="' + esc(p.id) + '">' + kopfzeile(p) + '<p class="hw-lese">' + esc(p.text) + '</p>'
      + K.knoepfe(K.knopf('Auswahl entscheiden', 'data-po-a="mieteAuswahl" data-id="' + esc(p.id) + '"'), K.knopf('Empfehlungen übernehmen', 'data-po-a="mieteEmpfehlungen" data-id="' + esc(p.id) + '"', 'zweit'))
      + reihen + '</div>';
  }
  function vorgang(p) {
    if (p.typ === 'mietvertraege') return mietvertrag(p);
    // Eine Hauptaktion: die Standardwahl (Empfehlung) bzw. Annehmen; die übrigen Wege leise daneben.
    const prim = p.optionen.find((o) => o.label === p.standard)?.id ?? p.optionen.find((o) => o.id === 'annehmen')?.id ?? p.optionen[0]?.id;
    const knoepfe = [...p.optionen].sort((a, b) => Number(b.id === prim) - Number(a.id === prim))
      .map((o) => K.knopf(o.label.replace(/\s*\(Empfehlung\)/, ''), 'data-po-a="option" data-id="' + esc(p.id) + '" data-v="' + esc(o.id) + '"', o.id === prim ? '' : 'text'));
    const ort = p.bezug && (p.bezug.hausIds?.length || p.bezug.stadt || p.bezug.modul) ? K.knopf('Zum Ort', 'data-po-a="ort" data-id="' + esc(p.id) + '"', 'text') : '';
    return '<div class="hw-vorgang" data-post-id="' + esc(p.id) + '">' + kopfzeile(p) + '<p class="hw-lese">' + esc(p.text) + '</p>' + K.knoepfe(...knoepfe, ort) + '</div>';
  }
  function handeln(D) {
    if (ui.verhandlung) return verhandeln();
    if (!D.handeln.length) return K.abschnitt('Zu entscheiden') + leer('Keine offenen Angebote oder Entscheidungen.', 'Mappe leer');
    const sortiert = [...D.handeln].sort((a, b) => a.restWochen - b.restWochen || Number(b.dringend) - Number(a.dringend));
    const gruppen = [['Läuft diese Woche ab', (p) => p.restWochen === 0], ['Nächste Woche', (p) => p.restWochen === 1], ['Später', (p) => p.restWochen > 1]];
    return gruppen.map(([titel, passt]) => {
      const liste = sortiert.filter(passt);
      if (!liste.length) return '';
      const summe = liste.reduce((a, p) => a + (p.wert?.betrag ?? 0), 0);
      return K.abschnitt(titel, liste.length + (liste.length === 1 ? ' Vorgang' : ' Vorgänge') + (summe ? ' · ' + geld(summe) : '')) + liste.map(vorgang).join('');
    }).join('');
  }
  function verhandeln() {
    const a = s().angebote.find((x) => x.id === ui.verhandlung.id && x.status === 'offen');
    if (!a) { ui.verhandlung = null; return leer('Das Angebot ist nicht mehr offen.'); }
    const haeuser = s().haeuser.filter((h) => h.status === 'offen' && h.etagen.includes(a.etage ?? 0)).sort((x, y) => x.stadt.localeCompare(y.stadt) || x.name.localeCompare(y.name));
    return K.knoepfe(K.knopf('Zurück zu den Vorgängen', 'data-po-a="zurueck"', 'text'))
      + K.abschnitt('Paketangebot verhandeln', 'mindestens ' + (a.minHaeuser ?? 1) + ' Standorte')
      + K.liste([K.zeile({ was: esc(a.titel), unter: 'Die Engine prüft nach der Auswahl die Verhandlungsposition.', wert: String(ui.verhandlung.haeuser.size), wertUnter: 'ausgewählt' })])
      + K.knoepfe(K.knopf('Auswahl verhandeln (' + ui.verhandlung.haeuser.size + ')', 'data-po-a="verhandeln"', 'breit'))
      + K.abschnitt('Standorte', haeuser.length + ' Häuser')
      + haeuser.map((h) => K.schalter({ text: h.name, unter: h.stadt, an: ui.verhandlung.haeuser.has(h.id), attr: 'data-po-a="haus" data-id="' + esc(h.id) + '"' })).join('');
  }
  function meldungen(D) {
    const filter = ui.filter, gelesen = new Set(einstellungen().gelesen ?? []);
    const vorhanden = RUBRIKEN.filter((k) => D.meldungen.some((m) => m.kategorie === k) || k === filter);
    const alle = ['Alle', ...vorhanden], je = alle.length <= 5 ? alle.length : Math.ceil(alle.length / 2);
    const reihen = [alle.slice(0, je), alle.slice(je)].filter((r) => r.length);
    let html = reihen.map((r) => K.seg(r.map((k) => [k, k]), filter, (v) => 'data-po-a="filter" data-v="' + esc(v) + '"').replace('class="hw-segment"', 'class="hw-segment eng" aria-label="Rubrik"')).join('');
    const liste = D.meldungen.filter((m) => filter === 'Alle' || m.kategorie === filter);
    const neu = liste.filter((m) => !gelesen.has(m.id)).length;
    if (!liste.length) return html + K.abschnitt('Meldungen') + leer('Keine Meldungen in dieser Rubrik.');
    const eintrag = (m) => {
      const bezug = m.bezug && (m.bezug.stadt || m.bezug.modul || m.bezug.hausIds?.length);
      const ungelesen = !gelesen.has(m.id);
      return '<div class="' + (ungelesen ? 'hw-ungelesen' : '') + '" data-post-id="' + esc(m.id) + '">' + K.zeile({ was: esc(m.text),
        unter: esc(m.kategorie) + ' · KW ' + kwVon(m.woche) + (bezug ? ' · zum Ort tippen' : ''), wert: ungelesen ? K.marke('Neu', 'achtung') : '',
        tippbar: !!bezug || ungelesen, attr: 'data-po-a="' + (bezug ? 'sprung' : 'lesen') + '" data-id="' + esc(m.id) + '"' }) + '</div>';
    };
    // Q06: Wettbewerb ist eine eigene, im Standard eingeklappte Sammelrubrik.
    const wettbewerb = liste.filter((m) => m.kategorie === 'Konkurrenz'), andere = liste.filter((m) => m.kategorie !== 'Konkurrenz');
    html += K.abschnitt(filter === 'Alle' ? 'Hauspost' : filter, liste.length + ' Meldungen' + (neu ? ' · ' + neu + ' neu' : ''));
    if (neu) html += K.knoepfe(K.knopf('Alle als gelesen markieren', 'data-po-a="alleLesen"', 'text'));
    if (andere.length) html += '<div class="hw-liste">' + andere.map(eintrag).join('') + '</div>';
    if (wettbewerb.length) {
      const offen = ui.konkurrenzOffen || filter === 'Konkurrenz';
      if (filter !== 'Konkurrenz') html += K.abschnitt('Konkurrenz', wettbewerb.length + ' Meldungen');
      html += offen ? '<div class="hw-liste">' + wettbewerb.map(eintrag).join('') + '</div>'
        : K.knoepfe(K.knopf('Konkurrenzmeldungen anzeigen', 'data-po-a="konkurrenz"', 'zweit breit'));
    }
    return html;
  }
  function erledigt(D) {
    if (!D.erledigt.length) return K.abschnitt('Erledigt') + leer('In den letzten 13 Wochen wurde noch nichts erledigt.');
    return K.abschnitt('Erledigt', 'letzte 13 Wochen') + K.liste(D.erledigt.map((p) => '<div data-post-id="' + esc(p.id) + '">' + K.zeile({ was: esc(p.titel),
      unter: (p.art === 'angebot' ? 'Angebot' : 'Entscheidung') + ' · KW ' + kwVon(p.woche) + (p.standard ? ' · automatisch bei Fristablauf' : ''), wert: esc(p.ergebnis) }) + '</div>'));
  }
  function zeigen(scrollHalten = false) {
    const vorher = document.getElementById('pinhalt').scrollTop, D = daten();
    const seite = einstellungen().reiter === 'meldungen' ? meldungen(D) : einstellungen().reiter === 'erledigt' ? erledigt(D) : handeln(D);
    const inhalt = K.bereich('betrieb', 'post') + befund(D) + '<div class="hw-g5">' + K.rumpf(tabs(D) + seite) + '</div>';
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
    if (a === 'mietCheck') { const alt = ui.mietAuswahl.get(id); if (alt) alt.aktiv = !alt.aktiv; return zeigen(true); }
    if (a === 'mietOption') { const alt = ui.mietAuswahl.get(id); if (alt) alt.option = v; return zeigen(true); }
    if (['mieteEinzel', 'mieteAuswahl', 'mieteEmpfehlungen'].includes(a)) {
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
    if (a === 'filter') { ui.filter = v; return zeigen(true); }
    if (a === 'konkurrenz') { ui.konkurrenzOffen = true; return zeigen(true); }
    if (a === 'alleLesen') { for (const m of daten().meldungen) gelesen(m.id); return zeigen(true); }
    if (a === 'lesen') { gelesen(id); return zeigen(true); }
    if (a === 'sprung') { gelesen(id); const m = daten().meldungen.find((x) => x.id === id); if (m?.bezug) ctx.springe(m.bezug); return; }
    if (a === 'ort') { const p = daten().handeln.find((x) => x.id === id); if (p?.bezug) ctx.springe(p.bezug); return; }
    if (a === 'zurueck') { ui.verhandlung = null; return zeigen(); }
    if (a === 'haus' && ui.verhandlung) {
      if (ui.verhandlung.haeuser.has(id)) ui.verhandlung.haeuser.delete(id); else ui.verhandlung.haeuser.add(id);
      return zeigen(true);
    }
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
  return {
    ui, oeffne: (reiter = einstellungen().reiter, ziel = null) => {
      einstellungen().reiter = reiter; ui.verhandlung = null; ui.ziel = ziel; ctx.nachZustand(); zeigen();
    },
    zu: () => { ui.aktiv = false; }, aktiv: () => ui.aktiv, neuZeichnen: () => { if (ui.aktiv) zeigen(true); },
    badge, pruefe: () => ({ soll: daten().handeln.length, badge: Number(document.getElementById('postbadge')?.textContent ?? 0), karten: document.querySelectorAll('#pinhalt .hw-vorgang').length, seite: einstellungen().reiter }),
  };
}
