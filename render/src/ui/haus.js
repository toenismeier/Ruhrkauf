// Hausdetail (O07, Q30): Hauptfrage „Läuft dieses Haus diese Woche?“
// Oben spricht die Filialleitung den Befund, darunter Umsatz und Deckungsbeitrag mit Abweichung zur Vorwoche und zum
// Vorjahr, fünf Wochen als Balken. Was nur ein Warenhaus hat: der Etagenschnitt. Reiterleiste unten wie Coffee Inc.
// Alle Zahlen kommen aus der Engine (hausDetail, hausUebersicht, verlauf, hausTreiber); hier wird nur dargestellt.
import { esc, fmt, geld, deutscheZahlen } from './format.js';
import * as K from './komponenten.js';
import { portraetSVG, zufallsMerkmale } from '../kit/portraet.js';

const PROZENT = (x) => (Number(x) * 100).toFixed(1).replace('.', ',').replace('-', '−') + ' %';
const p = (n, stell = 0) => Number(n ?? 0).toFixed(stell).replace('.', ',').replace('-', '−');
const REITER = [['ueberblick', 'Haus', 'haus'], ['leitung', 'Leitung', 'leitung'], ['personal', 'Personal', 'personal'], ['ware', 'Ware', 'sortiment'],
  ['partner', 'Fläche', 'flaeche'], ['kosten', 'Kosten', 'kosten'], ['kommentare', 'Notizen', 'notizen']];
const SCHWERPUNKT = { personal: 'Personal', ware: 'Ware', kunde: 'Kunde', kosten: 'Kosten' };
const SERVICE = { kundendienst: 'Kundendienst', schneiderei: 'Änderungsschneiderei', geschenkverpackung: 'Geschenkverpackung', abholstation: 'Abholstation' };
const POSTEN = { energie: 'Energie', reinigung: 'Reinigung', sicherheit: 'Sicherheit', instandhaltung: 'Instandhaltung', versicherung: 'Versicherung' };
const GRUENDE = { wetter: 'Wetter', baustelle: 'Baustelle vor dem Haus', ware: 'Warenverfügbarkeit', personal: 'Personaldeckung', konkurrenz: 'Konkurrenzaktion', kasse: 'Kassenausfall', stadtereignis: 'Stadtereignis', sonstiges: 'Sonstiges' };
const MASS = { aktion: 'Aktion vor Ort', springer: 'Springer anfordern', umlagerung: 'Ware umlagern', oeffnungszeit: 'Öffnungszeit anpassen' };
const STATUS_HAUS = { offen: 'Geöffnet', schliessung_verhandlung: 'Schließung in Verhandlung', raeumung: 'Räumungsverkauf', geschlossen: 'Geschlossen', verkauft: 'Verkauft' };
const LAGE = { '1a': '1a-Lage', b: 'B-Lage', center: 'Center', stadtteil: 'Stadtteilzentrum', rand: 'Stadtrand' };
const REGION = { ost: 'Ost', west: 'West', nord: 'Nord', sued: 'Süd', mitte: 'Mitte' };
export const etageKurz = (e) => (e === -1 ? 'UG' : e === 0 ? 'EG' : `${e}. OG`);
const etageLang = (e) => (e === -1 ? 'Untergeschoss' : e === 0 ? 'Erdgeschoss' : `${e}. Obergeschoss`);
const tun = (art, id, key = '', wert = '') => `onclick="hausTun('${art}','${esc(id)}'${key !== '' ? `,'${esc(key)}'` : ''}${wert !== '' ? `,${wert}` : ''})"`;

// ───────────── Person der Filialleitung (gleiche Merkmale wie im Hausbesuch, Geschlecht passend zum Vornamen)
const WEIBLICH = new Set(['Sabine', 'Petra', 'Andrea', 'Claudia', 'Kerstin', 'Nicole', 'Anja', 'Birgit', 'Silke', 'Heike', 'Melanie', 'Tanja', 'Mara', 'Elin', 'Nora', 'Lea', 'Julia', 'Anna', 'Lena', 'Sarah', 'Laura', 'Katrin', 'Susanne']);
export function personMerkmale(name, seed) {
  const vorname = String(name ?? '').split(' ')[0];
  const soll = WEIBLICH.has(vorname) ? 'w' : /^(Interim|Stellvertretung)/.test(vorname) ? null : vorname.endsWith('a') ? 'w' : 'm';
  let m = zufallsMerkmale(seed);
  for (let i = 1; soll && m.geschlecht !== soll && i < 12; i++) m = zufallsMerkmale(seed + ':' + i);
  return m;
}
export const filialleitungBild = (h, groesse = 72) => portraetSVG(personMerkmale(h.personal?.filialleiter?.name, 'filialleitung:' + h.id), groesse);

// ───────────── Etagenschnitt: was nur ein Warenhaus hat
const FARBE = { damen: '#c87482', herren: '#6f8fb8', kinder: '#d9ad55', beauty: '#b98bc0', schuhe: '#a5836a', accessoires: '#a5836a', 'schuhe & accessoires': '#a5836a',
  waesche: '#de9f98', wäsche: '#de9f98', wohnen: '#86a874', spielwaren: '#df7d4f', food: '#b39f58', feinkost: '#b39f58', sport: '#58a693', sportschuhe: '#58a693', sporttextil: '#4f9a87', outdoor: '#6c9a5a', rad: '#5c86a0', wintersport: '#8fb2c9', teamsport: '#4f8c76' };
const KONZEPTFARBE = { kommission: '#6f8fb8', konzession: '#7aa4c4', untermiete: '#d89a52', offprice: '#c9a547', leer: '#5d5650' };
function flaechenFarbe(f) {
  if (f.konzept === 'leer') return KONZEPTFARBE.leer;
  if (f.konzept === 'untermiete') return KONZEPTFARBE.untermiete;
  const g = String(f.gruppe ?? '').toLowerCase();
  return FARBE[g] ?? FARBE[g.split(/[ &]/)[0]] ?? KONZEPTFARBE[f.konzept] ?? '#8a8178';
}
const dunkler = (hex, f) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * f).toString(16).padStart(2, '0')).join('');
export function etagenschnitt(etagen, { breite = 358 } = {}) {
  const liste = [...etagen].sort((a, b) => b.etage - a.etage);
  const n = liste.length, H = 24, C = Math.cos(Math.PI / 6), W = 150, D = 34, x0 = 10;
  const hoehe = n * H + (W + D) * 0.5 + 18;
  const pt = (x, y, z) => [x0 + (x + y) * C * 0.92, 10 + (D - y + x) * 0.5 * 0.92 + (n * H - z)];
  const poly = (pts, f, extra = '') => `<path d="M${pts.map((q) => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('L')}Z" fill="${f}"${extra}/>`;
  let svg = '';
  liste.slice().reverse().forEach((e, i) => {
    const z0 = i * H + 3, z1 = (i + 1) * H;
    const qm = e.flaechen.reduce((a, f) => a + f.qm, 0) || 1;
    // linke Seite (+y nach vorn): Flächen der Etage nebeneinander
    let x = 0;
    for (const f of e.flaechen) {
      const w = (f.qm / qm) * W;
      const umbau = f.umbauBis !== undefined;
      svg += poly([pt(x, 0, z0), pt(x + w, 0, z0), pt(x + w, 0, z1), pt(x, 0, z1)], umbau ? '#6b625a' : flaechenFarbe(f), ' stroke="#1d1916" stroke-width="0.6"');
      if (umbau) for (let k = x + 4; k < x + w; k += 7) svg += `<path d="M${pt(k, 0, z0).join(' ')}L${pt(Math.min(x + w, k + 5), 0, z1).join(' ')}" stroke="#e7b04b" stroke-width="1.2"/>`;
      x += w;
    }
    if (!e.flaechen.length) svg += poly([pt(0, 0, z0), pt(W, 0, z0), pt(W, 0, z1), pt(0, 0, z1)], KONZEPTFARBE.leer);
    // rechte Seite (Giebel, Schatten), Decke als Fuge
    svg += poly([pt(W, 0, z0), pt(W, D, z0), pt(W, D, z1), pt(W, 0, z1)], '#5b534c');
    for (let k = 1; k < 4; k++) svg += poly([pt(W, D * k / 4 - 4, z0 + 7), pt(W, D * k / 4 + 4, z0 + 7), pt(W, D * k / 4 + 4, z1 - 5), pt(W, D * k / 4 - 4, z1 - 5)], '#3b3530');
    svg += poly([pt(0, 0, z0 - 3), pt(W, 0, z0 - 3), pt(W, 0, z0), pt(0, 0, z0)], '#d9d1c7') + poly([pt(W, 0, z0 - 3), pt(W, D, z0 - 3), pt(W, D, z0), pt(W, 0, z0)], '#a69c91');
    // Beschriftung rechts
    const [lx, ly] = pt(W, D, (z0 + z1) / 2);
    const gruppen = [...new Set(e.flaechen.filter((f) => f.konzept !== 'leer').map((f) => f.konzept === 'untermiete' ? (f.mieter ?? 'Untermieter') : f.gruppe).filter(Boolean))];
    const text = gruppen.slice(0, 2).join(', ') + (gruppen.length > 2 ? ` +${gruppen.length - 2}` : '') || (e.flaechen.length ? 'Leerfläche' : 'keine Fläche');
    svg += `<text x="${(lx + 14).toFixed(1)}" y="${(ly + 4).toFixed(1)}" font-size="12" fill="var(--le, #a89e93)"><tspan font-weight="700" fill="var(--tx, #f3eee8)">${etageKurz(e.etage)}</tspan> ${esc(text)}</text>`;
  });
  // Dach
  const top = n * H;
  svg += poly([pt(0, 0, top), pt(W, 0, top), pt(W, D, top), pt(0, D, top)], '#4a423b') + poly([pt(0, 0, top), pt(W, 0, top), pt(W, 0, top + 3), pt(0, 0, top + 3)], '#d23c32');
  return `<svg class="hw-etagenschnitt" viewBox="0 0 ${breite} ${hoehe.toFixed(0)}" role="img" aria-label="Etagenschnitt mit ${n} Etagen">${svg}</svg>`;
}

// ───────────── Befund der Filialleitung
function befund(h, k, b, vorjahr, vorwoche) {
  const name = h.personal?.filialleiter?.name ?? 'Filialleitung';
  if (h.status !== 'offen') return { text: `<b>${esc(STATUS_HAUS[h.status] ?? 'Nicht geöffnet')}.</b> Das Haus erwirtschaftet in diesem Zustand keinen regulären Umsatz.`, ton: 'alarm', name };
  if (!k) return { text: '<b>Die erste Woche läuft noch.</b> Zahlen gibt es nach dem ersten Wochenabschluss.', ton: '', name };
  const funde = [];
  if (k.db < 0) funde.push({ g: 3, t: `Wir verlieren diese Woche ${geld(-k.db)}.`, ton: 'alarm' });
  if (vorjahr > 0 && k.umsatz / vorjahr - 1 < -0.05) funde.push({ g: 2, t: `Der Umsatz liegt ${p(Math.abs(k.umsatz / vorjahr - 1) * 100, 1)} % unter Vorjahr.`, ton: 'engpass' });
  const fehlen = (k.fteBedarf ?? 0) - (k.fteIst ?? 0);
  if (k.fteBedarf > 0 && fehlen / k.fteBedarf > 0.08) funde.push({ g: 2, t: `Uns fehlen ${p(fehlen, 0)} Vollzeitkräfte auf der Fläche.`, ton: 'engpass' });
  if (h.substanz < 35) funde.push({ g: 2, t: `Die Substanz ist kritisch (${Math.round(h.substanz)} von 100).`, ton: 'engpass' });
  if ((b?.kundenScore ?? 100) < 50) funde.push({ g: 1, t: `Mystery Shopping nur ${b.kundenScore} von 100.`, ton: 'engpass' });
  if (h.personal?.filialleiter?.interimBis > 0) funde.push({ g: 1, t: 'Die Hausleitung ist nur interimistisch besetzt.', ton: 'engpass' });
  // Q35: größte Kostenabweichung zum Budget (eine Quelle: Engine kostenAbweichung).
  const ka = b?.kostenAbweichung, kaText = ka && Math.abs(ka.abweichung) >= 0.005
    ? `${POSTEN[ka.posten] ?? ka.posten} liegt ${p(Math.abs(ka.abweichung) * 100, 0)} % ${ka.abweichung > 0 ? 'über' : 'unter'} Budget.` : '';
  if (ka && ka.abweichung >= 0.05) funde.push({ g: 1, t: kaText, ton: 'engpass' });
  funde.sort((a, c) => c.g - a.g);
  if (!funde.length) {
    const vj = vorjahr > 0 ? ` Umsatz ${k.umsatz >= vorjahr ? '+' : '−'}${p(Math.abs(k.umsatz / vorjahr - 1) * 100, 1)} % zum Vorjahr.` : vorwoche ? ` Umsatz ${k.umsatz >= vorwoche ? 'über' : 'unter'} Vorwoche.` : '';
    return { text: `Das Haus läuft.${vj}`, ton: '', name };
  }
  return { text: esc(funde[0].t), ton: funde[0].ton, name }; // E47: ein Befund, ein Satz (Coffee-Sprecherzeile)
}

/** Komplettes Hausdetail. c = { E, s, d, b, reiter, zustand, verlaufU, verlaufD, vorjahr, treiber, umbauKarte, personalBlock, innen, shops, wbArt, wbStatus } */
export function hausDetailHtml(c) {
  const { d, b, reiter } = c, h = d.haus, k = h.kpi, id = h.id;
  const r = REITER.some((x) => x[0] === reiter) ? reiter : 'ueberblick';
  const uPunkte = c.verlaufU?.punkte ?? [], dPunkte = c.verlaufD?.punkte ?? [];
  const vorwoche = uPunkte.length > 1 ? uPunkte[uPunkte.length - 2].wert : null, vorwocheDb = dPunkte.length > 1 ? dPunkte[dPunkte.length - 2].wert : null;
  const bf = befund(h, k, b, c.vorjahr, vorwoche);
  let html = K.bereich('haus') + K.sprecher({ text: bf.text, unter: bf.name + ' · Filialleitung', person: filialleitungBild(h, 72), ton: bf.ton });
  let inhalt = '';
  if (r === 'ueberblick') inhalt = ueberblick(c, h, k, vorwoche, vorwocheDb, uPunkte, dPunkte);
  if (r === 'leitung') inhalt = leitung(c, h, b);
  if (r === 'personal') inhalt = personal(c, h, k);
  if (r === 'ware') inhalt = sortiment(c, h, k);
  if (r === 'partner') inhalt = partner(c, h, b);
  if (r === 'kosten') inhalt = kosten(c, h, k, b);
  if (r === 'kommentare') inhalt = kommentare(c, h, b);
  // E47: Überblick zeigt oben ein Fenster auf das Haus in der Stadt (Kamera fokussiert es), wie das Ladenbild bei Coffee.
  if (r === 'ueberblick') html += `<div class="hw-fenster"><button type="button" class="hw-bildknopf hw-kontur" data-hausbesuch="${esc(id)}" aria-label="Haus besuchen">${K.SYMBOLE.etagen}</button></div><div class="hw-boden">${K.rumpf(inhalt)}</div>`;
  else html += K.rumpf(inhalt);
  html += K.reiterUnten(REITER, r, (key) => `class="haus-reiter-knopf" data-reiter="${key}" onclick="hausReiterWahl('${key}')"`).replace('class="hw-reiter"', 'class="hw-reiter haus-reiter"');
  return html;
}

function ueberblick(c, h, k, vorwoche, vorwocheDb, uPunkte, dPunkte) {
  const { d, b, E, s } = c, id = h.id;
  let x = '';
  const umsatz = k?.umsatz ?? 0, db = k?.db ?? 0;
  const pz = (q) => q == null || !Number.isFinite(q) ? '' : ` (${q > 0 ? '+' : q < 0 ? '−' : '±'}${p(Math.abs(q) * 100, 1)} %)`;
  const abw = (diff, basis) => `<span class="${diff > 0 ? 'gut' : diff < 0 ? 'schlecht' : ''}">${diff >= 0 ? '+' : '−'}${geld(Math.abs(diff))}${pz(basis ? diff / Math.abs(basis) : null)}</span>`;
  const vjQ = c.vorjahr > 0 ? (umsatz - c.vorjahr) / c.vorjahr : null;
  x += K.gross([
    { label: 'Umsatz Woche', wert: geld(umsatz), p: 'haus:umsatz', unter: (vorwoche == null ? 'erste Woche' : abw(umsatz - vorwoche, vorwoche)) + '<br>' + (vjQ == null ? 'Vorjahr fehlt' : `Vorjahr <span class="${vjQ > 0 ? 'gut' : vjQ < 0 ? 'schlecht' : ''}">${vjQ >= 0 ? '+' : '−'}${p(Math.abs(vjQ) * 100, 1)} %</span>`) },
    { label: 'Deckungsbeitrag', wert: geld(db), ton: db < 0 ? 'schlecht' : 'gut', p: 'haus:db', unter: (vorwocheDb == null ? 'erste Woche' : abw(db - vorwocheDb, vorwocheDb)) + `<br>${umsatz ? p(100 * db / umsatz, 1) + ' % vom Umsatz' : '0 % vom Umsatz'}` },
  ]);
  const kw = (q) => String((q.woche % 52) + 1);
  const letzte = uPunkte.slice(-5);
  x += K.balkenPaar([
    { titel: letzte.length ? `Umsatz KW ${kw(letzte[0])}–${kw(letzte[letzte.length - 1])}` : 'Umsatz', serie: 'a', punkte: letzte.map((q) => ({ label: kw(q), wert: q.wert })) },
    { titel: 'Deckungsbeitrag', serie: 'b', punkte: letzte.map((q) => ({ label: kw(q), wert: dPunkte.find((z) => z.woche === q.woche)?.wert ?? 0 })) },
  ]);
  // Status in einer Zeile
  const marken = [K.marke(STATUS_HAUS[h.status] ?? h.status, h.status === 'offen' ? '' : 'schlecht')];
  if (h.klasse === 'premium') marken.push(K.marke('Premiumhaus', 'achtung'));
  if (c.zustand) marken.push(K.marke(c.zustand, 'achtung'));
  marken.push(K.marke(LAGE[h.lage] ?? 'Lage offen'));
  x += `<div class="hw-statusreihe">${marken.join('')}</div>`;
  x += `<div class="hw-knoepfe">${(() => { const et = typeof E.umbauHaus === 'function' ? [...(E.umbauHaus(s, id) ?? [])].sort((a, z) => a.substanz - z.substanz)[0] : null; return et ? K.knopf('Umbau planen', `data-umbau="planen" data-id="${esc(id)}" data-etage="${et.etage}"`, 'zweit') : ''; })()}</div>`;
  // Etagen: der Schnitt durch das Haus
  const qm = h.flaechen.reduce((a, f) => a + f.qm, 0);
  x += K.abschnitt('Etagen', fmt.format(qm) + ' qm Verkaufsfläche');
  x += `<div class="hw-etagen">${etagenschnitt(d.etagen)}</div>`;
  if (c.innen) x += c.innen;
  x += K.liste([...d.etagen].sort((a, e) => e.etage - a.etage).map((e) => {
    const eqm = e.flaechen.reduce((a, f) => a + f.qm, 0);
    const umsatzQm = eqm ? e.flaechen.reduce((a, f) => a + (f.umsatzQm ?? 0) * f.qm, 0) / eqm : 0;
    const namen = e.flaechen.map((f) => f.konzept === 'untermiete' ? (f.mieter ?? 'Untermieter') : f.konzept === 'leer' ? 'Leerfläche' : f.gruppe).filter(Boolean);
    const umbau = e.flaechen.some((f) => f.umbauBis !== undefined && f.umbauBis > s.woche);
    return K.zeile({ was: `${etageLang(e.etage)}${umbau ? ' · <span class="hw-achtung">Umbau</span>' : ''}`, unter: esc([...new Set(namen)].join(', ') || 'keine Fläche') + ' · ' + fmt.format(eqm) + ' qm',
      wert: umsatzQm ? fmt.format(Math.round(umsatzQm)) + ' €' : '0 €', wertUnter: 'je qm', tippbar: true, attr: `onclick="hausKlick('etage','${esc(id)}',${e.etage})" aria-label="${esc(etageLang(e.etage))} von innen ansehen"` });
  }));
  // Umsatztreiber
  const t = c.treiber;
  if (t) {
    const v = t.vorjahr, a = t.aktuell;
    const d1 = (ist, alt) => { if (!alt) return 'Vorjahr fehlt'; const q = (ist - alt) / alt; return `<span class="${q > 0 ? 'gut' : q < 0 ? 'schlecht' : ''}">${q >= 0 ? '+' : '−'}${p(Math.abs(q) * 100, 1)} %</span> Vorjahr`; };
    x += K.abschnitt('Umsatztreiber', 'Frequenz × Kaufquote × Bon');
    x += `<div class="o02-haus" data-o02-haus="${esc(id)}" data-o02-umsatz="${a.umsatz}" data-o02-frequenz="${a.frequenz}" data-o02-kaufquote="${a.kaufquote}" data-o02-bon="${a.bon}">${K.gross([
      { label: 'Frequenz', wert: fmt.format(Math.round(a.frequenz)), unter: d1(a.frequenz, v?.frequenz) },
      { label: 'Kaufquote', wert: PROZENT(a.kaufquote), unter: d1(a.kaufquote, v?.kaufquote) },
      { label: 'Bon', wert: geld(a.bon), unter: d1(a.bon, v?.bon) }])}</div>`;
  } else x += K.abschnitt('Umsatztreiber') + K.leer('Frequenz, Kaufquote und Bon gibt es nach dem ersten Wochenabschluss.');
  // Filial-GuV
  if (d.guv) x += guv(E, d.guv);
  // Kunden und Standort
  x += K.abschnitt('Kunden und Standort');
  x += K.liste([
    K.zeile({ was: 'Mystery Shopping', wert: `${b?.kundenScore ?? 0} / 100`, ton: (b?.kundenScore ?? 0) < 50 ? 'schlecht' : '' }),
    K.zeile({ was: 'Region', wert: esc(REGION[String(h.region ?? '').toLowerCase()] ?? h.stadt) }),
    K.zeile({ was: 'Stadtgröße', wert: h.cluster === 'metropole' ? 'Metropole' : h.cluster === 'grossstadt' ? 'Großstadt' : 'Mittelstadt' }),
    K.zeile({ was: 'Umsatzplan diese Woche', wert: Number.isFinite(b?.planWoche) ? geld(b.planWoche) : 'kein Plan' }),
    K.zeile({ was: 'Baujahr und Substanz', wert: `${h.baujahr} · ${Math.round(h.substanz)} / 100`, ton: h.substanz < 35 ? 'schlecht' : '' }),
  ]);
  if (c.umbauKarte) x += c.umbauKarte;
  x += c.formate ?? '';
  // Online und Logistik
  if (d.ecommerce && h.format === 'warenhaus') {
    const o = d.ecommerce;
    x += K.abschnitt('Online und Filiallogistik') + K.liste([
      K.zeile({ was: 'Abholungen', wert: fmt.format(o.abholungen) }), K.zeile({ was: 'Versand aus dem Haus', wert: fmt.format(o.versand) }),
      K.zeile({ was: 'Retouren im Haus', wert: fmt.format(o.retouren) }), K.zeile({ was: 'Instore-Logistik', wert: p(o.instoreStunden, 1) + ' Std.' }),
      K.zeile({ was: 'Abholstation · Ship-from-Store', wert: `${o.station ? 'vorhanden' : 'keine'} · ${o.versandAn ? 'aktiv' : 'aus'}` })]);
  }
  // Konkurrenz
  x += K.abschnitt('Konkurrenz in der Stadt', `${d.wettbewerber?.length ?? 0} Häuser`);
  x += d.wettbewerber?.length ? K.liste(d.wettbewerber.map((w) => {
    const wirkung = Object.entries(w.wirkung ?? {}).filter(([, v]) => v < 0).sort((a, z) => a[1] - z[1]).slice(0, 2).map(([g, v]) => esc(E.GRUPPEN[g]?.name ?? g) + ' ' + v.toFixed(2).replace('.', ',') + ' %').join(' · ');
    return K.zeile({ was: esc(w.name), unter: esc(c.wbArt[w.art] ?? w.art) + ' · ' + esc(c.wbStatus[w.status] ?? w.status) + (wirkung ? ' · ' + wirkung : ''), tippbar: true, attr: `data-wb-id="${esc(w.id)}"` });
  })) : K.leer('Keine Wettbewerber in dieser Stadt.');
  // Sanierungsprogramme wirken auf das ganze Filialnetz
  x += K.abschnitt('Sanierungsprogramme', 'gelten für alle Häuser');
  x += K.liste(Object.entries(E.FILIAL_PROGRAMME).map(([programm, def]) => {
    const st = d.programme?.[programm];
    const status = st ? (s.woche < st.wirksamAb ? 'Anlauf bis KW ' + (((st.wirksamAb + 1) - 1) % 52 + 1) : 'Wirksam') : def.vorlauf + ' Wochen Vorlauf';
    return `<div class="hw-zeile"><span class="hw-was">${esc(def.name)}<small>${esc(status)} · ${esc(def.nebenwirkung)}</small></span>${st ? K.marke(s.woche < st.wirksamAb ? 'Anlauf' : 'Wirksam', 'gut') : K.knopf('Starten', `onclick="filialProgramm('${programm}')"`, 'zweit')}</div>`;
  }));
  return x;
}

function guv(E, g) {
  const umsatz = g.umsatz || 0;
  const q = (v) => umsatz ? p(100 * v / umsatz, 1) + ' %' : '0 %';
  const ref = (id) => { const r = E.REFERENZ_FILIAL_GUV.find((z) => z.id === id); return r ? p(r.ist, 1) + ' %' : ''; };
  const z = (id, name, v) => ({ name, werte: [geld(v), q(v), ref(id)], roh: [Math.round(v), null, null], ton: [v < 0 ? 'schlecht' : '', '', ''] });
  const sp = ['Woche', 'Anteil', 'Referenz'];
  const t1 = K.tabelle({ titel: 'Ertrag', spalten: sp, zeilen: [z('umsatz', 'Umsatz', g.umsatz), z('wareneinsatz', 'Wareneinsatz', -g.wareneinsatz)],
    summe: z('bruttogewinn', 'Bruttogewinn', g.bruttogewinn), pruefen: Math.abs(g.umsatz - g.wareneinsatz - g.bruttogewinn) < 1 });
  const kosten = E.GUV_KOSTEN.map((id) => z(id, E.REFERENZ_FILIAL_GUV.find((r) => r.id === id)?.name ?? id, -g[id]));
  const t2 = K.tabelle({ titel: 'Kosten', spalten: sp, zeilen: [z('bruttogewinn', 'Bruttogewinn', g.bruttogewinn), z('uebrigeErtraege', 'Übrige betriebliche Erträge', g.uebrigeErtraege), ...kosten],
    summe: z('ebitda', 'EBITDA Filialebene', g.ebitda), pruefen: true });
  return K.abschnitt('Filial-GuV') + `<div data-summen-name="Filial-GuV">${t1}<div class="hw-abstand"></div>${t2}</div>` + K.hinweis('Ohne Zentrale. Referenz: Anteil am Umsatz laut Vorgabe; Einzel-OPEX liegt 44,6 % unter Vorgabe, Total OPEX 42,4 %. Keine Ausgleichsbuchung.');
}

function leitung(c, h, b) {
  const l = b?.leitungsdaten, id = h.id;
  // E47: Personenblock wie Coffee 28 – Porträtrahmen links, Name und Fähigkeiten rechts.
  let x = K.abschnitt('Filialleitung');
  x += `<div class="hw-person"><div class="hw-portraet hw-kontur">${filialleitungBild(h, 104)}</div><div class="hw-person-daten"><h3 class="hw-person-name">${esc(l?.name ?? 'Nicht besetzt')}</h3>`
    + `<span class="hw-marke">Fähigkeiten</span>${Object.entries(l?.staerken ?? {}).map(([key, v]) => K.skala(SCHWERPUNKT[key] ?? key, v * 100)).join('')}${K.skala('Stimmung', l?.moral ?? 0)}${K.skala('Ehrlichkeit', (l?.ehrlichkeit ?? 0) * 100)}</div></div>`;
  x += `<div class="hw-felder"><div class="hw-feld"><span class="hw-marke hw-feldname">Jahresgehalt</span><b class="hw-feldwert">${geld(l?.gehalt ?? 0)}</b><small class="hw-feldunter">Bonus ${PROZENT(l?.bonusAnteil ?? 0)}</small></div>`
    + `<div class="hw-feld"><span class="hw-marke hw-feldname">${l?.interimBis ? 'Interim bis' : 'Stellvertretung'}</span><b class="hw-feldwert">${l?.interimBis ? 'KW ' + ((l.interimBis % 52) + 1) : esc(l?.stellvertretung?.name ?? 'nicht benannt')}</b><small class="hw-feldunter">${l?.interimBis ? '' : 'Qualität ' + PROZENT(l?.stellvertretung?.qualitaet ?? 0)}</small></div></div>`;
  if ((l?.wechselwille ?? 0) > 0.3) x += K.hinweis(`Wechselwille ${PROZENT(l.wechselwille)}: Eine Halteprämie senkt das Risiko.`, 'achtung');
  else x += K.hinweis(`Wechselwille ${PROZENT(l?.wechselwille ?? 0)}.`);
  x += K.abschnitt('Fördern', 'eine Stärke je Woche');
  x += `<div class="hw-knoepfe zweispaltig">${Object.keys(SCHWERPUNKT).map((key) => K.knopf(SCHWERPUNKT[key], tun('foerdern', id, key), 'zweit')).join('')}</div>`;
  x += `<div class="hw-knoepfe zweispaltig">${K.knopf('Halteprämie 10.000 €', tun('praemie', id), 'zweit')}${K.knopf('Zur Clusterleitung befördern', tun('befoerdern', id), 'zweit')}</div>`;
  x += K.abschnitt('Kandidaten über die Clusterleitung', `${b?.kandidaten?.length ?? 0} Personen`);
  x += b?.kandidaten?.length ? K.liste(b.kandidaten.map((k, i) => `<div class="hw-zeile"><span class="hw-was">${esc(k.name)}<small>Kompetenz ${PROZENT(k.qualitaet)} · ${geld(k.gehalt)} im Jahr</small></span>${K.knopf('Einstellen', tun('ersetzen', id, '', i), 'zweit')}</div>`))
    : K.leer('Die Clusterleitung hat gerade niemanden vorgeschlagen.');
  return x;
}

function personal(c, h, k) {
  const v = h.personal, ist = k?.fteIst ?? 0, bedarf = k?.fteBedarf ?? 0;
  let x = K.gross([{ label: 'Besetzt', wert: p(ist, 1) + ' FTE', ton: bedarf && ist / bedarf < 0.92 ? 'schlecht' : '' }, { label: 'Bedarf', wert: p(bedarf, 1) + ' FTE', unter: bedarf ? (ist >= bedarf ? 'gedeckt' : `<span class="schlecht">${p(bedarf - ist, 1)} FTE fehlen</span>`) : 'kein Bedarf ermittelt' }]);
  // Figuren zählen sichtbar: eine Figur je 5 FTE Bedarf, gefüllt so weit besetzt
  const slots = Math.max(1, Math.min(30, Math.round(bedarf / 5))), voll = Math.min(slots, Math.round(ist / 5));
  x += `<div class="hw-figuren" role="img" aria-label="${voll} von ${slots} Figuren besetzt, je 5 FTE">${Array.from({ length: slots }, (_, i) => `<i class="${i < voll ? 'an' : ''}"></i>`).join('')}</div>`;
  const summe = v.vollzeit + v.teilzeit + v.aushilfen;
  x += K.tabelle({ titel: 'Verträge', spalten: ['FTE'], zeilen: [
    { name: 'Vollzeit', werte: [p(v.vollzeit, 1)], roh: [Math.round(v.vollzeit * 10)] }, { name: 'Teilzeit', werte: [p(v.teilzeit, 1)], roh: [Math.round(v.teilzeit * 10)] },
    { name: 'Aushilfen', werte: [p(v.aushilfen, 1)], roh: [Math.round(v.aushilfen * 10)] }],
    summe: { name: 'Vertrags-FTE', werte: [p(summe, 1)], roh: [Math.round(v.vollzeit * 10) + Math.round(v.teilzeit * 10) + Math.round(v.aushilfen * 10)] }, pruefen: true });
  x += K.liste([K.zeile({ was: 'Personalkosten Woche', wert: geld(k?.personal ?? 0) })]);
  if (c.personalBlock) x += K.abschnitt('Einsatzplanung') + c.personalBlock;
  return x;
}

function sortiment(c, h, k) {
  const { E, d } = c;
  const liste = Object.entries(k?.umsatzJeGruppe ?? {}).sort((a, b) => b[1] - a[1]);
  const summe = liste.reduce((a, [, w]) => a + Math.round(w), 0);
  let x = '';
  if (d.waren) x += K.gross([{ label: 'Warenverfügbarkeit', wert: PROZENT(d.waren.verfuegbarkeit), ton: d.waren.verfuegbarkeit < 0.9 ? 'schlecht' : '' }, { label: 'Altware', wert: PROZENT(d.waren.altwareanteil), ton: d.waren.altwareanteil > 0.2 ? 'schlecht' : '' }]);
  x += liste.length ? K.tabelle({ titel: 'Umsatz je Warengruppe', spalten: ['Woche', 'Anteil'], zeilen: liste.map(([g, w]) => ({ name: E.GRUPPEN[g]?.name ?? (g === 'schuhe' ? 'Schuhe' : g), werte: [geld(w), summe ? p(100 * w / summe, 1) + ' %' : '0 %'], roh: [Math.round(w), null] })),
    summe: { name: 'Summe Warengruppen', werte: [geld(summe), '100 %'], roh: [summe, null] }, pruefen: true }) : K.abschnitt('Umsatz je Warengruppe') + K.leer('Noch kein Wochenumsatz verbucht.');
  if (d.waren) x += K.abschnitt('Ware im Haus', d.waren.hauscluster) + K.liste([
    K.zeile({ was: 'Inventurdifferenz', wert: d.waren.inventur ? geld(d.waren.inventur.differenz) : 'noch offen' }),
    K.zeile({ was: 'Flächenproduktivität', wert: geld(d.waren.flaechenproduktivitaet) + ' je qm' })]);
  return x;
}

function partner(c, h, b) {
  const id = h.id, std = b?.standard;
  let x = K.abschnitt('Hausstandards', 'Stufe 1 bis 3');
  x += [['sauberkeit', 'Sauberkeit'], ['praesentation', 'Warenpräsentation'], ['kasse', 'Kassenstandard']].map(([key, name]) =>
    K.feld(name, K.stepper({ wert: `Stufe ${p(std?.[key])}`, label: name, attrMinus: tun('standard', id, key, -1), attrPlus: tun('standard', id, key, 1), minusAus: (std?.[key] ?? 1) <= 1, plusAus: (std?.[key] ?? 3) >= 3 }))).join('') + '</div>';
  x += K.abschnitt('Öffnungszeiten', 'gilt für den Hauscluster');
  x += '<div class="hw-felder">' + [['von', 'Öffnung ab'], ['bis', 'Öffnung bis'], ['samstagBis', 'Samstag bis']].map(([feld, titel]) =>
    K.feld(titel, K.stepper({ wert: `${p(std?.oeffnung?.[feld])} Uhr`, label: titel, attrMinus: tun('stunden', id, feld, -1), attrPlus: tun('stunden', id, feld, 1) }))).join('') + '</div>';
  x += K.abschnitt('Services');
  const services = Object.entries(b?.services ?? {});
  x += services.length ? K.liste(services.map(([key, an]) => K.schalter({ text: SERVICE[key] ?? key, unter: an ? 'in diesem Haus aktiv' : 'in diesem Haus aus', an, attr: tun('service', id, key, String(!an)) })))
    + K.abschnitt('Services im ganzen Hauscluster') // Q32: eigene Knöpfe statt verwaister unterstrichener Links
    + `<div class="hw-knoepfe zweispaltig q32-cluster">${services.map(([key, an]) => K.knopf(`${SERVICE[key] ?? key} ${an ? 'überall aus' : 'überall an'}`, tun('clusterservice', id, key, String(!an)), 'zweit')).join('')}</div>` : K.leer('Keine Services hinterlegt.');
  x += K.abschnitt('Gastronomie', p(b?.restaurantQm) + ' qm Restaurantfläche');
  x += K.seg([['selbst', 'Selbst betreiben'], ['pacht', 'Verpachten']], b?.gastro ?? '', (w) => tun('gastro', id, w));
  x += K.liste([K.zeile({ was: 'Betriebsform', wert: b?.gastro === 'selbst' ? 'Eigenbetrieb' : b?.gastro === 'pacht' ? 'Verpachtet' : 'Noch keine' }), K.zeile({ was: 'Vertrag bis', wert: b?.gastroVertragBis != null ? 'KW ' + ((b.gastroVertragBis % 52) + 1) : 'ohne Vertrag' })]);
  x += K.abschnitt('Stadt und Sonntagsverkauf');
  x += K.liste([K.zeile({ was: 'Umfeld', wert: esc(b?.umfeld?.ereignis ?? 'Regulär') }), K.zeile({ was: 'Innenstadtfrequenz', wert: PROZENT(b?.umfeld?.trend ?? 1) })]);
  x += K.knoepfe(K.knopf('Verkaufsoffenen Sonntag beantragen', tun('sonntag', id), 'zweit breit'));
  const partnerZeilen = (b?.flaechen ?? []).map((f) => {
    const info = b?.konzessionen?.[f.id];
    return K.zeile({ was: (f.konzept === 'konzession' ? 'Konzession ' : 'Untermiete ') + esc(f.gruppe ?? f.mieter?.name ?? 'ohne Namen'), wert: fmt.format(Math.round(f.qm)) + ' qm', wertUnter: info ? PROZENT(info.quote) + ' Umsatzmiete' : '' });
  });
  x += K.abschnitt('Konzessionäre und Untermieter', `${partnerZeilen.length} Verträge`) + (partnerZeilen.length ? K.liste(partnerZeilen) : K.leer('Keine Verträge hinterlegt.'));
  if (b?.ausnahmeGrund) x += K.hinweis('Haus-Ausnahme: ' + esc(b.ausnahmeGrund), 'achtung');
  return x;
}

// Q35: Verbrauch zum Budget je Posten (Engine kostenIst); 100 % Budget heißt nicht 100 % Verbrauch.
const verbrauch = (ist) => ist == null || Math.abs(ist - 1) < 0.005 ? 'Ist im Plan' : `Ist ${ist > 1 ? '+' : '−'}${p(Math.abs(ist - 1) * 100, 0)} %`;
function kosten(c, h, k, b) {
  const id = h.id;
  let x = K.gross([{ label: 'Betriebskosten Woche', wert: geld(k?.sonstige ?? 0) }, { label: 'Energiepreis', wert: PROZENT(b?.energiePreis ?? 1), unter: 'zum Ausgangswert' }]);
  x += K.abschnitt('Budget je Posten', '100 % = Ausgangsbudget');
  x += '<div class="hw-felder">' + Object.entries(POSTEN).map(([key, name]) =>
    K.feld(name, K.stepper({ wert: PROZENT(b?.kosten?.[key] ?? 1), unter: verbrauch(b?.kostenIst?.[key]), label: name, attrMinus: tun('kosten', id, key, -0.1), attrPlus: tun('kosten', id, key, 0.1) }))).join('') + '</div>';
  x += K.hinweis('Weniger Reinigung senkt den Kundenscore; weniger Sicherheit und Instandhaltung erhöhen Betriebsrisiken.', 'achtung');
  return x;
}

function kommentare(c, h, b) {
  const id = h.id;
  let x = K.abschnitt('Wochenkommentierung', 'Abweichungen unter −5 %');
  x += b?.kommentare?.length ? K.liste(b.kommentare.map((q) => K.zeile({ was: `KW ${(q.woche % 52) + 1} · ${esc(GRUENDE[q.grund] ?? q.grund)}`, unter: esc(MASS[q.massnahme] ?? q.massnahme) + ' · ' + esc(q.pruefung), wert: PROZENT(q.abweichung), ton: q.abweichung < 0 ? 'schlecht' : '' })))
    : K.leer('Noch keine Abweichung unter −5 % zum Vorjahr oder Plan.');
  x += K.abschnitt('Maßnahme vor Ort');
  x += `<div class="hw-knoepfe zweispaltig">${Object.entries(MASS).map(([key, name]) => K.knopf(name, tun('massnahme', id, key), 'zweit')).join('')}</div>`;
  return x;
}

export function hausBeobachtungHtml(liste) {
  return K.bereich('betrieb', 'haus') + K.rumpf(K.abschnitt('Ausnahmen priorisiert', `${liste.length} Häuser`) + (liste.length
    ? K.liste(liste.map((x) => K.zeile({ was: esc(x.name), unter: esc(x.stadt) + ' · ' + esc(deutscheZahlen(x.grund)), tippbar: true, attr: `onclick="hausSpringen('${esc(x.id)}')"` })))
    : K.leer('Derzeit keine auffälligen Häuser.')));
}
export function hausReportingHtml(kommentare, ranking) {
  return K.bereich('betrieb', 'zahlen') + K.rumpf(K.abschnitt('Kommentare der Woche', `${kommentare.length}`) + (kommentare.length
    ? K.liste(kommentare.map((x) => K.zeile({ was: esc(x.name), unter: esc(GRUENDE[x.grund] ?? x.grund) + ' / ' + esc(MASS[x.massnahme] ?? x.massnahme) + ' · ' + esc(x.pruefung), wert: PROZENT(x.abweichung), ton: 'schlecht', tippbar: true, attr: `onclick="hausSpringen('${esc(x.id)}')"` })))
    : K.leer('Noch keine kommentierungspflichtigen Abweichungen.'))
    + K.abschnitt('Mystery Shopping', 'beste 20') + K.liste(ranking.slice(0, 20).map((x, i) => K.zeile({ was: `${i + 1}. ${esc(x.name)}`, wert: `${x.score} / 100`, tippbar: true, attr: `onclick="hausSpringen('${esc(x.id)}')"` }))));
}

/** Q04: FUNDUS und Volkskauf ohne Engine-Anbindung: keine erfundenen Kennzahlen. */
export function hausStatischHtml(haus, reiter = 'ueberblick') {
  const istOutlet = haus.format === 'outlet';
  const name = istOutlet ? 'FUNDUS' : 'Volkskauf';
  const tabs = istOutlet ? [['ueberblick', 'Überblick', 'ueberblick'], ['sortiment', 'Sortiment', 'sortiment'], ['etagen', 'Verkaufsflächen', 'etagen']]
    : [['ueberblick', 'Überblick', 'ueberblick'], ['sortiment', 'Sortiment', 'sortiment'], ['etagen', 'Etagen', 'etagen']];
  const auswahl = tabs.some(([id]) => id === reiter) ? reiter : 'ueberblick';
  const flaechen = haus.flaechen ?? [];
  let x = '';
  if (auswahl === 'ueberblick') {
    x = K.abschnitt(name + ' · Standort') + K.liste([K.zeile({ was: 'Haus', wert: esc(haus.name) }), K.zeile({ was: 'Stadt', wert: esc(haus.stadt) }), K.zeile({ was: 'Baujahr', wert: esc(haus.baujahr) }),
      K.zeile({ was: 'Verkaufsfläche', wert: fmt.format(flaechen.reduce((a, f) => a + (f.qm ?? 0), 0)) + ' qm' }), K.zeile({ was: 'Substanz', wert: Math.round(haus.substanz ?? 0) + ' / 100' }),
      K.zeile({ was: 'Status', wert: haus.status === 'offen' ? 'Geöffnet' : esc(STATUS_HAUS[haus.status] ?? 'Unbekannt') })])
      + K.hinweis('Betriebskennzahlen und Entscheidungen folgen mit der Engine-Anbindung dieses Formats.');
  } else if (auswahl === 'sortiment') {
    const gruppen = new Map();
    for (const f of flaechen) gruppen.set(f.gruppe ?? 'Sonstiges', (gruppen.get(f.gruppe ?? 'Sonstiges') ?? 0) + (f.qm ?? 0));
    x = K.abschnitt(name + ' · Sortimentsflächen') + K.liste([...gruppen].map(([g, qm]) => K.zeile({ was: esc(g), wert: fmt.format(qm) + ' qm' })));
  } else {
    const etagen = [...new Set(flaechen.map((f) => f.etage))].sort((a, b) => b - a);
    x = etagen.map((nr) => K.abschnitt(etageLang(nr)) + K.liste(flaechen.filter((f) => f.etage === nr).map((f) => K.zeile({ was: esc(f.gruppe ?? f.konzept), wert: fmt.format(f.qm) + ' qm' })))).join('');
  }
  return K.bereich('haus') + K.sprecher({ text: `<b>${name}-Standort.</b> Für dieses Format liegen noch keine Wochenzahlen vor.` }) + K.rumpf(x)
    + K.reiterUnten(tabs, auswahl, (id) => `onclick="hausReiterWahl('${id}')"`).replace('class="hw-reiter"', 'class="hw-reiter haus-reiter"');
}
