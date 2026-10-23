// Q32: Zustände aus Wurf 3 (testflight/wurf-3/BEFUNDE.md), die Q30/Q31 nicht abdecken.
// spiel-render.js --nur-panels prüft sie mit Stil-, Überlauf-, Kontrast- und Textprüfung.
const HAUS = "const h = window.spiel.s.haeuser.find((x) => x.stadt === 'Essen' && x.format === 'warenhaus' && x.status === 'offen');";
const menue = (id) => `document.getElementById('menueknopf').click(); await new Promise((r) => setTimeout(r, 120)); document.getElementById('${id}').click(); await new Promise((r) => setTimeout(r, 150));`;
const klick = (sel) => `document.querySelector(${JSON.stringify(sel)})?.click(); await new Promise((r) => setTimeout(r, 150));`;
const NEU = menue('produkte') + klick('#pinhalt [data-a=neu]');

const PANELS = [
  { name: 'q32-produkt-neu', oeffne: NEU + klick('#pinhalt [data-a=q24Fach][data-v=kinder]') + klick('#pinhalt [data-a=q24Ziel][data-v=teens]') + klick('#pinhalt [data-a=baumKat]') + "document.querySelector('#pinhalt .q24-anzahl')?.scrollIntoView();" },
  { name: 'q32-produkt-neu-ast', oeffne: NEU + klick('#pinhalt [data-a=baumKat]') + klick('#pinhalt [data-a=baumAst]') + "document.querySelector('#pinhalt [data-a=baumAst]')?.scrollIntoView();" },
  { name: 'q32-produkt-ziel', oeffne: NEU + klick('#pinhalt [data-a=baumKat]') + klick('#pinhalt [data-a=baumAst]') + klick('#pinhalt [data-a=typ]:not(.voll)') },
  { name: 'q32-produkt-konfig', oeffne: NEU + klick('#pinhalt [data-a=baumKat]') + klick('#pinhalt [data-a=baumAst]') + klick('#pinhalt [data-a=typ]:not(.voll)') + klick('#pinhalt [data-a=zielgruppe]') },
  { name: 'q32-produktentwicklung', oeffne: menue('produkte'), nach: "const pi = document.getElementById('pinhalt'); pi.scrollTop = 260;" },
  { name: 'q32-cdo', oeffne: menue('vorstand') + klick('#pinhalt [data-a=profil][data-v=cdo]') + klick('#pinhalt [data-a=einstellen][data-v=cdo]') + "const pi = document.getElementById('pinhalt'); pi.scrollTop = 0;", nach: "const pi = document.getElementById('pinhalt'); pi.scrollTop = 0;" },
  { name: 'q32-cdo-angebot', oeffne: menue('vorstand') + klick('#pinhalt [data-a=profil][data-v=cdo]') + klick('#pinhalt [data-a=einstellen][data-v=cdo]') + klick('#pinhalt [data-a=kandidat][data-v="2"]'), nach: "const a = document.querySelector('#pinhalt [data-angebot]') ?? [...document.querySelectorAll('#pinhalt *')].find((e) => /^Angebot an/.test(e.textContent.trim())); a?.scrollIntoView();" },
  { name: 'q32-controlling', oeffne: "window.hqKlick('abteilung', 'controlling');" },
  { name: 'q32-controlling-unten', oeffne: "window.hqKlick('abteilung', 'controlling');", nach: "const pi = document.getElementById('pinhalt'); pi.scrollTop = pi.scrollHeight * 0.5;" },
  { name: 'q32-zentrale-unten', oeffne: "window.spiel.oeffneHq();", nach: "const pi = document.getElementById('pinhalt'); pi.scrollTop = 420;" },
  { name: 'q32-haus-flaeche', oeffne: HAUS + " window.spiel.oeffneHausReiter(h.id, 'partner');", nach: "const pi = document.getElementById('pinhalt'); pi.scrollTop = pi.scrollHeight;" },
  { name: 'q32-freigaben-liste', oeffne: "window.spiel.einkauf.oeffne('freigaben');", nach: "const pi = document.getElementById('pinhalt'); pi.scrollTop = 520;" },
];
module.exports = { PANELS: PANELS.map((p) => ({ umgestellt: true, vorSpiel: false, ...p })) };
