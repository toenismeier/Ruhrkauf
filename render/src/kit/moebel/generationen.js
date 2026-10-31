// O08 Umbau: gleiche Möbelgeometrie, drei Materialgenerationen.
// Das Material wird nur für neutrale Möbeloberflächen getauscht; die Ware bleibt farbecht.
const MATERIAL = {
  '#737e85':['#77573a','#7b8791'], '#444c55':['#6c4c32','#737a81'],
  '#e8ebea':['#a78158','#b8bec5'], '#dce1e1':['#d5ba91','#c5cbd0'],
  '#3b434b':['#705036','#858e96'], '#f4f1ed':['#ead5b1','#d5d9db'],
  '#343b42':['#765638','#717d88'], '#9ba5ad':['#bd9b6e','#aeb7c0'],
  '#aab3b9':['#b8996b','#b6c1c8'], '#5d666f':['#846344','#85949c'],
  '#f2f1ee':['#e7d2b2','#e0e1e0'], '#e8e6e1':['#ddc7a4','#d6d8d9'],
};
// Neutrale Töne (Korpus, Boden, Decke, Wand) bekommen je Generation eine eigene Materialwelt:
// 1 = 90er warm (Buche, Messing, Beige), 2 = 2000er kühl (Grau, Chrom). Farbige Ware bleibt unverändert.
const CACHE = [new Map(), new Map()];
function hsl(hex) {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const sat = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, sat, l];
}
function hex(h, sat, l) {
  const c = (1 - Math.abs(2 * l - 1)) * sat, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return '#' + [r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
}
function umfaerben(farbe, nummer) {
  const k = String(farbe).toLowerCase();
  if (MATERIAL[k]) return MATERIAL[k][nummer - 1];
  if (!/^#[0-9a-f]{6}$/.test(k)) return farbe;
  const [h, sat, l] = hsl(k);
  // Nur neutrale oder leicht warme Materialtöne; Ware, Schilder, Markenfarben bleiben.
  if (sat > 0.28 && !(h >= 20 && h <= 50 && sat < 0.5)) return farbe;
  if (nummer === 1) return l > 0.82 ? hex(38, 0.42, l * 0.9) : l > 0.45 ? hex(30, 0.38, l * 0.82) : hex(25, 0.35, Math.max(0.16, l * 0.9));
  return l > 0.82 ? hex(205, 0.06, l * 0.88) : hex(208, 0.08, l * 0.95);
}
export function farbeGeneration(farbe, generation=3) {
  const nummer = Math.max(1,Math.min(3,Math.round(generation)));
  if (nummer===3) return farbe;
  const c = CACHE[nummer - 1];
  if (!c.has(farbe)) c.set(farbe, umfaerben(farbe, nummer));
  return c.get(farbe);
}
export function baueMoebelGeneration(def, L, r, d, ctx={}, generation=3) {
  if (generation===3) return def.bau(L,r,d,ctx);
  // Der Proxy transformiert ausschließlich Farben, nicht Maße, Budget oder RNG-Folge.
  const zeichnet = new Proxy(L,{
    get(z, k) {
      const methode=Reflect.get(z,k);
      if (typeof methode!=='function' || !['box','zyl','geo'].includes(k)) return methode;
      return (...werte)=>{
        const stelle=k==='geo'?4:6;
        if (typeof werte[stelle]==='string') werte[stelle]=farbeGeneration(werte[stelle],generation);
        return methode.apply(z,werte);
      };
    }
  });
  return def.bau(zeichnet,r,d,ctx);
}
