// Ersatz für die Engine-Abfragen aus EINKAUF-VERTRAG.md, solange src/einkauf.ts und src/eigenmarken.ts fehlen.
// Gleiche Namen und Formen wie im Vertrag: einkaufUebersicht(s, filter), wgDetail(s, wgId), s.einkauf.freigaben,
// eigenmarkenUebersicht(s), fuehreAusEinkauf(s, aktion). Hält seinen Zustand in s.einkauf und s.eigenmarken (nur Prototyp).
// Deterministisch, Euro als ganze Zahlen. Wird von quelle.js nur benutzt, wenn die Engine die Abfragen nicht exportiert.

const ROH = {
  damen: [['Jacken und Mäntel', 0.16, 0.25], ['Kleider', 0.12, 0.2], ['Blusen', 0.1, 0.35], ['Strick', 0.12, 0.3], ['Hosen', 0.12, 0.45], ['Denim', 0.1, 0.55], ['Young Fashion', 0.12, 0.15], ['Große Größen', 0.1, 0.4], ['Trachten', 0.06, 0.1]],
  herren: [['Business', 0.22, 0.35], ['Casual', 0.24, 0.3], ['Hemden', 0.16, 0.6], ['Hosen', 0.14, 0.55], ['Strick', 0.1, 0.3], ['Jacken', 0.14, 0.2]],
  waesche: [['Tagwäsche', 0.3, 0.75], ['Nachtwäsche', 0.2, 0.5], ['Mieder', 0.18, 0.7], ['Herrenwäsche', 0.17, 0.8], ['Strümpfe', 0.15, 0.85]],
  accessoires: [['Damenschuhe', 0.32, 0.3], ['Herrenschuhe', 0.2, 0.4], ['Lederwaren', 0.18, 0.5], ['Schmuck und Uhren', 0.2, 0.6], ['Reisegepäck', 0.1, 0.6]],
  kinder: [['Baby', 0.26, 0.6], ['Mädchen', 0.3, 0.35], ['Jungen', 0.28, 0.35], ['Kinderschuhe', 0.16, 0.45]],
  wohnen: [['Tisch und Küche', 0.3, 0.75], ['Heimtextil', 0.2, 0.5], ['Bettwaren', 0.16, 0.8], ['Leuchten und Deko', 0.18, 0.3], ['Elektrokleingeräte', 0.16, 0.85]],
  beauty: [['Parfüm', 0.5, 0.85], ['Pflege', 0.32, 0.9], ['Drogerie', 0.18, 0.95]],
  food: [['Delikatessen', 0.45, 0.9], ['Wein und Spirituosen', 0.3, 0.9], ['Süßwaren', 0.25, 0.8]],
  spielwaren: [['Klein- und Spielzeug', 0.4, 0.7], ['Lizenzware', 0.35, 0.4], ['Saisonartikel', 0.25, 0.1]],
  sport: [['Fitness', 0.4, 0.6], ['Bademode', 0.25, 0.2], ['Sportbekleidung', 0.35, 0.4]],
  sportschuhe: [['Laufschuhe', 0.45, 0.6], ['Sneaker', 0.55, 0.45]],
  sporttextil: [['Funktionsbekleidung', 0.5, 0.5], ['Freizeitbekleidung', 0.5, 0.35]],
  outdoor: [['Outdoorjacken', 0.55, 0.3], ['Ausrüstung', 0.45, 0.65]],
  rad: [['Fahrräder', 0.7, 0.3], ['Radzubehör', 0.3, 0.8]],
  wintersport: [['Ski und Boards', 0.5, 0.15], ['Skibekleidung', 0.5, 0.15]],
  teamsport: [['Fußball', 0.6, 0.55], ['Vereinsbedarf', 0.4, 0.7]],
};
const LIEF = {
  damen: ['Golden Thread', 'Lindqvist', 'Marlene Voss'], herren: ['Hallberg & Söhne', 'Kordel & Co.'], waesche: ['Selma Berg', 'Nachtfalter'],
  accessoires: ['Brandt Schuhe', 'Corvin Leder'], kinder: ['Golden Thread', 'Pimpernell'], wohnen: ['Kessler Haushalt', 'Lenné Home'],
  beauty: ['Maison Arvel', 'Nova Skin'], food: ['Feinkost Albers', 'Weinkontor Remy'], spielwaren: ['Toppel Spiel', 'Kaspar & Kind'],
  sport: ['Nordline', 'Athletica'], sportschuhe: ['Nordline', 'Stride'], sporttextil: ['Nordline', 'Athletica'], outdoor: ['Fjellmark', 'Gipfelwerk'],
  rad: ['Velotec', 'Speichenwerk'], wintersport: ['Alpinex', 'Fjellmark'], teamsport: ['Nordline', 'Kickwerk'],
};
const EM_FAEHIG = new Set(['damen', 'herren', 'waesche', 'accessoires', 'kinder', 'wohnen', 'beauty', 'sport', 'sporttextil']);
const slug = (t) => t.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

export function wgDef(GRUPPEN) {
  const out = [];
  for (const [b, liste] of Object.entries(ROH)) {
    const g = GRUPPEN[b];
    for (const [name, anteil, nos] of liste) {
      out.push({ id: `${b}_${slug(name)}`, name, bereich: b, anteil, nosAnteil: nos, margeNos: Math.max(0.2, g.marge - 0.03), margeSaison: g.marge + 0.04,
        vorlauf: { vororder: Math.max(12, g.vorlauf + 8), nachorder: Math.max(3, Math.round(g.vorlauf / 2)), nos: Math.max(1, Math.round(g.vorlauf / 4)) },
        mindestabnahme: 20000, eigenmarkenfaehig: EM_FAEHIG.has(b) });
    }
  }
  return out;
}

const SICHERHEIT = { 90: 1.0, 95: 1.8, 98: 3.0 };
const RED_ALTER = { frueh: 8, normal: 12, spaet: 18 };
const eur = (x) => Math.round(x);
const summe = (l, f = (x) => x) => l.reduce((a, b) => a + f(b), 0);

function saison(GRUPPEN, g, woche) {
  const s = GRUPPEN[g].saison;
  const w = ((woche % 52) + 52) % 52;
  const pos = (w / 52) * 12 - 0.5, i = Math.floor(pos), t = pos - i;
  return s[(i + 12) % 12] * (1 - t) + s[(i + 13) % 12] * t;
}
const saisonStart = (w) => Math.floor(w / 26) * 26;   // FS: KW 1 bis 26, HW: KW 27 bis 52

// ─────────────────────────────────────────── Eigenmarken
const START_MARKEN = [
  { id: 'em_margarethe', name: 'Margarethe', farbe: '#8a5a7a', zielgruppe: { alter: '50+', geschlecht: 'damen' }, kategorie: 'Bekleidung', preislage: 'mitte', stil: 'klassisch', qualitaet: 3, beschaffung: 'fernost', budget: 20000, bekanntheit: 46, aktualitaet: 38, wgs: { damen_blusen: 0.35, damen_strick: 0.3, damen_hosen: 0.25, damen_grosse_groessen: 0.4 } },
  { id: 'em_brehm', name: 'Brehm & Söhne', farbe: '#24364f', zielgruppe: { alter: '50+', geschlecht: 'herren' }, kategorie: 'Bekleidung', preislage: 'mitte', stil: 'klassisch', qualitaet: 3, beschaffung: 'osteuropa', budget: 15000, bekanntheit: 41, aktualitaet: 52, wgs: { herren_business: 0.3, herren_hemden: 0.4, herren_hosen: 0.3 } },
  { id: 'em_hausgut', name: 'Hausgut', farbe: '#5f7f63', zielgruppe: { alter: '30-49', geschlecht: 'unisex' }, kategorie: 'Home', preislage: 'einstieg', stil: 'modern', qualitaet: 3, beschaffung: 'fernost', budget: 18000, bekanntheit: 35, aktualitaet: 61, wgs: { wohnen_tisch_und_kueche: 0.3, wohnen_heimtextil: 0.35, wohnen_bettwaren: 0.4 } },
  { id: 'em_pimpi', name: 'Lütte Welt', farbe: '#e0a33a', zielgruppe: { alter: '10-13', geschlecht: 'kinder' }, kategorie: 'Bekleidung', preislage: 'einstieg', stil: 'modern', qualitaet: 2, beschaffung: 'fernost', budget: 10000, bekanntheit: 28, aktualitaet: 47, wgs: { kinder_baby: 0.25, kinder_maedchen: 0.3, kinder_jungen: 0.3 } },
];
const ALTER_INDEX = { '10-13': 0.75, '13-17': 0.8, '18-29': 0.85, '30-49': 1.0, '50+': 1.12, '70+': 1.25 };
const PREIS_KK = { einstieg: 0.9, mitte: 1.0, gehoben: 1.15 };
const BESCHAFFUNG = { fernost: { vorlauf: 23, marge: 0.07, mindest: 2.0, kosten: 1.0 }, nahost: { vorlauf: 10, marge: 0.045, mindest: 1.3, kosten: 1.1 }, osteuropa: { vorlauf: 10, marge: 0.045, mindest: 1.3, kosten: 1.1 }, europa: { vorlauf: 5, marge: 0.015, mindest: 1.0, kosten: 1.25 } };

function passungHaus(m, h) {
  const a = 1 - Math.min(1, Math.abs((ALTER_INDEX[m.zielgruppe.alter] ?? 1) - h.einzug.alter) * 2.2);
  const k = 1 - Math.min(1, Math.abs((PREIS_KK[m.preislage] ?? 1) - h.einzug.kaufkraft) * 2.5);
  return Math.max(0, Math.min(1, 0.55 * a + 0.45 * k));
}
export function markenPassung(s, m) {
  const r = {};
  for (const reg of ['Nord', 'Ost', 'West', 'Mitte', 'Süd']) {
    const hs = s.haeuser.filter((h) => h.region === reg && h.status === 'offen' && h.format === 'warenhaus');
    r[reg] = hs.length ? Math.round((summe(hs, (h) => passungHaus(m, h)) / hs.length) * 100) : 0;
  }
  return r;
}
function markenMarge(m, fremd) { return fremd + BESCHAFFUNG[m.beschaffung].marge + (m.preislage === 'gehoben' ? 0.03 : m.preislage === 'einstieg' ? -0.02 : 0) - (m.qualitaet - 3) * 0.015; }
function markenZug(m) { return (0.55 + m.bekanntheit / 160) * (0.6 + m.aktualitaet / 250) * (0.85 + m.qualitaet * 0.05); }

// ─────────────────────────────────────────── Zustand
function anlegen(s, E) {
  const def = wgDef(E.GRUPPEN);
  const wg = {};
  for (const d of def) {
    wg[d.id] = { kohorten: [], orders: [], hist: [], steuerung: { limitFaktor: 1, nosAnteil: d.nosAnteil, servicegrad: 95, vororderquote: 0.6, reduzierung: 'normal', modus: { nos: 'auto', saison: 'verfall' } },
      limit: { saison: -1, budget: 0, verbraucht: 0 }, saisonVerkauf: 0, saisonEingang: 0, saisonStartBestand: 0, saisonAbschrift: 0, saisonUmsatz: 0 };
  }
  s.einkauf = { def, wg, freigaben: [], grenze: 50000, zaehler: 0, protokoll: [], vorlauf: true };
  s.eigenmarken = { marken: START_MARKEN.map((m) => ({ ...m, wgs: { ...m.wgs }, status: 'aktiv', seit: -400 })), zaehler: 0 };
  // Startbestand: rund 10 Wochen Reichweite, Saisonteil mit etwas Altware
  for (const d of def) {
    const x = wg[d.id], bed = bedarf(s, E, d, x, -1);
    const nosEk = bed.nos * (1 - d.margeNos), saiEk = bed.saison * (1 - d.margeSaison);
    for (let a = 0; a < 10; a++) {
      x.kohorten.push({ art: 'nos', wert: eur(nosEk), alter: a * 3 + (d.bereich === 'damen' ? 20 : 4) });
      x.kohorten.push({ art: 'saison', wert: eur(saiEk * (a < 2 ? 0.6 : 1)), alter: a * 2 + (a < 2 ? 18 : 1) });
    }
  }
  // 26 Wochen Vorlauf (Vorjahr), damit Kurven und rollierende Kennzahlen gefüllt sind; Freigaben laufen automatisch
  for (let w = -26; w < 0; w++) schritt(s, E, w);
  s.einkauf.vorlauf = false;
  s.einkauf.freigaben = [];
  for (const d of def) neueSaison(s, d, wg[d.id], 0);
  for (const d of def) { const x = wg[d.id]; x.limit.verbraucht = Math.round(x.limit.budget * (0.58 + ((d.id.length * 7) % 19) / 100)); }
}
function sicher(s, E) { if (!s.einkauf || !s.einkauf.def) anlegen(s, E); return s.einkauf; }

function markenAnteil(s, wgId) {
  let a = 0;
  for (const m of s.eigenmarken.marken) if (m.status !== 'eingestellt') a += m.wgs[wgId] ?? 0;
  return Math.min(0.8, a);
}
function bedarf(s, E, d, x, w) {
  const basis = (s.basisUmsatz[d.bereich] ?? 0) * d.anteil * saison(E.GRUPPEN, d.bereich, w);
  let f = 1;
  for (const m of s.eigenmarken.marken) {
    const a = m.wgs[d.id] ?? 0;
    if (!a || m.status === 'eingestellt') continue;
    const aufbau = m.status === 'aufbau' ? 0 : 1;
    f += a * aufbau * (markenZug(m) * (summe(Object.values(markenPassung(s, m))) / 500 + 0.4) - 1);
  }
  const vk = basis * Math.max(0.5, f);
  const nosA = x.steuerung.nosAnteil;
  return { vk, nos: vk * nosA, saison: vk * (1 - nosA) };
}
function neueSaison(s, d, x, w) {
  const st = saisonStart(w);
  if (x.limit.saison === st) return;
  const plan = (s.basisUmsatz[d.bereich] ?? 0) * d.anteil * 26 * (1 - x.steuerung.nosAnteil) * (1 - d.margeSaison);
  x.limit = { saison: st, budget: eur(plan * x.steuerung.limitFaktor * 1.05), verbraucht: x.vororderNaechste ?? 0 };
  x.vororderNaechste = 0;
  x.saisonVerkauf = 0; x.saisonEingang = 0; x.saisonAbschrift = 0; x.saisonUmsatz = 0;
  x.saisonStartBestand = summe(x.kohorten.filter((k) => k.art === 'saison'), (k) => k.wert);
}
function bestand(x, art) { return summe(x.kohorten.filter((k) => !art || k.art === art), (k) => k.wert); }
function verbrauch(x, art, wert, ra) {
  // NOS: älteste zuerst. Saison: neue Ware dreht schneller, Ware über dem Reduzierungsalter nur halb so schnell
  const ks = x.kohorten.filter((q) => q.art === art);
  let rest = Math.min(wert, summe(ks, (k) => k.wert));
  const ziel = rest;
  if (art === 'nos' || !ra) {
    for (const k of ks.sort((a, b) => b.alter - a.alter)) { if (rest <= 0) break; const n = Math.min(k.wert, rest); k.wert -= n; rest -= n; }
  } else {
    for (let r = 0; r < 4 && rest > 1; r++) {
      const gew = ks.filter((k) => k.wert > 1).map((k) => ({ k, g: k.wert * (k.alter >= ra ? 0.45 : 1) }));
      const G = summe(gew, (q) => q.g);
      if (G <= 0) break;
      const runde = rest;
      for (const { k, g } of gew) { const n = Math.min(k.wert, (runde * g) / G); k.wert -= n; rest -= n; }
    }
  }
  x.kohorten = x.kohorten.filter((k) => k.wert > 1);
  return ziel - rest;
}
function lieferantFuer(s, d, i) { const l = LIEF[d.bereich] ?? ['Großhandel']; return l[i % l.length]; }

function bestelle(s, d, x, art, wert, ankunft, typ, w) {
  wert = eur(wert);
  if (wert < 1000) return;
  const E = s.einkauf;
  const marke = (() => { let best = null; for (const m of s.eigenmarken.marken) if (m.status === 'aktiv' && (m.wgs[d.id] ?? 0) > (best?.a ?? 0.15)) best = { m, a: m.wgs[d.id] }; return best?.m; })();
  const o = { id: `fg${++E.zaehler}`, wg: d.id, bereich: d.bereich, art, typ, lieferant: marke && art === 'saison' ? `${marke.name} (Eigenmarke)` : lieferantFuer(s, d, E.zaehler), marke: marke && art === 'saison' ? marke.id : undefined, wert, ankunft, woche: w };
  const tage = summe(x.hist.slice(-4), (h) => h.einsatz) / Math.max(1, x.hist.slice(-4).length);
  if (E.vorlauf || wert <= E.grenze || (art === 'nos' && wert <= Math.max(E.grenze, tage * 2.5))) { platziere(s, d, x, o); return; }
  o.abverkauf = eur(Math.min(wert, tage * 6) / (1 - (art === 'nos' ? d.margeNos : d.margeSaison)));
  o.reichweiteDanach = Math.round(((bestand(x) + wert) / Math.max(1, tage)) * 10) / 10;
  o.frist = w + (art === 'nos' ? 1 : 2);
  E.freigaben.push(o);
}
function platziere(s, d, x, o) {
  x.orders.push({ art: o.art, wert: o.wert, ankunft: o.ankunft, marke: o.marke });
  if (o.art === 'saison') { if (o.typ === 'vororder' && o.ankunft >= saisonStart(o.woche) + 22) x.vororderNaechste = (x.vororderNaechste ?? 0) + o.wert; else x.limit.verbraucht += o.wert; }
}

/** Eine Woche Einkauf je WG (nach E.wocheAbspielen). */
function schritt(s, E, w) {
  const EK = s.einkauf;
  // offene Freigaben nach Frist
  for (const o of [...EK.freigaben]) {
    if (o.frist >= w) continue;
    const d = EK.def.find((q) => q.id === o.wg), x = EK.wg[o.wg];
    EK.freigaben.splice(EK.freigaben.indexOf(o), 1);
    if (x.steuerung.modus[o.art] === 'auto') { o.ankunft = Math.max(o.ankunft, w + 1); platziere(s, d, x, o); EK.protokoll.push({ woche: w, text: `${d.name}: automatisch freigegeben` }); }
    else { x.verfallen = (x.verfallen ?? 0) + o.wert; EK.protokoll.push({ woche: w, text: `${d.name}: Order verfallen` }); }
  }
  for (const [i, d] of EK.def.entries()) {
    const x = EK.wg[d.id];
    neueSaison(s, d, x, w);
    // Wareneingang
    for (const o of x.orders.filter((q) => q.ankunft <= w)) { x.kohorten.push({ art: o.art, wert: o.wert, alter: 0, marke: o.marke }); if (o.art === 'saison') x.saisonEingang += o.wert; }
    x.orders = x.orders.filter((q) => q.ankunft > w);
    const bed = bedarf(s, E, d, x, w);
    const em = markenAnteil(s, d.id), emMarge = em ? summe(s.eigenmarken.marken.filter((m) => m.wgs[d.id]), (m) => markenMarge(m, d.margeSaison) * m.wgs[d.id]) / em : 0;
    const mSai = d.margeSaison * (1 - em) + emMarge * em, mNos = d.margeNos;
    // NOS
    const nosBed = bed.nos * (1 - mNos), nosIst = verbrauch(x, 'nos', Math.min(nosBed, bestand(x, 'nos')));
    const verf = nosBed > 0 ? nosIst / nosBed : 1;
    // Saison: Ware über Reduzierungsalter geht mit 30 % ab
    const ra = RED_ALTER[x.steuerung.reduzierung];
    const alt = x.kohorten.filter((k) => k.art === 'saison' && k.alter >= ra);
    const saiBed = bed.saison * (1 - mSai);
    const altAnteil = bestand(x, 'saison') > 0 ? summe(alt, (k) => k.wert) / bestand(x, 'saison') : 0;
    const saiIst = verbrauch(x, 'saison', Math.min(saiBed * (1 + altAnteil * 0.4), bestand(x, 'saison')), ra);
    const reduziert = saiIst * altAnteil;
    const umsatz = nosIst / (1 - mNos) + (saiIst - reduziert) / (1 - mSai) + (reduziert / (1 - mSai)) * 0.7;
    const abschrift = (reduziert / (1 - mSai)) * 0.3;
    const einsatz = nosIst + saiIst;
    for (const k of x.kohorten) k.alter++;
    // Ladenhüter: Saisonware älter 30 Wochen wird zur Hälfte abgeschrieben
    for (const k of x.kohorten.filter((q) => q.art === 'saison' && q.alter === 30)) k.wert *= 0.5;
    x.saisonVerkauf += saiIst; x.saisonAbschrift += abschrift; x.saisonUmsatz += umsatz;
    const fehl = (nosBed - nosIst) / (1 - mNos);
    x.hist.push({ woche: w, umsatz: eur(umsatz), rohertrag: eur(umsatz - einsatz), einsatz: eur(einsatz), bestand: eur(bestand(x)), verf, fehl: eur(fehl), abschrift: eur(abschrift), em: eur(umsatz * em), emRohertrag: eur(umsatz * em * emMarge) });
    if (x.hist.length > 60) x.hist.shift();
    const h = x.hist[x.hist.length - 1];
    h.reichweite = Math.round((h.bestand / Math.max(1, summe(x.hist.slice(-4), (q) => q.einsatz) / Math.min(4, x.hist.length))) * 10) / 10;
    // NOS automatisch wöchentlich
    const ziel = nosBed * (d.vorlauf.nos + SICHERHEIT[x.steuerung.servicegrad] * 2 + 9);
    const offenNos = summe(x.orders.filter((q) => q.art === 'nos'), (q) => q.wert) + summe(EK.freigaben.filter((q) => q.wg === d.id && q.art === 'nos'), (q) => q.wert);
    if (ziel - bestand(x, 'nos') - offenNos > 0) bestelle(s, d, x, 'nos', ziel - bestand(x, 'nos') - offenNos, w + d.vorlauf.nos, 'nos', w);
    // Saison: Vororder zur Orderrunde (KW 5 und KW 31), Nachorder alle 4 Wochen (versetzt je WG)
    const kw = ((w % 52) + 52) % 52;
    if (kw === 4 || kw === 30) {
      const naechste = saisonStart(w) + 26;
      const plan = (s.basisUmsatz[d.bereich] ?? 0) * d.anteil * 26 * (1 - x.steuerung.nosAnteil) * (1 - d.margeSaison) * x.steuerung.limitFaktor;
      bestelle(s, d, x, 'saison', plan * x.steuerung.vororderquote * 0.6, naechste - 4, 'vororder', w);
      bestelle(s, d, x, 'saison', plan * x.steuerung.vororderquote * 0.4, naechste + 2, 'vororder', w);
    } else if (((w + i) % 4 + 4) % 4 === 0) {
      const frei = Math.max(0, x.limit.budget - x.limit.verbraucht);
      const plan4 = saiBed * 4 * (1 - x.steuerung.vororderquote) / 0.4;
      const reichweite = bestand(x, 'saison') / Math.max(1, saiBed);
      if (reichweite < 16) bestelle(s, d, x, 'saison', Math.min(frei, plan4), w + d.vorlauf.nachorder, 'nachorder', w);
    }
  }
  // Eigenmarken: Bekanntheit, Aktualität, Aufbau
  for (const m of s.eigenmarken.marken) {
    if (m.status === 'aufbau' && w >= m.fertig) m.status = 'aktiv';
    if (m.status === 'eingestellt') continue;
    m.bekanntheit = Math.max(0, Math.min(100, m.bekanntheit + m.budget / 20000 * 0.25 - 0.12));
    m.aktualitaet = Math.max(0, m.aktualitaet - (m.stil === 'trendig' ? 0.25 : 0.08));
  }
}

// ─────────────────────────────────────────── Kennzahlen und Ampeln
function kennzahlen(s, d, x) {
  const h13 = x.hist.slice(-13), h4 = x.hist.slice(-4), l = x.hist[x.hist.length - 1] ?? {};
  const u13 = summe(h13, (q) => q.umsatz), r13 = summe(h13, (q) => q.rohertrag), e13 = summe(h13, (q) => q.einsatz);
  const best = bestand(x), avgBest = summe(h13, (q) => q.bestand) / Math.max(1, h13.length);
  const altw = summe(x.kohorten.filter((k) => (k.art === 'saison' && k.alter > 16) || (k.art === 'nos' && k.alter > 52)), (k) => k.wert);
  const offen = summe(x.orders, (q) => q.wert);
  return {
    umsatz: l.umsatz ?? 0,
    umsatz13: u13,
    rohertrag: r13,
    rohertragQuote: u13 > 0 ? r13 / u13 : 0,
    bestandEk: eur(best),
    umschlag: avgBest > 0 ? (e13 * 4) / avgBest : 0,
    reichweite: l.reichweite ?? 0,
    abverkauf: x.saisonVerkauf + bestand(x, 'saison') > 0 ? x.saisonVerkauf / (x.saisonVerkauf + bestand(x, 'saison')) : 0,
    altware: best > 0 ? altw / best : 0,
    abschriften: eur(x.saisonAbschrift),
    reduzierungsquote: x.saisonUmsatz > 0 ? x.saisonAbschrift / x.saisonUmsatz : 0,
    nosVerfuegbarkeit: h4.length ? summe(h4, (q) => q.verf) / h4.length : 1,
    entgangen: eur(summe(h4, (q) => q.fehl)),
    limitBudget: x.limit.budget, limitVerbraucht: x.limit.verbraucht, limitFrei: x.limit.budget - x.limit.verbraucht,
    offeneOrders: eur(offen),
    eigenmarkenAnteil: u13 > 0 ? summe(h13, (q) => q.em) / u13 : 0,
    eigenmarkenMarge: summe(h13, (q) => q.em) > 0 ? summe(h13, (q) => q.emRohertrag) / summe(h13, (q) => q.em) : 0,
  };
}
function addiere(liste) {
  const k = {};
  for (const f of ['umsatz', 'umsatz13', 'rohertrag', 'bestandEk', 'abschriften', 'limitBudget', 'limitVerbraucht', 'limitFrei', 'offeneOrders', 'entgangen']) k[f] = summe(liste, (q) => q.k[f]);
  const w = (f, g) => { const n = summe(liste, (q) => q.k[g]); return n > 0 ? summe(liste, (q) => q.k[f] * q.k[g]) / n : 0; };
  k.rohertragQuote = k.umsatz13 > 0 ? k.rohertrag / k.umsatz13 : 0;
  k.umschlag = w('umschlag', 'bestandEk'); k.reichweite = w('reichweite', 'bestandEk'); k.abverkauf = w('abverkauf', 'bestandEk');
  k.altware = w('altware', 'bestandEk'); k.nosVerfuegbarkeit = w('nosVerfuegbarkeit', 'umsatz13'); k.reduzierungsquote = w('reduzierungsquote', 'umsatz13');
  k.eigenmarkenAnteil = w('eigenmarkenAnteil', 'umsatz13');
  { const em = summe(liste, (q) => q.k.umsatz13 * q.k.eigenmarkenAnteil); k.eigenmarkenMarge = em > 0 ? summe(liste, (q) => q.k.umsatz13 * q.k.eigenmarkenAnteil * q.k.eigenmarkenMarge) / em : 0; }
  return k;
}
function ampeln(k, ziel) {
  const a = (gut, mittel) => (gut ? 'gruen' : mittel ? 'gelb' : 'rot');
  return {
    umsatz: a(k.umsatz13 >= ziel.umsatz13 * 0.98, k.umsatz13 >= ziel.umsatz13 * 0.92),
    rohertragQuote: a(k.rohertragQuote >= ziel.marge - 0.01, k.rohertragQuote >= ziel.marge - 0.04),
    umschlag: a(k.umschlag >= 3, k.umschlag >= 2),
    reichweite: a(k.reichweite >= 5 && k.reichweite <= 14, k.reichweite >= 3 && k.reichweite <= 20),
    abverkauf: a(k.abverkauf >= ziel.abverkauf - 0.05, k.abverkauf >= ziel.abverkauf - 0.15),
    altware: a(k.altware <= 0.1, k.altware <= 0.2),
    nosVerfuegbarkeit: a(k.nosVerfuegbarkeit >= 0.95, k.nosVerfuegbarkeit >= 0.9),
    limitFrei: a(k.limitFrei >= k.limitBudget * 0.1, k.limitFrei >= 0),
  };
}
function ziel(s, E, d, w) {
  const marge = d ? d.margeNos * 0.4 + d.margeSaison * 0.6 : 0.42;
  const fort = (((w % 26) + 26) % 26) / 26;
  return { marge, abverkauf: 0.15 + fort * 0.6, umsatz13: 0 };
}

export function einkaufUebersicht(s, E, filter = {}) {
  const EK = sicher(s, E);
  const zeilen = EK.def.filter((d) => (!filter.format || E.GRUPPEN[d.bereich].format === filter.format) && (!filter.bereich || d.bereich === filter.bereich)).map((d) => {
    const x = EK.wg[d.id], k = kennzahlen(s, d, x);
    const z = ziel(s, E, d, s.woche);
    z.umsatz13 = summe(x.hist.slice(-13), (q) => q.umsatz + q.fehl) * 0.99;
    return { d, k, z };
  });
  const bereiche = [];
  for (const b of Object.keys(ROH)) {
    const l = zeilen.filter((q) => q.d.bereich === b);
    if (!l.length) continue;
    const k = addiere(l);
    const z = { marge: summe(l, (q) => q.z.marge * q.k.umsatz13) / Math.max(1, k.umsatz13), abverkauf: l[0].z.abverkauf, umsatz13: summe(l, (q) => q.z.umsatz13) };
    bereiche.push({ id: b, name: E.GRUPPEN[b].name, format: E.GRUPPEN[b].format, kpi: k, ampel: ampeln(k, z),
      wgs: l.map((q) => ({ id: q.d.id, name: q.d.name, kpi: q.k, ampel: ampeln(q.k, q.z) })) });
  }
  const gesamt = addiere(zeilen);
  return { woche: s.woche, grenze: EK.grenze, offeneFreigaben: EK.freigaben.length, gesamt, bereiche };
}

export function wgDetail(s, E, wgId) {
  const EK = sicher(s, E);
  const d = EK.def.find((q) => q.id === wgId);
  if (!d) return undefined;
  const x = EK.wg[wgId], k = kennzahlen(s, d, x), z = ziel(s, E, d, s.woche);
  z.umsatz13 = summe(x.hist.slice(-13), (q) => q.umsatz + q.fehl) * 0.99;
  const h = x.hist.slice(-26);
  return {
    id: d.id, name: d.name, bereich: d.bereich, bereichName: E.GRUPPEN[d.bereich].name, def: d, kpi: k, ampel: ampeln(k, z),
    verlauf: h.map((q) => ({ woche: q.woche, bestand: q.bestand, umsatz: q.umsatz, reichweite: q.reichweite })),
    steuerung: { ...x.steuerung, modus: { ...x.steuerung.modus }, eigenmarken: Object.fromEntries(s.eigenmarken.marken.filter((m) => m.status !== 'eingestellt' && (m.wgs[d.id] !== undefined)).map((m) => [m.id, m.wgs[d.id]])) },
    offeneOrders: x.orders.map((o) => ({ ...o })), freigaben: EK.freigaben.filter((o) => o.wg === d.id).map((o) => ({ ...o })),
  };
}

export function eigenmarkenUebersicht(s, E) {
  sicher(s, E);
  const EK = s.einkauf;
  const marken = s.eigenmarken.marken.map((m) => {
    let umsatz = 0, roh = 0;
    for (const [wg, a] of Object.entries(m.wgs)) { const x = EK.wg[wg]; if (!x) continue; const t = summe(x.hist.slice(-13), (q) => q.em); const ant = markenAnteil(s, wg) || 1; umsatz += (t * a) / ant; roh += (summe(x.hist.slice(-13), (q) => q.emRohertrag) * a) / ant; }
    const fremd = summe(Object.keys(m.wgs).map((wg) => EK.def.find((q) => q.id === wg)?.margeSaison ?? 0.45)) / Math.max(1, Object.keys(m.wgs).length);
    return { ...m, wgs: { ...m.wgs }, umsatz13: eur(umsatz), umsatzWoche: eur(umsatz / 13), marge: umsatz > 0 ? roh / umsatz : markenMarge(m, fremd), passung: markenPassung(s, m) };
  });
  const u = einkaufUebersicht(s, E).gesamt;
  return { marken, anteilUmsatz: u.eigenmarkenAnteil, marge: u.eigenmarkenMarge, maxSinnvoll: 3 + (s.hq?.abteilungen?.einkauf?.stufe ?? 1) * 2 };
}

/** Kosten und Wirkung einer geplanten Marke (Vorschau im Assistenten). */
export function markeVorschau(s, E, m) {
  const b = BESCHAFFUNG[m.beschaffung] ?? BESCHAFFUNG.fernost;
  const fremd = 0.46;
  const kosten = eur(1_200_000 * b.kosten * (0.8 + m.qualitaet * 0.1) * (m.preislage === 'gehoben' ? 1.3 : 1));
  return { einmalkosten: kosten, positionierKosten: eur(kosten * 0.45), aufbauWochen: 6 + b.vorlauf, marge: markenMarge({ ...m }, fremd), mindestabnahme: eur(20000 * b.mindest), passung: markenPassung(s, m) };
}

// ─────────────────────────────────────────── Aktionen
export function fuehreAusEinkauf(s, E, a) {
  const EK = sicher(s, E);
  const ok = (text) => ({ ok: true, text }), nein = (text) => ({ ok: false, text });
  const fg = (id) => EK.freigaben.find((o) => o.id === id);
  const dx = (o) => [EK.def.find((q) => q.id === o.wg), EK.wg[o.wg]];
  switch (a.typ) {
    case 'freigabe': {
      const o = fg(a.id);
      if (!o) return nein('Order nicht mehr offen.');
      const [d, x] = dx(o);
      EK.freigaben.splice(EK.freigaben.indexOf(o), 1);
      if (a.entscheidung === 'ablehnen') return ok(`${d.name}: Order über ${o.wert.toLocaleString('de-DE')} € abgelehnt.`);
      if (a.entscheidung === 'kuerzen') o.wert = eur(o.wert * (1 - (a.prozent ?? 25) / 100));
      platziere(s, d, x, o);
      return ok(`${d.name}: ${o.wert.toLocaleString('de-DE')} € freigegeben${a.entscheidung === 'kuerzen' ? ` (um ${a.prozent ?? 25} % gekürzt)` : ''}.`);
    }
    case 'sammelfreigabe': {
      const f = a.filter ?? {};
      const l = EK.freigaben.filter((o) => (!f.bereich || o.bereich === f.bereich) && (!f.art || o.art === f.art) && (f.maxWert === undefined || o.wert <= f.maxWert) && (f.minWert === undefined || o.wert > f.minWert));
      for (const o of l) { const [d, x] = dx(o); EK.freigaben.splice(EK.freigaben.indexOf(o), 1); platziere(s, d, x, o); }
      return l.length ? ok(`${l.length} Orders über ${summe(l, (o) => o.wert).toLocaleString('de-DE')} € freigegeben.`) : nein('Keine Order passt zum Filter.');
    }
    case 'freigabegrenze': EK.grenze = Math.max(10000, Math.round(a.wert)); return ok(`Freigabegrenze ${EK.grenze.toLocaleString('de-DE')} €.`);
    case 'wgSteuerung': {
      const x = EK.wg[a.wg];
      if (!x) return nein('Warengruppe unbekannt.');
      const st = x.steuerung;
      if (a.limitFaktor !== undefined) { st.limitFaktor = Math.max(0.5, Math.min(1.5, a.limitFaktor)); x.limit.budget = eur((x.limit.budget / (st.alt ?? 1)) * st.limitFaktor); st.alt = st.limitFaktor; }
      if (a.nosAnteil !== undefined) st.nosAnteil = Math.max(0, Math.min(0.95, a.nosAnteil));
      if (a.servicegrad !== undefined) st.servicegrad = a.servicegrad;
      if (a.vororderquote !== undefined) st.vororderquote = Math.max(0.2, Math.min(0.9, a.vororderquote));
      if (a.reduzierung !== undefined) st.reduzierung = a.reduzierung;
      if (a.modus) Object.assign(st.modus, a.modus);
      if (a.eigenmarke) { const m = s.eigenmarken.marken.find((q) => q.id === a.eigenmarke.marke); if (m) m.wgs[a.wg] = Math.max(0, Math.min(0.8, a.eigenmarke.anteil)); }
      return ok(`${EK.def.find((q) => q.id === a.wg).name}: Steuerung angepasst.`);
    }
    case 'markeGruenden': {
      const v = markeVorschau(s, E, a.marke);
      if (s.cash + s.kreditlinie < v.einmalkosten) return nein('Dafür reicht die Liquidität nicht.');
      s.cash -= v.einmalkosten;
      const id = `em_neu${++s.eigenmarken.zaehler}`;
      s.eigenmarken.marken.push({ ...a.marke, id, wgs: { ...a.marke.wgs }, bekanntheit: 5, aktualitaet: 90, status: 'aufbau', seit: s.woche, fertig: s.woche + v.aufbauWochen });
      return ok(`Marke ${a.marke.name} gegründet: ${v.einmalkosten.toLocaleString('de-DE')} €, erste Ware in ${v.aufbauWochen} Wochen.`);
    }
    case 'markePositionieren': {
      const m = s.eigenmarken.marken.find((q) => q.id === a.id);
      if (!m) return nein('Marke unbekannt.');
      const v = markeVorschau(s, E, { ...m, ...a.aenderung });
      const kosten = v.positionierKosten;
      s.cash -= kosten;
      Object.assign(m, a.aenderung, { aktualitaet: 85, bekanntheit: m.bekanntheit * 0.7 });
      if (a.aenderung.wgs) m.wgs = { ...a.aenderung.wgs };
      return ok(`${m.name} neu positioniert: ${kosten.toLocaleString('de-DE')} €, Bekanntheit sinkt vorübergehend.`);
    }
    case 'markeEinstellen': {
      const m = s.eigenmarken.marken.find((q) => q.id === a.id);
      if (!m) return nein('Marke unbekannt.');
      m.status = 'eingestellt';
      for (const wg of Object.keys(m.wgs)) { const x = EK.wg[wg]; for (const k of x?.kohorten ?? []) if (k.marke === m.id) k.alter = Math.max(k.alter, 17); }
      return ok(`${m.name} eingestellt, Restbestand geht in die Altware.`);
    }
    case 'markeBudget': { const m = s.eigenmarken.marken.find((q) => q.id === a.id); if (!m) return nein('Marke unbekannt.'); m.budget = Math.max(0, a.budget); return ok(`${m.name}: Budget ${m.budget.toLocaleString('de-DE')} € je Woche.`); }
    default: return null;
  }
}

/** Eigenmarken-Shops eines Hauses: je Bereich die stärkste aktive Marke, wenn Anteil im Bereich mal Passung im Haus hoch ist. */
export function eigenmarkenShops(s, E, haus) {
  const EK = sicher(s, E), out = {};
  for (const b of new Set(haus.flaechen.filter((f) => f.gruppe && ['eigen', 'kommission'].includes(f.konzept)).map((f) => f.gruppe))) {
    let best = null;
    for (const m of s.eigenmarken.marken) {
      if (m.status !== 'aktiv') continue;
      const a = summe(EK.def.filter((d) => d.bereich === b), (d) => (m.wgs[d.id] ?? 0) * d.anteil);
      const wert = a * passungHaus(m, haus);
      if (wert >= 0.08 && (!best || wert > best.wert)) best = { wert, m, a };
    }
    if (best) out[b] = { name: best.m.name, farbe: best.m.farbe, anteil: Math.min(0.5, Math.max(0.2, best.a * 1.6)), markeId: best.m.id };
  }
  return out;
}

export function wocheEinkauf(s, E) { sicher(s, E); schritt(s, E, s.woche - 1); }
export const MOCK = true;
