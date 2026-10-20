export * from './types';
export { neuesSpiel, wocheAbspielen, vorschau, type VorschauWoche } from './engine';
export { fuehreAus, type SpielerAktion, type Ergebnis } from './aktionen';
export { posteingang, cockpit, portfolio, hausDetail, warenwirtschaft, kreditversicherung, hqUebersicht, hqFuerGrafik, einkaufUebersicht, wgDetail, freigaben, eigenmarkenUebersicht, eigenmarkeVorschau } from './abfragen';
export { vorstandUebersicht, vorstandProfil, kandidaten, angebotsChance, produkte, produktKatalog, trendbericht, produktVorschau } from './abfragen';
export {
  ABTEILUNGEN, ABTEILUNG_NAME, HQ_PARAM, HQ_TYPEN, HQ_WIRKUNG, sollFte,
  type AbteilungId, type Abteilung, type Hq, type HqAngebot, type HqEtage, type HqGebaeude, type HqTyp, type Stufe,
  type HqUebersicht, type HqGrafik, type HqKosten,
} from './hq';
export { GRUPPEN, gruppenFuer } from './daten';
export { STANDARD_SZENARIO, type Szenario } from './welt';
export {
  WG_DEF, WG, WG_JE_BEREICH, EK_PARAM, EINKAUF_SPALTEN, saisonId, saisonName,
  type WgId, type WgDef, type Art, type FreigabeModus, type Reduzierung, type Servicegrad, type OrderTyp, type Ampel, type WgAuswahl,
  type WgSteuerung, type Freigabe, type FreigabeFilter, type EinkaufAktion, type EinkaufKennzahlen, type KennzahlId, type Ampeln,
  type EinkaufFilter, type EinkaufUebersicht, type BereichZeile, type WgZeile, type WgDetail, type FreigabeZeile, type FreigabenListe, type Einkauf,
} from './einkauf';
export {
  BESCHAFFUNG, EM_PARAM, EM_VORLAGEN, ZIELGRUPPEN_TEXT, mehrmarge, passungHaus,
  type Eigenmarke, type EigenmarkeEntwurf, type EigenmarkenUebersicht, type EigenmarkeVorschau, type MarkenKarte,
  type EmAlter, type EmGeschlecht, type EmKategorie, type Preislage, type Stil, type Beschaffung, type EmStatus, type Zielgruppe,
} from './eigenmarken';
export {
  RESSORTS, RESSORT_INFO, DELEGATIONEN, VORSTAND_PARAM, registriereDelegation, gehaltsforderung, vorstandWirkung,
  type RessortId, type Portraet, type VorstandPerson, type Kandidat, type VorstandStand, type VorstandAktion, type DelegationsHandler,
  type VorstandUebersicht, type VorstandProfil, type RessortKarte, type PersonKarte, type KandidatenListe, type KandidatKarte, type VorstandSitzung,
} from './vorstand';
export {
  ARTIKELTYPEN, FARBEN, MATERIALIEN, PRODUKT_KATEGORIEN, PRODUKT_PARAM, DAUER_STUFEN, TREND_GRUPPEN, trendFuer, produktNachfrageFaktor, produktMargeDelta,
  type ArtikelTyp, type Farbe, type Material, type ProduktKategorie, type TrendGruppe, type Produkt, type ProduktEntwurf, type ProduktAktion, type ProdukteStand,
  type ProduktKarte, type ProdukteListe, type MarkenProdukte, type ProduktKatalog, type Trendbericht, type TrendSaison, type ProduktVorschau, type SterneTeile,
} from './produkte';
export {
  KANAELE, KANAL, MK, STARTKALENDER, ANLAESSE, MECHANIK_TEXT, ALTERSGRUPPEN, ALTERSGRUPPE_TEXT, FREQUENZ_WOCHEN, segmentText, angebotText, umsatzBezug,
  marketingUebersicht, kanaele, kundenkarte, crmKampagnen, aktionskalender, aktionsAuswertung, marketingKosten,
  type KanalId, type KanalDef, type KanalStand, type Altersgruppe, type KarteStand, type AppStand, type CrmSegment, type SegmentTyp, type CrmKanal, type CrmAngebot,
  type CrmFrequenz, type CrmKampagne, type CrmErgebnis, type Mechanik, type Anlass, type AktionEntwurf, type MarketingAktion, type MarketingStand, type MarketingSzenario,
  type MarketingUebersicht, type MarketingVerlauf, type MarketingKosten, type KanalZeile, type KalenderVorlage,
} from './marketing';
export { SCHWIERIGKEIT, SCHWIERIGKEITEN, schwierigkeit, type SchwierigkeitId, type SchwierigkeitParam } from './schwierigkeit';

export type { Posteingang, PostHandeln, PostMeldung, PostErledigt, PostBezug, PostKategorie } from './abfragen';
export { wettbewerbUebersicht, wettbewerbFuerGrafik } from './abfragen';
export { wettbewerbAus, wettbewerbAusGruppe } from './wettbewerb';

export { PREMIUM_HAEUSER } from './daten';
export { premiumUebersicht } from './abfragen';

// O07 Haus
export { hausUebersicht, hausBeobachtung, hausKommentareDerWoche, hausKundenRanking, hausKandidaten, hausKundenscore } from './abfragen';
export type { HausStaerke, HausStandard, HausKommentar, HausMassnahme, HausAktion, HausBetrieb, HausbetriebStand, StadtUmfeld } from './haus';
