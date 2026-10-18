// Datenquelle Einkauf und Eigenmarken: Engine-Abfragen aus /home/claude/turnaround/src (einkauf.ts, eigenmarken.ts).
// Die Oberfläche (einkauf.js, eigenmarken.js) liest nur über dieses Modul. einkauf-mock.js ist der alte Ersatz im
// Vertragsformat und wird nicht mehr gebündelt.

export function quelle(E) {
  const da = typeof E.einkaufUebersicht === 'function';
  return {
    da,
    uebersicht: (s, filter) => E.einkaufUebersicht(s, filter),
    wg: (s, id) => E.wgDetail(s, id),
    freigaben: (s, filter) => E.freigaben(s, filter),
    marken: (s) => E.eigenmarkenUebersicht(s),
    vorschau: (s, entwurf) => E.eigenmarkeVorschau(s, entwurf),
    wgListe: () => E.WG_DEF,
    spalten: () => E.EINKAUF_SPALTEN,
    beschaffung: () => E.BESCHAFFUNG,
    vorlagen: () => E.EM_VORLAGEN,
    tun: (s, a) => E.fuehreAus(s, a),
    /**
     * Eigenmarken-Shops eines Hauses: je Bereich die Marke mit dem größten VK-Anteil (jeBereich), wenn der Anteil
     * mindestens 12 % ist und die Marke zum Einzugsgebiet passt (passungHaus ab 0,5). Bereich → { name, farbe, anteil }.
     */
    shops: (s, haus, jeBereich = E.eigenmarkenUebersicht(s).jeBereich) => {
      const out = {};
      for (const [g, liste] of Object.entries(jeBereich ?? {})) {
        for (const x of liste) {
          const m = s.eigenmarken.marken.find((q) => q.id === x.marke);
          if (!m || x.anteil < 0.12 || E.passungHaus(m, haus) < 0.5) continue;
          out[g] = { name: x.name, farbe: x.farbe, anteil: Math.min(0.5, Math.max(0.2, x.anteil * 1.5)), marke: x.marke };
          break;
        }
      }
      return out;
    },
  };
}
