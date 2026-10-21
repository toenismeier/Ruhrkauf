// Archetyp-Modul Nord: norddeutsche Stadttypen (Hansestadt, Hafenmetropole, Wiederaufbaustadt, Kleinstadt), ihre
// Flächen (Speicherzeile, Hafenkante, Backsteinkirche, Mühlenland), Slot-Bauer (nordbauten.js) und das Stilprofil
// 'nord' für die normalen Stadthäuser. Registriert sich beim Import (siehe archetypen/README.md und stadtplan.js).
//
// Jeder Nord-Entwurf setzt E.nordArt(i, j) → 'giebel' | 'fachwerk' | 'kontor' | 'wiederaufbau' | 'klinker' | 'rand'
// und optional E.einkaufArt (Art der Blöcke an der Einkaufslage). Das Stilprofil baut daraus Giebelhauszeilen,
// Kontorhäuser, Klinker-Rasterbauten der 50er, Rotklinker- und Bremer Häuser statt neutraler Stadthäuser.
// Rostock, Stralsund und Schwerin bleiben bei den Ost-Typen (archetypen/ost.js).
// Statt Math.hypot: IEEE-genaue Wurzel, damit Schwellenvergleiche in allen JS-Engines gleich ausfallen.
const wurzelSumme = (...v) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
import { registriereArchetyp, PLAN_HILFE as H } from '../stadtplan.js';
import { registriereSlots, registriereStilProfil } from '../bauer.js';
import { NORD_SLOTS } from '../nordbauten.js';
import { rng, waehle, zw } from '../basis.js';

const { nimm, fixiere, frei, zelleFrei, wasserSpalte, klemm, wahlGewichtet, neueParzelle, mergeRand, parzellenVon } = H;

// ====================================================================================
// Gemeinsame Einstellungen
// ====================================================================================
const NORD_VIERTEL = { giebel: 'altstadt', fachwerk: 'altstadt', kontor: 'zentrum', wiederaufbau: 'nord_wa', klinker: 'gruenderzeit', rand: 'rand' };
function nordGrund(E, typ, o = {}) {
  E.nord = typ;
  E.viertel = (i, j) => NORD_VIERTEL[E.nordArt(i, j)] ?? 'gruenderzeit';
  // Kirchen setzt jeder Entwurf selbst als Backsteinkirche (Fläche nordkirche)
  E.landmarkVerbot = new Set(['slot:kirche', 'slot:mall', ...(o.verbot ?? [])]);
  E.giebelV = o.giebel ?? 'luebeck';
  E.reihenV = o.reihen ?? ['schumacher', 'schumacher', 'bremer'];
  E.waV = o.wa ?? ['kiel', 'hannover', 'laubengang'];
  E.rathausV = o.rathaus ?? 'schauwand';
  E.speicherV = o.speicher ?? ['speicherstadt', 'giebel', 'schlicht'];
  E.brachen = 0;
  if (!E.landmarken.includes('slot:rathaus')) E.landmarken.push('slot:rathaus');
}
const dist = (i, j, c) => wurzelSumme(i - c.i, j - c.j);
/** Backsteinkirche auf Zelle (i, j); Zelle wird so groß, dass die Kirche in Nennmaß passt. */
function kirche(E, i, j, ex = {}) {
  if (!zelleFrei(E, i, j)) return false;
  const gross = ex.variante === 'marien' || ex.variante === 'doppelturm' || (!ex.variante && E.typ !== 'mittelstadt');
  E.spalten[i] = Math.max(E.spalten[i], gross ? 104 : 90);
  E.reihen[j] = Math.max(E.reihen[j], gross ? 70 : 60);
  nimm(E, { art: 'nordkirche', i0: i, i1: i, j0: j, j1: j, seiten: ex.seiten ?? ['-z', '-x'], ...ex });
  return true;
}
function flaeche(E, art, i0, i1, j0, j1, ex = {}) {
  if (i0 < 0 || j0 < 0 || i1 >= E.spalten.length || j1 >= E.reihen.length || !frei(E, i0, i1, j0, j1)) return null;
  // Speicher und Hafenkanten stehen direkt am Wasser: keine Uferstraße an der Wasserfront
  const ufer = (art === 'speicherzeile' || art === 'hafenkante') && ex.ohneUferstrasse === undefined ? { ohneUferstrasse: [ex.front ?? '+z'] } : {};
  return nimm(E, { art, i0, i1, j0, j1, ...ufer, ...ex });
}
/** Mühle und Bauernhof am Stadtrand: erste freie Eckzelle. */
function muehlenland(E, ecken) {
  for (const [i, j] of ecken) {
    if (!zelleFrei(E, i, j)) continue;
    E.spalten[i] = Math.max(E.spalten[i], 76); E.reihen[j] = Math.max(E.reihen[j], 60);
    nimm(E, { art: 'muehlenland', i0: i, i1: i, j0: j, j1: j });
    return true;
  }
  return false;
}

// ====================================================================================
// Entwürfe
// ====================================================================================
/**
 * Hansestadt (Lübeck, Lüneburg): Backsteinaltstadt mit Giebelhauszeilen, Markt mit Backsteinrathaus, mehrere
 * Backsteinkirchen mit Kupferhelmen, Wasser als Wallring (Insel zwischen zwei Flüssen) oder Fluss mit Wall,
 * Salzspeicher am Wasser, außen Klinkerviertel.
 */
function hanse(E) {
  const { r } = E;
  const nx = E.nx, nz = E.nz;
  E.spalten = E.spalten.map((w) => Math.round((w * zw(r, 0.72, 1.02)) / 2) * 2);
  E.reihen = E.reihen.map((d) => Math.round((d * zw(r, 0.72, 1.02)) / 2) * 2);
  const insel = E.o.form !== 'fluss';
  let c0, c1, iSp;
  if (insel) {
    c0 = 2; c1 = nx - 3;
    wasserSpalte(E, 1, 0, nz - 1, 'fluss');
    wasserSpalte(E, nx - 2, 0, nz - 1, 'kanal');
    iSp = 0;   // Salzspeicher am anderen Ufer, Front zum Fluss (+x)
  } else {
    c0 = 0; c1 = nx - 3;
    wasserSpalte(E, nx - 2, 0, nz - 1, 'kanal');
    iSp = nx - 3;   // Wasserviertel mit Speichern und Kran am Fluss
    for (let a = 0; a <= c1;) { const len = Math.min(c1 - a + 1, 1 + Math.floor(r() * 2.4)); nimm(E, { art: 'gruenguertel', i0: a, i1: a + len - 1, j0: 0, j1: 0, achse: 'x' }); a += len; }
  }
  const jSp = nz - 3;
  E.spalten[iSp] = Math.max(E.spalten[iSp], 48);
  flaeche(E, 'speicherzeile', iSp, iSp, jSp, jSp, { front: '+x', reihen: 1 });
  const zc = { i: (c0 + c1) / 2 + zw(r, -0.3, 0.3), j: (nz - 1) / 2 + zw(r, -0.4, 0.4) };
  const kern = (i, j) => i >= c0 && i <= c1 && (insel || j >= 1);
  // Wiederaufgebaute Lücken der Nachkriegszeit im Kern (Lübecker Gründerviertel)
  const wa = new Set();
  for (let k = 0; k < (E.typ === 'mittelstadt' ? 1 : 2); k++) wa.add(`${c0 + Math.floor(r() * (c1 - c0 + 1))},${Math.floor(r() * nz)}`);
  // Kirchen: Marienkirche am Markt, Dom am Kernende, weitere Pfarrkirchen
  const ci = Math.round(zc.i), cj = Math.round(zc.j);
  kirche(E, ci - 1, cj - 1, { variante: insel ? 'marien' : 'hallen', seiten: ['-z', '-x'] });
  kirche(E, c0, insel ? 0 : 1, { variante: insel ? 'doppelturm' : 'hallen', seiten: ['-z', '+x'] });
  if (E.typ !== 'mittelstadt') kirche(E, c1, cj + 1, { variante: 'hallen', seiten: ['-z', '-x'] });
  else kirche(E, c1, nz - 1, { variante: 'hallen', seiten: ['-z', '-x'] });
  E.versatz = (k, j) => (kern(k - 0.5, j) ? 12 : 4);
  E.einschub = (i, j) => (kern(i, j) ? 0.45 : 0.08);
  E.durchgang = 0.5;
  E.nordArt = (i, j) => {
    if (kern(i, j)) return wa.has(`${i},${j}`) ? 'wiederaufbau' : 'giebel';
    return dist(i, j, zc) < 3.6 ? 'klinker' : 'rand';
  };
  nordGrund(E, 'hanse', { giebel: insel ? 'luebeck' : 'lueneburg', rathaus: insel ? 'schauwand' : 'renaissance', speicher: ['giebel', 'giebel', 'speicherstadt'], verbot: ['slot:hochhaus', 'slot:tankstelle'] });
  E.einkaufArt = 'giebel';
  E.zentrum = zc;
  E.marktVariante = insel ? 'einer' : 'laenglich';
  E.umriss = 'voll';
  E.landmarkMax = 4;
}

/**
 * Hafenmetropole: Hamburg (Alster, Kontorhausviertel, Speicherstadt, Hafenkante an der Elbe), Bremen (Weser, Altstadt
 * mit Markt, Wallanlagen, Speicher der Überseestadt, Bremer Häuser), Bremerhaven (Hafen am Strom, Wiederaufbau-City).
 */
function hafenmetropole(E) {
  const { r } = E;
  const nx = E.nx, nz = E.nz;
  const form = E.o.form ?? 'alster';
  if (form === 'alster') {
    const jE = nz - 1, jS = nz - 2;
    E.reihen[jE] = Math.max(E.reihen[jE], 96);
    nimm(E, { art: 'wasser', form: 'fluss', i0: 0, i1: nx - 1, j0: jE, j1: jE, quer: true, keineBruecke: true });
    for (let k = 0; k <= nx; k++) fixiere(E, k, jS, jE);
    E.reihen[jS] = Math.max(E.reihen[jS], 96);
    const s0 = klemm(Math.floor(nx / 2) - 1, 2, nx - 5);
    flaeche(E, 'speicherzeile', s0, s0 + 1, jS, jS, { front: '+z', reihen: 2 });
    flaeche(E, 'hafenkante', s0 + 2, s0 + 3, jS, jS, { front: '+z', varianten: ['kai', 'fischmarkt'] });
    flaeche(E, 'hafenkante', s0 - 1, s0 - 1, jS, jS, { front: '+z', varianten: ['anleger'] });
    // Binnen- und Außenalster
    E.spalten[s0] = Math.max(E.spalten[s0], 90); E.spalten[s0 + 1] = Math.max(E.spalten[s0 + 1], 90);
    nimm(E, { art: 'wasser', form: 'see', i0: s0 - 1, i1: s0 + 2, j0: 0, j1: 0 });
    nimm(E, { art: 'wasser', form: 'see', i0: s0, i1: s0 + 1, j0: 1, j1: 1 });
    for (let k = 0; k <= nx; k++) fixiere(E, k);
    E.xTyp[jS] = 'haupt';
    E.zTyp[s0 + 3] = 'haupt';
    const zc = { i: s0 + 1, j: (2 + jS - 1) / 2 + 0.3 };
    kirche(E, s0 - 1, 3, { variante: 'hallen' });
    kirche(E, s0 + 3, jS - 2, { variante: 'marien' });
    kirche(E, s0 - 2, jS - 1, { variante: 'hallen', zustand: 'ruine', seiten: ['-z'] });
    E.nordArt = (i, j) => {
      const d = dist(i, j, zc);
      if (j >= 2 && j < jS && i >= s0 + 2 && i <= s0 + 4) return 'kontor';
      if (d < 1.6) return 'kontor';
      if (j >= 2 && j < jS && i <= s0 - 1 && i >= s0 - 3) return 'wiederaufbau';
      return d < 4.6 ? 'klinker' : 'rand';
    };
    nordGrund(E, 'hafenmetropole', { giebel: 'pastell', rathaus: 'renaissance', speicher: ['speicherstadt'], reihen: ['schumacher', 'schumacher', 'siedlung'], wa: ['hannover', 'laubengang', 'kiel'] });
    E.einkaufArt = 'kontor';
    E.zentrum = zc;
    E.marktVariante = 'einer';
  } else if (form === 'weser') {
    const jW = nz - 3, c = Math.floor(nx / 2);
    E.reihen[jW] = Math.max(E.reihen[jW], 66);
    nimm(E, { art: 'wasser', form: 'fluss', i0: 0, i1: nx - 1, j0: jW, j1: jW, quer: true, brueckeP: 0.55 });
    for (let k = 0; k <= nx; k++) fixiere(E, k, jW, jW);
    // Wallanlagen mit Wallgraben nördlich der Altstadt
    const jWall = jW - 4;
    if (jWall >= 0) {
      for (let i = Math.max(0, c - 2); i <= Math.min(nx - 1, c + 2); i++) {
        if (i === c + 1) { E.spalten[i] = Math.max(E.spalten[i], 50); nimm(E, { art: 'wasser', form: 'kanal', i0: i, i1: i, j0: jWall, j1: jWall }); }
        else nimm(E, { art: 'gruenguertel', i0: i, i1: i, j0: jWall, j1: jWall, achse: 'x' });
      }
    }
    flaeche(E, 'speicherzeile', 0, 1, jW - 1, jW - 1, { front: '+z', reihen: 1 });
    flaeche(E, 'hafenkante', 2, 2, jW - 1, jW - 1, { front: '+z', varianten: ['anleger'] });
    kirche(E, c - 1, jW - 3, { variante: 'doppelturm', seiten: ['-z', '+x'] });
    kirche(E, c + 2, jW - 2, { variante: 'hallen', seiten: ['-z', '-x'] });
    const kern = (i, j) => j > jWall && j < jW && Math.abs(i - c) <= 1.5;
    const zc = { i: c, j: jW - 1.6 };
    E.versatz = (k, j) => (kern(k - 0.5, j) ? 10 : 0);
    E.einschub = (i, j) => (kern(i, j) ? 0.35 : 0);
    E.durchgang = 0.4;
    E.nordArt = (i, j) => {
      if (kern(i, j)) return 'giebel';
      if (j > jWall && j < jW && Math.abs(i - c) <= 2.5) return 'kontor';
      return dist(i, j, zc) < 4.4 ? 'klinker' : 'rand';
    };
    nordGrund(E, 'hafenmetropole', { giebel: 'pastell', rathaus: 'renaissance', speicher: ['schlicht', 'speicherstadt'], reihen: ['bremer', 'bremer', 'schumacher'], wa: ['kiel', 'hannover'] });
    E.einkaufArt = null;
    E.zentrum = zc;
    E.marktVariante = 'einer';
  } else {
    // Bremerhaven: Rasterstadt am Strom, Hafenkante über die ganze Länge, Wiederaufbau-City
    const w = E.spalten[0], d = E.reihen[0];
    E.spalten = E.spalten.map(() => Math.round((w * zw(r, 0.92, 1.08)) / 2) * 2);
    E.reihen = E.reihen.map(() => Math.round((d * zw(r, 0.92, 1.08)) / 2) * 2);
    for (let k = 0; k <= nx; k++) fixiere(E, k);
    E.spalten[nx - 1] = Math.max(E.spalten[nx - 1], 80);
    nimm(E, { art: 'wasser', form: 'fluss', i0: nx - 1, i1: nx - 1, j0: 0, j1: nz - 1, keineBruecke: true });
    const iH = nx - 2;
    E.spalten[iH] = Math.max(E.spalten[iH], 62);
    flaeche(E, 'hafenkante', iH, iH, 0, 1, { front: '+x', varianten: ['kai'] });
    flaeche(E, 'speicherzeile', iH, iH, 2, 2, { front: '+x', reihen: 1 });
    flaeche(E, 'hafenkante', iH, iH, 4, 4, { front: '+x', varianten: ['anleger'] });
    flaeche(E, 'hafenkante', iH, iH, nz - 1, nz - 1, { front: '+x', varianten: ['leuchtturm'] });
    const kAx = Math.floor(nx / 2) - 1;
    E.zTyp[kAx] = 'boulevard';
    const zc = { i: kAx - 0.5, j: nz / 2 - 0.5 };
    kirche(E, kAx - 2, Math.round(zc.j) - 1, { variante: 'hallen' });
    E.nordArt = (i, j) => { const dd = dist(i, j, zc); return dd < 1.9 ? 'wiederaufbau' : dd < 3.4 ? 'klinker' : 'rand'; };
    nordGrund(E, 'hafenmetropole', { rathaus: 'schauwand', speicher: ['schlicht'], reihen: ['bremer', 'schumacher', 'siedlung'], wa: ['kiel', 'laubengang', 'hannover'] });
    E.einkaufArt = 'wiederaufbau';
    E.zentrum = zc;
    E.marktVariante = 'keiner';
  }
  E.umriss = 'voll';
}

/**
 * Wiederaufbaustadt (Kiel, Hannover, Braunschweig, Wolfsburg, Hildesheim, Neumünster): breite Straßen und Cityring,
 * Klinker-Rasterbauten der 50er, eine Traditionsinsel aus Giebel- oder Fachwerkhäusern, Kirchenruine als Mahnmal,
 * je nach Stadt Förde mit Anlegern (Kiel), Maschsee (Hannover), Okerumflut (Braunschweig) oder Kanal (Wolfsburg).
 */
function nordWiederaufbau(E) {
  const { r } = E;
  const nx = E.nx, nz = E.nz;
  const w = E.spalten[0], d = E.reihen[0];
  E.spalten = E.spalten.map(() => Math.round((w * zw(r, 0.9, 1.12)) / 2) * 2);
  E.reihen = E.reihen.map(() => Math.round((d * zw(r, 0.9, 1.12)) / 2) * 2);
  const o = E.o;
  if (o.lage === 'foerde') {
    E.spalten[nx - 1] = Math.max(E.spalten[nx - 1], 90);
    nimm(E, { art: 'wasser', form: 'fluss', i0: nx - 1, i1: nx - 1, j0: 0, j1: nz - 1, keineBruecke: true });
    E.spalten[nx - 2] = Math.max(E.spalten[nx - 2], 60);
    flaeche(E, 'hafenkante', nx - 2, nx - 2, 1, 2, { front: '+x', varianten: ['anleger', 'kai'] });
    flaeche(E, 'hafenkante', nx - 2, nx - 2, nz - 1, nz - 1, { front: '+x', varianten: ['leuchtturm'] });
  } else if (o.lage === 'see') {
    E.spalten[0] = Math.max(E.spalten[0], 80);
    nimm(E, { art: 'wasser', form: 'see', i0: 0, i1: 1, j0: nz - 2, j1: nz - 1 });
    nimm(E, { art: 'park', i0: 2, i1: 2, j0: nz - 1, j1: nz - 1 });
  } else if (o.lage === 'umflut') {
    wasserSpalte(E, 1, 0, nz - 1, 'kanal');
  } else if (o.lage === 'kanal') {
    E.reihen[0] = Math.max(E.reihen[0], 50);
    nimm(E, { art: 'wasser', form: 'kanal', i0: 0, i1: nx - 1, j0: 0, j1: 0, quer: true, brueckeP: 0.5 });
  }
  for (let k = 0; k <= nx; k++) fixiere(E, k);
  const zc = { i: (nx - 1) / 2 + (o.lage === 'foerde' ? -0.5 : 0.3), j: (nz - 1) / 2 + 0.2 };
  // Cityring der 50er und breite Achsen
  const a = Math.max(1, Math.round(zc.i - 1.5)), b = Math.min(nx - 1, Math.round(zc.i + 2.5));
  const c = Math.max(1, Math.round(zc.j - 1.5)), dd = Math.min(nz - 1, Math.round(zc.j + 2.5));
  E.zTyp[a] = 'ring'; E.zTyp[b] = 'ring'; E.xTyp[c] = 'ring'; E.xTyp[dd] = 'ring';
  if (E.T.tram && o.tram !== false) E.tram.push('z' + a);
  // Traditionsinsel, Kirchenruine, Marktkirche
  const ti = { i: Math.round(zc.i) - 1, j: Math.round(zc.j) - 1 };
  const ruine = o.ruine ?? r() < 0.6;
  kirche(E, ti.i + 2, ti.j, { variante: 'hallen', zustand: ruine ? 'ruine' : undefined, seiten: ['-z'] });
  kirche(E, ti.i - 1, ti.j + 1, { variante: o.dom ? 'doppelturm' : 'hallen', seiten: ['-z', '+x'] });
  const insel = new Set([`${ti.i},${ti.j}`, `${ti.i - 1},${ti.j}`, `${ti.i},${ti.j - 1}`]);
  // Traditionsinsel um einen wiederaufgebauten Marktplatz mit Rathaus (Hildesheim, Braunschweig)
  const eigenerMarkt = !!o.insel && zelleFrei(E, ti.i, ti.j) && !!nimm(E, { art: 'markt', i0: ti.i, i1: ti.i, j0: ti.j, j1: ti.j, seiten: ['-z', '-x'] });
  if (eigenerMarkt) { E.spalten[ti.i] = Math.max(E.spalten[ti.i], 70); E.reihen[ti.j] = Math.max(E.reihen[ti.j], 60); }
  E.versatz = (k, j) => (j === ti.j && (k === ti.i || k === ti.i + 1) ? 6 : 0);
  E.einschub = (i, j) => (insel.has(`${i},${j}`) ? 0.3 : 0);
  E.durchgang = 0.3;
  E.nordArt = (i, j) => {
    if (insel.has(`${i},${j}`)) return o.insel ?? 'giebel';
    const q = dist(i, j, zc);
    return q < 2.3 ? 'wiederaufbau' : q < 3.6 ? 'klinker' : 'rand';
  };
  nordGrund(E, 'nord_wiederaufbau', { giebel: o.giebel ?? 'luebeck', rathaus: o.rathaus ?? 'renaissance', wa: o.wa ?? ['kiel', 'hannover', 'laubengang'], reihen: ['schumacher', 'siedlung', 'schumacher'], speicher: ['schlicht'] });
  E.einkaufArt = 'wiederaufbau';
  E.zentrum = zc;
  E.marktVariante = eigenerMarkt ? 'keiner' : r() < 0.6 ? 'einer' : 'keiner';
  E.umriss = 'voll';
}

/**
 * Kleinstadt (Oldenburg, Osnabrück, Celle, Flensburg): kleine Backstein- oder Fachwerkaltstadt, Backsteinkirche,
 * Schloss wo vorhanden, Fördehafen mit Speichern (Flensburg), Windmühle und Bauernhof am Rand.
 */
function nordKleinstadt(E) {
  H.entwurf('altstadt', E);
  const { r } = E;
  const nx = E.spalten.length, nz = E.reihen.length;
  const o = E.o;
  if (o.lage === 'foerde') {
    const iW = nx - 1;
    if (!E.flaechen.some((f) => f.art === 'wasser' && f.i0 === iW)) { E.flaechen = E.flaechen.filter((f) => f.art !== 'wasser'); E.belegt = new Map([...E.belegt].filter(([, f]) => f.art !== 'wasser')); wasserSpalte(E, iW, 0, nz - 1, 'fluss'); }
    E.spalten[iW] = Math.max(E.spalten[iW], 80);
    const wf = E.flaechen.find((f) => f.art === 'wasser' && f.i0 === iW); if (wf) wf.keineBruecke = true;
    E.spalten[nx - 2] = Math.max(E.spalten[nx - 2], 58);
    flaeche(E, 'speicherzeile', nx - 2, nx - 2, 1, 1, { front: '+x', reihen: 1 });
    flaeche(E, 'hafenkante', nx - 2, nx - 2, nz - 2, nz - 2, { front: '+x', varianten: ['fischmarkt', 'anleger'] });
  }
  const zc = { ...E.zentrum };
  const kernR = E.typ === 'mittelstadt' ? 1.9 : 2.3;
  const ci = Math.round(zc.i), cj = Math.round(zc.j);
  kirche(E, ci + 1, cj - 1, { variante: E.typ === 'mittelstadt' ? 'hallen' : 'marien', seiten: ['-z', '-x'] });
  if (o.dom) kirche(E, ci - 1, cj - 1, { variante: 'doppelturm', seiten: ['-z', '+x'] });
  if (o.schloss) E.landmarken.push('slot:schloss');
  muehlenland(E, [[0, nz - 1], [nx - 1, nz - 1], [0, 0], [nx - 1, 0], [1, nz - 1]]);
  const v0 = E.viertel;
  E.nordArt = (i, j) => {
    const q = dist(i, j, zc);
    if (q < kernR) return o.altstadt ?? 'giebel';
    if (v0(i, j) === 'barock') return 'klinker';
    return q < kernR + 1.5 ? 'klinker' : 'rand';
  };
  nordGrund(E, 'nord_kleinstadt', { giebel: o.giebel ?? 'pastell', rathaus: o.rathaus ?? 'laube', reihen: ['bremer', 'siedlung', 'schumacher'], speicher: ['giebel', 'schlicht'], verbot: ['slot:hochhaus'] });
  E.einkaufArt = o.altstadt ?? 'giebel';
  E.marktVariante = 'einer';
  E.landmarkMax = 3;
  void r;
}

// ====================================================================================
// Parzellierung der bebauten Blöcke
// ====================================================================================
const SEITEN = ['+z', '+x', '-z', '-x'];
function gemischt(rb) { const l = SEITEN.slice(); for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(rb() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l; }

function parzellierung(ctx, E, b) {
  const art = E.nordArt ? E.nordArt(b.i0, b.j0) : 'rand';
  const ein = (ctx.einkaufSlots?.length ?? 0) > 0 || !!E.einkaufKern?.(b.i0, b.j0);
  b.nordArt = ein && E.einkaufArt ? E.einkaufArt : art;
  b.nordEinkauf = ein;
  const parz = { giebel: [7, 13], fachwerk: [7, 13], kontor: [12, 26], wiederaufbau: [14, 30], klinker: [10, 22], rand: [10, 24] }[b.nordArt];
  if (parz) ctx.parz = parz;
  return false;
}

/** Nach der Blockrandbebauung: Kontorhäuser, 50er-Zeilen, Rotklinker-Blöcke, Lückenbauten in der Altstadt. */
function nachbearbeitung(ctx, E, b) {
  const { rb } = ctx;
  const art = b.nordArt, ein = b.nordEinkauf;
  const ex = { landmarke: false };
  if (art === 'kontor') {
    // ein Kontorhaus je Block (in der Einkaufslage immer, sonst jeder zweite Block): Klinkerkathedralen sind schwer
    const n = ein || rb() < 0.55 ? 1 : 0;
    for (let k = 0; k < n; k++) {
      const variante = E.typ === 'metropole' && rb() < 0.22 ? 'turm' : waehle(rb, ['block', 'block', 'spitz']);
      if (!mergeRand(ctx, 'slot:nord_kontorhaus', [34, 66], 26, gemischt(rb), { ...ex, variante })) break;
    }
  } else if (art === 'wiederaufbau') {
    const n = ein ? 2 : 1 + (rb() < 0.6 ? 1 : 0);
    for (let k = 0; k < n; k++) {
      const variante = ein && rb() < 0.7 ? 'geschaeft' : waehle(rb, E.waV);
      if (!mergeRand(ctx, 'slot:nord_wiederaufbau', [22, 48], variante === 'geschaeft' ? 18 : 14, gemischt(rb), { ...ex, variante })) break;
    }
  } else if (art === 'klinker') {
    if (rb() < 0.55) mergeRand(ctx, 'slot:nord_reihenhaus', [26, 56], 16, gemischt(rb), { ...ex, variante: waehle(rb, E.reihenV) });
  } else if ((art === 'giebel' || art === 'fachwerk') && ein && rb() < 0.45) {
    // Nachkriegslücke in der Hauptgeschäftsstraße: 50er-Geschäftshaus mit Klinkerraster
    mergeRand(ctx, 'slot:nord_wiederaufbau', [16, 26], 14, ['+z', '+x'], { ...ex, variante: 'geschaeft' });
  }
  if (art === 'giebel' && b.hof && b.hof.art === 'gruen' && rb() < 0.4) b.hof.art = 'pflaster';   // Gänge und Höfe
}

function parzelleMarkieren(p, bl, E) {
  p.stilProfil = 'nord';
  p.nordArt = bl?.nordArt ?? (bl && E.nordArt ? E.nordArt(bl.i0, bl.j0) : null) ?? 'rand';
  p.nordEinkauf = !!bl?.nordEinkauf;
  p.nordTyp = E.nord;
  p.giebelV = E.giebelV; p.reihenV = E.reihenV; p.waV = E.waV;
  if (p.typ === 'slot:rathaus') Object.assign(p, { typ: 'slot:nord_rathaus', sonder: 'nord_rathaus', variante: E.rathausV, front: [p.front?.[0] ?? '+z'] });
}

// ====================================================================================
// Stilprofil 'nord' für die normalen Stadthäuser
// ====================================================================================
function nordBau(p, typ, variante, stil, geschosse, extra = {}) {
  return {
    bau: (S, scene, q) => {
      const e = NORD_SLOTS[typ](S, scene, { ...q, front: p.front?.[0] ?? '+z', variante, ...extra });
      return { hoehe: e.hoehe, stil, geschosse, farbe: null };
    },
  };
}
function nordStil(p) {
  const r = rng(((p.seed ?? 1) * 2654435761 + 4243) >>> 0);
  const art = p.nordArt ?? 'rand';
  const eck = p.typ === 'eck', hof = p.typ === 'hofhaus';
  const f = p.front?.[0] ?? '+z';
  const L = f[1] === 'x' ? p.d : p.w, T = f[1] === 'x' ? p.w : p.d;
  const metro = p.cluster === 'metropole', klein = p.cluster === 'mittelstadt';
  const g = (a, b) => Math.round(a + (b - a) * r()) + (metro ? 1 : 0) - (klein && b > 3 ? 1 : 0);
  const haus = (stil, geschosse) => ({ stil, geschosse: Math.max(2, Math.min(7, geschosse)), region: 'Nord' });
  if (hof) return haus(r() < 0.7 ? 'backstein' : 'fuenfziger', 2);
  const zeile = !eck && p.front?.length === 1 && T >= 10;
  if (art === 'giebel' || art === 'fachwerk') {
    if (zeile && L >= 6.5) {
      if (art === 'fachwerk' && r() < 0.55) return haus('fachwerk', g(2, 3));
      return nordBau(p, 'slot:nord_giebelhaus', art === 'fachwerk' ? 'pastell' : r() < 0.18 ? 'pastell' : p.giebelV, 'nordgiebel', 3, { laden: p.nordEinkauf ? 0.85 : undefined });
    }
    return haus(art === 'fachwerk' && r() < 0.5 ? 'fachwerk' : 'backstein', g(3, 4));
  }
  if (art === 'kontor') {
    if (eck) return haus('backstein', g(5, 6));
    return haus(r() < 0.72 ? 'backstein' : 'gruenderzeit', g(4, 6));
  }
  if (art === 'wiederaufbau') {
    if (eck) return haus(r() < 0.8 ? 'backstein' : 'fuenfziger', g(4, 5));
    if (zeile && L >= 12 && r() < 0.9) {
      const v = p.nordEinkauf && r() < 0.6 ? 'geschaeft' : waehle(r, p.waV ?? ['kiel', 'hannover']);
      return nordBau(p, 'slot:nord_wiederaufbau', v, 'nordwa', 4);
    }
    return haus(wahlGewichtet(r, [['backstein', 3], ['fuenfziger', 0.8], ['wiederaufbau', 0.5]]), g(3, 5));
  }
  if (art === 'klinker') {
    if (zeile && L >= 10 && r() < 0.8) return nordBau(p, 'slot:nord_reihenhaus', waehle(r, p.reihenV ?? ['schumacher']), 'nordklinker', 3);
    if (eck) return haus(r() < 0.7 ? 'backstein' : 'gruenderzeit', g(3, 5));
    return haus(wahlGewichtet(r, [['backstein', 3], ['gruenderzeit', 1.4], ['jugendstil', 0.5], ['fuenfziger', 0.6]]), g(3, 5));
  }
  // Stadtrand: Klinkersiedlungen, Zeilen der 50er, einige Neubauten
  if (zeile && L >= 10 && r() < 0.75) return nordBau(p, 'slot:nord_reihenhaus', r() < 0.6 ? 'siedlung' : waehle(r, p.reihenV ?? ['schumacher']), 'nordklinker', 2);
  return haus(wahlGewichtet(r, [['backstein', 2.2], ['fuenfziger', 1.2], ['siebziger', 0.5], ['neubau', 0.6], ['wiederaufbau', 0.6]]), g(2, 4));
}
registriereStilProfil('nord', (p) => nordStil(p));

// ====================================================================================
// Flächen: Parzellierung und Boden
// ====================================================================================
/** Rechteck [x0, z0, x1, z1] minus Loch als bis zu vier Rechtecke. */
function ohne(R, L) {
  const [x0, z0, x1, z1] = R;
  const a0 = Math.max(L[0], x0), a1 = Math.min(L[2], x1), b0 = Math.max(L[1], z0), b1 = Math.min(L[3], z1);
  if (a0 >= a1 - 0.01 || b0 >= b1 - 0.01) return [R];
  return [[x0, z0, x1, b0], [x0, b1, x1, z1], [x0, b0, a0, b1], [a1, b0, x1, b1]].filter(([p, q, s, t]) => s - p > 0.01 && t - q > 0.01);
}
/**
 * Gehwegring und Geländeplatte eines Blocks mit Aussparungen unter dem abgesenkten Wasser der Slots
 * (erg.wasser der Speicher und Hafenkanten, gemeldet über FLAECHEN[art].nachBau).
 */
function plattePlusWasser(ctx, b, wasser, B, farbe) {
  const { S } = ctx;
  const g = { '-x': b.rand['-x']?.gehweg ?? 2.5, '+x': b.rand['+x']?.gehweg ?? 2.5, '-z': b.rand['-z']?.gehweg ?? 2.5, '+z': b.rand['+z']?.gehweg ?? 2.5 };
  const X0 = b.x, Z0 = b.z, X1 = b.x + b.w, Z1 = b.z + b.d;
  const x0 = X0 - g['-x'], x1 = X1 + g['+x'], z0 = Z0 - g['-z'], z1 = Z1 + g['+z'];
  for (const [a, c, e, h] of [[x0, z0, x1, Z0], [x0, Z1, x1, z1], [x0, Z0, X0, Z1], [X1, Z0, x1, Z1]]) {
    if (e - a < 0.05 || h - c < 0.05) continue;
    S.quader(a, -0.6, c, e, 0.3, h, B.F.bord);
    S.quader(Math.max(a, x0 + 0.3), 0.3, Math.max(c, z0 + 0.3), Math.min(e, x1 - 0.3), B.YG, Math.min(h, z1 - 0.3), B.F.gehweg);
  }
  let stuecke = [[X0, Z0, X1, Z1]];
  for (const w of wasser) stuecke = stuecke.flatMap((R) => ohne(R, w));
  for (const [a, c, e, h] of stuecke) S.quader(a, -0.6, c, e, 0.3, h, farbe);
  return stuecke;
}

/** Speicherzeile: Reihen von Speichern mit Fleet an der Front, Front zur echten Wasserseite. */
function parzSpeicher(ctx, E, b) {
  const { rb } = ctx;
  b.nordArt = 'speicher';
  const f = b.front ?? '+z', quer = f[1] === 'x';
  const L = quer ? b.d : b.w, T = quer ? b.w : b.d;
  // so viele Reihen, wie die Fläche fasst (b.reihen ist das Minimum), sonst bleibt hinter den Speichern leeres Pflaster
  const n = Math.max(1, Math.max(b.reihen ?? 1, Math.floor((T - 2) / 38)));
  const rowT = n === 1 ? Math.min(T - 2, 46) : (T - 2) / n;
  const segs = [];
  for (let u = 2; L - 2 - u >= 30;) {
    let l = Math.min(L - 2 - u, Math.round(zw(rb, 42, 62)));
    if (L - 2 - u - l < 30) l = L - 2 - u;
    segs.push([u, l]); u += l + 7;
  }
  for (let k = 0; k < n; k++) for (const [u, l] of segs) {
    const variante = waehle(rb, E.speicherV ?? ['speicherstadt']);
    const zustand = rb() < 0.3 ? 'umgenutzt' : undefined;
    const t0 = k * rowT;
    let x, z, w, d;
    if (quer) { w = rowT; d = l; x = f === '+x' ? b.x + b.w - t0 - rowT : b.x + t0; z = b.z + u; }
    else { w = l; d = rowT; z = f === '+z' ? b.z + b.d - t0 - rowT : b.z + t0; x = b.x + u; }
    neueParzelle(ctx, 'slot:nord_speicher', x, z, w, d, [f], 'frei', { klasse: 4, variante, zustand, landmarke: false });
  }
}
/** Hafenkante: Kai, Anleger, Fischmarkt oder Mole mit Leuchtturm an der Front, dahinter Lagerplatz mit Containern. */
function parzHafen(ctx, E, b) {
  const { rb } = ctx;
  b.nordArt = 'hafen';
  const f = b.front ?? '+z', quer = f[1] === 'x';
  const L = quer ? b.d : b.w, T = quer ? b.w : b.d;
  const tief = Math.min(T - 2, 52);
  const liste = b.varianten ?? ['kai'];
  const n = L >= 150 ? 2 : 1;
  const l = (L - 2 - (n - 1) * 4) / n;
  for (let k = 0; k < n; k++) {
    const u = 1 + k * (l + 4);
    const variante = liste[k % liste.length];
    const x = quer ? (f === '+x' ? b.x + b.w - tief : b.x) : b.x + u, z = quer ? b.z + u : (f === '+z' ? b.z + b.d - tief : b.z);
    neueParzelle(ctx, 'slot:nord_hafen', x, z, quer ? tief : l, quer ? l : tief, [f], 'frei', { klasse: 4, variante, landmarke: false });
  }
  b.lager = quer ? { x: f === '+x' ? b.x + 1 : b.x + tief + 1, z: b.z + 2, w: T - tief - 3, d: L - 4 } : { x: b.x + 2, z: f === '+z' ? b.z + 1 : b.z + tief + 1, w: L - 4, d: T - tief - 3 };
}
function nachBauHafen(ctx, b, wasser, B) {
  const { S, I } = ctx;
  const r = rng(b.seed + 515);
  plattePlusWasser(ctx, b, wasser, B, b.art === 'hafenkante' ? '#b9b6ae' : '#cdc6b6');
  const P = b.lager;
  if (b.art === 'speicherzeile') {
    // Pflasterfläche zwischen den Speichern: Leute, Laternen
    for (let i = 0, n = Math.round((b.w + b.d) / 10 * ctx.dichte); i < n; i++) {
      const x = B.zw(r, b.x + 1, b.x + b.w - 1), z = B.zw(r, b.z + 1, b.z + b.d - 1);
      if (!(ctx.proBlock.get(b.id) ?? []).some((p) => B.imRechteck(x, z, p, 0.6))) B.figur(I, x, 0.32, z, r);
    }
    return;
  }
  if (!P || P.w < 8 || P.d < 8) return;
  S.quader(P.x, 0.3, P.z, P.x + P.w, 0.34, P.z + P.d, '#a7a59f');
  // Containerstapel und ein Lagerschuppen
  const entlangX = P.w >= P.d;
  for (let a = 3; a < (entlangX ? P.w : P.d) - 6; a += 7.5) {
    if (r() < 0.25) continue;
    for (let q = 0; q < Math.max(1, Math.floor(((entlangX ? P.d : P.w) - 4) / 3.2)); q++) {
      const lagen = 1 + Math.floor(r() * 2.6);
      for (let k = 0; k < lagen; k++) {
        const x = entlangX ? P.x + a : P.x + 2 + q * 3.2 + 1.2, z = entlangX ? P.z + 2 + q * 3.2 + 1.2 : P.z + a;
        S.box(entlangX ? 6 : 2.4, 2.5, entlangX ? 2.4 : 6, x, 0.34 + 1.25 + k * 2.55, z, waehle(r, ['#b5523f', '#2f6f8f', '#3f7d56', '#d9a33a', '#8c9aa6', '#e9e5dc', '#5b4a8f']));
      }
    }
  }
}
function bodenSpeicher() {}

/** Backsteinkirche auf dem Kirchplatz, Randbebauung an seiten (Häuser mit Front zum Platz). */
function parzKirche(ctx, E, b) {
  b.nordArt = E.nordArt ? E.nordArt(b.i0, b.j0) : 'giebel';
  const seiten = b.seiten ?? ['-z', '-x'];
  const um = { '-z': '+z', '-x': '+x', '+z': '-z', '+x': '-x' };
  const frontUm = {}; for (const s of seiten) frontUm[s] = um[s];
  const t = H.parzelliere(ctx, seiten, [], frontUm);
  b.platz = { x: b.x + t['-x'], z: b.z + t['-z'], w: b.w - t['-x'] - t['+x'], d: b.d - t['-z'] - t['+z'] };
  const P = b.platz;
  const L = Math.min(80, P.w - 8), Bk = Math.min(42, P.d - 8);
  const variante = b.variante ?? (L >= 70 && Bk >= 36 ? 'marien' : L >= 56 ? 'hallen' : 'dorf');
  neueParzelle(ctx, 'slot:nord_kirche', P.x + (P.w - L) * 0.4, P.z + (P.d - Bk) * 0.4, L, Bk, ['+x'], 'frei', { klasse: 5, variante, zustand: b.zustand, landmarke: true });
}
function bodenKirche(ctx, b, r, teile, B) {
  const { I } = ctx;
  const P = b.platz ?? b, y = 0.34;
  B.pflasterFlaeche(ctx, P, y, '#d8d0c0', 5);
  const k = teile.find((p) => p.typ === 'slot:nord_kirche');
  const frei = (x, z, rad) => !teile.some((p) => B.imRechteck(x, z, p, rad));
  for (let x = P.x + 4; x < P.x + P.w - 3; x += 8.5) { const z = P.z + P.d - 3.2; if (frei(x, z, 2.6)) B.baumSetzen(I, 'linde', x, y, z, r, 0.85, true); }
  for (let z = P.z + 4; z < P.z + P.d - 6; z += 8.5) { const x = P.x + P.w - 3.2; if (frei(x, z, 2.6)) B.baumSetzen(I, 'linde', x, y, z, r, 0.85, true); }
  for (let i = 0, n = Math.round((P.w * P.d) / 60 * ctx.dichte); i < n; i++) { const x = B.zw(r, P.x + 1, P.x + P.w - 1), z = B.zw(r, P.z + 1, P.z + P.d - 1); if (frei(x, z, 0.6)) B.figur(I, x, y, z, r); }
  void k;
}

/** Mühlenland am Stadtrand: Windmühle und niederdeutsches Hallenhaus auf Wiese, Knicks und Felder. */
function parzMuehle(ctx, E, b) {
  const { rb } = ctx;
  b.nordArt = 'land';
  const mw = Math.min(34, b.w * 0.42), md = Math.min(32, b.d - 6);
  neueParzelle(ctx, 'slot:nord_windmuehle', b.x + b.w - mw - 2, b.z + b.d - md - 2, mw, md, ['+z'], 'frei', { klasse: 2, variante: waehle(rb, ['galerie', 'erd', 'galerie', 'bock']), landmarke: true });
  const bw = Math.min(40, b.w - mw - 8), bd = Math.min(40, b.d - 6);
  const v = bw >= 36 && bd >= 32 ? 'hof' : bd >= 30 && bw >= 20 ? waehle(rb, ['fachhalle', 'backstein']) : 'friesen';
  if (bw >= 18) neueParzelle(ctx, 'slot:nord_bauernhaus', b.x + 3, b.z + b.d - bd - 2, bw, bd, ['+z'], 'frei', { klasse: 2, variante: v, landmarke: false });
}
function bodenMuehle(ctx, b, r, teile, B) {
  const { S, I } = ctx;
  S.quader(b.x, 0, b.z, b.x + b.w, 0.36, b.z + b.d, '#a9cc8c');
  // Felder hinter den Höfen
  const zf = Math.min(...teile.map((p) => p.z), b.z + b.d) - 2;
  const farben = ['#d9c87a', '#b9cf7e', '#c9b46a', '#9fc27a'];
  let x = b.x + 2, k = 0;
  while (x < b.x + b.w - 6 && zf - b.z > 8) { const w = Math.min(b.x + b.w - 2 - x, B.zw(r, 12, 22)); S.quader(x, 0.36, b.z + 2, x + w - 1, 0.42, zf, farben[k++ % farben.length]); for (let q = x + 1.5; q < x + w - 2; q += 2.4) S.quader(q, 0.42, b.z + 2.5, q + 0.5, 0.46, zf - 0.5, '#c2ad5e'); x += w; }
  // Knick (Wallhecke) an zwei Seiten
  for (let u = b.x + 2; u < b.x + b.w - 2; u += 2.2) if (!teile.some((p) => B.imRechteck(u, b.z + b.d - 1, p, 1))) I.setze('busch', u, 0.36, b.z + b.d - 1, 0, B.zw(r, 0.8, 1.2), ['#5d9450']);
  for (let u = b.z + 2; u < b.z + b.d - 2; u += 2.2) if (!teile.some((p) => B.imRechteck(b.x + b.w - 1, u, p, 1))) I.setze('busch', b.x + b.w - 1, 0.36, u, 0, B.zw(r, 0.8, 1.2), ['#5d9450']);
  for (let i = 0; i < 5; i++) { const xx = B.zw(r, b.x + 3, b.x + b.w - 3), zz = B.zw(r, b.z + 3, b.z + b.d - 3); if (!teile.some((p) => B.imRechteck(xx, zz, p, 3))) B.baumSetzen(I, waehle(r, ['linde', 'kastanie', 'pappel']), xx, 0.36, zz, r, 1); }
}

// ====================================================================================
// Registrierung
// ====================================================================================
registriereSlots(NORD_SLOTS);

const GEMEINSAM = {
  gewicht: [0, 0, 0], parzellierung, nachbearbeitung, parzelleMarkieren,
  viertel: { nord_wa: { dk: 0.4, var: 0.35, stile: [['nachkrieg', 1]], fachwerk: 0 } },
  flaechen: {
    speicherzeile: { parzelliere: parzSpeicher, boden: bodenSpeicher, ohneGehwegPlatte: true, nachBau: nachBauHafen },
    hafenkante: { parzelliere: parzHafen, boden: bodenSpeicher, ohneGehwegPlatte: true, nachBau: nachBauHafen },
    nordkirche: { parzelliere: parzKirche, boden: bodenKirche },
    muehlenland: { parzelliere: parzMuehle, boden: bodenMuehle },
  },
};
const LAND = { umland: 'land' }, SEE = { umland: 'see' };
registriereArchetyp('hanse', { ...GEMEINSAM, name: 'Hansestadt', entwurf: hanse,
  staedte: { 'Lübeck': { ...SEE, form: 'insel' }, 'Lüneburg': { ...LAND, form: 'fluss' } } });
registriereArchetyp('hafenmetropole', { ...GEMEINSAM, name: 'Hafenmetropole', entwurf: hafenmetropole,
  staedte: { Hamburg: { ...LAND, form: 'alster' }, Bremen: { ...LAND, form: 'weser' }, Bremerhaven: { ...SEE, form: 'strom' } } });
registriereArchetyp('nord_wiederaufbau', { ...GEMEINSAM, name: 'Wiederaufbaustadt Nord', entwurf: nordWiederaufbau,
  staedte: {
    Kiel: { ...SEE, lage: 'foerde', wa: ['kiel', 'kiel', 'laubengang'], ruine: false },
    Hannover: { ...LAND, lage: 'see', wa: ['hannover', 'hannover', 'laubengang'], ruine: true },
    Braunschweig: { ...LAND, lage: 'umflut', ruine: false, insel: 'fachwerk' },
    Wolfsburg: { ...LAND, lage: 'kanal', wa: ['laubengang', 'kiel', 'hannover'], ruine: false, insel: 'giebel', tram: false },
    Hildesheim: { ...LAND, insel: 'fachwerk', dom: true, ruine: true, tram: false },
    'Neumünster': { ...LAND, wa: ['kiel', 'laubengang'] },
  } });
registriereArchetyp('nord_kleinstadt', { ...GEMEINSAM, name: 'Kleinstadt Nord', entwurf: nordKleinstadt,
  staedte: {
    Oldenburg: { ...LAND, schloss: true, giebel: 'pastell', rathaus: 'renaissance' },
    'Osnabrück': { ...LAND, dom: true, giebel: 'luebeck', rathaus: 'schauwand' },
    Celle: { ...LAND, schloss: true, altstadt: 'fachwerk', rathaus: 'renaissance' },
    Flensburg: { ...SEE, lage: 'foerde', giebel: 'luebeck', rathaus: 'laube' },
  } });
