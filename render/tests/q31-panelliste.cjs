// Q31: Management-Panels für Aufnahme und Stilprüfung (spiel-render.js --nur-panels liest diese Liste mit).
// `umgestellt: true` = auf Q30-Bausteine und dunklen Zentrale-Look umgestellt, Stilprüfung endet bei Verstoß mit Fehler.
const menue = (id) => `document.getElementById('menueknopf').click(); await new Promise((r) => setTimeout(r, 120)); document.getElementById('${id}').click();`;
const PANELS = [
  { name: 'q31-einkauf', vorSpiel: false, umgestellt: true, oeffne: "window.spiel.einkauf.oeffne('uebersicht');" },
  { name: 'q31-einkauf-wg', vorSpiel: false, umgestellt: true, oeffne: "window.spiel.einkauf.oeffne('wg', 'damen.kleider');" },
  { name: 'q31-freigaben', vorSpiel: false, umgestellt: true, oeffne: "window.spiel.einkauf.oeffne('freigaben');" },
  { name: 'q31-eigenmarken', vorSpiel: false, umgestellt: true, oeffne: "window.spiel.einkauf.oeffne('eigenmarken');" },
  { name: 'q31-merchandise', vorSpiel: false, umgestellt: false, oeffne: "window.spiel.einkauf.oeffne('merchandise');" },
  { name: 'q31-produkte', vorSpiel: false, umgestellt: true, oeffne: menue('produkte') },
  { name: 'q31-marketing', vorSpiel: false, umgestellt: true, oeffne: menue('marketing') },
  { name: 'q31-it', vorSpiel: false, umgestellt: false, oeffne: menue('it') },
  { name: 'q31-online', vorSpiel: false, umgestellt: false, oeffne: menue('online') },
  { name: 'q31-planung', vorSpiel: false, umgestellt: false, oeffne: menue('planung') },
  { name: 'q31-reporting', vorSpiel: false, umgestellt: false, oeffne: menue('reporting') },
  { name: 'q31-vorstand', vorSpiel: false, umgestellt: false, oeffne: menue('vorstand') },
  { name: 'q31-spielstaende', vorSpiel: false, umgestellt: false, oeffne: menue('app-oeffnen') },
];
module.exports = { PANELS };
