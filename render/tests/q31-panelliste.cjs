// Q31: Management-Panels für Aufnahme und Stilprüfung (spiel-render.js --nur-panels liest diese Liste mit).
// `umgestellt: true` = auf Q30-Bausteine und dunklen Zentrale-Look umgestellt, Stilprüfung endet bei Verstoß mit Fehler.
const menue = (id) => `document.getElementById('menueknopf').click(); await new Promise((r) => setTimeout(r, 120)); document.getElementById('${id}').click();`;
const PANELS = [
  { name: 'q31-einkauf', vorSpiel: false, umgestellt: true, oeffne: "window.spiel.einkauf.oeffne('uebersicht');" },
  { name: 'q31-einkauf-wg', vorSpiel: false, umgestellt: true, oeffne: "window.spiel.einkauf.oeffne('wg', 'damen.kleider');" },
  { name: 'q31-freigaben', vorSpiel: false, umgestellt: true, oeffne: "window.spiel.einkauf.oeffne('freigaben');" },
  { name: 'q31-eigenmarken', vorSpiel: false, umgestellt: true, oeffne: "window.spiel.einkauf.oeffne('eigenmarken');" },
  { name: 'q31-merchandise', vorSpiel: false, umgestellt: true, oeffne: "window.spiel.einkauf.oeffne('merchandise');" },
  { name: 'q31-produkte', vorSpiel: false, umgestellt: true, oeffne: menue('produkte') },
  { name: 'q31-marketing', vorSpiel: false, umgestellt: true, oeffne: menue('marketing') },
  { name: 'q31-it', vorSpiel: false, umgestellt: true, oeffne: menue('it') },
  { name: 'q31-online', vorSpiel: false, umgestellt: true, oeffne: menue('online') },
  // G3 (E47): Unterseiten von Marketing, IT und Online
  { name: 'g3-marketing-kanaele', vorSpiel: false, umgestellt: true, oeffne: "window.spiel.oeffneMarketing('kanaele');" },
  { name: 'g3-marketing-staedte', vorSpiel: false, umgestellt: true, oeffne: "window.spiel.oeffneMarketing('stadt');" },
  { name: 'g3-marketing-karte', vorSpiel: false, umgestellt: true, oeffne: "window.spiel.oeffneMarketing('karte');" },
  { name: 'g3-marketing-crm', vorSpiel: false, umgestellt: true, oeffne: "window.spiel.oeffneMarketing('crm');" },
  { name: 'g3-marketing-kalender', vorSpiel: false, umgestellt: true, oeffne: "window.spiel.oeffneMarketing('kalender');" },
  { name: 'g3-marketing-aktion', vorSpiel: false, umgestellt: true, oeffne: "const a = window.spiel.E.aktionskalender(window.spiel.s).eintraege[0]; window.spiel.oeffneMarketing('aktion', a.id);" },
  { name: 'g3-it-produkte', vorSpiel: false, umgestellt: true, oeffne: "window.spiel.oeffneIt('produkte');" },
  { name: 'g3-it-produkt', vorSpiel: false, umgestellt: true, oeffne: "window.spiel.oeffneIt('produkte', 'hartwig_app');" },
  { name: 'g3-it-projekte', vorSpiel: false, umgestellt: true, oeffne: "window.spiel.oeffneIt('projekte');" },
  { name: 'g3-it-neu', vorSpiel: false, umgestellt: true, oeffne: "window.spiel.oeffneIt('neu');" },
  { name: 'g3-online-steuerung', vorSpiel: false, umgestellt: true, oeffne: "window.spiel.oeffneEcommerce('steuerung');" },
  { name: 'g3-online-haeuser', vorSpiel: false, umgestellt: true, oeffne: "window.spiel.oeffneEcommerce('haeuser');" },
  { name: 'g3-marketing-kanaele-unten', vorSpiel: false, umgestellt: true, oeffne: "window.spiel.oeffneMarketing('kanaele');", nach: "const pi = document.getElementById('pinhalt'); pi.scrollTop = 520;" },
  { name: 'g3-marketing-kachel', vorSpiel: false, umgestellt: true, oeffne: "window.spiel.oeffneMarketing('karte'); await new Promise((r) => setTimeout(r, 100)); document.querySelector('#pinhalt [data-a=kachel][data-v=\"6\"]').click();", nach: "const pi = document.getElementById('pinhalt'); pi.scrollTop = 760;" },
  { name: 'g3-marketing-planen', vorSpiel: false, umgestellt: true, oeffne: "window.spiel.oeffneMarketing('kalender'); await new Promise((r) => setTimeout(r, 100)); document.querySelector('#pinhalt [data-a=planen]').click();", nach: "const pi = document.getElementById('pinhalt'); pi.scrollTop = 420;" },
  { name: 'g3-it-produkt-unten', vorSpiel: false, umgestellt: true, oeffne: "window.spiel.oeffneIt('produkte', 'hartwig_app');", nach: "const pi = document.getElementById('pinhalt'); pi.scrollTop = pi.scrollHeight;" },
  { name: 'g3-online-unten', vorSpiel: false, umgestellt: true, oeffne: "window.spiel.oeffneEcommerce('uebersicht');", nach: "const pi = document.getElementById('pinhalt'); pi.scrollTop = pi.scrollHeight;" },
  { name: 'g3-online-produkte', vorSpiel: false, umgestellt: true, oeffne: "window.spiel.oeffneEcommerce('produkte');" },
  { name: 'q31-planung', vorSpiel: false, umgestellt: true, oeffne: menue('planung') },
  { name: 'q31-reporting', vorSpiel: false, umgestellt: true, oeffne: menue('reporting') },
  { name: 'q31-vorstand', vorSpiel: false, umgestellt: true, oeffne: menue('vorstand') },
  { name: 'q31-spielstaende', vorSpiel: false, umgestellt: true, oeffne: menue('app-oeffnen') },
];
module.exports = { PANELS };
