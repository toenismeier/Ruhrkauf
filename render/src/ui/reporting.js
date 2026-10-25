// O02 Umsatztreiber. Darstellung ausschließlich aus Engine-Abfragen.
// E47: Großkennzahl Abweichung zum Vorjahr, Wasserfall als Liste mit schwebenden Balken, Filter als Segmentleisten,
// Regionen und Hauscluster als aufklappbare Listen, Häuser tippbar (öffnet das Haus).
import { geld, fmt, esc, clusterName, deutscheZahlen } from './format.js';
import * as K from './komponenten.js';
import { zentraleReiter, G4 } from './zentrale-abteilungen.js';

const prozent = (x) => (100 * x).toLocaleString('de-DE', { maximumFractionDigits: 1, minimumFractionDigits: 1 }) + ' %';
const zahl = (x, n = 1) => Number(x).toLocaleString('de-DE', { maximumFractionDigits: n, minimumFractionDigits: n });
const euro = (x) => zahl(x, 2) + ' €';
const vp = (q) => (q > 0 ? '+' : q < 0 ? '−' : '') + prozent(Math.abs(q));
const vz = (w) => (w > 0 ? '+' : w < 0 ? '−' : '') + geld(Math.abs(w));
const abweichung = (wert, basis) => basis == null ? 'kein Vorjahr' : (wert >= basis ? '+' : '−') + prozent(basis ? Math.abs(wert / basis - 1) : 0);
const punkt = (wert, basis) => basis == null ? 'kein Vorjahr' : (wert >= basis ? '+' : '−') + zahl(Math.abs(wert - basis) * 100) + ' Punkte';

/** Umsatztreiber eines Hauses (Frequenz × Kaufquote × Bon) mit Brücke zur Vorjahreswoche. */
export function hausTreiberZeile(E, s, id) {
  const d = E.hausTreiber(s, id);
  if (!d) return K.abschnitt('Umsatztreiber') + K.leer('Noch keine abgeschlossene Woche.');
  const a = d.aktuell, v = d.vorjahr;
  const br = E.umsatzbruecke(s, { ebene: 'haus', id, vergleich: 'vorjahr', wochen: 1 });
  return K.abschnitt('Umsatztreiber', 'Frequenz × Kaufquote × Bon')
    + `<div class="o02-haus" data-o02-haus="${esc(id)}" data-o02-umsatz="${a.umsatz}" data-o02-frequenz="${a.frequenz}" data-o02-kaufquote="${a.kaufquote}" data-o02-bon="${a.bon}">`
    + K.gross([{ label: 'Frequenz', wert: fmt.format(Math.round(a.frequenz)), unter: abweichung(a.frequenz, v?.frequenz) },
      { label: 'Kaufquote', wert: prozent(a.kaufquote), unter: punkt(a.kaufquote, v?.kaufquote) }, { label: 'Bon', wert: euro(a.bon), unter: abweichung(a.bon, v?.bon) }])
    + `<p class="hw-lese hw-leise hw-unterzeile">Ø ${zahl(a.teile, 2)} Teile je Bon · ${euro(a.preis)} je Teil</p>`
    + K.abschnitt('Brücke zur Vorjahreswoche') + wasserfall(br) + '</div>';
}

/** Wasserfall Vorjahr → Ist: schwebende Balken auf gemeinsamer Skala (Ausschnitt um die Veränderung), Summe = Abweichung. */
function wasserfall(br) {
  if (br.status !== 'ok') return K.leer(br.status, 'Noch keine Vorjahresbrücke');
  const schritte = [['Frequenz', br.frequenz, 'Besucher'], ['Kaufquote', br.kaufquote, 'Käufer je Besucher'], ['Teile je Bon', br.teile, 'Boneffekt'], ['Preis je Teil', br.preis, 'Boneffekt']];
  let lauf = br.vorher; const pos = schritte.map(([n, v, d]) => { const a = lauf; lauf += v; return { n, v, d, a, b: lauf }; });
  const werte = [br.vorher, br.aktuell, ...pos.flatMap((x) => [x.a, x.b])];
  const spanne = Math.max(1, Math.max(...werte) - Math.min(...werte));
  const lo = Math.min(...werte) - spanne * 0.08, hi = Math.max(...werte) + spanne * 0.08;
  const x = (w) => ((w - lo) / (hi - lo) * 100).toFixed(1);
  const strich = (w) => `<span class="hw-wf-spur" aria-hidden="true"><i class="hw-wf-marke" style="left:${x(w)}%"></i></span>`;
  let h = `<div class="hw-liste hw-wf" data-summenbuch="Konzernbrücke" data-o02-diff="${br.differenz}" data-o02-summe="${br.frequenz + br.kaufquote + br.teile + br.preis}">`;
  h += `<div class="hw-zeile"><span class="hw-was">Vorjahr</span>${strich(br.vorher)}<span class="hw-wert" data-s="e">${geld(br.vorher)}</span></div>`;
  for (const s of pos) h += `<div class="hw-zeile"><span class="hw-was">${s.n}<small>${s.d}</small></span><span class="hw-wf-spur" aria-hidden="true"><i class="hw-wf-balken${s.v < 0 ? ' minus' : ''}" style="left:${x(Math.min(s.a, s.b))}%;width:${Math.max(0.6, Math.abs(s.v) / (hi - lo) * 100).toFixed(1)}%"></i></span><span class="hw-wert${s.v < 0 ? ' schlecht' : ''}" data-s="e">${vz(s.v)}</span></div>`;
  h += `<div class="hw-zeile hw-wf-summe"><span class="hw-was">Ist</span>${strich(br.aktuell)}<span class="hw-wert" data-summe="e">${geld(br.aktuell)}</span></div></div>`;
  h += `<p class="hw-lese hw-leise hw-unterzeile">Boneffekt zusammen ${vz(br.bon)} · Balken im Ausschnitt ${geld(lo)} bis ${geld(hi)}${br.vorjahrGeschaetzt ? ' · Vorjahr teilweise aus 4-Wochen-Blöcken geschätzt' : ''}</p>`;
  return h;
}

const FORMATNAME = (f) => f === 'alle' ? 'Alle Formate' : f === 'warenhaus' ? 'Hartwig' : f === 'sport' ? 'Hartwig Sport' : f === 'fundus' || f === 'outlet' ? 'FUNDUS' : f === 'schwester' || f === 'volkskauf' ? 'Volkskauf' : f;
const SORT = [['umsatz', 'Umsatz'], ['abweichung', 'Abweichung'], ['frequenz', 'Frequenz'], ['kaufquote', 'Kaufquote'], ['bon', 'Bon'], ['name', 'Name']];

export function reportingModul(ctx) {
  const E = ctx.E, ui = { aktiv: false, ebene: 'region', format: 'alle', sort: 'umsatz', wochen: 1, offen: null };
  const sortiere = (werte) => [...werte].sort((a, b) => {
    const av = a[ui.sort], bv = b[ui.sort];
    return (ui.sort === 'name' ? String(av).localeCompare(String(bv), 'de') :
      (Number(bv ?? -1e15) - Number(av ?? -1e15))) || a.name.localeCompare(b.name, 'de');
  });
  /** Zeile je Haus oder Gruppe: Umsatz rechts, Abweichung zum Vorjahr darunter. */
  const zeile = (z, attr, tippbar = true) => K.zeile({ was: esc(z.name), unter: `Frequenz ${fmt.format(Math.round(z.frequenz))} · Kaufquote ${prozent(z.kaufquote)} · Bon ${euro(z.bon)}`,
    wert: geld(z.umsatz), wertUnter: z.abweichung == null ? 'kein Vorjahr' : `${vz(z.abweichung)} (${vp(z.abweichungProzent ?? 0)})`,
    ton: z.ampelfarbe === 'rot' ? 'schlecht' : z.ampelfarbe === 'gelb' ? 'achtung' : '', tippbar, attr });
  const haeuser = (liste) => K.liste(sortiere(liste).map((z) => zeile(z, `data-o02-open="${esc(z.id)}"`)));
  function anzeigen(scrollHalten = false) {
    const vorher = ctx.inhalt.scrollTop;
    const st = ctx.s(), daten = E.reporting(st, ui.wochen, ui.format);
    // Q31: Gruppenzeilen der Hauscluster tragen intern die Cluster-ID als Namen
    for (const g of daten.gruppen) if (g.ebene === 'hauscluster') g.name = clusterName(st, g.id);
    const hs = daten.zeilen, gruppen = daten.gruppen, B = daten.bruecke;
    // Q31: Hauptfrage „Was treibt den Umsatz gegen Vorjahr?“
    const treiber = B.status === 'ok' ? [['Frequenz', B.frequenz], ['Kaufquote', B.kaufquote], ['Teile je Bon', B.teile], ['Preis je Teil', B.preis]].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0] : null;
    let h = K.bereich('zentrale', 'zahlen') + G4 + K.sprecher({ text: treiber ? `Größter Treiber gegen Vorjahr: <b>${treiber[0]}</b> mit ${vz(treiber[1])}.` : '<b>Noch kein Vorjahresvergleich.</b> Die Brücke folgt nach dem ersten Wochenabschluss.', unter: 'Konzerncontrolling' });
    h += K.kopfbild('controlling');
    let r = '';
    if (B.status === 'ok') r += K.gross([{ label: 'Umsatz gegen Vorjahr', wert: vz(B.differenz), ton: B.differenz < 0 ? 'schlecht' : B.differenz > 0 ? 'gut' : '', unter: B.vorher ? vp(B.differenz / B.vorher) + ' zum Vorjahr' : '' },
      { label: 'Ist ' + (ui.wochen === 1 ? 'letzte Woche' : ui.wochen + ' Wochen'), wert: geld(B.aktuell), unter: 'Vorjahr ' + geld(B.vorher) }]);
    r += `<div class="hw-abstand"></div>` + K.seg([[1, '1 Woche'], [4, '4 Wo.'], [13, '13 Wo.'], [52, '52 Wo.']], ui.wochen, (w) => `data-o02-setze="wochen" data-wert="${w}"`);
    r += K.abschnitt('Konzernbrücke zum Vorjahr') + wasserfall(B);
    const beob = daten.beobachtung.filter((o) => hs.some((z) => z.id === o.hausId));
    r += K.abschnitt('Beobachtungsliste', 'größte Rückgänge');
    r += beob.length ? K.liste(beob.map((o) => K.zeile({ was: esc(o.name), unter: esc(deutscheZahlen(o.haupttreiber)), wert: geld(o.abweichung), ton: 'schlecht', tippbar: true, attr: `data-o02-open="${esc(o.hausId)}"` })))
      : K.leer('Sobald ein Haus zurückfällt, steht es hier.', 'Kein Haus unter Vorjahr');
    // Filter und Gliederung
    const formate = ['alle', ...new Set(st.haeuser.map((z) => z.format))];
    r += K.abschnitt('Häuser im Vergleich', hs.length + ' Häuser');
    r += K.seg([['region', 'Region'], ['hauscluster', 'Cluster'], ['haus', 'Haus']], ui.ebene, (w) => `data-o02-setze="ebene" data-wert="${w}"`);
    r += K.liste([K.zeile({ was: 'Format', wert: esc(FORMATNAME(ui.format)), tippbar: true, attr: `data-o02-zyklus="format" data-werte="${esc(formate.join('|'))}"` }),
      K.zeile({ was: 'Sortiert nach', wert: SORT.find((x) => x[0] === ui.sort)[1], tippbar: true, attr: `data-o02-zyklus="sort" data-werte="${SORT.map((x) => x[0]).join('|')}"` })]);
    if (!hs.length) r += K.leer('Keine Häuser im gewählten Filter.');
    else if (ui.ebene === 'haus') r += haeuser(hs);
    else {
      const ebene = ui.ebene;
      const ids = [...new Set(hs.map((z) => z[ebene]))].sort((a, b) => String(a).localeCompare(String(b), 'de'));
      for (const id of ids) {
        const treff = hs.filter((z) => z[ebene] === id), g = gruppen.find((q) => q.ebene === ebene && q.id === id);
        const name = ebene === 'hauscluster' ? clusterName(st, id) : 'Region ' + id, offen = ui.offen === ebene + ':' + id;
        r += K.liste([zeile({ ...(g ?? treff[0]), name: `${name} · ${treff.length} Häuser` }, `data-o02-auf="${esc(ebene + ':' + id)}" aria-expanded="${offen}"`)]);
        if (!offen) continue;
        if (ebene === 'region') {
          const unter = [...new Set(treff.map((z) => z.hauscluster))];
          for (const hc of unter) r += (unter.length > 1 ? `<p class="hw-marke hw-gruppe">${esc(clusterName(st, hc))}</p>` : '') + haeuser(treff.filter((z) => z.hauscluster === hc));
        } else r += haeuser(treff);
      }
    }
    h += K.rumpf(r) + zentraleReiter('reporting');
    ctx.panel('Reporting', 'Operatives Wochenreporting · ' + (ui.wochen === 1 ? '1 Woche' : ui.wochen + ' Wochen'), h, 'gross');
    ui.aktiv = true;
    if (scrollHalten) ctx.inhalt.scrollTop = vorher;
  }
  ctx.inhalt.addEventListener('click', (e) => {
    if (!ui.aktiv) return;
    const s = e.target.closest('[data-o02-setze]');
    if (s) { const k = s.dataset.o02Setze; ui[k] = k === 'wochen' ? Number(s.dataset.wert) : s.dataset.wert; if (k === 'ebene') ui.offen = null; anzeigen(true); return; }
    const z = e.target.closest('[data-o02-zyklus]');
    if (z) { const k = z.dataset.o02Zyklus, w = z.dataset.werte.split('|'); ui[k] = w[(w.indexOf(String(ui[k])) + 1) % w.length]; anzeigen(true); return; }
    const a = e.target.closest('[data-o02-auf]');
    if (a) { ui.offen = ui.offen === a.dataset.o02Auf ? null : a.dataset.o02Auf; anzeigen(true); return; }
    const el = e.target.closest('[data-o02-open]');
    if (el) { ui.aktiv = false; ctx.hausOeffnen(el.dataset.o02Open); }
  });
  return { oeffne: () => anzeigen(), zu: () => { ui.aktiv = false; }, aktiv: () => ui.aktiv,
    pruefe: () => { const b = ctx.inhalt.querySelector('[data-o02-diff]');
      return !b || Number(b.dataset.o02Diff) === Number(b.dataset.o02Summe); } };
}
