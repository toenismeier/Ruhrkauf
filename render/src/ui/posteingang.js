
import { geld, esc, kwVon } from './format.js';

// Zentraler Posteingang: reine Engine-Abfragen und bestehende Spieleraktionen.
export function posteingangModul(ctx) {
  const E = ctx.E, s = ctx.s;
  const ui = { aktiv: false, filter: 'Alle', verhandlung: null, ziel: null };
  const einstellungen = () => ctx.zustand();
  const daten = () => E.posteingang(s());
  const wochen = (n) => n === 0 ? 'läuft diese Woche ab' : n === 1 ? 'noch 1 Woche' : 'noch ' + n + ' Wochen';
  const leer = (t) => '<div class="postleer" role="status" style="padding:24px 16px;color:var(--ui-muted,#62666a);text-align:center">' + esc(t) + '</div>';

  function tabs(D) {
    const aktiv = einstellungen().reiter;
    return '<div class="tabs posttabs" role="tablist">' + [
      ['handeln', 'Zu tun', D.handeln.length], ['meldungen', 'Meldungen', D.meldungen.length], ['erledigt', 'Erledigt', D.erledigt.length],
    ].map(([v, t, n]) => '<button role="tab" aria-selected="' + (aktiv === v) + '" class="tab ' + (aktiv === v ? 'an' : '') + '" data-po-a="tab" data-v="' + v + '">' + t + (v === 'handeln' && n ? '<span class="zahl">' + n + '</span>' : '') + '</button>').join('') + '</div>';
  }
  function handeln(D) {
    if (ui.verhandlung) return verhandeln();
    if (!D.handeln.length) return leer('Keine offenen Angebote oder Entscheidungen.');
    return D.handeln.map((p) => {
      const rest = '<span class="chip ' + (p.dringend ? 'warn' : 'grau') + '">' + wochen(p.restWochen) + '</span>';
      const wert = p.wert ? '<div class="postwert"><b>' + esc(geld(p.wert.betrag)) + '</b><span>' + esc(p.wert.einheit) + '</span></div>' : '';
      const buttons = p.optionen.map((o) => '<button class="' + (o.id === 'ablehnen' ? 'rot' : o.id === 'annehmen' ? 'gruen' : '') + '" data-po-a="option" data-id="' + esc(p.id) + '" data-v="' + esc(o.id) + '">' + esc(o.label) + '</button>').join('');
      const ort = p.bezug && (p.bezug.hausIds?.length || p.bezug.stadt || p.bezug.modul) ? '<button class="postort" data-po-a="ort" data-id="' + esc(p.id) + '">Zum Ort →</button>' : '';
      return '<article class="karte postkarte" data-post-id="' + esc(p.id) + '"><div class="postkopf"><div class="posttyp">' + (p.art === 'angebot' ? 'Angebot' : 'Entscheidung') + ' · KW ' + kwVon(p.woche) + '</div><h3>' + esc(p.titel) + '</h3><div class="postchips">' + rest + ort + '</div></div><details class="postdetail"><summary>Details anzeigen</summary><p>' + esc(p.text) + '</p></details>' + wert + '<p class="poststandard">Ohne Entscheidung: ' + esc(p.standard) + '</p><div class="postaktionen">' + buttons + '</div></article>';
    }).join('');
  }
  function verhandeln() {
    const a = s().angebote.find((x) => x.id === ui.verhandlung.id && x.status === 'offen');
    if (!a) { ui.verhandlung = null; return leer('Das Angebot ist nicht mehr offen.'); }
    const hauser = s().haeuser.filter((h) => h.status === 'offen' && h.etagen.includes(a.etage ?? 0)).sort((x, y) => x.stadt.localeCompare(y.stadt) || x.name.localeCompare(y.name));
    return '<button class="postzurueck" data-po-a="zurueck">← Zurück zu den Angeboten</button><div class="karte"><div class="postkopf"><div class="posttyp">Paketangebot verhandeln</div><h3>' + esc(a.titel) + '</h3><p class="posthinweis">Mindestens ' + (a.minHaeuser ?? 1) + ' Standorte auswählen. Die Engine prüft anschließend die Verhandlungsposition.</p></div><div class="posthausliste">' + hauser.map((h) => '<label class="posthaus"><input data-po-haus="' + esc(h.id) + '" type="checkbox" ' + (ui.verhandlung.haeuser.has(h.id) ? 'checked' : '') + '><span>' + esc(h.name) + '<small>' + esc(h.stadt) + '</small></span></label>').join('') + '</div><div class="postaktionen"><button data-po-a="verhandeln" class="gruen">Auswahl verhandeln (' + ui.verhandlung.haeuser.size + ')</button></div></div>';
  }
  function meldungen(D) {
    const filter = ui.filter;
    const liste = D.meldungen.filter((m) => filter === 'Alle' || m.kategorie === filter);
    const kategorien = ['Alle', 'Presse', 'Häuser', 'Finanzen', 'Personal', 'Konkurrenz', 'Eigentümer', 'IT'];
    let html = '<label class="postfilter">Kategorie <select class="ort gross" data-po-filter aria-label="Meldungen filtern">' + kategorien.map((k) => '<option ' + (k === filter ? 'selected ' : '') + 'value="' + esc(k) + '">' + esc(k) + '</option>').join('') + '</select></label><button class="postalle" data-po-a="alleLesen">Alle als gelesen markieren</button>';
    if (!liste.length) return html + leer('Keine Meldungen in dieser Kategorie.');
    const gelesen = new Set(einstellungen().gelesen ?? []);
    const symbole = { Presse: 'P', Häuser: 'H', Finanzen: '€', Personal: 'M', Konkurrenz: 'K', Eigentümer: 'E', IT: 'IT' };
    // Q06: Wettbewerb ist eine eigene, im Standard geschlossene Sammelrubrik.
    const wettbewerb = liste.filter((m) => m.kategorie === 'Konkurrenz');
    const andere = liste.filter((m) => m.kategorie !== 'Konkurrenz');
    const eintrag = (m) => {
      const bezug = m.bezug && (m.bezug.stadt || m.bezug.modul || m.bezug.hausIds?.length);
      const info = '<span class="postsymbol" aria-hidden="true">' + symbole[m.kategorie] + '</span><span class="postnachricht"><small>' + esc(m.kategorie) + ' · KW ' + kwVon(m.woche) + (gelesen.has(m.id) ? '' : ' · Neu') + '</small><span>' + esc(m.text) + '</span></span>';
      return '<div class="karte postmeldung ' + (gelesen.has(m.id) ? '' : 'ungelesen') + '" data-post-id="' + esc(m.id) + '"><button data-po-a="lesen" data-id="' + esc(m.id) + '">' + info + '</button>' + (bezug ? '<button class="postort" data-po-a="sprung" data-id="' + esc(m.id) + '">Zum Ort →</button>' : '') + '</div>';
    };
    const regulär = andere.map(eintrag).join('');
    const rubrik = wettbewerb.length
      ? '<details class="karte post-konkurrenz" ' + (filter === 'Konkurrenz' ? 'open' : '') +
        '><summary>Konkurrenz · ' + wettbewerb.length + ' Meldung' + (wettbewerb.length === 1 ? '' : 'en') +
        ' (anzeigen)</summary><div class="post-konkurrenz-inhalt">' + wettbewerb.map(eintrag).join('') + '</div></details>'
      : '';
    return html + regulär + rubrik;
  }
  function erledigt(D) {
    if (!D.erledigt.length) return leer('In den letzten 13 Wochen wurde noch nichts erledigt.');
    return D.erledigt.map((p) => '<div class="karte posterledigt" data-post-id="' + esc(p.id) + '"><small>' + (p.art === 'angebot' ? 'Angebot' : 'Entscheidung') + ' · KW ' + kwVon(p.woche) + '</small><b>' + esc(p.titel) + '</b><span>' + esc(p.ergebnis) + (p.standard ? ' · Automatisch bei Fristablauf' : '') + '</span></div>').join('');
  }
  function zeigen(scrollHalten = false) {
    const vorher = document.getElementById('pinhalt').scrollTop, D = daten();
    const inhalt = tabs(D) + (einstellungen().reiter === 'meldungen' ? meldungen(D) : einstellungen().reiter === 'erledigt' ? erledigt(D) : handeln(D));
    ctx.panel('Posteingang', D.handeln.length + ' Vorgänge offen · KW ' + kwVon(s().woche), inhalt, 'gross');
    ui.aktiv = true;
    document.getElementById('pinhalt').scrollTop = scrollHalten ? vorher : 0;
    if (ui.ziel) {
      const el = [...document.querySelectorAll('[data-post-id]')].find((x) => x.dataset.postId === ui.ziel);
      if (el) el.scrollIntoView({ block: 'nearest' });
      ui.ziel = null;
    }
    badge();
  }
  function gelesen(id) {
    const z = einstellungen();
    if (!z.gelesen.includes(id)) {
      z.gelesen.push(id);
      // Nur Einträge im aktuellen 13-Wochen-Fenster speichern.
      const gueltig = new Set(daten().meldungen.map((m) => m.id));
      z.gelesen = z.gelesen.filter((x) => gueltig.has(x));
      ctx.nachZustand();
    }
  }
  function badge() {
    const D = daten(), n = D.handeln.length, dringend = D.handeln.some((x) => x.dringend);
    for (const id of ['postbadge', 'postmenubadge']) {
      const b = document.getElementById(id);
      if (b) { b.textContent = n; b.style.display = n ? '' : 'none'; b.classList.toggle('dringend', dringend); }
    }
    return n;
  }
  function klicken(el) {
    const a = el.dataset.poA, id = el.dataset.id, v = el.dataset.v;
    if (a === 'tab') { einstellungen().reiter = v; ui.verhandlung = null; ctx.nachZustand(); return zeigen(); }
    if (a === 'alleLesen') { for (const m of daten().meldungen) gelesen(m.id); return zeigen(true); }
    if (a === 'lesen') { gelesen(id); return zeigen(true); }
    if (a === 'sprung') { gelesen(id); const m = daten().meldungen.find((x) => x.id === id); if (m?.bezug) ctx.springe(m.bezug); return; }
    if (a === 'ort') { const p = daten().handeln.find((x) => x.id === id); if (p?.bezug) ctx.springe(p.bezug); return; }
    if (a === 'zurueck') { ui.verhandlung = null; return zeigen(); }
    if (a === 'option' && v === 'verhandeln') {
      const an = s().angebote.find((x) => x.id === id);
      if (an?.typ === 'paket') ui.verhandlung = { id, haeuser: new Set(an.vorschlagHaeuser ?? an.wunschHaeuser ?? []) };
      return zeigen();
    }
    let aktion;
    if (a === 'option') aktion = id && v ? (daten().handeln.some((p) => p.id === id && p.art === 'entscheidung') ? { typ: 'entscheiden', id, option: v } : { typ: v === 'annehmen' ? 'angebotAnnehmen' : 'angebotAblehnen', angebot: id }) : null;
    if (a === 'verhandeln' && ui.verhandlung) aktion = { typ: 'angebotVerhandeln', angebot: ui.verhandlung.id, haeuser: [...ui.verhandlung.haeuser] };
    if (!aktion) return;
    const r = E.fuehreAus(s(), aktion);
    ctx.meldung(r.text, r.ok);
    if (a === 'verhandeln' && r.ok) ui.verhandlung = null;
    ctx.nachAktion?.();
    zeigen(true);
  }
  const inhalt = document.getElementById('pinhalt');
  inhalt.addEventListener('click', (event) => {
    if (!ui.aktiv) return;
    const el = event.target.closest('[data-po-a]');
    if (el && !el.disabled) klicken(el);
  });
  inhalt.addEventListener('change', (event) => {
    if (!ui.aktiv) return;
    if (event.target.matches('[data-po-filter]')) { ui.filter = event.target.value; zeigen(); }
    if (event.target.matches('[data-po-haus]') && ui.verhandlung) {
      if (event.target.checked) ui.verhandlung.haeuser.add(event.target.dataset.poHaus);
      else ui.verhandlung.haeuser.delete(event.target.dataset.poHaus);
      zeigen(true);
    }
  });
  return {
    ui, oeffne: (reiter = einstellungen().reiter, ziel = null) => {
      einstellungen().reiter = reiter; ui.verhandlung = null; ui.ziel = ziel; ctx.nachZustand(); zeigen();
    },
    zu: () => { ui.aktiv = false; }, aktiv: () => ui.aktiv, neuZeichnen: () => { if (ui.aktiv) zeigen(true); },
    badge, pruefe: () => ({ soll: daten().handeln.length, badge: Number(document.getElementById('postbadge')?.textContent ?? 0), karten: document.querySelectorAll('.postkarte').length, seite: einstellungen().reiter }),
  };
}
