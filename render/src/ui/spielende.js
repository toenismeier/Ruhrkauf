// N02: Endszene, Bilanz und lokale Bestenliste. Spielregeln bleiben in der Engine.
import { esc } from './format.js';
import { spielendeSzene } from '../kit/spielende.js';
import * as K from './komponenten.js';
import { LOGO } from './kartenoberflaeche.js';

const zahl = (n) => new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(Math.round(n ?? 0) || 0);
const geld = (n) => zahl(n) + ' €';
const ART = {
  zerschlagen: {
    titel: 'Das Ende von Hartwig',
    zeile: 'Die letzten Warenhäuser räumen ihre Flächen. Eine Ära geht zu Ende.',
    schlagzeile: 'Hartwig wird zerschlagen',
  },
  saniert: {
    titel: 'Die Sanierung ist gelungen',
    zeile: 'Fünf Jahre liegen hinter dem Konzern. Die Zukunft gehört wieder dem Handel.',
    schlagzeile: 'Hartwig schafft den Neuanfang',
  },
  investor: {
    titel: 'Ein neues Kapitel',
    zeile: 'Die Schlüssel werden übergeben. Der Konzern hat einen neuen Eigentümer.',
    schlagzeile: 'Hartwig wechselt den Besitzer',
  },
  ruhestand: {
    titel: 'Zeit für den Ruhestand',
    zeile: 'Die Verantwortung wird weitergegeben. Fünf Jahre voller Entscheidungen.',
    schlagzeile: 'Nach fünf Jahren geht der Vorstandsvorsitzende',
  },
};
const SCHWIERIGKEIT = { leicht: 'Leicht', mittel: 'Mittel', schwer: 'Schwer' };
const KEY = 'ruhrkauf-n02-bestenliste-v1-';
const animationAus = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const schonen = (n) => Number.isFinite(n) ? n : 0;
function lesen(id) {
  try {
    const daten = JSON.parse(localStorage.getItem(KEY + id) || '[]');
    return Array.isArray(daten) ? daten.filter(x => x && Number.isFinite(x.punkte)).slice(0, 10) : [];
  } catch { return []; }
}
function aufzeichnen(s, e) {
  if (!e || !e.wertung) return;
  const schwierig = e.wertung.schwierigkeit || s.schwierigkeit || 'mittel';
  const id = [s.seed, e.woche, e.art, e.wertung.punkte].join(':');
  const alt = lesen(schwierig);
  if (alt.some(x => x.id === id)) return;
  const testspiel = Boolean(s.testspiel || new URLSearchParams(location.search).has('testspiel'));
  const zeile = {
    id, datum: new Date().toISOString().slice(0, 10), seed: s.seed, art: e.art,
    punkte: e.wertung.punkte, testspiel,
  };
  try {
    localStorage.setItem(KEY + schwierig, JSON.stringify([...alt, zeile].sort((a,b) =>
      b.punkte - a.punkte || a.datum.localeCompare(b.datum) || a.seed - b.seed).slice(0, 10)));
  } catch { /* Privatmodus oder voller Speicher: Bilanz bleibt bedienbar. */ }
}
function rangliste(schwierigkeit) {
  const liste = lesen(schwierigkeit);
  if (!liste.length) return K.leer('Hier erscheinen die zehn besten Ergebnisse dieser Schwierigkeitsstufe.');
  return K.liste(liste.map((x,i) => K.zeile({ was: (i+1) + '. ' + esc(ART[x.art]?.titel || x.art) + (x.testspiel ? ' (Test)' : ''),
    unter: esc(x.datum) + ' · Seed ' + zahl(x.seed), wert: zahl(x.punkte), wertUnter: 'Punkte' })));
}
// Verlaufsdaten nur aus der Engine-Historie (N01 kann diesen Bereich später ersetzen).
function verlauf(historie) {
  if (!Array.isArray(historie) || historie.length < 2) return '';
  // G6: je Jahr die letzte Woche (Coffee 22: Balken ohne Achsen, Umsatz hell, Ergebnis grün).
  const werte = historie.filter((k,i) => i % 52 === 51 || i === historie.length - 1).slice(-5);
  if (werte.length < 2) return '';
  return K.abschnitt('Umsatz und EBITDA', 'Wochenwert je Jahr') + K.balken(werte.map((k, i) => ({ label: 'J' + (historie.indexOf(k) >= 0 ? Math.floor(historie.indexOf(k) / 52) + 1 : i + 1),
    a: schonen(k.umsatz), b: schonen(k.ebitda) })), ['Umsatz je Woche', 'EBITDA je Woche']);
}
function entscheidungen(s) {
  // Nur zeigen, wenn ein Entscheidungsprotokoll die tatsächliche EBITDA-Wirkung enthält.
  const protokoll = s.protokoll;
  if (!Array.isArray(protokoll)) return '';
  const bewertet = protokoll.filter(x => Number.isFinite(x?.ebitdaWirkung));
  if (!bewertet.length) return '';
  const sortiert = [...bewertet].sort((a,b) => b.ebitdaWirkung - a.ebitdaWirkung);
  const gut = sortiert[0], schlecht = sortiert[sortiert.length-1];
  return K.abschnitt('Entscheidungen mit der größten Wirkung') + K.liste([
    gut ? K.zeile({ was: 'Beste: ' + esc(gut.titel || gut.typ || 'Entscheidung'), wert: geld(gut.ebitdaWirkung), ton: gut.ebitdaWirkung < 0 ? 'schlecht' : 'gut' }) : '',
    schlecht && schlecht !== gut ? K.zeile({ was: 'Schlechteste: ' + esc(schlecht.titel || schlecht.typ || 'Entscheidung'), wert: geld(schlecht.ebitdaWirkung), ton: schlecht.ebitdaWirkung < 0 ? 'schlecht' : '' }) : '']);
}
export function spielendeModul(ctx) {
  const node = document.createElement('div');
  node.id = 'spielende-overlay'; node.hidden = true;
  node.className = 'hw hw-g6'; node.dataset.bereich = 'betrieb';
  node.setAttribute('role', 'dialog'); node.setAttribute('aria-modal', 'true'); node.setAttribute('aria-label', 'Spielende und Bilanz');
  document.body.append(node);
  let ansicht = 'zu', gespeicherterSchluessel = '', zaehlRaf = 0, bilanziert = false;
  const stand = () => ctx.s();
  function zahlenAnimieren() {
    cancelAnimationFrame(zaehlRaf);
    const felder = [...node.querySelectorAll('[data-se-wert]')];
    const dauer = animationAus() ? 0 : 850, start = performance.now();
    function tick(jetzt) {
      const p = dauer ? Math.min(1, (jetzt-start)/dauer) : 1;
      const f = 1 - (1-p)**3;
      for (const el of felder) {
        const v = Number(el.dataset.seWert) || 0;
        el.textContent = zahl(Math.round(v*f))+(el.dataset.seEinheit || '');
      }
      if (p < 1) zaehlRaf = requestAnimationFrame(tick);
    }
    zaehlRaf = requestAnimationFrame(tick);
  }
  function schliessen() {
    cancelAnimationFrame(zaehlRaf);
    node.hidden = true; node.innerHTML = ''; ansicht = 'zu';
    document.body.classList.remove('spielende-aktiv');
  }
  function rahmen(titel, inhalt) {
    node.innerHTML = '<div class="hw-grund"></div><div class="se-wrap"><header class="se-kopf"><span class="hw-g6-logo">' + LOGO + '</span><span class="hw-marke">Hartwig · ' + esc(titel) + '</span></header>'+
      inhalt+'</div>';
    node.hidden = false; document.body.classList.add('spielende-aktiv');
  }
  function bilanz() {
    const s = stand(), e = s?.ende;
    if (!e) return;
    const a = ART[e.art] || ART.zerschlagen, w = e.wertung, k = e.kennzahlen;
    // G6 (E47): Hauptfrage zuerst (Gesamtpunktzahl), dann Zusammensetzung als Tabelle mit Summe, dann das Unternehmen.
    const teile = K.tabelle({ titel: 'Punkte', spalten: ['Wert', 'Punkte'], zeilen: w.teile.map((t) => ({ name: t.name, werte: [zahl(t.wert), zahl(t.punkte)], roh: [null, t.punkte], ton: ['', t.punkte < 0 ? 'schlecht' : ''] })),
      summe: { name: 'Grundpunkte', werte: ['', zahl(w.grundpunkte)], roh: [null, w.grundpunkte] }, pruefen: true });
    const stufe = esc(SCHWIERIGKEIT[w.schwierigkeit] || w.schwierigkeit);
    rahmen('Konzernbilanz', K.sprecher({ text: esc(a.titel) + '. Woche ' + zahl(e.woche) + ', Stufe ' + stufe + '.' }) + K.rumpf('<div class="se-bilanz">' +
      K.gross([{ label: 'Gesamtpunktzahl', wert: '0', p: 'se:punkte', unter: 'Grundpunkte ' + zahl(w.grundpunkte) + ' × ' + new Intl.NumberFormat('de-DE',{maximumFractionDigits:1}).format(w.multiplikator) }])
        .replace('class="hw-gross"', 'class="hw-gross se-ergebnis"').replace('data-p="se:punkte"', 'data-se-wert="' + w.punkte + '"') +
      K.abschnitt('Zusammensetzung') + teile +
      K.abschnitt('Unternehmen nach dem Spiel') +
      K.liste([K.zeile({ was: 'Gerettete Häuser', wert: k.geretteteHaeuser + ' / ' + k.startHaeuser, wertUnter: 'zum Start' }),
        K.zeile({ was: 'Beschäftigte (FTE)', wert: zahl(k.fte) + ' / ' + zahl(k.startFte), wertUnter: 'zum Start' }),
        K.zeile({ was: 'EBITDA, 52 Wochen', wert: geld(k.ebitda52), ton: k.ebitda52 < 0 ? 'schlecht' : 'gut' }),
        K.zeile({ was: 'Konzernwert', wert: geld(k.unternehmenswert) })]) +
      verlauf(s.historie)+entscheidungen(s)+
      K.abschnitt('Bestenliste', stufe) + rangliste(w.schwierigkeit) +
      K.knoepfe(K.knopf('Neues Spiel', 'data-se="neu"', 'breit') +
      (['saniert','ruhestand'].includes(e.art) ? K.knopf('Weiterspielen', 'data-se="weiter"', 'zweit breit') : '')) +
      '</div>'));
    ansicht='bilanz'; bilanziert=true; zahlenAnimieren();
  }
  function anzeigen() {
    const s = stand();
    if (!s) return false;
    if (!s.ende && s.phase === 'zerschlagen') ctx.E.spielendePruefen(s);
    const e = s.ende;
    if (!e) return false;
    const schluessel = [s.seed,e.art,e.woche,e.wertung.punkte].join(':');
    if (schluessel !== gespeicherterSchluessel) {
      gespeicherterSchluessel = schluessel; aufzeichnen(s,e);
      bilanziert=false;
    }
    if (!node.hidden && ansicht === 'szene') return true;
    const a = ART[e.art] || ART.zerschlagen;
    rahmen('Konzernbilanz','<div class="se-szene"><div class="se-bild">'+spielendeSzene(e.art,e.kaeufer)+
      '</div><div class="se-zeitung" data-bereich="papier"><small class="hw-marke">Der Handelsbote · Sonderausgabe · Woche '+zahl(e.woche)+'</small>'+
      '<h1>'+esc(a.schlagzeile)+'</h1><p class="hw-lese">'+esc(a.zeile)+'</p></div></div>'+
      '<div class="se-fuss">' + K.knopf('Zur Abschlussbilanz', 'data-se="bilanz"', 'breit') + '</div>');
    ansicht='szene'; return true;
  }
  function bestenliste() {
    if (!stand()) return;
    rahmen('Bestenliste', K.sprecher({ text: 'Die zehn besten Ergebnisse je Schwierigkeitsstufe bleiben auf diesem Gerät gespeichert.' }) + K.rumpf('<div class="se-bilanz">'+
      ['leicht','mittel','schwer'].map(id => K.abschnitt(SCHWIERIGKEIT[id]) + rangliste(id)).join('')+
      K.knoepfe(K.knopf('Zurück zum Spiel', 'data-se="schliessen"', 'zweit breit')) + '</div>'));
    ansicht='rangliste';
  }
  node.addEventListener('click', e => {
    const knopf = e.target.closest('[data-se]');
    if (!knopf) return;
    switch(knopf.dataset.se) {
      case 'bilanz': bilanz(); break;
      case 'schliessen': schliessen(); break;
      case 'neu': schliessen(); ctx.neuesSpiel(); break;
      case 'weiter': {
        const ergebnis = ctx.E.fuehreAus(stand(),{typ:'spielFortsetzen'});
        if (!ergebnis.ok) { ctx.fehler?.(ergebnis.text); return; }
        schliessen(); ctx.fortgesetzt?.(); break;
      }
    }
  });
  return { anzeigen, bilanz, bestenliste, zu: schliessen,
    pruefe: () => ({ ansicht, sichtbar: !node.hidden, art: stand()?.ende?.art ?? null, bilanziert }),
  };
}
