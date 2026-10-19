// Stadtplanung für Turnaround-Tycoon: reine Daten, keine Geometrie. Wird von stadt.js re-exportiert.
//
// Grundidee „Bänder“: Die Karte besteht aus Reihen (Bänder entlang x, getrennt durch durchgehende x-Linien).
// Innerhalb jeder Reihe liegen die z-Straßen an eigenen Positionen: im Raster fluchten sie, in Altstädten
// sind sie versetzt (T-Kreuzungen, Versprünge), zusätzliche Gassen werden eingeschoben. Flächen (Wasser, Park,
// Markt, Schloss …) belegen Rechtecke aus Nennzellen (i, j); an ihren Rändern fluchten die Straßen.
//
// =====================================================================================================
// PLUGIN-REGISTRY: eigene Stadttypen ohne Änderung dieser Datei (Kurzfassung: src/kit/archetypen/README.md)
// =====================================================================================================
// Ein Modul src/kit/archetypen/<name>.js ruft beim Import registriereArchetyp(name, def) auf und wird in
// src/kit/archetypen/index.js eingetragen (stadt.js und staedte.js importieren index.js). Module importieren nur
// stadtplan.js, bauer.js, basis.js und eigene Bau-Dateien, nie stadt.js, staedte.js oder index.js.
//
// def = {
//   name: 'Hansestadt',                    Anzeigename
//   gewicht: [m, g, k],                    Zufallsgewicht für metropole, grossstadt, mittelstadt ([0,0,0] = nur per staedte)
//   basis?: 'altstadt',                    Entwurf eines vorhandenen Archetyps, der vorher läuft
//   entwurf(E, H),                         Pflicht, siehe unten
//   viertel?: { name: { dk, var, stile: [[stil, gewicht]], fachwerk } },    neue Viertelarten (VIERTEL)
//   landmarken?: { 'slot:x': { art, breite?, tiefe?, gewicht: [m, g, k] } }, neue Landmarken (LANDMARKEN)
//   flaechen?: { art: { parzelliere?(ctx, E, b, H), boden?(ctx, b, r, teile, B) } },  neue Flächenarten (FLAECHEN)
//   parzellierung?(ctx, E, b, H) → true,   eigener Bebauungsplan für einen bebauten Block (true = erledigt;
//                                          false = Standard läuft weiter, ctx.parz darf vorher geändert werden)
//   nachbearbeitung?(ctx, E, b, H),        nach der Blockrandbebauung: Parzellen umwidmen oder zusammenlegen
//   nachPlan?(E, H, { r, bloecke, parzellen, T, typ, strassen }),  einmal nach allen Blöcken
//   stilProfil?: 'name' | (p, E, block) => 'name',  Stilprofil der normalen Stadthäuser (bauer.registriereStilProfil)
//   parzelleMarkieren?(p, block, E),       letzte Markierung jeder Parzelle (eigene Flags, p.stilProfil)
//   staedte?: { Stadtname: extra },        Städte aus haeuser.json, die diesen Archetyp bekommen (extra wie in staedte.js)
//   ddr?: true,                            Stadt der ehemaligen DDR (Tatra-Bahn, Ost-Autos in stadt.js)
// }
//
// ENTWURF E (was ein Entwurf lesen und setzen darf; alles andere bleibt unangetastet):
//   lesen:   E.seed, E.r (Zufall, nur diesen benutzen), E.typ ('metropole'|'grossstadt'|'mittelstadt'), E.T (TYPEN[typ]),
//            E.region, E.R (REGIONEN[region]), E.o (Optionen inkl. extra aus staedte.js), E.nx, E.nz
//   Raster:  E.spalten[i] (Blockbreiten in m), E.reihen[j] (Blocktiefen); Länge ändern nur zusammen mit E.nx/E.nz,
//            E.zTyp und E.xTyp neu anlegen (siehe Entwurf ring). Zellen (i, j), Linien k = 0 … nx (z-Linien), l = 0 … nz.
//   Linien:  E.zTyp[k], E.xTyp[l] ∈ 'neben' | 'gasse' | 'fz' | 'haupt' | 'boulevard' | 'ring' | 'magistrale' | 'einkauf'
//            (Breiten in LINIEN). E.tram.push('z3' | 'x2') legt Straßenbahngleise. H.fixiere(E, k) bzw.
//            H.fixiere(E, k, j0, j1) hält eine z-Linie gerade (sonst versetzt E.versatz sie je Reihe).
//   Form:    E.versatz(k, j) → m Versatz, E.einschub(i, j) → Wahrscheinlichkeit eingeschobener Gassen,
//            E.durchgang (Hofdurchgänge), E.umriss 'voll' | 'oval' | 'diagonal', E.umland 'land' | 'see',
//            E.zentrum { i, j } (Kern der Stadt, Einkaufslage sucht hier), E.hoch [{ i, j, s }] Hochpunkte.
//   Viertel: E.viertel(i, j) → Name aus VIERTEL (altstadt, zentrum, gruenderzeit, nachkrieg, bahnhofsviertel, barock,
//            rand, plus registrierte). Steuert Stil, Höhe, Parzellenbreite und Pflaster.
//   Flächen: H.nimm(E, { art, i0, i1, j0, j1, …eigene Felder }) belegt Zellen. Eigene Felder landen am Block (b.feld).
//            Eingebaute Arten: wasser (form 'fluss'|'kanal'|'see', quer, keineBruecke, brueckeP), park (garten, spielplatz),
//            markt, platz, kirche (kirchStil, kirchForm, kirchTyp), domplatz, schloss, gruenguertel (achse), bahn
//            (bahnhofLinie, trasse, oben, gross, ohneBahnhof = nur Gleisband; achse 'z' + seite '+x'|'-x' = Gleise entlang z, bahnhofLinie dann x-Linie), mall, gewerbe, kleingarten, parkplatz, center, fachmarkt, brache;
//            dazu alle über def.flaechen registrierten Arten. H.frei / H.zelleFrei prüfen, H.wasserSpalte(E, i, j0, j1).
//            Brücken je Wasserfläche (beide Richtungen): brueckeP (Nebenstraßen), brueckenAbstand (m, Standard 150 bis 200,
//            Kanal 230), brueckenZahl (genau n, gleichmäßig verteilt), keineBruecke; E.brueckenAbstand gilt für alle Flüsse.
//            seiten: ['-z', '-x'] bei markt/platz/kirche = Seiten mit Randbebauung. ohneUferstrasse: true | ['+z', …] bei
//            jeder Landfläche: keine Straße zwischen Fläche und angrenzendem Wasser, der Block reicht bis an die Kaikante.
//   Landmarken: E.landmarken.push('slot:x') erzwingt eine Landmarke; Flächen-Landmarken (art 'flaeche') setzt der Entwurf
//            selbst als Fläche. E.landmarkVerbot = Set, E.landmarkMax, E.ringTor.
//   Sonst:   E.warenhausWunsch { i, j, ecke } (nur ohne Standorte), E.marktVariante 'keiner'|'einer'|'laenglich'|'zwei',
//            E.brachen (0/1, gedeckelt durch BRACHEN_MAX), E.bracheErlaubt(i, j), E.kleingaertenExtra, E.zweiKerne
//            [{ i, j }, { i, j }] (Einkaufslage auf zwei Kerne verteilt), beliebige eigene Felder (E.meinFeld).
//            E.diagonalen = (g) => [{ C: { x, z }, winkel, t0, t1, breite?, gehweg? }]: diagonale Straßen (Fächer), nach den
//            Landmarken angelegt; gekürzte oder entfernte Parzellen, Zwickel als Grün oder Platz (plan.diagonalen, plan.zwickel).
//
// EINKAUFSLAGE UND STANDORTE: Nach dem Entwurf sucht stadtplan() nahe E.zentrum (bzw. je E.zweiKerne) ein Kreuz aus zwei
//   Einkaufsstraßen (Fußgängerzone), legt die 1a- und b-Standorte als Slots in Blöcke daran (Blöcke werden vergrößert),
//   Center- und Fachmarktstandorte auf Randzellen (Center teilen sich: bis 2 Standorte 1 Center, sonst 2). Danach gilt
//   E.einkaufKern(i, j) für Blöcke an den Einkaufsstraßen. In parzellierung/nachbearbeitung ist ctx.einkaufSlots die Liste
//   der Standort-Slots des Blocks; H.einkaufSlotsSetzen(ctx) legt sie als Parzellen an (Pflicht, wenn parzellierung true
//   zurückgibt und ctx.einkaufSlots nicht leer ist), H.slotsImBlock(ctx) liefert sie; diese Parzellen nie ändern.
//
// PARZELLIERUNG ctx: { T, rb (Zufall des Blocks), b (Block: x, z, w, d, i0, j0, rand[s].seg/typ, hof, viertel), parzellen,
//   klasse, stile, parz [min, max], viertel, region, typ, E, strassen, segVon(id) → Straßensegment (typ, art) }.
//   H.neueParzelle(ctx, 'slot:x' | 'stadthaus' | 'eck', x, z, w, d, front, seite, extra) legt eine Parzelle an:
//   front = Liste der Straßenseiten (['+z'] usw., bei Bauten aus ostbauten.js mit genau einem Eintrag = Ausrichtung),
//   seite = '+z'|'-z'|'+x'|'-x' (Randreihe) | 'ecke' | 'frei' | 'block' | 'hof'. extra: variante, geschosse, zustand, …
//   H.parzelliere(ctx, seiten, slots, frontUm) Blockrandbebauung, H.mergeRand(ctx, typ, [bmin, bmax], tiefe, seiten, extra)
//   legt Stadthäuser einer Seite zu einem Slot zusammen, H.blockDetails, H.entferneParzelle, H.parzellenVon(ctx),
//   H.freiePosition, H.ueberlappt. b.hof = { x, z, w, d, art: 'gruen'|'kies'|'parkplatz'|'spielplatz'|'pflaster' } oder null.
//   Parzellen dürfen sich nicht überlappen und nicht auf Straßen liegen (node pruef-staedte.js prüft das).
//
// VOLLSTÄNDIGES BEISPIEL (src/kit/archetypen/kanalstadt.js):
//   import { registriereArchetyp, PLAN_HILFE as H } from '../stadtplan.js';
//   import { registriereSlots, registriereStilProfil } from '../bauer.js';
//   import { speicher } from '../nordbauten.js';               // eigener Generator (S, scene, p) → { hoehe }
//   registriereSlots({ 'slot:speicher': speicher });
//   registriereStilProfil('kanal', (p, nachbar) => (p.viertel === 'kanal' ? { stil: 'backstein', geschosse: 4, region: 'Nord' } : null));
//   registriereArchetyp('kanalstadt', {
//     name: 'Kanalstadt', gewicht: [0, 0.4, 0.2], stilProfil: 'kanal',
//     viertel: { kanal: { dk: 0.2, var: 0.4, stile: [['gruenderzeit', 1]], fachwerk: 0 } },
//     flaechen: { speicherzeile: {
//       parzelliere(ctx, E, b, H) { H.neueParzelle(ctx, 'slot:speicher', b.x + 2, b.z + 2, b.w - 4, 24, ['+z'], 'frei', { geschosse: 6 }); },
//       boden(ctx, b, r, teile, B) { ctx.S.quader(b.x, 0, b.z, b.x + b.w, 0.34, b.z + b.d, '#cfc6b4'); },
//     } },
//     entwurf(E, H) {
//       for (let k = 0; k <= E.nx; k++) H.fixiere(E, k);
//       H.wasserSpalte(E, 2, 0, E.nz - 1, 'kanal');
//       H.nimm(E, { art: 'speicherzeile', i0: 3, i1: 3, j0: 1, j1: 1 });
//       E.zTyp[4] = 'haupt'; E.tram.push('z4');
//       E.zentrum = { i: 4, j: E.nz / 2 };
//       E.viertel = (i, j) => (Math.abs(i - 2) <= 1 ? 'kanal' : Math.hypot(i - 4, j - E.nz / 2) < 2 ? 'zentrum' : 'gruenderzeit');
//     },
//     nachbearbeitung(ctx, E, b, H) { if (b.viertel === 'kanal') H.mergeRand(ctx, 'slot:speicher', [24, 40], 18, ['+z'], {}); },
//     staedte: { Oldenburg: {} },
//   });
// =====================================================================================================
import { rng, waehle, zw } from './basis.js';
import { stadtrandPlan } from './stadtrand.js';

const klemm = (v, a, b) => Math.max(a, Math.min(b, v));
const ganz = (r) => Math.floor(r() * 1e9);
const ordne = (a) => a.sort((p, q) => 'zx'.indexOf(p[1]) - 'zx'.indexOf(q[1]));
export function wahlGewichtet(r, liste) {
  const summe = liste.reduce((a, [, w]) => a + w, 0);
  let x = r() * summe;
  for (const [v, w] of liste) { x -= w; if (x <= 0) return v; }
  return liste[0][0];
}

// ====================================================================================
// Kataloge
// ====================================================================================
/** Straßenlinien. typ der Segmente bleibt haupt | neben | gasse | fussgaenger; ring/boulevard sind haupt mit art. */
export const LINIEN = {
  haupt: { breite: 20, gehweg: 3.5, mittel: 0 },
  neben: { breite: 14, gehweg: 2.75 },
  gasse: { breite: 12, gehweg: 2.0 },
  fz: { breite: 12, gehweg: 2.0 },
  boulevard: { breite: 32, gehweg: 4.5, mittel: 10 },   // Prachtachse (Bahnhofsachse, Schlossachse)
  ring: { breite: 28, gehweg: 4.0, mittel: 8 },         // Ringstraße um die Altstadt
  einkauf: { breite: 18, gehweg: 2.0 },                 // Haupteinkaufsstraße (Fußgängerzone der Einkaufslage)
  magistrale: { breite: 46, gehweg: 5.0, mittel: 16 },  // sozialistische Magistrale: Grünstreifen mit Straßenbahn in der Mitte
};
const HAUPTLICH = new Set(['haupt', 'boulevard', 'ring', 'magistrale']);
// GESTALTUNG.md: Mittelstreifen mit Bäumen nur an echten Prachtachsen, normale Hauptstraßen nur mit Markierung
const MITTELSTREIFEN = new Set(['boulevard', 'ring', 'magistrale']);

export const TYPEN = {
  metropole: { idx: 0, spalte: [78, 106], reihe: [66, 92], tiefe: [16, 20], parz: [9, 30], gesch: [4, 6], wasserB: [58, 72], bruecke: 0.6,
    tram: true, haupt2: true, park: 2, dichte: 1.35, whB: [64, 88], whT: [42, 54], landmarken: [4, 6], blocke: [6, 8], blockeStandorte: [10, 10], fachwerk: 0.25 },
  grossstadt: { idx: 1, spalte: [64, 92], reihe: [58, 84], tiefe: [15, 19], parz: [8, 26], gesch: [3, 5], wasserB: [32, 44], bruecke: 0.7,
    tram: true, haupt2: true, park: 1, dichte: 1, whB: [56, 80], whT: [38, 50], landmarken: [3, 5], blocke: [6, 8], blockeStandorte: [8, 8], fachwerk: 0.7 },
  mittelstadt: { idx: 2, spalte: [46, 66], reihe: [42, 60], tiefe: [13, 16], parz: [7, 18], gesch: [2, 4], wasserB: [24, 32], bruecke: 0.8,
    tram: false, haupt2: false, park: 1, dichte: 0.75, whB: [50, 64], whT: [34, 44], landmarken: [2, 4], blocke: [6, 8], blockeStandorte: [7, 7], fachwerk: 1.6 },   // B9: Mittelstädte eine Blockreihe größer
};

/** Regionen: Baumarten, Stilmischung, Pflaster, Material-Hinweis für die Fassaden-Generatoren. */
export const REGIONEN = {
  nord: { baeume: ['linde', 'kastanie', 'pappel', 'linde'], fachwerk: 0.3, pflaster: 0.35, material: 'backstein', see: 0.4, dk: 0 },
  west: { baeume: ['platane', 'linde', 'kastanie', 'platane'], fachwerk: 0.35, pflaster: 0.2, material: 'putz', see: 0, dk: 0.3 },
  mitte: { baeume: ['linde', 'kastanie', 'linde', 'nadel'], fachwerk: 1.0, pflaster: 0.55, material: 'sandstein', see: 0, dk: -0.2 },
  ost: { baeume: ['linde', 'pappel', 'kastanie', 'linde'], fachwerk: 0.55, pflaster: 0.6, material: 'putz', see: 0.15, dk: 0 },
  sued: { baeume: ['kastanie', 'linde', 'platane', 'kastanie'], fachwerk: 0.65, pflaster: 0.45, material: 'putz', see: 0, dk: 0 },
};

/** Viertel: Höhenversatz (dk), Streuung (var), Stilmischung. Fachwerk-Anteil kommt aus Region × Stadttyp. */
export const VIERTEL = {
  altstadt: { dk: -0.6, var: 0.9, stile: [['gruenderzeit', 0.45], ['nachkrieg', 0.2]], fachwerk: 0.9 },
  zentrum: { dk: 0.8, var: 0.8, stile: [['gruenderzeit', 0.4], ['nachkrieg', 0.35], ['modern', 0.25]], fachwerk: 0 },
  gruenderzeit: { dk: 0.2, var: 0.5, stile: [['gruenderzeit', 0.78], ['nachkrieg', 0.2], ['modern', 0.02]], fachwerk: 0 },
  nachkrieg: { dk: 0, var: 0.9, stile: [['nachkrieg', 0.7], ['modern', 0.15], ['gruenderzeit', 0.15]], fachwerk: 0 },
  bahnhofsviertel: { dk: 0.5, var: 0.7, stile: [['gruenderzeit', 0.55], ['nachkrieg', 0.3], ['modern', 0.15]], fachwerk: 0 },
  barock: { dk: 0, var: 0.15, stile: [['gruenderzeit', 0.92], ['nachkrieg', 0.08]], fachwerk: 0 },
  rand: { dk: -1.4, var: 0.8, stile: [['nachkrieg', 0.6], ['modern', 0.3], ['gruenderzeit', 0.1]], fachwerk: 0.1 },
};

/** Grundriss-Archetypen mit Gewicht je Stadttyp [metropole, grossstadt, mittelstadt]. */
export const ARCHETYPEN = {
  raster: { gewicht: [1, 1, 0.5], name: 'Rasterstadt' },
  altstadt: { gewicht: [0.2, 0.6, 1.4], name: 'Altstadt' },
  ring: { gewicht: [0.8, 1, 0.8], name: 'Ringstadt' },
  flussknick: { gewicht: [0.8, 0.8, 0.6], name: 'Fluss mit Knick' },
  zweiarme: { gewicht: [0.6, 0.6, 0.5], name: 'Flussinsel' },
  bahnhof: { gewicht: [1, 1, 0.7], name: 'Bahnhofsstadt' },
  dom: { gewicht: [0.6, 0.7, 0.6], name: 'Domstadt' },
  residenz: { gewicht: [0.4, 0.6, 0.8], name: 'Residenzstadt' },
  // weitere Archetypen (z. B. die sechs Ost-Typen) registrieren sich über registriereArchetyp (src/kit/archetypen/)
};

/**
 * Landmarken-Slots. art: 'flaeche' (eigene Fläche), 'block' (ganzer Block), 'rand' (ersetzt Parzellen der Blockrandbebauung),
 * 'ecke' (Eckgrundstück), 'frei' (frei stehend auf Platz, Park, Grüngürtel oder im Hof). gewicht je Stadttyp.
 */
export const LANDMARKEN = {
  'slot:kirche': { art: 'flaeche', gewicht: [1, 1, 1.2] },
  'slot:rathaus': { art: 'rand', breite: [24, 36], tiefe: [16, 22], gewicht: [1, 1, 1.3] },
  'slot:schloss': { art: 'flaeche', gewicht: [0.25, 0.35, 0.5] },
  'slot:theater': { art: 'rand', breite: [28, 42], tiefe: [22, 32], gewicht: [1, 0.8, 0.4] },
  'slot:museum': { art: 'rand', breite: [30, 48], tiefe: [18, 26], gewicht: [1, 0.7, 0.4] },
  'slot:tor': { art: 'frei', breite: [10, 14], tiefe: [9, 12], gewicht: [0.2, 0.5, 1] },
  'slot:denkmal': { art: 'frei', breite: [6, 10], tiefe: [6, 10], gewicht: [0.8, 0.8, 0.6] },
  'slot:markthalle': { art: 'rand', breite: [30, 48], tiefe: [24, 32], gewicht: [0.8, 0.6, 0.3] },
  'slot:hochhaus': { art: 'rand', breite: [22, 40], tiefe: [18, 26], gewicht: [1.6, 0.6, 0.1] },
  'slot:hotel': { art: 'rand', breite: [20, 34], tiefe: [14, 20], gewicht: [1, 0.8, 0.5] },
  'slot:parkhaus': { art: 'rand', breite: [30, 44], tiefe: [26, 34], gewicht: [0.8, 0.9, 0.6] },
  'slot:konkurrenz': { art: 'rand', breite: [40, 64], tiefe: [30, 42], gewicht: [1, 0.8, 0.4] },
  'slot:mall': { art: 'block', gewicht: [1, 0.7, 0.2] },
  'slot:bahnhof': { art: 'flaeche', gewicht: [1, 1, 0.9] },
  'slot:wasserturm': { art: 'frei', breite: [12, 14], tiefe: [12, 14], gewicht: [0.2, 0.5, 0.8] },
  'slot:tankstelle': { art: 'ecke', breite: [24, 30], tiefe: [20, 26], gewicht: [0.5, 0.7, 1] },
  'slot:discounter': { art: 'block', gewicht: [0.4, 0.7, 1] },
};

// ====================================================================================
// Entwurf: Archetyp → Raster, Linien, Flächen
// ====================================================================================
/**
 * stadtplan(seed, { typ, region, archetyp, blockeX, blockeZ, strassenFaktor, wasser, bahn, umriss, umland, standorte })
 * Ohne archetyp/region wählt der Seed. Rückgabe: reine Daten (siehe rasterPlan).
 *
 * standorte: [{ id, rolle: 'warenhaus'|'sport'|'wettbewerber', lage: '1a'|'b'|'center'|'rand', grundflaecheQm?, w?, d? }]
 *   Mit standorte bekommt die Innenstadt eine Einkaufslage: zwei sich kreuzende Haupteinkaufsstraßen (Fußgängerzone),
 *   an denen die 1a-Häuser liegen; 'b' = Nebenlage am Rand der Innenstadt, 'center' = Einkaufszentrum mit Parkplatz
 *   an der Ausfallstraße, 'rand' = Fachmarktlage am Stadtrand. Je Eintrag entsteht ein Slot 'slot:warenhaus' |
 *   'slot:sport' | 'slot:wettbewerber' mit p.standort = Eintrag. Slotgröße aus w × d (1 m = 1 Einheit), sonst aus der
 *   Grundfläche geschätzt. Die Stadt wird dafür größer (TYPEN.blockeStandorte). plan.standorte listet danach alle
 *   Einträge mit Parzellen-Id; plan.einkaufslage enthält das Rechteck der Einkaufslage.
 *   Ohne standorte bleibt alles wie bisher (ein Warenhaus).
 */
export function stadtplan(seed, o = {}) {
  const typ = o.typ ?? 'grossstadt';
  const T = TYPEN[typ];
  const r = rng(seed * 7919 + 13);
  const region = o.region ?? waehle(r, Object.keys(REGIONEN));
  const archetyp = o.archetyp ?? wahlGewichtet(r, Object.entries(ARCHETYPEN).map(([k, v]) => [k, v.gewicht[T.idx]]));
  const E = neuerEntwurf(seed, r, typ, region, archetyp, o);
  ENTWUERFE[archetyp](E);
  ergaenzeEntwurf(E, o);
  return baueRaster(seed, E);
}

function neuerEntwurf(seed, r, typ, region, archetyp, o) {
  const T = TYPEN[typ];
  const bl = o.standorte?.length ? T.blockeStandorte : T.blocke;
  const nx = Math.max(4, o.blockeX ?? bl[0]), nz = Math.max(4, o.blockeZ ?? bl[1]);
  const prop = zw(r, 0.85, 1.2);   // Blockproportion je Stadt
  const E = {
    seed, r, typ, T, region, R: REGIONEN[region], archetyp, nx, nz,
    spalten: [], reihen: [],
    zTyp: [], xTyp: [], fest: new Set(), versatz: () => 0, einschub: () => 0, durchgang: 0,
    flaechen: [], aktiv: () => true, umland: 'land', umriss: 'voll',
    warenhaus: null, landmarken: [], tram: [], fz: [], zentrum: { i: (nx - 1) / 2, j: (nz - 1) / 2 },
    viertel: null, hoch: [], strassenFaktor: o.strassenFaktor ?? 1, bruecken: 'zufall', marktVariante: null,
    baumarten: [...new Set([waehle(r, REGIONEN[region].baeume), waehle(r, REGIONEN[region].baeume), waehle(r, ['linde', 'kastanie', 'platane'])])],
    o, ddr: !!o.ddr || !!ARCHETYPEN[archetyp]?.ost,
  };
  for (let i = 0; i < nx; i++) E.spalten.push(Math.round((zw(r, ...T.spalte) * prop) / 2) * 2);
  for (let j = 0; j < nz; j++) E.reihen.push(Math.round((zw(r, ...T.reihe) / prop) / 2) * 2);
  E.zTyp = Array(nx + 1).fill('neben');
  E.xTyp = Array(nz + 1).fill('neben');
  E.belegt = new Map();
  return E;
}

const zelleFrei = (E, i, j) => i >= 0 && j >= 0 && i < E.spalten.length && j < E.reihen.length && !E.belegt.has(`${i},${j}`) && !(E.warenhaus && E.warenhaus.i === i && E.warenhaus.j === j) && !E.einkaufZellen?.has(`${i},${j}`);
function nimm(E, f) {
  E.flaechen.push(f);
  for (let i = f.i0; i <= f.i1; i++) for (let j = f.j0; j <= f.j1; j++) E.belegt.set(`${i},${j}`, f);
  return f;
}
function frei(E, i0, i1, j0, j1) { for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) if (!zelleFrei(E, i, j)) return false; return true; }
function fixiere(E, k, j0 = null, j1 = null) {
  if (j0 === null) E.fest.add(`${k}`);
  else for (let j = j0; j <= j1; j++) E.fest.add(`${k}:${j}`);
}
function wasserSpalte(E, i, j0, j1, form = 'fluss') {
  E.spalten[i] = Math.round(zw(E.r, ...E.T.wasserB) * (form === 'kanal' ? 0.75 : 1));
  return nimm(E, { art: 'wasser', form, i0: i, i1: i, j0, j1 });
}

const ENTWUERFE = {
  raster(E) {
    const { r } = E;
    const w = E.spalten[0], d = E.reihen[0];
    E.spalten = E.spalten.map(() => Math.round((w * zw(r, 0.94, 1.06)) / 2) * 2);
    E.reihen = E.reihen.map(() => Math.round((d * zw(r, 0.94, 1.06)) / 2) * 2);
    for (let k = 0; k <= E.nx; k++) fixiere(E, k);
    if (r() < 0.45) { const iw = waehle(r, [0, E.nx - 1, 1]); wasserSpalte(E, iw, 0, E.nz - 1, r() < 0.5 ? 'kanal' : 'fluss'); }
    E.viertel = (i, j) => { const dd = Math.hypot(i - E.zentrum.i, j - E.zentrum.j); return dd < 1.3 ? 'zentrum' : dd < 3 ? 'gruenderzeit' : 'nachkrieg'; };
    E.umriss = waehle(r, ['voll', 'voll', 'oval']);
  },
  altstadt(E) {
    const { r } = E;
    E.spalten = E.spalten.map((w) => Math.round((w * zw(r, 0.55, 1.25)) / 2) * 2);
    E.reihen = E.reihen.map((d) => Math.round((d * zw(r, 0.6, 1.2)) / 2) * 2);
    E.zentrum = { i: (E.nx - 1) / 2 + zw(r, -0.6, 0.6), j: (E.nz - 1) / 2 + zw(r, -0.6, 0.6) };
    const kern = (i, j) => Math.hypot(i - E.zentrum.i, (j - E.zentrum.j) * 0.9) < 2.4;
    E.versatz = (k, j) => (kern(k - 0.5, j) ? 18 : 6);
    E.einschub = (i, j) => (kern(i, j) ? 0.4 : 0.1);
    E.durchgang = 0.35;
    E.viertel = (i, j) => (kern(i, j) ? 'altstadt' : Math.hypot(i - E.zentrum.i, j - E.zentrum.j) < 3.6 ? 'gruenderzeit' : 'rand');
    E.umriss = waehle(r, ['oval', 'oval', 'diagonal']);
    if (r() < 0.4) { const iw = r() < 0.5 ? 0 : E.nx - 1; wasserSpalte(E, iw, 0, E.nz - 1, 'kanal'); }
  },
  ring(E) {
    const { r, T } = E;
    // Kern 3 bis 4 Spalten/Reihen, darum ein Grüngürtel aus schmalen Zellen, außen der Ring
    const cx = Math.min(4, E.nx - 2), cz = Math.min(4, E.nz - 3);
    const a0 = Math.max(1, Math.floor((E.nx - cx) / 2)), b0 = Math.max(1, Math.floor((E.nz - cz) / 2));
    const sp = [], rh = [];
    for (let i = 0; i < E.nx; i++) { if (i === a0 || i === a0 + cx) sp.push(Math.round(zw(r, 36, 48))); sp.push(i >= a0 && i < a0 + cx ? Math.round(E.spalten[i] * zw(r, 0.6, 0.9)) : E.spalten[i]); }
    for (let j = 0; j < E.nz; j++) { if (j === b0 || j === b0 + cz) rh.push(Math.round(zw(r, 36, 48))); rh.push(j >= b0 && j < b0 + cz ? Math.round(E.reihen[j] * zw(r, 0.65, 0.9)) : E.reihen[j]); }
    E.spalten = sp; E.reihen = rh; E.nx = sp.length; E.nz = rh.length;
    E.zTyp = Array(E.nx + 1).fill('neben'); E.xTyp = Array(E.nz + 1).fill('neben');
    const gl = a0, gr = a0 + cx + 1, gt = b0, gb = b0 + cz + 1;   // Gürtelspalten/-reihen
    E.zTyp[gl] = 'ring'; E.zTyp[gr + 1] = 'ring'; E.xTyp[gt] = 'ring'; E.xTyp[gb + 1] = 'ring';
    for (const k of [gl, gl + 1, gr, gr + 1]) fixiere(E, k);
    for (let k = 0; k <= E.nx; k++) if (k < gl || k > gr + 1) fixiere(E, k);
    // Grüngürtel in Abschnitten (Radialstraßen queren ihn)
    const streifen = (feste, von, bis, senkrecht) => {
      let a = von;
      while (a <= bis) {
        const len = Math.min(bis - a + 1, 1 + Math.floor(r() * 2.4));
        const f = senkrecht ? { art: 'gruenguertel', i0: feste, i1: feste, j0: a, j1: a + len - 1, achse: 'z' } : { art: 'gruenguertel', i0: a, i1: a + len - 1, j0: feste, j1: feste, achse: 'x' };
        if (frei(E, f.i0, f.i1, f.j0, f.j1)) nimm(E, f);
        a += len;
      }
    };
    streifen(gt, gl, gr, false); streifen(gb, gl, gr, false);
    streifen(gl, gt + 1, gb - 1, true); streifen(gr, gt + 1, gb - 1, true);
    const imKern = (i, j) => i > gl && i < gr && j > gt && j < gb;
    E.versatz = (k, j) => (k > gl + 1 && k < gr && j > gt && j < gb ? 14 : 0);
    E.einschub = (i, j) => (imKern(i, j) ? 0.3 : 0);
    E.durchgang = 0.25;
    E.zentrum = { i: (gl + gr) / 2, j: (gt + gb) / 2 };
    E.kernZellen = imKern;
    E.viertel = (i, j) => (imKern(i, j) ? 'altstadt' : (i >= gl - 1 && i <= gr + 1 && j >= gt - 1 && j <= gb + 1) ? 'gruenderzeit' : 'nachkrieg');
    E.ringTor = true;
    E.umriss = 'voll';
    E.ringIdx = { gl, gr, gt, gb };
    if (T.tram) E.tram.push('z' + gl);
  },
  flussknick(E) {
    const { r } = E;
    const jk = Math.floor(E.nz / 2) + (r() < 0.5 ? -1 : 0);
    let iA = 1 + Math.floor(r() * 2), iC = Math.max(iA + 2, E.nx - 2 - Math.floor(r() * 2));
    if (r() < 0.5) [iA, iC] = [iC, iA];
    const wb = Math.round(zw(r, ...E.T.wasserB));
    E.spalten[iA] = wb; E.spalten[iC] = wb; E.reihen[jk] = Math.max(wb, 44);
    nimm(E, { art: 'wasser', form: 'fluss', i0: iA, i1: iA, j0: 0, j1: jk });
    nimm(E, { art: 'wasser', form: 'fluss', i0: Math.min(iA, iC) + 1, i1: Math.max(iA, iC) - 1, j0: jk, j1: jk, quer: true });
    nimm(E, { art: 'wasser', form: 'fluss', i0: iC, i1: iC, j0: jk, j1: E.nz - 1 });
    for (let k = 0; k <= E.nx; k++) fixiere(E, k, jk, jk);
    E.versatz = (k, j) => (Math.abs(j - jk) > 1 ? 8 : 0);
    E.viertel = (i, j) => { const dd = Math.hypot(i - E.zentrum.i, j - E.zentrum.j); return dd < 1.4 ? 'zentrum' : dd < 2.6 ? 'altstadt' : dd < 3.6 ? 'gruenderzeit' : 'nachkrieg'; };
    E.einschub = (i, j) => (E.viertel(i, j) === 'altstadt' ? 0.25 : 0);
    E.zentrum = { i: (iA + iC) / 2, j: jk + (r() < 0.5 ? -1.2 : 1.2) };
    E.umriss = waehle(r, ['voll', 'oval']);
  },
  zweiarme(E) {
    const { r } = E;
    const iA = klemm(Math.floor(E.nx / 2) - 1 + (r() < 0.5 ? 0 : 1), 0, E.nx - 3);
    wasserSpalte(E, iA, 0, E.nz - 1);
    E.spalten[iA + 1] = Math.round(zw(r, 48, 72));
    wasserSpalte(E, iA + 2, 0, E.nz - 1, 'kanal');
    E.insel = iA + 1;
    E.bruecken = 'zufall';
    E.zentrum = { i: iA + 1, j: (E.nz - 1) / 2 + zw(r, -1, 1) };
    for (let k = 0; k <= E.nx; k++) fixiere(E, k);
    E.viertel = (i, j) => (i === E.insel ? 'altstadt' : Math.hypot(i - E.zentrum.i, j - E.zentrum.j) < 2.6 ? 'gruenderzeit' : 'nachkrieg');
    E.umriss = waehle(r, ['voll', 'diagonal']);
  },
  bahnhof(E) {
    const { r, T } = E;
    const kAx = Math.floor(E.nx / 2) + (r() < 0.5 ? 0 : 1);
    E.zTyp[kAx] = 'boulevard';
    fixiere(E, kAx);
    // Bahntrasse über die ganze Kartenbreite, Bahnhof an der Achse
    E.reihen[E.nz - 1] = Math.max(E.reihen[E.nz - 1], 74);
    nimm(E, { art: 'bahn', i0: 0, i1: E.nx - 1, j0: E.nz - 1, j1: E.nz - 1, bahnhofLinie: kAx, trasse: true });
    E.landmarken.push('slot:bahnhof');
    if (r() < 0.7) nimm(E, { art: 'platz', i0: kAx - 1, i1: kAx - 1, j0: E.nz - 2, j1: E.nz - 2, seiten: ['-z', '-x'] });
    if (T.tram) E.tram.push('z' + kAx);
    E.achse = kAx;
    E.zentrum = { i: kAx - 0.5, j: E.nz - 3 - Math.floor(zw(r, 0, 1.99)) };
    for (let k = 0; k <= E.nx; k++) fixiere(E, k);
    E.versatz = (k, j) => (j < E.zentrum.j - 1 ? 10 : 0);
    E.viertel = (i, j) => (j >= E.nz - 3 && Math.abs(i - kAx + 0.5) < 2.5 ? 'bahnhofsviertel' : Math.hypot(i - E.zentrum.i, j - E.zentrum.j) < 1.5 ? 'zentrum' : j < E.zentrum.j - 1 ? 'altstadt' : 'gruenderzeit');
    E.einschub = (i, j) => (E.viertel(i, j) === 'altstadt' ? 0.25 : 0);
    E.warenhausWunsch = { i: kAx - 1, j: Math.round(E.zentrum.j), ecke: '+x+z' };
    E.umriss = waehle(r, ['voll', 'oval']);
  },
  dom(E) {
    const { r } = E;
    const c = Math.floor(E.nx / 2) - 1 + (r() < 0.5 ? 0 : 1), jd = Math.floor(E.nz / 2) - 1 + (r() < 0.5 ? 0 : 1);
    E.spalten[c] = Math.max(E.spalten[c], 60); E.spalten[c + 1] = Math.max(E.spalten[c + 1], 60);
    E.reihen[jd] = Math.max(E.reihen[jd], 76);
    nimm(E, { art: 'domplatz', i0: c, i1: c + 1, j0: jd, j1: jd, seiten: r() < 0.5 ? ['-z'] : ['-z', '-x'] });
    E.landmarken.push('slot:kirche');
    E.zentrum = { i: c + 0.5, j: jd + 0.5 };
    if (c - 1 >= 0) E.warenhausWunsch = r() < 0.5 ? { i: c - 1, j: jd, ecke: '+x+z' } : { i: c, j: jd + 1, ecke: '+x-z' };
    if (r() < 0.65) { const iw = c - 2 >= 0 && r() < 0.5 ? c - 2 : Math.min(E.nx - 1, c + 3); if (frei(E, iw, iw, 0, E.nz - 1)) wasserSpalte(E, iw, 0, E.nz - 1); }
    for (let k = 0; k <= E.nx; k++) fixiere(E, k, jd, jd);
    E.versatz = (k, j) => (Math.hypot(k - 0.5 - E.zentrum.i, j - E.zentrum.j) < 2.2 ? 12 : 0);
    E.einschub = (i, j) => (Math.hypot(i - E.zentrum.i, j - E.zentrum.j) < 2 ? 0.3 : 0);
    E.viertel = (i, j) => { const dd = Math.hypot(i - E.zentrum.i, j - E.zentrum.j); return dd < 2 ? 'altstadt' : dd < 3.2 ? 'zentrum' : 'gruenderzeit'; };
    E.umriss = waehle(r, ['voll', 'oval']);
  },
  residenz(E) {
    const { r } = E;
    const c = Math.floor(E.nx / 2) - 1, kS = c + 1;
    const tief = 1;
    E.spalten[c] = Math.max(E.spalten[c], 70); E.spalten[c + 1] = Math.max(E.spalten[c + 1], 70);
    E.reihen[0] = Math.max(E.reihen[0], 70);
    nimm(E, { art: 'schloss', i0: c, i1: c + 1, j0: 0, j1: tief });
    E.landmarken.push('slot:schloss');
    if (c - 1 >= 0) nimm(E, { art: 'park', i0: Math.max(0, c - 2), i1: c - 1, j0: 0, j1: tief, garten: true });
    if (c + 2 < E.nx) nimm(E, { art: 'park', i0: c + 2, i1: Math.min(E.nx - 1, c + 3), j0: 0, j1: tief, garten: true });
    // Querachse vor dem Schloss
    E.xTyp[tief + 1] = 'boulevard';
    E.zTyp[kS] = 'boulevard';
    for (let k = 0; k <= E.nx; k++) fixiere(E, k);
    E.achse = kS;
    E.zentrum = { i: kS - 0.5, j: tief + 1.5 + zw(r, 0, 1.5) };
    E.viertel = (i, j) => (Math.abs(i - kS + 0.5) < 1.6 && j <= tief + 3 ? 'barock' : Math.hypot(i - E.zentrum.i, j - E.zentrum.j) < 2.2 ? 'zentrum' : 'gruenderzeit');
    E.warenhausWunsch = { i: kS - 1, j: tief + 1, ecke: '+x+z' };
    E.umriss = waehle(r, ['voll', 'oval']);
    if (E.T.tram) E.tram.push('z' + kS);
  },
};

// ====================================================================================
// Plugin-Registry: Archetyp-Module (src/kit/archetypen/*.js) erweitern Stadttypen, Flächen und Hooks
// ====================================================================================
/** Registrierte Archetyp-Definitionen (Name → def). Nur lesen; schreiben über registriereArchetyp. */
export const ARCHETYP_DEFS = {};
/** Registrierte Flächenarten (art → { parzelliere?, boden? }). stadt.js ruft boden(ctx, b, r, teile, B). */
export const FLAECHEN = {};

/**
 * Registriert einen Archetyp (siehe Dokumentation oben). Erweitert ARCHETYPEN, ENTWUERFE, VIERTEL, LANDMARKEN, FLAECHEN.
 * Mehrfaches Registrieren desselben Namens ersetzt den alten Eintrag.
 */
export function registriereArchetyp(name, def) {
  if (!def || typeof def.entwurf !== 'function') throw new Error(`registriereArchetyp(${name}): entwurf(E, H) fehlt`);
  ARCHETYP_DEFS[name] = def;
  ARCHETYPEN[name] = { gewicht: def.gewicht ?? [0, 0, 0], name: def.name ?? name, ...(def.ddr ? { ost: true } : {}), plugin: true };
  ENTWUERFE[name] = (E) => { if (def.basis) entwurfVon(def.basis)(E); def.entwurf(E, PLAN_HILFE); };
  if (def.viertel) Object.assign(VIERTEL, def.viertel);
  if (def.landmarken) Object.assign(LANDMARKEN, def.landmarken);
  if (def.flaechen) for (const [art, f] of Object.entries(def.flaechen)) FLAECHEN[art] = { ...FLAECHEN[art], ...f };
  return ARCHETYPEN[name];
}
/** Entwurfsfunktion eines vorhandenen Archetyps (für Module, die auf einem anderen aufbauen). */
export function entwurfVon(name) {
  const f = ENTWUERFE[name];
  if (!f) throw new Error('Unbekannter Archetyp: ' + name);
  return f;
}
/** Größte Zahl Brachen je Stadt (Flächen- und Parzellenbrachen zusammen). */
export const BRACHEN_MAX = { mittelstadt: 1, grossstadt: 2, metropole: 3 };


/** Gemeinsame Schritte: Hauptstraßen, Warenhaus, Markt, Landmarken, Parks, Umriss, Höhen. */
function ergaenzeEntwurf(E, o) {
  const { r, T } = E;
  const nx = () => E.spalten.length, nz = () => E.reihen.length;
  const zi = Math.round(E.zentrum.i), zj = Math.round(E.zentrum.j);
  // --- Hauptstraßen (fluchtend) ---
  if (!E.zTyp.some((t) => HAUPTLICH.has(t))) {
    const kH = klemm(zi + (r() < 0.5 ? 0 : 1), 1, nx() - 1);
    E.zTyp[kH] = 'haupt'; fixiere(E, kH); if (T.tram) E.tram.push('z' + kH);
  }
  if (T.haupt2 && !E.xTyp.some((t) => HAUPTLICH.has(t))) { const lH = klemm(zj + 1 + (r() < 0.5 ? 0 : 1), 1, nz() - 1); E.xTyp[lH] = 'haupt'; }
  // --- Warenhaus bzw. Einkaufslage mit allen Standorten ---
  let wh;
  if (o.standorte?.length) {
    einkaufslage(E, o.standorte);
    wh = [E.warenhaus.i, E.warenhaus.j];
  } else {
  const kandidaten = [];
  for (let i = 0; i < nx(); i++) for (let j = 0; j < nz(); j++) {
    if (!zelleFrei(E, i, j)) continue;
    const dd = Math.hypot(i - E.zentrum.i, j - E.zentrum.j);
    if (dd > 2.2) continue;
    const anHaupt = HAUPTLICH.has(E.zTyp[i + 1]) || HAUPTLICH.has(E.xTyp[j + 1]) || HAUPTLICH.has(E.zTyp[i]) || HAUPTLICH.has(E.xTyp[j]);
    kandidaten.push([[i, j], (anHaupt ? 3 : 1) / (0.6 + dd)]);
  }
  wh = E.warenhausWunsch && zelleFrei(E, E.warenhausWunsch.i, E.warenhausWunsch.j) ? [E.warenhausWunsch.i, E.warenhausWunsch.j] : kandidaten.length ? wahlGewichtet(r, kandidaten) : [zi, zj];
  const ecke = E.warenhausWunsch?.ecke ?? wahlGewichtet(r, [['+x+z', 0.45], ['+x-z', 0.18], ['-x+z', 0.18], ['block', 0.12], ['-x-z', 0.07]]);
  const W = Math.round(zw(r, ...T.whB)), D = Math.round(zw(r, ...T.whT));
  E.warenhaus = { i: wh[0], j: wh[1], W, D, ecke };
  if (ecke === 'block') { E.spalten[wh[0]] = W; E.reihen[wh[1]] = D; }
  else { E.spalten[wh[0]] = Math.max(E.spalten[wh[0]], W + 32); E.reihen[wh[1]] = Math.max(E.reihen[wh[1]], D + 30); }
  for (const k of [wh[0], wh[0] + 1]) fixiere(E, k, wh[1], wh[1]);
  }
  // --- Markt-Varianten ---
  const nachbarn = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => [wh[0] + a, wh[1] + b]).filter(([i, j]) => zelleFrei(E, i, j));
  const variante = E.marktVariante ?? (E.archetyp === 'dom' ? wahlGewichtet(r, [['keiner', 0.5], ['einer', 0.5]]) : wahlGewichtet(r, [['keiner', 0.12], ['einer', 0.43], ['laenglich', 0.27], ['zwei', 0.18]]));
  E.marktVariante = variante;
  // GESTALTUNG.md: Plätze von mindestens drei Seiten gefasst (keine offenen Pflasterfelder)
  const kirchSeiten = () => waehle(r, [['-z', '-x'], ['-z', '-x'], ['-z', '-x', '+x'], ['-x'], ['-z'], ['-z', '-x', '+z']]);   // Kirchplätze: Kirche frei stehend
  const seitenWahl = () => waehle(r, [['-z', '-x', '+x'], ['-z', '-x', '+z'], ['-z', '-x', '+x'], ['-z', '-x', '+z', '+x']]);
  if (variante !== 'keiner' && nachbarn.length) {
    const [mi, mj] = waehle(r, nachbarn);
    let f = { art: 'markt', i0: mi, i1: mi, j0: mj, j1: mj, seiten: seitenWahl() };
    if (variante === 'laenglich') {
      const opt = [[mi + 1, mj, 'x'], [mi - 1, mj, 'x'], [mi, mj + 1, 'z'], [mi, mj - 1, 'z']].filter(([i, j]) => zelleFrei(E, i, j));
      if (opt.length) { const [i, j] = waehle(r, opt); f = { ...f, i0: Math.min(mi, i), i1: Math.max(mi, i), j0: Math.min(mj, j), j1: Math.max(mj, j), seiten: ['-z', '-x'] }; }
    }
    nimm(E, f);
    for (let k = f.i0; k <= f.i1 + 1; k++) fixiere(E, k, f.j0, f.j1);
    if (variante === 'zwei') {
      const l = [];
      for (let i = 0; i < nx(); i++) for (let j = 0; j < nz(); j++) { const dd = Math.hypot(i - mi, j - mj); if (zelleFrei(E, i, j) && dd >= 2 && dd < 3.5) l.push([i, j]); }
      if (l.length) { const [i, j] = waehle(r, l); nimm(E, { art: 'platz', i0: i, i1: i, j0: j, j1: j, seiten: seitenWahl() }); }
    }
  }
  // --- Landmarken auswählen ---
  const n = Math.min(E.landmarkMax ?? 99, Math.round(zw(r, T.landmarken[0], T.landmarken[1] + 0.99) - 0.49));
  const vorrat = Object.entries(LANDMARKEN).filter(([k]) => !E.landmarken.includes(k) && !E.landmarkVerbot?.has(k)).map(([k, v]) => [k, v.gewicht[T.idx] * (k === 'slot:tor' && E.ringTor ? 4 : 1) * (k === 'slot:rathaus' && E.marktVariante !== 'keiner' ? 2 : 1)]);
  while (E.landmarken.length < n && vorrat.length) {
    const k = wahlGewichtet(r, vorrat);
    E.landmarken.push(k);
    vorrat.splice(vorrat.findIndex(([x]) => x === k), 1);
  }
  const gewaehlt = (k) => E.landmarken.includes(k);
  const zellenNach = (filter, wert) => {
    const l = [];
    for (let i = 0; i < nx(); i++) for (let j = 0; j < nz(); j++) if (zelleFrei(E, i, j) && filter(i, j)) l.push([[i, j], wert(i, j)]);
    return l;
  };
  // Flächen-Landmarken, die der Archetyp noch nicht gesetzt hat
  if (gewaehlt('slot:kirche') && !E.flaechen.some((f) => f.art === 'domplatz' || f.art === 'kirche')) {
    const l = zellenNach((i, j) => Math.hypot(i - E.zentrum.i, j - E.zentrum.j) < 3, (i, j) => 1 / (0.5 + Math.abs(Math.hypot(i - E.zentrum.i, j - E.zentrum.j) - 1.5)));
    if (l.length) { const [i, j] = wahlGewichtet(r, l); nimm(E, { art: 'kirche', i0: i, i1: i, j0: j, j1: j, seiten: kirchSeiten() }); }
  }
  if (gewaehlt('slot:bahnhof') && !E.flaechen.some((f) => f.art === 'bahn') && o.bahn !== false) {
    // am Kartenrand gegenüber der Einkaufslage (oben, wenn der Kern in der unteren Hälfte liegt)
    const len = E.typ === 'metropole' ? 3 : 2, jb = E.zentrum.j > (nz() - 1) / 2 ? 0 : nz() - 1;
    const starts = [];
    for (let c = 0; c + len <= nx(); c++) if (frei(E, c, c + len - 1, jb, jb)) starts.push(c);
    // GESTALTUNG.md 3: Bahnhof am Stadtrand, möglichst weit seitlich der Einkaufslage (Zufallszug bleibt)
    if (starts.length) { r(); const c = starts.sort((a, b) => Math.abs(b + len / 2 - 0.5 - E.zentrum.i) - Math.abs(a + len / 2 - 0.5 - E.zentrum.i))[0]; E.reihen[jb] = Math.max(E.reihen[jb], 60); nimm(E, { art: 'bahn', i0: c, i1: c + len - 1, j0: jb, j1: jb, oben: jb === 0 }); }
    else E.landmarken.splice(E.landmarken.indexOf('slot:bahnhof'), 1);
  }
  if (gewaehlt('slot:schloss') && !E.flaechen.some((f) => f.art === 'schloss')) {
    const l = zellenNach((i, j) => zelleFrei(E, i + 1, j) && Math.hypot(i - E.zentrum.i, j - E.zentrum.j) > 1.5, () => 1);
    if (l.length) { const [i, j] = wahlGewichtet(r, l); nimm(E, { art: 'schloss', i0: i, i1: i + 1, j0: j, j1: j }); E.spalten[i] = Math.max(E.spalten[i], 56); E.spalten[i + 1] = Math.max(E.spalten[i + 1], 56); }
    else E.landmarken.splice(E.landmarken.indexOf('slot:schloss'), 1);
  }
  if (gewaehlt('slot:mall')) {
    // GESTALTUNG.md 3: Einkaufszentrum nicht im Zentrumsbild, sondern am Rand der Innenstadt
    const l = zellenNach((i, j) => Math.hypot(i - E.zentrum.i, j - E.zentrum.j) < 5 && Math.hypot(i - E.zentrum.i, j - E.zentrum.j) > 3.3, () => 1);
    if (l.length) { const [i, j] = wahlGewichtet(r, l); nimm(E, { art: 'mall', i0: i, i1: i, j0: j, j1: j }); }
  }
  // --- Ost: Brachen (Abrissflächen) zwischen Zentrum und Plattenbaugürtel ---
  // Deckel je Stadttyp (BRACHEN_MAX); E.brachenGezaehlt zählt auch spätere Parzellenbrachen (H.bracheErlaubt)
  E.brachenGezaehlt = E.brachenGezaehlt ?? 0;
  for (let k = 0; k < Math.min(E.brachen ?? 0, 1); k++) {
    if (E.brachenGezaehlt >= (BRACHEN_MAX[E.typ] ?? 1)) break;
    const l = zellenNach((i, j) => { const dd = Math.hypot(i - E.zentrum.i, j - E.zentrum.j); return dd > 1.4 && dd < 3.8 && (E.bracheErlaubt ? E.bracheErlaubt(i, j) : true) && !E.einkaufKern?.(i, j); }, () => 1);
    if (l.length) { const [i, j] = wahlGewichtet(r, l); nimm(E, { art: 'brache', i0: i, i1: i, j0: j, j1: j }); E.brachenGezaehlt++; }
  }
  // --- Umriss (vor Randflächen bestimmen) ---
  E.umriss = o.umriss ?? E.umriss;
  // Seen und Küsten nur über feste Städteeinträge (staedte.js BILD, def.staedte), nie per Zufall (Chemnitz lag sonst
  // an einem See). Der Zufallszug bleibt, damit alle übrigen Pläne unverändert bleiben.
  if (E.R.see) r();
  if (o.umland) E.umland = o.umland;
  const ax = zw(r, 0.85, 1.15), rauschen = [];
  for (let i = 0; i < nx(); i++) { rauschen.push([]); for (let j = 0; j < nz(); j++) rauschen[i].push(zw(r, -0.15, 0.15)); }
  const aktivRoh = (i, j) => {
    if (E.umriss === 'voll') return true;
    const u = ((i + 0.5) / nx()) * 2 - 1, v = ((j + 0.5) / nz()) * 2 - 1;
    if (E.umriss === 'oval') return (u * u) / ax + (v * v) * ax < 0.92 + rauschen[i][j] * 1.5;
    const p = (u + v) / 2, q = (u - v) / 2;          // diagonal: entlang der Bildsenkrechten gestreckt
    return p * p / 0.95 + (q * q) / 0.2 < 1.0 + rauschen[i][j];
  };
  E.aktiv = (i, j) => {
    const f = E.belegt.get(`${i},${j}`);
    if (f && f.art !== 'wasser') return true;
    if (E.warenhaus.i === i && E.warenhaus.j === j) return true;
    if (E.einkaufZellen?.has(`${i},${j}`) || E.einkaufKern?.(i, j)) return true;
    return Math.hypot(i - E.zentrum.i, j - E.zentrum.j) < 1.6 || aktivRoh(i, j);
  };
  const randZelle = (i, j) => E.aktiv(i, j) && ([[-1, 0], [1, 0], [0, -1], [0, 1]].some(([a, b]) => i + a < 0 || j + b < 0 || i + a >= nx() || j + b >= nz() || !E.aktiv(i + a, j + b)));
  // --- Einkaufszentren und Fachmarktlagen am Stadtrand (Standorte 'center' und 'rand') ---
  if (E.randStandorte?.length) randLagen(E, randZelle, zellenNach);
  // --- Discounter, Parks, Kleingärten, Parkplätze ---
  if (gewaehlt('slot:discounter')) {
    const l = zellenNach((i, j) => randZelle(i, j) && Math.hypot(i - E.zentrum.i, j - E.zentrum.j) > 3.2, () => 1);   // Großbau nicht im Zentrumsbild
    if (l.length) { const [i, j] = wahlGewichtet(r, l); nimm(E, { art: 'gewerbe', i0: i, i1: i, j0: j, j1: j }); }
  }
  for (let k = 0; k < T.park + (r() < 0.4 ? 1 : 0); k++) {
    const l = zellenNach((i, j) => E.aktiv(i, j) && Math.hypot(i - E.zentrum.i, j - E.zentrum.j) > 1.6, (i, j) => 1 + (randZelle(i, j) ? 1 : 0));
    if (!l.length) break;
    const [i, j] = wahlGewichtet(r, l);
    if (E.typ === 'metropole' && zelleFrei(E, i, j + 1) && r() < 0.6) nimm(E, { art: 'park', i0: i, i1: i, j0: j, j1: j + 1 });
    else nimm(E, { art: 'park', i0: i, i1: i, j0: j, j1: j });
  }
  if (E.typ !== 'metropole' || E.kleingaertenExtra) for (let k = 0, m = Math.floor(zw(r, 0, 2.6)) + (E.kleingaertenExtra ?? 0); k < m; k++) {
    const l = zellenNach((i, j) => randZelle(i, j) && Math.hypot(i - E.zentrum.i, j - E.zentrum.j) > 2.4, () => 1);
    if (l.length) { const [i, j] = wahlGewichtet(r, l); nimm(E, { art: 'kleingarten', i0: i, i1: i, j0: j, j1: j }); }
  }
  if (r() < 0.45) {
    // GESTALTUNG.md: offene Parkplatzblöcke nur am Stadtrand, nie in der Innenstadt
    const l = zellenNach((i, j) => randZelle(i, j) && Math.hypot(i - E.zentrum.i, j - E.zentrum.j) > 2.6, () => 1);
    if (l.length) { wahlGewichtet(r, l); }   // GESTALTUNG.md: keine offenen Parkplatzblöcke (Zufallszug bleibt für gleichen Plan)
  }
  if (r() < 0.3) {
    const l = zellenNach((i, j) => E.aktiv(i, j) && Math.hypot(i - E.zentrum.i, j - E.zentrum.j) > 2, () => 1);
    if (l.length) { const [i, j] = wahlGewichtet(r, l); nimm(E, { art: 'park', i0: i, i1: i, j0: j, j1: j, spielplatz: true }); }
  }
  // Zusätzlicher Kanal, falls die Stadt noch kein Wasser hat
  if (o.wasser !== false && !E.flaechen.some((f) => f.art === 'wasser') && r() < 0.3) {
    const l = [];
    for (let i = 0; i < nx(); i++) if (frei(E, i, i, 0, nz() - 1) && Math.abs(i - E.zentrum.i) > 1.2) l.push(i);
    if (l.length) wasserSpalte(E, waehle(r, l), 0, nz() - 1, 'kanal');
  }
  if (o.wasser === false) E.flaechen = E.flaechen.filter((f) => f.art !== 'wasser');
  // Höhen: ein bis zwei Hochpunkte je Stadt
  E.hoch.push({ i: E.zentrum.i + zw(r, -1, 1), j: E.zentrum.j + zw(r, -1, 1), s: E.typ === 'metropole' ? 1.4 : 0.8 });
  if (r() < 0.5) E.hoch.push({ i: zw(r, 0, nx()), j: zw(r, 0, nz()), s: 0.7 });
  // Fußgängerzone wird nach dem Raster bestimmt (an den Warenhaus-Fronten); mit Standorten ist sie schon gesetzt
  E.fzAuto = !E.einkauf;
}

// ====================================================================================
// Einkaufslage (nur mit o.standorte)
// ====================================================================================
/** Slotmaße eines Standorts: w × d aus dem Eintrag, sonst aus der Grundfläche geschätzt (Seitenverhältnis 1,5). */
export function standortMasse(st) {
  if (st.w && st.d) return { w: st.w, d: st.d };
  const A = Math.max(400, st.grundflaecheQm ?? 2500);
  const w = Math.max(20, Math.round(Math.sqrt(A * 1.5) / 5) * 5);
  return { w, d: Math.max(15, Math.round(A / w / 5) * 5) };
}
export const SLOT_ROLLE = { warenhaus: 'slot:warenhaus', sport: 'slot:sport', wettbewerber: 'slot:wettbewerber', schwester: 'slot:schwester' };

/**
 * Sucht ein Kreuz aus zwei Haupteinkaufsstraßen (z-Linie kF, x-Linie lF) nahe dem Zentrum und verteilt die
 * 1a- und b-Standorte auf Blöcke daran. Die Blöcke werden so vergrößert, dass die Slots hineinpassen.
 * Ergebnis: E.einkauf (Slots in bebauten Blöcken), E.randStandorte (center/rand, später), E.fz, E.einkaufslage.
 */
function einkaufslage(E, standorte) {
  const liste = standorte.map((st, n) => ({ st, n, m: standortMasse(st), lage: st.lage ?? '1a', rolle: st.rolle ?? 'warenhaus' }));
  const innen = liste.filter((e) => e.lage === '1a' || e.lage === 'b');
  E.randStandorte = liste.filter((e) => e.lage === 'center' || e.lage === 'rand');
  E.einkauf = [];
  E.einkaufZellen = new Set();
  // Geteilte Stadt (Berlin): Standorte abwechselnd je Rolle auf zwei Kerne verteilen
  const kerne = E.zweiKerne ?? [E.zentrum];
  const gruppen = kerne.map(() => []);
  const zaehl = {};
  for (const e of innen) { const k = (zaehl[e.rolle] = (zaehl[e.rolle] ?? -1) + 1); gruppen[k % kerne.length].push(e); }
  const lagen = kerne.map((zc, g) => einkaufsKreuz(E, gruppen[g], zc)).filter(Boolean);
  const altEinschub = E.einschub;
  E.einschub = (i, j) => (E.einkaufZellen.has(`${i},${j}`) ? 0 : altEinschub(i, j));
  E.einkaufslage = lagen[0];
  E.einkaufslagen = lagen;
  E.einkaufKern = (i, j) => lagen.some((L) => ((i === L.kF - 1 || i === L.kF) && j >= L.j0 && j <= L.j1) || ((j === L.lF - 1 || j === L.lF) && i >= L.i0 && i <= L.i1));
  const haupt = E.einkauf.find((e) => e.typ === 'slot:warenhaus' && e.lage === '1a') ?? E.einkauf[0];
  const L0 = lagen[0];
  E.warenhaus = haupt ? { i: haupt.i, j: haupt.j, W: haupt.W, D: haupt.D, ecke: haupt.ecke } : { i: L0.kF - 1, j: L0.lF - 1, W: 0, D: 0, ecke: '+x+z', leer: true };
  E.zentrum = { i: L0.kF - 1, j: L0.lF - 1 };
}

/** Ein Kreuz aus zwei Haupteinkaufsstraßen nahe zc, Slots für die Liste innen. Ergebnis: Rechteck der Einkaufslage. */
function einkaufsKreuz(E, innen, zc) {
  const { r } = E;
  const nx = E.spalten.length, nz = E.reihen.length;
  const istHaupt = (t) => HAUPTLICH.has(t);
  // Kandidaten am Kreuz: zuerst Blöcke, deren Front zur Einkaufsstraße sichtbar ist (+x bzw. +z), dann die Rückseite
  const kandidatenAm = (kF, lF) => {
    const k = [];
    const add = (i, j, ecke, prio) => { if (i >= 0 && j >= 0 && i < nx && j < nz && !k.some((q) => q.i === i && q.j === j)) k.push({ i, j, ecke, prio }); };
    add(kF - 1, lF - 1, '+x+z', 0);
    for (let s = 1; s <= 4; s++) {
      add(kF - 1, lF - 1 - s, '+x+z', s); add(kF - 1 - s, lF - 1, '+x+z', s);
      add(kF - 1, lF - 1 + s, '+x+z', s + 0.3); add(kF - 1 + s, lF - 1, '+x+z', s + 0.3);
    }
    for (let s = 0; s <= 3; s++) {
      add(kF, lF - 1 - s, '-x+z', s + 1.6); add(kF - 1 - s, lF, '+x-z', s + 1.6);
      add(kF, lF + s, '-x+z', s + 2.2); add(kF + s, lF, '+x-z', s + 2.2);
    }
    return k.filter((q) => zelleFrei(E, q.i, q.j)).sort((a, b) => a.prio - b.prio);
  };
  const n1a = innen.filter((e) => e.lage === '1a').length;
  const schon = E.einkaufslagen ?? [];
  let best = null;
  for (let kF = 1; kF < nx; kF++) for (let lF = 1; lF < nz; lF++) {
    if (istHaupt(E.zTyp[kF]) || istHaupt(E.xTyp[lF]) || E.tram.includes('z' + kF)) continue;
    if (E.zTyp[kF] === 'einkauf' && E.xTyp[lF] === 'einkauf') continue;
    const k = kandidatenAm(kF, lF);
    const gut = k.filter((q) => q.prio < 5).length;
    // GESTALTUNG.md 3/4: Wasser und Gleise nie als großer Bildteil der Einkaufslage. Solche Zellen nahe am Kreuz kosten Punkte.
    let nass = 0;
    for (let i = kF - 3; i <= kF + 2; i++) for (let j = lF - 3; j <= lF + 2; j++) { const f = E.belegt.get(`${i},${j}`); if (f && (f.art === 'wasser' || f.art === 'bahn')) nass += Math.max(i - kF + 1, kF - i, j - lF + 1, lF - j) <= 1 ? 1.6 : 0.7; }
    const s = Math.min(gut, n1a + 2) * 3 + Math.min(k.length, n1a + 4) - 2.2 * Math.hypot(kF - 1 - zc.i, lF - 1 - zc.j) + r() * 0.5
      - (kF < 2 || lF < 2 || kF > nx - 2 || lF > nz - 2 ? 4 : 0) - nass;
    if (!best || s > best.s) best = { s, kF, lF, k };
  }
  void schon;
  if (!best) return null;
  const { kF, lF } = best;
  let kand = best.k;
  const meine = [];
  const nimmZelle = (e, q, typLage) => {
    const slot = { i: q.i, j: q.j, W: e.m.w, D: e.m.d, ecke: q.ecke, typ: SLOT_ROLLE[e.rolle] ?? 'slot:warenhaus', standort: e.st, lage: typLage };
    E.einkauf.push(slot); meine.push(slot);
    E.einkaufZellen.add(`${q.i},${q.j}`);
    kand = kand.filter((x) => x !== q);
  };
  // Reihenfolge: Hartwig-Warenhäuser (groß zuerst) bekommen die besten Ecken, danach Wettbewerber und Sport nach Größe
  const rang = (e) => (e.rolle === 'warenhaus' ? 0 : 1);
  const a1 = innen.filter((e) => e.lage === '1a').sort((a, b) => rang(a) - rang(b) || b.m.w * b.m.d - a.m.w * a.m.d || a.n - b.n);
  const zuB = [];
  for (const e of a1) { kand = kand.filter((q) => zelleFrei(E, q.i, q.j)); if (kand.length) nimmZelle(e, kand[0], '1a'); else zuB.push(e); }
  // Nebenlagen: frei, nicht an der Einkaufsstraße, 1,5 bis 3,5 Zellen vom Kreuz, gern an einer Hauptstraße
  const kx = kF - 0.5, kz = lF - 0.5;
  for (const e of [...innen.filter((x) => x.lage === 'b'), ...zuB]) {
    const l = [];
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      if (!zelleFrei(E, i, j) || i === kF - 1 || i === kF || j === lF - 1 || j === lF) continue;
      const dd = Math.hypot(i + 0.5 - kx, j + 0.5 - kz);
      if (dd < 1.2 || dd > 4) continue;
      const anHaupt = istHaupt(E.zTyp[i + 1]) || istHaupt(E.xTyp[j + 1]) || istHaupt(E.zTyp[i]) || istHaupt(E.xTyp[j]);
      const nachbar = [...E.einkaufZellen].some((s) => { const [a, b] = s.split(',').map(Number); return Math.abs(a - i) + Math.abs(b - j) <= 1; });
      l.push([{ i, j, ecke: '+x+z' }, (anHaupt ? 2.5 : 1) / (0.5 + Math.abs(dd - 2.2)) * (nachbar ? 0.3 : 1)]);
    }
    kand = kand.filter((q) => zelleFrei(E, q.i, q.j));
    if (l.length) nimmZelle(e, wahlGewichtet(r, l), 'b');
    else if (kand.length) nimmZelle(e, kand[0], 'b');
  }
  // Blöcke vergrößern, damit die Slots passen (Restbebauung bleibt dahinter)
  for (const e of meine) {
    E.spalten[e.i] = Math.max(E.spalten[e.i], Math.ceil((e.W + 30) / 2) * 2);
    E.reihen[e.j] = Math.max(E.reihen[e.j], Math.ceil((e.D + 28) / 2) * 2);
    fixiere(E, e.i); fixiere(E, e.i + 1);
  }
  // Einkaufsstraßen: Linien kF und lF, Länge so, dass alle 1a-Slots daran liegen
  E.zTyp[kF] = 'einkauf'; E.xTyp[lF] = 'einkauf';
  fixiere(E, kF);
  const amZ = meine.filter((e) => e.lage === '1a' && (e.i === kF - 1 || e.i === kF)).map((e) => e.j);
  const amX = meine.filter((e) => e.lage === '1a' && (e.j === lF - 1 || e.j === lF)).map((e) => e.i);
  const j0 = klemm(Math.min(lF - 2, ...amZ), 0, nz - 1), j1 = klemm(Math.max(lF + 1, ...amZ), 0, nz - 1);
  const i0 = klemm(Math.min(kF - 2, ...amX), 0, nx - 1), i1 = klemm(Math.max(kF + 1, ...amX), 0, nx - 1);
  for (let j = j0; j <= j1; j++) E.fz.push(`z${kF}:${j}`);
  for (let i = i0; i <= i1; i++) E.fz.push(`x${lF}:${i}`);
  const L = { kF, lF, i0, i1, j0, j1 };
  E.einkaufslagen = [...schon, L];
  return L;
}

/**
 * Standorte 'center' (Einkaufszentrum an der Ausfallstraße) und 'rand' (Fachmarktlage) auf Randzellen legen.
 * Center-Standorte derselben Stadt teilen sich Zentren: bis 2 Standorte ein Center, mehr zwei. Hartwig-Warenhäuser
 * werden zuerst verteilt, Hartwig Sport und weitere Mieter danach, so dass Warenhaus und Sport im selben Center liegen.
 */
function randLagen(E, randZelle, zellenNach) {
  const { r } = E;
  const belegt = [];
  const center = E.randStandorte.filter((e) => e.lage === 'center');
  const rand = E.randStandorte.filter((e) => e.lage !== 'center');
  const nC = center.length === 0 ? 0 : center.length <= 2 ? 1 : 2;
  const gruppen = Array.from({ length: nC }, () => []);
  const sortiert = [...center].sort((a, b) => (a.rolle === 'warenhaus' ? 0 : 1) - (b.rolle === 'warenhaus' ? 0 : 1) || b.m.w * b.m.d - a.m.w * a.m.d || a.n - b.n);
  sortiert.forEach((e, k) => gruppen[k % Math.max(1, nC)].push(e));
  const lagen = [...gruppen.map((g) => ({ art: 'center', liste: g })), ...rand.map((e) => ({ art: 'fachmarkt', liste: [e] }))];
  for (const L of lagen) {
    const dist = (i, j) => Math.hypot(i - E.zentrum.i, j - E.zentrum.j);
    const anHaupt = (i, j) => HAUPTLICH.has(E.zTyp[i + 1]) || HAUPTLICH.has(E.xTyp[j + 1]) || HAUPTLICH.has(E.zTyp[i]) || HAUPTLICH.has(E.xTyp[j]);
    const abstand = (i, j) => belegt.reduce((a, [p, q]) => Math.min(a, Math.abs(p - i) + Math.abs(q - j)), 99);
    // Center innerhalb der Karte mit Abstand zum Rand (zweite Zellreihe), damit sein Ausschnitt mittig in der Stadt liegt;
    // Fachmarktlagen bleiben an der Randzeile
    const zweiteReihe = (i, j) => E.aktiv(i, j) && Math.min(i, j, E.spalten.length - 1 - i, E.reihen.length - 1 - j) === 1;
    let l = L.art === 'center' ? zellenNach((i, j) => zweiteReihe(i, j) && dist(i, j) > 3.4 && abstand(i, j) > 1, (i, j) => (anHaupt(i, j) ? 4 : 1) * dist(i, j)) : [];
    if (!l.length) l = zellenNach((i, j) => randZelle(i, j) && dist(i, j) > 2.4 && abstand(i, j) > 1, (i, j) => (anHaupt(i, j) ? (L.art === 'center' ? 4 : 1.5) : 1) * dist(i, j));
    if (!l.length) l = zellenNach((i, j) => dist(i, j) > 1.8 && abstand(i, j) > 0, (i, j) => dist(i, j));
    if (!l.length) continue;
    const [i, j] = wahlGewichtet(r, l);
    belegt.push([i, j]);
    const standorte = L.liste.map((e) => ({ ...e.st, _typ: SLOT_ROLLE[e.rolle] ?? 'slot:warenhaus', _w: e.m.w, _d: e.m.d }));
    nimm(E, { art: L.art, i0: i, i1: i, j0: j, j1: j, standorte });
    // Center: Mieter nebeneinander unter einem Dach, Mall-Verbinder zwischen den Häusern
    const breite = L.liste.reduce((a, e) => a + e.m.w, 0) + (L.liste.length - 1) * 10;
    const tiefe = Math.max(...L.liste.map((e) => e.m.d));
    E.spalten[i] = Math.max(E.spalten[i], Math.ceil((breite + (L.art === 'fachmarkt' ? 62 : 14)) / 2) * 2);
    E.reihen[j] = Math.max(E.reihen[j], Math.ceil((tiefe + 46) / 2) * 2);
  }
}

// ====================================================================================
// Raster aus explizitem Entwurf (auch direkt aufrufbar, rückwärtskompatibel)
// ====================================================================================
/**
 * Plan aus explizitem Raster (für Kataloge und Sonderfälle).
 * cfg: { typ, region, spalten:[w], reihen:[d], zLinien:[linientyp] (nx+1), xLinien:[linientyp] (nz+1),
 *        tram:['z3','x2'], fz:['x2:1','z3:0'] (Linie:Index → Fußgängerzone), flaechen:[{art,i0,i1,j0,j1,…}],
 *        warenhaus:{i,j,W,D,ecke}|null, kern:{i,j}, hochhaus:n, rathaus:bool, bruecken:'alle'|'zufall', strassenFaktor }
 */
export function rasterPlan(seed, cfg) {
  const typ = cfg.typ ?? 'grossstadt';
  const r = rng(seed * 31 + 3);
  const region = cfg.region ?? 'mitte';
  const E = {
    seed, r, typ, T: TYPEN[typ], region, R: REGIONEN[region], archetyp: cfg.archetyp ?? 'raster',
    spalten: cfg.spalten, reihen: cfg.reihen, zTyp: cfg.zLinien, xTyp: cfg.xLinien,
    fest: new Set(cfg.zLinien.map((_, k) => `${k}`)), versatz: cfg.versatz ?? (() => 0), einschub: cfg.einschub ?? (() => 0), durchgang: cfg.durchgang ?? 0,
    flaechen: cfg.flaechen ?? [], aktiv: () => true, umland: 'land', umriss: 'voll',
    warenhaus: cfg.warenhaus ? { ecke: '+x+z', ...cfg.warenhaus } : null, landmarken: [], tram: cfg.tram ?? [], fz: cfg.fz ?? [],
    zentrum: cfg.kern ?? { i: cfg.spalten.length / 2, j: cfg.reihen.length / 2 }, hoch: [], strassenFaktor: cfg.strassenFaktor ?? 1,
    bruecken: cfg.bruecken ?? 'zufall', baumarten: cfg.baumarten ?? REGIONEN[region].baeume, hochhausAnzahl: cfg.hochhaus ?? 0, rathausAmMarkt: cfg.rathaus !== false,
    viertel: cfg.viertel ?? (typ === 'mittelstadt' ? ((i, j) => (Math.hypot(i - (cfg.kern?.i ?? 0), j - (cfg.kern?.j ?? 0)) < 1.7 ? 'altstadt' : 'nachkrieg')) : null),
    keineDetails: cfg.keineDetails ?? false,
  };
  if (E.versatz && typeof E.versatz !== 'function') { const v = E.versatz; E.versatz = () => v; E.fest = new Set(['0', `${cfg.spalten.length}`]); }
  E.belegt = new Map();
  for (const f of E.flaechen) for (let i = f.i0; i <= f.i1; i++) for (let j = f.j0; j <= f.j1; j++) E.belegt.set(`${i},${j}`, f);
  return baueRaster(seed, E);
}

function baueRaster(seed, E) {
  const { typ, T } = E;
  const R = E.R ?? REGIONEN.mitte;
  const r = rng(seed * 104729 + 7);
  const nx = E.spalten.length, nz = E.reihen.length;
  const fk = E.strassenFaktor ?? 1;
  const baumarten = E.baumarten?.length ? E.baumarten : R.baeume;
  const linie = (t, achse, k) => {
    const L = LINIEN[t];
    return { achse, index: k, typ: t, breite: Math.round(L.breite * fk * 2) / 2, gehweg: Math.round(L.gehweg * fk * 4) / 4, mittel: L.mittel ? L.mittel * Math.min(fk, 1.3) : 0,
      tram: (E.tram ?? []).includes(achse + k), parken: r() < 0.5 ? 1 : -1, baeume: (r(), HAUPTLICH.has(t)), baumart: waehle(r, baumarten) };   // GESTALTUNG.md: Nebenstraßen einheitlich, Baumreihen nur an Hauptachsen (Zufallszug bleibt, damit der übrige Plan gleich bleibt)
  };
  const zL = E.zTyp.map((t, k) => linie(t, 'z', k));
  const xL = E.xTyp.map((t, l) => linie(t, 'x', l));
  const sx = [], sz = [];
  let cur = 0;
  for (let k = 0; k <= nx; k++) { zL[k].von = cur; zL[k].x = cur + zL[k].breite / 2; cur += zL[k].breite; if (k < nx) { sx[k] = cur; cur += E.spalten[k]; } }
  const breite = cur;
  cur = 0;
  for (let l = 0; l <= nz; l++) { xL[l].von = cur; xL[l].z = cur + xL[l].breite / 2; cur += xL[l].breite; if (l < nz) { sz[l] = cur; cur += E.reihen[l]; } }
  const tiefe = cur;
  const spalteBei = (x) => { for (let i = 0; i < nx; i++) if (x < sx[i] + E.spalten[i] + zL[i + 1].breite / 2) return i; return nx - 1; };

  // Flächen und Aktivität
  const flaechen = E.flaechen.map((f, n) => ({ ...f, nr: n }));
  const feld = [];
  for (let i = 0; i < nx; i++) { feld.push([]); for (let j = 0; j < nz; j++) feld[i].push(null); }
  for (const f of flaechen) for (let i = f.i0; i <= f.i1; i++) for (let j = f.j0; j <= f.j1; j++) if (i >= 0 && j >= 0 && i < nx && j < nz) feld[i][j] = f;
  const zelle = (i, j) => (i < 0 || j < 0 || i >= nx || j >= nz ? { f: null, akt: false } : { f: feld[i][j], akt: !!(feld[i][j] && feld[i][j].art !== 'wasser') || E.aktiv(i, j) });
  const istWasser = (c) => !!(c.f && c.f.art === 'wasser');
  const land = (c) => c.akt && !istWasser(c);
  const viertelVon = (i, j) => (E.viertel ? E.viertel(i, j) : (() => { const dd = Math.hypot(i - E.zentrum.i, j - E.zentrum.j); return dd < 1.3 ? 'zentrum' : dd < 2.8 ? 'gruenderzeit' : 'nachkrieg'; })());
  const brueckeP = E.bruecken === 'alle' ? 1 : E.bruecken === 'viele' ? 0.9 : T.bruecke;
  // --- Brücken je Fluss (gilt für Flüsse in beiden Richtungen) ---
  // Kandidaten sind alle Linien, die eine Wasserfläche queren: bei quer liegenden Flüssen die z-Linien k = i0+1 … i1,
  // sonst die x-Linien l = j0+1 … j1. Hauptstraßen sind Pflicht (außer zu dicht), Nebenstraßen mit f.brueckeP, alle mit
  // Mindestabstand f.brueckenAbstand (m) bzw. genau f.brueckenZahl Brücken, gleichmäßig verteilt. Ohne Brücke bleibt
  // der Fluss durchgehend; so zerfällt er nicht in Becken. Mindestens eine Brücke, außer f.keineBruecke.
  const BRUECKE_ABSTAND = { metropole: 190, grossstadt: 200, mittelstadt: 150 };
  const brueckenSet = new Map();
  const brueckeErlaubt = (f, idx) => !!brueckenSet.get(f)?.has(idx);
  for (const f of flaechen) {
    if (f.art !== 'wasser' || f.keineBruecke) continue;
    const rB = rng(seed * 31337 + f.nr * 101 + 17);
    const kand = [];
    if (f.quer) { for (let k = f.i0 + 1; k <= f.i1; k++) kand.push({ idx: k, pos: zL[k].x, haupt: HAUPTLICH.has(zL[k].typ) }); }
    else for (let l = f.j0 + 1; l <= f.j1; l++) kand.push({ idx: l, pos: xL[l].z, haupt: HAUPTLICH.has(xL[l].typ) });
    if (!kand.length) continue;
    const P = f.brueckeP ?? brueckeP;
    for (const c of kand) { c.wahr = c.haupt || rB() < P; c.los = rB(); }
    const A = E.bruecken === 'alle' ? 0 : f.brueckenAbstand ?? E.brueckenAbstand ?? (f.form === 'kanal' ? 230 : BRUECKE_ABSTAND[typ] ?? 180);
    const nimmt = [];
    if (f.brueckenZahl !== undefined) {
      const n = Math.min(f.brueckenZahl, kand.length);
      const a = kand[0].pos, e = kand[kand.length - 1].pos;
      for (let q = 0; q < n; q++) {
        const ziel = n === 1 ? (a + e) / 2 : a + ((e - a) * q) / (n - 1);
        const frei = kand.filter((c) => !nimmt.includes(c));
        frei.sort((c, d) => Math.abs(c.pos - ziel) - (c.haupt ? 25 : 0) - (Math.abs(d.pos - ziel) - (d.haupt ? 25 : 0)));
        if (frei[0]) nimmt.push(frei[0]);
      }
    } else {
      const weit = (c, m) => nimmt.every((d) => Math.abs(d.pos - c.pos) >= m);
      for (const c of kand.filter((c) => c.haupt)) if (weit(c, A * 0.5)) nimmt.push(c);
      for (const c of kand.filter((c) => !c.haupt && c.wahr).sort((c, d) => c.los - d.los)) if (weit(c, A)) nimmt.push(c);
      if (!nimmt.length) nimmt.push(kand[Math.floor((kand.length - 1) / 2)]);
    }
    brueckenSet.set(f, new Set(nimmt.map((c) => c.idx)));
  }

  // --- Bänder: Grenzen (z-Linien) je Reihe ---
  const MINZ = 26;
  const baender = [];
  for (let j = 0; j < nz; j++) {
    const g = [];
    for (let k = 0; k <= nx; k++) {
      const a = zelle(k - 1, j), b = zelle(k, j);
      const gleich = a.f && a.f === b.f;
      let art;
      if (k === 0 || k === nx) { const c = k === 0 ? b : a; art = land(c) && c.f?.art !== 'kulisse' ? 'strasse' : 'rand'; }   // vor Kulissen (Bergen) keine Randstraße
      else if (gleich) {
        // Zufall wie bisher ziehen (der übrige Plan bleibt gleich), entschieden wird über brueckenSet
        if (a.f.art === 'wasser' && a.f.quer && !a.f.keineBruecke) { if (!HAUPTLICH.has(zL[k].typ)) r(); art = brueckeErlaubt(a.f, k) ? 'bruecke' : 'keine'; }
        else art = 'keine';
      }
      else if (land(a) || land(b)) art = 'strasse';
      else if (a.f !== b.f || a.akt !== b.akt) art = 'virtuell';
      else art = 'keine';
      const fest = k === 0 || k === nx || E.fest.has(`${k}`) || E.fest.has(`${k}:${j}`) || !!(a.f && !gleich) || !!(b.f && !gleich) || gleich || art !== 'strasse';
      const v = fest ? 0 : E.versatz(k, j) ?? 0;
      g.push({ k, x: zL[k].x + (v ? Math.round(zw(r, -v, v)) : 0), L: zL[k], art, fest });
    }
    // Mindestbreiten sichern
    for (let n = 0; n < 2; n++) for (let q = 0; q + 1 < g.length; q++) {
      const a = g[q], b = g[q + 1];
      if (b.x - a.x - (a.L.breite + b.L.breite) / 2 < MINZ) { if (!b.fest) b.x = b.L.x; else if (!a.fest) a.x = a.L.x; }
    }
    // Eingeschobene Gassen
    const neu = [];
    for (let q = 0; q + 1 < g.length; q++) {
      const a = g[q], b = g[q + 1];
      if (a.art === 'keine' || b.art === 'keine') continue;
      const i = a.k;
      const c = zelle(i, j);
      if (!land(c) || c.f) continue;
      const x0 = a.x + a.L.breite / 2, x1 = b.x - b.L.breite / 2;
      if (x1 - x0 < 2 * 30 + 12 || r() >= (E.einschub(i, j) ?? 0)) continue;
      const L = linie('gasse', 'z', null);
      neu.push({ k: null, iNenn: i, x: x0 + 36 + r() * (x1 - x0 - 72), L, art: 'strasse', fest: false, eingeschoben: true });
    }
    g.push(...neu);
    g.sort((a, b) => a.x - b.x);
    // An der Reihe darüber ausrichten (keine Mini-Versprünge)
    if (j > 0) {
      const oben = baender[j - 1].grenzen.filter((x) => x.art === 'strasse' || x.art === 'bruecke');
      for (const x of g) {
        if (x.fest || x.art !== 'strasse') continue;
        let best = null;
        for (const o of oben) if (!best || Math.abs(o.x - x.x) < Math.abs(best.x - x.x)) best = o;
        if (best && Math.abs(best.x - x.x) > 0.01 && Math.abs(best.x - x.x) < (best.L.breite + x.L.breite) / 2 + 10) x.x = best.x;
      }
      g.sort((a, b) => a.x - b.x);
    }
    baender.push({ j, grenzen: g });
  }
  // Spannen je Band (Zellen zwischen trennenden Grenzen)
  for (const B of baender) {
    const trenn = B.grenzen.filter((x) => x.art === 'strasse' || x.art === 'virtuell' || x.art === 'rand');
    B.spannen = [];
    for (let q = 0; q + 1 < trenn.length; q++) {
      const a = trenn[q], b = trenn[q + 1];
      const x0 = a.art === 'strasse' ? a.x + a.L.breite / 2 : a.x, x1 = b.art === 'strasse' ? b.x - b.L.breite / 2 : b.x;
      const iN = a.k !== null ? Math.min(nx - 1, a.k) : a.iNenn;
      const iE = b.k !== null ? b.k - 1 : b.iNenn;
      const c = zelle(iN, B.j);
      B.spannen.push({ j: B.j, x0, x1, i0: iN, i1: Math.max(iN, iE), links: a, rechts: b, f: c.f, akt: c.akt });
    }
  }
  const spanneBei = (j, x) => (j < 0 || j >= nz ? null : baender[j].spannen.find((s) => x >= s.x0 - 0.01 && x <= s.x1 + 0.01) ?? baender[j].spannen.find((s) => x >= s.links.x && x <= s.rechts.x) ?? null);
  const cellOf = (sp) => (sp ? { f: sp.f, akt: sp.akt } : { f: null, akt: false });

  // --- Straßensegmente ---
  const strassen = [];
  const fzSet = new Set(E.fz ?? []);
  const segTyp = (L, key) => (L.typ === 'fz' ? (fzSet.has(key) ? 'fussgaenger' : 'gasse') : L.typ === 'einkauf' ? (fzSet.has(key) ? 'fussgaenger' : 'neben') : HAUPTLICH.has(L.typ) ? 'haupt' : fzSet.has(key) ? 'fussgaenger' : L.typ);
  const neuesSeg = (L, idx, key, mitte, von, bis, bruecke, extra = {}) => {
    let typS = segTyp(L, key);
    if (bruecke && typS === 'fussgaenger') typS = 'neben';
    const s = { id: 's' + strassen.length, achse: L.achse, linie: L.index, index: idx, schluessel: key, typ: typS, art: HAUPTLICH.has(L.typ) && L.typ !== 'haupt' ? L.typ : null,
      breite: L.breite, gehweg: L.gehweg, mittel: L.mittel, mitte, von, bis, tram: L.tram, mittelstreifen: MITTELSTREIFEN.has(L.typ), bruecke: !!bruecke,
      parken: HAUPTLICH.has(L.typ) ? 0 : L.parken, baeume: L.baeume, baumart: L.baumart, belag: 'asphalt', ...extra };
    strassen.push(s);
    return s;
  };
  for (const B of baender) for (const g of B.grenzen) {
    if (g.art !== 'strasse' && g.art !== 'bruecke') continue;
    const key = g.k !== null ? `z${g.k}:${B.j}` : `zg${B.j}:${Math.round(g.x)}`;
    g.seg = neuesSeg(g.L, B.j, key, g.x, sz[B.j], sz[B.j] + E.reihen[B.j], g.art === 'bruecke', g.eingeschoben ? { eingeschoben: true } : {});
  }
  const kreuzungen = [];
  for (let l = 0; l <= nz; l++) {
    const knoten = [];
    const add = (g, wo) => {
      let n = knoten.find((q) => Math.abs(q.x - g.x) < 0.5);
      if (!n) { n = { x: g.x, bw: 0, gw: 0, oben: null, unten: null }; knoten.push(n); }
      n.bw = Math.max(n.bw, g.L.breite); n.gw = Math.max(n.gw, g.L.gehweg); n[wo] = g.seg;
    };
    if (l > 0) for (const g of baender[l - 1].grenzen) if (g.seg) add(g, 'oben');
    if (l < nz) for (const g of baender[l].grenzen) if (g.seg) add(g, 'unten');
    knoten.sort((a, b) => a.x - b.x);
    // Randlinie hinter einem Querfluss der Randreihe läuft über die ganze Kartenbreite (Uferstraße), auch ohne Brücken
    if (l === 0 || l === nz) {
      const jr = l === 0 ? 0 : nz - 1, fq = feld[0]?.[jr];
      if (fq && fq.art === 'wasser' && fq.quer && !fq.keineBruecke && feld[nx - 1]?.[jr] === fq) {
        if (!knoten.length || knoten[0].x - knoten[0].bw / 2 > 1) knoten.unshift({ x: 0, bw: 0, gw: 0, oben: null, unten: null, virt: true });
        if (knoten[knoten.length - 1].x + knoten[knoten.length - 1].bw / 2 < breite - 1) knoten.push({ x: breite, bw: 0, gw: 0, oben: null, unten: null, virt: true });
      }
    } else if (knoten.length) {
      // Flussspalte am Kartenrand, die in dieser Reihe beginnt oder endet: die Querstraße läuft bis zur Kante (Uferstraße)
      // ebenso entlang eines Querflusses: das Ufer braucht die Straße über die ganze Breite
      const istW = (i, j) => { const f = feld[i]?.[j]; return !!(f && f.art === 'wasser' && !f.quer); };
      const istQ = (i, j) => { const f = feld[i]?.[j]; return !!(f && f.art === 'wasser' && f.quer); };
      const rand = (i) => istW(i, l - 1) !== istW(i, l) || istQ(i, l - 1) !== istQ(i, l);
      if (rand(0) && knoten[0].x - knoten[0].bw / 2 > 1) knoten.unshift({ x: 0, bw: 0, gw: 0, oben: null, unten: null, virt: true });
      const kl = knoten[knoten.length - 1];
      if (rand(nx - 1) && kl.x + kl.bw / 2 < breite - 1) knoten.push({ x: breite, bw: 0, gw: 0, oben: null, unten: null, virt: true });
    }
    const stuecke = [];
    for (let q = 0; q + 1 < knoten.length; q++) {
      const a = knoten[q], b = knoten[q + 1];
      const von = a.x + a.bw / 2, bis = b.x - b.bw / 2;
      if (bis - von < 4) { stuecke.push(null); continue; }
      const xc = (von + bis) / 2;
      const cO = cellOf(spanneBei(l - 1, xc)), cU = cellOf(spanneBei(l, xc));
      let ok = false, bruecke = false;
      if (cO.f && cO.f === cU.f) { if (cO.f.art === 'wasser' && !cO.f.quer) { if (!HAUPTLICH.has(xL[l].typ)) r(); if (brueckeErlaubt(cO.f, l)) { ok = true; bruecke = true; } } }
      // Kartenrand: Straße an Land und als Uferstraße hinter einem Querfluss der Randreihe (Gegenufer im Stadtrandgürtel;
      // ohne Straße bliebe dort eine Lücke, durch die der Hintergrund scheint, Ulm, Celle)
      else if (l === 0 || l === nz) { const c = l === 0 ? cU : cO; ok = (land(c) && c.f?.art !== 'kulisse') || !!(c.f && c.f.art === 'wasser' && c.f.quer && !c.f.keineBruecke); }
      else if (land(cO) || land(cU)) ok = true;
      const i = spalteBei(xc);
      stuecke.push(ok ? neuesSeg(xL[l], i, `x${l}:${i}`, xL[l].z, von, bis, bruecke) : null);
    }
    knoten.forEach((n, q) => {
      if (n.virt) return;
      const arme = { '-z': n.oben, '+z': n.unten, '-x': q > 0 ? stuecke[q - 1] : null, '+x': q < stuecke.length ? stuecke[q] : null };
      const liste = Object.values(arme).filter(Boolean);
      if (!liste.length) return;
      const haupt = liste.some((s) => s.typ === 'haupt');
      const fahr = liste.filter((s) => s.typ !== 'fussgaenger');
      const ampel = liste.length >= 3 && haupt && fahr.length >= 3;
      kreuzungen.push({ id: 'k' + kreuzungen.length, k: n.oben?.linie ?? n.unten?.linie ?? null, l, x: n.x, z: xL[l].z, bx: n.bw, bz: xL[l].breite, gx: n.gw, gz: xL[l].gehweg, arme,
        ampel, zebra: fahr.length >= 3 && (ampel || typ !== 'mittelstadt' || r() < 0.6), gepflastert: fahr.length === 0, sackgasse: liste.length === 1 });
    });
  }

  // Brücken über Flüsse am Kartenrand laufen bis an die Kante (dort setzt stadtrand.js das Gegenufer mit Uferstraße fort),
  // statt in einer Kreuzungsplatte über dem Wasser zu enden
  for (let n = kreuzungen.length - 1; n >= 0; n--) {
    const k = kreuzungen[n], arme = Object.entries(k.arme).filter(([, a]) => a);
    if (arme.length !== 1 || !arme[0][1].bruecke) continue;
    const [seite, a] = arme[0];
    if (seite === '-z' && k.l === nz) a.bis = tiefe;
    else if (seite === '+z' && k.l === 0) a.von = 0;
    else if (seite === '-x' && Math.abs(k.x + k.bx / 2 - breite) < 1) a.bis = breite;
    else if (seite === '+x' && Math.abs(k.x - k.bx / 2) < 1) a.von = 0;
    else continue;
    kreuzungen.splice(n, 1);
  }
  // --- Blöcke ---
  const bloecke = [], parzellen = [], umland = [];
  const segAn = (achse, mitte, a, b) => strassen.find((s) => s.achse === achse && Math.abs(s.mitte - mitte) < 0.6 && s.von < b - 0.5 && s.bis > a + 0.5);
  const randInfo = (b) => {
    const rd = {};
    const sp = b.spanne;
    const lk = sp ? sp.links : null, rk = sp ? sp.rechts : null;
    const zl = (g, fallback) => (g && g.seg ? { typ: g.seg.typ, gehweg: g.L.gehweg, breite: g.L.breite, seg: g.seg.id } : { typ: fallback.typ, gehweg: fallback.gehweg, breite: fallback.breite, seg: null });
    rd['-x'] = lk ? zl(lk, lk.L) : zl(null, zL[b.i0]);
    rd['+x'] = rk ? zl(rk, rk.L) : zl(null, zL[b.i1 + 1]);
    if (!sp) {
      const sa = segAn('z', zL[b.i0].x, b.z, b.z + b.d), sb = segAn('z', zL[b.i1 + 1].x, b.z, b.z + b.d);
      rd['-x'] = { typ: sa?.typ ?? zL[b.i0].typ, gehweg: zL[b.i0].gehweg, breite: zL[b.i0].breite, seg: sa?.id ?? null };
      rd['+x'] = { typ: sb?.typ ?? zL[b.i1 + 1].typ, gehweg: zL[b.i1 + 1].gehweg, breite: zL[b.i1 + 1].breite, seg: sb?.id ?? null };
    }
    for (const [s, l] of [['-z', b.j0], ['+z', b.j1 + 1]]) {
      const sg = segAn('x', xL[l].z, b.x, b.x + b.w);
      rd[s] = { typ: sg ? sg.typ : xL[l].typ === 'fz' ? 'gasse' : xL[l].typ === 'einkauf' ? 'neben' : HAUPTLICH.has(xL[l].typ) ? 'haupt' : xL[l].typ, gehweg: xL[l].gehweg, breite: xL[l].breite, seg: sg?.id ?? null };
    }
    for (const s of Object.keys(rd)) if (rd[s].typ === 'fz') rd[s].typ = 'gasse';
    return rd;
  };
  const neuerBlock = (art, i0, i1, j0, j1, x, z, w, d, extra = {}) => {
    const b = { id: 'b' + bloecke.length, art, i0, i1, j0, j1, x, z, w, d, seed: ganz(r), parzellen: [], hof: null, ...extra };
    bloecke.push(b);
    return b;
  };
  // Flächen
  for (const f of flaechen) {
    if (f.i0 > f.i1 || f.j0 > f.j1) continue;
    const x0 = zL[f.i0].x + zL[f.i0].breite / 2, x1 = zL[f.i1 + 1].x - zL[f.i1 + 1].breite / 2;
    let z0 = sz[f.j0], z1 = sz[f.j1] + E.reihen[f.j1];
    const extra = {};
    for (const [k, v] of Object.entries(f)) if (!['art', 'i0', 'i1', 'j0', 'j1', 'nr'].includes(k) && v !== undefined) extra[k] = v;
    if (f.art === 'wasser') {
      let wx0 = x0, wx1 = x1;
      if (!f.quer) { if (f.j0 === 0) z0 = 0; if (f.j1 === nz - 1) z1 = tiefe; }
      else if (f.keineBruecke && f.j1 === nz - 1) z1 = tiefe;
      const nachbarWasser = (i, j) => { const c = zelle(i, j); return c.f && c.f.art === 'wasser' && c.f !== f; };
      let alle = true; for (let j = f.j0; j <= f.j1; j++) if (!nachbarWasser(f.i0 - 1, j)) alle = false;
      if (alle) wx0 = zL[f.i0].x - zL[f.i0].breite / 2;
      alle = true; for (let j = f.j0; j <= f.j1; j++) if (!nachbarWasser(f.i1 + 1, j)) alle = false;
      if (alle) wx1 = zL[f.i1 + 1].x + zL[f.i1 + 1].breite / 2;
      if (f.i0 === 0) wx0 = 0;
      if (f.i1 === nx - 1) wx1 = breite;
      const b = neuerBlock('wasser', f.i0, f.i1, f.j0, f.j1, wx0, z0, wx1 - wx0, z1 - z0, extra);
      b.rand = { '-x': { typ: zL[f.i0].typ, gehweg: zL[f.i0].gehweg, breite: zL[f.i0].breite }, '+x': { typ: zL[f.i1 + 1].typ, gehweg: zL[f.i1 + 1].gehweg, breite: zL[f.i1 + 1].breite },
        '-z': { typ: xL[f.j0].typ, gehweg: xL[f.j0].gehweg, breite: xL[f.j0].breite }, '+z': { typ: xL[f.j1 + 1].typ, gehweg: xL[f.j1 + 1].gehweg, breite: xL[f.j1 + 1].breite } };
      continue;
    }
    // GESTALTUNG.md: Grüngürtel sind schmale Promenaden. Ist eine Zelle durch vergrößerte Reihen/Spalten zu breit geworden, wird sie bebaut
    const art = f.art === 'gruenguertel' && Math.min(x1 - x0, z1 - z0) > 55 ? 'bebaut' : f.art;
    const b = neuerBlock(art, f.i0, f.i1, f.j0, f.j1, x0, z0, x1 - x0, z1 - z0, extra);
    b.rand = randInfo(b);
  }
  // Spannen ohne Fläche
  for (const B of baender) for (const sp of B.spannen) {
    if (sp.f) continue;
    if (!sp.akt) {
      // Umland oder See: bis zur Linienmitte darüber/darunter, falls dort keine Straße liegt
      const ob = !strassen.some((s) => s.achse === 'x' && Math.abs(s.mitte - xL[B.j].z) < 0.6 && s.von < sp.x1 && s.bis > sp.x0);
      const un = !strassen.some((s) => s.achse === 'x' && Math.abs(s.mitte - xL[B.j + 1].z) < 0.6 && s.von < sp.x1 && s.bis > sp.x0);
      const z0 = B.j === 0 ? 0 : sz[B.j] - (ob ? xL[B.j].breite : 0), z1 = B.j === nz - 1 ? tiefe : sz[B.j] + E.reihen[B.j] + (un ? xL[B.j + 1].breite : 0);
      const x0 = sp.links.art === 'rand' ? 0 : sp.x0, x1 = sp.rechts.art === 'rand' ? breite : sp.x1;
      // Seestädte: die Küste liegt im Stadtrandgürtel (stadtrand.js), inaktive Zellen werden Vorort statt Wasser
      // (sonst Wasser bis 46 % im Nahausschnitt, Rostock, Stralsund, Flensburg)
      if (E.umland === 'see' && E.o?.seeInnen) {
        const b = neuerBlock('wasser', sp.i0, sp.i1, B.j, B.j, x0, z0, x1 - x0, z1 - z0, { form: 'see' });
        b.rand = { '-x': { gehweg: sp.links.L.gehweg, typ: sp.links.L.typ }, '+x': { gehweg: sp.rechts.L.gehweg, typ: sp.rechts.L.typ }, '-z': { gehweg: xL[B.j].gehweg }, '+z': { gehweg: xL[B.j + 1].gehweg } };
      } else umland.push({ x: x0, z: z0, w: x1 - x0, d: z1 - z0, art: 'land', seed: ganz(r), nahStadt: true });
      continue;
    }
    const b = neuerBlock('bebaut', sp.i0, sp.i0, B.j, B.j, sp.x0, sz[B.j], sp.x1 - sp.x0, E.reihen[B.j], { spanne: sp });
    b.rand = randInfo(b);
  }

  // --- Lücken zwischen zwei Wasserflächen schließen: liegt zwischen ihnen eine Rasterlinie ohne Straße (Fluss trifft See,
  // Zusammenfluss wie in Passau, Seeflächen in Hamburg und Konstanz), läuft das Wasser durch, statt dass dort der
  // Hintergrund durchscheint (GESTALTUNG.md 4: Wasser als durchgehende Fläche) ---
  for (let runde = 0; runde < 2; runde++) {
    const wb = bloecke.filter((b) => b.art === 'wasser');
    const schon = new Set(wb.map((b) => b.id));
    const strasseIn = (x0, z0, x1, z1) => strassen.some((q) => {
      const [a0, a1] = [q.mitte - q.breite / 2, q.mitte + q.breite / 2];
      return q.achse === 'z' ? a0 < x1 - 0.5 && a1 > x0 + 0.5 && q.von < z1 - 0.5 && q.bis > z0 + 0.5 && !q.bruecke : q.von < x1 - 0.5 && q.bis > x0 + 0.5 && a0 < z1 - 0.5 && a1 > z0 + 0.5 && !q.bruecke;
    });
    for (const b of wb) for (const q of wb) {
      if (q === b) continue;
      const gz = q.z - (b.z + b.d), ox = Math.min(b.x + b.w, q.x + q.w) - Math.max(b.x, q.x);
      if (gz > 0.1 && gz < 60 && ox > 10) {
        const x0 = Math.max(b.x, q.x), x1 = Math.min(b.x + b.w, q.x + q.w);
        const id = b.id + 'f' + q.id;
        if (!schon.has(id) && !strasseIn(x0, b.z + b.d, x1, q.z)) { schon.add(id); bloecke.push({ ...b, id, x: x0, z: b.z + b.d, w: x1 - x0, d: gz, fuellung: true, keineSchiffe: true }); }
      }
      const gx = q.x - (b.x + b.w), oz = Math.min(b.z + b.d, q.z + q.d) - Math.max(b.z, q.z);
      if (gx > 0.1 && gx < 60 && oz > 10) {
        const z0 = Math.max(b.z, q.z), z1 = Math.min(b.z + b.d, q.z + q.d);
        const id = b.id + 'g' + q.id;
        if (!schon.has(id) && !strasseIn(b.x + b.w, z0, q.x, z1)) { schon.add(id); bloecke.push({ ...b, id, x: b.x + b.w, z: z0, w: gx, d: z1 - z0, fuellung: true, keineSchiffe: true }); }
      }
    }
  }
  // --- Flächen ohne Uferstraße (f.ohneUferstrasse: true = alle Wasserseiten, oder Liste ['+z', '-x']) ---
  // Die Straße zwischen Fläche und Wasser entfällt, der Block reicht bis an die Kaikante (Kais, Speicher, Hafen).
  for (const b of bloecke) {
    if (!b.ohneUferstrasse || b.art === 'wasser') continue;
    const wollen = Array.isArray(b.ohneUferstrasse) ? b.ohneUferstrasse : ['+z', '-z', '+x', '-x'];
    const nass = (i, j) => istWasser(zelle(i, j));
    for (const sd of wollen) {
      let alle = true;
      if (sd[1] === 'x') { const i = sd === '-x' ? b.i0 - 1 : b.i1 + 1; for (let j = b.j0; j <= b.j1; j++) if (!nass(i, j)) alle = false; }
      else { const j = sd === '-z' ? b.j0 - 1 : b.j1 + 1; for (let i = b.i0; i <= b.i1; i++) if (!nass(i, j)) alle = false; }
      if (!alle) continue;
      const L = sd[1] === 'x' ? zL[sd === '-x' ? b.i0 : b.i1 + 1] : xL[sd === '-z' ? b.j0 : b.j1 + 1];
      const mitte = sd[1] === 'x' ? L.x : L.z, achse = sd[1] === 'x' ? 'z' : 'x';
      const a0 = achse === 'z' ? b.z : b.x, a1 = achse === 'z' ? b.z + b.d : b.x + b.w;
      const weg = new Set(strassen.filter((q) => q.achse === achse && Math.abs(q.mitte - mitte) < 0.6 && q.von >= a0 - 0.5 && q.bis <= a1 + 0.5).map((q) => q.id));
      for (let n = strassen.length - 1; n >= 0; n--) if (weg.has(strassen[n].id)) strassen.splice(n, 1);
      for (let n = kreuzungen.length - 1; n >= 0; n--) {
        const k = kreuzungen[n];
        for (const arm of Object.keys(k.arme)) if (k.arme[arm] && weg.has(k.arme[arm].id)) k.arme[arm] = null;
        if (!Object.values(k.arme).some(Boolean)) kreuzungen.splice(n, 1);
      }
      if (sd === '-x') { const x0 = mitte - L.breite / 2; b.w += b.x - x0; b.x = x0; }
      else if (sd === '+x') b.w = mitte + L.breite / 2 - b.x;
      else if (sd === '-z') { const z0 = mitte - L.breite / 2; b.d += b.z - z0; b.z = z0; }
      else b.d = mitte + L.breite / 2 - b.z;
      b.rand[sd] = { typ: 'wasser', gehweg: 0, breite: 0, seg: null };
    }
  }

  // --- Fußgängerzone automatisch: an den Warenhaus-Fronten und zum Markt ---
  const blockIn = (i, j) => bloecke.filter((b) => b.art === 'bebaut' && b.i0 === i && b.j0 === j).sort((a, c) => c.w * c.d - a.w * a.d)[0] ?? null;
  // Slots in bebauten Blöcken: mit Standorten aus E.einkauf, sonst das eine Warenhaus wie bisher
  const einkauf = E.einkauf ? E.einkauf.map((e) => ({ ...e })) : E.warenhaus ? [{ ...E.warenhaus, typ: 'slot:warenhaus', standort: null, lage: null }] : [];
  for (const e of einkauf) e.block = blockIn(e.i, e.j);
  const whBlock = E.einkauf ? null : einkauf[0]?.block ?? null;
  if (E.fzAuto && whBlock) {
    const fronten = E.warenhaus.ecke === 'block' ? ['+z', '+x', '-z', '-x'] : E.warenhaus.ecke.match(/[+-][xz]/g);
    const kandidaten = fronten.map((s) => strassen.find((q) => q.id === whBlock.rand[s].seg)).filter((s) => s && s.typ !== 'haupt' && !s.bruecke);
    const markt = bloecke.find((b) => b.art === 'markt');
    const n = E.archetyp === 'altstadt' ? 4 : E.archetyp === 'raster' ? 1 : 2;
    const gewaehlt = new Set();
    const nimmSeg = (s) => { if (s && s.typ !== 'haupt' && !s.bruecke && gewaehlt.size < n + 1) { s.typ = 'fussgaenger'; gewaehlt.add(s.id); } };
    if (kandidaten.length) nimmSeg(waehle(r, kandidaten));
    if (markt) for (const s of Object.values(markt.rand)) if (s.seg && r() < 0.5) nimmSeg(strassen.find((q) => q.id === s.seg));
    // Verlängern entlang derselben Linie
    for (let it = 0; it < n; it++) {
      const basis = strassen.filter((s) => gewaehlt.has(s.id));
      const weiter = strassen.filter((s) => !gewaehlt.has(s.id) && s.typ !== 'haupt' && !s.bruecke && basis.some((q) => q.achse === s.achse && Math.abs(q.mitte - s.mitte) < 0.6 && (Math.abs(q.bis - s.von) < 40 || Math.abs(s.bis - q.von) < 40)));
      if (weiter.length && r() < 0.75) nimmSeg(waehle(r, weiter));
    }
    for (const b of bloecke) if (b.rand) for (const s of Object.keys(b.rand)) { const sg = b.rand[s].seg && strassen.find((q) => q.id === b.rand[s].seg); if (sg) b.rand[s].typ = sg.typ; }
  }
  // Kreuzungen nach Fußgängerzonen nachziehen
  for (const k of kreuzungen) {
    const liste = Object.values(k.arme).filter(Boolean), fahr = liste.filter((s) => s.typ !== 'fussgaenger');
    k.gepflastert = fahr.length === 0;
    k.zebra = k.zebra && fahr.length >= 3;
    k.ampel = k.ampel && fahr.length >= 3;
  }
  // Belag: Kopfsteinpflaster in Altstädten
  for (const s of strassen) {
    if (s.typ === 'haupt' || s.bruecke) continue;
    const i = s.achse === 'z' ? spalteBei(s.mitte - 1) : spalteBei((s.von + s.bis) / 2);
    const j = s.achse === 'z' ? s.index : klemm(s.linie ?? 0, 0, nz - 1);
    if (viertelVon(i, j) === 'altstadt' && r() < R.pflaster + 0.35) s.belag = 'pflaster';
  }

  // --- Parzellen ---
  const hot = (i, j) => (E.hoch ?? []).reduce((a, h) => a + h.s * Math.exp(-((i - h.i) ** 2 + (j - h.j) ** 2) / 2.5), 0);
  const fachwerkW = R.fachwerk * (T.fachwerk ?? 1);
  for (const b of bloecke) {
    if (b.art === 'wasser') continue;
    const rb = rng(b.seed);
    const vn = viertelVon((b.i0 + b.i1) / 2, (b.j0 + b.j1) / 2);
    const V = VIERTEL[vn] ?? VIERTEL.gruenderzeit;
    const stile = [...V.stile, ['fachwerk', V.fachwerk * fachwerkW]].filter(([, w]) => w > 0);
    const basisKlasse = 3 + V.dk + (R.dk ?? 0) + hot((b.i0 + b.i1) / 2, (b.j0 + b.j1) / 2);
    b.viertel = vn;
    b.stil = wahlGewichtet(rb, stile);
    b.klasse = klemm(Math.round(basisKlasse), 1, 5);
    const parz = b.stil === 'fachwerk' || vn === 'altstadt' ? [6, 14] : T.parz;
    const ctx = { T, rb, klasse: basisKlasse, var: V.var, stil: b.stil, parz, stile, parzellen, b, region: E.region, typ, viertel: vn, material: R.material };
    if (b.art === 'bebaut') {
      const meineSlots = einkauf.filter((e) => e.block === b);
      const wh = meineSlots[0] ?? null;
      const P = ARCHETYP_DEFS[E.archetyp];
      Object.assign(ctx, { E, strassen, einkaufSlots: meineSlots, segVon: (id) => strassen.find((q) => q.id === id) ?? null });
      if (P?.parzellierung && P.parzellierung(ctx, E, b, PLAN_HILFE)) {
        if (wh?.standort && b.hof) b.hof.art = rb() < 0.6 ? 'parkplatz' : 'kies';
        continue;
      }
      const slots = einkaufSlotsSetzen(ctx);
      if (!(wh && wh.ecke === 'block')) parzelliere(ctx, ['+z', '-z', '+x', '-x'], slots, {});
      if (!wh && !E.keineDetails) blockDetails(ctx, E);
      P?.nachbearbeitung?.(ctx, E, b, PLAN_HILFE);
      if (wh?.standort && b.hof) { b.hof.art = 'kies'; hofFuellen(ctx); }   // Anlieferhof, Rest mit Hofbauten (GESTALTUNG.md)
    } else if (['markt', 'kirche', 'platz', 'domplatz'].includes(b.art)) {
      const seiten = b.seiten ?? ['-z', '-x'];
      const um = { '-z': '+z', '-x': '+x', '+z': '-z', '+x': '-x' };
      const frontUm = {}; for (const s of seiten) frontUm[s] = um[s];
      const t = parzelliere(ctx, seiten, [], frontUm);
      b.platz = { x: b.x + t['-x'], z: b.z + t['-z'], w: b.w - t['-x'] - t['+x'], d: b.d - t['-z'] - t['+z'] };
      if (b.art === 'markt' && (E.rathausAmMarkt ?? true) && (E.landmarken ?? []).includes('slot:rathaus')) { rathausAmMarkt(ctx, seiten); E.landmarken = E.landmarken.filter((x) => x !== 'slot:rathaus'); }
      else if (b.art === 'markt' && E.rathausAmMarkt && !E.landmarken.length) rathausAmMarkt(ctx, seiten);
      if (b.art === 'kirche' || b.art === 'domplatz') {
        const P = b.platz, dom = b.art === 'domplatz';
        const aw = P.w - 10, ad = P.d - 10;
        const L = Math.min(dom ? 96 : 54, aw * (dom ? 0.8 : 0.85)), Bk = Math.min(dom ? 40 : 24, ad * (dom ? 0.55 : 0.62));
        const kx = b.kirchStil ? { stil: b.kirchStil, ...(b.kirchForm ? { form: b.kirchForm, kuppel: true } : {}) } : {};
        neueParzelle(ctx, 'slot:kirche', P.x + 4 + (aw - L) * 0.4, P.z + 4 + (ad - Bk) * 0.35, L, Bk, ['+z', '+x'], 'frei', { ausrichtung: 'x', klasse: 5, dom, ...kx });
      }
    } else if (b.art === 'mall') {
      neueParzelle(ctx, 'slot:mall', b.x, b.z, b.w, b.d, ['+z', '+x', '-z', '-x'], 'block', { klasse: 4 });
    } else if (b.art === 'bahn' && b.ohneBahnhof) {
      // Schmales Gleisband ohne Empfangsgebäude (das steht als eigener Block an der Stadtseite, z. B. west_bahnhof)
      b.gleise = b.achse === 'z' ? { x0: b.x + 2, x1: b.x + b.w - 2, achse: 'z' } : { z0: b.z + 2, z1: b.z + b.d - 2, achse: 'x' };
    } else if (b.art === 'bahn' && b.achse === 'z') {
      // Gleise entlang z (Bahn als Spalte), Empfangsgebäude an der Stadtseite b.seite ('+x' | '-x').
      // GESTALTUNG.md 3: Gleisband 26 m an der Außenseite, Empfangsgebäude daneben, Vorplatz zur Stadt
      const W = Math.min(b.d - 24, zw(rb, 64, 92)), D = Math.min(b.w - 30, zw(rb, 22, 28));
      const cz = b.bahnhofLinie !== undefined ? xL[b.bahnhofLinie].z : b.z + b.d / 2;
      const plus = b.seite !== '-x';
      const band = Math.min(E.typ === 'mittelstadt' ? 16 : 26, Math.max(12, b.w - D - 8));   // Mittelstadt: zwei Gleise mit Mittelbahnsteig
      const xB = plus ? b.x + 2 + band + 1 : b.x + b.w - 2 - band - 1 - D;
      neueParzelle(ctx, 'slot:bahnhof', xB, klemm(cz - W / 2, b.z + 4, b.z + b.d - W - 4), D, W, plus ? ['+x', '-x'] : ['-x', '+x'], 'frei', { klasse: 4 });
      b.oben = plus;
      b.gleise = plus ? { x0: b.x + 2, x1: b.x + 2 + band, achse: 'z' } : { x0: b.x + b.w - 2 - band, x1: b.x + b.w - 2, achse: 'z' };
      b.vorplatz = plus ? { x: xB, z: b.z, w: b.x + b.w - xB, d: b.d } : { x: b.x, z: b.z, w: xB + D - b.x, d: b.d };
      if (b.vorplatz.w < 3) b.vorplatz = null;
      else { const bh = ctx.parzellen[ctx.parzellen.length - 1]; vorplatzKuerzen(ctx, b, 'z', bh.z, bh.d, plus ? '+x' : '-x'); }
    } else if (b.art === 'bahn') {
      // GESTALTUNG.md 3: Gleisband 26 m an der Kartenseite, Empfangsgebäude direkt davor, Vorplatz zur Stadt (Taxis,
      // Bussteige, Baumreihe); Gleishalle nur bei Metropolen und schmal
      const gross = b.gross && E.typ === 'metropole' && b.w >= 140;
      const W = gross ? Math.min(b.w - 24, zw(rb, 130, 150)) : Math.min(b.w - 24, zw(rb, 64, 92)), D0 = gross ? 34 : zw(rb, 22, 28);
      const band = Math.min(E.typ === 'mittelstadt' ? 16 : 26, Math.max(12, b.d - D0 - 8)), D = Math.min(D0, b.d - band - 4);   // Mittelstadt: zwei Gleise mit Mittelbahnsteig
      const cx = b.bahnhofLinie !== undefined ? zL[b.bahnhofLinie].x : b.x + b.w / 2;
      const zB = b.oben ? b.z + 2 + band + 1 : b.z + b.d - 2 - band - 1 - D;
      const bahnhofX = klemm(cx - W / 2, b.x + 4, b.x + b.w - W - 4), bahnhofW = W;
      neueParzelle(ctx, 'slot:bahnhof', bahnhofX, zB, W, D, b.oben ? ['+z', '-z'] : ['-z', '+z'], 'frei', { klasse: 4 });
      b.gleise = b.oben ? { z0: b.z + 2, z1: b.z + 2 + band, achse: 'x' } : { z0: b.z + b.d - 2 - band, z1: b.z + b.d - 2, achse: 'x' };
      // Vorplatz höchstens 24 m tief; ein tieferer Block bekommt zur Straße hin eine Häuserzeile (kein leeres Vorfeld)
      const rest = b.oben ? b.z + b.d - zB - D : zB - b.z;
      const haus = rest > 36 ? Math.min(18, rest - 24) : 0;
      if (haus >= 12) {
        const zh = b.oben ? b.z + b.d - haus : b.z, s = b.oben ? '+z' : '-z';
        const n = Math.max(1, Math.round((b.w - 2) / 14));
        for (let k = 0; k < n; k++) neueParzelle(ctx, 'stadthaus', b.x + 1 + ((b.w - 2) * k) / n, zh, (b.w - 2) / n, haus, [s], s, { bahnhofsviertel: true });
        // noch tiefer: zweite Zeile mit Front zum Vorplatz (Hotels, Geschäfte), seitlich des Empfangsgebäudes
        const rest2 = rest - haus - 24;
        if (rest2 >= 12) {
          const t2 = Math.min(16, rest2), z2 = b.oben ? zh - t2 : zh + haus, s2 = b.oben ? '-z' : '+z';
          const bx = bahnhofX ?? 0, bw = bahnhofW ?? 0;
          for (const [a, e] of [[b.x + 1, bx - 6], [bx + bw + 6, b.x + b.w - 1]]) {
            const m = Math.floor((e - a) / 14);
            for (let k = 0; k < m; k++) neueParzelle(ctx, 'stadthaus', a + ((e - a) * k) / m, z2, (e - a) / m, t2, [s2], s2, { bahnhofsviertel: true });
          }
        }
      }
      b.vorplatz = b.oben ? { x: b.x, z: zB, w: b.w, d: b.z + b.d - zB - (haus >= 12 ? haus : 0) } : { x: b.x, z: b.z + (haus >= 12 ? haus : 0), w: b.w, d: zB + D - b.z - (haus >= 12 ? haus : 0) };
      if (b.vorplatz.d < 3) b.vorplatz = null;
      else vorplatzKuerzen(ctx, b, 'x', bahnhofX, bahnhofW, haus >= 12 ? null : b.oben ? '+z' : '-z');
    } else if (b.art === 'schloss') {
      const W = Math.min(b.w * 0.78, 150), D = Math.min(34, b.d * 0.42);
      neueParzelle(ctx, 'slot:schloss', b.x + (b.w - W) / 2, b.z + 4, W, D, ['+z', '+x'], 'frei', { klasse: 5 });
      b.ehrenhof = { x: b.x + b.w * 0.2, z: b.z + 4 + D, w: b.w * 0.6, d: b.d - D - 6 };
    } else if (b.art === 'center' || b.art === 'fachmarkt') {
      // Hartwig als Mieter eines Einkaufszentrums bzw. Fachmarkt am Rand: Bauten hinten nebeneinander, Parkplatz vorn (+z)
      const liste = b.standorte ?? [];
      if (liste.length) {
        let x = b.x + 3, Dmax = 0;
        const frei = b.w - 6 - (b.art === 'fachmarkt' ? 44 : 0);
        const summe = liste.reduce((a, st) => a + st._w + 2, 0) + (liste.length - 1) * 10;
        const k = Math.min(1, frei / summe);
        liste.forEach((st, n) => {
          const W = Math.max(10, (st._w + 2) * k), D = Math.min(st._d + 2, b.d - 40);
          const { _typ, _w, _d, ...standort } = st;
          if (n > 0) {   // Mall-Verbinder: Ladenpassage zwischen den Mietern
            neueParzelle(ctx, 'slot:center_passage', x, b.z + 3, 10 * k, Math.max(16, D * 0.7), ['+z', '+x'], 'frei', { klasse: 3, landmarke: false });
            x += 10 * k;
          }
          neueParzelle(ctx, _typ, x, b.z + 3, W, D, ['+z', '+x'], 'frei', { klasse: 4, ecke: 'block', standort, lage: b.art === 'center' ? 'center' : 'rand', center: b.art === 'center' ? b.id : undefined });
          x += W; Dmax = Math.max(Dmax, D);
          void _w; void _d;
        });
        if (b.art === 'fachmarkt' && b.x + b.w - x - 11 >= 34) neueParzelle(ctx, 'slot:discounter', x + 8, b.z + 3, Math.min(48, b.x + b.w - x - 11), Math.min(40, Dmax), ['+z', '+x'], 'frei', { klasse: 1 });
        b.parkplatz = { x: b.x + 3, z: b.z + Dmax + 9, w: b.w - 6, d: b.d - Dmax - 12 };
      }
    } else if (b.art === 'gewerbe') {
      const W = Math.min(b.w * 0.6, 56), D = Math.min(b.d * 0.45, 32);
      neueParzelle(ctx, 'slot:discounter', b.x + 3, b.z + 3, W, D, ['+z', '+x'], 'frei', { klasse: 1 });
      b.parkplatz = { x: b.x + 3, z: b.z + D + 6, w: b.w - 6, d: b.d - D - 9 };
    } else if (b.art === 'park') {
      b.teich = { seite: rb() < 0.5 ? 1 : -1 };
    } else if (FLAECHEN[b.art]?.parzelliere) {
      Object.assign(ctx, { E, strassen, segVon: (id) => strassen.find((q) => q.id === id) ?? null });
      FLAECHEN[b.art].parzelliere(ctx, E, b, PLAN_HILFE);
    }
  }
  ARCHETYP_DEFS[E.archetyp]?.nachPlan?.(E, PLAN_HILFE, { r, bloecke, parzellen, T, typ, strassen });
  // --- Landmarken platzieren (rand, ecke, frei) ---
  const landmarken = [];
  for (const typL of E.landmarken ?? []) {
    const def = LANDMARKEN[typL];
    if (!def || def.art === 'flaeche' || def.art === 'block') continue;
    const p = setzeLandmarke(typL, def, { E, r, bloecke, parzellen, T, R, region: E.region, typ });
    if (p) landmarken.push(p.id);
  }
  // Zusätzliche Hochhäuser (rasterPlan-Kompatibilität)
  for (let n = 0; n < (E.hochhausAnzahl ?? 0); n++) {
    const kand = bloecke.filter((b) => b.art === 'bebaut');
    if (!kand.length) break;
    const b = kand[Math.floor(r() * kand.length)];
    const ctx = { T, rb: rng(b.seed + n), b, parzellen, region: E.region, typ };
    mergeRand(ctx, 'slot:hochhaus', [20, 44], 26, ['+z', '+x'], { geschosse: Math.round(zw(ctx.rb, 12, 26)) });
  }
  for (const id of landmarken) { const p = parzellen.find((q) => q.id === id); if (p) p.landmarke = true; }
  // Diagonale Straßen (E.diagonalen(g) → Wunschliste, z. B. Karlsruher Fächer): schneiden durch die Blöcke
  const diagonalen = [], zwickel = [];
  if (E.diagonalen) for (const d of E.diagonalen({ r, bloecke, parzellen, T, typ, strassen, breite, tiefe }) ?? []) {
    diagonalen.push(...diagonaleSchneiden(d, { bloecke, parzellen, breite, tiefe, zwickel }));
  }
  // GESTALTUNG.md 1: Blockrand schließen. Bleibt an einer Straßenseite eines bebauten Blocks ein Stück ohne Bau (Slots, die
  // nicht bis an die Ecke reichen, Hof an der Straße, Ost-Zentrumsblöcke), füllt es eine Randbebauung bis zur
  // nächsten Parzelle bzw. bis zur Bautiefe; Höfe im Zentrumsbild werden gepflastert statt Rasen.
  for (const b of bloecke) if ((b.art === 'bebaut' || b.art === 'warenhaus') && !b.voralpen && !b.offen) randSchliessen(b, { E, T, typ, parzellen, diagonalen, R });
  for (const b of bloecke) if (b.parzellen?.length) nachbarnSetzen(b, parzellen);
  const blockVon = new Map(bloecke.map((q) => [q.id, q]));
  const DEF = ARCHETYP_DEFS[E.archetyp];
  for (const p of parzellen) {
    p.region = E.region; p.cluster = typ;
    const bl = blockVon.get(p.block);
    if (DEF?.stilProfil && !p.stilProfil) p.stilProfil = typeof DEF.stilProfil === 'function' ? DEF.stilProfil(p, E, bl) : DEF.stilProfil;
    DEF?.parzelleMarkieren?.(p, bl, E);
  }
  kirchenEindeutig(parzellen, E.region);
  const standorte = parzellen.filter((p) => p.standort).map((p) => ({ ...p.standort, lage: p.lage ?? p.standort.lage, parzelle: p.id, typ: p.typ, block: p.block }));
  let einkaufslage = null;
  if (E.einkaufslage) {
    const L = E.einkaufslage;
    einkaufslage = { ...L, x0: sx[L.i0], x1: sx[L.i1] + E.spalten[L.i1], z0: sz[L.j0], z1: sz[L.j1] + E.reihen[L.j1], xF: zL[L.kF].x, zF: xL[L.lF].z };
  }
  const plan = {
    seed, typ, region: E.region, archetyp: E.archetyp, umriss: E.umriss, umlandArt: E.umland, baumarten,
    nx, nz, breite, tiefe,
    spalten: { x: sx, w: E.spalten }, reihen: { z: sz, d: E.reihen },
    zLinien: zL, xLinien: xL, strassen, kreuzungen, bloecke, parzellen, umland,
    slots: parzellen.filter((p) => p.typ.startsWith('slot:')),
    landmarken: parzellen.filter((p) => p.typ.startsWith('slot:') && !p.standort && p.typ !== 'slot:warenhaus' && p.typ !== 'slot:center_passage').map((p) => p.id),
    standorte, einkaufslage, ddr: !!E.ddr, ost: E.ost ?? null, diagonalen, zwickel,
    einkaufslagen: (E.einkaufslagen ?? []).map((L) => ({ ...L, x0: sx[L.i0], x1: sx[L.i1] + E.spalten[L.i1], z0: sz[L.j0], z1: sz[L.j1] + E.reihen[L.j1], xF: zL[L.kF].x, zF: xL[L.lF].z })),
    kern: { i: E.warenhaus?.i ?? E.zentrum.i, j: E.warenhaus?.j ?? E.zentrum.j },
    zentrum: E.zentrum, marktVariante: E.marktVariante ?? null,
  };
  // Stadtrandgürtel (Vororte, Felder, Wald, fortgesetzte Flüsse) und Kameragrenze, siehe stadtrand.js
  Object.assign(plan, stadtrandPlan(plan, { kueste: E.o?.kueste, seeArt: E.o?.seeArt, berge: E.berge }));
  return plan;
}

// ====================================================================================
// Parzellen
// ====================================================================================
function neueParzelle(ctx, typ, x, z, w, d, front, seite, extra = {}) {
  const { T, rb, b, parzellen } = ctx;
  const rueck = front.length && front.every((s) => s[0] === '-') ? 1 : 0;
  const klasse = extra.klasse ?? klemm(Math.round((ctx.klasse ?? 3) + zw(rb, -(ctx.var ?? 1), ctx.var ?? 1) + (typ === 'eck' && rb() < 0.5 ? 1 : 0) - rueck - (typ === 'hofhaus' ? 1.5 : 0)), 1, 5);
  const geschosse = Math.round(T.gesch[0] + ((T.gesch[1] - T.gesch[0]) * (klasse - 1)) / 4);
  const istSlot = typ.startsWith('slot:');
  const p = {
    id: 'p' + (parzellen.zaehler = (parzellen.zaehler ?? 0) + 1), typ, block: b.id, x, z, w, d, seed: ganz(rb), hoehenklasse: klasse, geschosse,
    front, seite, strasse: extra.strasse ?? front.map((s) => (b.rand?.[s] ? b.rand[s].typ : 'platz')),
    stil: istSlot ? null : wahlGewichtet(rb, ctx.stile ?? [[ctx.stil ?? 'gruenderzeit', 1]]), leer: !istSlot && typ === 'stadthaus' && rb() < 0,   // GESTALTUNG.md: Blockrand geschlossen, keine leeren Parzellen
    region: ctx.region, cluster: ctx.typ, viertel: ctx.viertel ?? b.viertel ?? null, material: ctx.material ?? null, nachbar: null,
    ...(istSlot ? { sonder: typ.slice(5) } : {}),
    ...extra,
  };
  // Fachwerk-Mischung nur für normale Häuser: Slots (Kirchen, Landmarken) behalten ihren eigenen Stil (kirchStil usw.)
  if (!istSlot && p.stil && ctx.stil === 'fachwerk' && rb() < 0.6) p.stil = 'fachwerk';
  delete p.klasse;
  parzellen.push(p);
  b.parzellen.push(p.id);
  return p;
}

/**
 * Bahnhofsvorplatz nur vor dem Empfangsgebäude (± 26 m); seitlich davon Häuserzeile zur Straße und dahinter
 * P+R-Parkplatz (b.bahnParken), sonst entsteht ein mehrere hundert Meter langer leerer Platz (Wuppertal 804 m).
 * achse = Richtung der Gleise ('x' | 'z'); u0, uw = Lage des Empfangsgebäudes entlang der Gleise; strasse = Seite der
 * Straße am Vorplatz ('+z' | '-z' | '+x' | '-x') oder null, wenn dort schon eine Häuserzeile steht.
 */
function vorplatzKuerzen(ctx, b, achse, u0, uw, strasse) {
  const V = b.vorplatz, X = achse === 'x';
  const A = X ? V.x : V.z, E = X ? V.x + V.w : V.z + V.d;           // entlang der Gleise
  const Q0 = X ? V.z : V.x, Q1 = X ? V.z + V.d : V.x + V.w;         // quer dazu
  const a = Math.max(A, u0 - 26), e = Math.min(E, u0 + uw + 26);
  if (e - a < 20 || (a - A < 14 && E - e < 14)) return;
  const R = (ua, ub, qa, qb) => (X ? { x: ua, z: qa, w: ub - ua, d: qb - qa } : { x: qa, z: ua, w: qb - qa, d: ub - ua });
  b.vorplatz = R(a, e, Q0, Q1);
  b.bahnParken = [];
  const belegt = ctx.parzellen.filter((q) => q.block === b.id && q.typ !== 'slot:bahnhof');
  for (const [sa, se] of [[A, a], [e, E]]) {
    if (se - sa < 14) { if (se - sa > 2) b.bahnParken.push(R(sa, se, Q0, Q1)); continue; }
    // freie Querintervalle (ohne die schon gesetzten Häuserzeilen am Vorplatz)
    let frei = [[Q0, Q1]];
    for (const q of belegt) {
      const qa = X ? q.z : q.x, qb = X ? q.z + q.d : q.x + q.w, ua = X ? q.x : q.z, ub = X ? q.x + q.w : q.z + q.d;
      if (ub <= sa || ua >= se) continue;
      frei = frei.flatMap(([f0, f1]) => [[f0, Math.min(f1, qa)], [Math.max(f0, qb), f1]]).filter(([f0, f1]) => f1 - f0 > 0.5);
    }
    for (let [f0, f1] of frei) {
      const anStr = strasse && (strasse[0] === '+' ? Math.abs(f1 - Q1) < 0.6 : Math.abs(f0 - Q0) < 0.6);
      if (anStr && f1 - f0 >= 10) {
        const t = f1 - f0 < 28 ? f1 - f0 : 18;
        const qa = strasse[0] === '+' ? f1 - t : f0;
        const n = Math.max(1, Math.round((se - sa - 1) / 14));
        for (let k = 0; k < n; k++) {
          const u = sa + 0.5 + ((se - sa - 1) * k) / n, l = (se - sa - 1) / n;
          if (X) neueParzelle(ctx, 'stadthaus', u, qa, l, t, [strasse], strasse, { bahnhofsviertel: true });
          else neueParzelle(ctx, 'stadthaus', qa, u, t, l, [strasse], strasse, { bahnhofsviertel: true });
        }
        if (strasse[0] === '+') f1 -= t; else f0 += t;
      }
      if (f1 - f0 > 2) b.bahnParken.push(R(sa, se, f0, f1));
    }
  }
}

function intervalleMinus(a, b, weg) {
  let liste = [[a, b]];
  for (const [c, d] of weg) {
    const neu = [];
    for (const [u, v] of liste) {
      if (d <= u || c >= v) { neu.push([u, v]); continue; }
      if (c > u) neu.push([u, c]);
      if (d < v) neu.push([d, v]);
    }
    liste = neu;
  }
  return liste;
}
export { intervalleMinus };

function teileLaenge(L, mn, mx, r) {
  if (L <= mx) return [L];
  const w = [];
  let rest = L;
  while (rest > mx) { const x = mn + (Math.min(mx, rest - mn) - mn) * Math.pow(r(), 1.6); w.push(x); rest -= x; }
  w.push(rest);
  return w;
}

/** Blockrandbebauung: Ecken, Seitenreihen, Slots ausgespart. frontUm: Seite → umgedrehte Front (Platz statt Straße). */
function parzelliere(ctx, seiten, slots, frontUm) {
  const { T, rb, b } = ctx;
  const t = {};
  // GESTALTUNG.md: kleine Höfe. Bautiefe wächst mit der Blockgröße (rund 22 % der kürzeren Seite, höchstens 24 m), je Block einheitlich
  const tBlock = Math.max(zw(rb, ...T.tiefe), Math.min(24, 0.22 * Math.min(b.w, b.d)));
  for (const s of ['+z', '-z', '+x', '-x']) t[s] = seiten.includes(s) ? Math.round(tBlock * 2) / 2 : 0;
  // gegenüberliegende Randreihen dürfen sich in schmalen Blöcken nicht treffen
  for (const [a, c, L] of [['+z', '-z', b.d], ['+x', '-x', b.w]]) {
    if (t[a] + t[c] > L - 2) { const f = (L - 2) / (t[a] + t[c]); t[a] = Math.floor(t[a] * f * 2) / 2; t[c] = Math.floor(t[c] * f * 2) / 2; }
    for (const s of [a, c]) if (t[s] > 0 && t[s] < 6) t[s] = 0;
  }
  const x0 = b.x, z0 = b.z, x1 = b.x + b.w, z1 = b.z + b.d;
  const ueber = (ax0, az0, ax1, az1) => slots.some((s) => ax0 < s.x + s.w - 0.01 && ax1 > s.x + 0.01 && az0 < s.z + s.d - 0.01 && az1 > s.z + 0.01);
  const eck = {};
  for (const ex of ['-x', '+x']) for (const ez of ['-z', '+z']) {
    if (!t[ex] || !t[ez]) continue;
    const e = { ex: t[ex] + (rb() < 0.5 ? Math.round(zw(rb, 0, 6)) : 0), ez: t[ez] + (rb() < 0.5 ? Math.round(zw(rb, 0, 6)) : 0) };
    // GESTALTUNG.md: einheitliche Bauflucht zum Hof; das Eckhaus verlängert sich höchstens in einer Richtung (kein Vorsprung in den Hof)
    if (e.ex > t[ex] && e.ez > t[ez]) { if (e.ex - t[ex] >= e.ez - t[ez]) e.ez = t[ez]; else e.ex = t[ex]; }
    const gx = ex === '-x' ? '+x' : '-x', gz = ez === '-z' ? '+z' : '-z';
    if (t[gx]) e.ex = Math.min(e.ex, t[ex] + Math.max(0, b.w - t[ex] - t[gx]) / 2);
    if (t[gz]) e.ez = Math.min(e.ez, t[ez] + Math.max(0, b.d - t[ez] - t[gz]) / 2);
    const rx0 = ex === '-x' ? x0 : x1 - e.ex, rz0 = ez === '-z' ? z0 : z1 - e.ez;
    if (ueber(rx0, rz0, rx0 + e.ex, rz0 + e.ez)) continue;
    eck[ex + ez] = e;
    const front = ordne([...new Set([ex, ez].map((s) => frontUm[s] ?? s))]);
    neueParzelle(ctx, 'eck', rx0, rz0, e.ex, e.ez, front, 'ecke', frontUm[ex] || frontUm[ez] ? { strasse: front.map(() => 'platz'), ecke: ex + ez } : { ecke: ex + ez });
  }
  // Ohne Eckhaus gehört das Eckquadrat der z-Reihe (+z/-z); die x-Reihe endet an deren Band
  const lauf = {
    '+z': [x0 + (eck['-x+z']?.ex ?? 0), x1 - (eck['+x+z']?.ex ?? 0)],
    '-z': [x0 + (eck['-x-z']?.ex ?? 0), x1 - (eck['+x-z']?.ex ?? 0)],
    '+x': [z0 + (eck['+x-z']?.ez ?? t['-z']), z1 - (eck['+x+z']?.ez ?? t['+z'])],
    '-x': [z0 + (eck['-x-z']?.ez ?? t['-z']), z1 - (eck['-x+z']?.ez ?? t['+z'])],
  };
  for (const s of ['+z', '-z', '+x', '-x']) {
    if (!t[s]) continue;
    const entlangX = s[1] === 'z';
    const band = s === '+z' ? [z1 - t[s], z1] : s === '-z' ? [z0, z0 + t[s]] : s === '+x' ? [x1 - t[s], x1] : [x0, x0 + t[s]];
    const weg = [];
    for (const sl of slots) {
      const q0 = entlangX ? sl.z : sl.x, q1 = entlangX ? sl.z + sl.d : sl.x + sl.w;
      if (q1 > band[0] + 0.01 && q0 < band[1] - 0.01) weg.push(entlangX ? [sl.x, sl.x + sl.w] : [sl.z, sl.z + sl.d]);
    }
    for (const [a, e] of intervalleMinus(lauf[s][0], lauf[s][1], weg)) {
      if (e - a < 3.5) continue;
      let u = a;
      for (const w of teileLaenge(e - a, ctx.parz[0], ctx.parz[1], rb)) {
        const front = [frontUm[s] ?? s];
        const ex = frontUm[s] ? { strasse: ['platz'] } : {};
        if (entlangX) neueParzelle(ctx, 'stadthaus', u, band[0], w, t[s], front, s, ex);
        else neueParzelle(ctx, 'stadthaus', band[0], u, t[s], w, front, s, ex);
        u += w;
      }
    }
  }
  b.hof = { x: x0 + t['-x'], z: z0 + t['-z'], w: b.w - t['-x'] - t['+x'], d: b.d - t['-z'] - t['+z'], art: 'pflaster' };
  b.tiefen = t;
  return t;
}

const parzelleVon = (ctx, id) => ctx.parzellen.find((p) => p.id === id);
function entferneParzelle(ctx, p) {
  const { b, parzellen } = ctx;
  parzellen.splice(parzellen.indexOf(p), 1);
  b.parzellen.splice(b.parzellen.indexOf(p.id), 1);
}

/** Aufeinanderfolgende Parzellen einer Seite zu einem Slot zusammenlegen. */
function mergeRand(ctx, typ, [bmin, bmax], tiefe, seiten, extra = {}) {
  const { b, rb } = ctx;
  for (const seite of seiten) {
    const liste = b.parzellen.map((id) => parzelleVon(ctx, id)).filter((p) => p && p.seite === seite && p.typ === 'stadthaus');
    const entlangX = seite[1] === 'z';
    liste.sort((a, c) => (entlangX ? a.x - c.x : a.z - c.z));
    const start = Math.floor(rb() * Math.max(1, liste.length));
    for (let o = 0; o < liste.length; o++) {
      const n0 = (start + o) % liste.length;
      let summe = 0, n1 = n0;
      while (n1 < liste.length && summe < bmin) { summe += entlangX ? liste[n1].w : liste[n1].d; n1++; }
      if (summe < bmin || summe > bmax * 1.4) continue;
      // Lücken in der Reihe ausschließen
      let ok = true;
      for (let q = n0 + 1; q < n1; q++) { const a = liste[q - 1], c = liste[q]; if (entlangX ? Math.abs(a.x + a.w - c.x) > 0.1 : Math.abs(a.z + a.d - c.z) > 0.1) ok = false; }
      if (!ok) continue;
      const erste = liste[n0], letzte = liste[n1 - 1];
      const maxT = (entlangX ? b.d - (b.tiefen?.[seite === '+z' ? '-z' : '+z'] ?? 0) : b.w - (b.tiefen?.[seite === '+x' ? '-x' : '+x'] ?? 0)) - 6;
      const T_ = Math.max(entlangX ? erste.d : erste.w, Math.min(tiefe, maxT));
      let rect;
      if (seite === '+z') rect = { x: erste.x, z: b.z + b.d - T_, w: letzte.x + letzte.w - erste.x, d: T_ };
      else if (seite === '-z') rect = { x: erste.x, z: b.z, w: letzte.x + letzte.w - erste.x, d: T_ };
      else if (seite === '+x') rect = { x: b.x + b.w - T_, z: erste.z, w: T_, d: letzte.z + letzte.d - erste.z };
      else rect = { x: b.x, z: erste.z, w: T_, d: letzte.z + letzte.d - erste.z };
      const weg = new Set(liste.slice(n0, n1));
      const andere = b.parzellen.map((id) => parzelleVon(ctx, id)).filter((q) => q && !weg.has(q));
      const stoesst = (R) => andere.some((q) => R.x < q.x + q.w - 0.05 && R.x + R.w > q.x + 0.05 && R.z < q.z + q.d - 0.05 && R.z + R.d > q.z + 0.05);
      if (stoesst(rect)) {
        const t0 = entlangX ? erste.d : erste.w;
        if (seite === '+z') rect = { ...rect, z: b.z + b.d - t0, d: t0 }; else if (seite === '-z') rect = { ...rect, d: t0 };
        else if (seite === '+x') rect = { ...rect, x: b.x + b.w - t0, w: t0 }; else rect = { ...rect, w: t0 };
        if (stoesst(rect)) continue;
      }
      const p = erste;
      for (let q = n0 + 1; q < n1; q++) entferneParzelle(ctx, liste[q]);
      Object.assign(p, rect, { typ, sonder: typ.slice(5), stil: null, leer: false, hoehenklasse: 5, landmarke: true, ...extra });
      return p;
    }
  }
  return null;
}

function rathausAmMarkt(ctx, seiten) {
  const s = seiten.includes('-z') ? '-z' : seiten[0];
  mergeRand(ctx, 'slot:rathaus', [22, 38], 20, [s]);
}

/**
 * GESTALTUNG.md: große Höfe mit flachem Hofgebäude (Werkstatt, Lager, Garagen) füllen, ringsum mindestens 5 m Hofgasse.
 * Freie Rechtecke im Hof werden gesucht (Slots wie Warenhäuser ragen oft hinein), höchstens zwei Hofbauten.
 */
function hofFuellen(ctx) {
  // GESTALTUNG.md (Coffee Inc): Blöcke wirken von oben massiv. Der Hof wird mit Hinterhäusern gefüllt
  // (gleiche Bauweise wie die Randbebauung, ein Geschoss niedriger), dazwischen nur schmale Hofgassen von 4 m.
  const { b } = ctx, h = b.hof;
  if (!h || h.w < 16 || h.d < 16) return;
  const meine = b.parzellen.map((id) => parzelleVon(ctx, id)).filter(Boolean);
  const frei = (R) => !meine.some((q) => R.x < q.x + q.w - 0.05 && R.x + R.w > q.x + 0.05 && R.z < q.z + q.d - 0.05 && R.z + R.d > q.z + 0.05);
  const g = 4;
  const I = { x: h.x + g, z: h.z + g, w: h.w - 2 * g, d: h.d - 2 * g };
  if (I.w < 8 || I.d < 8) return;
  // Reihen entlang x; bei tiefem Hof zwei Reihen mit Gasse
  const reihen = I.d > 30 ? [[I.z, (I.d - g) / 2], [I.z + (I.d + g) / 2, (I.d - g) / 2]] : [[I.z, I.d]];
  for (const [z, d] of reihen) {
    let u = I.x;
    while (I.x + I.w - u >= 8) {
      const rest = I.x + I.w - u;
      const w = rest <= 22 ? rest : Math.min(rest - 8, 10 + ((u * 7.31 + z * 3.17) % 8));
      const R = { x: u, z, w, d };
      if (frei(R)) meine.push(neueParzelle(ctx, 'hofhaus', R.x, R.z, R.w, R.d, ['+z'], 'hof', { hinterhaus: true }));
      u += w;
    }
  }
  h.art = 'pflaster';
}

/** Baulücken, Baustellen, Parkplätze, kleine Plätze, Durchgänge, Hofbebauung, Spielplätze. */
function blockDetails(ctx, E) {
  const { b, rb, parzellen } = ctx;
  const alt = ctx.viertel === 'altstadt';
  const meine = () => b.parzellen.map((id) => parzelleVon(ctx, id)).filter(Boolean);
  // Blöcke im Zentrumsbild (bis drei Zellen um den Kern) bleiben ganz geschlossen (Zufallszüge bleiben gleich)
  const kernNah = Math.hypot((b.i0 + b.i1) / 2 - E.zentrum.i, (b.j0 + b.j1) / 2 - E.zentrum.j) < 3.2;
  for (const p of meine()) {
    if (p.typ !== 'stadthaus') continue;
    const x = rb();
    // GESTALTUNG.md: Blockrand geschlossen, Lücken und Baustellen selten, keine Parkplätze im Blockrand
    if (kernNah) continue;
    if (x < 0.008) p.typ = 'luecke';
    else if (x < 0.016) p.typ = 'baustelle';
  }
  // GESTALTUNG.md 1: Blockrand geschlossen, keine offenen Eckplätzchen (Zufallszug bleibt für gleiche Pläne)
  if (alt) for (const p of meine()) if (p.typ === 'eck') rb();
  // Durchgang zur Hofseite
  if (alt && rb() < (E.durchgang ?? 0)) {
    const kand = meine().filter((p) => p.typ === 'stadthaus' && (p.seite === '+z' || p.seite === '+x') && (p.seite === '+z' ? p.w : p.d) >= 13);
    if (kand.length) {
      const p = kand[Math.floor(rb() * kand.length)];
      const breite = Math.round(zw(rb, 3.5, 5) * 2) / 2;
      if (kernNah) kand.length = 0;
      const rest = { ...p };
      if (!kand.length) { /* Zentrumsbild: kein offener Durchgang */ }
      else if (p.seite === '+z') { p.w -= breite; neueParzelle(ctx, 'durchgang', p.x + p.w, p.z, breite, p.d, p.front, p.seite, {}); }
      else { p.d -= breite; neueParzelle(ctx, 'durchgang', p.x, p.z + p.d, p.w, breite, p.front, p.seite, {}); }
      void rest;
      b.hof.art = 'pflaster';
    }
  }
  // Hofbebauung: Hof immer mit Hinterhäusern füllen (GESTALTUNG.md: Blöcke von oben massiv)
  const h = b.hof;
  hofFuellen(ctx);
  // GESTALTUNG.md: keine Rasenflächen in Wohn- und Geschäftsblöcken; Höfe gepflastert (wenige Hofbäume), Kies oder Stellplätze
  if (h && h.art === 'pflaster' && !h.belegt) {
    const x = rb();
    h.art = x < 0.2 ? 'kies' : x < 0.3 ? 'parkplatz' : 'pflaster';
  }
  void parzellen;
}


function setzeLandmarke(typL, def, g) {
  const { E, r, bloecke, parzellen, T } = g;
  const dist = (b) => Math.hypot((b.i0 + b.i1) / 2 - E.zentrum.i, (b.j0 + b.j1) / 2 - E.zentrum.j);
  const ctxVon = (b) => ({ T, rb: rng(b.seed + typL.length * 7), b, parzellen, region: g.region, typ: g.typ, klasse: b.klasse, viertel: b.viertel, stile: [['gruenderzeit', 1]] });
  const tiefe = zw(r, ...(def.tiefe ?? [20, 30])), br = def.breite ?? [20, 40];
  if (def.art === 'rand') {
    const bahn = bloecke.find((b) => b.art === 'bahn');
    const wh = bloecke.find((b) => b.art === 'warenhaus');
    const gewicht = (b) => {
      const d = dist(b);
      if (typL === 'slot:hotel' && bahn) return 1 / (1 + Math.hypot(b.i0 - bahn.i0, b.j0 - bahn.j0));
      if (typL === 'slot:parkhaus' && wh) return 1 / (0.5 + Math.hypot(b.i0 - wh.i0, b.j0 - wh.j0));
      if (typL === 'slot:hochhaus') return E.typ === 'metropole' ? 1 / (0.6 + d) : 1 / (1 + Math.abs(d - 2.5));
      return 1 / (0.5 + d);
    };
    const kand = bloecke.filter((b) => b.art === 'bebaut').map((b) => [b, gewicht(b)]);
    for (let versuch = 0; versuch < 8 && kand.length; versuch++) {
      const b = wahlGewichtet(r, kand);
      const p = mergeRand(ctxVon(b), typL, br, tiefe, r() < 0.5 ? ['+z', '+x', '-z'] : ['+x', '+z', '-x'], typL === 'slot:hochhaus' ? { geschosse: Math.round(zw(r, 12, 26)) } : {});
      if (p) return p;
      kand.splice(kand.findIndex(([x]) => x === b), 1);
    }
    return null;
  }
  if (def.art === 'ecke') {
    const kand = bloecke.filter((b) => b.art === 'bebaut' && dist(b) > 1.5);
    kand.sort((a, c) => dist(c) - dist(a));
    for (const b of kand.slice(0, 6)) {
      const ctx = ctxVon(b);
      const eck = b.parzellen.map((id) => parzellen.find((p) => p.id === id)).find((p) => p && p.typ === 'eck' && p.ecke === '+x+z');
      if (!eck) continue;
      const W = Math.max(eck.w, zw(r, ...br)), D = eck.d;
      const rect = { x: b.x + b.w - W, z: b.z + b.d - D, w: W, d: D };
      const weg = b.parzellen.map((id) => parzellen.find((p) => p.id === id)).filter((p) => p && p !== eck && p.x < rect.x + rect.w - 0.1 && p.x + p.w > rect.x + 0.1 && p.z < rect.z + rect.d - 0.1 && p.z + p.d > rect.z + 0.1);
      if (weg.some((p) => p.typ !== 'stadthaus' || p.z < rect.z - 0.1)) continue;
      for (const p of weg) entferneParzelle(ctx, p);
      Object.assign(eck, rect, { typ: typL, sonder: typL.slice(5), stil: null, leer: false, hoehenklasse: 1, landmarke: true });
      return eck;
    }
    return null;
  }
  // frei
  const w = zw(r, ...br), d = zw(r, ...(def.tiefe ?? br));
  const orte = [];
  for (const b of bloecke) {
    let P = null, gew = 1;
    if (['markt', 'platz', 'kirche', 'domplatz'].includes(b.art) && b.platz) { P = b.platz; gew = typL === 'slot:denkmal' ? 4 : 0.5; }
    else if (b.art === 'gruenguertel') { P = { x: b.x + 2, z: b.z + 2, w: b.w - 4, d: b.d - 4 }; gew = typL === 'slot:tor' ? 8 : typL === 'slot:wasserturm' ? 2 : 1; }
    else if (b.art === 'park' || b.art === 'kleingarten') { P = { x: b.x + 4, z: b.z + 4, w: b.w - 8, d: b.d - 8 }; gew = typL === 'slot:wasserturm' ? 3 : typL === 'slot:denkmal' ? 1.5 : 0.4; }
    else if (b.art === 'schloss' && b.ehrenhof) { P = b.ehrenhof; gew = typL === 'slot:denkmal' ? 3 : 0; }
    if (P && P.w > w + 4 && P.d > d + 4 && gew > 0) orte.push([[b, P], gew]);
  }
  if (!orte.length) {
    for (const b of bloecke) if (b.art === 'bebaut' && b.hof && b.hof.w > w + 8 && b.hof.d > d + 8) orte.push([[b, b.hof], 0.3]);
  }
  if (!orte.length) return null;
  for (let versuch = 0; versuch < 6 && orte.length; versuch++) {
    const [b, P] = wahlGewichtet(r, orte);
    const ctx = ctxVon(b);
    const belegt = b.parzellen.map((id) => parzellen.find((q) => q.id === id)).filter(Boolean);
    for (let n = 0; n < 8; n++) {
      // Position: Torbau an einer Platzkante, Denkmal im vorderen Drittel, sonst zufällig
      let x, z;
      if (typL === 'slot:tor' && b.art === 'gruenguertel') { if (b.achse === 'z') { x = P.x + (P.w - w) / 2; z = r() < 0.5 ? P.z : P.z + P.d - d; } else { z = P.z + (P.d - d) / 2; x = r() < 0.5 ? P.x : P.x + P.w - w; } }
      else if (typL === 'slot:denkmal' && n < 3) { x = P.x + P.w * zw(r, 0.55, 0.75) - w / 2; z = P.z + P.d * zw(r, 0.6, 0.8) - d / 2; }
      else { x = P.x + zw(r, 1, P.w - w - 1); z = P.z + zw(r, 1, P.d - d - 1); }
      if (belegt.some((q) => x < q.x + q.w + 1 && x + w > q.x - 1 && z < q.z + q.d + 1 && z + d > q.z - 1)) continue;
      if (b.hof && P === b.hof) b.hof.belegt = true;
      return neueParzelle(ctx, typL, x, z, w, d, ['+z', '+x'], 'frei', { klasse: 3, landmarke: true });
    }
    orte.splice(orte.findIndex(([x]) => x[0] === b && x[1] === P), 1);
  }
  return null;
}

// ====================================================================================
// Diagonale Straßen
// ====================================================================================
/** Streifen um die Mittellinie C + t · (dx, dz), t ∈ [t0, t1], halbe Breite h: schneidet er das Rechteck? (Trennachsen) */
function streifenSchneidet(R, C, dx, dz, t0, t1, h) {
  const ecken = [[R.x, R.z], [R.x + R.w, R.z], [R.x, R.z + R.d], [R.x + R.w, R.z + R.d]];
  const ts = ecken.map(([x, z]) => (x - C.x) * dx + (z - C.z) * dz), ss = ecken.map(([x, z]) => (x - C.x) * dz - (z - C.z) * dx);
  if (Math.max(...ts) < t0 || Math.min(...ts) > t1 || Math.max(...ss) < -h || Math.min(...ss) > h) return false;
  const sx = [C.x + dx * t0 - dz * h, C.x + dx * t0 + dz * h, C.x + dx * t1 - dz * h, C.x + dx * t1 + dz * h];
  const sz = [C.z + dz * t0 + dx * h, C.z + dz * t0 - dx * h, C.z + dz * t1 + dx * h, C.z + dz * t1 - dx * h];
  return !(Math.max(...sx) < R.x || Math.min(...sx) > R.x + R.w || Math.max(...sz) < R.z || Math.min(...sz) > R.z + R.d);
}
/** Konvexes Polygon an der Halbebene a·x + b·z + c ≥ 0 abschneiden (Sutherland-Hodgman). */
function polyKlipp(P, a, b, c) {
  const f = ([x, z]) => a * x + b * z + c, out = [];
  for (let i = 0; i < P.length; i++) {
    const p = P[i], q = P[(i + 1) % P.length], fp = f(p), fq = f(q);
    if (fp >= 0) out.push(p);
    if ((fp >= 0) !== (fq >= 0)) { const t = fp / (fp - fq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
  }
  return out;
}
const polyFlaeche = (P) => Math.abs(P.reduce((a, p, i) => { const q = P[(i + 1) % P.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
const DIAG_UEBER = new Set(['bebaut', 'warenhaus', 'park', 'markt', 'platz', 'gruenguertel', 'kleingarten', 'parkplatz', 'faecher', 'suedmarkt']);
/**
 * Legt eine diagonale Straße an. d = { C: { x, z }, winkel (rad, 0 = +x, π/2 = +z), t0, t1, breite = 14, gehweg = 2.5 }.
 * Vor Standorten, Landmarken und Flächen, die sie nicht queren darf, endet die Straße und beginnt dahinter neu. Angeschnittene Parzellen werden in
 * ihrer Reihenrichtung gekürzt (sie enden rechtwinklig vor der Diagonale) oder entfernt; die Restflächen zwischen Haus
 * und Straße werden Zwickel (dreieckige Grünflächen bzw. Plätze, plan.zwickel). Rückgabe: Abschnitte für plan.diagonalen.
 */
function diagonaleSchneiden(d, g) {
  const { bloecke, parzellen, zwickel } = g;
  const C = d.C, dx = Math.cos(d.winkel), dz = Math.sin(d.winkel), B = d.breite ?? 14, h0 = B / 2, h = h0 + 1.2;
  let t0 = d.t0, t1 = d.t1;
  // am Kartenrand enden
  for (let t = t0; t <= t1; t += 2) { const x = C.x + dx * t, z = C.z + dz * t; if (x < 8 || z < 8 || x > g.breite - 8 || z > g.tiefe - 8) { t1 = t - 2; break; } }
  const blockVon = new Map(bloecke.map((b) => [b.id, b]));
  const sperre = [
    ...bloecke.filter((b) => !DIAG_UEBER.has(b.art)),
    ...parzellen.filter((p) => p.standort || p.landmarke || !['bebaut', 'warenhaus'].includes(blockVon.get(p.block)?.art)),
  ];
  // freie Abschnitte: vor Hindernissen endet die Straße, dahinter beginnt sie neu (Abschnitte unter 36 m entfallen)
  const abschnitte = [];
  let a = null;
  for (let t = t0; t <= t1; t += 2) {
    const zu = sperre.some((R) => streifenSchneidet(R, C, dx, dz, t - 3, t + 3, h));
    if (!zu && a === null) a = t;
    if ((zu || t + 2 > t1) && a !== null) { const e = zu ? t - 2 : t; if (e - a >= 36) abschnitte.push([a, e]); a = null; }
  }
  return abschnitte.map(([a0, a1]) => diagonalAbschnitt(d, g, C, dx, dz, a0, a1, B, h0, h, blockVon));
}
function diagonalAbschnitt(d, g, C, dx, dz, t0, t1, B, h0, h, blockVon) {
  const { parzellen, zwickel } = g;
  const weg = [];
  for (const p of parzellen) {
    const b = blockVon.get(p.block);
    if (!b || !['bebaut', 'warenhaus'].includes(b.art) || !streifenSchneidet(p, C, dx, dz, t0, t1, h)) continue;
    // Kürzen entlang x (Reihe läuft in x) bzw. z: Ausdehnung des Streifens im Band des Hauses
    const opt = [];
    if (Math.abs(dz) > 1e-6) {
      const xs = [p.z, p.z + p.d].flatMap((z) => [C.x + ((z - C.z) * dx - h) / dz, C.x + ((z - C.z) * dx + h) / dz]);
      const xa = Math.min(...xs), xb = Math.max(...xs);
      opt.push({ x: p.x, z: p.z, w: xa - p.x, d: p.d, lauf: 'x' }, { x: xb, z: p.z, w: p.x + p.w - xb, d: p.d, lauf: 'x' });
    }
    if (Math.abs(dx) > 1e-6) {
      const zs = [p.x, p.x + p.w].flatMap((x) => [C.z + ((x - C.x) * dz - h) / dx, C.z + ((x - C.x) * dz + h) / dx]);
      const za = Math.min(...zs), zb = Math.max(...zs);
      opt.push({ x: p.x, z: p.z, w: p.w, d: za - p.z, lauf: 'z' }, { x: p.x, z: zb, w: p.w, d: p.z + p.d - zb, lauf: 'z' });
    }
    const reiheX = p.seite === '+z' || p.seite === '-z', reiheZ = p.seite === '+x' || p.seite === '-x';
    const gut = opt.filter((q) => q.w >= 6 && q.d >= 6 && (!reiheX || q.lauf === 'x') && (!reiheZ || q.lauf === 'z') && !streifenSchneidet(q, C, dx, dz, t0, t1, h))
      .sort((a, c) => c.w * c.d - a.w * a.d);
    const alt = { x: p.x, z: p.z, w: p.w, d: p.d };
    let rest;
    if (gut.length) {
      const q = gut[0];
      rest = q.lauf === 'x' ? (q.x === p.x ? { x: q.x + q.w, z: p.z, w: p.w - q.w, d: p.d } : { x: p.x, z: p.z, w: q.x - p.x, d: p.d })
        : (q.z === p.z ? { x: p.x, z: q.z + q.d, w: p.w, d: p.d - q.d } : { x: p.x, z: p.z, w: p.w, d: q.z - p.z });
      Object.assign(p, { x: q.x, z: q.z, w: q.w, d: q.d, diagonal: true });
    } else { rest = alt; weg.push(p); }
    // Restfläche ohne den Straßenstreifen: Zwickel zu beiden Seiten und hinter dem Straßenende
    const R = [[rest.x, rest.z], [rest.x + rest.w, rest.z], [rest.x + rest.w, rest.z + rest.d], [rest.x, rest.z + rest.d]];
    const s0 = C.x * dz - C.z * dx, tC = C.x * dx + C.z * dz;
    for (const P of [
      polyKlipp(polyKlipp(R, -dz, dx, s0 - h0), -dx, -dz, tC + t1),   // s ≤ -h0, t ≤ t1
      polyKlipp(polyKlipp(R, dz, -dx, -s0 - h0), -dx, -dz, tC + t1),  // s ≥ h0, t ≤ t1
      polyKlipp(R, dx, dz, -tC - t1),                                  // t ≥ t1
    ]) if (P.length >= 3 && polyFlaeche(P) > 3) zwickel.push({ poly: P, block: p.block, art: 'gruen' });   // GESTALTUNG.md: Restflächen an Diagonalen als Grün, nicht als leere Pflasterfläche
  }
  for (const p of weg) {
    parzellen.splice(parzellen.indexOf(p), 1);
    const b = blockVon.get(p.block); b.parzellen.splice(b.parzellen.indexOf(p.id), 1);
  }
  return { C: { ...C }, dx, dz, t0, t1, breite: B, gehweg: d.gehweg ?? 2.5, baeume: d.baeume !== false };
}
export { streifenSchneidet };

// Kirchenstile je Region (wie sonderbauten.js REGION_KIRCHEN, ohne Zirkelimport) und Nord-Kirchenvarianten mit Mindestmaß
const KIRCHEN_REGION = {
  nord: ['backsteingotik', 'hallenkirche', 'klassizismus', 'nachkrieg', 'kapelle'], sued: ['barock', 'romanisch', 'hallenkirche', 'nachkrieg', 'kapelle'],
  west: ['romanisch', 'hallenkirche', 'neugotik', 'klassizismus', 'nachkrieg', 'barock'], ost: ['backsteingotik', 'hallenkirche', 'klassizismus', 'barock', 'nachkrieg'],
  mitte: ['hallenkirche', 'romanisch', 'barock', 'klassizismus', 'nachkrieg', 'kapelle'],
};
const NORD_KIRCHE_MIN = { marien: [38, 72], doppelturm: [38, 72], hallen: [32, 62], dorf: [18, 32] };
/**
 * B3: Landmarken je Stadt eindeutig. Mehrere Kirchen einer Stadt bekommen verschiedene Stile bzw. Varianten
 * (sonst steht dieselbe Doppelturmkirche zweimal im Bild, Nürnberg); die erste Kirche behält ihren Stil.
 */
function kirchenEindeutig(parzellen, region) {
  const liste = KIRCHEN_REGION[region] ?? KIRCHEN_REGION.mitte;
  const benutzt = new Set();
  for (const p of parzellen.filter((q) => q.typ === 'slot:kirche')) {
    let st = p.stil ?? liste[(p.seed ?? 0) % liste.length];
    if (benutzt.has(st)) st = liste.find((x) => !benutzt.has(x) && x !== 'neugotik') ?? st;
    p.stil = st; benutzt.add(st);
    if (benutzt.size > 1 && p.turm === 'doppel') p.turm = 'west';
  }
  const varianten = new Set();
  for (const p of parzellen.filter((q) => q.typ === 'slot:nord_kirche')) {
    const passt = (v) => Math.min(p.w, p.d) >= NORD_KIRCHE_MIN[v][0] && Math.max(p.w, p.d) >= NORD_KIRCHE_MIN[v][1];
    if (p.variante && varianten.has(p.variante)) {
      const v = Object.keys(NORD_KIRCHE_MIN).find((q) => !varianten.has(q) && passt(q));
      if (v) p.variante = v;
      else {
        // keine freie Variante: allgemeine Kirche in einem noch freien Stil
        p.typ = 'slot:kirche'; p.sonder = 'kirche';
        p.stil = liste.find((x) => !benutzt.has(x) && x !== 'neugotik') ?? 'klassizismus'; benutzt.add(p.stil);
        continue;
      }
    }
    if (p.variante) varianten.add(p.variante);
  }
}

/** Schließt unbebaute Straßenkanten eines Blocks (siehe Aufruf in baueRaster). */
function randSchliessen(b, g) {
  const { E, T, parzellen, diagonalen } = g;
  const meine = () => b.parzellen.map((id) => parzellen.find((p) => p.id === id)).filter(Boolean);
  const OFFEN_T = new Set(['luecke', 'baustelle', 'parkplatz', 'platz', 'durchgang']);
  const V = VIERTEL[b.viertel] ?? VIERTEL.gruenderzeit;
  const ctx = { T, rb: rng((b.seed ?? 1) + 4711), b, parzellen, klasse: b.klasse ?? 3, var: 0.5, stile: V.stile, stil: b.stil, region: E.region, typ: g.typ, viertel: b.viertel, material: g.R?.material };
  const tiefe = Math.max(T.tiefe[0], Math.min(16, Math.min(b.w, b.d) * 0.22));
  const kern = Math.hypot((b.i0 + b.i1) / 2 - E.zentrum.i, (b.j0 + b.j1) / 2 - E.zentrum.j) < 3.2;
  const ost = !!E.ddr;
  let neu = 0;
  for (const sd of ['+z', '-z', '+x', '-x']) {
    if (!b.rand?.[sd]?.seg) continue;
    const entlangX = sd[1] === 'z', L = entlangX ? b.w : b.d, a0 = entlangX ? b.x : b.z;
    // belegte Abschnitte der Kante (Parzellen, die bis 2 m an die Kante reichen)
    const P = meine();   // auch Lücken und Baustellen zählen als belegt (selten und gewollt), nur parzellenfreie Kanten werden gefüllt
    void OFFEN_T;
    const anKante = (p) => (sd === '+z' ? p.z + p.d > b.z + b.d - 2 : sd === '-z' ? p.z < b.z + 2 : sd === '+x' ? p.x + p.w > b.x + b.w - 2 : p.x < b.x + 2);
    const belegt = P.filter(anKante).map((p) => (entlangX ? [p.x, p.x + p.w] : [p.z, p.z + p.d]));
    const ueberlappt = (q, ohne) => meine().some((o) => o !== ohne && q.x < o.x + o.w - 0.05 && q.x + q.w > o.x + 0.05 && q.z < o.z + o.d - 0.05 && q.z + q.d > o.z + 0.05);
    for (const [u0, u1] of intervalleMinus(a0, a0 + L, belegt)) {
      if (u1 - u0 < 0.5) continue;
      if (u1 - u0 < 9) {
        // kurzes Reststück: ein Nachbarbau an der Kante wird bis zum nächsten verlängert
        for (const p of P.filter(anKante)) {
          const pa = entlangX ? p.x : p.z, pe = entlangX ? p.x + p.w : p.z + p.d;
          const q = { x: p.x, z: p.z, w: p.w, d: p.d };
          if (Math.abs(pe - u0) < 0.6) { if (entlangX) q.w += u1 - u0; else q.d += u1 - u0; }
          else if (Math.abs(pa - u1) < 0.6) { if (entlangX) { q.x -= u1 - u0; q.w += u1 - u0; } else { q.z -= u1 - u0; q.d += u1 - u0; } }
          else continue;
          if (ueberlappt(q, p) || (diagonalen ?? []).some((dg) => streifenSchneidet(q, dg.C, dg.dx, dg.dz, dg.t0, dg.t1, dg.breite / 2))) continue;
          Object.assign(p, q);
          break;
        }
        continue;
      }
      // freie Tiefe bis zur nächsten Parzelle, höchstens die Blocktiefe
      let t = Math.min(tiefe, (entlangX ? b.d : b.w) - 0.2);
      for (const p of P) {
        const ov = entlangX ? Math.min(u1, p.x + p.w) - Math.max(u0, p.x) : Math.min(u1, p.z + p.d) - Math.max(u0, p.z);
        if (ov <= 0.1) continue;
        const ab = sd === '+z' ? b.z + b.d - (p.z + p.d) : sd === '-z' ? p.z - b.z : sd === '+x' ? b.x + b.w - (p.x + p.w) : p.x - b.x;
        if (ab >= 0) t = Math.min(t, ab - 0.2);
      }
      if (t < 8) {
        // schmaler Vorstreifen (unter 8 m): die dahinterliegenden Bauten rücken an die Kante vor
        if (t < 0.5) continue;
        for (const p of P) {
          const ov = entlangX ? Math.min(u1, p.x + p.w) - Math.max(u0, p.x) : Math.min(u1, p.z + p.d) - Math.max(u0, p.z);
          if (ov <= 0.1) continue;
          const ab = sd === '+z' ? b.z + b.d - (p.z + p.d) : sd === '-z' ? p.z - b.z : sd === '+x' ? b.x + b.w - (p.x + p.w) : p.x - b.x;
          if (ab < 0.5 || ab > t + 0.3) continue;
          const q = { x: p.x, z: p.z, w: p.w, d: p.d };
          if (sd === '+z') q.d += ab; else if (sd === '-z') { q.z -= ab; q.d += ab; } else if (sd === '+x') q.w += ab; else { q.x -= ab; q.w += ab; }
          if ((diagonalen ?? []).some((dg) => streifenSchneidet(q, dg.C, dg.dx, dg.dz, dg.t0, dg.t1, dg.breite / 2))) continue;
          Object.assign(p, q);
          if (p.typ.startsWith('slot:')) p.front = [...new Set([...(p.front ?? []), sd])];
        }
        continue;
      }
      const stueck = (v0, v1) => {
        const x = entlangX ? v0 : sd === '+x' ? b.x + b.w - t : b.x, z = entlangX ? (sd === '+z' ? b.z + b.d - t : b.z) : v0;
        const w = entlangX ? v1 - v0 : t, d = entlangX ? t : v1 - v0;
        if ((diagonalen ?? []).some((dg) => streifenSchneidet({ x, z, w, d }, dg.C, dg.dx, dg.dz, dg.t0, dg.t1, dg.breite / 2))) return;
        if (ost) neueParzelle(ctx, 'slot:platte_zentrum', x, z, w, d, [sd], sd, { klasse: 4, variante: 'arkade', geschosse: 5, zustand: 'saniert', landmarke: false, schluss: true });
        else neueParzelle(ctx, 'stadthaus', x, z, w, d, [sd], sd, { schluss: true });
        neu++;
      };
      if (ost) stueck(u0, u1);
      else { const n = Math.max(1, Math.round((u1 - u0) / 13)); for (let k = 0; k < n; k++) stueck(u0 + ((u1 - u0) * k) / n, u0 + ((u1 - u0) * (k + 1)) / n); }
    }
  }
  if ((neu || kern) && b.hof && (b.hof.art === 'gruen' || b.hof.art === 'spielplatz') && kern) b.hof.art = 'pflaster';
}

/** Nachbarn in der Reihe: Vorgänger in Laufrichtung (+x bzw. +z), Ecken schließen die Reihe ab. */
function nachbarnSetzen(b, parzellen) {
  const meine = b.parzellen.map((id) => parzellen.find((p) => p.id === id)).filter(Boolean);
  for (const s of ['+z', '-z', '+x', '-x']) {
    const entlangX = s[1] === 'z';
    const reihe = meine.filter((p) => p.seite === s || (p.seite === 'ecke' && p.ecke && p.ecke.includes(s)) || (p.typ.startsWith('slot:') && p.seite !== 'frei' && p.front?.includes(s) && p.seite !== 'block'));
    reihe.sort((a, c) => (entlangX ? a.x - c.x : a.z - c.z));
    for (let q = 0; q < reihe.length; q++) {
      const p = reihe[q];
      p.reihe = `${b.id}${s}`;
      if (p.seite === s || !p.nachbar) p.nachbar = q > 0 ? reihe[q - 1].id : p.nachbar ?? null;
    }
  }
  // GESTALTUNG.md: geschlossene Zeile. Ein Haus, dessen zweite sichtbare Seite (+x bei Straße +z, +z bei Straße +x) an
  // einen Nachbarbau stößt, bekommt dort eine Brandwand statt einer Seitenfassade (p.anbau → stadthaus seite 'nachbar').
  const BAU = (q) => q && !['luecke', 'baustelle', 'parkplatz', 'platz', 'durchgang'].includes(q.typ) && !q.leer;
  const hartwig = meine.some((q) => q.typ === 'slot:warenhaus');
  if (hartwig) for (const p of meine) if (p.typ === 'stadthaus' || p.typ === 'eck') p.hartwigBlock = true;
  for (const p of meine) {
    if (p.typ !== 'stadthaus' && p.typ !== 'hofhaus') continue;
    const nurX = p.front?.includes('+x') && !p.front?.includes('+z');
    p.anbau = meine.some((q) => q !== p && BAU(q) && (nurX
      ? Math.abs(q.z - (p.z + p.d)) < 0.3 && Math.min(p.x + p.w, q.x + q.w) - Math.max(p.x, q.x) > p.w * 0.5
      : Math.abs(q.x - (p.x + p.w)) < 0.3 && Math.min(p.z + p.d, q.z + q.d) - Math.max(p.z, q.z) > p.d * 0.5));
  }
}

/** Box-Daten um einen Zellbereich (Nennraster). */
export function ausschnittDaten(plan, i0, j0, i1, j1) {
  const x0 = plan.spalten.x[i0], x1 = plan.spalten.x[i1] + plan.spalten.w[i1];
  const z0 = plan.reihen.z[j0], z1 = plan.reihen.z[j1] + plan.reihen.d[j1];
  return { x0, z0, x1, z1 };
}

/** Standort-Slots (Einkaufslage) eines Blocks setzen. ctx.einkaufSlots aus baueRaster. Rückgabe: Liste der Slot-Parzellen. */
function einkaufSlotsSetzen(ctx) {
  const { b } = ctx;
  const slots = [];
  for (const e of ctx.einkaufSlots ?? []) {
    b.art = 'warenhaus';
    const extra = { klasse: 5, ecke: e.ecke, ...(e.standort ? { standort: e.standort, lage: e.lage } : {}) };
    if (e.ecke === 'block') slots.push(neueParzelle(ctx, e.typ, b.x, b.z, b.w, b.d, ['+z', '+x', '-z', '-x'], 'block', extra));
    else {
      const W = e.standort ? Math.min(e.W + 2, b.w - 12) : Math.min(e.W, b.w - 30), D = e.standort ? Math.min(e.D + 2, b.d - 12) : Math.min(e.D, b.d - 28);
      const px = e.ecke.includes('+x') ? b.x + b.w - W : b.x, pz = e.ecke.includes('+z') ? b.z + b.d - D : b.z;
      slots.push(neueParzelle(ctx, e.typ, px, pz, W, D, ordne(e.ecke.match(/[+-][xz]/g)), 'ecke', extra));
    }
  }
  ctx.slotParzellen = slots;
  return slots;
}

const ueberlappt = (a, b, m = 0) => a.x < b.x + b.w + m && a.x + a.w + m > b.x && a.z < b.z + b.d + m && a.z + a.d + m > b.z;
/** Freie Position für w × d im Rechteck P, Abstand m zu allen rects (Raster 3 m, Reihenfolge per Zufall gestreut). */
function freiePosition(P, rects, w, d, m, rb, vorn = true) {
  const kand = [];
  for (let x = P.x; x + w <= P.x + P.w + 0.01; x += 3) for (let z = P.z; z + d <= P.z + P.d + 0.01; z += 3) {
    const q = { x, z, w, d };
    if (!rects.some((r) => ueberlappt(q, r, m))) kand.push([q, (vorn ? (z - P.z) / P.d + (x - P.x) / P.w : 1) + rb() * 0.6]);
  }
  if (!kand.length) return null;
  kand.sort((a, b) => b[1] - a[1]);
  return kand[0][0];
}

/**
 * Hilfen für Archetyp-Module (zweites Argument von entwurf, parzellierung, nachbearbeitung, nachPlan, flaechen.parzelliere).
 * Entwurf: nimm, frei, zelleFrei, fixiere, wasserSpalte, entwurf(name, E). Parzellen: neueParzelle, parzelliere, mergeRand,
 * blockDetails, entferneParzelle, parzellenVon, slotsImBlock, einkaufSlotsSetzen, freiePosition, ueberlappt, intervalleMinus,
 * teileLaenge, bracheErlaubt, bracheZaehlen. Allgemein: rng, waehle, zw, klemm, wahlGewichtet, HAUPTLICH, LINIEN.
 */
export const PLAN_HILFE = {
  // Entwurf
  nimm, frei, zelleFrei: (E, i, j) => zelleFrei(E, i, j), fixiere, wasserSpalte, entwurf: (name, E) => entwurfVon(name)(E),
  // Parzellen
  neueParzelle, parzelliere, mergeRand, blockDetails, entferneParzelle,
  parzellenVon: (ctx) => ctx.b.parzellen.map((id) => parzelleVon(ctx, id)).filter(Boolean),
  slotsImBlock: (ctx) => ctx.b.parzellen.map((id) => parzelleVon(ctx, id)).filter((p) => p && p.standort),
  einkaufSlotsSetzen, freiePosition, ueberlappt, intervalleMinus, teileLaenge, ordne,
  /** true, wenn in dieser Stadt noch eine Brache erlaubt ist (BRACHEN_MAX). */
  bracheErlaubt: (E) => (E.brachenGezaehlt ?? 0) < (BRACHEN_MAX[E.typ] ?? 1),
  bracheZaehlen: (E) => { E.brachenGezaehlt = (E.brachenGezaehlt ?? 0) + 1; },
  // Allgemein
  rng, waehle, zw, klemm, wahlGewichtet, HAUPTLICH, LINIEN, ganz,
};
