// Brücke Engine ↔ Grafik (HQ-VERTRAG.md, Abschnitt "Brücke Engine ↔ Grafik").
//
// zustandAusHaus(haus, s, merk?) → Zustand für warenhaus()/sporthaus() (zustaende.js zustandNormal versteht ihn direkt):
//   { status, zusatz, aktion, rabatt? (0..1 der Engine-Aktion), untermieter: [{ name, typ, etage }], offpriceEtage, hartwig?, schluessel }
//   haus: Engine-Haus (GameState.haeuser[i], gleiche Form wie haeuser.json), s: GameState (Woche, Aktionen; darf fehlen).
//   merk: optionale Map je Spiel für die Neueröffnung (Ende eines Umbaus wird nur im Wochenvergleich sichtbar).
//   schluessel: kurzer Text des sichtbaren Zustands; ändert er sich, muss das Haus neu gebaut werden.
//
// stadtEintragAusSpiel(s, name) → Eintrag wie staedte.js stadtDaten(name), aber mit den Hartwig-Standorten aus dem
//   Spielstand (die Engine verteilt Häuser je Seed anders als haeuser.json). Passt direkt zu stadtplan(seed, {...}).
//
// spielBauer(s, o?) → { bauer, haeuser: Map(hausId → { p, gruppe, e }), neuBauen(id), zustand(id) }
//   Bauer wie echterBauer(), aber Hartwig-Häuser (slot:warenhaus, slot:sport) kommen direkt aus s.haeuser statt aus
//   haeuser.json, mit Zuständen aus zustandAusHaus. Keine Änderung an bauer.js nötig.
//   o.getrennt = true: jedes Hartwig-Haus wird in eine eigene THREE.Group (o.wurzel) gebaut, mit eigenem Sammler und
//   Detailstufe o.hausLod ('nah'), damit es nach "Woche weiter" einzeln neu gebaut werden kann (neuBauen).
//   o.merk: Map für die Neueröffnung (siehe oben).
//   o.hq: Funktion → aktuelles hqFuerGrafik-JSON; Parzellen 'slot:hq' (nach hq.js hqEinplanen) baut dann
//   'slot:hq' aus hq.js (eigene Gruppe, Map hqs; aktualisiere() meldet 'hq:<id>', wenn sich Etagen ändern).
import { gedreht, drehMatrix } from './drehung.js';
import { THREE, Sammler, LOD, setzeLod } from './basis.js';
import { echterBauer, fussabdruck } from './bauer.js';
import { dachFlaechenBeimBau } from './stadt.js';
import { warenhaus, nachnutzung } from './warenhaus.js';
import { warenhausVielfalt } from './warenhaus-vielfalt.js';
import { sporthaus, nachnutzungSport } from './sporthaus.js';
import { outlet } from './outlet.js';
import { schwesterhaus } from './schwesterhaus.js';
import { premiumhaus } from './premium.js';
import { stadtDaten } from './staedte.js';
import { wettbewerber as baueWettbewerber } from './wettbewerber.js';
import { wettbewerbFuerGrafik } from '../../../engine/src/wettbewerb.ts';
import { hatAbholstation } from '../../../engine/src/ecommerce.ts';
import { abholstation } from './abholstation.js';
import { technikAufDach } from './umbau-aussen.js';
import schwesterHaeuser from '../../haeuser-schwester.json';
import exportHaeuser from '../../haeuser.json';
// Maßstab: Fassadenvariante aus dem Export (fassaden-verteilen.js, keine Kopien unter 50 km), für alle Spielstände gleich
const FASSADE = new Map(exportHaeuser.map((h) => [h.id, h.fassade]));
/** #31: Fassadenindex und Familie aus dem verteilten Export (50-km-Regel), Q21 übernimmt beides. */
const EXPORT_FAMILIE = new Map(exportHaeuser.filter((h) => h.familie != null).map((h) => [h.id, h.familie]));
const mitExportFassade = (liste) => liste.map((h) => (FASSADE.has(h.id) && (FASSADE.get(h.id) !== h.fassade || EXPORT_FAMILIE.has(h.id))
  ? { ...h, fassade: FASSADE.get(h.id), ...(EXPORT_FAMILIE.has(h.id) ? { familie: EXPORT_FAMILIE.get(h.id) } : {}) } : h));
import outletHaeuser from '../../haeuser-outlet.json';
import './hq.js';   // meldet 'slot:hq' an

const kwVon = (woche) => (woche % 52) + 1;

/** Engine-Logik aus wirtschaft.ts aktionFuer: laufende Aktion mit der höchsten Ermäßigung, die das Haus trifft. */
export function aktionFuer(s, h) {
  let best = null;
  for (const a of s?.marketing?.aktionen ?? []) {
    if (s.woche < a.start || s.woche >= a.ende) continue;
    if (a.kontrollHaeuser?.includes(h.id)) continue;
    const sc = a.scope ?? { typ: 'alle' };
    if (h.klasse === 'premium' && sc.typ === 'alle' && s?.premiumSchuetzen !== false) continue;
    const trifft = sc.typ === 'alle' || (sc.typ === 'format' && sc.format === h.format) || (sc.typ === 'region' && sc.region === h.region)
      || (sc.typ === 'cluster' && sc.cluster === h.cluster) || (sc.typ === 'haeuser' && sc.ids.includes(h.id));
    if (trifft && (!best || a.rabatt > best.rabatt)) best = a;
  }
  return best;
}

/** Art der Aktionsdekoration: aus dem Namen der Engine-Aktion, sonst nach Kalenderwoche. */
function aktionsArt(aktion, kw) {
  // Der Aktionskalender trägt den kanonischen Anlass bereits als 'anlass'.
  // Nur Altspielstände ohne Anlass werden über den Namen ausgewertet.
  const anlass = aktion?.anlass;
  const bekannt = new Set(['wsv', 'ssv', 'blackfriday', 'weihnachten', 'ostern', 'schulanfang',
    'midseason', 'muttertag', 'beauty', 'waesche', 'jubilaeum', 'mwst', 'friends',
    'personalkauf', 'raeumung', 'sonder']);
  if (bekannt.has(anlass)) return anlass;
  const n = (aktion?.name ?? '').toLowerCase();
  if (n.includes('winterschluss')) return 'wsv';
  if (n.includes('sommerschluss')) return 'ssv';
  if (n.includes('schulanfang')) return 'schulanfang';
  if (n.includes('oster')) return 'ostern';
  if (n.includes('jubil')) return 'jubilaeum';
  if (n.includes('black') || n.includes('friday')) return 'blackfriday';
  if (n.includes('weihnacht') || n.includes('advent')) return 'weihnachten';
  if (kw === 47) return 'blackfriday';
  if (kw >= 48) return 'weihnachten';
  return 'sale';
}
/** Saison ohne Engine-Aktion: Black Friday in KW 47, Weihnachtsschmuck KW 48 bis 52. */
function saison(kw) { return kw === 47 ? 'blackfriday' : kw >= 48 ? 'weihnachten' : null; }

const VORRANG = ['umbau', 'untermiete', 'offprice', 'teilschliessung', 'neueroeffnung', 'aktion'];

export function zustandAusHaus(haus, s, merk) {
  const w = s?.woche ?? 0, kw = kwVon(w);
  const fl = haus.flaechen ?? [];
  const qm = fl.reduce((a, f) => a + (f.qm || 0), 0) || 1;
  const z = { status: 'offen', zusatz: [], aktion: null, untermieter: [], offpriceEtage: 0 };
  const st = haus.status ?? 'offen';
  const substanz = haus.substanz ?? 100;
  if (st === 'geschlossen') {
    // Restmiete läuft noch: frisch geschlossen (Logo wird abmontiert), danach Leerstand oder Verfall
    const frisch = haus.restmieteBis !== undefined ? w < haus.restmieteBis : true;
    z.status = frisch ? 'geschlossen' : substanz < 35 ? 'verfall' : 'leer';
    if (frisch && substanz < 35) z.zusatz.push('verfall');
  } else if (st === 'verkauft') {
    z.status = 'offen'; z.hartwig = false; z.kaeufer = haus.premiumEigentuemer;   // Käuferlogo statt Hartwig
  } else if (st === 'raeumung') {
    z.status = 'raeumung';
  } else {
    // offen und schliessung_verhandlung (Verhandlung ist von außen nicht sichtbar)
    const unter = new Map();
    let offEtage = null, umbau = false, leerQm = 0;
    for (const f of fl) {
      if (f.umbauBis !== undefined && f.umbauBis > w) umbau = true;
      if (f.konzept === 'untermiete' && f.mieter) {
        const k = f.mieter.name;
        if (!unter.has(k) || f.etage < unter.get(k).etage) unter.set(k, { name: f.mieter.name, typ: f.mieter.typ, etage: f.etage });
      }
      if (f.konzept === 'offprice') offEtage = offEtage === null ? f.etage : Math.min(Math.max(0, offEtage), Math.max(0, f.etage));
      if (f.konzept === 'leer' && !(f.umbauBis > w)) leerQm += f.qm || 0;
    }
    const zus = new Set();
    // O08 Umbau: Haus-/Etagenmodernisierung nutzt den vorhandenen Gerüst-/Kran-Zustand.
    if ((s?.umbau?.projekte??[]).some(p=>p.haus===haus.id && p.status==='laufend' && p.ende>w)) umbau=true;
    if (umbau) zus.add('umbau');
    if (unter.size) { zus.add('untermiete'); z.untermieter = [...unter.values()].sort((a, b) => a.etage - b.etage); }
    if (offEtage !== null) { zus.add('offprice'); z.offpriceEtage = Math.max(0, offEtage); }
    if (leerQm / qm >= 0.9) z.status = 'leer';
    else if (leerQm / qm >= 0.15) zus.add('teilschliessung');
    // Neueröffnung: ein Umbau ist in den letzten drei Wochen fertig geworden
    if (merk) {
      const m = merk.get(haus.id) ?? {};
      if (m.umbau && !umbau) m.fertig = w;
      m.umbau = umbau;
      merk.set(haus.id, m);
      if (m.fertig !== undefined && w - m.fertig < 3 && !umbau) zus.add('neueroeffnung');
    }
    if (z.status !== 'leer') {
      const a = aktionFuer(s, haus);
      const art = a ? aktionsArt(a, kw) : saison(kw);
      // FUNDUS bleibt auch während WSV/SSV beim eigenen Claim, ohne Rabattplakate.
      const aktionsbild = haus.format === 'outlet' && (art === 'wsv' || art === 'ssv') ? null : art;
      if (aktionsbild) { zus.add('aktion'); z.aktion = aktionsbild; if (a && haus.format !== 'outlet') z.rabatt = a.rabatt; }
      const liste = VORRANG.filter((q) => zus.has(q));
      if (liste.length) { z.status = liste[0]; z.zusatz = liste.slice(1); }
    }
  }
  if (haus.klasse === 'premium') {
    // Die 26-wöchige Premiuminvestition ist ein optischer Umbau, keine Filialschließung.
    // Sichtbaren Status direkt aus Engine-Daten ableiten, nicht nur aus Katalog-Optionen.
    if (haus.premiumInvestition && w < haus.premiumInvestition.bis) {
      if (z.status === 'offen') z.status = 'umbau';
      else if (!z.zusatz.includes('umbau')) z.zusatz.push('umbau');
    }
    const angebot = s?.angebote?.find((a) => a.typ === 'premiumVerkauf' && a.status === 'offen' && a.wunschHaeuser?.includes(haus.id));
    if (angebot) { z.verkaufsprozess = true; z.investor = angebot.premiumKaeuferName; }
  }
  const u = z.untermieter.map((m) => `${m.name}@${m.etage}`).join(',');
  z.schluessel = [z.status, ...z.zusatz, z.aktion ?? '', z.rabatt ?? '', u, z.offpriceEtage, z.hartwig === false ? 'ohne' : '', z.kaeufer ?? '', z.verkaufsprozess ? 'investor' : '', Object.values(haus.etagenBau??{}).map(e=>String(e.technik?.klima)+String(!!e.klimaModernisiert)).join(',')].join('|');
  return z;
}

/** Zustand ohne den Schlüssel (für warenhaus()/sporthaus()). */
function bauZustand(z) { const { schluessel, ...rest } = z; return rest; }

export function stadtEintragAusSpiel(s, name) {
  const d = stadtDaten(name);
  if (!d) return undefined;
  // Hartwig, Premium und Sport aus der Engine; Volkskauf und FUNDUS kommen mit ihren Grafikdaten aus staedte.js
  // (gleiche IDs wie in der Engine). Q21: Familie/Variante je Haus aus warenhausVielfalt, Fassade aus dem #31-Export.
  const verteilung = warenhausVielfalt(mitExportFassade(s.haeuser.filter((h) => h.stadt === name)));
  const eigene = s.haeuser.filter((h) => h.stadt === name && (h.format === 'warenhaus' || h.format === 'sport')).map((h) => {
    const v = verteilung.get(h.id);
    const f = fussabdruck(h, v?.familie);
    return { id: h.id, name: h.name, rolle: h.klasse === 'premium' ? 'premium' : h.format === 'sport' ? 'sport' : 'warenhaus', lage: h.lage, hausklasse: h.hausklasse, premium: h.klasse === 'premium', grundflaecheQm: h.grundflaecheQm, w: f.w, d: f.d,
      ...(v ? { familie: v.familie, variante: v.fassade } : {}) };
  });
  // Die ursprünglichen Parzellen sind unabhängig vom aktuellen Spielstand. Zwei zusätzliche
  // Flächen werden von Beginn an als normaler Blockrand bebaut und erst bei Bedarf umgenutzt.
  const ids = new Set(eigene.map((q) => q.id));
  const alt = d.standorte.filter((q) => (q.rolle === 'wettbewerber' || q.rolle === 'schwester' || q.rolle === 'outlet') && !ids.has(q.id));
  const reserve = Array.from({ length: 2 }, (_, i) => ({
    id: 'KR-' + name + '-' + (i + 1), name: '', rolle: 'wettbewerber_reserve',
    lage: i === 0 ? '1a' : 'b', grundflaecheQm: 1800,
    w: 48, d: 36,
  }));
  return { ...d, standorte: [...eigene, ...alt, ...reserve] };
}

/** Ursprung eines Baus W × D im Slot (wie bauer.js imSlot). */
function imSlot(p, W, D) {
  const ecke = p.ecke ?? '+x+z';
  if (ecke === 'block') return { x: p.x + Math.max(0, (p.w - W) / 2), z: p.z + Math.max(0, (p.d - D) / 2) };
  if (ecke === 'front') return { x: p.x + Math.max(0, (p.w - W) / 2), z: p.z + p.d - D };   // Kartenparzelle: bündig zur Straße
  return { x: ecke.includes('+x') ? p.x + p.w - W : p.x, z: ecke.includes('+z') ? p.z + p.d - D : p.z };
}

export function spielBauer(s, o = {}) {
  const basis = echterBauer(o.bauerOpt ?? {});
  const merk = o.merk;
  const wahl = warenhausVielfalt(mitExportFassade(s.haeuser)); // Q21: stabil bei Kamerawechsel und Neubau
  const haeuser = new Map();   // Engine-Häuser
  // Volkskauf und FUNDUS liegen bis zur Engine-Maßstab-Integration nur im Grafikkatalog.
  // Unsichtbare Ray-Boxen (keine Zusatzmeshes) machen sie anklickbar.
  const statischeDaten = new Map([...schwesterHaeuser, ...outletHaeuser].map((h) => [h.id, h]));
  const statischeHaeuser = new Map(); // hausId → { haus, p, bounds, e }
  const wettbewerber = new Map(); // Wettbewerber-Id → eigene Gruppe
  const wbSlots = new Map();      // Parzellen-Id → { p, wbId, gruppe, ... }
  let wbCache = null;
  const wbDaten = () => wbCache ?? (wbCache = o.stadt ? wettbewerbFuerGrafik(s, o.stadt) : []);
  const wbVon = (id) => wbDaten().find((w) => w.id === id);
  const wbSchluessel = (wb) => wb ? JSON.stringify([wb.id, wb.art, wb.form, wb.name, wb.status, wb.rabatt, wb.seit]) : 'stadthaus';
  const nachnutzer = (h) => wbDaten().find((w) => w.inHartwigGebaeude === h.id && w.status !== 'geschlossen');
  const wbOffen = (w) => w.status !== 'geschlossen';

  const hausVon = (id) => s.haeuser.find((h) => h.id === id);
  const zust = new Map();
  const zustand = (h) => {
    if (!zust.has(h.id)) {
      const z = zustandAusHaus(h, s, merk);
      z.schluessel += '|abholstation:' + (hatAbholstation(s, h) ? 1 : 0);
      const w = nachnutzer(h);
      if (w) z.schluessel += '|nachnutzung:' + wbSchluessel(w);
      zust.set(h.id, z);
    }
    return zust.get(h.id);
  };

  const baueWarenhaus = (S, scene, p, h) => {
    const variant = wahl.get(h.id);
    const f = fussabdruck(h, variant?.familie);
    const { x, z } = imSlot(p, f.w, f.d);
    if (h.klasse === 'premium') { p.haus = h; const res=premiumhaus(S, scene, h, { x, z, ...bauZustand(zustand(h)) }); technikAufDach(S,h,{x,z,w:f.w,d:f.d,hoehe:res?.hoehe}); if (hatAbholstation(s, h)) abholstation(S, scene, { x, z, w: f.w, d: f.d }); return res; }
    const fam = variant?.familie, fassade = variant?.fassade ?? h.fassade;
    p.haus = h;
    const roh = fassade === h.fassade ? h : { ...h, fassade };
    const nutzer = nachnutzer(h);
    const res=nutzer ? nachnutzung(S, scene, roh, nutzer, { x, z, familie: fam })
      : warenhaus(S, scene, roh, { x, z, familie: fam, ...bauZustand(zustand(h)) });
    if(!nutzer)technikAufDach(S,h,{x,z,w:f.w,d:f.d,hoehe:res?.hoehe});
    if (!nutzer && hatAbholstation(s, h)) abholstation(S, scene, { x, z, w: f.w, d: f.d });
    return res;
  };
  const baueSport = (S, scene, p, h) => {
    const f = fussabdruck(h);
    const { x, z } = imSlot(p, f.w, f.d);
    p.haus = h;
    const nutzer = nachnutzer(h);
    const res=nutzer ? nachnutzungSport(S, scene, h, nutzer, { x, z })
      : sporthaus(S, scene, FASSADE.has(h.id) && FASSADE.get(h.id) !== h.fassade ? { ...h, fassade: FASSADE.get(h.id) } : h, { x, z, ...bauZustand(zustand(h)) });
    if(!nutzer)technikAufDach(S,h,{x,z,w:f.w,d:f.d,hoehe:res?.hoehe});
    return res;
  };
  const baueOutlet = (S, scene, p, h) => {
    // Kartenstädte: FUNDUS kann in Stadtlage als Innenstadt-Geschäftshaus stehen (p.grafikLage), Engine-Lage bleibt
    const hg = p.grafikLage ? { ...h, lage: p.grafikLage } : h;
    const f = fussabdruck(hg), { x, z } = imSlot(p, f.w, f.d);
    p.haus = h;
    return outlet(S, scene, hg, { x, z, ...bauZustand(zustand(h)) });
  };
  const baueSchwester=(S,scene,p,h)=>{
    const fl=fussabdruck(h),{x,z}=imSlot(p,fl.w,fl.d);p.haus=h;
    return schwesterhaus(S,scene,h,{x,z,...bauZustand(zustand(h))});
  };
  const bau = (S, scene, p, h) => (h.format === 'outlet' ? baueOutlet : h.format === 'schwester' ? baueSchwester : h.format === 'sport' ? baueSport : baueWarenhaus)(S, scene, p, h);

  const getrennt = (p, h) => {
    const gruppe = new THREE.Group();
    gruppe.userData.hausId = h.id;
    const S = new Sammler();
    const alt = LOD.stufe;
    setzeLod(o.hausLod ?? 'nah');
    let e, dachFlaechen;
    try {
      ({ ergebnis: e, dachFlaechen } = dachFlaechenBeimBau(S, p, () => gedreht(p, S, gruppe, (S2, G) => bau(S2, G, p, h))));
      S.bauen(gruppe);
    } finally { setzeLod(alt); }
    gruppe.traverse((m) => { m.userData.hausId = h.id; });
    (o.wurzel ?? null)?.add(gruppe);
    haeuser.set(h.id, { p, gruppe, e, dachFlaechen, schluessel: zustand(h).schluessel });
    o.dachFlaechenAktualisieren?.('haus:' + h.id, dachFlaechen);
    return e;
  };
  // Zentrale und freie Bürogebäude (rolle 'hq'): Slot-Bauer 'slot:hq' aus hq.js, Daten immer frisch aus o.hq()
  const hqDaten = (p) => {
    const j = typeof o.hq === 'function' ? o.hq() : o.hq;
    const id = p.standort.id;
    const g = j?.gebaeude?.find((q) => q.id === id), a = j?.angebote?.find((q) => q.id === id);
    return { ...p, standort: { ...p.standort, hq: g ?? a ?? p.standort.hq, angebot: !g && !!(a ?? p.standort.angebot) } };
  };
  const hqSchluessel = (p) => { const q = hqDaten(p).standort; return JSON.stringify([q.angebot, q.hq?.etagen]); };
  const baueHq = (p) => {
    const gruppe = new THREE.Group();
    gruppe.userData.hqId = p.standort.id;
    const S = new Sammler(), alt = LOD.stufe;
    setzeLod(o.hausLod ?? 'nah');
    let e, dachFlaechen;
    try {
      ({ ergebnis: e, dachFlaechen } = dachFlaechenBeimBau(S, p, () => gedreht(p, S, gruppe, (S2, G) => basis['slot:hq'](S2, G, hqDaten(p)))));
      S.bauen(gruppe);
    } finally { setzeLod(alt); }
    gruppe.traverse((m) => { m.userData.hqId = p.standort.id; });
    (o.wurzel ?? null)?.add(gruppe);
    hqs.set(p.standort.id, { p, gruppe, e, dachFlaechen, teile: S.anzahl, schluessel: hqSchluessel(p) });
    o.dachFlaechenAktualisieren?.('hq:' + p.standort.id, dachFlaechen);
    return e;
  };
  const hqs = new Map();
  // Historische, geschlossene Standorte bleiben bis zur Nachbelegung als leeres
  // Kaufhaus sichtbar. Bei voller Belegung wird zuerst ein geschlossener ersetzt.
  function neuVerteilen() {
    const daten = wbDaten().filter((w) => !w.inHartwigGebaeude);
    const belegt = new Set([...wbSlots.values()].map((x) => x.wbId).filter(Boolean));
    for (const w of daten) {
      if (belegt.has(w.id)) continue;
      let frei = [...wbSlots.values()].find((x) => !x.wbId);
      if (!frei && wbOffen(w)) frei = [...wbSlots.values()].find((x) => {
        const alt = wbVon(x.wbId);
        return !alt || !wbOffen(alt);
      });
      if (frei) {
        wettbewerber.delete(frei.wbId);
        frei.wbId = w.id;
        wettbewerber.set(w.id, frei);
        belegt.add(w.id);
      }
    }
  }
  const wbBau = (S, scene, p, w) => {
    if (!w) return basis.stadthaus(S, scene, { ...p, typ: 'stadthaus', standort: undefined });
    // Grundfläche und Bauform aus der Engine; der im Stadtplan feste Slot ist das Maximum.
    const breite = Math.max(20, Math.round(Math.sqrt(Math.max(400, w.grundflaecheQm) * 1.5) / 5) * 5);
    const tiefe = Math.max(16, Math.round(w.grundflaecheQm / breite / 5) * 5);
    const W = Math.min(p.w - 1, breite);
    const D = Math.min(p.d - 1, tiefe);
    const pos = imSlot(p, W, D);
    return baueWettbewerber(S, scene, {
      ...pos, w: W, d: D, seed: p.seed, art: w.art, name: w.name,
      form: w.form, region: p.region, zustand: { status: w.status, rabatt: w.rabatt },
    });
  };
  function baueWbGruppe(x) {
    const gruppe = new THREE.Group(), S = new Sammler(), alt = LOD.stufe;
    if (x.wbId) gruppe.userData.wbId = x.wbId;
    setzeLod(o.hausLod ?? 'nah');
    let e, dachFlaechen;
    try {
      ({ ergebnis: e, dachFlaechen } = dachFlaechenBeimBau(S, x.p, () => gedreht(x.p, S, gruppe, (S2, G) => wbBau(S2, G, x.p, wbVon(x.wbId)))));
      S.bauen(gruppe);
    }
    finally { setzeLod(alt); }
    if (x.wbId) gruppe.traverse((m) => { m.userData.wbId = x.wbId; });
    o.wurzel?.add(gruppe);
    Object.assign(x, { gruppe, e, dachFlaechen, schluessel: wbSchluessel(wbVon(x.wbId)) });
    o.dachFlaechenAktualisieren?.('wb:' + (x.p.standort?.id ?? x.p.id), dachFlaechen);
    if (x.wbId) wettbewerber.set(x.wbId, x);
    return e;
  }
  const wbSlot = (S, scene, p) => {
    const id = p.standort?.id ?? p.id;
    let x = wbSlots.get(id);
    if (!x) {
      const gebraucht = new Set([...wbSlots.values()].map((q) => q.wbId).filter(Boolean));
      // Beim Laden fortgeschrittener Spielstände zunächst aktive Betriebe belegen.
      const erste = wbDaten().filter((w) => !w.inHartwigGebaeude)
        .sort((a, b) => Number(a.status === 'geschlossen') - Number(b.status === 'geschlossen') || b.seit - a.seit)
        .find((w) => !gebraucht.has(w.id));
      x = { p, wbId: erste?.id ?? null, gruppe: null, schluessel: null };
      wbSlots.set(id, x);
    }
    if (o.getrennt) return baueWbGruppe(x);
    const e = wbBau(S, scene, p, wbVon(x.wbId));
    Object.assign(x, { e, schluessel: wbSchluessel(wbVon(x.wbId)) });
    if (x.wbId) wettbewerber.set(x.wbId, x);
    return e;
  };
  const statischerSlot = (typ) => (S, scene, p) => {
    // Grafikkatalog unverändert in den gemeinsamen Sammler zeichnen:
    // keine zusätzlichen Draw Calls oder Geometrie für die Klickfunktion.
    const e = basis[typ](S, scene, p);
    const haus = statischeDaten.get(p.standort?.id);
    if (haus && o.getrennt) {
      const f = fussabdruck(haus), { x, z } = imSlot(p, f.w, f.d);
      const hoehe = Math.max(8, e?.hoehe ?? 18);
      const bounds = new THREE.Box3(
        new THREE.Vector3(x, 0, z),
        new THREE.Vector3(x + f.w, hoehe, z + f.d)
      );
      if (p.rot) bounds.applyMatrix4(drehMatrix(p));   // gedrehte Kartenparzelle: Hülle des gedrehten Hauses
      statischeHaeuser.set(haus.id, { haus, p, bounds, e });
    }
    return e;
  };
  const hqSlot = (S, scene, p) => {
    if (!basis['slot:hq'] || !p.standort) return { hoehe: 0 };
    if (o.getrennt) return baueHq(p);
    return basis['slot:hq'](S, scene, hqDaten(p));
  };
  const slot = (typ) => (S, scene, p) => {
    if (p.standort?.rolle === 'hq') return hqSlot(S, scene, p);
    const h = p.standort?.id && hausVon(p.standort.id);
    if (!h) return basis[typ](S, scene, p);
    if (o.getrennt) return getrennt(p, h);
    const e = bau(S, scene, p, h);
    haeuser.set(h.id, { p, gruppe: null, e, schluessel: zustand(h).schluessel });
    return e;
  };
  const bauer = {
    ...basis, 'slot:warenhaus': slot('slot:warenhaus'), 'slot:sport': slot('slot:sport'),
    'slot:schwester': slot('slot:schwester'), 'slot:outlet': slot('slot:outlet'),
    'slot:premium': slot('slot:premium'),
    'slot:hq': hqSlot, 'slot:wettbewerber': wbSlot, 'slot:wettbewerber_reserve': wbSlot,
  };

  /** Zustände neu lesen (nach wocheAbspielen); gibt die Ids der Häuser zurück, deren Bild sich ändert. */
  function aktualisiere() {
    wbCache = null;
    zust.clear();
    neuVerteilen();
    const geaendert = [];
    for (const x of wbSlots.values()) if (x.schluessel !== wbSchluessel(wbVon(x.wbId))) {
      geaendert.push('wb:' + (x.wbId ?? x.p.standort?.id));
    }
    for (const [id, x] of haeuser) { const h = hausVon(id); if (h && zustand(h).schluessel !== x.schluessel) geaendert.push(id); }
    for (const [id, x] of hqs) if (hqSchluessel(x.p) !== x.schluessel) geaendert.push('hq:' + id);
    return geaendert;
  }
  /** Ein Haus (getrennt gebaut) mit dem aktuellen Zustand neu bauen. */
  function neuBauen(id) {
    if (id.startsWith('wb:')) {
      const wbId = id.slice(3);
      const x = wettbewerber.get(wbId) ?? [...wbSlots.values()].find((y) => y.p.standort?.id === wbId);
      if (!x) return null;
      x.gruppe?.parent?.remove(x.gruppe);
      x.gruppe?.traverse((m) => { if (m.geometry) m.geometry.dispose(); });
      return baueWbGruppe(x);
    }
    if (id.startsWith('hq:')) {
      const x = hqs.get(id.slice(3));
      if (!x) return null;
      x.gruppe.parent?.remove(x.gruppe);
      x.gruppe.traverse((m) => { if (m.geometry) m.geometry.dispose(); });
      return baueHq(x.p);
    }
    const x = haeuser.get(id), h = hausVon(id);
    if (!x || !x.gruppe || !h) return null;
    const vater = x.gruppe.parent;
    vater?.remove(x.gruppe);
    // Geometrien freigeben; Materialien und Schrift liegen im gemeinsamen Cache (basis.js) und bleiben
    x.gruppe.traverse((m) => { if (m.geometry) m.geometry.dispose(); });
    const e = getrennt(x.p, h);
    const neu = haeuser.get(id);
    if (vater && !o.wurzel) vater.add(neu.gruppe);
    return e;
  }
  return { bauer, haeuser, statischeHaeuser, hqs, wettbewerber, wbSlots, aktualisiere, neuBauen, zustand: (id) => { const h = hausVon(id); return h ? zustand(h) : null; } };
}
