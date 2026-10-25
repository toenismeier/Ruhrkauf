// Q38: Silhouetten für die neuen Oberteile aus dem Referenzsortiment (Wurf 4). Alle ids beginnen mit q38_, Zeichner z:q38
// (q38-oberteile.js). Format wie silhouetten.js; modelTeile, wo die Form am Model eigene Teile braucht (Layer, Westen, Cape).

import { q38, q38zoom } from './q38-oberteile.js';

const gleich = (farbe, material, ...teile) => teile.map((t) => ({ farbe, material, ...t }));
// Oberteil auf Q25/Q33-Basis (Flatlay + Details) bzw. eigene Form
const ob = (p, material, farbe, x = {}) => ({ gruppe: 'oberteil', zeichner: 'z:q38', p: { basis: 'oberteil', ...p }, material, farbe, model: 'oberteil', zoom: q38zoom, ...x });
const da = (p, material, farbe, x = {}) => ob(p, material, farbe, { nur: 'damen', ...x });
const weste = (p, material, farbe, model = {}) => ({ gruppe: 'jacke', zeichner: 'z:q38', p: { form: 'weste', ...p }, material, farbe, model: 'jacke', zoom: q38zoom, nur: 'damen',
  modelTeile: (q, f, m) => [{ teil: 'oberteil', aermel: 'kurz', passform: 'tailliert', farbe: 'weiß', material: 'baumwolle' }, { teil: 'jacke', laenge: 'normal', weste: true, farbe: f, material: m, ...model }] });

export const SILHOUETTEN = {
  // ── Shirts
  q38_croptshirt: ob({ aermel: 'kurz', kragen: 'rund', passform: 'boxy', laenge: 'crop', motiv: 'nummer', motivS: 13 }, 'baumwolle', 'weiß', { nur: 'damen' }),
  q38_ringershirt: ob({ aermel: 'kurz', kragen: 'rund', d: ['ringer'], kontrast: '#6a4630', motiv: 'schrift', motivS: 14 }, 'baumwolle', 'rosa'),
  q38_raglantshirt: ob({ aermel: 'kurz', kragen: 'rund', passform: 'tailliert', d: ['raglankurz'], kontrast: 'schwarz', motiv: 'college', motivS: 14 }, 'baumwolle', 'offwhite'),
  q38_henleylong: ob({ aermel: 'lang', kragen: 'rund', passform: 'tailliert', d: ['henleylang'] }, 'rippe', 'anthrazit'),
  q38_langarmpolo: ob({ aermel: 'lang', kragen: 'polo', passform: 'tailliert', kragenFarbe: 'schwarz' }, 'baumwolle', 'weiß', { modelTeile: (p, f, m) => gleich(f, m, { teil: 'oberteil', aermel: 'lang', kragen: true }) }),
  q38_layershirt: ob({ aermel: 'kurz', kragen: 'rund', passform: 'boxy', unter: 'aermel', unterFarbe: 'weiß', unterDessin: 'bretagne', motiv: 'nummer', motivS: 12 }, 'baumwolle', 'rot',
    { modelTeile: (p, f, m) => [{ teil: 'oberteil', aermel: 'lang', farbe: 'weiß', material: 'baumwolle', muster: 'streifen' }, { teil: 'oberteil', aermel: 'kurz', passform: 'oversize', farbe: f, material: m }] }),
  q38_aermellos: da({ form: 'aermellos', aermel: 'ohne', kragen: 'rund', passform: 'tailliert', raffung: true }, 'viskose', 'altrosa'),
  q38_strickshirt: ob({ aermel: 'kurz', kragen: 'rund', passform: 'boxy', strick: true, stoff: 'masche', rippbund: true, d: ['kurzbund'] }, 'strick', 'salbei'),
  q38_fledermaus: da({ form: 'fledermaus', aermel: 'kurz', passform: 'oversize' }, 'viskose', 'olive'),
  q38_spitzenshirt: da({ aermel: 'lang', kragen: 'rund', passform: 'tailliert', d: ['schluesselloch', 'bogenkante'] }, 'spitze', 'schwarz'),
  q38_peplumshirt: da({ form: 'peplum', aermel: 'kurz', kragen: 'rund', passform: 'tailliert' }, 'baumwolle', 'weiß'),
  q38_baseballshirt: ob({ aermel: 'lang', kragen: 'rund', d: ['raglanlang', 'rundsaum'], kontrast: 'rot' }, 'baumwolle', 'weiß',
    { modelTeile: (p, f, m) => gleich(f, m, { teil: 'oberteil', aermel: 'lang' }) }),
  q38_sportshirt: da({ aermel: 'kurz', kragen: 'rund', passform: 'tailliert', d: ['meshseite', 'flatlock'] }, 'nylon', 'petrol'),
  // ── Tops
  q38_body: da({ form: 'body', aermel: 'lang', kragen: 'rund', passform: 'tailliert' }, 'baumwolle', 'schwarz'),
  q38_tanktop: da({ form: 'tank', aermel: 'ohne', passform: 'tailliert' }, 'rippe', 'gelb'),
  q38_peplumtop: da({ form: 'peplum', aermel: 'traeger', kragen: 'v', passform: 'tailliert', smok: true }, 'rippe', 'rot'),
  q38_stricktop: da({ aermel: 'ohne', kragen: 'rund', armbuendchen: true, strick: true, rippbund: true, passform: 'tailliert', laenge: 'crop', stoff: 'masche' }, 'strick', 'rosa'),
  q38_bustier: da({ form: 'bustier', aermel: 'ohne', laenge: 'crop', passform: 'tailliert', kragen: 'carree', muster: 'punkte' }, 'baumwolle', 'weiß'),
  q38_muscle: ob({ form: 'muscle', aermel: 'ohne', passform: 'boxy' }, 'baumwolle', 'grau', { nur: 'herren' }),
  q38_oneshoulder: da({ form: 'oneshoulder', aermel: 'kurz', passform: 'tailliert', kragen: 'v' }, 'viskose', 'ecru'),
  q38_westentop: weste({ ausschnitt: 'kragen', saum: 'schoss', verschluss: 'knoepfe', abstand: 6, unten: 62 }, 'polyester', 'marine'),
  q38_jeanstop: da({ aermel: 'puff', kragen: 'carree', passform: 'tailliert', laenge: 'kurz', d: ['denimnaht', 'metall'], abstand: 6 }, 'denim', 'jeansblau'),
  q38_sporttop: da({ form: 'tank', aermel: 'ohne', passform: 'tailliert', unten: 54, d: ['kreuz', 'unterbrust'], kontrast: '#2a2c30' }, 'nylon', 'flieder', { zoom: [1.3, 50, 36] }),
  // ── Blusen und Hemden
  q38_resorthemd: ob({ aermel: 'kurz', kragen: 'rund', passform: 'boxy', extras: ['revers'], muster: 'print' }, 'viskose', 'petrol', { nur: 'herren', modelTeile: (p, f, m) => gleich(f, m, { teil: 'oberteil', aermel: 'kurz', kragen: true, knopfleiste: true, passform: 'oversize', muster: 'streifen' }) }),
  q38_hemdbluse: da({ aermel: 'lang', kragen: 'hemd', passform: 'tailliert', knopfleiste: true, d: ['abnaeher'] }, 'baumwolle', 'bordeaux'),
  q38_wickelbluse: da({ aermel: 'lang', kragen: 'wickel', passform: 'oversize', laenge: 'crop', d: ['glocke', 'knoten'] }, 'seide', 'lila'),
  q38_peplumbluse: da({ form: 'peplum', aermel: 'lang', kragen: 'hemd', knopfleiste: true, passform: 'tailliert' }, 'baumwolle', 'hellblau'),
  q38_jeanshemd: ob({ aermel: 'lang', kragen: 'hemd', passform: 'boxy', d: ['pattentasche', 'metall'], zwei: true, abstand: 9 }, 'denim', 'dunkeldenim'),
  q38_lagenhemd: ob({ aermel: 'kurz', kragen: 'hemd', passform: 'boxy', muster: 'karo', unter: 'aermel', unterFarbe: 'weiß' }, 'baumwolle', 'khaki', { nur: 'herren',
    modelTeile: (p, f, m) => [{ teil: 'oberteil', aermel: 'lang', farbe: 'weiß', material: 'baumwolle' }, { teil: 'oberteil', aermel: 'kurz', kragen: true, knopfleiste: true, passform: 'oversize', farbe: f, material: m, muster: 'karo' }] }),
  q38_lagenbluse: da({ aermel: 'ohne', kragen: 'v', strick: true, rippbund: true, armbuendchen: true, passform: 'tailliert', unter: 'bluse', unterFarbe: 'weiß' }, 'strick', 'schwarz',
    { modelTeile: (p, f, m) => [{ teil: 'oberteil', aermel: 'lang', kragen: true, knopfleiste: true, farbe: 'weiß', material: 'baumwolle' }, { teil: 'oberteil', aermel: 'ohne', ausschnitt: 'v', rippbund: true, farbe: f, material: m }] }),
  // ── Pullover und Strick
  q38_strickpolo: ob({ aermel: 'kurz', kragen: 'polo', passform: 'boxy', strick: true, rippbund: true, d: ['johnny'], kontrast: '#8a3f2a', kragenFarbe: '#8a3f2a' }, 'rippe', 'offwhite'),
  q38_kurzarmstrick: da({ aermel: 'kurz', kragen: 'stehkragen', passform: 'tailliert', strick: true, rippbund: true, d: ['schulterknoepfe'] }, 'merino', 'hellgrau'),
  q38_offpulli: da({ form: 'offpulli', aermel: 'lang', passform: 'oversize', laenge: 'kurz' }, 'strick', 'creme', { modelTeile: (p, f, m) => gleich(f, m, { teil: 'oberteil', aermel: 'lang', ausschnitt: 'offshoulder', passform: 'oversize', rippbund: true }) }),
  q38_netzstrick: ob({ aermel: 'lang', kragen: 'rund', passform: 'oversize', strick: true, rippbund: true, loch: true }, 'strick', 'rot'),
  q38_henleypulli: ob({ aermel: 'lang', kragen: 'henley', strick: true, rippbund: true, stoff: 'masche' }, 'strick', 'braun'),
  q38_strickcape: da({ form: 'cape', strick: true }, 'strick', 'braun', { gruppe: 'oberteil', modelTeile: (p, f, m) => gleich(f, m, { teil: 'poncho' }) }),
  q38_vpullover: ob({ aermel: 'lang', kragen: 'v', passform: 'oversize', strick: true, rippbund: true, laenge: 'lang' }, 'kaschmir', 'creme'),
  // ── Sweat und Hoodies
  q38_sweatjacke: ob({ aermel: 'lang', kragen: 'kapuze', zip: true, rippbund: true, passform: 'gerade', laenge: 'kurz', extras: ['raglan'], raglanFarbe: '#273659', stoff: 'melange', d: ['zipTaschen'] }, 'baumwolle', 'hellgrau',
    { gruppe: 'oberteil', modelTeile: (p, f, m) => gleich(f, m, { teil: 'oberteil', aermel: 'lang', kapuze: true, rippbund: true, zip: true }) }),
  q38_sweattroyer: ob({ aermel: 'lang', kragen: 'troyer', passform: 'boxy', kaenguru: true, rippbund: true, stoff: 'melange' }, 'baumwolle', 'marine'),
  q38_kurzarmsweat: ob({ aermel: 'kurz', kragen: 'rund', passform: 'boxy', rippbund: true, stoff: 'melange', bundBreit: 4.2, d: ['kurzbund', 'vinsert'], motiv: 'schrift', motivS: 14 }, 'baumwolle', 'hellgrau'),
  q38_offsweat: da({ form: 'offsweat', aermel: 'lang', passform: 'oversize', motiv: 'nummer' }, 'baumwolle', 'hellgrau', { modelTeile: (p, f, m) => gleich(f, m, { teil: 'oberteil', aermel: 'lang', ausschnitt: 'offshoulder', passform: 'oversize', rippbund: true }) }),
  q38_polosweat: ob({ aermel: 'lang', kragen: 'polo', passform: 'oversize', rippbund: true, d: ['halbzip', 'aermelstreifen'], streifen: '#c8372f', kragenFarbe: 'offwhite' }, 'baumwolle', 'anthrazit'),
  q38_strickhoodie: ob({ aermel: 'lang', kragen: 'kapuze', strick: true, rippbund: true, passform: 'boxy', stoff: 'masche', d: ['kordeln'] }, 'strick', 'hellblau'),
  // ── Cardigans, Westen
  q38_bolero: da({ form: 'bolero', aermel: 'lang', laenge: 'crop', passform: 'tailliert', strick: true }, 'merino', 'schwarz', { modelTeile: (p, f, m) => gleich(f, m, { teil: 'oberteil', aermel: 'lang', laenge: 'crop', passform: 'tailliert' }) }),
  q38_wickeljacke: da({ aermel: 'lang', kragen: 'wickel', strick: true, rippbund: true, laenge: 'kurz', passform: 'gerade', d: ['wickelschleife'] }, 'strick', 'rosa'),
  q38_jeansweste: weste({ ausschnitt: 'v', saum: 'spitz', taschen: true, abstand: 7, unten: 74 }, 'denim', 'jeansblau'),
  q38_weste: weste({ ausschnitt: 'rund', saum: 'spitz', abstand: 7.6 }, 'leinen', 'beige'),
  q38_kunstfellweste: weste({ ausschnitt: 'steh', saum: 'bund', verschluss: 'zip', fell: true, unten: 76 }, 'teddy', 'creme', { zip: true }),
};

export const ZEICHNER = { q38 };
