/* Q24: rein datengetriebene Sortimentsnavigation, ohne fest codierte Artikeltypen.
 * Der Engine-Katalog kann durch Q27 bis Q29 beliebig wachsen.
 * E47 (G1): Markup aus komponenten.js plus G1-Bausteine (hw-g1-…, Regeln im Abschnitt G1 von hartwig.css):
 * Segment Damen/Herren/Kinder/Home, darunter Zielgruppen als Chipleiste, darunter Kategorien als Abschnitte
 * mit Kachelraster der Artikeltypen (Bild und Name, Name immer lesbar). */
import { esc } from './format.js';
import * as C from './komponenten.js';

export const FAECHER = [['damen', 'Damen'], ['herren', 'Herren'], ['kinder', 'Kinder'], ['home', 'Home']];
const ZIEL = { kinder: 'kinder', teens: 'jung', young: 'jung', adults: 'mitte', bestager: 'reif' };
export const gruppeTrend = (gruppe) => ZIEL[gruppe] ?? 'mitte';

function faecherFuer(t) {
  const wgs = Array.isArray(t.wgs) ? t.wgs : [];
  const sp = String(t.sparte ?? t.abteilung ?? '').toLowerCase();
  const kat = String(t.kategorie ?? '').toLowerCase();
  const f = new Set();
  if (wgs.some((w) => /^damen[.]|damenschuhe/.test(w)) || sp === 'damen') f.add('damen');
  if (wgs.some((w) => /^herren[.]|herrenschuhe/.test(w)) || sp === 'herren') f.add('herren');
  if (wgs.some((w) => /^kinder[.]/.test(w)) || sp === 'kinder' || kat === 'kinder') f.add('kinder');
  if (wgs.some((w) => /^wohnen[.]|^haushalt[.]|^spielwaren[.]/.test(w)) || ['home','heimtextil','haushalt'].includes(sp) || kat === 'home') f.add('home');
  if (['schuhe', 'accessoires', 'beauty', 'waesche'].includes(kat) && !f.size) { f.add('damen'); f.add('herren'); }
  if (sp === 'accessoires' || sp === 'beauty') { f.add('damen'); f.add('herren'); }
  if (!f.size) { f.add('damen'); f.add('herren'); }
  return f;
}
export function passendeTypen(K, fach, gruppe) {
  return (K.typen ?? []).filter((t) => {
    if (!faecherFuer(t).has(fach)) return false;
    // Q33: der Katalog liefert je Typ die passenden Zielgruppen (auch für Home); ohne Angabe gelten die Trend-Gewichte.
    if (Array.isArray(t.zielgruppen)) return t.zielgruppen.includes(gruppe);
    if (fach === 'home') return true;
    const gewichte = t.gruppe ?? {};
    return Number(gewichte[gruppeTrend(gruppe)] ?? 0) >= 0.4;
  });
}
// Q33: unter dem Reiter Kinder nur Kinder und Teens & Tweens
export const zielgruppenFuerFach = (K, fach) => (K.zielgruppen ?? []).filter((x) => fach !== 'kinder' || x.id === 'kinder' || x.id === 'teens');

/** Farbpunkt als SVG (keine farbige Fläche im Blatt; Stilprüfung „Rot ohne Gefahr“ gilt Flächen). */
export const farbpunkt = (hex, g = 14) => `<svg class="hw-g1-punkt" viewBox="0 0 20 20" width="${g}" height="${g}" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="${esc(hex)}" stroke="rgba(255,255,255,.35)" stroke-width="1.2"/></svg>`;
/** Chipleiste (G1): umbrechend, aktiver Chip als Akzentfläche mit Doppelkontur. optionen: [[wert, text]]. */
export const chips = (optionen, aktiv, attr, label = '', aus = false, reihe = false) => `<div class="hw-g1-chips${reihe ? ' reihe' : ''}" role="group"${label ? ` aria-label="${esc(label)}"` : ''}>${optionen.map(([w, t]) =>
  `<button type="button" class="hw-g1-chip" aria-pressed="${String(w) === String(aktiv)}" ${attr(w)}${aus ? ' disabled' : ''}>${t}</button>`).join('')}</div>`;

export function zielChips(K, ui) {
  const z = zielgruppenFuerFach(K, ui.fach);
  if (z.length && !z.some((x) => x.id === ui.zielgruppe)) ui.zielgruppe = z[0].id;
  return `<span class="hw-marke hw-feldname">Zielgruppe</span>` + chips(z.map((x) => [x.id, esc(x.name)]), ui.zielgruppe, (w) => `data-a="q24Ziel" data-v="${esc(w)}"`, 'Zielgruppe');
}
export function fachSegmente(ui) {
  return `<div class="hw-g1-fach">${C.seg(FAECHER, ui.fach, (w) => `data-a="q24Fach" data-v="${w}"`).replace('role="group"', 'role="group" aria-label="Abteilung"')}</div>`;
}

/** Kategorien als Abschnitte, darin je Unterkategorie ein Kachelraster. Eine Kategorie ist offen (Antippen des Kopfs). */
export function sortimentBedienung(K, ui, typen, kachel, aktion, gesperrt = new Set()) {
  const erlaubt = new Set(typen.map((t) => t.typ));
  const index = new Map(typen.map((t) => [t.typ, t]));
  let baum = (K.baum ?? []).map((kat) => ({
    ...kat, unterkategorien: (kat.unterkategorien ?? []).map((ast) =>
      ({ ...ast, typen: (ast.typen ?? []).filter((t) => erlaubt.has(t)) }))
      .filter((ast) => ast.typen.length),
  })).filter((kat) => kat.unterkategorien.length);
  // Fallback für später hinzugefügte Typen, falls deren Baum-Index zeitweilig fehlt.
  const erfasst = new Set(baum.flatMap((x) => x.unterkategorien.flatMap((a) => a.typen)));
  const fehlend = typen.filter((t) => !erfasst.has(t.typ));
  if (fehlend.length) baum = [...baum, { id: 'weitere', name: 'Weitere Artikel',
    unterkategorien: [{ id: 'weitere-typen', name: 'Neu im Sortiment', typen: fehlend.map((t) => t.typ) }] }];
  if (!baum.length) return C.leer('Bitte Abteilung oder Zielgruppe wechseln.', 'Keine passenden Artikeltypen');
  if (!baum.some((b) => b.id === ui.baumOffen)) ui.baumOffen = baum[0].id;
  let h = '<div class="hw-g1-baum">';
  for (const kat of baum) {
    const offen = ui.baumOffen === kat.id;
    const zahl = kat.unterkategorien.reduce((n, a) => n + a.typen.length, 0);
    h += `<button type="button" class="hw-g1-kat${offen ? ' an' : ''}" data-a="baumKat" data-v="${esc(kat.id)}" aria-expanded="${offen}"><span>${esc(kat.name)}</span><small>${zahl} Artikel</small><i aria-hidden="true">${offen ? '−' : '+'}</i></button>`;
    if (!offen) continue;
    for (const ast of kat.unterkategorien) {
      if (kat.unterkategorien.length > 1 || ast.name !== kat.name) h += `<span class="hw-marke hw-g1-ast">${esc(ast.name)}</span>`;
      h += '<div class="hw-g1-kacheln">';
      for (const typ of ast.typen) {
        const t = index.get(typ), voll = gesperrt.has(t.kategorie);
        // Q37: im Ast „Anlass“ trägt die Kachel den Anlass, damit der Assistent ihn vorbelegt
        h += `<button type="button" class="hw-g1-kachel hw-kontur${voll ? ' voll' : ''}" data-a="${aktion}" data-v="${esc(typ)}"${kat.id === 'anlass' && ast.anlass ? ` data-anlass="${esc(ast.anlass)}"` : ''} aria-label="${esc(typ)}${voll ? ', Kapazität erreicht' : ''}"><span class="hw-g1-kachelbild" aria-hidden="true">${kachel(typ, 64)}</span><span class="hw-g1-kachelname">${esc(typ)}</span>${voll ? '<small>Platz voll</small>' : ''}</button>`;
      }
      h += '</div>';
    }
  }
  return h + '</div>';
}

/** Teamleistung je Marke als Fähigkeitsskalen (Coffee 28). */
export function teamAufschluesselung(l) {
  if (!l) return '';
  const werte = [['Team', l.team], ['Zielgruppe', l.zielgruppe], ['Trend', l.trend], ['Lieferant', l.lieferant], ['HQ', l.hq]];
  return C.abschnitt('Teamleistung', `${l.wert} / 100`)
    + `<div class="hw-g1-skalen">${werte.map(([name, wert]) => C.skala(name, Number(wert) || 0)).join('')}</div>`
    + C.liste([C.zeile({ was: 'Designteam', wert: `${l.teamgroesse} Designer` }), C.zeile({ was: 'Erfahrung in der Kategorie', wert: `${l.kategorieErfahrung} / 100` })]);
}
