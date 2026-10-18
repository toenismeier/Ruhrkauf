// HQ in der Stadt: Gebäude und Angebote aus hq-beispiel.json stehen als Slot 'slot:hq' im Stadtplan (Nebenlage nahe
// der Einkaufslage). Sitz (Essen) als ganze Stadt und nah, dazu jedes Angebot in seiner Stadt nah mit Banner.
import { THREE, KompaktSammler, setzeLod, entferneKleineSchilder } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { stadtplan, baueStadt, ARCHETYPEN, kartenMarker, zuVermieten, standortMarker } from '../kit/stadt.js';
import { stadtDaten } from '../kit/staedte.js';
import { echterBauer } from '../kit/bauer.js';
import { hqEinplanen, hqMasse, angebotMarker } from '../kit/hq.js';
import { stadtRahmen, ausschnittBauer, sichtFilter, schneideAus } from './_standorte-staedte.js';
import hqStart from '../../hq-beispiel.json';
import umzug from '../../hq-beispiel-umzug.json';

const zahl = (n) => new Intl.NumberFormat('de-DE').format(n);

/** Plan einer Stadt mit ihren Hartwig-Standorten und den HQ-Standorten aus dem JSON. */
function planMitHq(name, hq = hqStart) {
  const s = stadtDaten(name);
  // Stadtplan wie ohne Zentrale, HQ und Angebote danach auf vorhandene Parzellen
  const plan = stadtplan(s.seed, { typ: s.typ, archetyp: s.archetyp, region: s.region, strassenFaktor: 1.6, ...s.extra, standorte: s.standorte });
  hqEinplanen(plan, hq, name);
  const extra = plan.standorte.filter((q) => q.rolle === 'hq');
  return { s, plan, extra };
}
/** Marker: Hartwig-Standorte wie gewohnt, HQ-Gebäude mit rotem „Z“, Angebote mit „Zu vermieten“-Schild. */
function marker(scene, plan, e, gr) {
  const pz = new Map(plan.parzellen.map((p) => [p.id, p]));
  const normal = standortMarker(plan, gr).filter((m) => plan.standorte.find((st) => st.parzelle === m.parzelle)?.rolle !== 'hq');
  for (const m of normal) { const p = pz.get(m.parzelle); if (p) kartenMarker(scene, p, m.art, { hoehe: e.hoehen?.get(p.id) ?? 20, groesse: m.groesse }); }
  for (const st of plan.standorte.filter((q) => q.rolle === 'hq')) {
    const p = pz.get(st.parzelle); if (!p) continue;
    const h = e.hoehen?.get(p.id) ?? 30;
    if (st.angebot) angebotMarker(scene, p.x + p.w / 2, h + 4, p.z + p.d / 2, gr * 1.15);
    else kartenMarker(scene, p, 'hq', { hoehe: h, groesse: gr, farbe: '#d23c32', zeichen: 'Z' });
  }
}
const beschreibung = (st) => {
  const g = st.hq, qm = g.etagen.reduce((a, e) => a + e.qm, 0);
  return st.angebot ? `Angebot ${g.typ}, ${g.etagen.length} Etagen, ${zahl(qm)} m²` : `${g.name}, ${g.etagen.filter((e) => e.gemietet).length}/${g.etagen.length} Etagen gemietet`;
};

function ganzeStadt(name) {
  return {
    titel: `${name} · Sitz der Zentrale · ganze Stadt`,
    bau(S, scene) {
      const { s, plan, extra } = planMitHq(name);
      const T = new KompaktSammler();
      setzeLod('fern');
      let e;
      try { e = baueStadt(T, scene, plan, echterBauer()); T.bauen(scene); S.anzahl = T.anzahl; entferneKleineSchilder(scene); } finally { setzeLod('nah'); }
      marker(scene, plan, e, Math.max(24, plan.breite / 15));
      this.unter = `${ARCHETYPEN[s.archetyp].name} · ${extra.map(beschreibung).join(' · ')}`;
      return stadtRahmen(plan, { hoehen: e.hoehen });
    },
  };
}
/** Nahansicht mit der Kamera auf einem HQ-Standort (Kachel Hochformat wie die Standort-Nahansichten). */
function nah(name, id, zoom = 62, hq = hqStart, zusatz = '') {
  return {
    titel: `${name} · ${id} · nah`,
    bau(S, scene) {
      const { plan } = planMitHq(name, hq);
      const st = plan.standorte.find((q) => q.id === id);
      const p = plan.parzellen.find((q) => q.id === st?.parzelle);
      if (!p) throw new Error(`${id} nicht platziert`);
      const m = hqMasse(st.hq);
      const cx = p.x + p.w - m.w / 2, cz = p.z + p.d - m.d / 2;
      const box = new THREE.Box3(new THREE.Vector3(cx - zoom, 0, cz - zoom), new THREE.Vector3(cx + zoom, 25, cz + zoom));
      const o = { kachel: [960, 1200] };
      const bauer = ausschnittBauer(plan, echterBauer(), box, o);
      const e = baueStadt(S, scene, plan, bauer);
      schneideAus(S, scene, sichtFilter(box, o));
      marker(scene, plan, e, 11);
      this.titel = `${name} · ${st.angebot ? 'Angebot' : st.hq.name} · nah${zusatz}`;
      this.unter = `${beschreibung(st)} · ${m.sockel ? 'Hochhaus auf Flachbau' : `${m.w} × ${m.d} m`} · Parzelle ${p.id}`;
      return box;
    },
  };
}

const hq = hqStart, sitz = hq.sitz;
const eintraegeStadt = [ganzeStadt(sitz)];
const eintraegeNah = [];
for (const g of hq.gebaeude.filter((q) => q.stadt === sitz)) eintraegeNah.push(nah(sitz, g.id));
for (const a of hq.angebote) eintraegeNah.push(nah(a.stadt, a.id));
// Zustand nach Umzug: neues Gebäude am neuen Sitz
for (const g of umzug.gebaeude) eintraegeNah.push(nah(g.stadt, g.id, 62, umzug, ' · nach Umzug'));
window.addEventListener('load', () => setTimeout(() => zeigeKatalog([...eintraegeStadt, ...eintraegeNah], { titel: `HQ in der Stadt: ${sitz} und Angebote`, spalten: 2, kachel: [960, 1200] }), 20));
