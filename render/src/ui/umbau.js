// O08 Umbau: Haus-Steckbrief, Projektplanung und konzernweite Modernisierung.
import { geld, esc, fmt } from './format.js';
const ETAGE=(nr)=>nr===-1?'UG':nr===0?'EG':nr+'. OG';
const BEZEICHNUNG={auffrischung:'Auffrischung',ladenbau:'Ladenbau neu',komplett:'Komplettumbau',technik:'Technik'};
export function umbauModul(ctx) {
  const E=ctx.E, s=()=>ctx.s();
  const ui={aktiv:false,haus:null,etage:0,stufe:'auffrischung'};
  const zustand=()=>E.umbauUebersicht(s());
  function hausKarte(id) {
    if(typeof E.umbauHaus!=='function')return '';
    const etagen=E.umbauHaus(s(),id)??[];
    let html='<div class="karte" data-umbau-karte="'+esc(id)+'"><div class="khead">Bau · Modernisierung</div>';
    html+='<div class="tabs"><button class="tab an" data-umbau="haus" data-id="'+esc(id)+'">Bau</button><button class="tab" data-umbau="modernisierung">Konzernprogramm</button></div>';
    for(const e of [...etagen].reverse()) {
      const pf=e.pflichten,technik=e.technik;
      html+='<div class="zeile"><span class="was"><b>'+ETAGE(e.etage)+'</b> <i>Substanz '+Math.round(e.substanz)+'/100 · Möbel '+e.moebelGeneration+
        ' · Klima '+technik.klima+'/2, Licht '+technik.licht+'/2, Brandschutz '+technik.brandschutz+'/2</i>'+
        '<small>Prüffristen: Brandschutz W'+pf.brandschutz+' · Aufzug W'+pf.aufzug+'</small>'+
        (e.gesperrt?'<small class="rot">Behördlich gesperrt</small>':e.projekt?'<small>Baustelle bis Woche '+e.projekt.ende+'</small>':'')+'</span>'+
        '<button class="mini" data-umbau="planen" data-id="'+esc(id)+'" data-etage="'+e.etage+'">Umbau planen</button></div>';
    }
    return html+'</div>';
  }
  function anzeigen() {
    if(ui.haus) {
      const h=s().haeuser.find(x=>x.id===ui.haus);
      const p=E.umbauSchaetzung(s(),ui.haus,ui.etage,ui.stufe);
      const aktiv=(s().umbau?.projekte??[]).some(x=>x.status==='laufend'&&x.haus===ui.haus&&x.etagen.includes(ui.etage));
      let html='<div class="karte"><div class="khead">Umbau planen</div><div class="zeile"><b>'+esc(h?.name??'Haus')+' · '+ETAGE(ui.etage)+'</b></div>';
      html+='<label>Stufe <select class="ort gross" data-umbau="stufe">'+Object.entries(BEZEICHNUNG).map(([id,name])=>'<option value="'+id+'"'+(id===ui.stufe?' selected':'')+'>'+name+'</option>').join('')+'</select></label>';
      html+='<div class="raster"><div class="kz"><span>Fläche</span><b>'+fmt.format(p?.qm??0)+' qm</b></div>'+
        '<div class="kz"><span>Kosten</span><b>'+geld(p?.kosten??0)+'</b></div>'+
        '<div class="kz"><span>Bauzeit</span><b>'+ (p?.wochen??0)+' Wochen</b></div>'+
        '<div class="kz"><span>Wirkung Kaufquote</span><b>+'+Math.round((p?.kaufquote??0)*100)+' %</b></div></div>';
      if(ui.stufe==='komplett')html+='<div class="zeile warnung">Komplettumbau betrifft das gesamte Haus.</div>';
      html+='<button class="breit gruen" data-umbau="starten" '+(aktiv?'disabled':'')+'>Umbau starten</button></div>';
      ctx.panel('Bau',esc(h?.stadt??''),html);
      ui.aktiv=true;return;
    }
    const u=zustand();
    let html='<div class="raster"><div class="kz"><span>Jahresbudget</span><b>'+geld(u.budget)+'</b></div>'+
      '<div class="kz"><span>Verbraucht</span><b>'+geld(u.verbraucht)+'</b></div>'+
      '<div class="kz"><span>Rest</span><b>'+geld(u.rest)+'</b></div>'+
      '<div class="kz"><span>Laufende Baustellen</span><b>'+u.laufend.length+'</b></div></div>';
    html+='<div class="karte"><div class="khead">Programm von Bau & Ladenbau · Priorität nach Rendite</div>';
    for(const v of u.programm.slice(0,20))html+='<button class="zeile" data-umbau="planen" data-id="'+esc(v.haus)+'" data-etage="'+v.etage+'"><span class="was"><b>'+esc(v.name)+'</b> · '+ETAGE(v.etage)+'<i>'+BEZEICHNUNG[v.stufe]+' · '+v.rendite.toFixed(1)+' % Jahrespotenzial</i></span><span>'+geld(v.kosten)+'</span></button>';
    html+='</div><div class="karte"><div class="khead">Laufende Baustellen</div>';
    if(!u.laufend.length)html+='<div class="zeile">Keine laufenden Umbauten.</div>';
    for(const p of u.laufend)html+='<div class="zeile"><span class="was"><b>'+esc(s().haeuser.find(x=>x.id===p.haus)?.name??p.haus)+'</b><i>'+BEZEICHNUNG[p.stufe]+' · bis Woche '+p.ende+'</i></span><span>'+geld(p.kosten)+'</span></div>';
    html+='</div><div class="karte"><div class="khead">Premium-Investitionen</div><div class="zeile">'+u.premiumInvestitionen+' laufend · zählen als freiwillige Modernisierung</div></div>';
    ctx.panel('Modernisierung','Programm '+u.jahr+' · Bau & Ladenbau',html,'gross');
    ui.aktiv=true;
  }
  function tun(a) {
    const r=E.fuehreAus(s(),a);
    ctx.meldung(r.text,r.ok);
    if(r.ok)ctx.nachAktion?.();
    anzeigen();
  }
  // Öffnen via Hauskarte und Konzernseite; alle Schaltflächen über ein Delegation-Event.
  document.getElementById('pinhalt').addEventListener('click',(ev)=>{
    const el=ev.target.closest('button[data-umbau]');if(!el)return;
    const art=el.dataset.umbau;
    if(art==='modernisierung'){ui.haus=null;anzeigen();return;}
    if(art==='haus'){ui.haus=null;ctx.hausOeffnen(el.dataset.id);return;}
    if(art==='planen'){ui.haus=el.dataset.id;ui.etage=Number(el.dataset.etage);ui.stufe='auffrischung';anzeigen();return;}
    if(art==='starten'){tun({typ:'umbauPlanen',haus:ui.haus,etage:ui.etage,stufe:ui.stufe});return;}
  });
  document.getElementById('pinhalt').addEventListener('change',(ev)=>{
    if(!ui.aktiv||ev.target?.dataset.umbau!=='stufe')return;
    ui.stufe=ev.target.value;anzeigen();
  });
  return {oeffne:(haus=null,etage=0)=>{ui.haus=haus;ui.etage=etage;anzeigen();},hausKarte,zu:()=>{ui.aktiv=false;}};
}
