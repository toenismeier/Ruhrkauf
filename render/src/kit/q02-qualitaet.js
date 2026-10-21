// Q02: Prüfdaten aus tatsächlich erzeugten Gleisen, Fahrzeugen, Dachaufbauten und Flächenmustern.
// Reine Geometrieprüfung; verwendet selbst keinen Zufall. Alle Koordinaten sind Weltmeter.
const EPS = 0.16;
const deckt = (a, b) => a.achse === b.achse && Math.abs(a.mitte - b.mitte) <= (a.toleranz ?? EPS)
  && a.von >= b.von - EPS && a.bis <= b.bis + EPS;
const enthaelt = (s, x, z, rand = 0) => s.achse === 'x'
  ? x >= s.von + rand - EPS && x <= s.bis - rand + EPS && Math.abs(z - s.mitte) < (s.breite ?? 2) / 2 + EPS
  : z >= s.von + rand - EPS && z <= s.bis - rand + EPS && Math.abs(x - s.mitte) < (s.breite ?? 2) / 2 + EPS;

/** Echte Kontrollwerte aus Bauprotokollen. Rückgabe enthält die problematischen Objekte zur Diagnose. */
export function pruefeQualitaetsdaten(daten) {
  const d = { gleise: [], draehte: [], fahrzeuge: [], gleisenden: [], daecher: [], gruppen: [], ...daten };
  const fehler = { gleisende: [], oberleitung: [], fahrzeug: [], dach: [], wiederholung: [] };
  for (const e of d.gleisenden) if (!['prellbock', 'wendeschleife', 'anschluss', 'kartenrand'].includes(e.abschluss)) fehler.gleisende.push(e);
  for (const e of d.draehte) if (!d.gleise.some((g) => deckt(e, g))) fehler.oberleitung.push(e);
  for (const f of d.fahrzeuge) {
    const spuren = f.art === 'zug' || f.art === 'tram' ? d.gleise : d.fahrbahnen ?? [];
    const halbeLaenge = (f.laenge ?? 0) / 2;
    if (!spuren.some((g) => enthaelt(g, f.x, f.z, halbeLaenge))) fehler.fahrzeug.push(f);
  }
  for (const a of d.daecher) {
    const r = a.dach, x0 = a.x - a.w / 2, x1 = a.x + a.w / 2, z0 = a.z - a.d / 2, z1 = a.z + a.d / 2;
    if (!r || r.steil || a.w <= 0 || a.d <= 0 || a.h <= 0
      || Math.abs(a.unten - r.y) > EPS || x0 < r.x0 + 0.4 - EPS || x1 > r.x1 - 0.4 + EPS
      || z0 < r.z0 + 0.4 - EPS || z1 > r.z1 - 0.4 + EPS) fehler.dach.push(a);
  }
  const zellen = new Map();
  for (const g of d.gruppen) {
    const k = Math.floor(g.x / 100) + ':' + Math.floor(g.z / 100);
    if (!zellen.has(k)) zellen.set(k, []);
    zellen.get(k).push(g.muster);
  }
  for (const [zelle, muster] of zellen) {
    if (muster.length < 7) continue;
    const n = new Map();
    for (const m of muster) n.set(m, (n.get(m) ?? 0) + 1);
    const identisch = [...n.values()].reduce((a, v) => a + Math.max(0, v - 1), 0);
    if (identisch / muster.length > 0.15 + 1e-9) fehler.wiederholung.push({ zelle, identisch, gesamt: muster.length, anteil: identisch / muster.length });
  }
  return { werte: {
    'Offene Gleisenden ohne Abschluss': fehler.gleisende.length,
    'Oberleitung ohne Gleis': fehler.oberleitung.length,
    'Fahrzeuge außerhalb Fahrbahn/Gleis': fehler.fahrzeug.length,
    'Dachaufbauten außerhalb Dachfläche': fehler.dach.length,
    'Wiederholung über 15 %': fehler.wiederholung.length,
  }, fehler };
}

/** Gleisführung an einer Kreuzung: einseitige Zufahrt endet in der Mitte, nicht auf der Gegenseite. */
export function tramArme(k) {
  const teile = [];
  for (const [achse, minus, plus, mitte, quer, halb] of [
    ['z', '-z', '+z', k.z, k.x, k.bz / 2],
    ['x', '-x', '+x', k.x, k.z, k.bx / 2],
  ]) {
    const a = !!k.arme?.[minus]?.tram, b = !!k.arme?.[plus]?.tram;
    if (!a && !b) continue;
    if (a && b) teile.push({ achse, mitte: quer, von: mitte - halb, bis: mitte + halb, ende: [] });
    else teile.push({ achse, mitte: quer, von: a ? mitte - halb : mitte, bis: b ? mitte + halb : mitte, ende: [mitte] });
  }
  return teile;
}

/** Dachmaß und Installationsabstand für alle Flachdachvarianten. */
export function dachPasst(dach, x, z, w, d, rand = 0.7) {
  return dach && !dach.steil && w > 0 && d > 0
    && x - w / 2 >= dach.x0 + rand && x + w / 2 <= dach.x1 - rand
    && z - d / 2 >= dach.z0 + rand && z + d / 2 <= dach.z1 - rand;
}

export function neueQualitaetsdaten() {
  return { gleise: [], draehte: [], gleisenden: [], fahrzeuge: [], fahrbahnen: [], daecher: [], gruppen: [] };
}
