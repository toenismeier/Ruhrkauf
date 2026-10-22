export * from './types';
// O06 Planung
export { planungBericht, planungAssistent, planJahr, planWoche, planBudgetFaktor, forecastVertrauensDelta } from './planung';
export type { PlanungStand, Jahresplan, PlanZiele, PlanKnoten, PlanungAktion, Quartalsforecast } from './planung';
export { neuesSpiel, wocheAbspielen, vorschau, type VorschauWoche } from './engine';
export { vertriebUebersicht, mietvertragEmpfehlung, type VertriebsUebersicht, type VertriebsZeile, type VertriebsKennzahlen, type VorjahrWoche, type VertriebsFormat, type VertriebsZeitraum } from './vertrieb';
export { fuehreAus, type SpielerAktion, type Ergebnis } from './aktionen';
export { organisationUebersicht, kapitalfluss, posteingang, cockpit, portfolio, formatCockpit, schliessungVorschau, hausDetail, warenwirtschaft, kreditversicherung, hqUebersicht, hqFuerGrafik, einkaufUebersicht, wgDetail, freigaben, eigenmarkenUebersicht, eigenmarkeVorschau } from './abfragen';
export { vorstandUebersicht, vorstandProfil, kandidaten, angebotsChance, produkte, produktKatalog, trendbericht, produktVorschau } from './abfragen';
export {
  ABTEILUNGEN, ABTEILUNG_NAME, HQ_PARAM, HQ_TYPEN, HQ_WIRKUNG, sollFte,
  type AbteilungId, type Abteilung, type Hq, type HqAngebot, type HqEtage, type HqGebaeude, type HqTyp, type Stufe,
  type HqUebersicht, type HqGrafik, type HqKosten,
} from './hq';
export { GRUPPEN, gruppenFuer, sortimentVon, STAEDTE, STADT_REGIONEN, stadtRegion } from './daten';
export { outletUebersicht, schwesterUebersicht, outletKandidaten, type FormateStand, type FormatPosten } from './formate';
// O05 Ware
export { warenUebersicht, warenHaus, fundusFrequenzFaktor, clusterListe, hausclusterId, type WareAktion, type WareStand } from './merchandise';
export { STANDARD_SZENARIO, type Szenario } from './welt';
export { SZENARIEN, szenarioKonfiguration, szenarioZiel, szenarioName, unternehmensWert, type SzenarioId, type SzenarioRegeln, type SzenarioStand, type SzenarioZiel } from './szenarien';
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
  ARTIKELTYPEN, ZUSATZ_ARTIKEL, ZUSATZ_ARTIKELTYPEN, FARBEN, MATERIALIEN, PRODUKT_KATEGORIEN, PRODUKT_PARAM, DAUER_STUFEN, TREND_GRUPPEN, trendFuer, produktNachfrageFaktor, produktMargeDelta,
  type ArtikelTyp, type Produktsparte, type Farbe, type Material, type ProduktKategorie, type TrendGruppe, type Produkt, type ProduktEntwurf, type ProduktAktion, type ProdukteStand,
  type ProduktKarte, type ProdukteListe, type MarkenProdukte, type ProduktKatalog, type Trendbericht, type TrendSaison, type ProduktVorschau, type SterneTeile,
} from './produkte';
export {
  KANAELE, KANAL, MK, STARTKALENDER, ANLAESSE, MECHANIK_TEXT, ALTERSGRUPPEN, ALTERSGRUPPE_TEXT, FREQUENZ_WOCHEN, segmentText, angebotText, umsatzBezug,
  marketingUebersicht, kanaele, kundenkarte, crmKampagnen, aktionskalender, aktionsAuswertung, marketingKosten,
  type KanalId, type KanalDef, type KanalStand, type Altersgruppe, type KarteStand, type AppStand, type CrmSegment, type SegmentTyp, type CrmKanal, type CrmAngebot,
  type CrmFrequenz, type CrmKampagne, type CrmErgebnis, type Mechanik, type Anlass, type AktionEntwurf, type MarketingAktion, type MarketingStand, type MarketingSzenario,
  type MarketingUebersicht, type MarketingVerlauf, type MarketingKosten, type KanalZeile, type KalenderVorlage,
} from './marketing';
export { marketingStaedte, type MarketingStadt, type MarketingStadtDaten } from './marketing-stadt';
export { SCHWIERIGKEIT, SCHWIERIGKEITEN, schwierigkeit, type SchwierigkeitId, type SchwierigkeitParam } from './schwierigkeit';

export type { Posteingang, PostHandeln, PostMeldung, PostErledigt, PostBezug, PostKategorie } from './abfragen';
export { wettbewerbUebersicht, wettbewerbFuerGrafik } from './abfragen';
export { wettbewerbAus, wettbewerbAusGruppe } from './wettbewerb';

export { zeitungArchiv, zeitungAktuelle, zeitungAktiv, ZEITUNG_ARTIKELARTEN, ZEITUNG_REITER, type ZeitungAusgabe, type ZeitungArtikel, type ZeitungStand, type ZeitungReiter } from './zeitung';

export {
  endwertung, ebitdaJahr, immobilienWert, unternehmenswert, endKennzahlen, spielBeenden, spielendePruefen,
} from './spielende';
// O03 IT
export { SYSTEME, IT_IDS, itUebersicht, itDeckel, itDeckelGrund, itCluster, itProjektPlan, generationInCluster, itAlter, ausfallRisiko, type ItStand, type ItSystemId, type ItProjekt, type ItAktion, type ItPhase, type ProjektArt, type Generation } from './it';

export { PREMIUM_HAEUSER } from './daten';
export { premiumUebersicht } from './abfragen';
export { ecommerceUebersicht, ecommerceHaus, ecommerceBruecke } from './abfragen';
export { ecommerceCluster, hatAbholstation, retourenQuote, type EcommerceStand, type EcommerceAktion, type FulfillmentModell } from './ecommerce';

export { REFERENZ_FILIAL_GUV, FILIAL_PROGRAMME, GUV_KOSTEN, guvAbschluss, leereFilialGuV, type FilialGuV, type FilialProgrammId } from './filialguv';

export { chronikUebersicht, KONZERN_GESCHICHTE, chronikErfolg } from './chronik';
export { ERFOLGE, ERFOLGE_AKTIV, erfolgeWoche, erfolgeUebersicht,
  type ErfolgEintrag, type ErfolgGruppe, type ErfolgStufe, type ErfolgStand } from './erfolge';

export { verlauf, type StatistikFilter, type StatistikReihe, type StatistikPunkt } from './abfragen';

// O01 Organisation: öffentliche Schnittstellen für Folgeaufträge O03–O09.
export { BEREICHE, ALTE_DELEGATIONEN, bildeHauscluster, bereichsQualitaet, berichtetAn, hausclusterVon,
  clusterleitungQualitaet, clusterBerichtetAn, regionalleitungQualitaet, istDelegiert, istAufgabeDelegiert, delegationsAufgaben, delegationsGrenze, CLUSTER_AUFGABEN,
  neueVorlage, organisationUebersicht as organisationDaten, hausclusterFaktor, organisationLeitungKostenWoche,
  type BereichId, type Bereich, type Hauscluster, type OrganisationsStand, type VorlageEingabe, type OrganisationAktion, type DelegationsAufgabe,
} from './organisation';
// O02 Umsatztreiber
export { hausTreiber, umsatzbruecke, ranking, reporting, setzeTreiber, treiberFaktor } from './abfragen';
export type { TreiberId, TreiberFaktoren, TreiberQuellen, TreiberPeriode, TreiberVergleich, Umsatzbruecke, Ebene, RankingKennzahl, RankingZeile, Reporting, ReportingZeile } from './treiber';
// O07 Haus
export { hausUebersicht, hausBeobachtung, hausKommentareDerWoche, hausKundenRanking, hausKandidaten, hausKundenscore } from './abfragen';
export type { HausStaerke, HausStandard, HausKommentar, HausMassnahme, HausAktion, HausBetrieb, HausbetriebStand, StadtUmfeld } from './haus';
// O08 Umbau – zentraler Export für Spiel und Tests.
export { umbauUebersicht, umbauHaus, umbauSchaetzung, UMBAU_STUFEN } from './umbau';
export type { BauEtage, UmbauStand, UmbauStufe, UmbauProjekt, UmbauAktion } from './umbau';
// O04 Personal
export { PERSONAL_GRUPPEN, PERSONAL_NAMEN, PERSONAL_TAGE, initialisierePersonaleinsatz, personalHaus, personalUebersicht, personalVerfuegbarkeit } from './personaleinsatz';
export type { PersonalAktion, PersonalGruppe, PersonalPlan, PersonalCluster } from './personaleinsatz';
export { TEST_EREIGNISSE, type TestAktion, type TestEreignisId } from './testwerkzeuge';

// Q06 Fachbereich Marktbeobachtung.
export { marktbeobachtungUebersicht, marktbeobachtungKostenWoche, marktbeobachtungWoche, marktbeobachtungStufe, MARKT_FTE, type MarktbeobachtungStand, type MarktbeobachtungWoche } from './marktbeobachtung';
