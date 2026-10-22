// O05 Ware: reine Darstellungslogik für Merchandise Planning, Clusterallokation und Reduzierung.
// Q31: als Bücher mit Summenstrich (Saisonplan, Clusterbuch, Reduzierungsbuch); data-p-Schlüssel wie bisher.
import { geld, fmt, esc, pz } from './format.js';
const reichweite = (r) => r == null ? '–' : (r > 99 ? '> 99' : r.toFixed(1).replace('.', ',')) + (r == null ? '' : ' Wo.');

const proz = (x) => pz(Number.isFinite(x) ? x : 0, 1);
const knopf = (a, v, text, extra = '') => `<button class="q-neben-akt" data-a="${a}" data-v="${esc(String(v))}" ${extra}>${text}</button>`;
const optionen = (werte, auswahl) => werte.map(([id, name]) => `<option value="${esc(id)}" ${id === auswahl ? 'selected' : ''}>${esc(name)}</option>`).join('');
const teile = (n) => fmt.format(Math.round(n));
const feld = (titel, inhalt) => `<label class="q-stepzeile"><span class="q-name">${titel}</span>${inhalt}</label>`;

export function warenSeite(ctx, ui, tabs) {
  const d = ctx.E.warenUebersicht(ctx.s());
  const w = (ui.ware ??= { von: d.cluster[0]?.id ?? '', nach: d.cluster[1]?.id ?? '', gruppe: 'damen', wert: 50000, pp: 10 });
  const cluster = d.cluster.map(c => [c.id, c.name]), gruppen = Object.entries(ctx.E.GRUPPEN).map(([id, x]) => [id, x.name]);
  let html = (typeof tabs === 'function' ? tabs() : tabs) + '<div class="q31">';
  if (ui.seite === 'merchandise') {
    // Hauptfrage: Wie viel Ware kaufe ich für die nächste Saison ein, und wo?
    const summe = d.plaene.reduce((a, p) => a + p.budget, 0);
    html += `<div class="q-gross"><span class="q-label">Saisonbudget EK</span><span class="q-haupt" data-p="ware:plansumme">${geld(summe)}</span><span class="q-neben"><b data-p="ware:konzern">${geld(d.konzernbestand)}</b>Bestand Konzern</span></div>`;
    html += `<div class="q-befund">Saisonplanung rund 30 Wochen vor dem Start. ${d.vorlagen.length ? `<b data-p="ware:vorlagen">${teile(d.vorlagen.length)}</b> Vorlagen warten.` : `<span data-p="ware:vorlagen" hidden>${teile(d.vorlagen.length)}</span>Ohne Änderung gilt die bestehende Einkaufssteuerung.`}</div>`;
    html += '<div class="q-buch"><div class="q-buch-kopf"><span>Saisonplan je Warengruppe</span><b>Budget EK</b></div>';
    if (!d.plaene.length) html += '<div class="q-leer"><b>Kein Saisonplan offen.</b>Die nächste Planungsrunde beginnt rund 30 Wochen vor Saisonstart.</div>';
    for (const p of d.plaene) {
      html += `<div class="q-zeile"><span class="q-name">${esc(p.name)}<small>${esc(p.saisonName)}</small><small>Marge ${proz(p.zielmarge)} · Abverkauf ${proz(p.zielabverkauf)} · Vororder ${proz(p.vororderquote)}</small></span><span class="q-wert"><b data-p="ware:plan:${p.wg}">${geld(p.budget)}</b></span>
        <span class="q-knoepfe"><button data-a="warePlanMinus" data-v="${esc(p.wg)}" aria-label="${esc(p.name)} Budget minus 5 Prozent">−5 %</button><button data-a="warePlanPlus" data-v="${esc(p.wg)}" aria-label="${esc(p.name)} Budget plus 5 Prozent">+5 %</button></span></div>`;
    }
    if (d.plaene.length) html += `<div class="q-summe"><span>Summe ${d.plaene.length} Warengruppen</span><span class="q-wert" data-p="ware:plansumme">${geld(summe)}</span></div>`;
    html += '</div></div>';
    return { titel: 'Merchandise Planning', unter: `${d.plaene.length} Warengruppen · ${d.vorlagen.length} Vorlagen`, html };
  }
  if (ui.seite === 'allokation') {
    // Hauptfrage: In welchem Cluster liegt die Ware falsch?
    const knapp = d.cluster.filter((c) => c.reichweite != null && c.reichweite < 6), alt = d.cluster.filter((c) => c.altware > 0.2);
    html += `<div class="q-gross"><span class="q-label">Clusterbestand</span><span class="q-haupt" data-p="ware:bestand">${geld(d.clusterbestand)}</span><span class="q-neben"><b data-p="ware:qualitaet">${proz(d.allokationQualitaet)}</b>Steuerungsqualität</span></div>`;
    html += `<div class="q-befund">${knapp.length || alt.length ? `${knapp.length ? `<b>${knapp.length} Cluster</b> unter 6 Wochen Reichweite` : ''}${knapp.length && alt.length ? ', ' : ''}${alt.length ? `<b>${alt.length} Cluster</b> mit über 20 % Altware` : ''}.` : 'Kein Cluster knapp, keiner mit viel Altware.'}</div>`;
    const q = d.allokationQualitaet;
    html += `<div class="seg" style="margin-bottom:12px">${[['1', 'Bedarfsgerecht'], ['0.8', 'Verbessern'], ['0.5', 'Schwach']].map(([v, t]) => `<button class="${Math.abs(q - Number(v)) < 0.01 ? 'an' : ''}" data-a="wareQual" data-v="${v}">${t}</button>`).join('')}</div>`;
    const reihe = [...d.cluster].sort((a, b) => (a.reichweite ?? 999) - (b.reichweite ?? 999));
    html += '<div class="q-buch"><div class="q-buch-kopf"><span>Hauscluster</span><b>Reichweite · Altware</b></div>';
    for (const c of reihe) {
      const ton = c.reichweite != null && c.reichweite < 6 ? 'q-minus' : '';
      html += `<div class="q-zeile"><span class="q-name">${esc(c.name)}<small>${c.haeuser} Häuser · Bestand <i data-p="ware:cluster:${c.id}:bestand">${geld(c.bestand)}</i> · Fehlmenge ${geld(c.fehlmenge)}</small></span><span class="q-wert"><b class="${ton}" data-p="ware:cluster:${c.id}:reichweite">${reichweite(c.reichweite)}</b><small class="${c.altware > 0.2 ? 'q-minus' : ''}" data-p="ware:cluster:${c.id}:alt">${proz(c.altware)}</small></span></div>`;
    }
    html += '</div>';
    html += `<div class="q-buch"><div class="q-buch-kopf"><span>Umlagerung</span><b>1 bis 2 Wochen</b></div>
      ${feld('Von', `<select data-a="wareVon">${optionen(cluster, w.von)}</select>`)}${feld('Nach', `<select data-a="wareNach">${optionen(cluster, w.nach)}</select>`)}
      ${feld('Bereich', `<select data-a="wareGruppe">${optionen(gruppen, w.gruppe)}</select>`)}${feld('EK-Wert', `<input data-a="wareWert" type="number" inputmode="numeric" min="1" step="10000" value="${w.wert}">`)}
      <div class="q-stepzeile">${knopf('wareUmlagern', 'ja', 'Umlagerung beauftragen')}</div></div>`;
    if (d.umlagerungen.length) {
      html += '<div class="q-buch"><div class="q-buch-kopf"><span>Unterwegs</span><b>Wert EK</b></div>';
      for (const t of d.umlagerungen) html += `<div class="q-zeile"><span class="q-name">${esc(t.gruppe)}<small>${esc(t.von)} → ${esc(t.nach)} · Ankunft Woche ${t.ankunft + 1}</small></span><span class="q-wert">${geld(t.wert)}</span></div>`;
      html += '</div>';
    }
    html += `<div class="q-buch"><div class="q-buch-kopf"><span>Abfluss an FUNDUS</span></div>
      <div class="q-zeile"><span class="q-name">Eigenwarequote<small>bis 25 % ohne Nachteil</small></span><span class="q-wert" data-p="ware:fundusquote">${proz(d.fundus.quote)}</span></div>
      <div class="q-zeile"><span class="q-name">Frequenzfaktor FUNDUS<small>bei 50 % Eigenware −15 %</small></span><span class="q-wert" data-p="ware:fundusfaktor">${proz(d.fundus.frequenzFaktor)}</span></div>
      <div class="q-stepzeile">${knopf('wareFundus', 'ja', 'Altware abgeben')}<span class="q-name"><small>Bereich und EK-Wert aus der Umlagerung</small></span></div></div>`;
    html += '</div>';
    return { titel: 'Allokation', unter: `${d.cluster.length} Hauscluster · ${d.umlagerungen.length} Umlagerungen unterwegs`, html };
  }
  // Hauptfrage: Welche Warengruppe muss jetzt reduziert werden?
  const global = !!ctx.s().ware?.zentral?.['*|*'];
  const faellig = d.kalender.filter((k) => k.stufe > 0);
  html += `<div class="q-gross"><span class="q-label">Warengruppen mit Reduzierung</span><span class="q-haupt">${faellig.length} von ${d.kalender.length}</span><span class="q-neben"><b>${global ? 'zentral' : 'lokal frei'}</b>Steuerung</span></div>`;
  html += '<div class="q-befund">Stufen −20 % → −30 % → −50 % → Räumung, jeweils beim Überschreiten der Abverkaufsstufe. Mid-Season-Sales laufen über den Aktionskalender.</div>';
  html += `<div style="margin-bottom:12px">${knopf('wareZentralGlobal', 'ja', global ? 'Zentrale Durchsetzung aufheben' : 'Überall zentral durchsetzen')}</div>`;
  html += '<div class="q-buch"><div class="q-buch-kopf"><span>Reduzierungskalender</span><b>Abverkauf · Stufe</b></div>';
  for (const k of d.kalender) {
    const stufe = k.stufe === 1 ? 'Räumung' : k.stufe === 0 ? 'keine Stufe' : '−' + Math.round(k.stufe * 100) + ' %';
    html += `<div class="q-zeile"><span class="q-name">${esc(k.name)}<small>Reduzierung ${esc({ frueh: 'früh', spaet: 'spät' }[k.strategie] ?? k.strategie)}</small></span><span class="q-wert"><b data-p="ware:kal:${k.wg}">${proz(k.abverkauf)}</b><small>${stufe}</small></span></div>`;
  }
  html += '</div>';
  html += `<div class="q-buch"><div class="q-buch-kopf"><span>Lokaler Spielraum</span><b>höchstens 10 Punkte</b></div>
    ${feld('Hauscluster', `<select data-a="wareVon">${optionen(cluster, w.von)}</select>`)}${feld('Bereich', `<select data-a="wareGruppe">${optionen(gruppen, w.gruppe)}</select>`)}
    <div class="q-zeile"><span class="q-knoepfe" style="padding:0">${knopf('wareLokal10', 'ja', '10 Punkte nachreduzieren')}${knopf('wareLokal0', 'ja', 'Zurücknehmen')}${knopf('wareZentralCluster', 'ja', 'Cluster zentral steuern')}</span></div>
    ${global ? '<div class="q-leer">Bei zentraler Durchsetzung ist der lokale Spielraum gesperrt.</div>' : ''}</div>`;
  html += '</div>';
  return { titel: 'Reduzierungskalender', unter: `${d.kalender.length} Warengruppen · lokale Abweichungen je Hauscluster`, html };
}

export function warenAktion(ctx, ui, el, tun) {
  const typ = el.dataset.a, v = el.dataset.v;
  const w = (ui.ware ??= {});
  const d = ctx.E.warenUebersicht(ctx.s());
  const gruppen = Object.keys(ctx.E.GRUPPEN);
  const plan = d.plaene.find(x => x.wg === v);
  if (typ === 'warePlanPlus' || typ === 'warePlanMinus') {
    if (!plan) return;
    return tun({ typ: 'merchandisePlan', wg: v, saison: plan.saison, budget: Math.max(0, Math.round(plan.budget * (typ === 'warePlanPlus' ? 1.05 : 0.95))) });
  }
  if (typ === 'wareQual') return tun({ typ: 'allokationQualitaet', qualitaet: Number(v) });
  if (typ === 'wareUmlagern') return tun({ typ: 'umlagerung', gruppe: w.gruppe ?? gruppen[0], von: w.von, nach: w.nach, wert: Math.round(Number(w.wert)) });
  if (typ === 'wareFundus') return tun({ typ: 'fundusAbfluss', gruppe: w.gruppe ?? gruppen[0], wert: Math.round(Number(w.wert)) });
  if (typ === 'wareZentralGlobal') return tun({ typ: 'reduzierungZentral', an: !ctx.s().ware?.zentral?.['*|*'] });
  if (typ === 'wareLokal10' || typ === 'wareLokal0') return tun({ typ: 'reduzierungLokal', gruppe: w.gruppe ?? gruppen[0], hauscluster: w.von, punkte: typ === 'wareLokal10' ? 10 : 0 });
  if (typ === 'wareZentralCluster') {
    const gruppe = w.gruppe ?? gruppen[0], hauscluster = w.von;
    const an = !ctx.s().ware?.zentral?.[`${gruppe}|${hauscluster}`];
    return tun({ typ: 'reduzierungZentral', gruppe, hauscluster, an });
  }
}
export function wareErwartet(s, E, pfad) {
  const [basis, art, id, wert] = pfad;
  if (basis !== 'ware') return undefined;
  const d = E.warenUebersicht(s);
  if (art === 'bestand') return geld(d.clusterbestand);
  if (art === 'konzern') return geld(d.konzernbestand);
  if (art === 'plansumme') return geld(d.plaene.reduce((a, p) => a + p.budget, 0));
  if (art === 'vorlagen') return teile(d.vorlagen.length);
  if (art === 'qualitaet') return proz(d.allokationQualitaet);
  if (art === 'fundusquote') return proz(d.fundus.quote);
  if (art === 'fundusfaktor') return proz(d.fundus.frequenzFaktor);
  if (art === 'plan') return geld(d.plaene.find(x => x.wg === id)?.budget ?? 0);
  const c = d.cluster.find(x => x.id === id);
  if (art === 'cluster') return wert === 'bestand' ? geld(c?.bestand ?? 0) : wert === 'reichweite' ? reichweite(c?.reichweite) : proz(c?.altware ?? 0);
  if (art === 'kal') return proz(d.kalender.find(x => x.wg === id)?.abverkauf ?? 0);
  return undefined;
}
