// Q31: Management-Panels für Aufnahme und Stilprüfung (spiel-render.js --nur-panels liest diese Liste mit).
// `umgestellt: true` = auf Q30-Bausteine und dunklen Zentrale-Look umgestellt, Stilprüfung endet bei Verstoß mit Fehler.
const menue = (id) => `document.getElementById('menueknopf').click(); await new Promise((r) => setTimeout(r, 120)); document.getElementById('${id}').click();`;
const PANELS = [
  { name: 'q31-einkauf', vorSpiel: false, umgestellt: true, oeffne: "window.spiel.einkauf.oeffne('uebersicht');" },
  { name: 'q31-einkauf-wg', vorSpiel: false, umgestellt: true, oeffne: "window.spiel.einkauf.oeffne('wg', 'damen.kleider');" },
  { name: 'q31-freigaben', vorSpiel: false, umgestellt: true, oeffne: "window.spiel.einkauf.oeffne('freigaben');" },
  { name: 'q31-eigenmarken', vorSpiel: false, umgestellt: true, oeffne: "window.spiel.einkauf.oeffne('eigenmarken');" },
  { name: 'q31-merchandise', vorSpiel: false, umgestellt: true, oeffne: "window.spiel.einkauf.oeffne('merchandise');" },
  // G2 (E47): weitere Seiten aus Einkauf, Ware, Planung und Vertrieb
  { name: 'g2-allokation', vorSpiel: false, umgestellt: true, oeffne: "window.spiel.einkauf.oeffne('allokation');" },
  { name: 'g2-reduzierung', vorSpiel: false, umgestellt: true, oeffne: "window.spiel.einkauf.oeffne('reduzierungKalender');" },
  { name: 'g2-einkauf-unten', vorSpiel: false, umgestellt: true, oeffne: "window.spiel.einkauf.oeffne('uebersicht');", nach: "const pi = document.getElementById('pinhalt'); pi.scrollTop = pi.scrollHeight;" },
  { name: 'g2-einkauf-wg-unten', vorSpiel: false, umgestellt: true, oeffne: "window.spiel.einkauf.oeffne('wg', 'damen.kleider');", nach: "const pi = document.getElementById('pinhalt'); pi.scrollTop = pi.scrollHeight * 0.55;" },
  { name: 'g2-freigaben-auf', vorSpiel: false, umgestellt: true, oeffne: "window.spiel.einkauf.oeffne('freigaben'); await new Promise((r) => setTimeout(r, 100)); document.querySelector('#pinhalt [data-a=orderAuf]')?.click();", nach: "document.querySelector('#pinhalt .hw-g2-vorgang.auf')?.scrollIntoView({ block: 'center' });" },
  { name: 'g2-planung-forecast', vorSpiel: false, umgestellt: true, oeffne: "window.spiel.planung.oeffne('forecast');" },
  { name: 'g2-planung-boni', vorSpiel: false, umgestellt: true, oeffne: "window.spiel.planung.oeffne('bonus');" },
  { name: 'g2-vertrieb', vorSpiel: false, umgestellt: true, oeffne: "window.spiel.oeffneOrganisation('vertrieb');", wurzel: '#panel .hw-g2-vertrieb' },
  { name: 'g2-planung-runde', vorSpiel: false, umgestellt: true, oeffne: "window.spiel.planung.oeffne('assistent');" },
  { name: 'q31-produkte', vorSpiel: false, umgestellt: true, oeffne: menue('produkte') },
  { name: 'q31-marketing', vorSpiel: false, umgestellt: true, oeffne: menue('marketing') },
  { name: 'q31-it', vorSpiel: false, umgestellt: true, oeffne: menue('it') },
  { name: 'q31-online', vorSpiel: false, umgestellt: true, oeffne: menue('online') },
  { name: 'q31-planung', vorSpiel: false, umgestellt: true, oeffne: menue('planung') },
  { name: 'q31-reporting', vorSpiel: false, umgestellt: true, oeffne: menue('reporting') },
  { name: 'q31-vorstand', vorSpiel: false, umgestellt: true, oeffne: menue('vorstand') },
  { name: 'q31-spielstaende', vorSpiel: false, umgestellt: true, oeffne: menue('app-oeffnen') },
];
module.exports = { PANELS };
