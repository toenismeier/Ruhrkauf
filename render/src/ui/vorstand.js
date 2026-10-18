// Vorstand-Panel (VORSTAND-MARKETING-VERTRAG.md, Abschnitt 5) im Stil von Coffee Inc 2: Ressortkarten, Profil mit Porträt,
// Fähigkeitsbalken, Delegations-Schaltern, Jahresgehalt +/-, Halte- und Erfolgsbonus, Entlassen mit Abfindung,
// Einstellungs-Karussell mit Angebot und Annahmechance, Vorstandssitzung mit offener Entscheidung.
// Daten: vorstandUebersicht, vorstandProfil, kandidaten, angebotsChance; Aktionen über fuehreAus.
// Prüfung: jeder Wert mit data-p wird in pruefe() aus frischen Abfragen neu erzeugt und mit der Anzeige verglichen.
// Die Bausteine (Schalter, Stepper, Balken, Karussell, Porträt, Prüfung) nutzen auch marketing.js und produkte.js.
import { geld, fmt, pz, kwVon, esc } from './format.js';
import * as PT from '../kit/portraet.js';

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
export const segment = (act, wert, optionen, extra = '') => `<div class="seg umbruch">${optionen.map(([v, t]) => `<button class="${String(v) === String(wert) ? 'an' : ''}" data-a="${act}" data-v="${v}"${extra}>${t}</button>`).join('')}</div>`;
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
  const slot = k.querySelector('.kslot');
  const breite = () => (slot ? slot.getBoundingClientRect().width + 12 : 1);
  k.scrollLeft = idx * breite();
  let t = null;
  k.addEventListener('scroll', () => {
    clearTimeout(t);
    t = setTimeout(() => { const i = Math.round(k.scrollLeft / breite()); if (i !== idx) beiWechsel(i); }, 140);
  }, { passive: true });
}

const RISIKO = { gruen: 'gering', gelb: 'erhöht', rot: 'hoch' };
const HALTE = [[0, 'kein'], [0.25, '25 %'], [0.5, '50 %'], [1, '100 %']];
const ERFOLG = [[0, 'kein'], [0.1, '10 %'], [0.2, '20 %'], [0.3, '30 %']];
const tsd = (x) => geld(x);

export function vorstandModul(ctx) {
  const E = ctx.E, s = () => ctx.s();
  const da = typeof E.vorstandUebersicht === 'function';
  const ui = { aktiv: false, seite: 'uebersicht', ressort: null, k: 0, angebot: null, entlassen: false };

  // ─────────────────────────── Übersicht
  function uebersicht(P) {
    const st = s(), u = E.vorstandUebersicht(st);
    let h = `<div class="raster">${kz('Vorstand besetzt', P('u:besetzt', `${u.besetzt} von ${u.ressorts.length}`))}${kz('Gehälter im Jahr', P('u:kostenJahr', geld(u.kostenJahr)))}${kz('Kosten je Woche', P('u:kostenWoche', geld(u.kostenWoche)))}${kz('Nächste Sitzung', P('u:sitzung', wocheText(st, u.naechsteSitzung)))}</div>`;
    for (const e of u.offeneEntscheidungen) {
      const roh = st.entscheidungen.find((x) => x.id === e.id);
      h += `<div class="karte entscheid"><div class="ohead"><b>${esc(e.titel)}</b><i>Frist ${wocheText(st, e.frist)}</i></div><div class="olief">${esc(roh?.text ?? '')}</div><div class="oknoepfe">${(roh?.optionen ?? []).map((o, i) => `<button class="${i === 0 ? 'gruen' : ''}" data-a="entscheiden" data-v="${e.id}" data-o="${o.id}">${esc(o.label)}</button>`).join('')}</div></div>`;
    }
    h += '<div class="vgitter">';
    for (const r of u.ressorts) {
      const p = r.person;
      h += `<button class="vkarte ${p ? '' : 'leer'}" data-a="profil" data-v="${r.id}"><span class="vbild">${portraet(p?.portraet, 64)}</span><span class="vtext"><b>${r.kurz}</b><small>${esc(r.titel)}</small>${p ? P(`r:${r.id}:name`, p.name, 'em') : '<em class="frei">unbesetzt</em>'}</span>`;
      if (p) h += `<span class="vmini"><span title="Führung"><i style="width:${p.fuehrung}%"></i></span><span title="Fachwissen"><i style="width:${p.fachwissen}%"></i></span><span title="Loyalität"><i style="width:${p.loyalitaet}%"></i></span></span><span class="ampel a-${r.risikoAmpel}" title="Abwerberisiko ${RISIKO[r.risikoAmpel]}"></span>`;
      else h += '<span class="chip warn">einstellen</span>';
      h += '</button>';
    }
    h += '</div><div class="legende">Balken: Führung, Fachwissen, Loyalität · Punkt: Abwerberisiko</div>';
    const ls = u.letzteSitzung;
    if (ls) {
      h += `<div class="karte"><div class="khead">Letzte Vorstandssitzung<small>${wocheText(st, ls.woche)}</small></div>`;
      for (const b of ls.berichte) h += `<div class="zeile"><span class="was"><b>${E.RESSORT_INFO?.[b.ressort]?.kurz ?? b.ressort}</b>${b.name ? ` <i>${esc(b.name)}</i>` : ''}<em class="wirk">${esc(b.text)}</em></span></div>`;
      if (ls.thema) h += `<div class="zeile"><span class="was"><b>Beschluss</b> <i>${esc(ls.thema.titel)}</i><em>${esc(ls.thema.ergebnis ?? 'offen')}</em></span></div>`;
      h += '</div>';
    }
    for (const b of u.boosts) h += `<div class="olief">${esc(b.text)} wirkt bis ${wocheText(st, b.bis)}</div>`;
    return { titel: 'Vorstand', unter: `Du bist CEO · ${u.besetzt} von ${u.ressorts.length} Ressorts besetzt · KW ${kwVon(st.woche)}`, html: h };
  }

  // ─────────────────────────── Profil
  function profil(P) {
    const st = s(), r = E.vorstandProfil(st, ui.ressort);
    if (!r) { ui.seite = 'uebersicht'; return uebersicht(P); }
    const p = r.person, id = r.id;
    let h = '<button class="zurueck" data-a="seite" data-v="uebersicht">‹ Vorstand</button>';
    if (!p) {
      h += `<div class="karte vprofil"><div class="vkopf"><span class="vbild gross">${portraet(null, 120)}</span><div><b class="vname">${r.kurz} unbesetzt</b><small>${esc(r.titel)}</small><div class="olief">${esc(r.zustaendig)}</div>${r.vakantSeit !== undefined ? `<div class="olief warnung">vakant seit ${wocheText(st, r.vakantSeit)}</div>` : ''}</div></div>`;
      h += `<div class="olief">Ohne ${r.kurz} wirken die Abteilungen schwächer: ${r.abteilungen.map((a) => `${esc(a.name)} ${P(`p:${id}:abt:${a.id}`, pz(a.faktor), 'b')}`).join(' · ')}. Keine Delegation möglich.</div></div>`;
      h += `<button class="breit gruen" data-a="einstellen" data-v="${id}">${P(`p:${id}:kandidaten`, `${r.kandidatenAnzahl} Kandidaten ansehen`, 'span')}</button>`;
      return { titel: `${r.kurz} einstellen`, unter: esc(r.zustaendig), html: h };
    }
    h += `<div class="karte vprofil"><div class="vkopf"><span class="vbild gross">${portraet(p.portraet, 120)}</span><div><b class="vname">${P(`p:${id}:name`, p.name, 'span')}</b><small>${esc(r.titel)}</small>`;
    h += `<div class="vseit"><span>${r.kurz} seit</span>${P(`p:${id}:seit`, wocheText(st, p.seitWoche))}</div>${p.gewachsen ? '<span class="chip grau">aus dem Haus gewachsen</span>' : ''}${p.gehtWoche !== undefined ? `<span class="chip warn">geht ${wocheText(st, p.gehtWoche)}</span>` : ''}</div></div>`;
    h += `<div class="faehigkeiten"><div class="vtitel">Fähigkeiten</div>${faehigkeit('Führung', p.fuehrung, P(`p:${id}:fuehrung`, String(p.fuehrung)))}${faehigkeit('Fachwissen', p.fachwissen, P(`p:${id}:fachwissen`, String(p.fachwissen)))}${faehigkeit('Loyalität', p.loyalitaet, P(`p:${id}:loyalitaet`, String(p.loyalitaet)))}</div>`;
    if (r.vorgeschichte) h += `<div class="olief">${esc(r.vorgeschichte)}</div>`;
    h += `<div class="olief">Wirkung auf ${r.abteilungen.map((a) => `${esc(a.name)} ${P(`p:${id}:abt:${a.id}`, pz(a.faktor), 'b')}`).join(' · ')} · Abwerberisiko im Jahr ${P(`p:${id}:risiko`, pz(r.risiko), 'b')}<span class="ampel a-${r.risikoAmpel}"></span></div></div>`;
    // Delegation
    h += '<div class="karte"><div class="khead">Delegation<small>die Ressort-KI entscheidet in der Güte des Fachwissens</small></div>';
    for (const d of r.delegationen) h += schalter(d.an, `data-a="delegation" data-v="${d.id}"`, esc(d.label), esc(d.beschreibung));
    h += '</div>';
    // Gehalt und Boni
    h += '<div class="karte steuerung"><div class="khead">Vergütung</div>';
    h += regler('Jahresgehalt', stepper('gehalt', P(`p:${id}:gehalt`, geld(p.gehalt)), P(`p:${id}:gehaltProzent`, `${r.gehaltProzent >= 0 ? '+' : ''}${r.gehaltProzent} % zur Forderung von ${geld(p.gehaltsforderung)}`, 'i')), `Schritt ${geld(r.gehaltsSchritt)}`);
    const halteAnteil = p.haltebonus > 0 ? Math.round((p.haltebonus / Math.max(1, p.gehalt)) * 4) / 4 : 0;
    h += regler('Haltebonus über 52 Wochen', segment('haltebonus', halteAnteil, HALTE) + `<small class="rfuss">${p.haltebonus > 0 ? `${P(`p:${id}:haltebonus`, geld(p.haltebonus), 'i')} bis ${p.halteBis !== undefined ? wocheText(st, p.halteBis) : 'offen'}, senkt das Abwerberisiko` : 'Anteil vom Jahresgehalt, in Raten ausgezahlt'}</small>`, 'vom Jahresgehalt');
    h += regler('Erfolgsbonus bei Planerfüllung', segment('erfolgsbonus', Math.round(p.erfolgsbonus * 10) / 10, ERFOLG), 'vom Jahresgehalt je Jahr');
    h += '</div>';
    if (r.protokoll.length) {
      h += '<div class="karte"><div class="khead">Entscheidungen im Ressort</div>';
      for (const x of [...r.protokoll].reverse().slice(0, 6)) h += `<div class="zeile"><span class="qm">KW ${kwVon(x.woche)}</span><span class="was">${esc(x.text)}</span></div>`;
      h += '</div>';
    }
    if (ui.entlassen) h += `<div class="oknoepfe unten2"><button class="rot" data-a="entlassenJa">Entlassen, Abfindung ${P(`p:${id}:abfindung`, geld(r.abfindung ?? 0), 'span')}</button><button data-a="entlassenNein">Behalten</button></div>`;
    else h += `<div class="oknoepfe unten2"><button class="rot" data-a="entlassen">Entlassen</button></div>`;
    return { titel: `${r.kurz} Profil`, unter: `${esc(r.titel)} · ${esc(r.zustaendig)}`, html: h };
  }

  // ─────────────────────────── Einstellen
  function einstellen(P) {
    const st = s(), L = E.kandidaten(st, ui.ressort);
    if (!L) { ui.seite = 'uebersicht'; return uebersicht(P); }
    let h = `<button class="zurueck" data-a="profil" data-v="${L.ressort}">‹ ${L.kurz}</button>`;
    if (L.besetzt) h += '<div class="olief warnung">Das Ressort ist besetzt. Erst entlassen, dann neu besetzen.</div>';
    if (!L.kandidaten.length) {
      h += '<div class="karte"><div class="zeile grau">Gerade kein Kandidat am Markt. Neue Kandidaten kommen mit den Wochen.</div></div>';
      return { titel: `${L.kurz} einstellen`, unter: esc(L.titel), html: h };
    }
    ui.k = Math.min(ui.k, L.kandidaten.length - 1);
    const karten = L.kandidaten.map((k) => `<div class="karte kandidat"><div class="vkopf"><span class="vbild">${portraet(k.portraet, 92)}</span><div><b class="vname">${P(`k:${k.id}:name`, k.name, 'span')}</b><div class="vtitel">Aktuelle Position</div><small>${esc(k.aktuellePosition)}<br>${esc(k.aktuelleFirma)}</small></div></div>
      <div class="faehigkeiten">${faehigkeit('Führung', k.fuehrung, P(`k:${k.id}:fuehrung`, String(k.fuehrung)))}${faehigkeit('Fachwissen', k.fachwissen, P(`k:${k.id}:fachwissen`, String(k.fachwissen)))}${faehigkeit('Loyalität', k.loyalitaet, P(`k:${k.id}:loyalitaet`, String(k.loyalitaet)))}</div>
      <div class="owerte"><div><span>Aktuelles Gehalt</span>${P(`k:${k.id}:gehalt`, geld(k.aktuellesGehalt))}</div><div><span>Forderung</span>${P(`k:${k.id}:forderung`, geld(k.gehaltsforderung))}</div><div><span>Chance bei Forderung</span>${P(`k:${k.id}:chance`, pz(k.chanceBeiForderung))}</div></div>
      <div class="olief">${esc(k.vorgeschichte)}</div></div>`);
    h += karussell('kandidaten', karten, ui.k, 'kandidat');
    const k = L.kandidaten[ui.k];
    if (!ui.angebot || ui.angebot.id !== k.id) ui.angebot = { id: k.id, gehalt: k.gehaltsforderung, halte: 0, erfolg: 0 };
    const A = ui.angebot, hb = Math.round(A.gehalt * A.halte), ch = E.angebotsChance(st, L.ressort, k.id, A.gehalt, hb, A.erfolg);
    h += '<div class="karte steuerung"><div class="khead">Angebot an ' + esc(k.name) + '</div>';
    h += regler('Jahresgehalt', stepper('angebotGehalt', P('a:gehalt', geld(A.gehalt)), `${A.gehalt >= k.gehaltsforderung ? '+' : ''}${Math.round((A.gehalt / k.gehaltsforderung - 1) * 100)} % zur Forderung`), `Schritt ${geld(L.gehaltsSchritt)}`);
    h += regler('Haltebonus', segment('angebotHalte', A.halte, HALTE), hb ? geld(hb) : 'vom Jahresgehalt');
    h += regler('Erfolgsbonus', segment('angebotErfolg', A.erfolg, ERFOLG), 'vom Jahresgehalt');
    h += `<div class="regler"><div class="rkopf"><b>Annahmechance</b>${P('a:chance', pz(ch))}</div><div class="balken"><span style="width:${(ch * 100).toFixed(0)}%;background:${ch >= 0.6 ? 'var(--gruen)' : ch >= 0.35 ? '#e3a90d' : 'var(--rot)'}"></span></div><small class="rfuss">hängt von Angebot, Lage der Firma und Image ab</small></div>`;
    h += `</div><div class="oknoepfe unten2"><button class="gruen" data-a="anbieten"${L.besetzt ? ' disabled' : ''}>Angebot machen</button></div>`;
    return { titel: `${L.kurz} einstellen`, unter: `${esc(L.titel)} · ${L.kandidaten.length} Kandidaten`, html: h };
  }

  function rendern() {
    const S = werteSammler();
    if (!da) return { S, r: { titel: 'Vorstand', unter: '', html: '<div class="leise">Die Engine liefert noch keinen Vorstand.</div>' } };
    const r = ui.seite === 'profil' ? profil(S.P) : ui.seite === 'einstellen' ? einstellen(S.P) : uebersicht(S.P);
    return { S, r };
  }
  function zeigen(scrollHalten = false) {
    const sc = document.getElementById('pinhalt').scrollTop;
    const { r } = rendern();
    ctx.panel(r.titel, r.unter, r.html, 'gross');
    ui.aktiv = true;
    document.getElementById('pinhalt').scrollTop = scrollHalten ? sc : 0;
    if (ui.seite === 'einstellen') karussellBinden('kandidaten', ui.k, (i) => { ui.k = i; zeigen(true); });
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
