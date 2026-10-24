// O05 Ware: reine Darstellungslogik für Merchandise Planning, Clusterallokation und Reduzierung.
// E47 (G2): Blatt wie Coffee 17 bis 22. Großkennzahl oben, Buch mit Strich vor der Summe, Bedienung mit Stepper und
// Segmentleiste; data-p-Schlüssel und Summenschlüssel (data-s / data-summe) wie bisher.
import { geld, fmt, esc, pz } from './format.js';
import * as K from './komponenten.js';
import * as B from './g2-buch.js';

const reichweite = (r) => r == null ? 'ohne Umsatz' : (r > 99 ? '> 99' : r.toFixed(1).replace('.', ',')) + ' Wo.';
const proz = (x) => pz(Number.isFinite(x) ? x : 0, 1);
const teile = (n) => fmt.format(Math.round(n));
const STUFE = (k) => k.stufe === 1 ? 'Räumung' : k.stufe === 0 ? 'keine Stufe' : '−' + Math.round(k.stufe * 100) + ' %';
const STRATEGIE = { frueh: 'früh', spaet: 'spät', normal: 'normal' };

export function warenSeite(ctx, ui, tabs) {
  const s = ctx.s(), d = ctx.E.warenUebersicht(s);
  const w = (ui.ware ??= { von: d.cluster[0]?.id ?? '', nach: d.cluster[1]?.id ?? '', gruppe: 'damen', wert: 50000, pp: 10 });
  const cluster = d.cluster.map((c) => [c.id, c.name]), gruppen = Object.entries(ctx.E.GRUPPEN).map(([id, x]) => [id, x.name]);
  const kopf = typeof tabs === 'function' ? tabs() : tabs;
  const sprecher = (text, ton = '') => B.vorstandSprecher(s, 'cpo', 'Einkaufsvorstand', text, ton);
  if (ui.seite === 'merchandise') {
    // Hauptfrage: Wie viel Ware kaufe ich für die nächste Saison ein, und wo?
    const summe = d.plaene.reduce((a, p) => a + p.budget, 0);
    const vorlagen = d.vorlagen.length;
    let x = K.gross([
      { label: 'Saisonbudget EK', wert: geld(summe), p: 'ware:plansumme', unter: `${d.plaene.length} Warengruppen` },
      { label: 'Bestand Konzern', wert: geld(d.konzernbestand), p: 'ware:konzern', unter: `<span data-p="ware:vorlagen">${teile(vorlagen)}</span> ${vorlagen === 1 ? 'Vorlage wartet' : 'Vorlagen warten'}` },
    ]);
    const saison = d.plaene[0]?.saisonName;
    const zeilen = d.plaene.map((p) => {
      const auf = w.planAuf === p.wg;
      return B.reihe({ name: esc(p.name), unter: `Marge ${proz(p.zielmarge)} · Abv. ${proz(p.zielabverkauf)} · Vor. ${proz(p.vororderquote)}`, werte: [{ t: geld(p.budget), s: 'b', p: `ware:plan:${p.wg}` }], pfeil: auf ? '▾' : '▸', attr: `data-a="warePlanAuf" data-v="${esc(p.wg)}" aria-expanded="${auf}"` })
        + (auf ? `<div class="hw-g2-ausklapp">${K.stepper({ wert: 'Budget', unter: 'je Schritt 5 %', label: `${p.name} Budget`, attrMinus: `data-a="warePlanMinus" data-v="${esc(p.wg)}" aria-label="${esc(p.name)} Budget minus 5 Prozent"`, attrPlus: `data-a="warePlanPlus" data-v="${esc(p.wg)}" aria-label="${esc(p.name)} Budget plus 5 Prozent"` })}</div>` : '');
    });
    if (d.plaene.length) zeilen.push(B.reihe({ name: `Summe ${d.plaene.length} Warengruppen`, werte: [{ t: geld(summe), summe: 'b', p: 'ware:plansumme' }], art: 'summe' }));
    x += d.plaene.length ? B.buch({ titel: 'Saisonplan', spalten: ['Budget EK'], zeilen, breite: 100, attr: 'data-summenbuch="Saisonplan"' })
      : K.abschnitt('Saisonplan') + K.leer('Die nächste Planungsrunde beginnt rund 30 Wochen vor Saisonstart.', 'Kein Saisonplan offen.');
    x += B.fuss(`${saison ? esc(saison) + '. ' : ''}Abv. heißt Zielabverkauf, Vor. Vororderquote. Warengruppe antippen, um ihr Budget in Schritten von 5 % zu ändern. Ohne Änderung gilt die bestehende Einkaufssteuerung.`);
    const text = vorlagen ? `<b>${vorlagen} ${vorlagen === 1 ? 'Saisonvorlage wartet' : 'Saisonvorlagen warten'} auf dich.</b> Geplant wird 30 Wochen vor dem Start.`
      : `<b>Der Saisonplan${saison ? ' ' + esc(saison) : ''} steht.</b> Geplant wird 30 Wochen vor dem Start.`;
    return { titel: 'Merchandise Planning', unter: `${d.plaene.length} Warengruppen · ${vorlagen} Vorlagen`, html: kopf + sprecher(text, vorlagen ? 'engpass' : '') + K.rumpf(x) };
  }
  if (ui.seite === 'allokation') {
    // Hauptfrage: In welchem Cluster liegt die Ware falsch?
    const knapp = d.cluster.filter((c) => c.reichweite != null && c.reichweite < 6), alt = d.cluster.filter((c) => c.altware > 0.2);
    const text = knapp.length || alt.length
      ? `<b>${[knapp.length ? `${knapp.length} ${knapp.length === 1 ? 'Cluster liegt' : 'Cluster liegen'} unter 6 Wochen Reichweite` : '', alt.length ? `${alt.length} mit über 20 % Altware` : ''].filter(Boolean).join(', ')}.</b> Umlagern oder an FUNDUS abgeben.`
      : '<b>Kein Cluster ist knapp, keiner hat viel Altware.</b> Die Ware liegt richtig.';
    let x = K.gross([
      { label: 'Clusterbestand', wert: geld(d.clusterbestand), p: 'ware:bestand', unter: `${d.cluster.length} Hauscluster` },
      { label: 'Steuerungsqualität', wert: proz(d.allokationQualitaet), p: 'ware:qualitaet', unter: d.allokationQualitaet >= 0.99 ? 'bedarfsgerecht' : 'unter Bedarf' },
    ]);
    const q = d.allokationQualitaet, aktiv = [['1', 1], ['0.8', 0.8], ['0.5', 0.5]].find(([, v]) => Math.abs(q - v) < 0.01)?.[0] ?? '';
    x += K.abschnitt('Verteilung in die Häuser', 'Steuerungsqualität');
    x += K.seg([['1', '100 %'], ['0.8', '80 %'], ['0.5', '50 %']], aktiv, (v) => `data-a="wareQual" data-v="${v}"`);
    x += B.fuss('100 % verteilt nach Bedarf je Haus, weniger spart Steuerungsaufwand und erzeugt Fehlmengen.');
    const reihe = [...d.cluster].sort((a, b) => (a.reichweite ?? 999) - (b.reichweite ?? 999));
    x += B.buch({ titel: 'Hauscluster', spalten: ['Reichweite', 'Altware'], breite: 76, zeilen: reihe.map((c) => B.reihe({
      name: esc(c.name), unter: `${c.haeuser} Häuser · Bestand <span data-p="ware:cluster:${c.id}:bestand">${geld(c.bestand)}</span> · Fehlmenge ${geld(c.fehlmenge)}`,
      werte: [{ t: reichweite(c.reichweite), p: `ware:cluster:${c.id}:reichweite`, ton: c.reichweite != null && c.reichweite < 6 ? 'schlecht' : '' }, { t: proz(c.altware), p: `ware:cluster:${c.id}:alt`, ton: c.altware > 0.2 ? 'schlecht' : '' }] })) });
    x += K.abschnitt('Umlagerung', '1 bis 2 Wochen');
    x += B.felder(K.feld('Von', B.auswahl(cluster, w.von, 'data-a="wareVon"', 'Von Hauscluster')), K.feld('Nach', B.auswahl(cluster, w.nach, 'data-a="wareNach"', 'Nach Hauscluster')));
    x += '<div class="hw-abstand"></div>' + B.felder(K.feld('Bereich', B.auswahl(gruppen, w.gruppe, 'data-a="wareGruppe"', 'Bereich')),
      K.feld('EK-Wert', `<input class="hw-g2-auswahl hw-kontur" data-a="wareWert" type="number" inputmode="numeric" min="1" step="10000" value="${Number(w.wert) || 0}" aria-label="EK-Wert in Euro">`));
    x += K.knoepfe(K.knopf('Umlagerung beauftragen', 'data-a="wareUmlagern" data-v="ja"', 'breit'));
    if (d.umlagerungen.length) {
      x += K.abschnitt('Unterwegs', `${d.umlagerungen.length} Transporte`);
      x += K.liste(d.umlagerungen.map((t) => K.zeile({ was: esc(t.gruppe), unter: `${esc(t.von)} nach ${esc(t.nach)} · Ankunft Woche ${t.ankunft + 1}`, wert: geld(t.wert) })));
    }
    x += K.abschnitt('Abfluss an FUNDUS');
    x += K.liste([
      K.zeile({ was: 'Eigenwarequote', unter: 'bis 25 % ohne Nachteil', wert: `<span data-p="ware:fundusquote">${proz(d.fundus.quote)}</span>`, ton: d.fundus.quote > 0.25 ? 'achtung' : '' }),
      K.zeile({ was: 'Frequenzfaktor FUNDUS', unter: 'bei 50 % Eigenware −15 %', wert: `<span data-p="ware:fundusfaktor">${proz(d.fundus.frequenzFaktor)}</span>` })]);
    x += K.knoepfe(K.knopf('Altware abgeben', 'data-a="wareFundus" data-v="ja"', 'zweit breit'));
    x += B.fuss('Bereich und EK-Wert kommen aus der Umlagerung oben.');
    return { titel: 'Allokation', unter: `${d.cluster.length} Hauscluster · ${d.umlagerungen.length} Umlagerungen unterwegs`, html: kopf + sprecher(text, knapp.length || alt.length ? 'engpass' : '') + K.rumpf(x) };
  }
  // Hauptfrage: Welche Warengruppe muss jetzt reduziert werden?
  const global = !!s.ware?.zentral?.['*|*'];
  const faellig = d.kalender.filter((k) => k.stufe > 0);
  const raeumung = d.kalender.filter((k) => k.stufe === 1);
  const text = faellig.length
    ? `<b>${faellig.length} von ${d.kalender.length} Warengruppen sind in einer Reduzierungsstufe${raeumung.length ? `, ${raeumung.length} in der Räumung` : ''}.</b>`
    : '<b>Keine Warengruppe hat eine Reduzierungsstufe erreicht.</b> Der Abverkauf liegt unter 35 %.';
  let x = K.gross([
    { label: 'Mit Reduzierung', wert: `${faellig.length} von ${d.kalender.length}`, ton: raeumung.length ? 'schlecht' : '', unter: 'Warengruppen' },
    { label: 'Steuerung', wert: global ? 'zentral' : 'lokal', unter: global ? 'überall durchgesetzt' : 'Cluster dürfen abweichen' },
  ]);
  x += K.knoepfe(K.knopf(global ? 'Zentrale Durchsetzung aufheben' : 'Überall zentral durchsetzen', 'data-a="wareZentralGlobal" data-v="ja"', 'zweit breit'));
  const reihen = [...d.kalender].sort((a, b) => b.stufe - a.stufe || b.abverkauf - a.abverkauf);
  x += B.buch({ titel: 'Warengruppe', spalten: ['Abverkauf', 'Stufe'], breite: 80, zeilen: reihen.map((k) => B.reihe({
    name: esc(k.name), unter: `Reduzierung ${esc(STRATEGIE[k.strategie] ?? k.strategie)}`,
    werte: [{ t: proz(k.abverkauf), p: `ware:kal:${k.wg}` }, { t: STUFE(k), ton: k.stufe === 1 ? 'schlecht' : k.stufe > 0 ? 'achtung' : 'leise' }] })) });
  x += B.fuss('Stufen −20 %, −30 %, −50 %, dann Räumung, jeweils beim Überschreiten der Abverkaufsstufe. Mid-Season-Sales laufen über den Aktionskalender.');
  x += K.abschnitt('Lokaler Spielraum', 'höchstens 10 Punkte');
  x += B.felder(K.feld('Hauscluster', B.auswahl(cluster, w.von, 'data-a="wareVon"', 'Hauscluster')), K.feld('Bereich', B.auswahl(gruppen, w.gruppe, 'data-a="wareGruppe"', 'Bereich')));
  x += global ? K.hinweis('Bei zentraler Durchsetzung ist der lokale Spielraum gesperrt.', 'achtung')
    : K.knoepfe(K.knopf('10 Punkte nachreduzieren', 'data-a="wareLokal10" data-v="ja"', 'breit'))
      + `<div class="hw-knoepfe zweispaltig">${K.knopf('Zurücknehmen', 'data-a="wareLokal0" data-v="ja"', 'zweit')}${K.knopf('Cluster zentral', 'data-a="wareZentralCluster" data-v="ja"', 'zweit')}</div>`;
  return { titel: 'Reduzierungskalender', unter: `${d.kalender.length} Warengruppen · Steuerung ${global ? 'zentral' : 'lokal'}`, html: kopf + sprecher(text, raeumung.length ? 'engpass' : '') + K.rumpf(x) };
}

export function warenAktion(ctx, ui, el, tun) {
  const typ = el.dataset.a, v = el.dataset.v;
  const w = (ui.ware ??= {});
  const d = ctx.E.warenUebersicht(ctx.s());
  const gruppen = Object.keys(ctx.E.GRUPPEN);
  const plan = d.plaene.find((x) => x.wg === v);
  if (typ === 'warePlanAuf') { w.planAuf = w.planAuf === v ? null : v; return 'zeigen'; }
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
  if (art === 'plan') return geld(d.plaene.find((x) => x.wg === id)?.budget ?? 0);
  const c = d.cluster.find((x) => x.id === id);
  if (art === 'cluster') return wert === 'bestand' ? geld(c?.bestand ?? 0) : wert === 'reichweite' ? reichweite(c?.reichweite) : proz(c?.altware ?? 0);
  if (art === 'kal') return proz(d.kalender.find((x) => x.wg === id)?.abverkauf ?? 0);
  return undefined;
}
