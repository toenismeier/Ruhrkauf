// Vorstand-Panel (VORSTAND-MARKETING-VERTRAG.md, Abschnitt 5) im Stil von Coffee Inc 2: Ressortkarten, Profil mit Porträt,
// Fähigkeitsbalken, Delegations-Schaltern, Jahresgehalt +/-, Halte- und Erfolgsbonus, Entlassen mit Abfindung,
// Einstellungs-Karussell mit Angebot und Annahmechance, Vorstandssitzung mit offener Entscheidung.
// Daten: vorstandUebersicht, vorstandProfil, kandidaten, angebotsChance; Aktionen über fuehreAus.
// Prüfung: jeder Wert mit data-p wird in pruefe() aus frischen Abfragen neu erzeugt und mit der Anzeige verglichen.
// Die Bausteine (Schalter, Stepper, Balken, Karussell, Porträt, Prüfung) nutzen auch marketing.js und produkte.js.
import { geld, fmt, pz, kwVon, esc } from './format.js';
import * as PT from '../kit/portraet.js';
import * as K from './komponenten.js';
import { zentraleReiter, figurKlein, G4 } from './zentrale-abteilungen.js';

// ─────────────────────────────────────────── gemeinsame Bausteine
/** Porträt als SVG (kit/portraet.js); fehlt die Datei, eine neutrale Silhouette. */
export function portraet(m, groesse = 96, hintergrund) {
  if (typeof PT.portraetSVG === 'function' && m) return PT.portraetSVG(m, groesse, hintergrund ? { hintergrund } : {});
  return `<svg viewBox="0 0 100 100" width="${groesse}" height="${groesse}"><rect width="100" height="100" fill="${hintergrund ?? 'none'}"/><circle cx="50" cy="36" r="17" fill="#cfc9bf"/><path d="M18 100c2-24 15-36 32-36s30 12 32 36z" fill="#b9b2a6"/></svg>`;
}
/** Sammelt angezeigte Werte: P(k, text) setzt data-p und merkt sich den Text für die Prüfung. */
export function werteSammler() {
  const W = new Map();
  const P = (k, text, tag = 'b', extra = '') => { W.set(k, String(text)); return `<${tag} data-p="${esc(k)}"${extra}>${esc(text)}</${tag}>`; };
  return { W, P };
}
/** Anzeige gegen frisch erzeugte Werte: zeichne() rendert mit neuen Abfragen ohne DOM und liefert die Map. */
export function vergleiche(W) {
  const fehler = [];
  let n = 0;
  for (const el of document.querySelectorAll('#pinhalt [data-p]')) {
    n++;
    const k = el.dataset.p;
    if (!W.has(k)) { fehler.push(`${k}: angezeigt ${el.textContent}, Engine kennt den Wert nicht mehr`); continue; }
    if (W.get(k) !== el.textContent) fehler.push(`${k}: ${el.textContent} statt ${W.get(k)}`);
  }
  return { werte: n, fehler };
}
export const schalter = (an, attr, text, unter = '') => `<button class="schalter ${an ? 'an' : ''}" ${attr} role="switch" aria-checked="${an}"><span class="knebel"></span><span class="stext">${text}${unter ? `<small>${unter}</small>` : ''}</span></button>`;
export const segment = (act, wert, optionen, extra = '') => `<div class="seg${optionen.length > 5 || optionen.reduce((a, [, t]) => a + String(t).length, 0) > 30 ? ' umbruch' : ''}">${optionen.map(([v, t]) => `<button class="${String(v) === String(wert) ? 'an' : ''}" data-a="${act}" data-v="${v}"${extra}>${t}</button>`).join('')}</div>`;
export const regler = (titel, inhalt, hilfe = '') => `<div class="regler"><div class="rkopf"><b>${titel}</b>${hilfe ? `<small>${hilfe}</small>` : ''}</div>${inhalt}</div>`;
export const stepper = (act, wertHtml, unter = '', extra = '') => `<div class="stepper"><button data-a="${act}" data-v="-1"${extra} aria-label="weniger">−</button><span>${wertHtml}${unter ? `<br><i>${unter}</i>` : ''}</span><button data-a="${act}" data-v="1"${extra} aria-label="mehr">+</button></div>`;
/** Fähigkeitsbalken wie Coffee Inc: fünf Felder, grüne Füllung, Zahl rechts. */
export const faehigkeit = (name, wert, p) => `<div class="faehig"><span>${name}</span><span class="fbalken"><span style="width:${Math.max(0, Math.min(100, wert))}%"></span><i></i><i></i><i></i><i></i></span>${p}</div>`;
export const kz = (titel, inhalt, ton = '') => `<div class="kz ${ton}"><span>${titel}</span>${inhalt}</div>`;
export const wocheText = (s, w) => `KW ${kwVon(w)} / ${s.startJahr + Math.floor(w / 52)}`;
/** Karussell: waagerecht wischbar mit Einrasten, Punkte darunter (data-a=act, data-v=Index). */
export const karussell = (id, karten, idx, act) => `<div class="karussell" data-k="${id}">${karten.map((k, i) => `<div class="kslot" data-i="${i}">${k}</div>`).join('')}</div><div class="punkte">${karten.map((_, i) => `<button class="${i === idx ? 'an' : ''}" data-a="${act}" data-v="${i}" aria-label="Karte ${i + 1}"></button>`).join('')}</div>`;
/** Karussell nach dem Neuzeichnen auf Karte idx stellen; beim Wischen idx melden. */
export function karussellBinden(id, idx, beiWechsel) {
  const k = document.querySelector(`#pinhalt .karussell[data-k="${id}"]`);
  if (!k) return;
  // Q32: Karte über ihre Mitte bestimmen (die Karten rasten mittig ein; die alte Rechnung scrollLeft / Breite lag
  // bei der letzten Karte und bei Randabständen daneben, sodass das Angebot zu einer anderen Karte gehörte).
  const slots = [...k.querySelectorAll('.kslot')];
  const mitte = (el) => { const r = el.getBoundingClientRect(); return r.left - k.getBoundingClientRect().left + k.scrollLeft + r.width / 2; };
  const aktuell = () => { const m = k.scrollLeft + k.clientWidth / 2; let best = 0; slots.forEach((el, i) => { if (Math.abs(mitte(el) - m) < Math.abs(mitte(slots[best]) - m)) best = i; }); return best; };
  if (slots[idx]) k.scrollLeft = Math.max(0, mitte(slots[idx]) - k.clientWidth / 2);
  let t = null;
  k.addEventListener('scroll', () => {
    clearTimeout(t);
    // nur, solange dieses Karussell noch angezeigt wird (sonst öffnete ein später Scroll-Abschluss das alte Panel wieder)
    t = setTimeout(() => { if (!k.isConnected) return; const i = aktuell(); if (i !== idx) beiWechsel(i); }, 140);
  }, { passive: true });
}

const RISIKO = { gruen: 'gering', gelb: 'erhöht', rot: 'hoch' };
const HALTE = [[0, 'kein'], [0.25, '25 %'], [0.5, '50 %'], [1, '100 %']];
const ERFOLG = [[0, 'kein'], [0.1, '10 %'], [0.2, '20 %'], [0.3, '30 %']];
const vorzeichen = (x) => (x >= 0 ? '+' : '−') + Math.abs(x);

// E47: Vorstand wie Coffee 28. Übersicht = Besetzung und Sitzungsvorlage, Ressorts als Liste; Profil = Porträtrahmen,
// Fähigkeiten als Skala, Jahresgehalt als großer Stepper, Delegation als Schalter; Einstellen = Kandidaten im Karussell.
export function vorstandModul(ctx) {
  const E = ctx.E, s = () => ctx.s();
  const da = typeof E.vorstandUebersicht === 'function';
  const ui = { aktiv: false, seite: 'uebersicht', ressort: null, k: 0, angebot: null, entlassen: false };
  const kopf = (sprecherText, person, unter, ton = '') => K.bereich('zentrale', 'zentrale') + G4 + K.sprecher({ text: sprecherText, unter, person: person ? portraet(person.portraet, 72) : '', ton });
  const personBlock = (p, P, id, groesse = 104) => `<div class="hw-person"><div class="hw-portraet hw-kontur">${portraet(p?.portraet ?? null, groesse)}</div><div class="hw-person-daten">`
    + `<h3 class="hw-person-name">${p ? P(`${id}:name`, p.name, 'span') : 'Platz frei'}</h3>`
    + (p ? `<span class="hw-marke">Fähigkeiten</span>${K.skala('Führung', p.fuehrung)}${K.skala('Fachwissen', p.fachwissen)}${K.skala('Loyalität', p.loyalitaet)}` : '') + '</div></div>';

  // ─────────────────────────── Übersicht
  function uebersicht(P) {
    // Hauptfrage: Wer fehlt im Vorstand, was steht zur Entscheidung?
    const st = s(), u = E.vorstandUebersicht(st);
    const frei = u.ressorts.filter((r) => !r.person), risiko = u.ressorts.filter((r) => r.person && r.risikoAmpel === 'rot');
    const cfo = u.ressorts.find((r) => r.id === 'cfo')?.person;
    const text = (frei.length ? `<b>${frei.map((r) => r.kurz).join(' und ')} ${frei.length === 1 ? 'fehlt' : 'fehlen'}.</b> ${frei.length === 1 ? 'Das Ressort arbeitet' : 'Die Ressorts arbeiten'} ohne Führung schwächer.` : '<b>Alle Ressorts sind besetzt.</b>')
      + (risiko.length ? ` Abwerberisiko hoch: ${risiko.map((r) => r.kurz).join(', ')}.` : '');
    const h = kopf(text, cfo, cfo ? cfo.name + ' · Finanzvorstand' : 'Vorstand', frei.length ? 'engpass' : '');
    let r = '';
    const besetzt = `${u.besetzt} von ${u.ressorts.length}`; P('u:besetzt', besetzt); P('u:kostenJahr', geld(u.kostenJahr));
    r += K.gross([{ label: 'Vorstand besetzt', wert: besetzt, p: 'u:besetzt', ton: frei.length ? 'schlecht' : '' },
      { label: 'Gehälter im Jahr', wert: geld(u.kostenJahr), p: 'u:kostenJahr', unter: `${P('u:kostenWoche', geld(u.kostenWoche), 'span')} je Woche` }]);
    for (const e of u.offeneEntscheidungen) {
      const roh = st.entscheidungen.find((x) => x.id === e.id);
      r += K.abschnitt('Sitzungsvorlage', 'Frist ' + wocheText(st, e.frist));
      r += `<p class="hw-vorlage">${esc(e.titel)}</p>${roh?.text ? `<p class="hw-lese hw-leise">${esc(roh.text)}</p>` : ''}`;
      r += `<div class="hw-knoepfe zweispaltig">${(roh?.optionen ?? []).map((o, i) => K.knopf(o.label, `data-a="entscheiden" data-v="${esc(e.id)}" data-o="${esc(o.id)}"`, i === 0 ? '' : 'zweit')).join('')}</div>`;
    }
    r += K.abschnitt('Ressorts', 'antippen für Profil');
    r += K.liste(u.ressorts.map((x) => {
      const p = x.person;
      return `<button type="button" class="hw-zeile" data-a="profil" data-v="${x.id}">${p ? figurKlein(portraet(p.portraet, 56)) : '<span class="hw-figur leer" aria-hidden="true"></span>'}`
        + `<span class="hw-was">${x.kurz} · ${esc(x.titel)}<small>${p ? P(`r:${x.id}:name`, p.name, 'span') : '<span class="hw-schlecht">Platz frei, einstellen</span>'}</small></span>`
        + (p ? `<span class="hw-wert${x.risikoAmpel === 'rot' ? ' schlecht' : x.risikoAmpel === 'gelb' ? ' achtung' : ''}">Risiko ${RISIKO[x.risikoAmpel]}<small>Führung ${p.fuehrung} · Fach ${p.fachwissen}</small></span>` : '')
        + '<span class="hw-pfeil" aria-hidden="true">›</span></button>';
    }));
    const ls = u.letzteSitzung;
    const naechste = `<p class="hw-lese hw-leise hw-unterzeile">Nächste Sitzung ${P('u:sitzung', wocheText(st, u.naechsteSitzung), 'span')}</p>`;
    r += K.abschnitt('Letzte Sitzung', ls ? wocheText(st, ls.woche) : '');
    if (!ls) r += K.leer('Der Vorstand tagt einmal im Quartal.', 'Noch keine Sitzung') + naechste;
    else {
      r += K.liste([...ls.berichte.map((b) => K.zeile({ was: `${E.RESSORT_INFO?.[b.ressort]?.kurz ?? b.ressort}${b.name ? ' · ' + esc(b.name) : ''}`, unter: esc(b.text) })),
        ...(ls.thema ? [K.zeile({ was: 'Beschluss: ' + esc(ls.thema.titel), unter: esc(ls.thema.ergebnis ?? 'offen') })] : [])]) + naechste;
    }
    for (const b of u.boosts) r += K.hinweis(`${esc(b.text)} wirkt bis ${wocheText(st, b.bis)}.`, 'gut');
    return { titel: 'Vorstand', unter: `Du bist CEO · KW ${kwVon(st.woche)}`, html: h + K.rumpf(r) + zentraleReiter('vorstand') };
  }

  // ─────────────────────────── Profil (Coffee 28)
  function profil(P) {
    const st = s(), r = E.vorstandProfil(st, ui.ressort);
    if (!r) { ui.seite = 'uebersicht'; return uebersicht(P); }
    const p = r.person, id = r.id;
    let x = K.knoepfe(K.knopf('‹ Vorstand', 'data-a="seite" data-v="uebersicht"', 'text'));
    const wirkung = K.abschnitt('Wirkung auf die Abteilungen') + K.liste(r.abteilungen.map((a) => K.zeile({ was: esc(a.name), wert: P(`p:${id}:abt:${a.id}`, pz(a.faktor), 'span'), ton: a.faktor < 1 ? 'schlecht' : '' })));
    if (!p) {
      const h = kopf(`<b>${r.kurz} ist unbesetzt.</b> Ohne Führung ist keine Delegation möglich.`, null, r.titel, 'engpass');
      x += K.abschnitt(r.kurz + ' · ' + r.titel) + personBlock(null, P, 'p:' + id);
      x += `<p class="hw-lese hw-leise">${esc(r.zustaendig)}${r.vakantSeit !== undefined ? ' · vakant seit ' + wocheText(st, r.vakantSeit) : ''}</p>`;
      P(`p:${id}:kandidaten`, `${r.kandidatenAnzahl} Kandidaten ansehen`);
      x += K.knoepfe(K.knopf(`${r.kandidatenAnzahl} Kandidaten ansehen`, `data-a="einstellen" data-v="${id}"`, 'breit'));
      x += wirkung;
      return { titel: `${r.kurz} einstellen`, unter: r.titel, html: h + K.rumpf(x) + zentraleReiter('vorstand') };
    }
    const geht = p.gehtWoche !== undefined;
    const satz = geht ? `<b>Ich gehe ${wocheText(st, p.gehtWoche)}.</b>` : (r.gehaltProzent ?? 0) < 0 ? `<b>Mein Gehalt liegt ${Math.abs(r.gehaltProzent)} % unter meiner Forderung.</b>`
      : r.risikoAmpel === 'rot' ? '<b>Andere Häuser werben um mich.</b>' : `<b>${esc(r.zustaendig)}: alles im Plan.</b>`;
    const h = kopf(satz, p, p.name + ' · ' + r.kurz, geht || r.risikoAmpel === 'rot' ? 'engpass' : '');
    x += K.abschnitt(r.kurz + ' · ' + r.titel);
    x += personBlock(p, P, 'p:' + id);
    x += `<div class="hw-felder">${K.feld(r.kurz + ' seit', P(`p:${id}:seit`, wocheText(st, p.seitWoche), 'b', ' class="hw-feldwert"') + `<small class="hw-feldunter">${p.gewachsen ? 'aus dem Haus gewachsen' : 'von außen geholt'}</small>`)}`
      + K.feld('Abwerberisiko', P(`p:${id}:risiko`, pz(r.risiko), 'b', ` class="hw-feldwert${r.risikoAmpel === 'rot' ? ' hw-schlecht' : ''}"`) + `<small class="hw-feldunter">im Jahr, ${RISIKO[r.risikoAmpel]}</small>`) + '</div>';
    if (r.vorgeschichte) x += `<p class="hw-lese hw-leise hw-unterzeile">${esc(r.vorgeschichte)}</p>`;
    x += `<div data-vorstand="verguetung">` + K.abschnitt('Vergütung', 'Schritt ' + geld(r.gehaltsSchritt));
    x += K.feld('Jahresgehalt', K.stepper({ wert: geld(p.gehalt), unter: `${vorzeichen(r.gehaltProzent ?? 0)} % zur Forderung von ${geld(p.gehaltsforderung)}`, label: 'Jahresgehalt',
      attrMinus: 'data-a="gehalt" data-v="-1"', attrPlus: 'data-a="gehalt" data-v="1"', minusAus: p.gehalt - r.gehaltsSchritt < 0 }));
    const halteAnteil = p.haltebonus > 0 ? Math.round((p.haltebonus / Math.max(1, p.gehalt)) * 4) / 4 : 0;
    x += `<div class="hw-abstand"></div>` + K.feld('Haltebonus über 52 Wochen', K.seg(HALTE, halteAnteil, (v) => `data-a="haltebonus" data-v="${v}"`));
    x += `<p class="hw-lese hw-leise hw-unterzeile">${p.haltebonus > 0 ? `${P(`p:${id}:haltebonus`, geld(p.haltebonus), 'span')} bis ${p.halteBis !== undefined ? wocheText(st, p.halteBis) : 'offen'}, senkt das Abwerberisiko` : 'Anteil vom Jahresgehalt, in Raten ausgezahlt'}</p>`;
    x += `<div class="hw-abstand"></div>` + K.feld('Erfolgsbonus bei Planerfüllung', K.seg(ERFOLG, Math.round(p.erfolgsbonus * 10) / 10, (v) => `data-a="erfolgsbonus" data-v="${v}"`)) + '</div>';
    x += K.abschnitt('Delegation', 'nach Fachwissen');
    x += r.delegationen.map((d) => K.schalter({ text: d.label, unter: d.beschreibung, an: d.an, attr: `data-a="delegation" data-v="${d.id}"` })).join('');
    x += wirkung;
    if (r.protokoll.length) x += K.abschnitt('Entscheidungen im Ressort') + K.liste([...r.protokoll].reverse().slice(0, 6).map((q) => K.zeile({ was: esc(q.text), unter: 'KW ' + kwVon(q.woche) })));
    x += ui.entlassen
      ? K.hinweis(`Entlassen kostet ${P(`p:${id}:abfindung`, geld(r.abfindung ?? 0), 'b')} Abfindung.`, 'achtung') + `<div class="hw-knoepfe zweispaltig">${K.knopf('Entlassen', 'data-a="entlassenJa" data-gefahr', 'gefahr')}${K.knopf('Behalten', 'data-a="entlassenNein"', 'zweit')}</div>`
      : K.knoepfe(K.knopf('Entlassen', 'data-a="entlassen" data-gefahr', 'gefahr breit'));
    return { titel: `${r.kurz} Profil`, unter: p.name, html: h + K.rumpf(x) + zentraleReiter('vorstand') };
  }

  // ─────────────────────────── Einstellen (Karussell wie Coffee 26, Angebot wie Coffee 28)
  function einstellen(P) {
    const st = s(), L = E.kandidaten(st, ui.ressort);
    if (!L) { ui.seite = 'uebersicht'; return uebersicht(P); }
    const zurueck = K.knoepfe(K.knopf('‹ ' + L.kurz, `data-a="profil" data-v="${L.ressort}"`, 'text'));
    if (!L.kandidaten.length) {
      const h = kopf('<b>Gerade kein Kandidat am Markt.</b> Neue Kandidaten kommen mit den Wochen.', null, 'Personalberatung');
      return { titel: `${L.kurz} einstellen`, unter: L.titel, html: h + K.rumpf(zurueck + (L.besetzt ? K.hinweis('Das Ressort ist besetzt. Erst entlassen, dann neu besetzen.', 'achtung') : '')) + zentraleReiter('vorstand') };
    }
    ui.k = Math.min(ui.k, L.kandidaten.length - 1);
    const k = L.kandidaten[ui.k];
    if (!ui.angebot || ui.angebot.id !== k.id) ui.angebot = { id: k.id, gehalt: k.gehaltsforderung, halte: 0, erfolg: 0 };
    const A = ui.angebot, hb = Math.round(A.gehalt * A.halte), ch = E.angebotsChance(st, L.ressort, k.id, A.gehalt, hb, A.erfolg);
    const h = kopf(`<b>${L.kandidaten.length} Kandidaten für ${L.kurz}.</b> Wischen, dann ein Angebot machen.`, null, 'Personalberatung');
    const karten = L.kandidaten.map((q) => `<div class="hw-kandidat"><div class="hw-kandidat-kopf"><div class="hw-portraet hw-kontur">${portraet(q.portraet, 80)}</div><div><h3 class="hw-person-name">${P(`k:${q.id}:name`, q.name, 'span')}</h3>`
      + `<p class="hw-lese hw-leise">${esc(q.aktuellePosition)}<br>${esc(q.aktuelleFirma)}</p></div></div>`
      + `<div class="hw-skalen">${K.skala('Führung', q.fuehrung)}${K.skala('Fachwissen', q.fachwissen)}${K.skala('Loyalität', q.loyalitaet)}</div>`
      + `<div class="hw-felder">${K.feld('Gehalt heute', P(`k:${q.id}:gehalt`, geld(q.aktuellesGehalt), 'b', ' class="hw-feldwert"'))}${K.feld('Forderung', P(`k:${q.id}:forderung`, geld(q.gehaltsforderung), 'b', ' class="hw-feldwert"') + `<small class="hw-feldunter">Chance ${P(`k:${q.id}:chance`, pz(q.chanceBeiForderung), 'span')}</small>`)}</div>`
      + `<p class="hw-lese hw-leise hw-unterzeile">${esc(q.vorgeschichte)}</p></div>`);
    const x = L.besetzt ? K.hinweis('Das Ressort ist besetzt. Erst entlassen, dann neu besetzen.', 'achtung') : '';
    let y = `<div data-angebot>` + K.abschnitt('Angebot an ' + k.name, 'Schritt ' + geld(L.gehaltsSchritt));
    y += K.feld('Jahresgehalt', K.stepper({ wert: geld(A.gehalt), unter: `${vorzeichen(Math.round((A.gehalt / k.gehaltsforderung - 1) * 100))} % zur Forderung`, label: 'Jahresgehalt im Angebot',
      attrMinus: 'data-a="angebotGehalt" data-v="-1"', attrPlus: 'data-a="angebotGehalt" data-v="1"', minusAus: A.gehalt <= L.gehaltsSchritt }));
    y += `<div class="hw-abstand"></div>` + K.feld('Haltebonus' + (hb ? ' · ' + geld(hb) : ''), K.seg(HALTE, A.halte, (v) => `data-a="angebotHalte" data-v="${v}"`));
    y += `<div class="hw-abstand"></div>` + K.feld('Erfolgsbonus', K.seg(ERFOLG, A.erfolg, (v) => `data-a="angebotErfolg" data-v="${v}"`));
    P('a:chance', pz(ch));
    y += K.gross([{ label: 'Annahmechance', wert: pz(ch), p: 'a:chance', ton: ch >= 0.6 ? 'gut' : ch < 0.35 ? 'schlecht' : '', unter: 'hängt von Angebot, Lage der Firma und Image ab' }]);
    y += K.knoepfe(K.knopf('Angebot machen', 'data-a="anbieten"', 'breit', L.besetzt)) + '</div>';
    return { titel: `${L.kurz} einstellen`, unter: `${L.titel} · ${L.kandidaten.length} Kandidaten`,
      html: h + K.rumpf(zurueck + x) + K.karussell(karten, { aktiv: ui.k, label: 'Kandidaten' }) + K.rumpf(y) + zentraleReiter('vorstand') };
  }

  function rendern() {
    const S = werteSammler();
    if (!da) return { S, r: { titel: 'Vorstand', unter: '', html: K.bereich('zentrale') + G4 + K.rumpf(K.leer('Die Engine liefert noch keinen Vorstand.')) } };
    const r = ui.seite === 'profil' ? profil(S.P) : ui.seite === 'einstellen' ? einstellen(S.P) : uebersicht(S.P);
    return { S, r };
  }
  /** Karussell auf Karte ui.k stellen; nach dem Wischen die mittige Karte als Angebotsziel übernehmen. */
  function karussellStellen() {
    const k = document.querySelector('#pinhalt .hw-karussell');
    if (!k) return;
    const karten = [...k.children];
    const mitte = (el) => el.offsetLeft + el.offsetWidth / 2;
    const aktuell = () => { const m = k.scrollLeft + k.clientWidth / 2; let best = 0; karten.forEach((el, i) => { if (Math.abs(mitte(el) - m) < Math.abs(mitte(karten[best]) - m)) best = i; }); return best; };
    if (karten[ui.k]) k.scrollLeft = Math.max(0, mitte(karten[ui.k]) - k.clientWidth / 2);
    k.nextElementSibling?.querySelectorAll('i').forEach((p, i) => p.classList.toggle('an', i === ui.k));
    let t = null;
    k.addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(() => { if (!k.isConnected || !ui.aktiv) return; const i = aktuell(); if (i !== ui.k) { ui.k = i; zeigen(true); } }, 140); }, { passive: true });
  }
  function zeigen(scrollHalten = false) {
    const sc = document.getElementById('pinhalt').scrollTop;
    const { r } = rendern();
    ctx.panel(r.titel, r.unter, r.html, 'gross');
    ui.aktiv = true;
    document.getElementById('pinhalt').scrollTop = scrollHalten ? sc : 0;
    if (ui.seite === 'einstellen') karussellStellen();
  }
  function tun(aktion) {
    const r = E.fuehreAus(s(), aktion);
    if (r) ctx.meldung(r.text, r.ok);
    ctx.nachAktion?.();
    return r;
  }
  function klick(el) {
    const a = el.dataset.a, v = el.dataset.v;
    const prof = () => E.vorstandProfil(s(), ui.ressort);
    if (a === 'kandidat') { ui.k = Number(v); return zeigen(true); }
    switch (a) {
      case 'seite': ui.seite = v; ui.entlassen = false; return zeigen();
      case 'profil': ui.seite = 'profil'; ui.ressort = v; ui.entlassen = false; return zeigen();
      case 'einstellen': ui.seite = 'einstellen'; ui.ressort = v; ui.k = 0; ui.angebot = null; return zeigen();
      case 'entscheiden': tun({ typ: 'entscheiden', id: v, option: el.dataset.o }); return zeigen(true);
      case 'delegation': { const d = prof().delegationen.find((x) => x.id === v); tun({ typ: 'vorstandDelegation', ressort: ui.ressort, bereich: v, an: !d.an }); return zeigen(true); }
      case 'gehalt': { const p = prof(); tun({ typ: 'vorstandGehalt', ressort: ui.ressort, gehalt: Math.max(0, p.person.gehalt + Number(v) * p.gehaltsSchritt) }); return zeigen(true); }
      case 'haltebonus': { const p = prof(); tun({ typ: 'vorstandBonus', ressort: ui.ressort, haltebonus: Math.round(p.person.gehalt * Number(v)), halteWochen: 52 }); return zeigen(true); }
      case 'erfolgsbonus': tun({ typ: 'vorstandBonus', ressort: ui.ressort, erfolgsbonus: Number(v) }); return zeigen(true);
      case 'entlassen': ui.entlassen = true; return zeigen(true);
      case 'entlassenNein': ui.entlassen = false; return zeigen(true);
      case 'entlassenJa': { ui.entlassen = false; const r = tun({ typ: 'vorstandEntlassen', ressort: ui.ressort }); return zeigen(!r?.ok); }
      case 'kandidat': ui.k = Number(v); return zeigen(true);
      case 'angebotGehalt': { const L = E.kandidaten(s(), ui.ressort); ui.angebot.gehalt = Math.max(L.gehaltsSchritt, ui.angebot.gehalt + Number(v) * L.gehaltsSchritt); return zeigen(true); }
      case 'angebotHalte': ui.angebot.halte = Number(v); return zeigen(true);
      case 'angebotErfolg': ui.angebot.erfolg = Number(v); return zeigen(true);
      case 'anbieten': {
        const A = ui.angebot;
        const r = tun({ typ: 'vorstandEinstellen', ressort: ui.ressort, kandidat: A.id, gehalt: A.gehalt, haltebonus: Math.round(A.gehalt * A.halte), erfolgsbonus: A.erfolg });
        ui.angebot = null;
        if (r?.ok) { ui.seite = 'profil'; return zeigen(); }
        ui.k = 0; return zeigen(true);
      }
      default:
    }
  }
  const inhalt = document.getElementById('pinhalt');
  inhalt.addEventListener('click', (ev) => { if (!ui.aktiv) return; const el = ev.target.closest('[data-a]'); if (el && !el.disabled) klick(el); });

  return {
    ui, da,
    oeffne: (seite = 'uebersicht', ressort) => { ui.seite = seite; if (ressort) ui.ressort = ressort; ui.k = 0; ui.angebot = null; ui.entlassen = false; zeigen(); },
    neuZeichnen: () => zeigen(true), aktiv: () => ui.aktiv, zu: () => { ui.aktiv = false; },
    pruefe: () => ({ seite: ui.seite, ...vergleiche(rendern().S.W) }),
    badge: () => (da ? E.vorstandUebersicht(s()).offeneEntscheidungen.length : 0),
  };
}
