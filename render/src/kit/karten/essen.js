// Q01 Phase 1: handgeführte Viertelzuordnung für Essen. OSM-Koordinaten: x Ost, z Süd, Meter.
export const ESSEN_ANSICHTEN = Object.freeze([
  { id: 'hbf', titel: 'Hauptbahnhof · Gleisharfe', pos: [185, 355], zoom: 205 },
  { id: 'kettwiger', titel: 'Kettwiger Straße · Fußgängerzone', pos: [85, 90], zoom: 125 },
  { id: 'rathaus', titel: 'Rathaus · Hochhaus', pos: [275, -355], zoom: 135 },
  { id: 'limbecker', titel: 'Limbecker Platz', pos: [-410, -374], zoom: 165 },
  { id: 'muenster', titel: 'Münster und Marktkirche', pos: [135, -105], zoom: 110 },
  { id: 'ruettenscheid', titel: 'Rüttenscheid · Gründerzeit', pos: [-230, 1120], zoom: 210 },
  { id: 'norden', titel: 'Norden · Zechensiedlung', pos: [670, -1260], zoom: 225 },
  { id: 'rand', titel: 'Rand · Kleingärten und Felder', pos: [-1310, -1050], zoom: 230 },
]);

export function viertelEssen(x, z, art = '') {
  if (art === 'industrie') return 'gewerbe';
  if (art === 'kleingarten' || art === 'feld') return art;
  if (x > -580 && x < 560 && z > -610 && z < 380) return 'kern';
  if (z > 380 && z < 1400 && x > -750 && x < 700) return 'gruenderzeit';
  if (z < -750 && x > 300) return 'zechensiedlung';
  if (Math.abs(x) > 1050 || z > 1400) return 'vorort';
  return z < -650 ? 'nachkrieg' : 'gruenderzeit';
}

export function kartenStandort(lage, nr = 0) {
  // Die 1a-Standorte liegen an der Kettwiger Straße oder am Limbecker Platz,
  // Center im westlichen Einkaufsbereich, Fachmarkt/FUNDUS im Retail Park.
  const punkte = {
    '1a': [[-5, 120], [110, 55], [-68, -15], [-250, -345], [135, -60], [-90, -215]],
    b: [[270, 95], [-200, 260], [360, -60], [-520, -80], [60, 520]],
    center: [[-530, -375], [-620, -520], [830, 520]],
    rand: [[-1150, 850], [1250, -900], [-1200, -1180], [1080, 1120]],
  };
  const a = punkte[lage] ?? punkte.b;
  return a[nr % a.length];
}

// Kartenstadt (Pilot 25.10.2026): Zielpunkte in OSM-Koordinaten (x Ost, z Süd, Meter um 51,4550 / 7,0120).
// Spielhäuser landen auf dem nächsten passenden echten Gebäude (kartenstadt.js bauplatz). Alle Punkte liegen in kameraGrenze.
export const ESSEN_KARTE = Object.freeze({
  standorte: {
    '1a': [[95, 215], [60, 30], [-60, -30], [-250, -345], [135, -60]],   // Kettwiger Straße, Limbecker Straße
    b: [[300, 110], [-210, 250], [380, -80], [-400, -60], [60, 480]],
    stadtteil: [[-300, 480], [450, 520]],
    center: [[-330, -260], [-300, -390], [480, 450]],                      // am Limbecker Platz
    rand: [[540, 500], [-400, 520], [560, -360]],
  },
  hq: [[420, 260], [500, 330], [-150, 450]],
  wahrzeichen: [[278.8, -355.4], [190.2, 371.4], [134.6, -103.5], [27.5, -255.6], [-412.6, -375.5], [-41.4, 39.0], [314.0, -160.3]],
  bahnhof: [185, 355], einkauf: [85, 90], start: [110, 250],
  kameraGrenze: [-450, -420, 620, 600], sicht: 360, kern: [85, 90, 520],
});
