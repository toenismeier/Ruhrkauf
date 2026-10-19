// Ausführung: cd render && node pruef-ladenbau.js [--teile] [S017,S002,...]
// Alle Sporthäuser, alle Verkaufsetagen. Nicht mit der Abnahme der Alt-Etagen verwechseln.
import haeuser from '../haeuser.json';
import { Sammler } from './kit/basis.js';
import { ladenplan, baueLadenplan } from './kit/ladenplan.js';
import { sportLadenEingabe } from './kit/ladenbau-sport.js';
import { pruefeLadenplan } from './kit/ladenbau-pruefung.js';

const args=process.argv.slice(2);
const teileMessen=args.includes('--teile');
const ids=(args.find(x=>!x.startsWith('--'))??'').split(',').filter(Boolean);
const sport=haeuser.filter(h=>h.format==='sport'||/^S\d/.test(h.id)).filter(h=>!ids.length||ids.includes(h.id));
if(!sport.length)throw new Error('Keine Sporthäuser gefunden');
const zeilen=[],fehler=[];
console.log('Haus    Etage  Familien  Räume  Möbel  Wand %  Dichte %  Leer m  Böden  Teile  Fehler');
for(const h of sport)for(const etage of h.etagen.filter(e=>e>=0)){
  let i=null;
  try {
    const eing=sportLadenEingabe(h,etage);
    const plan=ladenplan(eing.flaeche,'sport',eing.abteilungen,h.id+':'+etage);
    let teile=null;
    if(teileMessen){
      const S=new Sammler();
      teile=baueLadenplan(S,null,plan,{vorbereiten:false}).teile;
      // Referenzen freigeben; Sammler-Geometrien gehören dieser Etagenmessung.
      for(const geometrien of S.teile.values())for(const g of geometrien)g.dispose();
      S.teile.clear();
    }
    const q=pruefeLadenplan(plan,{teile});
    i={haus:h.id,etage,familie:eing.familie,plan,pruefung:q};
    const m=q.messwerte;
    const meldung=[
      h.id.padEnd(7),String(etage).padStart(4),
      String(eing.familie).padStart(8),String(m.abteilungen).padStart(6),
      String(m.moebel).padStart(6),(100*m.wandbelegung).toFixed(1).padStart(7),
      (100*m.dichte).toFixed(1).padStart(9),m.groessteLeerflaecheM.toFixed(1).padStart(8),
      String(m.bodenarten).padStart(6),String(m.teile??'–').padStart(6),
      String(q.fehler.length).padStart(6)
    ].join(' ');
    console.log(meldung);
    for(const e of q.fehler)fehler.push(h.id+' '+etage+': '+e);
  } catch(e) {
    fehler.push(h.id+' '+etage+': Planabbruch: '+e.message);
    console.log(h.id.padEnd(7)+String(etage).padStart(4)+'  PLANABBRUCH '+e.message);
  }
  if(i)zeilen.push(i);
}
console.log('Zusammenfassung: '+sport.length+' Sporthäuser, '+zeilen.length+' Pläne, '+fehler.length+' Verstöße');
for(const f of fehler)console.error('FEHLER '+f);
if(!teileMessen)console.warn('Hinweis: Teilebudget nicht gemessen (erneut mit --teile ausführen).');
if(fehler.length)process.exitCode=1;
