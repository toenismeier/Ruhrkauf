// Produktentwicklung für Eigenmarken (VORSTAND-MARKETING-VERTRAG.md, Abschnitt 5), E47 im Gestaltungssystem (UI-NEU.md):
// Coffee 26 und 07 (Produktkarten-Karussell mit Bild über der Karte, Sterne, Schalter „Im Sortiment“, Verkäufe Vorwoche,
// Margenring, Preis-Stepper, Seitenpunkte) und Coffee 01 bis 08 (Assistent „Neues Produkt“: Segment, Zielgruppen,
// Kategorien mit Kachelraster, dann Preislage, Dauer, Budget, Vorschau). Trendbericht der Messe.
// Daten: produkte, produktKatalog, trendbericht, produktVorschau; Aktionen produktEntwickeln, produktPreis,
// produktAuslisten, produktSortiment. Prüfung wie im Vorstand (data-p gegen frische Abfrage).
import { geld, fmt, pz, dez, kwVon, esc } from './format.js';
import * as K from './komponenten.js';
import { werteSammler, vergleiche, wocheText, portraet } from './vorstand.js';
import * as PB from '../kit/produktbild.js';
import { passendeTypen, zielgruppenFuerFach, fachSegmente, zielChips, sortimentBedienung, gruppeTrend, teamAufschluesselung, chips, farbpunkt } from './produkte-q24.js';

const PREISLAGE = { einstieg: 'Einstieg', mitte: 'Mitte', gehoben: 'Gehoben' };
const STATUS = { entwicklung: 'in Entwicklung', sortiment: 'im Sortiment', pausiert: 'pausiert', ausgelistet: 'ausgelistet' };
const ZIEL_TEXT = { kinder: 'Kinderbekleidung', teens: 'Junge Mode', young: 'Trendorientiert', adults: 'Beruf und Alltag', bestager: 'Klassik und Komfort' };
const euro = (x) => `${dez(x, 2)} €`;
// Q27: Bild je Artikeltyp aus dem Katalog (Silhouette + Parameter, engine/src/sortiment); ohne Eintrag leitet die Grafik es aus dem Namen ab
const BILD = new Map();
const merkeBilder = (Kat) => { for (const t of Kat.typen ?? []) if (t.bild) BILD.set(t.typ, t.bild); return Kat; };
const bildOpt = (typ, b) => { const x = b ?? BILD.get(typ); return x ? { bild: x } : {}; };
// Q37: muster = Grafikschlüssel aus dem Engine-Katalog (uni, karo, leo …); ohne Angabe zeigt das Bild die Silhouette wie bisher
const mitMuster = (o, muster) => (muster ? { ...o, muster } : o);
const bild = (typ, farbe, material, g = 150, b, muster) => (typeof PB.produktbildSVG === 'function' ? PB.produktbildSVG(typ, farbe, material, g, mitMuster(bildOpt(typ, b), muster)) : `<svg viewBox="0 0 100 100" width="${g}" height="${g}"><rect x="22" y="22" width="56" height="56" rx="10" fill="#4a5a62"/></svg>`);
// Q25: Model-Ansicht (Antippen des Bildes wechselt Produkt und Model)
const ZG_MODEL = { kinder: 'kinder', jung: 'young', mitte: 'adults', reif: 'bestager' };
const geschlechtVon = (wg) => (/^herren|kinder\.jungen/.test(String(wg ?? '')) ? 'herren' : 'damen');
const modelBild = (typ, farbe, material, wg, trendGruppe, g = 150, b, muster) => (typeof PB.modelbildSVG === 'function' ? PB.modelbildSVG(typ, farbe, material, mitMuster({ geschlecht: geschlechtVon(wg), zielgruppe: ZG_MODEL[trendGruppe] ?? 'young', groesse: g, hintergrund: null, ...bildOpt(typ, b) }, muster)) : null);
/** Q37: Grafikschlüssel eines Musters aus dem Katalog. */
const musterBild = (Kat, name) => (Kat.muster ?? []).find((m) => m.name === name)?.bild;
// Kachelbild ohne eigene Kachelfläche (die Kachel ist die Karte), Standardfarbe und Material des Typs.
const kachel = (typ, g = 64) => bild(typ, PB.STANDARD_FARBE?.[typ], PB.STANDARD_MATERIAL?.[typ], g);
let sternNr = 0;
/** Fünf Sterne mit halben Schritten (Coffee 26: gelb, leer dunkelgrau). */
function sterne(x, label) {
  let h = `<div class="hw-sterne" role="img" aria-label="${esc(label)}">`;
  for (let i = 0; i < 5; i++) {
    const f = Math.max(0, Math.min(1, x - i)), id = `g1st${sternNr++}`;
    h += `<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="${id}"><stop offset="${f}" stop-color="var(--stern)"/><stop offset="${f}" stop-color="#4a4644"/></linearGradient></defs><path fill="url(#${id})" d="M12 1.5l3.2 6.8 7.3.9-5.4 5 1.4 7.3L12 17.9l-6.5 3.6 1.4-7.3-5.4-5 7.3-.9z"/></svg>`;
  }
  return h + '</div>';
}
/** Margenring (Coffee 26): Marge hell, Einstand dunkel, Wert in der Mitte. */
function ring(marge, wertHtml) {
  const r = 33.5, u = 2 * Math.PI * r, ek = Math.max(0, Math.min(1, 1 - marge));
  return `<div class="hw-ring"><svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="${r}" fill="none" stroke="var(--ring-a)" stroke-width="13"/><circle cx="40" cy="40" r="${r}" fill="none" stroke="var(--ring-b)" stroke-width="13" stroke-dasharray="${(u * ek).toFixed(1)} ${u.toFixed(1)}" transform="rotate(-90 40 40)"/></svg><span>Marge${wertHtml}</span></div>`;
}
const preisSchritt = (p) => (p < 20 ? 1 : p < 100 ? 5 : 10);
const PAPIERKORB = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6"/></svg>';

/** Absatz Eigenmarke und Fremdmarken (Coffee 08): zwei Kennzahlen in Serienfarbe, darunter fünf Wochen als Linien. */
function absatzGrafik(A, P, name) {
  let h = K.abschnitt('Absatz', '5 Wochen · ' + name);
  h += `<div class="hw-g1-serien"><div><span class="hw-marke">Eigenmarke</span>${P('a:eigen', geld(A.letzteEigen), 'b', ' class="hw-g1-serie-a"')}<small>Umsatz letzte Woche</small></div><div><span class="hw-marke">Fremdmarken</span>${P('a:fremd', geld(A.letzteFremd), 'b', ' class="hw-g1-serie-b"')}<small>gleiche Warengruppen</small></div></div>`;
  const leer = !A.eigen.some((v) => v > 0) && !A.fremd.some((v) => v > 0);
  if (A.warengruppen && !leer) {
    const hoch = Math.max(1, ...A.eigen, ...A.fremd), x = (i) => 18 + i * 76, y = (w) => 92 - 76 * w / hoch;
    const linie = (werte, k) => `<polyline class="${k}" points="${werte.map((w, i) => `${x(i)},${y(w).toFixed(1)}`).join(' ')}"/>` + werte.map((w, i) => `<circle class="${k}" cx="${x(i)}" cy="${y(w).toFixed(1)}" r="${i === werte.length - 1 ? 6.5 : 4.5}"/>`).join('');
    h += `<svg class="hw-g1-linien" viewBox="0 0 340 104" role="img" aria-label="Eigenmarke und Fremdmarken: fünf Wochen im Vergleich">${linie(A.fremd, 'b')}${linie(A.eigen, 'a')}</svg>`;
    h += `<div class="hw-balkenfuss hw-g1-wochen">${A.wochen.map((w) => `<span>KW ${kwVon(w)}</span>`).join('')}</div>`;
  } else h += K.leer('Noch keine Verkaufsdaten erfasst.');
  if (A.vorlaufWochen) h += `<p class="hw-lese hw-g1-notiz">${A.vorlaufWochen === 1 ? 'Eine Woche' : A.vorlaufWochen + ' Wochen'} vor Spielstart aus dem Vorlauf.</p>`;
  return h;
}

/** Linienprofil der Marke als Fähigkeitsskalen (Coffee 28). */
function linienProfil(m, P) {
  if (!m) return '';
  const achsen = [['Qualität', 'qualitaet'], ['Modegrad', 'modegrad'], ['Preislage', 'preislage'], ['Nachhaltigkeit', 'nachhaltigkeit']];
  return K.abschnitt('Linienprofil', m.stil)
    + `<div class="hw-g1-skalen">${achsen.map(([titel, feld]) => K.skala(titel, m[feld]).replace(/<b>\d+<\/b>/, P('lp:' + feld, String(m[feld])))).join('')}</div>`
    + K.liste([K.zeile({ was: 'Ø Verkaufspreis im Sortiment', wert: P('lp:preispunkt', euro(m.preispunkt), 'span') })])
    + `<p class="hw-lese hw-g1-notiz">Nachhaltigkeit ist ein Orientierungswert aus Beschaffung und Materialmix, keine Ökobilanz.</p>`
    + K.knoepfe(K.knopf('Linien verwalten', 'data-a="linienVerwalten"', 'zweit'));
}

export function produkteModul(ctx) {
  const E = ctx.E, s = () => ctx.s();
  const da = typeof E.produkte === 'function';
  const ui = { aktiv: false, seite: 'liste', marke: null, kategorie: null, k: 0, auslisten: null, neu: null, neuSchritt: 0, baumOffen: null, astOffen: null, model: new Set(), haus: null, fach: null, zielgruppe: null, detail: null };

  // Sprecher: der Einkaufsvorstand (CPO) sagt den Befund; ohne Besetzung ohne Figur.
  function sprecher(text, ton = '') {
    const cpo = typeof E.vorstandProfil === 'function' ? E.vorstandProfil(s(), 'cpo') : null;
    const p = cpo?.person;
    return K.sprecher({ text, unter: p ? `${p.name} · Einkaufsvorstand` : 'Produktentwicklung', person: p ? portraet(p.portraet, 72) : '', ton });
  }
  function markenwahl(L) {
    return chips(L.marken.map((m) => [m.marke, `${farbpunkt(m.farbe)}${esc(m.name)}`]), ui.marke, (w) => `data-a="marke" data-v="${esc(w)}"`, 'Eigenmarke', false, true);
  }
  function aktuelleMarke(L) {
    if (!L.marken.length) return null;
    if (!L.marken.some((m) => m.marke === ui.marke)) ui.marke = L.marken[0].marke;
    const m = L.marken.find((x) => x.marke === ui.marke);
    if (!ui.fach || !ui.zielgruppe) vorauswahl(m);
    return m;
  }

  function vorauswahl(M) {
    ui.fach = M.produkte.length > 0 && M.produkte.every((p) => p.kategorie === 'home') ? 'home'
      : M.trendGruppe === 'kinder' ? 'kinder' : /Herren/i.test(M.zielgruppe) ? 'herren' : 'damen';
    ui.zielgruppe = M.trendGruppe === 'kinder' ? 'kinder' : M.trendGruppe === 'reif' ? 'bestager' : M.trendGruppe === 'jung' ? 'young' : 'adults';
    ui.baumOffen = M.schwerpunkt === 'anlass' ? 'anlass' : null; ui.astOffen = null;
  }

  // ─────────────────────────── Produktkarte (Coffee 26)
  function produktKarte(st, M, p, index, P, offeneHaeuser) {
    const ent = p.status === 'entwicklung';
    const mb = ui.model.has(p.id) ? modelBild(p.typ, p.farbe, p.material, p.wg, M.trendGruppe, 120, p.bild, p.musterBild) : null;
    let c = `<button type="button" class="hw-g1-bild" data-a="bildwechsel" data-v="${esc(p.id)}" aria-label="${ui.model.has(p.id) ? 'Produkt zeigen' : 'Am Model zeigen'}">${mb ?? bild(p.typ, p.farbe, p.material, 110, p.bild, p.musterBild)}</button>`;
    if (!ent) c += `<button type="button" class="hw-g1-papierkorb" data-a="auslisten" data-v="${esc(p.id)}" aria-label="Produkt auslisten">${PAPIERKORB}</button>`;
    c += `<div class="hw-karte-titel hw-g1-titel">${P(`p:${p.id}:name`, p.name, 'span')}</div>`;
    c += `<div class="hw-g1-unter">${esc(p.typ)}${p.muster && p.muster !== 'Uni' ? ' · ' + esc(p.muster) : ''} · ${esc(p.zielgruppeName ?? 'Markenzielgruppe')} · ${esc(PREISLAGE[p.preislage] ?? p.preislage)}${p.anlassName ? ' · ' + esc(p.anlassName) : ''}</div>`;
    if (ent) {
      c += sterne(0, 'noch keine Bewertung');
      c += `<div class="hw-g1-entwicklung"><span class="hw-marke">In Entwicklung</span><div class="hw-g1-fortschritt" role="progressbar" aria-valuenow="${Math.round(p.fortschritt * 100)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${(p.fortschritt * 100).toFixed(0)}%"></i></div>`
        + `<div class="hw-g1-zeile2"><span>${P(`p:${p.id}:fortschritt`, pz(p.fortschritt), 'span')}</span><span>${P(`p:${p.id}:fertig`, `fertig ${wocheText(st, p.fertigWoche)}`, 'span')}</span></div>`
        + `<p class="hw-lese">${geld(p.budgetWoche)} je Woche über ${p.dauer} Wochen</p></div>`;
      return c;
    }
    c += `<div class="hw-g1-sternzeile">${sterne(p.sterne, `${dez(p.sterne, 1)} von 5 Sternen`)}${P(`p:${p.id}:sterne`, dez(p.sterne, 1), 'span', ' class="hw-g1-sternzahl"')}</div>`;
    const ver = `${p.veraenderung >= 0 ? '+' : '−'}${fmt.format(Math.abs(p.veraenderung))} (${p.veraenderungProzent >= 0 ? '+' : '−'}${pz(Math.abs(p.veraenderungProzent), 1)})`;
    c += `<div class="hw-g1-mitte"><div class="hw-g1-schalter">${K.schalter({ text: 'Im Sortiment', an: p.status === 'sortiment', attr: `data-a="sortiment" data-v="${esc(p.id)}"` })}</div>`
      + `<div class="hw-g1-verkauf"><span class="hw-marke">Stück Vorwoche</span>${P(`p:${p.id}:verkauf`, fmt.format(p.verkaufLetzteWoche), 'b', ' class="hw-zahl"')}${P(`p:${p.id}:veraenderung`, ver, 'span', ` class="hw-abw${p.veraenderung < 0 ? ' hw-schlecht' : p.veraenderung > 0 ? ' hw-gut' : ''}"`)}</div></div>`;
    c += `<div class="hw-g1-preisblock"><div class="hw-g1-ringspalte"><span class="hw-g1-ek">EK ${P(`p:${p.id}:ek`, euro(p.ekStueck), 'span')}</span>${ring(p.marge, P(`p:${p.id}:marge`, pz(p.marge), 'b'))}</div>`
      + `<div class="hw-g1-preis"><span class="hw-marke">Preis</span>${K.stepper({ wert: euro(p.preis), label: 'Verkaufspreis', attrMinus: `data-a="preis" data-v="-1" data-p2="${esc(p.id)}"`, attrPlus: `data-a="preis" data-v="1" data-p2="${esc(p.id)}"`, gross: false }).replace('<output>', `<output data-p="p:${esc(p.id)}:preis">`)}<span class="hw-abw">Normpreis ${euro(p.normpreis)}</span></div></div>`;
    P(`p:${p.id}:preis`, euro(p.preis));
    if (ui.auslisten === p.id) c += `<div class="hw-g1-frage"><p class="hw-lese">${esc(p.name)} wirklich auslisten?</p>${K.knoepfe(K.knopf('Auslisten', `data-a="auslistenJa" data-v="${esc(p.id)}" data-gefahr`, 'gefahr'), K.knopf('Behalten', 'data-a="auslistenNein"', 'zweit'))}</div>`;
    return c;
  }

  // ─────────────────────────── Produktliste
  function liste(P) {
    const st = s(), L = E.produkte(st), M = aktuelleMarke(L);
    if (!M) return { titel: 'Produktentwicklung', unter: 'keine Eigenmarke', html: sprecher('Ohne Eigenmarke können wir keine Produkte entwickeln.') + K.rumpf(K.leer('Produkte entstehen immer unter einer Eigenmarke. Gründe zuerst eine Marke.', 'Keine Eigenmarke vorhanden') + K.knoepfe(K.knopf('Eigenmarke gründen', 'data-a="eigenmarkeGruenden"', 'breit'))) };
    const kats = M.kategorien.filter((k) => k.kapazitaet > 0 || k.belegt > 0);
    if (!kats.some((k) => k.id === ui.kategorie)) ui.kategorie = (kats.find((k) => M.produkte.some((p) => p.kategorie === k.id && p.status !== 'ausgelistet')) ?? kats[0])?.id ?? null;
    const offeneHaeuser = st.haeuser.filter((haus) => haus.status === 'offen');
    if (!offeneHaeuser.some((haus) => haus.id === ui.haus)) ui.haus = offeneHaeuser[0]?.id ?? null;
    const prod = M.produkte.filter((p) => p.kategorie === ui.kategorie && p.status !== 'ausgelistet');
    ui.k = Math.min(ui.k, Math.max(0, prod.length - 1));
    const k = M.kategorien.find((x) => x.id === ui.kategorie);
    const voll = k && k.belegt >= k.kapazitaet;
    let h = sprecher(esc(M.hinweis ?? `${M.name} führt ${prod.length} Produkte in ${k?.name ?? 'dieser Kategorie'}.`), voll && !M.inEntwicklung ? 'engpass' : '');
    h += `<div class="hw-g1-wahlen">${markenwahl(L)}${chips(kats.map((x) => [x.id, `${esc(x.name)} <small>${P(`l:kat:${x.id}`, `${x.belegt} / ${x.kapazitaet}`, 'span')}</small>`]), ui.kategorie, (w) => `data-a="kategorie" data-v="${esc(w)}"`, 'Kategorie', false, true)}</div>`;
    if (!prod.length) h += K.rumpf(K.leer('Starte ein neues Produkt in dieser Kategorie.', 'Noch kein Produkt'));
    else {
      const karten = prod.map((p, index) => produktKarte(st, M, p, index, P, offeneHaeuser));
      h += `<div class="hw-g1-karussell" data-k="produkte">${K.karussell(karten, { aktiv: ui.k, label: 'Produkte' })}</div>`;
    }
    // Preis je Haus (Coffee 07: „Force the prices to all stores“), gilt für das Produkt der aktiven Karte.
    const pk = prod[ui.k];
    let x = '';
    if (pk && pk.status !== 'entwicklung') {
      x += K.schalter({ text: 'Preis in allen Häusern gleich', unter: pk.preisAlleHaeuser ? 'Einheitspreis für ' + pk.name : 'Abweichende Hauspreise erlaubt', an: pk.preisAlleHaeuser, attr: `data-a="einheitspreis" data-v="${esc(pk.id)}"` });
      if (!pk.preisAlleHaeuser && ui.haus) {
        const haus = offeneHaeuser.find((y) => y.id === ui.haus), hp = pk.hauspreise[ui.haus] ?? pk.preis;
        x += `<label class="hw-marke hw-feldname" for="hauspreis-${esc(pk.id)}">Haus</label><select class="hw-g1-wahl" id="hauspreis-${esc(pk.id)}" data-a="hausWahl">${offeneHaeuser.map((y) => `<option value="${esc(y.id)}"${y.id === ui.haus ? ' selected' : ''}>${esc(y.stadt)} · ${esc(y.name)}</option>`).join('')}</select>`;
        x += K.feld(`Hauspreis ${haus?.stadt ?? ''}`, K.stepper({ wert: euro(hp), unter: `Einheitspreis ${euro(pk.preis)}`, label: 'Hauspreis', attrMinus: `data-a="hauspreis" data-v="-1" data-p2="${esc(pk.id)}"`, attrPlus: `data-a="hauspreis" data-v="1" data-p2="${esc(pk.id)}"` }).replace('<output>', `<output data-p="p:${esc(pk.id)}:hauspreis:${esc(ui.haus)}">`));
        P(`p:${pk.id}:hauspreis:${ui.haus}`, euro(hp) + `Einheitspreis ${euro(pk.preis)}`);
      }
    }
    x += K.knoepfe(K.knopf('Neues Produkt', 'data-a="neu"', 'breit'));
    if (voll && !M.hinweis) x += K.hinweis(`Kapazität in ${esc(k.name)} erreicht: für ein neues Produkt erst eines auslisten.`, 'achtung');
    x += K.knoepfe(K.knopf('Trendbericht', 'data-a="trend"', 'zweit'), K.knopf('Sortiment durchsuchen', 'data-a="katalog"', 'zweit'));
    x += absatzGrafik(E.produktAbsatzVerlauf(st, M.marke, ui.kategorie), P, kats.find((y) => y.id === ui.kategorie)?.name ?? M.name);
    x += linienProfil(E.produktLinienprofil(st, M.marke), P);
    x += teamAufschluesselung(M.leistung);
    x += K.abschnitt('Produktentwicklung im HQ');
    x += K.liste([K.zeile({ was: 'HQ-Team (Basis)', wert: P('l:team', `${Math.round(L.team * 100)} / 100`, 'span') }), K.zeile({ was: 'Kosten je Woche', wert: P('l:kosten', geld(L.kostenWoche), 'span') })]);
    x += K.knoepfe(K.knopf('Neue Eigenmarke gründen', 'data-a="eigenmarkeGruenden"', 'zweit'));
    h += K.rumpf(x);
    return { titel: 'Produktentwicklung', unter: `${M.name} · ${M.zielgruppe} · KW ${kwVon(st.woche)}`, html: h };
  }

  // Q24: Alle Typen stammen ausschließlich aus produktKatalog (auch spätere Q27-Q29-Typen).
  function katalog() {
    const Kat = merkeBilder(E.produktKatalog(s())), L = E.produkte(s()), M = aktuelleMarke(L);
    if (!M) return { titel: 'Sortiment', unter: '', html: K.rumpf(K.leer('Noch keine Marke vorhanden.')) };
    if (zielgruppenFuerFach(Kat, ui.fach).every((x) => x.id !== ui.zielgruppe)) ui.zielgruppe = zielgruppenFuerFach(Kat, ui.fach)[0]?.id ?? ui.zielgruppe;
    const typen = passendeTypen(Kat, ui.fach, ui.zielgruppe);
    let h = sprecher(`${typen.length} Artikeltypen passen zu dieser Auswahl.`);
    h += `<div class="hw-g1-oben">${K.knopf('‹ Produktentwicklung', 'data-a="liste"', 'text')}</div>`;
    h += `<div class="hw-g1-wahlen">${markenwahl(L)}</div>` + fachSegmente(ui) + K.rumpf(zielChips(Kat, ui) + sortimentBedienung(Kat, ui, typen, kachel, 'detailTyp'));
    return { titel: 'Sortiment', unter: `${M.name} · ${typen.length} passende Typen`, html: h };
  }

  function detail() {
    const st = s(), Kat = merkeBilder(E.produktKatalog(st)), L = E.produkte(st), M = aktuelleMarke(L), d = ui.detail;
    const p = d?.produktId ? M?.produkte.find((x) => x.id === d.produktId) : null;
    const t = Kat.typen.find((x) => x.typ === (p?.typ ?? d?.typ));
    if (!t) { ui.seite = 'katalog'; return katalog(); }
    const typ = p?.typ ?? t.typ;
    const material = p?.material ?? t.materialien[0];
    const farbe = p?.farbe ?? (Kat.farben.find((x) => x.name === 'marine')?.name ?? Kat.farben[0]?.name ?? 'marine');
    const markenGruppe = M?.trendGruppe === 'kinder' ? 'kinder' : M?.trendGruppe === 'reif' ? 'bestager' : M?.trendGruppe === 'jung' ? 'young' : 'adults';
    const gruppe = p ? (p.zielgruppe ?? markenGruppe) : ui.zielgruppe;
    const wg = p?.wg ?? t.wgs.find((x) => x.startsWith(ui.fach === 'home' ? 'wohnen.' : ui.fach + '.')) ?? t.wgs[0];
    const model = modelBild(typ, farbe, material, wg, gruppeTrend(gruppe), 200, undefined, p?.musterBild);
    const name = Kat.zielgruppen.find((x) => x.id === gruppe)?.name ?? gruppe;
    const preis = p?.preis ?? t.preisMitte;
    const zurueck = d?.quelle === 'liste' ? 'liste' : 'katalog';
    const freigegeben = !p && M && M.kategorien.some((x) => x.id === t.kategorie && x.kapazitaet > 0)
      && (Array.isArray(M.entwickelbar) ? M.entwickelbar.includes(t.typ) : Number(t.gruppe?.[M.trendGruppe] ?? 0) > 0.15);
    let h = sprecher(p ? `${esc(p.name)} ist ${esc(STATUS[p.status] ?? p.status)}.` : freigegeben ? `${esc(typ)} passt zu ${esc(M.name)}.` : `${esc(typ)} passt derzeit nicht zu ${esc(M?.name ?? 'dieser Marke')}.`);
    h += `<div class="hw-g1-oben">${K.knopf('‹ Zurück', `data-a="detailZurueck" data-v="${zurueck}"`, 'text')}</div>`;
    let x = `<div class="hw-g1-detailbild" aria-hidden="true">${model ?? bild(typ, farbe, material, 200, undefined, p?.musterBild)}</div>`;
    x += K.abschnitt(p?.name ?? typ);
    x += K.liste([K.zeile({ was: 'Artikeltyp', wert: esc(typ) }), K.zeile({ was: 'Material', wert: esc(material) }), K.zeile({ was: 'Farbe', wert: esc(farbe) }),
      K.zeile({ was: p ? 'Verkaufspreis' : 'Basispreis, ca.', wert: euro(preis) }), K.zeile({ was: 'Zielgruppe', wert: esc(name) }),
      // Q37: Muster und Anlass
      p ? K.zeile({ was: 'Muster', wert: esc(p.muster ?? 'Uni') }) : K.zeile({ was: 'Muster', wert: `${(t.muster ?? ['Uni']).length} möglich`, unter: (t.muster ?? []).filter((m) => m !== 'Uni').slice(0, 6).join(', ') }),
      ...(p?.anlassName ? [K.zeile({ was: 'Anlass', wert: esc(p.anlassName) })] : !p && t.anlass?.length ? [K.zeile({ was: 'Anlass', wert: t.anlass.map((a) => esc(Kat.anlaesse?.find((x) => x.id === a)?.name ?? a)).join(', ') })] : []),
      ...(p ? [K.zeile({ was: 'Status', wert: esc(STATUS[p.status] ?? p.status) }), K.zeile({ was: 'Kategorie', wert: esc(p.kategorieName) })] : [])]);
    if (!p) x += freigegeben ? K.knoepfe(K.knopf(`Für ${M.name} entwickeln`, 'data-a="detailPlanen"', 'breit')) : K.hinweis('Dieser Artikeltyp passt derzeit nicht zum Sortiment der gewählten Marke.', 'achtung');
    return { titel: 'Produktdetails', unter: `${M?.name ?? ''} · ${typ}`, html: h + K.rumpf(x) };
  }

  /** Schrittanzeige des Assistenten: drei nummerierte Schritte mit Namen, der aktive als Akzent. */
  function schritte() {
    const n = ['Artikel', 'Zielgruppe', 'Entwicklung'];
    return `<ol class="hw-g1-schritte">${n.map((t, i) => `<li${i === ui.neuSchritt ? ' aria-current="step"' : ''} class="${i < ui.neuSchritt ? 'fertig' : i === ui.neuSchritt ? 'an' : ''}"><i>${i + 1}</i>${t}</li>`).join('')}</ol>`;
  }

  // ─────────────────────────── Neues Produkt (Coffee 01 bis 08)
  function neu(P) {
    const st = s(), Kat = merkeBilder(E.produktKatalog(st)), L = E.produkte(st), M = aktuelleMarke(L), e = ui.neu;
    const markeKats = new Set(M.kategorien.filter((k) => k.kapazitaet > 0).map((k) => k.id));
    const voll = new Set(M.kategorien.filter((k) => k.belegt >= k.kapazitaet).map((k) => k.id));
    const entwickelbar = Array.isArray(M.entwickelbar) ? new Set(M.entwickelbar) : null;
    if (zielgruppenFuerFach(Kat, ui.fach).every((x) => x.id !== ui.zielgruppe)) { ui.zielgruppe = zielgruppenFuerFach(Kat, ui.fach)[0]?.id ?? ui.zielgruppe; e.zielgruppe = ui.zielgruppe; }
    const typen = passendeTypen(Kat, ui.fach, ui.zielgruppe).filter((t) => markeKats.has(t.kategorie) && (entwickelbar ? entwickelbar.has(t.typ) : true)).sort((a, b) => Number(voll.has(a.kategorie)) - Number(voll.has(b.kategorie)));
    if (!typen.some((t) => t.typ === e.typ)) { e.typ = (typen.find((t) => !voll.has(t.kategorie)) ?? typen[0])?.typ; }
    const T = Kat.typen.find((t) => t.typ === e.typ);
    if (T && !T.materialien.includes(e.material)) e.material = T.materialien[0];
    // Q37: Muster und Anlass nur, wenn der Typ sie anbietet
    if (T && !(T.muster ?? ['Uni']).includes(e.muster)) e.muster = 'Uni';
    if (T && e.anlass && !(T.anlass ?? []).includes(e.anlass)) e.anlass = null;
    const mb = musterBild(Kat, e.muster);
    if (!typen.length && ui.neuSchritt !== 0) ui.neuSchritt = 0;
    const pfad = (Kat.baum ?? []).flatMap((k) => k.unterkategorien.map((a) => ({ k, a }))).find((x) => x.a.typen.includes(e.typ));
    const oben = (aktion, text) => `<div class="hw-g1-oben">${K.knopf(text, `data-a="${aktion}"`, 'text')}</div>`;

    if (ui.neuSchritt === 0) {
      let h = sprecher(typen.length ? `Wähle den Artikel: ${typen.length} Typen passen zu ${esc(M.name)}.` : `Für ${esc(M.name)} passt hier kein Artikeltyp.`);
      h += oben('liste', `‹ ${M.name}`) + `<div class="hw-rumpf">${schritte()}</div>`;
      h += `<div class="hw-g1-wahlen">${markenwahl(L)}</div>` + fachSegmente(ui) + K.rumpf(zielChips(Kat, ui) + sortimentBedienung(Kat, ui, typen, kachel, 'typ', voll));
      return { titel: 'Neues Produkt', unter: `${M.name} · Artikel wählen`, html: h };
    }
    if (ui.neuSchritt === 1) {
      let h = sprecher(`${esc(e.typ)} gewählt. Für wen entwickeln wir?`);
      h += oben('neuZurTyp', '‹ Artikel ändern') + `<div class="hw-rumpf">${schritte()}</div>`;
      let x = `<div class="hw-g1-gewaehlt"><span class="hw-g1-gewaehltbild" aria-hidden="true">${bild(e.typ, e.farbe, e.material, 72, undefined, mb)}</span><span><b>${esc(e.typ)}</b><small>${esc(pfad?.k.name ?? '')}${pfad?.a.name && pfad.a.name !== pfad.k.name ? ' · ' + esc(pfad.a.name) : ''}</small></span></div>`;
      x += K.abschnitt('Zielgruppe');
      x += `<p class="hw-lese hw-g1-notiz">Die Altersgruppe wirkt auf Preislage, Passform, regionale Nachfrage und Marge. Bisherige Produkte bleiben unverändert.</p>`;
      x += `<div class="hw-g1-typen">${Kat.zielgruppen.map((z) => `<button type="button" class="hw-g1-typ hw-kontur" aria-pressed="${e.zielgruppe === z.id}" data-a="zielgruppe" data-v="${esc(z.id)}"><b>${esc(z.name)}</b><small>${esc(ZIEL_TEXT[z.id] ?? '')}</small></button>`).join('')}</div>`;
      return { titel: 'Neues Produkt', unter: `${M.name} · Zielgruppe`, html: h + K.rumpf(x) };
    }
    const v = E.produktVorschau(st, { marke: M.marke, typ: e.typ, zielgruppe: e.zielgruppe, farbe: e.farbe, material: e.material, preislage: e.preislage, qualitaet: e.qualitaet, dauer: e.dauer, budgetWoche: e.budgetWoche, ...(e.muster && e.muster !== 'Uni' ? { muster: e.muster } : {}), ...(e.anlass ? { anlass: e.anlass } : {}) });
    const zg = Kat.zielgruppen.find((z) => z.id === e.zielgruppe)?.name ?? '';
    let h = sprecher(v.ok ? `Erwartet ${dez(v.sterneVon, 1)} bis ${dez(v.sterneBis, 1)} Sterne, fertig ${esc(wocheText(st, v.fertigWoche))}.` : esc(v.fehler ?? 'Der Entwurf ist noch nicht vollständig.'), v.ok ? '' : 'engpass');
    h += oben('neuZurZiel', '‹ Zielgruppe ändern') + `<div class="hw-rumpf">${schritte()}</div>`;
    let x = `<div class="hw-g1-gewaehlt"><span class="hw-g1-gewaehltbild" aria-hidden="true">${bild(e.typ, e.farbe, e.material, 72, undefined, mb)}</span><span><b>${esc(e.typ)}</b><small>${esc(zg)} · ${esc(pfad?.k.name ?? '')}</small></span></div>`;
    if (v.kapazitaetFrei <= 0) x += K.hinweis(`Kapazität erreicht: in dieser Kategorie ist bei ${esc(M.name)} kein Platz mehr. Für Neues erst ein Produkt auslisten.`, 'achtung');
    x += K.abschnitt('Farbe', e.farbe);
    x += `<div class="hw-g1-farben" role="group" aria-label="Farbe">${Kat.farben.map((f) => `<button type="button" class="hw-g1-farbknopf" aria-pressed="${f.name === e.farbe}" data-a="farbe" data-v="${esc(f.name)}" aria-label="${esc(f.name)}">${farbpunkt(f.hex, 30)}</button>`).join('')}</div>`;
    // Q37: Muster (Kachel mit dem Artikel in Farbe und Muster); gesperrte Muster sichtbar, aber nicht wählbar
    const angebot = (Kat.muster ?? []).filter((m) => (T?.muster ?? ['Uni']).includes(m.name));
    if (angebot.length > 1) {
      x += K.abschnitt('Muster', e.muster);
      x += `<div class="hw-g1-muster" role="group" aria-label="Muster">${angebot.map((m) => `<button type="button" class="hw-g1-musterknopf hw-kontur" aria-pressed="${m.name === e.muster}" data-a="muster" data-v="${esc(m.name)}"${m.gesperrt ? ' disabled' : ''} aria-label="${esc(m.name)}${m.gesperrt ? ', gesperrt' : ''}"><span aria-hidden="true">${bild(e.typ, e.farbe, e.material, 44, undefined, m.bild)}</span><small>${esc(m.name)}</small></button>`).join('')}</div>`;
      const gesperrt = angebot.find((m) => m.gesperrt);
      if (gesperrt) x += `<p class="hw-lese hw-g1-notiz">${esc(gesperrt.name)}: ${esc(gesperrt.gesperrt)}</p>`;
    }
    x += K.abschnitt('Material');
    x += chips((T?.materialien ?? []).map((m) => [m, esc(m)]), e.material, (w) => `data-a="material" data-v="${esc(w)}"`, 'Material');
    // Q37: Anlass (Saisonspitzen); vorbelegt, wenn der Artikel im Ast „Anlass“ gewählt wurde
    if (T?.anlass?.length) {
      const an = Kat.anlaesse ?? [];
      x += K.abschnitt('Anlass', e.anlass ? an.find((a) => a.id === e.anlass)?.saison ?? '' : 'ganzjährig');
      x += chips([['', 'Kein Anlass'], ...T.anlass.map((a) => [a, esc(an.find((y) => y.id === a)?.name ?? a)])], e.anlass ?? '', (w) => `data-a="anlass" data-v="${esc(w)}"`, 'Anlass');
    }
    x += K.abschnitt('Preislage');
    x += `<div class="hw-g1-typen drei">${Kat.preislagen.map((p) => `<button type="button" class="hw-g1-typ hw-kontur" aria-pressed="${e.preislage === p.id}" data-a="preislage" data-v="${esc(p.id)}"><b>${esc(PREISLAGE[p.id] ?? p.id)}</b><small>${'€'.repeat(p.id === 'einstieg' ? 1 : p.id === 'mitte' ? 2 : 3)}</small></button>`).join('')}</div>`;
    x += K.abschnitt('Qualität', `${e.qualitaet} von 5`);
    x += `<div class="hw-g1-qualitaet">${K.stepper({ wert: `${e.qualitaet} von 5`, label: 'Qualität', attrMinus: `data-a="qualitaet" data-v="${e.qualitaet - 1}"`, attrPlus: `data-a="qualitaet" data-v="${e.qualitaet + 1}"`, minusAus: e.qualitaet <= 1, plusAus: e.qualitaet >= 5 })}</div>`;
    x += K.abschnitt('Entwicklungsdauer', 'Wochen');
    x += `<div class="hw-g1-dauer">${K.seg(Kat.dauer.map((d) => [d, String(d)]), e.dauer, (w) => `data-a="dauer" data-v="${w}"`)}</div>`;
    x += K.abschnitt('Budget je Woche', `Schritt ${geld(Kat.budgetSchritt)}`);
    x += K.stepper({ wert: geld(e.budgetWoche), unter: `${geld(v.kosten)} gesamt`, label: 'Budget je Woche', attrMinus: 'data-a="budget" data-v="-1"', attrPlus: 'data-a="budget" data-v="1"', minusAus: e.budgetWoche <= Kat.budgetSchritt }).replace('<output>', '<output data-p="n:budget">');
    P('n:budget', geld(e.budgetWoche) + `${geld(v.kosten)} gesamt`);
    // Vorschau als Produktkarte (Coffee 26)
    x += K.abschnitt('Vorschau', `Einführung ${v.saisonEinfuehrung}`);
    const wgV = Kat.typen.find((t) => t.typ === e.typ)?.wgs?.find((w) => !/^kinder/.test(w) || M.trendGruppe === 'kinder');
    const mbV = modelBild(e.typ, e.farbe, e.material, wgV, M.trendGruppe, 110, undefined, mb);
    let c = `<div class="hw-g1-bild hw-g1-vorschaubild" aria-hidden="true">${bild(e.typ, e.farbe, e.material, 110, undefined, mb)}${mbV ?? ''}</div>`;
    c += `<div class="hw-karte-titel hw-g1-titel">${P('n:name', v.name ?? e.typ, 'span')}</div>`;
    c += `<div class="hw-g1-unter">${v.wgName ? esc(v.wgName) : esc(e.typ)}</div>`;
    c += `<div class="hw-g1-sternzeile">${sterne(v.sterneErwartet, `erwartet ${dez(v.sterneErwartet, 1)} Sterne`)}${P('n:sterne', `${dez(v.sterneVon, 1)} bis ${dez(v.sterneBis, 1)}`, 'span', ' class="hw-g1-sternzahl"')}</div>`;
    c += `<div class="hw-g1-preisblock"><div class="hw-g1-ringspalte"><span class="hw-g1-ek">EK ${P('n:ek', euro(v.ekStueck), 'span')}</span>${ring(v.marge, P('n:marge', pz(v.marge), 'b'))}</div>`
      + `<div class="hw-g1-preis"><span class="hw-marke">Normpreis</span>${P('n:preis', euro(v.normpreis), 'b', ' class="hw-zahl"')}<span class="hw-abw">Passform ${P('n:passform', pz(v.passform), 'span')}</span></div></div>`;
    x += `<article class="hw-karte hw-kontur hw-g1-vorschau">${c}</article>`;
    x += K.liste([K.zeile({ was: 'Entwicklung', wert: P('n:kosten', geld(v.kosten), 'span') }), K.zeile({ was: 'Fertig', wert: P('n:fertig', wocheText(st, v.fertigWoche), 'span') }), K.zeile({ was: 'Platz frei in der Kategorie', wert: P('n:frei', String(v.kapazitaetFrei), 'span') })]);
    if (v.teile) x += K.abschnitt('Bewertung') + `<div class="hw-g1-skalen">${[['zielgruppe', 'Zielgruppe'], ['trend', 'Trend'], ['preisQualitaet', 'Preis'], ['entwicklung', 'Aufwand'], ['team', 'Team']].map(([k, t]) => K.skala(t, v.teile[k] * 100)).join('')}</div>`;
    for (const y of v.hinweise) x += K.hinweis(esc(y));
    if (v.fehler) x += K.hinweis(esc(v.fehler), 'fehler');
    x += K.knoepfe(K.knopf(`Entwicklung starten · ${geld(v.kosten)}`, 'data-a="entwickeln"', 'breit', !v.ok));
    return { titel: 'Neues Produkt', unter: `${M.name} · ${M.zielgruppe}`, html: h + K.rumpf(x) };
  }

  // ─────────────────────────── Trendbericht
  function trend(P) {
    const st = s(), T = E.trendbericht(st), Kat = merkeBilder(E.produktKatalog(st)), hex = new Map(Kat.farben.map((f) => [f.name, f.hex]));
    let h = sprecher(esc(T.hinweis));
    h += `<div class="hw-g1-oben">${K.knopf('‹ Produkte', 'data-a="liste"', 'text')}</div>`;
    let x = '';
    for (const [titel, S, pre] of [['Laufende Saison', T.aktuell, 'a'], ['Nächste Saison', T.naechste, 'n']]) {
      x += `<h3 class="hw-abschnitt">${esc(titel)}<small>${P(`t:${pre}:name`, S.name, 'span')}</small></h3>`;
      x += K.liste(T.zielgruppen.filter((z) => S.gruppen[z.id]).map((z) => {
        const g = S.gruppen[z.id];
        return `<div class="hw-zeile hw-g1-trend"><span class="hw-was">${esc(z.name)}<small>${g.artikel.map(esc).join(', ')}</small><small>Material: ${g.materialien.map(esc).join(', ')}${g.out?.length ? ` · nicht mehr gefragt: ${g.out.map(esc).join(', ')}` : ''}</small>${g.muster?.length ? `<small>Muster: ${g.muster.map(esc).join(', ')}${g.musterOut?.length ? ` · out: ${g.musterOut.map(esc).join(', ')}` : ''}</small>` : ''}</span><span class="hw-g1-trendfarben">${g.farben.map((f) => farbpunkt(hex.get(f) ?? '#888', 16)).join('')}</span></div>`;
      }));
    }
    return { titel: 'Trendbericht', unter: `Messe · ${T.naechste.name}`, html: h + K.rumpf(x) };
  }

  function rendern() {
    const S = werteSammler();
    sternNr = 0;
    if (!da) return { S, r: { titel: 'Produkte', unter: '', html: K.rumpf(K.leer('Die Engine liefert noch keine Produkte.')) } };
    const r = ui.seite === 'neu' && ui.neu ? neu(S.P) : ui.seite === 'trend' ? trend(S.P) : ui.seite === 'katalog' ? katalog() : ui.seite === 'detail' ? detail() : liste(S.P);
    return { S, r };
  }
  function zeigen(scrollHalten = false) {
    const sc = document.getElementById('pinhalt').scrollTop;
    const { r } = rendern();
    ctx.panel(r.titel, r.unter, K.bereich('zentrale', 'ware') + `<div class="hw-g1">${r.html}</div>`, 'gross');
    ui.aktiv = true;
    document.getElementById('pinhalt').scrollTop = scrollHalten ? sc : 0;
    if (ui.seite === 'liste') karussellBinden();
  }
  /** Karussell auf die aktive Karte stellen, beim Wischen die Karte merken (für Hauspreis und Prüfung). */
  function karussellBinden() {
    const k = document.querySelector('#pinhalt .hw-g1-karussell .hw-karussell');
    if (!k) return;
    const karten = [...k.children];
    const mitte = (el) => el.offsetLeft + el.offsetWidth / 2;
    const aktuell = () => { const m = k.scrollLeft + k.clientWidth / 2; let best = 0; karten.forEach((el, i) => { if (Math.abs(mitte(el) - m) < Math.abs(mitte(karten[best]) - m)) best = i; }); return best; };
    if (karten[ui.k]) k.scrollLeft = Math.max(0, mitte(karten[ui.k]) - k.clientWidth / 2);
    k.nextElementSibling?.querySelectorAll('i').forEach((p, i) => p.classList.toggle('an', i === ui.k));
    let t = null;
    k.addEventListener('scroll', () => {
      clearTimeout(t);
      k.nextElementSibling?.querySelectorAll('i').forEach((p, i) => p.classList.toggle('an', i === aktuell()));
      t = setTimeout(() => { if (!k.isConnected || !ui.aktiv) return; const i = aktuell(); if (i !== ui.k) { ui.k = i; ui.auslisten = null; zeigen(true); } }, 160);
    }, { passive: true });
  }
  function tun(aktion) {
    const r = E.fuehreAus(s(), aktion);
    if (r) ctx.meldung(r.text, r.ok);
    ctx.nachAktion?.();
    return r;
  }
  const neuerEntwurf = () => {
    const st = s(), T = E.trendbericht(st), L = E.produkte(st), M = aktuelleMarke(L);
    const g = T.naechste.gruppen[M?.trendGruppe] ?? T.aktuell.gruppen[M?.trendGruppe];
    const Kat = merkeBilder(E.produktKatalog(st)), voll = new Set((M?.kategorien ?? []).filter((k) => k.belegt >= k.kapazitaet).map((k) => k.id));
    const frei = (typ) => { const t = Kat.typen.find((x) => x.typ === typ); return t && !voll.has(t.kategorie) && M.kategorien.some((k) => k.id === t.kategorie && k.kapazitaet > 0); };
    return { typ: g?.artikel?.find(frei) ?? g?.artikel?.[0], farbe: g?.farben?.[0] ?? 'marine', material: g?.materialien?.[0] ?? 'Baumwolle', muster: 'Uni', anlass: null, preislage: 'mitte', qualitaet: 3, dauer: 12, budgetWoche: 20000 };
  };
  function klick(el) {
    const a = el.dataset.a, v = el.dataset.v, st = s();
    const karte = (id) => E.produkte(st).marken.flatMap((m) => m.produkte).find((p) => p.id === id);
    switch (a) {
      case 'eigenmarkeGruenden': return ctx.neueEigenmarke?.();
      case 'marke': ui.marke = v; ui.k = 0; ui.kategorie = null; vorauswahl(aktuelleMarke(E.produkte(st))); if (ui.neu) { ui.neu = neuerEntwurf(); ui.neuSchritt = 0; ui.baumOffen = null; ui.astOffen = null; } return zeigen(true);
      case 'katalog': ui.seite = 'katalog'; ui.baumOffen = null; ui.astOffen = null; return zeigen();
      case 'q24Fach': ui.fach = v; ui.baumOffen = null; ui.astOffen = null; if (ui.seite === 'neu') ui.neu.typ = null; return zeigen(true);
      case 'q24Ziel': ui.zielgruppe = v; ui.baumOffen = null; ui.astOffen = null; if (ui.seite === 'neu') { ui.neu.typ = null; ui.neu.zielgruppe = v; } return zeigen(true);
      case 'detailTyp': ui.detail = { typ: v, quelle: 'katalog' }; ui.seite = 'detail'; return zeigen();
      case 'detailProdukt': ui.detail = { produktId: v, quelle: 'liste' }; ui.seite = 'detail'; return zeigen();
      case 'detailZurueck': ui.seite = v === 'liste' ? 'liste' : 'katalog'; return zeigen();
      case 'detailPlanen': ui.seite = 'neu'; ui.neu = neuerEntwurf(); ui.neu.typ = ui.detail.typ;
        ui.neu.zielgruppe = ui.zielgruppe; ui.neuSchritt = 2; ui.baumOffen = null; ui.astOffen = null; return zeigen();
      case 'kategorie': ui.kategorie = v; ui.k = 0; ui.auslisten = null; return zeigen(true);
      case 'pkarte': ui.k = Number(v); ui.auslisten = null; return zeigen(true);
      case 'liste': ui.seite = 'liste'; return zeigen();
      case 'trend': ui.seite = 'trend'; return zeigen();
      case 'neu': ui.seite = 'neu'; vorauswahl(aktuelleMarke(E.produkte(st))); ui.neu = neuerEntwurf(); ui.neuSchritt = 0; ui.baumOffen = null; ui.astOffen = null; return zeigen();
      case 'baumKat': ui.baumOffen = ui.baumOffen === v ? null : v; ui.astOffen = null; return zeigen(true);
      case 'baumAst': ui.astOffen = ui.astOffen === v ? null : v; return zeigen(true);
      case 'neuZurTyp': ui.neuSchritt = 0; return zeigen(true);
      case 'neuZurZiel': ui.neuSchritt = 1; return zeigen(true);
      case 'zielgruppe': ui.neu.zielgruppe = v; ui.neuSchritt = 2; return zeigen();
      case 'sortiment': { const p = karte(v); tun({ typ: 'produktSortiment', produkt: v, an: p.status !== 'sortiment' }); return zeigen(true); }
      case 'preis': { const id = el.dataset.p2, p = karte(id), d = preisSchritt(p.preis); tun({ typ: 'produktPreis', produkt: id, preis: Math.max(1, Math.round((p.preis + Number(v) * d) / d) * d - (d >= 5 ? 0.01 : 0)) }); return zeigen(true); }
      case 'einheitspreis': { const p = karte(v); tun({ typ: 'produktPreisAlleHaeuser', produkt: v, an: !p.preisAlleHaeuser }); return zeigen(true); }
      case 'hausWahl': ui.haus = el.value; return zeigen(true);
      case 'hauspreis': { const p = karte(el.dataset.p2), d = preisSchritt(p.hauspreise[ui.haus] ?? p.preis), alt = p.hauspreise[ui.haus] ?? p.preis; tun({ typ: 'produktHauspreis', produkt: p.id, haus: ui.haus, preis: Math.max(1, Math.round((alt + Number(v) * d) / d) * d - (d >= 5 ? 0.01 : 0)) }); return zeigen(true); }
      case 'linienVerwalten': ctx.linienVerwalten?.(ui.marke); return;
      case 'bildwechsel': if (ui.model.has(v)) ui.model.delete(v); else ui.model.add(v); return zeigen(true);
      case 'auslisten': ui.auslisten = v; return zeigen(true);
      case 'auslistenNein': ui.auslisten = null; return zeigen(true);
      case 'auslistenJa': ui.auslisten = null; tun({ typ: 'produktAuslisten', produkt: v }); return zeigen(true);
      case 'typ': ui.neu.typ = v; ui.neu.zielgruppe = ui.zielgruppe; ui.neu.anlass = el.dataset.anlass || null; ui.neu.muster = 'Uni'; ui.neuSchritt = 1; return zeigen();
      case 'muster': ui.neu.muster = v; return zeigen(true);
      case 'anlass': ui.neu.anlass = v || null; return zeigen(true);
      case 'farbe': ui.neu.farbe = v; return zeigen(true);
      case 'material': ui.neu.material = v; return zeigen(true);
      case 'preislage': ui.neu.preislage = v; return zeigen(true);
      case 'qualitaet': ui.neu.qualitaet = Math.max(1, Math.min(5, Number(v))); return zeigen(true);
      case 'dauer': ui.neu.dauer = Number(v); return zeigen(true);
      case 'budget': { const Kat = merkeBilder(E.produktKatalog(st)); ui.neu.budgetWoche = Math.max(Kat.budgetSchritt, ui.neu.budgetWoche + Number(v) * Kat.budgetSchritt); return zeigen(true); }
      case 'entwickeln': {
        const e = ui.neu, r = tun({ typ: 'produktEntwickeln', entwurf: { marke: ui.marke, typ: e.typ, zielgruppe: e.zielgruppe, farbe: e.farbe, material: e.material, preislage: e.preislage, qualitaet: e.qualitaet, dauer: e.dauer, budgetWoche: e.budgetWoche, ...(e.muster && e.muster !== 'Uni' ? { muster: e.muster } : {}), ...(e.anlass ? { anlass: e.anlass } : {}) } });
        if (r?.ok) { ui.seite = 'liste'; const p = E.produkte(s()).marken.find((m) => m.marke === ui.marke)?.produkte.filter((x) => x.status === 'entwicklung').pop(); if (p) { ui.kategorie = p.kategorie; const l = E.produkte(s()).marken.find((m) => m.marke === ui.marke).produkte.filter((x) => x.kategorie === p.kategorie && x.status !== 'ausgelistet'); ui.k = l.findIndex((x) => x.id === p.id); } }
        return zeigen(!r?.ok);
      }
      default:
    }
  }
  const inhalt = document.getElementById('pinhalt');
  inhalt.addEventListener('click', (ev) => { if (!ui.aktiv) return; const el = ev.target.closest('[data-a]'); if (el && !el.disabled && el.tagName !== 'INPUT' && el.tagName !== 'SELECT') klick(el); });
  inhalt.addEventListener('change', (ev) => { if (!ui.aktiv) return; const el = ev.target.closest('select[data-a="hausWahl"]'); if (el && !el.disabled) klick(el); });

  return {
    ui, da,
    oeffne: (seite = 'liste', marke) => { ui.seite = seite; if (marke) ui.marke = marke; ui.k = 0; ui.auslisten = null; if (seite === 'neu') { vorauswahl(aktuelleMarke(E.produkte(s()))); ui.neu = neuerEntwurf(); ui.neuSchritt = 0; ui.baumOffen = null; ui.astOffen = null; } zeigen(); },
    neuZeichnen: () => zeigen(true), aktiv: () => ui.aktiv, zu: () => { ui.aktiv = false; },
    pruefe: () => ({ seite: ui.seite, ...vergleiche(rendern().S.W) }),
  };
}
