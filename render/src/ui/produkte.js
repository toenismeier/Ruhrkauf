// Produktentwicklung für Eigenmarken (VORSTAND-MARKETING-VERTRAG.md, Abschnitt 5) im Stil von Coffee Inc 2:
// Markenwahl, Kategorien, Produktkarten-Karussell mit Bild, Sternen, Verkäufen letzte Woche, Margen-Donut, Preis +/-,
// Sortiment an/aus und Auslisten; Assistent "Neues Produkt" mit Typ-Kacheln, Farbe, Material, Preislage, Qualität,
// Dauer 4/8/12/24/48 Wochen und Budget je Woche samt Vorschau; Trendbericht der Messe.
// Daten: produkte, produktKatalog, trendbericht, produktVorschau; Aktionen produktEntwickeln, produktPreis,
// produktAuslisten, produktSortiment. Prüfung wie im Vorstand.
import { geld, fmt, pz, dez, kwVon, esc } from './format.js';
import { werteSammler, vergleiche, schalter, segment, regler, stepper, kz, wocheText, karussell, karussellBinden } from './vorstand.js';
import * as PB from '../kit/produktbild.js';

const PREISLAGE = { einstieg: 'Einstieg', mitte: 'Mitte', gehoben: 'Gehoben' };
const STATUS = { entwicklung: 'in Entwicklung', sortiment: 'im Sortiment', pausiert: 'pausiert', ausgelistet: 'ausgelistet' };
const euro = (x) => `${dez(x, 2)} €`;
const bild = (typ, farbe, material, g = 150) => (typeof PB.produktbildSVG === 'function' ? PB.produktbildSVG(typ, farbe, material, g) : `<svg viewBox="0 0 100 100" width="${g}" height="${g}"><rect x="22" y="22" width="56" height="56" rx="10" fill="#d8d2c6"/><text x="50" y="56" font-size="9" text-anchor="middle" fill="#7b8790">${esc(typ)}</text></svg>`);
const kachel = (typ, g = 76) => (typeof PB.typKachelSVG === 'function' ? PB.typKachelSVG(typ, g) : bild(typ, undefined, undefined, g));
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
  const ui = { aktiv: false, seite: 'liste', marke: null, kategorie: null, k: 0, auslisten: null, neu: null };

  function markenwahl(L) {
    return `<div class="spaltenwahl">${L.marken.map((m) => `<button class="chipk ${m.marke === ui.marke ? 'an' : ''}" data-a="marke" data-v="${m.marke}"><b style="background:${m.farbe}"></b>${esc(m.name)}</button>`).join('')}</div>`;
  }
  function aktuelleMarke(L) {
    if (!L.marken.length) return null;
    if (!L.marken.some((m) => m.marke === ui.marke)) ui.marke = L.marken[0].marke;
    return L.marken.find((m) => m.marke === ui.marke);
  }

  // ─────────────────────────── Produktliste
  function liste(P) {
    const st = s(), L = E.produkte(st), M = aktuelleMarke(L);
    let h = '';
    if (!M) return { titel: 'Produktentwicklung', unter: '', html: '<div class="leise">Keine Eigenmarke vorhanden. Eine Marke gründest du im Einkauf.</div>' };
    h += '<button class="breit gruen" data-a="eigenmarkeGruenden">+ Neue Eigenmarke</button>';
    h += markenwahl(L);
    h += `<div class="raster">${kz('Team Produktentwicklung', P('l:team', `${Math.round(L.team * 100)} / 100`))}${kz('Kosten je Woche', P('l:kosten', geld(L.kostenWoche)))}</div>`;
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
        let c = `<div class="karte produkt"><div class="pbild" style="background:linear-gradient(#f7f4ee,#efe9df)">${bild(p.typ, p.farbe, p.material, 150)}</div>`;
        if (!ent) c += `<button class="papierkorb" data-a="auslisten" data-v="${p.id}" aria-label="Auslisten"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6"/></svg></button>`;
        c += `<div class="pname">${P(`p:${p.id}:name`, p.name, 'b')}<small>${esc(p.typ)} · ${esc(p.farbe)} · ${esc(p.material)} · ${PREISLAGE[p.preislage] ?? p.preislage}</small></div>`;
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

  // ─────────────────────────── Neues Produkt
  function neu(P) {
    const st = s(), K = E.produktKatalog(st), L = E.produkte(st), M = aktuelleMarke(L), e = ui.neu;
    const markeKats = new Set(M.kategorien.filter((k) => k.kapazitaet > 0).map((k) => k.id));
    const voll = new Set(M.kategorien.filter((k) => k.belegt >= k.kapazitaet).map((k) => k.id));
    const typen = K.typen.filter((t) => markeKats.has(t.kategorie) && (t.gruppe[M.trendGruppe] ?? 0) > 0.15).sort((a, b) => voll.has(a.kategorie) - voll.has(b.kategorie));
    if (!typen.some((t) => t.typ === e.typ)) { e.typ = (typen.find((t) => !voll.has(t.kategorie)) ?? typen[0])?.typ; }
    const T = K.typen.find((t) => t.typ === e.typ);
    if (T && !T.materialien.includes(e.material)) e.material = T.materialien[0];
    let h = `<button class="zurueck" data-a="liste">‹ ${esc(M.name)}</button>`;
    h += markenwahl(L);
    const v = E.produktVorschau(st, { marke: M.marke, typ: e.typ, farbe: e.farbe, material: e.material, preislage: e.preislage, qualitaet: e.qualitaet, dauer: e.dauer, budgetWoche: e.budgetWoche });
    if (v.kapazitaetFrei <= 0) h += `<div class="olief warnung">Kapazität erreicht: in dieser Kategorie ist bei ${esc(M.name)} kein Platz mehr. Für Neues bitte erst ein Produkt auslisten.</div>`;
    h += '<div class="vtitel">Artikeltyp</div><div class="typkacheln">';
    for (const t of typen) h += `<button class="${t.typ === e.typ ? 'an' : ''} ${voll.has(t.kategorie) ? 'voll' : ''}" data-a="typ" data-v="${esc(t.typ)}">${kachel(t.typ, 64)}<span>${esc(t.typ)}</span>${voll.has(t.kategorie) ? '<small>Kapazität erreicht</small>' : ''}</button>`;
    h += '</div><div class="karte steuerung">';
    h += regler('Farbe', `<div class="farben klein">${K.farben.map((f) => `<button class="${f.name === e.farbe ? 'an' : ''}" style="background:${f.hex}" data-a="farbe" data-v="${esc(f.name)}" aria-label="${esc(f.name)}"></button>`).join('')}</div>`, esc(e.farbe));
    h += regler('Material', segment('material', e.material, (T?.materialien ?? []).map((m) => [m, m])));
    h += regler('Preislage', segment('preislage', e.preislage, K.preislagen.map((p) => [p.id, PREISLAGE[p.id] ?? p.id])));
    h += regler('Qualität', segment('qualitaet', e.qualitaet, [1, 2, 3, 4, 5].map((x) => [x, '★'.repeat(x)])));
    h += regler('Entwicklungsdauer', segment('dauer', e.dauer, K.dauer.map((d) => [d, String(d)])), 'Wochen');
    h += regler('Budget je Woche', stepper('budget', P('n:budget', geld(e.budgetWoche))), `Schritt ${geld(K.budgetSchritt)}`);
    h += '</div>';
    h += `<div class="karte vorschau produkt"><div class="pbild" style="background:linear-gradient(#f7f4ee,#efe9df)">${bild(e.typ, e.farbe, e.material, 132)}</div><div class="pname">${P('n:name', v.name ?? e.typ, 'b')}<small>${v.wgName ? `${esc(v.wgName)} · ` : ''}Einführung ${esc(v.saisonEinfuehrung)}</small></div>`;
    h += `<div class="mitte">${sterne(v.sterneErwartet, 22)}<span class="sternzahl">${P('n:sterne', `${dez(v.sterneVon, 1)} bis ${dez(v.sterneBis, 1)}`, 'span')}</span></div>`;
    h += `<div class="owerte"><div><span>Normpreis</span>${P('n:preis', euro(v.normpreis))}</div><div><span>EK je Stück</span>${P('n:ek', euro(v.ekStueck))}</div><div><span>Marge</span>${P('n:marge', pz(v.marge))}</div><div><span>Entwicklung</span>${P('n:kosten', geld(v.kosten))}</div><div><span>Fertig</span>${P('n:fertig', wocheText(st, v.fertigWoche))}</div><div><span>Platz frei</span>${P('n:frei', String(v.kapazitaetFrei))}</div></div>`;
    if (v.teile) h += `<div class="passung">${[['zielgruppe', 'Zielgruppe'], ['trend', 'Trend'], ['preisQualitaet', 'Preis'], ['entwicklung', 'Aufwand'], ['team', 'Team']].map(([k, t]) => `<div><span class="psaeule"><span style="height:${(v.teile[k] * 100).toFixed(0)}%"></span></span><b>${Math.round(v.teile[k] * 100)}</b><i>${t}</i></div>`).join('')}</div>`;
    for (const x of v.hinweise) h += `<div class="olief">${esc(x)}</div>`;
    if (v.fehler) h += `<div class="olief warnung">${esc(v.fehler)}</div>`;
    h += `</div><div class="oknoepfe unten2"><button class="gruen" data-a="entwickeln"${v.ok ? '' : ' disabled'}>Entwicklung starten · ${geld(v.kosten)}</button></div>`;
    return { titel: 'Neues Produkt', unter: `${esc(M.name)} · ${esc(M.zielgruppe)}`, html: h };
  }

  // ─────────────────────────── Trendbericht
  function trend(P) {
    const st = s(), T = E.trendbericht(st), K = E.produktKatalog(st), hex = new Map(K.farben.map((f) => [f.name, f.hex]));
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
    const r = ui.seite === 'neu' && ui.neu ? neu(S.P) : ui.seite === 'trend' ? trend(S.P) : liste(S.P);
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
    const K = E.produktKatalog(st), voll = new Set((M?.kategorien ?? []).filter((k) => k.belegt >= k.kapazitaet).map((k) => k.id));
    const frei = (typ) => { const t = K.typen.find((x) => x.typ === typ); return t && !voll.has(t.kategorie) && M.kategorien.some((k) => k.id === t.kategorie && k.kapazitaet > 0); };
    return { typ: g?.artikel?.find(frei) ?? g?.artikel?.[0], farbe: g?.farben?.[0] ?? 'marine', material: g?.materialien?.[0] ?? 'Baumwolle', preislage: 'mitte', qualitaet: 3, dauer: 12, budgetWoche: 20000 };
  };
  function klick(el) {
    const a = el.dataset.a, v = el.dataset.v, st = s();
    const karte = (id) => E.produkte(st).marken.flatMap((m) => m.produkte).find((p) => p.id === id);
    switch (a) {
      case 'eigenmarkeGruenden': return ctx.neueEigenmarke?.();
      case 'marke': ui.marke = v; ui.k = 0; ui.kategorie = null; if (ui.neu) ui.neu = neuerEntwurf(); return zeigen(true);
      case 'kategorie': ui.kategorie = v; ui.k = 0; ui.auslisten = null; return zeigen(true);
      case 'pkarte': ui.k = Number(v); ui.auslisten = null; return zeigen(true);
      case 'liste': ui.seite = 'liste'; return zeigen();
      case 'trend': ui.seite = 'trend'; return zeigen();
      case 'neu': ui.seite = 'neu'; ui.neu = neuerEntwurf(); return zeigen();
      case 'sortiment': { const p = karte(v); tun({ typ: 'produktSortiment', produkt: v, an: p.status !== 'sortiment' }); return zeigen(true); }
      case 'preis': { const id = el.dataset.p2, p = karte(id), d = preisSchritt(p.preis); tun({ typ: 'produktPreis', produkt: id, preis: Math.max(1, Math.round((p.preis + Number(v) * d) / d) * d - (d >= 5 ? 0.01 : 0)) }); return zeigen(true); }
      case 'auslisten': ui.auslisten = v; return zeigen(true);
      case 'auslistenNein': ui.auslisten = null; return zeigen(true);
      case 'auslistenJa': ui.auslisten = null; tun({ typ: 'produktAuslisten', produkt: v }); return zeigen(true);
      case 'typ': ui.neu.typ = v; return zeigen(true);
      case 'farbe': ui.neu.farbe = v; return zeigen(true);
      case 'material': ui.neu.material = v; return zeigen(true);
      case 'preislage': ui.neu.preislage = v; return zeigen(true);
      case 'qualitaet': ui.neu.qualitaet = Number(v); return zeigen(true);
      case 'dauer': ui.neu.dauer = Number(v); return zeigen(true);
      case 'budget': { const K = E.produktKatalog(st); ui.neu.budgetWoche = Math.max(K.budgetSchritt, ui.neu.budgetWoche + Number(v) * K.budgetSchritt); return zeigen(true); }
      case 'entwickeln': {
        const e = ui.neu, r = tun({ typ: 'produktEntwickeln', entwurf: { marke: ui.marke, typ: e.typ, farbe: e.farbe, material: e.material, preislage: e.preislage, qualitaet: e.qualitaet, dauer: e.dauer, budgetWoche: e.budgetWoche } });
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
    oeffne: (seite = 'liste', marke) => { ui.seite = seite; if (marke) ui.marke = marke; ui.k = 0; ui.auslisten = null; if (seite === 'neu') ui.neu = neuerEntwurf(); zeigen(); },
    neuZeichnen: () => zeigen(true), aktiv: () => ui.aktiv, zu: () => { ui.aktiv = false; },
    pruefe: () => ({ seite: ui.seite, ...vergleiche(rendern().S.W) }),
  };
}
