// Gemeinsame, begrenzte Stadtausschnitte für die Q02-Bildkataloge.
import { THREE } from '../kit/basis.js';
import { baueStadt, stadtplan } from '../kit/stadt.js';
import { stadtDaten } from '../kit/staedte.js';
import { echterBauer } from '../kit/bauer.js';

export function q02Plan(name) {
  const d = stadtDaten(name);
  if (!d) throw new Error('Unbekannte Stadt: ' + name);
  return stadtplan(d.seed, { typ: d.typ, archetyp: d.archetyp, region: d.region,
    strassenFaktor: 1.6, ...d.extra, standorte: d.standorte });
}
const inBox = (x, z, b) => x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1;
const schneidet = (a, b) => a.x < b.x1 && a.x + a.w > b.x0 && a.z < b.z1 && a.z + a.d > b.z0;
export function q02Box(x, z, rad = 110) { return { x0: x - rad, z0: z - rad, x1: x + rad, z1: z + rad }; }
function schnittStrasse(s, box) {
  const a = s.mitte - s.breite / 2, e = s.mitte + s.breite / 2;
  return s.achse === 'z' ? a < box.x1 && e > box.x0 && s.von < box.z1 && s.bis > box.z0
    : a < box.z1 && e > box.z0 && s.von < box.x1 && s.bis > box.x0;
}
export function q02Szene(S, scene, plan, box, o = {}) {
  const bloecke = plan.bloecke.filter((b) => schneidet(b, box));
  const ids = new Set(bloecke.map((b) => b.id));
  const mini = { ...plan, bloecke, strassen: plan.strassen.filter((s) => schnittStrasse(s, box)),
    kreuzungen: plan.kreuzungen.filter((k) => inBox(k.x, k.z, box)),
    parzellen: plan.parzellen.filter((p) => ids.has(p.block) && (o.ohneHaeuser !== true)),
    aussen: o.aussen ? { ...plan.aussen, wasser: [], gruen: [], kreuzungen: [], strassen: [], bauten: [],
      bloecke: plan.aussen.bloecke.filter((q) => schneidet(q, box)) } : null,
    umland: [], diagonalen: [], zwickel: [] };
  const erg = baueStadt(S, scene, mini, echterBauer(), { aussenring: o.aussen ? 1 : 0, dichte: 0.8, ohneHaeuser: o.ohneHaeuser === true });
  return new THREE.Box3(new THREE.Vector3(box.x0, -1, box.z0), new THREE.Vector3(box.x1, Math.max(28, Math.min(erg.box.max.y, 55)), box.z1));
}
