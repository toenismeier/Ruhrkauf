// Portfolio- und Deutschland-Ansicht für den 560-Häuser-Maßstab.
// Fachliche Kennzahlen und Aktionen kommen ausschließlich aus der Engine.
// E47: ruhige Liste, Filter als Segmentleisten, Sammelaktionen als Knöpfe; Karte im dunklen Blatt.
import { geld, pz, fmt, esc } from './format.js';
import { deutschlandKarte, kartenStaedte } from './deutschland.js';
import { auswahlFilterLaden, auswahlFilterSpeichern } from './speicher.js';
import * as K from './komponenten.js';

export const FORMATE = [
  ['hartwig', 'Hartwig'], ['premium', 'Hartwig Premium'], ['sport', 'Hartwig Sport'],
  ['volkskauf', 'Volkskauf'], ['fundus', 'FUNDUS']
];
const FORMAT_KURZ = { hartwig: 'Hartwig', premium: 'Premium', sport: 'Sport', volkskauf: 'Volkskauf', fundus: 'FUNDUS' };
const HOEHE = 58;
const FELDER = [
  ['umsatz', 'Umsatz'], ['ebitda', 'EBITDA'], ['marge', 'Marge'],
  ['mietquote', 'Miete'], ['substanz', 'Substanz'],
  ['restlaufzeitMiete', 'Laufzeit'], ['status', 'Status']
];
const AMPEL = [['alle', 'Alle'], ['gruen', 'Positiv'], ['gelb', 'Knapp'], ['rot', 'Negativ'], ['ohne', 'Ohne Daten']];
const START = () => ({ format: 'alle', region: 'alle', klasse: 'alle', ampel: 'alle', suche: '' });
const statusName = { offen: 'Offen', schliessung_verhandlung: 'Verhandlung', raeumung: 'Räumung', geschlossen: 'Geschlossen', verkauft: 'Verkauft' };
const eng = (html, label) => html.replace('class="hw-segment"', 'class="hw-segment eng" aria-label="' + esc(label) + '"');

export function portfolioFiltern(zeilen, filter) {
  const suche = String(filter.suche ?? '').trim().toLocaleLowerCase('de');
  return zeilen.filter((h) =>
    (filter.format === 'alle' || h.formatKey === filter.format) &&
    (filter.region === 'alle' || h.region === filter.region) &&
    (filter.klasse === 'alle' || h.klasse === filter.klasse) &&
    (filter.ampel === 'alle' || h.ampel === filter.ampel) &&
    (!suche || (h.stadt + ' ' + h.name + ' ' + h.id).toLocaleLowerCase('de').includes(suche)));
}

export function portfolioSortieren(zeilen, feld = 'umsatz', absteigend = true) {
  const vorzeichen = absteigend ? -1 : 1;
  return [...zeilen].sort((a, b) => {
    const aa = a[feld], bb = b[feld];
    const vergleich = typeof aa === 'number' && typeof bb === 'number' ? aa - bb
      : String(aa ?? '').localeCompare(String(bb ?? ''), 'de');
    return vergleich * vorzeichen || a.stadt.localeCompare(b.stadt, 'de') || a.id.localeCompare(b.id, 'de');
  });
}

export function portfolioModul(ctx) {
  const ui = { aktiv: false, seite: 'karte', filter: START(), sort: 'umsatz', absteigend: true, mehr: false,
    ausgewaehlt: new Set(), vorschau: null, gespeicherte: [], eintraege: [] };
  const wurzel = document.getElementById('pinhalt');
  const zeilen = () => ctx.E.portfolio(ctx.s());
  const gefiltert = () => portfolioFiltern(zeilen(), ui.filter);
  const aktionsIds = () => {
    const aktiv = new Set(zeilen().filter((h) => h.steuerbar).map((h) => h.id));
    return [...ui.ausgewaehlt].filter((id) => aktiv.has(id));
  };
  // Die Filter gehören nur in die Anzeige; ein Spielstand erhält niemals UI-eigene Haus-KPIs.
  // Q30: Deutschland beantwortet „Wo läuft das Netz, wo brennt es?“, Häuser „Welche Häuser brauchen einen Eingriff?“
  function kopf() {
    const f = ui.filter;
    const filterSeg = (feld, optionen, label) => eng(K.seg(optionen, f[feld], (v) => 'data-pp-filter="' + feld + '" data-v="' + esc(v) + '"'), label);
    let x = K.seg([['karte', 'Deutschland'], ['liste', 'Häuser']], ui.seite, (v) => 'data-pp="seite" data-v="' + v + '"');
    x += '<div id="pp-ampel"></div>';
    x += filterSeg('format', [['alle', 'Alle'], ...FORMATE.map(([k]) => [k, FORMAT_KURZ[k]])], 'Format');
    x += filterSeg('ampel', AMPEL, 'Ergebnisampel');
    const weitere = ['region', 'klasse'].filter((k) => f[k] !== 'alle').length + (f.suche ? 1 : 0);
    x += K.knoepfe(K.knopf(ui.mehr ? 'Weniger Filter' : 'Region, Klasse und Suche' + (weitere ? ' · ' + weitere + ' aktiv' : ''), 'data-pp="mehr"', 'text'));
    if (ui.mehr) {
      x += filterSeg('region', [['alle', 'Alle'], ...['West', 'Nord', 'Süd', 'Mitte', 'Ost'].map((v) => [v, v])], 'Region');
      x += filterSeg('klasse', [['alle', 'Alle'], ...['A', 'B', 'C', 'Premium'].map((v) => [v, v === 'Premium' ? v : 'Klasse ' + v])], 'Hausklasse');
      x += '<input id="pp-suche" class="hw-suche" type="search" placeholder="Stadt, Name oder Haus-ID" aria-label="Stadt oder Haus suchen" value="' + esc(f.suche) + '" autocomplete="off" />';
      x += K.knoepfe(K.knopf('Filter speichern', 'data-pp="merken"', 'zweit'), ...ui.gespeicherte.slice(-4).map((q) => K.knopf(q.name, 'data-pp="gespeichert" data-v="' + esc(q.name) + '"', 'zweit')));
    }
    return K.bereich('betrieb', 'karte') + '<div class="hw-g5">' + K.rumpf(x + '<div id="pp-inhalt"></div>') + '</div>';
  }
  function ampelKopf(hs) {
    const n = (a) => hs.filter((h) => h.ampel === a).length;
    const el = wurzel.querySelector('#pp-ampel');
    if (el) el.innerHTML = K.gross([{ label: 'Positiv', wert: fmt.format(n('gruen')), ton: 'gut' }, { label: 'Knapp', wert: fmt.format(n('gelb')) }, { label: 'Negativ', wert: fmt.format(n('rot')), ton: n('rot') ? 'schlecht' : '' }])
      + '<p class="hw-text">Häuser nach Ergebnisampel · ' + fmt.format(n('ohne')) + ' ohne Daten (geschlossen oder noch nicht simuliert)</p>';
  }
  function oeffne(seite = ui.seite) {
    ui.seite = seite;
    ui.vorschau = null;
    const vorher = wurzel.scrollTop, offen = ui.aktiv;
    ctx.panel(seite === 'karte' ? 'Deutschland' : 'Häuser', 'Portfolio · alle Formate', kopf(), 'gross');
    ui.aktiv = true;
    if (offen) wurzel.scrollTop = vorher;
    anzeigen();
  }
  function inhalt() { return wurzel.querySelector('#pp-inhalt'); }
  function anzeigen() {
    if (!ui.aktiv || !inhalt()) return;
    const hs = gefiltert(), ziel = inhalt();
    const altScroll = ziel.querySelector('#pp-scroll')?.scrollTop ?? 0;
    ampelKopf(hs);
    if (ui.seite === 'karte') {
      const alle = kartenStaedte(hs), koord = alle.filter((x) => x.koordinaten).length;
      ziel.innerHTML = '<div id="pp-karte" class="hw-pp-karte"></div>' +
        '<div class="hw-legende" aria-label="Legende">' + AMPEL.slice(1).map(([k, t]) => '<span><i class="hw-ampel ' + k + '"></i>' + t + '</span>').join('') + '</div>' +
        '<p class="hw-text">' + fmt.format(alle.length) + ' Städte · ' + fmt.format(hs.length) + ' Häuser · ' + koord + ' Kartenpunkte. Punktgröße: Wochenumsatz. Stadt antippen öffnet sie.</p>';
      ziel.querySelector('#pp-karte').append(deutschlandKarte(hs, ctx.sprungStadt));
      return;
    }
    const sortierte = [];
    for (const [format, name] of FORMATE) {
      const gruppe = portfolioSortieren(hs.filter((h) => h.formatKey === format), ui.sort, ui.absteigend);
      if (gruppe.length) {
        sortierte.push({ gruppe: name, anzahl: gruppe.length });
        for (const h of gruppe) sortierte.push({ haus: h });
      }
    }
    ui.eintraege = sortierte;
    const anzahl = aktionsIds().length, aus = !anzahl;
    const sortSeg = (teil) => eng(K.seg(teil, ui.sort, (v) => 'data-pp="sort" data-v="' + v + '"'), 'Sortieren nach');
    ziel.innerHTML = K.abschnitt('Häuser', fmt.format(hs.length) + ' von ' + fmt.format(zeilen().length) + ' · ' + anzahl + ' ausgewählt')
      + sortSeg(FELDER.slice(0, 4)) + sortSeg(FELDER.slice(4))
      + K.knoepfe(K.knopf(ui.absteigend ? 'Absteigend' : 'Aufsteigend', 'data-pp="richtung"', 'zweit'), K.knopf('Alle wählen', 'data-pp="alle"', 'zweit'), K.knopf('Leeren', 'data-pp="leeren"', 'text'))
      + '<div id="pp-scroll" class="hw-pp-scroll" role="list" aria-label="Hausportfolio">'
      + '<div id="pp-spacer" style="height:' + (sortierte.length * HOEHE) + 'px"></div></div>'
      + K.abschnitt('Sammelaktionen', anzahl + ' steuerbare Häuser')
      + '<div class="hw-knoepfe zweispaltig">'
      + K.knopf('Personal −5 %', 'data-pp="abbau"', 'zweit', aus) + K.knopf('Personal +5 %', 'data-pp="aufbau"', 'zweit', aus)
      + K.knopf('Aushilfen 10 %', 'data-pp="aushilfen"', 'zweit', aus) + K.knopf('Miete −5 % verhandeln', 'data-pp="miete"', 'zweit', aus)
      + K.knopf('Marketing 15 % Rabatt', 'data-pp="marketing"', 'zweit', aus) + K.knopf('Schließen', 'data-pp="schliessen"', 'gefahr', aus) + '</div>'
      + (ui.vorschau
        ? K.abschnitt('Schließungsvorschau', ui.vorschau.anzahl + ' Häuser')
          + K.tabelle({ zeilen: [{ name: 'Sozialplan', werte: ['ca. ' + geld(ui.vorschau.sozialplan)] }, { name: 'Restmiete', werte: ['ca. ' + geld(ui.vorschau.restmiete)] }],
            summe: { name: 'Gesamt', werte: ['ca. ' + geld(ui.vorschau.gesamt)] } })
          + K.hinweis(esc(ui.vorschau.hinweis), 'achtung')
          + K.knoepfe(K.knopf('Schließungen einleiten', 'data-pp="schliessen-ja"', 'gefahr'), K.knopf('Abbrechen', 'data-pp="schliessen-nein"', 'zweit'))
        : '');
    const scroll = ziel.querySelector('#pp-scroll');
    scroll.scrollTop = altScroll;
    scroll.addEventListener('scroll', zeilenZeichnen, { passive: true });
    zeilenZeichnen();
  }
  // Feste Zeilenhöhe: bei 560 Häusern bleiben unabhängig von der Sortierung nur sichtbare Einträge im DOM.
  function zeilenZeichnen() {
    const scroll = inhalt()?.querySelector('#pp-scroll'), spacer = inhalt()?.querySelector('#pp-spacer');
    if (!scroll || !spacer) return;
    const start = Math.max(0, Math.floor(scroll.scrollTop / HOEHE) - 3);
    const ende = Math.min(ui.eintraege.length, start + Math.ceil((scroll.clientHeight || 360) / HOEHE) + 7);
    spacer.innerHTML = ui.eintraege.slice(start, ende).map((eintrag, j) => {
      const pos = (start + j) * HOEHE;
      if (eintrag.gruppe) return '<div class="hw-pp-gruppe" style="top:' + pos + 'px;height:' + HOEHE + 'px">' +
        esc(eintrag.gruppe) + ' · ' + eintrag.anzahl + '</div>';
      const h = eintrag.haus;
      const wert = ui.sort === 'marge' || ui.sort === 'mietquote' ? pz(h[ui.sort], 1)
        : ui.sort === 'substanz' ? Math.round(h.substanz) + ' / 100'
        : ui.sort === 'restlaufzeitMiete' ? Math.round(h.restlaufzeitMiete) + ' Wochen'
        : ui.sort === 'status' ? statusName[h.status] ?? h.status : geld(h[ui.sort] ?? 0);
      const ton = (ui.sort === 'ebitda' || ui.sort === 'marge') && (h[ui.sort] ?? 0) < 0 ? ' schlecht' : '';
      return '<div class="hw-pp-zeile" role="listitem" data-haus="' + esc(h.id) + '" data-wert="' + esc(h[ui.sort] ?? '') + '" style="top:' + pos + 'px;height:' + HOEHE + 'px">' +
        '<input type="checkbox" class="hw-pp-wahl" data-pp-id="' + esc(h.id) + '" aria-label="' + esc(h.name) + ' auswählen"' +
        (ui.ausgewaehlt.has(h.id) ? ' checked' : '') + (!h.steuerbar ? ' disabled' : '') + ' />' +
        '<button type="button" data-pp="haus" data-id="' + esc(h.id) + '" class="hw-pp-name"><b>' + esc(h.name) +
        '</b><small>' + esc(h.stadt) + (h.klasse ? ' · ' + esc(h.klasse === 'Premium' ? 'Premium' : 'Klasse ' + h.klasse) : '') + ' · ' + esc(statusName[h.status] ?? h.status) +
        (!h.steuerbar && h.status === 'offen' ? ' · nur Daten' : '') + '</small></button>' +
        '<span class="hw-wert' + ton + '"><i class="hw-ampel ' + esc(h.ampel) + '" aria-label="Ampel ' + esc(AMPEL.find((a) => a[0] === h.ampel)?.[1] ?? '') + '"></i>' + esc(wert) + '</span></div>';
    }).join('');
  }
  function filterSetzen(format) {
    ui.filter = { ...ui.filter, format };
    if (ui.aktiv) oeffne(ui.seite);
  }
  function aktion(typ) {
    const ids = aktionsIds();
    if (!ids.length) { ctx.meldung('Keine steuerbaren Häuser ausgewählt.', false); return; }
    if (typ === 'schliessen') {
      ui.vorschau = ctx.E.schliessungVorschau(ctx.s(), ids);
      anzeigen(); return;
    }
    const a = typ === 'abbau' ? { typ: 'personalabbau', haeuser: ids, prozent: 0.05 }
      : typ === 'aufbau' ? { typ: 'personalaufbau', haeuser: ids, prozent: 0.05 }
      : typ === 'aushilfen' ? { typ: 'aushilfen', haeuser: ids, quote: 0.10 }
      : typ === 'miete' ? { typ: 'mieteVerhandeln', haeuser: ids, reduktion: 0.05 }
      : { typ: 'aktion', name: 'Portfolio-Aktion', rabatt: 0.15, wochen: 1, scope: { typ: 'haeuser', ids } };
    const ergebnis = ctx.E.fuehreAus(ctx.s(), a);
    ctx.meldung(ergebnis.text, ergebnis.ok);
    ui.vorschau = null;
    ctx.nachAktion();
    anzeigen();
  }
  wurzel.addEventListener('click', (e) => {
    if (!ui.aktiv) return;
    const f = e.target.closest('[data-pp-filter]');
    if (f) { ui.filter[f.dataset.ppFilter] = f.dataset.v; ui.vorschau = null; oeffne(ui.seite); return; }
    const knopf = e.target.closest('[data-pp]');
    if (!knopf || knopf.disabled) return;
    const typ = knopf.dataset.pp;
    if (typ === 'seite') { oeffne(knopf.dataset.v); return; }
    if (typ === 'mehr') { ui.mehr = !ui.mehr; oeffne(ui.seite); return; }
    if (typ === 'sort') { ui.sort = knopf.dataset.v; anzeigen(); return; }
    if (typ === 'richtung') { ui.absteigend = !ui.absteigend; anzeigen(); return; }
    if (typ === 'alle') {
      gefiltert().filter((h) => h.steuerbar).forEach((h) => ui.ausgewaehlt.add(h.id));
      anzeigen(); return;
    }
    if (typ === 'leeren') { ui.ausgewaehlt.clear(); ui.vorschau = null; anzeigen(); return; }
    if (typ === 'haus') { ctx.sprungHaus(knopf.dataset.id); return; }
    if (typ === 'gespeichert') {
      const v = ui.gespeicherte.find((x) => x.name === knopf.dataset.v);
      if (v) { ui.filter = { ...START(), ...v.filter }; oeffne(ui.seite); }
      return;
    }
    if (typ === 'merken') {
      const name = window.prompt('Name für diese Filterauswahl', 'Auswahl ' + (ui.gespeicherte.length + 1));
      if (!name) return;
      auswahlFilterSpeichern(name, ui.filter).then((liste) => { ui.gespeicherte = liste; oeffne(ui.seite); ctx.meldung('Auswahl gespeichert.'); })
        .catch((fehler) => ctx.meldung(fehler.message, false)); return;
    }
    if (typ === 'schliessen-nein') { ui.vorschau = null; anzeigen(); return; }
    if (typ === 'schliessen-ja') {
      const ids = aktionsIds();
      const ergebnis = ctx.E.fuehreAus(ctx.s(), { typ: 'schliessen', haeuser: ids });
      ui.vorschau = null; ctx.meldung(ergebnis.text, ergebnis.ok); ctx.nachAktion(); anzeigen(); return;
    }
    if (['schliessen', 'abbau', 'aufbau', 'aushilfen', 'miete', 'marketing'].includes(typ)) aktion(typ);
  });
  wurzel.addEventListener('change', (e) => {
    if (!ui.aktiv) return;
    if (e.target.matches('[data-pp-id]')) {
      if (e.target.checked) ui.ausgewaehlt.add(e.target.dataset.ppId);
      else ui.ausgewaehlt.delete(e.target.dataset.ppId);
      ui.vorschau = null; anzeigen();
    }
  });
  wurzel.addEventListener('input', (e) => {
    if (ui.aktiv && e.target.id === 'pp-suche') {
      ui.filter.suche = e.target.value; ui.vorschau = null; anzeigen();
    }
  });
  auswahlFilterLaden().then((liste) => { ui.gespeicherte = liste; }).catch(() => {});
  return {
    aktiv: () => ui.aktiv, zu: () => { ui.aktiv = false; }, oeffne, neuZeichnen: () => oeffne(ui.seite),
    filterSetzen,
    pruefe: () => ({ quelle: zeilen().length, anzeige: gefiltert().length, punkte: kartenStaedte(gefiltert()).length,
      domZeilen: inhalt()?.querySelectorAll('.hw-pp-zeile').length ?? 0, auswahl: aktionsIds().length,
      fehler: zeilen().filter((h) => !h.stadt || !h.id || !h.formatKey).map((h) => h.id) }),
    get filter() { return { ...ui.filter }; },
    get auswahl() { return [...ui.ausgewaehlt]; },
  };
}
