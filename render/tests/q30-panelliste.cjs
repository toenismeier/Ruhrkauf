// Q30: welche Panels aufgenommen und geprüft werden. `oeffne` läuft im Browser (async Funktionskörper).
// `umgestellt: false` = noch nicht umgestellt (nur Bild, keine Stilprüfung). Q31 ergänzt eigene Einträge in q31-panelliste.
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
  { name: 'beobachtung', vorSpiel: false, oeffne: "window.spiel.oeffneBeobachtung();" },
  { name: 'kommentare', vorSpiel: false, oeffne: "window.spiel.oeffneHausReporting();" },
  { name: 'wettbewerber', vorSpiel: false, oeffne: "const w = window.spiel.E.wettbewerbFuerGrafik(window.spiel.s, 'Essen')[0]; window.spiel.oeffneWettbewerber(w.id);" },
  { name: 'umbau-planen', vorSpiel: false, oeffne: HAUS + " window.spiel.oeffneHausReiter(h.id, 'ueberblick'); await new Promise((r) => setTimeout(r, 100)); document.querySelector('#pinhalt [data-umbau=planen]').click();" },
  { name: 'hausbesuch', vorSpiel: false, oeffne: HAUS + " window.spiel.oeffneHausbesuch(h.id); await new Promise((r) => setTimeout(r, 2500));", wurzel: '.hb', nach: "" },
  { name: 'einfuehrung', vorSpiel: false, oeffne: "document.getElementById('einfuehrung-neustart').click(); await new Promise((r) => setTimeout(r, 400));", wurzel: '.ein-sheet' },
  { name: 'wochenfrage', vorSpiel: false, oeffne: "window.spiel.wochenbericht.oeffne();", wurzel: '#wochenbericht, .wochen-maske' },
  { name: 'wochenbericht', vorSpiel: false, oeffne: "window.spiel.wochenbericht.oeffne(); await new Promise((r) => setTimeout(r, 200)); document.querySelector('[data-wa=ja]')?.click(); for (let i = 0; i < 60 && !['bericht','vorfall'].includes(window.spiel.wochenbericht.status); i++) await new Promise((r) => setTimeout(r, 200)); await new Promise((r) => setTimeout(r, 1500));", wurzel: 'body' },
  // Zuletzt, weil es den Spielstand beendet:
  { name: 'spielende', vorSpiel: false, oeffne: "const s = window.spiel.s; s.woche = 260; window.spiel.E.spielBeenden(s, 'saniert'); window.spiel.zeigeSpielende(); await new Promise((r) => setTimeout(r, 1200));", wurzel: '#spielende-overlay' },
  { name: 'spielende-bilanz', vorSpiel: false, oeffne: "window.spiel.zeigeSpielende(); await new Promise((r) => setTimeout(r, 300)); document.querySelector('[data-se=bilanz]')?.click(); await new Promise((r) => setTimeout(r, 1200));", wurzel: '#spielende-overlay' },
];
// Q30: alle Spiel-Panels sind umgestellt und werden geprüft.
module.exports = { PANELS: PANELS.map((p) => ({ umgestellt: true, ...p })) };
