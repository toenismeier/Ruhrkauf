// Konzernchronik: rein lesende Darstellung der Engine-Daten und der Fassaden aus dem Kit.
import { esc } from './format.js';

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
    const stationen = d.geschichte.map((x, i) => {
      const url = fassade(x.familie);
      return `<article class="chronik-station">
        <div class="chronik-jahr">${x.jahr}</div>
        <div class="chronik-inhalt">
          <h3>${esc(x.titel)}</h3>
          ${url ? `<img class="chronik-motiv" loading="lazy" src="${url}" alt="Historische Hartwig-Fassade, Bautyp ${x.familie}">` : ''}
          <p>${esc(x.text)}</p><small>Motiv: ${esc(x.motiv)}</small>
        </div>
      </article>`;
    }).join('');
    const spiel = d.spiel.map(x => `<article class="chronik-spiel"><small>${jahreswoche(x.woche)} · ${esc(x.art)}</small><p>${esc(x.text)}</p><span>Bezug: ${esc(x.bezug)}</span></article>`).join('');
    panel('Konzernchronik', `${d.geschichte.length} Stationen · ${d.spiel.length} Spielereignisse`,
      `<div class="chronik"><div class="karte"><b>Hartwig im Wandel der Zeit</b><p>Die Gründungsgeschichte der fiktiven Warenhausgruppe. Die Chronik ist jederzeit abrufbar, auch ohne gemietete Archiv-Etage.</p></div>
      <h2>Unternehmensgeschichte</h2><div class="chronik-linie">${stationen}</div>
      <h2>Ihre Spielchronik</h2>${spiel || '<div class="karte">Noch keine Meilensteine. Entscheidungen und Quartalsrekorde erscheinen im Spielverlauf.</div>'}
      </div>`, 'gross');
  }
  return { oeffne, zu() {}, pruefe: () => E.chronikUebersicht(s()) };
}
