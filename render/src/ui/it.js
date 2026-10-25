// O03 IT (E47 nach Coffee 12–14): Systemlandkarte, digitale Produkte, Projekte mit Rollout, neues Projekt.
import { esc, geld } from './format.js';
import * as K from './komponenten.js';
import { itProdukteKarten, itProduktDetail } from './it-produkte.js';
import { skalaGross } from './marketing-q16.js';
import { portraetSVG, zufallsMerkmale } from '../kit/portraet.js';

const REITER = [['systeme', 'Systeme', 'systeme'], ['produkte', 'Produkte', 'it'], ['projekte', 'Projekte', 'projekte'], ['neu', 'Neu', 'neu']];
const ARTEN = [['kaufen', 'Standardsoftware'], ['entwickeln', 'Eigenentwicklung'], ['dienstleister', 'Dienstleister']];
const PHASEN = { konzept: 'Konzept', umsetzung: 'Umsetzung', rollout: 'Rollout', abgeschlossen: 'Abgeschlossen' };
const prozent = (x) => Math.round(x * 100) + ' %';
const risikoText = (x) => (x * 100).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' %';

/** Sprecher aus dem Digitalressort (CDO), sonst die Bereichsleitung IT. */
export function digitalSprecher(E, s, text, ton = '', bereich = 'IT') {
  const p = E.vorstandUebersicht?.(s)?.ressorts?.find((x) => x.id === 'cdo')?.person;
  return K.sprecher({ text, ton, unter: p ? `${p.name} · Digitalvorstand` : `Bereichsleitung ${bereich}`, person: portraetSVG(p?.portraet ?? zufallsMerkmale('bereich:' + bereich), 72) });
}

export function itModul(ctx) {
  const { E } = ctx, s = () => ctx.s();
  const ui = { aktiv: false, reiter: 'systeme', system: 'kasse', art: 'kaufen', generation: 3, auswahl: null, produkt: null, bestaetigung: false };
  const daten = () => E.itUebersicht(s());
  /** Erlaubte Zielgenerationen je Realisierung (gleiche Regeln wie bisher). */
  const erlaubt = (art) => art === 'dienstleister' ? [3] : art === 'kaufen' ? [1, 2, 3] : [1, 2, 3, 4];

  function systeme(d) {
    const reihe = [...d.systeme].sort((a, b) => b.risiko - a.risiko || a.generation - b.generation);
    const top = reihe[0], alt = reihe.filter((x) => x.generation <= 1 || x.wartungGekuendigt);
    let h = K.gross([{ label: 'Höchstes Ausfallrisiko', wert: top ? risikoText(top.risiko) : '0 %', ton: top && top.risiko >= 0.01 ? 'schlecht' : '', unter: top ? esc(top.name) + ' je Woche' : '' },
      { label: 'IT-Betrieb je Woche', wert: geld(d.betriebskostenWoche), unter: `${d.systeme.length} Systeme` }]);
    h += K.abschnitt('Systemlandkarte', 'nach Risiko');
    h += K.liste(reihe.map((x) => {
      const bereiche = E.SYSTEME[x.id].bereiche.map((id) => E.BEREICHE?.find((q) => q.id === id)?.name ?? id);
      const akt = x.verteilung.filter((c) => c.generation > x.generation).length;
      const unter = (x.generation > 0 ? `Generation ${x.generation} von 4 · ${Math.floor(x.alter)} Jahre · ${geld(x.kostenWoche)} je Woche` : 'Noch nicht eingeführt, keine laufenden Kosten')
        + (x.wartungGekuendigt ? '<br><span class="hw-schlecht">Wartung durch den Anbieter beendet</span>' : '') + (akt ? `<br>${akt} von ${x.verteilung.length} Clustern schon modernisiert` : '')
        + `<br>Bremst: ${esc(bereiche.slice(0, 3).join(', '))}${bereiche.length > 3 ? ` und ${bereiche.length - 3} weitere` : ''}`;
      return K.zeile({ was: esc(x.name), unter, wert: risikoText(x.risiko), wertUnter: 'Ausfall je Woche', ton: x.risiko >= 0.01 ? 'schlecht' : '', tippbar: true, attr: `data-it="neues" data-v="${esc(x.id)}" aria-label="${esc(x.name)} modernisieren"` });
    }));
    const k = d.systeme.find((x) => x.id === 'kasse');
    if (k && k.generation >= 2) {
      h += K.abschnitt('Kassenausbau', 'Stufe von 2');
      h += K.liste(['selbstbedienung', 'mobil'].map((art) => {
        const stufe = k.kasseAusbau?.[art] ?? 0;
        return `<div class="hw-zeile"><span class="hw-was">${art === 'mobil' ? 'Mobile Kasse' : 'Selbstbedienungskassen'}<small>Stufe ${stufe} von 2</small></span>${stufe < 2 ? K.knopf(`Stufe ${stufe + 1} beauftragen`, `data-it="kasseAusbau" data-v="${art}"`, 'zweit') : K.marke('ausgebaut', 'gut')}</div>`;
      }));
    }
    h += '<p class="hw-lese hw-g3-notiz">Digitalvorstand und IT-Leitung beeinflussen das Risiko von Verzögerungen und Störungen.</p>';
    const befund = top && top.risiko >= 0.002 ? `${esc(top.name)} fällt mit ${risikoText(top.risiko)} je Woche am ehesten aus.` : `Alle ${d.systeme.length} Systeme laufen stabil.`;
    return { befund: befund + (alt.length ? ` ${alt.length} ${alt.length === 1 ? 'System ist' : 'Systeme sind'} veraltet.` : ''), ton: top && top.risiko >= 0.01 ? 'engpass' : '', html: h };
  }

  function projekt(p, d) {
    const alle = new Map(d.cluster.map((c) => [c.id, c]));
    let h = K.abschnitt(E.SYSTEME[p.system].name, `Generation ${p.zielGeneration} · ${ARTEN.find(([a]) => a === p.art)?.[1] ?? p.art}`);
    h += skalaGross(`${PHASEN[p.phase]}, Fortschritt`, p.fortschritt * 100, `<b class="hw-skala-wert">${prozent(p.fortschritt)}</b>`);
    h += K.liste([K.zeile({ was: 'Kosten Ist / Plan', wert: `${geld(p.kostenIst)} / ${geld(p.kostenPlan)}`, ton: p.kostenIst > p.kostenPlan ? 'schlecht' : '' }),
      K.zeile({ was: 'Mehrwochen durch Verzug', wert: String(p.verzug), ton: p.verzug > 0 ? 'schlecht' : '' }), K.zeile({ was: 'Rollout', wert: `${p.erledigteCluster.length} / ${p.clusterIds.length} Cluster` })]);
    if (p.phase !== 'abgeschlossen') {
      const ordnen = p.erledigteCluster.length === 0;
      h += `<span class="hw-marke hw-feldname hw-g3-abstand">Rollout-Reihenfolge${ordnen ? ', vor dem ersten Cluster änderbar' : ''}</span>`;
      h += K.liste(p.clusterIds.map((id, i) => {
        const c = alle.get(id), fertig = p.erledigteCluster.includes(id);
        const knoepfe = !fertig && ordnen ? `<span class="hw-g3-teamknoepfe">${K.knopf('früher', `data-it="hoch" data-p="${esc(p.id)}" data-i="${i}" aria-label="${esc(c?.name ?? id)} früher"`, 'zweit', i === 0)}${K.knopf('später', `data-it="runter" data-p="${esc(p.id)}" data-i="${i}" aria-label="${esc(c?.name ?? id)} später"`, 'zweit', i === p.clusterIds.length - 1)}</span>` : K.marke(fertig ? `Generation ${p.zielGeneration}` : 'geplant', fertig ? 'gut' : '');
        return `<div class="hw-zeile"><span class="hw-was">${i + 1}. ${esc(c?.name ?? id)}</span>${knoepfe}</div>`;
      }));
    }
    return h;
  }
  function projekte(d) {
    const aktiv = d.projekte.filter((x) => x.phase !== 'abgeschlossen'), alt = d.projekte.filter((x) => x.phase === 'abgeschlossen').slice(-8).reverse();
    let h = K.gross([{ label: 'Laufende Projekte', wert: String(aktiv.length) }, { label: 'Planbudget offen', wert: geld(aktiv.reduce((a, p) => a + Math.max(0, p.kostenPlan - p.kostenIst), 0)) }]);
    h += '<p class="hw-lese hw-g3-notiz">Projekte durchlaufen Konzept, Umsetzung und einen Rollout Cluster für Cluster. Vier Wochen nach jedem Wechsel sind lokale Startprobleme möglich.</p>';
    h += aktiv.length ? aktiv.map((p) => projekt(p, d)).join('') : K.abschnitt('Laufende Projekte') + K.leer('Über „Neu“ beauftragst du das erste Projekt.', 'Keine laufenden Projekte.', '', 'projekte');
    if (alt.length) h += K.abschnitt('Abgeschlossene Projekte') + K.liste(alt.map((p) => K.zeile({ was: esc(E.SYSTEME[p.system].name), unter: `Generation ${p.zielGeneration} · ${ARTEN.find(([a]) => a === p.art)?.[1] ?? p.art}`, wert: geld(p.kostenIst), wertUnter: p.verzug ? `${p.verzug} Wochen Verzug` : 'im Plan' })));
    h += K.knoepfe(K.knopf('Neues Projekt planen', 'data-it="reiter" data-v="neu"', 'zweit breit'));
    const spaet = aktiv.filter((p) => p.verzug > 0);
    return { befund: aktiv.length ? `${aktiv.length} Projekte laufen${spaet.length ? `, ${spaet.length} davon mit Verzug` : ', alle im Plan'}.` : 'Gerade läuft kein IT-Projekt.', ton: spaet.length ? 'engpass' : '', html: h };
  }

  function auswahl(d) {
    if (!ui.auswahl) {
      const sys = d.systeme.find((x) => x.id === ui.system);
      ui.auswahl = new Set(d.cluster.filter((c) => (sys?.verteilung.find((v) => v.id === c.id)?.generation ?? 0) < ui.generation).map((c) => c.id));
    }
    return ui.auswahl;
  }
  function neu(d) {
    const sys = d.systeme.find((x) => x.id === ui.system) ?? d.systeme[0];
    const ids = auswahl(d), ausgew = d.cluster.filter((c) => ids.has(c.id));
    const gen = (c) => sys.verteilung.find((v) => v.id === c.id)?.generation ?? sys.generation;
    const zulaessig = erlaubt(ui.art).includes(ui.generation);
    const plan = E.itProjektPlan(s(), ui.system, ui.art, ui.generation, ausgew.length);
    const gens = erlaubt(ui.art);
    let h = K.feld('System', K.stepper({ wert: sys.name, unter: `heute Generation ${sys.generation} von 4`, label: 'System wählen', attrMinus: 'data-it="system" data-v="-1"', attrPlus: 'data-it="system" data-v="1"' }));
    h += '<div class="hw-abstand"></div>' + K.feld('Realisierung', K.stepper({ wert: ARTEN.find(([a]) => a === ui.art)[1], label: 'Realisierung wählen', attrMinus: 'data-it="art" data-v="-1"', attrPlus: 'data-it="art" data-v="1"' }));
    h += '<div class="hw-abstand"></div>' + K.feld('Zielgeneration', K.stepper({ wert: `Generation ${ui.generation}`, unter: `möglich ${gens.join(', ')}`, label: 'Zielgeneration', attrMinus: 'data-it="generation" data-v="-1"', attrPlus: 'data-it="generation" data-v="1"', minusAus: ui.generation <= gens[0], plusAus: ui.generation >= gens[gens.length - 1] }));
    h += K.abschnitt('Vergleich', `${ausgew.length} Cluster`);
    h += K.tabelle({ titel: 'Realisierung', spalten: ['Wochen', 'Kosten', 'Risiko'], zeilen: ARTEN.map(([art, name]) => {
      const g = art === 'dienstleister' ? 3 : Math.min(ui.generation, art === 'entwickeln' ? 4 : 3);
      const x = E.itProjektPlan(s(), ui.system, art, g, ausgew.length);
      return { name: name + (art === ui.art ? ' (gewählt)' : ''), werte: [String(x.gesamt), geld(x.kosten), art === 'entwickeln' ? 'hoch' : art === 'kaufen' ? 'gering' : 'mittel'] };
    }) });
    h += K.abschnitt('Rollout-Cluster', `${ausgew.length} von ${d.cluster.length}`);
    h += `<div class="hw-knoepfe zweispaltig">${K.knopf('Alle wählen', 'data-it="alle"', 'zweit')}${K.knopf('Keine wählen', 'data-it="keine"', 'zweit')}</div>`;
    h += K.liste(d.cluster.map((c) => gen(c) >= ui.generation
      ? K.zeile({ was: esc(c.name), unter: `schon Generation ${gen(c)}`, wert: 'erledigt' })
      : K.schalter({ text: c.name, unter: `heute Generation ${gen(c)}`, an: ids.has(c.id), attr: `data-it="cluster" data-v="${esc(c.id)}"` })));
    h += K.abschnitt('Plan');
    h += K.liste([K.zeile({ was: 'Geplante Laufzeit', wert: `${plan.gesamt} Wochen` }), K.zeile({ was: 'Planbudget', wert: geld(plan.kosten) })]);
    h += K.knoepfe(K.knopf('Projekt beauftragen', 'data-it="start"', 'breit', !ausgew.length || !zulaessig || ausgew.some((c) => gen(c) >= ui.generation)));
    return { befund: `${esc(sys.name)} auf Generation ${ui.generation}: ${plan.gesamt} Wochen, ${geld(plan.kosten)}.`, html: h };
  }

  function produkte() {
    const k = E.itProdukte(s()), p = k.find((x) => x.id === ui.produkt);
    if (p) return { befund: `${esc(p.name)}: ${new Intl.NumberFormat('de-DE').format(p.kennzahl)} ${esc(p.einheit)} letzte Woche.`, html: itProduktDetail(p, ui.bestaetigung), roh: true };
    const aus = k.filter((x) => !x.aktiv || x.version === '0.0');
    return { befund: aus.length ? `${aus.map((x) => esc(x.name)).join(' und ')} ${aus.length === 1 ? 'läuft' : 'laufen'} noch nicht.` : 'Alle vier digitalen Produkte laufen.', html: itProdukteKarten(k), roh: true };
  }
  function zeichnen() {
    if (!ui.aktiv) return;
    const d = daten(), titel = { systeme: 'Systemlandkarte', produkte: 'Digitale Produkte', projekte: 'IT-Projekte', neu: 'Neues IT-Projekt' };
    const r = ui.reiter === 'systeme' ? systeme(d) : ui.reiter === 'produkte' ? produkte() : ui.reiter === 'projekte' ? projekte(d) : neu(d);
    const aktiv = d.projekte.filter((x) => x.phase !== 'abgeschlossen').length;
    ctx.panel('IT · ' + titel[ui.reiter], `Bereich IT · ${aktiv} aktive Projekte`, K.bereich('zentrale', 'systeme') + digitalSprecher(E, s(), r.befund, r.ton) + '<i class="hw-g3" hidden></i>'
      + (r.roh ? r.html : K.rumpf(r.html)) + K.reiterUnten(REITER, ui.reiter, (id) => `data-it="reiter" data-v="${id}"`), 'gross');
    ui.aktiv = true;
  }
  function melde(r) { ctx.meldung(r.text, !r.ok); if (r.ok) ctx.nachAktion?.(); return r; }
  function bearbeiten(el) {
    const v = el.dataset.v, d = daten();
    switch (el.dataset.it) {
      case 'reiter': ui.reiter = v; ui.auswahl = null; ui.produkt = null; ui.bestaetigung = false; document.getElementById('pinhalt').scrollTop = 0; break;
      case 'produkt': ui.reiter = 'produkte'; ui.produkt = v; ui.bestaetigung = false; break;
      case 'zurueck': ui.produkt = null; ui.bestaetigung = false; break;
      case 'abschalten': ui.bestaetigung = true; break;
      case 'abbrechen': ui.bestaetigung = false; break;
      case 'team': melde(E.fuehreAus(s(), { typ: 'itProduktTeam', produkt: v, anzahl: Number(el.dataset.n) })); break;
      case 'aktiv': {
        const p = E.itProdukte(s()).find((x) => x.id === v); if (!p) return;
        melde(E.fuehreAus(s(), { typ: 'itProduktAktiv', produkt: v, an: !p.aktiv })); ui.bestaetigung = false; break;
      }
      case 'modernisieren': {
        const p = E.itProdukte(s()).find((x) => x.id === v); if (!p) return;
        if (v === 'mobile_pay') {
          const k = d.systeme.find((x) => x.id === 'kasse'), stufe = k?.kasseAusbau?.mobil ?? 0;
          if (k?.generation >= 3) {
            if (stufe >= 2) { ctx.meldung('Mobile Kasse ist bereits vollständig ausgebaut.', false); break; }
            melde(E.fuehreAus(s(), { typ: 'itKasseAusbau', art: 'mobil', stufe: stufe + 1 })); break;
          }
        }
        ui.reiter = 'neu'; ui.system = p.system; ui.generation = Math.max(3, p.generation + 1); ui.auswahl = null; ui.produkt = null; break;
      }
      case 'neues': ui.reiter = 'neu'; ui.system = v; ui.auswahl = null; ui.generation = 3; break;
      case 'system': { const i = d.systeme.findIndex((x) => x.id === ui.system); ui.system = d.systeme[(i + Number(v) + d.systeme.length) % d.systeme.length].id; ui.auswahl = null; ui.generation = 3; break; }
      case 'art': {
        const i = ARTEN.findIndex(([a]) => a === ui.art); ui.art = ARTEN[(i + Number(v) + ARTEN.length) % ARTEN.length][0];
        if (ui.art === 'dienstleister') ui.generation = 3; else if (ui.art === 'kaufen' && ui.generation > 3) ui.generation = 3;
        ui.auswahl = null; break;
      }
      case 'generation': { const g = erlaubt(ui.art), i = g.indexOf(ui.generation); ui.generation = g[Math.max(0, Math.min(g.length - 1, (i < 0 ? 0 : i) + Number(v)))]; ui.auswahl = null; break; }
      case 'cluster': { const ids = auswahl(d); if (ids.has(v)) ids.delete(v); else ids.add(v); break; }
      case 'alle': ui.auswahl = new Set(d.cluster.filter((c) => (d.systeme.find((x) => x.id === ui.system)?.verteilung.find((x) => x.id === c.id)?.generation ?? 0) < ui.generation).map((c) => c.id)); break;
      case 'keine': ui.auswahl = new Set(); break;
      case 'start': {
        const clusterIds = d.cluster.filter((c) => auswahl(d).has(c.id)).map((c) => c.id);
        const r = melde(E.fuehreAus(s(), { typ: 'itProjekt', system: ui.system, art: ui.art, zielGeneration: ui.generation, clusterIds }));
        if (r.ok) ui.reiter = 'projekte'; break;
      }
      case 'hoch': case 'runter': {
        const p = d.projekte.find((x) => x.id === el.dataset.p); if (!p) return;
        const i = Number(el.dataset.i), j = i + (el.dataset.it === 'hoch' ? -1 : 1);
        if (j < 0 || j >= p.clusterIds.length) return;
        const ids = [...p.clusterIds]; [ids[i], ids[j]] = [ids[j], ids[i]];
        melde(E.fuehreAus(s(), { typ: 'itRolloutPlan', projekt: p.id, clusterIds: ids })); break;
      }
      case 'kasseAusbau': {
        const x = d.systeme.find((q) => q.id === 'kasse'), stufe = (x.kasseAusbau?.[v] ?? 0) + 1;
        melde(E.fuehreAus(s(), { typ: 'itKasseAusbau', art: v, stufe })); break;
      }
      default: return;
    }
    const pi = document.getElementById('pinhalt'), sc = pi.scrollTop;
    zeichnen();
    if (!['reiter', 'produkt', 'zurueck', 'neues', 'modernisieren'].includes(el.dataset.it)) pi.scrollTop = sc; else pi.scrollTop = 0;
  }
  const auf = (ev) => { if (!ui.aktiv) return; const el = ev.target.closest('[data-it]'); if (el && !el.disabled) bearbeiten(el); };
  document.getElementById('pinhalt').addEventListener('click', auf);
  document.getElementById('preiter').addEventListener('click', auf);
  return {
    oeffne: (seite = 'systeme', produkt = null) => { ui.aktiv = true; ui.reiter = seite; ui.produkt = seite === 'produkte' ? produkt : null; ui.bestaetigung = false; ui.auswahl = null; zeichnen(); document.getElementById('pinhalt').scrollTop = 0; },
    zu: () => { ui.aktiv = false; }, aktiv: () => ui.aktiv,
    pruefe: () => ({ seite: ui.reiter, systeme: daten().systeme.length, projekte: daten().projekte.length }),
  };
}
