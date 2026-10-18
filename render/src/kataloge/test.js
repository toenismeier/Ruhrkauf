import { rng, FARBEN, fensterRaster, gesims, sockel, dachProfil, waehle } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
const eintraege = [3, 4, 5, 6].map((g, i) => ({
  titel: `Testhaus ${g} Geschosse`, unter: 'Basis-API',
  bau(S) {
    const r = rng(i + 1); const w = 18, d = 14, gh = 3.4, eg = 4.2, H = eg + g * gh;
    sockel(S, 0, 0, w, d);
    const f = waehle(r, FARBEN.fassadeHell);
    S.quader(0, 0, 0, w, H, d, f);
    gesims(S, 0, 0, w, d, H, 0.5, 0.3, '#ffffff');
    fensterRaster(S, 0, 0, w, d, '+z', { y0: eg, geschosse: g, gh, sims: '#ffffff' });
    fensterRaster(S, 0, 0, w, d, '+x', { y0: eg, geschosse: g, gh, sims: '#ffffff' });
    const dach = dachProfil(w, d, 3, d * 0.4, 'x'); dach.translate(w / 2, H, d / 2); S.add(dach, waehle(r, FARBEN.dach));
  },
}));
zeigeKatalog(eintraege, { titel: 'Test', spalten: 4, kachel: [400, 400] });
