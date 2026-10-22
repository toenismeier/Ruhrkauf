// Q19: ein gemeinsames Produktkarten-Modul für IT und Online, ohne UI-seitige Berechnung von KPIs.
import { esc } from './format.js';

const zahl = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
const anzahl = n => zahl.format(Number(n) || 0);
const iconPfad = {
  kundenkarte: '<rect x="7" y="15" width="104" height="65" rx="8"/><path d="M8 35h102M20 52h30M20 63h42"/><circle cx="91" cy="61" r="9"/>',
  hartwig_app: '<rect x="31" y="7" width="59" height="84" rx="11"/><path d="M52 16h17M57 82h8"/><rect x="42" y="29" width="37" height="31" rx="4"/><path d="M50 39h21M50 46h15M50 53h11"/>',
  kasse: '<path d="M18 43h85v40H18zM26 43V22h68v21M26 62h68M37 72h30"/><rect x="36" y="13" width="49" height="21" rx="3"/><path d="M47 22h27M82 72h8"/>',
  mobile_pay: '<rect x="43" y="7" width="39" height="83" rx="8"/><path d="M57 18h12M60 80h5M53 48h19M53 56h11M20 33q-12 15 0 29M29 40q-6 8 0 15M98 33q12 15 0 29M89 40q6 8 0 15"/>',
};
export const itIllustration = (id) => '<svg class="itp-bild" viewBox="0 0 120 100" role="img" aria-label="' +
  esc(({ kundenkarte:'Kundenkarte',hartwig_app:'Smartphone-App',kasse:'Kassenterminal',mobile_pay:'Mobiles Bezahlen' })[id] ?? 'IT-Produkt') +
  '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (iconPfad[id] ?? '') + '</svg>';

function sterne(n) {
  return '<span class="itp-sterne" aria-label="' + n + ' von 5 Qualitätssternen">' +
    Array.from({ length: 5 }, (_, i) => '<svg viewBox="0 0 24 24" aria-hidden="true" class="' + (i<n ? 'voll' : '') +
      '"><path d="m12 2 3.15 6.38 7.04 1.02-5.09 4.96 1.2 7.01L12 18.07l-6.3 3.3 1.2-7.01-5.09-4.96 7.04-1.02Z"/></svg>').join('') + '</span>';
}
// Version 0.0 = noch nicht eingeführt (z. B. Mobile Pay ohne mobile Kassenstufe): nicht als „Aktiv“ ausweisen.
const status = p => { const neu = p.aktiv && p.version === '0.0';
  return '<span class="itp-status ' + (p.aktiv && !neu ? '' : 'aus') + '">' + (neu ? 'Noch nicht eingeführt' : p.aktiv ? 'Aktiv' : 'Abgeschaltet') + '</span>'; };
const formatAenderung = p => {
  if (p.aenderung === undefined) return '<span class="itp-delta">Ab der zweiten Woche vergleichbar</span>';
  const d = p.aenderung, zeichen = d > 0 ? '+' : d < 0 ? '−' : '±';
  const quote = p.aenderungQuote === undefined ? '' : ' (' + (p.aenderungQuote > 0 ? '+' : '') + (p.aenderungQuote * 100).toFixed(1).replace('.',',') + ' %)';
  return '<span class="itp-delta ' + (d > 0 ? 'positiv' : d < 0 ? 'negativ' : '') + '">' +
    zeichen + anzahl(Math.abs(d)) + ' zur Vorwoche' + quote + '</span>';
};
function kurve(p) {
  const v = p.verlauf;
  if (v.length < 2) return '<p class="itp-leer">Ein Verlauf ist ab der zweiten Woche verfügbar.</p>';
  const min = Math.min(...v.map(x => x.wert)), max = Math.max(...v.map(x => x.wert));
  const breite = 300, hoehe = 90, rand = 9;
  const punkte = v.map((x,i) => {
    const px = rand + i * (breite - 2*rand) / (v.length - 1);
    const py = min === max ? hoehe/2 : hoehe-rand-(x.wert-min)/(max-min)*(hoehe-2*rand);
    return { px, py };
  });
  const str = punkte.map(({px,py})=>px.toFixed(1)+','+py.toFixed(1)).join(' ');
  const labels = v.map(x => '<span><b>KW ' + ((x.woche % 52)+1) + '</b>' + anzahl(x.wert) + '</span>').join('');
  return '<div class="itp-verlauf"><svg viewBox="0 0 300 90" aria-hidden="true" preserveAspectRatio="none">' +
    '<path d="M9 45H291" class="itp-raster"/><polyline points="' + str + '" class="itp-linie"/>' +
    punkte.map(({px,py})=>'<circle cx="'+px+'" cy="'+py+'" r="3.5" class="itp-punkt"/>').join('') + '</svg>' +
    '<div class="itp-achse" aria-label="Wochenwerte">' + labels + '</div></div>';
}
export function itProdukteKarten(produkte, quelle='it') {
  return '<div class="itp-intro">Vier digitale Produkte von Hartwig. Die Kennzahlen stammen aus Marketing, Filialumsatz und E-Commerce.</div>' +
    '<div class="itp-karten">' + produkte.map(p =>
      '<button type="button" class="itp-karte" data-' + quelle + '="produkt" data-' + (quelle==='it'?'v':'id') + '="' + esc(p.id) +
      '" aria-label="' + esc(p.name) + ' öffnen">' +
      '<span class="itp-visual">' + itIllustration(p.id) + '</span>' +
      '<span class="itp-karteinhalt"><span class="itp-kartenkopf"><b>' + esc(p.name) + '</b>' + status(p) + '</span>' +
      '<span class="itp-kurz">' + esc(p.beschreibung[0]) + '</span>' +
      '<strong class="itp-kartenzahl">' + anzahl(p.kennzahl) + '</strong><span class="itp-einheit">' + esc(p.einheit) + '</span>' +
      '<span class="itp-kartenfuss">Version ' + esc(p.version) + ' · Team ' + anzahl(p.team) + ' <span aria-hidden="true">→</span></span></span></button>'
    ).join('') + '</div>';
}
export function itProduktDetail(p, bestaetigen=false) {
  const beschreibung = p.beschreibung.map(t=>'<p>'+esc(t)+'</p>').join('');
  const teamHinweis = 'Zusätzliche IT-Mitarbeiter erhöhen die laufenden Kosten um 1.400 € je Person und Woche.';
  return '<div class="itp-detail"><button type="button" class="itp-zurueck" data-it="zurueck">← Alle Produkte</button>' +
    '<div class="itp-hero"><div class="itp-heroillustration">' + itIllustration(p.id) + '</div>' +
    '<div class="itp-herotext"><span class="itp-ueber">DIGITALES PRODUKT</span><h3>' + esc(p.name) + '</h3>' + status(p) + '</div></div>' +
    '<div class="itp-beschreibung">' + beschreibung + '</div>' +
    '<section class="itp-abschnitt"><div class="itp-abschnittkopf"><h4>Letzte Woche</h4><span>' + esc(p.einheit) + '</span></div>' +
    '<div class="itp-hauptzahl">' + anzahl(p.kennzahl) + '</div>' + formatAenderung(p) + kurve(p) + '</section>' +
    '<section class="itp-abschnitt"><h4>Version und Qualität</h4>' +
    '<div class="itp-datenzeile"><span>Installierte Version</span><b>' + esc(p.version) + '</b></div>' +
    '<div class="itp-datenzeile"><span>Qualität</span>' + sterne(p.sterne) + '</div>' +
    '<div class="itp-datenzeile"><span>Systemgeneration</span><b>' + p.generation + ' von 4</b></div>' +
    '<button type="button" class="itp-taste sekund" data-it="modernisieren" data-v="' + esc(p.id) + '">Version modernisieren</button></section>' +
    '<section class="itp-abschnitt"><h4>Zugewiesenes Team</h4>' +
    '<div class="itp-team"><strong>' + anzahl(p.team) + '</strong><span>Personen</span>' +
    '<button type="button" class="itp-taste sekund" data-it="team" data-n="-3" data-v="' + esc(p.id) +
    '"' + (p.team < 3 ? ' disabled' : '') + ' aria-label="Drei Personen abziehen">−3</button>' +
    '<button type="button" class="itp-taste primaer" data-it="team" data-n="3" data-v="' + esc(p.id) +
    '"' + (p.team >= 30 ? ' disabled' : '') + '>+3</button></div>' +
    '<p class="itp-hinweis">' + teamHinweis + ' Aktuell: ' + anzahl(p.teamKostenWoche) + ' € pro Woche.</p></section>' +
    '<section class="itp-abschnitt"><h4>Produktkennzahlen</h4>' +
    p.details.map(([t,v])=>'<div class="itp-datenzeile"><span>'+esc(t)+'</span><b>'+esc(typeof v==='number'?anzahl(v):String(v))+'</b></div>').join('') +
    '</section>' +
    '<section class="itp-abschnitt itp-gefahr"><h4>Betrieb</h4>' +
    (bestaetigen ? '<p>Produkt wirklich abschalten? Die Auswirkung auf die Filialnachfrage wird ab der nächsten Woche berücksichtigt.</p>' +
      '<div class="itp-aktionen"><button type="button" class="itp-taste sekund" data-it="abbrechen">Abbrechen</button>' +
      '<button type="button" class="itp-taste warnung" data-it="aktiv" data-v="' + esc(p.id) + '">Abschalten bestätigen</button></div>' :
      '<p>' + (p.aktiv ? 'Bei Abschaltung wird der Betrieb dieses Produkts eingeschränkt.' : 'Das Produkt ist abgeschaltet und kann wieder aktiviert werden.') + '</p>' +
      '<button type="button" class="itp-taste ' + (p.aktiv?'sekund':'primaer') + '" data-it="' + (p.aktiv?'abschalten':'aktiv') +
        '" data-v="' + esc(p.id) + '">' + (p.aktiv?'Abschalten':'Wieder aktivieren') + '</button>') +
    '</section></div>';
}
