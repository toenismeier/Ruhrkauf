// N03: reine Darstellung; alle Entscheidungen über Freischaltungen trifft die Engine.
import { esc } from './format.js';
import * as K from './komponenten.js';
import { abzeichen } from '../kit/abzeichen.js';

export function erfolgeModul(ctx) {
  const E = ctx.E, spielstand = ctx.s;
  const zustand = { offen: false, filter: 'Alle' };
  const toast = document.createElement('div');
  toast.id = 'erfolge-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.hidden = true;
  document.body.append(toast);
  const schlange = [];
  let toastTimer = null, zeigt = false;
  const liste = () => E.erfolgeUebersicht(spielstand());
  const freigeschaltet = (e) => Object.prototype.hasOwnProperty.call(e, 'freigeschaltet');
  const bild = (e) => '<img class="erfolge-bild" src="' + abzeichen(e.gruppe, e.stufe) + '" alt="">';

  // Q30: Hauptfrage „Was habe ich erreicht, und was ist als Nächstes in Reichweite?“ Erreichtes steht in der Vitrine.
  function karten() {
    const alle = liste();
    const frei = alle.filter(freigeschaltet).sort((a, b) => b.freigeschaltet - a.freigeschaltet);
    const gruppen = ['Alle', 'Sanierung', 'Handel', 'Menschen', 'Formate', 'Kurios'];
    const ausw = zustand.filter === 'Alle' ? alle : alle.filter(e => e.gruppe === zustand.filter);
    const nah = alle.filter((e) => !freigeschaltet(e) && !e.geheim).sort((a, b) => b.fortschritt - a.fortschritt).slice(0, 3);
    let h = K.gross([{ label: 'Abzeichen', wert: frei.length + ' von ' + alle.length, unter: frei.length ? 'zuletzt: ' + esc(frei[0].titel) : 'noch keines' }]);
    h += K.abschnitt('Vitrine', frei.length + ' freigeschaltet');
    h += frei.length ? '<div class="erfolge-vitrine">' + frei.map((e) => '<figure title="' + esc(e.titel) + '">' + bild(e) + '<figcaption>' + esc(e.titel) + '</figcaption></figure>').join('') + '</div>'
      : K.leer('Das erste Abzeichen kommt meist mit dem ersten Wochenabschluss.', 'Vitrine leer');
    if (nah.length) h += K.abschnitt('In Reichweite') + K.liste(nah.map((e) => K.zeile({ was: esc(e.titel), unter: esc(e.hinweis), wert: Math.round(e.fortschritt * 100) + ' %' })));
    h += K.abschnitt('Alle Abzeichen') + K.seg(gruppen.map((g) => [g, g]), zustand.filter, (g) => 'data-erfolge-filter="' + g + '"');
    h += '<div class="erfolge-raster">' + ausw.map(e => {
      const ok = freigeschaltet(e), geheim = e.geheim && !ok;
      return '<article class="erfolge-karte' + (ok ? ' frei' : ' gesperrt') + '" data-erfolg="' + esc(e.id) + '" aria-label="' + (geheim ? 'Geheimer Erfolg' : esc(e.titel)) + '">' +
        (geheim ? '<div class="erfolge-geheim" aria-hidden="true"></div>' : bild(e)) +
        '<b>' + (geheim ? 'Geheim' : esc(e.titel)) + '</b>' +
        '<small>' + (geheim ? 'noch nicht enthüllt' : esc(e.gruppe + ' · ' + e.stufe)) + '</small>' +
        (ok ? '<span class="erfolge-frei">seit KW ' + ((e.freigeschaltet % 52) + 1) + '</span>' :
          geheim ? '' : '<span class="erfolge-hinweis">' + esc(e.hinweis) + '</span><span class="erfolge-prozent">' + Math.round(e.fortschritt * 100) + ' %</span>') + '</article>';
    }).join('') + '</div>';
    return K.bereich('betrieb', 'zahlen') + K.rumpf(h);
  }
  function neuZeichnen() {
    if (!zustand.offen) return;
    ctx.panel('Erfolge', 'Meilensteine, Handel und besondere Momente', karten(), 'gross');
    zustand.offen = true;
    const node = document.getElementById('pinhalt');
    node.querySelectorAll('[data-erfolge-filter]').forEach(b => b.addEventListener('click', () => {
      zustand.filter = b.dataset.erfolgeFilter;
      neuZeichnen();
    }));
  }
  function oeffne() { zustand.offen = true; neuZeichnen(); }
  function zu() { zustand.offen = false; }
  function naechstes() {
    if (zeigt || !schlange.length) return;
    zeigt = true;
    const e = schlange.shift();
    toast.innerHTML = '<div class="erfolge-toast-bild">' + bild(e) + '</div><div><small>NEUER ERFOLG · ' + esc(e.gruppe) +
      '</small><strong>' + esc(e.titel) + '</strong><span>' + esc(e.hinweis) + '</span></div>';
    toast.hidden = false;
    requestAnimationFrame(() => toast.classList.add('sichtbar'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('sichtbar');
      setTimeout(() => { toast.hidden = true; zeigt = false; naechstes(); }, 180);
    }, 2500);
  }
  function nachWoche(vorher) {
    if (!spielstand() || spielstand().erfolgeAktiv === false) return [];
    const neu = liste().filter(e => freigeschaltet(e) && !vorher.has(e.id));
    schlange.push(...neu);
    naechstes();
    if (zustand.offen) neuZeichnen();
    return neu.map(e => e.titel);
  }
  return { oeffne, zu, aktiv: () => zustand.offen, neuZeichnen, nachWoche,
    pruefe: () => ({ gesamt: liste().length, frei: liste().filter(freigeschaltet).length, toast: !toast.hidden }) };
}
