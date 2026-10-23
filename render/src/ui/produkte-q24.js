/* Q24: rein datengetriebene Sortimentsnavigation, ohne fest codierte Artikeltypen.
 * Der Engine-Katalog kann durch Q27 bis Q29 beliebig wachsen. */
import { esc } from './format.js';

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
export function zielChips(K, ui) {
  const z = zielgruppenFuerFach(K, ui.fach);
  if (z.length && !z.some((x) => x.id === ui.zielgruppe)) ui.zielgruppe = z[0].id;
  return '<div class="q24-chips" aria-label="Zielgruppe">' + z.map((x) =>
    '<button data-a="q24Ziel" data-v="' + esc(x.id) + '" aria-pressed="' + (ui.zielgruppe === x.id) +
    '" class="' + (ui.zielgruppe === x.id ? 'an' : '') + '">' + esc(x.name) + '</button>').join('') + '</div>';
}
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
  if (!baum.length) return '<div class="olief">Keine passenden Artikeltypen. Bitte Abteilung oder Zielgruppe wechseln.</div>';
  if (!baum.some((b) => b.id === ui.baumOffen)) { ui.baumOffen = baum[0].id; ui.astOffen = baum[0].unterkategorien[0].id; }
  let h = '<div class="q11baum q24-baum">';
  for (const kat of baum) {
    const offen = ui.baumOffen === kat.id;
    const zahl = kat.unterkategorien.reduce((n, a) => n + a.typen.length, 0);
    h += '<button class="q11kategorie ' + (offen ? 'an' : '') + '" data-a="baumKat" data-v="' + esc(kat.id) +
      '" aria-expanded="' + offen + '"><span>' + esc(kat.name) + '</span><small>' + zahl +
      ' Artikel</small><b aria-hidden="true">' + (offen ? '−' : '+') + '</b></button>';
    if (!offen) continue;
    for (const ast of kat.unterkategorien) {
      const astOffen = ui.astOffen === ast.id;
      h += '<button class="q11ast ' + (astOffen ? 'an' : '') + '" data-a="baumAst" data-v="' + esc(ast.id) +
        '" aria-expanded="' + astOffen + '"><span>' + esc(ast.name) + '</span><small>' + ast.typen.length +
        ' Artikel' + '</small><b aria-hidden="true">' + (astOffen ? '−' : '+') + '</b></button>';
      if (!astOffen) continue;
      h += '<div class="typkacheln q11typen q24-typen">';
      for (const typ of ast.typen) {
        const t = index.get(typ), voll = gesperrt.has(t.kategorie);
        h += '<button class="' + (voll ? 'voll' : '') + '" data-a="' + aktion + '" data-v="' + esc(typ) +
          '" aria-label="' + esc(typ) + ' ansehen">' + kachel(typ, 76) + '<span>' + esc(typ) + '</span>' +
          (voll ? '<small>Kapazität erreicht</small>' : '') + '</button>';
      }
      h += '</div>';
    }
  }
  return h + '</div>';
}
export function fachSegmente(ui) {
  return '<div class="q24-seg" role="group" aria-label="Abteilung">' + FAECHER.map(([id, name]) =>
    '<button data-a="q24Fach" data-v="' + id + '" aria-pressed="' + (ui.fach === id) +
    '" class="' + (ui.fach === id ? 'an' : '') + '">' + name + '</button>').join('') + '</div>';
}
export function teamAufschluesselung(l) {
  if (!l) return '';
  const werte = [['Team', l.team], ['Zielgruppe', l.zielgruppe], ['Trend', l.trend],
    ['Lieferant', l.lieferant], ['HQ', l.hq]];
  return '<div class="q24-leistung"><div class="q24-leistungstitel">Teamleistung je Marke <b>' +
    l.wert + ' / 100</b></div><div class="q24-werte">' +
    werte.map(([name, wert]) => '<span>' + name + ' <b>' + wert + '</b></span>').join('') +
    '</div><small>Designteam: ' + l.teamgroesse + ' Designer' +
    ' · Erfahrung in der Kategorie ' + l.kategorieErfahrung + ' / 100</small></div>';
}
