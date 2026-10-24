// O08 Umbau: Haus-Steckbrief, Projektplanung und konzernweite Modernisierung.
// E47: je Etage eine Listenzeile mit genau einer Aktion (antippen = planen); oben die Hauptfrage als Großkennzahl.
import { geld, esc, fmt } from './format.js';
import * as K from './komponenten.js';
const ETAGE = (nr) => nr === -1 ? 'UG' : nr === 0 ? 'EG' : nr + '. OG';
const ETAGE_LANG = (nr) => nr === -1 ? 'Untergeschoss' : nr === 0 ? 'Erdgeschoss' : nr + '. Obergeschoss';
const BEZEICHNUNG = { auffrischung: 'Auffrischung', ladenbau: 'Ladenbau neu', komplett: 'Komplettumbau', technik: 'Technik' };
const KURZ = { auffrischung: 'Auffrischen', ladenbau: 'Ladenbau', komplett: 'Komplett', technik: 'Technik' };
const prozent = (x, n = 1) => (Number(x) || 0).toLocaleString('de-DE', { minimumFractionDigits: n, maximumFractionDigits: n }) + ' %';
export function umbauModul(ctx) {
  const E = ctx.E, s = () => ctx.s();
  const ui = { aktiv: false, haus: null, etage: 0, stufe: 'auffrischung' };
  const zustand = () => E.umbauUebersicht(s());
  const kw = (w) => 'KW ' + ((w % 52) + 1) + '/' + (s().startJahr + Math.floor(w / 52));
  /** Etagenzeile: Substanz als Wert, Technik und Prüffristen in der Unterzeile, Antippen plant den Umbau. */
  function etagenZeile(id, e, aktuell = null) {
    const pf = e.pflichten, t = e.technik, frist = Math.min(pf.brandschutz, pf.aufzug), bald = frist - s().woche < 13;
    const status = e.gesperrt ? '<span class="hw-schlecht">behördlich gesperrt</span>' : e.projekt ? '<span class="hw-achtung">Baustelle bis ' + kw(e.projekt.ende) + '</span>'
      : bald ? '<span class="hw-achtung">Prüffrist ' + kw(frist) + '</span>' : 'Prüffrist ' + kw(frist);
    return K.zeile({ was: ETAGE_LANG(e.etage) + (aktuell === e.etage ? ' · gewählt' : ''),
      unter: 'Möbel Generation ' + e.moebelGeneration + ' · Klima ' + t.klima + ' · Licht ' + t.licht + ' · Brandschutz ' + t.brandschutz + ' von 2 · ' + status,
      wert: Math.round(e.substanz) + ' / 100', wertUnter: 'Substanz', ton: e.substanz < 35 ? 'schlecht' : e.substanz < 55 ? 'achtung' : '', tippbar: true,
      attr: 'data-umbau="planen" data-id="' + esc(id) + '" data-etage="' + e.etage + '" data-umbau-etage="' + e.etage + '" aria-label="' + esc(ETAGE_LANG(e.etage)) + ' umbauen planen"' });
  }
  // Q30: im Hausdetail beantwortet der Block „Welche Etage braucht Bau?“, Etagen von oben nach unten wie im Haus.
  function hausKarte(id) {
    if (typeof E.umbauHaus !== 'function') return '';
    const etagen = [...(E.umbauHaus(s(), id) ?? [])].sort((a, b) => b.etage - a.etage);
    const schwach = etagen.filter((e) => e.substanz < 35).length;
    return K.abschnitt('Bau und Technik', schwach ? schwach + (schwach === 1 ? ' Etage kritisch' : ' Etagen kritisch') : etagen.length + ' Etagen')
      + '<div data-umbau-karte="' + esc(id) + '">' + K.liste(etagen.map((e) => etagenZeile(id, e))) + '</div>'
      + K.knoepfe(K.knopf('Konzernprogramm Modernisierung', 'data-umbau="modernisierung"', 'text'));
  }
  function planen() {
    const h = s().haeuser.find((x) => x.id === ui.haus);
    const p = E.umbauSchaetzung(s(), ui.haus, ui.etage, ui.stufe);
    const laeuft = (s().umbau?.projekte ?? []).some((x) => x.status === 'laufend' && x.haus === ui.haus && x.etagen.includes(ui.etage));
    const rest = zustand().rest, kosten = p?.kosten ?? 0;
    let x = K.seg(Object.entries(KURZ), ui.stufe, (id) => 'data-umbau="stufewahl" data-v="' + id + '"').replace('class="hw-segment"', 'class="hw-segment eng" aria-label="Umbaustufe"');
    x += K.gross([{ label: 'Kosten', wert: geld(kosten), ton: kosten > rest ? 'schlecht' : '', unter: 'Budgetrest ' + esc(geld(rest)) },
      { label: 'Kaufquote', wert: '+' + Math.round((p?.kaufquote ?? 0) * 100) + ' %', ton: 'gut', unter: 'nach Fertigstellung' }]);
    x += K.abschnitt(BEZEICHNUNG[ui.stufe], (p?.etagen?.length ?? 1) > 1 ? (p.etagen.length + ' Etagen') : ETAGE_LANG(ui.etage));
    x += K.liste([
      K.zeile({ was: 'Fläche', wert: fmt.format(p?.qm ?? 0) + ' qm' }),
      K.zeile({ was: 'Bauzeit', wert: (p?.wochen ?? 0) + ' Wochen', wertUnter: 'Etage in der Zeit gesperrt' }),
      K.zeile({ was: 'Frequenz', wert: '+' + Math.round((p?.frequenz ?? 0) * 100) + ' %' }),
      K.zeile({ was: 'Jahrespotenzial', wert: prozent(p?.rendite ?? 0), wertUnter: 'auf die Kosten', ton: 'gut' })]);
    if (ui.stufe === 'komplett') x += K.hinweis('Ein Komplettumbau betrifft das gesamte Haus.', 'achtung');
    if (laeuft) x += K.hinweis('Auf dieser Etage läuft bereits eine Baustelle.', 'achtung');
    else if (kosten > rest) x += K.hinweis('Die Kosten übersteigen das freie Baubudget.', 'achtung');
    x += K.knoepfe(K.knopf('Umbau starten', 'data-umbau="starten"', 'breit', laeuft));
    const etagen = typeof E.umbauHaus === 'function' ? [...(E.umbauHaus(s(), ui.haus) ?? [])].sort((a, b) => b.etage - a.etage) : [];
    if (etagen.length) x += K.abschnitt('Etagen im Haus', 'antippen zum Wechseln') + K.liste(etagen.map((e) => etagenZeile(ui.haus, e, ui.etage)));
    x += K.knoepfe(K.knopf('Zum Konzernprogramm', 'data-umbau="modernisierung"', 'text'));
    ctx.panel('Umbau planen', (h?.name ?? 'Haus') + ' · ' + ETAGE(ui.etage), K.bereich('haus', 'umbau') + '<div class="hw-g5">' + K.rumpf(x) + '</div>');
  }
  function anzeigen() {
    if (ui.haus) { planen(); ui.aktiv = true; return; }
    const u = zustand();
    // Hauptfrage: Wo bringt das Baubudget am meisten?
    let x = K.gross([{ label: 'Budget frei', wert: geld(u.rest), ton: u.rest <= 0 ? 'schlecht' : '', unter: 'von ' + esc(geld(u.budget)) + '<br>verbraucht ' + esc(geld(u.verbraucht)) },
      { label: 'Baustellen', wert: String(u.laufend.length), unter: u.premiumInvestitionen + ' Premium-Investitionen' }]);
    x += K.abschnitt('Vorschläge Bau und Ladenbau', 'nach Rendite');
    x += u.programm.length ? K.liste(u.programm.slice(0, 20).map((v) => K.zeile({ was: esc(v.name) + ' · ' + ETAGE(v.etage), unter: BEZEICHNUNG[v.stufe] + ' · ' + esc(geld(v.kosten)),
      wert: prozent(v.rendite), wertUnter: 'Jahrespotenzial', ton: 'gut', tippbar: true, attr: 'data-umbau="planen" data-id="' + esc(v.haus) + '" data-etage="' + v.etage + '"' })))
      : K.leer('Bau und Ladenbau haben keine lohnenden Vorschläge.');
    x += K.abschnitt('Laufende Baustellen', String(u.laufend.length));
    x += u.laufend.length ? K.liste(u.laufend.map((p) => K.zeile({ was: esc(s().haeuser.find((h) => h.id === p.haus)?.name ?? p.haus), unter: BEZEICHNUNG[p.stufe] + ' · ' + p.etagen.map(ETAGE).join(', ') + ' · bis ' + kw(p.ende), wert: esc(geld(p.kosten)) })))
      : K.leer('Keine laufenden Umbauten.');
    ctx.panel('Modernisierung', 'Programm ' + u.jahr + ' · Bau und Ladenbau', K.bereich('haus', 'umbau') + '<div class="hw-g5">' + K.rumpf(x) + '</div>', 'gross');
    ui.aktiv = true;
  }
  function tun(a) {
    const r = E.fuehreAus(s(), a);
    ctx.meldung(r.text, r.ok);
    if (r.ok) ctx.nachAktion?.();
    anzeigen();
  }
  // Öffnen via Hauskarte und Konzernseite; alle Schaltflächen über ein Delegation-Event.
  document.getElementById('pinhalt').addEventListener('click', (ev) => {
    const el = ev.target.closest('button[data-umbau]'); if (!el || el.disabled) return;
    const art = el.dataset.umbau;
    if (art === 'modernisierung') { ui.haus = null; anzeigen(); return; }
    if (art === 'haus') { ui.haus = null; ctx.hausOeffnen(el.dataset.id); return; }
    if (art === 'planen') { ui.haus = el.dataset.id; ui.etage = Number(el.dataset.etage); ui.stufe = 'auffrischung'; anzeigen(); return; }
    if (art === 'stufewahl') { ui.stufe = el.dataset.v; anzeigen(); return; }
    if (art === 'starten') { tun({ typ: 'umbauPlanen', haus: ui.haus, etage: ui.etage, stufe: ui.stufe }); return; }
  });
  return { oeffne: (haus = null, etage = 0) => { ui.haus = haus; ui.etage = etage; anzeigen(); }, hausKarte, zu: () => { ui.aktiv = false; }, aktiv: () => ui.aktiv, neuZeichnen: () => { if (ui.aktiv) anzeigen(); } };
}
