// FUNDUS – eigenständige Off-Price-Marke, nicht Hartwig Outlet.
// Drei Bauformen; der Ladenbau-Workstream ersetzt später den bewusst einfachen Innenraum.
import { THREE, rng, waehle, zw, LOD } from './basis.js';
import { Seite, seitenVon, plakat, passend, parkreihe, mensch, puppe, clamp, technik, KLEID } from './sporthelfer.js';
import { zustandNormal, zustandFlags, zustandsDekor, merke } from './zustaende.js';
import { lokal as innenLokal, vorbereiten as innenVorbereiten } from './innen.js';
import { ladenplan, baueLadenplan } from './ladenplan.js';
import { outletLadenEingabe, outletGeschossHoehe, fundusInnenZustand } from './ladenbau-outlet.js';
import { moebel } from './moebel/index.js';

export const NAME_OUTLET = 'FUNDUS';
export const FARBE_OUTLET = '#8c1d40';
export const FAMILIEN_OUTLET = { 1: 'Retail-Park-Box', 2: 'Zweigeschossiger Fachmarkt', 3: 'Innenstadt-Geschäftshaus' };
const HELL = '#f2f0eb', WAND = '#d7d9da', GLAS = '#cfe8f1', FUGE = '#c1c5c5';
const WAREN = ['#263b53', '#c67e73', '#e0c7a3', '#748d74', '#d8dce0', '#b88b56', '#a7a0ba'];

export function familieOutlet(haus) {
  if (haus.lage === 'b') return 3;
  return Number.parseInt(String(haus.id).replace(/\D/g, ''), 10) % 2 ? 1 : 2;
}

export function masseOutlet(haus) {
  const familie = familieOutlet(haus);
  const variante = Number(haus.fassade ?? 0);
  const n = familie === 3 ? clamp((haus.etagen ?? [0, 1]).filter((e) => e >= 0).length, 2, 3) : familie === 2 ? 2 : 1;
  const buero = familie === 3 ? 1 + (variante % 2) : 0;
  const A = clamp(haus.grundflaecheQm ?? 1700, 650, 3100);
  const bw = Math.round(clamp(Math.sqrt(A * (1.4 + (variante % 3) * 0.11)), 26, 68) / 2) * 2;
  const bd = Math.round(clamp(A / bw, 19, 55) / 2) * 2;
  const park = familie === 3 ? 0 : 18 + (variante % 3) * 2;
  const H = familie === 1 ? 6.65 + (variante % 3) * 0.1
    : familie === 2 ? 10.35 + (variante % 3) * 0.18
    : 5 + (n - 1) * 3.9 + buero * 3.5;
  return { w: bw, d: bd + park, bw, bd, n, H, familie, park, buero, variante };
}

function text(scene, s, inhalt, u, y, t, breite, hoehe, farbe = '#ffffff', bg = null) {
  if (breite < 1) return;
  plakat(scene, s, inhalt, u, y, t, passend(inhalt, breite, hoehe), farbe, bg);
}
function marke(scene, s, H, bandUnterkante, zusatz = false) {
  // Durchgehende 3,5-m-Brüstung auf beiden sichtbaren Seiten, kein kleines Dachlogoschild.
  const y = bandUnterkante;
  s.q(0, s.L, y, y + 3.5, 0.45, 0.90, FARBE_OUTLET);
  s.q(0, s.L, y + 3.38, y + 3.55, 0.91, 1.05, '#64152d');
  // Weiße Versalien im Format einer echten Handelsfassade (2,4 m / 2,0 m City).
  const city = H > 11.5;
  text(scene, s, NAME_OUTLET, s.L / 2, y + 1.88, 1.10, s.L - 2.2, city ? 2.35 : 2.70);
  const claim = zusatz ? 'Neue Ware jede Woche' : 'Marken. Bis zu 60 % unter dem empfohlenen Preis.';
  s.q(0.3, s.L - 0.3, y - 1.14, y - 0.08, 0.48, 0.88, '#f3ede3');
  text(scene, s, claim, s.L / 2, y - 0.61, 1.07, s.L - 1.5, 0.69, FARBE_OUTLET);
  return { u0: 0, u1: s.L, y0: y - 1.16, y1: y + 3.56, art: 'logo' };
}

// Alle Verkaufsflächen stammen aus dem gemeinsamen Ladenplaner statt aus
// überlagernden Freihand-Reihen. Auch City- und zweigeschossige FUNDUS-Häuser
// werden geschossweise ausgestattet.
export function innenOutlet(S, scene, haus, opt = {}) {
  const m=masseOutlet(haus),x=opt.x??0,z=opt.z??0;
  const status=fundusInnenZustand(opt.innenZustand??opt.status);
  const bestueckung={normal:1,schwach:0.32,ansturm:0.82,raeumung:0.06}[status];
  const geschosse=opt.geschosse??Array.from({length:m.n},(_,i)=>i);
  const ergebnisse=[];
  innenVorbereiten(S,scene);
  for(const geschoss of geschosse) {
    const eing=outletLadenEingabe(haus,m,geschoss);
    const plan=ladenplan(eing.flaeche,'outlet',eing.abteilungen,
      String(haus.id)+'/fundus/'+geschoss);
    const y=outletGeschossHoehe(m,geschoss);
    if(geschoss>0)S.box(m.bw-0.6,0.19,m.bd-0.6,
      x+m.bw/2,y-0.14,z+m.bd/2,'#d5d8d7');
    const gebaut=baueLadenplan(S,scene,plan,{x,z,y,bestueckung,
      vorbereiten:false,dichte:opt.dichte??1});
    // Waren in Belegungslücken und die Kassenzeile bleiben planbasiert.
    // Temporäre Kundenschlangen blockieren bewusst im Zustand Ansturm den Gang.
    if(geschoss===0&&(status==='ansturm'||status==='raeumung')) {
      const r=rng(String(haus.id)+'/fundus/publikum/'+status);
      const g=plan.gaenge.find(g=>g.typ==='haupt');
      if(g)for(let i=0;i<(status==='ansturm'?12:3);i++) {
        const rz=Math.max(g.z+0.9,g.z+g.d-1.6-i*1.05);
        mensch(S,r,x+g.x+g.w/2+(i%2?0.4:-0.4),y+0.1,z+rz);
      }
      // Nachschub/Räumung: klar erkennbarer Rollwagen im Randbereich,
      // nicht als dauerhaftes Möbel im Kundenlauf eingeplant.
      const a=plan.moebel.find(q=>q.abteilung==='damen'&&q.id==='outlet_doppelstange');
      if(a) {
        const rw=moebel('outlet_rollwagen');
        rw.bau(innenLokal(S,x+a.x+a.w/2,y,z+a.z+a.d+0.28),
          rng(String(haus.id)+'/rollwagen'),1,{bestueckung});
      }
    }
    if(geschoss===0&&status==='raeumung') {
      const k=plan.moebel.find(q=>q.typ==='kasse');
      if(k) {
        S.box(Math.min(4.3,k.w),0.62,0.12,x+k.x+k.w/2,y+2.9,z+k.z+0.16,FARBE_OUTLET);
        const seite=new Seite(S,x+k.x,z+k.z,Math.min(4.3,k.w),0.2,'+z');
        text(scene,seite,'RÄUMUNG',Math.min(4.3,k.w)/2,y+3.15,0.25,
          Math.min(3.8,k.w-0.5),0.4);
      }
    }
    ergebnisse.push({geschoss,plan,teile:gebaut.teile,bestueckung});
  }
  return {hoehe:m.H,w:m.bw,d:m.bd,status,geschosse:ergebnisse};
}

function glasfront(S, scene, s, maxY, offen, r, oben = false, eingangU = 0.52) {
  // Nicht durch einen grauen Vollquader verdecken: Rahmen, Schaufenster und sichtbare Displays.
  const y0 = 0.48, y1 = Math.max(3.2, Math.min(maxY, oben ? 7.05 : 4.25));
  s.q(0.25, s.L - 0.25, 0.35, 0.60, 0.10, 0.27, '#bfc2c3');
  s.q(0.25, s.L - 0.25, y1 - 0.18, y1, 0.1, 0.30, '#e0e1dc');
  for (let u = 0.6; u < s.L; u += 3.3) {
    s.q(u, u + 0.12, y0, y1, 0.11, 0.28, '#a9b6bd');
    if (offen && u > 2 && u < s.L - 3 && Math.abs(u - s.L * 0.52) > 4.5) {
      // Dekorierte Schaufensterinsel: Mannequins, Taschen, Schuhe und Home.
      const farbe = waehle(r, WAREN);
      puppe(s, u + 1.05, 0.85, -0.42, farbe, waehle(r, KLEID), 1.12);
      s.q(u + 0.38, u + 2.5, 0.42, 0.62, -1.3, -0.9, '#dedacf');
      s.q(u + 0.45, u + 0.95, 1.18, 1.55, -1.35, -0.87, waehle(r, WAREN));
      s.q(u + 1.62, u + 2.13, 0.83, 1.13, -1.35, -0.87, waehle(r, WAREN));
      s.q(u + 1.58, u + 2.44, 1.85, 2.03, -1.35, -0.95, '#dedacf');
      s.q(u + 1.68, u + 2.32, 2.03, 2.53, -1.32, -0.98, waehle(r, WAREN));
    }
  }
  if (!offen) s.q(0.55, s.L - 0.55, y0, y1 - 0.2, -0.01, 0.09, '#93999a');
  const tuer = s.L * eingangU;
  s.q(tuer - 1.9, tuer + 1.9, 0.4, 3.1, 0.15, 0.31, '#b1d1dc');
  s.q(tuer - 0.07, tuer + 0.07, 0.4, 3.1, 0.32, 0.39, '#d6dde1');
  if (oben) {
    s.q(0.6, s.L - 0.6, 4.95, 7.75, 0.02, 0.12, '#91b9ca');
    for (let u = 0.7; u < s.L - 1; u += 3.4)
      s.q(u, u + 0.16, 4.95, 7.75, 0.15, 0.31, '#e1e3e3');
    s.q(0, s.L, 4.72, 4.98, 0.17, 0.36, '#e3e3de');
    // Lesbare aufsteigende Rolltreppe, nicht bloß horizontale Stufen im Glas.
    for (let i = 0; i < 12; i++) {
      const u = Math.min(s.L - 3, s.L * 0.30 + i * 0.51);
      s.q(u, u + 0.8, 1.1 + i * 0.45, 1.22 + i * 0.45, -1.7, -0.75, '#bdc5c8');
      s.q(u, u + 0.1, 1.1 + i * 0.45, 2.0 + i * 0.45, -0.8, -0.65, '#788994');
    }
  }
}

function pylon(S, scene, x, z) {
  S.box(0.34, 9.3, 0.34, x, 4.95, z, '#697178');
  S.box(8.2, 2.95, 0.85, x, 9.8, z, FARBE_OUTLET);
  const s = new Seite(S, x - 4.1, z - 0.43, 8.2, 0.86, '+z');
  text(scene, s, NAME_OUTLET, 4.1, 10.0, 0.60, 7.75, 1.76);
  s.q(0.2, 8, 7.85, 8.28, 0.4, 0.48, '#f3ede3');
}

export function outlet(S, scene, haus, opt = {}) {
  const start = S.anzahl, mark = merke(S, scene);
  const m = masseOutlet(haus), x = opt.x ?? 0, z = opt.z ?? 0;
  const r = rng(String(haus.id) + '/outlet/' + String(haus.fassade ?? 0));
  const Z = zustandNormal({ ...opt, status: opt.status ?? haus.status ?? 'offen', seed: haus.id });
  const F = zustandFlags(Z), H = m.H, { bw, bd } = m;
  const stadt = m.familie === 3, zweigeschossig = m.familie === 2;
  const paneele = ['#d9dbdd', '#c4cbd0', '#e2dfd8'];
  const farbe = stadt ? (m.variante % 2 ? '#c3bdb5' : '#cbd0ce') : paneele[m.variante % paneele.length];
  const egTop = 5, ladenTop = stadt ? 5 + (m.n - 1) * 3.9 : H;
  const bandY = stadt ? ladenTop - 3.5 : H - 3.5;
  const eingang = 0.38 + (m.variante % 4) * 0.075;
  const werbung = Z.hat('aktion') || Z.hat('offprice');
  const seiten = seitenVon(S, x, z, bw, bd), logos = [];
  // Tragende Rückseite und Schmalseite; der offene Erdgeschosskörper lässt Waren erkennen.
  S.quader(x, 0.30, z, x + bw, H, z + 0.38, farbe);
  S.quader(x, 0.30, z, x + 0.38, H, z + bd, farbe);
  S.quader(x, 0.28, z, x + bw, 0.46, z + bd, '#ece9e2');
  S.quader(x, H - 0.22, z, x + bw, H + 0.17, z + bd, '#c5c7c4');
  if (stadt) {
    // Ehemaliger Warenhaus-/Geschäftshauskörper: alte Büros mit Lochfassade über den Verkaufsflächen.
    S.quader(x + 0.1, ladenTop, z + bd - 0.42, x + bw, H, z + bd, farbe);
    S.quader(x + bw - 0.42, ladenTop, z + 0.1, x + bw, H, z + bd, farbe);
    for (const s of seiten) for (let et = 0; et < m.buero; et++) {
      const y0 = ladenTop + 0.78 + et * 3.5, y1 = Math.min(H - 0.45, y0 + 1.74);
      for (let u = 1.8; u < s.L - 1.5; u += 3.7) {
        s.q(u, u + 2.0, y0, y1, 0.24, 0.52, '#7d99a6');
        s.q(u + 0.90, u + 1.02, y0, y1, 0.53, 0.59, '#e8e5dc');
        s.q(u - 0.17, u + 2.17, y0 - 0.19, y0, 0.43, 0.62, '#d9d6ce');
      }
      s.q(0.35, s.L - 0.35, ladenTop + et * 3.5, ladenTop + et * 3.5 + 0.27, 0.53, 0.69, '#aca9a3');
    }
    if (m.variante % 2 === 0) { // umgenutzte Warenhausfront mit Lisenen
      for (const s of seiten) for (let u = 2.2; u < s.L - 1.8; u += 7.5)
        s.q(u, u + 0.54, ladenTop, H, 0.67, 0.91, '#b2b0ab');
    }
    // Eine Geschossfuge trennt den aufgefrischten Markenladen vom alten Bürooberbau.
    for (const s of seiten) s.q(0, s.L, ladenTop - 0.14, ladenTop + 0.19, 0.61, 0.95, '#9f9d9a');
  } else if (zweigeschossig) {
    // Zweigeschossiger Fachmarkt: geschlossener OG-Körper aus grauen Paneelen, EG durchgehend Glas.
    S.quader(x + 0.35, 7.65, z + bd - 0.36, x + bw, H, z + bd, farbe);
    S.quader(x + bw - 0.36, 7.65, z + 0.35, x + bw, H, z + bd, farbe);
    S.quader(x + 0.35, 4.72, z + 0.4, x + bw, 4.98, z + bd, '#929ca4');
    S.quader(x + bw - 0.5, 0.45, z + bd - 7.6, x + bw, 7.8, z + bd, '#bbcbd1');
    for (let et = 0; et < 4; et++) {
      const y = 1.2 + et * 1.45;
      S.box(1.15, 0.16, 2.3, x + bw - 2.65 - et * 0.43, y, z + bd - 3.4 - et * 0.3, '#adb9bf');
      S.box(0.15, 1.0, 2.5, x + bw - 2.0 - et * 0.43, y + 0.5, z + bd - 3.4 - et * 0.3, '#727e87');
    }
  } else {
    // Eingeschossige Box mit flacher, nach außen ablesbarer Dachattika.
    S.quader(x + 0.3, H - 0.55, z + bd - 0.45, x + bw, H, z + bd, farbe);
    S.quader(x + bw - 0.45, H - 0.55, z + 0.3, x + bw, H, z + bd, farbe);
  }
  if (!F.zu) {
    innenVorbereiten(S, scene);
    innenOutlet(S, scene, haus, { x, z, status: Z.status, innenZustand:opt.innenZustand });
  }
  for (const [i, s] of seiten.entries()) {
    glasfront(S, scene, s, stadt ? bandY - 0.07 : (zweigeschossig ? 7.65 : bandY + 0.4), !F.zu, r, zweigeschossig, eingang);
    if (stadt) {
      // EG-Läden haben eine eigenständige, breite Schaufensterzone.
      s.q(0.1, s.L - 0.1, 4.6, 4.93, 0.33, 0.56, '#e5e0d5');
      for (let u = 3; u < s.L - 2; u += 4.0)
        s.q(u, u + 0.13, 0.42, 4.65, 0.16, 0.32, '#b5b9b9');
    }
    logos.push(marke(scene, s, H, bandY, werbung));
  }
  if (!stadt) {
    // Über die volle Front durchlaufendes Glasvordach mit Stützen.
    const vordach = zweigeschossig ? 4.45 : 3.18;
    S.box(bw + 1.2, 0.23, 3.25, x + bw / 2, vordach, z + bd + 1.55, '#aac4d0');
    S.box(bw + 1.1, 0.12, 0.18, x + bw / 2, vordach + 0.06, z + bd + 3.12, '#efeee9');
    for (let xx = x + 2.5; xx < x + bw - 1.5; xx += 7.4)
      S.box(0.18, vordach - 0.55, 0.18, xx, (vordach + 0.55) / 2, z + bd + 2.95, '#b2bac1');
  }
  // 8 × 4 m großer vorspringender Eingangs-Windfang in der Markenfarbe.
  const ex = x + bw * eingang, portalH = stadt ? 5.85 : 5.95;
  const pz = z + bd + (stadt ? 1.25 : 1.8);
  for (const dx of [-4.05, 4.05])
    S.box(0.7, portalH - 0.3, 3.9, ex + dx, portalH / 2, pz, FARBE_OUTLET);
  S.box(8.8, 0.95, 4.15, ex, portalH - 0.45, pz, FARBE_OUTLET);
  S.box(7.1, 3.55, 0.24, ex, 2.35, pz + 2.0, '#aacbd7');
  const portalSeite = new Seite(S, ex - 4.4, pz - 2.1, 8.8, 4.2, '+z');
  text(scene, portalSeite, NAME_OUTLET, 4.4, portalH - 0.46, 0.69, 7.6, 0.78);
  // Dachlandschaft: unterschiedliche Technikfelder und erkennbare Oberlichter.
  technik(S, r, x + 2.5, z + 3, x + bw - 2, z + bd - 3, H + 0.18, { max: stadt ? 5 : 10, farbe: '#b9bfc2' });
  for (let i = 0; i < (stadt ? 2 : 5 + m.variante % 3); i++) {
    const xx = x + 4 + i * Math.max(4.0, (bw - 8) / 7);
    if (xx > x + bw - 3) continue;
    S.box(2.25, 0.28, Math.min(8, bd * 0.35), xx, H + 0.22, z + bd * 0.47, '#8fb7c7');
    S.box(2.47, 0.13, Math.min(8, bd * 0.35) + 0.18, xx, H + 0.08, z + bd * 0.47, '#e9ece9');
  }
  if (m.park) {
    const parkz = z + bd + 1.2, parkTiefe = m.park - 2.2;
    S.quader(x + 1, 0.30, parkz, x + bw - 1, 0.36, z + m.d - 0.8, '#8d9399');
    parkreihe(S, r, x + 2, x + bw - 2, parkz + 3.2, 5.3, 0.36, 0.94);
    if (parkTiefe >= 17) parkreihe(S, r, x + 2, x + bw - 2, parkz + 10.1, 4.8, 0.36, 0.88);
    for (let i = 0; i < 8; i++) {
      const xx = x + 2.5 + i * (bw - 5) / 8;
      S.box(0.55, 0.27, 1.9, xx, 0.45, parkz + 9, '#c7cbba');
    }
    S.box(5.8, 0.25, 3.5, x + bw - 5.4, 2.52, z + m.d - 3.1, FARBE_OUTLET);
    for (let i = 0; i < 5; i++) {
      S.box(0.11, 2.0, 0.11, x + bw - 8.1 + i * 1.25, 1.38, z + m.d - 3.1, '#d7dee3');
      S.box(0.7, 0.56, 0.70, x + bw - 8 + i * 1.25, 0.6, z + m.d - 3.0, '#a4b2bb');
    }
    if (opt.pylon !== false) pylon(S, scene, x + 6.6, z + m.d - 2.4);
  } else {
    S.box(bw + 3.5, 0.20, 5.3, x + bw / 2, 0.31, z + bd + 2.4, '#c9c9c5');
    for (let i = 0; i < 10; i++) S.box(0.15, 0.04, 1.6, x + 2 + i * (bw - 3) / 10, 0.44, z + bd + 3.2, '#ededed');
  }
  if (!F.zu && opt.passanten !== false) {
    const anz = Z.status === 'neueroeffnung' ? 22 : 14;
    for (let i = 0; i < anz; i++) {
      const xx = x + 3 + r() * (bw - 6), zz = z + bd + 2.4 + r() * (m.park ? 6 : 2.1);
      mensch(S, r, xx, 0.32, zz);
      S.box(0.62, 0.78, 0.27, xx + 0.45, 0.73, zz + 0.08, FARBE_OUTLET);
      S.box(0.58, 0.08, 0.04, xx + 0.45, 1.17, zz + 0.22, '#e0d7cb');
    }
  }
  if (Z.status === 'neueroeffnung') {
    const bz = z + bd + 3.1;
    for (let i = 0; i < 10; i++) mensch(S, r, ex - 4.1 + i * 0.85, 0.32, bz + 2.6);
    for (const dz of [1.5, 3.7]) {
      S.box(9.5, 0.07, 0.07, ex, 1.02, bz + dz, FARBE_OUTLET);
      for (let j = -2; j <= 2; j++) S.box(0.08, 1.05, 0.08, ex + j * 2.25, 0.63, bz + dz, '#666f76');
    }
    for (let i = 0; i < 16; i++) {
      const xx = ex - 3 + i / 15 * 6, yy = 3.0 + Math.sin(i / 15 * Math.PI) * 2.5;
      const g = new THREE.IcosahedronGeometry(0.45, 1); g.translate(xx, yy, bz);
      S.add(g, i % 3 ? FARBE_OUTLET : '#f8ede4');
    }
  }
  const koerper = {
    x, z, w: bw, d: bd, hoehe: H, egHoehe: 5, geschossHoehe: 3.9, n: m.n,
    tRelief: 1.15, raster: 4.1, fensterBand: false,
    seiten: {
      '+z': { u1: bw, sperren: [logos[0]], abbau: { u: bw * 0.53, y: bandY + 1.6, t: 1.15 } },
      '+x': { u1: bd, sperren: [logos[1]], abbau: { u: bd * 0.53, y: bandY + 1.6, t: 1.15 } },
    },
    eingaenge: [{ seite: '+z', u: bw * eingang, breite: 7.4, t: 2.2, haupt: true }],
    fensterEG: [{ seite: '+z', a: 0.6, b: bw - 0.6, y0: 0.5, y1: 3.2, t: 0.30 }],
    farbe, baujahr: haus.baujahr, jahr: opt.jahr, flaecheQm: haus.grundflaecheQm * m.n,
    marke: mark, seed: String(haus.id) + '/outlet', planeText: 'HIER ENTSTEHT ' + NAME_OUTLET,
  };
  // Off-Price und Aktion verwenden ausschließlich den Markenclaim statt Rabatt-Plakatflächen.
  const dekZ = werbung ? zustandNormal({ status: 'offen', seed: haus.id }) : Z;
  const dekor = zustandsDekor(S, scene, koerper, dekZ, { pylon: false, passanten: false, logosAbdecken: true, abrissSeite: opt.abrissSeite });
  return { hoehe: Math.max(H + 3.8, dekor.hoehe, m.park ? 11.6 : 0), w: m.w, d: m.d, familie: m.familie, teile: S.anzahl - start, status: Z.status, pinAnker: dekor.pinAnker };
}
