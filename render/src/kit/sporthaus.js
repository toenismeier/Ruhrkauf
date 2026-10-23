// Hartwig Sport: Sporthäuser aus den Engine-Daten (haeuser.json, format 'sport').
// Bildsprache Coffee Inc 2: Detail aus Geometrie, nur +x/+z und Dach detailliert, Schrift nur über textTextur().
//
// export sporthaus(S, scene, haus, { x, z, status?, zusatz?, aktion?, familie?, untermieter?, hartwig?, passanten?, abrissSeite? })
//        → { hoehe, w, d, familie, teile, status }   Alle 12 Zustände über zustandsDekor() aus zustaende.js.
// export masseSport(haus) → { w, d, n, H, familie, bw, bd }   (w × d = belegte Fläche inkl. Parkplatz bzw. Mall-Rahmen,
//                                                               bw × bd = reiner Baukörper des Ladens)
// export familieSport(haus), FAMILIEN_SPORT, HS_ROT, HS_BLAU
// Statt Math.hypot: IEEE-genaue Wurzel, damit Schwellenvergleiche in allen JS-Engines gleich ausfallen.
const wurzelSumme = (...v) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
import { THREE, rng, waehle, zw, heller, dunkler } from './basis.js';
import {
  Seite, seitenVon, zyl, viertelzylinder, prismaX, pult, plakat, plakatBreite, passend, bodenText, puppe, mensch, rad, auto,
  busch, kuebelbaum, buchten, wand, attika, lichtkuppeln, technik, solar, parkreihe, geruest, clamp, GLAS, GLAS_D, GLAS_HELL, LICHT, RAHMEN, STAHL, KIES, KLEID, BUNT,
} from './sporthelfer.js';
import { zustandNormal, zustandFlags, zustandsDekor, eigeneMieterflaechen, ladenInhalt, merke, mieterInfo } from './zustaende.js';
import { WETTBEWERBER_FARBEN } from './wettbewerber.js';

export const HS_ROT = '#d23c32', HS_BLAU = '#1d2f4f', HS_WEISS = '#f4f3ef';
export const EG_S = 5.0, OG_S = 4.2;
export const FAMILIEN_SPORT = { 1: 'Glas-Kubus', 2: 'Geschäftshaus 70/80', 3: 'Fachmarkt-Box', 4: 'Mall-Front', 5: 'Outdoor-Flagship', 6: 'Postmoderne 90er' };
const PARK = 17;          // Parkplatztiefe vor der Fachmarkt-Box
const BODEN = '#ddd5c6', INNEN = '#d5dadb';
const SLOGANS = ['LAUF LOS.', 'RAUS. JETZT.', 'NEUE SAISON', 'BERG RUFT.', 'DEIN SPIEL.', 'WINTER KOMMT', 'AB AUFS RAD'];

/** Einheitliche, rein grafische Ableitung für Außenhaus und aufgeschnittene Etage.
 * Aktionsdaten kommen ausschließlich aus zustandAusHaus() (über opt bzw. o.zustand).
 * Fehlende Engine-Aktion wird niemals aus einem Kalender oder KPI erfunden.
 */
export function sportGefuehl(haus, zustand = {}) {
  const n = (haus.etagen ?? [0]).filter((e) => e >= 0).length;
  const erlebnis = haus.lage === '1a' && (haus.grundflaecheQm ?? 0) >= 2000
    ? (rng(String(haus.id) + '/erlebnisart')() < 0.5 ? 'laufanalyse' : 'fitness') : null;
  // Rohoptionen liefern 0..1, zustandNormal() liefert bereits 0..100. Nie doppelt multiplizieren.
  const rohRabatt = Number(zustand.rabatt ?? 0);
  const rabatt = rohRabatt > 1 ? rohRabatt : rohRabatt * 100;
  const aktiv = !!zustand.aktion || zustand.status === 'aktion' || (zustand.zusatz ?? []).includes('aktion');
  const offen = !['geschlossen', 'leer', 'verfall', 'abriss', 'raeumung'].includes(zustand.status ?? haus.status);
  return {
    erlebnis,
    erlebnisSeite: '+z', // Hauptseite zum Kunden, identisch für Vorbau und normale Glasfront
    abverkauf: n > 1 && offen && aktiv && rabatt > 0,
    rabatt: aktiv && rabatt > 0 ? Math.round(rabatt) : null,
    obereEtage: Math.max(0, ...(haus.etagen ?? [0]).filter((e) => e >= 0)),
    matt: (haus.substanz ?? 100) < 40 && offen,
  };
}

// ---------------------------------------------------------------- Daten → Form
export function familieSport(haus) {
  const r = rng(String(haus.id) + '/familie');
  const j = haus.baujahr ?? 2000, A = haus.grundflaecheQm ?? 2000;
  const n = Math.max(1, (haus.etagen || [0]).filter((e) => e >= 0).length);
  const x = r();
  switch (haus.lage) {
    case 'rand': return 3;
    case 'center': return 4;   // Center-Häuser immer als Mall-Laden (innen wie außen an der Passage)
    case 'b': return j < 1990 ? 2 : (x < 0.5 ? 3 : 6);
    default:
      if (j < 1990) return 2;
      if (j < 2000) return 6;
      if (n === 1 && A >= 2500) return x < 0.55 ? 5 : 1;
      return x < 0.62 ? 1 : 5;
  }
}

function koerper(haus) {
  const A = clamp(haus.grundflaecheQm || 2000, 400, 6500);
  const r = rng(String(haus.id) + '/masse');
  const ziel = 1.15 + r() * 0.45;
  let best = null;
  for (let w = 15; w <= 95; w += 5) for (let d = 15; d <= w; d += 5) {
    const q = w / d;
    if (q < 1.0 || q > 1.75) continue;
    const s = Math.abs(w * d - A) / A + 0.12 * Math.abs(q - ziel);
    if (!best || s < best.s) best = { w, d, s };
  }
  const n = clamp((haus.etagen || [0]).filter((e) => e >= 0).length, 1, 3);
  return { bw: best.w, bd: best.d, n };
}
const mallBreite = (bw) => Math.max(25, Math.round((bw * 0.8) / 5) * 5);

export function masseSport(haus, familie) {
  const fam = familie ?? familieSport(haus);
  const { bw, bd, n } = koerper(haus);
  const H = EG_S + (n - 1) * OG_S;
  const w = fam === 4 ? bw + mallBreite(bw) : bw;
  const d = fam === 3 ? bd + PARK : bd;
  return { w, d, n, H, familie: fam, bw, bd };
}

// ---------------------------------------------------------------- Bausteine
/** Ware einer Sportgruppe zwischen a und b. tb = Rückwand, tm = Mitte des Raums. */
function ware(K, s, a, b, y, tb, tm, gruppe) {
  const r = K.r, m = (a + b) / 2, br = b - a;
  switch (gruppe) {
    case 'sportschuhe': {
      s.q(a + 0.3, b - 0.3, y, y + 2.7, tb, tb + 0.35, '#efe9df');
      for (let k = 0; k < 3; k++) for (let i = 0; i < Math.min(5, Math.floor((br - 0.6) / 0.55)); i++) {
        const u = a + 0.65 + i * 0.55;
        s.q(u - 0.18, u + 0.18, y + 0.55 + k * 0.75, y + 0.78 + k * 0.75, tb + 0.35, tb + 0.6, waehle(r, ['#f1f1ee', '#e04b3a', '#2b2b2b', '#3a7bd5', '#f2c14e', '#4caf50']));
      }
      s.q(m - 0.8, m + 0.8, y, y + 0.45, tm - 0.4, tm + 0.4, '#d9d2c4');
      s.q(m - 0.4, m - 0.05, y + 0.45, y + 0.65, tm - 0.15, tm + 0.15, waehle(r, ['#e04b3a', '#f1f1ee']));
      break;
    }
    case 'sporttextil': {
      s.q(a + 0.4, b - 0.4, y + 1.75, y + 1.82, tm - 0.03, tm + 0.03, '#6b7177');
      s.q(a + 0.45, a + 0.52, y, y + 1.82, tm - 0.03, tm + 0.03, '#6b7177');
      const nK = Math.max(2, Math.floor((br - 1.2) / 0.38));
      for (let i = 0; i < nK; i++) { const u = a + 0.75 + i * 0.38; s.q(u - 0.15, u + 0.15, y + 0.85, y + 1.72, tm - 0.25, tm + 0.25, waehle(r, KLEID)); }
      puppe(s, b - 0.7, y, tb + 0.6, waehle(r, KLEID), waehle(r, ['#2b3a55', '#2b2b2b', '#e8e4dc']));
      break;
    }
    case 'outdoor': {
      const g = new THREE.ConeGeometry(1.0, 1.3, 4); g.rotateY(Math.PI / 4); g.translate(m - 0.5, y + 0.65, tm); s.geo(g, waehle(r, ['#e36b2c', '#3f7d56', '#f2c14e']));
      puppe(s, b - 0.6, y, tm, waehle(r, ['#c0392b', '#2e7d32', '#1f3f6b']), '#3a3a3a');
      s.q(a + 0.3, a + 0.8, y, y + 0.75, tb + 0.1, tb + 0.45, waehle(r, ['#e0b23c', '#c0392b', '#2f6f8f']));
      s.q(a + 0.3, b - 0.3, y + 2.2, y + 2.5, tb, tb + 0.25, '#7a5d43');
      break;
    }
    case 'rad': {
      rad(s, m - 0.3, y, tm, waehle(r, ['#e04b3a', '#1f6fb5', '#f2c14e', '#2b2b2b']));
      if (br > 2.6) rad(s, m + 0.3, y + 1.6, tb + 0.25, waehle(r, ['#4caf50', '#ffffff', '#e04b3a']));
      break;
    }
    case 'wintersport': {
      for (let i = 0; i < 4; i++) s.q(a + 0.5 + i * 0.32, a + 0.64 + i * 0.32, y, y + 1.85, tb + 0.15, tb + 0.22, waehle(r, ['#e04b3a', '#1f6fb5', '#f2c14e', '#ffffff']));
      s.kipp(0.35, 1.5, 0.06, b - 1.4, y + 0.95, tb + 0.2, '#2b2b2b', 0.15);
      puppe(s, b - 0.6, y, tm, waehle(r, ['#e04b3a', '#1f6fb5', '#ffffff']), '#2b2b2b');
      break;
    }
    case 'teamsport': {
      const gu = Math.min(1.4, br / 2 - 0.3);
      s.q(m - gu, m - gu + 0.08, y, y + 1.3, tm - 0.04, tm + 0.04, '#f4f4f4');
      s.q(m + gu - 0.08, m + gu, y, y + 1.3, tm - 0.04, tm + 0.04, '#f4f4f4');
      s.q(m - gu, m + gu, y + 1.22, y + 1.3, tm - 0.04, tm + 0.04, '#f4f4f4');
      for (const du of [-0.4, 0.5]) { const g = new THREE.IcosahedronGeometry(0.18, 0); g.translate(m + du, y + 0.18, tm + 0.5); s.geo(g, '#ffffff'); }
      for (let i = 0; i < 3; i++) s.q(a + 0.6 + i * 0.75, a + 1.2 + i * 0.75, y + 1.7, y + 2.4, tb, tb + 0.08, waehle(r, ['#e04b3a', '#1f6fb5', '#f2c14e', '#ffffff', '#4caf50']));
      break;
    }
    default: puppe(s, m, y, tm, waehle(r, KLEID), '#2b2b2b');
  }
}

/**
 * Schaufenster/Verkaufsraum hinter Glas: Boden, Rückwand, Lichtband, Ware nach Gruppe. Wird in K.glas registriert,
 * damit die Statusstelle die Fläche zukleben oder vergittern kann.
 */
/** Kleine, klar lesbare Erlebniszone direkt hinter einer der beiden sichtbaren Glasfronten. */
function erlebnisHinterGlas(K, s, a, b, y0, tF, tiefe) {
  const u = (a+b)/2, r=K.r, y=y0+0.12;
  const vorne = tF+0.14, hinten = tF-Math.max(1.45,tiefe*0.65);
  const breite = Math.min(6.0,b-a-0.3), left=u-breite/2, right=u+breite/2;
  // Kontrastreiches, helles Studio mit Tiefenwirkung, bleibt im EG ohne Marketingrabatt.
  s.q(left,right,y,y+0.10,hinten-0.55,vorne,'#f6f4e9');
  s.q(left,right,y+0.08,y+3.75,hinten-0.56,hinten-0.45,'#d5e6ee');
  s.q(left,right,y+3.38,y+3.55,hinten-0.4,vorne,'#fff7da');
  s.q(left,left+0.12,y,y+3.45,hinten,vorne,'#455e73');
  s.q(right-0.12,right,y,y+3.45,hinten,vorne,'#455e73');
  const t=vorne-0.63, label=K.erlebnis==='fitness'?'FITNESS':'LAUFANALYSE';
  s.q(left+0.25,right-0.25,y+2.85,y+3.35,vorne+0.10,vorne+0.18,'#204c65');
  plakat(K.scene,s,label,u,y+3.08,vorne+0.21,passend(label,breite-0.65,0.43),'#ffffff');
  if(K.erlebnis==='laufanalyse'){
    // Großes Laufband mit Lauffigur, Haltegriff, Monitorwand und Sitzbank.
    s.q(u-1.62,u+1.1,y+0.20,y+0.43,t-0.25,t+0.60,'#252e37');
    s.q(u-1.47,u+0.8,y+0.44,y+0.49,t-0.16,t+0.46,'#111821');
    for (const du of [-1.1,0.8]) s.q(u+du,u+du+0.07,y+0.46,y+1.45,t+0.42,t+0.53,'#dce5e9');
    s.q(u-1.12,u+0.87,y+1.40,y+1.47,t+0.43,t+0.55,'#a2b0b9');
    s.q(u-0.65,u+0.10,y+1.46,y+2.15,t+0.47,t+0.55,'#223647');
    s.q(u-0.54,u-0.01,y+1.61,y+2.03,t+0.56,t+0.60,'#45cbe0');
    s.q(left+0.28,left+1.55,y+1.0,y+2.45,hinten-0.38,hinten-0.28,'#1f3449');
    s.q(left+0.39,left+1.44,y+1.25,y+2.27,hinten-0.26,hinten-0.20,'#4bcce0');
    s.q(right-1.55,right-0.3,y+0.52,y+0.66,t-0.15,t+0.65,'#d9a86c');
    for(const du of [-1.22,-0.4]) s.q(u+du,u+du+0.13,y+0.25,y+0.60,t-0.14,t-0.02,'#b8c5cd');
    const [fx,fz]=s.welt(u-0.31,t+0.05);
    if(K.leute) mensch(K.S,r,fx,y+0.5,fz);
  }else{
    // Sichtbare Fitnessgeräte, Gewichte, Spiegelwand und Trainingsmatten.
    s.q(left+0.2,right-0.2,y+0.6,y+2.7,hinten-0.40,hinten-0.32,'#9cc2d0');
    for (let i=0;i<3;i++) {
      const cx=left+1.1+i*1.6;
      s.q(cx-0.6,cx+0.6,y+0.12,y+0.18,t-0.32,t+0.65,['#d7ba42','#369bc0','#75a76c'][i]);
      s.q(cx-0.45,cx-0.34,y+0.20,y+2.0,t+0.23,t+0.32,'#344b60');
      s.q(cx+0.36,cx+0.47,y+0.20,y+2.0,t+0.23,t+0.32,'#344b60');
      s.q(cx-0.58,cx+0.58,y+1.76,y+1.85,t+0.17,t+0.43,'#344b60');
      s.q(cx-0.47,cx+0.47,y+0.67,y+0.85,t-0.05,t+0.35,'#aab9bd');
      for(let k=0;k<3;k++)s.q(cx-0.38+k*0.31,cx-0.25+k*0.31,y+1.06,y+1.24,t-0.13,t+0.02,k%2?'#e7ad32':'#333a42');
    }
    if(K.leute){const [fx,fz]=s.welt(u+0.2,t+0.05);mensch(K.S,r,fx,y+0.15,fz);}
  }
  // Bei F2/F4/F6 macht ein verglaster Vorbau das Studio im Spielzoom sichtbar.
  if([2,4,6].includes(K.fam)){
    // Keine geschlossene Scheibe aus opakem GLAS_HELL: die Geräte sollen durch die Front erkennbar bleiben.
    for(const edge of [left-0.2,right+0.2])s.q(edge-0.07,edge+0.07,y,y+3.48,vorne,vorne+0.92,'#cedce2');
    s.q(left-0.2,right+0.2,y+3.37,y+3.48,vorne,vorne+0.92,'#d6e3e8');
    s.q(left-0.2,right+0.2,y+0.06,y+0.16,vorne,vorne+0.92,'#d6e3e8');
  }
  K.erlebnisGezeigt=true;
}

/** Dichte Sale-Ware ersetzt Puppen: viele einzeln lesbare Schuhkartons, Körbe und Preisschilder.
 * Materialmenge bewusst mindestens so hoch wie die vorherige Sortimentdarstellung.
 */
function abverkaufHinterGlas(K,s,a,b,y0,y1,tF,tiefe){
  const br=b-a, mitte=(a+b)/2, tb=tF-Math.max(1.2,tiefe);
  s.q(a+0.12,b-0.12,y0+0.13,y0+0.20,tb,tF,'#e9e3d4');
  // Regalturm: fünf Böden und mehrere Paletten nebeneinander, 35-70 Teile je Bucht.
  const cols=Math.max(3,Math.min(8,Math.floor(br/0.68)));
  const step=(br-0.75)/cols;
  for(let row=0;row<5;row++){
    const yy=y0+0.47+row*0.56;
    s.q(a+0.3,b-0.3,yy,yy+0.08,tb+0.10,tb+0.70,'#777d83');
    for(let k=0;k<cols;k++){
      const xx=a+0.42+k*step;
      s.q(xx,xx+step*0.82,yy+0.09,yy+0.32,tb+0.2,tb+0.64,
        ['#f2ecdc','#d5be92','#e7e6e1','#d93b32','#e7d7ba'][(row+k)%5]);
      s.q(xx+0.07,xx+0.15,yy+0.15,yy+0.18,tb+0.65,tb+0.68,'#24282d');
    }
  }
  for(let k=0;k<Math.max(2,Math.floor(br/1.5));k++){
    const x=a+0.6+k*1.42;
    if(x+1.22>b-0.2)break;
    s.q(x,x+1.20,y0+0.78,y0+0.92,tF-0.63,tF-0.12,'#b9bdbe');
    for(let p=0;p<5;p++){
      s.q(x+0.12+(p%3)*0.31,x+0.36+(p%3)*0.31,y0+0.95+Math.floor(p/3)*0.2,y0+1.1+Math.floor(p/3)*0.2,tF-0.55,tF-0.20,p%2?'#d8a64a':'#f0efe8');
    }
    s.q(x+0.30,x+0.86,y0+1.19,y0+1.50,tF-0.1,tF-0.055,'#e0b221');
  }
  if(br>2.2){
    s.q(mitte-1.25,mitte+1.25,y1-1.24,y1-0.31,tF+0.08,tF+0.12,'#c62132');
    plakat(K.scene,s,'REDUZIERT',mitte,y1-0.79,tF+0.18,passend('REDUZIERT',2.15,0.63),'#ffffff');
  }
  K.abverkaufFenster++;
}
function vitrine(K, s, a, b, y0, y1, tF, tiefe, gruppe, o = {}) {
  const tb = tF - tiefe;
  const mz = y0 < 1 && (K.mieterZonen ?? []).find((m) => m.seite === s.seite && (a + b) / 2 > m.u0 && (a + b) / 2 < m.u1);
  if (mz) { // Untermieter im EG: eigenes helles Inneres und eigene Ware
    s.q(a, b, y0, y0 + 0.12, tb, tF, '#e4e1da');
    s.q(a, b, y0, y1, tb - 0.1, tb, '#eef0f1');
    s.q(a, b, y1 - 0.32, y1 - 0.18, tb, tb + 0.08, '#fff4d6');
    if (!K.zu && b - a > 1.6) ladenInhalt(s, a, b, y0 + 0.12, tb, Math.min(tF - 0.05, tb + 1.6), mz.typ, K.r);
    (mz.buchten ??= []).push({ s, a, b, y0, y1, t: tF });
    K.glas.push({ s, a, b, y0, y1, t: tF, eg: true, mieter: mz });
    return;
  }
  s.q(a, b, y0, y0 + 0.12, tb, tF, o.boden ?? BODEN);
  s.q(a, b, y0, y1, tb - 0.1, tb, o.rueck ?? INNEN);
  s.q(a, b, y1 - 0.32, y1 - 0.18, tb, tb + 0.08, LICHT);
  const oben = K.abverkauf && K.n > 1 && y0 >= EG_S + (K.n - 2) * OG_S - 0.5 && y0 > 1;
  const erlebnis = !K.erlebnisGezeigt && K.erlebnis && y0 < 1 && s.seite === K.erlebnisSeite && b - a >= 3.4;
  if (!K.zu && oben && b - a > 2.2) abverkaufHinterGlas(K, s, a, b, y0, y1, tF, tiefe);
  else if (!K.zu && erlebnis) { erlebnisHinterGlas(K, s, a, b, y0, tF, tiefe); K.erlebnisGezeigt = true; }
  else if (!K.zu && b - a > 1.6) ware(K, s, a, b, y0 + 0.12, tb, tb + tiefe * 0.55, gruppe);
  K.glas.push({ s, a, b, y0, y1, t: tF, eg: y0 < 1 });
}

const oeffnungen = (K, s) => K.glas.filter((g) => g.s === s);

/** Dachfläche füllen: Lichtkuppeln links, Technik und ggf. Solar rechts, optional aufgemaltes H. */
function dachfeld(K, x0, z0, x1, z1, y, o = {}) {
  const { S, r } = K;
  const fl = (x1 - x0) * (z1 - z0);
  if (!K.dach || fl > (K.dach.x1 - K.dach.x0) * (K.dach.z1 - K.dach.z0)) K.dach = { x0, z0, x1, z1, y };
  if (x1 - x0 < 6 || z1 - z0 < 6) return;
  const gross = fl > 1200;
  const xm = x0 + (x1 - x0) * (o.teilung ?? 0.45);
  const q = clamp(Math.min(x1 - x0, z1 - z0) * 0.22, 4, 8), cx = x0 + (x1 - x0) * 0.62, cz = z0 + (z1 - z0) * 0.62;
  const zt1 = o.h ? Math.max(z0 + 6, cz - q / 2 - 0.8) : z1 - 1;
  if (o.kuppeln !== false) {
    if (gross && o.sheds !== false && K.v % 3 !== 1) { // Shed-Oberlichter: Sägezahnreihen mit Glas nach +z
      for (let zs = z0 + 1.2; zs + 3.6 <= z1 - 1.2; zs += 5.2) {
        prismaX(S, x0 + 1.2, xm - 1, [[zs, 0], [zs + 3.6, 0], [zs + 3.6, 1.5]], y, '#c9c6bf');
        S.quader(x0 + 1.3, y + 0.15, zs + 3.6, xm - 1.1, y + 1.4, zs + 3.66, K.zu ? '#9aa3a8' : '#a9c6d3');
        for (let x = x0 + 3; x < xm - 1; x += 3) S.quader(x - 0.04, y + 0.15, zs + 3.6, x + 0.04, y + 1.45, zs + 3.7, '#eef1f2');
      }
    } else lichtkuppeln(S, x0 + 1, z0 + 1, xm - 1, z1 - 1, y, 6, 6.5);
  }
  let xt = xm;
  if (o.solar ?? (gross || (fl > 900 && r() < 0.65))) { const xs = xm + (x1 - xm) * (gross ? 0.62 : 0.5); solar(S, xm + 0.5, z0 + 1, xs, zt1, y); xt = xs; }
  technik(S, r, xt + 0.5, z0 + 1, x1 - 1, zt1, y, { max: Math.max(3, Math.round(fl / 220)), farbe: o.farbe ?? '#cfccc5' });
  if (gross && o.werbung !== false && x1 - x0 > 30) { // Dachwerbung an der Rückkante, Blick nach +z
    const bw = Math.min(16, (x1 - x0) * 0.32), bx = x0 + (x1 - x0) * 0.72, bz = z0 + 1.4, bh = 4.2, yb = y + 2.6;
    for (const dx of [-bw * 0.35, bw * 0.35]) { S.box(0.25, yb + bh - y, 0.25, bx + dx, (y + yb + bh) / 2, bz - 0.3, '#5f676e'); S.box(0.15, 0.15, 2.2, bx + dx, y + 1.3, bz - 1.2, '#5f676e'); }
    const sw = new Seite(S, bx - bw / 2, bz - 0.4, bw, 0.4, '+z');
    sw.q(-0.2, bw + 0.2, yb - 0.2, yb + bh + 0.2, -0.1, 0, '#d9dcde');
    const bg = K.zu ? '#8e9499' : ['#1f6fb5', '#2f8f5b', '#e8562a', HS_BLAU][K.v % 4];
    sw.q(0, bw, yb, yb + bh, 0, 0.06, bg);
    if (!K.zu) {
      sw.q(0, bw * 0.28, yb, yb + bh, 0.06, 0.08, HS_ROT);
      plakat(K.scene, sw, 'H', bw * 0.14, yb + bh / 2, 0.1, bh * 0.7, '#ffffff');
      const sl = SLOGANS[(K.v + 2) % SLOGANS.length];
      plakat(K.scene, sw, sl, bw * 0.64, yb + bh / 2, 0.1, passend(sl, bw * 0.62, bh * 0.45), '#ffffff');
    }
    K.hoeheDach = Math.max(K.hoeheDach ?? 0, yb + bh + 0.3);
  }
  if (o.h && !K.ohneLogo) { // aufgemaltes Markenzeichen
    S.box(q, 0.05, q, cx, y + 0.03, cz, HS_ROT);
    bodenText(K.scene, 'H', cx, y + 0.07, cz, q * 0.85, '#ffffff', -Math.PI / 4);
  }
}

/** Hartwig-Sport-Logo: rotes Quadrat mit weißem H und Lauf-Strich, daneben blaues Band mit Schriftzug. */
function hsLogo(K, s, u, y, t, h, o = {}) {
  const text = o.text ?? 'HARTWIG SPORT';
  const q = h * 1.3, ph = h * 0.58;
  const tw = plakatBreite(text, ph) * 0.92;
  const total = q + tw + h * 0.35;
  const P = (k) => u + s.lese * k;            // Leserichtung
  const ua = P(-total / 2), uq = P(-total / 2 + q), ue = P(total / 2);
  const mn = (p, qq) => [Math.min(p, qq), Math.max(p, qq)];
  K.logos.push({ s, u0: Math.min(ua, ue), u1: Math.max(ua, ue), y0: y - q / 2, y1: y + q / 2, t, grund: o.grund ?? '#cccccc', sichtbar: !K.ohneLogo });
  if (K.ohneLogo) { // Schattenkontur des abgenommenen Logos
    const [b0, b1] = mn(ua, ue);
    s.q(b0, b1, y - h / 2, y + h / 2, t, t + 0.03, dunkler(o.grund ?? '#cccccc', 0.06));
    const [c0, c1] = mn(ua, uq); s.q(c0, c1, y - q / 2, y + q / 2, t, t + 0.04, dunkler(o.grund ?? '#cccccc', 0.08));
    return total;
  }
  const [b0, b1] = mn(uq, ue);
  s.q(b0, b1, y - h / 2, y + h / 2, t, t + 0.25, K.matt && !K.leuchtbandAbgeschaltet ? '#2b3035' : (o.band ?? HS_BLAU));
  const lichtAus = K.matt && !K.leuchtbandAbgeschaltet;
  if (lichtAus) {
    s.q(b0, b1, y - h / 2, y + h / 2, t + 0.25, t + 0.29, '#252a2e');
    K.leuchtbandAbgeschaltet = true;
  } // nur ein abgeschaltetes Leuchtband
  const [c0, c1] = mn(ua, uq);
  s.q(c0, c1, y - q / 2, y + q / 2, t, t + 0.4, HS_ROT);
  const qm = (ua + uq) / 2;
  plakat(K.scene, s, 'H', qm, y + q * 0.06, t + 0.42, q * 0.82, '#ffffff');
  s.kipp(q * 0.62, q * 0.07, 0.04, qm, y - q * 0.36, t + 0.42, '#ffffff', s.lese * 0.12);
  plakat(K.scene, s, text, (uq + ue) / 2, y, t + 0.27, ph, lichtAus ? '#d1d3d1' : (o.schrift ?? '#ffffff'));
  return total;
}
/** Senkrechtes Logo (für Eckfinne oder Pylon): Quadrat oben, Schriftzug darunter senkrecht. */
function hsLogoSenkrecht(K, s, u, yOben, t, breite, laenge) {
  const q = breite;
  K.logos.push({ s, u0: u - q / 2, u1: u + q / 2, y0: yOben - laenge, y1: yOben, t, grund: HS_ROT, senkrecht: true, sichtbar: !K.ohneLogo });
  if (K.ohneLogo) { s.q(u - q / 2, u + q / 2, yOben - q, yOben, t, t + 0.04, dunkler(HS_ROT, 0.2)); return; }
  s.q(u - q / 2, u + q / 2, yOben - q, yOben, t, t + 0.3, '#ffffff');
  plakat(K.scene, s, 'H', u, yOben - q * 0.45, t + 0.32, q * 0.8, HS_ROT);
  const ph = Math.min(q * 0.55, (laenge - q - 0.6) / (plakatBreite('HARTWIG SPORT', 1) * 0.92));
  plakat(K.scene, s, 'HARTWIG SPORT', u, yOben - q - 0.3 - (plakatBreite('HARTWIG SPORT', ph) * 0.92) / 2, t + 0.05, ph, '#ffffff', null, { rz: s.lese * Math.PI / 2 });
}

/** Werbebanner mit Läufer-Silhouette. */
function kampagne(K, s, u0, u1, y0, y1, t, bg) {
  const wb = u1 - u0, wh = y1 - y0, wu = (u0 + u1) / 2, wy = (y0 + y1) / 2;
  if (wb < 4 || wh < 2) return;
  s.q(u0 - 0.2, u1 + 0.2, y0 - 0.2, y1 + 0.2, t, t + 0.12, '#d9dcde');
  s.q(u0, u1, y0, y1, t + 0.12, t + 0.2, bg);
  if (K.zu) return;
  const fs = wh * 0.1, fu = wu + s.lese * wb * 0.28, fy = wy - wh * 0.12;
  s.kipp(fs * 0.9, fs * 2.6, 0.05, fu, fy + fs * 1.4, t + 0.26, '#ffffff', -0.3 * s.lese);
  s.q(fu - fs * 0.45 + s.lese * fs * 0.6, fu + fs * 0.45 + s.lese * fs * 0.6, fy + fs * 2.9, fy + fs * 3.8, t + 0.24, t + 0.28, '#ffffff');
  s.kipp(fs * 0.5, fs * 2.4, 0.05, fu - s.lese * fs * 0.6, fy - fs * 0.5, t + 0.26, '#ffffff', -0.8 * s.lese);
  s.kipp(fs * 0.5, fs * 2.4, 0.05, fu + s.lese * fs * 0.9, fy - fs * 0.4, t + 0.26, '#ffffff', 0.6 * s.lese);
  s.kipp(wb * 0.9, wh * 0.06, 0.04, wu, y0 + wh * 0.18, t + 0.24, HS_ROT, 0.08 * s.lese);
  const slogan = SLOGANS[Math.floor(K.r() * SLOGANS.length)];
  const ph = passend(slogan, wb * 0.5, wh * 0.28);
  plakat(K.scene, s, slogan, wu - s.lese * wb * 0.2, wy + wh * 0.08, t + 0.27, ph, '#ffffff');
}

/** Fahrradständer mit Leihrädern / Aktionsrädern vor dem Haus. */
function radstaender(K, s, u0, anz, t) {
  for (let i = 0; i < anz; i++) {
    const u = u0 + i * 1.0;
    s.q(u - 0.04, u + 0.04, 0.3, 1.1, t - 0.9, t + 0.9, '#7c848b');
    if (K.zu) continue;
    const g = new THREE.TorusGeometry(0.38, 0.05, 4, 10); g.rotateY(Math.PI / 2); g.translate(u + 0.12, 0.7, t - 0.55); s.geo(g, '#2b2b2b');
    const g2 = new THREE.TorusGeometry(0.38, 0.05, 4, 10); g2.rotateY(Math.PI / 2); g2.translate(u + 0.12, 0.7, t + 0.55); s.geo(g2, '#2b2b2b');
    s.q(u + 0.08, u + 0.16, 0.95, 1.05, t - 0.55, t + 0.55, waehle(K.r, ['#e04b3a', '#1f6fb5', '#f2c14e', '#4caf50', '#f1f1ee']));
  }
}
function fahnen(K, s, us, t) {
  for (const u of us) {
    const [x, z] = s.welt(u, t);
    zyl(K.S, x, 0.3, z, 0.07, 8, '#d9dcde', 6);
    s.q(u - 0.03, u + 0.03, 4.6, 7.9, t + 0.1, t + 1.2, K.zu ? '#cfcac0' : (u % 2 > 1 ? HS_BLAU : HS_ROT));
  }
}

// ---------------------------------------------------------------- Familie 1: Glas-Kubus (2000er, 1a)
function familie1(K) {
  const { S, x0, z0, w, d, n, r, v } = K;
  const H = n === 1 ? 7.2 : EG_S + (n - 1) * OG_S;
  const T = 3.2, F = 3.4;      // Raumtiefe hinter Glas, Eckfinne
  const rahmenF = ['#e3e8ea', '#dfe3e5', '#e8eaeb'][v % 3];
  const kern = '#c9cfd2';
  S.quader(x0, 0, z0, x0 + w - T - 0.1, H, z0 + d - T - 0.1, kern);
  const ebenen = n === 1 ? [[0.3, H]] : Array.from({ length: n }, (_, e) => [e === 0 ? 0.3 : EG_S + (e - 1) * OG_S, e === 0 ? EG_S : EG_S + e * OG_S]);
  const [sz, sx] = K.seiten;
  const atrium = n >= 2 ? { s: v % 2 ? sz : sx, u0: 0, u1: 0 } : null;
  for (const s of K.seiten) {
    const uE = s.L - F;
    if (atrium && atrium.s === s) { atrium.u0 = Math.max(1.2, uE * 0.12); atrium.u1 = Math.min(uE - 4, atrium.u0 + clamp(uE * 0.28, 6, 10)); }
    const ein = s === sz ? uE * 0.62 : -99;
    ebenen.forEach(([y0, y1], e) => {
      const grp = K.gruppen(e);
      buchten(0, uE, 6.2, 0.2).forEach(([a, b], i) => {
        if (atrium && atrium.s === s && b > atrium.u0 && a < atrium.u1) {
          if (a < atrium.u0) vitrine(K, s, a, atrium.u0 - 0.1, y0, y1, 0, T, grp[i % grp.length]);
          if (b > atrium.u1) vitrine(K, s, atrium.u1 + 0.1, b, y0, y1, 0, T, grp[(i + 1) % grp.length]);
          return;
        }
        if (e === 0 && a < ein + 2.5 && b > ein - 2.5) { // Eingang
          s.q(a, b, 0.3, y1, -T - 0.1, -T, GLAS_D);
          s.q(a, b, 0.3, 0.42, -T, 0, BODEN);
          s.q((a + b) / 2 - 0.05, (a + b) / 2 + 0.05, 0.3, 3.2, -1.2, -1.1, RAHMEN);
          s.q(a + 0.3, b - 0.3, 0.3, 3.2, -1.2, -1.15, K.zu ? '#8e9499' : '#6f93a6');
          K.glas.push({ s, a, b, y0: 0.3, y1: 3.2, t: -1.1, eg: true, tuer: true });
          return;
        }
        vitrine(K, s, a, b, y0, y1, 0, T, grp[(i + e) % grp.length], e > 0 ? { rueck: '#dfe2df' } : {});
      });
      // Geschossdecke als weißes Band, Pfosten
      if (e > 0) s.q(0, uE, y0 - 0.25, y0 + 0.35, -0.1, 0.22, rahmenF);
    });
    for (let u = 0; u <= uE + 0.01; u += uE / Math.max(1, Math.round(uE / 1.55))) s.q(u - 0.05, u + 0.05, 0.3, H, 0, 0.12, '#e6ebed');
    s.q(0, uE, 0.3, 0.6, -0.1, 0.18, '#59636b');
    s.q(0, uE, H - 0.05, H + 1.1, -0.1, 0.3, rahmenF);
  }
  // Atrium mit Kletterwand über alle Geschosse
  if (atrium) {
    const s = atrium.s, { u0, u1 } = atrium;
    s.q(u0, u1, 0.3, H, -T - 0.1, -T + 0.15, '#8f979c');
    s.q(u0, u1, 0.3, 0.42, -T, 0, '#3f8f6a');
    for (let i = 0; i < Math.round((u1 - u0) * H * 0.55); i++) {
      const u = zw(r, u0 + 0.3, u1 - 0.5), y = zw(r, 0.8, H - 0.8);
      s.q(u, u + 0.3, y, y + 0.26, -T + 0.15, -T + 0.32, waehle(r, BUNT));
    }
    for (let k = 0; k < 3; k++) {
      const u = u0 + 1 + k * (u1 - u0 - 2) / 2;
      s.q(u - 0.25, u + 0.25, H * (0.3 + k * 0.17), H * (0.3 + k * 0.17) + 0.8, -T + 0.35, -T + 0.65, waehle(r, ['#e04b3a', '#f2c14e', '#1f6fb5']));
      s.q(u - 0.02, u + 0.02, H * (0.3 + k * 0.17) + 0.8, H - 0.3, -T + 0.4, -T + 0.44, '#f2f1ec');
    }
    s.q(u0, u1, H - 0.5, H - 0.3, -T, 0, LICHT);
    K.glas.push({ s, a: u0, b: u1, y0: 0.3, y1: H, t: 0, eg: true });
  } else { // Radwand hinter Glas
    const s = sx, uE = s.L - F, u0 = Math.max(1, uE * 0.15), u1 = Math.min(uE - 1, u0 + 8);
    for (let k = 0; k < 2; k++) for (let u = u0 + 1; u < u1 - 1; u += 1.8) if (!K.zu) rad(s, u, 2.3 + k * 2.1, -T + 0.25, waehle(r, ['#e04b3a', '#1f6fb5', '#f2c14e', '#2b2b2b', '#f1f1ee']));
  }
  // Eckfinne in Rot
  for (const s of K.seiten) {
    s.q(s.L - F, s.L, 0, H + 3.2, -F, 0.35, K.ohneLogo ? '#b3aaa4' : HS_ROT);
    hsLogoSenkrecht(K, s, s.L - F / 2, H + 2.7, 0.35, F * 0.72, H + 2.4);
  }
  // Vordach über dem Eingang, Fahnen, Kampagne
  const ein = sz.L - F;
  sz.q(ein * 0.62 - 3.2, ein * 0.62 + 3.2, 4.0, 4.35, 0, 2.6, HS_BLAU);
  sz.q(ein * 0.62 - 3.2, ein * 0.62 + 3.2, 4.12, 4.24, 2.6, 2.66, HS_ROT);
  if (n >= 2) {
    const s = atrium.s === sz ? sx : sz, uE = s.L - F;
    kampagne(K, s, uE * 0.08, uE * 0.08 + Math.min(uE * 0.4, 14), EG_S + 0.4, H - 0.4, 0.25, ['#1f6fb5', '#2f8f5b', '#2b2b2b', '#e8562a'][v % 4]);
  } else {
    const uE = sz.L - F;
    kampagne(K, sz, 1.5, Math.min(uE * 0.45, 22), 4.4, H - 0.3, 0.25, ['#1f6fb5', '#2f8f5b', '#2b2b2b', '#e8562a'][v % 4]);
    const lu = uE * 0.7, lh = 2.3, lb = plakatBreite('HARTWIG SPORT', lh * 0.58) + lh * 1.8;
    hsLogo(K, sz, lu, H + 3.8, -1.4, lh, { grund: kern });
    for (let k = 0; k <= 4; k++) { const u = lu - lb / 2 + k * lb / 4; sz.q(u - 0.07, u + 0.07, H + 1.6, H + 5.2, -1.7, -1.55, '#4a4f55'); }
    sz.q(lu - lb / 2, lu + lb / 2, H + 2.0, H + 2.12, -1.7, -1.55, '#4a4f55');
  }
  radstaender(K, sx, sx.L * 0.25, 5, 1.6);
  if (n === 1) { // Flugdach über der Glashalle mit schlanken Stützen
    const ue = 2.6, yF = H + 1.1;
    S.quader(x0 + 1, yF, z0 + 1, x0 + w + ue, yF + 0.5, z0 + d + ue, '#d9dad6');
    S.quader(x0 + 1, yF + 0.12, z0 + d + ue, x0 + w + ue, yF + 0.32, z0 + d + ue + 0.05, HS_ROT);
    S.quader(x0 + w + ue, yF + 0.12, z0 + 1, x0 + w + ue + 0.05, yF + 0.32, z0 + d + ue, HS_ROT);
    for (let x = x0 + 4; x < x0 + w - F; x += 8) zyl(S, x, 0.3, z0 + d + ue - 0.4, 0.12, yF - 0.3, '#d9dcde', 8);
    for (let z = z0 + 4; z < z0 + d - F; z += 8) zyl(S, x0 + w + ue - 0.4, 0.3, z, 0.12, yF - 0.3, '#d9dcde', 8);
  }
  // Dach
  K.Hw = H; K.tRelief = 0.3;
  attika(S, x0, z0, w, d, H + 0.15, 0.95, rahmenF, 0.3);
  if (n === 1) dachfeld(K, x0 + 2, z0 + 2, x0 + w + 1.5, z0 + d + 1.5, H + 1.6, { h: true, farbe: '#cfd2d4' });
  else dachfeld(K, x0 + 1, z0 + 1, x0 + w - 1.5, z0 + d - 1.5, H + 0.3, { h: true, farbe: '#cfd2d4' });
  return H + 3.2;
}

// ---------------------------------------------------------------- Familie 2: Geschäftshaus der 70er/80er
function familie2(K) {
  const { S, x0, z0, w, d, n, r, v } = K;
  const pal = [['#c9b79c', '#6b4a33'], ['#e07b39', '#3a3a3a'], ['#d9d4c7', '#8a6a3a'], ['#9fb4a5', '#3f4a4f'], ['#b9bec2', '#2f3b46'], ['#e2c35a', '#4a3b2a'], ['#c97f5f', '#40352d'], ['#d6cfbf', '#55524c']][v];
  const brF = K.c(pal[0]), rF = pal[1];
  const H = n === 1 ? EG_S + 3.2 : EG_S + (n - 1) * OG_S;
  const kr = 1.2; // Auskragung: EG springt zurück
  S.quader(x0, 0, z0, x0 + w - kr - 1.6, EG_S, z0 + d - kr - 1.6, '#4a5056');
  S.quader(x0, EG_S, z0, x0 + w, H, z0 + d, K.c(dunkler(pal[0], 0.04)));
  const [sz, sx] = K.seiten;
  const panelU = sx.L >= 18 ? 7 : 0; // geschlossene Werbewand auf +x am hinteren Ende
  for (const s of K.seiten) {
    // EG: modernisierte Ladenfront in Hartwig-Sport-Blau unter der Auskragung
    const ax = buchten(0, s.L, 5.0, 0.5);
    const grp = K.gruppen(0);
    ax.forEach(([a, b], i) => {
      const einU = s === sz ? Math.floor(ax.length * 0.55) : -1;
      s.q(a - 0.25, a + 0.25, 0, EG_S, -kr - 0.3, -kr + 0.15, HS_BLAU);
      if (i === einU) {
        s.q(a, b, 0.3, 4.0, -kr - 1.7, -kr - 1.6, GLAS_D);
        s.q(a, b, 0.3, 0.4, -kr - 1.6, 0, BODEN);
        s.q(a, a + 0.2, 0.3, 4.2, -kr - 0.2, -kr + 0.2, HS_ROT); s.q(b - 0.2, b, 0.3, 4.2, -kr - 0.2, -kr + 0.2, HS_ROT);
        K.glas.push({ s, a, b, y0: 0.3, y1: 4.0, t: -kr - 1.5, eg: true, tuer: true });
        return;
      }
      s.q(a, b, 0, 0.55, -kr - 0.1, -kr + 0.05, '#2b3036');
      vitrine(K, s, a, b, 0.55, 4.2, -kr, 1.6, grp[i % grp.length], { rueck: GLAS });
      s.q(a, b, 4.2, EG_S, -kr - 0.1, -kr + 0.05, HS_BLAU);
    });
    if (ax.length) s.q(ax[ax.length - 1][1] + 0.25, s.L, 0, EG_S, -kr - 0.3, -kr + 0.15, HS_BLAU);
    // Obergeschosse: Brüstungsbänder + Fensterbänder
    const nOG = n === 1 ? 0 : n - 1;
    const uW = s === sx ? panelU : 0;
    for (let k = 0; k < nOG; k++) {
      const y0 = EG_S + k * OG_S;
      s.q(uW, s.L, y0, y0 + 1.35, 0, 0.25, brF);
      for (let u = uW + 1.25; u < s.L; u += 1.25) s.q(u - 0.025, u + 0.025, y0 + 0.05, y0 + 1.3, 0.25, 0.28, dunkler(brF, 0.08));
      s.q(uW, s.L, y0 + 1.35, y0 + OG_S - 0.35, -0.12, -0.02, GLAS);
      for (let u = uW + 0.8; u < s.L; u += 1.6) s.q(u - 0.06, u + 0.06, y0 + 1.35, y0 + OG_S - 0.35, -0.05, 0.05, rF);
      s.q(uW, s.L, y0 + OG_S - 0.35, y0 + OG_S, 0, 0.12, rF);
      // halb heruntergelassene Lamellen
      for (let u = uW + 0.8; u < s.L - 1.6; u += 1.6) if (r() < 0.35) s.q(u + 0.08, u + 1.52, y0 + OG_S - 0.35 - zw(r, 0.5, 1.6), y0 + OG_S - 0.35, -0.04, 0.0, '#d8d4c8');
    }
    if (nOG === 0) { // eingeschossig: hohe Blende
      s.q(0, s.L, EG_S, H, 0, 0.2, brF);
      for (let u = 1.25; u < s.L; u += 1.25) s.q(u - 0.025, u + 0.025, EG_S, H, 0.2, 0.23, dunkler(brF, 0.08));
    }
    s.q(0, s.L, H - 0.1, H + 0.7, 0, 0.3, rF);
    // Firmenschild auf der Blende über dem EG
    hsLogo(K, s, (s === sx ? panelU : 0) + (s.L - (s === sx ? panelU : 0)) * 0.5, n === 1 ? EG_S + 1.6 : EG_S + 0.68, 0.3, n === 1 ? 1.8 : 1.05, { grund: brF });
    // Patina
    if (K.alt) for (let i = 0; i < 6; i++) { const u = zw(r, 0, s.L - 1); s.q(u, u + zw(r, 0.3, 0.8), Math.max(EG_S, H - zw(r, 2, 7)), H, 0.29, 0.31, dunkler(brF, 0.14)); }
  }
  // Werbewand mit großer SPORT-Schrift (senkrecht, Einzelbuchstaben)
  if (panelU) {
    const s = sx, y0 = EG_S, y1 = H + 0.7;
    s.q(0, panelU, y0, y1 + (n >= 3 ? 0 : 1.5), 0, 0.45, '#f2f1ec');
    s.q(0.3, panelU - 0.3, y0, y0 + 0.4, 0.45, 0.6, HS_ROT);
    // Lettern so groß, wie die Werbewand breit ist, damit SPORT aus Spielabstand lesbar bleibt
    const yo = y1 + (n >= 3 ? 0 : 1.5), buch = [...'SPORT'], hb = Math.min(panelU * 0.8, (yo - y0 - 1.2) / 5);
    // niedrige Wand: SPORT waagrecht und groß statt fünf winziger Einzelbuchstaben übereinander
    if (hb < 1.6) {
      const ph = passend('SPORT', panelU - 1.0, (yo - y0 - 1.0) * 0.6);
      if (K.ohneLogo) s.q(0.5, panelU - 0.5, (y0 + yo) / 2 - ph * 0.4, (y0 + yo) / 2 + ph * 0.4, 0.45, 0.48, '#e2e0d8');
      else plakat(K.scene, s, 'SPORT', panelU / 2, (y0 + 0.4 + yo) / 2, 0.5, ph, K.alt ? dunkler(HS_ROT, 0.15) : HS_ROT);
    } else buch.forEach((c, i) => {
      const yy = y1 + (n >= 3 ? 0 : 1.5) - 0.6 - hb * (i + 0.5);
      if (K.ohneLogo) { s.q(panelU / 2 - hb * 0.35, panelU / 2 + hb * 0.35, yy - hb * 0.4, yy + hb * 0.4, 0.45, 0.48, '#e2e0d8'); return; }
      const kaputt = K.alt && i === 3;
      plakat(K.scene, s, c, panelU / 2, yy, 0.5, hb * 1.2, kaputt ? dunkler(HS_ROT, 0.12) : HS_ROT, null, { rz: 0 }); // Q36: nie gekippt
    });
  }
  // Treppenhaus-Glasstreifen auf +z bei 3 Etagen
  if (n >= 3 && v % 2 === 0) {
    const u = sz.L * 0.22;
    sz.q(u - 1.8, u + 1.8, EG_S, H + 2.2, 0, 0.6, K.c(pal[0]));
    sz.q(u - 1.3, u + 1.3, EG_S + 0.4, H + 1.8, 0.6, 0.66, GLAS_HELL);
    for (let y = EG_S + 1.1; y < H + 1.8; y += 1.1) sz.q(u - 1.3, u + 1.3, y, y + 0.08, 0.6, 0.72, rF);
    sz.q(u - 1.9, u + 1.9, H + 2.2, H + 2.45, -3.5, 0.75, rF);
  }
  // Dach
  K.Hw = H; K.tRelief = 0.3;
  S.quader(x0, H, z0, x0 + w, H + 0.4, z0 + d, KIES);
  S.quader(x0, H + 0.4, z0 + d - 0.3, x0 + w, H + 0.7, z0 + d, rF); S.quader(x0 + w - 0.3, H + 0.4, z0, x0 + w, H + 0.7, z0 + d, rF);
  dachfeld(K, x0 + 1, z0 + 1, x0 + w - 2, z0 + d - 6, H + 0.4, { kuppeln: w * d > 1200, solar: false });
  { // Dachreklame auf Stahlgerüst an der +z-Kante
    const lh = clamp(sz.L * 0.065, 2.0, 3.0), lu = sz.L * 0.6, lb = plakatBreite('HARTWIG SPORT', lh * 0.58) + lh * 1.8;
    for (let k = 0; k <= 4; k++) { const u = lu - lb / 2 + k * lb / 4; sz.q(u - 0.07, u + 0.07, H + 0.4, H + 1.3 + lh * 1.3, -1.6, -1.45, '#4a4f55'); sz.kipp(0.07, 1.8, 0.07, u, H + 1.2, -2.1, '#4a4f55', 0, 0.6); }
    sz.q(lu - lb / 2, lu + lb / 2, H + 1.0, H + 1.12, -1.6, -1.45, '#4a4f55');
    hsLogo(K, sz, lu, H + 1.4 + lh * 0.65, -1.4, lh, { grund: brF });
  }
  if (r() < 0.7) { zyl(S, x0 + 2.5, H + 0.4, z0 + 2.5, 0.08, 6, '#8a9096', 5); S.box(1.6, 0.08, 0.08, x0 + 2.5, H + 5.6, z0 + 2.5, '#8a9096'); S.box(0.08, 0.08, 1.2, x0 + 2.5, H + 4.8, z0 + 2.5, '#8a9096'); }
  return H + 2.5;
}

// ---------------------------------------------------------------- Familie 3: Fachmarkt-Box mit Parkplatz
function familie3(K) {
  const { S, scene, x0, z0, w, d, n, r, v } = K;
  const H = n === 1 ? 7.5 : EG_S + (n - 1) * OG_S + 1.0;
  const blech = ['#e4e6e7', '#eceae4', '#dfe3e6', '#e9e9e6'][v % 4];
  const D = 1.5;
  S.quader(x0, 0, z0, x0 + w - D, 4.3, z0 + d - D, '#59636b');
  S.quader(x0, 4.3, z0, x0 + w, H, z0 + d, blech);
  const [sz, sx] = K.seiten;
  const pu = sz.L * (0.55 + (v % 3) * 0.08), pw = 9;   // Eingangsportal
  for (const s of K.seiten) {
    // Trapezblech-Rippen
    for (let u = 0.4; u < s.L; u += 0.8) {
      if (s === sz && u > pu - pw / 2 - 0.3 && u < pu + pw / 2 + 0.3) continue;
      s.q(u - 0.12, u + 0.12, 4.3, H - 1.8, 0, 0.1, dunkler(blech, 0.035));
    }
    s.q(0, s.L, 0, 0.6, 0, 0.14, '#7c838a');
    // Blaue Blende mit rotem Streifen
    s.q(0, s.L, H - 1.9, H + 0.4, 0, 0.3, HS_BLAU);
    s.q(0, s.L, H - 1.95, H - 1.75, 0.3, 0.36, HS_ROT);
  }
  // Schaufensterband auf +z links und rechts vom Portal
  const grp = K.gruppen(0);
  const fensterSeg = [[1.5, pu - pw / 2 - 1.0], [pu + pw / 2 + 1.0, sz.L - 1.5]];
  let ii = 0;
  for (const [u0, u1] of fensterSeg) for (const [a, b] of buchten(u0, u1, 4.2, 0.25)) {
    sz.q(a - 0.13, a, 0.6, 3.9, -0.05, 0.15, '#59636b');
    vitrine(K, sz, a, b, 0.6, 3.9, 0.0, 1.4, grp[ii++ % grp.length], { rueck: GLAS });
    sz.q(b, b + 0.13, 0.6, 3.9, -0.05, 0.15, '#59636b');
  }
  // +x: Lieferzone mit Rolltor und Rampe
  {
    const s = sx, u0 = s.L * 0.18, u1 = u0 + 4.5;
    s.q(u0, u1, 1.3, 5.2, 0.0, 0.08, '#a3a9ae');
    for (let y = 1.6; y < 5.1; y += 0.35) s.q(u0, u1, y, y + 0.06, 0.08, 0.12, '#8a9095');
    s.q(u0 - 1.0, u1 + 1.0, 0.3, 1.3, 0, 2.5, '#a19c93');
    s.q(u0 - 1.2, u1 + 1.2, 5.4, 5.6, 0, 2.2, '#5f676e');
    for (let k = 0; k < 4; k++) s.kipp(1.2, 0.02, 0.4, u1 + 3 + k * 1.6, 0.32, 3.2, '#f2c14e', 0, 0); // Sperrfläche
    // Seitenfenster mit Radwand
    const a = s.L * 0.45, b = Math.min(s.L - 2, a + 10);
    if (b - a > 4) for (const [aa, bb] of buchten(a, b, 4.5, 0.25)) vitrine(K, s, aa, bb, 0.6, 3.9, 0, 1.4, 'rad', { rueck: GLAS });
    hsLogo(K, s, s.L * 0.55, H - 0.75, 0.32, 1.85, { grund: HS_BLAU, band: HS_BLAU });
  }
  // Portal: Glas-Windfang + rotes Hochportal
  {
    const s = sz, a = pu - pw / 2, b = pu + pw / 2;
    s.q(a, b, 0, H + 2.2, -0.2, 0.9, HS_ROT);
    s.q(a + 1.0, b - 1.0, 0.3, 5.0, 0.9, 3.4, GLAS_HELL);
    s.q(a + 1.0, b - 1.0, 5.0, 5.3, 0.9, 3.6, '#f4f3ef');
    for (let u = a + 1.0; u <= b - 0.99; u += (pw - 2) / 4) s.q(u - 0.06, u + 0.06, 0.3, 5.0, 3.4, 3.48, '#eef1f2');
    s.q(pu - 1.4, pu + 1.4, 0.3, 2.9, 3.4, 3.5, K.zu ? '#8e9499' : GLAS_D);
    K.glas.push({ s, a: pu - 1.4, b: pu + 1.4, y0: 0.3, y1: 2.9, t: 3.5, eg: true, tuer: true });
    s.q(a + 0.8, b - 0.8, 5.6, H + 1.6, 0.9, 0.95, '#ffffff');
    if (!K.ohneLogo) { plakat(scene, s, 'H', pu, (5.6 + H + 1.6) / 2 + 0.2, 0.97, Math.min(pw - 2.5, H - 3.0), HS_ROT); }
    K.logos.push({ s, u0: a + 0.8, u1: b - 0.8, y0: 5.6, y1: H + 1.6, t: 0.95, grund: '#ffffff' });
  }
  // Vordach mit Stützen entlang +z
  {
    const s = sz, y = 4.2, tief = 3.2;
    for (const [u0, u1] of [[0, pu - pw / 2], [pu + pw / 2, s.L + tief]]) {
      s.q(u0, u1, y, y + 0.45, 0, tief, '#f4f3ef');
      s.q(u0, u1, y + 0.1, y + 0.3, tief, tief + 0.05, HS_ROT);
      for (let u = u0 + 3; u < Math.min(u1, s.L) - 1; u += 7) { const [x, z] = s.welt(u, tief - 0.4); zyl(S, x, 0.3, z, 0.12, y - 0.3, '#5f676e', 8); }
    }
    radstaender(K, s, pu + pw / 2 + 2, 6, 1.9);
  }
  hsLogo(K, sz, (pu - pw / 2) * 0.5, H - 0.75, 0.32, 1.85, { grund: HS_BLAU });
  // Parkplatz vor +z
  const zp = z0 + d, y = 0.3;
  S.quader(x0, y - 0.02, zp + 3.4, x0 + w, y + 0.03, zp + PARK, '#868c93');
  S.quader(x0, y, zp + PARK - 1.8, x0 + w, y + 0.18, zp + PARK, '#bdb8ad');
  for (let x = x0 + 3; x < x0 + w - 1; x += 7) busch(S, r, x, y + 0.18, zp + PARK - 0.9, 0.9);
  parkreihe(S, r, x0 + 1, x0 + w - 6, zp + 10.2, 5, y + 0.03, K.zu ? 0.1 : 0.65);
  for (let x = x0 + 4; x < x0 + w - 6; x += 6) S.box(2.2, 0.03, 0.15, x, y + 0.05, zp + 6.8, '#f2f1ec');
  for (let i = 0; i < 4; i++) S.box(0.5, 0.03, 2.4, x0 + pu - 2 + i * 1.0, y + 0.05, zp + 6.8, '#f2f1ec');
  if (!K.zu && K.leute) for (let i = 0; i < 3; i++) mensch(S, r, x0 + pu + zw(r, -4, 4), y, zp + zw(r, 1.5, 9));
  // Pylon an der Ecke
  {
    const px = x0 + w - 2.6, pz = zp + PARK - 3.2, ph = Math.max(H + 4, 11);
    S.box(2.6, ph, 0.9, px, ph / 2, pz, HS_BLAU);
    S.box(3.0, 0.4, 1.2, px, 0.5, pz, '#5f676e');
    const sp = new Seite(S, px - 1.3, pz - 0.45, 2.6, 0.9, '+z');
    hsLogoSenkrecht(K, sp, 1.3, ph - 0.3, 0, 2.1, ph - 1.2);
    S.box(0.95, ph - 1.2, 2.2, px + 1.3 - 0.02, (ph - 1.2) / 2 + 0.3, pz, HS_BLAU);
    const sp2 = new Seite(S, px - 1.3, pz - 0.45, 2.6, 0.9, '+x');
    if (!K.ohneLogo) for (const [i, t] of ['RAD', 'LAUF', 'BERG'].entries()) {
      sp2.q(-0.45 + 0.1 + 0.0, 0.45, ph - 3 - i * 1.6, ph - 1.8 - i * 1.6, 0.03, 0.08, ['#e04b3a', '#f2c14e', '#4caf50'][i]);
      plakat(scene, sp2, t, 0, ph - 2.4 - i * 1.6, 0.1, 0.6, '#ffffff');
    }
  }
  // Dach
  for (const s of K.seiten) wand(s, 0, s.L, 0, 4.3, -D, 0, oeffnungen(K, s), dunkler(blech, 0.05));
  for (const s of K.seiten) s.q(0, s.L, 4.2, 4.35, 0, 0.2, '#7c838a');
  K.Hw = H; K.tRelief = 0.36;
  attika(S, x0, z0, w, d, H + 0.4, 0.3, HS_BLAU, 0.3);
  if (w * d > 1400 && rng(String(K.haus.id) + '/parkdeck')() < 0.5) parkdeckSport(K, x0 + 0.6, z0 + 0.6, x0 + w - 0.6, z0 + d - 0.6, H + 0.55);
  else dachfeld(K, x0 + 1, z0 + 1, x0 + w - 1, z0 + d - 1, H + 0.55, { h: true, solar: w * d > 1500 });
  return Math.max(H + 4, 11);
}

// ---------------------------------------------------------------- Familie 4: Ladenfläche im Einkaufszentrum (Mall-Front)
const MALLS = ['LINDENGALERIE', 'MARKTQUARTIER', 'STADTCARRÉ', 'WALLARKADEN', 'BRÜCKENHOF', 'KÖNIGSPASSAGE', 'RATHAUSGALERIE', 'ALTMARKT-ARKADEN'];
// Mall-Typen: Glastonne (2000er, hell), Klinker (80er, Glaspyramide), Medien (dunkel, Videowand),
// Waschbeton (70er, Arkade, Parkhaus mit Spindel), Galerie (2010er, Glas, Wellendach, Gründach)
const MALL_TYPEN = ['glastonne', 'klinker', 'medien', 'waschbeton', 'galerie'];
const MALL_FARBE = {
  glastonne: ['#e3e0d9', '#dcd8cf', '#e6e3dd'], klinker: ['#c98a6a', '#b97a5c', '#c4906f'], medien: ['#4a5056', '#3d4349', '#545b61'],
  waschbeton: ['#b8af9c', '#ada491', '#c0b8a6'], galerie: ['#e9eef0', '#e2e8ea', '#eef0ee'],
};
/** Spindelrampe eines Parkhauses (Zylinder mit Rampenringen). */
function spindel(S, x, z, y0, y1, R) {
  zyl(S, x, y0, z, R, y1 - y0, '#bdb7aa', 16);
  for (let y = y0 + 1.2; y < y1; y += 1.6) zyl(S, x, y, z, R + 0.25, 0.35, '#d9d4c8', 16);
  zyl(S, x, y0, z, R * 0.35, y1 - y0 + 1.2, '#9e988c', 10);
}
function familie4(K) {
  const { S, scene, x0, z0, w, d, n, r, v } = K;
  const M = K.M, xm = x0 - M;
  const nr = parseInt(String(K.haus.id).replace(/\D/g, ''), 10) || 0;
  // Zehnerstelle der Hausnummer mischt mit: sonst bekommen Häuser mit gleicher Fassade (z. B. S001 und S021) dieselbe Mall
  const zehn = Math.floor(nr / 10);
  const typ = MALL_TYPEN[(nr * 3 + v + zehn) % MALL_TYPEN.length];
  const front = (nr + (v >> 1) + zehn) % 4; // Ladenfront: 0 Rahmen, 1 rotes Portal, 2 Medienband, 3 Lamellen
  const Hs = n === 1 ? 6.5 : EG_S + (n - 1) * OG_S;
  const Hb = Math.max(Hs, EG_S + OG_S) + ({ waschbeton: 3.2, galerie: 1.4 }[typ] ?? 2.2);
  const mallF = MALL_FARBE[typ][v % 3], mallD = dunkler(mallF, 0.06);
  const rahmenF = [HS_WEISS, HS_BLAU, '#c9ccce', HS_WEISS][(v >> 1) % 4];
  const logoBand = rahmenF === HS_BLAU ? '#2b4470' : HS_BLAU;
  K.Hw = Hb + 1.6; K.tRelief = 1.0;
  S.quader(xm, 0, z0, x0, Hb, z0 + d - 0.5, mallF);
  S.quader(x0 - 0.01, 0, z0, x0 + w - 2.75, Hb, z0 + d - 2.75, mallF);
  S.quader(x0 + w - 2.8, Hs + 0.2, z0, x0 + w - 0.5, Hb, z0 + d - 0.5, mallF);
  S.quader(x0, Hs + 0.2, z0 + d - 2.8, x0 + w - 0.5, Hb, z0 + d - 0.5, mallF);
  const uMall = Math.min(4, d * 0.15);
  S.quader(x0, 0, z0, x0 + w - 0.5, Hb, z0 + uMall - 0.5, mallF);
  const sMall = new Seite(S, xm, z0, M, d, '+z');
  const name = MALLS[(nr + Math.floor(r() * 3)) % MALLS.length];
  // Mall-Läden im EG (Rhythmus und Fassung je Typ)
  const laeden = ['Café', 'Optik', 'Bäckerei', 'Schuhe', 'Mode', 'Handy', 'Apotheke', 'Eis', 'Bücher', 'Blumen'];
  const portalU = Math.max(9, M * ({ galerie: 0.6, waschbeton: 0.3 }[typ] ?? 0.42));
  const ladenSeg = [[0.5, portalU - 5], [portalU + 5, M - 0.3]];
  const raster = { glastonne: 6.5, klinker: 5.0, medien: 7.5, waschbeton: 5.5, galerie: 8.0 }[typ];
  const arkade = typ === 'waschbeton';
  for (const [u0, u1] of ladenSeg) for (const [a, b] of buchten(u0, u1, raster, 0.6)) {
    const pf = typ === 'klinker' ? '#9b5a45' : typ === 'galerie' ? '#f4f4f2' : typ === 'medien' ? '#2b3036' : '#bfc5c9';
    sMall.q(a - 0.3, a, 0, 5.2, -0.6, 0.3, pf); sMall.q(b, b + 0.3, 0, 5.2, -0.6, 0.3, pf);
    sMall.q(a, b, 0.4, typ === 'galerie' ? 4.8 : 3.6, -0.9, -0.8, typ === 'galerie' ? '#7fa3b6' : '#5e7c8e');
    sMall.q(a, b, 0.3, 0.4, -0.8, 0.5, '#d6d2c8');
    const c = waehle(r, ['#2f6f8f', '#3f7d56', '#8c3b3b', '#d39a2b', '#6b4f8f', '#2b2b2b', '#c2487a', '#1f7f86']);
    const t = laeden[Math.floor(r() * laeden.length)];
    if (typ === 'galerie') { // Fahnenschild statt Blende
      sMall.q((a + b) / 2 - 1.6, (a + b) / 2 + 1.6, 4.9, 5.8, 0.3, 0.42, c);
      plakat(scene, sMall, t, (a + b) / 2, 5.35, 0.44, passend(t, 2.9, 0.6), '#ffffff');
    } else {
      sMall.q(a, b, 3.6, 5.2, -0.5, 0.3, c);
      plakat(scene, sMall, t, (a + b) / 2, 4.4, 0.32, passend(t, b - a - 1, 0.8), '#ffffff');
    }
    if (!K.zu) puppe(sMall, a + 1.3, 0.4, -0.5, waehle(r, KLEID), '#2b2b2b');
  }
  // Fuge zwischen Mall und Hartwig-Abschnitt: durchgehende Lisene
  sMall.q(M - 1.0, M + 0.6, 0, Hb + 0.5, -0.6, 1.05, typ === 'klinker' ? '#9b5a45' : dunkler(mallF, 0.1));
  // OG der Mall
  if (typ === 'klinker') {
    for (let y = 5.6; y < Hb - 1; y += 0.5) sMall.q(0, M - 1, y, y + 0.04, 0, 0.04, mallD);
    for (let y = 7.5; y < Hb - 1; y += 3.5) sMall.q(0, M - 1, y, y + 0.35, 0, 0.18, '#e6dccb');
    for (let u = 2.5; u < M - 2; u += 4) sMall.q(u - 0.4, u + 0.4, 5.8, Hb - 1.2, -0.04, 0.03, GLAS);
  } else if (typ === 'medien' && M >= 22) {
    for (let u = 3; u < M - 0.5; u += 3) sMall.q(u - 0.03, u + 0.03, 5.2, Hb - 0.4, 0, 0.06, heller(mallF, 0.06));
    const a = 1.5, b = Math.min(M - 12, 16, portalU - 6); // nie hinter den Portalbau ziehen (sonst bleibt nur „NE“ lesbar)
    if (b - a > 5) {
      sMall.q(a - 0.25, b + 0.25, 5.6, Hb - 0.8, 0, 0.3, '#1f2328');
      const bg = ['#e8562a', '#1f6fb5', '#2f8f5b'][v % 3];
      sMall.q(a, b, 5.85, Hb - 1.05, 0.3, 0.36, K.zu ? '#2b2f33' : bg);
      if (!K.zu) { const t = waehle(r, ['SALE', 'NEU HIER', 'WOCHENENDE']); plakat(scene, sMall, t, (a + b) / 2, (5.85 + Hb - 1.05) / 2, 0.38, passend(t, (b - a) * 0.75, (Hb - 7) * 0.5), '#ffffff'); }
    }
  } else if (arkade) { // Waschbeton: Arkade mit Rundstützen, schwere Brüstungsbänder
    sMall.q(0, M - 1, 4.4, 5.3, 0, 3.2, '#a39a87');
    for (let u = 2; u < M - 1.5; u += 5.5) { const [x, z] = sMall.welt(u, 2.7); zyl(S, x, 0.3, z, 0.35, 4.1, '#c9c1ae', 10); }
    for (let y = 5.3; y < Hb - 1; y += 3.0) { sMall.q(0, M - 1, y, y + 1.6, 0, 0.5, mallF); sMall.q(0, M - 1, y + 1.6, y + 3.0, -0.2, -0.1, '#4a5a64'); for (let u = 1.5; u < M - 1; u += 1.5) sMall.q(u - 0.04, u + 0.04, y + 1.6, y + 3.0, -0.1, 0, '#6b6458'); }
    for (let u = 0.6; u < M - 1; u += 1.2) sMall.q(u - 0.05, u + 0.05, 5.3, Hb - 0.4, 0.5, 0.53, mallD);
  } else if (typ === 'galerie') { // Glasfassade mit weißen Pfosten
    sMall.q(0, M - 1, 5.2, Hb - 0.2, -0.05, 0.02, '#8fb3c4');
    for (let u = 0.8; u < M - 1; u += 1.6) sMall.q(u - 0.06, u + 0.06, 5.2, Hb - 0.2, 0, 0.18, '#f4f4f2');
    for (let y = 5.2; y < Hb; y += OG_S) sMall.q(0, M - 1, y - 0.15, y + 0.15, 0, 0.25, '#f4f4f2');
    for (let i = 0; i * 3 < M - 2; i++) sMall.kipp(3.1, 0.18, 3.0, i * 3 + 1.5, 5.0 + (i % 2) * 0.45, 1.4, '#f4f4f2', (i % 2 ? -1 : 1) * 0.15); // Wellendach
  } else {
    for (let y = 5.2; y < Hb - 1; y += 1.4) sMall.q(0, M - 1, y, y + 0.06, 0, 0.06, mallD);
    for (let u = 3; u < M - 1; u += 3) sMall.q(u - 0.03, u + 0.03, 5.2, Hb - 0.4, 0, 0.06, mallD);
  }
  sMall.q(0, M, Hb - 0.4, Hb + 0.5, 0, 0.35, typ === 'medien' ? '#2b3036' : '#cfd3d6');
  // Mall-Portal mit Name
  {
    const pu0 = portalU - 4.2, pu1 = portalU + 4.2, ph = Hb + 2.5;
    const pF = { klinker: '#e6dccb', medien: '#2b3036', waschbeton: '#a39a87', galerie: '#f4f4f2' }[typ] ?? '#d0d6da';
    sMall.q(pu0, pu1, 0, ph, 0, 2.0, pF);
    sMall.q(pu0 + 0.6, pu1 - 0.6, 0.3, ph - 2.0, 2.0, 2.06, '#6f93a6');
    for (let u = pu0 + 0.6; u <= pu1 - 0.5; u += 1.2) sMall.q(u - 0.05, u + 0.05, 0.3, ph - 2.0, 2.0, 2.12, '#eef1f2');
    for (let y = 3.2; y < ph - 2.0; y += 1.6) sMall.q(pu0 + 0.6, pu1 - 0.6, y - 0.05, y + 0.05, 2.0, 2.1, '#eef1f2');
    sMall.q(pu0 + 2, pu1 - 2, 0.3, 3.0, 2.0, 2.16, GLAS_D);
    sMall.q(pu0 - 1, pu1 + 1, 3.3, 3.7, 0, 4.4, '#eef1f2');
    plakat(scene, sMall, name, portalU, ph - 1.0, 2.1, passend(name, pu1 - pu0 - 0.8, 1.2), typ === 'medien' ? '#ffffff' : '#2b3a4a', typ === 'medien' ? '#2b3036' : '#ffffff');
    sMall.q(pu0, pu1, ph, ph + 0.3, -0.2, 2.2, '#bfc5c9');
    if (arkade) { // Mallname zusätzlich in großen Lettern auf dem Dachrand
      const hb = passend(name, M * 0.55, 2.4);
      plakat(scene, sMall, name, M * 0.35, Hb + 0.5 + hb * 0.55, -0.3, hb, '#c8102e');
      for (const du of [-M * 0.2, 0, M * 0.2]) sMall.q(M * 0.35 + du - 0.06, M * 0.35 + du + 0.06, Hb + 0.4, Hb + 0.6 + hb * 0.4, -0.6, -0.45, '#4a4f55');
    }
  }
  // Hartwig-Sport-Abschnitt auf +z (Ladenbreite) und +x (ganze Tiefe), vier Fassungen
  const rb = 1.2, rt = 1.0;
  const grp0 = K.gruppen(0);
  const pfeiler = ['#1d2f4f', HS_BLAU, '#1f2328', '#eef1f2'][front];
  for (const s of K.seiten) {
    const u0 = s.seite === '+z' ? 0 : Math.min(4, s.L * 0.15), u1 = s.L;
    const ebenen = n === 1 ? [[0.3, Hs]] : Array.from({ length: n }, (_, e) => [e === 0 ? 0.3 : EG_S + (e - 1) * OG_S, e === 0 ? EG_S : EG_S + e * OG_S]);
    let tuer = null;
    ebenen.forEach(([y0, y1], e) => {
      const grp = e === 0 ? grp0 : K.gruppen(e);
      const ax = buchten(u0 + rb - 0.5, u1 - rb - 0.15, 5.2, 0.25);
      ax.forEach(([a, b], i) => {
        if (e === 0 && i === (s.seite === '+z' ? Math.min(1, ax.length - 1) : -1)) {
          s.q(a, b, 0.3, 3.4, -2.8, -2.7, GLAS_D); s.q(a, b, 0.3, 0.4, -2.7, 0, BODEN);
          K.glas.push({ s, a, b, y0: 0.3, y1: 3.4, t: -2.6, eg: true, tuer: true });
          s.q(a, b, 3.4, y1, -0.3, 0, front === 2 ? '#1f2328' : HS_BLAU);
          tuer = [a, b];
          return;
        }
        vitrine(K, s, a, b, y0, y1, 0, 2.6, grp[(i + e) % grp.length], e ? { rueck: '#dfe2df' } : {});
        s.q(b, b + 0.25, y0, y1, -0.1, 0.15, pfeiler);
      });
      if (e > 0) s.q(u0 + rb - 0.5, u1 - rb, y0 - 0.2, y0 + 0.3, -0.1, 0.2, pfeiler);
    });
    const bandY0 = Hs + 0.2, bandY1 = Hb + 1.6, lhMax = Math.min(1.9, (bandY1 - bandY0 - 0.4) * 0.62);
    if (front === 0) { // umlaufender Mall-Rahmen
      s.q(u0 - 0.5, u0 + rb - 0.5, 0, bandY1, -0.5, rt, rahmenF);
      s.q(u1 - rb, u1, 0, bandY1, -0.5, rt, rahmenF);
      s.q(u0 - 0.5, u1, bandY0, bandY1, -0.5, rt, rahmenF);
      s.q(u0 - 0.5, u1, bandY1, bandY1 + 0.25, -0.5, rt + 0.15, dunkler(rahmenF, 0.08));
      s.q(u1 - rb - 0.15, u1 - rb, 0.3, bandY0, 0, rt, HS_ROT);
      hsLogo(K, s, (u0 + rb + u1 - rb) / 2, (bandY0 + bandY1) / 2, rt, lhMax, { grund: rahmenF, band: logoBand });
    } else if (front === 1) { // blaue Blende, rotes Hochportal mit großem H am Eingang
      s.q(u0 - 0.5, u1, bandY0, bandY1, -0.5, 0.6, HS_BLAU);
      s.q(u0 - 0.5, u1, bandY1, bandY1 + 0.25, -0.5, 0.75, '#2b4470');
      s.q(u1 - 1.0, u1, 0, bandY1, -0.5, 0.6, HS_BLAU);
      let lu0 = u0 + 0.5, lu1 = u1 - 1;
      if (tuer) {
        const pa = tuer[0] - 0.8, pb = tuer[1] + 0.8;
        s.q(pa, pb, 0, bandY1 + 2.2, 0, 1.4, HS_ROT);
        s.q(pa + 0.6, pb - 0.6, 0.3, 3.6, 1.4, 1.46, GLAS_D);
        if (!K.ohneLogo) plakat(scene, s, 'H', (pa + pb) / 2, (3.8 + bandY1 + 2.2) / 2, 1.48, Math.min(pb - pa - 1.2, bandY1 - 1.8), '#ffffff');
        K.logos.push({ s, u0: pa, u1: pb, y0: 3.6, y1: bandY1 + 2.2, t: 1.4, grund: HS_ROT, sichtbar: !K.ohneLogo });
        if (pb + 2 < u1 - 6) lu0 = pb + 0.5;
      }
      hsLogo(K, s, (lu0 + lu1) / 2, (bandY0 + bandY1) / 2, 0.6, lhMax, { grund: HS_BLAU, band: '#2b4470' });
    } else if (front === 2) { // dunkles Medienband mit Lichtstreifen
      s.q(u0 - 0.5, u1, bandY0, bandY1, -0.5, 0.7, '#1f2328');
      s.q(u0 - 0.5, u1, bandY0 + 0.2, bandY0 + 0.45, 0.7, 0.76, K.zu ? '#5f676e' : HS_ROT);
      s.q(u0 - 0.5, u1, bandY1 - 0.35, bandY1 - 0.15, 0.7, 0.76, K.zu ? '#5f676e' : '#7fe0f0');
      s.q(u1 - 1.0, u1, 0, bandY1, -0.5, 0.7, '#1f2328');
      hsLogo(K, s, (u0 + u1) / 2, (bandY0 + bandY1) / 2 + 0.1, 0.7, lhMax, { grund: '#1f2328', band: HS_BLAU });
    } else { // weiße Lamellen vor der Glasfront, Logokasten davor
      for (let u = u0 - 0.3; u <= u1 - 0.2; u += 1.3) s.q(u - 0.12, u + 0.12, 0.3, bandY1, 0, 0.9, '#f4f3ef');
      s.q(u0 - 0.5, u1, bandY1 - 0.6, bandY1 + 0.2, -0.5, 1.0, '#f4f3ef');
      s.q(u0 - 0.5, u1, bandY0 - 0.1, bandY0 + 0.2, -0.5, 1.0, '#f4f3ef');
      const lu = (u0 + u1) / 2, lb = plakatBreite('HARTWIG SPORT', lhMax * 0.58) + lhMax * 1.8;
      s.q(lu - lb / 2 - 0.5, lu + lb / 2 + 0.5, (bandY0 + bandY1) / 2 - lhMax * 0.85, (bandY0 + bandY1) / 2 + lhMax * 0.85, 0.9, 1.0, '#f4f3ef');
      hsLogo(K, s, lu, (bandY0 + bandY1) / 2, 1.0, lhMax, { grund: '#f4f3ef' });
    }
    if (s.seite === '+x' && u0 > 0.5) for (let y = 1.4; y < Hb; y += 1.4) s.q(0, u0 - 0.5, y, y + 0.06, -0.5, -0.44, mallD);
  }
  // Dächer
  S.quader(xm, Hb, z0, x0 + w - 0.5, Hb + 0.3, z0 + d - 0.5, KIES);
  if (typ === 'glastonne') {
    const g = new THREE.CylinderGeometry(3.0, 3.0, M - 5, 10, 1, false, -Math.PI / 2, Math.PI); g.rotateZ(Math.PI / 2); g.translate(xm + M / 2, Hb + 0.3, z0 + d * 0.62); S.add(g, '#a9c6d3');
    for (let x = xm + 3.5; x < xm + M - 2.5; x += 3) { const rg = new THREE.TorusGeometry(3.05, 0.08, 3, 10, Math.PI); rg.rotateY(Math.PI / 2); rg.translate(x, Hb + 0.3, z0 + d * 0.62); S.add(rg, '#eef1f2'); }
    if (d * 0.62 - 4 > 10) {
      const z1 = z0 + d * 0.62 - 4;
      S.quader(xm + 1, Hb + 0.3, z0 + 1, xm + M - 1, Hb + 0.45, z1, '#7e858c');
      for (let z = z0 + 1.5; z + 5 <= z1; z += 12) parkreihe(S, r, xm + 2, xm + M - 3, z, 5, Hb + 0.45, K.zu ? 0.1 : 0.55);
    }
  } else if (typ === 'klinker') {
    const ps = Math.min(M * 0.5, d * 0.5, 14);
    const pg = new THREE.ConeGeometry(ps * Math.SQRT1_2, ps * 0.45, 4); pg.rotateY(Math.PI / 4); pg.translate(xm + M * 0.5, Hb + 0.6 + ps * 0.225, z0 + d * 0.45); S.add(pg, '#a9c6d3');
    S.box(ps + 0.6, 0.3, ps + 0.6, xm + M * 0.5, Hb + 0.45, z0 + d * 0.45, '#e6dccb');
    technik(S, r, xm + 1, z0 + 1, xm + M * 0.5 - ps / 2 - 1, z0 + d - 2, Hb + 0.3, { max: 3 });
  } else if (typ === 'medien') solar(S, xm + 1, z0 + 1, xm + M - 2, z0 + d * 0.7, Hb + 0.3);
  else if (typ === 'waschbeton') { // Parkdeck über der Mall, Spindelrampe an der Ecke
    S.quader(xm + 0.5, Hb + 0.3, z0 + 0.5, xm + M - 0.5, Hb + 0.45, z0 + d - 1, '#7e858c');
    for (let z = z0 + 1.5; z + 5 <= z0 + d - 3; z += 12) parkreihe(S, r, xm + 9, xm + M - 2, z, 5, Hb + 0.45, K.zu ? 0.1 : 0.6);
    S.quader(xm + 0.5, Hb + 0.45, z0 + d - 1.2, xm + M - 0.5, Hb + 1.5, z0 + d - 1, '#c0b8a6');
    spindel(S, xm + 4.2, z0 + d * 0.45, 0.3, Hb + 1.5, 3.4);
    const ps = new Seite(S, xm + 4.2 - 1, z0 + d * 0.45 + 3.6, 2, 0.4, '+z');
    ps.q(-0.2, 2.2, Hb + 2, Hb + 4.2, 0, 0.08, '#1f63b5'); plakat(scene, ps, 'P', 1, Hb + 3.1, 0.1, 1.9, '#ffffff');
  } else { // Galerie: Gründach mit Bäumen, Oberlichtband
    S.quader(xm + 0.6, Hb + 0.3, z0 + 0.6, xm + M - 0.6, Hb + 0.5, z0 + d - 1, '#8fbf7a');
    prismaX(S, xm + 2, xm + M - 2, [[z0 + d * 0.5 - 2, 0], [z0 + d * 0.5 + 2, 0], [z0 + d * 0.5, 1.8]], Hb + 0.5, '#a9c6d3');
    for (let i = 0; i < Math.floor(M / 6); i++) kuebelbaum(S, r, xm + 3 + i * 6, Hb + 0.5, z0 + d - 3.2, 0.8);
  }
  dachfeld(K, x0 + 1, z0 + 1, x0 + w - 1.5, z0 + d - 1.5, Hb + 0.3, { h: true, solar: typ !== 'medien' });
  // Pylon des Einkaufszentrums
  const [px, pz] = sMall.welt(Math.max(2, portalU - 7.5), 3.6);
  S.box(1.8, Hb + 3, 0.9, px, (Hb + 3) / 2, pz, '#2b3a4a');
  const sp = new Seite(S, px - 0.9, pz - 0.45, 1.8, 0.9, '+z');
  plakat(scene, sp, 'EINKAUFEN', 0.9, Hb + 1.6, 0.04, 0.3, '#ffffff', '#2b3a4a');
  sp.q(0.25, 1.55, Hb - 2.5, Hb - 0.4, 0.0, 0.05, HS_ROT);
  if (!K.ohneLogo) plakat(scene, sp, 'H', 0.9, Hb - 1.45, 0.07, 1.6, '#ffffff');
  return Hb + 4.5;
}

// ---------------------------------------------------------------- Familie 5: Outdoor-Flagship (Holz, Stein, Dachterrasse)
function familie5(K) {
  const { S, scene, x0, z0, w, d, n, r, v } = K;
  const H = n === 1 ? 8.0 : EG_S + (n - 1) * OG_S + 0.4;
  const stein = ['#8e8a83', '#9a948a', '#7f7c77', '#a29a8c'][v % 4], holz = ['#b9875a', '#a87549', '#c49466', '#9c6b43'][(v >> 1) % 4];
  const steinH = n === 1 ? 4.6 : EG_S + 0.3;
  const dachF = '#4b4f52';
  const [sz, sx] = K.seiten;
  const fu = sz.L * 0.18, fb = Math.min(sz.L * 0.42, 18); // großes Portalfenster auf +z
  // Grundkörper: EG springt 1,6 m zurück, im Portal 3,4 m
  const xa = x0 + fu - 0.5, xb = x0 + fu + fb + 0.5, kf = dunkler(holz, 0.04);
  S.quader(x0, 0, z0, x0 + w - 1.6, steinH, z0 + d - 1.6, '#5a5550');
  S.quader(x0, steinH, z0, xa, H, z0 + d, kf);
  S.quader(xa, steinH, z0, xb, H, z0 + d - 3.4, kf);
  S.quader(xb, steinH, z0, x0 + w, H, z0 + d, kf);
  for (const s of K.seiten) {
    // Holzlattung über dem Steinsockel (Portal bleibt frei)
    for (let u = 0.2; u < s.L; u += 0.42) { if (s === sz && u > fu - 0.6 && u < fu + fb + 0.6) continue; s.q(u - 0.13, u + 0.13, steinH, H, 0, 0.2, r() < 0.5 ? holz : dunkler(holz, 0.05)); }
    s.q(0, s.L, steinH, steinH + 0.2, 0, 0.45, heller(stein, 0.05));
  }
  // EG-Fenster in den Stein geschnitten
  const grp = K.gruppen(0);
  for (const s of K.seiten) {
    const segs = s === sz ? [[1.2, fu - 1], [fu + fb + 1, s.L - 1.5]] : [[1.5, s.L * 0.5 - 3], [s.L * 0.5 + 3, s.L - 1.5]];
    let i = 0;
    for (const [u0, u1] of segs) for (const [a, b] of buchten(u0, u1, 4.8, 0.7)) {
      const top = Math.min(steinH - 0.6, 3.9);
      vitrine(K, s, a, b, 0.6, top, 0.35, 1.5, grp[i++ % grp.length], { rueck: GLAS, boden: '#c9b08a' });
      s.q(a - 0.1, b + 0.1, top, top + 0.25, 0.35, 0.6, heller(stein, 0.06));
    }
    // obere Fensterbänder im Holz (horizontale Schlitze)
    if (n >= 2) for (let e = 1; e < n; e++) {
      const y0 = EG_S + (e - 1) * OG_S + 0.9;
      for (const [a, b] of buchten(1, s.L - 1, 3.6, 1.0)) {
        if (s === sz && b > fu && a < fu + fb) continue;
        s.q(a, b, y0, y0 + 2.2, -0.05, 0.22, GLAS);
        s.q(a - 0.1, b + 0.1, y0 - 0.15, y0, -0.05, 0.35, '#3b3f44');
      }
    }
  }
  // Portalfenster (zweigeschossig) mit Zelt und Figuren, Rahmen in Dunkelgrau
  {
    const s = sz, a = fu, b = fu + fb, top = H - 0.8;
    s.q(a - 0.5, a, 0, top + 0.5, -3.4, 0.6, '#3b3f44'); s.q(b, b + 0.5, 0, top + 0.5, -3.4, 0.6, '#3b3f44');
    s.q(a - 0.5, b + 0.5, top, top + 0.5, -3.4, 0.6, '#3b3f44');
    s.q(a, b, 0.3, top, -3.3, -3.2, '#d8d2c4');
    s.q(a, b, 0.3, 0.45, -3.2, 0.6, '#c9b08a');
    if (n >= 2) s.q(a, a + fb * 0.45, EG_S, EG_S + 0.3, -3.2, 0.2, '#c9b08a'); // Galerie
    s.q(a, b, top - 0.35, top - 0.2, -3.2, -3.1, LICHT);
    if (!K.zu) {
      const t1 = new THREE.ConeGeometry(2.1, 2.4, 4); t1.rotateY(Math.PI / 4); t1.translate(a + fb * 0.62, 1.65, -1.6); s.geo(t1, waehle(r, ['#e36b2c', '#f2c14e', '#3f7d56']));
      puppe(s, a + fb * 0.3, 0.45, -1.2, '#c0392b', '#3a3a3a', 1.1); puppe(s, a + fb * 0.85, 0.45, -1.0, '#2e7d32', '#3a3a3a', 1.1);
      if (n >= 2) { puppe(s, a + fb * 0.12, EG_S + 0.3, -1.5, '#1f3f6b', '#3a3a3a'); s.q(a + fb * 0.25, a + fb * 0.4, EG_S + 0.3, EG_S + 1.2, -1.6, -1.0, '#e0b23c'); }
      // Kanu an Seilen
      s.q(a + fb * 0.2, a + fb * 0.8, top - 2.2, top - 1.75, -2.2, -1.4, '#d04a3f');
      s.q(a + fb * 0.3, a + fb * 0.31, top - 1.75, top - 0.3, -1.85, -1.75, '#e8e4dc'); s.q(a + fb * 0.7, a + fb * 0.71, top - 1.75, top - 0.3, -1.85, -1.75, '#e8e4dc');
    }
    for (let u = a + fb / 4; u < b - 0.1; u += fb / 4) s.q(u - 0.07, u + 0.07, 0.3, top, 0.0, 0.12, '#3b3f44');
    s.q(a, b, EG_S - 0.1, EG_S + 0.1, 0.0, 0.12, '#3b3f44');
    K.glas.push({ s, a, b, y0: 0.3, y1: top, t: 0.1, eg: true });
  }
  // Eingang auf +x mit Holzvordach auf Steinpfeilern
  {
    const s = sx, m = s.L * 0.5;
    s.q(m - 2.5, m + 2.5, 0.3, 3.6, -1.3, -1.2, GLAS_D);
    s.q(m - 2.5, m + 2.5, 0.3, 0.42, -1.2, 0.4, BODEN);
    K.glas.push({ s, a: m - 2.5, b: m + 2.5, y0: 0.3, y1: 3.6, t: -1.1, eg: true, tuer: true });
    for (const u of [m - 3.0, m + 3.0]) s.q(u - 0.4, u + 0.4, 0.3, 4.4, 2.2, 3.0, stein);
    s.q(m - 3.8, m + 3.8, 4.4, 4.8, -0.2, 3.4, holz);
    s.q(m - 3.8, m + 3.8, 4.8, 5.0, -0.2, 3.4, dachF);
  }
  // Natursteinhaut mit Fugenbild um alle Öffnungen
  for (const s of K.seiten) {
    const oe = oeffnungen(K, s).map((g) => ({ ...g, a: g.a - (g.tuer ? 0 : 0.1), b: g.b + (g.tuer ? 0 : 0.1) }));
    if (s === sz) oe.push({ a: fu - 0.5, b: fu + fb + 0.5, y0: 0, y1: H });
    wand(s, 0, s.L, 0, steinH, -1.6, 0.35, oe, stein);
    let k = 0;
    for (let y = 0.7; y < steinH - 0.1; y += 0.7, k++) {
      for (const [p0, p1] of (s === sz ? [[0, fu - 0.5], [fu + fb + 0.5, s.L]] : [[0, s.L]])) {
        s.q(p0, p1, y - 0.03, y + 0.03, 0.35, 0.37, dunkler(stein, 0.08));
        for (let u = p0 + (k % 2 ? 0.6 : 1.3); u < p1; u += 1.4) s.q(u - 0.03, u + 0.03, y - 0.7, y, 0.35, 0.37, dunkler(stein, 0.07));
      }
    }
  }
  // Schilder
  hsLogo(K, sz, fu + fb + (sz.L - fu - fb) / 2, steinH + (n === 1 ? (H - steinH) / 2 : OG_S * 0.55), 0.25, n === 1 ? 1.5 : 1.7, { grund: holz });
  hsLogo(K, sx, sx.L * 0.5, n === 1 ? steinH + (H - steinH) / 2 : EG_S + OG_S * 0.55, 0.25, n === 1 ? 1.5 : 1.9, { grund: holz });
  if (!K.zu) plakat(scene, sz, 'BERG RUFT.', fu + fb / 2, H - 0.25 - 0.45, 0.62, passend('BERG RUFT.', fb * 0.6, 0.7), '#ffffff', '#3b3f44');
  // Dach: Sheds hinten, Kies links vorne, Terrasse mit Teststrecke an der Sichtecke
  K.Hw = H; K.tRelief = 0.55;
  const zT = z0 + d * 0.42, xT = x0 + w * 0.32;
  K.dach = { x0: xT, z0: zT, x1: x0 + w - 5, z1: z0 + d, y: H + 0.3 };
  S.quader(x0, H, z0, x0 + w, H + 0.2, z0 + d, KIES);
  for (let zs = z0 + 0.5; zs + 4.4 <= zT - 0.5; zs += 4.8) {
    prismaX(S, x0 + 0.5, x0 + w - 0.5, [[zs, 0], [zs + 4.4, 0], [zs + 4.4, 2.0]], H + 0.2, dachF);
    S.quader(x0 + 0.6, H + 0.35, zs + 4.4, x0 + w - 0.6, H + 2.05, zs + 4.46, GLAS_HELL);
    for (let x = x0 + 3; x < x0 + w - 1; x += 3) S.quader(x - 0.05, H + 0.35, zs + 4.4, x + 0.05, H + 2.05, zs + 4.52, '#3b3f44');
  }
  technik(S, r, x0 + 1, zT + 1, xT - 1.5, z0 + d - 1, H + 0.2, { max: 3 });
  S.quader(xT, H, zT, x0 + w, H + 0.3, z0 + d, '#b79e78');
  for (let x = xT + 0.6; x < x0 + w; x += 1.2) S.quader(x, H + 0.3, zT, x + 0.05, H + 0.32, z0 + d, '#a58c66');
  // Glasbrüstung
  S.quader(xT, H + 0.3, z0 + d - 0.12, x0 + w, H + 1.4, z0 + d, '#a9c6d3');
  S.quader(x0 + w - 0.12, H + 0.3, zT, x0 + w, H + 1.4, z0 + d, '#a9c6d3');
  S.quader(xT, H + 1.4, z0 + d - 0.18, x0 + w, H + 1.5, z0 + d + 0.04, '#5f676e');
  S.quader(x0 + w - 0.18, H + 1.4, zT, x0 + w + 0.04, H + 1.5, z0 + d, '#5f676e');
  S.quader(xT - 0.1, H + 0.3, zT, xT + 0.1, H + 1.4, z0 + d, '#a9c6d3');
  // Teststrecke (Laufbahn als Rundkurs)
  const tx0 = xT + 2.5, tx1 = x0 + w - 6.5, tz0 = zT + 2.4, tz1 = z0 + d - 2;
  if (tx1 - tx0 > 8 && tz1 - tz0 > 6) {
    const bahn = '#c4553e', yb = H + 0.33;
    S.quader(tx0, yb, tz0, tx1, yb + 0.05, tz0 + 1.6, bahn); S.quader(tx0, yb, tz1 - 1.6, tx1, yb + 0.05, tz1, bahn);
    S.quader(tx0, yb, tz0, tx0 + 1.6, yb + 0.05, tz1, bahn); S.quader(tx1 - 1.6, yb, tz0, tx1, yb + 0.05, tz1, bahn);
    S.quader(tx0 + 1.6, yb, tz0 + 1.6, tx1 - 1.6, yb + 0.04, tz1 - 1.6, '#94c486');
    S.quader(tx0 + 0.3, yb + 0.05, tz1 - 0.84, tx1 - 0.3, yb + 0.07, tz1 - 0.76, '#ffffff');
    S.quader(tx1 - 0.84, yb + 0.05, tz0 + 0.3, tx1 - 0.76, yb + 0.07, tz1 - 0.3, '#ffffff');
    for (let k = 0; k < 4; k++) S.quader(tx0 + 3 + k * 0.5, yb + 0.05, tz1 - 1.6, tx0 + 3.25 + k * 0.5, yb + 0.07, tz1, '#ffffff');
    const zx = (tx0 + tx1) / 2, zz = (tz0 + tz1) / 2;
    if (!K.zu) {
      const t1 = new THREE.ConeGeometry(1.5, 1.8, 4); t1.rotateY(Math.PI / 4); t1.translate(zx - 2, yb + 0.9, zz); S.add(t1, '#f2c14e');
      S.box(1.8, 0.4, 0.8, zx + 2, yb + 0.2, zz - 0.6, '#3f7d56'); S.box(1.8, 0.4, 0.8, zx + 2, yb + 0.2, zz + 0.8, '#e36b2c');
      if (K.leute) { mensch(S, r, tx0 + 0.8, yb, zz + 1); mensch(S, r, tx1 - 0.8, yb, zz - 1); }
    }
    for (let x = tx0; x < tx1; x += 3.5) kuebelbaum(S, r, x, yb, tz0 - 1.2, 0.55);
  }
  // Kletterturm an der Ecke (über die Terrasse hinaus)
  {
    const kw = 3.6, kx = x0 + w - kw - 0.4, kz = z0 + d - kw - 0.4, kh = H + 11;
    S.quader(kx, 0.3, kz, kx + kw, kh, kz + kw, '#8f979c');
    for (const s of seitenVon(S, kx, kz, kw, kw)) {
      for (let i = 0; i < 42; i++) { const u = zw(r, 0.2, kw - 0.5), y = zw(r, H + 0.8, kh - 0.6); s.q(u, u + 0.3, y, y + 0.25, 0, 0.18, waehle(r, BUNT)); }
      s.q(0, kw, H + 0.3, H + 0.55, 0, 0.15, '#5f676e');
    }
    S.quader(kx - 0.3, kh, kz - 0.3, kx + kw + 0.3, kh + 0.25, kz + kw + 0.3, '#5f676e');
    S.quader(kx - 0.3, kh + 0.25, kz + kw + 0.2, kx + kw + 0.3, kh + 1.3, kz + kw + 0.3, '#d9dcde');
    S.quader(kx + kw + 0.2, kh + 0.25, kz - 0.3, kx + kw + 0.3, kh + 1.3, kz + kw + 0.3, '#d9dcde');
    if (!K.zu) { const sx2 = new Seite(S, kx, kz, kw, kw, '+z'); sx2.q(1.5, 2.0, kh - 3.5, kh - 2.6, 0.2, 0.5, '#e04b3a'); sx2.q(1.73, 1.77, kh - 2.6, kh, 0.3, 0.34, '#f2f1ec'); }
    // Fahne mit Logo auf dem Turm
    zyl(S, kx + kw / 2, kh + 0.25, kz + kw / 2, 0.08, 5, '#d9dcde', 6);
    if (!K.ohneLogo) { S.box(2.0, 1.2, 0.05, kx + kw / 2 + 1.05, kh + 4.4, kz + kw / 2, HS_ROT); }
  }
  return H + 14;
}

// ---------------------------------------------------------------- Familie 6: Postmoderne der 90er
function familie6(K) {
  const { S, scene, x0, z0, w, d, n, r, v } = K;
  const H = n === 1 ? 7.4 : EG_S + (n - 1) * OG_S + 0.6;
  const putz = K.c(['#efe8dc', '#e8ddd0', '#ece3cf', '#e3e6e2', '#f0e4d8', '#e6dfd1', '#eae7df', '#efe2cc'][v]);
  const akzent = ['#2f7f86', HS_ROT, '#2f6f8f', '#5c8f6a', '#2f7f86', '#8c5a8f', '#2f6f8f', '#c9883a'][v];
  const sockelF = K.c('#b8ab98');
  const R = clamp(Math.min(w, d) * 0.2, 4, 7);
  const cx = x0 + w - R, cz = z0 + d - R;
  const D = 1.7;
  S.quader(x0, 0, z0, cx, EG_S, z0 + d - D, '#5a5f64');
  S.quader(cx - 0.01, 0, z0, x0 + w - D, EG_S, cz, '#5a5f64');
  S.quader(x0, EG_S, z0, cx, H, z0 + d, putz);
  S.quader(cx - 0.01, EG_S, z0, x0 + w, H, cz, putz);
  // Glaszylinder an der Ecke
  viertelzylinder(S, cx, cz, R - 0.3, 0.3, H + 3.5, GLAS_HELL, 14);
  for (let k = 0; k <= 6; k++) { const a = (k / 6) * Math.PI / 2; S.box(0.12, H + 3.2, 0.12, cx + Math.sin(a) * (R - 0.25), (H + 3.5 + 0.3) / 2, cz + Math.cos(a) * (R - 0.25), '#eef1f2'); }
  for (let y = EG_S; y < H + 3.4; y += n === 1 ? 2.4 : OG_S) viertelzylinder(S, cx, cz, R - 0.15, y - 0.12, y + 0.12, '#eef1f2', 14);
  const kegel = new THREE.ConeGeometry(R + 0.4, 3.0, 16, 1, false, 0, Math.PI / 2); kegel.translate(cx, H + 3.5 + 1.5, cz); S.add(kegel, akzent);
  viertelzylinder(S, cx, cz, R + 0.4, H + 3.3, H + 3.6, '#eef1f2', 14);
  zyl(S, cx + 0.3, H + 6.4, cz + 0.3, 0.06, 2.0, '#4a4f55', 4);
  if (!K.zu) for (let i = 0; i < 3; i++) { const a = 0.3 + i * 0.5; puppe(new Seite(S, cx, cz, 0.01, 0.01, '+z'), Math.sin(a) * (R - 1.6), EG_S + 0.15, Math.cos(a) * (R - 1.6) - 0.01, waehle(r, KLEID), '#2b2b2b'); }
  if (n >= 2) viertelzylinder(S, cx, cz, R - 0.6, EG_S, EG_S + 0.15, BODEN, 14);
  const grp = K.gruppen(0);
  for (const s of K.seiten) {
    const uE = s.L - R;
    // Sockel und EG
    s.q(0, uE, 0, 0.6, 0, 0.3, sockelF);
    const ax = buchten(0.5, uE - 0.5, 5.2, 0.9);
    ax.forEach(([a, b], i) => {
      s.q(a - 0.45, a, 0.6, EG_S - 0.1, 0, 0.35, akzent); s.q(b, b + 0.45, 0.6, EG_S - 0.1, 0, 0.35, akzent);
      const ein = s.seite === '+z' && i === Math.floor(ax.length * 0.5);
      if (ein) {
        s.q(a, b, 0.3, 3.8, -1.6, -1.5, GLAS_D); s.q(a, b, 0.3, 0.42, -1.5, 0, BODEN);
        K.glas.push({ s, a, b, y0: 0.3, y1: 3.8, t: -1.4, eg: true, tuer: true });
        // Dreiecksgiebel mit Rundfenster über dem Eingang
        const m = (a + b) / 2, gb = b - a + 2.4;
        const sh = new THREE.Shape(); sh.moveTo(-gb / 2, 0); sh.lineTo(gb / 2, 0); sh.lineTo(0, 2.6); sh.closePath();
        const g = new THREE.ExtrudeGeometry(sh, { depth: 1.0, bevelEnabled: false }); g.translate(m, n >= 2 ? H + 0.6 : EG_S + 0.2, -0.3); s.geo(g, putz);
        const c = new THREE.CylinderGeometry(0.55, 0.55, 0.1, 14); c.rotateX(Math.PI / 2); c.translate(m, (n >= 2 ? H + 0.6 : EG_S + 0.2) + 1.0, 0.72); s.geo(c, GLAS);
        const c2 = new THREE.TorusGeometry(0.6, 0.08, 4, 14); c2.translate(m, (n >= 2 ? H + 0.6 : EG_S + 0.2) + 1.0, 0.75); s.geo(c2, akzent);
        s.q(a - 0.6, b + 0.6, 3.8, 4.25, 0, 2.2, akzent);
        s.q(a - 0.6, b + 0.6, 4.25, 4.4, 0, 2.3, '#eef1f2');
        if (n >= 2) { s.q(a - 0.4, b + 0.4, EG_S, H + 0.6, 0, 0.4, heller(putz, 0.03)); for (let y = EG_S + 0.8; y < H; y += 1.2) s.q(m - 0.9, m + 0.9, y, y + 0.7, 0.4, 0.45, GLAS); }
        return;
      }
      vitrine(K, s, a, b, 0.6, 4.0, 0, 1.5, grp[i % grp.length], { rueck: GLAS });
      s.q(a, b, 4.0, 4.3, 0, 0.2, akzent);
    });
    wand(s, 0, uE, 0, EG_S - 0.15, -D, 0, oeffnungen(K, s), putz);
    s.q(0, uE, EG_S - 0.15, EG_S + 0.2, 0, 0.5, heller(putz, 0.04));
    if (n === 1) for (const [a, b] of buchten(0.6, uE - 0.6, 2.6, 1.4)) { // Oberlichtband
      const m = (a + b) / 2;
      s.q(m - 0.6, m + 0.6, EG_S + 0.5, H - 0.7, -0.05, 0.05, GLAS);
      s.q(m - 0.75, m + 0.75, EG_S + 0.35, EG_S + 0.5, 0, 0.22, akzent);
    }
    // OG: quadratische Fenster mit farbigen Rahmen, Putzfugen
    for (let e = 1; e < n; e++) {
      const y0 = EG_S + (e - 1) * OG_S;
      for (let y = y0 + 0.9; y < y0 + OG_S; y += 0.9) s.q(0, uE, y - 0.02, y + 0.02, 0, 0.04, dunkler(putz, 0.05));
      for (const [a, b] of buchten(0.6, uE - 0.6, 3.0, 1.0)) {
        const m = (a + b) / 2;
        if (s.seite === '+z' && Math.abs(m - (ax[Math.floor(ax.length * 0.5)]?.[0] + ax[Math.floor(ax.length * 0.5)]?.[1]) / 2) < 3.4) continue;
        s.q(m - 0.85, m + 0.85, y0 + 0.9, y0 + 2.9, -0.05, 0.05, GLAS);
        s.q(m - 0.05, m + 0.05, y0 + 0.9, y0 + 2.9, 0, 0.1, '#eef1f2');
        s.q(m - 1.0, m + 1.0, y0 + 0.75, y0 + 0.9, 0, 0.25, akzent);
        s.q(m - 1.0, m + 1.0, y0 + 2.9, y0 + 3.05, 0, 0.15, akzent);
      }
    }
    s.q(0, uE, H - 0.3, H + 0.6, 0, 0.35, heller(putz, 0.04));
    s.q(0, uE, H + 0.6, H + 0.8, -0.1, 0.45, akzent);
    const lh = n >= 2 ? 1.6 : 1.45, ly = n >= 2 ? H - OG_S * 0.45 : (EG_S + H) / 2 + 0.25;
    const lu = uE * (s.seite === '+z' ? 0.27 : 0.5), lb = plakatBreite('HARTWIG SPORT', lh * 0.58) + lh * 1.8;
    s.q(lu - lb / 2 - 0.4, lu + lb / 2 + 0.4, ly - lh * 0.85, ly + lh * 0.85, 0, 0.3, heller(putz, 0.03));
    hsLogo(K, s, lu, ly, 0.36, lh, { grund: putz });
    if (K.alt) for (let i = 0; i < 5; i++) { const u = zw(r, 0, uE - 1); s.q(u, u + zw(r, 0.3, 0.8), Math.max(EG_S, H - zw(r, 2, 6)), H - 0.3, 0.04, 0.06, dunkler(putz, 0.12)); }
  }
  // Dach: Glas-Satteloberlicht, Technik
  K.Hw = H; K.tRelief = 0.45;
  S.quader(x0, H, z0, x0 + w - R, H + 0.6, z0 + d, KIES); S.quader(x0, H, z0, x0 + w, H + 0.6, z0 + d - R, KIES);
  const ow = Math.min(w * 0.5, 18), od = 3.2;
  prismaX(S, x0 + 3, x0 + 3 + ow, [[z0 + d * 0.5 - od / 2, 0], [z0 + d * 0.5 + od / 2, 0], [z0 + d * 0.5, 1.6]], H + 0.6, '#a9c6d3');
  dachfeld(K, x0 + 3 + ow + 1, z0 + 1.5, x0 + w - R - 1, z0 + d - 1.5, H + 0.6, { kuppeln: true, teilung: 0.4 });
  return H + 7;
}

// ---------------------------------------------------------------- Parkdeck auf dem Dach (große Fachmarkt-Boxen)
function parkdeckSport(K, x0, z0, x1, z1, y) {
  const { S, r } = K;
  K.dach = { x0, z0, x1, z1, y };
  S.quader(x0, y, z0, x1, y + 0.2, z1, '#7e858c');
  for (let z = z0 + 1.2; z + 5 <= z1 - 1; z += 12.5) {
    parkreihe(S, r, x0 + 7, x1 - 2, z, 5, y + 0.2, K.zu ? 0.08 : 0.6);
    if (z + 11 <= z1 - 1) parkreihe(S, r, x0 + 7, x1 - 2, z + 6.4, 5, y + 0.2, K.zu ? 0.08 : 0.6);
  }
  for (let x = x0 + 8; x < x1 - 2; x += 6) S.box(2.4, 0.03, 0.2, x, y + 0.22, z0 + (z1 - z0) * 0.5, '#f2f1ec');
  // Rampe an der Rückseite, Treppenhaus mit Aufzug, Brüstung
  prismaX(S, x0 + 0.3, x0 + 6.5, [[z0 + 0.3, 0], [z1 - 0.3, 0], [z0 + 0.3, 0.01]], y + 0.2, '#6f767c');
  S.quader(x0 + 0.3, y + 0.2, z0 + 0.3, x0 + 6.5, y + 0.25, z1 - 0.3, '#8a9096');
  for (let z = z0 + 1; z < z1 - 1; z += 3) S.box(5.6, 0.03, 0.15, x0 + 3.4, y + 0.27, z, '#f2b705');
  S.box(4.4, 3.4, 4.4, x1 - 3.4, y + 1.9, z0 + 3.4, '#d0ccc4');
  S.box(4.6, 0.3, 4.6, x1 - 3.4, y + 3.7, z0 + 3.4, HS_BLAU);
  S.quader(x0, y + 0.2, z1 - 0.15, x1, y + 1.2, z1, '#d9dcde');
  S.quader(x1 - 0.15, y + 0.2, z0, x1, y + 1.2, z1, '#d9dcde');
  const sp = new Seite(S, x1 - 4, z1 - 4, 1.5, 1.5, '+z');
  S.box(0.2, 5.5, 0.2, x1 - 2.5, y + 2.75, z1 - 2.5, '#5f676e');
  S.box(2.1, 2.1, 0.25, x1 - 2.5, y + 6.2, z1 - 2.45, '#1f63b5');
  plakat(K.scene, sp, 'P', 1.5, y + 6.2, 0.2, 1.9, '#ffffff');
  K.hoeheDach = Math.max(K.hoeheDach ?? 0, y + 7.3);
}

// ---------------------------------------------------------------- Glas je Zustand (vor zustandsDekor)
/** Behandelt die registrierten Glasflächen je nach Zustand (zukleben, Folie, Scherben). Alles Weitere macht zustandsDekor. */
export function statusSport(K) {
  const st = K.Z;
  const zukleben = (g) => {
    g.s.q(g.a + 0.05, g.b - 0.05, g.y0 + 0.1, g.y1 - 0.1, g.t + 0.02, g.t + 0.07, g.tuer ? '#c9c2ae' : (Math.round(g.a) % 2 ? '#ece3cc' : '#e2d6b8'));
    if (!g.tuer && g.b - g.a > 1.5) g.s.kipp(wurzelSumme(g.b - g.a, g.y1 - g.y0) * 0.8, 0.2, 0.03, (g.a + g.b) / 2, (g.y0 + g.y1) / 2, g.t + 0.09, '#cbbd98', 0.6);
  };
  if (st.hat('leer') || st.hat('abriss')) { for (const g of K.glas) zukleben(g); return; }
  if (st.hat('verfall')) {
    for (const g of K.glas) {
      if (K.r() < 0.6) zukleben(g);
      else { g.s.q(g.a + 0.05, g.b - 0.05, g.y0 + 0.1, g.y1 - 0.1, g.t + 0.02, g.t + 0.06, '#1f2428'); g.s.kipp((g.b - g.a) * 0.5, 0.6, 0.04, g.a + (g.b - g.a) * 0.3, g.y1 - 0.5, g.t + 0.08, '#7d9fb2', 0.6); }
    }
    return;
  }
  if (K.matt && !K.zu) {
    const front=K.glas.filter(g=>g.s===K.seiten[0]&&g.eg&&!g.tuer&&!g.mieter&&g.b-g.a>1.7);
    const weitere=K.glas.filter(g=>!front.includes(g)&&!g.tuer&&!g.mieter&&g.b-g.a>1.7);
    const auswahl=[...front,...weitere];
    const r=rng(String(K.haus.id)+'/blindglas');
    const start=auswahl.length?Math.floor(r()*auswahl.length):0;
    const zahl=Math.min(4,auswahl.length);
    for(let i=0;i<zahl;i++){
      const g=auswahl[(start+i*Math.max(1,Math.floor(auswahl.length/zahl)))%auswahl.length];
      const front=g.t+0.10;
      g.s.q(g.a+0.10,g.b-0.10,g.y0+0.12,g.y1-0.13,front,front+0.10,i%2?'#d1d0b3':'#b8c5b8');
      g.s.q(g.a+0.13,g.b-0.13,g.y1-0.35,g.y1-0.25,front+0.08,front+0.10,'#737c79');
    }
  }
  if (st.status === 'geschlossen') for (const g of K.glas) if (!g.eg) { // Obergeschosse: Rollos unten
    g.s.q(g.a, g.b, g.y0 + 0.2, g.y1 - 0.2, g.t + 0.02, g.t + 0.06, '#4a5057');
    for (let y = g.y0 + 0.5; y < g.y1 - 0.3; y += 0.45) g.s.q(g.a, g.b, y, y + 0.06, g.t + 0.06, g.t + 0.09, '#363b40');
  }
}

/** Mieterläden im EG: Blende mit Namen über den Buchten, eine Bucht wird Eingang. */
function mieterFronten(K) {
  const aus = [];
  for (const mz of K.mieterZonen ?? []) {
    const bs = mz.buchten ?? [];
    if (!bs.length) continue;
    const s = bs[0].s, ua = Math.min(...bs.map((b) => b.a)), ub = Math.max(...bs.map((b) => b.b)), t = Math.max(...bs.map((b) => b.t));
    const yT = Math.min(...bs.map((b) => b.y1)), yS = Math.min(yT - 0.2, 4.4);
    s.q(ua - 0.15, ub + 0.15, yS - 1.0, yS + 0.05, t + 0.15, t + 0.4, mz.bg);
    s.q(ua - 0.15, ub + 0.15, yS - 1.12, yS - 1.0, t + 0.15, t + 0.46, dunkler(mz.bg, 0.15));
    plakat(K.scene, s, mz.name, (ua + ub) / 2, yS - 0.48, t + 0.42, passend(mz.name, ub - ua - 0.6, 0.75), mz.fg, mz.bg);
    const tb = bs[Math.floor(bs.length / 2)];
    s.q(tb.a + 0.3, tb.b - 0.3, 0.3, Math.min(3.2, yS - 1.2), t + 0.02, t + 0.08, K.zu ? '#8e9499' : GLAS_D);
    s.q(tb.a + 0.15, tb.a + 0.3, 0.3, Math.min(3.3, yS - 1.1), t, t + 0.12, mz.bg === '#ffffff' ? mz.fg : mz.bg);
    s.q(tb.b - 0.3, tb.b - 0.15, 0.3, Math.min(3.3, yS - 1.1), t, t + 0.12, mz.bg === '#ffffff' ? mz.fg : mz.bg);
    K.glas.push({ s, a: tb.a + 0.3, b: tb.b - 0.3, y0: 0.3, y1: 3.2, t: t + 0.08, eg: true, tuer: true, mieterTuer: true });
    aus.push({ ...mz, ua: ua - 0.3, ub: ub + 0.3 });
  }
  return aus;
}

/** Das gesamte oberste OG wird zur klar lesbaren Abverkaufszone: großes Hauptbanner
 * und mindestens die Hälfte der Glasfelder mit roten Streifen. Andere Geschosse unberührt.
 */
function abverkaufFassade(K){
 if(!K.abverkauf||K.n<2)return;
 const y0=EG_S+(K.n-2)*OG_S, s=K.seiten[0], max=s.L-(K.fam===1?3.5:K.fam===6?7:1);
 const li=0.06*max,re=0.92*max,t= Math.max(1.2,K.tRelief??0.5)+0.72;
 const hh=K.n>=2?OG_S:3.4;
 // Dominantes, über den größten Teil der Hauptfront reichendes Schild.
 s.q(li,re,y0+hh*0.50,y0+hh*0.94,t,t+0.24,'#bc1e30');
 s.q(li,re,y0+hh*0.47,y0+hh*0.51,t+0.2,t+0.27,'#f3c530');
 const name=K.rabatt?('SALE  -'+K.rabatt+'%'):'SAISON-ABVERKAUF';
 plakat(K.scene,s,name,(li+re)/2,y0+hh*0.72,t+0.31,passend(name,re-li-1,hh*0.32),'#ffffff');
 const glass=K.glas.filter(g=>!g.eg&&!g.tuer&&!g.mieter&&g.y0>y0-0.65&&g.s===s);
 if(glass.length){
  glass.forEach((g,i)=>{
   if(i%2)return;
   const t1=Math.max(t,g.t+0.2);
   g.s.q(g.a+0.03,g.b-0.03,y0+0.58,y0+1.35,t1,t1+0.05,'#d12a37');
   g.s.q(g.a+0.03,g.b-0.03,y0+1.35,y0+1.43,t1,t1+0.06,'#f4c52f');
  });
 }else{
  // Geschäftshaus und Fachmarkt besitzen teils keine eingetragenen OG-Fenster.
  // Sichtbare neue Sale-Schaufenster samt Lagerware schaffen statt winziger Plakate.
  const n=Math.max(4,Math.min(10,Math.floor((re-li)/5)));
  const step=(re-li)/n;
  for(let i=0;i<n;i++){
   const a=li+i*step+0.18,b=li+(i+1)*step-0.18;
   s.q(a,b,y0+0.25,y0+hh*0.46,t-0.09,t-0.04,GLAS_HELL);
   s.q(a,b,y0+0.23,y0+0.36,t+0.05,t+0.10,'#455563');
   if(i%2===0)s.q(a,b,y0+0.55,y0+1.26,t+0.12,t+0.18,'#cd2639');
   else abverkaufHinterGlas(K,s,a,b,y0+0.07,y0+hh*0.46,t+0.01,1.15);
   K.glas.push({s,a,b,y0:y0+0.25,y1:y0+hh*0.46,t,eg:false});
  }
 }
 // Ergänzend seitliches rotes Verkaufsband, aus beiden Spielperspektiven erkennbar.
 const se=K.seiten[1],breite=Math.max(4,se.L*0.72);
 se.q(1.0,1.0+breite,y0+hh*0.62,y0+hh*0.92,Math.max(0.75,K.tRelief??0.5)+0.45,Math.max(0.75,K.tRelief??0.5)+0.65,'#c82533');
}

/** Bei Substanz unter 40: milchiges Glas, schiefes Altbanner, graue Attikafugen.
 * Diese Details werden unabhängig vom Abverkauf gerendert und sind kein Verfall.
 */
function substanzAkzente(K){
 if(!K.matt||K.zu)return;
 const s=K.seiten[0], t=(K.tRelief??0.5)+0.85;
 const u=s.L*0.5, y=EG_S-0.85;
 const wb=Math.min(s.L*0.78,s.L-2.0);
 // Ausgebleichtes, schief hängendes Tuch auf halber Fassadenbreite,
 // sichtbar bereits bei fester Spielkamera und nicht als Schließung interpretiert.
 s.kipp(wb,1.85,0.15,u,y,t+0.58,'#858b82',-0.032);
 s.kipp(wb-0.45,1.55,0.18,u,y-0.08,t+0.69,'#c2c1b0',-0.032);
 s.q(u-wb*0.46,u+wb*0.46,y-0.88,y-0.76,t+0.84,t+0.91,'#9d9f93');
 plakat(K.scene,s,'LETZTE SAISON',u,y,t+0.94,passend('LETZTE SAISON',wb-1.3,1.0),'#595d5b',null,{rz:-0.032});
 // Grauer, noch intakter Rahmen ersetzt hier frische Werbetechnik; kein Verfallszustand.
 for(let i=0;i<4;i++){
   const xx=u-wb*0.43+i*wb*0.26;
   s.q(xx,xx+0.08,y-0.84,y+0.72,t+0.80,t+0.93,'#7a817f');
 }
 for(let k=0;k<4;k++){
   const sx=1.0+k*(s.L-2.0)/4;
   s.q(sx,sx+Math.min(3.1,s.L-sx),K.Hw-0.62,K.Hw-0.35,t-0.19,t+0.15,k%2?'#9fa299':'#8e9995');
 }
 for(const face of K.seiten){
   const tt=(K.tRelief??0.5)+0.40;
   for(let p=0.8;p<face.L-0.8;p+=3.8){
     face.q(p,p+Math.min(2.0,face.L-p-0.4),K.Hw-0.17,K.Hw+0.12,tt,tt+0.11,'#767c77');
     face.q(p+0.12,p+0.28,K.Hw-0.74,K.Hw-0.17,tt,tt+0.07,'#a8aaa2');
   }
 }
 const glass=K.glas.filter(g=>!g.tuer&&!g.mieter);
 if(glass.length<4){
   // Bei wenigen vorhandenen Fenstern vier milchige sichtbare Flächen ergänzen.
   for(let i=0;i<4;i++){
     const a=1.0+i*Math.max(2.8,(s.L-3)/5);
     s.q(a,a+2.2,0.85,3.85,t,t+0.08,'#b6c2bc');
     s.q(a,a+2.2,3.70,3.85,t+0.07,t+0.12,'#6a7778');
   }
 }
}
/** Präsentationsfläche an der Hauptseite: großes lesbares Studio statt kleiner Warenfenster.
 * Ein offenes Glasrahmensystem, damit Geräte, Monitor und Figur nicht hinter opakem GLAS verschwinden.
 */
function erlebnisPortal(K){
 if(!K.erlebnis||K.zu)return;
 const s=K.seiten[0], kandidaten=K.glas.filter(g=>g.s===s&&g.eg&&!g.tuer&&!g.mieter&&g.b-g.a>2.1);
 const g=kandidaten[0];
 const center=g?(g.a+g.b)/2:Math.max(7,s.L*0.31);
 const maxW=Math.min(13,s.L-2.0);
 const a=clamp(center-maxW/2,0.7,s.L-maxW-0.7),b=a+maxW;
 const tt=Math.max(0.35,(g?.t??0)+1.55);
 const color=K.erlebnis==='laufanalyse'?'#21628b':'#277a6f';
 // Über dem Glasvorbau lesbare Kennzeichnung und heller, eigener Boden.
 s.q(a,b,0.15,0.31,tt-2.05,tt+0.6,'#efdcb1');
 s.q(a,b,3.15,4.17,tt-2.05,tt+0.55,color);
 s.q(a,b,4.06,4.22,tt+0.36,tt+0.58,'#c4dce3');
 s.q(a,b,3.09,3.21,tt+0.40,tt+0.61,'#f4c247');
 for(const du of [a,b]){
  s.q(du-0.14,du+0.14,0.18,4.20,tt-1.9,tt+0.58,'#d9e5eb');
  s.q(du-0.16,du+0.16,0.23,0.39,tt-1.9,tt+0.58,'#465e6e');
 }
 const titel=K.erlebnis==='laufanalyse'?'LAUFANALYSE':'FITNESS';
 plakat(K.scene,s,titel,(a+b)/2,3.69,tt+0.63,passend(titel,b-a-1.0,0.80),'#ffffff');
 if(K.erlebnis==='laufanalyse'){
   // Drei verkaufsfertige Lauftests, der mittlere mit laufendem Menschen.
   for(let i=0;i<3;i++){
     const cx=a+1.75+i*2.65, t=tt-0.42;
     s.q(cx-0.95,cx+0.92,0.42,0.64,t-0.6,t+0.50,'#25313b');
     s.q(cx-0.85,cx+0.80,0.65,0.68,t-0.50,t+0.35,'#111a22');
     for(const du of [-0.75,0.72])s.q(cx+du,cx+du+0.07,0.70,1.75,t+0.36,t+0.44,'#cbdde4');
     s.q(cx-0.35,cx+0.45,1.52,2.15,t+0.42,t+0.51,'#2a394a');
     s.q(cx-0.25,cx+0.35,1.65,2.01,t+0.52,t+0.57,'#38bbcf');
     if(i===1&&K.leute){
       // Echte Laufpose statt einer reglos stehenden Standardfigur.
       s.q(cx-0.23,cx+0.22,1.32,2.00,t-0.12,t+0.12,'#e34a3d');
       s.q(cx-0.12,cx+0.12,2.02,2.28,t-0.12,t+0.12,'#e5c6a8');
       s.kipp(0.19,0.86,0.20,cx-0.26,0.94,t,'#203047',-0.48);
       s.kipp(0.19,0.86,0.20,cx+0.20,0.93,t,'#203047',0.58);
       s.kipp(0.13,0.65,0.20,cx-0.36,1.55,t,'#e34a3d',0.65);
       s.kipp(0.13,0.65,0.20,cx+0.35,1.54,t,'#e34a3d',-0.65);
     }
   }
   s.q(a+0.36,a+1.35,1.1,2.65,tt-1.58,tt-1.50,'#234564');
   s.q(a+0.48,a+1.23,1.22,2.47,tt-1.49,tt-1.45,'#7ee3ee');
 }else{
   for(let i=0;i<3;i++){
     const cx=a+1.65+i*2.65;
     s.q(cx-0.73,cx+0.73,0.32,0.42,tt-0.8,tt+0.54,'#3c5a68');
     for(const dd of [-0.52,0.52])s.q(cx+dd,cx+dd+0.08,0.43,2.60,tt+0.15,tt+0.22,'#e1e6e9');
     s.q(cx-0.60,cx+0.60,2.43,2.52,tt+0.14,tt+0.25,'#56666e');
     s.q(cx-0.45,cx+0.45,0.79,1.01,tt-0.55,tt+0.15,'#df9c39');
     for(let k=0;k<4;k++)s.q(cx-0.46+k*0.24,cx-0.36+k*0.24,1.30,1.55,tt-0.72,tt-0.50,k%2?'#222b32':'#d5a043');
   }
   if(K.leute){const [x,z]=s.welt((a+b)/2,tt-0.6);mensch(K.S,K.r,x,0.2,z);}
   s.q(a+0.4,b-0.4,0.55,3.25,tt-1.85,tt-1.79,'#a2c8d3');
 }
}

// ---------------------------------------------------------------- Hauptfunktion
/**
 * Baut ein Sporthaus aus haeuser.json (format 'sport').
 * opt: { x = 0, z = 0, status?: einer der 12 Zustände aus zustaende.js, zusatz?, aktion?, familie?: 1 bis 6,
 *        untermieter?: [Name | { name, typ, etage }], hartwig?: false, passanten?: false, abrissSeite?: '+x' | '+z' | 'ecke', jahr? }
 * Rückgabe: { hoehe, w, d (belegte Fläche ab x, z, inkl. Parkplatz/Mall), familie, teile, status }
 */
/** Sporthaus bleibt als Gebäudekörper bestehen, wird aber als Fremdhandelsfläche gebrandet. */
export function nachnutzungSport(S, scene, haus, w, opt = {}) {
  const start = S.anzahl;
  const b = sporthaus(S, scene, haus, { ...opt, status: 'offen', hartwig: false, passanten: false });
  const x = opt.x ?? 0, z = opt.z ?? 0, farbe = WETTBEWERBER_FARBEN[w.art] ?? '#596c76';
  for (const seite of seitenVon(S, x, z, b.w, b.d)) {
    seite.q(1, seite.L - 1, 0.8, 3.9, 0.55, 0.68, '#698999');
    seite.q(1, seite.L - 1, 4.0, 5.4, 0.62, 0.82, farbe);
    plakat(scene, seite, w.name, seite.L / 2, 4.7, 0.93, passend(w.name, seite.L * 0.75, 1.3), '#ffffff');
  }
  return { ...b, teile: S.anzahl - start, nachnutzung: w.id };
}
export function sporthaus(S, scene, haus, opt = {}) {
  const start = S.anzahl;
  const marke = merke(S, scene);
  const fam = opt.familie ?? familieSport(haus);
  const m = masseSport(haus, fam);
  const x = opt.x ?? 0, z = opt.z ?? 0;
  const flaechen = haus.flaechen ?? [];
  const sumQm = flaechen.reduce((a, f) => a + (f.qm || 0), 0);
  const leerQm = flaechen.filter((f) => f.konzept === 'leer').reduce((a, f) => a + (f.qm || 0), 0);
  let status = opt.status ?? haus.status ?? 'offen';
  if (!opt.status && sumQm > 0 && leerQm / sumQm > 0.9) status = 'leer';
  const namen = ['Drogerie Nachbar', 'FitWerk 24', 'Café Fräulein', 'Pulsraum', 'Kaufgut', 'Praxisgemeinschaft Zentrum'];
  const rM = rng(`${haus.id}/mieter`);
  const ausDaten = flaechen.filter((f) => f.konzept === 'untermiete').map((f) => mieterInfo({ name: namen[Math.floor(rM() * namen.length)], etage: f.etage }));
  const Z = zustandNormal({ ...opt, status, seed: haus.id }, { untermieter: ausDaten });
  const F = zustandFlags(Z);
  const gefuehl = sportGefuehl(haus, Z);
  const M = fam === 4 ? m.w - m.bw : 0;
  const K = {
    S, scene, haus, fam, v: ((haus.fassade ?? 0) % 8 + 8) % 8, r: rng(`${haus.id}:${haus.fassade}:sport${fam}`),
    n: m.n, w: m.bw, d: m.bd, x0: x + M, z0: z, M, Z,
    alt: F.alt, matt: gefuehl.matt, erlebnis: gefuehl.erlebnis, erlebnisSeite: gefuehl.erlebnisSeite,
    erlebnisGezeigt: false, leuchtbandAbgeschaltet: false, abverkauf: gefuehl.abverkauf, rabatt: gefuehl.rabatt, abverkaufFenster: 0,
    status: F.eg, zu: F.zu, ohneLogo: F.ohneLogo, leute: opt.passanten !== false,
    glas: [], logos: [],
  };
  K.c = (c) => (F.verblichen ? '#' + new THREE.Color(c).offsetHSL(0, -0.2, -0.07).getHexString() : K.alt ? '#' + new THREE.Color(c).offsetHSL(0, -0.06, -0.06).getHexString() : c);
  K.seiten = seitenVon(S, K.x0, K.z0, K.w, K.d);
  const std = ['sporttextil', 'sportschuhe', 'outdoor', 'rad', 'teamsport', 'wintersport'];
  K.gruppen = (e) => {
    const g = flaechen.filter((f) => f.etage === e && f.konzept !== 'leer').sort((a, b) => b.qm - a.qm).map((f) => f.gruppe);
    if (g.length) return g;
    const g0 = flaechen.filter((f) => f.etage === 0).map((f) => f.gruppe);
    return e === 0 && g0.length ? g0 : std.slice(e % 3).concat(std.slice(0, e % 3));
  };
  // EG-Mieter: zuerst auf der Seitenfront (+x), Ecke (Finne, Rundung) bleibt frei
  const eck = { 1: 3.6, 6: clamp(Math.min(K.w, K.d) * 0.2, 4, 7) }[fam] ?? 0;
  K.mieterZonen = eigeneMieterflaechen(Z, { '+z': K.w - eck - (fam === 3 ? 12 : 0), '+x': K.d - eck - 1 }, ['+x', '+z'])
    .map((q) => (q.seite === '+x' && fam === 4 ? { ...q, u0: q.u0 + 4.5, u1: q.u1 + 4.5 } : q));
  const bauer = { 1: familie1, 2: familie2, 3: familie3, 4: familie4, 5: familie5, 6: familie6 }[fam];
  let hoehe = bauer(K);
  // Einige Familien haben nur auf einer Sichtseite freie Glasbuchten; das Erlebnis
  // wird dann deterministisch auf der tatsächlich vorhandenen Glasfront ergänzt.
  if (K.erlebnis && !K.erlebnisGezeigt && !K.zu) {
    const fenster = K.glas.filter((g) => g.eg && !g.tuer && !g.mieter && g.b - g.a >= 3.4);
    const g = fenster.find((g) => g.s.seite === K.erlebnisSeite) ?? fenster[0];
    if (g) { erlebnisHinterGlas(K, g.s, g.a, g.b, g.y0, g.t, 2.2); K.erlebnisGezeigt = true; }
  }
  hoehe = Math.max(hoehe, K.hoeheDach ?? 0);
  K.Hw = K.Hw ?? (m.n === 1 ? 7 : EG_S + (m.n - 1) * OG_S);
  const mieterEG = mieterFronten(K);
  erlebnisPortal(K);
  abverkaufFassade(K);
  statusSport(K);
  substanzAkzente(K);
  // Körperbeschreibung für zustandsDekor
  const seite = (s) => {
    const lg = K.logos.filter((l) => l.s === s);
    const gross = lg.filter((l) => !l.senkrecht).sort((p, q) => (q.u1 - q.u0) * (q.y1 - q.y0) - (p.u1 - p.u0) * (p.y1 - p.y0))[0] ?? lg[0];
    return {
      u1: s.L - eck,
      sperren: lg.filter((l) => l.sichtbar !== false).map((l) => ({ u0: l.u0 - 0.3, u1: l.u1 + 0.3, y0: l.y0 - 0.3, y1: l.y1 + 0.3, art: 'logo' })),
      abbau: gross ? { u: (gross.u0 + gross.u1) / 2, y: (gross.y0 + gross.y1) / 2, t: gross.t } : undefined,
    };
  };
  const tuerVon = (g) => ({ seite: g.s.seite, u: (g.a + g.b) / 2, breite: g.b - g.a, t: g.t, haupt: !g.mieterTuer && g.s.seite === '+z' });
  const koerper = {
    x: K.x0, z: K.z0, w: K.w, d: K.d, hoehe: K.Hw, egHoehe: EG_S, geschossHoehe: OG_S, n: K.n, tRelief: K.tRelief ?? 0.35, tLogo: 0.5,
    raster: 3.0, fensterBand: [0.5, OG_S - 0.4],
    seiten: { '+z': seite(K.seiten[0]), '+x': seite(K.seiten[1]) },
    eingaenge: K.glas.filter((g) => g.tuer).map(tuerVon),
    fensterEG: K.glas.filter((g) => g.eg && !g.tuer && !g.mieter && g.y0 < 1).map((g) => ({ seite: g.s.seite, a: g.a, b: g.b, y0: Math.max(g.y0, 0.5), y1: Math.min(g.y1, 4.3), t: g.t })),
    mieterEG, dach: K.dach, farbe: K.c('#d9d3c7'), baujahr: haus.baujahr, jahr: opt.jahr, flaecheQm: sumQm || (haus.grundflaecheQm ?? 0) * m.n,
    marke, seed: `${haus.id}:${Z.status}`, planeText: 'DAS NEUE HARTWIG SPORT',
  };
  if (!koerper.eingaenge.some((e) => e.haupt) && koerper.eingaenge.length) koerper.eingaenge[0].haupt = true;
  // Aktionsplakate beim Abverkauf ausschließlich im obersten OG. Normales EG
  // bleibt auch bei aktiver rabattierter Engine-Aktion frei von SALE-Bannern.
  const dekZustand = K.abverkauf && (Z.aktion || Z.status === 'aktion')
    ? zustandNormal({ ...Z, __zustand: false, status: Z.status === 'aktion' ? 'offen' : Z.status,
        zusatz: Z.zusatz.filter((s) => s !== 'aktion'), aktion: null, rabatt: null })
    : Z;
  const passantenFaktor = K.matt ? 0.5 : K.abverkauf ? 0.8 : 0.7;
  const dek = zustandsDekor(S, scene, koerper, dekZustand, { pylon: opt.pylon, passanten: opt.passanten, passantenFaktor, sportPalette: ['#203e61', '#e24739', '#26a0af', '#e0ae33', '#f2f3f0', '#272d36'], abrissSeite: opt.abrissSeite, logosAbdecken: true });
  hoehe = Math.max(hoehe, dek.hoehe);
  return { hoehe, w: m.w, d: m.d, familie: fam, teile: S.anzahl - start, status: Z.status, pinAnker: dek.pinAnker };
}
