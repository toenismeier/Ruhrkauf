/** Q16: Stadtauswertung und Kanal-Karten. Keine eigene Budget- oder Nachfrageberechnung. */
import { esc, geld, pz } from './format.js';
import { kanalBildSVG, stadtSymbolSVG, MARKETING_KANAL_INFO } from '../kit/marketing-bilder.js';
export function ortDaten(E, spiel, ui) {
  const daten = E.marketingStaedte(spiel());
  const regionen = ['alle', ...new Set(daten.staedte.map((x) => x.region))];
  const auswahl = daten.staedte.filter((x) => ui.region === 'alle' || x.region === ui.region);
  const index = Math.max(0, auswahl.findIndex((x) => x.stadt === ui.stadt));
  const stadt = auswahl[index];
  return { daten, regionen, auswahl, stadt, index };
}

export function stadtWahl(E, spiel, ui) {
  const { regionen, auswahl, stadt, index } = ortDaten(E, spiel, ui);
  const reg = regionen.map((r) => `<option value="${esc(r)}"${r === ui.region ? ' selected' : ''}>${r === 'alle' ? 'Alle Regionen' : 'Region ' + esc(r)}</option>`).join('');
  const ort = auswahl.map((x) => `<option value="${esc(x.stadt)}"${x.stadt === stadt?.stadt ? ' selected' : ''}>${esc(x.stadt)}</option>`).join('');
  const v = Math.max(0, index - 3), sicht = auswahl.slice(v, v + 7);
  return `<div class="mk-stadtwahl"><div class="mk-stadtfilter"><label>Region<select data-a="stadtRegionChoose" aria-label="Region auswählen">${reg}</select></label><label>Stadt<select data-a="stadtChoose" aria-label="Stadt auswählen">${ort}</select></label></div><div class="mk-ortband"><button data-a="stadtShift" data-v="-1" aria-label="Vorherige Stadt" ${auswahl.length < 2 ? 'disabled' : ''}>‹</button><div class="mk-minis" aria-label="Städteauswahl">${sicht.map((x) => `<button data-a="stadtSymbol" data-v="${esc(x.stadt)}" class="${x.stadt === stadt?.stadt ? 'an' : ''}" aria-label="Stadt ${esc(x.stadt)}" aria-pressed="${x.stadt === stadt?.stadt}">${stadtSymbolSVG(x.stadt)}<span>${esc(x.stadt)}</span></button>`).join('')}</div><button data-a="stadtShift" data-v="1" aria-label="Nächste Stadt" ${auswahl.length < 2 ? 'disabled' : ''}>›</button></div></div>`;
}

export function stadtAnsicht(E, spiel, ui, P) {
  const { stadt } = ortDaten(E, spiel, ui);
  let h = stadtWahl(E, spiel, ui);
  if (!stadt) return { titel:'Marktanteile', unter:'Keine Standorte in dieser Region', html:h+'<p class="mk-hinweis">Keine Stadt verfügbar.</p>' };
  const farben = { hartwig: '#B32632', volkskauf: '#6c7980', fundus: '#b68b47', wettbewerber: '#a6a6a3' };
  const texte = { hartwig: 'Hartwig einschließlich Sport', volkskauf: 'Volkskauf', fundus: 'FUNDUS', wettbewerber: 'Wettbewerber' };
  const werte = stadt.marktanteile, umfang=2*Math.PI*78;
  let offset=0;
  const ring = Object.keys(farben).map((k) => {
    const a=Math.max(0,werte[k]), laenge=umfang*a, start=offset;offset+=laenge;
    return `<circle cx="105" cy="105" r="78" fill="none" stroke="${farben[k]}" stroke-width="24" stroke-dasharray="${laenge} ${umfang-laenge}" stroke-dashoffset="${-start}" transform="rotate(-90 105 105)"/>`;
  }).join('');
  h += `<section class="mk-marktkarte"><h3>Marktanteil in ${esc(stadt.stadt)}</h3><p>Indikative Marktposition auf Basis der Standorte und Wettbewerber.</p><div class="mk-ringwrap"><svg viewBox="0 0 210 210" role="img" aria-label="Geschätzter Marktanteil in ${esc(stadt.stadt)}">${ring}</svg><div class="mk-ringmitte">${stadtSymbolSVG(stadt.stadt)}<strong>${esc(stadt.stadt)}</strong></div></div><div class="mk-legende">${Object.keys(farben).map((k) => `<div class="mk-lzeile"><span style="--farbe:${farben[k]}">${texte[k]}</span>${P(`ms:${stadt.stadt}:${k}`, pz(werte[k],1))}</div>`).join('')}</div><p class="mk-hinweis">${stadt.wettbewerberAnzahl} modellierte Wettbewerber. Der übrige lokale Handel ist im Wettbewerbsanteil berücksichtigt.</p></section>`;
  h += `<section class="mk-marktkarte"><h3>Markenbekanntheit</h3><p>Hartwig in ${esc(stadt.stadt)}</p><div class="mk-bekannt-zahl">${P(`bek:${stadt.stadt}`,`${stadt.markenbekanntheit} / 100`)}</div><div class="mk-bekannt-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${stadt.markenbekanntheit}" aria-label="Markenbekanntheit"><span style="width:${stadt.markenbekanntheit}%"></span></div><p class="mk-hinweis">Modellschätzung aus Konzernimage, Marketingdruck und Standortpräsenz. Ohne Eingriffe neutral zum Konzernwert.</p></section>`;
  return { titel:'Marktanteile', unter:`${stadt.stadt} · Region ${stadt.region} · ${stadt.haeuserAktiv} aktive Häuser`, html:h };
}

export function kanaeleAnsicht(E, spiel, ui, P) {
  const { stadt, daten } = ortDaten(E, spiel, ui);
  let h = stadtWahl(E, spiel, ui);
  const k=daten.kanaele, q=E.marketingUebersicht(spiel());
  h += `<div class="mk-marktkarte"><h3>Werbebudget</h3><div class="mk-kanalinfo"><span>Kanäle je Woche</span>${P('kn:summe',geld(k.summeWoche))}</div><div class="mk-kanalinfo"><span>Werbequote netto</span>${P('kn:netto',pz(q.werbequoteNetto,1))}</div><p class="mk-hinweis">Budgets und Werbequote gelten konzernweit. Regionale Kanäle können je Region verstärkt werden.</p></div>`;
  h += `<div class="mk-kanalinfo"><strong>Kanäle</strong><span>${k.kanaele.length} Karten · horizontal wischen</span></div><div class="mk-kanalreihe" role="region" aria-label="Marketingkanäle" tabindex="0">`;
  for (const c of k.kanaele) {
    const [beschreibung,betreuung]=MARKETING_KANAL_INFO[c.id] ?? [c.text,'Inhouse'];
    const team=daten.kapazitaet.teams[c.id] ?? 0;
    const uebrig=daten.kapazitaet.verfuegbar-daten.kapazitaet.zugeordnet;
    const max=Math.max(1,c.startBudgetWoche*4);
    const region=stadt?.region;
    const faktor=region ? c.regionen[region] ?? 1 : 1;
    h += `<article class="mk-kanalkarte" data-kanal="${esc(c.id)}"><figure>${kanalBildSVG(c.id)}</figure><h3>${esc(c.name)}</h3><p class="mk-text">${esc(beschreibung)}</p><div class="mk-team"><span>Betreut von <strong>${esc(betreuung)}</strong></span><div class="mk-teamaktionen"><button data-a="teamAendern" data-k="${esc(c.id)}" data-v="-1" aria-label="${esc(c.name)}: Team minus eins" ${team ? '' : 'disabled'}>−</button><span>${P(`kn:${c.id}:team`,team)}</span><button data-a="teamAendern" data-k="${esc(c.id)}" data-v="1" aria-label="${esc(c.name)}: Team plus eins" ${uebrig > 0 ? '' : 'disabled'}>+1</button></div></div><div class="mk-budgetbox"><label for="mk-budget-${esc(c.id)}">Wochenbudget <output>${P(`kn:${c.id}:woche`,geld(c.budgetWoche))}</output></label><input id="mk-budget-${esc(c.id)}" type="range" min="0" max="${max}" step="100" value="${c.budgetWoche}" data-a="kanalBudgetSlider" data-k="${esc(c.id)}" aria-label="Wochenbudget ${esc(c.name)}"><small>Standard: ${geld(c.startBudgetWoche)} / Woche · maximal das Vierfache</small></div>`;
    if (c.regional && region) h += `<div class="mk-budgetbox"><label for="mk-region-${esc(c.id)}">Ausspielung Region ${esc(region)} <output>${faktor.toFixed(1).replace('.',',')} ×</output></label><input id="mk-region-${esc(c.id)}" type="range" min="0" max="3" step="0.1" value="${faktor}" data-a="kanalRegionSlider" data-k="${esc(c.id)}" data-region="${esc(region)}" aria-label="Regionale Ausspielung ${esc(c.name)}"><small>0 × bis 3 × · bestehende regionale Kanalsteuerung</small></div>`;
    else h += '<p class="mk-hinweis">Bundesweite Kanalsteuerung</p>';
    h += '</article>';
  }
  h += `</div><p class="mk-kanalzaehler">Zugeordnete Marketing-FTE: ${P('kn:teamSum', daten.kapazitaet.zugeordnet)} von ${P('kn:fte',daten.kapazitaet.verfuegbar)}. Die Teamzuordnung ist organisatorisch; die Wirkung folgt unverändert aus Kanalbudgets und Marketingabteilung.</p>`;
  return { titel:'Marketingkanäle', unter:`${stadt?.stadt ?? 'Alle Städte'} · ${geld(k.summeWoche)} / Woche · Nettoquote ${pz(q.werbequoteNetto,1)}`, html:h };
}
