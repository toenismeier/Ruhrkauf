// Produktentwicklung für Eigenmarken (VORSTAND-MARKETING-VERTRAG.md, Abschnitt 5) im Stil von Coffee Inc 2:
// Markenwahl, Kategorien, Produktkarten-Karussell mit Bild, Sternen, Verkäufen letzte Woche, Margen-Donut, Preis +/-,
// Sortiment an/aus und Auslisten; Assistent "Neues Produkt" mit Typ-Kacheln, Farbe, Material, Preislage, Qualität,
// Dauer 4/8/12/24/48 Wochen und Budget je Woche samt Vorschau; Trendbericht der Messe.
// Daten: produkte, produktKatalog, trendbericht, produktVorschau; Aktionen produktEntwickeln, produktPreis,
// produktAuslisten, produktSortiment. Prüfung wie im Vorstand.
import { geld, fmt, pz, dez, kwVon, esc } from './format.js';
import { werteSammler, vergleiche, schalter, segment, regler, stepper, kz, wocheText, karussell, karussellBinden } from './vorstand.js';
import * as PB from '../kit/produktbild.js';
import { passendeTypen, fachSegmente, zielChips, sortimentBedienung, gruppeTrend, teamAufschluesselung } from './produkte-q24.js';

const PREISLAGE = { einstieg: 'Einstieg', mitte: 'Mitte', gehoben: 'Gehoben' };
const STATUS = { entwicklung: 'in Entwicklung', sortiment: 'im Sortiment', pausiert: 'pausiert', ausgelistet: 'ausgelistet' };
const euro = (x) => `${dez(x, 2)} €`;
// Q27: Bild je Artikeltyp aus dem Katalog (Silhouette + Parameter, engine/src/sortiment); ohne Eintrag leitet die Grafik es aus dem Namen ab
const BILD = new Map();
const merkeBilder = (K) => { for (const t of K.typen ?? []) if (t.bild) BILD.set(t.typ, t.bild); return K; };
const bildOpt = (typ, b) => { const x = b ?? BILD.get(typ); return x ? { bild: x } : {}; };
const bild = (typ, farbe, material, g = 150, b) => (typeof PB.produktbildSVG === 'function' ? PB.produktbildSVG(typ, farbe, material, g, bildOpt(typ, b)) : `<svg viewBox="0 0 100 100" width="${g}" height="${g}"><rect x="22" y="22" width="56" height="56" rx="10" fill="#d8d2c6"/><text x="50" y="56" font-size="9" text-anchor="middle" fill="#7b8790">${esc(typ)}</text></svg>`);
// Q25: Model-Ansicht (Antippen des Bildes wechselt Produkt ↔ Model)
const ZG_MODEL = { kinder: 'kinder', jung: 'young', mitte: 'adults', reif: 'bestager' };
const geschlechtVon = (wg) => (/^herren|kinder\.jungen/.test(String(wg ?? '')) ? 'herren' : 'damen');
const modelBild = (typ, farbe, material, wg, trendGruppe, g = 150, b) => (typeof PB.modelbildSVG === 'function' ? PB.modelbildSVG(typ, farbe, material, { geschlecht: geschlechtVon(wg), zielgruppe: ZG_MODEL[trendGruppe] ?? 'young', groesse: g, hintergrund: null, ...bildOpt(typ, b) }) : null);
const kachel = (typ, g = 76) => (typeof PB.typKachelSVG === 'function' ? PB.typKachelSVG(typ, g, bildOpt(typ)) : bild(typ, undefined, undefined, g));
let sternNr = 0;
/** Fünf Sterne mit halben Schritten. */
function sterne(x, g = 18) {
  let h = '<span class="sterne">';
  for (let i = 0; i < 5; i++) {
    const f = Math.max(0, Math.min(1, x - i)), id = `st${sternNr++}`;
    h += `<svg viewBox="0 0 24 24" width="${g}" height="${g}"><defs><linearGradient id="${id}"><stop offset="${f}" stop-color="#f0b429"/><stop offset="${f}" stop-color="#d9d4cb"/></linearGradient></defs><path d="M12 2.2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.1l-6.1 3.5 1.5-6.8L2.2 9.2l6.9-.7z" fill="url(#${id})"/></svg>`;
  }
  return h + '</span>';
}
/** Margen-Donut: Anteil Marge orange, Einstand rot. */
function donut(marge, p) {
  const r = 26, u = 2 * Math.PI * r, m = Math.max(0, Math.min(1, marge));
  return `<div class="donut"><svg viewBox="0 0 64 64" width="84" height="84"><circle cx="32" cy="32" r="${r}" fill="none" stroke="#d2603a" stroke-width="9"/><circle cx="32" cy="32" r="${r}" fill="none" stroke="#efc27a" stroke-width="9" stroke-dasharray="${(u * m).toFixed(1)} ${u.toFixed(1)}" transform="rotate(-90 32 32)"/></svg><span><small>Marge</small>${p}</span></div>`;
}
const preisSchritt = (p) => (p < 20 ? 1 : p < 100 ? 5 : 10);

export function produkteModul(ctx) {
  const E = ctx.E, s = () => ctx.s();
  const da = typeof E.produkte === 'function';
  const ui = { aktiv: false, seite: 'liste', marke: null, kategorie: null, k: 0, auslisten: null, neu: null, neuSchritt: 0, baumOffen: null, astOffen: null, model: new Set(), fach: null, zielgruppe: null, detail: null };

  function markenwahl(L) {
    return `<div class="spaltenwahl">${L.marken.map((m) => `<button class="chipk ${m.marke === ui.marke ? 'an' : ''}" data-a="marke" data-v="${m.marke}"><b style="background:${m.farbe}"></b>${esc(m.name)}</button>`).join('')}</div>`;
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
    ui.baumOffen = null; ui.astOffen = null;
  }

  // ─────────────────────────── Produktliste
  function liste(P) {
    const st = s(), L = E.produkte(st), M = aktuelleMarke(L);
    let h = '';
    if (!M) return { titel: 'Produktentwicklung', unter: '', html: '<div class="leise">Keine Eigenmarke vorhanden. Eine Marke gründest du im Einkauf.</div>' };
    h += '<button class="breit gruen" data-a="eigenmarkeGruenden">+ Neue Eigenmarke</button>';
    h += markenwahl(L);
    h += teamAufschluesselung(M.leistung);
    h += '<button class="breit q24-katalogknopf" data-a="katalog">Sortiment durchsuchen: Damen, Herren, Kinder, Home</button>';
    h += `<div class="raster">${kz('HQ-Team (Basis)', P('l:team', `${Math.round(L.team * 100)} / 100`))}${kz('Kosten je Woche', P('l:kosten', geld(L.kostenWoche)))}</div>`;
    const kats = M.kategorien.filter((k) => k.kapazitaet > 0 || k.belegt > 0);
    if (!kats.some((k) => k.id === ui.kategorie)) ui.kategorie = (kats.find((k) => M.produkte.some((p) => p.kategorie === k.id && p.status !== 'ausgelistet')) ?? kats[0])?.id ?? null;
    h += `<div class="seg umbruch kats">${kats.map((k) => `<button class="${k.id === ui.kategorie ? 'an' : ''}" data-a="kategorie" data-v="${k.id}">${esc(k.name)} ${P(`l:kat:${k.id}`, `${k.belegt} / ${k.kapazitaet}`, 'i')}</button>`).join('')}</div>`;
    const prod = M.produkte.filter((p) => p.kategorie === ui.kategorie && p.status !== 'ausgelistet');
    ui.k = Math.min(ui.k, Math.max(0, prod.length - 1));
    if (M.hinweis) h += `<div class="olief warnung">${esc(M.hinweis)}</div>`;
    if (!prod.length) h += '<div class="karte"><div class="zeile grau">In dieser Kategorie gibt es noch kein Produkt.</div></div>';
    else {
      const karten = prod.map((p) => {
        const ent = p.status === 'entwicklung';
        const mb = ui.model.has(p.id) ? modelBild(p.typ, p.farbe, p.material, p.wg, M.trendGruppe, 190, p.bild) : null;
        let c = `<div class="karte produkt"><div class="pbild" data-a="bildwechsel" data-v="${p.id}" role="button" aria-label="Produkt oder Model zeigen" style="background:linear-gradient(#f7f4ee,#efe9df)">${mb ?? bild(p.typ, p.farbe, p.material, 150, p.bild)}</div>`;
        if (!ent) c += `<button class="papierkorb" data-a="auslisten" data-v="${p.id}" aria-label="Auslisten"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6"/></svg></button>`;
        c += `<button class="q24-detailsknopf" data-a="detailProdukt" data-v="${esc(p.id)}">Produktdetails und Model ansehen</button>`;
        c += `<div class="pname">${P(`p:${p.id}:name`, p.name, 'b')}<small>${esc(p.typ)} · ${esc(p.zielgruppeName ?? 'Markenzielgruppe')} · ${esc(p.farbe)} · ${esc(p.material)} · ${PREISLAGE[p.preislage] ?? p.preislage}</small></div>`;
        if (ent) {
          c += `<div class="mitte">${sterne(0)}</div><div class="regler"><div class="rkopf"><b>In Entwicklung</b>${P(`p:${p.id}:fertig`, `fertig ${wocheText(st, p.fertigWoche)}`, 'small')}</div><div class="balken"><span style="width:${(p.fortschritt * 100).toFixed(0)}%"></span></div><small class="rfuss">${P(`p:${p.id}:fortschritt`, pz(p.fortschritt), 'i')} · ${geld(p.budgetWoche)} je Woche über ${p.dauer} Wochen</small></div>`;
        } else {
          c += `<div class="mitte" title="${dez(p.sterne, 1)} Sterne">${sterne(p.sterne, 24)}<span class="sternzahl">${P(`p:${p.id}:sterne`, dez(p.sterne, 1), 'span')}</span></div>`;
          const ver = `${p.veraenderung >= 0 ? '+' : '−'}${fmt.format(Math.abs(p.veraenderung))} (${p.veraenderungProzent >= 0 ? '+' : '−'}${pz(Math.abs(p.veraenderungProzent))})`;
          c += `<div class="pmitte">${schalter(p.status === 'sortiment', `data-a="sortiment" data-v="${p.id}"`, 'Im Sortiment')}<div class="verkauf"><small>Verkauf letzte Woche</small>${P(`p:${p.id}:verkauf`, fmt.format(p.verkaufLetzteWoche), 'b')}${P(`p:${p.id}:veraenderung`, ver, 'i', p.veraenderung < 0 ? ' class="rotwert"' : '')}</div></div>`;
          c += `<div class="pmitte">${donut(p.marge, P(`p:${p.id}:marge`, pz(p.marge), 'b'))}<div class="preis"><small class="rotwert">EK je Stück ${P(`p:${p.id}:ek`, euro(p.ekStueck), 'span')}</small><small>Preis</small>${stepper('preis', P(`p:${p.id}:preis`, euro(p.preis)), `Normpreis ${euro(p.normpreis)}`, ` data-p2="${p.id}"`)}</div></div>`;
          if (ui.auslisten === p.id) c += `<div class="oknoepfe"><button class="rot" data-a="auslistenJa" data-v="${p.id}">Wirklich auslisten</button><button data-a="auslistenNein">Behalten</button></div>`;
        }
        return c + '</div>';
      });
      h += karussell('produkte', karten, ui.k, 'pkarte');
    }
    const k = M.kategorien.find((x) => x.id === ui.kategorie);
    const voll = k && k.belegt >= k.kapazitaet;
    h += `<div class="oknoepfe unten2"><button class="gruen" data-a="neu">+ Neues Produkt</button><button data-a="trend">Trendbericht</button></div>`;
    if (voll && !M.hinweis) h += `<div class="olief warnung">Kapazität in ${esc(k.name)} erreicht: für ein neues Produkt erst eines auslisten.</div>`;
    return { titel: 'Produktentwicklung', unter: `${esc(M.name)} · ${esc(M.zielgruppe)} · ${M.inEntwicklung} in Entwicklung · KW ${kwVon(st.woche)}`, html: h };
  }


  // Q24: Alle Typen stammen ausschließlich aus produktKatalog (auch spätere Q27-Q29-Typen).
  function katalog() {
    const K = E.produktKatalog(s()), L = E.produkte(s()), M = aktuelleMarke(L);
    if (!M) return { titel: 'Sortiment', unter: '', html: '<div class="leise">Noch keine Marke vorhanden.</div>' };
    const typen = passendeTypen(K, ui.fach, ui.zielgruppe);
    let h = '<button class="zurueck" data-a="liste">‹ Produktentwicklung</button>';
    h += markenwahl(L);
    h += fachSegmente(ui) + zielChips(K, ui);
    h += '<div class="q24-anzahl">' + typen.length + ' Artikeltypen · Kategorie öffnen und Artikel auswählen</div>';
    h += sortimentBedienung(K, ui, typen, kachel, 'detailTyp');
    return { titel: 'Sortiment', unter: esc(M.name) + ' · ' + typen.length + ' passende Typen', html: h };
  }

  function detail() {
    const st = s(), K = E.produktKatalog(st), L = E.produkte(st), M = aktuelleMarke(L), d = ui.detail;
    const p = d?.produktId ? M?.produkte.find((x) => x.id === d.produktId) : null;
    const t = K.typen.find((x) => x.typ === (p?.typ ?? d?.typ));
    if (!t) { ui.seite = 'katalog'; return katalog(); }
    const typ = p?.typ ?? t.typ;
    const material = p?.material ?? t.materialien[0];
    const farbe = p?.farbe ?? (K.farben.find((x) => x.name === 'marine')?.name ?? K.farben[0]?.name ?? 'marine');
    const markenGruppe = M?.trendGruppe === 'kinder' ? 'kinder' : M?.trendGruppe === 'reif' ? 'bestager' : M?.trendGruppe === 'jung' ? 'young' : 'adults';
    const gruppe = p ? (p.zielgruppe ?? markenGruppe) : ui.zielgruppe;
    const wg = p?.wg ?? t.wgs.find((x) => x.startsWith(ui.fach === 'home' ? 'wohnen.' : ui.fach + '.')) ?? t.wgs[0];
    const model = modelBild(typ, farbe, material, wg, gruppeTrend(gruppe), 230);
    const name = K.zielgruppen.find((x) => x.id === gruppe)?.name ?? gruppe;
    const preis = p?.preis ?? t.preisMitte;
    const zurueck = d?.quelle === 'liste' ? 'liste' : 'katalog';
    let h = '<button class="zurueck" data-a="detailZurueck" data-v="' + zurueck + '">‹ Zurück</button>';
    h += '<div class="karte q24-detail"><div class="q24-detailbild">' + (model ?? bild(typ, farbe, material, 220)) + '</div>';
    h += '<h3>' + esc(p?.name ?? typ) + '</h3><div class="q24-detailwerte">';
    h += '<div><span>Artikeltyp</span><b>' + esc(typ) + '</b></div>';
    h += '<div><span>Material</span><b>' + esc(material) + '</b></div>';
    h += '<div><span>Farbe</span><b>' + esc(farbe) + '</b></div>';
    h += '<div><span>' + (p ? 'Verkaufspreis' : 'Basispreis, ca.') + '</span><b>' + euro(preis) + '</b></div>';
    h += '<div><span>Zielgruppe</span><b>' + esc(name) + '</b></div>';
    h += '</div>';
    if (p) h += '<div class="olief">Status: ' + esc(STATUS[p.status] ?? p.status) + ' · ' + esc(p.kategorieName) + '</div>';
    else {
      const freigegeben = M && M.kategorien.some((x) => x.id === t.kategorie && x.kapazitaet > 0)
        && Number(t.gruppe?.[M.trendGruppe] ?? 0) > 0.15;
      h += freigegeben ? '<button class="breit gruen" data-a="detailPlanen">Für ' + esc(M.name) + ' entwickeln</button>'
        : '<div class="olief">Dieser Artikeltyp passt derzeit nicht zum Sortiment der gewählten Marke.</div>';
    }
    return { titel: 'Produktdetails', unter: esc(M?.name ?? '') + ' · ' + esc(typ), html: h + '</div>' };
  }

  // ─────────────────────────── Neues Produkt
  function neu(P) {
    const st = s(), K = merkeBilder(E.produktKatalog(st)), L = E.produkte(st), M = aktuelleMarke(L), e = ui.neu;
    const markeKats = new Set(M.kategorien.filter((k) => k.kapazitaet > 0).map((k) => k.id));
    const voll = new Set(M.kategorien.filter((k) => k.belegt >= k.kapazitaet).map((k) => k.id));
    const typen = passendeTypen(K, ui.fach, ui.zielgruppe).filter((t) => markeKats.has(t.kategorie) && (t.gruppe[M.trendGruppe] ?? 0) > 0.15).sort((a, b) => Number(voll.has(a.kategorie)) - Number(voll.has(b.kategorie)));
    if (!typen.some((t) => t.typ === e.typ)) { e.typ = (typen.find((t) => !voll.has(t.kategorie)) ?? typen[0])?.typ; }
    const T = K.typen.find((t) => t.typ === e.typ);
    if (T && !T.materialien.includes(e.material)) e.material = T.materialien[0];
    let h = `<button class="zurueck" data-a="liste">‹ ${esc(M.name)}</button>`;
    h += markenwahl(L);
    if (!typen.length && ui.neuSchritt !== 0) ui.neuSchritt = 0;

    const typenIds = new Set(typen.map((t) => t.typ));
    const baum = (K.baum ?? []).map((kat) => ({
      ...kat, unterkategorien: kat.unterkategorien.map((ast) => ({
        ...ast, typen: ast.typen.filter((typ) => typenIds.has(typ)),
      })).filter((ast) => ast.typen.length),
    })).filter((kat) => kat.unterkategorien.length);
    const pfad = baum.flatMap((k) => k.unterkategorien.map((a) => ({ k, a }))).find((x) => x.a.typen.includes(e.typ));
    h += '<div class="q11fortschritt"><span class="' + (ui.neuSchritt === 0 ? 'an' : 'fertig') + '">1 Kategorie und Artikel</span><span class="' + (ui.neuSchritt === 1 ? 'an' : ui.neuSchritt > 1 ? 'fertig' : '') + '">2 Zielgruppe</span><span class="' + (ui.neuSchritt === 2 ? 'an' : '') + '">3 Entwicklung</span></div>';
    if (ui.neuSchritt === 0) {
      h += '<div class="vtitel">Sortiment wählen</div>';
      h += fachSegmente(ui) + zielChips(K, ui);
      h += '<div class="q24-anzahl">' + typen.length + ' Artikeltypen für ' + esc(M.name) + '</div>';
      h += sortimentBedienung(K, ui, typen, kachel, 'typ', voll);
      return { titel: 'Neues Produkt', unter: esc(M.name) + ' · Kategorie und Artikeltyp', html: h };
    }
    if (ui.neuSchritt === 1) {
      h += '<button class="zurueck" data-a="neuZurTyp">‹ Artikeltyp ändern</button>';
      h += `<div class="q11auswahl"><b>${esc(e.typ)}</b><small>${esc(pfad?.k.name ?? '')} / ${esc(pfad?.a.name ?? '')}</small>${bild(e.typ, e.farbe, e.material, 96)}</div>`;
      h += '<div class="vtitel">Zielgruppe wählen</div><p class="leise">Die Altersgruppe beeinflusst Preislage, Passform, regionale Nachfrage und Marge. Bisherige Produkte bleiben unverändert.</p>';
      h += '<div class="q11zielgruppen">';
      for (const z of K.zielgruppen) h += `<button class="${e.zielgruppe === z.id ? 'an' : ''}" data-a="zielgruppe" data-v="${z.id}"><b>${esc(z.name)}</b><span>${z.id === 'kinder' ? 'Kinderbekleidung' : z.id === 'teens' ? 'Junge Mode' : z.id === 'young' ? 'Trendorientiert' : z.id === 'adults' ? 'Beruf und Alltag' : 'Klassik und Komfort'}</span></button>`;
      h += '</div>';
      return { titel: 'Neues Produkt', unter: `${esc(M.name)} · Zielgruppe`, html: h };
    }
    h += '<button class="zurueck" data-a="neuZurZiel">‹ Zielgruppe ändern</button>';
    h += `<div class="q11gewaehlt"><b>${esc(e.typ)}</b><span>${esc(K.zielgruppen.find((z) => z.id === e.zielgruppe)?.name ?? '')} · ${esc(pfad?.k.name ?? '')}</span></div>`;
    const v = E.produktVorschau(st, { marke: M.marke, typ: e.typ, zielgruppe: e.zielgruppe, farbe: e.farbe, material: e.material, preislage: e.preislage, qualitaet: e.qualitaet, dauer: e.dauer, budgetWoche: e.budgetWoche });
    if (v.kapazitaetFrei <= 0) h += `<div class="olief warnung">Kapazität erreicht: in dieser Kategorie ist bei ${esc(M.name)} kein Platz mehr. Für Neues bitte erst ein Produkt auslisten.</div>`;
    h += '<div class="vtitel">Produkt konfigurieren</div><div class="karte steuerung">';
    h += regler('Farbe', `<div class="farben klein">${K.farben.map((f) => `<button class="${f.name === e.farbe ? 'an' : ''}" style="background:${f.hex}" data-a="farbe" data-v="${esc(f.name)}" aria-label="${esc(f.name)}"></button>`).join('')}</div>`, esc(e.farbe));
    h += regler('Material', segment('material', e.material, (T?.materialien ?? []).map((m) => [m, m])));
    h += regler('Preislage', segment('preislage', e.preislage, K.preislagen.map((p) => [p.id, PREISLAGE[p.id] ?? p.id])));
    h += regler('Qualität', segment('qualitaet', e.qualitaet, [1, 2, 3, 4, 5].map((x) => [x, '★'.repeat(x)])));
    h += regler('Entwicklungsdauer', segment('dauer', e.dauer, K.dauer.map((d) => [d, String(d)])), 'Wochen');
    h += regler('Budget je Woche', stepper('budget', P('n:budget', geld(e.budgetWoche))), `Schritt ${geld(K.budgetSchritt)}`);
    h += '</div>';
    const wgV = K.typen.find((t) => t.typ === e.typ)?.wgs?.find((w) => !/^kinder/.test(w) || M.trendGruppe === 'kinder');
    const mbV = modelBild(e.typ, e.farbe, e.material, wgV, M.trendGruppe, 150);
    h += `<div class="karte vorschau produkt"><div class="pbild" style="background:linear-gradient(#f7f4ee,#efe9df)">${bild(e.typ, e.farbe, e.material, 132)}${mbV ?? ''}</div><div class="pname">${P('n:name', v.name ?? e.typ, 'b')}<small>${v.wgName ? `${esc(v.wgName)} · ` : ''}Einführung ${esc(v.saisonEinfuehrung)}</small></div>`;
    h += `<div class="mitte">${sterne(v.sterneErwartet, 22)}<span class="sternzahl">${P('n:sterne', `${dez(v.sterneVon, 1)} bis ${dez(v.sterneBis, 1)}`, 'span')}</span></div>`;
    h += `<div class="owerte"><div><span>Normpreis</span>${P('n:preis', euro(v.normpreis))}</div><div><span>EK je Stück</span>${P('n:ek', euro(v.ekStueck))}</div><div><span>Marge</span>${P('n:marge', pz(v.marge))}</div><div><span>Entwicklung</span>${P('n:kosten', geld(v.kosten))}</div><div><span>Fertig</span>${P('n:fertig', wocheText(st, v.fertigWoche))}</div><div><span>Platz frei</span>${P('n:frei', String(v.kapazitaetFrei))}</div></div>`;
    h += `<p class="leise">Passform zur Zielgruppe: <b>${P('n:passform', pz(v.passform), 'span')}</b> · wirkt auf die Produktbewertung und damit auf die Nachfrage.</p>`;
    if (v.teile) h += `<div class="passung">${[['zielgruppe', 'Zielgruppe'], ['trend', 'Trend'], ['preisQualitaet', 'Preis'], ['entwicklung', 'Aufwand'], ['team', 'Team']].map(([k, t]) => `<div><span class="psaeule"><span style="height:${(v.teile[k] * 100).toFixed(0)}%"></span></span><b>${Math.round(v.teile[k] * 100)}</b><i>${t}</i></div>`).join('')}</div>`;
    for (const x of v.hinweise) h += `<div class="olief">${esc(x)}</div>`;
    if (v.fehler) h += `<div class="olief warnung">${esc(v.fehler)}</div>`;
    h += `</div><div class="oknoepfe unten2"><button class="gruen" data-a="entwickeln"${v.ok ? '' : ' disabled'}>Entwicklung starten · ${geld(v.kosten)}</button></div>`;
    return { titel: 'Neues Produkt', unter: `${esc(M.name)} · ${esc(M.zielgruppe)}`, html: h };
  }

  // ─────────────────────────── Trendbericht
  function trend(P) {
    const st = s(), T = E.trendbericht(st), K = merkeBilder(E.produktKatalog(st)), hex = new Map(K.farben.map((f) => [f.name, f.hex]));
    let h = '<button class="zurueck" data-a="liste">‹ Produkte</button>';
    h += `<div class="olief">${esc(T.hinweis)}</div>`;
    for (const [titel, S, pre] of [['Laufende Saison', T.aktuell, 'a'], ['Nächste Saison', T.naechste, 'n']]) {
      h += `<div class="karte"><div class="khead">${titel}<small>${P(`t:${pre}:name`, S.name, 'span')}</small></div>`;
      for (const z of T.zielgruppen) {
        const g = S.gruppen[z.id];
        if (!g) continue;
        h += `<div class="trend"><b>${esc(z.name)}</b><div class="tfarben">${g.farben.map((f) => `<span style="background:${hex.get(f) ?? '#ccc'}" title="${esc(f)}"></span><i>${esc(f)}</i>`).join('')}</div><div class="olief">Artikel: ${g.artikel.map(esc).join(', ')} · Material: ${g.materialien.map(esc).join(', ')}${g.out?.length ? ` · out: ${g.out.map(esc).join(', ')}` : ''}</div></div>`;
      }
      h += '</div>';
    }
    return { titel: 'Trendbericht', unter: `Messe · ${esc(T.aktuell.name)} und ${esc(T.naechste.name)}`, html: h };
  }

  function rendern() {
    const S = werteSammler();
    sternNr = 0;
    if (!da) return { S, r: { titel: 'Produkte', unter: '', html: '<div class="leise">Die Engine liefert noch keine Produkte.</div>' } };
    const r = ui.seite === 'neu' && ui.neu ? neu(S.P) : ui.seite === 'trend' ? trend(S.P) : ui.seite === 'katalog' ? katalog() : ui.seite === 'detail' ? detail() : liste(S.P);
    return { S, r };
  }
  function zeigen(scrollHalten = false) {
    const sc = document.getElementById('pinhalt').scrollTop;
    const { r } = rendern();
    ctx.panel(r.titel, r.unter, r.html, 'gross');
    ui.aktiv = true;
    document.getElementById('pinhalt').scrollTop = scrollHalten ? sc : 0;
    if (ui.seite === 'liste') karussellBinden('produkte', ui.k, (i) => { if (!ui.aktiv) return; ui.k = i; ui.auslisten = null; zeigen(true); });
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
    const K = merkeBilder(E.produktKatalog(st)), voll = new Set((M?.kategorien ?? []).filter((k) => k.belegt >= k.kapazitaet).map((k) => k.id));
    const frei = (typ) => { const t = K.typen.find((x) => x.typ === typ); return t && !voll.has(t.kategorie) && M.kategorien.some((k) => k.id === t.kategorie && k.kapazitaet > 0); };
    return { typ: g?.artikel?.find(frei) ?? g?.artikel?.[0], farbe: g?.farben?.[0] ?? 'marine', material: g?.materialien?.[0] ?? 'Baumwolle', preislage: 'mitte', qualitaet: 3, dauer: 12, budgetWoche: 20000 };
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
      case 'bildwechsel': if (ui.model.has(v)) ui.model.delete(v); else ui.model.add(v); return zeigen(true);
      case 'auslisten': ui.auslisten = v; return zeigen(true);
      case 'auslistenNein': ui.auslisten = null; return zeigen(true);
      case 'auslistenJa': ui.auslisten = null; tun({ typ: 'produktAuslisten', produkt: v }); return zeigen(true);
      case 'typ': ui.neu.typ = v; ui.neu.zielgruppe = ui.zielgruppe; ui.neuSchritt = 1; return zeigen();
      case 'farbe': ui.neu.farbe = v; return zeigen(true);
      case 'material': ui.neu.material = v; return zeigen(true);
      case 'preislage': ui.neu.preislage = v; return zeigen(true);
      case 'qualitaet': ui.neu.qualitaet = Number(v); return zeigen(true);
      case 'dauer': ui.neu.dauer = Number(v); return zeigen(true);
      case 'budget': { const K = merkeBilder(E.produktKatalog(st)); ui.neu.budgetWoche = Math.max(K.budgetSchritt, ui.neu.budgetWoche + Number(v) * K.budgetSchritt); return zeigen(true); }
      case 'entwickeln': {
        const e = ui.neu, r = tun({ typ: 'produktEntwickeln', entwurf: { marke: ui.marke, typ: e.typ, zielgruppe: e.zielgruppe, farbe: e.farbe, material: e.material, preislage: e.preislage, qualitaet: e.qualitaet, dauer: e.dauer, budgetWoche: e.budgetWoche } });
        if (r?.ok) { ui.seite = 'liste'; const p = E.produkte(s()).marken.find((m) => m.marke === ui.marke)?.produkte.filter((x) => x.status === 'entwicklung').pop(); if (p) { ui.kategorie = p.kategorie; const l = E.produkte(s()).marken.find((m) => m.marke === ui.marke).produkte.filter((x) => x.kategorie === p.kategorie && x.status !== 'ausgelistet'); ui.k = l.findIndex((x) => x.id === p.id); } }
        return zeigen(!r?.ok);
      }
      default:
    }
  }
  const inhalt = document.getElementById('pinhalt');
  inhalt.addEventListener('click', (ev) => { if (!ui.aktiv) return; const el = ev.target.closest('[data-a]'); if (el && !el.disabled) klick(el); });

  return {
    ui, da,
    oeffne: (seite = 'liste', marke) => { ui.seite = seite; if (marke) ui.marke = marke; ui.k = 0; ui.auslisten = null; if (seite === 'neu') { vorauswahl(aktuelleMarke(E.produkte(s()))); ui.neu = neuerEntwurf(); ui.neuSchritt = 0; ui.baumOffen = null; ui.astOffen = null; } zeigen(); },
    neuZeichnen: () => zeigen(true), aktiv: () => ui.aktiv, zu: () => { ui.aktiv = false; },
    pruefe: () => ({ seite: ui.seite, ...vergleiche(rendern().S.W) }),
  };
}
