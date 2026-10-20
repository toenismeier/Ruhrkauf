// O05 Ware: reine Darstellungslogik für Merchandise Planning, Clusterallokation und Reduzierung.
import { geld, fmt, esc, pz } from './format.js';

const proz = (x) => pz(Number.isFinite(x) ? x : 0, 1);
const knopf = (a, v, text, extra = '') => `<button class="mini" data-a="${a}" data-v="${esc(String(v))}" ${extra}>${text}</button>`;
const optionen = (werte, auswahl) => werte.map(([id, name]) => `<option value="${esc(id)}" ${id === auswahl ? 'selected' : ''}>${esc(name)}</option>`).join('');
const teile = (n) => fmt.format(Math.round(n));

export function warenSeite(ctx, ui, tabs) {
  const d = ctx.E.warenUebersicht(ctx.s());
  const w = (ui.ware ??= { von: d.cluster[0]?.id ?? '', nach: d.cluster[1]?.id ?? '', gruppe: 'damen', wert: 50000, pp: 10 });
  const cluster = d.cluster.map(c => [c.id, c.name]), gruppen = Object.entries(ctx.E.GRUPPEN).map(([id, x]) => [id, x.name]);
  let html = tabs();
  if (ui.seite === 'merchandise') {
    html += `<div class="raster"><div class="kz"><span>Bestand Konzern</span><b data-p="ware:bestand">${geld(d.konzernbestand)}</b></div><div class="kz"><span>Offene Saisonvorlagen</span><b data-p="ware:vorlagen">${teile(d.vorlagen.length)}</b></div></div>`;
    html += `<div class="legende">Saisonplanung circa 30 Wochen vor dem Start. Budgets in Euro EK (Open-to-Buy), Zielmarge, Zielabverkauf, Breite und Vororderquote. Solange keine Änderung erfolgt, gilt die bestehende Einkaufssteuerung.</div>`;
    html += '<div class="karte liste"><div class="lkopf"><span class="lname">Warengruppe / Saison</span><span class="lwert">Budget EK</span><span class="lwert">Zielabverkauf</span></div>';
    for (const p of d.plaene) {
      html += `<div class="lzeile"><span class="lname">${esc(p.name)}<i>${esc(p.saisonName)} · Marge ${proz(p.zielmarge)} · Breite ${proz(p.breite)} · Vororder ${proz(p.vororderquote)}</i></span><span class="lwert"><i data-p="ware:plan:${p.wg}">${geld(p.budget)}</i><small>${knopf('warePlanMinus', p.wg, '−5 %')} ${knopf('warePlanPlus', p.wg, '+5 %')}</small></span><span class="lwert">${proz(p.zielabverkauf)}</span></div>`;
    }
    html += '</div>';
    return { titel: 'Merchandise Planning', unter: `${d.plaene.length} Warengruppen · ${d.vorlagen.length} Vorlagen`, html };
  }
  if (ui.seite === 'allokation') {
    html += `<div class="raster"><div class="kz"><span>Clusterbestand</span><b data-p="ware:bestand">${geld(d.clusterbestand)}</b></div><div class="kz"><span>Steuerungsqualität</span><b data-p="ware:qualitaet">${proz(d.allokationQualitaet)}</b></div></div>`;
    html += `<div class="karte"><div class="khead">Allokation und Nachschub</div><div class="zeile">${knopf('wareQual', '1', 'Bedarfsgerecht')} ${knopf('wareQual', '0.5', 'Schwache Allokation')} ${knopf('wareQual', '0.8', 'Verbessern')}</div><div class="legende">Schwache Allokation verschiebt Saisonware und NOS-Nachschub in die falschen Cluster. Reichweite: Bestand geteilt durch geschätzten Wochenwareneinsatz.</div></div>`;
    html += '<div class="karte liste"><div class="lkopf"><span class="lname">Hauscluster</span><span class="lwert">Reichweite</span><span class="lwert">Altware</span></div>';
    for (const c of d.cluster) {
      const ton = c.reichweite < 6 ? 'rot' : c.altware > 0.2 ? 'warn' : '';
      html += `<div class="lzeile ${ton}"><span class="lname">${esc(c.name)} <i>${c.haeuser} Häuser · Bestand <i data-p="ware:cluster:${c.id}:bestand">${geld(c.bestand)}</i> · Fehlmenge ${geld(c.fehlmenge)}</i></span><span class="lwert" data-p="ware:cluster:${c.id}:reichweite">${c.reichweite.toFixed(1)} Wo.</span><span class="lwert" data-p="ware:cluster:${c.id}:alt">${proz(c.altware)}</span></div>`;
    }
    html += '</div>';
    html += `<div class="karte"><div class="khead">Umlagerung (1 bis 2 Wochen)</div>
      <div class="zeile">Von <select data-a="wareVon">${optionen(cluster,w.von)}</select></div>
      <div class="zeile">Nach <select data-a="wareNach">${optionen(cluster,w.nach)}</select></div>
      <div class="zeile">Bereich <select data-a="wareGruppe">${optionen(gruppen,w.gruppe)}</select></div>
      <div class="zeile">EK-Wert <input data-a="wareWert" type="number" min="1" step="10000" value="${w.wert}"></div>
      <div class="zeile">${knopf('wareUmlagern', 'ja', 'Umlagerung beauftragen')}</div></div>`;
    if (d.umlagerungen.length) {
      html += '<div class="karte"><div class="khead">Unterwegs</div>';
      for (const t of d.umlagerungen) html += `<div class="zeile">${esc(t.gruppe)}: ${esc(t.von)} → ${esc(t.nach)} · ${geld(t.wert)} · Woche ${t.ankunft + 1}</div>`;
      html += '</div>';
    }
    html += `<div class="karte"><div class="khead">Abfluss an FUNDUS</div><div class="raster">
      <div class="kz"><span>Eigenwarequote</span><b data-p="ware:fundusquote">${proz(d.fundus.quote)}</b></div>
      <div class="kz"><span>Frequenzfaktor</span><b data-p="ware:fundusfaktor">${proz(d.fundus.frequenzFaktor)}</b></div></div>
      <div class="legende">Bis 25 % Eigenware ohne Nachteil. Bei 50 % Eigenware sinkt die FUNDUS-Frequenz um 15 %.</div>
      <div class="zeile">${knopf('wareFundus', 'ja', 'Altware abgeben')} <i>Ausgewählter Bereich und EK-Wert von oben</i></div></div>`;
    return { titel: 'Allokation', unter: `${d.cluster.length} Hauscluster · ${d.umlagerungen.length} Umlagerungen unterwegs`, html };
  }
  const global = !!ctx.s().ware?.zentral?.['*|*'];
  html += `<div class="karte"><div class="khead">Zentraler Reduzierungskalender</div><div class="zeile">${knopf('wareZentralGlobal', 'ja', global ? 'Durchsetzen aufheben' : 'Überall zentral durchsetzen')}</div>
    <div class="legende">−20 % → −30 % → −50 % → Räumung, bei Überschreiten der jeweiligen Abverkaufsstufe. Der Standard entspricht der bisherigen Strategie. Mid-Season-Sales bleiben Bestandteil des Aktionskalenders.</div></div>`;
  html += `<div class="karte"><div class="khead">Lokaler Spielraum</div>
    <div class="zeile">Hauscluster <select data-a="wareVon">${optionen(cluster,w.von)}</select></div>
    <div class="zeile">Bereich <select data-a="wareGruppe">${optionen(gruppen,w.gruppe)}</select></div>
    <div class="zeile">${knopf('wareLokal10', 'ja', '10 PP nachreduzieren')} ${knopf('wareLokal0', 'ja', 'Lokale Reduzierung zurücknehmen')} ${knopf('wareZentralCluster', 'ja', 'Cluster zentral steuern')}</div>
    <div class="legende">Maximal zehn zusätzliche Prozentpunkte. Bei zentraler Durchsetzung ist der Spielraum gesperrt.</div></div>`;
  html += '<div class="karte liste"><div class="lkopf"><span class="lname">Warengruppe</span><span class="lwert">Abverkauf</span><span class="lwert">Stufe</span></div>';
  for (const k of d.kalender) {
    const stufe = k.stufe === 1 ? 'Räumung' : k.stufe === 0 ? 'Noch keine' : '−' + Math.round(k.stufe * 100) + ' %';
    html += `<div class="lzeile"><span class="lname">${esc(k.name)} <i>Strategie: ${esc(k.strategie)} · Saison ${k.saison}</i></span><span class="lwert" data-p="ware:kal:${k.wg}">${proz(k.abverkauf)}</span><span class="lwert">${stufe}</span></div>`;
  }
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
  if (art === 'vorlagen') return teile(d.vorlagen.length);
  if (art === 'qualitaet') return proz(d.allokationQualitaet);
  if (art === 'fundusquote') return proz(d.fundus.quote);
  if (art === 'fundusfaktor') return proz(d.fundus.frequenzFaktor);
  if (art === 'plan') return geld(d.plaene.find(x => x.wg === id)?.budget ?? 0);
  const c = d.cluster.find(x => x.id === id);
  if (art === 'cluster') return wert === 'bestand' ? geld(c?.bestand ?? 0) : wert === 'reichweite' ? (c?.reichweite ?? 0).toFixed(1) + ' Wo.' : proz(c?.altware ?? 0);
  if (art === 'kal') return proz(d.kalender.find(x => x.wg === id)?.abverkauf ?? 0);
  return undefined;
}
