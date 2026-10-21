// Gemeinsame, verbindliche Kennzahlen für Planer, Renderung und Ladenbau-Prüfung.
// Einheiten: Meter / Quadratmeter / Anteil 0..1. Keine Rundung nach unten bei Gangbreiten.
export const LADENBAU = Object.freeze({
  raster: 1.25,
  suchRaster: 0.625,
  hauptgang: 3.0,
  nebengang: 1.8,
  kassenVorfeld: 2.0,
  wandBelegungMin: 0.85,
  wandTiefe: 0.60,
  wandSockel: 0.12,
  wandKorpusHoehe: 2.40,
  wandSchildbandHoehe: 0.60,
  gondelHoeheMax: 1.40,
  inselHoeheMax: 1.50,
  gondelGang: 1.80,
  bodenArtenMax: 3,
  akzentAnteilMax: 0.10,
  dekoAnteilMax: 0.02,
  inszenierungenJeAbteilungMax: 1,
  moebelAnteilMin: 0.35,
  moebelAnteilMax: 0.50,
  leerflaecheMax: 6.0,
  winkel: Object.freeze([0,90,180,270]),
  budgetEtage: 8000,
});
export const FORMAT_PROFILE = Object.freeze({
  sport: Object.freeze({
    id: 'sport', titel: 'Hartwig Sport',
    boden: Object.freeze({gang:'#efefea', flaeche:'#dadde0', akzent:'#c8c9c3'}),
    wand: 'sport_schuh_marken', gondel: 'gondel_textil',
    insel: 'sport_insel_neuheit', kasse: 'kasse_sport_klein',
    inszenierung: true, kunstrasenNurTorinsel: true, treppe: 'rolltreppe',
    abteilungsMoebel: Object.freeze({
      sportschuhe: Object.freeze({wand:'sport_schuh_laufen',gondel:'gondel_schuhe',insel:'sport_insel_laufanalyse'}),
      sporttextil: Object.freeze({wand:'sport_textil_haengung',gondel:'gondel_textil',insel:'sport_insel_puppen_laufen'}),
      outdoor: Object.freeze({wand:'sport_rucksack',gondel:'gondel_outdoor',insel:'sport_insel_zelt'}),
      rad: Object.freeze({wand:'sport_rad',gondel:'gondel_rad',insel:'sport_insel_ebike'}),
      wintersport: Object.freeze({wand:'sport_ski',gondel:'gondel_ski',insel:'sport_insel_winterpod'}),
      teamsport: Object.freeze({wand:'sport_trikot_verein',gondel:'gondel_baelle',insel:'sport_insel_tor'}),
      fitness: Object.freeze({wand:'sport_fitness_zubehoer',gondel:'gondel_textil',insel:'sport_insel_fitness'}),
    }),
  }),
  outlet: Object.freeze({
    id: 'outlet', titel: 'FUNDUS',
    boden: Object.freeze({gang:'#f1f0eb',flaeche:'#e2e0d9'}),
    wand:'outlet_wandstange', gondel:'outlet_doppelstange',
    insel:null, kasse:'outlet_kassenzeile',
    inszenierung:false, treppe:'treppe',
    abteilungsMoebel: Object.freeze({
      damen: Object.freeze({wand:'outlet_wandstange',gondel:'outlet_doppelstange'}),
      herren: Object.freeze({wand:'outlet_wandstange',gondel:'outlet_doppelstange'}),
      kinder: Object.freeze({wand:'outlet_wandstange',gondel:'outlet_doppelstange'}),
      schuhe: Object.freeze({wand:'outlet_schuh_kartons',gondel:'outlet_schuhe'}),
      taschen: Object.freeze({wand:'outlet_taschenwand',gondel:'outlet_accessoires'}),
      accessoires: Object.freeze({wand:'outlet_taschenwand',gondel:'outlet_accessoires'}),
      home: Object.freeze({wand:'outlet_homewand',gondel:'outlet_home'}),
      beauty: Object.freeze({wand:'outlet_homewand',gondel:'outlet_beauty'}),
    }),
  }),
  schwester: Object.freeze({
    id: 'schwester', titel: 'Volkskauf',
    boden: Object.freeze({gang:'#e7e3d9',flaeche:'#cbbda9',akzent:'#b9a98f'}),
    wand:'alt_holz_regal', gondel:'gondel_kurzwaren',
    insel:'insel_alt_neuheit', kasse:'kasse_alt_kasse_klein',
    inszenierung:false, treppe:'alt_treppe_offen', beleuchtung:'rasterleuchten',
    abteilungsMoebel: Object.freeze({
      damen: Object.freeze({wand:'alt_damen_haengung',gondel:'gondel_waesche'}),
      herren: Object.freeze({wand:'alt_herren_haengung',gondel:'gondel_kurzwaren'}),
      kinder: Object.freeze({wand:'alt_kinder_mode',gondel:'gondel_spielzeug'}),
      beauty: Object.freeze({wand:'alt_parfuem',gondel:'gondel_geschenke'}),
      accessoires: Object.freeze({wand:'alt_taschen_altholz',gondel:'gondel_kurzwaren'}),
      wohnen: Object.freeze({wand:'alt_haushalt',gondel:'gondel_geschenke'}),
      spielwaren: Object.freeze({wand:'alt_spielwaren',gondel:'gondel_spielzeug'}),
      food: Object.freeze({wand:'alt_feinkost',gondel:'gondel_geschenke'}),
    }),
  }),
});
export function ladeProfil(profil) {
  const p = typeof profil === 'string' ? FORMAT_PROFILE[profil] : profil;
  if (!p || !p.id || !p.boden || !p.gondel || !p.kasse) throw new Error('Unbekanntes Ladenbau-Profil: '+String(profil));
  return p;
}
// Die Belegung erfolgt im Viertelraster; die Prüfung nutzt zusätzlich das feinere Suchraster.
export function gangZellen(meter, raster=LADENBAU.raster) {
  return Math.ceil((meter - 1e-8) / raster);
}
export function rechteckFlaeche(r) { return Math.max(0,r.w) * Math.max(0,r.d); }
export function schneidet(a,b,abstand=0) {
  return a.x < b.x+b.w+abstand-1e-8 && a.x+a.w+abstand > b.x+1e-8 &&
         a.z < b.z+b.d+abstand-1e-8 && a.z+a.d+abstand > b.z+1e-8;
}
