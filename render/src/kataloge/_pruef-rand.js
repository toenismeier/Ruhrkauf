import { THREE, kameraFuer, KompaktSammler, setzeLod, entferneKleineSchilder } from '../kit/basis.js';
import { stadtplan, baueStadt, setzeMarker, ARCHETYPEN } from '../kit/stadt.js';
import { stadtDaten } from '../kit/staedte.js';
import { echterBauer } from '../kit/bauer.js';
import { stadtRahmen, sichtFilter, ausschnittBauer, schneideAus } from './_standorte-staedte.js';
import { zeigeKatalog } from '../kit/katalog.js';
import '../kit/archetypen/index.js';
const ROLLE = { warenhaus: 'W', sport: 'S', wettbewerber: 'K' };
function randEintrag(name, ansicht = 'stadt', zoom = 62, zustand = null, zusatzTitel = '', o = {}) {
  const s = stadtDaten(name);
  return {
    titel: `${s.name} · ${ARCHETYPEN[s.archetyp].name}${ansicht === 'stadt' ? '' : ansicht === 'center' ? ' · Center' : ' · Einkaufslage'}${zusatzTitel}`, unter: '',
    bau(S, scene) {
      const t0 = performance.now();
      const plan = stadtplan(s.seed, { typ: s.typ, archetyp: s.archetyp, region: s.region, strassenFaktor: 1.6, ...s.extra, standorte: s.standorte });
      const t1 = performance.now();
      let box = null;
      if (ansicht === 'stadt') box = stadtRahmen(plan);
      else {
        let m;
        if (ansicht === 'center') {
          const st = plan.standorte.find((p) => p.lage === 'center') ?? plan.standorte.find((p) => p.lage === 'rand');
          const b = st && plan.bloecke.find((q) => q.id === st.block);
          m = b ? new THREE.Vector3(b.x + b.w / 2, 0, b.z + b.d / 2) : new THREE.Vector3(plan.breite / 2, 0, plan.tiefe / 2);
        } else if (o.punkt) {
          // Stichprobe: relative Position in der Karte (0..1), z. B. für Prüfungen außerhalb des Zentrums
          m = new THREE.Vector3(plan.breite * o.punkt[0], 0, plan.tiefe * o.punkt[1]);
        } else {
          const L = plan.einkaufslage;
          m = new THREE.Vector3(L.xF - 8, 0, L.zF - 8);
        }
        // GESTALTUNG.md: nie Kartenrand im Bild. Ausschnitt in die Karte schieben (Rand der Iso-Raute mit Reserve)
        // Zoom an die Stadtgröße anpassen: kleine Städte füllen sonst das Bild nur zur Hälfte
        zoom = Math.min(zoom, Math.min(plan.breite, plan.tiefe) / 6.5);
        const res = zoom * 3.0;   // sichtbare Halbbreite des Iso-Ausschnitts (Hochformat zeigt diagonal mehr)
        // Prüfung: keine Klemmung, Kamera wie im Spiel bei freiem Verschieben an den Kartenrand
        box = new THREE.Box3(new THREE.Vector3(m.x - zoom, 0, m.z - zoom), new THREE.Vector3(m.x + zoom, 25, m.z + zoom));
      }
      const roh = echterBauer(zustand ? { zustand } : {});
      const bauer = ansicht === 'stadt' ? roh : ausschnittBauer(plan, roh, box, o);
      // Ganze Stadt: Detailstufe 'fern' (KIT.md) und sparsamer Sammler, sonst volle Details
      const ganz = ansicht === 'stadt', T = ganz ? new KompaktSammler() : S;
      if (ganz && o.statistik) T.statistik = new Map();
      setzeLod(ganz ? (o.lod ?? 'fern') : (o.lod ?? 'nah'));
      let e;
      try {
        e = baueStadt(T, scene, plan, bauer);
        if (ganz) { if (T.statistik) this.statistik = [...T.statistik].sort((a, b) => b[1][1] - a[1][1]); T.bauen(scene); S.anzahl = T.anzahl; this.verworfen = T.verworfen; entferneKleineSchilder(scene); }
      } finally { setzeLod('nah'); }
      if (!ganz) schneideAus(S, scene, sichtFilter(box, o));
      if (ganz) box = stadtRahmen(plan, { hoehen: e.hoehen });
      const gr = ansicht === 'stadt' ? Math.max(24, plan.breite / 15) : 11;
      setzeMarker(scene, plan, e, 'standorte', { markerGroesse: gr, leerstand: ansicht !== 'stadt' });
      const zaehl = plan.standorte.map((p) => ROLLE[p.rolle] + p.lage).join(' ');
      const st = bauer.statistik?.();
      this.unter = `${s.typ} · ${s.region} · ${Math.round(plan.breite)}×${Math.round(plan.tiefe)} m · ${zaehl} · Plan ${Math.round(t1 - t0)} ms, gesamt ${Math.round(performance.now() - t0)} ms${st ? ` · ${st.gebaut}/${st.gesamt} Parzellen` : ''}`;
      return box;
    },
  };
}

const eintraege = [randEintrag('Hamburg', 'einkauf', 62, null, ' · Rand ungeklemmt [0.5, 0.97]', { punkt: [0.5, 0.97] }),
randEintrag('Görlitz', 'einkauf', 62, null, ' · Rand ungeklemmt [0.05, 0.5]', { punkt: [0.05, 0.5] }),
randEintrag('Essen', 'einkauf', 62, null, ' · Rand ungeklemmt [0.95, 0.5]', { punkt: [0.95, 0.5] }),
randEintrag('Kassel', 'einkauf', 62, null, ' · Rand ungeklemmt [0.5, 0.05]', { punkt: [0.5, 0.05] }),
randEintrag('Ulm', 'einkauf', 62, null, ' · Rand ungeklemmt [0.03, 0.97]', { punkt: [0.03, 0.97] }),
randEintrag('Lüneburg', 'einkauf', 62, null, ' · Rand ungeklemmt [0.97, 0.03]', { punkt: [0.97, 0.03] }),
randEintrag('Chemnitz', 'einkauf', 62, null, ' · Rand ungeklemmt [0.5, 0.97]', { punkt: [0.5, 0.97] }),
randEintrag('Regensburg', 'einkauf', 62, null, ' · Rand ungeklemmt [0.97, 0.5]', { punkt: [0.97, 0.5] })];
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Prüfung Kartenrand (freies Verschieben)', spalten: 4, kachel: [720, 1280] }), 20));
