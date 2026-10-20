// Maßstabsregeln im Stadtplan, echte Engine-Render-Exporte sind Voraussetzung.
// Aufruf: node pruef-standorte-massstab.js [Stadt,Stadt,…]
import { STADTLISTE } from './kit/staedte.js';
import { stadtplan } from './kit/stadtplan.js';
const auswahl = process.argv[2] ? new Set(process.argv[2].split(',')) : null;
let plaene = 0, fehler = 0, standorte = 0, fehlende = 0, nebenzentren = 0;
const eigener = (q) => ['warenhaus', 'schwester', 'sport', 'outlet'].includes(q.rolle);
for (const s of STADTLISTE.filter((d) => !auswahl || auswahl.has(d.name))) {
  let plan;
  try { plan = stadtplan(s.seed, { typ: s.typ, archetyp: s.archetyp, region: s.region, strassenFaktor: 1.6, ...s.extra, standorte: s.standorte }); }
  catch (e) { console.error(s.name, 'Absturz:', e.message); fehler++; continue; }
  plaene++;
  nebenzentren += plan.nebenzentren?.length ?? 0;
  const bl = new Map(plan.bloecke.map((b) => [b.id, b]));
  const st = plan.standorte.filter((q) => eigener(q));
  const erwartet = s.standorte.filter((q) => eigener(q));
  standorte += st.length;
  const ids = new Set(st.map((q) => q.id));
  for (const x of erwartet) if (!ids.has(x.id)) { console.error(s.name, 'Standort nicht platziert:', x.id); fehler++; fehlende++; }
  const blockBesitzer = new Set();
  for (const q of st) {
    if (blockBesitzer.has(q.block)) { console.error(s.name, 'zwei eigene Häuser im Block:', q.block); fehler++; }
    blockBesitzer.add(q.block);
    if (q.lage === 'b' && q.rolle === 'outlet' && q.typ !== 'slot:outlet') { console.error(s.name, 'FUNDUS in falschem Slot:', q.id); fehler++; }
  }
  for (let i = 0; i < st.length; i++) for (let j = i + 1; j < st.length; j++) {
    const a = st[i], b = st[j];
    const A = bl.get(a.block), B = bl.get(b.block);
    // Fachmärkte im Außenring haben andere Blockindizes und werden separat platziert.
    if (!A || !B || A.i0 === undefined || B.i0 === undefined) continue;
    const abstand = Math.abs(A.i0 - B.i0) + Math.abs(A.j0 - B.j0);
    if (a.rolle === 'warenhaus' && b.rolle === 'warenhaus' && abstand < 3) {
      console.error(s.name, 'Hartwig-Abstand unter zwei Blöcken:', a.id, b.id, abstand); fehler++;
    }
    if (((a.rolle === 'schwester' && b.rolle === 'warenhaus') || (b.rolle === 'schwester' && a.rolle === 'warenhaus')) && abstand < 2) {
      console.error(s.name, 'Volkskauf am/gegenüber Hartwig-Block:', a.id, b.id); fehler++;
    }
  }
  const innen = st.filter((q) => ['1a', 'b'].includes(q.lage));
  if (s.typ === 'metropole' && innen.length >= 4 && !(plan.nebenzentren?.length)) {
    console.error(s.name, 'Nebenzentrum fehlt bei dichtem Standortnetz'); fehler++;
  }
  const haupt = plan.einkaufslagen?.[0];
  if (haupt) {
    // Zählt nicht das gesamte Stadtgebiet, sondern die unmittelbaren Blockgruppen am Hauptkreuz.
    const nah = st.filter((q) => {
      const B = bl.get(q.block);
      return B && B.i0 !== undefined && Math.abs(B.i0 - haupt.kF + 0.5) <= 1.5 && Math.abs(B.j0 - haupt.lF + 0.5) <= 1.5;
    });
    if (nah.length > 3) { console.error(s.name, 'mehr als drei eigene Häuser direkt am Hauptkreuz:', nah.map((q) => q.id).join(',')); fehler++; }
  }
}
console.log('Maßstab-Standorte:', plaene, 'Städte,', standorte, 'eigene Platzierungen,', nebenzentren, 'Nebenzentren,', fehlende, 'fehlende,', fehler, 'Regelverstöße');
if (fehler) process.exitCode = 1;
