// Q25: Produktbilder aus der Silhouetten-Bibliothek.
// produktSVG(bild, farbe?, material?, groesse = 160, opt = { hintergrund }) → Freisteller (viewBox 0 0 100 100)
// modelFuerProdukt(bild, farbe?, material?, { geschlecht, zielgruppe, groesse }) → Model, das das Produkt trägt (oder null bei Home/Beauty)
// bildFuer(artikeltyp) → bild-Objekt für Artikeltypen ohne eigenes bild (heutige Engine-Namen)

import { materialDefs, farbeVon, hell } from './stoff.js';
import { oberteilFlat, hoseFlat, rockFlat, kleidFlat, jackeFlat } from './flatlay.js';
import { DINGE } from './dinge.js';
import { SILHOUETTEN, ZEICHNER_ERWEITERT } from './silhouetten.js';
import { modelSVG, HAUT, HAAR } from './model.js';
import { altbildSVG } from '../produktbild.js';
import { musterFuellung } from './q37-muster.js';

const FLAT = { oberteil: oberteilFlat, hose: hoseFlat, rock: (S, t, p) => rockFlat(S, t, p, 16), kleid: kleidFlat, jacke: jackeFlat };

const normMaterial = (m) => String(m ?? '').toLowerCase().replace('bio-baumwolle', 'baumwolle').replace('ü', 'ue');

export function aufloesen(bild) {
  const b = typeof bild === 'string' ? { silhouette: bild } : bild ?? {};
  const s = SILHOUETTEN[b.silhouette] ?? SILHOUETTEN.tshirt;
  const { silhouette, ...rest } = b;
  return { id: SILHOUETTEN[silhouette] ? silhouette : 'tshirt', s, p: { ...s.p, ...rest } };
}

function zoom(s, p) {
  if (s.zoom) return typeof s.zoom === 'function' ? s.zoom(p) : s.zoom;
  if (s.zeichner === 'oberteil' && p.laenge === 'crop') return [1.3, 50, 36];
  if (s.zeichner === 'hose' && p.laenge === 'kurz') return [1.4, 50, 32];
  if (s.zeichner === 'hose' && p.laenge === 'bermuda') return [1.22, 50, 37];
  if (s.zeichner === 'rock' && p.laenge === 'mini') return [1.5, 50, 32];
  if (s.zeichner === 'rock' && p.laenge === 'knie') return [1.2, 50, 42];
  if (s.zeichner === 'jacke' && ['regenjacke', 'parka', 'funktion'].includes(p.art)) return [0.92, 50, 45];
  if (s.zeichner === 'ding:sandale') return [1.05, 50, 52];
  if (s.zeichner === 'ding:jeansshorts') return [1.32, 50, 44];
  if (s.zeichner === 'ding:guertel') return [1.3, 50, 52];
  return null;
}

export function produktSVG(bild, farbe, material, groesse = 160, opt = {}) {
  const { s, p } = aufloesen(bild);
  const fa = farbe ?? s.farbe, ma = material ?? s.material;
  if (s.zeichner.startsWith('alt:')) return altbildSVG(s.zeichner.slice(4), farbeVon(fa), material, groesse, opt);
  const defs = [], t = [];
  // Q37: opt.muster (Schlüssel aus der Engine) ist maßgeblich: ersetzt Muster und Dessin der Silhouette, uni zeigt den Stoff ohne Muster
  const mu = opt.muster;
  const S = materialDefs(fa, normMaterial(ma) || 'baumwolle', defs, mu ? undefined : p.muster);
  if (mu && mu !== 'uni') S.tex = musterFuellung(S, mu) ?? S.tex;
  const q = { ...p };
  if (mu) { q.dessin = ''; delete q.muster; }
  if (s.zeichner === 'ding:bettwaesche') q.S2 = materialDefs(opt.farbe2 ?? hell(farbeVon(fa), 0.55), normMaterial(ma) || 'leinen', defs, p.muster2);
  if (FLAT[s.zeichner]) {
    t.push(`<ellipse cx="50" cy="96" rx="30" ry="2.4" fill="#000" opacity="0.07"/>`);
    FLAT[s.zeichner](S, t, q);
  } else if (s.zeichner.startsWith('z:')) ZEICHNER_ERWEITERT[s.zeichner.slice(2)](S, t, q);
  else DINGE[s.zeichner.slice(5)](S, t, q);
  // kleine Motive füllen die Kachel
  const z = zoom(s, q);
  if (z) { t.unshift(`<g transform="translate(${50 - z[1] * z[0]} ${50 - z[2] * z[0]}) scale(${z[0]})">`); t.push('</g>'); }
  const hg = opt.hintergrund ? `<rect width="100" height="100" fill="${opt.hintergrund}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${groesse}" height="${groesse}"><defs>${defs.join('')}</defs>${hg}${t.join('')}</svg>`;
}

// ─────────────────────────────────────────── Model
// Grundgarderobe je Zielgruppe und Geschlecht: neutrale Ergänzungen zum gezeigten Produkt
const GRUND = {
  damen: {
    kinder: { haar: { farbe: HAAR.blond, stil: 'zopf' }, teile: { oberteil: { aermel: 'kurz', farbe: 'weiß' }, hose: { passform: 'gerade', farbe: 'hellerdenim', material: 'denim' }, schuhe: { art: 'sneaker', farbe: 'rosa', material: 'leder' } } },
    teens: { haar: { farbe: HAAR.hellbraun, stil: 'lang' }, teile: { oberteil: { aermel: 'kurz', laenge: 'crop', passform: 'tailliert', farbe: 'weiß', material: 'rippe' }, hose: { passform: 'baggy', leibhoehe: 'tief', farbe: 'hellerdenim', material: 'denim' }, schuhe: { art: 'sneaker', farbe: 'weiß', material: 'leder' } } },
    young: { haar: { farbe: HAAR.aschblond, stil: 'lang' }, teile: { oberteil: { aermel: 'kurz', passform: 'tailliert', farbe: 'ecru' }, hose: { passform: 'weit', leibhoehe: 'hoch', farbe: 'jeansblau', material: 'denim' }, schuhe: { art: 'sneaker', farbe: 'weiß', material: 'leder' } } },
    adults: { haar: { farbe: HAAR.blond, stil: 'bob' }, teile: { oberteil: { aermel: 'lang', ausschnitt: 'v', farbe: 'creme', material: 'seide' }, hose: { passform: 'weit', leibhoehe: 'hoch', bundfalte: true, farbe: 'anthrazit', material: 'wolle' }, schuhe: { art: 'pumps', farbe: 'schwarz', material: 'leder' } } },
    bestager: { haar: { farbe: HAAR.grau, stil: 'bob' }, teile: { oberteil: { aermel: 'lang', farbe: 'marine', material: 'strick', rippbund: true }, hose: { passform: 'gerade', komfortbund: true, farbe: 'anthrazit' }, schuhe: { art: 'halb', farbe: 'schwarz', material: 'leder' } } },
  },
  herren: {
    kinder: { haar: { farbe: HAAR.dunkelblond, stil: 'kurz' }, teile: { oberteil: { aermel: 'kurz', farbe: 'marine' }, hose: { passform: 'gerade', farbe: 'jeansblau', material: 'denim' }, schuhe: { art: 'sneaker', farbe: 'weiß', material: 'leder' } } },
    teens: { haar: { farbe: HAAR.blond, stil: 'locken' }, teile: { oberteil: { aermel: 'kurz', passform: 'oversize', farbe: 'schwarz' }, hose: { passform: 'baggy', farbe: 'hellerdenim', material: 'denim' }, schuhe: { art: 'sneaker', farbe: 'weiß', material: 'leder' } } },
    young: { haar: { farbe: HAAR.dunkelblond, stil: 'kurz' }, teile: { oberteil: { aermel: 'kurz', farbe: 'weiß' }, hose: { passform: 'gerade', farbe: 'sand', knopf: true }, schuhe: { art: 'sneaker', farbe: 'weiß', material: 'leder' } } },
    adults: { haar: { farbe: HAAR.braun, stil: 'seitenscheitel' }, teile: { oberteil: { aermel: 'lang', kragen: true, knopfleiste: true, farbe: 'hellblau' }, hose: { passform: 'gerade', knopf: true, farbe: 'marine', material: 'wolle' }, schuhe: { art: 'halb', farbe: 'cognac', material: 'leder' } } },
    bestager: { haar: { farbe: HAAR.weiss, stil: 'kurz' }, teile: { oberteil: { aermel: 'lang', kragen: true, knopfleiste: true, farbe: 'weiß' }, hose: { passform: 'gerade', knopf: true, farbe: 'grau', material: 'wolle' }, schuhe: { art: 'halb', farbe: 'braun', material: 'leder' } } },
  },
};

// Silhouettenparameter → Parameter der Model-Kleidung (model.js)
function alsModelTeil(id, s, p, farbe, material) {
  const basis = { teil: s.model, farbe, material: normMaterial(material), muster: p.muster };
  if (typeof s.modelTeile === 'function') return s.modelTeile(p, farbe, normMaterial(material));
  if (s.model === 'oberteil') {
    const kr = p.kragen;
    return { ...basis, aermel: p.aermel === 'traeger' || p.aermel === 'puff' ? (p.aermel === 'puff' ? 'kurz' : 'ohne') : p.aermel ?? 'kurz', passform: p.passform === 'boxy' ? 'oversize' : p.passform ?? 'gerade',
      laenge: p.laenge ?? 'normal', ausschnitt: kr === 'v' || kr === 'wickel' ? 'v' : kr === 'carree' ? 'carree' : 'rund', kragen: kr === 'hemd' || kr === 'polo', knopfleiste: p.knopfleiste || kr === 'hemd',
      kapuze: kr === 'kapuze', kaenguru: p.kaenguru, rippbund: p.rippbund };
  }
  if (s.model === 'hose') return { ...basis, laenge: p.laenge ?? 'lang', passform: p.passform === 'jogger' ? 'schmal' : p.passform === 'leggings' ? 'skinny' : p.passform ?? 'gerade', saum: p.saum, cargo: p.cargo, latz: p.latz, bundfalte: p.bundfalte, komfortbund: p.komfortbund || p.passform === 'jogger' || p.passform === 'leggings', knopf: !p.komfortbund, leibhoehe: id === 'jeansshorts' || id === 'momjeans' ? 'hoch' : undefined };
  if (s.model === 'rock') return { ...basis, laenge: p.laenge === 'maxi' ? 'midi' : p.laenge, form: p.form };
  if (s.model === 'kleid') return { ...basis, laenge: p.laenge === 'maxi' ? 'midi' : p.laenge, form: p.form === 'slip' || p.form === 'etui' ? 'gerade' : p.form === 'stufen' ? 'glocke' : p.form, aermel: p.aermel === 'traeger' ? 'ohne' : p.aermel === 'puff' ? 'kurz' : p.aermel, ausschnitt: p.kragen === 'v' ? 'v' : p.kragen === 'carree' ? 'carree' : 'rund', guertel: p.guertel };
  if (s.model === 'jacke') {
    const art = p.art;
    return { ...basis, laenge: art === 'mantel' || art === 'trench' ? 'mantel' : ['bomber', 'jeansjacke', 'lederjacke', 'varsity', 'harrington', 'track', 'teddy'].includes(art) || p.laenge === 'kurz' || p.laenge === 'crop' ? 'kurz' : 'normal', revers: ['blazer', 'sakko', 'mantel', 'trench'].includes(art), steppung: art === 'steppjacke' || art === 'steppweste', guertel: art === 'trench' || p.guertel, kapuze: ['regenjacke', 'parka', 'funktion'].includes(art), weste: ['steppweste', 'strickweste', 'anzugweste'].includes(art), zip: ['steppjacke', 'steppweste', 'regenjacke', 'parka', 'bomber', 'lederjacke', 'teddy', 'harrington', 'funktion', 'track', 'fieldjacket'].includes(art) };
  }
  if (s.model === 'schuhe' || s.model === 'muetze' || s.model === 'tasche') return { ...basis, art: p.art };
  return null;
}

// Schuhe passend zum Outfit (statt immer der Grundschuhe der Zielgruppe)
function passendeSchuhe(s, teile, g, zg, G) {
  if (s.schuhe) return { teil: 'schuhe', material: 'leder', ...G.teile.schuhe, ...s.schuhe };
  const hatKleid = teile.some((x) => x.teil === 'kleid' || x.teil === 'rock');
  const kurz = teile.some((x) => x.teil === 'hose' && (x.laenge === 'kurz' || x.laenge === 'bermuda'));
  const anzug = teile.some((x) => x.teil === 'jacke' && x.revers) && g === 'herren';
  if (hatKleid && g === 'damen') return { teil: 'schuhe', material: 'leder', ...(zg === 'kinder' ? { art: 'ballerina', farbe: 'rosa' } : zg === 'adults' ? { art: 'pumps', farbe: 'schwarz' } : zg === 'bestager' ? { art: 'halb', farbe: 'schwarz' } : { art: 'ballerina', farbe: 'ecru' }) };
  if (kurz && zg !== 'kinder') return { teil: 'schuhe', material: 'leder', ...(g === 'damen' ? { art: 'sandale', farbe: 'cognac' } : { art: 'sneaker', farbe: 'weiß' }) };
  if (anzug) return { teil: 'schuhe', material: 'leder', art: 'halb', farbe: zg === 'young' || zg === 'teens' ? 'cognac' : 'schwarz' };
  return { teil: 'schuhe', material: 'baumwolle', ...G.teile.schuhe };
}

export function modelFuerProdukt(bild, farbe, material, { geschlecht = 'damen', zielgruppe = 'young', groesse = 300, hintergrund = '#eef1f4', haut, muster } = {}) {
  const { id, s, p } = aufloesen(bild);
  if (!s.model) return null;
  // Damenartikel nur an Damen, Herrenartikel nur an Herren, Kinderartikel nur an Kindern
  const g = s.geschlecht ?? (s.nur === 'damen' || s.nur === 'herren' ? s.nur : geschlecht === 'herren' ? 'herren' : 'damen');
  const zg0 = s.nur === 'kinder' ? 'kinder' : s.nur === 'teens' ? 'teens' : zielgruppe;
  const zg = GRUND[g][zg0] ? zg0 : 'young';
  const G = GRUND[g][zg];
  let teile = alsModelTeil(id, s, p, farbe ?? s.farbe, material ?? s.material);
  teile = Array.isArray(teile) ? teile : [teile];
  // Q37: gewähltes Muster auf die Teile des Produkts (nicht auf die Grundgarderobe)
  if (muster) teile = teile.map((x) => ({ ...x, muster37: muster, dessin: '' }));
  const outfit = [];
  const ersetzt = new Set(teile.map((x) => x.teil));
  if (ersetzt.has('kleid') || ersetzt.has('einteiler')) ersetzt.add('oberteil').add('hose');
  if (ersetzt.has('rock')) ersetzt.add('hose');
  ersetzt.add('schuhe');
  for (const [platz, o] of Object.entries(G.teile)) if (!ersetzt.has(platz)) outfit.push({ teil: platz, material: 'baumwolle', ...o });
  outfit.push(...teile);
  if (!teile.some((x) => x.teil === 'schuhe')) outfit.push(passendeSchuhe(s, [...outfit, ...teile], g, zg, G));
  return modelSVG({ geschlecht: g, zielgruppe: zg, haut: haut ?? HAUT[0], haar: G.haar, outfit, hintergrund, groesse });
}

// ─────────────────────────────────────────── Artikelnamen der heutigen Engine → Silhouette
const NAMEN = {
  'Jeans-Shorts': 'jeansshorts', 'Kinder-Jeansshorts': 'jeansshorts', Kaschmirpullover: 'pullover', Strickjacke: 'strickjacke', Bluse: 'bluse', Hemd: 'hemd', 'T-Shirt': 'tshirt', Poloshirt: 'polo',
  Kleid: 'kleid', Rock: 'rock', 'A-Linien-Rock': { silhouette: 'rock', laenge: 'midi', form: 'a-linie' }, Chino: 'chino', Jeans: 'jeans', Mantel: 'mantel', Steppjacke: 'steppjacke', Blazer: 'blazer', 'A-Linien-Kleid': 'kleid', Wickelkleid: 'wickelkleid',
  Tunikabluse: 'tunika', 'Oversize-Bluse': { silhouette: 'bluse', passform: 'oversize' }, 'Bootcut-Jeans': 'flarejeans', Culotte: 'culotte', Plisseerock: 'plisseerock', Bleistiftrock: 'bleistiftrock',
  Feinstrickpullover: { silhouette: 'pullover', material: 'merino' }, Longcardigan: { silhouette: 'strickjacke', laenge: 'lang' }, Trenchcoat: 'trenchcoat', 'Bouclé-Jacke': { silhouette: 'blazer', art: 'blazer' },
  'Slim-Fit-Hemd': { silhouette: 'hemd', passform: 'tailliert' }, 'Regular-Fit-Hemd': 'hemd', 'Oxford-Hemd': { silhouette: 'hemd', kragen: 'hemd' }, 'Henley-Shirt': 'henley',
  Rundhalspullover: 'pullover', Rollkragenpullover: 'rollkragen', 'Cargo-Hose': 'cargohose', Anzughose: 'stoffhose', 'Bermuda-Shorts': 'bermuda', Stricksakko: 'sakko', Wollmantel: 'mantel', 'Leinen-Sakko': { silhouette: 'sakko', muster: 'uni' },
  Latzhose: 'latzhose', 'Kinder-Sweatshirt': 'sweatshirt', 'Kinder-Regenjacke': 'regenjacke', 'Kinder-Leggings': 'leggings', 'Kinder-Softshelljacke': 'regenjacke', 'Kinder-Polo': 'polo', 'Kinder-Pyjama': 'pyjama',
  'Kinder-Strickpullover': 'pullover', 'Kinder-Tüllrock': { silhouette: 'rock', form: 'glocke', laenge: 'knie' }, 'Kinder-Sonnenhut': 'buckethat', 'Kinder-Jogginghose': 'jogginghose',
  Kinderbody: 'kinderbody', Strampler: 'strampler', Schneeanzug: 'schneeanzug', Schlafsack: 'schlafsack', Matschhose: 'matschhose', Kinderkleid: 'kinderkleid', Sneaker: 'sneaker', 'Plateau-Sneaker': 'sneaker', Pumps: 'pumps', Stiefel: 'stiefel', 'Chelsea-Boot': 'stiefel', Stiefelette: 'stiefel', Winterstiefel: 'stiefel', Wanderschuh: 'stiefel',
  Loafer: 'loafer', Slipper: 'loafer', Ballerina: 'loafer', 'Schnürschuh': 'loafer', 'Business-Schuh': 'loafer', Sandale: 'sandale', Espadrille: 'sandale',
  Handtasche: 'handtasche', 'Umhängetasche': 'handtasche', 'Crossbody-Tasche': 'handtasche', Clutch: 'handtasche', Portemonnaie: 'handtasche', Kartenetui: 'handtasche', Shopper: 'tote', Rucksack: 'rucksack', Weekender: 'tote', Reisetasche: 'tote',
  Schal: 'schal', Seidentuch: 'schal', Krawatte: 'schal', Handschuhe: 'schal', 'Mütze': 'muetze', 'Gürtel': 'guertel', Socken: 'socken', Pyjama: 'pyjama', 'Unterwäsche': 'unterwaesche', BH: 'bh',
  'Bettwäsche': 'bettwaesche', Spannbettlaken: 'bettwaesche', Bettbezug: 'bettwaesche', Kopfkissenbezug: 'bettwaesche', Wohndecke: 'plaid', Tagesdecke: 'plaid',
  Handtuch: 'handtuch', Badetuch: 'handtuch', 'Gästehandtuch': 'handtuch', Waschlappen: 'handtuch', Duschvorleger: 'teppich', 'Tischläufer': 'serviette', Tischdecke: 'serviette', Geschirrtuch: 'serviette', Serviette: 'serviette', Tischset: 'serviette', 'Schürze': 'serviette', Topflappen: 'serviette',
  Kissen: 'kissen', Dekokissen: 'kissen', Tasse: 'becher', Trinkbecher: 'becher', Vorratsdose: 'becher', Servierschale: 'teller', 'Salatschüssel': 'teller', Vase: 'vase', Kerzenhalter: 'duftkerze', Aufbewahrungskorb: 'korb', Dekotablett: 'korb',
  Lippenstift: 'lippenstift', Mascara: 'lippenstift', Foundation: 'creme', Concealer: 'lippenstift', Rouge: 'creme', Lidschatten: 'creme', Nagellack: 'lippenstift', Creme: 'creme', Handcreme: 'creme', Gesichtsserum: 'parfum', Reinigungsgel: 'creme', Duschgel: 'creme', 'Körperlotion': 'creme',
  Parfum: 'parfum', 'Eau de Toilette': 'parfum', 'Plüschtier': 'plueschtier',
};
const REGELN = [
  // Q27: neue Mode-Silhouetten zuerst
  [/Kinder.?Bade/i, 'kinderbadeanzug'], [/Badeanzug/i, 'badeanzug'], [/Bikini/i, 'bikini'], [/Badeshorts|Badehose/i, 'badeshorts'], [/Jumpsuit|Overall/i, 'jumpsuit'], [/Hosenanzug/i, 'hosenanzug'], [/Anzugweste/i, 'anzugweste'], [/Anzug/i, 'anzug'], [/Puff/i, 'puffaermelbluse'], [/Off.?Shoulder|Carmen/i, 'offshoulder'],
  [/Corsage|Korsage|Bustier/i, 'corsagetop'], [/Twinset/i, 'twinset'], [/Kimono|Kaftan/i, 'kimono'], [/Pullunder/i, 'pullunder'], [/Teddy/i, 'teddyjacke'], [/Poncho/i, 'poncho'],
  [/Tüll/i, 'tuellrock'], [/Lederrock/i, 'lederrock'], [/Paperbag/i, 'paperbaghose'],
  [/Blusenkleid/i, 'blusenkleid'], [/Strickweste/i, 'strickweste'], [/Sakko/i, 'sakko'], [/Henley/i, 'henley'], [/Troyer/i, 'troyer'], [/Rugby/i, 'rugbyshirt'], [/Cargo.?Shorts/i, 'cargoshorts'], [/Chino.?Shorts/i, 'chinoshorts'],
  [/Harrington/i, 'harringtonjacke'], [/Field/i, 'fieldjacket'], [/Funktions/i, 'funktionsjacke'], [/Shacket|Hemdjacke/i, 'hemdjacke'], [/Strampler/i, 'strampler'], [/Langarm.?Body/i, 'langarmbody'],
  [/Latzkleid/i, 'latzkleid'], [/Matsch/i, 'matschhose'], [/Schneeanzug/i, 'schneeanzug'], [/Schlafsack/i, 'schlafsack'], [/Leggings.?Set/i, 'leggingsset'], [/Kapuzenjacke|Sweatjacke/i, 'kapuzenjacke'],
  [/Track.?Jacket|Trainingsjacke/i, 'trackjacket'], [/Track.?Pants|Trainingshose/i, 'trackpants'], [/Oversize.?Hemd/i, 'oversizehemd'], [/Cargorock|Cargo.?Rock/i, 'cargorock'], [/Minikleid/i, 'minikleid'], [/Cropped.?Cardigan/i, 'croppedcardigan'],
  [/Crop/i, 'croptop'], [/Babytee|Baby-Tee/i, 'babytee'], [/Boxy/i, 'boxytee'], [/Hoodie|Kapuzen/i, 'hoodie'], [/Sweat/i, 'sweatshirt'], [/Rollkragen/i, 'rollkragen'], [/Pullover|Strickpulli/i, 'pullover'],
  [/Cardigan|Strickjacke|Twinset/i, 'strickjacke'], [/Polo/i, 'polo'], [/Longsleeve/i, 'longsleeve'], [/Träger|Spaghetti/i, 'traegertop'], [/Top/i, 'top'], [/Tunika/i, 'tunika'], [/Bluse/i, 'bluse'], [/Overshirt/i, 'overshirt'], [/Hemd/i, 'hemd'], [/Shirt/i, 'tshirt'],
  [/Jeansshorts|Jeans-Shorts/i, 'jeansshorts'], [/Wide.?Leg.*Jeans|Weite Jeans/i, 'widelegjeans'], [/Baggy/i, 'baggyjeans'], [/Mom/i, 'momjeans'], [/Skinny/i, 'skinnyjeans'], [/Flare|Bootcut/i, 'flarejeans'], [/Jeans/i, 'jeans'],
  [/Cargo/i, 'cargohose'], [/Jogg|Track/i, 'jogginghose'], [/Leggings/i, 'leggings'], [/Marlene|Wide.?Leg/i, 'marlenehose'], [/Leinenhose/i, 'leinenhose'], [/Cord/i, 'cordhose'], [/Komfort|Stretch/i, 'komforthose'], [/Bermuda/i, 'bermuda'], [/Shorts/i, 'shorts'], [/Culotte/i, 'culotte'], [/Latz/i, 'latzhose'], [/Chino/i, 'chino'], [/Hose/i, 'stoffhose'],
  [/Plissee.*Mini|Mini.*Plissee/i, 'plisseeminirock'], [/Plissee/i, 'plisseerock'], [/Minirock/i, 'minirock'], [/Bleistift/i, 'bleistiftrock'], [/Wickelrock/i, 'wickelrock'], [/Stufen/i, 'stufenrock'], [/Midirock/i, 'midirock'], [/Rock/i, 'rock'],
  [/Slip.?Dress|Slipkleid/i, 'slipdress'], [/Etui/i, 'etuikleid'], [/Hemdblusen/i, 'hemdblusenkleid'], [/Maxi/i, 'maxikleid'], [/Wickelkleid/i, 'wickelkleid'], [/Strickkleid/i, 'strickkleid'], [/Sommerkleid/i, 'sommerkleid'], [/Kleid/i, 'kleid'],
  [/Trench/i, 'trenchcoat'], [/Steppweste|Puffer.?Weste|Weste/i, 'steppweste'], [/Stepp|Puffer|Daunen/i, 'steppjacke'], [/Jeansjacke/i, 'jeansjacke'], [/Regen|Softshell|Funktion/i, 'regenjacke'], [/Parka/i, 'parka'], [/Varsity|College/i, 'varsityjacke'], [/Bomber/i, 'bomberjacke'], [/Leder.?jacke|Biker/i, 'lederjacke'], [/Overshirt|Hemdjacke/i, 'overshirt'], [/Blazer|Sakko|Anzug/i, 'blazer'], [/Mantel|Coat/i, 'mantel'], [/Jacke/i, 'steppjacke'],
  [/Sneaker/i, 'sneaker'], [/Pumps/i, 'pumps'], [/Boot|Stiefel/i, 'stiefel'], [/Sandal|Espadrille/i, 'sandale'], [/Schuh|Loafer|Slipper|Ballerina/i, 'loafer'],
  [/Bucket|Sonnenhut|Fischerhut/i, 'buckethat'], [/Cap/i, 'cap'], [/Mütze|Beanie/i, 'muetze'], [/Tote|Shopper|Beutel/i, 'tote'], [/Rucksack/i, 'rucksack'], [/Tasche|Clutch/i, 'handtasche'], [/Schal|Tuch$/i, 'schal'], [/Gürtel/i, 'guertel'], [/Socke|Strumpf/i, 'socken'],
  [/Pyjama|Schlafanzug/i, 'pyjama'], [/BH|Bustier/i, 'bh'], [/Slip|Unterhose|Unterwäsche|Boxer/i, 'unterwaesche'], [/Body/i, 'kinderbody'],
  [/Bett|Laken|Kopfkissen/i, 'bettwaesche'], [/Plaid|Decke/i, 'plaid'], [/Kissen/i, 'kissen'], [/Handtuch|Frottier|Waffel|Badetuch/i, 'handtuch'], [/Kerze|Duft/i, 'duftkerze'], [/Vase/i, 'vase'], [/Becher|Tasse|Mug/i, 'becher'], [/Teller|Geschirr|Schale|Schüssel|Steingut/i, 'teller'],
  [/Karaffe/i, 'karaffe'], [/Glas|Gläser/i, 'glas'], [/Korb|Tablett/i, 'korb'], [/Serviette|Tischläufer|Tischdecke|Tischset/i, 'serviette'], [/Rahmen/i, 'bilderrahmen'], [/Teppich|Vorleger|Läufer/i, 'teppich'],
  [/Lippen|Nagellack|Mascara|Concealer/i, 'lippenstift'], [/Parfum|Toilette|Serum/i, 'parfum'], [/Creme|Lotion|Gel|Rouge|Puder/i, 'creme'], [/Plüsch|Kuschel/i, 'plueschtier'],
];

export function bildFuer(artikeltyp) {
  const n = NAMEN[artikeltyp];
  if (n) return typeof n === 'string' ? { silhouette: n } : n;
  for (const [re, id] of REGELN) if (re.test(artikeltyp ?? '')) return { silhouette: id };
  return { silhouette: 'tshirt' };
}
