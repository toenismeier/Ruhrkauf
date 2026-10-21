// Marketing-Panel (VORSTAND-MARKETING-VERTRAG.md, Abschnitt 5): Übersicht, Kanäle mit Wochenbudget, Hartwig Karte und App,
// CRM-Kampagnen-Baukasten mit Auswertung, Aktionskalender als Zeitleiste mit Planen, Absagen und Auswertung.
// Daten: marketingUebersicht, kanaele, kundenkarte, crmKampagnen, aktionskalender, aktionsAuswertung; Aktionen über fuehreAus.
// Prüfung wie im Vorstand: data-p-Werte gegen eine frische Darstellung aus den Abfragen.
import { geld, fmt, pz, dez, kwVon, esc } from './format.js';
import { ortDaten, stadtAnsicht, kanaeleAnsicht } from './marketing-q16.js';
import { werteSammler, vergleiche, schalter, segment, regler, stepper, kz, wocheText } from './vorstand.js';

const ALTER = { jung: 'unter 30', mitte: '30 bis 49', aelter: '50 bis 64', senioren: '65 plus' };
const STATUS = { geplant: 'geplant', laufend: 'läuft', beendet: 'beendet', abgesagt: 'abgesagt', aktiv: 'aktiv', gestoppt: 'gestoppt' };
const STATUS_FARBE = { geplant: '#2f63b5', laufend: '#2f8f5b', beendet: '#9aa3ab', abgesagt: '#d6d2ca' };
const MONATE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const ANGEBOT = [['coupon', 'Coupon'], ['punkte', 'Mehrfachpunkte'], ['zugabe', 'Gratiszugabe'], ['info', 'nur Info']];
const FREQUENZ = [['einmalig', 'einmalig'], ['woechentlich', 'wöchentlich'], ['zweiwoechentlich', '14-tägig'], ['monatlich', 'monatlich'], ['quartal', 'Quartal']];
const KANAL = [['mail', 'Mail'], ['push', 'Push'], ['brief', 'Brief']];

/** Kurve über die Wochen (gleiche Form wie im Einkauf). */
function kurve(titel, werte, fmtW, p, P, farbe) {
  const W = 340, H = 56, n = werte.length;
  if (n < 2) return `<div class="karte kurve"><div class="kkopf"><span>${titel}</span>${P(p, n ? fmtW(werte[0]) : 'noch keine Daten')}</div><div class="kfuss"><span>Verlauf ab der zweiten Woche</span></div></div>`;
  let min = Math.min(...werte), max = Math.max(...werte);
  const flach = max - min < 1e-9 * Math.max(1, Math.abs(max));
  const lo = flach ? min - 1 : min - (max - min) * 0.1, hi = flach ? max + 1 : max + (max - min) * 0.1;
  const X = (i) => 4 + (i / (n - 1)) * (W - 8), Y = (v) => H - 4 - ((v - lo) / (hi - lo || 1)) * (H - 10);
  const pts = werte.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
  return `<div class="karte kurve"><div class="kkopf"><span>${titel}</span>${P(p, fmtW(werte[n - 1]))}</div><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><polygon points="4,${H - 4} ${pts} ${X(n - 1).toFixed(1)},${H - 4}" fill="${farbe}" opacity="0.10"/><polyline points="${pts}" fill="none" stroke="${farbe}" stroke-width="2" vector-effect="non-scaling-stroke"/></svg><div class="kfuss"><span>vor ${n} Wochen</span><span>min ${fmtW(min)} · max ${fmtW(max)}</span><span>jetzt</span></div></div>`;
}

export function marketingModul(ctx) {
  const E = ctx.E, s = () => ctx.s();
  const da = typeof E.marketingUebersicht === 'function';
  const ui = {
    aktiv: false, seite: 'uebersicht', jahr: null, aktion: null, planen: null, kanal: null, stadt: null, region: 'alle', kanalScroll: 0,
    crm: { seg: 0, kanal: 'mail', angebot: 'coupon', prozent: 0.15, mindestbon: 40, faktor: 3, wert: 10, frequenz: 'monatlich', wochen: 13, kontrolle: true },
  };
  const tabs = () => `<div class="tabs">${[['uebersicht', 'Übersicht'], ['kanaele', 'Kanäle'], ['stadt', 'Städte'], ['karte', 'Karte'], ['crm', 'CRM'], ['kalender', 'Kalender']].map(([id, t]) => `<button class="tab ${ui.seite === id || (id === 'kalender' && ui.seite === 'aktion') ? 'an' : ''}" data-a="seite" data-v="${id}">${t}</button>`).join('')}</div><button class="breit gruen" data-a="eigenmarkeGruenden">+ Neue Eigenmarke</button>`;

  // ─────────────────────────── Übersicht
  function uebersicht(P) {
    const st = s(), u = E.marketingUebersicht(st);
    let h = tabs();
    h += `<div class="raster">${kz('Werbung je Woche netto', P('u:netto', geld(u.wocheNetto)))}${kz('Werbequote netto', P('u:quote', pz(u.werbequoteNetto, 1)))}${kz('Markenstärke', P('u:marke', `${Math.round(u.markenstaerke)} / 100`))}${kz('Image', P('u:image', `${Math.round(u.image)} / 100`))}${kz('Kundschaft je Woche', P('u:frequenz', fmt.format(Math.round(u.frequenzWoche))))}${kz('Durchschnittsbon', P('u:bon', geld(u.bon)))}${kz('Umsatz mit Karte', P('u:karte', pz(u.kartenanteil, 1)))}${kz('Rabattquote 13 Wochen', P('u:rabatt', pz(u.rabattquote13, 1)), u.rabattquote13 > 0.08 ? 'rot' : '')}</div>`;
    h += `<div class="karte"><div class="khead">Budget je Woche<small>brutto ${geld(u.wocheBrutto)}, Lieferantenbeteiligung ${geld(u.wocheBeteiligung)}</small></div>`;
    const sum = Math.max(1, u.bloecke.kanaele + u.bloecke.karte + u.bloecke.app + u.bloecke.crm);
    for (const [k, t, f] of [['kanaele', 'Kanäle', '#2f63b5'], ['karte', 'Hartwig Karte', '#d23c32'], ['app', 'Hartwig App', '#8c5a7a'], ['crm', 'CRM-Versand', '#2f8f5b']]) h += `<div class="mzeile"><span>${t}</span><span class="mbalken"><span style="width:${((u.bloecke[k] / sum) * 100).toFixed(0)}%;background:${f}"></span></span>${P(`u:block:${k}`, geld(u.bloecke[k]), 'b', ' class="breitwert"')}</div>`;
    h += '<div class="zeile unter"></div></div>';
    const v = u.verlauf.slice(-26);
    h += kurve('Kundschaft je Woche', v.map((x) => x.kunden), (x) => fmt.format(Math.round(x)), 'k:kunden', P, '#2f63b5');
    h += kurve('Markenstärke', v.map((x) => x.marke), (x) => dez(x, 1), 'k:marke', P, '#8c5a7a');
    const zeile = (a) => `<div class="zeile klickbar" data-a="aktion" data-v="${a.id}"><span class="dot" style="background:${STATUS_FARBE[a.status] ?? '#999'}"></span><span class="was">${esc(a.name)} <i>${esc(a.mechanikText)}${a.rabatt ? ` ${pz(a.rabatt)}` : ''}</i></span><span class="qm">KW ${a.startKw} bis ${a.endeKw}</span></div>`;
    if (u.laufend.length) h += `<div class="karte"><div class="khead">Läuft gerade</div>${u.laufend.map(zeile).join('')}</div>`;
    if (u.naechste.length) h += `<div class="karte"><div class="khead">Als Nächstes</div>${u.naechste.map(zeile).join('')}</div>`;
    for (const x of u.hinweise) h += `<div class="olief warnung">${esc(x)}</div>`;
    return { titel: 'Marketing', unter: `Werbequote ${pz(u.werbequoteNetto, 1)} · ${u.kampagnenAktiv} CRM-Kampagnen aktiv · KW ${u.kw} / ${u.jahr}`, html: h };
  }

  // ─────────────────────────── Q16, bestehende Engine-Abfragen und Aktionen
  function kanaele(P) { return kanaeleAnsicht(E, s, ui, P); }
  function staedte(P) { return stadtAnsicht(E, s, ui, P); }

  // ─────────────────────────── Karte und App
  function karte(P) {
    const k = E.kundenkarte(s()), a = k.app;
    let h = tabs();
    h += `<div class="karte emkarte"><div class="mkopf" style="background:#d23c32"><b>${esc(k.name)}</b><small>${esc(k.punkteText)}${k.stufen ? ' · Stufen Silber und Gold' : ''}</small></div>`;
    h += `<div class="owerte"><div><span>Mitglieder</span>${P('ka:mitglieder', fmt.format(k.mitglieder))}</div><div><span>aktiv</span>${P('ka:aktiv', pz(k.aktivQuote))}</div><div><span>Umsatzanteil</span>${P('ka:anteil', pz(k.umsatzAnteil, 1))}</div><div><span>neu je Woche</span>${P('ka:neu', fmt.format(k.neuWoche))}</div><div><span>Abgänge je Woche</span>${P('ka:ab', fmt.format(k.abgaengeWoche))}</div><div><span>Mail-Einwilligung</span>${P('ka:mail', pz(k.mailQuote))}</div></div>`;
    h += `<div class="mzeile"><span>Datenqualität</span><span class="mbalken"><span style="width:${(k.datenqualitaet * 100).toFixed(0)}%;background:#2f63b5"></span></span>${P('ka:daten', String(Math.round(k.datenqualitaet * 100)))}</div><div class="olief">Bessere Daten machen CRM-Kampagnen treffsicherer.</div></div>`;
    h += '<div class="karte steuerung"><div class="khead">Vorteile</div>';
    h += regler('Punkte', segment('punkte', k.punkteSatz, [[0.0025, '1 je 4 €'], [0.005, '1 je 2 €'], [0.01, '1 je 1 €']]), '1 Punkt = 1 Cent');
    h += schalter(k.stufen, 'data-a="stufen"', 'Statusstufen Silber und Gold', 'bindet Top-Kunden, Einführung kostet einmalig');
    h += regler('Kartenrabatt', segment('kartenrabatt', k.kartenrabatt, [[0, 'kein'], [0.02, '2 %'], [0.03, '3 %'], [0.05, '5 %']]), 'dauerhaft auf Kartenkäufe');
    h += regler('Anmeldeprämie für 8 Wochen', segment('praemie', k.anmeldeBis !== undefined && k.anmeldeBis > s().woche ? k.anmeldepraemie : 0, [[0, 'keine'], [5, '5 €'], [10, '10 €'], [20, '20 €']]), k.anmeldeBis !== undefined && k.anmeldeBis > s().woche ? `läuft bis ${wocheText(s(), k.anmeldeBis)}` : 'Willkommensgutschein');
    h += regler('Datenpflege je Woche', stepper('daten', P('ka:datenBudget', geld(k.datenBudgetWoche))), 'Adressen, Dubletten, Einwilligungen');
    h += `<div class="regler"><small class="rfuss">Kosten je Woche: Punkte ${P('ka:k:punkte', geld(k.kostenWoche.punkte), 'i')}, Stufen ${geld(k.kostenWoche.stufen)}, Betrieb ${geld(k.kostenWoche.betrieb)}, Daten ${geld(k.kostenWoche.daten)}, Anmeldung ${geld(k.kostenWoche.anmeldung)}, zusammen ${P('ka:k:summe', geld(k.kostenWoche.summe), 'i')}</small></div></div>`;
    h += `<div class="karte emkarte"><div class="mkopf" style="background:#8c5a7a"><b>${esc(a.name)}</b><small>${a.relaunchBis !== undefined && a.relaunchBis > s().woche ? `Relaunch bis ${wocheText(s(), a.relaunchBis)}` : 'Coupons, Punkte, Push'}</small></div>`;
    h += `<div class="owerte"><div><span>Downloads</span>${P('ap:downloads', fmt.format(a.downloads))}</div><div><span>aktive Nutzer</span>${P('ap:aktiv', fmt.format(a.aktiveNutzer))}</div><div><span>Push erlaubt</span>${P('ap:push', pz(a.pushQuote))}</div></div>`;
    h += `<div class="mzeile"><span>App-Qualität</span><span class="mbalken"><span style="width:${(a.qualitaet * 100).toFixed(0)}%;background:${a.qualitaet < 0.3 ? '#d23c32' : '#2f8f5b'}"></span></span>${P('ap:qualitaet', String(Math.round(a.qualitaet * 100)))}</div>`;
    h += regler('App-Budget je Woche', stepper('appBudget', P('ap:budget', geld(a.budgetWoche))), 'Pflege und Werbung für Downloads');
    h += schalter(a.appCoupons, 'data-a="appCoupons"', 'Aktions-Coupons in der App', 'holt Nutzer in die App');
    h += `<div class="oknoepfe"><button data-a="relaunch"${a.relaunchBis !== undefined && a.relaunchBis > s().woche ? ' disabled' : ''}>App-Relaunch beauftragen</button></div></div>`;
    return { titel: 'Hartwig Karte und App', unter: `${fmt.format(k.mitglieder)} Mitglieder · ${pz(k.umsatzAnteil, 1)} vom Umsatz`, html: h };
  }

  // ─────────────────────────── CRM
  function crm(P) {
    const c = E.crmKampagnen(s()), B = ui.crm;
    let h = tabs();
    h += `<div class="raster">${kz('Erreichbar per Mail', P('c:mail', fmt.format(c.pools.mail)))}${kz('Erreichbar per Push', P('c:push', fmt.format(c.pools.push)))}${kz('Erreichbar per Brief', P('c:brief', fmt.format(c.pools.brief)))}${kz('Ermüdung Mail', P('c:ermuedung', pz(c.ermuedung.mail ?? 0)), (c.ermuedung.mail ?? 0) > 0.5 ? 'rot' : '')}</div>`;
    h += '<div class="karte steuerung"><div class="khead">Neue Kampagne</div>';
    h += regler('Segment', `<select class="ort gross" data-a="crmSeg">${c.segmente.map((x, i) => `<option value="${i}"${i === B.seg ? ' selected' : ''}>${esc(x.text)} (${fmt.format(x.groesse)})</option>`).join('')}</select>`);
    h += regler('Kanal', segment('crmKanal', B.kanal, KANAL));
    h += regler('Angebot', segment('crmAngebot', B.angebot, ANGEBOT));
    if (B.angebot === 'coupon') h += `<div class="regler">${segment('crmProzent', B.prozent, [[0.1, '10 %'], [0.15, '15 %'], [0.2, '20 %'], [0.25, '25 %']])}<div style="height:6px"></div>${segment('crmMindestbon', B.mindestbon, [[0, 'ohne Mindestbon'], [40, 'ab 40 €'], [80, 'ab 80 €']])}</div>`;
    if (B.angebot === 'punkte') h += `<div class="regler">${segment('crmFaktor', B.faktor, [[2, '2-fach'], [3, '3-fach'], [5, '5-fach'], [10, '10-fach']])}</div>`;
    if (B.angebot === 'zugabe') h += `<div class="regler">${segment('crmWert', B.wert, [[5, '5 €'], [10, '10 €'], [20, '20 €']])}</div>`;
    h += regler('Frequenz', segment('crmFrequenz', B.frequenz, FREQUENZ));
    if (B.frequenz !== 'einmalig') h += regler('Laufzeit', segment('crmWochen', B.wochen, [[4, '4 Wo.'], [8, '8 Wo.'], [13, '13 Wo.'], [26, '26 Wo.']]));
    h += schalter(B.kontrolle, 'data-a="crmKontrolle"', 'Kontrollgruppe (10 % ohne Versand)', 'macht die Auswertung genauer');
    h += '<div class="oknoepfe"><button class="gruen" data-a="crmStart">Kampagne starten</button></div></div>';
    const liste = [...c.kampagnen].sort((a, b) => (a.status === 'aktiv' ? -1 : 0) - (b.status === 'aktiv' ? -1 : 0) || b.start - a.start);
    for (const k of liste) {
      h += `<div class="karte order"><div class="ohead"><b>${esc(k.name)}</b><i>${esc(k.segmentText)} · ${k.kanalText} · ${esc(k.angebotText)} · ${esc(k.frequenzText)}</i></div>`;
      h += `<div class="ochips"><span class="chip ${k.status === 'aktiv' ? '' : 'grau'}">${STATUS[k.status] ?? k.status}</span>${k.standard ? '<span class="chip grau">Grundprogramm</span>' : ''}${k.kontrollgruppe ? '<span class="chip blau">mit Kontrollgruppe</span>' : ''}${k.naechsterVersand !== undefined ? `<span class="chip grau">nächster Versand KW ${kwVon(k.naechsterVersand)}</span>` : ''}</div>`;
      const z = k.summe;
      h += `<div class="owerte"><div><span>Versendet</span>${P(`c:${k.id}:versendet`, fmt.format(z.versendet))}</div><div><span>Öffnung</span>${P(`c:${k.id}:oeffnung`, pz(z.oeffnungsrate, 1))}</div><div><span>Einlösung</span>${P(`c:${k.id}:einloesung`, pz(z.einloesequote, 1))}</div></div>`;
      if (k.auswertung) h += `<div class="owerte"><div><span>Mehrumsatz</span>${P(`c:${k.id}:mehr`, `${geld(k.auswertung.mehrumsatzVon)} bis ${geld(k.auswertung.mehrumsatzBis)}`)}</div><div><span>Ergebnis</span>${P(`c:${k.id}:ergebnis`, geld(k.auswertung.ergebnis), 'b', k.auswertung.ergebnis < 0 ? ' class="rotwert"' : '')}</div><div><span>Abmeldungen</span>${P(`c:${k.id}:ab`, fmt.format(z.abmeldungen))}</div></div><div class="olief">${esc(k.auswertung.hinweis)}</div>`;
      if (k.status === 'aktiv' || k.status === 'geplant') h += `<div class="oknoepfe"><button class="rot" data-a="crmStopp" data-v="${k.id}">Stoppen</button></div>`;
      h += '</div>';
    }
    return { titel: 'CRM-Kampagnen', unter: `${c.kampagnen.filter((k) => k.status === 'aktiv').length} aktiv · Datenqualität ${Math.round(c.datenqualitaet * 100)}`, html: h };
  }

  // ─────────────────────────── Kalender
  function zeitleiste(K, P) {
    const W = 340, L = 6, B = (W - L * 2) / 52, zeilen = [];
    const balken = [];
    for (const a of K.eintraege) {
      const von = Math.max(0, a.start - (K.jahr - s().startJahr) * 52), bis = Math.min(52, a.ende - (K.jahr - s().startJahr) * 52);
      let z = zeilen.findIndex((e) => e <= von);
      if (z < 0) { z = zeilen.length; zeilen.push(0); }
      zeilen[z] = bis + 0.4;
      balken.push({ a, von, bis, z });
    }
    const RH = 20, H = 22 + Math.max(1, zeilen.length) * RH + 4;
    let g = `<svg class="zeitleiste" viewBox="0 0 ${W} ${H}" width="100%">`;
    for (let m = 0; m < 12; m++) { const x = L + (m * 52 / 12) * B; g += `<line x1="${x}" x2="${x}" y1="14" y2="${H}" stroke="#ece8e1"/><text x="${x + 2}" y="10" font-size="8.5" fill="#7b8790">${MONATE[m]}</text>`; }
    for (const { a, von, bis, z } of balken) {
      const x = L + von * B, w = Math.max(3, (bis - von) * B - 1), y = 18 + z * RH;
      g += `<g data-a="aktion" data-v="${a.id}" class="klickbar"><rect x="${x}" y="${y}" width="${w}" height="${RH - 4}" rx="4" fill="${STATUS_FARBE[a.status]}"${a.status === 'abgesagt' ? ' stroke="#b9b2a6" stroke-dasharray="2 2"' : ''}/>${w > 34 ? `<text x="${x + 4}" y="${y + 11.5}" font-size="8.5" font-weight="700" fill="#fff">${esc(a.name.length > Math.floor(w / 4.6) ? a.name.slice(0, Math.max(3, Math.floor(w / 4.6) - 1)) + '.' : a.name)}</text>` : ''}</g>`;
    }
    const jetzt = s().woche - (K.jahr - s().startJahr) * 52;
    if (jetzt >= 0 && jetzt < 52) { const x = L + (jetzt + 0.5) * B; g += `<line x1="${x}" x2="${x}" y1="12" y2="${H}" stroke="#d23c32" stroke-width="1.5"/><text x="${Math.min(W - 30, x + 3)}" y="${H - 3}" font-size="8" fill="#d23c32" font-weight="700">KW ${K.kw}</text>`; }
    return g + '</svg>';
  }
  function kalender(P) {
    const st = s(), jahr0 = st.startJahr + Math.floor(st.woche / 52);
    ui.jahr ??= jahr0;
    const K = E.aktionskalender(st, ui.jahr);
    let h = tabs();
    h += segment('jahr', ui.jahr, [[jahr0, String(jahr0)], [jahr0 + 1, String(jahr0 + 1)]]);
    h += `<div class="karte schnittk">${zeitleiste(K, P)}<div class="legende"><span class="ampel" style="background:#2f63b5"></span> geplant <span class="ampel" style="background:#2f8f5b"></span> läuft <span class="ampel" style="background:#9aa3ab"></span> beendet · Balken antippen</div></div>`;
    h += '<button class="breit gruen" data-a="planen">+ Aktion planen</button>';
    if (ui.planen) h += planenKarte(K);
    h += '<div class="karte">';
    for (const a of K.eintraege) h += `<div class="zeile klickbar" data-a="aktion" data-v="${a.id}"><span class="dot" style="background:${STATUS_FARBE[a.status]}"></span><span class="was">${esc(a.name)} <i>${esc(a.mechanikText)}${a.rabatt ? ` ${pz(a.rabatt)}` : ''} · ${esc(a.scopeText)}</i></span><span class="qm">KW ${a.startKw}${a.wochen > 1 ? ` bis ${a.endeKw}` : ''}</span><span class="uq">${P(`kal:${a.id}:status`, STATUS[a.status], 'span')}</span></div>`;
    if (!K.eintraege.length) h += '<div class="zeile grau">Keine Aktion in diesem Jahr.</div>';
    h += '</div>';
    for (const r of K.raeumungen) h += `<div class="olief">${esc(r.name)}: ${esc(r.text)}</div>`;
    return { titel: 'Aktionskalender', unter: `${K.jahr} · ${K.eintraege.filter((a) => a.status !== 'abgesagt').length} Aktionen · KW ${K.kw}`, html: h };
  }
  function planenKarte(K) {
    const p = ui.planen, an = K.anlaesse.find((x) => x.id === p.anlass);
    let h = '<div class="karte steuerung"><div class="khead">Neue Aktion</div>';
    h += regler('Anlass', `<select class="ort gross" data-a="planAnlass">${K.anlaesse.filter((x) => x.id !== 'raeumung').map((x) => `<option value="${x.id}"${x.id === p.anlass ? ' selected' : ''}>${esc(x.name)} (KW ${x.kw})</option>`).join('')}</select>`);
    h += regler('Mechanik', `<select class="ort gross" data-a="planMechanik">${K.mechaniken.map((m) => `<option value="${m.id}"${m.id === p.mechanik ? ' selected' : ''}>${esc(m.text)}</option>`).join('')}</select>`, an?.bereiche ? `Bereiche: ${an.bereiche.length}` : '');
    if (!['punkte', 'staffel'].includes(p.mechanik)) h += regler('Rabatt', segment('planRabatt', p.rabatt, [[0.1, '10 %'], [0.15, '15 %'], [0.2, '20 %'], [0.3, '30 %'], [0.4, '40 %']]));
    if (p.mechanik === 'punkte') h += regler('Punkte', segment('planPunkte', p.punkteFaktor, [[3, '3-fach'], [5, '5-fach'], [10, '10-fach']]));
    h += regler('Start', stepper('planKw', `<b>KW ${p.kw} / ${p.jahr}</b>`), 'Kalenderwoche');
    h += regler('Dauer', segment('planWochen', p.wochen, [[1, '1 Woche'], [2, '2 Wochen'], [3, '3 Wochen'], [4, '4 Wochen']]));
    h += regler('Sonderwerbung', segment('planWerbung', p.sonderwerbung, [[0, 'keine'], [250000, '250 Tsd. €'], [750000, '750 Tsd. €'], [1500000, '1,5 Mio. €']]), 'Beilage, Spots');
    h += schalter(p.kontrolle, 'data-a="planKontrolle"', '5 Kontrollhäuser ohne Aktion', 'genauere Auswertung, etwas weniger Umsatz');
    h += '<div class="oknoepfe"><button class="gruen" data-a="planFertig">Aktion einplanen</button><button class="leise" data-a="planZu">Abbrechen</button></div></div>';
    return h;
  }
  function aktion(P) {
    const st = s(), a = E.aktionsAuswertung(st, ui.aktion);
    if (!a) { ui.seite = 'kalender'; return kalender(P); }
    let h = tabs() + '<button class="zurueck" data-a="seite" data-v="kalender">‹ Kalender</button>';
    h += `<div class="karte order"><div class="ohead"><b>${esc(a.name)}</b><i>${esc(a.mechanikText)}${a.rabatt ? ` ${pz(a.rabatt)}` : ''}${a.bereicheText?.length ? ` auf ${a.bereicheText.map(esc).join(', ')}` : ''}</i></div>`;
    h += `<div class="ochips"><span class="chip ${a.status === 'laufend' ? '' : 'grau'}">${STATUS[a.status]}</span><span class="chip grau">KW ${a.startKw}${a.wochen > 1 ? ` bis ${a.endeKw}` : ''} / ${a.jahr}</span><span class="chip grau">${esc(a.scopeText)}</span>${a.sonderwerbung ? `<span class="chip blau">Sonderwerbung ${geld(a.sonderwerbung)}</span>` : ''}</div>`;
    if (!a.gemessen) h += `<div class="olief">${esc(a.text)}</div>`;
    else {
      h += `<div class="owerte"><div><span>Mehrumsatz</span>${P('a:mehr', `${geld(a.mehrumsatzVon)} bis ${geld(a.mehrumsatzBis)}`)}</div><div><span>Rohertragseffekt</span>${P('a:roh', `${geld(a.rohertragseffektVon)} bis ${geld(a.rohertragseffektBis)}`)}</div><div><span>Ergebnis</span>${P('a:ergebnis', geld(a.ergebnis), 'b', a.ergebnis < 0 ? ' class="rotwert"' : '')}</div></div>`;
      h += `<div class="owerte"><div><span>Rabattkosten</span>${P('a:rabatt', geld(a.rabattkosten))}</div><div><span>Mitnahme</span>${P('a:mitnahme', geld(a.mitnahme))}</div><div><span>Vorzieheffekt</span>${P('a:vorzieh', geld(a.vorzieheffekt))}</div><div><span>Kannibalisierung</span>${P('a:kanni', geld(a.kannibalisierung))}</div><div><span>Altwarenabbau</span>${P('a:altware', geld(a.altwarenabbau))}</div><div><span>Image</span>${P('a:image', `${a.image >= 0 ? '+' : ''}${dez(a.image, 1)}`)}</div></div>`;
      h += `<div class="olief">Genauigkeit ${esc(a.genauigkeit)}${a.kontrollHaeuser ? ` · ${a.kontrollHaeuser} Kontrollhäuser` : ''}${a.hinweis ? ` · ${esc(a.hinweis)}` : ''}${a.marketingBericht ? ` · Marketing meldete ${geld(a.marketingBericht)}` : ''}</div>`;
    }
    if (a.status === 'geplant') h += `<div class="oknoepfe"><button data-a="aktionLaenger" data-v="${a.id}">Eine Woche länger</button><button class="rot" data-a="aktionAbsagen" data-v="${a.id}">Absagen</button></div>`;
    h += '</div>';
    return { titel: a.name, unter: `Aktion · ${STATUS[a.status]} · KW ${a.startKw} / ${a.jahr}`, html: h };
  }

  function rendern() {
    const S = werteSammler();
    if (!da) return { S, r: { titel: 'Marketing', unter: '', html: '<div class="leise">Die Engine liefert noch kein Marketing.</div>' } };
    const f = { kanaele, stadt: staedte, karte, crm, kalender, aktion }[ui.seite] ?? uebersicht;
    return { S, r: f(S.P) };
  }
  function zeigen(scrollHalten = false) {
    const sc = document.getElementById('pinhalt').scrollTop;
    const altKar = document.querySelector('#pinhalt .mk-kanalreihe');
    if (altKar) ui.kanalScroll = altKar.scrollLeft;
    const { r } = rendern();
    ctx.panel(r.titel, r.unter, r.html, 'gross');
    ui.aktiv = true;
    document.getElementById('pinhalt').scrollTop = scrollHalten ? sc : 0;
    const neuKar = document.querySelector('#pinhalt .mk-kanalreihe');
    if (neuKar) neuKar.scrollLeft = ui.kanalScroll;
  }
  function tun(aktion, halten = true) {
    const r = E.fuehreAus(s(), aktion);
    if (r) ctx.meldung(r.text, r.ok);
    ctx.nachAktion?.();
    zeigen(halten);
    return r;
  }
  /** Fünf offene Häuser als Kontrollgruppe, über die Liste verteilt. */
  const kontrollHaeuser = () => { const l = s().haeuser.filter((h) => h.status === 'offen' && h.format === 'warenhaus'); const n = 5, out = []; for (let i = 0; i < n && l.length; i++) out.push(l[Math.floor(((i + 0.5) * l.length) / n)].id); return [...new Set(out)]; };
  function klick(el) {
    const a = el.dataset.a, v = el.dataset.v, st = s(), B = ui.crm;
    switch (a) {
      case 'eigenmarkeGruenden': return ctx.neueEigenmarke?.();
      case 'seite': ui.seite = v; ui.planen = null; ui.kanalScroll = 0; return zeigen();
      case 'stadtShift': { const d = ortDaten(E, s, ui); if (!d.auswahl.length) return; ui.stadt = d.auswahl[(d.index + Number(v) + d.auswahl.length) % d.auswahl.length].stadt; return zeigen(true); }
      case 'stadtSymbol': ui.stadt = v; return zeigen(true);
      case 'teamAendern': return tun({ typ: 'kanalTeam', kanal: el.dataset.k, delta: Number(v) > 0 ? 1 : -1 });
      case 'aktion': ui.seite = 'aktion'; ui.aktion = v; return zeigen();
      case 'kanalAuf': ui.kanal = ui.kanal === v ? null : v; return zeigen(true);
      case 'kanalBudget': return tun({ typ: 'kanalBudget', kanal: el.dataset.k, faktor: Number(v) > 0 ? 1.1 : 1 / 1.1 });
      case 'kanalAlle': return tun({ typ: 'kanalBudget', kanal: 'alle', faktor: Number(v) });
      case 'punkte': return tun({ typ: 'kundenkarteSetzen', punkteSatz: Number(v) });
      case 'stufen': return tun({ typ: 'kundenkarteSetzen', stufen: !E.kundenkarte(st).stufen });
      case 'kartenrabatt': return tun({ typ: 'kundenkarteSetzen', kartenrabatt: Number(v) });
      case 'praemie': return tun({ typ: 'kundenkarteSetzen', anmeldepraemie: Number(v), anmeldeWochen: Number(v) ? 8 : 0 });
      case 'daten': { const k = E.kundenkarte(st); return tun({ typ: 'kundenkarteSetzen', datenBudgetWoche: Math.max(0, k.datenBudgetWoche + Number(v) * 10000) }); }
      case 'appBudget': { const k = E.kundenkarte(st); return tun({ typ: 'appSetzen', budgetWoche: Math.max(0, k.app.budgetWoche + Number(v) * 10000) }); }
      case 'appCoupons': return tun({ typ: 'appSetzen', appCoupons: !E.kundenkarte(st).app.appCoupons });
      case 'relaunch': return tun({ typ: 'appSetzen', relaunch: true });
      case 'crmKanal': B.kanal = v; return zeigen(true);
      case 'crmAngebot': B.angebot = v; return zeigen(true);
      case 'crmProzent': B.prozent = Number(v); return zeigen(true);
      case 'crmMindestbon': B.mindestbon = Number(v); return zeigen(true);
      case 'crmFaktor': B.faktor = Number(v); return zeigen(true);
      case 'crmWert': B.wert = Number(v); return zeigen(true);
      case 'crmFrequenz': B.frequenz = v; return zeigen(true);
      case 'crmWochen': B.wochen = Number(v); return zeigen(true);
      case 'crmKontrolle': B.kontrolle = !B.kontrolle; return zeigen(true);
      case 'crmStart': {
        const seg = E.crmKampagnen(st).segmente[B.seg]?.segment ?? { typ: 'alle' };
        const angebot = B.angebot === 'coupon' ? { typ: 'coupon', prozent: B.prozent, mindestbon: B.mindestbon } : B.angebot === 'punkte' ? { typ: 'punkte', faktor: B.faktor } : B.angebot === 'zugabe' ? { typ: 'zugabe', wert: B.wert } : { typ: 'info' };
        return tun({ typ: 'crmKampagneAnlegen', segment: seg, kanal: B.kanal, angebot, frequenz: B.frequenz, ...(B.frequenz === 'einmalig' ? {} : { wochen: B.wochen }), kontrollgruppe: B.kontrolle });
      }
      case 'crmStopp': return tun({ typ: 'crmKampagneStoppen', id: v });
      case 'jahr': ui.jahr = Number(v); return zeigen(true);
      case 'planen': {
        const jahr = ui.jahr ?? st.startJahr + Math.floor(st.woche / 52), an = E.aktionskalender(st, jahr).anlaesse.find((x) => x.id === 'sonder');
        const kwJetzt = jahr === st.startJahr + Math.floor(st.woche / 52) ? kwVon(st.woche) + 2 : 1;
        ui.planen = ui.planen ? null : { anlass: 'sonder', mechanik: an.mechanik, rabatt: an.rabatt || 0.2, punkteFaktor: 5, kw: Math.min(52, kwJetzt), jahr, wochen: 1, sonderwerbung: 0, kontrolle: true };
        return zeigen(true);
      }
      case 'planZu': ui.planen = null; return zeigen(true);
      case 'planRabatt': ui.planen.rabatt = Number(v); return zeigen(true);
      case 'planPunkte': ui.planen.punkteFaktor = Number(v); return zeigen(true);
      case 'planWochen': ui.planen.wochen = Number(v); return zeigen(true);
      case 'planWerbung': ui.planen.sonderwerbung = Number(v); return zeigen(true);
      case 'planKontrolle': ui.planen.kontrolle = !ui.planen.kontrolle; return zeigen(true);
      case 'planKw': { const p = ui.planen; let kw = p.kw + Number(v), j = p.jahr; if (kw > 52) { kw = 1; j++; } if (kw < 1) { kw = 52; j--; } p.kw = kw; p.jahr = j; return zeigen(true); }
      case 'planFertig': {
        const p = ui.planen, an = E.aktionskalender(st, p.jahr).anlaesse.find((x) => x.id === p.anlass);
        const r = tun({ typ: 'aktionPlanen', anlass: p.anlass, name: an?.name, mechanik: p.mechanik, ...(p.mechanik === 'punkte' ? { punkteFaktor: p.punkteFaktor } : { rabatt: p.rabatt }), ...(an?.bereiche ? { bereiche: an.bereiche } : {}), kw: p.kw, jahr: p.jahr, wochen: p.wochen, sonderwerbung: p.sonderwerbung, ...(p.kontrolle ? { kontrollHaeuser: kontrollHaeuser() } : {}) });
        if (r?.ok) { ui.jahr = p.jahr; ui.planen = null; zeigen(true); }
        return r;
      }
      case 'aktionAbsagen': return tun({ typ: 'aktionAbsagen', id: v });
      case 'aktionLaenger': { const x = E.aktionsAuswertung(st, v); return tun({ typ: 'aktionAendern', id: v, wochen: x.wochen + 1 }); }
      default:
    }
  }
  function wechsel(el) {
    const a = el.dataset.a;
    if (a === 'stadtRegionChoose') { ui.region = el.value; ui.stadt = null; ui.kanalScroll = 0; return zeigen(true); }
    if (a === 'stadtChoose') { ui.stadt = el.value; return zeigen(true); }
    if (a === 'kanalBudgetSlider') {
      const v = Number(el.value);
      if (Number.isFinite(v)) return tun({ typ: 'kanalBudget', kanal: el.dataset.k, euroWoche: v });
      return;
    }
    if (a === 'kanalRegionSlider') {
      const v = Number(el.value);
      if (Number.isFinite(v)) return tun({ typ: 'kanalBudget', kanal: el.dataset.k, regionen: { [el.dataset.region]: v } });
      return;
    }
    if (a === 'crmSeg') { ui.crm.seg = Number(el.value); zeigen(true); }
    if (a === 'planAnlass') {
      const K = E.aktionskalender(s(), ui.planen.jahr), an = K.anlaesse.find((x) => x.id === el.value);
      Object.assign(ui.planen, { anlass: el.value, mechanik: an.mechanik, rabatt: an.rabatt || ui.planen.rabatt, kw: an.kw, wochen: Math.min(4, an.wochen) });
      zeigen(true);
    }
    if (a === 'planMechanik') { ui.planen.mechanik = el.value; zeigen(true); }
  }
  const inhalt = document.getElementById('pinhalt');
  // Stadtwechsel per horizontaler Wischgeste auf dem Marktanteilsring.
  let ringStart = null;
  inhalt.addEventListener('pointerdown', (ev) => {
    ringStart = ui.aktiv && ui.seite === 'stadt' && ev.target.closest('.mk-ringwrap') ? { x: ev.clientX, y: ev.clientY } : null;
  }, { passive: true });
  inhalt.addEventListener('pointerup', (ev) => {
    if (!ringStart) return;
    const dx = ev.clientX - ringStart.x, dy = ev.clientY - ringStart.y;
    ringStart = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      const d = ortDaten(E, s, ui);
      if (d.auswahl.length > 1) { ui.stadt = d.auswahl[(d.index + (dx < 0 ? 1 : -1) + d.auswahl.length) % d.auswahl.length].stadt; zeigen(true); }
    }
  }, { passive: true });
  inhalt.addEventListener('click', (ev) => { if (!ui.aktiv) return; const el = ev.target.closest('[data-a]'); if (!el || el.disabled || el.tagName === 'SELECT') return; klick(el); });
  inhalt.addEventListener('input', (ev) => {
    if (!ui.aktiv) return;
    const el = ev.target.closest('input[data-a="kanalBudgetSlider"], input[data-a="kanalRegionSlider"]');
    if (!el) return;
    const out = el.closest('.mk-budgetbox')?.querySelector('output');
    if (out) out.textContent = el.dataset.a === 'kanalBudgetSlider' ? geld(Number(el.value)) : Number(el.value).toFixed(1).replace('.', ',') + ' ×';
  });
  inhalt.addEventListener('change', (ev) => { if (!ui.aktiv) return; const el = ev.target.closest('[data-a]'); if (el) wechsel(el); });

  return {
    ui, da,
    oeffne: (seite = 'uebersicht', arg) => { ui.seite = seite; if (seite === 'aktion') ui.aktion = arg; ui.planen = null; zeigen(); },
    neuZeichnen: () => zeigen(true), aktiv: () => ui.aktiv, zu: () => { ui.aktiv = false; },
    pruefe: () => ({ seite: ui.seite, ...vergleiche(rendern().S.W) }),
  };
}
