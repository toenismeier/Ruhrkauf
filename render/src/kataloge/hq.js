// HQ-Bürogebäude außen: sechs Typen, jeweils von Hartwig gemietet (beleuchtete Etagen, Zentrale-Schild) und frei
// (Angebot mit „Zu vermieten“-Banner). Eingabe: hq-beispiel.json (Format hqFuerGrafik der Engine).
import { zeigeKatalog } from '../kit/katalog.js';
import { sockel } from '../kit/basis.js';
import { hqGebaeude, hqMasse, ABTEILUNGEN } from '../kit/hq.js';
import hq from '../../hq-beispiel.json';
import umzug from '../../hq-beispiel-umzug.json';

const TYPEN = { altbau: 'Altbau (Kontorhaus um 1905)', nachkrieg: 'Nachkriegsbau (Verwaltung 1960er)', buero70: 'Bürobau 1970er (Waschbeton)', glas: 'Glasturm', loft: 'Loft (Backsteinfabrik)', campus: 'Campus (Neubau)' };
const alle = [...hq.gebaeude, ...hq.angebote];
// Typen, die im JSON fehlen, nehmen die Etagen des Eintrags mit der für den Typ üblichsten Etagenzahl
const ZIEL = { altbau: 4, nachkrieg: 8, buero70: 6, glas: 14, loft: 4, campus: 5 };
function basis(typ, liste) {
  const g = liste.find((q) => q.typ === typ);
  if (g) return g;
  const q = [...alle].sort((a, b) => Math.abs(a.etagen.length - ZIEL[typ]) - Math.abs(b.etagen.length - ZIEL[typ]))[0];
  return { ...q, id: `${q.id}-${typ}`, typ, ersatz: true };
}
/** Von Hartwig gemietete Fassung: Gebäude aus dem JSON, sonst ein Eintrag mit gemieteten Etagen (oberste frei). */
function gemietet(typ) {
  const g = basis(typ, hq.gebaeude);
  if ('gemietet' in g.etagen[0] && !g.ersatz) return g;
  const n = g.etagen.length;
  return { id: g.id + '-gemietet', name: 'Zentrale ' + g.stadt, stadt: g.stadt, typ, etagen: g.etagen.map((e, k) => ({ nr: e.nr, qm: e.qm, gemietet: k < n - 1, abteilungen: k < n - 1 ? [{ id: Object.keys(ABTEILUNGEN)[k % 10], fte: 30, stufe: 1 }] : [] })) };
}
/** Freie Fassung: Angebot aus dem JSON, sonst der Eintrag ohne Belegung. */
function frei(typ) {
  const g = basis(typ, hq.angebote);
  if (!('gemietet' in g.etagen[0]) && !g.ersatz) return g;
  return { id: g.id + '-frei', stadt: g.stadt, typ, etagen: g.etagen.map(({ nr, qm }) => ({ nr, qm })) };
}
const eintraege = [];
for (const typ of Object.keys(TYPEN)) {
  for (const [art, g] of [['gemietet', gemietet(typ)], ['frei', frei(typ)]]) {
    eintraege.push({
      titel: `${TYPEN[typ]} · ${art === 'gemietet' ? 'Hartwig' : 'zu vermieten'}`,
      bau(S, scene) {
        const m = hqMasse(g);
        sockel(S, 0, 0, m.w, m.d, 5);
        const n0 = S.anzahl;
        const e = hqGebaeude(S, scene, g, {});
        const miet = (g.etagen ?? []).filter((q) => q.gemietet).length;
        this.unter = `${g.stadt} · ${m.w} × ${m.d} m · ${g.etagen.length} Etagen · ${art === 'gemietet' ? `${miet} gemietet` : 'Angebot'} · ${S.anzahl - n0} Teile · ${e.hoehe.toFixed(1)} m`;
      },
    });
  }
}
// Alle Gebäude und Angebote aus dem JSON in Originalbelegung (Hochhaus auf Flachbau, wenn die Etagen das hergeben),
// dazu der Zustand nach Umzug (hq-beispiel-umzug.json)
for (const g of [...alle, ...umzug.gebaeude.map((q) => ({ ...q, name: q.name + ' (nach Umzug)' })), ...umzug.angebote]) {
  const m = hqMasse(g);
  eintraege.push({
    titel: `JSON · ${g.name ?? 'Angebot ' + g.stadt} · ${TYPEN[g.typ]}`,
    bau(S, scene) {
      sockel(S, 0, 0, m.w, m.d, 5);
      const n0 = S.anzahl, e = hqGebaeude(S, scene, g, {});
      const miet = g.etagen.filter((q) => q.gemietet).length, leer = g.etagen.filter((q) => q.gemietet && !q.abteilungen.length).length;
      const koerper = m.sockel ? `Flachbau ${m.w} × ${m.d} m (${m.sockel}) + Turm ${m.turm.w} × ${m.turm.d} m (${m.turm.n})` : `${m.w} × ${m.d} m`;
      this.unter = `${g.stadt} · ${koerper} · ${g.etagen.length} Etagen à ${zahl(g.etagen[0].qm)} m² · ${'gemietet' in g.etagen[0] ? `${miet} gemietet, ${leer} leer` : 'Angebot'} · ${S.anzahl - n0} Teile`;
    },
  });
}
const zahl = (n) => new Intl.NumberFormat('de-DE').format(n);
zeigeKatalog(eintraege, { titel: 'HQ-Bürogebäude: sechs Typen, gemietet und frei', spalten: 4, kachel: [640, 640] });
