// Archetyp-Modul Mitte: Stadttypen für Hessen, Rheinland-Pfalz, Saarland und Südniedersachsen.
// Registriert sich beim Import (siehe archetypen/README.md und die Dokumentation oben in stadtplan.js).
//
// Sieben Typen: bankenmetropole (Frankfurt), kurstadt (Wiesbaden), kaiserdom (Mainz, Worms, Speyer),
// fachwerk_uni (Marburg, Gießen, Göttingen, Fulda, Wetzlar), mitte_wiederaufbau (Kassel, Darmstadt, Offenbach, Hanau),
// mosel_rhein (Koblenz, Trier), industrie_mitte (Ludwigshafen, Saarbrücken, Kaiserslautern).
//
// Jeder Entwurf setzt E.mitte (Typ), E.mitteEinkauf (Bebauung der Einkaufslage um die Hartwig-Häuser:
// 'zeil' | 'kur' | 'dom' | 'fachwerk' | 'fuenfziger' | 'mosel' | 'sechziger') und E.fwAnteil (Faktor für Fachwerk).
// Große Bauten aus mittebauten.js liegen auf der Fläche 'mitte_bau' (Feld slot, variante, front, boden, lage).
// Statt Math.hypot: IEEE-genaue Wurzel, damit Schwellenvergleiche in allen JS-Engines gleich ausfallen.
const wurzelSumme = (...v) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
import { registriereArchetyp, PLAN_HILFE as H } from '../stadtplan.js';
import { registriereSlots, registriereStilProfil } from '../bauer.js';
import { MITTE_SLOTS, MITTE_HAUS } from '../mittebauten.js';
import { THREE, rng, waehle, zw } from '../basis.js';

const { nimm, fixiere, frei, wasserSpalte, klemm, wahlGewichtet, neueParzelle, mergeRand, parzellenVon } = H;

// ====================================================================================
// Gemeinsame Hilfen
// ====================================================================================
const breit = (E, i, w) => { if (i >= 0 && i < E.spalten.length) E.spalten[i] = Math.max(E.spalten[i], Math.ceil(w / 2) * 2); };
const tief = (E, j, d) => { if (j >= 0 && j < E.reihen.length) E.reihen[j] = Math.max(E.reihen[j], Math.ceil(d / 2) * 2); };
/** Großbau aus mittebauten.js auf eigener Fläche (nur wenn die Zellen frei sind). */
function bau(E, f) {
  if (!frei(E, f.i0, f.i1 ?? f.i0, f.j0, f.j1 ?? f.j0)) return null;
  return nimm(E, { art: 'mitte_bau', i1: f.i0, j1: f.j0, front: '+z', boden: 'pflaster', lage: 'hinten', ...f });
}
const flaeche = (E, f) => (frei(E, f.i0, f.i1 ?? f.i0, f.j0, f.j1 ?? f.j0) ? nimm(E, { i1: f.i0, j1: f.j0, ...f }) : null);
function grund(E, art, einkauf) {
  E.mitte = art;
  E.mitteEinkauf = einkauf;
  E.fwAnteil = E.o.fw ?? 1;
  E.landmarkVerbot = new Set([...(E.landmarkVerbot ?? []), 'slot:mall']);
}
const abst = (zc) => (i, j) => wurzelSumme(i - zc.i, j - zc.j);

/** Größte sinnvolle Slotmaße (lokal: Breite entlang der Front, Tiefe) je Slot und Variante, aus mittebauten.js. */
const SLOT_MAX = {
  'slot:mitte_skyline': { ensemble: [110, 90], alle: [60, 56] },
  'slot:mitte_fachwerk': { platz: [60, 54], roemer: [64, 32], zeile: [60, 30], rathaus: [50, 36] },
  'slot:mitte_kurstadt': { kurhaus: [120, 96], wandelhalle: [100, 64], villen: [96, 52] },
  'slot:mitte_dom_rot': { alle: [130, 72] },
  'slot:mitte_wiederaufbau': { treppenstrasse: [60, 90], platz: [70, 60], geschaeftshaus: [70, 36] },
  'slot:mitte_universitaet': { alte_uni: [76, 50], betonuni: [100, 76], aula: [64, 50] },
  'slot:mitte_roemisch': { tor: [60, 40], thermen: [84, 60], basilika: [84, 72], amphitheater: [72, 58] },
  'slot:mitte_industrie': { alle: [160, 110] },
  'slot:mitte_weinort': { rhein: [100, 90], mosel: [96, 96], winzerhof: [90, 84] },
  'slot:sued_burg': { festung: [88, 84] },
  'slot:mitte_bahnhof': { gross: [190, 150], drei: [140, 130], nachkrieg: [130, 120] },
  'slot:mitte_oberstadt': { alle: [120, 100] },
};
const slotMax = (slot, v) => SLOT_MAX[slot]?.[v] ?? SLOT_MAX[slot]?.alle ?? [999, 999];

// ====================================================================================
// Entwürfe
// ====================================================================================
/** Frankfurt: Main quer, Kopfbahnhof links (Gleise nach außen), Bankentürme, Römerberg mit Dom, Zeil, Sachsenhausen. */
function bankenmetropole(E) {
  const { r } = E;
  const nx = E.nx, nz = E.nz, jF = nz - 2;
  E.reihen[jF] = Math.round(zw(r, 66, 78));
  nimm(E, { art: 'wasser', form: 'fluss', i0: 0, i1: nx - 1, j0: jF, j1: jF, quer: true, brueckeP: 0.22, brueckenZahl: 4 });
  for (let k = 0; k <= nx; k++) fixiere(E, k, jF, jF);
  // Kopfbahnhof: Front +x zur Stadt, Hallen und Gleisvorfeld nach -x
  breit(E, 0, 146); tief(E, jF - 3, 84); tief(E, jF - 2, 84);
  bau(E, { slot: 'slot:mitte_bahnhof', variante: 'gross', front: '+x', i0: 0, i1: 0, j0: jF - 3, j1: jF - 2 });
  E.xTyp[jF - 1] = 'boulevard'; E.tram.push('x' + (jF - 1));
  // Bankenviertel: Ensemble auf eigener Fläche, die übrigen Blöcke bekommen Türme (parzellierung)
  breit(E, 2, 104); breit(E, 3, 90);
  bau(E, { slot: 'slot:mitte_skyline', variante: 'ensemble', i0: 2, j0: jF - 3, lage: 'mitte' });
  // Römerberg und roter Dom am Main
  breit(E, 5, 70); tief(E, jF - 1, 64);
  bau(E, { slot: 'slot:mitte_fachwerk', variante: 'platz', i0: 5, j0: jF - 1, lage: 'mitte' });
  breit(E, 6, 66);
  flaeche(E, { art: 'kirche', i0: 6, j0: jF - 1, seiten: ['-z', '-x'], kirchStil: 'hallenkirche', mitteKirche: { stein: '#a8513f', turm: 'west', dach: '#4f565e' } });
  E.landmarken.push('slot:kirche', 'slot:hochhaus', 'slot:museum');
  const zc = { i: 5.5, j: jF - 3.6 };
  const dz = abst(zc);
  E.zentrum = { ...zc };
  E.viertel = (i, j) => {
    if (j > jF) return 'mitte_sachsenhausen';
    if (i <= 1 && j >= jF - 4) return 'bahnhofsviertel';
    if (i >= 2 && i <= 3 && j >= jF - 4) return 'mitte_banken';
    if (i >= 4 && i <= 7 && j >= jF - 2) return 'mitte_fachwerk';
    const dd = dz(i, j);
    return dd < 1.6 ? 'zentrum' : dd < 3.8 ? 'gruenderzeit' : 'nachkrieg';
  };
  E.versatz = (k, j) => (k >= 5 && k <= 7 && j >= jF - 2 && j < jF ? 10 : 0);
  E.einschub = (i, j) => (E.viertel(i, j) === 'mitte_fachwerk' ? 0.35 : 0);
  E.hoch.push({ i: 2.5, j: jF - 2.5, s: 1.6 });
  E.marktVariante = 'keiner';
  E.umriss = 'voll';
  grund(E, 'banken', 'zeil');
  E.fwAnteil = 1.6;
}

/** Wiesbaden: Historisches Fünfeck, Wilhelmstraße als Prachtstraße, Kurhaus mit Kolonnaden, Kurpark, Villenhänge, Ringe. */
function kurstadt(E) {
  const { r } = E;
  const nx = E.nx, nz = E.nz;
  const kW = klemm(Math.floor(nx / 2), 2, nx - 3);
  E.zTyp[kW - 1] = 'boulevard'; fixiere(E, kW - 1);
  E.zTyp[1] = 'ring'; fixiere(E, 1); E.xTyp[nz - 1] = 'ring';
  const jK = klemm(Math.floor(nz / 2) - 1, 1, nz - 3);
  breit(E, kW, 124); tief(E, jK, 100); tief(E, jK - 1, 66);
  bau(E, { slot: 'slot:mitte_kurstadt', variante: 'kurhaus', i0: kW, j0: jK, lage: 'mitte', boden: 'gruen' });
  bau(E, { slot: 'slot:mitte_kurstadt', variante: 'wandelhalle', i0: kW, j0: jK - 1, lage: 'mitte', boden: 'gruen' });
  flaeche(E, { art: 'park', i0: kW + 1, i1: Math.min(nx - 1, kW + 2), j0: jK - 1, j1: Math.min(nz - 2, jK + 1) });
  E.landmarken.push('slot:theater');
  const zc = { i: kW - 1, j: jK + zw(r, 0, 0.2) };
  const dz = abst(zc);
  E.zentrum = { ...zc };
  E.viertel = (i, j) => {
    if (i > kW + 2 || (j === 0 && i >= kW - 1) || (j === nz - 1 && i > kW)) return 'mitte_villen';
    const dd = dz(i, j);
    if (dd < 1.5) return 'zentrum';
    return i >= 1 && j <= nz - 2 ? 'mitte_kur' : 'gruenderzeit';
  };
  E.marktVariante = 'einer';
  E.umriss = 'voll';
  grund(E, 'kur', 'kur');
  E.fwAnteil = 0.2;
}

/** Mainz, Worms, Speyer: Rhein an der Seite, roter Kaiserdom auf dem Domplatz mit Markt, Domgarten am Ufer, Wiederaufbau. */
function kaiserdom(E) {
  const { r } = E;
  const nx = E.nx, nz = E.nz, iR = nx - 1;
  wasserSpalte(E, iR, 0, nz - 1);
  E.spalten[iR] = Math.round(E.spalten[iR] * 1.6);
  const c = nx - 4, jd = Math.floor(nz / 2) - 1;
  breit(E, c, 68); breit(E, c + 1, 68); tief(E, jd, 108);
  bau(E, { slot: 'slot:mitte_dom_rot', variante: E.o.dom ?? 'kaiserdom', i0: c, i1: c + 1, j0: jd, j1: jd, markt: true });
  for (const j of [jd - 1, jd, jd + 1]) flaeche(E, { art: 'mitte_ufer', i0: nx - 2, j0: j, wasser: '+x' });
  if (E.o.schloss) { breit(E, nx - 3, 60); flaeche(E, { art: 'schloss', i0: nx - 3, i1: nx - 2, j0: Math.max(0, jd - 2), j1: Math.max(0, jd - 2), mitteSchloss: true }); }
  const zc = { i: c - 1, j: jd };
  const dz = abst(zc), dd0 = abst({ i: c + 0.5, j: jd });
  E.zentrum = { ...zc };
  E.viertel = (i, j) => {
    if (i === c - 1 && (j === jd - 1 || j === jd)) return 'mitte_fachwerk';
    const dd = Math.min(dz(i, j), dd0(i, j));
    return dd < 2.4 ? 'mitte_wiederaufbau' : dd < 3.6 ? 'gruenderzeit' : 'nachkrieg';
  };
  E.versatz = (k, j) => (E.viertel(k - 0.5, j) === 'mitte_fachwerk' ? 10 : 0);
  E.einschub = (i, j) => (E.viertel(i, j) === 'mitte_fachwerk' ? 0.4 : 0);
  E.marktVariante = 'keiner';
  E.umriss = 'voll';
  E.landmarkVerbot = new Set(['slot:kirche']);
  grund(E, 'dom', 'dom');
  void r;
}

/** Marburg, Gießen, Göttingen, Fulda, Wetzlar: Fachwerk-Altstadt (Marburg mit Oberstadt und Schloss am Hang), Uni-Bauten, Fluss. */
function fachwerkUni(E) {
  const { r, o } = E;
  const nx = E.nx, nz = E.nz;
  const c = klemm(Math.floor(nx / 2) - 1, 1, nx - 3);
  if (o.berg) {
    breit(E, c, 56); breit(E, c + 1, 56); tief(E, 0, 94);
    bau(E, { slot: 'slot:mitte_oberstadt', variante: o.berg, i0: c, i1: c + 1, j0: 0, j1: 0, lage: 'mitte', boden: 'gruen' });
  }
  if (o.fluss === 'ost') wasserSpalte(E, nx - 1, 0, nz - 1);
  else if (o.fluss === 'west') wasserSpalte(E, 0, 0, nz - 1);
  const zc = { i: c + 0.5 + zw(r, -0.2, 0.2), j: o.berg ? 1.9 : (nz - 1) / 2 };
  const dz = abst(zc);
  E.zentrum = { ...zc };
  // Kirche (Elisabethkirche, Dom) und Schloss
  if (o.kirche) {
    const l = [];
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) if (frei(E, i, i, j, j) && Math.abs(dz(i, j) - 1.6) < 0.7) l.push([[i, j], 1]);
    if (l.length) {
      const [i, j] = wahlGewichtet(r, l);
      const dom = !!o.kirche.dom;
      if (dom) { breit(E, i, 74); tief(E, j, 70); }
      nimm(E, { art: dom ? 'domplatz' : 'kirche', i0: i, i1: i, j0: j, j1: j, seiten: dom ? ['-z'] : ['-z', '-x'], kirchStil: o.kirche.stil, ...(o.kirche.form ? { kirchForm: o.kirche.form } : {}), mitteKirche: o.kirche });
    }
  }
  if (o.schloss) {
    const l = [];
    for (let i = 0; i + 1 < nx; i++) for (let j = 0; j < nz; j++) if (frei(E, i, i + 1, j, j) && dz(i + 0.5, j) > 1.6 && dz(i + 0.5, j) < 2.8) l.push([[i, j], 1]);
    if (l.length) { const [i, j] = wahlGewichtet(r, l); breit(E, i, 58); breit(E, i + 1, 58); nimm(E, { art: 'schloss', i0: i, i1: i + 1, j0: j, j1: j }); if (frei(E, i, i + 1, j + 1, j + 1)) nimm(E, { art: 'park', i0: i, i1: i + 1, j0: j + 1, j1: j + 1, garten: true }); }
  }
  // Universität: erster Bau nahe der Altstadt, zweiter (Betonuni) am Rand
  const uni = [];
  (o.uni ?? []).forEach((v, n) => {
    const [mw, md] = slotMax('slot:mitte_universitaet', v);
    const l = [];
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      if (!frei(E, i, i, j, j)) continue;
      const dd = dz(i, j);
      if (n === 0 ? dd > 1.3 && dd < 2.6 : dd > 2.4) l.push([[i, j], n === 0 ? 1 : dd]);
    }
    if (!l.length) return;
    const [i, j] = wahlGewichtet(r, l);
    breit(E, i, mw * 0.85); tief(E, j, md * 0.85);
    bau(E, { slot: 'slot:mitte_universitaet', variante: v, i0: i, j0: j, lage: 'mitte', boden: v === 'betonuni' ? 'pflaster' : 'gruen' });
    uni.push({ i, j });
  });
  const kern = (i, j) => dz(i, j) < (E.typ === 'mittelstadt' ? 1.7 : 2.1) && (!o.berg || j >= 1);
  E.viertel = (i, j) => {
    if (o.berg && j === 0) return 'mitte_fachwerk';
    if (kern(i, j)) return o.kern ?? 'mitte_fachwerk';
    if (uni.some((u) => Math.abs(u.i - i) + Math.abs(u.j - j) <= 1)) return 'mitte_uni';
    return dz(i, j) < 3 ? 'gruenderzeit' : 'rand';
  };
  E.versatz = (k, j) => (kern(k - 0.5, j) ? 12 : 4);
  E.einschub = (i, j) => (kern(i, j) ? 0.35 : 0.05);
  E.durchgang = 0.4;
  E.marktVariante = 'einer';
  E.umriss = waehle(r, ['voll', 'oval']);
  grund(E, 'fachwerk', o.kern ? 'fuenfziger' : 'fachwerk');
}

/** Kassel, Darmstadt, Offenbach, Hanau: 50er-Wiederaufbau mit Treppenstraße und 50er-Platz, Residenz-Reste mit Garten. */
function wiederaufbau(E) {
  const { r, o } = E;
  const nx = E.nx, nz = E.nz;
  const it = klemm(Math.floor(nx / 2), 1, nx - 2), jc = klemm(Math.floor(nz / 2), 2, nz - 2);
  if (o.fluss === 'nord') {
    E.reihen[0] = Math.round(zw(r, ...E.T.wasserB) * 1.3);
    nimm(E, { art: 'wasser', form: 'fluss', i0: 0, i1: nx - 1, j0: 0, j1: 0, quer: true, brueckeP: 0.45 });
    for (let k = 0; k <= nx; k++) fixiere(E, k, 0, 0);
  } else if (o.fluss === 'ost') wasserSpalte(E, nx - 1, 0, nz - 1);
  // Treppenstraße: Fußgängerachse vom Bahnhof zur Innenstadt
  breit(E, it, 60); tief(E, jc - 1, 82);
  bau(E, { slot: 'slot:mitte_wiederaufbau', variante: 'treppenstrasse', i0: it, j0: jc - 1, lage: 'mitte' });
  if (o.fluss !== 'nord' && jc - 1 >= 2) {
    tief(E, 0, 70);
    if (frei(E, it - 1, it + 1, 0, 0)) { nimm(E, { art: 'bahn', i0: it - 1, i1: it + 1, j0: 0, j1: 0, oben: true, bahnhofLinie: it + 1 }); E.landmarken.push('slot:bahnhof'); }
  }
  // 50er-Platz mit Pavillon
  breit(E, it + 2, 70); tief(E, jc, 60);
  bau(E, { slot: 'slot:mitte_wiederaufbau', variante: 'platz', i0: Math.min(nx - 1, it + 2), j0: jc, lage: 'mitte' });
  // Residenz-Reste mit Garten
  if (o.schloss === 'sued') {
    const i0 = it - 1;
    breit(E, i0, 60); breit(E, i0 + 1, 60); tief(E, nz - 2, 74);
    if (frei(E, i0, i0 + 1, nz - 2, nz - 2)) nimm(E, { art: 'schloss', i0, i1: i0 + 1, j0: nz - 2, j1: nz - 2 });
    if (frei(E, i0 - 1, i0 + 2, nz - 1, nz - 1)) nimm(E, { art: 'park', i0: i0 - 1, i1: i0 + 2, j0: nz - 1, j1: nz - 1, garten: true });
  } else if (o.schloss === 'mitte') {
    const i0 = Math.max(0, it - 3), j0 = jc - 1;
    breit(E, i0, 58); breit(E, i0 + 1, 58); tief(E, j0, 74);
    if (frei(E, i0, i0 + 1, j0, j0)) nimm(E, { art: 'schloss', i0, i1: i0 + 1, j0, j1: j0 });
    if (frei(E, i0, i0 + 1, j0 - 1, j0 - 1)) nimm(E, { art: 'park', i0, i1: i0 + 1, j0: j0 - 1, j1: j0 - 1, garten: true });
  }
  if (o.denkmal) E.landmarken.push('slot:denkmal');
  const zc = { i: it - 1, j: jc - 1 };
  const dz = abst(zc);
  E.zentrum = { ...zc };
  E.viertel = (i, j) => { const dd = dz(i, j); return dd < 2.5 ? 'mitte_wiederaufbau' : dd < 3.5 ? 'gruenderzeit' : E.typ === 'mittelstadt' ? 'rand' : 'nachkrieg'; };
  E.marktVariante = 'keiner';
  E.umriss = 'voll';
  grund(E, 'wiederaufbau', 'fuenfziger');
  E.fwAnteil = 0.25;
}

/** Koblenz (Zusammenfluss mit Eck und Burg am Hang) und Trier (Mosel, Römerbauten), Weinberge am Gegenufer. */
function moselRhein(E) {
  const { r, o } = E;
  const nx = E.nx, nz = E.nz;
  wasserSpalte(E, 1, 0, nz - 1);
  E.spalten[1] = Math.round(E.spalten[1] * (o.eck ? 1.6 : 1.3));
  // Gegenufer: Weinort mit Burg am Hang, sonst Rebhänge
  const jW = klemm(Math.floor(nz / 2) - 1, 1, nz - 2);
  breit(E, 0, 92); tief(E, jW, 88);
  // B5: keine Weinberg-Stufenpyramide; am Gegenufer ein glatter Rebhang, der im Stadtrandgürtel zum Berg ansteigt
  // (E.berge, stadtrand.js), in Koblenz die Festung auf dem Hügel
  // Gegenufer in der Karte ist normale Bebauung; Rebhang und Festung liegen am Berg im Stadtrandgürtel (stadtrand.js)
  E.berge = [{ seite: '-x', inhalt: 'wein', ...(o.eck ? { burg: 'festung', u: 0, abstand: 90 } : {}) }];
  void jW;
  if (o.eck) {
    E.reihen[1] = Math.round(zw(r, 42, 52));
    nimm(E, { art: 'wasser', form: 'fluss', i0: 2, i1: nx - 1, j0: 1, j1: 1, quer: true, brueckeP: 0.2 });
    for (let k = 2; k <= nx; k++) fixiere(E, k, 1, 1);
    tief(E, 0, 90); breit(E, 4, 90);
    // (B5: kein Weinort als Stufenkulisse im Stadtraster, die Zelle bleibt normale Bebauung)
    flaeche(E, { art: 'mitte_eck', i0: 2, j0: 2 });
    flaeche(E, { art: 'kirche', i0: 3, j0: 2, seiten: ['-z', '-x'], kirchStil: 'romanisch', mitteKirche: { turm: 'doppel' } });
    breit(E, 2, 60); breit(E, 3, 60);
    flaeche(E, { art: 'schloss', i0: 2, i1: 3, j0: nz - 3, j1: nz - 3 });
    for (const j of [3, 4]) flaeche(E, { art: 'mitte_ufer', i0: 2, j0: j, wasser: '-x' });
  } else {
    // Trier: Porta Nigra, Dom, Basilika, Kaiserthermen, Amphitheater
    breit(E, 4, 58); tief(E, 1, 42);
    bau(E, { slot: 'slot:mitte_roemisch', variante: 'tor', i0: 4, j0: 1, lage: 'mitte' });
    breit(E, 5, 62); breit(E, 6, 62); tief(E, 2, 78);
    flaeche(E, { art: 'domplatz', i0: 5, i1: 6, j0: 2, j1: 2, seiten: ['-z'], kirchStil: 'romanisch', mitteKirche: { turm: 'doppel', stein: '#b9ab98' } });
    breit(E, 5, 80); tief(E, 4, 70);
    bau(E, { slot: 'slot:mitte_roemisch', variante: 'basilika', i0: 5, j0: 4, lage: 'mitte', boden: 'gruen' });
    tief(E, 6, 58);
    bau(E, { slot: 'slot:mitte_roemisch', variante: 'thermen', i0: 5, j0: Math.min(nz - 1, 6), lage: 'mitte', boden: 'gruen' });
    breit(E, nx - 1, 70); tief(E, 5, 58);
    bau(E, { slot: 'slot:mitte_roemisch', variante: 'amphitheater', i0: nx - 1, j0: 5, lage: 'mitte', boden: 'gruen' });
    for (const j of [nz - 2, nz - 1]) flaeche(E, { art: 'mitte_ufer', i0: 2, j0: j, wasser: '-x' });
  }
  // B5: Weinberge nur am Hang außerhalb der Bebauung (Stadtrandgürtel), nicht als Blöcke im Stadtraster
  const zc = o.eck ? { i: 4, j: 3.6 } : { i: 4, j: 2 };
  const dz = abst(zc);
  E.zentrum = { ...zc };
  E.viertel = (i, j) => { if (o.eck && j === 0) return 'gruenderzeit'; const dd = dz(i, j); return dd < 1.7 ? 'altstadt' : dd < 3.2 ? 'gruenderzeit' : 'nachkrieg'; };
  E.versatz = (k, j) => (dz(k - 0.5, j) < 1.7 ? 10 : 0);
  E.einschub = (i, j) => (dz(i, j) < 1.7 ? 0.3 : 0);
  E.durchgang = 0.3;
  E.marktVariante = 'einer';
  E.umriss = 'voll';
  E.landmarkVerbot = new Set(['slot:kirche']);
  grund(E, 'mosel', 'mosel');
  E.fwAnteil = 0.6;
}

/** Ludwigshafen (Chemie am Rhein), Saarbrücken (Hütte an der Saar), Kaiserslautern (Werk als Denkmal): Werk, Arbeiterviertel, 60er-Innenstadt. */
function industrieMitte(E) {
  const { r, o } = E;
  const nx = E.nx, nz = E.nz;
  // Fluss senkrecht, Werk links davon (eigene Uferkante des Werks zeigt zum Fluss, Front +x)
  const iF = o.fluss === 'ost' ? nx - 1 : 2;
  wasserSpalte(E, iF, 0, nz - 1, o.kanal ? 'kanal' : 'fluss');
  if (!o.kanal && o.fluss === 'ost') E.spalten[iF] = Math.round(E.spalten[iF] * 1.6);
  const i0 = iF - 2;
  for (const i of [i0, i0 + 1]) breit(E, i, 58);
  tief(E, 0, 66); tief(E, 1, 66);
  bau(E, { slot: 'slot:mitte_industrie', variante: o.werk ?? 'chemie', front: '+x', i0, i1: i0 + 1, j0: 0, j1: 1, boden: 'werk' });
  if (o.schloss && iF === 2) { breit(E, 0, 58); breit(E, 1, 58); flaeche(E, { art: 'schloss', i0: 0, i1: 1, j0: 3, j1: 3 }); }
  if (o.kirche) flaeche(E, { art: 'kirche', i0: iF === 2 ? 1 : 2, j0: nz - 2, seiten: ['-z', '-x'], kirchStil: o.kirche, mitteKirche: {} });
  if (E.typ !== 'mittelstadt') E.landmarken.push('slot:hochhaus');
  const zc = iF === 2 ? { i: 3.2, j: (nz - 1) / 2 } : { i: (nx - 2) / 2, j: nz / 2 + 0.4 };
  const dz = abst(zc);
  E.zentrum = { ...zc };
  E.viertel = (i, j) => {
    if (Math.abs(i - i0 - 0.5) + Math.abs(j - 0.5) <= 3 && j <= 3 && dz(i, j) > 1.6) return 'mitte_arbeiter';
    if (iF === 2 && i < 2) return 'altstadt';
    const dd = dz(i, j);
    return dd < 1.9 ? 'mitte_sechziger' : dd < 3.2 ? 'gruenderzeit' : 'nachkrieg';
  };
  E.marktVariante = o.markt ? 'einer' : 'keiner';
  E.umriss = 'voll';
  grund(E, 'industrie', 'sechziger');
  E.fwAnteil = 0.3;
  void r;
}

// ====================================================================================
// Parzellierung: Bankentürme, Villenblöcke, Parzellenbreiten je Viertel
// ====================================================================================
const TURM = ['raster', 'zwilling', 'krone', 'rund'];
function bankenBlock(ctx, E, b) {
  const { rb } = ctx;
  const slots = [];
  const W = Math.min(56, b.w - 28), D = Math.min(52, b.d - 26);
  if (W < 36 || D < 34) return false;
  const v = waehle(rb, TURM);
  slots.push(neueParzelle(ctx, 'slot:mitte_skyline', b.x + b.w - W, b.z + b.d - D, W, D, ['+z'], 'ecke', { variante: v, klasse: 5, landmarke: false, ecke: '+x+z' }));
  if (b.w - W >= 70 && rb() < 0.7) {
    const W2 = Math.min(50, b.w - W - 30), D2 = Math.min(48, b.d - 26);
    if (W2 >= 36) slots.push(neueParzelle(ctx, 'slot:mitte_skyline', b.x, b.z, W2, D2, ['-z'], 'ecke', { variante: waehle(rb, TURM.filter((x) => x !== v)), klasse: 5, landmarke: false, ecke: '-x-z' }));
  }
  H.parzelliere(ctx, ['+z', '-z', '+x', '-x'], slots, {});
  if (b.hof) b.hof.art = 'pflaster';
  return true;
}
function villenBlock(ctx, E, b) {
  const D = Math.min(50, Math.floor((b.d - 6) / 2)), W = Math.min(96, b.w - 4);
  if (W < 56 || D < 30) return false;
  neueParzelle(ctx, 'slot:mitte_kurstadt', b.x + (b.w - W) / 2, b.z + b.d - D - 1, W, D, ['+z'], 'frei', { variante: 'villen', klasse: 4, landmarke: false });
  if (b.d >= 2 * D + 4) neueParzelle(ctx, 'slot:mitte_kurstadt', b.x + (b.w - W) / 2, b.z + 1, W, D, ['-z'], 'frei', { variante: 'villen', klasse: 4, landmarke: false });
  b.hof = { x: b.x + 1, z: b.z + 1, w: b.w - 2, d: b.d - 2, art: 'gruen' };
  b.tiefen = { '+z': 0, '-z': 0, '+x': 0, '-x': 0 };
  return true;
}
function parzellierung(ctx, E, b) {
  const v = b.viertel;
  const slotsHier = ctx.einkaufSlots?.length > 0;
  if (!slotsHier && v === 'mitte_banken' && bankenBlock(ctx, E, b)) return true;
  if (!slotsHier && v === 'mitte_villen' && !E.einkaufKern?.(b.i0, b.j0) && ctx.rb() < 0.7 && villenBlock(ctx, E, b)) return true;
  const P = { mitte_fachwerk: [6, 12], mitte_sachsenhausen: [7, 14], altstadt: [7, 14], mitte_arbeiter: [8, 16], mitte_sechziger: [14, 32], mitte_banken: [14, 30], mitte_wiederaufbau: [10, 22] }[v];
  if (P) ctx.parz = P;
  else if (E.mitteEinkauf === 'fachwerk' && E.einkaufKern?.(b.i0, b.j0)) ctx.parz = [7, 14];
  return false;
}

/** Nach der Blockrandbebauung: regionale Sonderbauten in der Reihe, vor allem in der Einkaufslage um Hartwig. */
function nachbearbeitung(ctx, E, b) {
  const { rb } = ctx;
  const v = b.viertel;
  const einkauf = (ctx.einkaufSlots?.length ?? 0) > 0 || !!E.einkaufKern?.(b.i0, b.j0);
  const ex = { landmarke: false };
  const fwZeile = () => mergeRand(ctx, 'slot:mitte_fachwerk', [40, 58], 24, ['+z', '+x'], { ...ex, variante: 'zeile' });
  const gh50 = () => mergeRand(ctx, 'slot:mitte_wiederaufbau', [52, 70], 30, ['+z', '+x'], { ...ex, variante: 'geschaeftshaus' });
  const turm = (g) => mergeRand(ctx, 'slot:hochhaus', [20, 34], 22, ['+x', '+z', '-z'], { ...ex, geschosse: g });
  if (einkauf) {
    const art = E.mitteEinkauf;
    if (art === 'fachwerk' && rb() < 0.55) fwZeile();
    if (art === 'fuenfziger' && rb() < 0.7) gh50();
    if (art === 'dom' && rb() < 0.45) gh50();
    if (art === 'zeil') { if (rb() < 0.45) gh50(); if (rb() < 0.35) turm(16 + Math.floor(rb() * 10)); }
    if (art === 'sechziger') { if (rb() < (E.typ === 'mittelstadt' ? 0.12 : 0.35)) turm(E.typ === 'mittelstadt' ? 8 : 10 + Math.floor(rb() * 6)); if (rb() < 0.3) gh50(); }
    if (art === 'mosel' && rb() < 0.3) fwZeile();
    for (const p of parzellenVon(ctx)) if (p.typ === 'stadthaus' || p.typ === 'eck') p.laden = true;
    return;
  }
  if (v === 'mitte_fachwerk' && rb() < (E.typ === 'metropole' ? 0.4 : 0.22)) fwZeile();
  else if (v === 'mitte_wiederaufbau' && rb() < 0.25) gh50();
  else if (v === 'mitte_sechziger' && E.typ !== 'mittelstadt' && rb() < 0.18) turm(9 + Math.floor(rb() * 5));
}

/** Einmal nach allen Blöcken: Kirchen bekommen regionalen Stein (roter Sandstein) und Turmform. */
function nachPlan(E, _H, g) {
  const { bloecke, parzellen } = g;
  for (const b of bloecke) {
    if (!b.mitteKirche) continue;
    const { dom, form, ...k } = b.mitteKirche;
    void dom; void form;
    for (const id of b.parzellen) { const p = parzellen.find((q) => q.id === id); if (p && p.typ === 'slot:kirche') Object.assign(p, { stein: '#b0574a', ...k, region: 'Mitte' }); }
  }
}

// ====================================================================================
// Flächen
// ====================================================================================
function bauParzelle(ctx, E, b) {
  const front = b.front ?? '+z', quer = front[1] === 'x';
  const [mw, md] = slotMax(b.slot, b.variante);
  const W = Math.max(8, Math.min(b.w - 4, quer ? md : mw)), D = Math.max(8, Math.min(b.d - 4, quer ? mw : md));
  let x = b.x + (b.w - W) / 2, z = b.z + (b.d - D) / 2;
  if ((b.lage ?? 'hinten') === 'hinten') {
    if (front === '+z') z = b.z + 2; else if (front === '-z') z = b.z + b.d - D - 2;
    else if (front === '+x') x = b.x + 2; else x = b.x + b.w - W - 2;
  }
  neueParzelle(ctx, b.slot, x, z, W, D, [front], 'frei', { variante: b.variante, klasse: 5, landmarke: true });
  // Werksgelände größer als das Werk: Reststreifen mit Gasometer, Werksverwaltung oder Werksparkplatz füllen
  if (b.boden !== 'werk') return;
  const X0 = b.x + 2, Z0 = b.z + 2, X1 = b.x + b.w - 2, Z1 = b.z + b.d - 2, m = 4;
  const reste = [[X0, Z0, x - m, Z1], [x + W + m, Z0, X1, Z1], [x, Z0, x + W, z - m], [x, z + D + m, x + W, Z1]];
  let gaso = false;
  for (const [a0, c0, a1, c1] of reste) {
    const rw = a1 - a0, rd = c1 - c0;
    if (rw < 14 || rd < 14) continue;
    const g = Math.min(70, rw, rd);
    if (!gaso && g >= 50) {
      gaso = true;
      neueParzelle(ctx, 'slot:ruhr_kokerei', a0, c0, g, g, ['+z'], 'frei', { klasse: 3, landmarke: false, variante: 'gasometer', zustand: b.variante === 'denkmal' ? 'museum' : 'stillgelegt' });
      if (rw - g - 4 >= 14) neueParzelle(ctx, b.boden === 'werk' ? 'slot:werkhalle' : 'parkplatz', a0 + g + 4, c0, rw - g - 4, rd, ['+z'], 'frei', { klasse: 1 });
      else if (rd - g - 4 >= 14) neueParzelle(ctx, b.boden === 'werk' ? 'slot:werkhalle' : 'parkplatz', a0, c0 + g + 4, rw, rd - g - 4, ['+z'], 'frei', { klasse: 1 });
    } else if (Math.min(rw, rd) >= 24 && Math.max(rw, rd) >= 34) {
      const bw = Math.min(rw, 80), bd = Math.min(rd, 50);
      neueParzelle(ctx, 'slot:ruhr_buero', a0, c1 - bd, bw, bd, ['+z'], 'frei', { klasse: 3, landmarke: false, variante: 'backstein20' });
      if (rd - bd - 4 >= 14) neueParzelle(ctx, b.boden === 'werk' ? 'slot:werkhalle' : 'parkplatz', a0, c0, rw, rd - bd - 4, ['+z'], 'frei', { klasse: 1 });
      else if (rw - bw - 4 >= 14) neueParzelle(ctx, b.boden === 'werk' ? 'slot:werkhalle' : 'parkplatz', a0 + bw + 4, c0, rw - bw - 4, rd, ['+z'], 'frei', { klasse: 1 });
    } else neueParzelle(ctx, b.boden === 'werk' ? 'slot:werkhalle' : 'parkplatz', a0, c0, rw, rd, ['+z'], 'frei', { klasse: 1 });
  }
}
const BAUMARTEN = ['linde', 'kastanie', 'platane', 'linde'];
function bodenBau(ctx, b, r, teile, B) {
  const { S, I } = ctx;
  const y = 0.36, art = b.boden ?? 'pflaster';
  if (art === 'gruen') S.quader(b.x, 0, b.z, b.x + b.w, y, b.z + b.d, B.F.rasen);
  else if (art === 'werk') S.quader(b.x, 0, b.z, b.x + b.w, y, b.z + b.d, '#bcb7ad');
  else B.pflasterFlaeche(ctx, b, y, '#ddd6c8', 5);
  const frei = (x, z, rad) => !teile.some((p) => B.imRechteck(x, z, p, rad));
  if (art === 'werk') {
    // GESTALTUNG.md: Werksgelände nicht leer: Werkhallen mit Sheddach, Lagerplätze und Werksgleise auf freien Flächen
    for (let x = b.x + 6; x < b.x + b.w - 26; x += 34) for (let z = b.z + 6; z < b.z + b.d - 20; z += 26) {
      const w = 26 + (r() * 6 | 0), d = 16 + (r() * 4 | 0);
      // Der Werks-Slot baut nur in Nennmaß (höchstens 160 × 110, Front +x gedreht) mittig; seine Restfläche wird bebaut
      const kern = (q) => { if (q.typ !== 'slot:mitte_industrie') return q; const quer = q.front?.[0] === '+x' || q.front?.[0] === '-x'; const kw = Math.min(q.w, quer ? 110 : 160), kd = Math.min(q.d, quer ? 160 : 110); return { x: q.x + (q.w - kw) / 2, z: q.z + (q.d - kd) / 2, w: kw, d: kd }; };
      if (teile.map(kern).some((p) => x < p.x + p.w + 3 && x + w > p.x - 3 && z < p.z + p.d + 3 && z + d > p.z - 3)) continue;
      const h = 7 + r() * 5, f = waehle(r, ['#8e8a82', '#9a8f7f', '#7f8a8e', '#a0968a']);
      S.quader(x, y, z, x + w, y + h, z + d, f);   // steht auf dem Pflaster des Slots (y 0.34)
      for (let u = x + 1; u < x + w - 1; u += 4) S.quader(u, y + h, z + 1, u + 3.2, y + h + 1.4, z + d - 1, '#6f6a63');
      for (let u = x + 3; u < x + w - 3; u += 5) S.box(2.2, 2.8, 0.1, u, y + 2.2, z + d + 0.05, '#4c5359');
    }
    for (let x = b.x + 4; x < b.x + b.w - 3; x += 8) if (frei(x, b.z + b.d - 2, 2)) B.baumSetzen(I, 'pappel', x, y, b.z + b.d - 2, r, 0.8);
    return;
  }
  const ba = waehle(r, BAUMARTEN);
  if (art === 'gruen') {
    // freie Rasenfläche um den Bau als gestalteter Garten (B6), nicht als leere Wiese
    const frei2 = { x: b.x, z: b.z, w: b.w, d: b.d };
    gruenFuellen(ctx, frei2, r, (x, z) => !frei(x, z, 4), y, B);
  }
  for (let x = b.x + 4; x < b.x + b.w - 3; x += 8) if (frei(x, b.z + b.d - 2.5, 3)) B.baumSetzen(I, ba, x, y, b.z + b.d - 2.5, r, 0.85);
  for (let z = b.z + 4; z < b.z + b.d - 3; z += 8) if (frei(b.x + b.w - 2.5, z, 3)) B.baumSetzen(I, ba, b.x + b.w - 2.5, y, z, r, 0.85);
  // Markt vor dem Dom: Stände mit bunten Dächern
  if (b.markt) {
    const p = teile[0];
    const z0 = p ? p.z + p.d + 4 : b.z + b.d * 0.6;
    for (let x = b.x + 8; x < b.x + b.w - 10; x += 7) for (let z = z0; z < b.z + b.d - 8; z += 8) {
      if (r() < 0.3 || !frei(x, z, 2)) continue;
      S.quader(x - 1.6, y, z - 1.1, x + 1.6, y + 1.0, z + 1.1, '#e9e3d6');
      S.quader(x - 1.9, y + 2.4, z - 1.4, x + 1.9, y + 2.7, z + 1.4, waehle(r, ['#c9483e', '#f1ede4', '#3f7d56', '#2f6f8f', '#d39a2b']));
      for (const [dx, dz] of [[-1.7, -1.2], [1.7, -1.2], [-1.7, 1.2], [1.7, 1.2]]) S.box(0.1, 2.4, 0.1, x + dx, y + 1.2, z + dz, '#7a7f84');
    }
  }
  const n = Math.round((b.w * b.d) / (art === 'gruen' ? 160 : 70) * ctx.dichte);
  for (let i = 0; i < n; i++) { const x = B.zw(r, b.x + 1, b.x + b.w - 1), z = B.zw(r, b.z + 1, b.z + b.d - 1); if (frei(x, z, 0.6)) B.figur(I, x, y, z, r); }
  if (art === 'gruen') for (let i = 0; i < Math.round((b.w * b.d) / 500); i++) { const x = B.zw(r, b.x + 3, b.x + b.w - 3), z = B.zw(r, b.z + 3, b.z + b.d - 3); if (frei(x, z, 3.5)) B.baumSetzen(I, waehle(r, ['linde', 'kugel', 'kastanie']), x, y, z, r, B.zw(r, 0.75, 1)); }
}
/** Uferpromenade (Rheinufer, Domgarten): Rasen, Weg zum Wasser, Baumreihen, Bänke, Spaziergänger. */
/**
 * B6 (GESTALTUNG.md 3: Plätze und Parks gefüllt): Grünfläche mit Wegekreuz, Baumgruppen, Blumenbeeten und einem
 * Pavillon füllen, damit kein großer leerer Rasenblock bleibt. belegt(x, z) sperrt Wege, Bauten und Promenaden.
 */
function gruenFuellen(ctx, b, r, belegt, y, B) {
  const { S, I } = ctx;
  const cx = b.x + b.w / 2, cz = b.z + b.d / 2;
  const wege = [{ x: b.x + 2, z: cz - 1.6, w: b.w - 4, d: 3.2 }, { x: cx - 1.6, z: b.z + 2, w: 3.2, d: b.d - 4 }];
  for (const w of wege) S.quader(w.x, y, w.z, w.x + w.w, y + 0.04, w.z + w.d, '#e2d8c2');
  const aufWeg = (x, z) => wege.some((w) => B.imRechteck(x, z, w, 2.2));
  if (b.w > 30 && b.d > 30 && !belegt(cx, cz)) {
    S.quader(cx - 5, y, cz - 5, cx + 5, y + 0.5, cz + 5, '#d9cfba');
    S.quader(cx - 4, y + 0.5, cz - 4, cx + 4, y + 3.6, cz + 4, '#f1ede4');
    S.add(new THREE.ConeGeometry(6.2, 2.6, 8).translate(cx, y + 4.9, cz), '#5d7a6a');
  }
  for (const [fx, fz] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {
    const x = b.x + b.w * fx, z = b.z + b.d * fz;
    if (belegt(x, z)) continue;
    S.quader(x - 4, y, z - 2.5, x + 4, y + 0.25, z + 2.5, waehle(r, ['#c9586a', '#e0b23c', '#b56fb0', '#e7894a']));
    S.quader(x - 4.4, y, z - 2.9, x + 4.4, y + 0.18, z + 2.9, '#6f9f5c');
  }
  const n = Math.round((b.w * b.d) / 70);
  for (let i = 0; i < n; i++) {
    const x = B.zw(r, b.x + 2.5, b.x + b.w - 2.5), z = B.zw(r, b.z + 2.5, b.z + b.d - 2.5);
    if (belegt(x, z) || aufWeg(x, z) || wurzelSumme(x - cx, z - cz) < 9) continue;
    B.baumSetzen(I, waehle(r, ['linde', 'kastanie', 'kugel', 'platane']), x, y, z, r, B.zw(r, 0.8, 1.05));
  }
  for (let u = b.x + 6; u < b.x + b.w - 4; u += 12) I.setze('bank', u, y + 0.04, cz + 2.4, Math.PI);
}
function bodenUfer(ctx, b, r, teile, B) {
  const { S, I } = ctx;
  const y = 0.36;   // über der Gehwegplatte (YG 0.32), sonst Z-Fighting
  S.quader(b.x, 0, b.z, b.x + b.w, y, b.z + b.d, B.F.rasen);
  const s = b.wasser ?? '+x';
  const weg = s === '+x' ? { x: b.x + b.w - 9, z: b.z, w: 7, d: b.d } : s === '-x' ? { x: b.x + 2, z: b.z, w: 7, d: b.d } : s === '+z' ? { x: b.x, z: b.z + b.d - 9, w: b.w, d: 7 } : { x: b.x, z: b.z + 2, w: b.w, d: 7 };
  S.quader(weg.x, y, weg.z, weg.x + weg.w, y + 0.05, weg.z + weg.d, '#ddd5c3');
  const lang = s[1] === 'x';
  for (let u = 4; u < (lang ? b.d : b.w) - 3; u += 8) {
    const [x1, z1] = lang ? [weg.x - 1.5, b.z + u] : [b.x + u, weg.z - 1.5];
    const [x2, z2] = lang ? [weg.x + weg.w + 1.5, b.z + u] : [b.x + u, weg.z + weg.d + 1.5];
    B.baumSetzen(I, 'platane', x1, y, z1, r, 0.95);
    if (x2 < b.x + b.w - 0.5 && z2 < b.z + b.d - 0.5) B.baumSetzen(I, 'platane', x2, y, z2, r, 0.95);
    if (u % 16 < 8) I.setze('bank', lang ? weg.x + 1 : b.x + u + 3, y + 0.05, lang ? b.z + u + 3 : weg.z + 1, lang ? Math.PI / 2 : 0);
  }
  gruenFuellen(ctx, b, r, (x, z) => B.imRechteck(x, z, weg, 4), y, B);
  for (let i = 0, n = Math.round((weg.w + weg.d) / 5 * ctx.dichte); i < n; i++) B.figur(I, B.zw(r, weg.x + 0.5, weg.x + weg.w - 0.5), y + 0.05, B.zw(r, weg.z + 0.5, weg.z + weg.d - 0.5), r);
  void teile;
}
/** Eck am Zusammenfluss: Denkmal auf der Spitze, Pflaster, Fahnen, Rasen. */
function eckParzelle(ctx, E, b) {
  const s = Math.min(24, b.w * 0.4, b.d * 0.4);
  neueParzelle(ctx, 'slot:denkmal', b.x + 4, b.z + 4, s, s, ['+z', '+x'], 'frei', { klasse: 5, landmarke: true });
}
function bodenEck(ctx, b, r, teile, B) {
  const { S, I } = ctx;
  const y = 0.36;   // über der Gehwegplatte (YG 0.32), sonst Z-Fighting
  S.quader(b.x, 0, b.z, b.x + b.w, y, b.z + b.d, B.F.rasen);
  B.pflasterFlaeche(ctx, { x: b.x + 1, z: b.z + 1, w: b.w * 0.55, d: b.d * 0.55 }, y + 0.02, '#d9d1c1', 4);
  for (let k = 0; k < 8; k++) { const x = b.x + b.w * 0.6 + k * 2.6, z = b.z + 3; if (x < b.x + b.w - 2) { S.box(0.16, 9, 0.16, x, y + 4.5, z, '#e9e7e2'); S.box(0.05, 1.4, 2.0, x, y + 8.2, z + 1.0, waehle(r, ['#2b2f33', '#c8463c', '#e0b23c', '#2f63b5', '#f1f1ee'])); } }
  for (let i = 0; i < 6; i++) { const x = B.zw(r, b.x + b.w * 0.6, b.x + b.w - 3), z = B.zw(r, b.z + b.d * 0.4, b.z + b.d - 3); B.baumSetzen(I, 'linde', x, y, z, r, 0.9); }
  for (let i = 0, n = Math.round(b.w * b.d / 60 * ctx.dichte); i < n; i++) { const x = B.zw(r, b.x + 1, b.x + b.w * 0.55), z = B.zw(r, b.z + 1, b.z + b.d * 0.55); if (!teile.some((p) => B.imRechteck(x, z, p, 0.8))) B.figur(I, x, y + 0.02, z, r); }
}
/** Rebhang am Gegenufer: Reihen von Reben, Wege, ein Weinberghäuschen. */
function bodenWeinberg(ctx, b, r, teile, B) {
  const { S, I } = ctx;
  const y = 0.36;   // über der Gehwegplatte (YG 0.32), sonst Z-Fighting
  S.quader(b.x, 0, b.z, b.x + b.w, y, b.z + b.d, '#b9a77a');
  const mitte = b.z + b.d * zw(r, 0.35, 0.65);
  for (let x = b.x + 2; x < b.x + b.w - 1.5; x += 2.6) {
    S.quader(x, y, b.z + 2, x + 1.1, y + 1.3, mitte - 2, '#6f9a4f');
    S.quader(x, y, mitte + 2, x + 1.1, y + 1.3, b.z + b.d - 2, '#6f9a4f');
  }
  S.quader(b.x + 1, y, mitte - 1.6, b.x + b.w - 1, y + 0.05, mitte + 1.6, '#d6cbb2');
  const hx = b.x + zw(r, 6, b.w - 12);
  S.quader(hx, y, mitte + 2.2, hx + 4, y + 3, mitte + 6, '#e9e1d0');
  const g = B.F && null; void g;
  S.quader(hx - 0.3, y + 3, mitte + 1.9, hx + 4.3, y + 3.4, mitte + 6.3, '#a24e38');
  for (let i = 0; i < 3; i++) B.baumSetzen(I, 'nadel', b.x + zw(r, 3, b.w - 3), y, b.z + 2, r, 0.8);
  void teile;
}

// ====================================================================================
// Stilprofil der normalen Stadthäuser (Mitte)
// ====================================================================================
const STILE_M = {
  altstadt: { gruenderzeit: 1.8, barock: 1.4, fachwerk: 1.6, wiederaufbau: 0.9, fuenfziger: 0.4 },
  mitte_fachwerk: { fachwerk: 5, barock: 0.5, gruenderzeit: 0.4, wiederaufbau: 0.4 },
  zentrum: { gruenderzeit: 1.2, fuenfziger: 1.4, wiederaufbau: 1, siebziger: 0.8, neubau: 1, jugendstil: 0.4 },
  gruenderzeit: { gruenderzeit: 3.4, jugendstil: 1.4, fuenfziger: 0.6, wiederaufbau: 0.5, neubau: 0.2 },
  nachkrieg: { fuenfziger: 2, wiederaufbau: 1.4, siebziger: 1, neubau: 0.8, gruenderzeit: 0.6 },
  bahnhofsviertel: { gruenderzeit: 3, jugendstil: 1.4, fuenfziger: 0.8, siebziger: 0.6, neubau: 0.6 },
  barock: { barock: 3, gruenderzeit: 1 },
  rand: { fuenfziger: 1.6, siebziger: 1.2, neubau: 1.2, wiederaufbau: 0.8, gruenderzeit: 0.5, fachwerk: 0.4 },
  mitte_banken: { neubau: 3, siebziger: 1.6, gruenderzeit: 0.6, fuenfziger: 0.5 },
  mitte_kur: { gruenderzeit: 3, jugendstil: 2.2, barock: 0.6 },
  mitte_villen: { gruenderzeit: 2, jugendstil: 2 },
  mitte_wiederaufbau: { fuenfziger: 3.2, wiederaufbau: 2.6, siebziger: 0.6, gruenderzeit: 0.6, neubau: 0.3 },
  mitte_arbeiter: { gruenderzeit: 2, backstein: 1.2, wiederaufbau: 1.4, fuenfziger: 1 },
  mitte_sechziger: { siebziger: 3, fuenfziger: 1.8, neubau: 1.2, wiederaufbau: 0.5 },
  mitte_uni: { gruenderzeit: 2, jugendstil: 0.8, fachwerk: 0.8, siebziger: 0.8, neubau: 0.6 },
  mitte_sachsenhausen: { gruenderzeit: 2.4, fachwerk: 1.8, jugendstil: 0.6, fuenfziger: 0.4 },
  // Einkaufslagen (Bebauung um die Hartwig-Häuser)
  e_zeil: { neubau: 2.4, fuenfziger: 1.6, siebziger: 1.4, gruenderzeit: 0.8 },
  e_kur: { gruenderzeit: 2.6, jugendstil: 2.2, barock: 0.5, neubau: 0.4 },
  e_dom: { wiederaufbau: 2, fuenfziger: 1.6, gruenderzeit: 1, barock: 0.8, fachwerk: 0.6 },
  e_fachwerk: { fachwerk: 4, gruenderzeit: 1, fuenfziger: 0.4, barock: 0.4 },
  e_fuenfziger: { fuenfziger: 3, wiederaufbau: 2, siebziger: 0.8, neubau: 0.5 },
  e_mosel: { barock: 1.8, gruenderzeit: 2, fachwerk: 0.9, wiederaufbau: 0.8, fuenfziger: 0.5 },
  e_sechziger: { siebziger: 2.6, fuenfziger: 1.6, neubau: 1.4, wiederaufbau: 0.6 },
};
const GESCH_M = { gruenderzeit: [3, 5], jugendstil: [3, 5], backstein: [3, 4], fachwerk: [2, 3], fuenfziger: [3, 5], siebziger: [4, 7], neubau: [4, 6], barock: [2, 4], wiederaufbau: [3, 4] };
function mitteStil(p, nachbar) {
  const r = rng(((p.seed ?? 1) * 2654435761 + 1231) >>> 0);
  const key = p.mitteEinkauf ? 'e_' + p.mitteEinkauf : STILE_M[p.viertel] ? p.viertel : 'gruenderzeit';
  const basis = STILE_M[key];
  const L = p.seite === '+x' || p.seite === '-x' ? p.d : p.w;
  const liste = Object.entries(basis).map(([st, g]) => {
    let w = g;
    if (st === 'fachwerk') w *= p.mitteFw ?? 1;
    if (nachbar?.stil === st && st !== 'fachwerk') w *= 0.3;
    if (st === 'fachwerk' && L > 16) w *= 0.25;
    if ((st === 'siebziger' || st === 'neubau') && L < 10) w *= 0.4;
    return [st, w];
  });
  const stil = wahlGewichtet(r, liste);
  let [a, b] = GESCH_M[stil];
  if (p.cluster === 'metropole') { a += 1; b += 1; } else if (p.cluster === 'mittelstadt') b -= 1;
  if (p.viertel === 'mitte_banken' && stil !== 'gruenderzeit') { a += 1; b += 2; }
  let g = Math.round(a + (b - a) * r());
  if (nachbar?.geschosse && r() < 0.35) g = nachbar.geschosse + waehle(r, [-1, 1]);
  const geschosse = Math.max(stil === 'fachwerk' ? 1 : 2, Math.min(stil === 'fachwerk' ? 3 : 7, Math.max(a - 1, Math.min(b, g))));
  if (stil === 'fachwerk') {
    // Hessisches Fachwerk mit Auskragung aus mittebauten.js, Ausrichtung nach der Straßenseite der Parzelle
    const front = (p.front?.length === 1 ? p.front[0] : p.front?.includes('+z') ? '+z' : p.front?.[0]) ?? '+z';
    return { bau: (S, scene, q) => ({ ...MITTE_HAUS.fachwerk(S, scene, { ...q, front, geschosse, laden: !!p.laden, eck: q.eck }), stil: 'fachwerk', geschosse }) };
  }
  return { stil, geschosse, region: 'Mitte' };
}
registriereStilProfil('mitte', (p, nachbar) => mitteStil(p, nachbar));

function parzelleMarkieren(p, bl, E) {
  p.stilProfil = 'mitte';
  p.mitteTyp = E.mitte ?? null;
  p.mitteFw = E.fwAnteil ?? 1;
  if (bl && (bl.art === 'warenhaus' || E.einkaufKern?.(bl.i0, bl.j0))) p.mitteEinkauf = E.mitteEinkauf;
}

// ====================================================================================
// Registrierung
// ====================================================================================
registriereSlots(MITTE_SLOTS);
/** Werkhallen mit Sheddach auf der Restfläche eines Werksgeländes (statt leerem Parkplatz). */
registriereSlots({ 'slot:werkhalle': (S, scene, p) => {
  const r = rng(p.seed ?? 1), y = 0.36;
  let hmax = 0;
  for (let z = p.z + 2; z < p.z + p.d - 12; z += 22) {
    const d = Math.min(18, p.z + p.d - 2 - z), h = 8 + r() * 4, f = waehle(r, ['#8e8a82', '#9a8f7f', '#7f8a8e']);
    S.quader(p.x + 2, y, z, p.x + p.w - 2, y + h, z + d, f);
    for (let u = p.x + 3; u < p.x + p.w - 3; u += 3.6) { S.quader(u, y + h, z + 0.5, u + 2.6, y + h + 1.4, z + d - 0.5, '#6f6a63'); S.quader(u + 2.6, y + h, z + 0.5, u + 3.0, y + h + 1.4, z + d - 0.5, '#b9c4c9'); }
    for (let u = p.x + 6; u < p.x + p.w - 5; u += 7) S.box(3, 4, 0.1, u, y + 2, z + d + 0.05, '#4c5359');
    for (let v = z + 4; v < z + d - 3; v += 7) S.box(0.1, 4, 3, p.x + p.w - 1.95, y + 2, v, '#4c5359');
    hmax = Math.max(hmax, h + 1.4);
  }
  return { hoehe: hmax };
} });

const GEMEINSAM = {
  gewicht: [0, 0, 0], parzellierung, nachbearbeitung, nachPlan, parzelleMarkieren, stilProfil: 'mitte',
  viertel: {
    mitte_banken: { dk: 1.8, var: 0.5, stile: [['modern', 0.7], ['nachkrieg', 0.3]], fachwerk: 0 },
    mitte_fachwerk: { dk: -0.8, var: 0.7, stile: [['gruenderzeit', 0.15]], fachwerk: 3 },
    mitte_kur: { dk: 0.4, var: 0.3, stile: [['gruenderzeit', 1]], fachwerk: 0 },
    mitte_villen: { dk: -0.6, var: 0.3, stile: [['gruenderzeit', 1]], fachwerk: 0 },
    mitte_wiederaufbau: { dk: 0.2, var: 0.6, stile: [['nachkrieg', 0.8], ['gruenderzeit', 0.2]], fachwerk: 0 },
    mitte_arbeiter: { dk: -0.4, var: 0.4, stile: [['gruenderzeit', 0.6], ['nachkrieg', 0.4]], fachwerk: 0 },
    mitte_sechziger: { dk: 0.9, var: 0.7, stile: [['nachkrieg', 0.5], ['modern', 0.5]], fachwerk: 0 },
    mitte_uni: { dk: 0, var: 0.6, stile: [['gruenderzeit', 0.5], ['nachkrieg', 0.5]], fachwerk: 0.3 },
    mitte_sachsenhausen: { dk: -0.6, var: 0.6, stile: [['gruenderzeit', 0.7]], fachwerk: 1 },
  },
  flaechen: {
    mitte_bau: { parzelliere: bauParzelle, boden: bodenBau },
    mitte_ufer: { boden: bodenUfer },
    mitte_eck: { parzelliere: eckParzelle, boden: bodenEck },
    mitte_weinberg: { boden: bodenWeinberg },
  },
};
registriereArchetyp('bankenmetropole', { ...GEMEINSAM, name: 'Bankenmetropole', entwurf: bankenmetropole, staedte: { Frankfurt: {} } });
registriereArchetyp('kurstadt', { ...GEMEINSAM, name: 'Kurstadt', entwurf: kurstadt, staedte: { Wiesbaden: {} } });
registriereArchetyp('kaiserdom', { ...GEMEINSAM, name: 'Kaiserdomstadt', entwurf: kaiserdom,
  staedte: { Mainz: { dom: 'westturm', schloss: true }, Worms: { dom: 'doppelchor' }, Speyer: { dom: 'kaiserdom' } } });
registriereArchetyp('fachwerk_uni', { ...GEMEINSAM, name: 'Fachwerk- und Universitätsstadt', entwurf: fachwerkUni,
  staedte: {
    Marburg: { berg: 'schloss', fluss: 'ost', uni: ['alte_uni', 'betonuni'], kirche: { stil: 'hallenkirche', turm: 'doppel', stein: '#b0574a' } },
    'Gießen': { fluss: 'west', uni: ['alte_uni', 'betonuni'], kern: 'mitte_wiederaufbau', fw: 0.35 },
    'Göttingen': { uni: ['aula', 'betonuni'], kirche: { stil: 'hallenkirche', turm: 'doppel', stein: '#c9b9a0' } },
    Fulda: { fluss: 'west', uni: ['betonuni'], kirche: { stil: 'barock', dom: true, turm: 'doppel', stein: '#e9e1d2' }, schloss: true },
    Wetzlar: { berg: 'dom', fluss: 'ost' },
  } });
registriereArchetyp('mitte_wiederaufbau', { ...GEMEINSAM, name: 'Wiederaufbaustadt', entwurf: wiederaufbau,
  staedte: { Kassel: { fluss: 'ost', schloss: 'sued' }, Darmstadt: { schloss: 'mitte', denkmal: true }, Offenbach: { fluss: 'nord', schloss: 'mitte' }, Hanau: { fluss: 'nord', schloss: 'sued' } } });
registriereArchetyp('mosel_rhein', { ...GEMEINSAM, name: 'Stadt an Rhein und Mosel', entwurf: moselRhein, staedte: { Koblenz: { eck: true }, Trier: { roemisch: true } } });
registriereArchetyp('industrie_mitte', { ...GEMEINSAM, name: 'Industriestadt Mitte', entwurf: industrieMitte,
  staedte: {
    Ludwigshafen: { werk: 'chemie', fluss: 'ost' },
    'Saarbrücken': { werk: 'huette', schloss: true, kirche: 'barock', markt: true },
    Kaiserslautern: { werk: 'denkmal', kanal: true },
  } });
