// N11: unabhängige App-Oberfläche. Keine Änderungen an Engine und Simulation.
import { liste, speichern, laden, loeschen, exportieren, importieren, PLAETZE } from './speicher.js';
import { esc, geld } from './format.js';

// Bis zum Einbau von N13 separat abschaltbar.
export const APP_AKTIV = true;
const $ = (id) => document.getElementById(id);
const bezeichnung = (platz) => platz === 'autosave' ? 'Autospeichern' : 'Platz ' + platz.slice(-1);

function datumFormatieren(datum) {
  const d = new Date(datum);
  return Number.isFinite(d.getTime()) ? d.toLocaleString('de-DE') : 'Datum unbekannt';
}

function dateiname(name) {
  return (name || 'Hartwig').normalize('NFKD').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 40) || 'Hartwig';
}

export function appModul({ panel, meldung, aktuell, ladenInSpiel, vorNeuladen }) {
  async function zeichne(root, start = false) {
    if (!APP_AKTIV || !root) return;
    try {
      const infos = await liste();
      const vorhanden = Object.fromEntries(infos.map((i, n) => [PLAETZE[n], i]));
      root.innerHTML = PLAETZE.map((platz) => {
        const info = vorhanden[platz];
        const name = info?.name ?? (platz === 'autosave' ? 'Automatisch' : '');
        const vorschau = info?.bild ? '<img class="app-vorschau" alt="Kartenausschnitt des Spielstands" src="' + info.bild + '">' : '<div class="app-vorschau leer" aria-hidden="true">H</div>';
        return '<article class="app-platz" data-platz="' + platz + '">' +
          '<div class="app-platzkopf"><b>' + bezeichnung(platz) + '</b><span>' + (info ? datumFormatieren(info.datum) : 'Leer') + '</span></div>' +
          '<div class="app-platzinhalt">' + vorschau + '<div class="app-daten">' +
          (info ? '<strong>' + esc(info.name) + '</strong><small>' + esc(info.stadt) + ' · Woche ' + (info.woche + 1) + '</small>' +
            '<small>' + esc(info.szenario) + ' · Cash ' + geld(info.cash) + '</small>' : '<small>Hier ist noch kein Spielstand gespeichert.</small>') +
          '</div></div>' +
          (start || platz === 'autosave' ? '' : '<label class="app-namenswahl">Name <input data-name maxlength="60" aria-label="Name für ' + bezeichnung(platz) + '" value="' + esc(name) + '" placeholder="Spielstand benennen"></label>') +
          '<div class="app-aktionen">' +
          (!start && platz !== 'autosave' ? '<button type="button" data-app-aktion="speichern">Speichern</button>' : '') +
          (info ? '<button type="button" data-app-aktion="laden">Laden</button><button type="button" data-app-aktion="export">Export</button>' : '') +
          (platz !== 'autosave' ? '<button type="button" data-app-aktion="import">Import</button>' : '') +
          (info && platz !== 'autosave' ? '<button type="button" data-app-aktion="loeschen">Löschen</button>' : '') +
          '<input type="file" data-app-datei accept=".hartwig,application/gzip" aria-label="Spielstand importieren" hidden>' +
          '</div></article>';
      }).join('');
      root.dataset.start = start ? '1' : '0';
      root.onclick = async (event) => {
        const button = event.target.closest('[data-app-aktion]');
        if (!button || !root.contains(button)) return;
        const karte = button.closest('[data-platz]'), platz = karte?.dataset.platz;
        if (!platz) return;
        const aktion = button.dataset.appAktion;
        if (aktion === 'import') { karte.querySelector('[data-app-datei]').click(); return; }
        if (aktion === 'loeschen' && !confirm(bezeichnung(platz) + ' endgültig löschen?')) return;
        button.disabled = true;
        try {
          if (aktion === 'speichern') {
            const a = aktuell();
            if (!a?.spiel) throw new Error('Bitte zunächst ein Spiel starten.');
            await speichern(a.spiel, a.stadt, a.ui, platz, karte.querySelector('[data-name]')?.value ?? '', a.bild?.());
            meldung(bezeichnung(platz) + ' gespeichert.');
          } else if (aktion === 'laden') {
            const d = await laden(platz);
            if (!d) throw new Error('Speicherplatz ist leer.');
            await ladenInSpiel(platz);
            return;
          } else if (aktion === 'export') {
            const blob = await exportieren(platz);
            const url = URL.createObjectURL(blob), a = document.createElement('a');
            a.href = url;
            a.download = dateiname(vorhanden[platz]?.name) + '.hartwig';
            document.body.append(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 30000);
            meldung('Spielstand als .hartwig exportiert.');
          } else if (aktion === 'loeschen') {
            await loeschen(platz);
            meldung('Speicherplatz gelöscht.');
          }
          if (root.isConnected) await zeichne(root, start);
        } catch (e) {
          meldung(e.message ?? 'Speicherfehler', false);
          if (root.isConnected) button.disabled = false;
        }
      };
      root.onchange = async (event) => {
        const input = event.target.closest('[data-app-datei]');
        if (!input || !input.files?.[0]) return;
        const platz = input.closest('[data-platz]')?.dataset.platz;
        try {
          if (vorhanden[platz] && !confirm(bezeichnung(platz) + ' durch die importierte Datei ersetzen?')) return;
          await importieren(input.files[0], platz);
          meldung('Spielstand importiert. Er kann jetzt geladen werden.');
          if (root.isConnected) await zeichne(root, start);
        } catch (e) { meldung('Import fehlgeschlagen: ' + e.message, false); }
        finally { input.value = ''; }
      };
    } catch (e) {
      root.textContent = 'Spielstände nicht verfügbar: ' + e.message;
      meldung(e.message, false);
    }
  }

  function oeffne() {
    if (!APP_AKTIV) return;
    panel('Spielstände', 'Drei benannte Plätze und ein automatischer Spielstand', '<div id="app-plaetze" class="app-plaetze">Lade Spielstände …</div>', 'gross');
    return zeichne($('app-plaetze'));
  }

  function startAktualisieren() {
    return zeichne($('app-plaetze-start'), true);
  }

  function updatesAktivieren() {
    if (!APP_AKTIV || !('serviceWorker' in navigator) ||
        !(location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) return;
    window.addEventListener('load', async () => {
      try {
        const registrierung = await navigator.serviceWorker.register('./sw.js');
        let wechsel = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (wechsel) location.reload();
        });
        const hinweis = () => {
          if (!navigator.serviceWorker.controller || !registrierung.waiting) return;
          if ($('app-update')) return;
          const n = document.createElement('div');
          n.id = 'app-update';
          n.setAttribute('role', 'status');
          n.innerHTML = '<span>Neue Version verfügbar</span><button type="button">Neu laden</button>';
          n.querySelector('button').addEventListener('click', async () => {
            n.querySelector('button').disabled = true;
            try {
              await vorNeuladen();
              wechsel = true;
              registrierung.waiting?.postMessage({ typ: 'AKTIVIEREN' });
            } catch (e) {
              wechsel = false;
              n.querySelector('button').disabled = false;
              meldung('Bitte erst speichern: ' + e.message, false);
            }
          });
          document.body.append(n);
        };
        if (registrierung.waiting) hinweis();
        registrierung.addEventListener('updatefound', () => {
          const w = registrierung.installing;
          w?.addEventListener('statechange', () => {
            if (w.state === 'installed') hinweis();
          });
        });
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') registrierung.update().catch(console.warn);
        });
        await registrierung.update();
      } catch (e) { console.warn('Offline-Funktion konnte nicht gestartet werden:', e); }
    });
  }

  return { oeffne, startAktualisieren, updatesAktivieren };
}
