// Portfolio- und Deutschland-Ansicht für den 560-Häuser-Maßstab.
// Fachliche Kennzahlen und Aktionen kommen ausschließlich aus der Engine.
import { geld, pz, fmt, esc } from './format.js';
import { deutschlandKarte, kartenStaedte } from './deutschland.js';
import { auswahlFilterLaden, auswahlFilterSpeichern } from './speicher.js';
import * as K from './komponenten.js';

export const FORMATE = [
  ['hartwig', 'Hartwig'], ['premium', 'Hartwig Premium'], ['sport', 'Hartwig Sport'],
  ['volkskauf', 'Volkskauf'], ['fundus', 'FUNDUS']
];
const TITEL = Object.fromEntries(FORMATE);
const HOEHE = 58;
const FELDER = [
  ['umsatz', 'Umsatz'], ['ebitda', 'EBITDA/DB'], ['marge', 'Marge'],
  ['mietquote', 'Miete / Umsatz'], ['substanz', 'Substanz'],
  ['restlaufzeitMiete', 'Mietrestlaufzeit'], ['status', 'Status']
];
const START = () => ({ format: 'alle', region: 'alle', klasse: 'alle', ampel: 'alle', suche: '' });
const optionen = (werte, aktuell) => werte.map(([wert, titel]) =>
  '<option value="' + esc(wert) + '"' + (aktuell === wert ? ' selected' : '') + '>' + esc(titel) + '</option>').join('');
const statusName = { offen: 'Offen', schliessung_verhandlung: 'Verhandlung', raeumung: 'Räumung', geschlossen: 'Geschlossen', verkauft: 'Verkauft' };

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
  const ui = { aktiv: false, seite: 'karte', filter: START(), sort: 'umsatz', absteigend: true,
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
    const aktiv = Object.entries(ui.filter).filter(([k, v]) => k !== 'suche' && v !== 'alle').length + (ui.filter.suche ? 1 : 0);
    return K.bereich('betrieb', 'karte') + '<div class="hk-rumpf">' + K.seg([['karte', 'Deutschland'], ['liste', 'Häuser']], ui.seite, (v) => 'class="pp-tab" data-pp="seite" data-v="' + v + '"') +
      '<div id="pp-ampel"></div>' +
      '<details class="pp-filterbox"' + (aktiv ? ' open' : '') + '><summary>Filter' + (aktiv ? ' · ' + aktiv + ' aktiv' : '') + '</summary><div class="pp-filter">' +
      '<label>Format<select data-pp-filter="format">' + optionen([['alle', 'Alle'], ...FORMATE], ui.filter.format) + '</select></label>' +
      '<label>Region<select data-pp-filter="region">' + optionen([['alle', 'Alle'], ...['West', 'Nord', 'Süd', 'Mitte', 'Ost'].map((v) => [v, v])], ui.filter.region) + '</select></label>' +
      '<label>Hausklasse<select data-pp-filter="klasse">' + optionen([['alle', 'Alle'], ...['A', 'B', 'C', 'Premium'].map((v) => [v, v])], ui.filter.klasse) + '</select></label>' +
      '<label>Ampel<select data-pp-filter="ampel">' + optionen([['alle', 'Alle'], ['gruen', 'Grün'], ['gelb', 'Gelb'], ['rot', 'Rot'], ['ohne', 'Ohne Daten']], ui.filter.ampel) + '</select></label>' +
      '</div><label class="pp-suchlabel">Stadt oder Haus suchen' +
      '<input id="pp-suche" type="search" placeholder="Stadt, Name oder Haus-ID" value="' + esc(ui.filter.suche) + '" autocomplete="off" /></label>' +
      '<div class="pp-speichern"><button type="button" class="hk-knopf zweit" data-pp="merken">Filter speichern</button>' +
      '<select data-pp="gespeichert" aria-label="Gespeicherte Auswahl laden">' +
      optionen([['', 'Gespeicherte Auswahl …'], ...ui.gespeicherte.map((q) => [q.name, q.name])], '') +
      '</select></div></details><div id="pp-inhalt"></div></div>';
  }
  function ampelKopf(hs) {
    const n = (a) => hs.filter((h) => h.ampel === a).length;
    const el = wurzel.querySelector('#pp-ampel');
    if (el) el.innerHTML = K.gross([{ label: 'Positiv', wert: fmt.format(n('gruen')), ton: 'gut' }, { label: 'Knapp', wert: fmt.format(n('gelb')) }, { label: 'Negativ', wert: fmt.format(n('rot')), ton: n('rot') ? 'schlecht' : '' }])
      + '<p class="pp-hinweis">Häuser nach Ergebnisampel · ' + fmt.format(n('ohne')) + ' ohne Daten (geschlossen oder noch nicht simuliert)</p>';
  }
  function oeffne(seite = ui.seite) {
    ui.seite = seite;
    ui.vorschau = null;
    ctx.panel(seite === 'karte' ? 'Deutschland' : 'Häuser', 'Portfolio · alle Formate', kopf(), 'gross');
    ui.aktiv = true;
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
      ziel.innerHTML = '<div id="pp-karte" class="pp-karte"></div>' +
        '<div class="pp-legende"><span><i class="g"></i>Positiv</span><span><i class="y"></i>Knapp</span><span><i class="r"></i>Negativ</span><span><i class="o"></i>Ohne Daten</span></div>' +
        '<p class="pp-hinweis">' + fmt.format(alle.length) + ' Städte · ' + fmt.format(hs.length) + ' Häuser · ' + koord + ' Kartenpunkte. Punktgröße: Wochenumsatz. Stadt antippen öffnet sie.</p>';
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
    const anzahl = aktionsIds().length;
    ziel.innerHTML = '<div class="pp-info">' + fmt.format(hs.length) + ' von ' + fmt.format(zeilen().length) +
      ' Häusern · ' + anzahl + ' ausgewählt</div>' +
      '<div class="pp-sort"><label>Sortieren nach <select data-pp="sort">' + optionen(FELDER, ui.sort) + '</select></label>' +
      '<button type="button" class="hk-knopf zweit" data-pp="richtung">' + (ui.absteigend ? 'Absteigend ↓' : 'Aufsteigend ↑') + '</button></div>' +
      '<div class="pp-auswahl"><button type="button" class="hk-knopf zweit" data-pp="alle">Gefilterte auswählen</button>' +
      '<button type="button" class="hk-knopf zweit" data-pp="leeren">Auswahl löschen</button></div>' +
      '<div id="pp-scroll" class="pp-scroll" role="list" aria-label="Hausportfolio">' +
      '<div id="pp-spacer" style="height:' + (sortierte.length * HOEHE) + 'px;position:relative"></div></div>' +
      '<div class="pp-aktionen"><b>Sammelaktionen · ' + anzahl + ' steuerbare Häuser</b>' +
      '<div class="pp-aktionraster">' +
      '<button type="button" class="hk-knopf zweit" data-pp="schliessen"' + (!anzahl ? ' disabled' : '') + '>Schließen</button>' +
      '<button type="button" class="hk-knopf zweit" data-pp="abbau"' + (!anzahl ? ' disabled' : '') + '>Personal −5 %</button>' +
      '<button type="button" class="hk-knopf zweit" data-pp="aufbau"' + (!anzahl ? ' disabled' : '') + '>Personal +5 %</button>' +
      '<button type="button" class="hk-knopf zweit" data-pp="aushilfen"' + (!anzahl ? ' disabled' : '') + '>Aushilfen 10 %</button>' +
      '<button type="button" class="hk-knopf zweit" data-pp="miete"' + (!anzahl ? ' disabled' : '') + '>Miete −5 % verhandeln</button>' +
      '<button type="button" class="hk-knopf zweit" data-pp="marketing"' + (!anzahl ? ' disabled' : '') + '>Marketing 15 % Rabatt</button>' +
      '</div></div>' + (ui.vorschau
        ? '<div class="pp-vorschau" role="status"><b>Schließungsvorschau für ' + ui.vorschau.anzahl + ' Häuser</b>' +
          '<p>Sozialplan ca. ' + geld(ui.vorschau.sozialplan) + ', Restmiete ca. ' +
          geld(ui.vorschau.restmiete) + ', gesamt ca. <b>' + geld(ui.vorschau.gesamt) + '</b>.</p>' +
          '<p>' + esc(ui.vorschau.hinweis) + '</p>' +
          '<div class="hk-knopfreihe"><button type="button" class="hk-knopf" data-pp="schliessen-ja">Schließungen einleiten</button>' +
          '<button type="button" class="hk-knopf zweit" data-pp="schliessen-nein">Abbrechen</button></div></div>'
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
      if (eintrag.gruppe) return '<div class="pp-gruppe" style="top:' + pos + 'px;height:' + HOEHE + 'px">' +
        esc(eintrag.gruppe) + ' · ' + eintrag.anzahl + '</div>';
      const h = eintrag.haus;
      const wert = ui.sort === 'marge' || ui.sort === 'mietquote' ? pz(h[ui.sort], 1)
        : ui.sort === 'substanz' ? Math.round(h.substanz) + '/100'
        : ui.sort === 'restlaufzeitMiete' ? Math.round(h.restlaufzeitMiete) + ' Wochen'
        : ui.sort === 'status' ? statusName[h.status] ?? h.status : geld(h[ui.sort] ?? 0);
      return '<div class="pp-haus" role="listitem" data-haus="' + esc(h.id) + '" data-wert="' + esc(h[ui.sort] ?? '') + '" style="top:' + pos + 'px;height:' + HOEHE + 'px">' +
        '<input type="checkbox" data-pp-id="' + esc(h.id) + '" aria-label="' + esc(h.name) + ' auswählen"' +
        (ui.ausgewaehlt.has(h.id) ? ' checked' : '') + (!h.steuerbar ? ' disabled' : '') + ' />' +
        '<button data-pp="haus" data-id="' + esc(h.id) + '" class="pp-hausname"><b>' + esc(h.name) +
        '</b><small>' + esc(h.stadt) + ' · ' + (h.klasse || '—') + ' · ' + esc(statusName[h.status] ?? h.status) +
        (!h.steuerbar && h.status === 'offen' ? ' · nur Daten' : '') + '</small></button>' +
        '<span class="pp-zahl"><i class="ampel a-' + h.ampel + '"></i><strong>' + esc(wert) + '</strong></span></div>';
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
    const knopf = e.target.closest('[data-pp]');
    if (!knopf) return;
    const typ = knopf.dataset.pp;
    if (typ === 'seite') { oeffne(knopf.dataset.v); return; }
    if (typ === 'richtung') { ui.absteigend = !ui.absteigend; anzeigen(); return; }
    if (typ === 'alle') {
      gefiltert().filter((h) => h.steuerbar).forEach((h) => ui.ausgewaehlt.add(h.id));
      anzeigen(); return;
    }
    if (typ === 'leeren') { ui.ausgewaehlt.clear(); ui.vorschau = null; anzeigen(); return; }
    if (typ === 'haus') { ctx.sprungHaus(knopf.dataset.id); return; }
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
    if (e.target.matches('[data-pp-filter]')) {
      ui.filter[e.target.dataset.ppFilter] = e.target.value; ui.vorschau = null; anzeigen();
    } else if (e.target.matches('[data-pp-id]')) {
      if (e.target.checked) ui.ausgewaehlt.add(e.target.dataset.ppId);
      else ui.ausgewaehlt.delete(e.target.dataset.ppId);
      ui.vorschau = null; anzeigen();
    } else if (e.target.matches('[data-pp="sort"]')) { ui.sort = e.target.value; anzeigen(); }
    else if (e.target.matches('[data-pp="gespeichert"]') && e.target.value) {
      const v = ui.gespeicherte.find((x) => x.name === e.target.value);
      if (v) { ui.filter = { ...START(), ...v.filter }; oeffne(ui.seite); }
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
      domZeilen: inhalt()?.querySelectorAll('.pp-haus').length ?? 0, auswahl: aktionsIds().length,
      fehler: zeilen().filter((h) => !h.stadt || !h.id || !h.formatKey).map((h) => h.id) }),
    get filter() { return { ...ui.filter }; },
    get auswahl() { return [...ui.ausgewaehlt]; },
  };
}
