// O01 Organisation: Zentrale und Vertrieb. Alle Kennzahlen stammen aus Engine-Abfragen.
import { esc, geld } from './format.js';
import { portraet } from './vorstand.js';
export function organisationModul(ctx) {
  const { E } = ctx, s = () => ctx.s();
  const ui = { aktiv:false, reiter:'zentrale', ebene:null, id:null };
  const bar = (q) => '<span class="org-balken"><i style="width:' + Math.round(Math.max(0,Math.min(1,q))*100) + '%"></i></span>';
  const name = (st) => st?.person ? esc(st.person.name) : '<span class="frei">unbesetzt – besetzen</span>';
  const aufgabenListe = (aufgaben, id, cluster = false) => {
    if (!aufgaben?.length) return '';
    return '<div class="org-aufgaben"><small>Delegation je Aufgabe, Änderungen wirken ab der nächsten Woche</small>' +
      aufgaben.map((a) => {
        const ziel = ' data-id="' + esc(id) + '" data-task="' + esc(a.id) + '"' + (cluster ? ' data-cluster="1"' : '');
        const schalter = '<button data-org="aufgabe"' + ziel + ' aria-pressed="' + a.an + '">' +
          (a.an ? 'Delegiert' : 'Beim CEO') + '</button>';
        const grenze = a.grenze === undefined ? '' : '<span class="org-grenze"><button data-org="grenze"' + ziel +
          ' data-grenze="' + a.grenze + '" data-delta="-10000" aria-label="Grenze senken">−</button>' +
          '<b>' + geld(a.grenze) + '</b><button data-org="grenze"' + ziel + ' data-grenze="' +
          a.grenze + '" data-delta="10000" aria-label="Grenze erhöhen">+</button></span>';
        return '<div class="org-aufgabe"><span>' + esc(a.name) + '</span>' + grenze + schalter + '</div>';
      }).join('') + '</div>';
  };
  const profil = (stelle, titel, ebene, id) => {
    if (!stelle) return '';
    const p = stelle.person;
    let h = '<button data-org="zurueck" class="zurueck">‹ Organigramm</button><div class="karte org-profil"><h3>' + esc(titel) + '</h3>';
    if (p) h += '<div class="vkopf"><span class="vbild gross">' + portraet(p.portraet,110) + '</span><div><b>' + esc(p.name) + '</b><small>' + geld(p.gehalt) + ' / Jahr</small>' + '<small>Qualität ' + Math.round(p.qualitaet*100) + '% · Stimmung ' + Math.round(p.stimmung) + '% · Wechselwille ' + Math.round(p.wechselwille*100) + '%</small></div></div><div class="oknoepfe"><button data-org="entlassen">Entlassen</button><button data-org="praemie">Halteprämie 10.000 €</button></div>';
    else h += '<div class="olief">Vakante Leitungsstelle – berichtet unmittelbar nach oben.</div>';
    h += '<h4>Kandidaten</h4>';
    for (const k of stelle.kandidaten) h += '<div class="zeile"><span class="vbild">' + portraet(k.portraet,56) + '</span><span class="was"><b>' + esc(k.name) + '</b><small>Qualität ' + Math.round(k.qualitaet*100) + '% · Jahresgehalt ' + geld(k.gehalt) + '</small>' + '</span><button data-org="besetzen" data-kandidat="' + esc(k.id) + '">Einstellen</button></div>';
    if(ebene==='cluster'){
      const moeglich=s().haeuser.filter((h)=>h.status==='offen'&&h.personal.filialleiter.skill>=0.7&&E.hausclusterVon(s(),h.id)?.id===id).slice(0,8);
      if(moeglich.length){
        h+='<h4>Hausleitungen befördern</h4>';
        for(const h0 of moeglich) h+='<div class="zeile"><span class="was">'+esc(h0.personal.filialleiter.name)+' · '+esc(h0.stadt)+'</span><button data-org="befoerdern" data-haus="'+esc(h0.id)+'">Befördern</button></div>';
      }
    }
    h += '</div>';
    return h;
  };
  function zeichnen() {
    const st = s(), x = E.organisationUebersicht(st);
    let h = '<div class="org-tabs"><button data-org="reiter" data-reiter="zentrale" class="' + (ui.reiter==='zentrale'?'an':'') + '">Zentrale</button><button data-org="reiter" data-reiter="vertrieb" class="' + (ui.reiter==='vertrieb'?'an':'') + '">Vertrieb</button></div>';
    if (ui.ebene) {
      const stelle = ui.ebene === 'bereich' ? x.bereiche.find((b)=>b.id===ui.id)?.stelle
        : ui.ebene === 'region' ? x.regionen.find((r)=>r.id===ui.id)?.stelle
        : [...x.regionen.flatMap((r)=>r.cluster),x.sonder].find((c)=>c?.id===ui.id)?.stelle;
      const titel = ui.ebene==='bereich' ? x.bereiche.find((b)=>b.id===ui.id)?.name :
        ui.ebene==='region' ? 'Region ' + ui.id : [...x.regionen.flatMap((r)=>r.cluster),x.sonder].find((c)=>c?.id===ui.id)?.name;
      h += profil(stelle,titel??ui.id,ui.ebene,ui.id);
    } else if (ui.reiter === 'zentrale') {
      for (const ressort of x.ressorts) {
        const bs=x.bereiche.filter((b)=>b.ressort===ressort.id);
        h+='<div class="karte"><div class="khead"><b>' + esc(ressort.id.toUpperCase()) + ' · ' + esc(ressort.name) + '</b><small>' + (ressort.person?esc(ressort.person.name):'<span class="frei">unbesetzt</span>') + '</small></div>';
        for (const b of bs) { h+='<div class="org-zeile"><span class="vbild">' + portraet(b.stelle?.person?.portraet,50) + '</span><div><b>'+esc(b.name)+'</b><small>' + name(b.stelle) + ' · Stufe ' + b.hqStufe + ' · ' + (b.berichtetAn==='spieler'?'CEO':b.berichtetAn.toUpperCase()) + '</small>' + '<small>' + b.offen + ' offene Vorlagen</small></div><div class="org-aktionen"><button data-org="profil" data-ebene="bereich" data-id="'+esc(b.id)+'">Person</button><button data-org="delegation" data-id="'+esc(b.id)+'" aria-pressed="'+b.delegiert+'">Delegiert '+(b.delegiert?'ja':'nein')+'</button></div></div>' + aufgabenListe(b.aufgaben, b.id);
          // Q06: Marktbeobachtung als eigene steuerbare Fachabteilung unter dem CSO.
          if (b.id === 'marktbeobachtung') {
            const markt = E.marktbeobachtungUebersicht(st);
            h += '<div class="org-markt"><small>Marktbeobachtung: ' + markt.fte + ' FTE · ' +
              esc(geld(markt.kostenWoche)) + ' / Woche · Leitung ' + esc(markt.leitung) +
              ' · ' + markt.erfasst + ' Rohmeldungen, ' + markt.gemeldet + ' veröffentlicht</small>' +
              '<div class="org-aktionen">' + [0, 1, 2, 3].map((stufe) =>
                '<button data-org="marktStufe" data-stufe="' + stufe + '" ' +
                (markt.stufe === stufe ? 'disabled ' : '') +
                'aria-pressed="' + (markt.stufe === stufe) + '">Stufe ' + stufe + '</button>').join('') + '</div></div>';
          }
        }
        h+='</div>';
      }
    } else {
      for (const r of x.regionen) {
        h+='<div class="karte"><div class="khead"><b>Region '+esc(r.id)+'</b><button data-org="profil" data-ebene="region" data-id="'+esc(r.id)+'">'+name(r.stelle)+'</button></div>';
        for (const c of r.cluster) {
          const rot = !c.stelle.person, ampel=st.woche>0&&c.umsatz>0?'●':'○';
          h+='<div class="org-zeile"><span class="org-ampel '+(rot?'warn':'')+'">'+ampel+'</span><div><b>'+esc(c.name)+'</b><small>'+c.anzahl+' Häuser · Umsatz/Woche '+(st.woche===0?'noch offen':geld(c.umsatz))+'</small>''</div><div class="org-aktionen"><button data-org="profil" data-ebene="cluster" data-id="'+esc(c.id)+'">'+(rot?'besetzen':'Leitung')+'</button><button data-org="delegation" data-id="'+esc(c.id)+'" data-cluster="1" aria-pressed="'+c.stelle.delegiert+'">Delegiert '+(c.stelle.delegiert?'ja':'nein')+'</button></div></div>' + aufgabenListe(c.aufgaben, c.id, true);
        }
        h+='</div>';
      }
      if (x.sonder) {
        const c=x.sonder;
        h+='<div class="karte"><div class="khead"><b>Premium & Flagships</b><button data-org="profil" data-ebene="cluster" data-id="'+esc(c.id)+'">'+name(c.stelle)+'</button></div><p>'+c.hausIds.length+' Häuser · '+x.flagships.length+' gewählte Flagships</p>';
        // Premium ist immer sichtbar, auch außerhalb des Rankings der größten zwölf Häuser.
        const premiumHaeuser = st.haeuser.filter((haus)=>haus.klasse==='premium');
        const gewaehlte = st.haeuser.filter((haus)=>x.flagships.includes(haus.id));
        const kandidaten = st.haeuser.filter((haus)=>haus.format==='warenhaus'&&haus.status==='offen'&&haus.klasse!=='premium')
          .sort((a,b)=>b.grundflaecheQm*b.etagen.length-a.grundflaecheQm*a.etagen.length).slice(0,12);
        const liste = [...new Map([...premiumHaeuser,...gewaehlte,...kandidaten].map((haus)=>[haus.id,haus])).values()];
        const namen = new Map();
        for (const haus of liste) namen.set(haus.name, (namen.get(haus.name)??0)+1);
        for (const haus of liste) {
          const an=x.flagships.includes(haus.id), premium=haus.klasse==='premium';
          const zusatz = namen.get(haus.name)>1 ? ' · '+esc(haus.stadt) : '';
          h+='<div class="zeile"><span class="was">'+esc(haus.name)+zusatz+(premium?' · Premium':'')+'</span><button '+(premium?'disabled':'')+' data-org="flagship" data-haus="'+esc(haus.id)+'" data-an="'+(!an)+'">'+(premium?'fest':an?'Flagship abwählen':'Flagship wählen')+'</button></div>';
        }
        h+=aufgabenListe(c.aufgaben,c.id,true);
        h+='</div>';
      }
    }
    ctx.panel('Organisation',ui.reiter==='zentrale'?'Vorstand → Bereiche':'Haus → Hauscluster → Region → CSO',h,'gross');
    ui.aktiv=true;
  }
  function tun(aktion){const r=E.fuehreAus(s(),aktion);ctx.meldung(r.text,r.ok);ctx.nachAktion?.();if(r.ok) zeichnen();}
  document.getElementById('pinhalt').addEventListener('click',(ev)=>{
    if(!ui.aktiv)return;
    const el=ev.target.closest('[data-org]');if(!el)return;
    const a=el.dataset.org;
    if(a==='reiter'){ui.reiter=el.dataset.reiter;ui.ebene=null;zeichnen();}
    if(a==='marktStufe')tun({typ:'marktbeobachtungStufe',stufe:Number(el.dataset.stufe)});
    if(a==='zurueck'){ui.ebene=null;zeichnen();}
    if(a==='profil'){ui.ebene=el.dataset.ebene;ui.id=el.dataset.id;zeichnen();}
    if(a==='delegation'){tun({typ:'delegation',...(el.dataset.cluster?{hauscluster:el.dataset.id}:{bereich:el.dataset.id}),an:el.getAttribute('aria-pressed')!=='true'});}
    if(a==='aufgabe')tun({typ:'delegation',...(el.dataset.cluster?{hauscluster:el.dataset.id}:{bereich:el.dataset.id}),aufgabe:el.dataset.task,an:el.getAttribute('aria-pressed')!=='true'});
    if(a==='grenze')tun({typ:'delegationGrenze',...(el.dataset.cluster?{hauscluster:el.dataset.id}:{bereich:el.dataset.id}),aufgabe:el.dataset.task,betrag:Math.max(0,Number(el.dataset.grenze)+Number(el.dataset.delta))});
    if(a==='flagship')tun({typ:'flagship',haus:el.dataset.haus,an:el.dataset.an==='true'});
    if(a==='besetzen')tun({typ:'organisationBesetzen',ebene:ui.ebene,id:ui.id,kandidat:el.dataset.kandidat});
    if(a==='entlassen')tun({typ:'organisationEntlassen',ebene:ui.ebene,id:ui.id});
    if(a==='praemie')tun({typ:'organisationHaltepraemie',ebene:ui.ebene,id:ui.id,betrag:10000});
    if(a==='befoerdern')tun({typ:'organisationBefoerdern',haus:el.dataset.haus,hauscluster:ui.id});
  });
  return { oeffne:(reiter='zentrale')=>{ui.reiter=reiter;ui.ebene=null;zeichnen();},zu:()=>{ui.aktiv=false;},aktiv:()=>ui.aktiv,pruefe:()=>({reiter:ui.reiter,bereiche:E.organisationUebersicht(s()).bereiche.length,cluster:E.organisationUebersicht(s()).regionen.reduce((n,r)=>n+r.cluster.length,0)}) };
}
