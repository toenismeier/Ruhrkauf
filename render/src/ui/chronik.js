// Konzernchronik: rein lesende Darstellung der Engine-Daten und der Fassaden aus dem Kit.
// G6 (E47): dunkles Blatt wie die übrigen Archive. Oben, was unter Ihrer Führung geschah; darunter die Geschichte als
// Karussell (Coffee 05): je Station eine Karte mit Fassade, Jahr und Text.
import { esc } from './format.js';
import * as K from './komponenten.js';

export function chronikModul({ E, s, panel, bild }) {
  const jahreswoche = (w) => `${s().startJahr + Math.floor(w / 52)} · KW ${String(w % 52 + 1).padStart(2, '0')}`;
  const bilder = new Map();
  function fassade(familie) {
    if (!bilder.has(familie)) {
      try { bilder.set(familie, bild(familie)); }
      catch (err) { console.warn('Chronikfassade konnte nicht dargestellt werden', err); bilder.set(familie, ''); }
    }
    return bilder.get(familie);
  }
  function oeffne() {
    const d = E.chronikUebersicht(s());
    const stationen = d.geschichte.map((x) => {
      const url = fassade(x.familie);
      return `<div class="chronik-station">${url ? `<img class="chronik-motiv" loading="lazy" src="${url}" alt="Historische Hartwig-Fassade, Bautyp ${x.familie}">` : ''}`
        + `<span class="hw-marke hw-g6-jahr">${x.jahr}</span><h3 class="hw-karte-titel">${esc(x.titel)}</h3>`
        + `<p class="hw-lese">${esc(x.text)}</p><p class="hw-lese hw-g6-motiv">Motiv: ${esc(x.motiv)}</p></div>`;
    });
    const spiel = d.spiel.map((x) => K.zeile({ was: esc(x.text), unter: esc(jahreswoche(x.woche) + ' · ' + x.art + ' · Bezug: ' + x.bezug) }));
    const erste = d.geschichte[0];
    const befund = d.spiel.length ? `Unter Ihrer Führung sind ${d.spiel.length} Einträge dazugekommen.` : `Hartwig blickt auf ${erste ? s().startJahr + Math.floor(s().woche / 52) - erste.jahr : 0} Jahre zurück. Ihr Kapitel beginnt jetzt.`;
    panel('Konzernchronik', `${d.geschichte.length} Stationen · ${d.spiel.length} Spielereignisse`,
      K.bereich('betrieb', 'chronik') + K.sprecher({ text: esc(befund) }) + '<div class="hw-boden">' + K.rumpf(
        K.abschnitt('Unter Ihrer Führung', `${d.spiel.length} Einträge`)
        + (spiel.length ? K.liste(spiel) : K.leer('Entscheidungen und Quartalsrekorde erscheinen hier im Spielverlauf.', 'Noch keine Einträge'))
        + K.abschnitt(`Hartwig seit ${erste?.jahr ?? ''}`, `${d.geschichte.length} Stationen`))
      + `<div class="hw-g6-chronik">${K.karussell(stationen, { label: 'Stationen der Konzerngeschichte' })}</div></div>`, 'gross');
  }
  return { oeffne, zu() {}, pruefe: () => E.chronikUebersicht(s()) };
}
