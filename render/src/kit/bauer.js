// Verbindet den Stadtplan mit den echten Generatoren.
//
// Austauschbare Stellen (vorläufig, werden später durch eigene Module ersetzt):
//   ERSATZ.sport(S, scene, p, haus)      → Hartwig Sport im Slot 'slot:sport'
//   ERSATZ.wettbewerber(S, scene, p)     → Wettbewerber-Kaufhaus im Slot 'slot:wettbewerber'
// Alternativ echterBauer({ sport, wettbewerber }) mit eigenen Funktionen gleicher Signatur aufrufen.
//
// Plugin-Registry (für Archetyp- und Regionsmodule, siehe src/kit/archetypen/README.md):
//   registriereSlots({ 'slot:x': (S, scene, p) => ({ hoehe }) })   zusätzliche oder ersetzende Slot-Bauer
//   registriereStilProfil(name, fn)                                Stilwahl der normalen Stadthäuser (p.stilProfil
//                                                                  bzw. 'region:<region>'), fn(p, nachbar, B) →
//                                                                  null | { stil, geschosse, region?, … } | { bau(S, scene, q) }
import { rng, waehle, zw, FARBEN, heller, dunkler, fensterRaster, gesims, dachProfil } from './basis.js';
import { zufallsStadthaus, stadthaus } from './stadthaeuser.js';
import { wahlGewichtet } from './stadtplan.js';
import { warenhaus, masse } from './warenhaus.js';
import { warenhausVielfalt } from './warenhaus-vielfalt.js';
import { SLOTS } from './sonderbauten.js';
import { sporthaus, masseSport } from './sporthaus.js';
import { outlet, masseOutlet } from './outlet.js';
import { schwesterhaus, masseSchwester } from './schwesterhaus.js';
import schwesterHauser from '../../haeuser-schwester.json';
import haeuserOutlet from '../../haeuser-outlet.json';
import { premiumhaus, premiumMasse } from './premium.js';
import { wettbewerber as wettbewerberBau } from './wettbewerber.js';
import haeuser from '../../haeuser.json';

const REGION = { nord: 'Nord', ost: 'Ost', west: 'West', mitte: 'Mitte', sued: 'Süd' };
const regionVon = (p) => REGION[p.region] ?? p.region ?? 'Mitte';
const regionLang = { Nord: 'nord', Ost: 'ost', West: 'west', Mitte: 'mitte', 'Süd': 'sued' };
const HAUS = new Map(haeuser.map((h) => [h.id, h]));
/** Gleiche Zuordnung für Stadtplan, Bauer und Einzelhauskatalog. */
export const WARENHAUS_VARIANTEN = warenhausVielfalt(haeuser);
const SCHWESTER = new Map(schwesterHauser.map((h) => [h.id, h]));
const OUTLETS = new Map(haeuserOutlet.map((h) => [h.id, h]));

/**
 * Belegte Grundfläche eines Hauses aus haeuser.json (wie warenhaus() sie baut): Center-Häuser bekommen links
 * einen Mall-Flügel. Nur hier nachgebildet, damit Stadtplan-Slots passend groß werden.
 */
export function fussabdruck(haus, familie = null) {
  if (haus.format === 'schwester') { const m = masseSchwester(haus); return { w: m.w, d: m.d, mall: 0 }; }
  if (haus.format === 'outlet') { const m = masseOutlet(haus); return { w: m.w, d: m.d, mall: 0 }; }
  if (haus.klasse === 'premium') { const m = premiumMasse(haus); return { w: m.w, d: m.d, mall: 0 }; }
  if (haus.format === 'sport' && familie !== 7) { const ms = masseSport(haus); return { w: ms.w, d: ms.d, mall: 0 }; }
  const m = masse(haus);
  const fam = familie ?? (haus.format === 'sport' ? 7 : haus.lage === 'center' ? 6 : 0);
  const M = fam === 6 ? Math.max(40, Math.round((m.w * 0.85) / 5) * 5) : fam === 7 && haus.lage === 'center' ? Math.max(25, Math.round((m.w * 0.5) / 5) * 5) : 0;
  return { w: m.w + M, d: m.d, mall: M };
}

/** Wählt ein Engine-Haus, das in den Slot passt (oder nimmt das vorgegebene). */
export function passendesHaus(slot, wunschId) {
  if (wunschId) return haeuser.find((h) => h.id === wunschId);
  const region = regionVon(slot);
  const kandidaten = haeuser
    .filter((h) => h.format === 'warenhaus' && h.lage !== 'center')
    .map((h) => ({ h, m: masse(h) }))
    .filter(({ m }) => m.w <= slot.w && m.d <= slot.d)
    .map((k) => ({ ...k, punkte: k.m.w * k.m.d * (k.h.cluster === slot.cluster ? 1.4 : 1) * (regionLang[region] && k.h.stadt ? 1 : 1) }))
    .sort((a, b) => b.punkte - a.punkte);
  // Aus allen Häusern, die den Slot mindestens zu 55 % füllen, per Seed wählen (alle Fassadenfamilien kommen vor)
  const flaeche = slot.w * slot.d;
  const gross = kandidaten.filter((k) => k.m.w * k.m.d >= 0.55 * flaeche);
  const pool = gross.length >= 4 ? gross : kandidaten.slice(0, 12);
  const i = Math.floor(((Math.imul((slot.seed ?? 1) >>> 0, 2654435761) >>> 0) / 4294967296) * pool.length);
  return (pool[i] ?? { h: haeuser[0] }).h;
}

/** Ursprung eines Baus der Größe W × D im Slot p nach p.ecke (block/frei = mittig bzw. hinten). */
function imSlot(p, W, D) {
  const ecke = p.ecke ?? '+x+z';
  if (ecke === 'block') return { x: p.x + Math.max(0, (p.w - W) / 2), z: p.z + Math.max(0, (p.d - D) / 2) };
  return { x: ecke.includes('+x') ? p.x + p.w - W : p.x, z: ecke.includes('+z') ? p.z + p.d - D : p.z };
}

// ====================================================================================
// AUSTAUSCHBAR: Hartwig Sport (vorläufig über warenhaus() mit Familie 7)
// ====================================================================================
export function sporthausVorlaeufig(S, scene, p, haus) {
  const f = fussabdruck(haus, 7);
  const { x, z } = imSlot(p, f.w, f.d);
  return warenhaus(S, scene, haus, { x, z, familie: 7, status: p.status });
}

// ====================================================================================
// AUSTAUSCHBAR: Wettbewerber-Kaufhaus (vorläufig neutraler großer Block, ohne Marke)
// ====================================================================================
export function wettbewerberVorlaeufig(S, scene, p) {
  const r = rng((p.seed ?? 1) + 77);
  const W = p.standort?.w ? Math.min(p.w, p.standort.w) : p.w, D = p.standort?.d ? Math.min(p.d, p.standort.d) : p.d;
  const { x, z } = imSlot(p, W, D);
  const geschosse = p.cluster === 'metropole' ? Math.round(zw(r, 5, 7)) : p.cluster === 'mittelstadt' ? Math.round(zw(r, 3, 4)) : Math.round(zw(r, 4, 6));
  const eg = 5.5, gh = 4.2, H = eg + geschosse * gh;
  const stil = waehle(r, ['stein', 'raster', 'glas']);
  const haut = stil === 'stein' ? waehle(r, ['#e4d8c4', '#ddd0bb', '#e9e1d2']) : stil === 'raster' ? waehle(r, ['#d8dcdf', '#cfd5d9', '#e2e2dc']) : waehle(r, ['#c9d3d9', '#bfcad1']);
  const hell = heller(haut, 0.05), dunkel = dunkler(haut, 0.12);
  // Sockel mit Schaufenstern, Korpus, Gesims, Technik auf dem Dach
  S.quader(x + 0.6, 0, z + 0.6, x + W - 0.6, eg, z + D - 0.6, '#3e4d58');
  S.quader(x, eg, z, x + W, H, z + D, haut);
  for (let u = x + 3; u < x + W - 1; u += 6) S.box(0.7, eg, 0.7, u, eg / 2, z + D - 0.35, hell);
  for (let u = z + 3; u < z + D - 1; u += 6) S.box(0.7, eg, 0.7, x + W - 0.35, eg / 2, u, hell);
  S.box(W + 2.4, 0.5, 2.6, x + W / 2 + 0.6, eg - 0.2, z + D + 1.0, '#eeeae2');
  S.box(2.6, 0.5, D + 2.4, x + W + 1.0, eg - 0.2, z + D / 2 + 0.6, '#eeeae2');
  if (stil === 'glas') {
    for (let k = 0; k < geschosse; k++) {
      const y = eg + k * gh + gh * 0.5;
      S.box(W - 2, gh * 0.62, 0.12, x + W / 2, y, z + D + 0.03, FARBEN.glas);
      S.box(0.12, gh * 0.62, D - 2, x + W + 0.03, y, z + D / 2, FARBEN.glas);
    }
    for (let u = x + 4; u < x + W - 1; u += 4) S.box(0.3, H - eg, 0.25, u, eg + (H - eg) / 2, z + D + 0.08, hell);
    for (let u = z + 4; u < z + D - 1; u += 4) S.box(0.25, H - eg, 0.3, x + W + 0.08, eg + (H - eg) / 2, u, hell);
  } else if (stil === 'raster') {
    fensterRaster(S, x, z, W, D, '+z', { y0: eg, geschosse, gh, raster: 2.6, fw: 1.9, fh: 1.4, farbe: FARBEN.glas });
    fensterRaster(S, x, z, W, D, '+x', { y0: eg, geschosse, gh, raster: 2.6, fw: 1.9, fh: 1.4, farbe: FARBEN.glas });
    for (let k = 1; k < geschosse; k++) gesims(S, x, z, W, D, eg + k * gh, 0.25, 0.08, hell);
  } else {
    fensterRaster(S, x, z, W, D, '+z', { y0: eg, geschosse, gh, raster: 3.4, fw: 1.5, fh: 2.4, sims: hell, rahmen: hell });
    fensterRaster(S, x, z, W, D, '+x', { y0: eg, geschosse, gh, raster: 3.4, fw: 1.5, fh: 2.4, sims: hell });
    for (let u = x + 6.8; u < x + W - 2; u += 6.8) S.box(0.8, H - eg, 0.4, u, eg + (H - eg) / 2, z + D + 0.15, hell);
  }
  gesims(S, x, z, W, D, eg, 0.4, 0.15, hell);
  gesims(S, x, z, W, D, H, 0.9, 0.45, dunkel);
  S.quader(x + W * 0.2, H + 0.4, z + D * 0.2, x + W * 0.7, H + 3.4, z + D * 0.65, '#b6b2aa');
  for (let u = x + 4; u < x + W - 4; u += 7) S.box(2.4, 1.4, 2.4, u, H + 1.1, z + D - 4, '#c3c0b9');
  // neutrales Leuchtband ohne Marke an der Ecke
  S.box(Math.min(16, W * 0.4), 1.6, 0.3, x + W - Math.min(16, W * 0.4) / 2 - 3, H - 2, z + D + 0.2, '#5d6870');
  S.box(0.3, 1.6, Math.min(14, D * 0.4), x + W + 0.2, H - 2, z + D - Math.min(14, D * 0.4) / 2 - 3, '#5d6870');
  return { hoehe: H + 3.4, w: W, d: D };
}

export function sportEcht(S, scene, p, haus) {
  const f = fussabdruck(haus);
  const { x, z } = imSlot(p, f.w, f.d);
  return sporthaus(S, scene, haus, { x, z, ...p.zustand });
}
export function wettbewerberEcht(S, scene, p) {
  const W = p.standort?.w ? Math.min(p.w, p.standort.w) : p.w, D = p.standort?.d ? Math.min(p.d, p.standort.d) : p.d;
  const { x, z } = imSlot(p, W, D);
  return wettbewerberBau(S, scene, { x, z, w: W, d: D, seed: p.seed, art: p.standort?.art, name: p.standort?.name, form: p.standort?.form, region: p.region });
}

export function schwesterEcht(S, scene, p) {
  const h = SCHWESTER.get(p.standort?.id);
  if (!h) return { hoehe: 0 };
  const m = masseSchwester(h), pos = imSlot(p, m.w, m.d);
  p.haus = h;
  return schwesterhaus(S, scene, h, { ...pos, passanten: true });
}
export const ERSATZ = { sport: sportEcht, wettbewerber: wettbewerberEcht, schwester: schwesterEcht };

// ====================================================================================
// Plugin-Registry
// ====================================================================================
const SLOT_PLUGINS = new Map();
const STILPROFILE = new Map();
/** Zusätzliche Slot-Bauer: { 'slot:typ': (S, scene, p) => ({ hoehe }) }. Spätere Registrierung gewinnt. */
export function registriereSlots(map) { for (const [typ, f] of Object.entries(map)) SLOT_PLUGINS.set(typ, f); }
/**
 * Stilprofil für normale Stadthäuser. Greift für Parzellen mit p.stilProfil === name; der Name 'region:<region>'
 * (z. B. 'region:nord') greift für alle Parzellen dieser Region ohne eigenes Profil.
 * fn(p, nachbar, B): null → Standardhaus | { stil, geschosse, region?, … } → stadthaus() | { bau(S, scene, q) } → eigener Bau.
 */
export function registriereStilProfil(name, fn) { STILPROFILE.set(name, fn); }
/** Hilfen für Stilprofile (drittes Argument). */
export const BAU_HILFE = { stadthaus, zufallsStadthaus, rng, waehle, zw, wahlGewichtet, heller, dunkler };

/** Mall-Verbinder zwischen zwei Mietern eines Einkaufszentrums: verglaste Ladenpassage mit Oberlicht. */
function centerPassage(S, scene, p) {
  const { x, z, w, d } = p;
  const H = 9.5;
  S.quader(x, 0, z, x + w, H, z + d, '#e4e0d6');
  S.quader(x + 0.3, 0.3, z + d - 0.4, x + w - 0.3, H - 2.2, z + d + 0.05, FARBEN.glas);
  for (let u = x + 1.2; u < x + w - 0.6; u += 2.2) S.box(0.14, H - 2.4, 0.2, u, (H - 2.4) / 2 + 0.3, z + d + 0.08, '#f2f1ec');
  S.box(w, 0.3, 0.3, x + w / 2, 4.6, z + d + 0.1, '#f2f1ec');
  S.box(w + 1.6, 0.6, 3.2, x + w / 2, H - 2.0, z + d + 1.4, '#f2f1ec');
  gesims(S, x, z, w, d, H, 0.6, 0.3, '#cfcac0');
  const g = dachProfil(d - 2, Math.max(3, w - 2), 2.4, 0.4, 'z'); g.translate(x + w / 2, H + 0.3, z + d / 2); S.add(g, '#9fc3cf');
  return { hoehe: H + 2.7 };
}

/**
 * Hofgebäude (GESTALTUNG.md: Hof weitgehend verdeckt): flacher Werkstatt- und Lagerbau, zwei Geschosse, Flachdach mit
 * Oberlichtern, Fensterband zu den sichtbaren Seiten. Füllt große Höfe, damit kein leeres Pflaster sichtbar bleibt.
 */
function hofbau(S, p) {
  const r = rng(((p.seed ?? 1) * 31 + 5) >>> 0);
  const { x, z, w, d } = p, H = 7.2;
  const wand = waehle(r, ['#c9c2b5', '#bfb8ab', '#b9a48e', '#a86a52', '#cfc9be']);
  S.quader(x, 0, z, x + w, H, z + d, wand);
  fensterRaster(S, x, z, w, d, '+z', { y0: 0.8, geschosse: 2, gh: 3.1, raster: 3.2, fw: 1.8, fh: 1.3, farbe: FARBEN.glas });
  fensterRaster(S, x, z, w, d, '+x', { y0: 0.8, geschosse: 2, gh: 3.1, raster: 3.2, fw: 1.8, fh: 1.3, farbe: FARBEN.glas });
  gesims(S, x, z, w, d, H, 0.35, 0.25, dunkler(wand, 0.15));
  S.quader(x + 0.4, H, z + 0.4, x + w - 0.4, H + 0.2, z + d - 0.4, waehle(r, ['#8c8984', '#85827c', '#918d86']));
  // wenige, dunkle Oberlichter (keine hellen Lichtbänder neben Steildächern)
  if (r() < 0.5) for (let u = x + 6; u < x + w - 6; u += 12) S.quader(u, H + 0.2, z + d * 0.35, u + 2, H + 0.7, z + d * 0.65, '#6f8189');
  return { hoehe: H + 1, geschosse: 2, stil: 'hofbau' };
}

export function echterBauer(o = {}) {
  const sport = o.sport ?? ERSATZ.sport, wettbewerber = o.wettbewerber ?? ERSATZ.wettbewerber;
  const zustandFuer = (h) => (typeof o.zustand === 'function' ? o.zustand(h) : o.zustand?.[h?.id]) ?? (o.status ? { status: o.status } : {});
  const gebaut = new Map(); // Parzellen-Id → { stil, farbe, geschosse } für die Nachbarlogik
  // GESTALTUNG.md: gleichmäßige Traufhöhe je Block. Das erste Haus eines Blocks setzt die Geschosszahl, die übrigen
  // übernehmen sie meist genau (70 %), sonst um ein Geschoss abweichend; Eckhäuser dürfen ein Geschoss höher sein.
  const traufe = new Map();   // Block-Id → Geschosse
  const reihen = new Map();   // Blockseite (p.reihe) → { stil, dach }
  const harmonisiere = (g, p, eck) => {
    const t = traufe.get(p.block);
    if (!t || !g) return g;
    const r = rng(((p.seed ?? 1) * 7 + 13) >>> 0), x = r();
    if (eck && x < 0.4) return Math.min(8, t + 1);
    if (x < 0.85) return t;
    return Math.max(2, Math.min(8, t + (g > t ? 1 : g < t ? -1 : r() < 0.5 ? 1 : -1)));
  };
  // Hartwig soll herausragen: Nachbarn im Block des Warenhauses höchstens vier Geschosse (p.hartwigBlock aus dem Plan)
  const deckel = (g, p) => (p.hartwigBlock && g ? Math.min(g, 4) : g);
  const haus = (S, scene, p, eck) => {
    const n = p.nachbar ? gebaut.get(p.nachbar) : undefined;
    const nurX = p.front?.includes('+x') && !p.front?.includes('+z');
    const q = { x: p.x, z: p.z, w: p.w, d: p.d, seed: p.seed, eck, region: regionVon(p), cluster: p.cluster, nachbar: n, strasse: nurX ? '+x' : '+z', seite: p.anbau ? 'nachbar' : 'frei', traufe: traufe.get(p.block) };
    let e = null;
    const prof = (p.stilProfil && STILPROFILE.get(p.stilProfil)) || STILPROFILE.get('region:' + p.region);
    let w = prof ? prof(p, n, BAU_HILFE) : null;
    // GESTALTUNG.md: je Blockseite ein Bautyp mit gleicher Dachform (das erste Haus der Reihe setzt beides), Eckhäuser frei
    const ri = !eck && p.typ === 'stadthaus' && p.reihe ? reihen.get(p.reihe) : null;
    const rr = rng(((p.seed ?? 1) * 11 + 3) >>> 0);
    const gleich = ri && rr() < 0.85;
    if (gleich && w && !w.bau && ri.stil && w.stil !== ri.stil) w = { ...w, stil: ri.stil };
    if (gleich) { q.dachWunsch = ri.dach; if (!w) q.stilWunsch = ri.stil; }
    // Hofgebäude (p.hofbau): flach, zwei Geschosse, ohne Stilprofil
    const hofG = (g) => (p.hofbau ? 2 : p.typ === 'hofhaus' ? Math.max(2, Math.min(g, (traufe.get(p.block) ?? 4) - 1)) : deckel(harmonisiere(g, p, eck), p));
    if (p.hofbau) e = hofbau(S, p);
    else if (w?.bau) e = w.bau(S, scene, q);
    else if (w) e = stadthaus(S, scene, { ...q, vermeideFarbe: n?.farbe, ...w, geschosse: hofG(w.geschosse) });
    if (!e) e = zufallsStadthaus(S, scene, { ...q, harmonisiere: hofG });
    gebaut.set(p.id, { stil: e.stil, farbe: e.farbe, geschosse: e.geschosse });
    if (!eck && p.typ === 'stadthaus' && p.reihe && !reihen.has(p.reihe) && e.stil) reihen.set(p.reihe, { stil: e.stil, dach: e.dach });
    if (!traufe.has(p.block) && e.geschosse && p.typ !== 'hofhaus') traufe.set(p.block, e.geschosse);
    return e;
  };
  const slots = {};
  for (const [typ, f] of Object.entries(SLOTS)) slots[typ] = (S, scene, p) => f(S, scene, { ...p, region: p.region });
  slots['slot:center_passage'] = centerPassage;
  // Registrierte Slot-Bauer (Archetyp- und Regionsmodule). Kennt ein Bauer eine Variante nicht (Ausnahme vor der
  // ersten Geometrie), entscheidet er selbst: zweiter Versuch ohne p.variante.
  for (const [typ, f] of SLOT_PLUGINS) slots[typ] = (S, scene, p) => {
    const n = S.anzahl;
    try { return f(S, scene, p); } catch (err) {
      if (p.variante === undefined || S.anzahl !== n) throw err;
      return f(S, scene, { ...p, variante: undefined });
    }
  };
  return {
    stadthaus: (S, scene, p) => (p.leer ? { hoehe: 0 } : haus(S, scene, p, false)),
    hofhaus: (S, scene, p) => haus(S, scene, p, false),
    eck: (S, scene, p) => haus(S, scene, p, true),
    ...slots,
    'slot:warenhaus': (S, scene, p) => {
      // Mit Standort: genau dieses Haus aus haeuser.json, sonst ein passendes per Seed
      const h0 = (p.standort?.id && HAUS.get(p.standort.id)) || passendesHaus(p, o.warenhausId);
      const variant = WARENHAUS_VARIANTEN.get(h0.id);
      const f = fussabdruck(h0, variant?.familie);
      const { x, z } = imSlot(p, f.w, f.d);
      if (h0.klasse === 'premium') { p.haus = h0; return premiumhaus(S, scene, h0, { x, z, ...zustandFuer(h0) }); }
      // Q21: Der gleiche Bau wie im Stadtplan, unabhängig von Zeichenreihenfolge.
      const h = variant ? { ...h0, fassade: variant.fassade } : h0;
      const e = warenhaus(S, scene, h, { x, z, familie: variant?.familie, ...zustandFuer(h0) });
      p.haus = h;
      return e;
    },
    'slot:premium': (S, scene, p) => {
      const h = HAUS.get(p.standort?.id) ?? haeuser.find((q) => q.klasse === 'premium' && q.stadt === p.standort?.stadt);
      if (!h) return { hoehe: 0 };
      const f = fussabdruck(h), { x, z } = imSlot(p, f.w, f.d);
      p.haus = h;
      return premiumhaus(S, scene, h, { x, z, ...zustandFuer(h) });
    },
    'slot:sport': (S, scene, p) => {
      const h = HAUS.get(p.standort?.id) ?? haeuser.find((q) => q.format === 'sport');
      p.haus = h;
      return sport(S, scene, { ...p, zustand: zustandFuer(h) }, h);
    },
    'slot:wettbewerber': (S, scene, p) => wettbewerber(S, scene, p),
    'slot:schwester': (S, scene, p) => ERSATZ.schwester(S, scene, p),
    'slot:outlet': (S, scene, p) => {
      const h = OUTLETS.get(p.standort?.id);
      if (!h) return { hoehe: 0 };
      const f = fussabdruck(h), { x, z } = imSlot(p, f.w, f.d);
      p.haus = h;
      return outlet(S, scene, h, { x, z, ...zustandFuer(h) });
    },
  };
}
