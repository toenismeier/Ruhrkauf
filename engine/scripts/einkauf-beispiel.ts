// Schreibt render/einkauf-beispiel.json: Ergebnis der Einkaufsabfragen in Woche 30 von Seed 1 mit Bot C.
// Der Freigabe-Eingang enthält die Orders der Woche 29 (Bot C gibt erst zu Beginn der nächsten Woche frei).
import { writeFileSync } from 'fs';
import { join } from 'path';
import { eigenmarkenUebersicht, eigenmarkeVorschau, einkaufUebersicht, freigaben, neuesSpiel, wgDetail, wocheAbspielen, WG_DEF, EM_VORLAGEN } from '../src';
import { botTief } from './bot';

const ziel = process.argv[2] ?? join(__dirname, '..', '..', 'render');
const woche = Number(process.argv[3] ?? 30);
const s = neuesSpiel(1);
for (let i = 0; i < woche && s.phase !== 'zerschlagen'; i++) { botTief(s); wocheAbspielen(s); }
const v = EM_VORLAGEN[1];
const entwurf = { name: 'Marlene', zielgruppe: v.entwurf.zielgruppe, kategorie: v.entwurf.kategorie, preislage: v.entwurf.preislage, stil: v.entwurf.stil, qualitaet: v.entwurf.qualitaet, beschaffung: v.entwurf.beschaffung, budgetWoche: 40_000, wgAnteile: Object.fromEntries(v.wgs.map((w) => [w, 0.15])) };
const out = {
  seed: 1, woche: s.woche, bot: 'C (Schutzschirm, tiefe Sanierung)', phase: s.phase,
  einkaufUebersicht: einkaufUebersicht(s),
  wgDetail: Object.fromEntries(WG_DEF.filter((d) => s.basisUmsatz[d.bereich] !== undefined).map((d) => [d.id, wgDetail(s, d.id)])),
  freigaben: freigaben(s),
  eigenmarkenUebersicht: eigenmarkenUebersicht(s),
  eigenmarkeVorschau: { entwurf, ergebnis: eigenmarkeVorschau(s, entwurf) },
};
// Zusätzlich: Freigabe-Eingang in einer Orderrunde (Woche 36, Vororder Frühjahr/Sommer)
const r = structuredClone(s);
for (let i = r.woche; i < 36 && r.phase !== 'zerschlagen'; i++) { botTief(r); wocheAbspielen(r); }
(out as Record<string, unknown>).freigabenOrderrunde = freigaben(r);
writeFileSync(join(ziel, 'einkauf-beispiel.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`geschrieben: ${join(ziel, 'einkauf-beispiel.json')} (Woche ${s.woche}, ${out.freigaben.anzahl} offene Freigaben, ${Object.keys(out.wgDetail).length} WG)`);
