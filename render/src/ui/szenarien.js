// Szenarioauswahl, Bestwerte und Zielanzeige. Die Engine bleibt Datenquelle für alle Ziele.
// G6 (E47): Szenarien als Karussell (Coffee 05, 26), Ziel als Blatt mit Großkennzahl und Skala.
import { esc, geld } from './format.js';
import * as K from './komponenten.js';
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
    const karten = ctx.E.SZENARIEN.map((k) => '<div class="hw-g6-szbild">' + szenarioBild(k.id) + '</div>' +
      '<h3 class="hw-karte-titel">' + esc(k.name) + '</h3>' +
      '<div class="hw-g6-szmarken">' + K.marke(k.schwierigkeit, /sehr/i.test(k.schwierigkeit) ? 'schlecht' : /schwer/i.test(k.schwierigkeit) ? 'achtung' : '') + '</div>' +
      '<p class="hw-lese hw-g6-sztext">' + esc(k.beschreibung) + '</p>' +
      '<p class="hw-lese hw-g6-szbest">' + (k.id === 'sandkasten' ? 'Cash und Kreditrahmen: unbegrenzt · Keine Wertung' :
        best[k.id] !== undefined ? 'Bestwert: ' + best[k.id] + ' Wochen' : 'Noch kein Bestwert') + '</p>' +
      K.knopf('Wählen', 'data-szenario="' + esc(k.id) + '" aria-label="' + esc(k.name + ': ' + k.ziel) + '"', 'breit'));
    const aktiv = Math.max(0, ctx.E.SZENARIEN.findIndex((k) => k.id === id));
    document.getElementById('startszenarien').innerHTML = K.karussell(karten, { aktiv, label: 'Szenarien' });
    document.getElementById('startsetup').hidden = seite !== 'setup';
    document.getElementById('startauswahl').hidden = seite !== 'karten';
    const auswahl = ctx.E.SZENARIEN.find((k) => k.id === id) ?? ctx.E.SZENARIEN[0];
    document.getElementById('szenario-gewaehlt').innerHTML = '<b>' + esc(auswahl.name) + '</b>' +
      esc(auswahl.id === 'sandkasten' ? 'Cash und Kreditrahmen: unbegrenzt · ohne Schwierigkeitsstufen' : auswahl.ziel);
    ctx.stufenAktualisieren?.();
    // Karussell auf die gewählte Karte stellen (Nachbarn schauen an der Kante heraus).
    if (seite === 'karten') requestAnimationFrame(() => {
      const kar = document.querySelector('#startszenarien .hw-karussell'), k = kar?.children[aktiv];
      if (kar && k) { kar.scrollLeft = k.offsetLeft - (kar.clientWidth - k.offsetWidth) / 2; kar.dispatchEvent(new Event('scroll')); }
    });
  }
  document.getElementById('startszenarien').addEventListener('click', (event) => {
    const karte = event.target.closest('[data-szenario]');
    if (!karte) return;
    start().szenario = karte.dataset.szenario;
    seite = 'setup';
    zeichneStart();
    document.getElementById('start').scrollTop = 0;
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
    const stand = z.erreicht ? 'Ziel erreicht' : z.gescheitert ? 'Ziel verfehlt' : z.wertung ? 'Herausforderung läuft' : 'Freies Spiel';
    let inhalt = K.gross([{ label: 'Fortschritt', wert: z.wertung ? prozent(z.fortschritt) + ' %' : 'Keine Wertung', ton: z.erreicht ? 'gut' : z.gescheitert ? 'schlecht' : '', unter: esc(stand) }])
      + K.abschnitt(z.name, 'Szenario') + K.liste([K.zeile({ was: 'Ziel', unter: esc(z.text) }), K.zeile({ was: 'Stand', unter: esc(z.details) })]);
    if (z.id === 'investor') {
      const eigene = s.haeuser.filter((h) => h.status === 'offen' && h.miete.vermieter === 'eigentuemer').slice(0, 16);
      inhalt += K.abschnitt('Immobilienverkauf mit Rückmietung') + '<p class="hw-lese">Der Investor verlangt mindestens einen Verkauf pro Geschäftsjahr. Ein Verkauf erhöht die laufende Miete.</p>' +
        (eigene.length ? K.liste(eigene.map((h) => K.zeile({ was: esc(h.name), wert: geld(Math.max(5_000_000, h.grundflaecheQm * 4_500)), wertUnter: 'verkaufen', tippbar: true, attr: 'data-sz-verkauf="' + esc(h.id) + '"' })))
          : K.leer('Keine verkäuflichen Immobilien vorhanden.'));
    }
    const text = z.erreicht ? 'Das Szenarioziel ist erreicht.' : z.gescheitert ? 'Das Szenarioziel ist verfehlt.' : esc(z.details) + '.';
    ctx.panel('Szenarioziel', 'Woche ' + s.woche, K.bereich('betrieb', 'zahlen') + K.sprecher({ text, ton: z.gescheitert ? 'alarm' : '' }) + '<div class="hw-boden">' + K.rumpf(inhalt) + '</div>', 'gross');
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
