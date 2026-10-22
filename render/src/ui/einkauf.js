// Einkauf-Panel (EINKAUF-VERTRAG.md, Abschnitt Prototyp): Übersicht nach Bereich mit Warengruppen, Spaltenwahl, Sortierung
// und Ampeln; WG-Detail mit Kurven über 26 Wochen und allen Reglern; Freigabe-Eingang mit Einzel- und Sammelfreigabe.
// Die Eigenmarken-Seite liegt in eigenmarken.js. Alle Zahlen kommen über quelle.js aus den Engine-Abfragen
// (einkaufUebersicht, wgDetail, freigaben). Jeder angezeigte Wert trägt data-p; pruefe() rechnet ihn aus einer frischen
// Abfrage nach (0 Abweichungen erwartet).
import { geld, fmt, pz, dez, kwVon, esc } from './format.js';
import { eigenmarkenSeite, eigenmarkenAktion, eigenmarkenErwartet, neuerEntwurf } from './eigenmarken.js';
// O05 Ware
import { warenSeite, warenAktion, wareErwartet } from './ware.js';

/** Kurze Spaltenköpfe; Name und Format der Spalten kommen aus EINKAUF_SPALTEN. */
const KOPF = { umsatz: 'Umsatz 13 Wo.', rohertragsquote: 'Rohertrag', lagerumschlag: 'Umschlag', reichweite: 'Reichweite', abverkaufsquote: 'Abverkauf', altwarenanteil: 'Altware', nosVerfuegbarkeit: 'NOS', limitFrei: 'Limit frei', rohertrag: 'Rohertrag €', bestandEk: 'Bestand', abschriften: 'Abschriften', reduzierungsquote: 'Reduzierung', entgangenerUmsatz: 'Fehlmengen', offeneOrders: 'Orders', offeneFreigaben: 'Freigaben', eigenmarkenAnteil: 'Eigenmarke', eigenmarkenMarge: 'EM-Marge' };
export function formatiere(format, x) {
  if (format === 'eur') return geld(x);
  if (format === 'prozent') return pz(x, 1);
  if (format === 'faktor') return dez(x, 1);
  if (format === 'wochen') return `${dez(x, 1)} Wo.`;
  return fmt.format(Math.round(x));
}
const AMPEL_TEXT = { gruen: 'im Ziel', gelb: 'beobachten', rot: 'handeln' };
const ART = { nos: 'NOS', saison: 'Saison' };
const TYP = { nos: 'NOS-Nachschub', vororder: 'Vororder', nachorder: 'Nachorder' };
/** Kennzahlen im WG-Detail über den 8 Standardspalten hinaus. */
const DETAIL_EXTRA = [['umsatzWoche', 'Umsatz letzte Woche', 'eur'], ['bestandEk', 'Bestand EK', 'eur'], ['offeneOrders', 'Offene Orders', 'eur'], ['abschriften', 'Abschriften 13 Wochen', 'eur'], ['reduzierungsquote', 'Reduzierungsquote', 'prozent'], ['entgangenerUmsatz', 'Fehlmengen 13 Wochen', 'eur'], ['eigenmarkenAnteil', 'Eigenmarkenanteil', 'prozent'], ['eigenmarkenMarge', 'Eigenmarkenmarge', 'prozent']];

export function einkaufModul(ctx) {
  const { q } = ctx;
  const ui = {
    aktiv: false, seite: 'uebersicht', format: 'warenhaus', spalten: ['umsatz', 'rohertragsquote'], sort: { key: 'umsatz', dir: -1 },
    offen: new Set(['damen']), wg: null, filter: { bereich: '', art: '', wert: '' }, kuerzen: null, em: { assistent: null, einstellen: null },
  };
  const s = () => ctx.s();
  const SP = () => new Map(q.spalten().map((c) => [c.id, c]));
  const text = (id, k) => formatiere(SP().get(id)?.format ?? 'eur', k[id] ?? 0);

  // ─────────────────────────── Bausteine
  const dot = (a) => (a ? `<span class="ampel a-${a}" title="${AMPEL_TEXT[a]}"></span>` : '<span class="ampel ohne"></span>');
  const seg = (act, wert, optionen, extra = '') => `<div class="seg">${optionen.map(([v, t]) => `<button class="${String(v) === String(wert) ? 'an' : ''}" data-a="${act}" data-v="${v}"${extra}>${t}</button>`).join('')}</div>`;
  const zahl = (titel, inhalt, p, ton = '', a) => `<div class="kz ${ton}"><span>${titel}</span><b><i data-p="${p}">${inhalt}</i>${a ? dot(a) : ''}</b></div>`;
  function tabs() {
    const n = q.freigaben(s()).anzahl;
    const an = (id) => ui.seite === id || (id === 'uebersicht' && ui.seite === 'wg') || (id === 'eigenmarken' && ui.seite === 'gruenden');
    const t = (id, inhalt) => `<button class="tab ${an(id) ? 'an' : ''}" data-a="seite" data-v="${id}">${inhalt}</button>`;
    return `<div class="tabs">${t('uebersicht', 'Übersicht')}${t('freigaben', `Freigaben${n ? ` <span class="zahl" data-p="badge">${n}</span>` : ''}`)}${t('eigenmarken', 'Eigenmarken')}${t('merchandise', 'Merchandise')}${t('allokation', 'Allokation')}${t('reduzierungKalender', 'Reduzierung')}</div>`;
  }

  // ─────────────────────────── Übersicht
  function sortiere(liste) {
    const { key, dir } = ui.sort;
    return [...liste].sort((a, b) => (key === 'name' ? a.name.localeCompare(b.name, 'de') * dir : ((a.kennzahlen[key] ?? 0) - (b.kennzahlen[key] ?? 0)) * dir));
  }
  function uebersicht() {
    // Q31 Warenbuch. Hauptfrage: Wo läuft die Ware aus dem Ruder? Größter Block = Bereichsbuch mit Ampeln und Gesamtzeile.
    const u = q.uebersicht(s(), { format: ui.format }), g = u.summe.kennzahlen, ga = u.summe.ampeln;
    let h = tabs();
    h += '<div class="q31">';
    h += seg('format', ui.format, [['warenhaus', 'Hartwig'], ['sport', 'Hartwig Sport']]);
    const rot = u.bereiche.filter((b) => Object.values(b.ampeln).includes('rot'));
    h += `<div class="q-gross"><span class="q-label">Rohertragsquote 13 Wochen</span><span class="q-haupt" data-p="g:rohertragsquote">${text('rohertragsquote', g)}</span>
      <span class="q-neben"><b class="${g.limitFrei < 0 ? 'q-minus' : ''}" data-p="g:limitFrei">${text('limitFrei', g)}</b>Limit frei</span></div>`;
    h += rot.length
      ? `<div class="q-befund"><b>${rot.length} von ${u.bereiche.length} Bereichen</b> stehen auf Rot: ${rot.slice(0, 3).map((b) => esc(b.name)).join(', ')}${rot.length > 3 ? ' und weitere' : ''}.</div>`
      : `<div class="q-befund">Kein Bereich auf Rot. Umsatz letzte Woche <b data-p="g:umsatzWoche">${geld(g.umsatzWoche)}</b>, Bestand EK <b data-p="g:bestandEk">${geld(g.bestandEk)}</b>.</div>`;
    const spalten = [...q.spalten()].sort((a, b) => b.standard - a.standard);
    h += `<div class="spaltenwahl"><span>Spalten</span>${spalten.map((c) => { const i = ui.spalten.indexOf(c.id); return `<button class="chipk ${i >= 0 ? 'an' : ''}" data-a="spalte" data-v="${c.id}">${i >= 0 ? `<b>${i + 1}</b>` : ''}${c.name}</button>`; }).join('')}</div>`;
    const kopf = (key, t, klasse) => `<button class="${klasse} ${ui.sort.key === key ? 'an' : ''}" data-a="sort" data-v="${key}">${t}${ui.sort.key === key ? (ui.sort.dir < 0 ? ' ▼' : ' ▲') : ''}</button>`;
    h += `<div class="karte liste q-warenbuch"><div class="lkopf">${kopf('name', 'Bereich und WG', 'lname')}${ui.spalten.map((k) => kopf(k, KOPF[k] ?? SP().get(k)?.name, 'lwert')).join('')}</div>`;
    const werte = (k, a, p) => ui.spalten.map((c) => `<span class="lwert"><i data-p="${p}:${c}">${text(c, k)}</i>${dot(a[c])}</span>`).join('');
    for (const b of sortiere(u.bereiche)) {
      const auf = ui.offen.has(b.bereich);
      h += `<div class="lzeile bereich" data-a="bereich" data-v="${b.bereich}"><span class="lname"><span class="pfeil">${auf ? '▾' : '▸'}</span>${esc(b.name)} <i>${b.wgs.length} WG</i></span>${werte(b.kennzahlen, b.ampeln, `b:${b.bereich}`)}</div>`;
      if (auf) for (const w of sortiere(b.wgs)) h += `<div class="lzeile wgz" data-a="wg" data-v="${w.id}"><span class="lname">${w.eigenmarken.length ? '<i class="em" title="mit Eigenmarke">EM</i>' : ''}${esc(w.name)}</span>${werte(w.kennzahlen, w.ampeln, `w:${w.id}`)}</div>`;
    }
    h += `<div class="lzeile q-gesamt"><span class="lname">${ui.format === 'sport' ? 'Hartwig Sport' : 'Hartwig'} gesamt</span>${ui.spalten.map((c) => `<span class="lwert"><i data-p="g:${c}">${text(c, g)}</i>${dot(ga[c])}</span>`).join('')}</div>`;
    h += '</div>';
    const gen = { grob: 'grob (Controlling schwach besetzt)', normal: 'normal', exakt: 'exakt' }[u.genauigkeit] ?? u.genauigkeit;
    h += `<div class="legende">${dot('gruen')} im Ziel ${dot('gelb')} beobachten ${dot('rot')} handeln · EM = mit Eigenmarke<br>${esc(u.saison.name)}, Woche ${u.saison.woche} von ${u.saison.wochen} · Genauigkeit ${gen}</div>`;
    const o = ctx.E.outletUebersicht(s());
    h += `<div class="q-buch"><div class="q-buch-kopf"><span>Altware ins Outlet · FUNDUS</span></div>
      <div class="q-zeile"><span class="q-name">Poolbestand EK<small>Reichweite <i data-p="format:reichweite">${dez(o.reichweite, 1)} Wo.</i></small></span><span class="q-wert" data-p="format:poolWert">${geld(o.poolWert)}</span></div>
      <div class="q-zeile"><span class="q-name">Abschriften</span><span class="q-wert" data-p="format:abschriften">${geld(o.abschriften)}</span></div>
      <div class="q-zeile"><span class="q-name">Markenposten</span><span class="q-wert" data-p="format:markenposten">${geld(o.markenposten)}</span></div>
      <label class="ek-eingabe" style="padding:10px 14px;border-top:1px solid var(--q-linie)"><span>Altwarequote <b>${Math.round(o.altwareQuote * 100)} %</b></span><input type="range" data-a="formatQuote" min="0" max="100" step="5" value="${Math.round(o.altwareQuote * 100)}"></label>
      <div class="q-stepzeile"><span class="q-name">Markenposten-Zukauf<small>je Woche</small></span><div class="stepper"><button data-a="formatBudgetSchritt" data-v="-500000" aria-label="weniger Zukauf">−</button><span><b>${geld(o.zukaufBudget)}</b></span><button data-a="formatBudgetSchritt" data-v="500000" aria-label="mehr Zukauf">+</button></div></div></div>`;
    const kandidaten = ctx.E.outletKandidaten(s()).slice(0, 8);
    if (kandidaten.length) {
      h += '<div class="q-buch"><div class="q-buch-kopf"><span>Neue FUNDUS-Standorte</span><b>12 Wochen Vorlauf</b></div>';
      for (const k of kandidaten) h += `<div class="q-zeile"><span class="q-name">${esc(k.stadt)}<small>${fmt.format(k.qm)} qm · Miete ${geld(k.mieteWoche)} je Woche</small></span><span class="q-wert">${geld(k.investition)}<small>Investition</small></span><span class="q-knoepfe"><button onclick="formateTun('outletEroeffnen','${esc(k.stadt)}')">In ${esc(k.stadt)} eröffnen</button></span></div>`;
      h += '</div>';
    }
    h += '</div>';
    return { titel: 'Einkauf', unter: `${u.bereiche.length} Bereiche · ${u.bereiche.reduce((a, b) => a + b.wgs.length, 0)} Warengruppen · KW ${kwVon(s().woche)}`, html: h };
  }

  // ─────────────────────────── Kurven (eine Reihe je Karte, Finger zeigt Woche und Wert)
  function kurve(titel, wochen, werte, fmtW, p, farbe) {
    const W = 340, H = 64, n = werte.length;
    if (n < 2) return `<div class="karte kurve"><div class="kkopf"><span>${titel}</span><b data-p="${p}">${n ? fmtW(werte[0]) : 'noch keine Daten'}</b></div><div class="kfuss"><span>Verlauf ab der zweiten Woche</span></div></div>`;
    const min = Math.min(...werte), max = Math.max(...werte);
    const lo = min - (max - min) * 0.1, hi = max + (max - min) * 0.1 || max + 1;
    const X = (i) => 4 + (i / (n - 1)) * (W - 8), Y = (v) => H - 4 - ((v - lo) / (hi - lo || 1)) * (H - 10);
    const pts = werte.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
    const daten = esc(JSON.stringify(werte.map((v, i) => [kwVon(wochen[i]), fmtW(v)])));
    return `<div class="karte kurve"><div class="kkopf"><span>${titel}</span><b data-p="${p}">${fmtW(werte[n - 1])}</b><small class="khover"></small></div>
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" data-reihe="${daten}" data-x0="4" data-dx="${(W - 8) / (n - 1)}">
        <line x1="0" x2="${W}" y1="${H - 4}" y2="${H - 4}" stroke="#e7e3dc" stroke-width="1"/>
        <polygon points="4,${H - 4} ${pts} ${X(n - 1).toFixed(1)},${H - 4}" fill="${farbe}" opacity="0.10"/>
        <polyline points="${pts}" fill="none" stroke="${farbe}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
        <circle cx="${X(n - 1).toFixed(1)}" cy="${Y(werte[n - 1]).toFixed(1)}" r="4" fill="${farbe}" stroke="#fff" stroke-width="2" vector-effect="non-scaling-stroke"/>
        <line class="kreuz" x1="0" x2="0" y1="0" y2="${H}" stroke="#7b8790" stroke-width="1" vector-effect="non-scaling-stroke" opacity="0"/>
      </svg><div class="kfuss"><span>KW ${kwVon(wochen[0])}</span><span>min ${fmtW(min)} · max ${fmtW(max)}</span><span>KW ${kwVon(wochen[n - 1])}</span></div></div>`;
  }

  // ─────────────────────────── WG-Detail
  function wgSeite() {
    const d = q.wg(s(), ui.wg);
    if (!d) { ui.seite = 'uebersicht'; return uebersicht(); }
    const k = d.kennzahlen, st = d.steuerung, a = d.ampeln;
    let h = tabs();
    h += `<button class="zurueck" data-a="seite" data-v="uebersicht">‹ Übersicht ${esc(d.bereichName)}</button>`;
    // Q31: Hauptfrage „Passt der Bestand zum Abverkauf?“ – Reichweite groß, alle übrigen Kennzahlen als Buchzeilen.
    const rw = q.spalten().find((c) => c.id === 'reichweite');
    h += '<div class="q31">';
    h += `<div class="q-gross"><span class="q-label">Reichweite</span><span class="q-haupt" data-p="d:reichweite">${text('reichweite', k)}</span><span class="q-neben"><b data-p="d:umsatzWoche">${formatiere('eur', k.umsatzWoche)}</b>Umsatz letzte Woche</span></div>`;
    const buchZeile = (name, wert, p, amp) => `<div class="q-zeile"><span class="q-name">${name}</span><span class="q-wert"><i data-p="${p}">${wert}</i>${amp ? dot(amp) : ''}</span></div>`;
    h += '<div class="q-buch"><div class="q-buch-kopf"><span>Kennzahlen</span><b>Ampel</b></div>';
    h += q.spalten().filter((c) => c.standard && c !== rw).map((c) => buchZeile(c.name, text(c.id, k), `d:${c.id}`, a[c.id])).join('');
    h += DETAIL_EXTRA.filter(([id]) => id !== 'umsatzWoche').map(([id, tt, f]) => buchZeile(tt, id === 'eigenmarkenMarge' && !k.eigenmarkenAnteil ? 'keine' : formatiere(f, k[id]), `d:${id}`, a[id])).join('');
    h += '</div></div>';
    const v = d.verlauf;
    h += kurve('Bestand EK', v.woche, v.bestand, geld, 'k:bestand', '#2f63b5');
    h += kurve('Umsatz je Woche', v.woche, v.umsatz, geld, 'k:umsatz', '#2f8f5b');
    h += kurve('Reichweite in Wochen', v.woche, v.reichweite, (x) => `${dez(x, 1)} Wo.`, 'k:reichweite', '#c27b0e');
    // Regler
    const regler = (titel, inhalt, hilfe = '') => `<div class="regler"><div class="rkopf"><b>${titel}</b>${hilfe ? `<small>${hilfe}</small>` : ''}</div>${inhalt}</div>`;
    const schieber = (feld, wert, min, max, schritt) => `<div class="schieber"><input type="range" min="${min}" max="${max}" step="${schritt}" value="${wert}" data-a="regel" data-f="${feld}"><output>${wert} %</output></div>`;
    h += '<div class="karte steuerung"><div class="khead">Steuerung</div>';
    const genutzt = k.limit > 0 ? Math.min(1, k.limitVerbraucht / k.limit) : 0;
    const naechste = d.limits[1];
    h += regler('Limit je Saison (Open to Buy)', `<div class="stepper"><button data-a="limit" data-v="-0.05">−</button><span><b data-p="d:limitFaktor">${pz(st.limitFaktor)}</b> · <i data-p="d:limit">${geld(k.limit)}</i></span><button data-a="limit" data-v="0.05">+</button></div><div class="balken"><span style="width:${(genutzt * 100).toFixed(1)}%"></span></div><small class="rfuss">${esc(d.limits[0]?.name ?? '')}: verbraucht <i data-p="d:limitVerbraucht">${geld(k.limitVerbraucht)}</i>, frei <i data-p="d:limitFrei2">${geld(k.limitFrei)}</i>${naechste ? `<br>${esc(naechste.name)}: Limit ${geld(naechste.limit)}, verbraucht ${geld(naechste.verbraucht)}` : ''}</small>`, 'Faktor auf den Saisonplan');
    h += regler('NOS-Anteil Ziel', schieber('nosZiel', Math.round(st.nosZiel * 100), 0, 95, 1), `heute ${pz(st.nosAnteil)}, Rest Saisonware`);
    h += regler('NOS-Servicegrad', seg('servicegrad', st.servicegrad, [[0.9, '90 %'], [0.95, '95 %'], [0.98, '98 %']]), 'mehr Sicherheitsbestand');
    h += regler('Vororderquote', schieber('vororderquote', Math.round(st.vororderquote * 100), 20, 100, 5), 'Rest als Nachorder alle 4 Wochen');
    h += regler('Reduzierung', seg('reduzierung', st.reduzierung, [['frueh', 'früh'], ['normal', 'normal'], ['spaet', 'spät']]), 'früh: weniger Altware, mehr Abschrift');
    h += regler('Ohne Freigabe nach Frist', `<div class="zweier"><span>NOS</span>${seg('modus', st.modus.nos, [['auto', 'automatisch'], ['verfall', 'verfällt']], ' data-f="nos"')}</div><div class="zweier"><span>Saison</span>${seg('modus', st.modus.saison, [['auto', 'automatisch'], ['verfall', 'verfällt']], ' data-f="saison"')}</div>`);
    if (d.stammdaten.eigenmarkenfaehig) {
      const alle = q.marken(s()).marken;
      const drin = d.eigenmarken, ids = new Set(drin.map((m) => m.marke));
      const rest = alle.filter((m) => !ids.has(m.id) && m.status !== 'eingestellt');
      let inh = drin.map((m) => `<div class="emzeile"><span class="emfarbe" style="background:${m.farbe}"></span><span class="emname">${esc(m.name)}<i>ist ${pz(m.anteilIst)}</i></span>${schieber('em:' + m.marke, Math.round(m.anteilZiel * 100), 0, 60, 5)}</div>`).join('');
      if (!drin.length) inh += '<div class="leise">Noch keine Eigenmarke in dieser Warengruppe.</div>';
      if (rest.length) inh += `<select class="ort gross" data-a="emNeu"><option value="">Eigenmarke aufnehmen …</option>${rest.map((m) => `<option value="${m.id}">${esc(m.name)}</option>`).join('')}</select>`;
      h += regler('Eigenmarkenanteile', inh, 'Ziel, Anteil am WG-Volumen');
    }
    h += `<div class="regler"><small class="rfuss">Lieferant ${esc(d.lieferant)} · Vorlauf Vororder ${d.stammdaten.vorlaufVor}, Nachorder ${d.stammdaten.vorlaufNach}, NOS ${d.stammdaten.vorlaufNos} Wochen · Mindestabnahme ${geld(d.stammdaten.mindestabnahme)} je Saisonorder</small></div>`;
    h += '</div>';
    if (d.freigaben?.length) h += `<button class="breit" data-a="seite" data-v="freigaben" data-bereich="${d.bereich}">${d.freigaben.length} offene Freigaben dieser Warengruppe</button>`;
    return { titel: d.name, unter: `${d.bereichName} · Warengruppe · KW ${kwVon(s().woche)}`, html: h };
  }

  // ─────────────────────────── Freigaben
  const engineFilter = () => ({ ...(ui.filter.bereich ? { bereich: ui.filter.bereich } : {}), ...(ui.filter.art ? { art: ui.filter.art } : {}), ...(ui.filter.wert === 'klein' ? { bisWert: 100000 } : {}) });
  function gefiltert() {
    const l = q.freigaben(s(), engineFilter()).liste;
    return ui.filter.wert === 'gross' ? l.filter((o) => o.wert > 100000) : l;
  }
  function freigabenSeite() {
    // Q31 Orderbuch. Hauptfrage: Was muss ich diese Woche freigeben? Größter Block = Summe der wartenden Orders,
    // eine Hauptaktion (alle freigeben), darunter das Buch mit Summenstrich.
    const alle = q.freigaben(s()), l = gefiltert();
    const bereiche = [...new Map(alle.liste.map((o) => [o.bereich, o.bereichName])).entries()];
    const summe = l.reduce((a, o) => a + o.wert, 0);
    const dringend = l.filter((o) => o.restWochen <= 0), verfall = dringend.filter((o) => o.modus !== 'auto');
    let h = tabs();
    h += '<div class="q31">';
    h += `<div class="q-gross"><span class="q-label">Wartet auf deine Freigabe</span><span class="q-haupt" data-p="sammel">${geld(summe)}</span>
      <span class="q-neben"><b>${l.length} ${l.length === 1 ? 'Order' : 'Orders'}</b>${dringend.length} fällig</span></div>`;
    if (!alle.anzahl) h += `<div class="q-befund">Keine Order wartet. Orders bis <b>${geld(alle.grenze)}</b> EK gehen ohne dich durch.</div>`;
    else if (verfall.length) h += `<div class="q-befund"><b>${verfall.length} ${verfall.length === 1 ? 'Saisonorder verfällt' : 'Saisonorders verfallen'}</b> diese Woche ohne Freigabe, zusammen ${geld(verfall.reduce((a, o) => a + o.wert, 0))} EK. Die Ware fehlt dann in der Saison.</div>`;
    else if (dringend.length) h += `<div class="q-befund"><b>${dringend.length}</b> ${dringend.length === 1 ? 'Order läuft' : 'Orders laufen'} diese Woche ab und ${dringend.length === 1 ? 'geht' : 'gehen'} danach automatisch durch.</div>`;
    if (l.length) h += `<button class="q-haupt-akt" data-a="sammel">Alle ${l.length} freigeben · <span>${geld(summe)}</span></button>`;
    h += `<div class="q-filter"><select class="ort" data-a="filterBereich" aria-label="Bereich"><option value="">Alle Bereiche (${alle.anzahl})</option>${bereiche.map(([b, n]) => `<option value="${b}"${ui.filter.bereich === b ? ' selected' : ''}>${esc(n)} (${alle.liste.filter((o) => o.bereich === b).length})</option>`).join('')}</select>`;
    h += seg('filterArt', ui.filter.art, [['', 'Alle'], ['nos', 'NOS'], ['saison', 'Saison']]);
    h += seg('filterWert', ui.filter.wert, [['', 'Jeder Wert'], ['klein', 'bis 100 Tsd. €'], ['gross', 'über 100 Tsd. €']]) + '</div>';
    h += `<div class="q-buch"><div class="q-stepzeile" style="border-top:0"><span class="q-name">Freigabegrenze<small>Orders darüber brauchen dich</small></span><div class="stepper"><button data-a="grenze" data-v="-10000" aria-label="Grenze senken">−</button><span><b data-p="grenze">${geld(alle.grenze)}</b></span><button data-a="grenze" data-v="10000" aria-label="Grenze erhöhen">+</button></div></div></div>`;
    h += `<div class="q-buch"><div class="q-buch-kopf"><span>Orderbuch KW ${kwVon(s().woche)}</span><b>Wert EK</b></div>`;
    if (!l.length) h += `<div class="q-leer"><b>${alle.anzahl ? 'Keine Order passt zum Filter.' : 'Das Orderbuch ist leer.'}</b>${alle.anzahl ? `${alle.anzahl} Orders warten in anderen Bereichen oder Wertklassen.` : 'Neue Orders kommen mit der nächsten Orderrunde oder Nachorder.'}</div>`;
    const zeigeN = ui.mehrOrders ? l.length : Math.min(l.length, 25);
    let gruppe = null;
    for (const o of l.slice(0, zeigeN)) {
      const g = o.restWochen <= 0 ? 'Frist diese Woche' : o.restWochen === 1 ? 'Frist nächste Woche' : 'Frist später';
      if (g !== gruppe) { gruppe = g; const n = l.filter((x) => (x.restWochen <= 0 ? 'Frist diese Woche' : x.restWochen === 1 ? 'Frist nächste Woche' : 'Frist später') === g); h += `<div class="q-zwischen"><span>${g}</span><span>${n.length} · ${geld(n.reduce((a, x) => a + x.wert, 0))}</span></div>`; }
      const auf = ui.orderAuf === o.id || ui.kuerzen === o.id;
      h += `<div class="q-zeile q-order${auf ? ' q-auf' : ''}"><button class="q-name q-zeilenknopf" data-a="orderAuf" data-v="${o.id}" aria-expanded="${auf}">${esc(o.wgName)}<small>${esc(o.lieferant)} · ${TYP[o.typ] ?? ART[o.art]}${o.markeName ? ` · ${esc(o.markeName)}` : ''}${o.ueberLimit ? ' · gekürzt' : ''}</small></button>
        <span class="q-wert"><b data-p="f:${o.id}:wert">${geld(o.wert)}</b><small>${o.modus === 'auto' ? 'sonst automatisch' : 'sonst verfällt sie'}</small></span>
        <button class="q-haken" data-a="frei" data-v="${o.id}" aria-label="${esc(o.wgName)} freigeben">Frei</button>`;
      if (auf) {
        h += `<span class="q-details">Abverkauf 8 Wochen <i data-p="f:${o.id}:abverkauf">${geld(o.erwarteterAbverkauf)}</i> · Reichweite danach <i data-p="f:${o.id}:reichweite">${dez(o.reichweiteDanach, 1)} Wo.</i> · erste Lieferung KW ${kwVon(o.ersteLieferung)}${o.lieferungen.length > 1 ? ` in ${o.lieferungen.length} Teilen` : ''}${o.hinweis ? ` · ${esc(o.hinweis)}` : ''}</span>`;
        if (ui.kuerzen === o.id) h += `<span class="q-knoepfe">${[10, 25, 50].map((p) => `<button data-a="kuerzen" data-v="${o.id}" data-p2="${p}">−${p} % und frei</button>`).join('')}<button data-a="kuerzenZu">Zurück</button></span>`;
        else h += `<span class="q-knoepfe"><button data-a="kuerzenAuf" data-v="${o.id}">Kürzen</button><button data-a="ablehnen" data-v="${o.id}">Ablehnen</button></span>`;
      }
      h += '</div>';
    }
    if (zeigeN < l.length) h += `<button class="q-mehr" data-a="mehrOrders">Weitere ${l.length - zeigeN} Orders zeigen</button>`;
    if (l.length) h += `<div class="q-summe"><span>Summe ${l.length} ${l.length === 1 ? 'Order' : 'Orders'}</span><span class="q-wert" data-p="sammel">${geld(summe)}</span></div>`;
    h += '</div>';
    const p = alle.protokoll[alle.protokoll.length - 1];
    if (p) h += `<div class="legende">Letzte Woche: ${p.neu} neue Orders, ${p.direkt} direkt unter der Grenze, ${p.freigegeben} freigegeben, ${p.auto} automatisch, ${p.verfallen} verfallen${p.verfallenWert ? ` (${geld(p.verfallenWert)})` : ''}, ${p.abgelehnt} abgelehnt</div>`;
    h += '</div>';
    return { titel: 'Freigaben', unter: `${alle.anzahl} Orders offen · ${geld(alle.wert)} EK · KW ${kwVon(s().woche)}`, html: h };
  }

  // ─────────────────────────── Steuerung
  function zeigen(scrollHalten = false) {
    const sc = document.getElementById('pinhalt').scrollTop;
    const r = ui.seite === 'wg' ? wgSeite() : ui.seite === 'freigaben' ? freigabenSeite() : ui.seite === 'eigenmarken' || ui.seite === 'gruenden' ? eigenmarkenSeite(ctx, ui, tabs()) : ['merchandise','allokation','reduzierungKalender'].includes(ui.seite) ? warenSeite(ctx, ui, tabs()) : uebersicht();
    ctx.panel(r.titel, r.unter, r.html, 'gross');
    ui.aktiv = true;
    if (scrollHalten) document.getElementById('pinhalt').scrollTop = sc;
    // Aktiven Reiter in der wischbaren Leiste sichtbar halten, ohne den Panelinhalt zu verschieben.
    const leiste = document.querySelector('#pinhalt .tabs'), an = leiste?.querySelector('.tab.an');
    if (leiste && an) leiste.scrollLeft = an.offsetLeft - (leiste.clientWidth - an.offsetWidth) / 2;
    badge();
  }
  function badge() {
    const n = q.freigaben(s()).anzahl, b = document.getElementById('ekbadge');
    if (b) { b.textContent = n; b.style.display = n ? '' : 'none'; }
  }
  function tun(aktion, scroll = true) {
    const r = q.tun(s(), aktion);
    if (r) ctx.meldung(r.text, r.ok);
    ctx.nachAktion?.();
    zeigen(scroll);
    return r;
  }
  function klick(el, ev) {
    const a = el.dataset.a, v = el.dataset.v;
    if (a.startsWith('em')) { const r = eigenmarkenAktion(ctx, ui, el, ev, tun); if (r !== 'nichts') zeigen(r !== 'oben'); return; }
    // O05 Ware
    if (a.startsWith('ware')) { warenAktion(ctx, ui, el, tun); return; }
    switch (a) {
      case 'seite': ui.seite = v; ui.kuerzen = null; if (el.dataset.bereich) ui.filter = { bereich: el.dataset.bereich, art: '', wert: '' }; zeigen(); document.getElementById('pinhalt').scrollTop = 0; return;
      case 'format': ui.format = v; zeigen(true); return;
      case 'spalte': if (!ui.spalten.includes(v)) ui.spalten = [ui.spalten[1], v]; zeigen(true); return;
      case 'sort': ui.sort = ui.sort.key === v ? { key: v, dir: -ui.sort.dir } : { key: v, dir: v === 'name' ? 1 : -1 }; zeigen(true); return;
      case 'bereich': if (ui.offen.has(v)) ui.offen.delete(v); else ui.offen.add(v); zeigen(true); return;
      case 'wg': ui.wg = v; ui.seite = 'wg'; zeigen(); document.getElementById('pinhalt').scrollTop = 0; return;
      case 'limit': { const d = q.wg(s(), ui.wg); tun({ typ: 'wgLimit', wg: ui.wg, faktor: Math.round((d.steuerung.limitFaktor + Number(v)) * 100) / 100 }); return; }
      case 'servicegrad': tun({ typ: 'wgServicegrad', wg: ui.wg, ziel: Number(v) }); return;
      case 'reduzierung': tun({ typ: 'wgReduzierung', wg: ui.wg, strategie: v }); return;
      case 'modus': tun({ typ: 'wgFreigabeModus', wg: ui.wg, art: el.dataset.f, modus: v }); return;
      case 'grenze': tun({ typ: 'freigabeGrenze', euro: Math.max(0, q.freigaben(s()).grenze + Number(v)) }); return;
      case 'filterArt': ui.filter.art = v; zeigen(true); return;
      case 'filterWert': ui.filter.wert = v; zeigen(true); return;
      case 'sammel': tun(ui.filter.wert === 'gross' ? { typ: 'freigeben', ids: gefiltert().map((o) => o.id) } : { typ: 'sammelfreigabe', filter: engineFilter() }, false); return;
      case 'frei': tun({ typ: 'freigeben', ids: [v] }); return;
      case 'ablehnen': tun({ typ: 'freigabeAblehnen', ids: [v] }); return;
      case 'kuerzenAuf': ui.kuerzen = v; zeigen(true); return;
      case 'kuerzenZu': ui.kuerzen = null; zeigen(true); return;
      case 'formatBudgetSchritt': { const o = ctx.E.outletUebersicht(s()); tun({ typ: 'offpriceZukauf', budget: Math.max(0, o.zukaufBudget + Number(v)) }); return; }
      case 'mehrOrders': ui.mehrOrders = true; zeigen(true); return;
      case 'orderAuf': ui.orderAuf = ui.orderAuf === v ? null : v; ui.kuerzen = null; zeigen(true); return;
      case 'kuerzen': ui.kuerzen = null; tun({ typ: 'freigabeKuerzen', id: v, prozent: Number(el.dataset.p2) / 100, freigeben: true }); return;
      default:
    }
  }
  function wechsel(el) {
    const a = el.dataset.a;
    if (a.startsWith('em')) { const r = eigenmarkenAktion(ctx, ui, el, null, tun); if (r !== 'nichts') zeigen(true); return; }
    // O05 Ware
    if (a.startsWith('ware')) { (ui.ware ??= {})[({ wareVon:'von', wareNach:'nach', wareGruppe:'gruppe', wareWert:'wert' })[a]] = a === 'wareWert' ? Number(el.value) : el.value; return; }
    if (a === 'filterBereich') { ui.filter.bereich = el.value; zeigen(true); return; }
    if(a==='formatQuote'){tun({typ:'altwareOutlet',quote:Number(el.value)/100});return;}
    if(a==='formatBudget'){tun({typ:'offpriceZukauf',budget:Math.round(Number(el.value))});return;}
    if (a === 'regel' && el.type === 'range') {
      const f = el.dataset.f, x = Number(el.value) / 100;
      if (f.startsWith('em:')) tun({ typ: 'eigenmarkeAnteil', marke: f.slice(3), wg: ui.wg, anteil: x });
      else if (f === 'nosZiel') tun({ typ: 'wgNosZiel', wg: ui.wg, anteil: x });
      else if (f === 'vororderquote') tun({ typ: 'wgVororderquote', wg: ui.wg, quote: x });
    }
  }
  const inhalt = document.getElementById('pinhalt');
  inhalt.addEventListener('click', (ev) => { if (!ui.aktiv) return; const el = ev.target.closest('[data-a]'); if (!el || el.tagName === 'SELECT' || el.tagName === 'INPUT') return; klick(el, ev); });
  inhalt.addEventListener('change', (ev) => { if (!ui.aktiv) return; const el = ev.target.closest('[data-a]'); if (el) wechsel(el); });
  inhalt.addEventListener('input', (ev) => { if (!ui.aktiv) return; const el = ev.target; if (el.type === 'range') { const o = el.parentElement.querySelector('output'); if (o) o.textContent = `${el.value} %`; } });
  inhalt.addEventListener('pointermove', (ev) => {
    const svg = ev.target.closest?.('svg[data-reihe]');
    if (!svg) return;
    const r = svg.getBoundingClientRect(), reihe = JSON.parse(svg.dataset.reihe), vbW = svg.viewBox.baseVal.width;
    const x = ((ev.clientX - r.left) / r.width) * vbW, i = Math.max(0, Math.min(reihe.length - 1, Math.round((x - Number(svg.dataset.x0)) / Number(svg.dataset.dx))));
    const l = svg.querySelector('.kreuz'), px = Number(svg.dataset.x0) + i * Number(svg.dataset.dx);
    l.setAttribute('x1', px); l.setAttribute('x2', px); l.setAttribute('opacity', 1);
    svg.parentElement.querySelector('.khover').textContent = `KW ${reihe[i][0]}: ${reihe[i][1]}`;
  });

  /** Prüfung: jeden angezeigten Wert (data-p) aus einer frischen Engine-Abfrage nachrechnen. */
  function pruefe() {
    const fehler = [];
    let n = 0;
    const u = q.uebersicht(s(), { format: ui.format });
    const bs = new Map(u.bereiche.map((b) => [b.bereich, b])), ws = new Map(u.bereiche.flatMap((b) => b.wgs.map((w) => [w.id, w])));
    const d = ui.seite === 'wg' ? q.wg(s(), ui.wg) : null;
    const fl = q.freigaben(s()), fg = new Map(fl.liste.map((o) => [o.id, o]));
    const ex = new Map(DETAIL_EXTRA.map(([id, , f]) => [id, f]));
    const soll = (p) => {
      const t = p.split(':');
      if(t[0]==='format'){
        const x=ctx.E.outletUebersicht(s());
        return t[1]==='reichweite'?dez(x.reichweite,1)+' Wo.':geld(x[t[1]]);
      }
      if (t[0] === 'g') return text(t[1], u.summe.kennzahlen);
      if (t[0] === 'b') return text(t[2], bs.get(t[1]).kennzahlen);
      if (t[0] === 'w') return text(t[2], ws.get(t[1]).kennzahlen);
      if (t[0] === 'badge') return String(fl.anzahl);
      if (t[0] === 'grenze') return geld(fl.grenze);
      if (t[0] === 'sammel') return geld(gefiltert().reduce((a, o) => a + o.wert, 0));
      if (t[0] === 'f') { const o = fg.get(t[1]); return t[2] === 'wert' ? geld(o.wert) : t[2] === 'abverkauf' ? geld(o.erwarteterAbverkauf) : `${dez(o.reichweiteDanach, 1)} Wo.`; }
      if (t[0] === 'd') {
        const k = d.kennzahlen;
        if (t[1] === 'limitFaktor') return pz(d.steuerung.limitFaktor);
        if (t[1] === 'limitFrei2') return geld(k.limitFrei);
        if (t[1] === 'limit' || t[1] === 'limitVerbraucht') return geld(k[t[1]]);
        if (t[1] === 'eigenmarkenMarge' && !k.eigenmarkenAnteil) return 'keine';
        return ex.has(t[1]) ? formatiere(ex.get(t[1]), k[t[1]]) : text(t[1], k);
      }
      if (t[0] === 'k') { const r = d.verlauf[t[1]], l = r[r.length - 1]; return r.length === 0 ? 'noch keine Daten' : t[1] === 'reichweite' ? `${dez(l, 1)} Wo.` : geld(l); }
      if (t[0] === 'ware') return wareErwartet(s(), ctx.E, t);
      return eigenmarkenErwartet(ctx, t, ui);
    };
    for (const el of document.querySelectorAll('#pinhalt [data-p]')) {
      n++;
      let e;
      try { e = soll(el.dataset.p); } catch (x) { e = `Fehler ${x.message}`; }
      if (e !== el.textContent) fehler.push(`${el.dataset.p}: ${el.textContent} statt ${e}`);
    }
    return { seite: ui.seite, werte: n, fehler };
  }

  return {
    ui, oeffne: (seite = 'uebersicht', arg) => { ui.seite = seite; if (seite === 'gruenden') ui.em.assistent = { schritt: 0, daten: neuerEntwurf(s()) }; if (seite === 'wg') ui.wg = arg; ui.kuerzen = null; zeigen(); document.getElementById('pinhalt').scrollTop = 0; },
    neuZeichnen: () => zeigen(true), aktiv: () => ui.aktiv, zu: () => { ui.aktiv = false; }, badge, pruefe, tun,
  };
}
