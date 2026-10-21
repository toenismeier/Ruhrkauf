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
export function farbeGeneration(farbe, generation=3) {
  const nummer = Math.max(1,Math.min(3,Math.round(generation)));
  return nummer===3 ? farbe : MATERIAL[String(farbe).toLowerCase()]?.[nummer-1] ?? farbe;
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
