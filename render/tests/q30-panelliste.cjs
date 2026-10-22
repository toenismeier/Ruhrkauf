// Q30: welche Panels aufgenommen und geprüft werden. `oeffne` läuft im Browser (async Funktionskörper).
// `pruefen: false` = noch nicht umgestellt (nur Bild, keine Stilprüfung). Q31 ergänzt eigene Einträge in q31-panelliste.
const HAUS = "const h = window.spiel.s.haeuser.find((x) => x.stadt === 'Essen' && x.format === 'warenhaus' && x.status === 'offen');";
const menue = (id) => `document.getElementById('menueknopf').click(); await new Promise((r) => setTimeout(r, 120)); document.getElementById('${id}').click();`;

const PANELS = [
  { name: 'start', vorSpiel: true, oeffne: "window.spiel.startZeigen();", wurzel: '#start' },
  { name: 'cockpit', vorSpiel: false, oeffne: "window.spiel.schliessePanel();", wurzel: '.oben, .unten' },
  { name: 'menue', vorSpiel: false, oeffne: "document.getElementById('menueknopf').click();", wurzel: '#menue' },
  { name: 'haus', vorSpiel: false, oeffne: HAUS + " window.spiel.oeffneHausReiter(h.id, 'ueberblick'); document.getElementById('pinhalt').scrollTop = 0;" },
  { name: 'haus-unten', vorSpiel: false, oeffne: HAUS + " window.spiel.oeffneHausReiter(h.id, 'ueberblick');", nach: "const pi = document.getElementById('pinhalt'); pi.scrollTop = pi.scrollHeight * 0.45;" },
  { name: 'haus-leitung', vorSpiel: false, oeffne: HAUS + " window.spiel.oeffneHausReiter(h.id, 'leitung');" },
  { name: 'haus-personal', vorSpiel: false, oeffne: HAUS + " window.spiel.oeffneHausReiter(h.id, 'personal');" },
  { name: 'haus-kosten', vorSpiel: false, oeffne: HAUS + " window.spiel.oeffneHausReiter(h.id, 'kosten');" },
  { name: 'posteingang', vorSpiel: false, oeffne: "window.spiel.oeffnePosteingang();" },
  { name: 'zeitung', vorSpiel: false, oeffne: "window.spiel.oeffneZeitung();" },
  { name: 'reise', vorSpiel: false, oeffne: "window.spiel.reise.oeffne();", wurzel: 'body' },
  { name: 'deutschland', vorSpiel: false, oeffne: "window.spiel.oeffnePortfolio('karte');" },
  { name: 'haeuser', vorSpiel: false, oeffne: "window.spiel.oeffnePortfolio('liste');" },
  { name: 'organisation', vorSpiel: false, oeffne: "window.spiel.oeffneOrganisation();" },
  { name: 'zentrale', vorSpiel: false, oeffne: "window.spiel.oeffneHq();" },
  { name: 'personaleinsatz', vorSpiel: false, oeffne: "window.spiel.oeffnePersonaleinsatz();" },
  { name: 'umbau', vorSpiel: false, oeffne: menue('modernisierung') },
  { name: 'chronik', vorSpiel: false, oeffne: "window.spiel.oeffneChronik();" },
  { name: 'statistik', vorSpiel: false, oeffne: "window.spiel.oeffneStatistik();" },
  { name: 'erfolge', vorSpiel: false, oeffne: "window.spiel.oeffneErfolge();" },
  { name: 'einstellungen', vorSpiel: false, oeffne: "window.spiel.oeffneEinstellungen();" },
  { name: 'wochenfrage', vorSpiel: false, oeffne: "window.spiel.wochenbericht.oeffne();", wurzel: '#wochenbericht, .wochen-maske' },
  { name: 'wochenbericht', vorSpiel: false, oeffne: "window.spiel.wochenbericht.oeffne(); await new Promise((r) => setTimeout(r, 200)); document.querySelector('[data-wa=ja]')?.click(); for (let i = 0; i < 60 && !['bericht','vorfall'].includes(window.spiel.wochenbericht.status); i++) await new Promise((r) => setTimeout(r, 200)); await new Promise((r) => setTimeout(r, 1500));", wurzel: 'body' },
];
module.exports = { PANELS };
