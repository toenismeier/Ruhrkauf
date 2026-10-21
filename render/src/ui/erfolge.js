// N03: reine Darstellung; alle Entscheidungen über Freischaltungen trifft die Engine.
import { esc } from './format.js';
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

  function karten() {
    const alle = liste();
    const offen = alle.filter(freigeschaltet).length;
    const gruppen = ['Alle', 'Sanierung', 'Handel', 'Menschen', 'Formate', 'Kurios'];
    const ausw = zustand.filter === 'Alle' ? alle : alle.filter(e => e.gruppe === zustand.filter);
    return '<div class="erfolge-seite"><div class="erfolge-kopf"><b>' + offen + ' / ' + alle.length + '</b><span>Abzeichen freigeschaltet</span>' +
      '<div class="erfolge-balken" role="progressbar" aria-valuenow="' + offen + '" aria-valuemin="0" aria-valuemax="' + alle.length + '"><i style="width:' + (alle.length ? offen / alle.length * 100 : 0) + '%"></i></div></div>' +
      '<div class="erfolge-filter" role="group" aria-label="Erfolge filtern">' + gruppen.map(g => '<button type="button" data-erfolge-filter="' + g +
      '" class="' + (zustand.filter === g ? 'an' : '') + '">' + g + '</button>').join('') + '</div>' +
      '<div class="erfolge-raster">' + ausw.map(e => {
        const frei = freigeschaltet(e), geheim = e.geheim && !frei;
        return '<article class="erfolge-karte' + (frei ? ' frei' : ' gesperrt') + '" data-erfolg="' + esc(e.id) + '" aria-label="' + (geheim ? 'Geheimer Erfolg' : esc(e.titel)) + '">' +
          (geheim ? '<div class="erfolge-geheim" aria-hidden="true">?</div>' : bild(e)) +
          '<b>' + (geheim ? 'Geheim' : esc(e.titel)) + '</b>' +
          '<small>' + (geheim ? 'Noch nicht enthüllt' : esc(e.gruppe + ' · ' + e.stufe)) + '</small>' +
          (frei ? '<span class="erfolge-frei">Seit Woche ' + e.freigeschaltet + '</span>' :
            geheim ? '<span class="erfolge-hinweis">Geheimer Erfolg</span>' :
            '<span class="erfolge-hinweis">' + esc(e.hinweis) + '</span><div class="erfolge-balken" role="progressbar" aria-valuenow="' +
            Math.round(e.fortschritt * 100) + '" aria-valuemin="0" aria-valuemax="100" aria-label="Fortschritt"><i style="width:' +
            Math.round(e.fortschritt * 100) + '%"></i></div>') + '</article>';
      }).join('') + '</div></div>';
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
