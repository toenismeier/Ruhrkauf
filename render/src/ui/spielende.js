// N02: Endszene, Bilanz und lokale Bestenliste. Spielregeln bleiben in der Engine.
import { esc } from './format.js';
import { spielendeSzene } from '../kit/spielende.js';

const zahl = (n) => new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(Math.round(n ?? 0));
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
  if (!liste.length) return '<p class="se-unter">Hier erscheinen die zehn besten Ergebnisse dieser Schwierigkeitsstufe.</p>';
  return '<table class="se-tabelle"><thead><tr><th>Rang</th><th>Datum / Seed</th><th>Ende</th><th>Punkte</th></tr></thead><tbody>' +
    liste.map((x,i) => '<tr><td>'+(i+1)+'.</td><td>'+esc(x.datum)+'<small> · '+zahl(x.seed)+'</small></td><td>'+
      esc(ART[x.art]?.titel || x.art)+(x.testspiel ? ' <small>(Test)</small>' : '')+'</td><td>'+zahl(x.punkte)+'</td></tr>').join('')+
    '</tbody></table>';
}
// Verlaufsdaten nur aus der Engine-Historie (N01 kann diesen Bereich später ersetzen).
function verlauf(historie) {
  if (!Array.isArray(historie) || historie.length < 2) return '';
  const serien = [
    { key: 'umsatz', farbe: '#eacb91' },
    { key: 'ebitda', farbe: '#79c2bb' },
  ];
  const werte = historie.filter((k,i) => i % 13 === 12 || i === historie.length - 1);
  if (werte.length < 2) return '';
  const unten = 95, oben = 9, links = 16, rechts = 594;
  const alle = werte.flatMap(k => [schonen(k.umsatz), schonen(k.ebitda)]);
  const min = Math.min(0, ...alle), max = Math.max(1, ...alle), span = Math.max(1, max-min);
  const px = i => links + (rechts-links)*i/(werte.length-1);
  const py = n => unten - (schonen(n)-min)/span*(unten-oben);
  const nullinie = py(0);
  const pfade = serien.map(serie => '<path fill="none" stroke="'+serie.farbe+'" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round" d="' +
    werte.map((k,i) => (i?'L':'M')+px(i).toFixed(1)+','+py(k[serie.key]).toFixed(1)).join(' ') + '"/>').join('');
  return '<h2>Umsatz und EBITDA im Verlauf</h2><div class="se-karte"><svg class="se-chart" viewBox="0 0 610 112" role="img" aria-label="Verlauf von Umsatz und EBITDA, quartalsweise">' +
    '<path d="M'+links+' '+nullinie.toFixed(1)+'h'+(rechts-links)+'" stroke="#718087" stroke-width="1" stroke-dasharray="5 5"/>'+
    pfade+'</svg><div class="se-legende"><span>Umsatz je Woche</span><span>EBITDA je Woche</span></div></div>';
}
function entscheidungen(s) {
  // Nur zeigen, wenn ein Entscheidungsprotokoll die tatsächliche EBITDA-Wirkung enthält.
  const protokoll = s.protokoll;
  if (!Array.isArray(protokoll)) return '';
  const bewertet = protokoll.filter(x => Number.isFinite(x?.ebitdaWirkung));
  if (!bewertet.length) return '';
  const sortiert = [...bewertet].sort((a,b) => b.ebitdaWirkung - a.ebitdaWirkung);
  const gut = sortiert[0], schlecht = sortiert[sortiert.length-1];
  return '<h2>Entscheidungen mit der größten Wirkung</h2><div class="se-karte">' +
    (gut ? '<div class="se-zeile"><span>Beste: '+esc(gut.titel || gut.typ || 'Entscheidung')+'</span><strong>'+geld(gut.ebitdaWirkung)+'</strong></div>' : '')+
    (schlecht && schlecht !== gut ? '<div class="se-zeile"><span>Schlechteste: '+esc(schlecht.titel || schlecht.typ || 'Entscheidung')+'</span><strong>'+geld(schlecht.ebitdaWirkung)+'</strong></div>' : '')+'</div>';
}
export function spielendeModul(ctx) {
  const node = document.createElement('div');
  node.id = 'spielende-overlay'; node.hidden = true; document.body.append(node);
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
    node.innerHTML = '<div class="se-wrap"><header class="se-kopf"><span>HARTWIG · KONZERNBILANZ</span><b>H</b></header>'+
      inhalt+'</div>';
    node.hidden = false; document.body.classList.add('spielende-aktiv');
  }
  function bilanz() {
    const s = stand(), e = s?.ende;
    if (!e) return;
    const a = ART[e.art] || ART.zerschlagen, w = e.wertung, k = e.kennzahlen;
    const teile = w.teile.map(t=>'<div class="se-zeile"><span>'+esc(t.name)+'</span><strong class="'+(t.punkte<0?'se-minus':'')+'" data-se-wert="'+t.punkte+'">'+zahl(t.punkte)+'</strong></div>').join('');
    const kenn = [
      ['Gerettete Häuser', k.geretteteHaeuser+' / '+k.startHaeuser],
      ['Beschäftigte (FTE)',zahl(k.fte)+' / '+zahl(k.startFte)],
      ['EBITDA, 52 Wochen',geld(k.ebitda52)],
      ['Konzernwert',geld(k.unternehmenswert)],
    ].map(([name,value])=>'<div class="se-kpi"><small>'+esc(name)+'</small><b>'+esc(value)+'</b></div>').join('');
    rahmen('Bilanz','<div class="se-bilanz"><h1>Ihre Bilanz</h1><p class="se-unter">'+esc(a.titel)+' · Woche '+zahl(e.woche)+
      ' · '+esc(SCHWIERIGKEIT[w.schwierigkeit] || w.schwierigkeit)+'</p>'+
      '<div class="se-ergebnis"><small>GESAMTPUNKTZAHL</small><strong data-se-wert="'+w.punkte+'">0</strong><small>Grundpunkte '+
      zahl(w.grundpunkte)+' × '+new Intl.NumberFormat('de-DE',{maximumFractionDigits:1}).format(w.multiplikator)+'</small></div>'+
      '<div class="se-karte">'+teile+'</div><h2>Unternehmen nach dem Spiel</h2><div class="se-kpis">'+kenn+'</div>'+
      verlauf(s.historie)+entscheidungen(s)+
      '<h2>Bestenliste · '+esc(SCHWIERIGKEIT[w.schwierigkeit] || w.schwierigkeit)+'</h2><div class="se-karte">'+rangliste(w.schwierigkeit)+'</div>'+
      '<div class="se-aktionen"><button class="se-knopf" data-se="neu">Neues Spiel</button>'+
      (['saniert','ruhestand'].includes(e.art)?'<button class="se-knopf se-sek" data-se="weiter">Weiterspielen</button>':'')+
      '</div></div>');
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
    rahmen(a.titel,'<div class="se-szene"><div class="se-bild">'+spielendeSzene(e.art,e.kaeufer)+
      '</div><div class="se-zeitung"><small>DER HANDELSBOTE · SONDERAUSGABE · WOCHE '+zahl(e.woche)+'</small>'+
      '<h1>'+esc(a.schlagzeile)+'</h1><p>'+esc(a.zeile)+'</p></div></div>'+
      '<button class="se-knopf" data-se="bilanz">Zur Abschlussbilanz</button>');
    ansicht='szene'; return true;
  }
  function bestenliste() {
    if (!stand()) return;
    rahmen('Bestenliste','<div class="se-bilanz"><h1>Bestenliste</h1><p class="se-unter">Die zehn besten Ergebnisse je Schwierigkeitsstufe bleiben auf diesem Gerät gespeichert.</p>'+
      ['leicht','mittel','schwer'].map(id=>'<h2>'+esc(SCHWIERIGKEIT[id])+'</h2><div class="se-karte">'+rangliste(id)+'</div>').join('')+
      '<button class="se-knopf se-sek" data-se="schliessen">Zurück zum Spiel</button></div>');
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
