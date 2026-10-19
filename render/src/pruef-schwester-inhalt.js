// Auftrag Schwesterkette: Datensaetze, Standortzuordnung, Groessenregeln, Nachbarvarianten und echte Stadtplaene.
import hauser from '../haeuser-schwester.json';
import haupt from '../haeuser.json';
import { STADTLISTE, nachbarStaedte } from './kit/staedte.js';
import { stadtplan } from './kit/stadtplan.js';
import { masseSchwester, familieSchwester, architekturSchwester, NAME_SCHWESTER } from './kit/schwesterhaus.js';
import { ABT_NAMEN, abteilungsArt } from './kit/abteilung.js';

const fehler = [];
const soll = (bed, txt) => { if (!bed) fehler.push(txt); };
const namen = new Set(), kombis = new Set(), formsignaturen = new Map();
soll(hauser.length === 24, 'Genau 24 Schwesterfilialen erforderlich');
soll(NAME_SCHWESTER === 'Volkskauf', 'Kettenname muss Volkskauf sein');
for (const [i, h] of hauser.entries()) {
  soll(h.id === 'K' + String(i + 1).padStart(3, '0'), 'ID ' + h.id);
  soll(h.format === 'schwester' && h.kette === 'schwester', h.id + ': Format');
  soll(h.baujahr >= 1955 && h.baujahr <= 1979, h.id + ': Baujahr');
  soll(h.substanz >= 15 && h.substanz <= 60, h.id + ': Substanz');
  soll(['1a', 'b'].includes(h.lage), h.id + ': Lage');
  soll(['mittelstadt', 'grossstadt'].includes(h.cluster), h.id + ': Cluster');
  soll(!namen.has(h.stadt), h.id + ': doppelte Stadt ' + h.stadt);
  namen.add(h.stadt);
  const wh = haupt.filter((e) => e.stadt === h.stadt && e.format === 'warenhaus');
  const max = Math.max(0, ...wh.map((x) => x.grundflaecheQm || 0));
  soll(max > 0 && h.grundflaecheQm <= max * 0.8, h.id + ': >80 Prozent von Hartwig');
  const n = h.etagen.filter((e) => e >= 0).length;
  soll(n === 4 || n === 5, h.id + ': 3 bis 4 OG');
  soll(h.etagen.includes(-1) && !h.flaechen.some((x) => x.etage === -1 && x.konzept === 'eigen'), h.id + ': UG nur Lager');
  soll(!h.flaechen.some((x) => x.gruppe === 'food' || x.gruppe === 'restaurant'), h.id + ': kein Restaurant und keine Feinkost');
  const fam = familieSchwester(h), combo = fam + '/' + h.fassade;
  soll(fam >= 1 && fam <= 3, h.id + ': Familie');
  soll(!kombis.has(combo), h.id + ': doppelte Familien-/Variantenkombination');
  kombis.add(combo);
  // Identische Silhouette aus Familie/Geschosszahl/Achsbreite/Dachlayout ist unzulässig.
  const arch = architekturSchwester(h);
  const signatur = [arch.familie, arch.n, arch.achsenBreite, arch.dachLayout].join('/');
  soll(!formsignaturen.has(signatur), h.id + ': gleiche Formsignatur wie ' + formsignaturen.get(signatur));
  formsignaturen.set(signatur, h.id);
  soll(['scharf', 'gefast', 'gerundet'].includes(arch.ecke), h.id + ': Eckausbildung fehlt');
  // Datenebene: keine doppelte Warengruppe oder Abteilungsbeschriftung auf derselben Verkaufsetage.
  for (const e of h.etagen.filter((n) => n >= 0)) {
    const namen = new Set(), gruppen = new Set();
    for (const fl of h.flaechen.filter((q) => q.etage === e)) {
      const art = abteilungsArt(fl), titel = ABT_NAMEN[art] ?? art;
      soll(!gruppen.has(art), h.id + ' ' + e + '. Etage: doppelte Warengruppe ' + art);
      soll(!namen.has(titel), h.id + ' ' + e + '. Etage: doppelte Abteilungsbezeichnung ' + titel);
      gruppen.add(art); namen.add(titel);
    }
  }
  const m = masseSchwester(h);
  soll(m.w * m.d <= max * 0.85, h.id + ': tatsächlicher Baukörper über großem Haus');
  const s = STADTLISTE.find((e) => e.name === h.stadt);
  soll(!!s && s.standorte.filter((e) => e.rolle === 'schwester').length === 1, h.id + ': in Stadtliste fehlt');
  for (const nb of nachbarStaedte(h.stadt)) {
    const other = hauser.find((v) => v.stadt === nb);
    if (other) soll(other.fassade !== h.fassade || familieSchwester(other) !== fam, h.id + ': gleiche Variante in ' + nb);
  }
}
const stadtFehler = [];
for (const s of STADTLISTE) {
  const plan = stadtplan(s.seed, { typ: s.typ, archetyp: s.archetyp, region: s.region,
    strassenFaktor: 1.6, ...s.extra, standorte: s.standorte });
  const schwester = plan.parzellen.filter((p) => p.typ === 'slot:schwester');
  const erwartet = hauser.some((h) => h.stadt === s.name) ? 1 : 0;
  if (schwester.length !== erwartet) stadtFehler.push(s.name + ': Schwester-Slot ' + schwester.length + ' statt ' + erwartet);
  const hartwig = new Set(plan.parzellen.filter((p) => p.typ === 'slot:warenhaus').map((p) => p.block));
  if (schwester.some((p) => hartwig.has(p.block))) stadtFehler.push(s.name + ': Schwester im Hartwig-Block');
}
fehler.push(...stadtFehler);
console.log('Schwesterkette: ' + hauser.length + ' Häuser · 3 Familien · ' + formsignaturen.size + ' individuelle Silhouetten · ' + kombis.size + ' Varianten · ' + STADTLISTE.length + ' Städte geprüft');
if (fehler.length) {
  for (const e of fehler) console.error('FEHLER:', e);
  process.exitCode = 1;
} else console.log('Schwesterkette: 0 Fehler');
