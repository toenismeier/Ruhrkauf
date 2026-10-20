// O07 Haus: betrieblicher Steckbrief, Ausnahmesteuerung, Wochenkommentare.
import { esc, fmt, geld } from './format.js';
const PROZENT = x => (Number(x) * 100).toFixed(1).replace('.', ',') + ' %';
const REITER = [['ueberblick','Überblick'],['leitung','Leitung'],['personal','Personal'],['ware','Ware'],['partner','Fläche & Partner'],['kosten','Kosten'],['kommentare','Kommentare']];
const SCHWERPUNKT = { personal: 'Personal', ware: 'Ware', kunde: 'Kunde', kosten: 'Kosten' };
const SERVICE = { kundendienst:'Kundendienst', schneiderei:'Änderungsschneiderei', geschenkverpackung:'Geschenkverpackung', abholstation:'Abholstation' };
const POSTEN = { energie:'Energie', reinigung:'Reinigung', sicherheit:'Sicherheit', instandhaltung:'Instandhaltung', versicherung:'Versicherung' };
const GRUENDE = { wetter:'Wetter', baustelle:'Baustelle vor dem Haus', ware:'Warenverfügbarkeit', personal:'Personaldeckung', konkurrenz:'Konkurrenzaktion', kasse:'Kassenausfall', stadtereignis:'Stadtereignis', sonstiges:'Sonstiges' };
const MASS = { aktion:'Aktion vor Ort', springer:'Springer anfordern', umlagerung:'Ware umlagern', oeffnungszeit:'Öffnungszeit anpassen' };
const p = (n, stell = 0) => Number(n ?? 0).toFixed(stell).replace('.', ',');
const line = (a,b) => '<div class="zeile"><span class="was">' + esc(a) + '</span><b>' + esc(String(b)) + '</b></div>';
const button = (label, action, disabled=false) => '<button class="mini" ' + (disabled?'disabled':'onclick="'+action+'"') + '>'+esc(label)+'</button>';
export function hausSteckbrief(d, ueberblick, reiter, woche) {
  const h = d.haus, b = d.betrieb, l = b?.leitungsdaten, k = h.kpi;
  const id=esc(h.id), r = REITER.some(x => x[0] === reiter) ? reiter : 'ueberblick';
  let inhalt = '';
  if (r === 'ueberblick') {
    const tr = b?.treiberAktuell;
    inhalt = '<div class="karte"><div class="khead">Kunden und Standort</div>' +
      line('Mystery Shopping', (b?.kundenScore ?? '–') + ' / 100') +
      line('Hauscluster', b?.hauscluster ?? h.region) +
      line('Stadtgröße', h.cluster === 'metropole' ? 'Metropole' : h.cluster === 'grossstadt' ? 'Großstadt' : 'Mittelstadt') +
      (Number.isFinite(b?.planWoche) ? line('Umsatzplan aktuelle Woche', geld(b.planWoche)) : '') +
      (tr ? line('Frequenz Vorwoche',fmt.format(Math.round(tr.frequenz))) + line('Kaufquote Vorwoche',PROZENT(tr.kaufquote)) + line('Bon Vorwoche',geld(tr.bon)) : line('Umsatztreiber','Nach 1. Wochenabschluss verfügbar')) + '</div>' + ueberblick;
  }
  if (r === 'leitung') {
    inhalt = '<div class="karte"><div class="khead">Hausleitung</div>' +
      line('Name', l?.name ?? 'Nicht besetzt') +
      line('Gehalt jährlich', geld(l?.gehalt ?? 0)) +
      line('Bonusanteil', PROZENT(l?.bonusAnteil ?? 0)) +
      line('Stimmung', p(l?.moral) + ' / 100') +
      line('Wechselwille', PROZENT(l?.wechselwille ?? 0)) +
      line('Ehrlichkeit', PROZENT(l?.ehrlichkeit ?? 0)) +
      line('Stellvertretung', (l?.stellvertretung?.name ?? '–') + ' · ' + PROZENT(l?.stellvertretung?.qualitaet ?? 0)) +
      Object.entries(l?.staerken ?? {}).map(([key,v]) => line(SCHWERPUNKT[key] ?? key, PROZENT(v))).join('') +
      '<div class="zeile">' + Object.keys(SCHWERPUNKT).map(key => button('Fördern: '+ SCHWERPUNKT[key], "hausTun('foerdern','"+id+"','"+key+"')")).join(' ') + '</div>' +
      '<div class="zeile">' + button('Halteprämie 10.000 €', "hausTun('praemie','"+id+"')") +
      button('Zur Clusterleitung befördern', "hausTun('befoerdern','"+id+"')") + '</div></div>';
    inhalt += '<div class="karte"><div class="khead">Kandidaten über die Clusterleitung</div>' +
      (b?.kandidaten ?? []).map((k,i) => '<div class="zeile"><span class="was">'+esc(k.name)+' <i>Kompetenz '+PROZENT(k.qualitaet)+' · '+geld(k.gehalt)+'/Jahr</i></span>'+button('Einstellen',"hausTun('ersetzen','"+id+"',"+i+")")+'</div>').join('') + '</div>';
  }
  if (r === 'personal') {
    const v=h.personal;
    inhalt = '<div class="karte"><div class="khead">Besetzung</div>' +
      line('Vollzeit',p(v.vollzeit,1)+' FTE')+line('Teilzeit',p(v.teilzeit,1)+' FTE')+
      line('Aushilfen',p(v.aushilfen,1)+' FTE')+line('Bedarf',p(k?.fteBedarf,1)+' FTE')+
      line('Ist',p(k?.fteIst,1)+' FTE')+line('Personalkosten',geld(k?.personal??0))+'</div>';
  }
  if (r === 'ware') {
    inhalt = '<div class="karte"><div class="khead">Ware · Grundlage O05</div>' +
      Object.entries(k?.umsatzJeGruppe ?? {}).sort((a,b)=>b[1]-a[1]).map(([key, wert])=>line(key, geld(wert))).join('') +
      '</div>';
  }
  if (r === 'partner') {
    const std = b?.standard;
    const standardZeilen = ['sauberkeit','praesentation','kasse'].map(key =>
      '<div class="zeile"><span class="was">' + esc({ sauberkeit: 'Sauberkeit', praesentation: 'Warenpräsentation', kasse: 'Kassenstandard' }[key])
      + ' · ' + p(std?.[key]) + '/3</span>'
      + button('−', "hausTun('standard','"+id+"','"+key+"',-1)")
      + button('+', "hausTun('standard','"+id+"','"+key+"',1)") + '</div>'
    ).join('');
    const serviceZeilen = Object.entries(b?.services ?? {}).map(([key, an]) =>
      '<div class="zeile"><span class="was">' + esc(SERVICE[key] ?? key) + '</span>'
      + button(an ? 'Lokal ausschalten' : 'Lokal aktivieren', "hausTun('service','"+id+"','"+key+"',"+(!an)+")")
      + button(an ? 'Clusterweit aus' : 'Clusterweit an', "hausTun('clusterservice','"+id+"','"+key+"',"+(!an)+")") + '</div>'
    ).join('');
    const stundenZeilen = [['von','Öffnung ab'],['bis','Öffnung bis'],['samstagBis','Samstag bis']].map(([feld,titel]) =>
      '<div class="zeile"><span class="was">' + titel + ': ' + p(std?.oeffnung?.[feld]) + ' Uhr</span>'
      + button('− 1h', "hausTun('stunden','"+id+"','"+feld+"',-1)")
      + button('+ 1h', "hausTun('stunden','"+id+"','"+feld+"',1)") + '</div>'
    ).join('');
    const partnerZeilen = (b?.flaechen ?? []).map(f => {
      const bezeichnung = f.konzept === 'konzession' ? 'Konzession: ' : 'Untermiete: ';
      const info = b?.konzessionen?.[f.id];
      return line(bezeichnung + (f.gruppe ?? f.mieter?.name ?? f.id),
        p(f.qm) + ' qm' + (info ? ' · ' + PROZENT(info.quote) + ' Umsatzmiete' : ''));
    }).join('');
    inhalt = '<div class="karte"><div class="khead">Hausstandards und Services</div>'
      + line('Öffnungszeiten Mo–Fr', p(std?.oeffnung?.von) + '–' + p(std?.oeffnung?.bis) + ' Uhr')
      + line('Samstag bis', p(std?.oeffnung?.samstagBis) + ' Uhr')
      + standardZeilen + stundenZeilen + serviceZeilen
      + (b?.ausnahmeGrund ? line('Haus-Ausnahme', b.ausnahmeGrund) : '') + '</div>'
      + '<div class="karte"><div class="khead">Gastronomie</div>'
      + line('Restaurantfläche', p(b?.restaurantQm) + ' qm')
      + line('Betriebsform', b?.gastro === 'selbst' ? 'Eigenbetrieb' : b?.gastro === 'pacht' ? 'Verpachtet' : 'Noch keine')
      + line('Vertrag bis Woche', b?.gastroVertragBis ?? '–')
      + '<div class="zeile">' + button('Selbst betreiben', "hausTun('gastro','"+id+"','selbst')")
      + button('Verpachten', "hausTun('gastro','"+id+"','pacht')") + '</div></div>'
      + '<div class="karte"><div class="khead">Stadt und Sonntagsverkauf</div>'
      + line('Umfeld', b?.umfeld?.ereignis ?? 'Regulär')
      + line('Innenstadtfrequenz', PROZENT(b?.umfeld?.trend ?? 1))
      + '<div class="zeile">' + button('Verkaufsoffenen Sonntag beantragen (in 2 Wochen)', "hausTun('sonntag','"+id+"')") + '</div></div>'
      + '<div class="karte"><div class="khead">Fläche, Konzessionäre und Untermieter</div>'
      + (partnerZeilen || '<div class="zeile">Keine Verträge hinterlegt</div>') + '</div>';
  }
  if (r==='kosten') {
    inhalt = '<div class="karte"><div class="khead">Betriebskosten je Woche</div>' +
      line('Sonstige Hauskosten gesamt',geld(k?.sonstige??0)) +
      Object.entries(POSTEN).map(([key,bezeichnung])=>'<div class="zeile"><span class="was">'+esc(bezeichnung)+' · '+PROZENT(b?.kosten?.[key]??1)+' Budget</span>'+
        button('− 10 %',"hausTun('kosten','"+id+"','"+key+"',-0.1)")+
        button('+ 10 %',"hausTun('kosten','"+id+"','"+key+"',0.1)")+'</div>').join('') +
      '<div class="zeile grau">Weniger Reinigung senkt den Kundenscore; weniger Sicherheit und Instandhaltung erhöhen Betriebsrisiken.</div></div>';
  }
  if(r==='kommentare') {
    inhalt='<div class="karte"><div class="khead">Wochenkommentierung</div>'+
      (b?.kommentare?.length ? b.kommentare.map(c=>'<div class="zeile"><span class="was"><b>KW '+((c.woche%52)+1)+' · '+PROZENT(c.abweichung)+'</b><i>'+esc(GRUENDE[c.grund]??c.grund)+' · '+esc(MASS[c.massnahme]??c.massnahme)+'</i><small>'+esc(c.pruefung)+'</small></span></div>').join(''):'<div class="zeile">Noch keine Abweichung unter −5 % mit Vorjahres- oder Planvergleich.</div>') +
      '<div class="zeile">'+Object.entries(MASS).map(([key,name])=>button(name,"hausTun('massnahme','"+id+"','"+key+"')")).join(' ')+'</div></div>';
  }
  return '<nav class="haus-reiter">'+REITER.map(([key,name])=>'<button class="'+(key===r?'an':'')+'" onclick="hausReiterWahl(\''+key+'\')">'+name+'</button>').join('')+'</nav>'+inhalt;
}
export function hausBeobachtungHtml(liste) {
  return '<div class="karte"><div class="khead">Beobachtungsliste · Ausnahmen priorisiert</div>' +
    (liste.length ? liste.map(x => '<button class="zeile haus-sprung" onclick="hausSpringen(\''+esc(x.id)+'\')"><span class="was"><b>'+esc(x.name)+'</b><i>'+esc(x.stadt)+' · '+esc(x.grund)+'</i></span><span>→</span></button>').join('')
    : '<div class="zeile">Derzeit keine auffälligen Häuser.</div>')+'</div>';
}
export function hausReportingHtml(kommentare, ranking) {
  return '<div class="karte"><div class="khead">Kommentare der Woche</div>'+
    (kommentare.length ? kommentare.map(x=>'<button class="zeile haus-sprung" onclick="hausSpringen(\''+esc(x.id)+'\')"><span class="was"><b>'+esc(x.name)+' · '+PROZENT(x.abweichung)+'</b><i>'+esc(GRUENDE[x.grund]??x.grund)+' / '+esc(MASS[x.massnahme]??x.massnahme)+'</i><small>'+esc(x.pruefung)+'</small></span><span>→</span></button>').join('') : '<div class="zeile">Noch keine kommentierungspflichtigen Abweichungen.</div>') +
    '</div><div class="karte"><div class="khead">Mystery Shopping · Top 20</div>'+
    ranking.slice(0,20).map((x,i)=>'<button class="zeile haus-sprung" onclick="hausSpringen(\''+esc(x.id)+'\')"><span class="was">'+(i+1)+'. '+esc(x.name)+'</span><b>'+x.score+'/100</b></button>').join('')+'</div>';
}
