// Q01: alternativer Stadtplan aus der OSM-Datei. Keine synthetischen Straßen.
// Nur Essen wird über diesen Weg gebaut; die übrigen Städte behalten stadtplan().
import { viertelEssen, kartenStandort } from './essen.js';

const grenzen = (v, a, b) => Math.min(b, Math.max(a, v));
const hash = (wert) => { let h = 2166136261; for (const c of String(wert)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; };
const rechteck = (pts) => {
  if (!pts?.length) return null;
  const x = pts.map(p => p[0]), z = pts.map(p => p[1]);
  return { x: Math.min(...x), z: Math.min(...z), w: Math.max(...x) - Math.min(...x), d: Math.max(...z) - Math.min(...z) };
};

/**
 * Wandelt metergenaue OSM-Geometrie in das Weltkoordinatensystem des Kits um.
 * Die Polylinien bleiben erhalten, nur eine ganze-Meter-Rasterung am Ende und
 * die Entdichtung sehr naher Stützpunkte finden im Geometriebauer statt.
 * @param {object} karte render/karten/essen.json
 * @param {object} o { seed?, typ?, standorte? }
 */
export function planAusKarte(karte, o = {}) {
  if (!karte || karte.stadt !== 'essen') throw new Error('Q01 Phase 1: ausschließlich Essen hat einen Kartenplan.');
  const radius = Math.ceil(karte.radius_m);
  const breite = radius * 2, tiefe = radius * 2;
  const seed = o.seed ?? 28215; // stabiler Essen-Seed, nicht vom Importzyklus mit staedte.js abhängig
  const punkt = ([x, z]) => [x + radius, z + radius];
  const pz = (x, z) => ({ x: x + radius, z: z + radius });
  const obj = (e) => ({ ...e, punkte: e.punkte?.map(punkt), umriss: e.umriss?.map(punkt) });
  const grundkarte = {
    strassen: karte.strassen.map(obj), gleise: karte.gleise.map(obj), bahnsteige: karte.bahnsteige.map(obj),
    bahnhoefe: karte.bahnhoefe.map(obj), flaechen: karte.flaechen.map(obj), wasser: karte.wasser.map(obj),
    gebaeude: karte.gebaeude.map(obj), bebauung: karte.bebauung.map(obj),
    wahrzeichen: karte.wahrzeichen.map(w => ({ ...w, pos: punkt(w.pos) })),
    quelle: karte.quelle, lizenz: karte.lizenz, radius,
  };
  const plan = {
    seed, typ: o.typ ?? 'metropole', region: 'west', archetyp: 'karte-essen',
    kartenstadt: 'essen', karte: grundkarte, breite, tiefe,
    bloecke: [], parzellen: [], standorte: [], strassen: [], kreuzungen: [],
    diagonalen: [], zwickel: [], umland: [], aussen: null,
    kameraGrenze: { x0: 25, z0: 25, x1: breite - 25, z1: tiefe - 25 },
    einkaufslage: { xF: radius + 90, zF: radius + 185 },
    kern: { i: 1, j: 1 },
    ddr: false,
  };

  // Für saisonale Effekte und den Verkehr werden echte weitgehend achsgerade
  // Straßenabschnitte bereitgestellt. Die sichtbare Geometrie nutzt immer die
  // vollständigen Originalpolylinien, auch an Diagonalen und Kurven.
  for (const [id, s] of grundkarte.strassen.entries()) {
    if (!['haupt', 'neben', 'fuss'].includes(s.klasse)) continue;
    for (let i = 1; i < s.punkte.length; i++) {
      const a = s.punkte[i - 1], b = s.punkte[i], dx = b[0] - a[0], dz = b[1] - a[1];
      const laenge = Math.hypot(dx, dz);
      if (laenge < 12 || Math.min(Math.abs(dx), Math.abs(dz)) > laenge * .18) continue;
      const achse = Math.abs(dx) > Math.abs(dz) ? 'x' : 'z';
      const mitte = achse === 'x' ? (a[1] + b[1]) / 2 : (a[0] + b[0]) / 2;
      plan.strassen.push({ id: 'osm-' + id + '-' + i, achse, mitte,
        von: Math.min(achse === 'x' ? a[0] : a[1], achse === 'x' ? b[0] : b[1]),
        bis: Math.max(achse === 'x' ? a[0] : a[1], achse === 'x' ? b[0] : b[1]),
        typ: s.klasse === 'fuss' ? 'fussgaenger' : s.klasse, breite: s.klasse === 'haupt' ? 17 : 9,
        gehweg: s.klasse === 'fuss' ? 0 : 2.4, bruecke: !!s.bruecke, parken: 0,
      });
    }
  }

  const add = (id, typ, rect, extra = {}) => {
    const p = { id, typ, block: extra.block ?? id, x: rect.x, z: rect.z, w: rect.w, d: rect.d,
      seed: hash(seed + '/' + id), region: 'west', cluster: plan.typ,
      viertel: viertelEssen(rect.x - radius, rect.z - radius), front: ['+z', '+x'],
      seite: 'ecke', ecke: '+x+z', strasse: [], ...extra };
    plan.parzellen.push(p);
    return p;
  };
  // Abgegrenzte, bestehende Bebauung liefert Stadthausparzellen für das Kit.
  // Stichprobe in den Innenvierteln; alle übrigen Originalumrisse werden
  // als vereinfachte Baukörper gezeichnet. Dadurch bleibt die iPhone-Last begrenzt.
  for (let i = 0; i < grundkarte.bebauung.length; i++) {
    const b = grundkarte.bebauung[i], q = rechteck(b.umriss);
    if (!q || q.w < 7 || q.d < 8 || q.w > 54 || q.d > 65) continue;
    const x = q.x + q.w / 2 - radius, z = q.z + q.d / 2 - radius;
    if (Math.abs(x) > 720 || Math.abs(z) > 1050 || hash(i + '/dichte') % 9 !== 0) continue;
    const id = 'osm-haus-' + i;
    b.parzelle = id;  // Renderpfad zeichnet diesen Umriss nicht doppelt
    add(id, 'stadthaus', { x: q.x, z: q.z, w: q.w, d: q.d },
      { block: 'osmblock-' + Math.floor(q.x / 100) + '-' + Math.floor(q.z / 100),
        geschosse: grenzen(Math.round((b.h ?? 15) / 3.3), 2, 6),
        viertel: viertelEssen(x, z), nachbar: null });
  }

  // Die HQ-Einplanung braucht ersetzbare Bestandsblöcke mit mindestens 5 Parzellen.
  // Die Reserveflächen liegen in der wirklichen Nachkriegs-Bürostruktur, nicht
  // auf der Fußgängerzone, den Bahnsteigen oder den Hand-Wahrzeichen.
  for (let j = 0; j < 4; j++) for (let i = 0; i < 3; i++) {
    const x = radius + 530 + i * 118, z = radius + 70 + j * 116;
    const id = 'osm-hq-block-' + i + '-' + j, w = 106, d = 96;
    const b = { id, art: 'bebaut', x, z, w, d, parzellen: [] };
    plan.bloecke.push(b);
    for (let k = 0; k < 6; k++) {
      const q = add(id + '-p' + k, 'stadthaus',
        { x: x + 4 + (k % 3) * 33, z: z + 4 + Math.floor(k / 3) * 43, w: 30, d: 38 },
        { block: id, geschosse: 5, viertel: 'nachkrieg' });
      b.parzellen.push(q.id);
    }
  }

  // Orte der Engine bleiben identitätsstabil (IDs, Rolle, Status); nur
  // die Grafiklage wird aus den echten Einkaufsachsen bestimmt.
  const verwendet = new Map();
  for (const st of o.standorte ?? []) {
    const lage = st.lage === '1a' ? '1a' : st.lage === 'center' ? 'center' : st.lage === 'rand' ? 'rand' : 'b';
    const nr = verwendet.get(lage) ?? 0; verwendet.set(lage, nr + 1);
    const [x, z] = kartenStandort(lage, nr);
    const w = Math.max(20, st.w ?? Math.sqrt(st.grundflaecheQm || 1600));
    const d = Math.max(18, st.d ?? Math.sqrt(st.grundflaecheQm || 1600));
    const typ = ({ warenhaus: 'slot:warenhaus', premium: 'slot:premium', sport: 'slot:sport',
      wettbewerber: 'slot:wettbewerber', wettbewerber_reserve: 'slot:wettbewerber_reserve',
      schwester: 'slot:schwester', outlet: 'slot:outlet' })[st.rolle] ?? 'slot:warenhaus';
    const rect = { x: grenzen(radius + x - w / 2, 0, breite - w), z: grenzen(radius + z - d / 2, 0, tiefe - d), w, d };
    const p = add('osm-standort-' + st.id, typ, rect, { standort: st, lage, viertel: viertelEssen(x, z) });
    plan.bloecke.push({ id: p.id, art: 'standort', ...rect, parzellen: [p.id] });
    plan.standorte.push({ ...st, parzelle: p.id, block: p.id, typ, lage });
  }

  const [hx, hz] = punkt([185, 365]);
  const bhf = add('osm-essen-hbf', 'slot:bahnhof', { x: hx - 50, z: hz - 37, w: 100, d: 70 });
  plan.bloecke.push({ id: bhf.id, art: 'bahnhof', x: bhf.x, z: bhf.z, w: bhf.w, d: bhf.d, parzellen: [bhf.id] });
  return plan;
}
