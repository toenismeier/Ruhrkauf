// Prüfskript Gestaltung (GESTALTUNG.md): zählt je Stadt messbare Verstöße im Plan, für die ganze Stadt und für den
// Nahausschnitt der Einkaufslage (dieselbe Kamera wie standortEintrag(name, 'einkauf', zoom) im Katalog: stadtrand.js
// nahMitte, Standard zoom 62, Kachel 720 × 1280, rand 1.1). Der Stadtrandgürtel (plan.aussen) zählt mit.
// Aufruf über node pruef-gestaltung.js [Stadt,Stadt,…] [--zoom 62] [--kachel 720x1280]
import { THREE, kameraFuer } from './kit/basis.js';
import { stadtplan, streifenSchneidet } from './kit/stadtplan.js';
import { stadtDaten, nachbarStaedte, STADTLISTE } from './kit/staedte.js';
import { nahMitte } from './kit/stadtrand.js';
import { jahreszeit } from './kit/jahreszeit.js';
import outletHaeuser from '../haeuser-outlet.json';
import hartwigHaeuser from '../haeuser.json';
import { familieOutlet, masseOutlet } from './kit/outlet.js';
import { pruefeStadtQualitaet } from './kit/q02-pruefer.js';

const arg = process.argv.slice(2);
const opt = (n, d) => { const i = arg.indexOf(n); return i >= 0 ? arg[i + 1] : d; };
const namen = arg.includes('--alle') ? STADTLISTE.map((s) => s.name) : (arg[0] && !arg[0].startsWith('--') ? arg[0] : 'Essen,Duisburg,Gelsenkirchen').split(',');
const Q02 = arg.includes('--q02');
const zoom = Number(opt('--zoom', 62));
const [KW, KH] = opt('--kachel', '720x1280').split('x').map(Number);
const RAND = Number(opt('--rand', 1.1));
// Saisonale Stadt-Dekoration ist ein Overlay. Die planerischen Gestaltungsgrenzen bleiben identisch.
const JAHRESZEIT_WOCHEN = { winter: 1, fruehling: 13, sommer: 27, herbst: 40, weihnachten: 48, schnee: 4 };
const pruefJahreszeit = opt('--jahreszeit', null);
const saisonListe = pruefJahreszeit === 'alle' ? Object.keys(JAHRESZEIT_WOCHEN) : pruefJahreszeit ? [pruefJahreszeit] : [];
for (const id of saisonListe) if (!(id in JAHRESZEIT_WOCHEN)) throw new Error('Unbekannte Jahreszeit ' + id);


// Parzellen ohne Gebäude (Lücken im Blockrand)
const OFFEN = new Set(['luecke', 'baustelle', 'parkplatz', 'platz', 'durchgang']);
// Großbauten, die nicht in die Innenstadt gehören (Flächenarten und Slot-Typen)
const GROSS_ART = new Set(['west_zeche', 'west_kokerei', 'west_halde', 'west_stadion', 'west_ekz', 'west_kanal', 'west_siedlung', 'center', 'fachmarkt', 'gewerbe', 'mall']);
const GROSS_SLOT = new Set(['slot:ruhr_zeche', 'slot:ruhr_kokerei', 'slot:ruhr_halde', 'slot:ruhr_stadion', 'slot:ruhr_einkaufszentrum', 'slot:ruhr_siedlung', 'slot:mall', 'slot:discounter', 'slot:ruhr_kanal']);
const BEBAUT = new Set(['bebaut', 'warenhaus']);
const RASEN_BODEN = new Set(['west_siedlung']);   // Flächen mit Rasenboden (archetypen/west.js bodenRasen)
const PARK = new Set(['park', 'gruenguertel', 'kleingarten', 'west_promenade']);
const PLATZ = new Set(['platz', 'markt', 'kirche', 'domplatz', 'schloss']);
const KAI = new Set(['west_hafenkai', 'west_medienhafen', 'hafenkante', 'speicherzeile']);   // Kaiflächen mit Bauten an der Kante (west.js, nord.js)
const UFER_SLOT = new Set(['slot:rhein_promenade', 'slot:ruhr_kanal', 'slot:nord_speicher']);

function raster(plan) {
  // Gitterindex (20 m) für Blöcke, Parzellen und Straßen
  const G = 20, idx = new Map();
  const rein = (x0, z0, x1, z1, o) => { for (let a = Math.floor(x0 / G); a <= Math.floor(x1 / G); a++) for (let c = Math.floor(z0 / G); c <= Math.floor(z1 / G); c++) { const k = a + ',' + c; if (!idx.has(k)) idx.set(k, []); idx.get(k).push(o); } };
  for (const b of plan.bloecke) rein(b.x, b.z, b.x + b.w, b.z + b.d, { b });
  for (const p of plan.parzellen) rein(p.x, p.z, p.x + p.w, p.z + p.d, { p });
  for (const s of plan.strassen) { const [a0, a1] = [s.mitte - s.breite / 2, s.mitte + s.breite / 2]; if (s.achse === 'z') rein(a0, s.von, a1, s.bis, { s, x0: a0, x1: a1, z0: s.von, z1: s.bis }); else rein(s.von, a0, s.bis, a1, { s, x0: s.von, x1: s.bis, z0: a0, z1: a1 }); }
  for (const k of plan.kreuzungen ?? []) { const x0 = k.x - k.bx / 2, x1 = k.x + k.bx / 2, z0 = k.z - k.bz / 2, z1 = k.z + k.bz / 2; rein(x0, z0, x1, z1, { k, x0, x1, z0, z1 }); }
  // Stadtrandgürtel (stadtrand.js): Straßen, Kreuzungen, Wasser, Vorortblöcke
  const A = plan.aussen;
  if (A) {
    for (const s of A.strassen) { const [a0, a1] = [s.mitte - s.breite / 2, s.mitte + s.breite / 2]; const o = s.achse === 'z' ? { rs: s, x0: a0, x1: a1, z0: s.von, z1: s.bis } : { rs: s, x0: s.von, x1: s.bis, z0: a0, z1: a1 }; rein(o.x0, o.z0, o.x1, o.z1, o); }
    for (const k of A.kreuzungen) { const o = { rs: k, x0: k.x - k.bx / 2, x1: k.x + k.bx / 2, z0: k.z - k.bz / 2, z1: k.z + k.bz / 2 }; rein(o.x0, o.z0, o.x1, o.z1, o); }
    for (const w of A.wasser) rein(w.x, w.z, w.x + w.w, w.z + w.d, { rw: w, x0: w.x, x1: w.x + w.w, z0: w.z, z1: w.z + w.d });
    for (const b of A.bloecke) rein(b.x, b.z, b.x + b.w, b.z + b.d, { rb: b, x0: b.x, x1: b.x + b.w, z0: b.z, z1: b.z + b.d });
  }
  const drin = (x, z, r) => x >= r.x && x < r.x + r.w && z >= r.z && z < r.z + r.d;
  return (x, z) => {
    const l = idx.get(Math.floor(x / G) + ',' + Math.floor(z / G)) ?? [];
    let b = null, p = null, s = null, rs = null, rw = null, rb = null;
    for (const o of l) {
      if (o.b && drin(x, z, o.b)) b = o.b;
      else if (o.p && drin(x, z, o.p)) p = o.p;
      else if ((o.s || o.k) && x >= o.x0 && x < o.x1 && z >= o.z0 && z < o.z1) s = o.s ?? o.k;
      else if ((o.rs || o.rw || o.rb) && x >= o.x0 && x < o.x1 && z >= o.z0 && z < o.z1) { if (o.rs) rs = o.rs; if (o.rw) rw = o.rw; if (o.rb && !o.rb.innen) rb = o.rb; else if (o.rb) rb = o.rb; }
    }
    return { b, p, s, rs, rw, rb };
  };
}

/** Kategorie eines Bodenpunkts. */
function klasse(plan, f, x, z) {
  const { b, p, s, rs, rw, rb } = f(x, z);
  if (!b) {
    if (s) return 'strasse';
    if (rw) return 'wasser';
    if (rs) return 'strasse';
    if (rb) return 'vorort';
    const aus = x < 0 || z < 0 || x > plan.breite || z > plan.tiefe;
    const R = plan.aussen?.R ?? 0;
    if (aus && x > -R && z > -R && x < plan.breite + R && z < plan.tiefe + R) return 'vorort';
    return aus ? 'aussen' : 'strasse';
  }
  if (b.art === 'wasser') return p && UFER_SLOT.has(p.typ) ? 'ufer' : 'wasser';
  if (p && p.typ === 'slot:bahnhof') return 'bahnhof';
  if (b.art === 'bahn') {
    if (p) return 'bau';   // Häuserzeile am Vorplatz
    // nur das Gleisband zählt als Gleisfläche, der Vorplatz als Platz
    const V = b.vorplatz;
    if (V && x >= V.x && x < V.x + V.w && z >= V.z && z < V.z + V.d) return 'platz';
    if ((b.bahnParken ?? []).some((q) => x >= q.x && x < q.x + q.w && z >= q.z && z < q.z + q.d)) return 'hof';
    return 'gleis';
  }
  if (p) {
    if (GROSS_SLOT.has(p.typ)) return 'gross';
    if (OFFEN.has(p.typ) || p.leer) return 'offen';
    return 'bau';
  }
  if (GROSS_ART.has(b.art)) return RASEN_BODEN.has(b.art) ? 'gruenBlock' : 'gross';
  if (BEBAUT.has(b.art)) { const h = b.hof; if (h && x >= h.x && x < h.x + h.w && z >= h.z && z < h.z + h.d && (h.art === 'gruen' || h.art === 'spielplatz')) return 'gruenBlock'; return 'hof'; }
  if (RASEN_BODEN.has(b.art)) return 'gruenBlock';
  if (PARK.has(b.art)) return 'park';
  if (PLATZ.has(b.art)) return 'platz';
  return 'sonst';
}

function kamera(plan) {
  const nm = nahMitte(plan, 'einkauf', zoom);
  const m = new THREE.Vector3(nm.x, 0, nm.z), zm = nm.zoom;
  const box = new THREE.Box3(new THREE.Vector3(m.x - zm, 0, m.z - zm), new THREE.Vector3(m.x + zm, 25, m.z + zm));
  const cam = kameraFuer(KW, KH, box, RAND);
  cam.updateMatrixWorld();
  const M = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
  const v = new THREE.Vector3();
  return (x, z, y = 0) => { v.set(x, y, z).applyMatrix4(M); return [v.x, v.y]; };
}

const pz = (a, n) => (n ? ((100 * a) / n).toFixed(1) : '0.0');

/** Größte freie Rasenfläche eines Blocks: Kantenlänge (m) des größten leeren Rasenquadrats im 2-m-Raster. */
function freiQuadrat(b, frei) {
  const G = 2, nx = Math.floor(b.w / G), nz = Math.floor(b.d / G);
  let best = 0, vor = new Array(nx).fill(0);
  for (let j = 0; j < nz; j++) {
    const neu = new Array(nx).fill(0);
    for (let i = 0; i < nx; i++) {
      if (!frei(b.x + (i + 0.5) * G, b.z + (j + 0.5) * G)) continue;
      neu[i] = 1 + (i && j ? Math.min(vor[i], neu[i - 1], vor[i - 1]) : 0);
      if (neu[i] > best) best = neu[i];
    }
    vor = neu;
  }
  return best * G;
}
/** Freie Rasenfläche je Block: Stadtblöcke (Grünhöfe ohne Parzellen) und Vorortblöcke des Gürtels. */
function freieRasen(plan, f) {
  const out = [];
  for (const b of plan.bloecke) {
    const h = b.hof;
    if (!BEBAUT.has(b.art) || !h || !(h.art === 'gruen' || h.art === 'spielplatz')) continue;
    out.push({ b, m: freiQuadrat(h, (x, z) => !f(x, z).p) });
  }
  for (const b of plan.aussen?.bloecke ?? []) {
    if (!['dicht', 'siedlung', 'sonder', 'gewerbe'].includes(b.zone)) continue;
    const belegt = [...(b.bauten ?? []).map((q) => [q.x - q.w / 2, q.z - q.d / 2, q.x + q.w / 2, q.z + q.d / 2]), ...(b.flaechen ?? []).map((q) => [q.x, q.z, q.x + q.w, q.z + q.d]),
      ...(b.hecken ?? []).map(([a, c, e, g]) => [a - 0.8, c - 0.8, e + 0.8, g + 0.8]), ...(b.baeume ?? []).map(([x, z]) => [x - 2.5, z - 2.5, x + 2.5, z + 2.5])];
    out.push({ b, rand: true, m: freiQuadrat(b, (x, z) => !belegt.some(([a, c, e, g]) => x >= a && x < e && z >= c && z < g)) });
  }
  return out;
}

const WN = new Map();
function pruefe(name) {
  WN.clear();
  const s = stadtDaten(name);
  const plan = stadtplan(s.seed, { typ: s.typ, archetyp: s.archetyp, region: s.region, strassenFaktor: 1.6, ...s.extra, standorte: s.standorte });
  const q02 = Q02 ? pruefeStadtQualitaet(plan) : null;
  const f = raster(plan);
  const proj = kamera(plan);
  // ---- Flächenanteile: Nahausschnitt (2 m) und ganze Stadt (4 m) ----
  const nah = {}, stadt = {};
  let nNah = 0, nStadt = 0;
  const grossNah = new Map();   // Block-Id → { n, innen }
  const W = plan.breite, T = plan.tiefe;
  for (let x = -600; x < W + 600; x += 2) for (let z = -600; z < T + 600; z += 2) {
    const [u, v] = proj(x, z);
    const imBild = Math.abs(u) <= 1 && Math.abs(v) <= 1;
    const inStadt = x >= 0 && z >= 0 && x <= W && z <= T && (x % 4 === 0) && (z % 4 === 0);
    if (!imBild && !inStadt) continue;
    const k = klasse(plan, f, x, z);
    if (imBild) {
      nah[k] = (nah[k] ?? 0) + 1; nNah++;
      if (process.env.WNAH && k === (process.env.WNAH === '1' ? 'wasser' : process.env.WNAH)) { const q = f(x, z); const id = q.b ? q.b.id + '/' + (q.b.form ?? q.b.art) + (q.p ? '/' + q.p.typ : '') : 'ring'; WN.set(id, (WN.get(id) ?? 0) + 1); }
      if (k === 'gross' || k === 'gleis') {
        const { b } = f(x, z);
        const g = grossNah.get(b.id) ?? { n: 0, innen: 0, art: k === 'gleis' ? 'gleis' : b.art };
        g.n++; if (Math.abs(u) < 0.7 && Math.abs(v) < 0.7) g.innen++;
        grossNah.set(b.id, g);
      }
    }
    if (inStadt) { stadt[k] = (stadt[k] ?? 0) + 1; nStadt++; }
  }
  const sicht = (x, z) => { const [u, v] = proj(x, z); return Math.abs(u) <= 1 && Math.abs(v) <= 1; };
  // ---- Grün in bebauten Blöcken: Anteil an der Fläche aller Blöcke mit Wohn- oder Geschäftsbebauung ----
  const blockFl = (o) => (o.bau ?? 0) + (o.hof ?? 0) + (o.offen ?? 0) + (o.gruenBlock ?? 0);
  // ---- Blockrand: unbebaute Länge an Straßenseiten bebauter Blöcke ----
  let randL = 0, randLeer = 0, randLNah = 0, randLeerNah = 0;
  for (const b of plan.bloecke) {
    if (!BEBAUT.has(b.art)) continue;
    for (const sd of ['+z', '-z', '+x', '-x']) {
      if (!b.rand?.[sd]?.seg) continue;
      const entlangX = sd[1] === 'z';
      const L = entlangX ? b.w : b.d;
      for (let t = 0.5; t < L; t += 1) {
        const x = entlangX ? b.x + t : sd === '+x' ? b.x + b.w - 1.5 : b.x + 1.5;
        const z = entlangX ? (sd === '+z' ? b.z + b.d - 1.5 : b.z + 1.5) : b.z + t;
        const { p } = f(x, z);
        // an diagonalen Straßen (Fächer) endet der Block an der Diagonale, dort zählt die Kante nicht
        if (!p && (plan.diagonalen ?? []).some((dg) => streifenSchneidet({ x: x - 6, z: z - 6, w: 12, d: 12 }, dg.C, dg.dx, dg.dz, dg.t0, dg.t1, dg.breite / 2))) continue;
        const leer = !p || OFFEN.has(p.typ) || p.leer;
        randL++; if (leer) randLeer++;
        if (sicht(x, z)) { randLNah++; if (leer) { randLeerNah++; if (process.env.RAND) console.log('RAND', name, b.id, b.viertel, b.art, sd, p ? p.typ + (p.leer ? '/leer' : '') : 'ohne', Math.round(b.w), Math.round(b.d)); } }
      }
    }
  }
  // ---- Niveau: Bauten mit Sockel, Terrassen, abgesenkte Ufer (Stadtgebiet = alles außer Industrierand) ----
  let niveau = 0, niveauNah = 0;
  const niveauListe = [];
  for (const p of plan.parzellen) {
    const b = plan.bloecke.find((q) => q.id === p.block);
    // abgesenkte Ufer: Promenaden ohne zweite Ebene (treppe, anleger) liegen auf Straßenniveau, nur das Wasser tiefer
    const promenadeEben = p.typ === 'slot:rhein_promenade' && p.variante !== 'doppelt';
    const schief = (p.sockelY ?? 0) > 0.33 || (p.wasserY !== undefined && p.typ !== 'slot:ruhr_kanal' && !promenadeEben) || (b?.art === 'west_hang' && (b.stufen ?? []).some((st) => st.y > 0.33));
    if (!schief) continue;
    niveau++;
    if (sicht(p.x + p.w / 2, p.z + p.d / 2)) { niveauNah++; niveauListe.push(p.typ); }
  }
  // ---- Wasserkanten: Länge je Gestaltung (Uferstraße, Kai, nackt, Kartenrand) ----
  const nacktNah = new Set();
  const kante = { strasse: 0, kai: 0, nackt: 0, rand: 0 }, kanteNah = { strasse: 0, kai: 0, nackt: 0, rand: 0 };
  for (const b of plan.bloecke) {
    if (b.art !== 'wasser') continue;
    for (const sd of ['+z', '-z', '+x', '-x']) {
      const entlangX = sd[1] === 'z', L = entlangX ? b.w : b.d;
      for (let t = 1; t < L; t += 2) {
        const aus = 3;
        const x = entlangX ? b.x + t : sd === '+x' ? b.x + b.w + aus : b.x - aus;
        const z = entlangX ? (sd === '+z' ? b.z + b.d + aus : b.z - aus) : b.z + t;
        const xi = entlangX ? x : sd === '+x' ? b.x + b.w - aus : b.x + aus, zi = entlangX ? (sd === '+z' ? b.z + b.d - aus : b.z + aus) : z;
        const o = f(x, z), innen = f(xi, zi);
        let art;
        if (o.b?.art === 'wasser' || (!o.b && o.rw)) continue;
        if (!o.b && o.rs) art = 'strasse';
        else if (x < 0 || z < 0 || x > W || z > T) art = o.rb ? 'nackt' : 'rand';
        else if (o.s && !o.b) art = 'strasse';
        else if (o.b && (KAI.has(o.b.art) || (o.p && UFER_SLOT.has(o.p.typ)))) art = 'kai';
        else if (innen.p && UFER_SLOT.has(innen.p.typ)) art = 'kai';
        else art = 'nackt';
        kante[art] += 2;
        if (process.env.NACKT && art === 'nackt') console.log('NACKT', name, b.id, b.form ?? '', sd, Math.round(x), Math.round(z), o.b ? o.b.art + (o.p ? '/' + o.p.typ : '') : o.rb ? 'ring:' + o.rb.zone : o.s ? 'strasse' : 'leer');
        if (sicht(x, z)) { kanteNah[art] += 2; if (art === 'nackt') nacktNah.add(o.b ? o.b.art + (o.p ? '/' + o.p.typ : '') : 'leer@' + Math.round(x) + ',' + Math.round(z)); }
      }
    }
  }
  if (process.env.WNAH) console.log('WNAH', name, [...WN].map(([k, v]) => k + ':' + v).join(' '));
  const rasen = freieRasen(plan, f);
  if (process.env.RASEN) for (const q of rasen.filter((q) => q.m > 26)) console.log('RASEN', name, q.m, (q.b.zone ?? q.b.art) + '/' + (q.b.sonder ?? ''), Math.round(q.b.w), Math.round(q.b.d), (q.b.bauten ?? []).length, q.b.id);
  const rasenNah = rasen.filter((q) => sicht(q.b.x + q.b.w / 2, q.b.z + q.b.d / 2));
  // ---- Versatz der Uferlinie an Brücken: Wasserquerschnitt vor und hinter jeder Brücke muss gleich sein ----
  // (Zusammenflüsse, an denen ein zweites Gewässer anschließt, zählen nicht)
  let versatz = 0;
  const alleStr = [...plan.strassen, ...(plan.aussen?.strassen ?? [])];
  for (const st of alleStr) {
    if (!st.bruecke) continue;
    const quer = (seite) => {
      const q = st.mitte + seite * (st.breite / 2 + 3), mitte = (st.von + st.bis) / 2;
      const nass = (u) => { const [x, z] = st.achse === 'x' ? [u, q] : [q, u]; const o = f(x, z); return o.b?.art === 'wasser' ? o.b : !o.b && o.rw ? o.rw : null; };
      const w0 = nass(mitte); if (!w0) return null;
      let a = mitte, e = mitte;
      while (a > mitte - 400 && nass(a - 1)) a--;
      while (e < mitte + 400 && nass(e + 1)) e++;
      const fremd = nass(a) !== w0 || nass(e) !== w0;
      return { a, e, w0, fremd };
    };
    const A = quer(-1), Bq = quer(1);
    if (!A || !Bq || A.fremd || Bq.fremd || A.w0 !== Bq.w0) continue;
    versatz = Math.max(versatz, Math.abs(A.a - Bq.a) + Math.abs(A.e - Bq.e));
    if (process.env.BRUECKE) console.log('BRUECKE', name, st.id, Math.round(A.a), Math.round(A.e), Math.round(Bq.a), Math.round(Bq.e));
  }
  // ---- Uferlinie über die ganze Länge: aufeinanderfolgende Wasserstücke eines Bandes (Stadt und Gürtel, auch über
  // Brücken und Straßen hinweg, Lücke bis 40 m) müssen denselben Querschnitt haben; Abzweige und Mündungen zählen nicht ----
  let uferVersatz = 0;
  const wst = [...plan.bloecke.filter((b) => b.art === 'wasser'), ...(plan.aussen?.wasser ?? [])].map((w) => ({ x0: w.x, x1: w.x + w.w, z0: w.z, z1: w.z + w.d, w }));
  for (const A of wst) for (const Bw of wst) {
    if (A === Bw) continue;
    for (const ax of ['z', 'x']) {
      const [a0, a1, b0, b1] = ax === 'z' ? [A.z0, A.z1, Bw.z0, Bw.z1] : [A.x0, A.x1, Bw.x0, Bw.x1];
      const [qa0, qa1, qb0, qb1] = ax === 'z' ? [A.x0, A.x1, Bw.x0, Bw.x1] : [A.z0, A.z1, Bw.z0, Bw.z1];
      if (a1 - a0 < (qa1 - qa0) * 1.5 || b1 - b0 < (qb1 - qb0) * 1.5) continue;   // beide entlang ax gestreckt
      const luecke = b0 - a1;
      if (luecke < -0.5 || luecke > 40) continue;
      if (qb1 <= qa0 || qb0 >= qa1) continue;   // kein gemeinsamer Querschnitt
      const v = Math.abs(qa0 - qb0) + Math.abs(qa1 - qb1);
      if (v < 0.01) continue;
      // Mündung: ein drittes Gewässer berührt die Nahtstelle
      const naht = wst.some((C) => C !== A && C !== Bw && (ax === 'z' ? C.z0 <= b0 + 1 && C.z1 >= a1 - 1 && C.x1 >= Math.min(qa0, qb0) - 1 && C.x0 <= Math.max(qa1, qb1) + 1 : C.x0 <= b0 + 1 && C.x1 >= a1 - 1 && C.z1 >= Math.min(qa0, qb0) - 1 && C.z0 <= Math.max(qa1, qb1) + 1));
      if (naht) continue;
      uferVersatz = Math.max(uferVersatz, v);
      if (process.env.UFER) console.log('UFER', name, ax, Math.round(a1), Math.round(qa0), Math.round(qa1), Math.round(qb0), Math.round(qb1));
    }
  }
  // Schwesterkette: Standort nicht im Hartwig-Block, höchstens 80 Prozent Grundfläche,
  // keine gleiche Familien-/Variantenkombination innerhalb benachbarter Städte.
  const schwester = s.standorte.filter((q) => q.rolle === 'schwester');
  const whBlock = new Set(plan.parzellen.filter((q) => q.typ === 'slot:warenhaus').map((q) => q.block));
  const schwesterBlock = plan.parzellen.filter((q) => q.typ === 'slot:schwester' && whBlock.has(q.block)).length;
  const maxW = Math.max(0, ...s.standorte.filter((q) => q.rolle === 'warenhaus').map((q) => q.grundflaecheQm ?? 0));
  const schwesterGross = schwester.filter((q) => maxW && q.grundflaecheQm > maxW * 0.8).length;
  const schwesterGleich = schwester.filter((q) => nachbarStaedte(name).some((n) =>
    stadtDaten(n)?.standorte.some((v) => v.rolle === 'schwester' && v.familie === q.familie && v.variante === q.variante)
  )).length;
  const gross = [...grossNah.values()].filter((g) => g.n > 50);
  const grossInnen = gross.filter((g) => g.innen > 0.25 * g.n);
  const oh = outletHaeuser.find((h) => h.stadt === name);
  const op = oh ? [...plan.parzellen, ...(plan.aussen?.bauten ?? [])].find((q) => q.standort?.id === oh.id) : null;
  const maxHartwig = Math.max(0, ...hartwigHaeuser.filter((h) => h.stadt === name && h.format === 'warenhaus').map((h) => h.grundflaecheQm));
  const anders = oh ? nachbarStaedte(name).filter((stadt) => outletHaeuser.some((q) => q.stadt === stadt && familieOutlet(q) === familieOutlet(oh) && q.fassade === oh.fassade)) : [];
  const opp = plan.standorte.filter((q) => q.rolle === 'wettbewerber' && q.art === 'offprice');
  const gleicheParzelle = op && opp.some((q) => q.parzelle === op.id || q.block === op.block);
  const ringFehler = oh?.lage === 'rand' && !(plan.aussen?.bauten ?? []).includes(op);
  const innenFehler = oh?.lage === 'b' && (!plan.parzellen.includes(op) || masseOutlet(oh).bw * masseOutlet(oh).bd > maxHartwig * 0.8 + 1e-9);
  return {
    // Q01 Essen: Gleisharfe am Hauptbahnhof ist Wahrzeichen und liegt bewusst im Startbild (GESTALTUNG.md 3, Ausnahme Kartenstadt)
    ausnahmen: plan.startBlick === 'hbf' ? { 'Gleisfläche nah %': 16, 'Bahnhof nah %': 5, 'Großbauten nah innen': 1, 'Großbauten nah (Anzahl)': 2 } : null,
    name, plan,
    werte: {
      ...(q02?.werte ?? {}),
      'Schwester: gleicher Hartwig-Block': schwesterBlock,
      'Schwester: mehr als 80 % Hartwig': schwesterGross,
      'Schwester: gleiche Nachbar-Variante': schwesterGleich,
      'FUNDUS Platzierung/Flächenlimit': Number(!!ringFehler) + Number(!!innenFehler),
      'FUNDUS gleicher Block wie Offprice': Number(!!gleicheParzelle),
      'FUNDUS gleiche Bauform bei Nachbarn': anders.length,
      'Grün in Blöcken Stadt %': pz(stadt.gruenBlock ?? 0, blockFl(stadt)),
      'Grün in Blöcken nah %': pz(nah.gruenBlock ?? 0, blockFl(nah)),
      'Blockrand unbebaut Stadt %': pz(randLeer, randL),
      'Blockrand unbebaut nah %': pz(randLeerNah, randLNah),
      'Bauten nicht ebenerdig Stadt': niveau,
      'Bauten nicht ebenerdig nah': niveauNah,
      'Gleisfläche Stadt %': pz(stadt.gleis ?? 0, nStadt),
      'Gleisfläche nah %': pz(nah.gleis ?? 0, nNah),
      'Bahnhof Stadt %': pz(stadt.bahnhof ?? 0, nStadt),
      'Bahnhof nah %': pz(nah.bahnhof ?? 0, nNah),
      'Wasser nah %': pz(nah.wasser ?? 0, nNah),
      'Außerhalb Karte nah %': pz(nah.aussen ?? 0, nNah),
      'Wasserkante nackt Stadt m': kante.nackt,
      'Wasserkante nackt nah m': kanteNah.nackt,
      'Wasserkante Kartenrand nah m': kanteNah.rand,
      'Wasserkante Uferstraße/Kai Stadt %': pz(kante.strasse + kante.kai, kante.strasse + kante.kai + kante.nackt),
      'Großbauten nah (Anzahl)': gross.length,
      'Großbauten nah innen': grossInnen.length,
      'Großbau-Fläche nah %': pz((nah.gross ?? 0) + (nah.gleis ?? 0), nNah),
      'Straße nah %': pz(nah.strasse ?? 0, nNah),
      'Park/Platz nah %': pz((nah.park ?? 0) + (nah.platz ?? 0), nNah),
      'Vorort nah %': pz(nah.vorort ?? 0, nNah),
      'Versatz Ufer an Brücken m': versatz,
      'Versatz Uferlinie ganze Länge m': Math.round(uferVersatz * 10) / 10,
      'Freie Rasenfläche nah m': Math.max(0, ...rasenNah.map((q) => q.m)),
      'Freie Rasenfläche Rand m': Math.max(0, ...rasen.filter((q) => q.rand).map((q) => q.m)),
    },
    gross: gross.map((g) => g.art + (g.innen > 0.25 * g.n ? '*' : '')),
    niveauListe, nacktNah: [...nacktNah], q02Fehler: q02?.fehler ?? null,
  };
}

// Grenzwerte aus GESTALTUNG.md (Nahausschnitt); überschrittene Werte werden mit ! markiert und gezählt
const GRENZE = {
  'Offene Gleisenden ohne Abschluss': 0, 'Oberleitung ohne Gleis': 0,
  'Fahrzeuge außerhalb Fahrbahn/Gleis': 0, 'Dachaufbauten außerhalb Dachfläche': 0,
  'Wiederholung über 15 %': 0,
  'Schwester: gleicher Hartwig-Block': 0,
  'Schwester: mehr als 80 % Hartwig': 0,
  'Schwester: gleiche Nachbar-Variante': 0,
  'Grün in Blöcken nah %': 0, 'Grün in Blöcken Stadt %': 1, 'Blockrand unbebaut nah %': 2, 'Bauten nicht ebenerdig nah': 0,
  'Gleisfläche nah %': 2, 'Bahnhof nah %': 3, 'Wasser nah %': 15, 'Außerhalb Karte nah %': 0, 'Wasserkante nackt nah m': 0,
  'Wasserkante nackt Stadt m': 0, 'Wasserkante Kartenrand nah m': 0, 'Großbauten nah (Anzahl)': 1, 'Großbauten nah innen': 0,
  'Freie Rasenfläche nah m': 26, 'Freie Rasenfläche Rand m': 26, 'Versatz Ufer an Brücken m': 0, 'Versatz Uferlinie ganze Länge m': 0,
  'FUNDUS Platzierung/Flächenlimit': 0, 'FUNDUS gleicher Block wie Offprice': 0, 'FUNDUS gleiche Bauform bei Nachbarn': 0,
};
const erg = namen.map(pruefe);
const zeilen = Object.keys(erg[0].werte);
const br = Math.max(...zeilen.map((z) => z.length)) + 2;
console.log(`Prüfung Gestaltung (Nahausschnitt: zoom ${zoom}, Kachel ${KW}×${KH}, rand ${RAND})`);
for (const id of saisonListe) {
  const kw = JAHRESZEIT_WOCHEN[id];
  const s = jahreszeit({ woche: kw - 1, seed: 19, startJahr: 2026, marketing: { aktionen: [] } });
  if (id !== 'weihnachten' && id !== 'schnee' && s.name !== id) throw new Error('Jahreszeit inkonsistent: ' + id);
  if (id === 'weihnachten' && !s.anlaesse.has('weihnachten')) throw new Error('Advent nicht aktiv');
  console.log(`Saisonkontrolle ${id}: KW ${s.kw}, ${s.name} (Plan unverändert, saisonale Props separat)`);
}
console.log(''.padEnd(br) + erg.map((e) => (' ' + e.name.slice(0, 15)).padStart(17)).join(''));
const verstoss = new Map(erg.map((e) => [e.name, 0]));
for (const z of zeilen) console.log(z.padEnd(br) + erg.map((e) => { const v = e.werte[z], g = e.ausnahmen?.[z] ?? GRENZE[z]; const x = g !== undefined && Number(v) > g + 1e-9; if (x) verstoss.set(e.name, verstoss.get(e.name) + 1); return ((x ? '!' : '') + v).padStart(17); }).join(''));
console.log('Verstöße (Grenzwerte GESTALTUNG.md)'.padEnd(br) + erg.map((e) => String(verstoss.get(e.name)).padStart(17)).join(''));
if (Q02) for (const e of erg) for (const [regel, liste] of Object.entries(e.q02Fehler ?? {})) {
  if (liste.length) console.error('Q02-Verstoß', e.name, regel, JSON.stringify(liste.slice(0, 8)));
}
const q02Regeln = ['Offene Gleisenden ohne Abschluss', 'Oberleitung ohne Gleis',
  'Fahrzeuge außerhalb Fahrbahn/Gleis', 'Dachaufbauten außerhalb Dachfläche', 'Wiederholung über 15 %'];
if (Q02 && erg.some((e) => q02Regeln.some((k) => Number(e.werte[k]) > 0))) process.exitCode = 1;
for (const e of erg) console.log(`${e.name}: Großbauten nah [${e.gross.join(', ')}] (* = innen); nicht ebenerdig nah [${e.niveauListe.join(', ')}]; nackte Wasserkante nah an [${e.nacktNah.join(', ')}]`);

// ---- Vielfalt zwischen Nachbarstädten: gleiche Wettbewerber-Bauform (Art + Form), gleiche Art, gleicher Kirchenstil, gleicher Konzernbau ----
const merkmale = (n) => { const d = stadtDaten(n); return { wb: d.standorte.filter((q) => q.rolle === 'wettbewerber'), kirche: d.extra.kirchStil, rathaus: d.extra.rathausStil, konzern: d.extra.konzernVarianten ?? [] }; };
console.log('\nVielfalt (Nachbarstädte laut staedte.js NACHBAR_KM)');
for (const n of namen) {
  const m = merkmale(n), nb = nachbarStaedte(n);
  const gleichForm = [], gleichArt = [], gleichKirche = [], gleichKonzern = [];
  for (const q of nb) {
    const o = merkmale(q);
    for (const w of m.wb) { if (o.wb.some((v) => v.art === w.art && v.form === w.form)) gleichForm.push(`${q}:${w.art}/${w.form}`); else if (o.wb.some((v) => v.art === w.art)) gleichArt.push(`${q}:${w.art}`); }
    if (m.kirche && m.kirche === o.kirche) gleichKirche.push(q);
    if (m.rathaus && m.rathaus === o.rathaus) gleichKirche.push(q + ' (Rathaus)');
    for (const k of m.konzern) if (o.konzern.includes(k)) gleichKonzern.push(`${q}:${k}`);
  }
  console.log(`${n}: Wettbewerber [${m.wb.map((w) => `${w.art}/${w.form}/${w.name}`).join(', ')}], Kirche ${m.kirche}, Rathaus ${m.rathaus}, Konzern [${m.konzern.join(', ')}]`);
  console.log(`   gleiche Bauform bei Nachbarn: ${gleichForm.length ? gleichForm.join(', ') : 'keine'}; gleiche Art: ${gleichArt.length ? gleichArt.join(', ') : 'keine'}; gleiche Kirche: ${gleichKirche.join(', ') || 'keine'}; gleicher Konzernbau: ${gleichKonzern.join(', ') || 'keine'}`);
}
