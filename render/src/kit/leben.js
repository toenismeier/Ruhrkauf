// N07: Belebte Stadt. Reines Render-Modul ohne Einfluss auf die Engine.
// Geometrie und Pfade stammen aus dem Stadtplan; Zufallsentscheidungen ausschließlich aus rng(seed).
// Statt Math.hypot: IEEE-genaue Wurzel, damit Schwellenvergleiche in allen JS-Engines gleich ausfallen.
const wurzelSumme = (...v) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
import { THREE, rng } from './basis.js';
import { menschenGruppe, erscheinung, menschenZeit } from './menschen.js';

export const STANDARD_LEBEN = 'voll'; // Bis N13 eingebunden ist: voll | wenig | aus.
const MODI = ['voll', 'wenig', 'aus'];
const MAX_AUTO = 60, MAX_FUSS = 110, MAX_BUS = 8, MAX_BAHN = 6, MAX_LKW = 5;
const KLEINSTE_LUECKE = 6.5;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// Kartenstädte: Straßenstücke beliebiger Richtung (achse 'r': Ursprung ax/az, Richtung ux/uz, Normale nx/nz, von = 0, bis = Länge).
const koordinate = (s, u, v) => s.achse === 'r' ? { x: s.ax + s.ux * u + s.nx * v, z: s.az + s.uz * u + s.nz * v }
  : s.achse === 'z' ? { x: s.mitte + v, z: u } : { x: u, z: s.mitte + v };
/** Lage eines Punkts zum Straßenstück: u entlang, v quer (gleiche Konvention wie koordinate). */
const lageZu = (s, p) => s.achse === 'r' ? { u: (p.x - s.ax) * s.ux + (p.z - s.az) * s.uz, v: (p.x - s.ax) * s.nx + (p.z - s.az) * s.nz }
  : s.achse === 'z' ? { u: p.z, v: p.x - s.mitte } : { u: p.x, v: p.z - s.mitte };
const richtungsWinkel = (s, d) => s.achse === 'r' ? Math.atan2(-s.uz * d, s.ux * d) : s.achse === 'z' ? Math.atan2(-d, 0) : Math.atan2(0, d);
const sign = (s) => s.achse === 'z' ? -1 : 1;
const wegStart = (l) => l.dir > 0 ? l.s.von + 2 : l.s.bis - 2;
const wegEnde = (l) => l.dir > 0 ? l.s.bis - 2 : l.s.von + 2;
const punkt = (l, meter) => koordinate(l.s, wegStart(l) + l.dir * meter, l.v);
const laenge = (l) => Math.max(0, l.s.bis - l.s.von - 4);
const abstand = (a, b) => wurzelSumme(a.x - b.x, a.z - b.z);

export function verkehrsnetz(plan) {
  const spuren = [], fusswege = [], trams = [], haupt = [];
  for (const s of plan?.strassen ?? []) {
    if (s.bis - s.von < (s.achse === 'r' ? 6 : 14) || s.bruecke && s.typ === 'fussgaenger') continue;
    const fb = s.breite - 2 * s.gehweg, ps = sign(s);
    if (s.typ !== 'fussgaenger' && !s.leitwand) {
      const seiten = s.typ === 'haupt'
        ? [((s.mittel || 6) / 2 + (fb / 2 - (s.mittel || 6) / 2) * .35), ((s.mittel || 6) / 2 + (fb / 2 - (s.mittel || 6) / 2) * .73)]
        : [Math.max(1.3, fb / 4)];
      for (const dir of s.einbahn ? [1] : [1, -1]) for (let i = 0; i < seiten.length; i++) {
        const v = ps * dir * seiten[i];
        const l = { s, dir, v, id: s.id + ':' + dir + ':' + i, naechste: [] };
        spuren.push(l);
        if (s.typ === 'haupt') haupt.push(l);
      }
      if (s.tram && (s.art === 'magistrale' || s.typ === 'haupt'))
        for (const dir of [1, -1]) trams.push({ s, dir, v: -ps * dir * 1.6, id: 'tram:' + s.id + ':' + dir, naechste: [] });
    }
    for (const seite of [-1, 1]) {
      const v = s.typ === 'fussgaenger' ? seite * Math.max(1.5, fb * .29) : seite * (s.breite / 2 - s.gehweg / 2);
      fusswege.push({ s, dir: 1, v, id: s.id + ':f:' + seite });
    }
  }
  // Die am Stadtplan hinterlegten Kreuzungsarme verknüpfen die vorhandenen gerichteten Spuren.
  // Kreuzungen je Straßenstück einmal nachschlagen (vorher Suche über alle Kreuzungen je Spur: quadratisch bei Kartenstädten)
  const knotenJe = new Map();
  for (const k of plan?.kreuzungen ?? []) for (const a of Object.values(k.arme ?? {})) if (a) { if (!knotenJe.has(a.id)) knotenJe.set(a.id, []); knotenJe.get(a.id).push(k); }
  const verbinde = (liste) => {
    const proSegment = new Map();
    for (const l of liste) {
      if (!proSegment.has(l.s.id)) proSegment.set(l.s.id, []);
      proSegment.get(l.s.id).push(l);
    }
    for (const l of liste) {
      const end = punkt(l, laenge(l));
      const knoten = [...(knotenJe.get(l.s.id) ?? [])].sort((a, b) => abstand(a, end) - abstand(b, end))[0];
      if (!knoten || abstand(knoten, end) > Math.max(33, l.s.breite)) continue;
      for (const a of Object.values(knoten.arme ?? {})) {
        if (!a || a.id === l.s.id || a.typ === 'fussgaenger') continue;
        for (const n of proSegment.get(a.id) ?? []) {
          const start = punkt(n, 0);
          if (abstand(knoten, start) <= Math.max(33, a.breite) && abstand(start, end) < 65) l.naechste.push(n);
        }
      }
    }
  };
  verbinde(spuren);
  verbinde(trams);
  return { spuren, fusswege, trams, haupt };
}

/** Sichtbare Käuferfrequenz basiert ausschließlich auf dem letzten tatsächlich gebuchten Wochenumsatz. */
export function hausGewicht(haus, median = 1) {
  if (haus?.status !== 'offen' && haus?.status !== 'raeumung') return 0;
  const umsatz = Math.max(0, haus?.kpi?.umsatz ?? 0);
  const lage = haus.lage === '1a' ? 1.25 : haus.lage === 'rand' ? .7 : 1;
  return clamp((umsatz ? Math.sqrt(umsatz / Math.max(1, median)) : .65) * lage * (1 + clamp(haus.transferBonus ?? 0, -.5, 1)), .25, 3.5);
}

const FORMAT_FARBE = { warenhaus: '#d23c32', sport: '#327cb4', schwester: '#397e69',
  volkskauf: '#397e69', outlet: '#752d52', fundus: '#752d52' };
const autoFarben = ['#d04a3f', '#2f63b5', '#ece8e1', '#28303a', '#b09a52', '#598b6c', '#9f6f83'];
function formatFarbe(h) {
  return FORMAT_FARBE[h?.format] ?? (h?.id?.startsWith('V') ? '#397e69' : '#d23c32');
}

function instanzen(scene, geometrie, max, name) {
  const m = new THREE.InstancedMesh(geometrie, new THREE.MeshLambertMaterial({ color: '#ffffff', side: THREE.FrontSide }), max);
  m.name = 'leben:' + name;
  m.count = 0;
  m.frustumCulled = false; // Sichtbarkeit wird bereits je Instanz/Kamera begrenzt.
  m.castShadow = false;
  scene.add(m);
  return m;
}
const dummy = new THREE.Object3D();
function matrix(mesh, i, pos, winkel, groesse, farbe) {
  dummy.position.set(pos.x, pos.y, pos.z);
  dummy.rotation.set(0, winkel, 0);
  dummy.scale.set(groesse[0], groesse[1], groesse[2]);
  dummy.updateMatrix();
  mesh.setMatrixAt(i, dummy.matrix);
  if (farbe) mesh.setColorAt(i, farbe);
}
function fertig(m, n) {
  m.count = n;
  m.instanceMatrix.needsUpdate = true;
  if (m.instanceColor) m.instanceColor.needsUpdate = true;
}

export function lebenModul({ canvas, scene: szene, camera: kamera, K: zoom, spiel, zeichnen, sparsam = false }) {
  let modus = STANDARD_LEBEN, scene = null, plan = null, netz = null, r = rng(1);
  let autos = [], fuss = [], busse = [], bahnen = [], lkw = [], hauspunkte = [];
  let meshes = {}, leute = null, uhr = 0, raf = 0, zuletzt = 0, letzterKontakt = 0, letzteAuswahl = -1, pause = false;
  let frameKosten = [], limitFaktor = 1, langsameFrames = 0, aufnahme = false;
  const farbe = (c) => new THREE.Color(c);
  const projektion = new THREE.Vector3();
  const sichtbar = (p, rand = 1.35) => {
    const k = zoom(); if (!k) return false;
    // Grobe Sichtbarkeitsprüfung vor dem exakten Projektions-Test spart CPU.
    if (Math.abs(p.x - k.x) + Math.abs(p.z - k.z) > k.halb * 5) return false;
    const c = kamera(); if (!c) return false;
    const v = projektion.set(p.x, 0.5, p.z).project(c);
    return Math.abs(v.x) < rand && Math.abs(v.y) < rand;
  };
  function waehle(liste) { return liste[Math.floor(r() * liste.length)]; }
  function meshBauen() {
    meshes = {
      auto: instanzen(scene, new THREE.BoxGeometry(4.5, 1.5, 2.0), MAX_AUTO, 'auto'),
      glas: instanzen(scene, new THREE.BoxGeometry(2.3, .8, 1.8), MAX_AUTO, 'autoglas'),
      bus: instanzen(scene, new THREE.BoxGeometry(11.5, 3.1, 2.6), MAX_BUS, 'bus'),
      tram: instanzen(scene, new THREE.BoxGeometry(19, 3.5, 2.65), MAX_BAHN, 'tram'),
      lkw: instanzen(scene, new THREE.BoxGeometry(8.1, 3.1, 2.7), MAX_LKW, 'lieferwagen'),
    };
    // Passanten: vorgerenderte Figuren (menschen.js), ein Draw Call
    leute = menschenGruppe(MAX_FUSS, 'leben:passanten');
    scene.add(leute.mesh);
  }
  function loeschen() {
    anhalten();
    if (scene) for (const m of Object.values(meshes)) {
      m.parent?.remove(m); m.geometry.dispose(); m.material.dispose();
    }
    if (leute) { leute.mesh.parent?.remove(leute.mesh); leute.dispose(); leute = null; }
    meshes = {}; scene = null; plan = null; netz = null; autos = []; fuss = []; busse = []; bahnen = []; lkw = []; hauspunkte = [];
    zuletzt = 0; letzteAuswahl = -1;
  }
  function hausStandorte() {
    const s = spiel();
    if (!s || !plan) return [];
    // GameState enthält keinen ausgewählten Städtenamen, deshalb Zuordnung über plan.standorte.
    const punkte = [];
    for (const st of plan.standorte ?? []) {
      const h = (s.haeuser ?? []).find((x) => x.id === st.id || x.id === st.hausId);
      const p = plan.parzellen.find((p) => p.id === st.parzelle);
      if (!h || !p || !netz?.fusswege.length) continue;
      const mitte = { x: p.x + p.w / 2, z: p.z + p.d / 2 };
      const f = netz.fusswege.filter((w) => Math.abs(lageZu(w.s, mitte).v) < 65)
        .map((w) => ({ w, u: clamp(lageZu(w.s, mitte).u, w.s.von + 3, w.s.bis - 3) }));
      f.sort((a, b) => abstand(koordinate(a.w.s, a.u, a.w.v), mitte) - abstand(koordinate(b.w.s, b.u, b.w.v), mitte));
      if (!f.length) continue;
      const a = f[0], weg = koordinate(a.w.s, a.u, a.w.v);
      // Eingang auf der zur Straße gerichteten Hauskante, nicht mitten durch das Gebäude.
      const ein = a.w.s.achse === 'r'
        ? { x: clamp(weg.x, p.x, p.x + p.w), z: clamp(weg.z, p.z, p.z + p.d) }   // nächster Punkt der Hauskante zum Gehweg
        : a.w.s.achse === 'z'
        ? { x: a.w.s.mitte < mitte.x ? p.x : p.x + p.w, z: clamp(a.u, p.z + 1, p.z + p.d - 1) }
        : { x: clamp(a.u, p.x + 1, p.x + p.w - 1), z: a.w.s.mitte < mitte.z ? p.z : p.z + p.d };
      punkte.push({ h, p, mitte, weg, ein, lane: a.w, u: a.u });
    }
    const umsaetze = punkte.map((p) => p.h.kpi?.umsatz ?? 0).filter((x) => x > 0).sort((a, b) => a - b);
    const median = umsaetze[Math.floor(umsaetze.length / 2)] ?? 1;
    for (const p of punkte) p.gewicht = hausGewicht(p.h, median);
    return punkte;
  }
  function neueFussgaenger(wege) {
    if (!wege.length) return null;
    const aktive = hauspunkte.filter((x) => x.gewicht && sichtbar(x.weg, 1.7));
    let haus = null;
    // Nur ein Teil hat ein Haus als Ziel; die übrigen bummeln über alle sichtbaren Wege der Stadt
    if (aktive.length && r() < .3) {
      const sum = aktive.reduce((a, b) => a + b.gewicht, 0);
      let v = r() * sum;
      haus = aktive.find((a) => (v -= a.gewicht) <= 0) ?? aktive.at(-1);
    }
    const weg = haus?.lane ?? waehle(wege);
    // Auch Kunden starten irgendwo auf ihrem Weg und laufen erst zum Haus (kein Pulk am Eingang)
    const anfang = r() * laenge(weg);
    const geschw = 0.95 + r() * .6;
    // Querversatz auf dem Gehweg, damit nicht alle auf einer Linie laufen
    const breit = weg.s.typ === 'fussgaenger' ? 1.6 : Math.max(0, (weg.s.gehweg ?? 3) / 2 - 0.6);
    return { weg, m: anfang, quer: (r() * 2 - 1) * breit, dir: r() < .5 ? -1 : 1, geschw,
      haus, phase: 'weg', lauf: 0, tuete: false, aussehen: erscheinung(r, { kinder: .07 }), ph: r() * 8, tempo: geschw / 1.25 };
  }
  function neuerWagen(lanes, art = 'auto') {
    if (!lanes.length) return null;
    const lane = waehle(lanes);
    return { lane, m: r() * laenge(lane), geschw: art === 'tram' ? 7 + r() * 2 : art === 'bus' ? 5 + r() * 2 : 6 + r() * 5,
      farbe: farbe(waehle(autoFarben)), art, sprung: null };
  }
  function aktualisiereAuswahl() {
    if (!netz || !scene || modus === 'aus') return;
    const k = zoom(), neu = Math.round(k.x / 18) + ':' + Math.round(k.z / 18) + ':' + Math.round(k.halb / 9) + ':' + modus + ':' + limitFaktor;
    if (neu === letzteAuswahl) return;
    letzteAuswahl = neu;
    if (k.halb > 110) { autos = []; fuss = []; busse = []; bahnen = []; return; }
    const lanes = netz.spuren.filter((l) => sichtbar(punkt(l, laenge(l) * .5), 1.6));
    const wege = netz.fusswege.filter((l) => sichtbar(punkt(l, laenge(l) * .5), 1.5));
    const busLanes = lanes.filter((l) => l.s.typ === 'haupt');
    const tramLanes = netz.trams.filter((l) => l.s.art === 'magistrale' && sichtbar(punkt(l, laenge(l) * .5), 1.5));
    const dichte = (modus === 'wenig' ? .5 : 1) * limitFaktor;
    const sollAuto = lanes.length ? Math.min(MAX_AUTO, Math.max(1, Math.round((20 + 40 * clamp((110 - k.halb) / 88, 0, 1)) * dichte))) : 0;
    const sollFuss = wege.length ? Math.round(100 * dichte) : 0;
    const anpassen = (arr, n, liste, art, sonstige = []) => {
      const weiter = arr.filter((a) => a?.lane && liste.includes(a.lane)).slice(0, n);
      for (let i = 0; i < n * 18 && weiter.length < n; i++) {
        const a = neuerWagen(liste, art);
        if (!a) break;
        // Bei knappen Straßen lieber weniger Wagen, statt zwei in dieselbe Spur zu setzen.
        if ([...weiter, ...sonstige].some((b) => b.lane === a.lane &&
            Math.abs(b.m - a.m) < (a.art === 'tram' || b.art === 'tram' ? 22 :
              a.art === 'bus' || b.art === 'bus' ? 14 : KLEINSTE_LUECKE))) continue;
        weiter.push(a);
      }
      return weiter;
    };
    autos = anpassen(autos, sollAuto, lanes, 'auto');
    busse = anpassen(busse, Math.min(MAX_BUS, Math.round(busLanes.length / 5 * dichte)), busLanes, 'bus', autos);
    bahnen = anpassen(bahnen, Math.min(MAX_BAHN, Math.round(tramLanes.length / 3 * dichte)), tramLanes, 'tram');
    fuss = fuss.filter((a) => wege.includes(a.weg)).slice(0, sollFuss);
    while (fuss.length < sollFuss) { const f = neueFussgaenger(wege); if (!f) break; fuss.push(f); }
  }
  function bewegungWagen(liste, dt) {
    // Vorderes Fahrzeug je Spur zuerst; Folgende werden hinter dem Sicherheitsabstand begrenzt.
    const belegung = new Map();
    const sortiert = [...liste].sort((a, b) => b.m - a.m);
    for (const a of sortiert) {
      const key = a.lane.id;
      const voraus = belegung.get(key);
      let ziel = a.m + a.geschw * dt;
      if (voraus) ziel = Math.min(ziel, voraus.m - (a.art === 'tram' || voraus.art === 'tram' ? 22 : a.art === 'bus' || voraus.art === 'bus' ? 14 : KLEINSTE_LUECKE));
      if (ziel >= laenge(a.lane)) {
        const moeglich = a.lane.naechste.filter((n) => !liste.some((b) => b !== a && b.lane === n && b.m < KLEINSTE_LUECKE * 2));
        const nach = moeglich.length ? waehle(moeglich) : null;
        if (nach) { a.sprung = { von: punkt(a.lane, laenge(a.lane)), nach: punkt(nach, 0), fort: 0 }; a.lane = nach; a.m = 0; }
        else a.m = Math.max(0, laenge(a.lane) - 1);
      } else a.m = Math.max(0, ziel);
      belegung.set(a.lane.id, a);
      if (a.sprung) { a.sprung.fort += a.geschw * dt; if (a.sprung.fort >= abstand(a.sprung.von, a.sprung.nach)) a.sprung = null; }
    }
  }
  function positionWagen(a) {
    const p = punkt(a.lane, a.m), q = punkt(a.lane, Math.min(laenge(a.lane), a.m + 1));
    if (a.sprung) {
      const t = clamp(a.sprung.fort / Math.max(.01, abstand(a.sprung.von, a.sprung.nach)), 0, 1);
      const { von, nach } = a.sprung;
      return { x: von.x + (nach.x - von.x) * t, y: .95, z: von.z + (nach.z - von.z) * t,
        winkel: Math.atan2(-(nach.z - von.z), nach.x - von.x) };
    }
    return { ...p, y: .95, winkel: (q.z - p.z || q.x - p.x) ? Math.atan2(-(q.z - p.z), q.x - p.x) : richtungsWinkel(a.lane.s, a.lane.dir) };
  }
  function fussBewegen(dt) {
    for (const f of fuss) {
      if (f.phase === 'weg') {
        f.m += f.dir * f.geschw * dt;
        if (f.m < 0 || f.m > laenge(f.weg)) { f.dir *= -1; f.m = clamp(f.m, 0, laenge(f.weg)); }
        if (f.haus && !f.tuete && Math.abs((f.weg.s.von + f.m) - f.haus.u) < 1.5) {
          f.phase = 'hinein'; f.lauf = 0;
        }
      } else {
        f.lauf += dt;
        if (f.phase === 'hinein' && f.lauf >= .9) { f.phase = 'drinnen'; f.lauf = 0; }
        else if (f.phase === 'drinnen' && f.lauf >= 1 + r() * .4) {
          f.phase = 'heraus'; f.lauf = 0;
          f.tuete = r() < clamp(.24 + f.haus.gewicht * .15, .2, .83);
          f.aussehen = { ...f.aussehen, tasche: formatFarbe(f.haus.h) };
        } else if (f.phase === 'heraus' && f.lauf >= .9) { f.phase = 'weg'; f.lauf = 0; f.haus = null; }
      }
    }
  }
  function fussPosition(f) {
    const p = koordinate(f.weg.s, f.weg.s.von + f.m, f.weg.v + (f.quer ?? 0));
    if (!f.haus || f.phase === 'weg') return p;
    const t = f.phase === 'hinein' ? clamp(f.lauf / .9, 0, 1) : f.phase === 'heraus' ? 1 - clamp(f.lauf / .9, 0, 1) : 1;
    return { x: p.x + (f.haus.ein.x - p.x) * t, z: p.z + (f.haus.ein.z - p.z) * t };
  }
  function zeichneInstanzen() {
    if (!meshes.auto) return;
    let n = 0;
    for (const a of autos) {
      const p = positionWagen(a); if (!sichtbar(p)) continue;
      matrix(meshes.auto, n, p, p.winkel, [1, 1, 1], a.farbe);
      matrix(meshes.glas, n, { ...p, y: 1.95 }, p.winkel, [1, 1, 1], farbe('#718d9d')); n++;
    }
    fertig(meshes.auto, n); fertig(meshes.glas, n);
    const grosse = (liste, key, palette) => {
      let m = 0;
      for (const a of liste) { const p = positionWagen(a); if (!sichtbar(p)) continue; matrix(meshes[key], m++, { ...p, y: 1.65 }, p.winkel, [1, 1, 1], palette); }
      fertig(meshes[key], m);
    };
    grosse(busse, 'bus', farbe('#d7c7a0'));
    grosse(bahnen, 'tram', farbe('#c83c36'));
    n = 0;
    for (const f of fuss) {
      const p = fussPosition(f);
      if (f.phase === 'drinnen' || !sichtbar(p) || !leute) continue;
      // Blickrichtung: entlang des Wegs, beim Hinein/Heraus zum bzw. vom Eingang
      let winkel;
      if (f.haus && f.phase !== 'weg') {
        const w = koordinate(f.weg.s, f.weg.s.von + f.m, f.weg.v), e = f.haus.ein;
        winkel = f.phase === 'hinein' ? Math.atan2(-(e.z - w.z), e.x - w.x) : Math.atan2(-(w.z - e.z), w.x - e.x);
      } else {
        winkel = richtungsWinkel(f.weg.s, f.dir);
      }
      leute.setze(n++, p.x, .3, p.z, winkel, f.aussehen, f.tuete ? 'gehen_tasche' : 'gehen', f.ph, 1, f.tempo);
    }
    if (leute) leute.fertig(n);
    n = 0;
    for (const a of lkw) {
      const t = clamp(a.fort / 4.5, 0, 1);
      if (a.fort > 12) continue; // Lkw hat nach der Entladung die Anlieferung wieder verlassen.
      const ein = a.fort < 4.5 ? t : a.fort < 8 ? 1 : 1 - clamp((a.fort - 8) / 4, 0, 1);
      const p = { x: a.start.x + (a.ziel.x - a.start.x) * ein, z: a.start.z + (a.ziel.z - a.start.z) * ein };
      if (!sichtbar(p)) continue;
      matrix(meshes.lkw, n++, { ...p, y: 1.7 }, a.winkel, [1, 1, 1], farbe('#e1ddd1'));
    }
    fertig(meshes.lkw, n);
  }
  function schritt(dt) {
    const t0 = performance.now();
    aktualisiereAuswahl();
    uhr += dt; menschenZeit(uhr);
    bewegungWagen([...autos, ...busse], dt); bewegungWagen(bahnen, dt);
    fussBewegen(dt);
    for (const a of lkw) a.fort += dt;
    zeichneInstanzen();
    const ms = performance.now() - t0;
    frameKosten.push(ms); if (frameKosten.length > 60) frameKosten.shift();
    // iPhone: adaptives Stufenbudget mit Hysterese; unter 2 ms wieder hochfahren.
    const mittel = frameKosten.reduce((a, b) => a + b, 0) / frameKosten.length;
    if (mittel > 2) langsameFrames++; else langsameFrames = Math.max(0, langsameFrames - 1);
    if (langsameFrames >= 12 && limitFaktor > .25) { limitFaktor *= .5; langsameFrames = 0; letzteAuswahl = -1; }
    else if (frameKosten.length === 60 && mittel < .85 && limitFaktor < 1 && !aufnahme) { limitFaktor = Math.min(1, limitFaktor * 2); letzteAuswahl = -1; }
    return ms;
  }
  function takt(zeit) {
    raf = 0;
    if (pause || !scene || modus === 'aus' || document.hidden) return;
    const still = zeit - letzterKontakt > 30000;
    if (still && zeit - zuletzt < 1000 / 15) { raf = requestAnimationFrame(takt); return; }
    const dt = zuletzt ? clamp((zeit - zuletzt) / 1000, 0, .07) : 0;
    zuletzt = zeit;
    if (zoom().halb <= 110) { schritt(dt); zeichnen(); }
    else if (Object.values(meshes).some((m) => m.count) || leute?.mesh.geometry.instanceCount) { autos = []; fuss = []; busse = []; bahnen = []; zeichneInstanzen(); zeichnen(); }
    raf = requestAnimationFrame(takt);
  }
  function starten() { if (!raf && scene && !pause && modus !== 'aus' && !document.hidden) { zuletzt = 0; raf = requestAnimationFrame(takt); } }
  function anhalten() { if (raf) cancelAnimationFrame(raf); raf = 0; }
  function stadtSetzen(neu) {
    loeschen();
    scene = szene(); plan = neu;
    if (!scene || !plan) return;
    netz = verkehrsnetz(plan); r = rng((plan.seed ?? 1) * 37 + 907);
    hauspunkte = hausStandorte();
    meshBauen();
    letzterKontakt = performance.now();
    aktualisiereAuswahl(); zeichneInstanzen(); starten();
  }
  function woche(neueBestellungen = 0) {
    if (!scene) return;
    hauspunkte = hausStandorte();
    // Der Einkauf bestellt zentral, nicht je Filiale. Eine Lieferung wird repräsentativ
    // den Häusern dieser Stadt zugeteilt, höchstens ein Lkw pro Haus und Woche.
    const anzahl = Math.min(MAX_LKW, Math.max(0, Math.floor(neueBestellungen)));
    const rang = [...hauspunkte].filter((h) => h.gewicht > 0).sort((a, b) => b.gewicht - a.gewicht);
    lkw = rang.slice(0, anzahl).map((h) => {
      const s = netz.spuren.filter((l) => l.s.typ !== 'fussgaenger')
        .sort((a, b) => abstand(punkt(a, laenge(a) / 2), h.mitte) - abstand(punkt(b, laenge(b) / 2), h.mitte))[0];
      const p = s ? koordinate(s.s, clamp(lageZu(s.s, h.mitte).u, s.s.von + 4, s.s.bis - 4),
        Math.sign(lageZu(s.s, h.mitte).v) * (s.s.breite / 2 - .8)) : h.weg;
      const ziel = h.weg; // Vom Fahrbahnrand bis zur Hausanlieferung und zurück.
      return { start: p, ziel, fort: 0, winkel: s ? richtungsWinkel(s.s, 1) : 0, hausId: h.h.id };
    });
    letzteAuswahl = -1; zeichneInstanzen();
    if (modus !== 'aus') zeichnen();
  }
  function setzen(wert) {
    if (!MODI.includes(wert)) return modus;
    modus = wert;
    letzteAuswahl = -1;
    if (modus === 'aus') {
      anhalten(); autos = []; fuss = []; busse = []; bahnen = []; lkw = [];
      for (const m of Object.values(meshes)) { m.count = 0; m.instanceMatrix.needsUpdate = true; }
      leute?.fertig(0);
      if (scene) zeichnen();
    } else { letzterKontakt = performance.now(); aktualisiereAuswahl(); zeichneInstanzen(); starten(); }
    return modus;
  }
  function kontakt() { letzterKontakt = performance.now(); }
  function sichtbarkeit() { if (document.hidden) { anhalten(); zuletzt = 0; } else starten(); }
  canvas.addEventListener('pointerdown', kontakt, { passive: true });
  canvas.addEventListener('wheel', kontakt, { passive: true });
  document.addEventListener('visibilitychange', sichtbarkeit);
  return {
    stadt: stadtSetzen, woche, setzen, get modus() { return modus; },
    kamera: () => { letzteAuswahl = -1; kontakt(); },
    pause: (an) => { pause = !!an; if (pause) anhalten(); else starten(); },
    kontakt, zu: loeschen,
    /** Debug-API und Abnahme: 10 Zeitpunkte im 100-ms-Abstand mit externen Canvas-Screenshots. */
    schritt: (dt = .1, bild = true) => { const ms = schritt(dt); if (bild) zeichnen(); return ms; },
    status: () => ({ modus, autos: autos.length, passanten: fuss.length, busse: busse.length,
      strassenbahnen: bahnen.length, lieferwagen: lkw.length,
      netzSpuren: netz?.spuren.length ?? 0, budget: limitFaktor,
      updateMittelMs: +(frameKosten.reduce((a,b)=>a+b,0) / Math.max(1,frameKosten.length)).toFixed(2),
      akkuFps: performance.now() - letzterKontakt > 30000 ? 15 : 60 }),
  };
}
