// Q02: geometrische Trockenprüfung. Keine WebGL-Kontexte und keine Bilder erforderlich.
import { rng } from './basis.js';
import { baueStadt } from './stadt.js';
import { dachInstallationen } from './dach-qualitaet.js';
import { neueQualitaetsdaten, pruefeQualitaetsdaten } from './q02-qualitaet.js';

export function pruefeStadtQualitaet(plan) {
  const protokoll = neueQualitaetsdaten();
  // Sammler und Instanzer erfassen nur die Anordnungen; Render-Geometrie wird nicht aufgebaut.
  const S = {
    anzahl: 0,
    quader() { this.anzahl++; },
    box() { this.anzahl++; },
    add(g) { this.anzahl++; g?.dispose?.(); },
  };
  const I = { n: 0, setze() { this.n++; }, bauen() { return 0; } };
  baueStadt(S, { add() {} }, plan, undefined, { ohneHaeuser: true, instanzer: I, qualitaet: protokoll });
  // Dieselbe Installationsfunktion wie der Warenhausbauer wird auf sämtlichen geeigneten
  // Dachrechtecken der Stadt mit stabilen Seedwerten auf Geometriefehler geprüft.
  for (const p of plan.parzellen.filter((q) => q.typ === 'slot:warenhaus' || q.typ === 'slot:sport' || q.typ === 'slot:schwester')) {
    const dach = { x0: p.x + 1, z0: p.z + 1, x1: p.x + p.w - 1, z1: p.z + p.d - 1, y: 15, steil: false };
    dachInstallationen(S, dach, rng(p.seed ?? plan.seed), { max: 4, protokoll: protokoll.daecher });
  }
  return pruefeQualitaetsdaten(protokoll);
}
