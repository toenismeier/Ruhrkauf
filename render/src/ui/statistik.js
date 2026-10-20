// N01: SVG-Diagramme ohne Chart-Bibliothek. Daten ausschließlich aus Engine-Abfragen.
import { geld, fmt, esc } from './format.js';

const FARBE = { Hartwig: '#d23c32', Volkskauf: '#9b63b0', Sport: '#2f8f5b', FUNDUS: '#b5651d',
  Nord: '#3e7eae', Ost: '#9b63b0', West: '#d23c32', Mitte: '#b5651d', Süd: '#2f8f5b', Ist: '#d23c32',
  Vorjahr: '#8296a3', Plan: '#2f8f5b' };
const KENNZAHL = { umsatz: 'Umsatz', ebitda: 'EBITDA', cash: 'Cash', db: 'Deckungsbeitrag',
  frequenz: 'Kundenfrequenz (Schätzung)', personalFte: 'Personal (FTE)', stimmung: 'Stakeholder-Stimmung' };
const GELD = new Set(['umsatz', 'ebitda', 'cash', 'db']);
const xAchse = (w) => 'KW ' + (w % 52 + 1);

export function statistikModul(ctx) {
  const { E } = ctx, s = ctx.s;
  const ui = { aktiv: false, seite: 'konzern', kennzahl: 'umsatz', wochen: 52, typ: 'linie', zeilen: 25 };
  const charts = new Map();
  let naechsteId = 0, ausstehend = false, zeiger = null;
  const daten = (ebene, id, kennzahl = ui.kennzahl, wochen = ui.wochen) => E.verlauf(s(), { ebene, id, kennzahl, wochen });
  const wert = (n, k) => GELD.has(k) ? geld(n) : fmt.format(Math.round(n));
  const knopf = (a, v, label, an) => '<button type="button" class="stat-wahl' + (an ? ' an' : '') + '" data-st-a="' + a + '" data-v="' + esc(v) + '">' + esc(label) + '</button>';
  const tabs = () => '<nav class="stat-auswahl" aria-label="Statistikseiten">' + [['konzern','Konzern'],['formate','Formate'],['regionen','Regionen'],['rangliste','Häuser']].map(([id,t])=>knopf('seite',id,t,ui.seite===id)).join('') + '</nav>';
  const zeiten = () => '<div class="stat-auswahl" aria-label="Zeitraum">' + [[13,'13 Wochen'],[52,'52 Wochen'],['alle','Alle']].map(([id,t])=>knopf('wochen',id,t,String(ui.wochen)===String(id))).join('') + '</div>';
  const typen = () => '<div class="stat-auswahl" aria-label="Darstellung">' + [['linie','Verlauf'],['balken','Wochen'],['quartal','Quartale']].map(([id,t])=>knopf('typ',id,t,ui.typ===id)).join('') + '</div>';
  const zahl = (t,n,k) => '<div class="kz"><span>' + esc(t) + '</span><b>' + esc(wert(n,k)) + '</b></div>';

  function gruppieren(punkte, kennzahl) {
    if (ui.typ !== 'quartal') return ui.typ === 'balken' ? punkte.slice(-13) : punkte;
    const summen = new Map();
    for (const p of punkte) {
      const start = Math.floor(p.woche / 13) * 13;
      let a = summen.get(start);
      if (!a) { a = { woche: start, wert: 0 }; summen.set(start,a); }
      if (kennzahl === 'cash' || kennzahl === 'stimmung' || kennzahl === 'personalFte') a.wert = p.wert;
      else a.wert += p.wert;
    }
    return [...summen.values()];
  }

  function diagramm(titel, reihen, kennzahl, opt = {}) {
    const listen = reihen.filter(r => r?.punkte?.length).map(r => ({ name: r.name, punkte: gruppieren(r.punkte, kennzahl), farbe: r.farbe ?? FARBE[r.name] ?? '#d23c32' })).filter(r => r.punkte.length);
    if (!listen.length) return '<article class="karte stat-karte"><div class="stat-titel">' + esc(titel) + '</div><p class="stat-leer">Für diese Auswahl sind noch keine Verlaufsdaten verfügbar.</p></article>';
    if (opt.vorjahr && ui.typ === 'linie' && reihen.length === 1) {
      const a = reihen[0].punkte.filter(p => p.vorjahr !== undefined).map(p => ({ woche: p.woche, wert: p.vorjahr }));
      if (a.length) listen.push({ name: 'Vorjahr', punkte: a, farbe: FARBE.Vorjahr });
      const p = reihen[0].punkte.filter(x => x.plan !== undefined).map(x => ({ woche:x.woche, wert:x.plan }));
      if (p.length) listen.push({ name: 'Plan', punkte: p, farbe: FARBE.Plan });
    }
    const w = opt.klein ? 300 : 340, h = opt.klein ? 90 : 184, l = 42, r = 10, t = 10, u = opt.klein ? 14 : 29;
    const alle = listen.flatMap(x => x.punkte), xs = alle.map(p => p.woche), ys = alle.map(p => p.wert);
    const minW = Math.min(...xs), maxW = Math.max(...xs), breite = Math.max(1,maxW-minW);
    let minY = Math.min(...ys), maxY = Math.max(...ys);
    if (ui.typ !== 'linie' && !opt.klein) { minY = Math.min(minY,0); maxY = Math.max(maxY,0); }
    if (minY === maxY) { minY -= Math.max(1,Math.abs(minY)*.1); maxY += Math.max(1,Math.abs(maxY)*.1); }
    const px = (woche) => l + (woche-minW)/breite*(w-r-l);
    const py = (v) => t+(maxY-v)/(maxY-minY)*(h-u-t);
    const kurven = listen.map((r,ri) => {
      if (ui.typ === 'linie' || opt.klein) {
        const punkte = r.punkte.map((p,i)=>(i?'L':'M') + px(p.woche).toFixed(2) + ',' + py(p.wert).toFixed(2)).join(' ');
        return '<path d="' + punkte + '" fill="none" stroke="' + r.farbe + '" stroke-width="' + (opt.klein ? 1.7 : 2.6) + '" stroke-linecap="round" stroke-linejoin="round"' + (r.name === 'Vorjahr' || r.name === 'Plan' ? ' stroke-dasharray="5 4"' : '') + '/>';
      }
      const bw = Math.max(2,Math.min(24,(w-r-l)/Math.max(1,r.punkte.length)/(listen.length+0.5)));
      return r.punkte.map(p => '<rect x="' + (px(p.woche)+(ri-listen.length/2)*bw).toFixed(1) + '" y="' + py(Math.max(0,p.wert)).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(1,Math.abs(py(p.wert)-py(0))).toFixed(1) + '" fill="' + r.farbe + '"/>').join('');
    }).join('');
    const id = ++naechsteId;
    charts.set(id, { reihen:listen, minW, maxW, x:l, breite:w-r-l, kennzahl });
    const achsen = opt.klein ? '' : '<line x1="' + l + '" x2="' + (w-r) + '" y1="' + (h-u) + '" y2="' + (h-u) + '" stroke="#cdd4d8"/>' +
      [0,.5,1].map(f => '<text x="2" y="' + (py(maxY-(maxY-minY)*f)+3).toFixed(1) + '" class="stat-achse">' + esc(wert(maxY-(maxY-minY)*f,kennzahl)) + '</text>').join('') +
      '<text x="' + l + '" y="' + (h-4) + '" class="stat-achse">' + xAchse(minW) + '</text>' +
      '<text x="' + (w-r) + '" y="' + (h-4) + '" text-anchor="end" class="stat-achse">' + xAchse(maxW) + '</text>';
    const legende = listen.length > 1 ? '<div class="stat-legende">' + listen.map(x => '<span><i style="background:' + x.farbe + '"></i>' + esc(x.name) + '</span>').join('') + '</div>' : '';
    return '<article class="karte stat-karte"><div class="stat-titel">' + esc(titel) + '</div>' + legende +
      '<svg role="img" aria-label="' + esc(titel) + ': Werte durch Antippen oder Ziehen anzeigen" class="stat-diagramm" data-st-chart="' + id + '" data-st-ende="' + esc(String(reihen[0]?.punkte?.at(-1)?.wert ?? 0)) +
      '" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' + achsen + kurven +
      '<line class="stat-cross" x1="' + l + '" x2="' + l + '" y1="' + t + '" y2="' + (h-u) + '" stroke="#1f2a33" stroke-dasharray="3 3" visibility="hidden"/></svg>' +
      (opt.klein ? '' : '<div class="stat-wert" aria-live="polite">Punkt antippen oder über den Verlauf ziehen</div>') +
      '</article>';
  }
  function konzern() {
    const kennzahlen = [['umsatz','Umsatz'], ['ebitda','EBITDA'], ['cash','Cash und Insolvenzgrenze'], ['stimmung','Stakeholder-Stimmung']];
    let html = '<div class="stat-raster">' + kennzahlen.slice(0,3).map(([k,t]) => zahl(t, daten('konzern',undefined,k).punkte.at(-1)?.wert ?? 0,k)).join('') + '</div>';
    for (const [k,t] of kennzahlen) {
      const d = daten('konzern',undefined,k);
      html += diagramm(t, [{ name:'Ist', punkte:d.punkte }], k, { vorjahr:true });
      if (k === 'cash') html += '<p class="stat-hinweis">Aktuelle Insolvenzgrenze: ' + esc(geld(-s().kreditlinie)) + ' (verfügbarer Kreditrahmen). Änderungen der Kreditlinie sind historisch nicht rekonstruierbar.</p>';
    }
    html += wasserfall();
    return html;
  }
  function formate() {
    const ids=['Hartwig','Volkskauf','Sport','FUNDUS'];
    return '<p class="stat-hinweis">Vier Formate im Vergleich. Noch nicht simulierte Formate bleiben ohne Werte.</p>' +
      ['umsatz','db'].map(k => diagramm(KENNZAHL[k] + ' nach Format',ids.map(name => ({ name, punkte:daten('format',name,k).punkte })),k)).join('');
  }
  function regionen() {
    const ids=['Nord','Ost','West','Mitte','Süd'];
    return ['umsatz','db'].map(k => diagramm(KENNZAHL[k] + ' nach Region',ids.map(name => ({ name, punkte:daten('region',name,k).punkte })),k)).join('');
  }
  function rangliste() {
    const hauser=s().haeuser.filter(h=>h.verlauf?.length).map(h=>{
      const p=h.verlauf.at(-1), marge=p.umsatz > 0 ? p.db/p.umsatz : -Infinity;
      return {h,p,marge};
    }).sort((a,b)=>b.marge-a.marge || a.h.name.localeCompare(b.h.name));
    if (!hauser.length) return '<div class="karte stat-leer">Nach der ersten Woche erscheinen die Ranglisten.</div>';
    let html='<p class="stat-hinweis">Deckungsbeitragsmarge als Haus-Näherung für EBITDA-Marge (ohne Zentralkosten). Geschlossene Häuser ohne Umsatz am Ende.</p>';
    for (const [i,x] of hauser.slice(0,ui.zeilen).entries()) {
      const d=daten('haus',x.h.id,'db',52);
      html += '<div class="karte stat-haus"><button data-st-a="haus" data-v="' + esc(x.h.id) + '" class="stat-hauskopf"><b>' + (i+1) + '. ' + esc(x.h.name) + '</b><span>' + (Number.isFinite(x.marge) ? (x.marge*100).toLocaleString('de-DE',{maximumFractionDigits:1})+' %' : 'ohne Umsatz') + '</span></button><small>' + esc(x.h.stadt + ' · ' + x.h.region) + '</small>' +
        diagramm('52 Wochen',[{name:'Ist',punkte:d.punkte}],'db',{klein:true}) + '</div>';
    }
    if (ui.zeilen < hauser.length) html += '<button class="stat-mehr" data-st-a="mehr">Weitere Häuser (' + (hauser.length-ui.zeilen) + ')</button>';
    return html;
  }
  function wasserfall() {
    const k=s().historie.at(-1);
    if (!k) return '';
    const daten = [['Rohertrag',k.rohertrag],['Konzession + Mieten + WKZ',k.konzession+k.untermiete+k.wkz],
      ['Personal',-k.personal],['Miete',-k.miete],['Nebenkosten',-k.nebenkosten],['Sonstiges + Logistik',-k.sonstige-k.logistik],
      ['Zentrale',-k.zentrale],['Marketing',-k.marketing],['Beratung',-k.beratung]];
    const max=Math.max(1,...daten.map(x=>Math.abs(x[1])),Math.abs(k.ebitda));
    let basis=0;
    const bars=daten.map(([name,v],i)=>{
      const vor=basis;basis+=v;
      const ab=120-105*Math.max(vor,basis)/max, hoehe=Math.max(1,Math.abs(v)*105/max);
      return '<rect x="' + (12+i*33) + '" y="' + Math.min(120,ab) + '" width="24" height="' + hoehe + '" fill="' + (v<0?'#d23c32':'#2f8f5b') + '"><title>' + esc(name+': '+geld(v)) + '</title></rect>';
    }).join('');
    bars+='<rect x="309" y="' + (120-105*Math.max(0,k.ebitda)/max) + '" width="24" height="' + Math.max(1,Math.abs(k.ebitda)*105/max) + '" fill="#1f2a33"><title>EBITDA '+esc(geld(k.ebitda))+'</title></rect>';
    return '<article class="karte stat-karte"><div class="stat-titel">EBITDA-Brücke · letzte Woche</div><div class="stat-hinweis">Rohertrag → Zuschüsse → Kosten → EBITDA (je Balken Details antippen)</div><svg role="img" aria-label="EBITDA-Wasserfall" viewBox="0 0 342 140">' + bars + '<line x1="6" y1="120" x2="338" y2="120" stroke="#8296a3"/></svg><small>EBITDA: ' + esc(geld(k.ebitda)) + '</small></article>';
  }
  function zeigen(halten=false) {
    const vorher=document.getElementById('pinhalt').scrollTop;
    charts.clear();
    const steuer=ui.seite==='konzern'? konzern():ui.seite==='formate'?formate():ui.seite==='regionen'?regionen():rangliste();
    const html = tabs()+zeiten()+(ui.seite!=='rangliste'?typen():'')+steuer;
    ctx.panel('Zahlen','Verläufe und Vergleich · KW '+(s().woche%52+1),html,'gross');
    ui.aktiv=true;
    if(halten) document.getElementById('pinhalt').scrollTop=vorher;
  }
  function hausGrafik(id) {
    const d=daten('haus',id,'umsatz',52), b=daten('haus',id,'db',52);
    return '<div class="stat-hausdetail">' + diagramm('Letzte 52 Wochen · Umsatz',[{name:'Ist',punkte:d.punkte}],'umsatz',{vorjahr:true}) +
      diagramm('Letzte 52 Wochen · Deckungsbeitrag',[{name:'Ist',punkte:b.punkte}],'db') + '</div>';
  }
  const inhalt=document.getElementById('pinhalt');
  inhalt.addEventListener('click',e=>{
    const b=e.target.closest('[data-st-a]');if(!b || !ui.aktiv)return;
    const a=b.dataset.stA,v=b.dataset.v;
    if(a==='seite'){ui.seite=v;ui.zeilen=25;}
    else if(a==='wochen')ui.wochen=v==='alle'?'alle':Number(v);
    else if(a==='typ')ui.typ=v;
    else if(a==='mehr')ui.zeilen+=25;
    else if(a==='haus'){ctx.oeffneHaus(v);return;}
    else return;
    zeigen();
  });
  function tip(e) {
    const svg=e.target.closest?.('[data-st-chart]');
    if(!svg)return;
    const info=charts.get(Number(svg.dataset.stChart));
    if(!info)return;
    const box=svg.getBoundingClientRect();
    const xpos=(e.clientX-box.left)/box.width*svg.viewBox.baseVal.width;
    const week=info.minW + Math.min(1,Math.max(0,(xpos-info.x)/info.breite))*(info.maxW-info.minW);
    let best=null,dist=Infinity;
    for(const r of info.reihen) for(const p of r.punkte){const d=Math.abs(p.woche-week);if(d<dist){dist=d;best=p;}}
    if(!best)return;
    const xx=info.x+(best.woche-info.minW)/Math.max(1,info.maxW-info.minW)*info.breite;
    const cross=svg.querySelector('.stat-cross');
    if(cross){cross.setAttribute('x1',xx);cross.setAttribute('x2',xx);cross.setAttribute('visibility','visible');}
    const boxwert=svg.parentElement.querySelector('.stat-wert');
    if(boxwert)boxwert.textContent=xAchse(best.woche)+' · '+info.reihen.map(r=>{
      const p=r.punkte.reduce((a,b)=>Math.abs(b.woche-best.woche)<Math.abs(a.woche-best.woche)?b:a,r.punkte[0]);
      return r.name+': '+wert(p.wert,info.kennzahl);
    }).join(' · ');
  }
  inhalt.addEventListener('pointerdown',e=>{if(e.target.closest?.('[data-st-chart]')){e.target.setPointerCapture?.(e.pointerId);tip(e);}});
  inhalt.addEventListener('pointermove',e=>{
    if(!e.target.closest?.('[data-st-chart]'))return;
    zeiger={target:e.target,clientX:e.clientX};
    if(ausstehend)return;
    ausstehend=true;
    requestAnimationFrame(()=>{ausstehend=false;if(zeiger)tip(zeiger);});
  });
  return {
    ui, oeffne:(seite='konzern')=>{ui.seite=seite;zeigen();}, hausGrafik,
    aktiv:()=>ui.aktiv, zu:()=>{ui.aktiv=false;}, neuZeichnen:()=>{if(ui.aktiv)zeigen(true);},
    pruefe:()=>{
      const fehler=[];
      for(const k of ['umsatz','ebitda','cash']){
        const d=daten('konzern',undefined,k),p=d.punkte.at(-1),c=E.cockpit(s());
        const soll=k==='umsatz'?c.umsatzWoche:k==='ebitda'?c.ebitdaWoche:c.cash;
        if(p && p.wert!==soll)fehler.push(k+': '+p.wert+' statt '+soll);
      }
      return { fehler, diagramme:inhalt.querySelectorAll('.stat-diagramm').length };
    },
  };
}
