// N03: reine Darstellung; alle Entscheidungen über Freischaltungen trifft die Engine.
import { esc } from './format.js';
import * as K from './komponenten.js';
import { abzeichen } from '../kit/abzeichen.js';

export function erfolgeModul(ctx) {
  const E = ctx.E, spielstand = ctx.s;
  const zustand = { offen: false, filter: 'Alle' };
  const toast = document.createElement('div');
  toast.id = 'erfolge-toast';
  toast.className = 'hw-g6';
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
    // G6 (E47): Großkennzahl, Vitrine, Nächstes als Skala, alle Abzeichen nach Gruppe (Segment) als Liste.
    let h = K.gross([{ label: 'Abzeichen', wert: frei.length + ' von ' + alle.length, unter: frei.length ? 'zuletzt: ' + esc(frei[0].titel) : 'noch keines' }]);
    h += K.abschnitt('Vitrine', frei.length + ' freigeschaltet');
    h += frei.length ? '<div class="erfolge-vitrine hw-g6-vitrine">' + frei.map((e) => '<figure title="' + esc(e.titel) + '">' + bild(e) + '<figcaption class="hw-lese">' + esc(e.titel) + '</figcaption></figure>').join('') + '</div>'
      : K.leer('Das erste Abzeichen kommt meist mit dem ersten Wochenabschluss.', 'Vitrine leer');
    if (nah.length) h += K.abschnitt('In Reichweite') + nah.map((e) => K.skala(e.titel, e.fortschritt * 100) + '<p class="hw-lese hw-g6-hinweistext">' + esc(e.hinweis) + '</p>').join('');
    h += K.abschnitt('Alle Abzeichen', ausw.filter(freigeschaltet).length + ' von ' + ausw.length);
    h += '<div class="hw-g6-filter">' + K.seg(gruppen.map((g) => [g, g]), zustand.filter, (g) => 'data-erfolge-filter="' + g + '"') + '</div>';
    h += K.liste(ausw.map((e) => {
      const ok = freigeschaltet(e), geheim = e.geheim && !ok;
      return '<div class="hw-zeile erfolge-karte' + (ok ? ' frei' : ' gesperrt') + '" data-erfolg="' + esc(e.id) + '" aria-label="' + (geheim ? 'Geheimer Erfolg' : esc(e.titel)) + '">' +
        (geheim ? '<span class="erfolge-geheim" aria-hidden="true"></span>' : bild(e)) +
        '<span class="hw-was">' + (geheim ? 'Geheim' : esc(e.titel)) + '<small>' + (geheim ? 'noch nicht enthüllt' : esc(e.gruppe + ' · ' + e.stufe + (ok ? '' : ' · ' + e.hinweis))) + '</small></span>' +
        '<span class="hw-wert' + (ok ? ' gut' : '') + '">' + (ok ? 'KW ' + ((((e.freigeschaltet % 52) + 52) % 52) + 1) : geheim ? '' : Math.round(e.fortschritt * 100) + ' %') + '</span></div>';
    }));
    const text = frei.length ? `${frei.length} von ${alle.length} Abzeichen erreicht.` + (nah[0] ? ` Am nächsten: ${esc(nah[0].titel)}.` : '') : 'Noch kein Abzeichen. Das erste kommt meist mit dem ersten Wochenabschluss.';
    return K.bereich('betrieb', 'pokal') + K.sprecher({ text }) + '<div class="hw-boden">' + K.rumpf('<div class="hw-g6-erfolge">' + h + '</div>') + '</div>';
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
    // Nicht über Wochenbericht oder Vorgang legen: warten, bis das Blatt geschlossen ist.
    if (document.body.classList.contains('wochen-aktiv')) { clearTimeout(toastTimer); toastTimer = setTimeout(naechstes, 700); return; }
    zeigt = true;
    const e = schlange.shift();
    toast.innerHTML = '<div class="erfolge-toast-bild">' + bild(e) + '</div><div><small class="hw-marke">Neuer Erfolg · ' + esc(e.gruppe) +
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
