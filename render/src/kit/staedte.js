// Alle Städte aus den drei exportierten Hauskatalogen mit Stadtbild-Daten: Archetyp, Seed, Region, Umland/Umriss-Extras und Standortliste.
//
// export STADTLISTE: [{ name, seed, typ, archetyp, region, ddr, extra, standorte }] (alphabetisch)
// ddr: true für Städte der ehemaligen DDR (eigene Ost-Archetypen, Ost-Stilmischung im Bauer, Tatra-Bahnen)
// export stadtDaten(name) → derselbe Eintrag (oder undefined)
// Die Einträge passen direkt zu stadtplan(seed, { typ, archetyp, region, ...extra, standorte }).
// Statt Math.hypot: IEEE-genaue Wurzel, damit Schwellenvergleiche in allen JS-Engines gleich ausfallen.
const wurzelSumme = (...v) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
import { rng, zw } from './basis.js';
import { ARCHETYPEN, ARCHETYP_DEFS, TYPEN, wahlGewichtet } from './stadtplan.js';
import './archetypen/index.js';   // registrierte Archetypen bringen über def.staedte eigene Städte mit
import { fussabdruck } from './bauer.js';
import { masse } from './warenhaus.js';
import { NAMEN as WB_NAMEN } from './wettbewerber.js';
import haeuser from '../../haeuser.json';
import schwesterHauser from '../../haeuser-schwester.json';
import { NAME_SCHWESTER, masseSchwester, familieSchwester } from './schwesterhaus.js';
import haeuserOutlet from '../../haeuser-outlet.json';
import { NAME_OUTLET } from './outlet.js';
import { STADT_GEOGRAFIE } from './stadt-geografie.js';

/** Region aus der echten Lage der Stadt (grob: Nord, Ost, West = NRW, Mitte = Hessen/RLP/Saar/Südniedersachsen, Süd = BW/BY). */
const REGION_VON = {
  nord: ['Hamburg', 'Bremen', 'Kiel', 'Lübeck', 'Rostock', 'Hannover', 'Braunschweig', 'Oldenburg', 'Osnabrück', 'Bremerhaven', 'Flensburg',
    'Stralsund', 'Schwerin', 'Lüneburg', 'Celle', 'Neumünster', 'Wolfsburg', 'Hildesheim'],
  ost: ['Berlin', 'Dresden', 'Leipzig', 'Magdeburg', 'Erfurt', 'Chemnitz', 'Halle', 'Potsdam', 'Cottbus', 'Jena', 'Zwickau', 'Görlitz', 'Dessau', 'Gera', 'Weimar'],
  west: ['Köln', 'Düsseldorf', 'Essen', 'Dortmund', 'Oberhausen', 'Duisburg', 'Bochum', 'Wuppertal', 'Münster', 'Aachen', 'Bonn', 'Hagen', 'Marl', 'Moers',
    'Mönchengladbach', 'Gelsenkirchen', 'Mülheim', 'Solingen', 'Paderborn', 'Bielefeld', 'Siegen', 'Bottrop', 'Neuss', 'Wesel', 'Iserlohn', 'Lüdenscheid',
    'Witten', 'Krefeld', 'Hamm', 'Leverkusen', 'Gütersloh', 'Recklinghausen', 'Düren'],
  mitte: ['Frankfurt', 'Wiesbaden', 'Mainz', 'Kassel', 'Darmstadt', 'Offenbach', 'Gießen', 'Marburg', 'Fulda', 'Hanau', 'Wetzlar', 'Göttingen', 'Koblenz',
    'Trier', 'Saarbrücken', 'Kaiserslautern', 'Worms', 'Ludwigshafen', 'Speyer'],
  sued: ['München', 'Stuttgart', 'Nürnberg', 'Augsburg', 'Mannheim', 'Karlsruhe', 'Freiburg', 'Regensburg', 'Fürth', 'Bayreuth', 'Kempten', 'Tübingen',
    'Heidelberg', 'Ingolstadt', 'Würzburg', 'Ulm', 'Heilbronn', 'Reutlingen', 'Bamberg', 'Passau', 'Esslingen', 'Erlangen', 'Landshut', 'Rosenheim',
    'Konstanz', 'Ludwigsburg', 'Pforzheim'],
};
const REGION = new Map(Object.entries(REGION_VON).flatMap(([r, l]) => l.map((s) => [s, r])));

/** Städte aus registrierten Archetypen (def.staedte): Stadtname → [archetyp, extra]. Spätere Registrierung gewinnt. */
function pluginBild() {
  const m = new Map();
  for (const [name, def] of Object.entries(ARCHETYP_DEFS)) for (const [stadt, extra] of Object.entries(def.staedte ?? {})) m.set(stadt, [name, extra ?? {}]);
  return m;
}
/** Städte der ehemaligen DDR (aus den registrierten Archetypen mit ddr: true; Region bleibt, Rostock/Stralsund/Schwerin sind 'nord'). */
export const DDR_STAEDTE = new Set([ ...[...pluginBild()].filter(([, [a]]) => ARCHETYP_DEFS[a]?.ddr).map(([s]) => s),
  ...Object.entries(STADT_GEOGRAFIE).filter(([, meta]) => meta.ddr).map(([name]) => name) ]);

/**
 * Stadtbild nach echter Geografie: [archetyp, extra]. Hafen- und Küstenstädte bekommen Wasser als Umland,
 * Flussstädte flussknick/zweiarme, Residenzstädte residenz, Domstädte dom, Wallring-Städte ring.
 */
const SEE = { umland: 'see' };
const BILD = {
  Berlin: ['raster', { umland: 'see', umriss: 'oval' }], Hamburg: ['zweiarme', SEE], München: ['residenz', {}], Köln: ['dom', {}],
  Frankfurt: ['flussknick', {}], Düsseldorf: ['flussknick', {}], Stuttgart: ['residenz', {}],
  Dresden: ['flussknick', {}], Leipzig: ['ring', {}], Bremen: ['zweiarme', {}], Nürnberg: ['altstadt', {}], Essen: ['bahnhof', {}],
  Dortmund: ['ring', {}], Hannover: ['ring', {}], Magdeburg: ['dom', {}], Mannheim: ['raster', { umriss: 'voll' }], Augsburg: ['altstadt', {}],
  Kiel: ['raster', SEE], Erfurt: ['dom', {}], Oberhausen: ['bahnhof', {}], Kassel: ['residenz', {}], Duisburg: ['flussknick', {}],
  Bielefeld: ['bahnhof', {}], Wiesbaden: ['residenz', {}], Saarbrücken: ['flussknick', {}], Bochum: ['bahnhof', {}], Wuppertal: ['flussknick', {}],
  Münster: ['dom', {}], Karlsruhe: ['residenz', {}], Aachen: ['dom', {}], Braunschweig: ['ring', {}], Bonn: ['flussknick', {}], Chemnitz: ['bahnhof', {}],
  Freiburg: ['dom', {}], Mainz: ['dom', {}], Lübeck: ['zweiarme', SEE], Rostock: ['altstadt', SEE], Hagen: ['bahnhof', {}], Regensburg: ['dom', {}],
  Wolfsburg: ['bahnhof', {}], Koblenz: ['flussknick', {}], Cottbus: ['altstadt', {}], Lüneburg: ['altstadt', {}], Marl: ['raster', {}], Moers: ['altstadt', {}],
  Fürth: ['altstadt', {}], Bayreuth: ['residenz', {}], Kempten: ['altstadt', {}], Tübingen: ['altstadt', {}], Mönchengladbach: ['bahnhof', {}],
  Gelsenkirchen: ['bahnhof', {}], Ludwigshafen: ['bahnhof', {}], Mülheim: ['flussknick', {}], Osnabrück: ['ring', {}], Heidelberg: ['flussknick', {}],
  Solingen: ['raster', {}], Paderborn: ['dom', {}], Ingolstadt: ['altstadt', {}], Würzburg: ['residenz', {}], Ulm: ['flussknick', {}], Göttingen: ['altstadt', {}],
  Offenbach: ['raster', {}], Heilbronn: ['flussknick', {}], Bremerhaven: ['raster', SEE], Trier: ['dom', {}], Jena: ['altstadt', {}], Siegen: ['altstadt', {}],
  Hildesheim: ['dom', {}], Bottrop: ['raster', {}], Reutlingen: ['altstadt', {}], Bamberg: ['zweiarme', {}], Passau: ['zweiarme', {}], Esslingen: ['altstadt', {}],
  Celle: ['residenz', {}], Flensburg: ['altstadt', SEE], Stralsund: ['altstadt', SEE], Schwerin: ['residenz', SEE], Neuss: ['altstadt', {}], Wesel: ['altstadt', {}],
  Iserlohn: ['altstadt', {}], Lüdenscheid: ['altstadt', {}], Witten: ['bahnhof', {}], Speyer: ['dom', {}], Halle: ['altstadt', {}], Krefeld: ['raster', {}],
  Potsdam: ['residenz', SEE], Hamm: ['bahnhof', {}], Oldenburg: ['residenz', {}], Leverkusen: ['raster', {}], Darmstadt: ['residenz', {}], Pforzheim: ['raster', {}],
  Gütersloh: ['raster', {}], Recklinghausen: ['altstadt', {}], Erlangen: ['raster', {}], Landshut: ['altstadt', {}], Rosenheim: ['altstadt', {}],
  Konstanz: ['altstadt', SEE], Ludwigsburg: ['residenz', {}], Gießen: ['raster', {}], Marburg: ['altstadt', {}], Fulda: ['dom', {}], Hanau: ['raster', {}],
  Wetzlar: ['dom', {}], Neumünster: ['raster', {}], Zwickau: ['altstadt', {}], Görlitz: ['altstadt', {}], Dessau: ['raster', {}], Gera: ['altstadt', {}],
  Weimar: ['residenz', {}], Düren: ['raster', {}], Kaiserslautern: ['raster', {}], Worms: ['dom', {}],
};

/** Seed aus dem Stadtnamen (stabil, 1 … 99 999). */
export function stadtSeed(name) {
  let h = 2166136261;
  for (const c of name) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return (h % 99999) + 1;
}

const WETTBEWERBER = { metropole: [3, 5], grossstadt: [1, 3], mittelstadt: [0, 1] };
const WB_FLAECHE = { metropole: [2600, 5200], grossstadt: [1800, 3800], mittelstadt: [1500, 2600] };

function baueEintrag(name, liste) {
  const geo = STADT_GEOGRAFIE[name];
  // Der aktuelle Engine-Städtestamm bestimmt die Größenklasse, nicht ältere Exporte.
  const typ = geo?.typ ?? liste[0]?.cluster ?? schwesterHauser.find((h) => h.stadt === name)?.cluster ?? haeuserOutlet.find((h) => h.stadt === name)?.cluster ?? 'mittelstadt';
  const seed = stadtSeed(name);
  const r = rng(seed * 13 + 5);
  const region = REGION.get(name) ?? geo?.region ?? 'mitte';
  const plug = PLUGIN_BILD.get(name);
  const ddr = !!(plug && ARCHETYP_DEFS[plug[0]]?.ddr) || !!geo?.ddr;
  const bild = plug ?? BILD[name] ?? (geo?.bild ? [geo.bild, geo.extra ?? {}] : undefined);
  const archetyp = bild?.[0] ?? wahlGewichtet(r, Object.entries(ARCHETYPEN).map(([k, v]) => [k, v.gewicht[TYPEN[typ].idx]]));
  const extra = { ...(bild?.[1] ?? {}), ...(ddr ? { ddr: true } : {}) };
  const standorte = liste.map((h) => {
    const f = fussabdruck(h);
    return { id: h.id, name: h.name, rolle: h.klasse === 'premium' ? 'premium' : h.format === 'sport' ? 'sport' : 'warenhaus', lage: h.lage, hausklasse: h.hausklasse, premium: h.klasse === 'premium', grundflaecheQm: h.grundflaecheQm, w: f.w, d: f.d };
  });
  // Eine Schwesterfiliale pro ausgewaehlter Stadt. Hartwig behält die zentrale Einkaufslage.
  // Die Daten sind rein grafisch und gehoeren nicht zum Engine-Portfolio.
  const schwester = schwesterHauser.find((h) => h.stadt === name);
  if (schwester) {
    const f = masseSchwester(schwester);
    standorte.push({ id: schwester.id, name: NAME_SCHWESTER, rolle: 'schwester',
      lage: schwester.lage, grundflaecheQm: schwester.grundflaecheQm,
      w: f.w, d: f.d, familie: familieSchwester(schwester), variante: schwester.fassade });
  }
  // FUNDUS: eigene grafische Standorte unabhängig vom Engine-Portfolio.
  for (const h of haeuserOutlet.filter((q) => q.stadt === name)) {
    const m = fussabdruck(h);
    standorte.push({ id: h.id, name: NAME_OUTLET + ' ' + h.stadt, rolle: 'outlet',
      lage: h.lage, grundflaecheQm: h.grundflaecheQm, w: m.w, d: m.d });
  }
  const [a, b] = WETTBEWERBER[typ];
  const n = Math.min(b, a + Math.floor(r() * (b - a + 1)));
  const ARTEN_1A = ['modehaus', 'fastfashion', 'premium', 'leer_ehemals', 'modehaus', 'fastfashion'];
  const ARTEN_B = ['offprice', 'elektronik', 'textildiscounter', 'leer_ehemals', 'offprice'];
  const vergeben = new Set();
  // GESTALTUNG.md: Vielfalt zwischen Nachbarstädten (nachbarn: Städte im Umkreis von NACHBAR_KM, ohne Koordinaten die letzten drei
  // Städte derselben Region). Wettbewerber: zuerst eine Art, die kein Nachbar hat (Lage-Pool bevorzugt, sonst alle Arten),
  // dann eine Bauform (0 bis 2) und ein Name, die kein Nachbar mit dieser Art hat.
  const nb = nachbarnVon(name, region);
  const nbWb = nb.flatMap((e) => e.wb);
  const zaehl = WB_GENUTZT.get(region) ?? new Map();
  WB_GENUTZT.set(region, zaehl);
  const ALLE = ['modehaus', 'fastfashion', 'offprice', 'elektronik', 'textildiscounter', 'leer_ehemals', 'premium'];
  const artWahl = (lage) => {
    const x = r();
    const erlaubt = (a) => !vergeben.has(a) && (a !== 'premium' || typ === 'metropole');
    // Rang: 0 = kein Nachbar hat die Art, 1 = Art vorhanden, aber eine Bauform frei, 2 = alle Bauformen belegt
    const rang = (a) => { const f = new Set(nbWb.filter((q) => q.art === a).map((q) => q.form)); return f.size === 0 ? 0 : f.size < FORMEN ? 1 : 2; };
    const nutz = (a) => nbWb.filter((q) => q.art === a).length;   // bei gleichem Rang die bei Nachbarn seltenste Art
    const wert = (a) => rang(a) * 100 + nutz(a);
    const l = ALLE.filter(erlaubt), best = Math.min(...l.map(wert));
    const lagePool = (lage === '1a' ? ARTEN_1A : ARTEN_B).filter((a) => erlaubt(a) && wert(a) === best);
    let pool = [...new Set(lagePool.length ? lagePool : l.filter((a) => wert(a) === best))];
    const a = pool[Math.floor(x * pool.length)]; vergeben.add(a); return a;
  };
  const nameVon = (art) => {
    const liste = WB_NAMEN[art] ?? [null];
    let k = zaehl.get(art) ?? 0;
    for (let q = 0; q < liste.length && nbWb.some((e) => e.art === art && e.name === liste[k % liste.length]); q++) k++;
    zaehl.set(art, k + 1);
    return liste[k % liste.length];
  };
  const FORMEN = 5;   // Bauformen je Wettbewerber-Art (wettbewerber.js)
  const formenStadt = [];   // in der Stadt schon vergebene Bauformen (auch über Arten hinweg verschieden)
  const formVon = (art, x) => {
    const belegt = new Set(nbWb.filter((q) => q.art === art).map((q) => q.form));
    for (const streng of [true, false]) for (let q = 0; q < FORMEN; q++) { const f = (Math.floor(x * FORMEN) + q) % FORMEN; if (!belegt.has(f) && (!streng || !formenStadt.includes(f))) { formenStadt.push(f); return f; } }
    return Math.floor(x * FORMEN);
  };
  // GESTALTUNG.md: Hartwig bleibt das prägnanteste Haus der Einkaufslage (Wettbewerber höchstens 80 % der größten Hartwig-Grundfläche)
  const hartwigQm = Math.max(0, ...liste.filter((h) => h.format !== 'sport' && h.lage !== 'center' && h.lage !== 'rand').map((h) => h.grundflaecheQm ?? 0));
  for (let k = 0; k < n; k++) {
    let qm = Math.round(zw(r, ...WB_FLAECHE[typ]) / 100) * 100;
    if (hartwigQm > 0) qm = Math.min(qm, Math.max(600, Math.round((0.8 * hartwigQm) / 100) * 100));
    const id = `K-${name}-${k + 1}`;
    const m = masse({ id, grundflaecheQm: qm, etagen: [0, 1, 2, 3] });
    const lage = r() < (typ === 'mittelstadt' ? 0.5 : 0.7) ? '1a' : 'b';
    const art = artWahl(lage);
    standorte.push({ id, name: nameVon(art), art, form: formVon(art, (seed * 0.618 + k * 0.37) % 1), rolle: 'wettbewerber', lage, grundflaecheQm: qm, w: m.w, d: m.d });
  }
  // Kirchenstil der Hauptkirche (West): ein Stil, den kein Nachbar hat, sofern die Stadt keinen eigenen vorgibt
  if (region === 'west' && extra.kirchStil === undefined) {
    const KS = ['hallenkirche', 'romanisch', 'backsteingotik', 'nachkrieg', 'neugotik', 'klassizismus', 'barock'];
    const start = Math.floor(((seed * 0.4142) % 1) * KS.length);
    const vorgabe = nachbarStaedteRoh(name).map((n) => PLUGIN_BILD.get(n)?.[1]?.kirchStil).filter(Boolean);   // feste Stile noch nicht gebauter Nachbarn
    for (let q = 0; q < KS.length; q++) { const k = KS[(start + q) % KS.length]; if (!nb.some((e) => e.kirche === k) && !vorgabe.includes(k)) { extra.kirchStil = k; break; } }
  }
  // Rathausstil (West): einer, den kein Nachbar hat
  if (region === 'west' && extra.rathausStil === undefined) {
    const RS = ['backstein', 'sandstein', 'renaissance', 'neugotik', 'barock', 'hochhaus'];
    const start = Math.floor(((seed * 0.7071) % 1) * RS.length);
    for (let q = 0; q < RS.length; q++) { const k = RS[(start + q) % RS.length]; if (!nb.some((e) => e.rathaus === k)) { extra.rathausStil = k; break; } }
  }
  // Konzernverwaltung (Ruhr): Varianten, die kein Nachbar hat; Konzern-Einträge aus extra.nah zählen mit
  if (archetyp === 'ruhrstadt') {
    const ausNah = (extra.nah ?? []).filter((f) => f.startsWith('konzern')).map((f) => f.split(':')[1] ?? 'turm70');
    const n = (extra.konzern ?? (typ === 'mittelstadt' ? 0 : 1)) + ausNah.length;
    const wunsch = [...(extra.konzernVarianten ?? []), ...ausNah, 'glas60', 'turm70', 'backstein20'];
    const belegt = new Set(nb.flatMap((e) => e.konzern));
    const wahl = [];
    for (const v of wunsch) if (wahl.length < n && !belegt.has(v) && !wahl.includes(v)) wahl.push(v);
    extra.konzern = wahl.length; extra.konzernVarianten = wahl;
    extra.nah = (extra.nah ?? []).filter((f) => !f.startsWith('konzern'));
  }
  VIELFALT.push({ name, region, wb: standorte.filter((q) => q.rolle === 'wettbewerber').map((q) => ({ art: q.art, form: q.form, name: q.name })), kirche: extra.kirchStil, rathaus: extra.rathausStil, konzern: extra.konzernVarianten ?? [] });
  return { name, seed, typ, archetyp, region, ddr, extra, standorte };
}

const PLUGIN_BILD = pluginBild();
const WB_GENUTZT = new Map();   // Region → Map(Art → Anzahl), siehe baueEintrag
const VIELFALT = [];            // bereits gebaute Einträge: { name, region, wb, kirche, konzern } für die Nachbarprüfung
/** Ungefähre Lage (Breite, Länge) der West-Städte; Nachbarn liegen näher als NACHBAR_KM (direkte Nachbarstädte im Ballungsraum). */
const NACHBAR_KM = 28;
const KOORD = Object.fromEntries(Object.entries(STADT_GEOGRAFIE).map(([n, meta]) => [n, meta.koord]));
function nachbarStaedteRoh(name) { const a = KOORD[name]; return a ? Object.keys(KOORD).filter((n) => n !== name && wurzelSumme((a[0] - KOORD[n][0]) * 111, (a[1] - KOORD[n][1]) * 70) < NACHBAR_KM) : []; }
function nachbarnVon(name, region) {
  const a = KOORD[name];
  if (a) return VIELFALT.filter((e) => { const b = KOORD[e.name]; return b && wurzelSumme((a[0] - b[0]) * 111, (a[1] - b[1]) * 70) < NACHBAR_KM; });
  return VIELFALT.filter((e) => e.region === region).slice(-3);
}
const nachStadt = new Map();
for (const h of haeuser) { if (!nachStadt.has(h.stadt)) nachStadt.set(h.stadt, []); nachStadt.get(h.stadt).push(h); }
// Auch Städte mit ausschließlich Volkskauf/FUNDUS benötigen eigenständige Stadtpläne.
for (const h of [...schwesterHauser, ...haeuserOutlet]) if (!nachStadt.has(h.stadt)) nachStadt.set(h.stadt, []);
export const STADTLISTE = [...nachStadt.entries()].map(([name, l]) => baueEintrag(name, l)).sort((a, b) => a.name.localeCompare(b.name, 'de'));
const INDEX = new Map(STADTLISTE.map((s) => [s.name, s]));

export function stadtDaten(name) { return INDEX.get(name); }

/** Nachbarstädte (NACHBAR_KM, nur Städte mit Koordinaten in KOORD) für Prüfskripte. */
export function nachbarStaedte(name) {
  const a = KOORD[name];
  if (!a) return [];
  return STADTLISTE.filter((s) => s.name !== name && KOORD[s.name] && wurzelSumme((a[0] - KOORD[s.name][0]) * 111, (a[1] - KOORD[s.name][1]) * 70) < NACHBAR_KM).map((s) => s.name);
}
