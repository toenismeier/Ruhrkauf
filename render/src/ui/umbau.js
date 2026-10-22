// O08 Umbau: Haus-Steckbrief, Projektplanung und konzernweite Modernisierung.
import { geld, esc, fmt } from './format.js';
const ETAGE=(nr)=>nr===-1?'UG':nr===0?'EG':nr+'. OG';
const BEZEICHNUNG={auffrischung:'Auffrischung',ladenbau:'Ladenbau neu',komplett:'Komplettumbau',technik:'Technik'};
export function umbauModul(ctx) {
  const E=ctx.E, s=()=>ctx.s();
  const ui={aktiv:false,haus:null,etage:0,stufe:'auffrischung'};
  const zustand=()=>E.umbauUebersicht(s());
  const kw=(w)=>'KW '+((w%52)+1)+'/'+(s().startJahr+Math.floor(w/52));
  // Q30: im Hausdetail beantwortet der Block „Welche Etage braucht Bau?“, schlechteste Substanz zuerst.
  function hausKarte(id) {
    if(typeof E.umbauHaus!=='function')return '';
    const etagen=[...(E.umbauHaus(s(),id)??[])].sort((a,b)=>b.etage-a.etage);
    const zeilen=etagen.map((e)=>{
      const pf=e.pflichten,t=e.technik,frist=Math.min(pf.brandschutz,pf.aufzug),bald=frist-s().woche<13;
      const status=e.gesperrt?'<span class="hk-schlecht">Behördlich gesperrt</span>':e.projekt?'<span class="hk-achtung">Baustelle bis '+kw(e.projekt.ende)+'</span>':'';
      return '<div class="hk-zeile" data-umbau-etage="'+e.etage+'"><span class="hk-was">'+ETAGE(e.etage)+' · Substanz <span class="'+(e.substanz<35?'hk-schlecht':'')+'">'+Math.round(e.substanz)+'</span>'+
        '<small>Möbel Generation '+e.moebelGeneration+' · Klima '+t.klima+'/2 · Licht '+t.licht+'/2 · Brandschutz '+t.brandschutz+'/2</small>'+
        '<small class="'+(bald?'hk-achtung':'')+'">Prüffrist Brandschutz '+kw(pf.brandschutz)+' · Aufzug '+kw(pf.aufzug)+'</small>'+(status?'<small>'+status+'</small>':'')+'</span>'+
        '<button type="button" class="hk-knopf zweit" data-umbau="planen" data-id="'+esc(id)+'" data-etage="'+e.etage+'">Planen</button></div>';
    });
    return '<h3 class="hk-abschnitt">Bau und Technik<small>'+etagen.length+' Etagen</small></h3><div class="hk-liste" data-umbau-karte="'+esc(id)+'">'+zeilen.join('')+'</div>'+
      '<div class="hk-knopfreihe"><button type="button" class="hk-knopf text" data-umbau="modernisierung">Konzernprogramm Modernisierung</button></div>';
  }
  function anzeigen() {
    const B='<i class="hk-bereich" data-bereich="haus" data-symbol="haus" aria-hidden="true"></i>';
    if(ui.haus) {
      const h=s().haeuser.find(x=>x.id===ui.haus);
      const p=E.umbauSchaetzung(s(),ui.haus,ui.etage,ui.stufe);
      const aktiv=(s().umbau?.projekte??[]).some(x=>x.status==='laufend'&&x.haus===ui.haus&&x.etagen.includes(ui.etage));
      const rest=zustand().rest;
      let html=B+'<div class="hk-rumpf"><h3 class="hk-abschnitt">'+esc(h?.name??'Haus')+' · '+ETAGE(ui.etage)+'</h3>';
      html+='<div class="hk-seg" role="group" aria-label="Umbaustufe">'+Object.entries(BEZEICHNUNG).map(([id,name])=>'<button type="button" aria-pressed="'+(id===ui.stufe)+'" data-umbau="stufewahl" data-v="'+id+'">'+name+'</button>').join('')+'</div>';
      html+='<div class="hk-gross" style="--n:2"><div><span>Kosten</span><b class="'+((p?.kosten??0)>rest?'schlecht':'')+'">'+geld(p?.kosten??0)+'</b><i>Budgetrest '+geld(rest)+'</i></div><div><span>Kaufquote</span><b class="gut">+'+Math.round((p?.kaufquote??0)*100)+' %</b><i>nach Fertigstellung</i></div></div>';
      html+='<div class="hk-liste"><div class="hk-zeile"><span class="hk-was">Fläche</span><span class="hk-wert">'+fmt.format(p?.qm??0)+' qm</span></div><div class="hk-zeile"><span class="hk-was">Bauzeit</span><span class="hk-wert">'+(p?.wochen??0)+' Wochen</span></div></div>';
      if(ui.stufe==='komplett')html+='<div class="hk-hinweis achtung"><span>Ein Komplettumbau betrifft das gesamte Haus.</span></div>';
      if(aktiv)html+='<div class="hk-hinweis achtung"><span>Auf dieser Etage läuft bereits eine Baustelle.</span></div>';
      html+='<div class="hk-knopfreihe"><button type="button" class="hk-knopf breit" data-umbau="starten" '+(aktiv?'disabled':'')+'>Umbau starten</button></div>';
      html+='<div class="hk-knopfreihe"><button type="button" class="hk-knopf text" data-umbau="modernisierung">Zum Konzernprogramm</button></div></div>';
      ctx.panel('Umbau planen',esc(h?.stadt??''),html);
      ui.aktiv=true;return;
    }
    const u=zustand();
    // Hauptfrage: Wo bringt das Baubudget am meisten?
    let html=B+'<div class="hk-rumpf"><div class="hk-gross" style="--n:2"><div><span>Budget frei</span><b class="'+(u.rest<0?'schlecht':'')+'">'+geld(u.rest)+'</b><i>von '+geld(u.budget)+' · verbraucht '+geld(u.verbraucht)+'</i></div><div><span>Baustellen</span><b>'+u.laufend.length+'</b><i>'+u.premiumInvestitionen+' Premium-Investitionen</i></div></div>';
    html+='<h3 class="hk-abschnitt">Vorschläge Bau und Ladenbau<small>nach Rendite</small></h3>';
    html+=u.programm.length?'<div class="hk-liste">'+u.programm.slice(0,20).map((v)=>'<button type="button" class="hk-zeile hk-tippbar" data-umbau="planen" data-id="'+esc(v.haus)+'" data-etage="'+v.etage+'"><span class="hk-was">'+esc(v.name)+' · '+ETAGE(v.etage)+'<small>'+BEZEICHNUNG[v.stufe]+' · '+geld(v.kosten)+'</small></span><span class="hk-wert gut">'+v.rendite.toFixed(1).replace('.',',')+' %<small>Jahrespotenzial</small></span></button>').join('')+'</div>'
      :'<div class="hk-leer">Bau und Ladenbau haben keine lohnenden Vorschläge.</div>';
    html+='<h3 class="hk-abschnitt">Laufende Baustellen<small>'+u.laufend.length+'</small></h3>';
    html+=u.laufend.length?'<div class="hk-liste">'+u.laufend.map((p)=>'<div class="hk-zeile"><span class="hk-was">'+esc(s().haeuser.find(x=>x.id===p.haus)?.name??p.haus)+'<small>'+BEZEICHNUNG[p.stufe]+' · bis '+kw(p.ende)+'</small></span><span class="hk-wert">'+geld(p.kosten)+'</span></div>').join('')+'</div>'
      :'<div class="hk-leer">Keine laufenden Umbauten.</div>';
    html+='</div>';
    ctx.panel('Modernisierung','Programm '+u.jahr+' · Bau und Ladenbau',html,'gross');
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
    if(art==='stufewahl'){ui.stufe=el.dataset.v;anzeigen();return;}
    if(art==='starten'){tun({typ:'umbauPlanen',haus:ui.haus,etage:ui.etage,stufe:ui.stufe});return;}
  });
  document.getElementById('pinhalt').addEventListener('change',(ev)=>{
    if(!ui.aktiv||ev.target?.dataset.umbau!=='stufe')return;
    ui.stufe=ev.target.value;anzeigen();
  });
  return {oeffne:(haus=null,etage=0)=>{ui.haus=haus;ui.etage=etage;anzeigen();},hausKarte,zu:()=>{ui.aktiv=false;},aktiv:()=>ui.aktiv,neuZeichnen:()=>{if(ui.aktiv)anzeigen();}};
}
