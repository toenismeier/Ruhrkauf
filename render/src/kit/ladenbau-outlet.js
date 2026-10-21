// FUNDUS: ein gemeinsames Planungsmodell für alle drei Bauformen und jedes Verkaufsgeschoss.
// Keine statischen Deko-Inseln: Sortimentsrechtecke, lange Kleiderstangen und klare Laufwege.
export const FUNDUS_INNEN_ZUSTAENDE = Object.freeze(['normal', 'schwach', 'ansturm', 'raeumung']);
const SORTIMENTE = Object.freeze({
  damen: { titel: 'Damen', anteil: 0.34 },
  herren: { titel: 'Herren', anteil: 0.20 },
  kinder: { titel: 'Kinder', anteil: 0.12 },
  schuhe: { titel: 'Schuhe', anteil: 0.14 },
  taschen: { titel: 'Taschen & Accessoires', anteil: 0.08 },
  home: { titel: 'Home', anteil: 0.08 },
  beauty: { titel: 'Beauty', anteil: 0.04 },
});
// Beim Mehrgeschosser wechseln die Warenbereiche zwischen den Etagen.
// Damen bleibt im ganzen Haus das größte Sortiment.
const ETAGEN = Object.freeze({
  1: [['damen','herren','kinder','schuhe','taschen','home','beauty']],
  2: [['damen','schuhe','taschen','beauty'], ['damen','herren','kinder','home']],
  3: [['damen','schuhe','beauty'], ['damen','herren','taschen'], ['damen','kinder','home']],
});
export function fundusInnenZustand(zustand) {
  const s=String(zustand??'normal').toLowerCase();
  if(s==='schwach' || s==='schwach_bestueckt' || s==='schwach-bestueckt')return 'schwach';
  if(s==='ansturm' || s==='neueroeffnung')return 'ansturm';
  if(s==='raeumung' || s==='leer')return 'raeumung';
  return 'normal';
}
export function outletLadenEingabe(haus, masse, geschoss=0) {
  const n=Math.max(1,Math.min(3,masse.n));
  if(!Number.isInteger(geschoss)||geschoss<0||geschoss>=n)throw new Error('Ungültiges FUNDUS-Verkaufsgeschoss: '+geschoss);
  const ids=ETAGEN[n][geschoss];
  const abteilungen=ids.map(id=>({
    id, titel:SORTIMENTE[id].titel,
    qm:Math.round(masse.bw*masse.bd*SORTIMENTE[id].anteil),
  }));
  // Der Außenkörper besitzt den Eingang mittig an der +z-Glasfront.
  // Wand und Hauptgang bleiben frei; die Treppen-/Rolltreppenzone liegt
  // seitlich außerhalb des eigentlichen Innenplans der ersten Stufe.
  return {
    flaeche: {
      breite:masse.bw, tiefe:masse.bd,
      eingaenge:[{x:masse.bw*0.52,z:masse.bd}],
      hindernisse:[],
    },
    abteilungen, etage:geschoss, familie:masse.familie, id:haus.id,
  };
}
export function outletGeschossHoehe(masse, geschoss) {
  return geschoss===0 ? 0.48 : 5.02+(geschoss-1)*3.9;
}
