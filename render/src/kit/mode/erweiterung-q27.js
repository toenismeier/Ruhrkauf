// Q27: eigene Silhouetten und Zeichner dieses Chats (Konfliktvermeidung zwischen Q27, Q28, Q29).
// SILHOUETTEN: neue Einträge oder Ersatz bestehender (gleiche id überschreibt den Basiseintrag), Format wie in silhouetten.js.
// ZEICHNER: { name: (S, t, p) => void } – in SILHOUETTEN als zeichner: 'z:name' verwenden.
// Zusatzfelder: nur (damen|herren|kinder|teens), geschlecht (bei Kinderartikeln), zoom [Faktor, cx, cy],
// modelTeile (p, farbe, material) → Teile am Model (Sets, Einteiler, Westen über Hemd).
import { ZEICHNER as Z } from './q27-zeichner.js';

export const ZEICHNER = Z;

const o = (p, material = 'baumwolle', farbe = 'weiß', x = {}) => ({ gruppe: 'oberteil', zeichner: 'oberteil', p, material, farbe, model: 'oberteil', ...x });
const h = (p, material = 'baumwolle', farbe = 'sand', x = {}) => ({ gruppe: 'unterteil', zeichner: 'hose', p, material, farbe, model: 'hose', ...x });
const k = (p, material = 'viskose', farbe = 'bordeaux', x = {}) => ({ gruppe: 'kleid', zeichner: 'kleid', p, material, farbe, model: 'kleid', nur: 'damen', ...x });
const j = (art, material, farbe, p = {}, x = {}) => ({ gruppe: 'jacke', zeichner: 'jacke', p: { art, ...p }, material, farbe, model: 'jacke', ...x });
const z = (gruppe, name, material, farbe, model, p = {}, x = {}) => ({ gruppe, zeichner: 'z:' + name, p, material, farbe, model, ...x });

// Model-Teile für Sets und Einteiler
const gleich = (farbe, material, ...teile) => teile.map((t) => ({ farbe, material, ...t }));
const KURZ = { zoom: [1.38, 50, 33] };

export const SILHOUETTEN = {
  // ─────────── Ersatz bestehender
  kinderbody: z('oberteil', 'kinderbody', 'baumwolle', 'gelb', null, { aermel: 'kurz' }, { nur: 'kinder' }),

  // ─────────── Damen
  jumpsuit: z('kleid', 'jumpsuit', 'viskose', 'olive', 'kleid', {}, { nur: 'damen', modelTeile: (p, f, m) => gleich(f, m, { teil: 'hose', passform: 'weit', leibhoehe: 'hoch', komfortbund: true }, { teil: 'oberteil', aermel: 'ohne', ausschnitt: 'v', passform: 'tailliert', laenge: 'normal' }) }),
  hosenanzug: z('jacke', 'anzugset', 'wolle', 'camel', 'jacke', { art: 'blazer', hose: 'weit' }, { nur: 'damen', modelTeile: (p, f, m) => gleich(f, m, { teil: 'hose', passform: 'weit', bundfalte: true, leibhoehe: 'hoch' }, { teil: 'jacke', laenge: 'normal', revers: true }) }),
  puffaermelbluse: o({ aermel: 'puff', kragen: 'rund', passform: 'tailliert', knopfleiste: true }, 'viskose', 'weiß', { nur: 'damen' }),
  offshoulder: z('oberteil', 'offshoulder', 'baumwolle', 'weiß', 'oberteil', {}, { nur: 'damen', modelTeile: (p, f, m) => gleich(f, m, { teil: 'oberteil', aermel: 'kurz', ausschnitt: 'offshoulder', passform: 'gerade' }) }),
  corsagetop: z('oberteil', 'corsage', 'satin', 'schwarz', 'oberteil', { traeger: true }, { nur: 'damen', modelTeile: (p, f, m) => gleich(f, m, { teil: 'oberteil', aermel: 'ohne', ausschnitt: 'carree', passform: 'tailliert' }) }),
  twinset: z('oberteil', 'twinset', 'merino', 'altrosa', 'oberteil', {}, { nur: 'damen', modelTeile: (p, f, m) => gleich(f, m, { teil: 'oberteil', aermel: 'kurz', passform: 'tailliert', rippbund: true }, { teil: 'jacke', laenge: 'normal' }) }),
  kimono: z('jacke', 'kimono', 'viskose', 'petrol', 'jacke', { muster: 'print' }, { nur: 'damen', modelTeile: (p, f, m) => gleich(f, m, { teil: 'jacke', laenge: 'normal', guertel: true, muster: p.muster }) }),
  pullunder: o({ aermel: 'ohne', kragen: 'v', rippbund: true, strick: true, armbuendchen: true, laenge: 'kurz', muster: 'karo', passform: 'gerade' }, 'merino', 'marine', { zoom: [1.12, 50, 42], modelTeile: (p, f, m) => [{ teil: 'oberteil', aermel: 'lang', kragen: true, knopfleiste: true, farbe: 'weiß', material: 'baumwolle' }, { teil: 'oberteil', aermel: 'ohne', ausschnitt: 'v', rippbund: true, farbe: f, material: m, muster: p.muster }] }),
  croppedcardigan: j('strickjacke', 'strick', 'rosa', { laenge: 'crop', v: true }, { nur: 'damen', zoom: [1.12, 50, 40] }),
  teddyjacke: j('teddy', 'teddy', 'ecru'),
  poncho: z('jacke', 'poncho', 'strick', 'camel', 'jacke', {}, { nur: 'damen', modelTeile: (p, f, m) => gleich(f, m, { teil: 'poncho' }) }),
  tuellrock: z('rock', 'tuellrock', 'tuell', 'altrosa', 'rock', { laenge: 'midi' }, { nur: 'damen', modelTeile: (p, f, m) => gleich(f, m, { teil: 'rock', laenge: 'midi', form: 'glocke' }) }),
  lederrock: z('rock', 'lederrock', 'leder', 'schwarz', 'rock', { laenge: 'mini' }, { nur: 'damen', zoom: [1.42, 50, 34], modelTeile: (p, f, m) => gleich(f, m, { teil: 'rock', laenge: 'mini', form: 'a-linie' }) }),
  paperbaghose: z('unterteil', 'paperbag', 'viskose', 'sand', 'hose', {}, { nur: 'damen', zoom: [0.96, 50, 49], modelTeile: (p, f, m) => gleich(f, m, { teil: 'hose', passform: 'weit', paperbag: true }) }),
  badeanzug: z('bademode', 'badeanzug', 'polyester', 'marine', null, {}, { nur: 'damen' }),
  bikini: z('bademode', 'bikini', 'polyester', 'koralle', null, {}, { nur: 'damen' }),
  blusenkleid: z('kleid', 'blusenkleid', 'viskose', 'flaschengruen', 'kleid', { muster: 'punkte' }, { nur: 'damen', modelTeile: (p, f, m) => gleich(f, m, { teil: 'kleid', laenge: 'midi', form: 'a-linie', aermel: 'lang', ausschnitt: 'rund', muster: p.muster }) }),
  strickweste: j('strickweste', 'strick', 'ecru', {}, { modelTeile: (p, f, m) => [{ teil: 'jacke', laenge: 'normal', weste: true, farbe: f, material: m }] }),

  // ─────────── Herren
  anzug: z('jacke', 'anzugset', 'wolle', 'marine', 'jacke', { art: 'sakko', hose: 'gerade' }, { nur: 'herren', modelTeile: (p, f, m) => gleich(f, m, { teil: 'hose', passform: 'gerade', bundfalte: true, knopf: true }, { teil: 'jacke', laenge: 'normal', revers: true }) }),
  sakko: j('sakko', 'wolle', 'braun', { muster: 'karo' }, { nur: 'herren' }),
  anzugweste: j('anzugweste', 'wolle', 'anthrazit', {}, { nur: 'herren', zoom: [1.1, 50, 42], modelTeile: (p, f, m) => [{ teil: 'jacke', laenge: 'kurz', weste: true, farbe: f, material: m }] }),
  henley: o({ aermel: 'lang', kragen: 'henley' }, 'baumwolle', 'ecru'),
  troyer: o({ aermel: 'lang', kragen: 'troyer', rippbund: true, strick: true }, 'strick', 'marine'),
  rugbyshirt: z('oberteil', 'rugby', 'baumwolle', 'flaschengruen', 'oberteil', { muster: 'blockstreifen' }, { modelTeile: (p, f, m) => [{ teil: 'oberteil', aermel: 'lang', kragen: true, knopfleiste: false, rippbund: true, farbe: f, material: m, muster: p.muster }] }),
  cargoshorts: h({ laenge: 'bermuda', passform: 'weit', cargo: true }, 'baumwolle', 'khaki'),
  badeshorts: z('bademode', 'badeshorts', 'polyester', 'petrol', null, { muster: 'print' }, { nur: 'herren', ...KURZ }),
  chinoshorts: h({ laenge: 'kurz', passform: 'schmal', saum: 'umschlag' }, 'baumwolle', 'marine'),
  harringtonjacke: j('harrington', 'baumwolle', 'sand'),
  fieldjacket: j('fieldjacket', 'baumwolle', 'olive'),
  funktionsjacke: j('funktion', 'nylon', 'petrol'),
  hemdjacke: j('overshirt', 'wolle', 'rot', { muster: 'karo' }),

  // ─────────── Kinder
  strampler: z('oberteil', 'strampler', 'baumwolle', 'hellblau', null, { muster: 'streifen' }, { nur: 'kinder' }),
  langarmbody: z('oberteil', 'kinderbody', 'baumwolle', 'ecru', null, { aermel: 'lang' }, { nur: 'kinder' }),
  latzkleid: z('kleid', 'latzkleid', 'cord', 'senf', 'rock', {}, { nur: 'kinder', geschlecht: 'damen', modelTeile: (p, f, m) => gleich(f, m, { teil: 'rock', laenge: 'knie', form: 'a-linie', latz: true }) }),
  matschhose: z('unterteil', 'matschhose', 'gummi', 'rot', 'hose', {}, { nur: 'kinder', schuhe: { art: 'gummistiefel', farbe: 'gelb', material: 'gummi' }, modelTeile: (p, f, m) => gleich(f, m, { teil: 'hose', passform: 'weit', latz: true }) }),
  schneeanzug: z('jacke', 'schneeanzug', 'polyester', 'flieder', 'jacke', {}, { nur: 'kinder', schuhe: { art: 'stiefel', farbe: 'anthrazit' }, modelTeile: (p, f, m) => gleich(f, m, { teil: 'hose', passform: 'weit' }, { teil: 'jacke', laenge: 'normal', steppung: true, kapuze: true, zip: true }) }),
  schlafsack: z('waesche', 'schlafsack', 'baumwolle', 'salbei', null, { muster: 'punkte' }, { nur: 'kinder' }),
  leggingsset: z('oberteil', 'leggingsset', 'baumwolle', 'koralle', 'oberteil', { muster: 'print' }, { nur: 'kinder', geschlecht: 'damen', modelTeile: (p, f, m) => [{ teil: 'oberteil', aermel: 'kurz', farbe: f, material: m, muster: p.muster }, { teil: 'hose', passform: 'skinny', komfortbund: true, farbe: '#5a2c26', material: m }] }),
  kinderbadeanzug: z('bademode', 'badeanzug', 'polyester', 'rosa', null, { rueschen: true, muster: 'punkte' }, { nur: 'kinder' }),
  kapuzenjacke: o({ aermel: 'lang', kragen: 'kapuze', kaenguru: true, rippbund: true, zip: true, passform: 'gerade' }, 'baumwolle', 'koralle', { nur: 'kinder' }),

  // ─────────── Teens
  trackjacket: j('track', 'polyester', 'schwarz'),
  trackpants: z('unterteil', 'trackpants', 'polyester', 'schwarz', 'hose', {}, { modelTeile: (p, f, m) => gleich(f, m, { teil: 'hose', passform: 'schmal', komfortbund: true, streifen: true }) }),
  oversizehemd: o({ aermel: 'lang', kragen: 'hemd', passform: 'oversize', laenge: 'lang', brusttasche: true, muster: 'karo' }, 'baumwolle', 'bordeaux'),
  cargorock: z('rock', 'cargorock', 'baumwolle', 'khaki', 'rock', {}, { nur: 'damen', modelTeile: (p, f, m) => gleich(f, m, { teil: 'rock', laenge: 'midi', form: 'gerade' }) }),
  minikleid: k({ laenge: 'mini', form: 'gerade', aermel: 'lang', kragen: 'rund' }, 'strick', 'schwarz', { zoom: [1.1, 50, 41] }),
  corsage: z('oberteil', 'corsage', 'baumwolle', 'ecru', 'oberteil', {}, { nur: 'damen', zoom: [1.3, 50, 46], modelTeile: (p, f, m) => gleich(f, m, { teil: 'oberteil', aermel: 'ohne', ausschnitt: 'carree', passform: 'tailliert', laenge: 'crop' }) }),
};
