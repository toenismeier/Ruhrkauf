// Q19: IT-Produktansichten verwenden ausschließlich vorhandene Wochenwerte und Engine-Hebel.
// Neue Produktzustände sind optional: alte Spielstände und der unveränderte Start bleiben neutral.
import { vorlaufKonzernWoche } from './vertrieb';
import type { GameState } from './types';
import { clamp, eur } from './util';
import { SYSTEME, type ItSystemId } from './it';

export type ItProduktId = 'kundenkarte' | 'hartwig_app' | 'kasse' | 'mobile_pay';
export const IT_PRODUKT_IDS: ItProduktId[] = ['kundenkarte', 'hartwig_app', 'kasse', 'mobile_pay'];
export interface ItProduktZustand { aktiv: boolean; team: number }
export interface ItProduktWochenwert {
  woche: number;
  kundenkarte: number;
  hartwig_app: number;
  kasse: number;
  mobile_pay: number;
}
export const IT_TEAM_KOSTEN_PRO_KOPF = 1400; // Euro/Woche, zusätzlich und nur auf Spielerentscheidung

const texte: Record<ItProduktId, { name: string; system: ItSystemId; einheit: string; beschreibung: [string,string] }> = {
  kundenkarte: { name: 'Hartwig Karte', system: 'app', einheit: 'aktive Karteninhaber',
    beschreibung: ['Die Hartwig Karte verbindet Einkauf und Kundenbindung in allen Häusern.',
      'Ihre Reichweite und CRM-Nutzung stammen aus den bestehenden Marketingdaten.'] },
  hartwig_app: { name: 'Hartwig App', system: 'app', einheit: 'aktive App-Nutzer',
    beschreibung: ['Die Hartwig App bündelt Kundenkonto, Angebote und den Online-Shop.',
      'Click & Collect und Abholstationen werden durch den bestehenden Onlinekanal gesteuert.'] },
  kasse: { name: 'Hartwig Kasse', system: 'kasse', einheit: 'geschätzte Transaktionen',
    beschreibung: ['Die Kasse verarbeitet Einkäufe im Filialnetz und steuert den Kassenfluss.',
      'Modernisierung und SB-Kassen wirken über die vorhandene IT- und Filialsteuerung.'] },
  mobile_pay: { name: 'Mobile Pay', system: 'kasse', einheit: 'modellierte mobile Transaktionen',
    beschreibung: ['Mobile Pay ist die mobile Zahlvariante der Hartwig Kasse.',
      'Der Ausbau nutzt die vorhandene mobile Kassenstufe, keine zweite Zahlungslogik.'] },
};
export function itProduktZustand(s: GameState, id: ItProduktId): ItProduktZustand {
  return s.it?.produkte?.[id] ?? { aktiv: true, team: 0 };
}
export function itProduktTeamKosten(s: GameState): number {
  return eur(IT_PRODUKT_IDS.reduce((n, id) => n + itProduktZustand(s, id).team, 0) * IT_TEAM_KOSTEN_PRO_KOPF);
}
function werte(s: GameState): Omit<ItProduktWochenwert, 'woche'> {
  const k = s.marketing?.stand?.ist?.karte;
  const mobileStufe = s.it?.systeme.kasse.kasseAusbau?.mobil ?? 0;
  // Kassenbons sind in der Engine nicht einzeln verbucht. Der aus Umsatz und
  // durchschnittlichem Bon geschätzte Transaktionswert ist explizit gekennzeichnet.
  const bon = s.marketing?.stand?.verlauf?.at(-1)?.bon || 41;
  const transaktionen = Math.max(0, Math.round((s.historie.at(-1)?.umsatz ?? 0) / Math.max(1, bon)));
  return {
    kundenkarte: itProduktZustand(s, 'kundenkarte').aktiv ? Math.round((k?.mitglieder ?? 0) * (k?.aktivQuote ?? 0)) : 0,
    hartwig_app: itProduktZustand(s, 'hartwig_app').aktiv ? Math.round(k?.app?.aktiveNutzer ?? 0) : 0,
    kasse: itProduktZustand(s, 'kasse').aktiv ? transaktionen : 0,
    mobile_pay: itProduktZustand(s, 'kasse').aktiv && itProduktZustand(s, 'mobile_pay').aktiv
      ? Math.round(transaktionen * clamp(0.04 * mobileStufe, 0, 1)) : 0,
  };
}
/** Ein Snapshot nach dem Wochenabschluss; keinerlei Buchung oder Zufall. */
export function itProdukteWoche(s: GameState): void {
  if (s.prognose || !s.it) return;
  const punkt = { woche: s.woche, ...werte(s) };
  const v = s.it.produktVerlauf ?? (s.it.produktVerlauf = []);
  if (v.at(-1)?.woche === punkt.woche) v[v.length - 1] = punkt;
  else v.push(punkt);
  if (v.length > 52) v.splice(0, v.length - 52);
}
export function itProdukte(s: GameState) {
  const alle = werte(s), verlauf = s.it?.produktVerlauf ?? [];
  const e = s.ecommerce;
  const k = s.marketing?.stand?.ist?.karte;
  const ausbau = s.it?.systeme.kasse.kasseAusbau;
  return IT_PRODUKT_IDS.map(id => {
    const meta = texte[id], status = itProduktZustand(s,id);
    const system = s.it?.systeme[meta.system], generation = system?.generation ?? SYSTEME[meta.system].start;
    const version = id === 'mobile_pay' ? (ausbau?.mobil ?? 0) : generation;
    const qualitaet = id === 'hartwig_app' || id === 'kundenkarte'
      ? Math.round(clamp((k?.app?.qualitaet ?? 0.35) * 3 + generation, 1, 5))
      : id === 'mobile_pay' && version === 0 ? 0 : Math.max(1, Math.min(5, generation + 1));
    // Q35: fehlende Wochen vor Spielstart aus dem Vorlauf (Kassenbons aus Vorjahresumsatz, Karte/App wie zum Start).
    const echt = verlauf.slice(-5).map(p => ({ woche: p.woche, wert: p[id] }));
    const punkte: { woche: number; wert: number; vorlauf?: boolean }[] = [...echt];
    const bon = s.marketing?.stand?.verlauf?.at(0)?.bon || 41;
    const basis = verlauf[0]?.[id] ?? alle[id];
    for (let w = (punkte[0]?.woche ?? s.woche) - 1; punkte.length < 5; w--) {
      const v = vorlaufKonzernWoche(s, w);
      if (!v) break;
      const trans = Math.round(v.umsatz / Math.max(1, bon));
      const kasseAn = itProduktZustand(s, 'kasse').aktiv;
      const wert = id === 'kasse' ? (kasseAn ? trans : 0)
        : id === 'mobile_pay' ? (kasseAn && itProduktZustand(s, 'mobile_pay').aktiv ? Math.round(trans * clamp(0.04 * (ausbau?.mobil ?? 0), 0, 1)) : 0) : basis;
      punkte.unshift({ woche: w, wert, vorlauf: true });
    }
    const aktuell = alle[id];
    const vorher = punkte.length >= 2 ? punkte[punkte.length-2].wert : undefined;
    const aenderung = vorher === undefined ? undefined : aktuell - vorher;
    return {
      id, ...meta, aktiv: status.aktiv, team: status.team, teamKostenWoche: status.team * IT_TEAM_KOSTEN_PRO_KOPF,
      kennzahl: aktuell, aenderung, aenderungQuote: vorher && aenderung !== undefined ? aenderung / vorher : undefined,
      verlauf: punkte, version: version+'.0', generation, sterne: qualitaet, systemAlter: system?.alter ?? SYSTEME[meta.system].alter,
      details: id === 'kundenkarte' ? [
        ['Mitglieder insgesamt', Math.round(k?.mitglieder ?? 0)],
        ['Umsatzanteil mit Karte', Math.round((k?.umsatzAnteil ?? 0)*1000)/10+' %'],
      ] : id === 'hartwig_app' ? [
        ['Downloads', Math.round(k?.app?.downloads ?? 0)],
        ['Click & Collect', e?.letzte ? Math.round(e.letzte.bestellungen * e.letzte.clickCollectAnteil) : 0],
        ['Abholstationen', s.haeuser.filter(h => !!e?.abholstationen?.[h.id]).length],
        ['Online-Shop', 'hartwig.de'],
      ] : id === 'kasse' ? [
        ['Selbstbedienungskassen', 'Stufe '+(ausbau?.selbstbedienung ?? 0)],
        ['Zahlungsverkehr', '0,2 % des Umsatzes vor Einsparprogramm'],
      ] : [
        ['Mobile Kasse', 'Stufe '+(ausbau?.mobil ?? 0)],
        ['Zahlungsverkehr', 'über bestehende Filial-GuV'],
      ],
    };
  });
}
