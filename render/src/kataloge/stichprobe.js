// Stichproben außerhalb des Zentrums: je Stadt zwei feste Zufallspunkte (Wohnviertel, Rand, Gewerbe).
import { zeigeKatalog } from '../kit/katalog.js';
import { standortEintrag } from './_standorte-staedte.js';
import '../kit/archetypen/index.js';
const STAEDTE = (new URLSearchParams(location.search).get('s') ?? 'Essen,Hamburg,Leipzig,München,Frankfurt,Görlitz').split(',');
const eintraege = [];
STAEDTE.forEach((n, i) => {
  for (const [k, pt] of [[0, [0.22 + (i % 3) * 0.05, 0.3]], [1, [0.72, 0.68 - (i % 2) * 0.1]]]) {
    const e = standortEintrag(n, 'einkauf', 62, null, ` · Stichprobe ${k + 1}`, { punkt: pt });
    eintraege.push(e);
  }
});
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Stichproben außerhalb des Zentrums', spalten: 4, kachel: [720, 1280] }), 20));
