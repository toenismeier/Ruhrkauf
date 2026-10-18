// Prüfskript: alle Städte planen, Überlappungen und Standorte prüfen
import { stadtplan, streifenSchneidet } from './kit/stadtplan.js';
import { STADTLISTE } from './kit/staedte.js';
const nur = process.argv[2];
let fehler = 0;
const t0 = Date.now();
for (const s of STADTLISTE) {
  if (nur && !nur.split(',').includes(s.name)) continue;
  let plan;
  try { plan = stadtplan(s.seed, { typ: s.typ, archetyp: s.archetyp, region: s.region, strassenFaktor: 1.6, ...s.extra, standorte: s.standorte }); }
  catch (e) { console.log('ABSTURZ', s.name, e.stack); fehler++; continue; }
  const P = plan.parzellen;
  const ueber = [];
  for (let a = 0; a < P.length; a++) for (let b = a + 1; b < P.length; b++) {
    const p = P[a], q = P[b];
    if (p.x < q.x + q.w - 0.05 && p.x + p.w > q.x + 0.05 && p.z < q.z + q.d - 0.05 && p.z + p.d > q.z + 0.05) ueber.push(`${p.typ}/${q.typ}`);
  }
  // Parzellen auf Straßen
  const strasse = [];
  for (const p of P) for (const st of plan.strassen) {
    const [a0, a1] = st.achse === 'z' ? [st.mitte - st.breite / 2, st.mitte + st.breite / 2] : [st.mitte - st.breite / 2, st.mitte + st.breite / 2];
    const ov = st.achse === 'z' ? p.x < a1 - 0.05 && p.x + p.w > a0 + 0.05 && p.z < st.bis - 0.05 && p.z + p.d > st.von + 0.05 : p.z < a1 - 0.05 && p.z + p.d > a0 + 0.05 && p.x < st.bis - 0.05 && p.x + p.w > st.von + 0.05;
    if (ov) strasse.push(p.typ);
  }
  // Parzellen auf diagonalen Straßen (Fächer)
  for (const p of P) for (const d of plan.diagonalen ?? []) if (streifenSchneidet(p, d.C, d.dx, d.dz, d.t0, d.t1, d.breite / 2)) strasse.push(p.typ + '/diagonal');
  // Landmarken und Slots tragen nie Haus-Stile (sonst NaN-Geometrie, z. B. Kirche mit stil 'fachwerk')
  for (const p of P) if (p.typ.startsWith('slot:') && ['fachwerk', 'gruenderzeit', 'modern'].includes(p.stil)) strasse.push(p.typ + '/stil:' + p.stil);
  const fehlt = s.standorte.length - plan.standorte.length;
  const ost = {}; for (const p of P) if (p.typ.startsWith('slot:')) ost[p.typ] = (ost[p.typ] ?? 0) + 1;
  const ok = !ueber.length && !fehlt && !strasse.length;
  if (!ok) fehler++;
  if (!ok || nur || s.extra.ddr) console.log(ok ? 'ok  ' : 'FEHL', s.name, s.archetyp, `${Math.round(plan.breite)}×${Math.round(plan.tiefe)}`, 'Überl', ueber.length, ueber.slice(0, 4).join(' '), 'Straße/Stil', strasse.length, strasse.slice(0, 3).join(' '), 'fehlt', fehlt,
    s.extra.ddr ? Object.entries(ost).filter(([k]) => !['slot:warenhaus', 'slot:sport', 'slot:wettbewerber'].includes(k)).map(([k, v]) => k.slice(5) + ':' + v).join(' ') : '');
}
console.log('Fehler:', fehler, 'Zeit', Date.now() - t0, 'ms');
