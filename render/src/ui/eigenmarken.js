// Eigenmarken-Seite im Einkauf-Panel: Markenkarten (Zielgruppe, Positionierung, Bekanntheit, Marge, Umsatz, Passung je Region)
// und Assistent "Marke gründen" bzw. "Neu positionieren" in fünf Schritten. Daten über quelle.js aus
// eigenmarkenUebersicht und eigenmarkeVorschau, Aktionen eigenmarkeGruenden, eigenmarkeNeupositionieren, eigenmarkeSetzen,
// eigenmarkeAnteil, eigenmarkeEinstellen.
import { geld, pz, kwVon, esc } from './format.js';
import { teamAufschluesselung } from './produkte-q24.js';

const ALTER = [['10-13', 'Kinder'], ['13-17', 'Teens & Tweens'], ['18-29', 'Young Adults'], ['30-49', 'Adults'], ['50+', 'Best Ager']];
const alterOptionen = (aktuell) => aktuell === '70+' ? [...ALTER, ['70+', 'Best Ager 70+']] : ALTER;
const GESCHLECHT = [['damen', 'Damen'], ['herren', 'Herren'], ['unisex', 'Unisex'], ['kinder', 'Kinder']];
const KATEGORIE = ['Bekleidung', 'Schuhe', 'Wäsche', 'Accessoires', 'Home', 'Beauty'];
const PREIS = [['einstieg', 'Einstieg'], ['mitte', 'Mitte'], ['gehoben', 'Gehoben']];
const STIL = [['klassisch', 'klassisch'], ['modern', 'modern'], ['sportlich', 'sportlich'], ['trendig', 'trendig']];
const FARBEN = ['#8c5a7a', '#2f4a6b', '#6f8f4e', '#d9822b', '#c9483e', '#2f63b5', '#1f1f1f', '#d27aa0', '#3f8f8a', '#7a5a3a'];
const NAMEN = { damen: ['Linnea', 'Mira Lenz', 'Johanna B.', 'Ella Sommer'], herren: ['Nordhaven', 'Carl Ostwind', 'Feldweg', 'Henrik & Co.'], unisex: ['Studio Hartwig', 'Kleeblatt', 'Hafenblau'], kinder: ['Hafenkind', 'Kai & Kalle', 'Pusteblume'] };
const REGIONEN = ['Nord', 'Ost', 'West', 'Mitte', 'Süd'];
const alterText = (a) => a === '70+' ? 'Best Ager 70+' : ALTER.find((x) => x[0] === a)?.[1] ?? a;
const ELTERN = { '18-29': 'Eltern 18 bis 29', '30-49': 'Eltern 30 bis 49', '50+': 'Großeltern' };
// Q31: Kindermarken zielen über die Eltern; „Kinder Adults“ war missverständlich.
const zielText = (z) => z.geschlecht === 'kinder' && ELTERN[z.alter] ? `Kinder, ${ELTERN[z.alter]}` : `${GESCHLECHT.find((g) => g[0] === z.geschlecht)?.[1] ?? ''} ${alterText(z.alter)}`;
const preisText = (p) => PREIS.find((x) => x[0] === p)?.[1] ?? p;
const STATUS = { aufbau: 'im Aufbau', neupositionierung: 'Neupositionierung', eingestellt: 'eingestellt' };
const punkte = (x) => `+${(x * 100).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Punkte`;

function balken(wert, farbe = '#2f63b5') { return `<span class="mbalken"><span style="width:${Math.max(0, Math.min(100, wert)).toFixed(0)}%;background:${farbe}"></span></span>`; }
function passungZeile(p, p0) {
  return `<div class="passung">${REGIONEN.filter((r) => p[r] !== undefined).map((r) => `<div><span class="psaeule"><span style="height:${p[r]}%"></span></span><b${p0 ? ` data-p="${p0}:${r}"` : ''}>${p[r]}</b><i>${r}</i></div>`).join('')}</div>`;
}

export function eigenmarkenSeite(ctx, ui, tabs) {
  if (ui.seite === 'gruenden' && ui.em.assistent) return assistent(ctx, ui, tabs);
  ui.seite = 'eigenmarken';
  const s = ctx.s(), u = ctx.q.marken(s);
  const leistungen = new Map((typeof ctx.E?.produkte === 'function' ? ctx.E.produkte(s).marken : []).map((m) => [m.marke, m.leistung]));
  // Q31 Kollektionstafel. Hauptfrage: Welche Marke trägt, welche verliert? Größter Block = Tafel mit Musterkarten,
  // nach Umsatz geordnet, Summe unter dem Strich; die Akte der gewählten Marke darunter.
  const reihe = [...u.marken].sort((a, b) => b.umsatz13 - a.umsatz13);
  const gesamt = u.marken.reduce((a, m) => a + m.umsatz13, 0);
  const veraltet = reihe.filter((m) => m.status === 'aktiv' && m.stilAktualitaet < 45);
  if (!reihe.some((m) => m.id === ui.em.auf)) ui.em.auf = reihe[0]?.id;
  let h = tabs + '<div class="q31">';
  h += `<div class="q-gross"><span class="q-label">Eigenmarkenanteil am Umsatz</span><span class="q-haupt" data-p="mg:anteil">${pz(u.anteilUmsatz, 1)}</span><span class="q-neben"><b data-p="mg:marge">${punkte(u.mehrmargeSchnitt)}</b>Mehrmarge zu Fremdware</span></div>`;
  if (!reihe.length) h += '<div class="q-befund">Hartwig führt keine Eigenmarke. Eine Marke gründest du über den freien Platz in der Tafel.</div>';
  else if (veraltet.length) h += `<div class="q-befund"><b>${veraltet.map((m) => esc(m.name)).join(', ')}</b> ${veraltet.length === 1 ? 'wirkt' : 'wirken'} veraltet. Ohne Neupositionierung sinkt die Nachfrage weiter.</div>`;
  else h += '<div class="q-befund">Alle aktiven Marken sind im Stil aktuell.</div>';
  h += `<div class="q-buch q-tafel" data-summenbuch="Kollektionstafel"><div class="q-buch-kopf"><span>Kollektionstafel</span><b data-p="mg:gefuehrt">${u.gefuehrt} von ${String(u.kapazitaet).replace('.', ',')} sinnvollen</b></div>`;
  for (const m of reihe) {
    const st = m.status !== 'aktiv' ? `${STATUS[m.status] ?? m.status}${m.bis !== undefined ? ` bis KW ${kwVon(m.bis)}` : ''}` : m.stilAktualitaet < 45 ? 'Stil veraltet' : `${m.stil}, ${preisText(m.preislage)}`;
    h += `<button class="q-muster${ui.em.auf === m.id ? ' q-an' : ''}" data-a="emAuf" data-v="${m.id}" aria-expanded="${ui.em.auf === m.id}"><span class="q-probe" style="--farbe:${m.farbe}"></span><span class="q-name">${esc(m.name)}<small>${zielText(m.zielgruppe)} · ${m.kategorie}</small><small class="${m.status === 'aktiv' && m.stilAktualitaet < 45 ? 'q-minus' : ''}">${st}</small></span><span class="q-wert"><b data-s="u">${geld(m.umsatz13)}</b><small>${punkte(m.mehrmarge)}</small></span></button>`;
  }
  if (u.gefuehrt < u.kapazitaet) h += '<button class="q-muster q-frei" data-a="emGruenden"><span class="q-probe"></span><span class="q-name">Freier Platz<small>Neue Eigenmarke gründen</small></span><span class="q-wert">+</span></button>';
  if (reihe.length) h += `<div class="q-summe"><span>Umsatz 13 Wochen gesamt</span><span class="q-wert" data-summe="u" data-p="mg:umsatz">${geld(gesamt)}</span></div>`;
  h += '</div>';
  if (u.gefuehrt >= u.kapazitaet) h += '<button class="q-neben-akt" data-a="emGruenden" style="margin-bottom:12px">+ Neue Eigenmarke (Kapazität voll)</button>';
  for (const m of reihe.filter((x) => x.id === ui.em.auf)) {
    const veraltetM = m.stilAktualitaet < 45;
    const status = m.status !== 'aktiv' ? `<span class="chip grau">${STATUS[m.status] ?? m.status}${m.bis !== undefined ? ` bis KW ${kwVon(m.bis)}` : ''}</span>` : veraltetM ? '<span class="chip warn">Stil veraltet</span>' : '<span class="chip">aktiv</span>';
    h += `<div class="karte emkarte"><div class="mkopf" style="background:${m.farbe}"><b>${esc(m.name)}</b><small>${zielText(m.zielgruppe)} · ${m.kategorie}${m.gewachsen ? ' · gewachsene Hartwig-Marke' : ''}</small></div>`;
    h += `<div class="owerte"><div><span>Umsatz 13 Wochen</span><b data-p="m:${m.id}:umsatz">${geld(m.umsatz13)}</b></div><div><span>Rohertragsquote</span><b data-p="m:${m.id}:marge">${pz(m.rohertragsquote, 1)}</b></div><div><span>Mehrmarge</span><b data-p="m:${m.id}:mehrmarge">${punkte(m.mehrmarge)}</b></div></div>`;
    h += `<div class="ochips">${status}<span class="chip grau">${preisText(m.preislage)}</span><span class="chip grau">${m.stil}</span><span class="chip grau">Qualität ${m.qualitaet} von 5</span><span class="chip grau">${esc(m.beschaffungName)}</span></div>`;
    h += `<div class="mzeile"><span>Bekanntheit</span>${balken(m.bekanntheit)}<b data-p="m:${m.id}:bekanntheit">${Math.round(m.bekanntheit)}</b></div>`;
    h += `<div class="mzeile"><span>Stil aktuell</span>${balken(m.stilAktualitaet, veraltetM ? '#d23c32' : '#2f8f5b')}<b data-p="m:${m.id}:aktualitaet">${Math.round(m.stilAktualitaet)}</b></div>`;
    h += `<div class="mzeile"><span>Passung je Region</span></div>${passungZeile(m.passungRegion, `m:${m.id}:passung`)}`;
    h += teamAufschluesselung(leistungen.get(m.id));
    h += `<div class="olief">${m.wgs.filter((w) => w.anteilZiel > 0 || w.anteilIst > 0).map((w) => `${esc(w.name)} ${pz(w.anteilIst)}`).join(' · ') || 'Noch in keiner Warengruppe.'}</div>`;
    if (m.hinweise?.length) h += `<div class="olief warnung">${m.hinweise.map(esc).join(' · ')}</div>`;
    if (ui.em.einstellen === m.id) h += `<div class="oknoepfe"><button class="rot" data-a="emEinstellenJa" data-v="${m.id}">Wirklich einstellen</button><button data-a="emEinstellenNein">Behalten</button></div>`;
    else {
      h += `<div class="regler"><div class="rkopf"><b>Markenbudget je Woche</b><small>baut Bekanntheit auf</small></div><div class="stepper"><button data-a="emBudget" data-v="${m.id}" data-d="-5000" aria-label="Budget senken">−</button><span><b data-p="m:${m.id}:budget">${geld(m.budgetWoche)}</b></span><button data-a="emBudget" data-v="${m.id}" data-d="5000" aria-label="Budget erhöhen">+</button></div></div>`;
      h += `<div class="oknoepfe"><button data-a="emPositionieren" data-v="${m.id}"${m.status === 'aktiv' ? '' : ' disabled'}>Neu positionieren</button><button class="rot" data-a="emEinstellen" data-v="${m.id}">Einstellen</button></div>`;
    }
    h += '</div>';
  }
  h += '</div>';
  return { titel: 'Eigenmarken', unter: `${u.gefuehrt} Marken · ${pz(u.anteilUmsatz, 1)} vom Umsatz · KW ${kwVon(s.woche)}`, html: h };
}

const SCHRITTE = ['Zielgruppe', 'Sortiment', 'Profil', 'Beschaffung', 'Name'];
const nameFuer = (s, g) => { const l = NAMEN[g] ?? NAMEN.unisex; return l[(s.woche * 7 + (s.eigenmarken?.zaehler ?? 0) * 3) % l.length]; };
export function neuerEntwurf(s) {
  return { name: nameFuer(s, 'herren'), farbe: FARBEN[(s.woche + 4) % FARBEN.length], zielgruppe: { alter: '50+', geschlecht: 'herren' }, kategorie: 'Bekleidung', preislage: 'mitte', stil: 'modern', qualitaet: 3, beschaffung: 'nahost', budgetWoche: 15000, wgAnteile: {} };
}
/** Vorschlag: bis zu vier Warengruppen mit der besten Passung, je 25 %. */
function wgVorschlag(ctx, s, e) {
  const p = ctx.q.vorschau(s, { ...e, wgAnteile: {} }).passendeWgs;
  return Object.fromEntries([...p].sort((a, b) => b.passung - a.passung).slice(0, 4).map((w) => [w.wg, 0.25]));
}

function assistent(ctx, ui, tabs) {
  const s = ctx.s(), A = ui.em.assistent, m = A.daten, u = ctx.q.marken(s);
  const seg = (act, wert, opt, sperre = false) => `<div class="seg umbruch">${opt.map(([v, t]) => `<button class="${String(v) === String(wert) ? 'an' : ''}" data-a="${act}" data-v="${v}"${sperre ? ' disabled' : ''}>${t}</button>`).join('')}</div>`;
  const feld = (titel, inhalt, hilfe = '') => `<div class="regler"><div class="rkopf"><b>${titel}</b>${hilfe ? `<small>${hilfe}</small>` : ''}</div>${inhalt}</div>`;
  const v = ctx.q.vorschau(s, m);
  let h = tabs;
  h += `<button class="zurueck" data-a="emAbbrechen">‹ Eigenmarken</button>`;
  h += `<div class="schritte">${SCHRITTE.map((t, i) => `<button class="${i === A.schritt ? 'an' : i < A.schritt ? 'fertig' : ''}" data-a="emSchritt" data-v="${i}"><b>${i + 1}</b>${t}</button>`).join('')}</div>`;
  h += '<div class="karte steuerung">';
  if (A.schritt === 0) {
    if (!A.id) h += feld('Vorlage', `<div class="seg umbruch">${ctx.q.vorlagen().map((x, i) => `<button class="${A.vorlage === i ? 'an' : ''}" data-a="emVorlage" data-v="${i}">${esc(x.titel)}</button>`).join('')}</div>`, 'füllt alle Schritte vor');
    h += feld('Alter', seg('emAlter', m.zielgruppe.alter, alterOptionen(m.zielgruppe.alter)));
    h += feld('Geschlecht', seg('emGeschlecht', m.zielgruppe.geschlecht, GESCHLECHT));
  } else if (A.schritt === 1) {
    h += feld('Kategorie', seg('emKategorie', m.kategorie, KATEGORIE.map((k) => [k, k]), !!A.id), A.id ? 'bleibt bei Neupositionierung' : '');
    const liste = [...v.passendeWgs].sort((a, b) => b.passung - a.passung);
    const inh = liste.length ? liste.map((w) => { const a = m.wgAnteile[w.wg]; return `<button class="wgwahl ${a ? 'an' : ''}" data-a="emWg" data-v="${w.wg}"><span>${esc(w.name)} <i>${esc(ctx.E.GRUPPEN[w.bereich]?.name ?? w.bereich)} · ${w.passung >= 1 ? 'passt sehr gut' : w.passung >= 0.7 ? 'passt gut' : 'passt bedingt'}</i></span><b>${a ? pz(a) : '+'}</b></button>`; }).join('') : '<div class="leise">Keine Warengruppe passt zu Zielgruppe und Kategorie.</div>';
    h += feld('Warengruppen', `<div class="wgliste">${inh}</div>`, 'Antippen: 15, 25, 40 % oder aus');
  } else if (A.schritt === 2) {
    h += feld('Preislage', seg('emPreis', m.preislage, PREIS));
    h += feld('Stil', seg('emStil', m.stil, STIL), 'trendig veraltet schneller');
    h += feld('Qualität', seg('emQualitaet', m.qualitaet, [1, 2, 3, 4, 5].map((x) => [x, '★'.repeat(x)])));
  } else if (A.schritt === 3) {
    const B = ctx.q.beschaffung();
    h += feld('Beschaffung', `<div class="wahlkarten">${Object.entries(B).map(([k, b]) => `<button class="${m.beschaffung === k ? 'an' : ''}" data-a="emBeschaffung" data-v="${k}"><b>${esc(b.name)}</b><small>${b.vorlauf} Wochen Vorlauf, Mindestabnahme ${geld(b.mindestabnahme)}, ${punkte(b.mehrmarge)} Marge</small></button>`).join('')}</div>`);
    h += feld('Markenbudget je Woche', `<div class="stepper"><button data-a="emBudgetNeu" data-v="-5000">−</button><span><b>${geld(m.budgetWoche)}</b></span><button data-a="emBudgetNeu" data-v="5000">+</button></div>`, 'baut Bekanntheit auf');
  } else {
    h += feld('Name', `<input class="ort gross" data-a="emName" maxlength="22" value="${esc(m.name)}">`);
    if (!A.id) h += feld('Farbe', `<div class="farben">${FARBEN.map((f) => `<button class="${m.farbe === f ? 'an' : ''}" style="background:${f}" data-a="emFarbe" data-v="${f}" aria-label="Farbe ${f}"></button>`).join('')}</div>`, 'für Shop und Karte');
  }
  h += '</div>';
  // Vorschau aus der Engine
  const nWg = Object.values(m.wgAnteile).filter((a) => a > 0).length;
  const kosten = A.id ? u.kosten.neupositionierung : v.kosten;
  h += `<div class="karte vorschau"><div class="mkopf" style="background:${m.farbe}"><b>${esc(m.name)}</b><small>${zielText(m.zielgruppe)} · ${m.kategorie} · ${preisText(m.preislage)} · ${m.stil}</small></div>`;
  h += `<div class="owerte"><div><span>${A.id ? 'Kosten' : 'Einmalkosten'}</span><b data-p="v:kosten">${geld(kosten)}</b></div><div><span>${A.id ? 'Umstellung' : 'Erste Ware in'}</span><b data-p="v:aufbau">${A.id ? u.kosten.neupositionierungWochen : v.aufbauWochen} Wochen</b></div><div><span>Mehrmarge</span><b data-p="v:marge">${punkte(v.mehrmarge)}</b></div></div>`;
  h += `<div class="mzeile"><span>Passung je Region</span></div>${passungZeile(v.passungRegion, 'v:passung')}`;
  h += `<div class="olief">${nWg} Warengruppen · Mindestabnahme ${geld(v.mindestabnahme)} je Order${v.kapazitaetFrei > 0 ? ` · Platz für ${String(v.kapazitaetFrei).replace('.', ',')} weitere Marken` : ''}</div>`;
  if (v.kapazitaetFrei <= 0 && !A.id) h += '<div class="olief warnung">Der Einkauf ist mit den bestehenden Marken ausgelastet: jede weitere Marke kostet Wirkung, mehr Platz bringt eine höhere Stufe der Abteilung Einkauf im HQ.</div>';
  if (!v.ok && v.fehler && !A.id) h += `<div class="olief warnung">${esc(v.fehler)}</div>`;
  h += '</div>';
  const letzte = A.schritt === SCHRITTE.length - 1;
  const gesperrt = !A.id && (!nWg || !v.ok);
  h += `<div class="oknoepfe unten2">${A.schritt > 0 ? '<button data-a="emZurueck">Zurück</button>' : ''}${letzte ? `<button class="gruen" data-a="emFertig"${gesperrt ? ' disabled' : ''}>${A.id ? 'Neu positionieren' : 'Marke gründen'}</button>` : '<button class="gruen" data-a="emWeiter">Weiter</button>'}</div>`;
  return { titel: A.id ? 'Neu positionieren' : 'Marke gründen', unter: `Schritt ${A.schritt + 1} von ${SCHRITTE.length}: ${SCHRITTE[A.schritt]}`, html: h };
}

/** Rückgabe: 'nichts' (keine Neuzeichnung), 'oben' (neu zeichnen, nach oben), sonst neu zeichnen mit gleicher Position. */
export function eigenmarkenAktion(ctx, ui, el, ev, tun) {
  const a = el.dataset.a, v = el.dataset.v, s = ctx.s();
  const A = ui.em.assistent, m = A?.daten;
  const oben = () => { const p = document.getElementById('pinhalt'); setTimeout(() => { p.scrollTop = 0; }, 0); return 'oben'; };
  const karte = (id) => ctx.q.marken(s).marken.find((q) => q.id === id);
  switch (a) {
    case 'emGruenden': ui.em.assistent = { schritt: 0, daten: neuerEntwurf(s) }; ui.seite = 'gruenden'; return oben();
    case 'emPositionieren': {
      const x = karte(v);
      const daten = { name: x.name, farbe: x.farbe, zielgruppe: { ...x.zielgruppe }, kategorie: x.kategorie, preislage: x.preislage, stil: x.stil, qualitaet: x.qualitaet, beschaffung: x.beschaffung, budgetWoche: x.budgetWoche, wgAnteile: Object.fromEntries(x.wgs.map((w) => [w.wg, w.anteilZiel])) };
      ui.em.assistent = { id: v, schritt: 0, daten, alt: structuredClone(daten), nameGesetzt: true };
      ui.seite = 'gruenden';
      return oben();
    }
    case 'emAbbrechen': ui.em.assistent = null; ui.seite = 'eigenmarken'; return oben();
    case 'emSchritt': A.schritt = Number(v); return oben();
    case 'emWeiter':
      A.schritt = Math.min(SCHRITTE.length - 1, A.schritt + 1);
      if (A.schritt === 1 && !Object.keys(m.wgAnteile).length) m.wgAnteile = wgVorschlag(ctx, s, m);
      return oben();
    case 'emZurueck': A.schritt = Math.max(0, A.schritt - 1); return oben();
    case 'emVorlage': {
      const x = ctx.q.vorlagen()[Number(v)];
      Object.assign(m, structuredClone(x.entwurf));
      m.wgAnteile = Object.fromEntries(x.wgs.map((w) => [w, 0.25]));
      if (!A.nameGesetzt) m.name = nameFuer(s, m.zielgruppe.geschlecht);
      A.vorlage = Number(v);
      return '';
    }
    case 'emAlter': m.zielgruppe.alter = v; A.vorlage = undefined; return '';
    case 'emGeschlecht':
      m.zielgruppe.geschlecht = v; A.vorlage = undefined;
      if (!A.nameGesetzt) m.name = nameFuer(s, v);
      if (v === 'kinder' && !['10-13', '13-17', '30-49'].includes(m.zielgruppe.alter)) m.zielgruppe.alter = '10-13';
      if (!A.id) m.wgAnteile = {};
      return '';
    case 'emKategorie': m.kategorie = v; m.wgAnteile = wgVorschlag(ctx, s, m); return '';
    case 'emWg': { const stufen = [0, 0.15, 0.25, 0.4]; const i = stufen.indexOf(m.wgAnteile[v] ?? 0); const n = stufen[(i + 1) % stufen.length]; if (n) m.wgAnteile[v] = n; else delete m.wgAnteile[v]; return ''; }
    case 'emPreis': m.preislage = v; return '';
    case 'emStil': m.stil = v; return '';
    case 'emQualitaet': m.qualitaet = Number(v); return '';
    case 'emBeschaffung': m.beschaffung = v; return '';
    case 'emBudgetNeu': m.budgetWoche = Math.max(0, m.budgetWoche + Number(v)); return '';
    case 'emFarbe': m.farbe = v; return '';
    case 'emName': m.name = el.value.trim() || m.name; A.nameGesetzt = true; return '';
    case 'emFertig': {
      let r;
      if (A.id) {
        const alt = A.alt;
        r = tun({ typ: 'eigenmarkeNeupositionieren', marke: A.id, neu: { name: m.name, zielgruppe: { ...m.zielgruppe }, preislage: m.preislage, stil: m.stil, qualitaet: m.qualitaet } });
        if (r?.ok) {
          if (m.beschaffung !== alt.beschaffung || m.budgetWoche !== alt.budgetWoche) tun({ typ: 'eigenmarkeSetzen', marke: A.id, beschaffung: m.beschaffung, budgetWoche: m.budgetWoche });
          for (const wg of new Set([...Object.keys(alt.wgAnteile), ...Object.keys(m.wgAnteile)])) if ((m.wgAnteile[wg] ?? 0) !== (alt.wgAnteile[wg] ?? 0)) tun({ typ: 'eigenmarkeAnteil', marke: A.id, wg, anteil: m.wgAnteile[wg] ?? 0 });
          ctx.meldung(r.text, true);
        }
      } else r = tun({ typ: 'eigenmarkeGruenden', entwurf: structuredClone(m) });
      if (r?.ok) { ui.em.assistent = null; ui.seite = 'eigenmarken'; }
      return oben();
    }
    case 'emAuf': ui.em.auf = v; ui.em.einstellen = null; return '';
    case 'emEinstellen': ui.em.einstellen = v; return '';
    case 'emEinstellenNein': ui.em.einstellen = null; return '';
    case 'emEinstellenJa': ui.em.einstellen = null; tun({ typ: 'eigenmarkeEinstellen', marke: v }); return '';
    case 'emBudget': { const x = karte(v); tun({ typ: 'eigenmarkeSetzen', marke: v, budgetWoche: Math.max(0, x.budgetWoche + Number(el.dataset.d)) }); return ''; }
    case 'emNeu': if (el.value) tun({ typ: 'eigenmarkeAnteil', marke: el.value, wg: ui.wg, anteil: 0.15 }); return 'nichts';
    default: return 'nichts';
  }
}

/** Sollwerte für data-p der Eigenmarken-Seite (Prüfung in einkauf.js), frisch aus den Engine-Abfragen. */
export function eigenmarkenErwartet(ctx, t, ui) {
  const s = ctx.s(), u = ctx.q.marken(s);
  if (t[0] === 'v') {
    const A = ui.em.assistent, v = ctx.q.vorschau(s, A.daten);
    if (t[1] === 'kosten') return geld(A.id ? u.kosten.neupositionierung : v.kosten);
    if (t[1] === 'aufbau') return `${A.id ? u.kosten.neupositionierungWochen : v.aufbauWochen} Wochen`;
    if (t[1] === 'marge') return punkte(v.mehrmarge);
    if (t[1] === 'passung') return String(v.passungRegion[t[2]]);
  }
  if (t[0] === 'mg') return t[1] === 'anteil' ? pz(u.anteilUmsatz, 1) : t[1] === 'marge' ? punkte(u.mehrmargeSchnitt) : t[1] === 'gefuehrt' ? `${u.gefuehrt} von ${String(u.kapazitaet).replace('.', ',')} sinnvollen` : geld(u.marken.reduce((a, m) => a + m.umsatz13, 0));
  if (t[0] === 'm') {
    const m = u.marken.find((q) => q.id === t[1]);
    if (t[2] === 'umsatz') return geld(m.umsatz13);
    if (t[2] === 'marge') return pz(m.rohertragsquote, 1);
    if (t[2] === 'mehrmarge') return punkte(m.mehrmarge);
    if (t[2] === 'budget') return geld(m.budgetWoche);
    if (t[2] === 'bekanntheit') return String(Math.round(m.bekanntheit));
    if (t[2] === 'aktualitaet') return String(Math.round(m.stilAktualitaet));
    if (t[2] === 'passung') return String(m.passungRegion[t[3]]);
  }
  return '?';
}
