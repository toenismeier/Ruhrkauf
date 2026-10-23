// Optionaler, rein visueller Hausbesuch. Keine Änderungen am Spielstand und keine Engine-Zufallszahlen.
// Der Schalter kann nach Einbau von N13 über setzenAktiv() angebunden werden.
import { THREE, Sammler, neueSzene, isoKamera, sonneAuf } from '../kit/basis.js';
import { etage } from '../kit/grundriss.js';
import { masseOutlet } from '../kit/outlet.js';
import { ladenplan, baueLadenplan } from '../kit/ladenplan.js';
import fundusHaeuser from '../../haeuser-outlet.json';
import { karteSteuerung } from './karte.js';
import { esc } from './format.js';
import { portraetSVG, zufallsMerkmale } from '../kit/portraet.js';
import { personMerkmale } from './haus.js';
import { navigationsRaster, erstelleBesucher, bewegeBesucher, simuliereLaufwege } from './hausbesuch-navigation.js';

export const HAUSBESUCH_AKTIV = true;
const PHRASE = Object.freeze({
  altware: [
    'Das hängt hier schon seit dem Frühjahr.', 'Die Kollektion kenne ich noch vom letzten Besuch.',
    'Gibt es hiervon auch etwas Neues?', 'Die Farben wirken ein bisschen von gestern.',
    'Das Schild wurde schon dreimal reduziert.', 'Auf frische Ware hoffe ich nächste Woche.',
    'Das lag doch schon im letzten Schlussverkauf.', 'Die Auswahl könnte moderner sein.',
    'Hier stehen immer noch die alten Modelle.', 'Vielleicht kommt bald eine neue Lieferung.'
  ],
  fehlmengen: [
    'Meine Größe ist wieder nicht da.', 'Schon wieder nur die letzten zwei Stück.',
    'Kommt meine Größe noch einmal rein?', 'Das Regal ist schon wieder leer.',
    'Das beliebte Modell fehlt seit Wochen.', 'Leider ist die Farbe ausverkauft.',
    'Ich hätte gern mehr Auswahl.', 'Schade, der Artikel ist nicht lieferbar.',
    'Warum fehlt ausgerechnet die mittlere Größe?', 'Dann muss ich später noch einmal vorbeischauen.'
  ],
  personal: [
    'Hier ist ja nie jemand.', 'Wo finde ich eine Beratung?',
    'An der Kasse dauert es heute länger.', 'Ich suche schon seit Minuten jemanden.',
    'Die Mitarbeiter haben alle Hände voll zu tun.', 'Ist diese Kasse geöffnet?',
    'Ich hätte gern eine zweite Meinung.', 'Wer kann mir bei der Auswahl helfen?',
    'Die Beratung ist heute sehr knapp besetzt.', 'Ich warte kurz auf eine Verkäuferin.'
  ],
  gut: [
    'Endlich mal wieder schöne Sachen.', 'Hier finde ich fast immer etwas Passendes.',
    'Die neue Auswahl gefällt mir.', 'Das ist wirklich schön präsentiert.',
    'Heute macht das Stöbern Spaß.', 'Die Beratung war sehr hilfreich.',
    'Alles ist gut sortiert.', 'Hier komme ich gern wieder her.',
    'Das neue Sortiment ist gelungen.', 'Die Auswahl überrascht mich positiv.'
  ]
});
export const HAUSBESUCH_SAETZE = PHRASE;
const hash = (str) => { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const begrenze = (x, a, b) => Math.min(b, Math.max(a, x));
const etageName = (e) => e < 0 ? 'UG' : e === 0 ? 'EG' : e + '. OG';

export function hausbesuchLage(k = {}, personalquote = 1) {
  if ((k.altwarenanteil ?? 0) >= 0.22) return 'altware';
  if ((k.nosVerfuegbarkeit ?? 1) < 0.88 || (k.entgangenerUmsatz ?? 0) > Math.max(1000, (k.umsatz ?? 0) * 0.04)) return 'fehlmengen';
  if (personalquote < 0.84) return 'personal';
  return 'gut';
}
export function hausbesuchSpruch(woche, abteilung, lage, person = 0) {
  const saetze = PHRASE[PHRASE[lage] ? lage : 'gut'];
  return saetze[hash(String(woche) + ':' + abteilung + ':' + person) % saetze.length];
}
export function hausbesuchBesatz(haus, etageNr) {
  const fl = (haus.flaechen ?? []).filter((f) => f.etage === etageNr && f.konzept !== 'leer');
  const qm = fl.reduce((n, f) => n + f.qm, 0);
  const gesamt = Math.max(1, (haus.flaechen ?? []).filter((f) => f.konzept !== 'leer').reduce((n, f) => n + f.qm, 0));
  const k = haus.kpi ?? {};
  const ist = Math.max(0, k.fteIst ?? ((haus.personal?.vollzeit ?? 0) + (haus.personal?.teilzeit ?? 0) + (haus.personal?.aushilfen ?? 0)));
  const fte = haus.format === 'outlet' ? Math.round(qm / 140) : ist * qm / gesamt;
  const umsatz = Math.max(0, Object.entries(k.umsatzJeGruppe ?? {}).reduce((n, [g, u]) => n + u * (fl.some((f) => f.gruppe === g) ? 1 : 0), 0));
  // Q35: Figuren = gleichzeitig im Dienst. Eine Vollzeitkraft (40 Std.) deckt bei 60 Öffnungsstunden
  // zwei Drittel der Woche; abzüglich Krank/Urlaub (rund 10 %) stehen Verkauf und Kasse (71 % der Stunden) auf der Fläche.
  const imDienst = haus.format === 'outlet' ? qm / 300 : fte * (40 / 60) * 0.9 * 0.71;
  return {
    kunden: fl.length ? begrenze(Math.round(2 + umsatz / 18000 + qm / 240), 2, 36) : 0,
    verkauf: fl.length ? begrenze(Math.round(imDienst), haus.format === 'outlet' ? 1 : 0, 12) : 0,
    imDienst: fl.length ? Math.max(haus.format === 'outlet' ? 1 : 0, Math.round(imDienst)) : 0,
    fte: Math.round(fte * 10) / 10,
    personalquote: (k.fteBedarf ?? 0) > 0 ? ist / k.fteBedarf : 1
  };
}

export function zonenNormalisieren(zonen, haus) {
  return (zonen ?? []).map((z, i) => {
    const f = z.flaeche ?? haus.flaechen.find((f) => f.id === z.id || f.gruppe === z.id) ?? z;
    const punkte = z.zellen?.map((c) => ({ x: (c.i + 0.5) * 5, z: (c.j + 0.5) * 5 })) ??
      (Number.isFinite(z.x) ? [{ x: z.x + z.w / 2, z: z.z + z.d / 2 }] : []);
    return { id: f.id ?? z.id ?? String(i), gruppe: f.gruppe ?? z.gruppe ?? z.art, name: f.name ?? z.name, punkte };
  }).filter((z) => z.punkte.length);
}

function stilEinbauen(wurzel) {
  const css = document.createElement('style');
  css.textContent = [
    '.hb{position:fixed;inset:0;z-index:30;background:#2a2521;color:#f3eee8;display:flex;flex-direction:column;font-family:system-ui,sans-serif;}',
    // Q32: Kopf wie das dunkle Blatt (Symbol links, Name mittig, Schließen rechts); der Hausname steht nur einmal, im Auswahlfeld.
    '.hb[hidden]{display:none!important}.hb header{display:grid;grid-template-columns:44px minmax(0,1fr) 44px;column-gap:8px;align-items:center;padding:calc(8px + env(safe-area-inset-top)) 8px 8px;background:#1d1916;border-bottom:1px solid #4a423b;z-index:2;text-align:center;}',
    '.hb header .hb-symbol{width:36px;height:36px;justify-self:center;background:center/contain no-repeat url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 36 36%27%3E%3Cpath d=%27M18 5 31 12v14l-13 7L5 26V12z%27 fill=%27%23b9b0a6%27/%3E%3Cpath d=%27M5 12l13 7v14L5 26z%27 fill=%27%23e9e3dc%27/%3E%3Cpath d=%27M18 19l13-7v14l-13 7z%27 fill=%27%23948a80%27/%3E%3Cpath d=%27M5 15.5l13 7 13-7v2.4l-13 7-13-7z%27 fill=%27%23d23c32%27/%3E%3C/svg%3E")}',
    '.hb header .hb-mitte{min-width:0}.hb header strong{display:block;font-size:12px;line-height:16px;font-weight:400;color:#a89e93;letter-spacing:.06em;text-transform:uppercase}.hb small{display:block;color:#a89e93;font-size:12px;line-height:16px}',
    '.hb select{display:block;width:100%;max-width:280px;margin:2px auto;min-height:44px;background:#352f2a;color:#f3eee8;border:1px solid #4a423b;border-radius:10px;padding:0 10px;font-size:16px;font-weight:700;text-align:center;text-align-last:center}',
    '.hb button{font:inherit;cursor:pointer;min-height:44px;border:1px solid #4a423b;border-radius:10px;background:#352f2a;color:#f3eee8;padding:7px 12px;}.hb header .hb-zu{width:44px;height:44px;padding:0;border:0;border-radius:22px;background:transparent;font-size:24px;line-height:1}',
    '.hb .hb-bild{flex:1;position:relative;min-height:0;touch-action:none;}.hb canvas{width:100%;height:100%;display:block;touch-action:none;}',
    '.hb .hb-etagen{position:absolute;right:8px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column-reverse;gap:7px;z-index:2;}',
    '.hb .hb-etagen button{min-width:52px;box-shadow:0 2px 6px #0006}.hb .hb-etagen button[aria-pressed=true]{background:var(--hk-akzent);border-color:var(--hk-akzent-rand);color:#fff;box-shadow:inset 0 0 0 1px var(--hk-akzent-hell);}',
    '.hb .hb-blase{position:absolute;left:12px;right:71px;bottom:17px;z-index:3;background:#352f2a;color:#f3eee8;border:1px solid #4a423b;border-radius:12px;padding:13px 14px;box-shadow:0 2px 6px #0007;font-size:14px;line-height:1.4;max-width:400px;}',
    '.hb .hb-blase[hidden]{display:none}.hb .hb-blase b{display:block;margin-bottom:3px}.hb .hb-blase p{margin:4px 0}.hb .hb-blase svg{width:64px;height:64px;float:left;margin-right:10px;}',
    '.hb footer{display:flex;justify-content:space-between;align-items:center;gap:9px;padding:9px 13px calc(9px + env(safe-area-inset-bottom));background:#1d1916;border-top:1px solid #4a423b;font-size:12px;}',
    '.hb .hb-info{background:var(--hk-akzent);border-color:var(--hk-akzent-rand);color:#fff;box-shadow:inset 0 0 0 1px var(--hk-akzent-hell)}.hb .hb-hinweis{color:#a89e93;max-width:230px}.hb .hb-fehler{padding:20px;text-align:center;}'
  ].join('');
  wurzel.append(css);
}

export function hausbesuchModul(ctx) {
  let aktiv = HAUSBESUCH_AKTIV, haus = null, nr = 0, host, bild, canvas, renderer, scene, cam, buehne;
  let figuren = [], personenMesh = [], treffer = [], animation = 0, fahrt = null, rahmenzeiten = [], letzte = 0;
  let navigation = null, besuchZonen = [], besuchSeed = '';
  let K = { x: 0, z: 0, halb: 40, min: 8, max: 100 };
  let steuerung, kalender = null;
  const status = () => ({ offen: !!haus, haus: haus?.id, etage: nr, figuren: figuren.length, kunden: figuren.filter((f) => !f.personal).length, personal: figuren.filter((f) => f.personal).length });
  const messung = () => {
    const a = rahmenzeiten.slice(-90).filter((n) => n > 0);
    const ms = a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
    return { ...status(), frames: a.length, fps: ms ? Math.round(1000 / ms) : null, durchschnittMs: Math.round(ms * 10) / 10, renderer: renderer ? { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles } : null };
  };
  const sicher = (s) => esc(String(s ?? ''));

  function anlegen() {
    if (host) return;
    host = document.createElement('div'); host.className = 'hb'; host.hidden = true;
    host.setAttribute('role', 'dialog'); host.setAttribute('aria-modal', 'true'); host.setAttribute('aria-label', 'Hausbesuch');
    stilEinbauen(host);
    host.insertAdjacentHTML('beforeend', '<header><span class="hb-symbol" aria-hidden="true"></span><div class="hb-mitte"><strong class="hb-titel">Hausbesuch</strong><select class="hb-hauswahl" aria-label="Filiale auswählen"></select><small class="hb-unter"></small></div><button type="button" class="hb-zu" data-hb="zu" aria-label="Schließen">×</button></header>' +
      '<div class="hb-bild"><canvas aria-label="Interaktiver Etagenrundgang"></canvas><nav class="hb-etagen" aria-label="Etagen"></nav><div class="hb-blase" aria-live="polite" hidden></div></div>' +
      '<footer><button type="button" class="hb-info" data-hb="leitung">Filialleitung</button><span class="hb-hinweis">Wischen: bewegen · Zwei Finger: zoomen · Tippen: sprechen oder einkaufen</span></footer>');
    document.body.append(host);
    bild = host.querySelector('.hb-bild'); canvas = host.querySelector('canvas');
    host.querySelector('.hb-hauswahl').addEventListener('change', (e) => oeffne(e.target.value));
    host.addEventListener('click', (e) => {
      const action = e.target.closest('[data-hb]');
      if (action?.dataset.hb === 'zu') return schliesse();
      if (action?.dataset.hb === 'leitung') return leitung();
      if (action?.dataset.hb === 'etage') return etageWaehlen(Number(action.dataset.nr));
      if (action?.dataset.hb === 'einkauf') {
        const wg = action.dataset.wg;
        schliesse(); ctx.oeffneEinkauf('wg', wg);
      }
    });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && haus) schliesse(); });
    window.addEventListener('resize', () => { if (haus) kameraSetzen(); });
    steuerung = karteSteuerung({
      canvas, K, setzen: kameraSetzen,
      aufBoden: (px, py) => {
        if (!cam) return null;
        const r = canvas.getBoundingClientRect();
        const ray = new THREE.Raycaster();
        ray.setFromCamera(new THREE.Vector2(((px - r.left) / r.width) * 2 - 1, 1 - ((py - r.top) / r.height) * 2), cam);
        return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
      },
      tippen: antippen
    });
  }
  function kameraSetzen() {
    if (!haus || !renderer || !scene) return;
    const w = Math.max(1, bild.clientWidth), h = Math.max(1, bild.clientHeight);
    K.halb = begrenze(K.halb, K.min, K.max);
    K.x = begrenze(K.x, 0, buehne?.breite ?? 100); K.z = begrenze(K.z, 0, buehne?.tiefe ?? 100);
    renderer.setSize(w, h, false);
    cam = isoKamera(w, h, K.halb, new THREE.Vector3(K.x, 0, K.z));
    cam.updateMatrixWorld();
  }
  function sceneLeeren() {
    if (!scene) return;
    scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    scene.userData.sonne?.shadow?.map?.dispose();
    renderer?.renderLists?.dispose();
    scene = null; buehne = null; figuren = []; personenMesh = []; treffer = [];
    navigation = null; besuchZonen = [];
  }
  function instanz(anz, farbe, geo, farben = null) {
    const m = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: farben ? '#ffffff' : farbe }), Math.max(1, anz));
    m.count = anz; m.frustumCulled = false;
    if (farben) for (let i = 0; i < anz; i++) m.setColorAt(i, new THREE.Color(farben[i]));
    scene.add(m); personenMesh.push(m); return m;
  }
  // Q36: maßstabsgerechte Figuren (1,75 m, Kopf 24 cm) statt Kugelköpfen auf Kisten.
  // Je Gruppe vier Teile: Beine, Rumpf, Kopf, Haare. Kundschaft mit eigener Kleidung, Personal einheitlich.
  const FIGUR_TEILE = [['beine', 0.42], ['rumpf', 1.14], ['kopf', 1.59], ['haare', 1.63]];
  const HAUT = ['#f1d3b8', '#ecc8a8', '#e3b994', '#f3dcc6', '#d9ab86', '#c99474'];
  const HAAR = ['#e3cc8f', '#c9b07a', '#a8875a', '#6b4a32', '#4a3426', '#9a958d', '#2e2622'];
  const OBEN = ['#6f8fae', '#b9534a', '#e8e2d6', '#3f5f4f', '#d8a34a', '#7b6a8f', '#2f3a48', '#c97f6b', '#8fa38a'];
  const UNTEN = ['#2f3a48', '#3d4652', '#5b5048', '#2a2d31', '#6a7680', '#7a6a58'];
  function menschen(zn, besatz) {
    besuchZonen = zn;
    besuchSeed = haus.id + ':besuch:' + nr + ':' + ctx.s().woche;
    figuren = erstelleBesucher(navigation, zn, besatz, besuchSeed);
    const geo = {
      beine: new THREE.BoxGeometry(0.3, 0.84, 0.2),
      rumpf: new THREE.BoxGeometry(0.44, 0.62, 0.25),
      kopf: new THREE.SphereGeometry(0.115, 8, 6).scale(1, 1.15, 1),
      haare: new THREE.SphereGeometry(0.122, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2),
    };
    for (const p of [false, true]) {
      const liste = figuren.filter((f) => f.personal === p), n = liste.length;
      const wahl = (pal, k) => liste.map((_, i) => pal[(i * 7 + k * 3 + (i >> 2)) % pal.length]);
      instanz(n, null, geo.beine, p ? liste.map(() => '#2a2d31') : wahl(UNTEN, 1));
      instanz(n, null, geo.rumpf, p ? liste.map(() => '#235a79') : wahl(OBEN, 2));
      instanz(n, null, geo.kopf, wahl(HAUT, 3));
      instanz(n, null, geo.haare, wahl(HAAR, 4));
    }
  }
  function menschenSetzen() {
    const obj = new THREE.Object3D();
    for (const personal of [false, true]) {
      const liste = figuren.filter((p) => p.personal === personal);
      const ms = personal ? personenMesh.slice(4, 8) : personenMesh.slice(0, 4);
      liste.forEach((p, i) => {
        obj.rotation.set(0, p.richtung, 0);
        FIGUR_TEILE.forEach(([, y], k) => { obj.position.set(p.x, y, p.z); obj.updateMatrix(); ms[k].setMatrixAt(i, obj.matrix); });
      });
      for (const m of ms) m.instanceMatrix.needsUpdate = true;
    }
  }
  function bauen(etageNr, delta = 0) {
    const s = ctx.s(); const frisch = s.haeuser.find((h) => h.id === haus.id);
    buehne = null;
    if (frisch) haus = frisch;
    sceneLeeren();
    scene = neueSzene('#26313a');
    const S = new Sammler();
    if (haus.format === 'outlet') {
      const m = masseOutlet(haus), flaechen = haus.flaechen.filter((f) => f.etage === etageNr && f.qm >= 10);
      if (flaechen.length) {
        const plan = ladenplan({ breite: m.bw, tiefe: m.bd }, 'outlet', flaechen, haus.id + ':' + etageNr);
        S.quader(0, -0.3, 0, m.bw, 0, m.bd, '#e7e6e1');
        baueLadenplan(S, scene, plan, { dichte: 0.42 });
        buehne = { box: new THREE.Box3(new THREE.Vector3(-0.5, -0.5, -0.5), new THREE.Vector3(m.bw + 0.5, 4.6, m.bd + 0.5)), breite: m.bw, tiefe: m.bd, zonen: plan.abteilungen, ladenplan: plan, anzahl: S.anzahl };
      }
    }
    if (!buehne) {
      const grafikHaus = { ...haus, flaechen: haus.flaechen };
      buehne = etage(S, scene, grafikHaus, etageNr, { kunden: 0, dichte: 0.42, budget: 14500 });
    }
    S.bauen(scene);
    const bbox = buehne.box;
    sonneAuf(scene, bbox.getCenter(new THREE.Vector3()), Math.max(30, bbox.getSize(new THREE.Vector3()).length()));
    const zn = zonenNormalisieren(buehne.zonen, haus);
    const besatz = hausbesuchBesatz(haus, etageNr);
    navigation = navigationsRaster(buehne);
    menschen(zn, besatz);
    treffer = zn;
    K.x = buehne.breite / 2; K.z = buehne.tiefe / 2;
    K.max = Math.max(20, Math.max(buehne.breite, buehne.tiefe) * 1.25);
    K.min = 7; K.halb = Math.min(K.max, Math.max(16, Math.max(buehne.breite, buehne.tiefe) * 0.8));
    host.querySelector('.hb-unter').textContent = etageName(etageNr) + ' · ' + besatz.kunden + ' Kunden · ' + besatz.imDienst + ' im Dienst' + (besatz.imDienst > besatz.verkauf ? ' (' + besatz.verkauf + ' im Bild)' : '') + (haus.format === 'outlet' ? ' · Modellbetrieb' : ' von ' + Number(besatz.fte).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' FTE');
    host.querySelector('.hb-blase').hidden = true;
    host.querySelectorAll('[data-hb=etage]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.nr) === etageNr)));
    fahrt = delta ? { seit: performance.now(), start: delta > 0 ? -8 : 8, dauer: 300 } : null;
    kameraSetzen();
  }
  function frame(t) {
    if (!haus || !scene) return;
    animation = requestAnimationFrame(frame);
    if (letzte) {
      const dt = Math.min(0.25, Math.max(0, (t - letzte) / 1000));
      rahmenzeiten.push(Math.min(1000, t - letzte));
      // Meter pro Sekunde statt Weganteil pro Frame; keine Strecken durch Regale.
      bewegeBesucher(navigation, figuren, dt, besuchZonen);
    }
    if (rahmenzeiten.length > 120) rahmenzeiten.shift();
    letzte = t;
    if (fahrt) {
      const k = begrenze((t - fahrt.seit) / fahrt.dauer, 0, 1);
      scene.position.y = fahrt.start * (1 - k) * (1 - k);
      if (k === 1) { scene.position.y = 0; fahrt = null; }
    }
    menschenSetzen();
    renderer.render(scene, cam);
  }
  function sprechblase(titel, inhalt, zusatz = '') {
    const b = host.querySelector('.hb-blase');
    b.innerHTML = '<b>' + sicher(titel) + '</b><p>' + sicher(inhalt) + '</p>' + zusatz;
    b.hidden = false;
  }
  function abteilungSprechen(z, person) {
    const s = ctx.s(), daten = ctx.E.einkaufUebersicht(s).bereiche.find((b) => b.bereich === z.gruppe);
    const k = daten?.kennzahlen ?? {}, besatz = hausbesuchBesatz(haus, nr);
    const lage = haus.format === 'outlet' ? 'gut' : hausbesuchLage(k, besatz.personalquote);
    sprechblase(person?.personal ? 'Verkauf' : 'Kundschaft', hausbesuchSpruch(s.woche, z.gruppe ?? z.id, lage, person?.index ?? 0),
      haus.format !== 'outlet' && daten?.wgs?.length ? '<button type="button" data-hb="einkauf" data-wg="' + sicher(daten.wgs[0].id) + '">Zum Einkauf: ' + sicher(daten.wgs[0].name) + ' →</button>' : '');
  }
  function antippen(e) {
    if (!haus || !cam) return;
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    let nah = null, dist = 26;
    for (const p of figuren) {
      const v = new THREE.Vector3(p.x, 1.1, p.z).project(cam);
      const px = (v.x + 1) / 2 * r.width, py = (1 - v.y) / 2 * r.height;
      const d = Math.hypot(px - x, py - y);
      if (d < dist) { nah = p; dist = d; }
    }
    if (nah) return abteilungSprechen(nah.zoneJetzt ?? nah.zone, nah);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(x / r.width * 2 - 1, 1 - y / r.height * 2), cam);
    const p = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
    if (!p) return;
    const z = treffer.find((q) => q.punkte.some((v) => Math.hypot(v.x - p.x, v.z - p.z) < 4.2));
    if (z) {
      const bereich = ctx.E.einkaufUebersicht(ctx.s()).bereiche.find((b) => b.bereich === z.gruppe);
      if (haus.format !== 'outlet' && bereich?.wgs?.length) {
        const wg = bereich.wgs.find((g) => g.id.endsWith('.' + z.id)) ?? bereich.wgs[0];
        schliesse(); ctx.oeffneEinkauf('wg', wg.id); return;
      }
      return abteilungSprechen(z, null);
    }
    if (Math.hypot(p.x - buehne.breite / 2, p.z - buehne.tiefe / 2) < 6) leitung();
    else host.querySelector('.hb-blase').hidden = true;
  }
  function leitung() {
    if (!haus) return;
    const s = ctx.s(), k = haus.kpi ?? {}, chef = haus.personal?.filialleiter;
    const name = chef?.name ?? 'Filialleitung';
    const quotient = (k.fteBedarf ?? 0) > 0 ? (k.fteIst ?? 0) / k.fteBedarf : 1;
    const q = k.db ?? 0;
    const saetze = haus.format === 'outlet' ? [
      'FUNDUS wird hier als eigenständiger grafischer Standort gezeigt.',
      'Dafür liegen noch keine Kennzahlen der Wirtschafts-Engine vor.',
      'Die Filialleitung ist deshalb eine Modellfigur.'
    ] : [
      q < 0 ? 'Unser Haus liegt beim Deckungsbeitrag unter Plan.' : 'Der Deckungsbeitrag ist derzeit positiv.',
      quotient < 0.9 ? 'Uns fehlen in dieser Woche Kräfte auf der Fläche.' : 'Unsere Personalbesetzung ist weitgehend gesichert.',
      (haus.substanz ?? 100) < 45 ? 'Wir müssen dringend in die Substanz investieren.' : (chef?.moral ?? 50) < 40 ? 'Die Stimmung im Team verlangt Aufmerksamkeit.' : 'Das Team hält den Betrieb stabil.'
    ];
    const merkmale = personMerkmale(name, 'filialleitung:' + haus.id);
    sprechblase(name, saetze.join(' '), portraetSVG(merkmale, 96, { hintergrund: '#1d1916' }));
  }
  function etageWaehlen(n) {
    if (!haus || !haus.etagen.includes(n) || nr === n) return;
    const delta = n - nr; nr = n; bauen(n, delta);
  }
  function oeffne(id) {
    if (!aktiv) return false;
    const s = ctx.s(); if (!s) return false;
    const h = s.haeuser.find((q) => q.id === id) ?? fundusHaeuser.find((q) => q.id === id && q.stadt === ctx.stadtName());
    if (!h || !h.etagen.length || h.status === 'verkauft') return false;
    if (haus) schliesse();
    anlegen(); haus = h;
    const angebot = h.etagen.includes(0) ? 0 : h.etagen[0]; nr = angebot;
    host.querySelector('.hb-titel').textContent = 'Hausbesuch';
    const kandidaten = [...s.haeuser.filter((q) => q.stadt === ctx.stadtName() && q.status !== 'verkauft'), ...fundusHaeuser.filter((q) => q.stadt === ctx.stadtName())];
    host.querySelector('.hb-hauswahl').innerHTML = kandidaten.map((q) => '<option value="' + sicher(q.id) + '"' + (q.id === h.id ? ' selected' : '') + '>' + sicher(q.name) + '</option>').join('');
    host.querySelector('.hb-etagen').innerHTML = [...h.etagen].sort((a, b) => a - b).map((n) =>
      '<button type="button" data-hb="etage" data-nr="' + n + '" aria-pressed="' + (n === nr) + '">' + etageName(n) + '</button>').join('');
    host.hidden = false;
    // Ein Renderer für die ganze Sitzung: Nach forceContextLoss() bekäme dieselbe Canvas keinen
    // neuen Kontext mehr, ein zweiter Hausbesuch oder ein Hauswechsel scheiterte dann.
    if (!renderer) {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.3));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.shadowMap.enabled = false;
    }
    rahmenzeiten = []; letzte = 0;
    try { bauen(nr); animation = requestAnimationFrame(frame); }
    catch (e) { console.error('Hausbesuch konnte nicht aufgebaut werden:', e); schliesse(); return false; }
    return true;
  }
  function schliesse() {
    if (!haus) return;
    cancelAnimationFrame(animation); animation = 0; steuerung?.stopp(); 
    sceneLeeren(); renderer?.renderLists?.dispose(); cam = null;
    haus = null; letzte = 0; if (host) host.hidden = true;
  }
  document.getElementById('pinhalt')?.addEventListener('click', (e) => { const t = e.target.closest('[data-hausbesuch]'); if (t) oeffne(t.dataset.hausbesuch); });
  document.getElementById('hausbesuch')?.addEventListener('click', () => { ctx.menueZu(); const id = ctx.erstHaus(); if (id) oeffne(id); });
  // Abnahme auf derselben Etagenbelegung ohne Zeitraffereffekt im laufenden Spiel.
  const pruefung = (sekunden = 60, schritt = 0.05) => {
    if (!haus || !navigation) throw new Error('Für die Laufwegprüfung zuerst einen Hausbesuch öffnen.');
    return { haus: haus.id, etage: nr, ...simuliereLaufwege(navigation, besuchZonen,
      hausbesuchBesatz(haus, nr), besuchSeed, sekunden, schritt) };
  };
  // Bildfolgen-Katalog: gezielt simulierte Sekunden ohne Screenshot-Abhängigkeit im Spiel.
  const bildschritt = (sekunden = 5) => {
    if (!haus || !navigation) throw new Error('Hausbesuch ist nicht geöffnet.');
    bewegeBesucher(navigation, figuren, Math.max(0, sekunden), besuchZonen);
    menschenSetzen();
    renderer.render(scene, cam);
  };
  return { oeffne, schliesse, etage: etageWaehlen, status, messung, pruefung, bildschritt, get aktiv() { return aktiv; },
    kamera: (o) => { Object.assign(K, o); kameraSetzen(); }, // Prüfbilder (Q36)
    setzenAktiv: (an) => { aktiv = !!an; if (!aktiv) schliesse(); } };
}
