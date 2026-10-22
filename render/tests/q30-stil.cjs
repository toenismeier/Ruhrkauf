// Q30: gemeinsamer Lauf für Panelaufnahmen und Stilprüfung (verbotene Muster), genutzt von tests/q30-panels.cjs
// und spiel-render.js --nur-panels. Q31 übergibt eine eigene Panelliste.
const fs = require('fs');
const path = require('path');

async function stilpruefungLaden(p) {
  await p.addScriptTag({ path: path.join(__dirname, '..', 'src', 'ui', 'stilpruefung.js') });
}

/** Öffnet jedes Panel, speichert ein Bild (wenn ordner) und prüft umgestellte Panels (umgestellt: true) oder alle (alle: true). */
async function panelLauf(p, panels, { ordner = null, alle = false, nur = null, log = console.log } = {}) {
  await stilpruefungLaden(p);
  if (ordner) fs.mkdirSync(ordner, { recursive: true });
  const ruhig = async () => {
    await p.waitForFunction('window.spiel.kachelnRuhig()', null, { timeout: 0, polling: 200 });
    await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await p.waitForTimeout(250);
  };
  const ergebnis = [];
  let gespielt = false;
  for (const panel of panels) {
    if (nur && !nur.includes(panel.name)) continue;
    if (!ordner && !panel.umgestellt && !alle) continue;
    if (panel.vorSpiel === false && !gespielt) {
      await p.evaluate(() => { window.spiel.schliessePanel(); window.spiel.neuesSpiel(1, 'Essen'); for (let i = 0; i < 8; i++) window.spiel.woche(false); window.spiel.fokusHaeuser(); });
      gespielt = true;
    }
    try {
      await p.evaluate(`(async () => { ${panel.oeffne} })()`);
      await p.waitForTimeout(200);
      await ruhig();
      if (panel.nach) { await p.evaluate(`(async () => { ${panel.nach} })()`); await p.waitForTimeout(150); }
      await p.evaluate(() => { const m = document.getElementById('meldung'); if (m) m.className = ''; const t = document.getElementById('erfolge-toast'); if (t) t.hidden = true; });
      let bild = null;
      if (ordner) { bild = path.join(ordner, panel.name + '.png'); await p.screenshot({ path: bild }); }
      const verstoesse = (panel.umgestellt || alle)
        ? await p.evaluate((w) => window.hartwigStilpruefung(w), panel.wurzel ?? '#panel') : [];
      ergebnis.push({ name: panel.name, bild, geprueft: !!(panel.umgestellt || alle), verstoesse });
      log(`${verstoesse.length ? 'FEHLER' : 'OK    '} Stil ${panel.name}${panel.umgestellt || alle ? '' : ' (nicht umgestellt, nur Bild)'}${verstoesse.length ? ': ' + verstoesse.slice(0, 8).join(' | ') : ''}`);
    } catch (e) {
      ergebnis.push({ name: panel.name, fehler: String(e) });
      log('FEHLER Stil ' + panel.name + ' ' + String(e).slice(0, 200));
    }
    await p.evaluate(() => { try { window.spiel.wochenbericht.zu(); } catch {} try { window.spiel.reise.zu(); } catch {} try { window.spiel.schliessePanel(); } catch {} document.getElementById('start')?.classList.remove('an'); document.getElementById('menue')?.classList.remove('offen'); });
  }
  return ergebnis;
}
module.exports = { panelLauf, stilpruefungLaden };
