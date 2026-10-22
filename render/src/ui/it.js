// O03 IT: Systemlandkarte, Projektvergleich, Meilensteine und clusterweiser Rollout.
import { esc, geld } from './format.js';
import { itProdukteKarten, itProduktDetail } from './it-produkte.js';

export function itModul(ctx) {
  const { E }=ctx, s=()=>ctx.s();
  const ui={ aktiv:false, reiter:'systeme', system:'kasse', art:'kaufen', generation:3, auswahl:null, projekt:null, produkt:null, bestaetigung:false };
  const optionen=['kaufen','entwickeln','dienstleister'];
  const artName={kaufen:'Standardsoftware',entwickeln:'Eigenentwicklung',dienstleister:'Dienstleister'};
  const phasen={konzept:'Konzept',umsetzung:'Umsetzung',rollout:'Rollout',abgeschlossen:'Abgeschlossen'};
  const prozent=x=>Math.round(x*100)+' %';
  function daten(){return E.itUebersicht(s());}
  function zeile(t,wert){return '<div class="zeile"><span class="was">'+esc(t)+'</span><b class="uq" style="min-width:90px">'+esc(String(wert))+'</b></div>';}
  function balken(w){return '<div class="it-fortschritt"><i style="width:'+Math.max(0,Math.min(100,Math.round(w*100)))+'%"></i></div>';}
  function reiter(){
    return '<div class="tabs">'+[['systeme','Systeme'],['produkte','Produkte'],['projekte','Projekte'],['neu','Neues Projekt']].map(x=>
      '<button type="button" class="tab '+(ui.reiter===x[0]?'an':'')+'" data-it="reiter" data-v="'+x[0]+'">'+x[1]+'</button>').join('')+'</div>';
  }
  function systemKarte(x) {
    const ampel=x.risiko<0.002?'gruen':x.risiko<0.01?'gelb':'rot';
    let h='<div class="karte"><div class="khead">'+esc(x.name)+'<small>Generation '+x.generation+' / 4</small></div>';
    h+='<div class="it-werte"><span>Alter <b>'+Math.floor(x.alter)+' Jahre</b></span><span>Kosten/Woche <b>'+geld(x.kostenWoche)+'</b></span><span class="it-ampel '+ampel+'">Ausfallrisiko '+prozent(x.risiko)+'/Woche</span></div>';
    if(x.wartungGekuendigt)h+='<p class="it-warn">Wartung durch den Anbieter beendet</p>';
    if(x.kasseAusbau)h+='<div class="zeile">SB-Kassen '+x.kasseAusbau.selbstbedienung+'/2 · Mobile Kasse '+x.kasseAusbau.mobil+'/2</div>';
    const akt=x.verteilung.filter(c=>c.generation>x.generation);
    if(akt.length)h+='<div class="zeile">Bereits modernisierte Cluster: '+akt.length+' / '+x.verteilung.length+'</div>';
    const bereiche=E.SYSTEME[x.id].bereiche;
    h+='<div class="it-meta">Begrenzt: '+esc(bereiche.join(', '))+'</div>';
    h+='<div class="oknoepfe"><button data-it="neues" data-v="'+x.id+'">Modernisieren</button></div></div>';
    return h;
  }
  function systeme(d){
    let h='<div class="raster"><div class="kz"><span>Systeme</span><b>'+d.systeme.length+'</b></div><div class="kz"><span>IT-Betrieb pro Woche</span><b>'+geld(d.betriebskostenWoche)+'</b></div></div>';
    h+='<div class="olief">CDO und IT-Leitung beeinflussen das Risiko von Verzögerungen und Störungen. Die Anfangsgenerationen bleiben für die Basiskalibrierung neutral.</div>';
    h+=d.systeme.map(systemKarte).join('');
    const k=d.systeme.find(x=>x.id==='kasse');
    if(k && k.generation>=2) {
      h+='<div class="karte"><div class="khead">Kassenausbau</div>';
      for(const art of ['selbstbedienung','mobil']){
        const stufe=k.kasseAusbau?.[art]??0;
        h+=zeile(art==='mobil'?'Mobile Kasse':'Selbstbedienungskassen','Stufe '+stufe);
        if(stufe<2)h+='<div class="oknoepfe"><button data-it="kasseAusbau" data-v="'+art+'">Stufe '+(stufe+1)+' beauftragen</button></div>';
      }
      h+='</div>';
    }
    return h;
  }
  function projektKarte(p,d) {
    let h='<div class="karte"><div class="khead">'+esc(E.SYSTEME[p.system].name)+'<small>Generation '+p.zielGeneration+' · '+esc(artName[p.art])+'</small></div>';
    h+='<div class="it-werte"><b>'+esc(phasen[p.phase])+'</b><b>'+prozent(p.fortschritt)+'</b></div>'+balken(p.fortschritt);
    h+=zeile('Kosten Ist / Plan',geld(p.kostenIst)+' / '+geld(p.kostenPlan));
    h+=zeile('Mehrwochen durch Verzug',p.verzug);
    h+=zeile('Rollout',p.erledigteCluster.length+' / '+p.clusterIds.length+' Cluster');
    const alle=new Map(d.cluster.map(c=>[c.id,c]));
    if(p.phase==='rollout'||p.phase==='umsetzung'||p.phase==='konzept'){
      const ausgabe=p.clusterIds.map((id,i)=>{
        const c=alle.get(id),fertig=p.erledigteCluster.includes(id);
        return '<div class="it-cluster '+(fertig?'fertig':'')+'"><span>'+(fertig?'✓ ':'')+esc(c?.name??id)+'</span>'+
          (fertig?'<b>Generation '+p.zielGeneration+'</b>':'<b>geplant</b>')+
          (!fertig&&p.erledigteCluster.length===0?
            '<div class="it-pfeile"><button data-it="hoch" data-p="'+p.id+'" data-i="'+i+'" '+(i===0?'disabled':'')+'>↑</button><button data-it="runter" data-p="'+p.id+'" data-i="'+i+'" '+(i===p.clusterIds.length-1?'disabled':'')+'>↓</button></div>':'')+'</div>';
      });
      h+='<details class="it-details"><summary>Rollout-Reihenfolge und Clusterkarte</summary>'+ausgabe.join('')+'</details>';
    }
    return h+'</div>';
  }
  function projekte(d){
    let h='<div class="olief">Projekte durchlaufen Konzept, Umsetzung und einen sequenziellen Rollout. Vier Wochen nach jedem Wechsel sind lokale Startprobleme möglich.</div>';
    const aktiv=d.projekte.filter(x=>x.phase!=='abgeschlossen');
    if(!aktiv.length)h+='<div class="karte"><div class="zeile">Keine laufenden Projekte.</div></div>';
    h+=aktiv.map(p=>projektKarte(p,d)).join('');
    const alt=d.projekte.filter(x=>x.phase==='abgeschlossen').slice(-8).reverse();
    if(alt.length)h+='<div class="vtitel">Abgeschlossene Projekte</div>'+alt.map(p=>projektKarte(p,d)).join('');
    h+='<div class="oknoepfe"><button data-it="reiter" data-v="neu">Neues Projekt planen</button></div>';
    return h;
  }
  function auswahl(d){
    if(!ui.auswahl){
      const sys=d.systeme.find(x=>x.id===ui.system);
      ui.auswahl=new Set(d.cluster.filter(c=>(sys?.verteilung.find(v=>v.id===c.id)?.generation??0)<ui.generation).map(c=>c.id));
    }
    return ui.auswahl;
  }
  function neu(d){
    const sys=d.systeme.find(x=>x.id===ui.system)??d.systeme[0];
    const ids=auswahl(d);
    const verfuegbar=d.cluster.filter(c=>c.generation===undefined||sys.verteilung.find(v=>v.id===c.id)?.generation<ui.generation);
    const ausgew=d.cluster.filter(c=>ids.has(c.id));
    const zulaessig=ui.art==='entwickeln'?ui.generation>=1:ui.generation===3||ui.art==='kaufen'&&ui.generation<=3;
    const plan=E.itProjektPlan(s(),ui.system,ui.art,ui.generation,ausgew.length);
    let h='<div class="karte"><div class="khead">Projekt konfigurieren</div>';
    h+='<div class="regler"><b>System</b><select class="ort gross" data-it-change="system">'+d.systeme.map(x=>
      '<option value="'+x.id+'" '+(x.id===ui.system?'selected':'')+'>'+esc(x.name)+'</option>').join('')+'</select></div>';
    h+='<div class="regler"><b>Realisierung</b><div class="seg">'+optionen.map(a=>
      '<button data-it="art" data-v="'+a+'" class="'+(ui.art===a?'an':'')+'">'+artName[a]+'</button>').join('')+'</div></div>';
    h+='<div class="regler"><b>Zielgeneration</b><div class="seg">'+[1,2,3,4].map(g=>
      '<button data-it="generation" data-v="'+g+'" '+(ui.generation===g?'class="an"':'')+' '+(ui.art!=='entwickeln'&&g===4||ui.art==='dienstleister'&&g!==3?'disabled':'')+'>'+g+'</button>').join('')+'</div></div>';
    h+='<div class="it-vergleich">'+optionen.map(art=>{
      const g=art==='dienstleister'?3:Math.min(ui.generation,art==='entwickeln'?4:3);
      const x=E.itProjektPlan(s(),ui.system,art,g,ausgew.length);
      return '<div class="'+(ui.art===art?'gewaehlt':'')+'"><b>'+artName[art]+'</b><small>'+x.gesamt+' Wo.</small><small>'+geld(x.kosten)+'</small><small>'+ (art==='entwickeln'?'hohes':art==='kaufen'?'geringes':'mittleres')+' Risiko</small></div>';
    }).join('')+'</div>';
    h+='<div class="vtitel">Rollout-Cluster ('+ausgew.length+' / '+d.cluster.length+')</div>';
    h+='<div class="oknoepfe"><button data-it="alle">Alle wählen</button><button data-it="keine">Keine wählen</button></div>';
    h+='<div class="it-clusterauswahl">'+d.cluster.map(c=>{
      const g=sys.verteilung.find(v=>v.id===c.id)?.generation??sys.generation;
      return '<label class="it-wahl"><input type="checkbox" data-it-cluster="'+esc(c.id)+'" '+(ids.has(c.id)?'checked':'')+' '+(g>=ui.generation?'disabled':'')+'><span>'+esc(c.name)+'</span><small>Generation '+g+'</small></label>';
    }).join('')+'</div>';
    h+=zeile('Geplante Laufzeit',plan.gesamt+' Wochen');
    h+=zeile('Planbudget',geld(plan.kosten));
    h+='<div class="oknoepfe"><button class="gruen" data-it="start" '+(!ausgew.length||!zulaessig||ausgew.some(c=>(sys.verteilung.find(v=>v.id===c.id)?.generation??sys.generation)>=ui.generation)?'disabled':'')+'>Projekt beauftragen</button></div>';
    h+='</div>';
    return h;
  }
  function produkte(){
    const k=E.itProdukte(s());
    const p=k.find(x=>x.id===ui.produkt);
    return p ? itProduktDetail(p,ui.bestaetigung) : itProdukteKarten(k);
  }
  function zeichnen(){
    if(!ui.aktiv)return;
    const d=daten(),seiten={systeme:'Systemlandkarte',produkte:'Digitale Produkte',projekte:'IT-Projekte',neu:'Neues IT-Projekt'};
    ctx.panel('IT · '+seiten[ui.reiter], 'CDO / Bereich IT · '+d.projekte.filter(x=>x.phase!=='abgeschlossen').length+' aktive Projekte',reiter()+
      (ui.reiter==='systeme'?systeme(d):ui.reiter==='produkte'?produkte():ui.reiter==='projekte'?projekte(d):neu(d)),'gross');
    ui.aktiv=true;
  }
  function aktion(a){
    const result=E.fuehreAus(s(),a);
    ctx.meldung(result.text,!result.ok);
    if(result.ok){ctx.nachAktion?.();zeichnen();}
  }
  // Unerwünschte globale Selektoren vermeiden: nur aktives IT-Panel verarbeitet Eingaben.
  function bearbeiten(el){
    const v=el.dataset.v, d=daten();
    switch(el.dataset.it){
      case 'reiter':ui.reiter=v;ui.auswahl=null;ui.produkt=null;ui.bestaetigung=false;break;
      case 'produkt':ui.reiter='produkte';ui.produkt=v;ui.bestaetigung=false;break;
      case 'zurueck':ui.produkt=null;ui.bestaetigung=false;break;
      case 'abschalten':ui.bestaetigung=true;break;
      case 'abbrechen':ui.bestaetigung=false;break;
      case 'team':{
        const r=E.fuehreAus(s(),{typ:'itProduktTeam',produkt:v,anzahl:Number(el.dataset.n)});
        ctx.meldung(r.text,!r.ok);if(r.ok)ctx.nachAktion?.();break;
      }
      case 'aktiv':{
        const p=E.itProdukte(s()).find(x=>x.id===v);if(!p)return;
        const r=E.fuehreAus(s(),{typ:'itProduktAktiv',produkt:v,an:!p.aktiv});
        ctx.meldung(r.text,!r.ok);if(r.ok)ctx.nachAktion?.();
        ui.bestaetigung=false;break;
      }
      case 'modernisieren':{
        const p=E.itProdukte(s()).find(x=>x.id===v);if(!p)return;
        if(v==='mobile_pay'){
          const k=d.systeme.find(x=>x.id==='kasse'),stufe=k?.kasseAusbau?.mobil??0;
          if(k?.generation>=3){
            if(stufe>=2){ctx.meldung('Mobile Kasse ist bereits vollständig ausgebaut.',false);break;}
            const r=E.fuehreAus(s(),{typ:'itKasseAusbau',art:'mobil',stufe:stufe+1});
            ctx.meldung(r.text,!r.ok);if(r.ok)ctx.nachAktion?.();break;
          }
        }
        ui.reiter='neu';ui.system=p.system;ui.generation=Math.max(3,p.generation+1);
        ui.auswahl=null;ui.produkt=null;break;
      }
      case 'neues':ui.reiter='neu';ui.system=v;ui.auswahl=null;ui.generation=3;break;
      case 'art':ui.art=v;if(v==='dienstleister')ui.generation=3;else if(v==='kaufen'&&ui.generation>3)ui.generation=3;break;
      case 'generation':ui.generation=Number(v);ui.auswahl=null;break;
      case 'alle':ui.auswahl=new Set(d.cluster.filter(c=>(d.systeme.find(x=>x.id===ui.system)?.verteilung.find(x=>x.id===c.id)?.generation??0)<ui.generation).map(c=>c.id));break;
      case 'keine':ui.auswahl=new Set();break;
      case 'start':{
        const clusterIds=d.cluster.filter(c=>auswahl(d).has(c.id)).map(c=>c.id);
        const result=E.fuehreAus(s(),{typ:'itProjekt',system:ui.system,art:ui.art,zielGeneration:ui.generation,clusterIds});
        ctx.meldung(result.text,!result.ok);if(result.ok){ctx.nachAktion?.();ui.reiter='projekte';}break;
      }
      case 'hoch':case 'runter':{
        const p=d.projekte.find(x=>x.id===el.dataset.p);if(!p)return;
        const i=Number(el.dataset.i),j=i+(el.dataset.it==='hoch'?-1:1);
        if(j<0||j>=p.clusterIds.length)return;
        const ids=[...p.clusterIds];[ids[i],ids[j]]=[ids[j],ids[i]];
        const result=E.fuehreAus(s(),{typ:'itRolloutPlan',projekt:p.id,clusterIds:ids});
        ctx.meldung(result.text,!result.ok);if(result.ok)ctx.nachAktion?.();
        break;
      }
      case 'kasseAusbau':{
        const x=d.systeme.find(x=>x.id==='kasse'),stufe=(x.kasseAusbau?.[v]??0)+1;
        const result=E.fuehreAus(s(),{typ:'itKasseAusbau',art:v,stufe});
        ctx.meldung(result.text,!result.ok);if(result.ok)ctx.nachAktion?.();break;
      }
      default:return;
    }
    zeichnen();
  }
  const inhalt=document.getElementById('pinhalt');
  inhalt.addEventListener('click',ev=>{
    if(!ui.aktiv)return;
    const el=ev.target.closest('[data-it]');if(el&&!el.disabled)bearbeiten(el);
  });
  inhalt.addEventListener('change',ev=>{
    if(!ui.aktiv)return;
    const el=ev.target;
    if(el.dataset.itChange==='system'){ui.system=el.value;ui.auswahl=null;ui.generation=3;zeichnen();}
    if(el.dataset.itCluster){const ids=auswahl(daten());if(el.checked)ids.add(el.dataset.itCluster);else ids.delete(el.dataset.itCluster);zeichnen();}
  });
  return {oeffne:(seite='systeme',produkt=null)=>{ui.aktiv=true;ui.reiter=seite;ui.produkt=seite==='produkte'?produkt:null;ui.bestaetigung=false;ui.auswahl=null;zeichnen();},
    zu:()=>{ui.aktiv=false;},aktiv:()=>ui.aktiv,
    pruefe:()=>({seite:ui.reiter,systeme:daten().systeme.length,projekte:daten().projekte.length})};
}
