// Katalog: dieselben Engine-Häuser (Spielstand Seed 1) in verschiedenen Engine-Situationen, Zustand über bruecke.js zustandAusHaus.
import { zeigeKatalog } from '../kit/katalog.js';
import { sockel, THREE } from '../kit/basis.js';
import { warenhaus } from '../kit/warenhaus.js';
import { sporthaus } from '../kit/sporthaus.js';
import { STATUS_TITEL } from '../kit/zustaende.js';
import { zustandAusHaus } from '../kit/bruecke.js';
import { neuesSpiel } from '../../../turnaround/src/index';

const START = neuesSpiel(1);
const klon = () => JSON.parse(JSON.stringify(START));
const mieter = (name, typ) => ({ name, typ, mieteWoche: 9000, bisWoche: 600, frequenzBonus: 0.03 });
const AKT = { sale: 'Sale', jubilaeum: 'Jubiläum', blackfriday: 'Black Friday', weihnachten: 'Weihnachten' };

// Situation: (s, h, merk) → Kurztext; verändert Spielstand und Haus wie die Engine es täte
const SITUATIONEN = [
  ['Ausgangslage', () => 'Woche 0, unverändert'],
  ['Aktion', (s, h) => { s.marketing.aktionen.push({ id: 'm1', name: '20 % auf alles', rabatt: 0.2, start: 0, ende: 2, scope: { typ: 'haeuser', ids: [h.id] }, kontrollHaeuser: [], kosten: 0 }); return 'Engine-Aktion, Scope Haus'; }],
  ['Black Friday', (s) => { s.woche = 46; return 'Saison KW 47'; }],
  ['Weihnachten', (s) => { s.woche = 50; return 'Saison KW 51'; }],
  ['Untermiete', (s, h) => {
    const eg = h.flaechen.filter((f) => f.etage === 0).sort((a, b) => b.qm - a.qm)[0];
    Object.assign(eg, { konzept: 'untermiete', gruppe: undefined, mieter: mieter('Preisfuchs Markt', 'discounter') });
    const og = h.flaechen.find((f) => f.etage === 2) ?? h.flaechen.find((f) => f.etage === 1);
    if (og) Object.assign(og, { konzept: 'untermiete', gruppe: undefined, mieter: mieter('MVZ Stadtmitte', 'aerztehaus') });
    return 'Discounter im EG, Ärztehaus oben';
  }],
  ['Outlet', (s, h) => { for (const f of h.flaechen.filter((f) => f.etage === 0).slice(0, 1)) Object.assign(f, { konzept: 'offprice' }); return 'Fläche EG auf offprice'; }],
  ['Umbau', (s, h) => { const f = h.flaechen.find((f) => f.etage === 1) ?? h.flaechen[0]; f.umbauBis = s.woche + 6; f.umbauZiel = { konzept: 'eigen', gruppe: f.gruppe }; return 'Fläche 1. OG, umbauBis +6'; }],
  ['Neueröffnung', (s, h, merk) => { const f = h.flaechen[0]; f.umbauBis = 3; zustandAusHaus(h, s, merk); f.umbauBis = undefined; s.woche = 3; return 'Umbau seit KW 4 fertig'; }],
  ['Teilschließung', (s, h) => { const top = Math.max(...h.etagen); for (const f of h.flaechen.filter((f) => f.etage >= top - 1 && f.etage > 0)) Object.assign(f, { konzept: 'leer', gruppe: undefined }); return 'obere Etagen leer'; }],
  ['Räumung', (s, h) => { h.status = 'raeumung'; h.statusBis = 6; return 'status raeumung'; }],
  ['Schließung', (s, h) => { h.status = 'geschlossen'; h.restmieteBis = 26; for (const f of h.flaechen) Object.assign(f, { konzept: 'leer', gruppe: undefined }); return 'geschlossen, Restmiete läuft'; }],
  ['Leerstand', (s, h) => { h.status = 'geschlossen'; h.restmieteBis = 13; s.woche = 40; for (const f of h.flaechen) Object.assign(f, { konzept: 'leer', gruppe: undefined }); return 'Restmiete ausgelaufen'; }],
  ['Verfall', (s, h) => { h.status = 'geschlossen'; h.restmieteBis = 13; h.substanz = 22; s.woche = 90; for (const f of h.flaechen) Object.assign(f, { konzept: 'leer', gruppe: undefined }); return 'Substanz 22'; }],
  ['Verkauft', (s, h) => { h.status = 'verkauft'; return 'Betrieb an Käufer'; }],
];
const SPORT = ['Ausgangslage', 'Aktion', 'Untermiete', 'Umbau', 'Räumung', 'Schließung', 'Verfall', 'Verkauft'];

let letzteSonne = null;
function eintrag(id, [titel, fn]) {
  return {
    titel: '', unter: '',
    bau(S, scene) {
      if (letzteSonne?.shadow.map) { letzteSonne.shadow.map.dispose(); letzteSonne.shadow.map = null; }
      letzteSonne = scene.userData.sonne;
      const s = klon(), h = s.haeuser.find((q) => q.id === id), merk = new Map();
      const text = fn(s, h, merk);
      const z = zustandAusHaus(h, s, merk);
      const { schluessel, ...opt } = z;
      const e = (h.format === 'sport' ? sporthaus : warenhaus)(S, scene, h, { x: 0, z: 0, ...opt });
      sockel(S, 0, 0, e.w, e.d, 5);
      const st = [STATUS_TITEL[z.status], ...z.zusatz.map((q) => STATUS_TITEL[q])].join(' + ');
      this.titel = `${h.name} · ${titel}`;
      this.unter = `${text} → ${st}${z.aktion ? ' · ' + AKT[z.aktion] : ''}${z.hartwig === false ? ' · ohne Marke' : ''}`;
      return new THREE.Box3(new THREE.Vector3(-5, 0, -5), new THREE.Vector3(e.w + 5, e.hoehe, e.d + 5));
    },
  };
}

const eintraege = [];
for (const id of ['W019', 'W020']) for (const sit of SITUATIONEN) eintraege.push(eintrag(id, sit));
for (const sit of SITUATIONEN.filter(([t]) => SPORT.includes(t))) eintraege.push(eintrag('S017', sit));
setTimeout(() => zeigeKatalog(eintraege, { titel: 'Brücke Engine ↔ Grafik: Essen (Seed 1) in Engine-Situationen', spalten: 6, kachel: [420, 400] }), 50);
