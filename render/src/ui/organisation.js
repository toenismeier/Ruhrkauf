// O01 Organisation: Zentrale und Vertrieb als Hierarchie (Vorstand → Bereiche, Region → Hauscluster). Alle Kennzahlen
// stammen aus Engine-Abfragen. Stellen öffnen eine Personenseite wie Coffee 28 (Porträtrahmen, Fähigkeiten, Delegation).
import { esc, geld } from './format.js';
import { portraet } from './vorstand.js';
import { vertriebModul } from './vertrieb.js';
import { zentraleReiter, figurKlein, G4 } from './zentrale-abteilungen.js';
import * as K from './komponenten.js';

const pz = (q) => Math.round(q * 100) + ' %';
const anDen = (b) => b === 'spieler' ? 'CEO' : String(b ?? '').toUpperCase();

export function organisationModul(ctx) {
  const { E } = ctx, s = () => ctx.s();
  const ui = { aktiv: false, reiter: 'zentrale', ebene: null, id: null, format: null };
  const vertrieb = vertriebModul({ E, s, oeffneHaus: ctx.oeffneHaus, oeffnePortfolio: ctx.oeffnePortfolio });
  const ziel = (id, cluster) => ` data-id="${esc(id)}"${cluster ? ' data-cluster="1"' : ''}`;
  const delegiertZahl = (aufgaben) => (aufgaben ?? []).filter((a) => a.an).length;

  /** Delegation je Aufgabe als Schalter (Coffee 28), Freigabegrenze als Stepper. */
  function delegation(stelle, aufgaben, id, cluster = false) {
    let h = K.abschnitt('Delegation', 'wirkt ab der nächsten Woche');
    h += K.schalter({ text: 'Ganzen Bereich delegieren', unter: stelle?.delegiert ? 'die Leitung entscheidet' : 'Vorlagen kommen zu dir', an: !!stelle?.delegiert,
      attr: `data-org="delegation"${ziel(id, cluster)}` });
    for (const a of aufgaben ?? []) {
      h += K.schalter({ text: a.name, unter: a.an ? 'delegiert' : 'beim CEO', an: !!a.an, attr: `data-org="aufgabe"${ziel(id, cluster)} data-task="${esc(a.id)}"` });
      if (a.grenze !== undefined) h += `<div class="hw-grenze">${K.feld('Freigabegrenze ' + a.name, K.stepper({ wert: geld(a.grenze), unter: 'Schritt 10.000 €', label: 'Freigabegrenze ' + a.name,
        attrMinus: `data-org="grenze"${ziel(id, cluster)} data-task="${esc(a.id)}" data-grenze="${a.grenze}" data-delta="-10000"`,
        attrPlus: `data-org="grenze"${ziel(id, cluster)} data-task="${esc(a.id)}" data-grenze="${a.grenze}" data-delta="10000"`, minusAus: a.grenze <= 0 }))}</div>`;
    }
    return h;
  }

  /** Personenseite einer Leitungsstelle (Coffee 28). */
  function profil(x, stelle, titel, ebene, id) {
    const p = stelle?.person;
    let h = K.knoepfe(K.knopf('‹ Organigramm', 'data-org="zurueck"', 'text'));
    h += K.abschnitt(titel);
    if (p) {
      h += `<div class="hw-person"><div class="hw-portraet hw-kontur">${portraet(p.portraet, 104)}</div><div class="hw-person-daten"><h3 class="hw-person-name">${esc(p.name)}</h3>`
        + `<span class="hw-marke">Fähigkeiten</span>${K.skala('Qualität', p.qualitaet * 100)}${K.skala('Stimmung', p.stimmung)}</div></div>`;
      h += `<div class="hw-felder">${K.feld('Jahresgehalt', `<b class="hw-feldwert">${geld(p.gehalt)}</b>`)}${K.feld('Wechselwille', `<b class="hw-feldwert${p.wechselwille > 0.3 ? ' hw-schlecht' : ''}">${pz(p.wechselwille)}</b><small class="hw-feldunter">${p.wechselwille > 0.3 ? 'Halteprämie senkt das Risiko' : 'gering'}</small>`)}</div>`;
      h += `<div class="hw-knoepfe zweispaltig">${K.knopf('Halteprämie 10.000 €', 'data-org="praemie"', 'zweit')}${K.knopf('Entlassen', 'data-org="entlassen" data-gefahr', 'gefahr')}</div>`;
    } else h += K.leer('Die Stelle ist vakant und berichtet unmittelbar nach oben.', 'Leitung unbesetzt');
    if (ebene === 'bereich') {
      const b = x.bereiche.find((q) => q.id === id);
      if (b) {
        h += K.liste([K.zeile({ was: 'Berichtet an', wert: anDen(b.berichtetAn) }), K.zeile({ was: 'Ausbaustufe der Abteilung', wert: 'Stufe ' + b.hqStufe }),
          K.zeile({ was: 'Offene Vorlagen', wert: String(b.offen), ton: b.offen ? 'achtung' : '' })]);
        if (b.abteilung) h += K.knoepfe(K.knopf('Abteilung und Etage ansehen', `data-org="etage" data-id="${esc(b.abteilung)}"`, 'zweit breit'));
        h += delegation(b.stelle, b.aufgaben, b.id);
      }
    }
    if (ebene === 'cluster') {
      const c = [...x.regionen.flatMap((r) => r.cluster), x.sonder].find((q) => q?.id === id);
      if (c) h += delegation(c.stelle, c.aufgaben, c.id, true);
    }
    h += K.abschnitt('Kandidaten', `${stelle?.kandidaten?.length ?? 0} Personen`);
    h += stelle?.kandidaten?.length ? K.liste(stelle.kandidaten.map((k) => `<div class="hw-zeile">${figurKlein(portraet(k.portraet, 56))}<span class="hw-was">${esc(k.name)}<small>Qualität ${pz(k.qualitaet)} · ${geld(k.gehalt)} im Jahr</small></span>${K.knopf('Einstellen', `data-org="besetzen" data-kandidat="${esc(k.id)}"`, 'zweit')}</div>`))
      : K.leer('Gerade keine Kandidaten am Markt.');
    if (ebene === 'cluster') {
      const moeglich = s().haeuser.filter((h0) => h0.status === 'offen' && h0.personal.filialleiter.skill >= 0.7 && E.hausclusterVon(s(), h0.id)?.id === id).slice(0, 8);
      if (moeglich.length) h += K.abschnitt('Hausleitungen befördern', `${moeglich.length} geeignet`) + K.liste(moeglich.map((h0) =>
        `<div class="hw-zeile"><span class="hw-was">${esc(h0.personal.filialleiter.name)}<small>${esc(h0.name)}</small></span>${K.knopf('Befördern', `data-org="befoerdern" data-haus="${esc(h0.id)}"`, 'zweit')}</div>`));
    }
    return h;
  }

  /** Zentrale: Vorstand → Bereiche als Listen. */
  function zentrale(st, x) {
    let h = '';
    for (const ressort of x.ressorts) {
      const bs = x.bereiche.filter((b) => b.ressort === ressort.id);
      if (!bs.length) continue;
      h += K.abschnitt(ressort.id.toUpperCase() + ' · ' + ressort.name, ressort.person ? ressort.person.name : 'unbesetzt');
      h += K.liste(bs.map((b) => {
        const p = b.stelle?.person, n = b.aufgaben?.length ?? 0;
        return `<button type="button" class="hw-zeile" data-org="profil" data-ebene="bereich" data-id="${esc(b.id)}">${figurKlein(p ? portraet(p.portraet, 56) : '')}`
          + `<span class="hw-was">${esc(b.name)}<small>${p ? esc(p.name) : '<span class="hw-schlecht">unbesetzt</span>'} · Stufe ${b.hqStufe} · an ${anDen(b.berichtetAn)}</small></span>`
          + `<span class="hw-wert${b.offen ? ' achtung' : ''}">${b.delegiert ? 'delegiert' : delegiertZahl(b.aufgaben) + ' von ' + n}<small>${b.offen ? b.offen + ' Vorlagen' : b.delegiert ? 'ganzer Bereich' : 'Aufgaben delegiert'}</small></span><span class="hw-pfeil" aria-hidden="true">›</span></button>`;
      }));
      // Q06: Marktbeobachtung als eigene steuerbare Fachabteilung unter dem CSO.
      if (bs.some((b) => b.id === 'marktbeobachtung')) {
        const markt = E.marktbeobachtungUebersicht(st);
        h += `<p class="hw-marke hw-gruppe">Marktbeobachtung · ${markt.fte} FTE · ${esc(geld(markt.kostenWoche))} je Woche</p>`
          + K.seg([0, 1, 2, 3].map((n) => [n, 'Stufe ' + n]), markt.stufe, (n) => `data-org="marktStufe" data-stufe="${n}"`)
          + `<p class="hw-lese hw-leise hw-unterzeile">Leitung ${esc(markt.leitung)} · ${markt.erfasst} Rohmeldungen, ${markt.gemeldet} veröffentlicht</p>`;
      }
    }
    return h;
  }

  /** E53: Konzern nach Formaten (52 Wochen, Zentrale nach Umsatzanteil umgelegt). Antippen öffnet das Format. */
  function formatTafel(st) {
    const g = E.konzernNachFormaten(st);
    const mio = (x) => (x / 1e6).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' Mio. €';
    let h = K.abschnitt('Konzern nach Formaten', (g.vorlaufWochen ? 'letzte 52 Wochen inkl. Vorlauf' : 'letzte 52 Wochen'));
    h += K.gross([{ label: 'Umsatz', wert: mio(g.umsatz) }, { label: 'EBITDA nach Zentrale', wert: mio(g.ergebnis), ton: g.ergebnis < 0 ? 'schlecht' : 'gut', unter: 'Zentrale ' + mio(g.zentrale) }]);
    h += K.liste(g.zeilen.map((z) => K.zeile({ was: esc(z.name),
      unter: `${z.haeuser} Häuser · ${z.format === 'premium' ? 'eigene Führung' : z.regionen + ' Regionen · ' + z.cluster + ' Cluster'} · Haus-EBITDA ${esc(mio(z.hausEbitda))}`,
      wert: mio(z.ergebnis), wertUnter: 'nach Umlage', ton: z.ergebnis < 0 ? 'schlecht' : '', tippbar: true, attr: `data-org="format" data-format="${esc(z.format)}"` })));
    h += `<p class="hw-lese hw-leise hw-unterzeile">Umlage der Zentrale vorerst nach Umsatzanteil.</p>`;
    return h;
  }
  const leitungZeile = (titel, stelle, ebene, id) => K.zeile({ was: esc(titel), unter: stelle?.person ? esc(stelle.person.name) : '<span class="hw-schlecht">unbesetzt</span>', tippbar: true, attr: `data-org="profil" data-ebene="${ebene}" data-id="${esc(id)}"` });

  /** Vertrieb: Formattafel, Vertriebssteuerung; je Format Formatleitung → Regionen → Hauscluster. */
  function vertriebsseite(st, x) {
    if (!ui.format) return formatTafel(st) + vertrieb.darstellen();
    const f = x.formate.find((q) => q.id === ui.format);
    let h = K.knoepfe(K.knopf('‹ Alle Formate', 'data-org="format" data-format=""', 'text'));
    h += K.abschnitt(f.name, `${f.haeuser} Häuser`);
    h += K.liste([leitungZeile(f.leitungTitel, f.stelle, 'format', f.id)]);
    for (const r of f.regionen) {
      h += K.abschnitt('Region ' + r.name, `${r.haeuser} Häuser · ${r.cluster.length} Cluster`);
      h += K.liste([leitungZeile('Regionalleitung', r.stelle, 'region', r.id),
      ...r.cluster.map((c) => K.zeile({ was: esc(c.name), unter: `${c.anzahl} Häuser · ${c.stelle.person ? esc(c.stelle.person.name) : '<span class="hw-schlecht">Leitung unbesetzt</span>'}`,
        wert: st.woche === 0 ? 'noch offen' : geld(c.umsatz), wertUnter: 'Umsatz Woche', tippbar: true, attr: `data-org="profil" data-ebene="cluster" data-id="${esc(c.id)}"` }))]);
    }
    if (f.id === 'premium' && x.sonder) {
      const c = x.sonder;
      h += K.abschnitt('Premium und Flagships', `${c.hausIds.length} Häuser · ${x.flagships.length} Flagships`);
      h += K.liste([K.zeile({ was: 'Steuerungsgruppe Premium und Flagships', unter: c.stelle?.person ? esc(c.stelle.person.name) : '<span class="hw-schlecht">unbesetzt</span>', tippbar: true, attr: `data-org="profil" data-ebene="cluster" data-id="${esc(c.id)}"` })]);
      // Premium ist immer sichtbar, auch außerhalb des Rankings der größten zwölf Häuser.
      const premiumHaeuser = st.haeuser.filter((haus) => haus.klasse === 'premium');
      const gewaehlte = st.haeuser.filter((haus) => x.flagships.includes(haus.id));
      const kandidaten = st.haeuser.filter((haus) => haus.format === 'warenhaus' && haus.status === 'offen' && haus.klasse !== 'premium')
        .sort((a, b) => b.grundflaecheQm * b.etagen.length - a.grundflaecheQm * a.etagen.length).slice(0, 12);
      const liste = [...new Map([...premiumHaeuser, ...gewaehlte, ...kandidaten].map((haus) => [haus.id, haus])).values()];
      const namen = new Map();
      for (const haus of liste) namen.set(haus.name, (namen.get(haus.name) ?? 0) + 1);
      h += K.liste(liste.map((haus) => {
        const an = x.flagships.includes(haus.id), premium = haus.klasse === 'premium';
        return `<div class="hw-zeile"><span class="hw-was">${esc(haus.name)}<small>${namen.get(haus.name) > 1 ? esc(haus.stadt) + ' · ' : ''}${premium ? 'Premiumhaus, fest' : an ? 'Flagship' : 'großes Warenhaus'}</small></span>`
          + (premium ? K.marke('fest') : K.knopf(an ? 'Abwählen' : 'Wählen', `data-org="flagship" data-haus="${esc(haus.id)}" data-an="${!an}"`, 'zweit')) + '</div>';
      }));
    }
    return h;
  }

  function zeichnen() {
    const st = s(), x = E.organisationUebersicht(st);
    // Q30: Hauptfrage „Wer führt was, und wo fehlt eine Leitung oder liegt Arbeit beim CEO?“
    const stellen = x.bereiche.length + x.ressorts.length + x.formate.length + x.regionen.reduce((n, r) => n + 1 + r.cluster.length, 0);
    const frei = x.bereiche.filter((b) => !b.stelle?.person).length + x.ressorts.filter((r) => !r.person).length
      + x.formate.filter((f) => !f.stelle?.person).length
      + x.regionen.reduce((n, r) => n + (r.stelle?.person ? 0 : 1) + r.cluster.filter((c) => !c.stelle?.person).length, 0);
    const vorlagen = x.bereiche.reduce((n, b) => n + (b.offen ?? 0), 0), selbst = x.bereiche.filter((b) => !b.delegiert).length;
    const chro = x.ressorts.find((r) => r.id === 'chro')?.person;
    let h = K.bereich('zentrale', 'organisation') + G4 + K.sprecher({ text: (frei ? '<b>' + frei + (frei === 1 ? ' Leitungsstelle ist' : ' Leitungsstellen sind') + ' unbesetzt.</b> ' : '<b>Alle Leitungsstellen sind besetzt.</b> ')
      + (vorlagen ? vorlagen + ' Vorlagen warten auf Entscheidung.' : 'Keine offenen Vorlagen.'), unter: (chro ? chro.name + ' · ' : '') + 'Personalvorstand',
      person: chro?.portraet ? portraet(chro.portraet, 72) : '', ton: frei ? 'engpass' : '' });
    let r = '';
    if (ui.ebene) {
      const stelle = ui.ebene === 'bereich' ? x.bereiche.find((b) => b.id === ui.id)?.stelle
        : ui.ebene === 'format' ? x.formate.find((q) => q.id === ui.id)?.stelle
        : ui.ebene === 'region' ? x.regionen.find((q) => q.id === ui.id)?.stelle
        : [...x.regionen.flatMap((q) => q.cluster), x.sonder].find((c) => c?.id === ui.id)?.stelle;
      const titel = ui.ebene === 'bereich' ? x.bereiche.find((b) => b.id === ui.id)?.name
        : ui.ebene === 'format' ? x.formate.find((q) => q.id === ui.id)?.leitungTitel
        : ui.ebene === 'region' ? (() => { const r = x.regionen.find((q) => q.id === ui.id); return r ? x.formate.find((f) => f.id === r.format)?.name + ' · Region ' + r.name : ui.id; })() : [...x.regionen.flatMap((q) => q.cluster), x.sonder].find((c) => c?.id === ui.id)?.name;
      r += profil(x, stelle, titel ?? ui.id, ui.ebene, ui.id);
    } else {
      r += `<div class="hw-abstand"></div>` + K.seg([['zentrale', 'Zentrale'], ['vertrieb', 'Vertrieb']], ui.reiter, (v) => 'data-org="reiter" data-reiter="' + v + '"');
      r += K.gross([{ label: 'Leitungen besetzt', wert: `${stellen - frei} von ${stellen}`, ton: frei ? 'schlecht' : '' },
        { label: 'Entscheidest du selbst', wert: `${selbst} von ${x.bereiche.length}`, unter: vorlagen ? `${vorlagen} offene Vorlagen` : 'keine offenen Vorlagen' }]);
      r += ui.reiter === 'zentrale' ? zentrale(st, x) : vertriebsseite(st, x);
    }
    h += K.rumpf(r) + zentraleReiter('organisation');
    ctx.panel('Organisation', ui.reiter === 'zentrale' ? 'Vorstand und Bereiche' : 'Haus, Hauscluster, Region, Vertriebsvorstand', h, 'gross');
    ui.aktiv = true;
  }
  function tun(aktion) { const r = E.fuehreAus(s(), aktion); ctx.meldung(r.text, r.ok); ctx.nachAktion?.(); if (r.ok) zeichnen(); }
  document.getElementById('pinhalt').addEventListener('click', (ev) => {
    if (!ui.aktiv) return;
    const v = ev.target.closest('[data-vtr]'); if (v) { if (vertrieb.klick(v)) zeichnen(); return; }
    const el = ev.target.closest('[data-org]'); if (!el || el.disabled) return;
    const a = el.dataset.org;
    const wer = () => (el.dataset.cluster ? { hauscluster: el.dataset.id } : { bereich: el.dataset.id });
    if (a === 'etage') { ctx.oeffneAbteilung?.(el.dataset.id); return; }
    if (a === 'reiter') { ui.reiter = el.dataset.reiter; ui.ebene = null; ui.format = null; zeichnen(); }
    if (a === 'format') { ui.format = el.dataset.format || null; ui.ebene = null; zeichnen(); document.getElementById('pinhalt').scrollTop = 0; }
    if (a === 'marktStufe') tun({ typ: 'marktbeobachtungStufe', stufe: Number(el.dataset.stufe) });
    if (a === 'zurueck') { ui.ebene = null; zeichnen(); }
    if (a === 'profil') { ui.ebene = el.dataset.ebene; ui.id = el.dataset.id; zeichnen(); document.getElementById('pinhalt').scrollTop = 0; }
    if (a === 'delegation') tun({ typ: 'delegation', ...wer(), an: el.getAttribute('aria-pressed') !== 'true' });
    if (a === 'aufgabe') tun({ typ: 'delegation', ...wer(), aufgabe: el.dataset.task, an: el.getAttribute('aria-pressed') !== 'true' });
    if (a === 'grenze') tun({ typ: 'delegationGrenze', ...wer(), aufgabe: el.dataset.task, betrag: Math.max(0, Number(el.dataset.grenze) + Number(el.dataset.delta)) });
    if (a === 'flagship') tun({ typ: 'flagship', haus: el.dataset.haus, an: el.dataset.an === 'true' });
    if (a === 'besetzen') tun({ typ: 'organisationBesetzen', ebene: ui.ebene, id: ui.id, kandidat: el.dataset.kandidat });
    if (a === 'entlassen') tun({ typ: 'organisationEntlassen', ebene: ui.ebene, id: ui.id });
    if (a === 'praemie') tun({ typ: 'organisationHaltepraemie', ebene: ui.ebene, id: ui.id, betrag: 10000 });
    if (a === 'befoerdern') tun({ typ: 'organisationBefoerdern', haus: el.dataset.haus, hauscluster: ui.id });
  });
  document.getElementById('pinhalt').addEventListener('change', (ev) => {
    if (ui.aktiv && ev.target.matches('[data-vtr-wahl]') && vertrieb.wahl(ev.target)) zeichnen();
  });
  return { oeffne: (reiter = 'zentrale', format = null) => { ui.reiter = reiter; ui.ebene = null; ui.format = format; zeichnen(); }, zu: () => { ui.aktiv = false; }, aktiv: () => ui.aktiv,
    pruefe: () => ({ reiter: ui.reiter, bereiche: E.organisationUebersicht(s()).bereiche.length, cluster: E.organisationUebersicht(s()).regionen.reduce((n, r) => n + r.cluster.length, 0), formate: E.organisationUebersicht(s()).formate.length, format: ui.format }) };
}
