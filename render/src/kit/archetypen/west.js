// Archetyp-Modul West: Stadttypen in Nordrhein-Westfalen, ihre Flächen und das Stilprofil 'west' für die Stadthäuser.
// Registriert sich beim Import (siehe archetypen/README.md und die Dokumentation oben in stadtplan.js).
//
// Typen:
//   ruhrstadt           Ruhrgebiet: Hbf mit Busbahnhof oben, Innenstadt der 60er mit Fußgängerzone, Konzernverwaltung, Büdchen,
//                       Schnellweg, Industriezeile (Zeche mit Fördergerüst, Kokerei/Hütte, Zechensiedlungen, Halde, Einkaufszentrum),
//                       Kanal mit Hafen und Schleuse (oder Rhein mit Hafen), Stadion, Stadtteilzentrum.
//   rheinmetropole      Rheinland: Rhein vorn mit Promenade, Brücken, Altstadt mit Brauhäusern, Dom (Köln), Ringe, Graben-Boulevard
//                       (Düsseldorf), rheinische Gründerzeit, 50er-Geschäftshäuser, Medienhafen mit Fernmeldeturm.
//   westfalen           Münster/Paderborn-Typ: Promenadenring mit Radweg, Dom, Giebelhäuser mit Bogengängen, Backstein.
//   bergisch_sauerland  Tal mit Fluss und Talstraße, Schwebebahn (Wuppertal), Schieferhäuser grün-weiß-schwarz, Häuser am Hang.
//
// Wasser: Kanalzellen (Fläche west_kanal) tragen slot:ruhr_kanal mit eigenem Wasser, ohne Bodenplatte darunter (FLAECHEN.ohneGehweg).
// Rhein und Wupper sind Wasserflächen des Plans; Promenade, Hafen und Schwebebahn liegen als Parzellen darin (nachPlan),
// Wasserspiegel gleich stadt.js (−2,2), Wasserseite zur Kamera (Front −z → Wasser an +z).
import { registriereArchetyp, PLAN_HILFE as H } from '../stadtplan.js';
import { registriereSlots, registriereStilProfil } from '../bauer.js';
import { WEST_SLOTS, fahrrad } from '../westbauten.js';
import { rng, waehle, zw } from '../basis.js';
import { SLOTS } from '../sonderbauten.js';

const { nimm, fixiere, zelleFrei, klemm, wahlGewichtet, neueParzelle, mergeRand, parzellenVon, freiePosition, intervalleMinus, LINIEN, HAUPTLICH } = H;

// Autobahnartiger Schnellweg: Hauptstraße mit Mittelleitwand (stadt.js zeichnet s.leitwand), ohne Bäume und Parkstreifen
LINIEN.schnellweg = { breite: 27, gehweg: 1.5, mittel: 1.2 };
HAUPTLICH.add('schnellweg');

const PROMENADE_Y = -2.2;   // Wasserspiegel der Parzellen im Plan-Wasser (gleich stadt.js WASSER_Y)

// ====================================================================================
// Hilfen für Entwürfe
// ====================================================================================
const setzeSpalte = (E, i, w) => { if (i >= 0 && i < E.spalten.length) E.spalten[i] = Math.max(E.spalten[i], w); };
const setzeReihe = (E, j, d) => { if (j >= 0 && j < E.reihen.length) E.reihen[j] = Math.max(E.reihen[j], d); };
const istFrei = (E, i0, i1, j0, j1) => { for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) if (!zelleFrei(E, i, j)) return false; return i0 >= 0 && j0 >= 0 && i1 < E.spalten.length && j1 < E.reihen.length; };
function flaeche(E, f) { if (!istFrei(E, f.i0, f.i1, f.j0, f.j1)) return null; return nimm(E, f); }
/** Rhein (oder breiter Fluss) als Reihe entlang x; Brücken nur an Hauptlinien (brueckeP klein). */
function rheinReihe(E, j, breite, o = {}) {
  E.reihen[j] = breite;
  const f = nimm(E, { art: 'wasser', form: 'fluss', i0: 0, i1: E.nx - 1, j0: j, j1: j, quer: true, brueckeP: o.brueckeP ?? 0.06, keineSchiffe: true, westFluss: o.art ?? 'rhein', ...o.extra });
  for (let k = 0; k <= E.nx; k++) fixiere(E, k, j, j);
  return f;
}

/**
 * Hafenkai am Rhein: zusammenhängende freie Zellen der Reihe j (direkt über dem Fluss) werden west_hafenkai mit
 * ohneUferstrasse, die Speicher stehen also direkt an der Kaikante; vor dem Kai liegen die Hafenbecken (nachPlan).
 */
function hafenkai(E, j, zellen) {
  let lauf = [];
  const ende = () => { if (lauf.length) nimm(E, { art: 'west_hafenkai', i0: lauf[0], i1: lauf[lauf.length - 1], j0: j, j1: j, ohneUferstrasse: ['+z'] }); lauf = []; };
  for (let i = 0; i < E.spalten.length; i++) {
    if (zellen.includes(i) && istFrei(E, i, i, j, j)) { if (lauf.length && lauf[lauf.length - 1] !== i - 1) ende(); lauf.push(i); } else ende();
  }
  ende();
}

// ====================================================================================
// Ruhrgebiet
// ====================================================================================
const RUHR_BAHNHOF = ['70er', '50er', 'altbau'];
/** Raster auf nx × nz Zellen bringen (Breiten der letzten Zelle fortgeschrieben, alle Linien 'neben'). */
function rasterGroesse(E, nx, nz) {
  while (E.spalten.length < nx) E.spalten.push(E.spalten[E.spalten.length - 1]);
  while (E.reihen.length < nz) E.reihen.push(E.reihen[E.reihen.length - 1]);
  E.spalten.length = nx; E.reihen.length = nz; E.nx = nx; E.nz = nz;
  E.zTyp = Array(nx + 1).fill('neben'); E.xTyp = Array(nz + 1).fill('neben');
}
/**
 * Ruhrstadt nach GESTALTUNG.md: Innenstadt in der Kartenmitte (Kreuz der Einkaufsstraßen an Linie ci + 1 / cj + 1), rundum
 * mindestens drei Blockreihen Stadt, damit der Nahausschnitt nie über den Kartenrand sieht.
 *   Bahn: schmales Gleisband (vier Gleise, 26 m) drei Zellen von der Innenstadt, das Empfangsgebäude mit Vorplatz und
 *         Busbahnhof steht als eigener Block (west_bahnhof) davor; keine Gleisfelder.
 *   Rand: Industriezeile drei Zellen unterhalb der Innenstadt. Genau ein Großbau (Zeche mit Fördergerüst, sonst Hütte) steht
 *         in der Spalte, die der Nahausschnitt am unteren Rand zeigt (ci + 2); Siedlungen, Halde, Einkaufszentrum, Stadion
 *         und Kokerei liegen in Spalten außerhalb des Ausschnitts. Darunter Kanal mit Hafen und Schleuse.
 *   Rhein (Duisburg): breiter Strom (104 m) zwei Zellen unterhalb der Innenstadt, Uferstraßen beidseits, Brücken im Abstand
 *         von rund 240 m, Hafenkai außerhalb des Ausschnitts, gegenüber Stadt und die Hütte am Ufer.
 */
function ruhrstadt(E) {
  const { r, o } = E;
  const klein = E.typ === 'mittelstadt';
  E.westTyp = 'ruhr';
  // Lage der Bahn (extra bahnLage): 'oben' | 'mitte' (Gleisband entlang x oberhalb der Innenstadt), 'links' | 'rechts' (entlang z)
  const lage = o.bahnLage ?? waehle(rng(E.seed * 13 + 7), ['oben', 'mitte', 'links', 'rechts']);
  const N = klein ? 8 : 9;
  rasterGroesse(E, Math.max(E.nx, N + (klein ? 0 : 1)), N);
  const nx = E.nx, nz = E.nz;
  const ci = Math.floor((nx - 1) / 2), cj = Math.floor((nz - 1) / 2);
  const senk = lage === 'links' || lage === 'rechts';
  // leicht unregelmäßiges Raster (Wiederaufbau auf altem Grundriss)
  const w0 = E.spalten[0], d0 = E.reihen[0];
  E.spalten = E.spalten.map(() => Math.round((w0 * zw(r, 0.9, 1.1)) / 2) * 2);
  E.reihen = E.reihen.map(() => Math.round((d0 * zw(r, 0.9, 1.1)) / 2) * 2);
  const westBahnhof = o.bahnhof ?? waehle(r, RUHR_BAHNHOF);
  const BAND = klein ? 16 : 26;   // Mittelstadt: zwei Gleise mit Bahnsteig
  // Wasser und Industriezeile (unterhalb der Innenstadt)
  let jR = null, jI, jK = null;
  if (o.rhein) {
    jR = Math.min(nz - 2, cj + 3);   // Rhein eine Reihe weiter weg vom Kern (Wasser nah ≤ 15 %)
    rheinReihe(E, jR, klein ? 80 : 94, { brueckeP: 0.6, extra: { westHafen: true, brueckenAbstand: 240, keineSchiffe: false } });
    E.ruhrRhein = jR;
    jI = jR + 1;
  } else if (o.kanal !== false) {
    jK = nz - 1;
    E.reihen[jK] = 46;   // Kanalbreite fest (Ruhr-Kanäle 40 bis 55 m), unabhängig von der Rastertiefe
    const folge = o.kanalFolge ?? ['strecke', 'hafen', 'strecke', 'schleuse', 'strecke', 'hafen', 'strecke', 'strecke', 'schleuse', 'strecke'];
    const off = Math.floor(r() * 3);
    // GESTALTUNG.md 4: der Kanal ist ein durchgehendes Band über die ganze Karte (Kaimauer, Uferstraßen beidseits,
    // Brücken an einzelnen Querstraßen), keine Einzelbecken je Rasterzelle. Zufallszug bleibt für gleiche Pläne.
    void folge; void off;
    nimm(E, { art: 'wasser', form: 'kanal', i0: 0, i1: nx - 1, j0: jK, j1: jK, quer: true, brueckenAbstand: 230, ruhrKanal: true });
    for (let k = 0; k <= nx; k++) fixiere(E, k, jK, jK);
    jI = jK - 1;
  } else jI = klein ? nz - 1 : Math.min(nz - 1, cj + 3);   // Industriezeile in Mittelstädten in der Randreihe
  // Bahn: Gleisband und Bahnhofsblock
  let st = null;
  if (!senk) {
    const jB = Math.max(0, cj - (klein ? 3 : 4));   // Gleisband am oberen Kartenrand, im Nahausschnitt höchstens angeschnitten
    E.reihen[jB] = BAND;
    nimm(E, { art: 'bahn', i0: 0, i1: nx - 1, j0: jB, j1: jB, oben: true, trasse: true, ohneBahnhof: true });
    for (let k = 0; k <= nx; k++) fixiere(E, k, jB, jB);
    st = { i: ci - 2, j: jB + 1, front: '+z' };
    E.zTyp[ci - 1] = 'haupt'; fixiere(E, ci - 1); if (E.T.tram) E.tram.push('z' + (ci - 1));
  } else {
    const iB = lage === 'links' ? Math.max(0, ci - (klein ? 3 : 4)) : Math.min(nx - 1, ci + 4);
    const jEnde = (jR ?? jI) - 1;
    E.spalten[iB] = BAND;
    nimm(E, { art: 'bahn', i0: iB, i1: iB, j0: 0, j1: jEnde, achse: 'z', seite: lage === 'links' ? '+x' : '-x', trasse: true, ohneBahnhof: true });
    for (let k = iB; k <= iB + 1; k++) fixiere(E, k);
    st = lage === 'links' ? { i: iB + 1, j: cj - 2, front: '+x' } : { i: iB - 1, j: cj + 1, front: '-x' };
    E.xTyp[st.j + 1] = 'haupt';
  }
  // Hauptachsen selbst setzen (je eine in x und z, neben dem Kreuz der Einkaufsstraßen an Linie ci + 1 / cj + 1), damit
  // ergaenzeEntwurf keine Hauptstraße auf das Kreuz legt und die Einkaufslage in der Kartenmitte bleibt
  if (!E.zTyp.some((t) => t === 'haupt')) { E.zTyp[ci - 1] = 'haupt'; if (E.T.tram) E.tram.push('z' + (ci - 1)); }
  if (!E.xTyp.some((t) => t === 'haupt')) E.xTyp[cj - 1] = 'haupt';
  if (st && istFrei(E, st.i, st.i, st.j, st.j)) {
    setzeSpalte(E, st.i, 80); setzeReihe(E, st.j, 62);
    nimm(E, { art: 'west_bahnhof', i0: st.i, i1: st.i, j0: st.j, j1: st.j, variante: westBahnhof, front: st.front });
    for (let k = st.i; k <= st.i + 1; k++) fixiere(E, k, st.j, st.j);
  }
  E.landmarken.push('slot:bahnhof');
  // Fluss durch die Stadt (Ruhr in Mülheim, Witten, Hagen): durchgehendes Band, deutlich breiter als der Kanal
  if (o.fluss) {
    const iF = lage === 'rechts' ? ci - 3 : ci + 3, j0 = senk ? 0 : Math.max(0, cj - 3) + 1;
    if (iF >= 0 && iF < nx && istFrei(E, iF, iF, j0, jI - 1)) { E.spalten[iF] = klein ? 60 : 72; nimm(E, { art: 'wasser', form: 'fluss', i0: iF, i1: iF, j0, j1: jI - 1, keineSchiffe: true, brueckenAbstand: 220 }); }
  }
  // Industriezeile: genau ein Großbau in der Spalte am Rand des Nahausschnitts, alles Übrige außerhalb
  setzeReihe(E, jI, 92);
  const teile = [];
  if (o.stadion) teile.push({ art: 'west_stadion', n: 2, variante: o.stadion });
  if (o.zeche !== false) teile.push({ art: 'west_zeche', n: 1, variante: o.zeche ?? waehle(r, ['strebe', 'doppelbock', 'malakow']), zustand: o.zechenZustand ?? waehle(r, ['stillgelegt', 'museum', 'aktiv']) });
  teile.push({ art: 'west_siedlung', n: 1 });
  if (o.ekz !== false && !o.ekzGross) teile.push({ art: 'west_ekz', n: 1, variante: o.ekz ?? waehle(r, ['70er', '80er']) });
  if (o.huette) teile.push({ art: 'west_kokerei', n: 1, variante: 'huette', zustand: o.huettenZustand ?? 'aktiv' });
  if (o.kokerei) teile.push({ art: 'west_kokerei', n: 1, variante: 'kokerei', zustand: o.kokereiZustand ?? 'aktiv' });
  if (o.ekzGross) teile.push({ art: 'west_ekz', n: 2, variante: '90er', gross: true });
  if (o.gasometer) teile.push({ art: 'west_kokerei', n: 1, variante: 'gasometer', zustand: 'museum' });
  if (o.halde !== false) teile.push({ art: 'west_halde', n: 1, variante: o.halde ?? waehle(r, ['pyramide', 'bramme', 'treppe', 'kreuz']) });
  teile.push({ art: 'west_siedlung', n: 1 });
  // Spaltenbreite höchstens 84 m: breitere Spalten machen alle Blöcke der Spalte zu groß (große Höfe)
  const breiteVon = (t) => (t.art === 'west_zeche' || (t.art === 'west_kokerei' && t.variante !== 'gasometer') ? 84 : t.art === 'west_halde' ? 72 : t.art === 'west_stadion' ? 66 : t.art === 'west_ekz' ? (t.n === 2 ? 66 : 84) : t.art === 'west_kokerei' ? 62 : 0);
  const setze = (t, i) => {
    if (i < 0 || i + t.n > nx || !istFrei(E, i, i + t.n - 1, jI, jI)) return false;
    for (let q = 0; q < t.n; q++) setzeSpalte(E, i + q, breiteVon(t));
    if (t.art === 'west_stadion') setzeReihe(E, jI, 104);
    nimm(E, { art: t.art, i0: i, i1: i + t.n - 1, j0: jI, j1: jI, variante: t.variante, zustand: t.zustand, gross: t.gross });
    for (let q = i; q <= i + t.n; q++) fixiere(E, q, jI, jI);
    return true;
  };
  // GESTALTUNG.md 3: höchstens ein Großbau im Nahausschnitt (Gleisband zählt mit). In Mittelstädten liegt die Zeche
  // deshalb zwei Spalten weiter außen, außerhalb des Zentrumsbilds.
  const V = klein ? nx - 1 : ci + 2;
  let h = teile.findIndex((t) => t.art === 'west_zeche');
  if (h < 0) h = teile.findIndex((t) => t.art === 'west_kokerei' && t.variante !== 'gasometer');
  if (h >= 0 && setze(teile[h], V)) teile.splice(h, 1);
  // Spalten außerhalb des Ausschnitts: links bis ci, rechts ab ci + 5 (ci + 1, ci + 3 und ci + 4 bleiben Stadt)
  const spalten = [];
  for (let q = 0; q <= ci; q++) spalten.push(q);
  for (let q = ci + (klein ? 4 : 5); q < nx; q++) spalten.push(q);
  for (const t of teile) for (const q of spalten) if (setze(t, q)) break;
  // Schnellweg zwischen Stadt und Industriezeile (nicht am Rhein, nicht in kleinen Städten)
  if (!klein && o.schnellweg !== false && jR === null) E.xTyp[jI] = 'schnellweg';
  // Zentrum, Konzernverwaltung, Kirche, Stadtteilzentrum
  E.zentrum = { i: ci, j: cj };
  const nKonzern = o.konzern ?? (klein ? 0 : 1);
  // Lage je Stadt aus dem Seed (keine Kopie von Stadt zu Stadt)
  const konzernZellen = [[ci - 1, cj - 1], [ci + 2, cj], [ci - 1, cj + 2], [ci + 2, cj - 1], [ci + 1, cj + 2]].sort(() => r() - 0.5);
  // Konzernverwaltung eingebettet: Slot an der Straßenseite eines normalen Blocks, übrige Seiten Blockrand (nachbearbeitung)
  E.ruhrKonzern = [];
  for (let k = 0, n = 0; k < konzernZellen.length && n < nKonzern; k++) {
    const [qi, qj] = konzernZellen[k];
    if (!istFrei(E, qi, qi, qj, qj)) continue;
    setzeSpalte(E, qi, 76); setzeReihe(E, qj, 70);
    E.ruhrKonzern.push({ i: qi, j: qj, variante: (o.konzernVarianten ?? ['glas60', 'turm70', 'backstein20'])[n] });
    n++;
  }
  // Hauptkirche: Stil aus staedte.js (je Stadt anders als bei den Nachbarn), Lage je Stadt aus dem Seed
  const ksZufall = waehle(r, ['romanisch', 'hallenkirche']);
  if (!o.kern60) for (const [qi, qj] of [[ci + 2, cj + 1], [ci - 1, cj + 1], [ci + 1, cj - 1], [ci - 1, cj + 2]].sort(() => r() - 0.5)) if (istFrei(E, qi, qi, qj, qj)) { nimm(E, { art: 'kirche', i0: qi, i1: qi, j0: qj, j1: qj, seiten: ['-z', '-x', '+x'], kirchStil: o.kirchStil ?? ksZufall }); E.landmarken.push('slot:kirche'); break; }
  // Polyzentrisch: Stadtteilzentrum mit Platz und Kirche der 50er, weit außerhalb des Nahausschnitts
  const nb = { i: 0, j: Math.min(nz - 2, cj + 2) };
  if (!klein && istFrei(E, nb.i, nb.i, nb.j, nb.j)) {
    nimm(E, { art: 'platz', i0: nb.i, i1: nb.i, j0: nb.j, j1: nb.j, seiten: ['-z', '-x'] });
    if (istFrei(E, nb.i + 1, nb.i + 1, nb.j, nb.j)) nimm(E, { art: 'kirche', i0: nb.i + 1, i1: nb.i + 1, j0: nb.j, j1: nb.j, seiten: ['-z', '-x'], kirchStil: 'nachkrieg' });
  }
  E.nebenzentrum = nb;
  for (let k = 0; k <= nx; k++) fixiere(E, k);
  E.versatz = () => 0;
  const zc = { i: ci + 0.5, j: cj + 0.5 };
  E.viertel = (ii, jj) => {
    const dd = Math.hypot(ii - zc.i, (jj - zc.j) * 1.1);
    if (o.altstadtRest && dd < 0.9) return 'altstadt';
    if (dd < (o.kern60 ? 2.4 : 1.7)) return 'ruhr60';
    if (!klein && Math.hypot(ii - nb.i - 0.5, jj - nb.j) < 1.4) return 'stadtteil';
    if (o.kern60) return 'nachkrieg';
    return dd < 3.1 ? 'gruenderzeit' : 'nachkrieg';
  };
  E.landmarkVerbot = new Set(['slot:mall', 'slot:schloss', 'slot:tor', 'slot:konkurrenz', 'slot:hochhaus']);
  E.marktVariante = o.markt ?? (o.kern60 ? 'keiner' : 'einer');
  // Rheinhafen (Duisburg): Kai mit Speichern direkt am Wasser, außerhalb des Nahausschnitts
  if (o.rhein) { const zellen = []; for (let q = 0; q < nx; q++) if (Math.abs(q - zc.i) >= 2.5) zellen.push(q); hafenkai(E, jR - 1, zellen); }
  E.umriss = 'voll';
}

// ====================================================================================
// Rheinland
// ====================================================================================
function rheinmetropole(E) {
  const { r, o } = E;
  const nx = E.nx, nz = E.nz, metro = E.typ === 'metropole', klein = E.typ === 'mittelstadt';
  E.westTyp = 'rhein';
  const w0 = E.spalten[0], d0 = E.reihen[0];
  E.spalten = E.spalten.map(() => Math.round((w0 * zw(r, 0.85, 1.1)) / 2) * 2);
  E.reihen = E.reihen.map(() => Math.round((d0 * zw(r, 0.85, 1.1)) / 2) * 2);
  const cA = klemm(Math.floor(nx / 2) - 1 + (r() < 0.5 ? 0 : 1), 2, nx - 3);   // Altstadtmitte (Spalte)
  let jR = null, jA;
  if (o.rhein !== false) {
    jR = nz - 2;
    rheinReihe(E, jR, klein ? 74 : 94,   // GESTALTUNG.md 4: Rhein 94 m
      { extra: { westPromenade: o.promenade !== false, westHafen: !!o.hafen } });
    jA = jR - 1;
    // Brücken: zwei bis drei Hauptlinien queren den Rhein
    const br = metro ? [cA - 2, cA + 2, cA + 5] : [cA - 1, cA + 3];
    for (const k of br) if (k >= 1 && k < nx) { E.zTyp[k] = 'haupt'; fixiere(E, k); }
  } else jA = Math.floor(nz / 2);
  E.rheinJ = jR;
  // Hafen flussab (Neuss, Wesel): Kai ohne Uferstraße rechts der Altstadt
  if (o.hafen && jR !== null) { const zellen = []; for (let q = Math.max(cA + 2, Math.floor(nx * 0.45)); q < nx; q++) zellen.push(q); hafenkai(E, jA, zellen); }
  // Altstadt am Rhein: versetzte Gassen, eingeschobene Gässchen, kleinteilige Parzellen
  const altTief = 1;
  const alt = (i, j) => Math.abs(i - cA - 0.3) <= (metro ? 2.2 : 1.6) && j <= jA && j >= jA - altTief;
  E.versatz = (k, j) => (alt(k - 0.5, j) ? 10 : 0);
  E.einschub = (i, j) => (alt(i, j) ? 0.55 : 0.05);
  E.durchgang = 0.4;
  E.altstadtZelle = alt;
  // Dom (Köln, Aachen) bzw. romanische Hauptkirche
  let zc = { i: cA - 0.5, j: jA - 2 };   // Einkaufslage eine halbe Reihe weiter vom Rhein (Wasser nah ≤ 15 %)
  if (o.dom === 'gotik') {
    const jd = jA - 1;
    setzeSpalte(E, cA, 58); setzeSpalte(E, cA + 1, 58); setzeReihe(E, jd, 84);
    nimm(E, { art: 'domplatz', i0: cA, i1: cA + 1, j0: jd, j1: jd, seiten: ['-x', '-z', '+x'], kirchStil: 'neugotik', westDom: true });   // C3: Domplatte von drei Seiten gefasst
    E.landmarken.push('slot:kirche');
    // Hauptbahnhof direkt neben dem Dom
    if (istFrei(E, cA + 2, cA + 3, jd, jd)) { setzeSpalte(E, cA + 2, 76); setzeSpalte(E, cA + 3, 76); nimm(E, { art: 'bahn', i0: cA + 2, i1: cA + 3, j0: jd, j1: jd, gross: true, oben: true }); E.landmarken.push('slot:bahnhof'); }
    for (let k = cA; k <= cA + 4; k++) fixiere(E, k, jd, jd);
    zc = { i: cA - 0.2, j: jd - 1.1 };
  } else if (o.dom === 'pfalz') {
    const jd = jA - 1;
    setzeSpalte(E, cA, 52); setzeSpalte(E, cA + 1, 52); setzeReihe(E, jd, 70);
    nimm(E, { art: 'west_pfalz', i0: cA, i1: cA + 1, j0: jd, j1: jd });
    for (let k = cA; k <= cA + 2; k++) fixiere(E, k, jd, jd);
    zc = { i: cA - 0.8, j: jd - 0.6 };
  } else if (o.kirche !== false) {
    const kj = jA - 1, ki = cA + 1;
    if (istFrei(E, ki, ki, kj, kj)) { nimm(E, { art: 'kirche', i0: ki, i1: ki, j0: kj, j1: kj, seiten: ['-z', '-x'], kirchStil: o.kirchStil ?? 'romanisch' }); E.landmarken.push('slot:kirche'); }
  }
  // Graben-Boulevard (Düsseldorf): schmale Reihe mit Wasser in der Mitte und Grün (Hofgarten) daneben
  if (o.graben && jR !== null) {
    const jK = jA - 2, cK = cA + 1;
    E.reihen[jK] = 26;
    nimm(E, { art: 'wasser', form: 'kanal', i0: cK - 1, i1: cK + 1, j0: jK, j1: jK, quer: true, brueckeP: 1, keineSchiffe: true, westGraben: true });
    for (let i = 0; i < nx; i++) if (i < cK - 1 || i > cK + 1) nimm(E, { art: 'gruenguertel', i0: i, i1: i, j0: jK, j1: jK, achse: 'x' });
    for (let k = 0; k <= nx; k++) fixiere(E, k, jK, jK);
    E.graben = { jK, cK };
    zc = { i: cK + 0.2, j: jK - 0.3 };   // Einkaufslage am Graben, abgewandt vom Rhein (Wasser nah ≤ 15 %)
  }
  // Ringe (Köln) bzw. Wallring (Aachen, Krefeld): Prachtstraßen um den Kern
  if (o.ringe) {
    const kl = klemm(cA - 3, 1, nx - 1), kr = klemm(cA + (metro ? 5 : 4), 1, nx - 1), lo = klemm(jA - (metro ? 5 : 4), 1, nz - 1);
    E.zTyp[kl] = 'ring'; E.zTyp[kr] = 'ring'; E.xTyp[lo] = 'ring';
    if (jR === null) E.xTyp[klemm(jA + 2, 1, nz - 1)] = 'ring';
    fixiere(E, kl); fixiere(E, kr);
  }
  // Medienhafen mit Fernmeldeturm am Rhein (rechts der Altstadt)
  if (o.medienhafen && jR !== null) {
    const im = 0;
    if (istFrei(E, im, im + 1, jA, jA)) {
      setzeSpalte(E, im, 74); setzeSpalte(E, im + 1, 74);
      nimm(E, { art: 'west_medienhafen', i0: im, i1: im + 1, j0: jA, j1: jA, variante: o.medienhafen, turm: !!o.turm, ohneUferstrasse: true });
    }
  }
  if (o.konzern) { const ci = klemm(cA - 3, 0, nx - 1), cj = klemm(jA - 3, 0, nz - 1); if (istFrei(E, ci, ci, cj, cj)) { setzeSpalte(E, ci, 72); setzeReihe(E, cj, 64); nimm(E, { art: 'west_konzern', i0: ci, i1: ci, j0: cj, j1: cj, variante: 'glas60' }); } }
  if (o.stadion) { const si = 0, sj = klemm(jA - 2, 1, nz - 2); if (istFrei(E, si, si, sj, sj)) { setzeSpalte(E, si, 132); setzeReihe(E, sj, 104); nimm(E, { art: 'west_stadion', i0: si, i1: si, j0: sj, j1: sj, variante: o.stadion }); } }
  if (!E.flaechen.some((f) => f.art === 'bahn') && !klein) E.landmarken.push('slot:bahnhof');
  E.zentrum = zc;
  E.viertel = (i, j) => {
    if (jR !== null && j > jR) return 'rheingruender';
    if (alt(i, j)) return 'rheinalt';
    const dd = Math.hypot(i - zc.i, j - zc.j);
    if (dd < (o.fuenfziger ? 2.2 : 1.4)) return o.fuenfziger ? 'rhein50' : 'zentrum';
    return dd < (metro ? 3.4 : 3.0) ? 'rheingruender' : 'nachkrieg';
  };
  E.landmarkVerbot = new Set(['slot:mall', 'slot:konkurrenz', ...(o.schloss ? [] : ['slot:schloss'])]);
  E.marktVariante = 'einer';
  E.umriss = 'voll';
  E.bruecken = o.graben ? 'alle' : 'zufall';
}

// ====================================================================================
// Westfalen
// ====================================================================================
function westfalen(E) {
  const { r, o } = E;
  E.westTyp = 'westf';
  if (o.ring !== false) {
    H.entwurf('ring', E);
    // Grüngürtel → Promenade mit Radweg und Lindenallee
    for (const f of E.flaechen) if (f.art === 'gruenguertel') f.art = 'west_promenade';
    E.ringTor = false;
    const { gl, gr, gt, gb } = E.ringIdx;
    const c = klemm(Math.round((gl + gr) / 2) - 1, gl + 1, gr - 2), jd = klemm(Math.round((gt + gb) / 2) - 1, gt + 1, gb - 1);
    if (o.dom !== false && istFrei(E, c, c + 1, jd, jd)) {
      setzeSpalte(E, c, 60); setzeSpalte(E, c + 1, 60); setzeReihe(E, jd, 78);
      nimm(E, { art: 'domplatz', i0: c, i1: c + 1, j0: jd, j1: jd, seiten: ['-z', '-x'], kirchStil: o.kirchStil ?? 'romanisch' });
      E.landmarken.push('slot:kirche');
      E.zentrum = { i: c + 0.5, j: jd + 1.2 };
    } else {
      const kj = jd, ki = c;
      if (istFrei(E, ki, ki, kj, kj)) { nimm(E, { art: 'kirche', i0: ki, i1: ki, j0: kj, j1: kj, seiten: ['-z', '-x'], kirchStil: 'hallenkirche' }); E.landmarken.push('slot:kirche'); }
      E.zentrum = { i: c + 0.8, j: jd + 1 };
    }
    // zweite Kirche (Hallenkirche) am Rand des Kerns
    const k2 = [gr - 1, gt + 1];
    if (istFrei(E, k2[0], k2[0], k2[1], k2[1])) nimm(E, { art: 'kirche', i0: k2[0], i1: k2[0], j0: k2[1], j1: k2[1], seiten: ['-z', '-x'], kirchStil: 'hallenkirche' });
    const kern = E.kernZellen;
    E.viertel = (i, j) => (kern(i, j) ? 'westfalt' : (i >= gl - 1 && i <= gr + 1 && j >= gt - 1 && j <= gb + 1) ? 'gruenderzeit' : 'nachkrieg');
  } else {
    H.entwurf('altstadt', E);
    const zc = E.zentrum, ci = Math.round(zc.i), cj = Math.round(zc.j) - 1;
    if (istFrei(E, ci, ci, cj, cj)) { nimm(E, { art: 'kirche', i0: ci, i1: ci, j0: cj, j1: cj, seiten: ['-z', '-x'], kirchStil: 'hallenkirche' }); E.landmarken.push('slot:kirche'); }
    const v0 = E.viertel;
    E.viertel = (i, j) => { const v = v0(i, j); return v === 'altstadt' ? 'westfalt' : v; };
  }
  // Wald und Höhen am oberen Rand (Teutoburger Wald in Bielefeld)
  if (o.hang) for (let i = 0; i < E.spalten.length; i++) if (zelleFrei(E, i, 0)) nimm(E, { art: 'west_hang', i0: i, i1: i, j0: 0, j1: 0, basis: 2.5, wald: true, ohneHaeuser: true });
  E.landmarken.push('slot:bahnhof');
  E.landmarkVerbot = new Set(['slot:mall', 'slot:konkurrenz', 'slot:hochhaus']);
  E.marktVariante = o.markt ?? 'einer';
  E.umriss = o.ring !== false ? 'voll' : E.umriss;
}

// ====================================================================================
// Bergisches Land und Sauerland
// ====================================================================================
function bergisch(E) {
  const { r, o } = E;
  const nx = E.nx, nz = E.nz;
  E.westTyp = 'berg';
  const w0 = E.spalten[0], d0 = E.reihen[0];
  E.spalten = E.spalten.map(() => Math.round((w0 * zw(r, 0.8, 1.1)) / 2) * 2);
  E.reihen = E.reihen.map(() => Math.round((d0 * zw(r, 0.75, 1.0)) / 2) * 2);
  // Tal: Fluss als Reihe in der Mitte, Talstraße darüber, Bahn darunter
  const jW = klemm(Math.floor(nz / 2), 2, nz - 3);
  const fluss = o.fluss !== false;
  if (fluss) {
    E.reihen[jW] = o.schwebebahn ? 30 : 26;
    nimm(E, { art: 'wasser', form: 'fluss', i0: 0, i1: nx - 1, j0: jW, j1: jW, quer: true, brueckeP: 0.45, keineSchiffe: true, westFluss: 'wupper', westSchwebebahn: !!o.schwebebahn });
    for (let k = 0; k <= nx; k++) fixiere(E, k, jW, jW);
    E.xTyp[jW] = 'haupt';
    if (E.T.tram && !o.schwebebahn) E.tram.push('x' + jW);
  } else E.xTyp[jW] = 'haupt';
  // Bahn im Tal unterhalb (Hauptbahnhof gegenüber dem Zentrum)
  const jB = klemm(jW + 2, 1, nz - 1);
  if (o.bahn !== false && E.typ !== 'mittelstadt') { setzeReihe(E, jB, 70); nimm(E, { art: 'bahn', i0: 0, i1: nx - 1, j0: jB, j1: jB, oben: true, trasse: true, bahnhofLinie: klemm(Math.floor(nx / 2), 1, nx - 1) }); E.landmarken.push('slot:bahnhof'); for (let k = 0; k <= nx; k++) fixiere(E, k, jB, jB); }
  // Hänge oben: Terrassen mit Häusern und Wald; Reihe 0 höher als Reihe 1
  const hangRows = Math.max(1, jW - 2);
  // GESTALTUNG.md 2: Hang nur als Waldkante in der Randreihe, nie im Zentrumsbild (Zufallszug bleibt für gleiche Pläne)
  for (let j = 0; j < hangRows; j++) for (let i = 0; i < nx; i++) if (zelleFrei(E, i, j) && (j === 0 || (r() < 0.25 && false))) nimm(E, { art: 'west_hang', i0: i, i1: i, j0: j, j1: j, basis: 0, wald: true });   // GESTALTUNG.md: Hang nur als Waldkante am Rand, sonst geschlossene Bebauung
  if (o.schloss) { const si = klemm(Math.floor(nx / 2) - 2, 0, nx - 2); const f = E.belegt.get(`${si},0`); if (f && f.art === 'west_hang') f.schloss = true; }
  // Kirche im Tal, Zentrum nördlich des Flusses
  const cx = klemm(Math.floor(nx / 2) - 1 + (r() < 0.5 ? 0 : 1), 1, nx - 2);
  const kc = [cx - 2, jW - 1];
  if (istFrei(E, kc[0], kc[0], kc[1], kc[1])) { nimm(E, { art: 'kirche', i0: kc[0], i1: kc[0], j0: kc[1], j1: kc[1], seiten: ['-z', '-x'], kirchStil: waehle(r, ['hallenkirche', 'neugotik', 'barock']) }); E.landmarken.push('slot:kirche'); }
  E.zentrum = { i: cx, j: jW - 1.2 };
  E.versatz = (k, j) => (j < jW ? 8 : 4);
  E.einschub = (i, j) => (Math.abs(j - jW) <= 2 ? 0.25 : 0.12);
  E.durchgang = 0.3;
  const zc = E.zentrum;
  E.viertel = (i, j) => {
    const dd = Math.hypot(i - zc.i, (j - zc.j) * 1.3);
    if (dd < 1.4) return 'bergkern';
    if (Math.abs(j - jW) <= 1) return 'bergtal';
    return 'berghang';
  };
  E.hangHoehe = () => 0;   // GESTALTUNG.md: alles auf einer Ebene, Hanglage nur über Bewaldung und Bauweise
  E.landmarkVerbot = new Set(['slot:mall', 'slot:konkurrenz', 'slot:schloss', 'slot:hochhaus']);
  E.marktVariante = 'einer';
  E.umriss = 'voll';
}

// ====================================================================================
// Parzellierung und Nachbearbeitung (alle West-Typen)
// ====================================================================================
const SEITEN = ['+z', '+x', '-z', '-x'];
function fzSeiten(ctx, b) { return SEITEN.filter((s) => ctx.segVon(b.rand[s]?.seg)?.typ === 'fussgaenger'); }

function parzellierung(ctx, E, b) {
  const einkauf = ctx.einkaufSlots.length > 0 || !!E.einkaufKern?.(b.i0, b.j0);
  b.westEinkauf = einkauf;
  const v = b.viertel;
  if (v === 'rheinalt' || v === 'westfalt') ctx.parz = [7, 13];
  else if (E.westTyp === 'berg') ctx.parz = [7, 13];
  else if (v === 'ruhr60' || v === 'rhein50') ctx.parz = [10, 26];
  else if (E.typ === 'metropole' && (v === 'rheingruender' || v === 'nachkrieg')) ctx.parz = [12, 30];   // Metropolen: größere Parzellen, sonst wird die ganze Stadt zu schwer zum Rendern
  if (E.westTyp === 'berg') b.sockelY = E.hangHoehe?.(b.j0) ?? 0;
  return false;
}

function nachbearbeitung(ctx, E, b) {
  const { rb } = ctx;
  const t = E.westTyp, v = b.viertel, einkauf = b.westEinkauf;
  const meine = () => parzellenVon(ctx);
  const fz = fzSeiten(ctx, b);
  const vorn = [...new Set([...fz, '+z', '+x'])];
  const alle = [...new Set([...fz, ...SEITEN])];
  const m = (typ, br, tiefe, seiten, extra, n = 1) => { let k = 0; for (let q = 0; q < n; q++) if (mergeRand(ctx, typ, br, tiefe, seiten, { landmarke: false, ...extra })) k++; return k; };
  if (t === 'ruhr') {
    const kz = (E.ruhrKonzern ?? []).find((q) => q.i === b.i0 && q.j === b.j0);
    if (kz && !einkauf) konzernEinbetten(ctx, kz.variante);
    if (einkauf || v === 'ruhr60') {
      // Innenstadt der 60er: Geschäftszeilen, Kaufhaus mit Waben, Geschäftshochhaus am Markt
      for (let q = 0; q < (einkauf ? 4 : 2); q++) {
        const hoch = (E.ruhrHoch ?? 0) < (E.o.kern60 ? 3 : 1) && rb() < 0.3;
        const variante = hoch ? 'hochhaus' : wahlGewichtet(rb, [['zeile', 3], ['kaufhaus', einkauf ? 1.2 : 0.4]]);
        if (m('slot:ruhr_innenstadt60', variante === 'zeile' ? [26, 60] : [42, 66], variante === 'zeile' ? 28 : 34, einkauf ? alle : vorn, { variante })) { if (hoch) E.ruhrHoch = (E.ruhrHoch ?? 0) + 1; }
      }
    } else if (v === 'stadtteil') m('slot:ruhr_innenstadt60', [26, 56], 26, vorn, { variante: 'zeile' }, 2);
    else if (v === 'nachkrieg' && rb() < 0.55) m('slot:rhein_wiederaufbau', [28, 48], 22, ['+z', '+x', '-z'], { variante: 'wohnhaus' }, 2);
    // Büdchen an der Ecke
    for (const p of meine()) if (p.typ === 'eck' && (p.ecke === '+x+z' || (einkauf && p.ecke !== '-x-z')) && p.w >= 12 && p.d >= 11 && rb() < (einkauf ? 0.45 : v === 'gruenderzeit' || v === 'stadtteil' || v === 'ruhr60' ? 0.6 : 0.35)) {
      Object.assign(p, { typ: 'slot:ruhr_bude', sonder: 'ruhr_bude', stil: null, landmarke: false, front: [p.ecke.includes('+z') ? '+z' : '+x'], variante: wahlGewichtet(rb, [['trinkhalle', 3], ['imbiss', 1.5], ['zeile', p.w >= 18 ? 1.2 : 0]]) });
    }
  } else if (t === 'rhein') {
    if (einkauf || v === 'rhein50' || v === 'zentrum') {
      const elegant = !!E.o.fuenfziger;
      for (let q = 0; q < (einkauf ? 4 : 2); q++) {
        if (rb() < (elegant ? 0.65 : 0.45)) m('slot:rhein_wiederaufbau', [18, 40], 22, einkauf ? alle : vorn, { variante: 'geschaeft' });
        else m('slot:rhein_gruenderzeit', [16, 40], 20, einkauf ? alle : vorn, { variante: 'laden' });
      }
      if (v === 'rhein50' && (E.rheinHoch ?? 0) < 1 && rb() < 0.4 && m('slot:rhein_wiederaufbau', [38, 56], 32, ['+z', '+x'], { variante: 'hochhaus' })) E.rheinHoch = 1;
      // Graben-Boulevard: Läden zur Wasserseite
      if (E.graben && b.j0 === E.graben.jK - 1) m('slot:rhein_wiederaufbau', [18, 40], 22, ['+z'], { variante: 'geschaeft' }, 2);
    } else if (v === 'rheinalt') {
      m('slot:rhein_brauhaus', [12, 30], 18, vorn, {}, rb() < 0.6 ? 2 : 1);
    } else if (v === 'rheingruender') {
      m('slot:rhein_gruenderzeit', [16, 46], 20, ['+z', '+x'], { variante: rb() < 0.65 ? 'wohnen' : 'laden' }, E.typ === 'metropole' ? 1 : 2);
      for (const p of meine()) if (p.typ === 'eck' && p.ecke === '+x+z' && p.w >= 15 && p.d >= 15 && rb() < 0.45) Object.assign(p, { typ: 'slot:rhein_gruenderzeit', sonder: 'rhein_gruenderzeit', stil: null, landmarke: false, front: ['+z'], variante: 'eck' });
    } else if (v === 'nachkrieg' && rb() < (E.typ === 'metropole' ? 0.85 : 0.5)) m('slot:rhein_wiederaufbau', [28, 48], 22, ['+z', '+x', '-z', '-x'], { variante: 'wohnhaus' }, E.typ === 'metropole' ? 4 : 2);
  } else if (t === 'westf') {
    if (einkauf || v === 'westfalt') {
      const seiten = einkauf ? alle : ['+z', '+x', '-z', '-x'];
      for (let q = 0; q < 4; q++) {
        const variante = fz.length && q < 2 ? 'markt' : wahlGewichtet(rb, [['markt', einkauf ? 2 : 0.8], ['renaissance', 1.4], ['nachkrieg', 1]]);
        m('slot:westf_giebelhaus', [16, 44], 22, q < 2 && fz.length ? fz : seiten, { variante });
      }
    }
  } else if (t === 'berg') {
    if (einkauf) m('slot:ruhr_innenstadt60', [26, 50], 26, ['-z', '-x'], { variante: 'zeile' }, 1);
  }
}

/** Seed für slot:kirche mit Neugotik in dunklem Sandstein (erster Zufallswert wählt den Stein, siehe sonderbauten.kirchenKonfig). */
const DOM_SEED = (() => { for (let s = 1; s < 5000; s++) { const r = rng(`kirche:${s}`); if (Math.floor(r() * 5) === 4 && r() < 0.65) return s; } return 1; })();
function parzelleMarkieren(p, bl, E) {
  if (bl?.westDom && p.typ === 'slot:kirche') p.seed = DOM_SEED;
  if (p.typ === 'slot:rathaus' && E.o.rathausStil) p.stil = E.o.rathausStil;   // je Stadt anders als bei den Nachbarn (staedte.js)
  p.stilProfil = 'west';
  p.westTyp = E.westTyp;
  if (bl?.westEinkauf) p.westEinkauf = true;
  if (E.westTyp === 'berg' && (p.typ === 'stadthaus' || p.typ === 'eck') && bl?.sockelY) p.sockelY = bl.sockelY;
  if (E.o.backstein) p.westBackstein = true;
}

// ====================================================================================
// nachPlan: Bahnhof der Ruhr, Parzellen im Rhein und in der Wupper, Schnellweg
// ====================================================================================
function nachPlan(E, _H, g) {
  const { bloecke, parzellen, T, typ, strassen } = g;
  if (E.einkaufslage) {
    const L = E.einkaufslage;
    const sp = strassen.find((s) => s.achse === 'z' && s.linie === L.kF), sq = strassen.find((s) => s.achse === 'x' && s.linie === L.lF);
    g.mitteX = sp?.mitte ?? 0; g.mitteZ = sq?.mitte ?? 0;
  }
  if (E.westTyp === 'ruhr') ruhrNah(E, g);
  const ctxVon = (b, seed) => ({ T, rb: rng(b.seed + seed), b, parzellen, region: E.region, typ });
  // Ruhr: Empfangsgebäude mit Busbahnhof statt des einfachen Bahnhofs, Gleise dahinter
  for (const b of bloecke) {
    if (b.art !== 'bahn' || !b.westBahnhof) continue;
    const p = parzellen.find((q) => q.block === b.id && q.typ === 'slot:bahnhof');
    if (!p) continue;
    if (b.achse === 'z') {
      // Gleise entlang z: Empfangsgebäude an der Stadtseite, Front ±x
      const W = Math.min(b.d - 8, 86), D = Math.min(b.w - 30, 58);
      const cz = p.z + p.d / 2, z = klemm(cz - W / 2, b.z + 4, b.z + b.d - W - 4);
      const x = b.oben ? b.x + b.w - D - 1 : b.x + 1;
      Object.assign(p, { x, z, w: D, d: W, front: [b.oben ? '+x' : '-x'], westBahnhof: b.westBahnhof, landmarke: true });
      b.gleise = { x0: b.x + 3, x1: b.x + b.w - 3, achse: 'z' };
      continue;
    }
    const W = Math.min(b.w - 8, 86), D = Math.min(b.d - 30, 58);
    const cx = p.x + p.w / 2, x = klemm(cx - W / 2, b.x + 4, b.x + b.w - W - 4);
    const z = b.oben ? b.z + b.d - D - 1 : b.z + 1;
    // Typ bleibt slot:bahnhof (baueBahn führt die Gleise dann links und rechts am Empfangsgebäude vorbei), gebaut wird ruhr_bahnhof
    Object.assign(p, { x, z, w: W, d: D, front: [b.oben ? '+z' : '-z'], westBahnhof: b.westBahnhof, landmarke: true });
    b.gleise = { z0: b.z + 3, z1: b.z + b.d - 3, achse: 'x' };
  }
  // Schnellweg: Mittelleitwand, keine Bäume, keine Straßenbahn
  for (const s of strassen) if (s.art === 'schnellweg') Object.assign(s, { leitwand: true, baeume: false, tram: false, parken: 0 });
  // Rhein: Promenade vor der Altstadt, Hafen flussabwärts; Wupper: Schwebebahn
  for (const b of bloecke) {
    if (b.art !== 'wasser' || !b.westFluss || !b.quer) continue;
    const bruecken = strassen.filter((s) => s.achse === 'z' && s.bruecke && s.mitte > b.x && s.mitte < b.x + b.w && s.von < b.z + b.d && s.bis > b.z);
    const sperr = bruecken.map((s) => [s.mitte - s.breite / 2 - 1.5, s.mitte + s.breite / 2 + 1.5]);
    const frei = intervalleMinus(b.x, b.x + b.w, sperr).filter(([a, e]) => e - a > 10);
    const ctx = ctxVon(b, 777);
    if (b.westSchwebebahn) {
      frei.forEach(([a, e], n) => {
        const rand = (u) => (u <= b.x + 0.5 ? 0 : (bruecken.find((s) => Math.abs(s.mitte - u) < s.breite / 2 + 3)?.breite ?? 0) / 2 + 1.5);
        neueParzelle(ctx, 'slot:berg_schwebebahn', a, b.z, e - a, b.d, ['+z'], 'frei', { klasse: 3, landmarke: false, variante: e - a >= 44 && n % 2 === 1 ? 'station' : 'strecke', ueberhang: Math.min(rand(a), rand(e)) });
      });
      continue;
    }
    if (b.westFluss !== 'rhein') continue;
    // Promenade auf Höhe der Altstadt, außerhalb Hafen oder freies Ufer
    const altI = [];
    for (let i = 0; i < E.spalten.length; i++) if (E.altstadtZelle?.(i, b.j0 - 1)) altI.push(i);
    const xs = g.spaltenX ?? null; void xs;
    const zellX = (i) => { const sp = bloecke.filter((q) => q.i0 === i && q.art !== 'wasser'); return sp.length ? [Math.min(...sp.map((q) => q.x)), Math.max(...sp.map((q) => q.x + q.w))] : null; };
    let ax = Infinity, ex = -Infinity;
    const zuschlag = E.typ === 'metropole' ? 130 : 40;
    for (const i of altI) { const z = zellX(i); if (z) { ax = Math.min(ax, z[0] - zuschlag); ex = Math.max(ex, z[1] + zuschlag); } }
    const tiefe = Math.min(46, b.d * 0.48);
    for (const [a0, e0] of frei) {
      // Abschnitte: Promenade im Altstadtbereich, Hafen flussab (rechts), sonst nichts
      const stuecke = [];
      if (b.westPromenade && ax < ex) for (const [a, e] of intervalleMinus(a0, e0, [[-1e9, ax], [ex, 1e9]])) stuecke.push([a, e, 'promenade']);
      const kais = bloecke.filter((q) => q.art === 'west_hafenkai' && q.j1 === b.j0 - 1);
      if (b.westHafen && kais.length) { for (const q of kais) for (const [a, e] of intervalleMinus(a0, e0, [[-1e9, q.x + 2], [q.x + q.w - 2, 1e9], ...(b.westPromenade && ax < ex ? [[ax, ex]] : [])])) stuecke.push([a, e, 'hafen']); }
      else if (b.westHafen && E.westTyp === 'ruhr' && E.einkaufslage) { const xm = g.mitteX ?? 0; for (const [a, e] of intervalleMinus(a0, e0, [[-1e9, xm - 300], [xm + 300, 1e9]])) stuecke.push([a, e, 'hafen']); }
      else if (b.westHafen) for (const [a, e] of intervalleMinus(a0, e0, [[-1e9, b.westPromenade && ax < ex ? ex + 30 : b.x + b.w * 0.45]])) stuecke.push([a, e, 'hafen']);
      for (const [a, e, art] of stuecke) {
        const L = e - a;
        if (L < 46) continue;
        const n = Math.max(1, Math.round(L / (art === 'hafen' ? 80 : 64)));
        for (let k = 0; k < n; k++) {
          const x = a + (L * k) / n, w = L / n;
          if (art === 'promenade') neueParzelle(ctx, 'slot:rhein_promenade', x, b.z + 1.2, w, tiefe, ['-z'], 'frei', { klasse: 3, landmarke: false, variante: waehle(ctx.rb, ['treppe', 'treppe', 'anleger', 'anleger']), wasserY: PROMENADE_Y });
          else neueParzelle(ctx, 'slot:ruhr_kanal', x, b.z + 1.2, w, Math.min(b.d * 0.62, 62), ['-z'], 'frei', { klasse: 3, landmarke: false, variante: 'hafen', wasserY: PROMENADE_Y });
        }
      }
    }
  }
}

/**
 * Ruhr: Erkennungszeichen rund um die Einkaufslage (E.o.nah). Nach GESTALTUNG.md nur Landmarken, die in Blockgröße im Raster
 * sitzen: Konzernturm ('konzern:variante'), Fernmeldeturm im Park ('turm'), Brauereiturm ('brauturm'). Großbauten (Zeche,
 * Halde, Kanal, Siedlung, Einkaufszentrum, Kokerei) stehen nicht mehr in der Innenstadt, sondern in der Industriezeile am
 * Stadtrand (Entwurf ruhrstadt); entsprechende Einträge in E.o.nah werden übergangen.
 * Die gewählten Blöcke werden zu Flächen umgewidmet (Parzellen neu), Einkaufsblöcke und Standorte bleiben unberührt.
 */
const NAH_ART = { konzern: 'west_konzern', turm: 'park', brauturm: 'west_brauturm' };
function ruhrNah(E, g) {
  const L = E.einkaufslage;
  if (!L) return;
  const { bloecke, parzellen, T, typ } = g;
  const liste = (E.o.nah ?? []).filter((f) => NAH_ART[f.split(':')[0]]);
  const kand = [];
  for (const b of bloecke) {
    if (b.art !== 'bebaut' || E.einkaufKern?.(b.i0, b.j0)) continue;
    const ps = b.parzellen.map((id) => parzellen.find((q) => q.id === id)).filter(Boolean);
    if (ps.some((p) => p.standort || (p.typ.startsWith('slot:') && p.typ !== 'slot:ruhr_bude' && p.typ !== 'slot:ruhr_innenstadt60' && p.typ !== 'slot:rhein_wiederaufbau'))) continue;
    const u = b.i0 + 0.5 - L.kF, v = b.j0 + 0.5 - L.lF;
    // im Nahausschnitt, aber nicht direkt am Kreuz: entlang der Bilddiagonale 1,5 bis 3,5 Zellen
    if (Math.abs(u - v) > 1.6 || Math.abs(u + v) < 1.5 || Math.abs(u + v) > 3.6) continue;
    kand.push({ b, u, v });
  }
  const genutzt = [];
  liste.forEach((f, k) => {
    const [art, variante] = f.split(':');
    const minW = { konzern: 50 }[art] ?? 44;
    const l = kand.filter((c) => !genutzt.includes(c) && c.b.w >= minW && c.b.d >= 44)
      .map((c) => [c, -Math.abs(c.u - c.v) - genutzt.filter((q) => Math.abs(q.b.i0 - c.b.i0) + Math.abs(q.b.j0 - c.b.j0) < 3).length * 3 + ((k % 2 === 0) === (c.u + c.v < 0) ? 0.5 : 0)])
      .sort((a, b) => b[1] - a[1]);
    if (!l.length) return;
    const c = l[0][0], b = c.b;
    genutzt.push(c);
    if (art === 'konzern') { konzernEinbetten({ T, rb: rng(b.seed + 31 * k), b, parzellen, region: E.region, typ }, variante ?? 'turm70'); return; }
    for (const id of [...b.parzellen]) { const i = parzellen.findIndex((q) => q.id === id); if (i >= 0) parzellen.splice(i, 1); }
    b.parzellen = [];
    b.hof = null;
    b.art = NAH_ART[art];
    const ctx = { T, rb: rng(b.seed + 31 * k), b, parzellen, region: E.region, typ };
    if (art === 'konzern') { b.variante = variante ?? 'turm70'; konzernParzelle(ctx, E, b); }
    else if (art === 'brauturm') voll('slot:ruhr_brauturm', 2)(ctx, E, b);
    else if (art === 'turm') { b.teich = { seite: 1 }; neueParzelle(ctx, 'slot:rhein_turm', b.x + b.w * 0.55 - 12, b.z + b.d * 0.35, 24, 26, ['+z'], 'frei', { klasse: 5, landmarke: true }); }
  });
}

// ====================================================================================
// Flächen
// ====================================================================================
/** Gehwegstreifen rund um eine Fläche ohne Bodenplatte (Bord und Gehweg nur außerhalb des Blocks). */
function gehwegRing(ctx, b, B) {
  const { S } = ctx;
  const e = { '-x': b.rand['-x'].gehweg, '+x': b.rand['+x'].gehweg, '-z': b.rand['-z'].gehweg, '+z': b.rand['+z'].gehweg };
  const x0 = b.x - e['-x'], x1 = b.x + b.w + e['+x'], z0 = b.z - e['-z'], z1 = b.z + b.d + e['+z'];
  for (const [a, c, d, f] of [[x0, z0, x1, b.z], [x0, b.z + b.d, x1, z1], [x0, b.z, b.x, b.z + b.d], [b.x + b.w, b.z, x1, b.z + b.d]]) {
    if (d - a < 0.2 || f - c < 0.2) continue;
    S.quader(a, 0, c, d, 0.3, f, B.F.bord);
    S.quader(Math.max(a, x0 + 0.3), 0.3, Math.max(c, z0 + 0.3), Math.min(d, x1 - 0.3), B.YG, Math.min(f, z1 - 0.3), B.F.gehweg);
  }
}
// Größte Breite, die die Industrie-Slots ausfüllen (westbauten nenn maxW); breitere Flächen bekommen Nebenanlagen
const MAX_BREITE = { 'slot:ruhr_kokerei': { kokerei: 130, huette: 120, gasometer: 70 }, 'slot:ruhr_zeche': 120, 'slot:ruhr_halde': 110 };
const voll = (typ, rand = 2, extra = () => ({})) => (ctx, E, b) => {
  const m = MAX_BREITE[typ], maxW = typeof m === 'object' ? m[b.variante] ?? 120 : m;
  const W = b.w - 2 * rand;
  if (!maxW || W <= maxW + 24) {
    neueParzelle(ctx, typ, b.x + rand, b.z + rand, W, b.d - 2 * rand, ['+z'], 'block', { klasse: 3, landmarke: true, variante: b.variante, zustand: b.zustand, ...extra(ctx, E, b) });
    return;
  }
  // Hauptanlage links, rechts eine Spalte Nebenanlagen: vorn Werksverwaltung in Backstein, dahinter Gasometer bzw.
  // Werksparkplatz (keine leere Pflasterfläche neben Hütte, Kokerei oder Zeche)
  neueParzelle(ctx, typ, b.x + rand, b.z + rand, maxW, b.d - 2 * rand, ['+z'], 'block', { klasse: 3, landmarke: true, variante: b.variante, zustand: b.zustand, ...extra(ctx, E, b) });
  const x = b.x + rand + maxW + 4, cw = b.x + b.w - rand - x, z0 = b.z + rand, z1 = b.z + b.d - rand;
  let vorn = z1;
  if (cw >= 24) { const d = Math.min(50, (z1 - z0) * 0.55); neueParzelle(ctx, 'slot:ruhr_buero', x, z1 - d, Math.min(cw, 80), d, ['+z'], 'frei', { klasse: 3, landmarke: false, variante: 'backstein20' }); vorn = z1 - d - 3; }
  const hinten = vorn - z0;
  if (cw >= 50 && hinten >= 50) { const g = Math.min(70, cw, hinten); neueParzelle(ctx, 'slot:ruhr_kokerei', x + (cw - g) / 2, z0, g, g, ['+z'], 'frei', { klasse: 3, landmarke: false, variante: 'gasometer', zustand: b.zustand === 'aktiv' ? 'stillgelegt' : b.zustand ?? 'museum' }); }
  else if (cw >= 12 && hinten >= 12) neueParzelle(ctx, 'parkplatz', x, z0, cw, hinten, ['+z'], 'frei', { klasse: 1 });
};
function kanalParzelle(ctx, E, b) {
  const v = b.variante ?? 'strecke';
  neueParzelle(ctx, 'slot:ruhr_kanal', b.x, b.z, b.w, b.d, [v === 'hafen' ? '-z' : '+z'], 'block', { klasse: 2, landmarke: false, variante: v });
}
function bodenKanal(ctx, b, r, teile, B) { gehwegRing(ctx, b, B); }
function siedlungParzellen(ctx, E, b) {
  const { rb } = ctx;
  const v = waehle(rb, ['kolonie', 'kolonie', 'kreuz', 'gartenstadt']);
  const [mw, md] = { kolonie: [34, 30], kreuz: [28, 36], gartenstadt: [30, 26] }[v];
  const nxs = Math.max(1, Math.floor((b.w - 2) / (mw + 2))), nzs = Math.max(1, Math.floor((b.d - 2) / (md + 2)));
  const sw = (b.w - 2) / nxs, sd = (b.d - 2) / nzs;
  for (let a = 0; a < nxs; a++) for (let c = 0; c < nzs; c++) neueParzelle(ctx, 'slot:ruhr_siedlung', b.x + 1 + a * sw, b.z + 1 + c * sd, sw - 1, sd - 1, [c === nzs - 1 ? '+z' : '+z'], 'frei', { klasse: 2, landmarke: false, variante: c % 2 && v === 'kolonie' ? 'kreuz' : v, seed: Math.floor(rb() * 1e9) });
}
function bodenRasen(ctx, b, r, teile, B) {
  ctx.S.quader(b.x, 0, b.z, b.x + b.w, 0.33, b.z + b.d, B.F.rasen);
  const n = Math.round((b.w * b.d) / 400);
  for (let k = 0; k < n; k++) { const x = B.zw(r, b.x + 2, b.x + b.w - 2), z = B.zw(r, b.z + 2, b.z + b.d - 2); if (!teile.some((p) => B.imRechteck(x, z, p, 2.5))) B.baumSetzen(ctx.I, waehle(r, ['linde', 'kastanie', 'birke', 'pappel']), x, 0.33, z, r, B.zw(r, 0.8, 1.05)); }
}
/** Konzernverwaltung als Slot im Blockrand (GESTALTUNG.md: Landmarke in Blockgröße eingebettet), erst +z, sonst +x. */
const KONZERN_MASS = { glas60: [[52, 90], 44], turm70: [[42, 66], 48], backstein20: [[44, 80], 34] };
function konzernEinbetten(ctx, variante = 'turm70') {
  const [br, tiefe] = KONZERN_MASS[variante] ?? KONZERN_MASS.turm70;
  return mergeRand(ctx, 'slot:ruhr_buero', br, tiefe, ['+z', '+x'], { variante, landmarke: true, klasse: 5 });
}
function konzernParzelle(ctx, E, b) {
  const v = b.variante ?? 'glas60';
  const [w, d] = { glas60: [Math.min(b.w - 8, 76), Math.min(b.d - 10, 54)], turm70: [Math.min(b.w - 10, 56), Math.min(b.d - 8, 56)], backstein20: [Math.min(b.w - 6, 70), Math.min(b.d - 14, 40)] }[v] ?? [b.w - 8, b.d - 8];
  neueParzelle(ctx, 'slot:ruhr_buero', b.x + (b.w - w) / 2, b.z + b.d - d - 3, w, d, ['+z'], 'frei', { klasse: 5, landmarke: true, variante: v });
}
/** Konzernvorplatz: Pflaster über den ganzen Block, Baumreihen an den Straßenseiten, Fahnen und Leute vor dem Eingang. */
function bodenKonzern(ctx, b, r, teile, B) {
  B.pflasterFlaeche(ctx, b, 0.34, '#ddd6c8', 5);
  const frei = (x, z) => !teile.some((p) => B.imRechteck(x, z, p, 2.5));
  for (let x = b.x + 5; x < b.x + b.w - 3; x += 10) if (frei(x, b.z + b.d - 3)) B.baumSetzen(ctx.I, 'platane', x, 0.34, b.z + b.d - 3, r, 0.85, true);
  for (let z = b.z + 5; z < b.z + b.d - 6; z += 10) if (frei(b.x + b.w - 3, z)) B.baumSetzen(ctx.I, 'platane', b.x + b.w - 3, 0.34, z, r, 0.85, true);
  for (let i = 0, n = Math.round(b.w / 6 * ctx.dichte); i < n; i++) { const x = B.zw(r, b.x + 2, b.x + b.w - 2), z = B.zw(r, b.z + b.d - 9, b.z + b.d - 1); if (frei(x, z)) B.figur(ctx.I, x, 0.34, z, r); }
}
/** Bahnhofsblock: Empfangsgebäude mit Vorplatz, Taxistand und Busbahnhof füllt den Block (Gleise dahinter im Gleisband). */
function bahnhofParzelle(ctx, E, b) {
  // Empfangsgebäude an der Gleisseite, höchstens 62 m tief; davor bleibt ein Bahnhofsvorplatz mit Baumreihe (bodenBahnhof)
  const f = b.front ?? '+z', T_ = E.typ === 'mittelstadt' ? 30 : 62;   // Mittelstadt: kleineres Empfangsgebäude (Bahnhof nah ≤ 3 %)
  const R = f === '+z' ? [b.x + 1, b.z + 1, b.w - 2, Math.min(T_, b.d - 2)] : f === '+x' ? [b.x + 1, b.z + 1, Math.min(T_, b.w - 2), b.d - 2] : [b.x + b.w - 1 - Math.min(T_, b.w - 2), b.z + 1, Math.min(T_, b.w - 2), b.d - 2];
  neueParzelle(ctx, 'slot:bahnhof', ...R, [f], 'block', { klasse: 4, landmarke: true, westBahnhof: b.variante ?? '70er' });
}
function bodenBahnhof(ctx, b, r, teile, B) {
  B.pflasterFlaeche(ctx, b, 0.34, '#ddd6c8', 5);
  const p = teile[0];
  if (!p) return;
  const frei = (x, z) => !teile.some((q) => B.imRechteck(x, z, q, 2));
  if (b.front === '+z') for (let x = b.x + 5; x < b.x + b.w - 3; x += 9) { if (frei(x, b.z + b.d - 4)) B.baumSetzen(ctx.I, 'platane', x, 0.34, b.z + b.d - 4, r, 0.85, true); }
  else for (let z = b.z + 5; z < b.z + b.d - 3; z += 9) { const x = b.front === '+x' ? b.x + b.w - 4 : b.x + 4; if (frei(x, z)) B.baumSetzen(ctx.I, 'platane', x, 0.34, z, r, 0.85, true); }
  for (let i = 0, n = Math.round(b.w / 5 * ctx.dichte); i < n; i++) { const x = B.zw(r, b.x + 2, b.x + b.w - 2), z = B.zw(r, b.z + 2, b.z + b.d - 2); if (frei(x, z)) B.figur(ctx.I, x, 0.34, z, r); }
}
function medienhafenParzellen(ctx, E, b) {
  const { rb } = ctx;
  const v = b.variante ?? 'gehry';
  const ende = b.x + b.w - 3;
  // Tiefe Flächen (bis an die Kaikante, ohne Uferstraße) bekommen zwei Reihen, die vordere direkt am Wasser
  const reihen = b.d >= 84 ? 2 : 1, rt = (b.d - 8 - (reihen - 1) * 6) / reihen;
  if (b.turm) { neueParzelle(ctx, 'slot:rhein_turm', ende - 24, b.z + b.d - 28, 24, 26, ['+z'], 'frei', { klasse: 5, landmarke: true }); }
  const folgen = v === 'kranhaus' ? [['kranhaus', 'kranhaus', 'glas'], ['glas', 'gehry', 'glas']] : v === 'glas' ? [['glas', 'gehry'], ['gehry', 'glas', 'glas']] : [['gehry', 'glas', 'gehry'], ['glas', 'glas', 'gehry']];
  const nenn = { gehry: 50, kranhaus: 60, glas: 40 };
  for (let k = 0; k < reihen; k++) {
    const vorn = k === reihen - 1, z0 = b.z + 4 + k * (rt + 6);
    let x = b.x + 3;
    const bis = vorn && b.turm ? ende - 28 : ende;
    const folge = folgen[vorn ? 0 : 1];
    for (let q = 0; q < 8; q++) {
      const art = folge[q % folge.length];
      const w = Math.min(nenn[art] + zw(rb, 0, 10), bis - x);
      if (w < nenn[art] - 6) break;
      neueParzelle(ctx, 'slot:rhein_medienhafen', x, z0, w, rt, ['+z'], 'frei', { klasse: 5, landmarke: true, variante: art });
      x += w + 3;
    }
  }
}
/** Hafenkai: Speicherreihe an der Kaikante (Front zum Wasser), dahinter Lagerplatz mit Containern. */
function hafenkaiParzellen(ctx, E, b) {
  const { rb } = ctx;
  const tief = Math.min(b.d - 14, 30);
  for (let u = b.x + 2; b.x + b.w - 2 - u >= 30;) {
    let l = Math.min(b.x + b.w - 2 - u, Math.round(zw(rb, 40, 58)));
    if (b.x + b.w - 2 - u - l < 30) l = b.x + b.w - 2 - u;
    neueParzelle(ctx, 'slot:nord_speicher', u, b.z + b.d - tief, l, tief, ['+z'], 'frei', { klasse: 4, variante: waehle(rb, ['schlicht', 'schlicht', 'giebel']), zustand: rb() < 0.35 ? 'umgenutzt' : undefined, landmarke: false });
    u += l + 8;
  }
  b.lager = { x: b.x + 3, z: b.z + 3, w: b.w - 6, d: b.d - tief - 8 };
}
/** Rechteck minus Loch (bis zu vier Rechtecke). */
function rechteckOhne(R, L) {
  const [x0, z0, x1, z1] = R;
  const a0 = Math.max(L[0], x0), a1 = Math.min(L[2], x1), b0 = Math.max(L[1], z0), b1 = Math.min(L[3], z1);
  if (a0 >= a1 - 0.01 || b0 >= b1 - 0.01) return [R];
  return [[x0, z0, x1, b0], [x0, b1, x1, z1], [x0, b0, a0, b1], [a1, b0, x1, b1]].filter(([p, q, u, v]) => u - p > 0.01 && v - q > 0.01);
}
/** Boden des Hafenkais nach den Slots: Gehweg nur an Straßenseiten, Kaipflaster ohne das abgesenkte Fleetwasser, Container. */
function nachBauHafenkai(ctx, b, wasser, B) {
  const { S } = ctx;
  gehwegRing(ctx, b, B);
  let st = [[b.x, b.z, b.x + b.w, b.z + b.d]];
  for (const w of wasser) st = st.flatMap((R) => rechteckOhne(R, w));
  for (const [a, c, e, h] of st) S.quader(a, -0.6, c, e, 0.33, h, '#bdb8ad');
  const P = b.lager, r = rng(b.seed + 41);
  if (!P || P.w < 10 || P.d < 8) return;
  for (let a = 3; a < P.w - 6; a += 7.5) {
    if (r() < 0.3) continue;
    for (let q = 0; q < Math.max(1, Math.floor((P.d - 4) / 3.2)); q++) for (let k = 0, n = 1 + Math.floor(r() * 2.6); k < n; k++)
      S.box(6, 2.5, 2.4, P.x + a, 0.33 + 1.25 + k * 2.55, P.z + 2 + q * 3.2 + 1.2, waehle(r, ['#b5523f', '#2f6f8f', '#3f7d56', '#d9a33a', '#8c9aa6', '#e9e5dc']));
  }
}
function bodenPflaster(ctx, b, r, teile, B) { B.pflasterFlaeche(ctx, b, 0.34, '#d9d2c3', 5); }

/** Promenadenring (Westfalen): Lindenallee, Radweg mit Radfahrern, Rasen, Bänke. */
function bodenPromenade(ctx, b, r, teile, B) {
  const { S, I } = ctx;
  const y = 0.34;
  S.quader(b.x, 0, b.z, b.x + b.w, y, b.z + b.d, B.F.rasen);
  const entlangX = b.achse === 'x' || b.w > b.d;
  const L0 = entlangX ? b.x : b.z, L1 = entlangX ? b.x + b.w : b.z + b.d, Q0 = entlangX ? b.z : b.x, Q1 = entlangX ? b.z + b.d : b.x + b.w;
  const qm = (Q0 + Q1) / 2, P = (u, q) => (entlangX ? [u, q] : [q, u]);
  // Radweg (rot) und Fußweg (hell) in der Mitte
  const [ax, az] = P(L0, qm - 3.2), [ex, ez] = P(L1, qm + 0.4);
  S.quader(Math.min(ax, ex), y, Math.min(az, ez), Math.max(ax, ex), y + 0.05, Math.max(az, ez), '#c98a72');
  const [fx, fz] = P(L0, qm + 0.6), [gx, gz] = P(L1, qm + 3.4);
  S.quader(Math.min(fx, gx), y, Math.min(fz, gz), Math.max(fx, gx), y + 0.05, Math.max(fz, gz), '#e3dccb');
  // Lindenallee beidseits
  for (const q of [qm - 6.5, qm + 6.5]) if (q > Q0 + 1.5 && q < Q1 - 1.5) for (let u = L0 + 5; u < L1 - 3; u += 8) { const [x, z] = P(u, q); if (!teile.some((p) => B.imRechteck(x, z, p, 2))) B.baumSetzen(I, 'linde', x, y, z, r, 0.95); }
  // Radfahrer und abgestellte Räder
  const farben = ['#c9483e', '#2f5f8f', '#3f7d56', '#2b2f33', '#e0b23a', '#f4f2ec', '#6b4f8f'];
  const ry = entlangX ? 0 : Math.PI / 2;
  for (let u = L0 + 6; u < L1 - 4; u += B.zw(r, 7, 14)) {
    const q = qm - B.zw(r, 0.8, 2.6), [x, z] = P(u, q);
    fahrrad(S, x, z, ry + (r() < 0.5 ? 0 : Math.PI), waehle(r, farben), y + 0.05);
    B.figur(I, x, y + 0.75, z, r, ry + Math.PI / 2);
  }
  for (let u = L0 + 12; u < L1 - 8; u += 34) for (let k = 0; k < 6; k++) { const [x, z] = P(u + k * 0.75, qm + 4.6); fahrrad(S, x, z, ry + Math.PI / 2, waehle(r, farben), y); }
  for (let u = L0 + 9; u < L1 - 5; u += 18) { const [x, z] = P(u, qm + 4.2); I.setze('bank', x, y, z, entlangX ? Math.PI : -Math.PI / 2); }
  for (let i = 0, n = Math.round((L1 - L0) / 9 * ctx.dichte); i < n; i++) { const [x, z] = P(B.zw(r, L0 + 1, L1 - 1), B.zw(r, qm + 0.8, qm + 3.2)); B.figur(I, x, y + 0.05, z, r); }
}

/** Hang: Terrassen mit Bruchsteinmauern, darauf Häuser (slot:berg_haus mit Sockel) und Wald; Treppe zum Tal. */
function hangParzellen(ctx, E, b) {
  const { rb } = ctx;
  const n = b.d > 54 ? 3 : 2, sd = b.d / n;
  b.stufen = [];
  for (let k = 0; k < n; k++) {
    const z1 = b.z + b.d - k * sd, z0 = z1 - sd, y = 0.32;   // Straßenniveau (GESTALTUNG.md: eine Ebene)
    b.stufen.push({ z0, z1, y });
  }
  if (b.schloss && b.w > 60) {
    const st = b.stufen[n - 1];
    neueParzelle(ctx, 'slot:schloss', b.x + 6, st.z0 + 1, Math.min(b.w - 12, 70), Math.max(20, sd - 4), ['+z'], 'frei', { klasse: 5, landmarke: true, sockelY: st.y });
    return;
  }
  const belegt = [];
  for (const st of b.stufen) {
    const anz = b.ohneHaeuser ? 0 : b.wald ? (rb() < 0.5 ? 1 : 0) : 1 + Math.floor(rb() * 2.4);
    for (let q = 0; q < anz; q++) {
      const w = zw(rb, 9, 13), d = Math.min(13, st.z1 - st.z0 - 4);
      if (d < 8) continue;
      const P = freiePosition({ x: b.x + 2, z: st.z0 + 1, w: b.w - 4, d: st.z1 - st.z0 - 2.5 }, belegt, w, d, 4, rb, true);
      if (!P) continue;
      belegt.push(neueParzelle(ctx, 'slot:berg_haus', P.x, P.z, P.w, P.d, ['+z'], 'frei', { klasse: 2, landmarke: false, variante: wahlGewichtet(rb, [['schiefer', 3], ['putz', 1.4], ['fachwerk', 1.2]]), sockelY: st.y, geschosse: 2 + (rb() < 0.4 ? 1 : 0) }));
    }
  }
  b.treppeX = b.x + zw(rb, 8, Math.max(9, b.w - 8));
}
function bodenHang(ctx, b, r, teile, B) {
  const { S, I } = ctx;
  const steinF = ['#8f8a80', '#99938a', '#878178'];
  for (const st of b.stufen ?? []) {
    S.quader(b.x, 0, st.z0, b.x + b.w, st.y, st.z1, waehle(r, steinF));
    S.quader(b.x + 0.2, st.y, st.z0, b.x + b.w - 0.2, st.y + 0.07, st.z1 - 0.5, b.wald ? '#7fae68' : B.F.rasen);
    // Mauerkrone und Hecken, Bäume und Gärten
    S.quader(b.x, st.y, st.z1 - 0.5, b.x + b.w, st.y + 0.5, st.z1, '#a39d92');
    const dichte = b.wald ? 1 / 55 : 1 / 170;
    for (let k = 0, n = Math.round(b.w * (st.z1 - st.z0) * dichte); k < n; k++) {
      const x = B.zw(r, b.x + 2, b.x + b.w - 2), z = B.zw(r, st.z0 + 2, st.z1 - 2);
      if (teile.some((p) => B.imRechteck(x, z, p, 3)) || (b.treppeX && Math.abs(x - b.treppeX) < 3)) continue;
      B.baumSetzen(I, waehle(r, b.wald ? ['nadel', 'nadel', 'linde', 'birke', 'kastanie'] : ['linde', 'kastanie', 'birke', 'kugel']), x, st.y + 0.07, z, r, B.zw(r, 0.75, 1.1));
    }
  }
  // Treppe vom Tal nach oben (bergische Treppen)
  if (b.treppeX && b.stufen?.length) {
    let yv = 0;
    for (const st of b.stufen) {
      const n = Math.max(2, Math.round((st.y - yv) / 0.3)), z1 = st.z1;
      for (let k = 0; k < n; k++) S.quader(b.treppeX - 1.4, 0, z1 - (k + 1) * 0.45, b.treppeX + 1.4, yv + (k + 1) * ((st.y - yv) / n) + 0.08, z1 - k * 0.45, '#cfc8b8');
      yv = st.y;
    }
  }
}

// ====================================================================================
// Stilprofil der normalen Stadthäuser
// ====================================================================================
const STILE_WEST = {
  ruhr: {
    ruhr60: { fuenfziger: 3, siebziger: 3, neubau: 1.4, wiederaufbau: 1.2, gruenderzeit: 0.3 },
    stadtteil: { fuenfziger: 2.6, wiederaufbau: 1.8, gruenderzeit: 1.4, siebziger: 1, backstein: 0.4 },
    gruenderzeit: { gruenderzeit: 2.6, fuenfziger: 1.6, wiederaufbau: 1.4, backstein: 0.8, jugendstil: 0.6, siebziger: 0.5 },
    nachkrieg: { fuenfziger: 2.4, wiederaufbau: 2.2, siebziger: 1.6, neubau: 0.8, gruenderzeit: 0.6, backstein: 0.4 },
    altstadt: { fachwerk: 1.6, gruenderzeit: 1.6, wiederaufbau: 1.2, barock: 0.4 },
  },
  rhein: {
    rheinalt: { gruenderzeit: 2, wiederaufbau: 2, barock: 1.6, fuenfziger: 0.6, fachwerk: 0.3 },
    rheingruender: { gruenderzeit: 3.2, jugendstil: 1.5, fuenfziger: 1, wiederaufbau: 0.6 },
    rhein50: { fuenfziger: 3.4, neubau: 1.2, siebziger: 1, gruenderzeit: 1, bauhaus: 0.6 },
    zentrum: { gruenderzeit: 2, fuenfziger: 2, neubau: 1.4, siebziger: 1, jugendstil: 0.6 },
    nachkrieg: { fuenfziger: 2.6, wiederaufbau: 1.6, siebziger: 1.4, neubau: 1, gruenderzeit: 0.8 },
  },
  westf: {
    westfalt: { backstein: 2, wiederaufbau: 1.8, gruenderzeit: 1, fachwerk: 0.6, barock: 0.5 },
    gruenderzeit: { gruenderzeit: 2.4, backstein: 2, jugendstil: 0.8, fuenfziger: 1, wiederaufbau: 0.6 },
    nachkrieg: { backstein: 1.8, fuenfziger: 2, wiederaufbau: 1.4, siebziger: 1, neubau: 0.8 },
  },
  berg: {
    bergkern: { gruenderzeit: 2.4, fuenfziger: 1.6, jugendstil: 0.8, siebziger: 0.6 },
    bergtal: { gruenderzeit: 2.8, jugendstil: 1.2, fuenfziger: 1, backstein: 0.4 },
    berghang: { gruenderzeit: 1.6, fuenfziger: 0.8, wiederaufbau: 0.6 },
  },
};
const GESCHOSSE_W = {
  gruenderzeit: [3, 5], jugendstil: [3, 5], backstein: [3, 5], fachwerk: [2, 3], fuenfziger: [3, 6], siebziger: [4, 7], neubau: [4, 6],
  barock: [2, 4], bauhaus: [3, 5], wiederaufbau: [2, 4],
};
/** Dachregime je Block (Ruhr): Anteil Flachdachblöcke je Viertel und die Stile, die das Regime tragen. */
const RUHR_FLACH = { ruhr60: 0.75, stadtteil: 0.6, nachkrieg: 0.5, gruenderzeit: 0.2, altstadt: 0 };
const STILE_FLACH = new Set(['fuenfziger', 'siebziger', 'neubau', 'bauhaus']);
const STILE_STEIL = new Set(['gruenderzeit', 'jugendstil', 'backstein', 'wiederaufbau', 'fachwerk', 'barock']);
/** Anteil bergischer Häuser (Schiefer, Fachwerk) je Viertel. */
const BERG_ANTEIL = { bergkern: 0.45, bergtal: 0.55, berghang: 0.9 };
function westStil(p, nachbar) {
  const r = rng(((p.seed ?? 1) * 2654435761 + 4111) >>> 0);
  const t = p.westTyp ?? 'ruhr';
  if (t === 'berg' && p.w <= 15 && r() < (BERG_ANTEIL[p.viertel] ?? 0.4) * (nachbar?.stil === 'bergisch' ? 1 : 1.15)) {
    const variante = wahlGewichtet(r, [['schiefer', 3], ['putz', p.westEinkauf ? 2 : 1], ['fachwerk', p.viertel === 'berghang' ? 1.6 : 0.9]]);
    const laden = !!p.westEinkauf && r() < 0.8;
    const front = p.front?.[0] ?? '+z';
    const geschosse = 2 + (r() < (p.viertel === 'bergkern' ? 0.6 : 0.35) ? 1 : 0);
    return { bau: (S, scene, q) => WEST_SLOTS['slot:berg_haus'](S, scene, { ...q, front, variante, laden, sockelY: p.sockelY ?? 0, geschosse, traufe: p.w >= 10.5 ? undefined : false }) };
  }
  const tab = STILE_WEST[t] ?? STILE_WEST.ruhr;
  let basis = { ...(tab[p.viertel] ?? tab.nachkrieg ?? tab[Object.keys(tab)[0]]) };
  if (p.westBackstein) basis.backstein = (basis.backstein ?? 0) + 2.2;
  // GESTALTUNG.md: Ruhr-Innenstadt je Block ein Dachregime, Flachdach mit Attika (60er) oder Steildach (Altbau), nicht gemischt
  let dachRegime = null;
  if (t === 'ruhr') {
    const rb = rng(`dach:${p.block}`);
    dachRegime = rb() < (RUHR_FLACH[p.viertel] ?? 0.5) ? 'flach' : 'steil';
    const erlaubt = dachRegime === 'flach' ? STILE_FLACH : STILE_STEIL;
    const f = Object.fromEntries(Object.entries(basis).filter(([st]) => erlaubt.has(st)));
    if (Object.keys(f).length) basis = f;
  }
  const liste = Object.entries(basis).map(([st, g]) => {
    let w = g;
    if (nachbar?.stil === st) w *= 0.3;
    if (st === 'fachwerk' && p.w > 16) w *= 0.2;
    if (st === 'barock' && p.w > 20) w *= 0.4;
    return [st, w];
  });
  const stil = wahlGewichtet(r, liste);
  let [a, b] = GESCHOSSE_W[stil] ?? [3, 5];
  if (p.cluster === 'metropole') { a += 1; b += 1; } else if (p.cluster === 'mittelstadt') b -= 1;
  if (p.viertel === 'rheinalt' || p.viertel === 'westfalt') b = Math.min(b, 4);
  let g = Math.round(a + (b - a) * r());
  if (nachbar?.geschosse && r() < 0.35) g = nachbar.geschosse + waehle(r, [-1, 1]);
  return { stil, geschosse: Math.max(2, Math.min(7, Math.max(a - 1, Math.min(b, g)))), region: 'West', dachRegime };
}
registriereStilProfil('west', (p, nachbar) => westStil(p, nachbar));

// ====================================================================================
// Registrierung
// ====================================================================================
registriereSlots(WEST_SLOTS);
// Bahnhof der Ruhrstädte: Parzellen mit p.westBahnhof bekommen das Empfangsgebäude mit Busbahnhof, alle anderen den bisherigen Bahnhof
registriereSlots({ 'slot:bahnhof': (S, scene, p) => (p.westBahnhof
  ? WEST_SLOTS['slot:ruhr_bahnhof'](S, scene, { ...p, variante: p.westBahnhof })
  : SLOTS['slot:bahnhof'](S, scene, p)) });

const GEMEINSAM = {
  gewicht: [0, 0, 0], parzellierung, nachbearbeitung, nachPlan, parzelleMarkieren, stilProfil: 'west',
  viertel: {
    ruhr60: { dk: 0.7, var: 0.8, stile: [['nachkrieg', 0.6], ['modern', 0.4]], fachwerk: 0 },
    stadtteil: { dk: 0, var: 0.7, stile: [['nachkrieg', 0.7], ['gruenderzeit', 0.3]], fachwerk: 0 },
    rheinalt: { dk: -0.4, var: 0.7, stile: [['gruenderzeit', 0.7], ['nachkrieg', 0.3]], fachwerk: 0 },
    rheingruender: { dk: 0.5, var: 0.35, stile: [['gruenderzeit', 1]], fachwerk: 0 },
    rhein50: { dk: 0.7, var: 0.6, stile: [['nachkrieg', 0.7], ['modern', 0.3]], fachwerk: 0 },
    westfalt: { dk: -0.3, var: 0.5, stile: [['gruenderzeit', 0.6], ['nachkrieg', 0.4]], fachwerk: 0 },
    bergkern: { dk: 0, var: 0.6, stile: [['gruenderzeit', 0.6], ['nachkrieg', 0.4]], fachwerk: 0 },
    bergtal: { dk: 0.2, var: 0.5, stile: [['gruenderzeit', 0.8], ['nachkrieg', 0.2]], fachwerk: 0 },
    berghang: { dk: -0.9, var: 0.6, stile: [['gruenderzeit', 0.6], ['nachkrieg', 0.4]], fachwerk: 0 },
  },
  flaechen: {
    west_kanal: { ohneGehwegPlatte: true, parzelliere: kanalParzelle, boden: bodenKanal },
    west_zeche: { parzelliere: voll('slot:ruhr_zeche', 2) },
    west_kokerei: { parzelliere: voll('slot:ruhr_kokerei', 2) },
    west_halde: { parzelliere: voll('slot:ruhr_halde', 2) },
    west_siedlung: { parzelliere: siedlungParzellen, boden: bodenRasen },
    west_stadion: { parzelliere: voll('slot:ruhr_stadion', 2) },
    west_ekz: { parzelliere: voll('slot:ruhr_einkaufszentrum', 2, (ctx, E, b) => (b.gross ? { name: 'Neue Mitte' } : {})) },
    west_konzern: { parzelliere: konzernParzelle, boden: bodenKonzern },
    west_bahnhof: { parzelliere: bahnhofParzelle, boden: bodenBahnhof },
    west_medienhafen: { parzelliere: medienhafenParzellen, boden: bodenPflaster },
    west_hafenkai: { ohneGehwegPlatte: true, parzelliere: hafenkaiParzellen, boden() {}, nachBau: nachBauHafenkai },
    west_pfalz: { parzelliere: voll('slot:west_pfalzdom', 4), boden: bodenPflaster },
    west_brauturm: { boden: bodenPflaster },
    west_promenade: { boden: bodenPromenade },
    west_hang: { parzelliere: hangParzellen, boden: bodenHang },
  },
};

registriereArchetyp('ruhrstadt', { ...GEMEINSAM, name: 'Ruhrgebietsstadt', entwurf: ruhrstadt,
  staedte: {
    Essen: { bahnLage: 'mitte', zeche: 'doppelbock', zechenZustand: 'museum', konzern: 1, konzernVarianten: ['glas60'], bahnhof: '50er', halde: 'kreuz', nah: ['konzern:turm70', 'ekz:90er', 'zeche:doppelbock', 'halde', 'kanal'], markt: 'einer' },
    Dortmund: { bahnLage: 'oben', huette: true, huettenZustand: 'museum', zeche: 'malakow', zechenZustand: 'museum', konzern: 1, konzernVarianten: ['backstein20'], bahnhof: 'altbau', stadion: 'stadion70', halde: false, nah: ['brauturm', 'turm', 'zeche:malakow', 'kanal'], markt: 'laenglich' },
    Duisburg: { bahnLage: 'rechts', rhein: true, huette: true, zeche: false, halde: false, bahnhof: '70er', ekz: '80er', konzern: 1, konzernVarianten: ['backstein20'], nah: [], markt: 'keiner' },
    Gelsenkirchen: { bahnLage: 'links', zeche: 'strebe', zechenZustand: 'stillgelegt', halde: 'treppe', stadion: 'arena', bahnhof: '70er', kokerei: false, konzern: 1, konzernVarianten: ['turm70'], nah: [], markt: 'einer' },
    Bochum: { bahnLage: 'mitte', zeche: 'strebe', zechenZustand: 'museum', bahnhof: '50er', konzern: 1, konzernVarianten: ['backstein20'], halde: false, nah: ['zeche:strebe', 'kanal', 'siedlung'] },
    Oberhausen: { bahnLage: 'rechts', ekzGross: true, gasometer: true, huette: false, zeche: false, halde: 'bramme', bahnhof: 'altbau', konzern: 0, nah: ['kokerei:gasometer', 'zeche:doppelbock', 'kanal'] },
    Bottrop: { bahnLage: 'links', halde: 'pyramide', zeche: 'doppelbock', zechenZustand: 'aktiv', kokerei: true, kanal: false, bahnhof: '70er' },
    Marl: { bahnLage: 'oben', kern60: true, zeche: 'strebe', zechenZustand: 'stillgelegt', konzern: 2, konzernVarianten: ['turm70', 'turm70'], halde: false, bahnhof: '70er' },
    Recklinghausen: { bahnLage: 'mitte', altstadtRest: true, zeche: 'strebe', zechenZustand: 'museum', halde: 'kreuz', kanal: false, bahnhof: 'altbau' },
    Hagen: { bahnLage: 'oben', huette: true, huettenZustand: 'stillgelegt', zeche: false, halde: false, kanal: false, fluss: true, bahnhof: 'altbau', konzern: 1, konzernVarianten: ['backstein20'] },
    Hamm: { bahnLage: 'links', zeche: 'malakow', zechenZustand: 'stillgelegt', halde: 'kreuz', bahnhof: 'altbau', kanalFolge: ['hafen', 'strecke', 'schleuse', 'strecke', 'hafen', 'strecke', 'strecke', 'strecke'] },
    Witten: { bahnLage: 'mitte', zeche: 'malakow', zechenZustand: 'museum', fluss: true, halde: false, kanal: false, bahnhof: 'altbau' },
    'Mülheim': { bahnLage: 'oben', fluss: true, zeche: false, halde: false, konzern: 1, bahnhof: '70er', kanal: false, huette: false },
    Moers: { bahnLage: 'rechts', altstadtRest: true, zeche: 'strebe', zechenZustand: 'stillgelegt', halde: 'kreuz', kanal: false, bahnhof: '50er' },
  } });
registriereArchetyp('rheinmetropole', { ...GEMEINSAM, name: 'Rheinmetropole', entwurf: rheinmetropole,
  staedte: {
    'Köln': { dom: 'gotik', ringe: true, medienhafen: 'kranhaus', blockeX: 9, blockeZ: 9 },
    'Düsseldorf': { graben: true, fuenfziger: true, medienhafen: 'gehry', turm: true, kirchStil: 'barock' },
    Bonn: { medienhafen: 'glas', kirchStil: 'romanisch' },
    Neuss: { hafen: true, promenade: false, kirchStil: 'romanisch' },
    Leverkusen: { konzern: true, stadion: 'arena', kirche: false, promenade: false },
    Krefeld: { rhein: false, ringe: true, kirchStil: 'klassizismus' },
    'Mönchengladbach': { rhein: false, kirchStil: 'romanisch' },
    Aachen: { rhein: false, dom: 'pfalz', ringe: true },
    'Düren': { rhein: false, kirchStil: 'nachkrieg' },
    Wesel: { kirchStil: 'hallenkirche', hafen: true },
  } });
registriereArchetyp('westfalen', { ...GEMEINSAM, name: 'Westfälische Domstadt', entwurf: westfalen,
  staedte: {
    'Münster': { kirchStil: 'romanisch', backstein: true },
    Paderborn: { kirchStil: 'romanisch' },
    Bielefeld: { dom: false, hang: true },
    'Gütersloh': { ring: false, backstein: true },
  } });
registriereArchetyp('bergisch_sauerland', { ...GEMEINSAM, name: 'Bergische Talstadt', entwurf: bergisch,
  staedte: {
    Wuppertal: { schwebebahn: true },
    Solingen: { fluss: false },
    Siegen: { schloss: true },
    Iserlohn: { fluss: false },
    'Lüdenscheid': { fluss: false },
  } });
