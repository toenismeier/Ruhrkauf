// Eigenmarken-Seite im Einkauf-Panel (E47, Gestaltungssystem UI-NEU.md): oben der Eigenmarkenanteil als Großkennzahl,
// darunter die Kollektionstafel (Marken nach Umsatz, Summe unter dem Strich), dann die Akte der gewählten Marke mit
// Skalen (Bekanntheit, Stil, Passung je Region), Teamleistung, Markenbudget und Entscheidungen. Assistent „Marke gründen“
// bzw. „Neu positionieren“ in fünf Schritten wie Coffee 01 bis 08 (Kacheln, Chips, Stepper, Vorschau).
// Daten über quelle.js aus eigenmarkenUebersicht und eigenmarkeVorschau, Aktionen eigenmarkeGruenden,
// eigenmarkeNeupositionieren, eigenmarkeSetzen, eigenmarkeAnteil, eigenmarkeEinstellen.
import { geld, pz, kwVon, esc } from './format.js';
import * as K from './komponenten.js';
import { teamAufschluesselung, chips, farbpunkt } from './produkte-q24.js';

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
const BESCHAFFUNG_TEXT = { fernost: 'lange Wege, höchste Marge', nahost: 'mittlerer Vorlauf', europa: 'schnell, kleine Mengen' };

/** Skala mit geprüfter Zahl (data-p an der Zahl rechts). */
const skalaP = (name, wert, p) => K.skala(name, wert).replace(/<b>(\d+)<\/b><\/div>$/, `<b${p ? ` data-p="${esc(p)}"` : ''}>$1</b></div>`);
function passung(p, p0) {
  return `<div class="hw-g1-skalen">${REGIONEN.filter((r) => p[r] !== undefined).map((r) => skalaP(r, p[r], p0 ? `${p0}:${r}` : '')).join('')}</div>`;
}
/** Sprecher: Befund zur Kollektion in einem Satz. */
const befund = (text, ton = '') => K.sprecher({ text, unter: 'Eigenmarken · Einkauf', ton });

export function eigenmarkenSeite(ctx, ui, tabs) {
  if (ui.seite === 'gruenden' && ui.em.assistent) return assistent(ctx, ui, tabs);
  ui.seite = 'eigenmarken';
  const s = ctx.s(), u = ctx.q.marken(s);
  const leistungen = new Map((typeof ctx.E?.produkte === 'function' ? ctx.E.produkte(s).marken : []).map((m) => [m.marke, m.leistung]));
  // Hauptfrage: Welche Marke trägt, welche verliert? Kollektionstafel nach Umsatz, Summe unter dem Strich; Akte der gewählten Marke darunter.
  const reihe = [...u.marken].sort((a, b) => b.umsatz13 - a.umsatz13);
  const gesamt = u.marken.reduce((a, m) => a + m.umsatz13, 0);
  const veraltet = reihe.filter((m) => m.status === 'aktiv' && m.stilAktualitaet < 45);
  if (!reihe.some((m) => m.id === ui.em.auf)) ui.em.auf = reihe[0]?.id;
  let h = !reihe.length ? befund('Hartwig führt keine Eigenmarke. Gründe eine über den freien Platz.')
    : veraltet.length ? befund(`${esc(veraltet.map((m) => m.name).join(' und '))} ${veraltet.length === 1 ? 'wirkt' : 'wirken'} veraltet. Ohne Neupositionierung sinkt die Nachfrage.`, 'engpass')
      : befund('Alle aktiven Marken sind im Stil aktuell.');
  h += tabs;
  let x = K.gross([{ label: 'Anteil am Umsatz', wert: pz(u.anteilUmsatz, 1), p: 'mg:anteil' }, { label: 'Mehrmarge', wert: punkte(u.mehrmargeSchnitt), p: 'mg:marge', ton: 'gut', unter: 'zu Fremdware' }]);
  x += '<div data-summenbuch="Kollektionstafel">';
  x += `<h3 class="hw-abschnitt">Kollektionstafel<small data-p="mg:gefuehrt">${u.gefuehrt} von ${String(u.kapazitaet).replace('.', ',')} sinnvollen</small></h3>`;
  x += K.liste([
    ...reihe.map((m) => {
      const st = m.status !== 'aktiv' ? `${STATUS[m.status] ?? m.status}${m.bis !== undefined ? ` bis KW ${kwVon(m.bis)}` : ''}` : m.stilAktualitaet < 45 ? '<span class="hw-schlecht">Stil veraltet</span>' : `${esc(m.stil)}, ${preisText(m.preislage)}`;
      return K.zeile({ was: `${farbpunkt(m.farbe)} ${esc(m.name)}`, unter: `${esc(zielText(m.zielgruppe))} · ${esc(m.kategorie)} · ${st}`, wert: `<span data-s="u">${geld(m.umsatz13)}</span>`, wertUnter: punkte(m.mehrmarge), tippbar: true, attr: `data-a="emAuf" data-v="${esc(m.id)}" aria-expanded="${ui.em.auf === m.id}"${ui.em.auf === m.id ? ' aria-current="true"' : ''}` });
    }),
    ...(u.gefuehrt < u.kapazitaet ? [K.zeile({ was: 'Freier Platz', unter: 'Neue Eigenmarke gründen', tippbar: true, attr: 'data-a="emGruenden"' })] : []),
  ]);
  if (reihe.length) x += `<div class="hw-g1-summe"><span>Umsatz 13 Wochen gesamt</span><b data-summe="u" data-p="mg:umsatz">${geld(gesamt)}</b></div>`;
  x += '</div>';
  if (u.gefuehrt >= u.kapazitaet) x += K.knoepfe(K.knopf('Neue Eigenmarke gründen', 'data-a="emGruenden"', 'zweit')) + '<p class="hw-lese hw-g1-notiz">Die Kapazität ist voll: jede weitere Marke kostet Wirkung.</p>';
  for (const m of reihe.filter((y) => y.id === ui.em.auf)) {
    const veraltetM = m.stilAktualitaet < 45;
    x += `<h3 class="hw-abschnitt hw-g1-akte"><span>${farbpunkt(m.farbe, 16)} ${esc(m.name)}</span><small>${esc(zielText(m.zielgruppe))} · ${esc(m.kategorie)}</small></h3>`;
    const marken = [m.status !== 'aktiv' ? K.marke(`${STATUS[m.status] ?? m.status}${m.bis !== undefined ? ` bis KW ${kwVon(m.bis)}` : ''}`) : veraltetM ? K.marke('Stil veraltet', 'schlecht') : K.marke('aktiv', 'gut'),
      K.marke(preisText(m.preislage)), K.marke(m.stil), K.marke(`Qualität ${m.qualitaet} von 5`), K.marke(m.beschaffungName)];
    if (m.gewachsen) marken.push(K.marke('gewachsene Hartwig-Marke'));
    x += `<div class="hw-statusreihe">${marken.join('')}</div>`;
    x += K.gross([{ label: 'Umsatz 13 Wochen', wert: geld(m.umsatz13), p: `m:${m.id}:umsatz` }, { label: 'Rohertragsquote', wert: pz(m.rohertragsquote, 1), p: `m:${m.id}:marge`, unter: `Mehrmarge <span data-p="m:${esc(m.id)}:mehrmarge">${punkte(m.mehrmarge)}</span>` }]);
    x += K.abschnitt('Marke');
    x += `<div class="hw-g1-skalen">${skalaP('Bekanntheit', m.bekanntheit, `m:${m.id}:bekanntheit`)}${skalaP('Stil aktuell', m.stilAktualitaet, `m:${m.id}:aktualitaet`)}</div>`;
    x += K.abschnitt('Passung je Region') + passung(m.passungRegion, `m:${m.id}:passung`);
    x += teamAufschluesselung(leistungen.get(m.id));
    const wgs = m.wgs.filter((w) => w.anteilZiel > 0 || w.anteilIst > 0);
    x += K.abschnitt('Warengruppen', 'Anteil der Marke');
    x += wgs.length ? K.liste(wgs.map((w) => K.zeile({ was: esc(w.name), wert: pz(w.anteilIst) }))) : K.leer('Noch in keiner Warengruppe.');
    for (const t of m.hinweise ?? []) x += K.hinweis(esc(t), 'achtung');
    if (ui.em.einstellen === m.id) {
      x += K.hinweis(`${esc(m.name)} wirklich einstellen? Die Ware läuft ab.`, 'fehler');
      x += `<div class="hw-knoepfe zweispaltig">${K.knopf('Einstellen der Marke', `data-a="emEinstellenJa" data-v="${esc(m.id)}" data-gefahr`, 'gefahr')}${K.knopf('Behalten', 'data-a="emEinstellenNein"', 'zweit')}</div>`;
    } else {
      x += K.abschnitt('Markenbudget je Woche', 'baut Bekanntheit auf');
      x += K.stepper({ wert: geld(m.budgetWoche), label: 'Markenbudget je Woche', attrMinus: `data-a="emBudget" data-v="${esc(m.id)}" data-d="-5000"`, attrPlus: `data-a="emBudget" data-v="${esc(m.id)}" data-d="5000"`, minusAus: m.budgetWoche <= 0 }).replace('<output>', `<output data-p="m:${esc(m.id)}:budget">`);
      x += `<div class="hw-knoepfe zweispaltig">${K.knopf('Neu positionieren', `data-a="emPositionieren" data-v="${esc(m.id)}"`, 'zweit', m.status !== 'aktiv')}${K.knopf('Einstellen der Marke', `data-a="emEinstellen" data-v="${esc(m.id)}" data-gefahr`, 'gefahr')}</div>`;
    }
  }
  return { titel: 'Eigenmarken', unter: `${u.gefuehrt} Marken · ${pz(u.anteilUmsatz, 1)} vom Umsatz · KW ${kwVon(s.woche)}`, html: `<div class="hw-g1">${h}${K.rumpf(x)}</div>` };
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
  const v = ctx.q.vorschau(s, m);
  const nWg = Object.values(m.wgAnteile).filter((a) => a > 0).length;
  const kosten = A.id ? u.kosten.neupositionierung : v.kosten;
  const gesperrt = !A.id && (!nWg || !v.ok);
  const satz = !A.id && v.kapazitaetFrei <= 0 ? 'Der Einkauf ist ausgelastet: jede weitere Marke kostet Wirkung.'
    : !A.id && !v.ok && v.fehler ? esc(v.fehler)
      : `${esc(m.name)} für ${esc(zielText(m.zielgruppe))}: ${punkte(v.mehrmarge)} Mehrmarge erwartet.`;
  let h = befund(satz, !A.id && (v.kapazitaetFrei <= 0 || !v.ok) ? 'engpass' : '') + tabs;
  h += `<div class="hw-g1-oben">${K.knopf('‹ Eigenmarken', 'data-a="emAbbrechen"', 'text')}</div>`;
  let x = `<ol class="hw-g1-schritte fuenf">${SCHRITTE.map((t, i) => `<li class="${i === A.schritt ? 'an' : i < A.schritt ? 'fertig' : ''}"${i === A.schritt ? ' aria-current="step"' : ''}><button type="button" data-a="emSchritt" data-v="${i}"><i>${i + 1}</i>${t}</button></li>`).join('')}</ol>`;
  const wahl = (act, wert, opt, sperre = false) => chips(opt.map(([w, t]) => [w, esc(String(t))]), wert, (w) => `data-a="${act}" data-v="${esc(String(w))}"`, '', sperre);
  if (A.schritt === 0) {
    if (!A.id) {
      x += K.abschnitt('Vorlage', 'füllt alle Schritte vor');
      x += `<div class="hw-g1-typen">${ctx.q.vorlagen().map((y, i) => `<button type="button" class="hw-g1-typ hw-kontur" aria-pressed="${A.vorlage === i}" data-a="emVorlage" data-v="${i}"><b>${esc(y.titel)}</b><small>${esc(y.entwurf.kategorie)} · ${esc(preisText(y.entwurf.preislage))}</small></button>`).join('')}</div>`;
    }
    x += K.abschnitt('Alter') + wahl('emAlter', m.zielgruppe.alter, alterOptionen(m.zielgruppe.alter));
    x += K.abschnitt('Geschlecht') + wahl('emGeschlecht', m.zielgruppe.geschlecht, GESCHLECHT);
  } else if (A.schritt === 1) {
    x += K.abschnitt('Kategorie', A.id ? 'bleibt bei Neupositionierung' : '') + wahl('emKategorie', m.kategorie, KATEGORIE.map((k) => [k, k]), !!A.id);
    const liste = [...v.passendeWgs].sort((a, b) => b.passung - a.passung);
    x += K.abschnitt('Warengruppen', 'Antippen: 15, 25, 40 % oder aus');
    x += liste.length ? K.liste(liste.map((w) => { const a = m.wgAnteile[w.wg]; return K.zeile({ was: esc(w.name), unter: `${esc(ctx.E.GRUPPEN[w.bereich]?.name ?? w.bereich)} · ${w.passung >= 1 ? 'passt sehr gut' : w.passung >= 0.7 ? 'passt gut' : 'passt bedingt'}`, wert: a ? pz(a) : 'aus', ton: a ? 'gut' : '', tippbar: true, attr: `data-a="emWg" data-v="${esc(w.wg)}" aria-pressed="${!!a}"` }); }))
      : K.leer('Keine Warengruppe passt zu Zielgruppe und Kategorie.');
  } else if (A.schritt === 2) {
    x += K.abschnitt('Preislage');
    x += `<div class="hw-g1-typen drei">${PREIS.map(([w, t], i) => `<button type="button" class="hw-g1-typ hw-kontur" aria-pressed="${m.preislage === w}" data-a="emPreis" data-v="${w}"><b>${t}</b><small>${'€'.repeat(i + 1)}</small></button>`).join('')}</div>`;
    x += K.abschnitt('Stil', 'trendig veraltet schneller') + wahl('emStil', m.stil, STIL);
    x += K.abschnitt('Qualität', `${m.qualitaet} von 5`);
    x += `<div class="hw-g1-qualitaet">${K.stepper({ wert: `${m.qualitaet} von 5`, label: 'Qualität', attrMinus: `data-a="emQualitaet" data-v="${m.qualitaet - 1}"`, attrPlus: `data-a="emQualitaet" data-v="${m.qualitaet + 1}"`, minusAus: m.qualitaet <= 1, plusAus: m.qualitaet >= 5 })}</div>`;
  } else if (A.schritt === 3) {
    const B = ctx.q.beschaffung();
    x += K.abschnitt('Beschaffung');
    x += `<div class="hw-g1-typen eins">${Object.entries(B).map(([k, b]) => `<button type="button" class="hw-g1-typ hw-kontur" aria-pressed="${m.beschaffung === k}" data-a="emBeschaffung" data-v="${k}"><b>${esc(b.name)}</b><small>${b.vorlauf} Wochen Vorlauf · Mindestabnahme ${geld(b.mindestabnahme)} · ${punkte(b.mehrmarge)} Marge</small><small>${esc(BESCHAFFUNG_TEXT[k] ?? '')}</small></button>`).join('')}</div>`;
    x += K.abschnitt('Markenbudget je Woche', 'baut Bekanntheit auf');
    x += K.stepper({ wert: geld(m.budgetWoche), label: 'Markenbudget je Woche', attrMinus: 'data-a="emBudgetNeu" data-v="-5000"', attrPlus: 'data-a="emBudgetNeu" data-v="5000"', minusAus: m.budgetWoche <= 0 });
  } else {
    x += K.abschnitt('Name');
    x += `<input class="hw-g1-eingabe" data-a="emName" maxlength="22" value="${esc(m.name)}" aria-label="Name der Marke">`;
    if (!A.id) x += K.abschnitt('Farbe', 'für Shop und Karte') + `<div class="hw-g1-farben" role="group" aria-label="Markenfarbe">${FARBEN.map((f) => `<button type="button" class="hw-g1-farbknopf" aria-pressed="${m.farbe === f}" data-a="emFarbe" data-v="${f}" aria-label="Farbe ${f}">${farbpunkt(f, 30)}</button>`).join('')}</div>`;
  }
  // Vorschau aus der Engine
  x += `<h3 class="hw-abschnitt">Vorschau<small>${farbpunkt(m.farbe)} ${esc(m.name)}</small></h3>`;
  x += `<p class="hw-lese hw-g1-notiz">${esc(zielText(m.zielgruppe))} · ${esc(m.kategorie)} · ${preisText(m.preislage)} · ${esc(m.stil)}</p>`;
  x += K.gross([{ label: A.id ? 'Kosten' : 'Einmalkosten', wert: geld(kosten), p: 'v:kosten' }, { label: 'Mehrmarge', wert: punkte(v.mehrmarge), p: 'v:marge', ton: 'gut' }]);
  x += K.liste([K.zeile({ was: A.id ? 'Umstellung' : 'Erste Ware in', wert: `<span data-p="v:aufbau">${A.id ? u.kosten.neupositionierungWochen : v.aufbauWochen} Wochen</span>` }),
    K.zeile({ was: 'Warengruppen', wert: String(nWg) }), K.zeile({ was: 'Mindestabnahme je Order', wert: geld(v.mindestabnahme) }),
    ...(v.kapazitaetFrei > 0 ? [K.zeile({ was: 'Platz für weitere Marken', wert: String(v.kapazitaetFrei).replace('.', ',') })] : [])]);
  x += K.abschnitt('Passung je Region') + passung(v.passungRegion, 'v:passung');
  if (v.kapazitaetFrei <= 0 && !A.id) x += K.hinweis('Der Einkauf ist mit den bestehenden Marken ausgelastet: mehr Platz bringt eine höhere Stufe der Abteilung Einkauf im HQ.', 'achtung');
  if (!v.ok && v.fehler && !A.id) x += K.hinweis(esc(v.fehler), 'fehler');
  const letzte = A.schritt === SCHRITTE.length - 1;
  x += `<div class="hw-knoepfe zweispaltig">${A.schritt > 0 ? K.knopf('Zurück', 'data-a="emZurueck"', 'zweit') : K.knopf('Abbrechen', 'data-a="emAbbrechen"', 'zweit')}${letzte ? K.knopf(A.id ? 'Neu positionieren' : 'Marke gründen', 'data-a="emFertig"', '', gesperrt) : K.knopf('Weiter', 'data-a="emWeiter"')}</div>`;
  return { titel: A.id ? 'Neu positionieren' : 'Marke gründen', unter: `Schritt ${A.schritt + 1} von ${SCHRITTE.length}: ${SCHRITTE[A.schritt]}`, html: `<div class="hw-g1">${h}${K.rumpf(x)}</div>` };
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
