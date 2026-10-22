// O02 Umsatztreiber. Darstellung ausschließlich aus Engine-Abfragen.
import { geld, fmt, esc, clusterName } from './format.js';
import { bereich } from './komponenten.js';

const prozent = (x) => (100 * x).toLocaleString('de-DE', { maximumFractionDigits: 1, minimumFractionDigits: 1 }) + ' %';
const zahl = (x, n = 1) => Number(x).toLocaleString('de-DE', { maximumFractionDigits: n, minimumFractionDigits: n });
const euro = (x) => zahl(x, 2) + ' €';
const abweichung = (wert, basis) => basis == null ? 'Kein Vorjahr' : (wert >= basis ? '↑ ' : '↓ ') + prozent(basis ? (wert / basis - 1) : 0);
const punkt = (wert, basis) => basis == null ? 'Kein Vorjahr' : (wert >= basis ? '↑ ' : '↓ ') + zahl((wert - basis) * 100) + ' Punkte';
function brueckeHtml(br) {
  if (br.status !== 'ok') return '<div class="o02-hinweis">' + esc(br.status) + '</div>';
  const eintraege = [['Frequenz', br.frequenz], ['Kaufquote', br.kaufquote], ['Teile', br.teile], ['Preis', br.preis]];
  const maximal = Math.max(1, ...eintraege.map((x) => Math.abs(x[1])));
  const zeilen = eintraege.map(([name, wert]) => '<div class="o02-effekt"><span>' + name + '</span><div class="o02-steg"><i class="' +
    (wert < 0 ? 'minus' : 'plus') + '" style="width:' + Math.max(1, Math.round(Math.abs(wert) / maximal * 100)) + '%"></i></div><b>' + esc(geld(wert)) + '</b></div>').join('');
  return '<div class="o02-bruecke" data-o02-diff="' + br.differenz + '" data-o02-summe="' +
    (br.frequenz + br.kaufquote + br.teile + br.preis) + '"><div class="o02-end"><b>Vorjahr ' + geld(br.vorher) +
    '</b><b>Ist ' + geld(br.aktuell) + '</b></div>' + zeilen + '<div class="o02-end"><b>Abweichung ' +
    geld(br.differenz) + '</b><span>Boneffekt ' + geld(br.bon) + '</span></div>' +
    (br.vorjahrGeschaetzt ? '<small>Vorjahreswerte teilweise aus 4-Wochen-Blöcken geschätzt.</small>' : '') + '</div>';
}
export function hausTreiberZeile(E, s, id) {
  const d = E.hausTreiber(s, id);
  if (!d) return '<div class="karte o02-haus"><div class="khead">Umsatztreiber</div><div class="zeile grau">Noch keine abgeschlossene Woche</div></div>';
  const a = d.aktuell, v = d.vorjahr;
  const br = E.umsatzbruecke(s, { ebene: 'haus', id, vergleich: 'vorjahr', wochen: 1 });
  const kpi = (name, wert, delta) => '<div class="o02-treib"><span>' + name + '</span><b>' + esc(wert) + '</b><small>' + esc(delta) + '</small></div>';
  return '<div class="karte o02-haus" data-o02-haus="' + esc(id) + '" data-o02-umsatz="' + a.umsatz +
    '" data-o02-frequenz="' + a.frequenz + '" data-o02-kaufquote="' + a.kaufquote +
    '" data-o02-bon="' + a.bon + '"><div class="khead">Umsatztreiber <small>Frequenz × Kaufquote × Bon</small></div>' +
    '<div class="o02-drei">' +
    kpi('Frequenz', fmt.format(Math.round(a.frequenz)), abweichung(a.frequenz, v?.frequenz)) +
    kpi('Kaufquote', prozent(a.kaufquote), punkt(a.kaufquote, v?.kaufquote)) +
    kpi('Durchschnittsbon', euro(a.bon), abweichung(a.bon, v?.bon)) +
    '</div><div class="o02-fuss">Ø ' + zahl(a.teile, 2) + ' Teile je Bon · ' + euro(a.preis) + ' je Teil</div>' +
    '<div class="o02-wasserfall"><b>Umsatzbrücke zur Vorjahreswoche</b>' + brueckeHtml(br) + '</div></div>';
}
function zeile(z, haus = false) {
  return '<div class="o02-daten ' + (haus ? 'o02-klickbar' : '') + '" ' +
    (haus ? 'data-o02-open="' + esc(z.id) + '" role="button" tabindex="0"' : '') + '>' +
    '<div class="o02-name"><span class="o02-ampel ' + esc(z.ampelfarbe) + '"></span>' +
    esc(z.name) + '</div><div>' + geld(z.umsatz) + '</div><div>' +
    (z.abweichung == null ? '–' : geld(z.abweichung) + ' (' + prozent(z.abweichungProzent ?? 0) + ')') +
    '</div><div>' + fmt.format(Math.round(z.frequenz)) + '</div><div>' + prozent(z.kaufquote) +
    '</div><div>' + euro(z.bon) + '</div></div>';
}
/** Q31 Wasserfall Vorjahr → Ist: schwebende Balken auf gemeinsamer Skala (Ausschnitt um die Veränderung), Summe = Abweichung. */
function wasserfall(br) {
  if (br.status !== 'ok') return '<div class="q-leer"><b>Noch keine Vorjahresbrücke.</b>' + esc(br.status) + '</div>';
  const schritte = [['Frequenz', br.frequenz, 'Besucher'], ['Kaufquote', br.kaufquote, 'Käufer je Besucher'], ['Teile je Bon', br.teile, 'Boneffekt'], ['Preis je Teil', br.preis, 'Boneffekt']];
  let lauf = br.vorher; const pos = schritte.map(([n, v, d]) => { const a = lauf; lauf += v; return { n, v, d, a, b: lauf }; });
  const werte = [br.vorher, br.aktuell, ...pos.flatMap((x) => [x.a, x.b])];
  const spanne = Math.max(1, Math.max(...werte) - Math.min(...werte));
  const lo = Math.min(...werte) - spanne * 0.08, hi = Math.max(...werte) + spanne * 0.08;
  const x = (w) => ((w - lo) / (hi - lo) * 100).toFixed(1);
  const vz = (w) => (w > 0 ? '+' : w < 0 ? '−' : '') + geld(Math.abs(w));
  const strich = (w) => '<span class="q-wf-spur"><i class="q-wf-marke" style="left:' + x(w) + '%"></i></span>';
  let h = '<div class="o02-bruecke q-wf" data-summenbuch="Konzernbrücke" data-o02-diff="' + br.differenz + '" data-o02-summe="' + (br.frequenz + br.kaufquote + br.teile + br.preis) + '">';
  h += '<div class="q-wf-zeile q-wf-ende"><span class="q-name">Vorjahr</span>' + strich(br.vorher) + '<span class="q-wert" data-s="e">' + geld(br.vorher) + '</span></div>';
  for (const s of pos) h += '<div class="q-wf-zeile"><span class="q-name">' + s.n + '<small>' + s.d + '</small></span><span class="q-wf-spur"><i class="q-wf-balken ' + (s.v < 0 ? 'minus' : 'plus') + '" style="left:' + x(Math.min(s.a, s.b)) + '%;width:' + Math.max(0.6, Math.abs(s.v) / (hi - lo) * 100).toFixed(1) + '%"></i></span><span data-s="e" class="q-wert ' + (s.v < 0 ? 'q-minus' : '') + '">' + vz(s.v) + '</span></div>';
  h += '<div class="q-wf-zeile q-wf-ende q-wf-summe"><span class="q-name">Ist</span>' + strich(br.aktuell) + '<span class="q-wert" data-summe="e">' + geld(br.aktuell) + '</span></div>';
  h += '<div class="legende" style="padding:8px 14px 10px">Boneffekt zusammen ' + vz(br.bon) + ' · Balken im Ausschnitt ' + geld(lo) + ' bis ' + geld(hi) + '</div>';
  if (br.vorjahrGeschaetzt) h += '<div class="legende" style="padding:0 14px 10px">Vorjahreswerte teilweise aus 4-Wochen-Blöcken geschätzt.</div>';
  return h + '</div>';
}
export function reportingModul(ctx) {
  const E = ctx.E, ui = { aktiv: false, ebene: 'region', format: 'alle', sort: 'umsatz', wochen: 1 };
  const sortiere = (werte) => [...werte].sort((a, b) => {
    const av = a[ui.sort], bv = b[ui.sort];
    return (ui.sort === 'name' ? String(av).localeCompare(String(bv), 'de') :
      (Number(bv ?? -1e15) - Number(av ?? -1e15))) || a.name.localeCompare(b.name, 'de');
  });
  const karten = (werte) => sortiere(werte).map((z) => zeile(z, true)).join('');
  const leere = '<div class="zeile grau">Keine Häuser im gewählten Filter.</div>';
  const tabelle = (inhalt) => '<div class="o02-scroll"><div class="o02-tab"><div class="o02-daten o02-kopf"><b>Einheit</b><b>Umsatz</b>' +
    '<b>Abw. VJ</b><b>Frequenz</b><b>Kaufquote</b><b>Bon</b></div>' + (inhalt || leere) + '</div></div>';
  const auswahl = (name, key, optionen) => '<label>' + name + '<select data-o02-wahl="' + key + '" class="ort">' +
    optionen.map(([wert, titel]) => '<option value="' + esc(wert) + '" ' + (String(ui[key]) === String(wert) ? 'selected' : '') +
      '>' + esc(titel) + '</option>').join('') + '</select></label>';
  function anzeigen() {
    const daten = E.reporting(ctx.s(), ui.wochen, ui.format);
    // Q31: Gruppenzeilen der Hauscluster tragen intern die Cluster-ID als Namen
    for (const g of daten.gruppen) if (g.ebene === 'hauscluster') g.name = clusterName(ctx.s(), g.id);
    const hs = daten.zeilen;
    const gruppen = daten.gruppen;
    const filter = '<div class="o02-filter">' +
      auswahl('Ebene', 'ebene', [['region', 'Region'], ['hauscluster', 'Hauscluster'], ['haus', 'Haus']]) +
      auswahl('Format', 'format', [['alle', 'Alle'], ...[...new Set(ctx.s().haeuser.map((z) => z.format))].map((f) =>
        [f, f === 'warenhaus' ? 'Hartwig' : f === 'sport' ? 'Hartwig Sport' : f === 'fundus' ? 'FUNDUS' : f])]) +
      auswahl('Zeitraum', 'wochen', [[1, '1 Woche'], [4, '4 Wochen'], [13, '13 Wochen'], [52, '52 Wochen']]) +
      auswahl('Sortieren', 'sort', [['umsatz', 'Umsatz'], ['abweichung', 'Abweichung'], ['frequenz', 'Frequenz'],
        ['kaufquote', 'Kaufquote'], ['bon', 'Bon'], ['name', 'Name']]) + '</div>';
    // Q31: Hauptfrage „Was treibt den Umsatz gegen Vorjahr?“ – Abweichung groß, Wasserfall, dann Beobachtungsliste (Hauptaufgabe: Haus öffnen).
    const B = daten.bruecke;
    let content = '<div class="q31">';
    content += B.status === 'ok' ? '<div class="q-gross"><span class="q-label">Umsatz gegen Vorjahr</span><span class="q-haupt ' + (B.differenz < 0 ? 'q-minus' : 'q-plus') + '">' + (B.differenz > 0 ? '+' : B.differenz < 0 ? '−' : '') + geld(Math.abs(B.differenz)) + '</span><span class="q-neben"><b>' + geld(B.aktuell) + '</b>Ist ' + (ui.wochen === 1 ? 'letzte Woche' : ui.wochen + ' Wochen') + '</span></div>' : '';
    if (B.status === 'ok') { const g = [['Frequenz', B.frequenz], ['Kaufquote', B.kaufquote], ['Teile je Bon', B.teile], ['Preis je Teil', B.preis]].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0]; content += '<div class="q-befund">Größter Treiber: <b>' + g[0] + '</b> mit ' + (g[1] < 0 ? '−' : '+') + geld(Math.abs(g[1])) + '.</div>'; }
    content += '<div class="q-buch"><div class="q-buch-kopf"><span>Konzernbrücke zum Vorjahr</span></div>' + wasserfall(B) + '</div>';
    const beob = daten.beobachtung.filter((o) => hs.some((z) => z.id === o.hausId));
    content += '<div class="q-buch"><div class="q-buch-kopf"><span>Beobachtungsliste</span><b>größte Rückgänge</b></div>' +
      (beob.length ? beob.map((o) => '<button class="q-zeile q-tipp o02-beobachtung" data-o02-open="' + esc(o.hausId) + '"><span class="q-name">' + esc(o.name) + '<small>' + esc(o.haupttreiber) + '</small></span><span class="q-wert q-minus">' + geld(o.abweichung) + '</span></button>').join('')
        : '<div class="q-leer"><b>Kein Haus unter Vorjahr.</b>Sobald ein Haus zurückfällt, steht es hier.</div>') + '</div>';
    content += '</div>' + filter;

    if (ui.ebene === 'haus') content += tabelle(karten(hs));
    else {
      const ebene = ui.ebene;
      const ids = [...new Set(hs.map((z) => z[ebene]))];
      const abschnitte = ids.sort((a, b) => a.localeCompare(b, 'de')).map((id) => {
        const gruppe = gruppen.find((g) => g.ebene === ebene && g.id === id);
        const treff = hs.filter((z) => z[ebene] === id);
        let innen = '';
        if (ebene === 'region') {
          const unter = [...new Set(treff.map((z) => z.hauscluster))];
          innen = unter.map((hc) => {
            const x = treff.filter((z) => z.hauscluster === hc);
            if (unter.length === 1 && hc === id) return karten(x);
            const g = gruppen.find((gg) => gg.ebene === 'hauscluster' && gg.id === hc);
            return '<details class="o02-unter"><summary>' + esc(clusterName(ctx.s(), hc)) + ' (' + x.length + ' Häuser)</summary>' +
              (g ? zeile(g) : '') + karten(x) + '</details>';
          }).join('');
        } else innen = karten(treff);
        return '<details class="o02-gruppe"><summary>' + esc(ebene === 'hauscluster' ? clusterName(ctx.s(), id) : id) + ' (' + treff.length + ' Häuser)</summary>' +
          (gruppe ? zeile(gruppe) : '') + tabelle(innen) + '</details>';
      }).join('');
      content += abschnitte || leere;
    }
    ctx.panel('Reporting', 'Operatives Wochenreporting · ' + (ui.wochen === 1 ? '1 Woche' : ui.wochen + ' Wochen'), bereich('zentrale') + '<i class="q31-marke" hidden></i>' + content, 'gross');
    ui.aktiv = true;
  }
  ctx.inhalt.addEventListener('change', (e) => {
    if (!ui.aktiv || !e.target?.dataset?.o02Wahl) return;
    const key = e.target.dataset.o02Wahl;
    if (!Object.prototype.hasOwnProperty.call(ui, key)) return;
    ui[key] = key === 'wochen' ? Number(e.target.value) : e.target.value;
    anzeigen();
  });
  ctx.inhalt.addEventListener('click', (e) => {
    if (!ui.aktiv) return;
    const el = e.target.closest('[data-o02-open]');
    if (el) { ui.aktiv = false; ctx.hausOeffnen(el.dataset.o02Open); }
  });
  ctx.inhalt.addEventListener('keydown', (e) => {
    if (!ui.aktiv || (e.key !== 'Enter' && e.key !== ' ')) return;
    const el = e.target.closest('[data-o02-open]');
    if (el) { e.preventDefault(); ui.aktiv = false; ctx.hausOeffnen(el.dataset.o02Open); }
  });
  return { oeffne: anzeigen, zu: () => { ui.aktiv = false; }, aktiv: () => ui.aktiv,
    pruefe: () => { const b = ctx.inhalt.querySelector('.o02-bruecke');
      return !b || Number(b.dataset.o02Diff) === Number(b.dataset.o02Summe); } };
}
