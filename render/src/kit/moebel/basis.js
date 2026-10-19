// Einheitliche, deterministische Ladenbau-Möbel. Koordinaten: x um 0, z ab Rückkante 0, y ab Fußboden.
// Der gemeinsame lokale Rahmen (innen.js: lokal) bestimmt die Ausrichtung; Schrift kommt ausschließlich aus basis.js.
import { THREE, LOD, textMaterial } from '../basis.js';

export const VIERTEL = 1.25;
export const PALETTEN = Object.freeze({
  laufen: ['#e8403a', '#1f6fd1', '#f4f4f0', '#26292e', '#ffcb30'],
  kinder: ['#ff9e43', '#1e9ed0', '#f5dd67', '#e75067', '#58b66a'],
  textil: ['#294c83', '#d83f43', '#30363b', '#e1ded6', '#52a47d', '#ca9f5d'],
  outdoor: ['#526e42', '#c46c35', '#d7ab57', '#3c667e', '#454442'],
  rad: ['#d63e34', '#343940', '#2f79ba', '#f0bc39', '#5a9b64'],
  winter: ['#d94e3e', '#3b7fbb', '#f4f4ed', '#333e4b', '#50bfd0'],
  team: ['#388e57', '#c23b3b', '#2a579b', '#f0be3d', '#f1eee5'],
  fitness: ['#2a3239', '#db5b3f', '#68a6b8', '#b7c2c9'],
  outlet: ['#d54b55', '#365b87', '#d8af5e', '#5b8b65', '#eee4d8', '#a56f9d', '#48494d'],
  allgemein: ['#b68b5c', '#e4d8c3', '#384c5b', '#bd6a5b', '#7c654f'],
});

export function definition(id, titel, bereich, typ, rasterB, rasterT, hoehe, budget, bau) {
  if (!['wand','gondel','insel','kasse','deko','service'].includes(typ)) throw new Error('Möbeltyp unbekannt: '+typ);
  if (![2,3,4,6,8].includes(rasterB) || !Number.isInteger(rasterT) || rasterT < 1) throw new Error('Ungültiges Möbelraster: '+id);
  return Object.freeze({ id, titel, bereich, rasterB, rasterT, hoehe, typ, budget, bau });
}
export const farbe = (r, pal) => pal[Math.min(pal.length - 1, Math.floor(r() * pal.length))];
export const palette = (art) => PALETTEN[art] ?? PALETTEN.allgemein;
export const detail = (d) => LOD.stufe !== 'fern' && d >= 0.45;
export const marke = (ctx, k, fallback) => ctx?.farben?.[k] ?? fallback;

// Text im Sammler-Lokalrahmen, nur bei vorhandener Browser-Szene. Kein eigener Textur-Cache.
export function textAuf(L, text, x, y, z, breite, hoehe, farbeText = '#ffffff', farbeGrund = '#343a40') {
  if (!L.S.szene || typeof document === 'undefined' || LOD.stufe === 'fern') return;
  const a = textMaterial(text, farbeText, { groesse: 108, hintergrund: farbeGrund });
  const h = Math.min(hoehe, breite / Math.max(0.1, a.seitenverhaeltnis));
  const m = new THREE.Mesh(new THREE.PlaneGeometry(h * a.seitenverhaeltnis, h), a.mat);
  const [X, Z] = L.P(x, z);
  m.position.set(X, L.oy + y, Z); m.rotation.y = L.rot;
  L.S.szene.add(m);
}

// Einheitliche Wandoberkante 2,40 m, Sockel 0,12 m; Kopfband 2,40 bis 3,00 m.
export function wandModul(L, r, d, ctx = {}, o = {}) {
  const w = o.w ?? 5, pal = palette(o.pal ?? 'allgemein'), material = o.alt ? '#896b51' : '#e8ebea';
  const rahmen = o.alt ? '#634833' : '#444c55';
  L.box(w, 0.12, 0.6, 0, 0, 0.3, rahmen);
  L.box(w, 2.28, 0.08, 0, 0.12, 0.04, material);
  L.box(w, 0.1, 0.6, 0, 2.3, 0.3, rahmen);
  L.box(w, 0.60, 0.08, 0, 2.4, 0.04, o.akzent ?? rahmen);
  textAuf(L, o.titel ?? 'Sortiment', 0, 2.71, 0.095, Math.min(w - 0.2, 3.8), 0.40, '#ffffff', o.akzent ?? rahmen);
  if (LOD.stufe === 'fern') { L.box(w - 0.12, 1.55, 0.40, 0, 0.55, 0.31, pal[0]); return; }
  const n = Math.max(2, Math.round(w / (d < 0.45 ? 0.75 : 0.45))), a = w / n;
  const art = o.art ?? 'ware';
  if (['textil', 'trikot', 'jacken', 'taschen', 'trikotmix'].includes(art)) {
    const y = art === 'jacken' ? 2.08 : 1.82;
    L.box(w - 0.12, 0.045, 0.04, 0, y, 0.37, '#aab3b9');
    for (let i = 0; i < n; i++) {
      const f = farbe(r, pal), x = -w/2 + (i + 0.5) * a;
      L.box(Math.max(0.045, a * 0.75), art === 'jacken' ? 1.43 : 1.02, 0.22, x, art === 'jacken' ? 0.54 : 0.69, 0.40, f);
      if (d > 0.65 && i % 3 === 0) L.box(a * 0.4, 0.06, 0.24, x, y - 0.03, 0.41, '#d9e0e2');
    }
  } else {
    const ebene = art === 'ski' || art === 'board' || art === 'rad' ? 2 : 3;
    for (let j = 0; j < ebene; j++) {
      const y = 0.46 + j * (art === 'ski' ? 0.85 : 0.61);
      L.box(w - 0.08, 0.065, 0.52, 0, y, 0.32, rahmen);
      for (let i = 0; i < n; i++) {
        const x = -w/2 + (i + 0.5) * a, f = farbe(r, pal);
        if (art === 'schuhe' || art === 'stollen') {
          L.box(a * 0.60, 0.12, 0.32, x, y + 0.09, 0.34, f);
          if (d > 0.75) L.box(a * 0.35, 0.065, 0.12, x + a * 0.18, y + 0.18, 0.43, f);
        } else if (art === 'ball' || art === 'helm') {
          L.zyl(Math.min(0.18, a * 0.35), Math.min(0.18, a * 0.35), 0.31, x, y + 0.04, 0.35, f, 8);
        } else if (art === 'rucksack') {
          L.box(a * 0.65, 0.47, 0.28, x, y + 0.05, 0.37, f);
          if (detail(d)) L.box(a * 0.50, 0.1, 0.32, x, y + 0.38, 0.39, '#343b42');
        } else if (art === 'ski' || art === 'board') {
          L.box(a * 0.26, 0.77, 0.15, x, y + 0.08, 0.31, f);
        } else {
          const h = 0.13 + (i % 3) * 0.065;
          L.box(a * 0.83, h, 0.3, x, y + 0.03, 0.36, f);
        }
      }
    }
  }
}

// 1,25-m-Gondeltiefe, maximal 1,40 m hoch, frei einsehbare Gangachsen.
export function gondelModul(L, r, d, ctx = {}, o = {}) {
  const w = o.w ?? 2.5, pal = palette(o.pal ?? 'allgemein'), art = o.art ?? 'pakete';
  L.box(w, 0.12, 1.25, 0, 0, 0.625, '#737e85');
  L.box(w, 1.10, 0.13, 0, 0.12, 0.625, '#dce1e1');
  L.box(w, 0.085, 1.25, 0, 1.25, 0.625, '#3b434b');
  if (LOD.stufe === 'fern') {
    L.box(w - 0.12, 0.50, 1.0, 0, 0.55, 0.625, pal[0]); return;
  }
  for (const z of [0.27, 0.98]) for (let j = 0; j < 2; j++) {
    const y = 0.3 + 0.47 * j;
    L.box(w - 0.10, 0.06, 0.54, 0, y, z, '#9ba5ad');
    const n = Math.max(3, Math.floor(w / (art === 'ball' ? 0.5 : 0.35)));
    for (let i = 0; i < n; i++) {
      const f = farbe(r, pal), x = -w/2 + (i + 0.5) * w/n;
      if (art === 'ball') L.zyl(0.15, 0.15, 0.28, x, y + 0.07, z, f, 8);
      else if (art === 'textil') L.box(w/n * 0.76, 0.18, 0.38, x, y + 0.07, z, f);
      else L.box(w/n * 0.72, 0.28, 0.36, x, y + 0.06, z, f);
    }
  }
  // Aktionskopf innerhalb der eigenen Stellfläche
  L.box(Math.min(0.6, w * 0.15), 0.12, 1.17, w/2 - 0.3, 1.26, 0.625, o.akzent ?? '#d83f3f');
}

// Niedrige, einheitliche Bühnen; Varianten beeinflussen Waren und Geräte, nie den Grundriss.
export function inselModul(L, r, d, ctx = {}, o = {}) {
  const w = o.w ?? 2.5, t = 2.5, pal = palette(o.pal ?? 'allgemein'), art = o.art ?? 'ware';
  L.box(w, 0.2, t, 0, 0, t/2, o.boden ?? '#e8e6e1');
  if (LOD.stufe === 'fern') { L.box(w * 0.72, 0.6, 1.5, 0, 0.20, t/2, pal[0]); return; }
  if (['zelt', 'kanu', 'rad', 'tor', 'fitness', 'laufanalyse'].includes(art)) {
    if (art === 'zelt') {
      L.box(2.2, 0.08, 1.8, 0, 0.21, 1.2, '#6b7d5d');
      L.geo(new THREE.ConeGeometry(1.03, 1.07, 4).rotateY(Math.PI/4).scale(1, 1, 0.85).translate(0, 0.82, 1.2), 0, 0, 0, pal[0]);
    } else if (art === 'kanu') {
      L.box(Math.min(w - 0.2, 4.5), 0.23, 0.75, 0, 0.58, 1.3, pal[0]);
      L.box(1.4, 0.42, 0.1, -0.6, 0.20, 1.3, '#5b5f64');
      L.box(1.4, 0.42, 0.1, 0.6, 0.20, 1.3, '#5b5f64');
    } else if (art === 'rad') {
      const n = w > 3 ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const x = -w/2 + (i + 0.5) * w/n, z = 1.2;
        L.zyl(0.28, 0.28, 0.10, x, 0.24, z - 0.40, '#292c31', 12);
        L.box(0.06, 0.7, 0.08, x, 0.50, z, pal[i % pal.length]);
        L.box(0.7, 0.10, 0.07, x, 1.16, z, '#343b42');
      }
    } else if (art === 'tor') {
      L.box(2.2, 0.10, 0.09, 0, 1.25, 0.8, '#f2f2ed');
      for (const x of [-1.06,1.06]) L.box(0.09, 1.2, 0.09, x, 0.2, 0.8, '#f2f2ed');
      L.box(1.9, 0.04, 0.5, 0, 0.4, 1.05, '#9bc598');
    } else if (art === 'fitness') {
      L.box(1.5, 0.12, 0.65, 0, 0.36, 1.15, '#31363b');
      L.box(0.08, 0.80, 0.08, -0.5, 0.30, 1.15, '#5d666f');
      L.box(0.10, 0.70, 0.7, 0.6, 0.24, 1.15, pal[0]);
    } else {
      L.box(1.8, 0.26, 0.62, 0, 0.25, 1.1, '#3e454e');
      L.box(0.10, 0.75, 0.12, 0.6, 0.4, 1.1, '#a8b4bf');
      L.box(0.45, 0.40, 0.07, 0.6, 1.1, 1.2, '#6fa6c8');
    }
  } else if (art === 'puppen') {
    const n = Math.min(3, w > 3 ? 3 : 2);
    for (let i = 0; i < n; i++) {
      const x = -w/2 + (i + 0.5) * w/n;
      L.box(0.34, 0.56, 0.25, x, 0.75, 1.22, pal[i % pal.length]);
      L.box(0.18, 0.20, 0.18, x, 1.29, 1.22, '#cfaf91');
      L.box(0.09, 0.50, 0.12, x - 0.09, 0.25, 1.22, '#353f49');
      L.box(0.09, 0.50, 0.12, x + 0.09, 0.25, 1.22, '#353f49');
    }
  } else {
    L.box(w * 0.83, 0.65, 1.6, 0, 0.2, 1.25, '#f4f1ed');
    const n = Math.max(3, Math.floor(w / 0.55));
    for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) {
      L.box(w/n * 0.68, 0.2 + (j % 2)*0.10, 0.48, -w/2 + (i+0.5)*w/n, 0.85, 0.88+j*0.75, farbe(r,pal));
    }
  }
}

export function dekoModul(L, r, d, ctx = {}, o = {}) {
  const art = o.art ?? 'pflanze';
  if (art === 'pflanze') { L.box(0.9, 0.44, 0.9, 0, 0, 0.95, '#d7d1c7'); L.kugel(0.42, 0, 0.85, 0.95, '#5d9563'); }
  else if (art === 'klettern') { L.box(2.4, 2.7, 0.3, 0, 0, 0.17, '#d7d0c4'); if (LOD.stufe !== 'fern') for(let i=0;i<12;i++) L.box(0.21,0.14,0.14,(i%4-1.5)*0.48,0.3+Math.floor(i/4)*0.70,0.42,farbe(r,palette('outdoor'))); }
  else if (art === 'bild') { L.box(2.3, 2.7, 0.3, 0, 0, 0.17, '#e8e3dc'); L.box(1.9, 1.9, 0.06, 0, 0.4, 0.34, o.akzent ?? '#64879a'); }
  else if (art === 'banner') { L.box(0.09, 2.8, 0.09, 0, 0, 0.6, '#8b939a'); L.box(1.5, 0.8, 0.07, 0, 1.8, 0.6, o.akzent ?? '#ca5040'); textAuf(L, o.titel ?? 'Saison', 0, 2.24, 0.65, 1.3, 0.34); }
  else { L.box(1.8, 0.36, 0.8, 0, 0, 0.7, '#b9b3aa'); L.box(1.5, 0.55, 0.45, 0, 0.36, 0.7, o.akzent ?? '#b26a48'); }
}

export function serviceModul(L, r, d, ctx = {}, o = {}) {
  const w = o.w ?? 2.5, art = o.art ?? 'info';
  if (art === 'umkleide') {
    const n = o.kabinen ?? 2, tiefe = 1.9;
    L.box(w, 2.4, 0.08, 0, 0, 0.04, '#e0d9d0');
    for (let i=0;i<=n;i++) L.box(0.07,2.4,tiefe,-w/2 + i*w/n,0,tiefe/2,'#e0d9d0');
    for (let i=0;i<n;i++) L.box(w/n-0.15,2.1,0.06,-w/2+(i+0.5)*w/n,0.18,tiefe-0.04,'#8b7581');
    return;
  }
  const t = Math.min(1.85, o.tiefe ?? 1.2);
  L.box(w,0.18,t,0,0,t/2,'#333c45');
  L.box(w,0.89,t*0.63,0,0.18,t/2,'#e8e6df');
  L.box(w,0.12,t,0,1.07,t/2,'#6a737b');
  if (LOD.stufe === 'fern') return;
  if (art === 'werkstatt' || art === 'skiwerkstatt') {
    for(let i=0;i<Math.floor(w);i++) L.box(0.32,0.28,0.34,-w/2+(i+0.5)*w/Math.floor(w),1.19,t/2,farbe(r,palette(art==='skiwerkstatt'?'winter':'rad')));
    L.box(w-0.4,0.14,0.06,0,1.68,0.11,'#5c6268');
  } else if (art === 'bank') {
    L.box(w-0.25,0.30,0.62,0,1.0,t/2,'#8e7358');
  } else if (art === 'beflockung') {
    L.box(0.48,0.62,0.44,0,1.19,t/2,'#bd564a');
  } else {
    L.box(0.32,0.36,0.14,0,1.19,t/2,'#30383d');
  }
}
