// Wegsuche des Hausbesuchs. Reines Datenmodul, unabhängig von Three.js und der Spiel-Engine.
// Meterkoordinaten; Hindernisse stammen aus der tatsächlich aufgebauten Ladenbau-Belegung.
export const LAUFRASTER = 0.625;
export const PERSONENRADIUS = 0.34;
const EPS = 1e-8;
const abstand = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const begrenze = (x, a, b) => Math.max(a, Math.min(b, x));

function zufall(seed) {
  let s = 2166136261;
  for (const c of String(seed)) { s ^= c.charCodeAt(0); s = Math.imul(s, 16777619); }
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}
function rechteck(r) {
  if (Array.isArray(r)) return { x: r[0], z: r[1], w: r[2] - r[0], d: r[3] - r[1] };
  return { x: r.x, z: r.z, w: r.w, d: r.d };
}
function segmentSchneidet(a, b, r, radius) {
  const x0 = r.x - radius, x1 = r.x + r.w + radius;
  const z0 = r.z - radius, z1 = r.z + r.d + radius;
  let min = 0, max = 1;
  for (const [p, q, lo, hi] of [[a.x, b.x - a.x, x0, x1], [a.z, b.z - a.z, z0, z1]]) {
    if (Math.abs(q) < EPS) { if (p > lo && p < hi) continue; return false; }
    const t0 = (lo - p) / q, t1 = (hi - p) / q;
    min = Math.max(min, Math.min(t0, t1));
    max = Math.min(max, Math.max(t0, t1));
    if (min >= max - EPS) return false;
  }
  return true;
}
function inGrenze(nav, p) {
  return p.x >= nav.radius && p.z >= nav.radius &&
    p.x <= nav.breite - nav.radius && p.z <= nav.tiefe - nav.radius;
}
function kandidaten(nav, a, b = a) {
  const n = nav.bucketGroesse;
  const x0 = Math.floor((Math.min(a.x, b.x) - nav.radius) / n);
  const x1 = Math.floor((Math.max(a.x, b.x) + nav.radius) / n);
  const z0 = Math.floor((Math.min(a.z, b.z) - nav.radius) / n);
  const z1 = Math.floor((Math.max(a.z, b.z) + nav.radius) / n);
  const ids = new Set();
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++)
    for (const id of nav.buckets.get(x + ':' + z) ?? []) ids.add(id);
  return ids;
}
export function istKollisionsfrei(nav, x, z) {
  const p = { x, z };
  if (!inGrenze(nav, p)) return false;
  for (const id of kandidaten(nav, p)) {
    const r = nav.hindernisse[id];
    if (x > r.x - nav.radius && x < r.x + r.w + nav.radius &&
        z > r.z - nav.radius && z < r.z + r.d + nav.radius) return false;
  }
  return true;
}
export function streckeFrei(nav, a, b) {
  if (!inGrenze(nav, a) || !inGrenze(nav, b)) return false;
  for (const id of kandidaten(nav, a, b))
    if (segmentSchneidet(a, b, nav.hindernisse[id], nav.radius)) return false;
  return true;
}
const punkt = (nav, idx) => ({ x: (idx % nav.nx + 0.5) * nav.schritt,
  z: (Math.floor(idx / nav.nx) + 0.5) * nav.schritt });
function nachbarn(nav, idx) {
  const x = idx % nav.nx, z = Math.floor(idx / nav.nx);
  return [x > 0 ? idx - 1 : -1, x < nav.nx - 1 ? idx + 1 : -1,
    z > 0 ? idx - nav.nx : -1, z < nav.nz - 1 ? idx + nav.nx : -1];
}
export function navigationsRaster(buehne) {
  const breite = buehne.breite, tiefe = buehne.tiefe;
  const plan = buehne.ladenplan;
  const ausPlan = plan ? [...plan.moebel, ...plan.hindernisse] : [];
  const extras = buehne.navigation?.hindernisse ?? [];
  // Plan und Grundriss melden teils dieselben Möbel. Doppelte Rechtecke nicht zweimal prüfen.
  const verwendet = new Set();
  const hindernisse = [...ausPlan, ...extras].map(rechteck)
    .filter(r => {
      if (!Number.isFinite(r.x + r.z + r.w + r.d) || r.w <= EPS || r.d <= EPS) return false;
      const key = [r.x, r.z, r.w, r.d].map(n => n.toFixed(3)).join(':');
      if (verwendet.has(key)) return false;
      verwendet.add(key);
      return true;
    });
  const schritt = LAUFRASTER, nx = Math.floor(breite / schritt), nz = Math.floor(tiefe / schritt);
  const nav = { breite, tiefe, schritt, nx, nz, radius: PERSONENRADIUS,
    hindernisse, bucketGroesse: 5, buckets: new Map(),
    frei: new Uint8Array(nx * nz), kanten: new Uint8Array(nx * nz),
    komponenten: new Int32Array(nx * nz),
    kassen: (plan?.kassenVorfeld ?? []).map(r => ({ x: r.x + r.w / 2, z: r.z + r.d / 2 }))
      .concat(buehne.navigation?.kassen ?? []) };
  hindernisse.forEach((r, id) => {
    const x0 = Math.floor((r.x - nav.radius) / nav.bucketGroesse);
    const x1 = Math.floor((r.x + r.w + nav.radius) / nav.bucketGroesse);
    const z0 = Math.floor((r.z - nav.radius) / nav.bucketGroesse);
    const z1 = Math.floor((r.z + r.d + nav.radius) / nav.bucketGroesse);
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      const key = x + ':' + z;
      if (!nav.buckets.has(key)) nav.buckets.set(key, []);
      nav.buckets.get(key).push(id);
    }
  });
  for (let i = 0; i < nav.frei.length; i++) {
    const p = punkt(nav, i);
    nav.frei[i] = istKollisionsfrei(nav, p.x, p.z) ? 1 : 0;
  }
  // Einmalig geprüfte, gerichtete Kanten: auch dünne Wände können nicht übersprungen werden.
  // Bitreihenfolge entspricht nachbarn(): links, rechts, oben, unten.
  for (let i = 0; i < nav.frei.length; i++) {
    if (!nav.frei[i]) continue;
    const x = i % nav.nx, z = Math.floor(i / nav.nx), a = punkt(nav, i);
    if (x + 1 < nav.nx && nav.frei[i + 1] && streckeFrei(nav, a, punkt(nav, i + 1))) {
      nav.kanten[i] |= 2; nav.kanten[i + 1] |= 1;
    }
    if (z + 1 < nav.nz && nav.frei[i + nav.nx] &&
        streckeFrei(nav, a, punkt(nav, i + nav.nx))) {
      nav.kanten[i] |= 8; nav.kanten[i + nav.nx] |= 4;
    }
  }
  // Zusammenhängende Gänge vermeiden erfolglose Wegsuche zwischen abgeschlossenen Bereichen.
  nav.komponenten.fill(-1);
  let gruppe = 0;
  const queue = new Int32Array(nav.frei.length);
  for (let i = 0; i < nav.frei.length; i++) {
    if (!nav.frei[i] || nav.komponenten[i] !== -1) continue;
    let anfang = 0, ende = 1;
    queue[0] = i; nav.komponenten[i] = gruppe;
    while (anfang < ende) {
      const hier = queue[anfang++];
      const neben = nachbarn(nav, hier);
      for (let k = 0; k < 4; k++) {
        const j = neben[k];
        if (j < 0 || !(nav.kanten[hier] & (1 << k)) || nav.komponenten[j] !== -1) continue;
        nav.komponenten[j] = gruppe;
        queue[ende++] = j;
      }
    }
    gruppe++;
  }
  nav.anzahlKomponenten = gruppe;
  nav.freieZellen = nav.frei.reduce((n, a) => n + a, 0);
  return nav;
}
export function findeGangpunkt(nav, p, gruppe = -1) {
  let best = -1, dist = Infinity;
  // Erst lokal am Sortimentspunkt suchen, nicht in eine entfernte Abteilung versetzen.
  const xi = Math.floor(p.x / nav.schritt), zi = Math.floor(p.z / nav.schritt);
  for (let rad = 0; rad <= 20; rad++) {
    for (let z = Math.max(0, zi - rad); z <= Math.min(nav.nz - 1, zi + rad); z++)
      for (let x = Math.max(0, xi - rad); x <= Math.min(nav.nx - 1, xi + rad); x++) {
        if (rad && Math.max(Math.abs(x - xi), Math.abs(z - zi)) !== rad) continue;
        const idx = z * nav.nx + x;
        if (!nav.frei[idx] || (gruppe >= 0 && nav.komponenten[idx] !== gruppe)) continue;
        const q = punkt(nav, idx), d = (p.x - q.x) ** 2 + (p.z - q.z) ** 2;
        if (d < dist) { best = idx; dist = d; }
      }
    if (best >= 0 && rad * nav.schritt > Math.sqrt(dist) + nav.schritt) break;
  }
  return best;
}
// Binärer Min-Heap für A*; Wege werden nur beim Zielwechsel, niemals je Frame berechnet.
function heapPush(heap, v) {
  let i = heap.length; heap.push(v);
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (heap[p].f <= v.f) break;
    heap[i] = heap[p]; i = p;
  }
  heap[i] = v;
}
function heapPop(heap) {
  const v = heap[0], last = heap.pop();
  if (!heap.length) return v;
  let i = 0;
  while (2 * i + 1 < heap.length) {
    let c = 2 * i + 1;
    if (c + 1 < heap.length && heap[c + 1].f < heap[c].f) c++;
    if (heap[c].f >= last.f) break;
    heap[i] = heap[c]; i = c;
  }
  heap[i] = last;
  return v;
}
export function sucheWeg(nav, start, ziel) {
  if (start < 0 || ziel < 0 || !nav.frei[start] || !nav.frei[ziel] ||
      nav.komponenten[start] !== nav.komponenten[ziel]) return null;
  if (start === ziel) return [];
  const vorher = new Int32Array(nav.frei.length); vorher.fill(-1);
  const kosten = new Float64Array(nav.frei.length); kosten.fill(Infinity);
  const erledigt = new Uint8Array(nav.frei.length);
  const heuristik = (i) => (Math.abs(i % nav.nx - ziel % nav.nx) +
    Math.abs(Math.floor(i / nav.nx) - Math.floor(ziel / nav.nx))) * nav.schritt;
  const offen = [];
  kosten[start] = 0; heapPush(offen, { i: start, f: heuristik(start) });
  while (offen.length) {
    const hier = heapPop(offen).i;
    if (erledigt[hier]) continue;
    if (hier === ziel) {
      const weg = [];
      for (let i = ziel; i !== start; i = vorher[i]) weg.push(punkt(nav, i));
      return weg.reverse();
    }
    erledigt[hier] = 1;
    const neben = nachbarn(nav, hier);
    for (let k = 0; k < 4; k++) {
      const i = neben[k];
      if (i < 0 || !(nav.kanten[hier] & (1 << k)) || erledigt[i]) continue;
      const n = kosten[hier] + nav.schritt;
      if (n + EPS >= kosten[i]) continue;
      kosten[i] = n; vorher[i] = hier;
      heapPush(offen, { i, f: n + heuristik(i) });
    }
  }
  return null;
}
function neuesZiel(nav, p, zonen) {
  const r = p.zufall;
  const kasse = !p.personal && nav.kassen.length > 0 && r() < 0.17;
  let zone = p.zone;
  for (let versuch = 0; versuch < 12; versuch++) {
    const kassenziel = kasse && versuch < 5;
    if (!kassenziel) zone = zonen[Math.floor(r() * zonen.length)];
    const wunsch = kassenziel ? nav.kassen[Math.floor(r() * nav.kassen.length)] :
      zone.punkte[Math.floor(r() * zone.punkte.length)];
    const ziel = findeGangpunkt(nav, wunsch, p.komponente);
    if (ziel < 0 || ziel === p.zelle) continue;
    const route = sucheWeg(nav, p.zelle, ziel);
    if (!route?.length) continue;
    p.route = route; p.routeIndex = 0; p.zielZone = zone;
    p.zielKasse = !!kassenziel;
    return true;
  }
  // Kein erreichbares Ziel: weder Geometrie noch Spielerposition künstlich durchqueren.
  p.pause = 1 + r();
  return false;
}
export function erstelleBesucher(nav, zonen, besatz, seed) {
  const personen = [];
  if (!nav.freieZellen || !zonen?.length) return personen;
  const n = besatz.kunden + besatz.verkauf;
  for (let i = 0; i < n; i++) {
    const r = zufall(seed + ':' + i), personal = i >= besatz.kunden;
    let zone = null, zelle = -1;
    for (let versuch = 0; versuch < 16 && zelle < 0; versuch++) {
      const kandidat = zonen[Math.floor(r() * zonen.length)];
      if (!kandidat?.punkte?.length) continue;
      // Verkaufspersonal wartet überwiegend an Regal oder Kasse statt quer über die Fläche zu laufen.
      const anKasse = personal && (i - besatz.kunden) % 2 === 0 && nav.kassen.length > 0;
      const q = anKasse ? nav.kassen[Math.floor(r() * nav.kassen.length)] :
        kandidat.punkte[Math.floor(r() * kandidat.punkte.length)];
      const gefunden = findeGangpunkt(nav, q);
      if (gefunden < 0) continue;
      zone = kandidat; zelle = gefunden;
    }
    if (zelle < 0) continue;
    const p = punkt(nav, zelle);
    personen.push({ ...p, index: i, personal, zone, zoneJetzt: zone, zielZone: zone,
      zelle, komponente: nav.komponenten[zelle], zielKasse: false, route: [],
      routeIndex: 0, pause: personal ? r() * 3 : r() * 0.8,
      tempo: personal ? 0.7 + r() * 0.18 : 1.05 + r() * 0.27,
      richtung: r() * Math.PI * 2, zufall: r });
  }
  return personen;
}
export function bewegeBesucher(nav, personen, delta, zonen) {
  const statistik = { kundenMeter: 0, kundenGehsekunden: 0, personalMeter: 0, maxTempo: 0, kollisionen: 0 };
  if (!Number.isFinite(delta) || delta <= 0) return statistik;
  for (const p of personen) {
    let rest = delta, schritte = 0;
    while (rest > EPS && schritte++ < 30) {
      if (p.pause > 0) {
        const t = Math.min(rest, p.pause); p.pause -= t; rest -= t;
        if (p.pause > EPS) break;
        p.pause = 0;
        continue;
      }
      if (p.routeIndex >= p.route.length) {
        if (p.route.length) {
          p.zoneJetzt = p.zielZone;
          p.pause = p.personal ? 3 + p.zufall() * 4 :
            p.zielKasse ? 1.8 + p.zufall() * 2 : 0.7 + p.zufall() * 1.3;
          p.route = []; p.routeIndex = 0;
          continue;
        }
        if (!neuesZiel(nav, p, zonen)) break;
      }
      const ziel = p.route[p.routeIndex], dx = ziel.x - p.x, dz = ziel.z - p.z;
      const dist = Math.hypot(dx, dz);
      if (dist < EPS) { p.routeIndex++; continue; }
      const meter = Math.min(dist, p.tempo * rest);
      const neu = { x: p.x + dx * meter / dist, z: p.z + dz * meter / dist };
      if (!streckeFrei(nav, p, neu)) {
        statistik.kollisionen++;
        p.route = []; p.routeIndex = 0; p.pause = 2;
        break;
      }
      p.richtung = Math.atan2(dx, dz);
      p.x = neu.x; p.z = neu.z; rest -= meter / p.tempo;
      if (meter >= dist - EPS) {
        p.x = ziel.x; p.z = ziel.z;
        p.zelle = Math.floor(ziel.z / nav.schritt) * nav.nx + Math.floor(ziel.x / nav.schritt);
        p.routeIndex++;
      }
      if (p.personal) statistik.personalMeter += meter;
      else { statistik.kundenMeter += meter; statistik.kundenGehsekunden += meter / p.tempo; }
      statistik.maxTempo = Math.max(statistik.maxTempo, p.tempo);
    }
    if (!istKollisionsfrei(nav, p.x, p.z)) statistik.kollisionen++;
  }
  return statistik;
}
export function simuliereLaufwege(nav, zonen, besatz, seed, dauer = 60, schritt = 0.05) {
  const personen = erstelleBesucher(nav, zonen, besatz, seed);
  const ergebnis = { sekunden: dauer, personen: personen.length, kunden: personen.filter(p => !p.personal).length,
    kollisionen: 0, kundenMeter: 0, kundenGehsekunden: 0, personalMeter: 0, maxTempo: 0 };
  for (let t = 0; t < dauer - EPS;) {
    const dt = Math.min(schritt, dauer - t);
    const s = bewegeBesucher(nav, personen, dt, zonen);
    for (const key of ['kollisionen', 'kundenMeter', 'kundenGehsekunden', 'personalMeter'])
      ergebnis[key] += s[key];
    ergebnis.maxTempo = Math.max(ergebnis.maxTempo, s.maxTempo);
    t += dt;
  }
  ergebnis.kundentempo = ergebnis.kundenGehsekunden ?
    ergebnis.kundenMeter / ergebnis.kundenGehsekunden : 0;
  ergebnis.kundenDurchschnittMitPausen = ergebnis.kunden ?
    ergebnis.kundenMeter / (dauer * ergebnis.kunden) : 0;
  ergebnis.freieZellen = nav.freieZellen;
  return ergebnis;
}
