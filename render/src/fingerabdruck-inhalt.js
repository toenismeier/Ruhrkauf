// Fester Messaufbau für Q03. Läuft ausschließlich im Playwright-Prüfbrowser.
import { THREE, KompaktSammler, setzeLod, neueSzene, isoKamera, renderer, entferneKleineSchilder } from './kit/basis.js';
import { stadtplan, baueStadt, bauerFuer } from './kit/stadt.js';
import { echterBauer } from './kit/bauer.js';
import { STADTLISTE } from './kit/staedte.js';
import { nahMitte } from './kit/stadtrand.js';

const BREITE = 512, HOEHE = 1024;
const runde = (wert) => Math.round(wert * 100) / 100;

// Sortierte Schlüsselfolge, Zentimetergenauigkeit und keine laufzeitabhängigen Objekte.
function kanonisch(wert, gesehen = new WeakSet()) {
  if (typeof wert === 'number') return Number.isFinite(wert) ? runde(wert) : String(wert);
  if (wert === null || typeof wert !== 'object') return typeof wert === 'function' || typeof wert === 'undefined' ? null : wert;
  if (gesehen.has(wert)) throw new Error('Zyklische Stadtplandaten');
  gesehen.add(wert);
  let erg;
  if (Array.isArray(wert)) erg = wert.map((v) => kanonisch(v, gesehen));
  else if (wert instanceof Map) erg = [...wert.entries()].map(([k, v]) => [kanonisch(k, gesehen), kanonisch(v, gesehen)]).sort((a, b) => JSON.stringify(a[0]).localeCompare(JSON.stringify(b[0])));
  else if (wert instanceof Set) erg = [...wert].map((v) => kanonisch(v, gesehen)).sort();
  else {
    erg = {};
    for (const k of Object.keys(wert).sort()) {
      if (typeof wert[k] !== 'function' && typeof wert[k] !== 'undefined') erg[k] = kanonisch(wert[k], gesehen);
    }
  }
  gesehen.delete(wert);
  return erg;
}

// Schneller 64-Bit-Fingerabdruck aus zwei unabhängigen 32-Bit-Läufen.
// Die gespeicherten Gesamtprüfsummen werden zusätzlich im Node-Prozess als SHA-256 berechnet.
function kurzHash(text) {
  let a = 2166136261, b = 5381;
  for (let i = 0; i < text.length; i++) {
    a = Math.imul(a ^ text.charCodeAt(i), 16777619);
    b = Math.imul(b, 33) ^ text.charCodeAt(i);
  }
  return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
}

function kacheln(plan) {
  const liste = [];
  for (const [gruppe, eintraege] of Object.entries({
    parzellen: plan.parzellen, strassen: plan.strassen, kreuzungen: plan.kreuzungen,
    bloecke: plan.bloecke, diagonalen: plan.diagonalen, zwickel: plan.zwickel,
  })) {
    if (!Array.isArray(eintraege)) continue;
    eintraege.forEach((e, i) => {
      const id = String(e.id ?? gruppe + '-' + i);
      const c = kanonisch(e);
      liste.push({
        id: gruppe + '/' + id, bauer: e.typ ?? e.art ?? e.achse ?? gruppe,
        lage: [e.x, e.z, e.w, e.d].map((n) => typeof n === 'number' ? runde(n) : null),
        drehung: Math.round((e.drehung ?? e.ry ?? e.winkel ?? 0) * 10000) / 10000,
        variante: e.variante ?? e.standort?.variante ?? e.fassade ?? e.stil ?? e.sonder ?? null,
        standort: e.standort?.id ?? null,
        pruefsumme: kurzHash(JSON.stringify(c))
      });
    });
  }
  for (const [gruppe, eintraege] of [['aussen/bauten', plan.aussen?.bauten], ['aussen/wasser', plan.aussen?.wasser], ['umland', plan.umland]]) {
    if (!Array.isArray(eintraege)) continue;
    eintraege.forEach((e, i) => liste.push({
      id: gruppe + '/' + (e.id ?? i), bauer: e.typ ?? e.art ?? gruppe,
      lage: [e.x, e.z, e.w, e.d].map((n) => typeof n === 'number' ? runde(n) : null),
      drehung: Math.round((e.drehung ?? e.ry ?? e.winkel ?? 0) * 10000) / 10000, variante: e.variante ?? e.standort?.variante ?? null,
      standort: e.standort?.id ?? null, pruefsumme: kurzHash(JSON.stringify(kanonisch(e)))
    }));
  }
  liste.sort((a, b) => a.id.localeCompare(b.id, 'de'));
  return { liste, gesamt: kurzHash(JSON.stringify(kanonisch(plan))) };
}

function leer() { return { teile: 0, dreiecke: 0, min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }; }
function hinzufuegen(z, g, matrix = null) {
  if (!g?.attributes?.position) return;
  z.teile++;
  z.dreiecke += Math.round((g.index?.count ?? g.attributes.position.count) / 3);
  if (!g.boundingBox) g.computeBoundingBox();
  const box = matrix ? g.boundingBox.clone().applyMatrix4(matrix) : g.boundingBox;
  for (let a = 0; a < 3; a++) {
    const min = box.min.getComponent(a), max = box.max.getComponent(a);
    if (Number.isFinite(min)) z.min[a] = Math.min(z.min[a], min);
    if (Number.isFinite(max)) z.max[a] = Math.max(z.max[a], max);
  }
}
function fertig(z) {
  return { teile: z.teile, dreiecke: z.dreiecke,
    boundingBox: z.teile ? [...z.min, ...z.max].map(runde) : null };
}

async function messen(name, optionen = {}) {
  const d = STADTLISTE.find((s) => s.name === name);
  if (!d) throw new Error('Unbekannte Stadt: ' + name);
  const plan = stadtplan(d.seed, { typ: d.typ, archetyp: d.archetyp, region: d.region, strassenFaktor: 1.6, ...d.extra, standorte: d.standorte });
  const planDaten = kacheln(plan);
  const szene = neueSzene('#4fb6c2');
  szene.userData.sonne.shadow.mapSize.set(2048, 2048);
  const S = new KompaktSammler(), bauer = echterBauer();
  const einzeln = new Map(), umgebung = leer();
  const testParzelle = optionen.mutiereHausbauer ? plan.parzellen.find((p) => p.typ === 'stadthaus')?.id ?? plan.parzellen[0]?.id : null;
  let aktiv = null;
  const erfasse = (g, matrix) => hinzufuegen(aktiv ? einzeln.get(aktiv) : umgebung, g, matrix);
  const originalAdd = S.add.bind(S);
  S.add = (g, farbe) => { erfasse(g); return originalAdd(g, farbe); };
  const originalSceneAdd = szene.add.bind(szene);
  szene.add = (...objekte) => {
    for (const obj of objekte) {
      obj.updateMatrixWorld?.(true);
      obj.traverse?.((m) => { if (m.geometry) erfasse(m.geometry, m.matrixWorld); });
    }
    return originalSceneAdd(...objekte);
  };
  const proxy = new Proxy(bauer, { get(ziel, typ) {
    const fn = bauerFuer(ziel, typ);
    return (s, scene, p) => {
      aktiv = p.id;
      if (!einzeln.has(aktiv)) einzeln.set(aktiv, leer());
      try {
        const erg = fn(s, scene, p);
        // Gegenprobe: absichtliche Änderung eines Hausbauer-Aufrufs in genau einer Stadt.
        if (p.id === testParzelle) S.box(3, 4, 3, p.x + 3, 2, p.z + 3, '#ff00ff');
        return erg;
      }
      finally { aktiv = null; }
    };
  } });
  let erg;
  const zeit = performance.now();
  try {
    setzeLod('fern');
    erg = baueStadt(S, szene, plan, proxy);
    // Die zusammengefassten Sammler-Geometrien wurden bereits vor dem Merge erfasst.
    szene.add = originalSceneAdd;
    S.bauen(szene);
    entferneKleineSchilder(szene);
    const nm = nahMitte(plan, 'einkauf', 62);
    const cam = isoKamera(BREITE, HOEHE, 60, new THREE.Vector3(nm.x, 0, nm.z));
    const sonne = szene.userData.sonne;
    const r = 60 * 2.4;
    sonne.position.set(nm.x - 40, 120, nm.z + 90);
    sonne.target.position.set(nm.x, 0, nm.z);
    Object.assign(sonne.shadow.camera, { left: -r, right: r, top: r, bottom: -r });
    sonne.shadow.camera.updateProjectionMatrix();
    const ren = renderer(BREITE, HOEHE);
    ren.render(szene, cam);
    const leistung = { drawCalls: ren.info.render.calls, dreiecke: ren.info.render.triangles };
    const bild = ren.domElement.toDataURL('image/png').split(',')[1];
    const teile = [...einzeln.entries()].map(([id, z]) => ({ id, ...fertig(z) })).sort((a, b) => a.id.localeCompare(b.id, 'de'));
    return {
      daten: {
        schema: 1, stadt: d.name, stadtId: null, seed: d.seed,
        profil: { breite: BREITE, hoehe: HOEHE, lod: 'fern', zoom: 60, perspektive: 'isometrisch', ansicht: 'einkauf', schatten: 2048 },
        stadtplan: planDaten,
        geometrie: { kacheln: teile, umgebung: fertig(umgebung),
          gesamt: { teile: S.anzahl, strasse: erg.teileStrasse, haeuser: erg.teileHaeuser, instanzen: erg.instanzen, drawCallsInstanzen: erg.drawCallsInstanzen } }
      },
      bild, dauerMs: Math.round(performance.now() - zeit), leistung
    };
  } finally {
    setzeLod('nah');
    szene.add = originalSceneAdd;
    szene.traverse((obj) => { if (obj.geometry) obj.geometry.dispose(); });
    szene.clear();
  }
}
globalThis.stadtFingerabdruck = messen;
