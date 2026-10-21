// Szenarioauswahl, Bestwerte und Zielanzeige. Die Engine bleibt Datenquelle für alle Ziele.
import { esc, geld } from './format.js';
import { szenarioBild } from '../kit/szenarien.js';

const SPEICHERSCHLUESSEL = 'ruhrkauf-szenarien-bestwerte-v1';
const prozent = (w) => Math.max(0, Math.min(100, Math.round(100 * w)));
const leseBestwerte = () => {
  try { return JSON.parse(localStorage.getItem(SPEICHERSCHLUESSEL) || '{}'); }
  catch { return {}; }
};
function speichereBestwert(id, wochen) {
  try {
    const alt = leseBestwerte();
    if (alt[id] !== undefined && alt[id] <= wochen) return;
    alt[id] = wochen;
    localStorage.setItem(SPEICHERSCHLUESSEL, JSON.stringify(alt));
  } catch { /* Privater Modus / kein Speicherzugriff. */ }
}

export function szenarienModul(ctx) {
  let seite = 'karten';
  let letzterSieg = null;
  const start = () => ctx.wahl();

  function zeichneStart() {
    const id = start().szenario;
    const best = leseBestwerte();
    const karten = document.getElementById('startszenarien');
    karten.innerHTML = ctx.E.SZENARIEN.map((k) => '<button type="button" class="sz-karte ' + (id === k.id ? 'ausgewaehlt' : '') +
      '" data-szenario="' + esc(k.id) + '" aria-label="' + esc(k.name + ': ' + k.ziel) + '">' +
      '<span class="sz-bild">' + szenarioBild(k.id) + '</span>' +
      '<b>' + esc(k.name) + '</b><span class="sz-level">' + esc(k.schwierigkeit) + '</span>' +
      '<small>' + esc(k.beschreibung) + '</small><span class="sz-best">' +
      (best[k.id] !== undefined ? 'Bestwert: ' + best[k.id] + ' Wochen' : 'Noch kein Bestwert') +
      '</span></button>').join('');
    document.getElementById('startsetup').hidden = seite !== 'setup';
    document.getElementById('startauswahl').hidden = seite !== 'karten';
    const auswahl = ctx.E.SZENARIEN.find((k) => k.id === id) ?? ctx.E.SZENARIEN[0];
    document.getElementById('szenario-gewaehlt').textContent = auswahl.name + ' · ' + auswahl.ziel;
  }
  document.getElementById('startszenarien').addEventListener('click', (event) => {
    const karte = event.target.closest('[data-szenario]');
    if (!karte) return;
    start().szenario = karte.dataset.szenario;
    seite = 'setup';
    zeichneStart();
  });
  document.getElementById('szenario-zurueck').addEventListener('click', () => {
    seite = 'karten'; zeichneStart();
  });

  function aktualisieren() {
    const spiel = ctx.spiel();
    const zielknopf = document.getElementById('szenarioziel');
    if (!spiel) { zielknopf.hidden = true; return; }
    const ziel = ctx.E.szenarioZiel(spiel);
    zielknopf.hidden = false;
    document.getElementById('szenarioprozent').textContent = ziel.wertung ? prozent(ziel.fortschritt) + ' %' : '∞';
    document.getElementById('szenariofortschritt').style.width = (ziel.wertung ? prozent(ziel.fortschritt) : 100) + '%';
    zielknopf.setAttribute('aria-label', ziel.name + ': ' + ziel.details + '. Szenarioziel öffnen');
    zielknopf.title = ziel.name + ' · ' + ziel.text;
    if (ziel.erreicht && ziel.wertung && letzterSieg !== spiel) {
      letzterSieg = spiel;
      speichereBestwert(ziel.id, spiel.woche);
    }
  }

  function oeffne() {
    const s = ctx.spiel();
    if (!s) return;
    const z = ctx.E.szenarioZiel(s);
    let inhalt = '<article class="karte sz-zielinfo"><div class="sz-zieltitel">' + esc(z.name) + '</div><p>' + esc(z.text) + '</p>' +
      '<div class="sz-balken"><span style="width:' + prozent(z.fortschritt) + '%"></span></div>' +
      '<p><b>' + (z.wertung ? prozent(z.fortschritt) + ' % erreicht' : 'Keine Wertung') + '</b> · ' + esc(z.details) + '</p>' +
      '<p>' + (z.erreicht ? 'Ziel erreicht' : z.gescheitert ? 'Ziel verfehlt' : z.wertung ? 'Herausforderung läuft' : 'Freies Spiel') + '</p></article>';
    if (z.id === 'investor') {
      const eigene = s.haeuser.filter((h) => h.status === 'offen' && h.miete.vermieter === 'eigentuemer').slice(0, 16);
      inhalt += '<h3>Immobilienverkauf mit Rückmietung</h3><p>Der Investor verlangt mindestens einen Verkauf pro Geschäftsjahr. Ein Verkauf erhöht die laufende Miete.</p>' +
        (eigene.map((h) => '<button class="breit" type="button" data-sz-verkauf="' + esc(h.id) + '">' + esc(h.name) + ' verkaufen · ' + geld(Math.max(5_000_000, h.grundflaecheQm * 4_500)) + '</button>').join('') || '<p>Keine verkäuflichen Immobilien vorhanden.</p>');
    }
    ctx.panel('Szenarioziel', 'Woche ' + s.woche, inhalt, 'gross');
  }
  document.getElementById('szenarioziel').addEventListener('click', oeffne);
  document.getElementById('pinhalt').addEventListener('click', (event) => {
    const knopf = event.target.closest('[data-sz-verkauf]');
    if (!knopf) return;
    const r = ctx.E.fuehreAus(ctx.spiel(), { typ: 'immobilieVerkaufen', haus: knopf.dataset.szVerkauf });
    ctx.meldung(r.text, r.ok);
    if (r.ok) { ctx.nachAktion(); oeffne(); }
  });
  return { aktualisieren, oeffne, zeichneStart, neu: () => { seite = 'karten'; zeichneStart(); } };
}
