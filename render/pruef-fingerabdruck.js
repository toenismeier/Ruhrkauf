#!/usr/bin/env node
// Q03 – reproduzierbarer Stadt-Fingerabdruck (Plan, Geometrie, Startbild).
// node pruef-fingerabdruck.js [--pruefen] [stadt-id ...]
// node pruef-fingerabdruck.js --neu <stadt-id ...>  oder  --neu --alle
// node pruef-fingerabdruck.js --gegenprobe <stadt-id>
// Referenzen werden niemals beim Prüfen stillschweigend erzeugt.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');

const ROOT = __dirname;
const REFERENZEN = path.join(ROOT, 'fingerabdruck');
const BILDER = path.join(REFERENZEN, 'bilder');
const OUT = path.join(ROOT, 'out');
const GROESSE = { breite: 512, hoehe: 1024 };
const GRENZEN = { kanal: 18, anteilProzent: 2, mittelwert: 1.5 };
// Zeitlimit lokal 5 Minuten; auf schwächeren Rechnern (CI, 2 Kerne ohne GPU) per Umgebung anheben.
const STADTZAHL = 220, GRUPPEN_GROESSE = 5, PARALLEL = 2, ZEITLIMIT_MS = 1000 * Number(process.env.FINGERABDRUCK_ZEITLIMIT_S || 300);

function kennung(name) {
  return name.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
/** Kompakt, aber diff-freundlich: Listeneinträge je eine Zeile. */
function jsonZeilen(wert, tiefe = 0) {
  const ein = '  '.repeat(tiefe + 1), aus = '  '.repeat(tiefe);
  if (Array.isArray(wert)) {
    if (!wert.length || wert.every((x) => x === null || typeof x !== 'object')) return JSON.stringify(wert) + (tiefe ? '' : '\n');
    return '[\n' + wert.map((x) => ein + JSON.stringify(x)).join(',\n') + '\n' + aus + ']' + (tiefe ? '' : '\n');
  }
  if (wert && typeof wert === 'object')
    return '{\n' + Object.entries(wert).map(([k, v]) => ein + JSON.stringify(k) + ': ' + jsonZeilen(v, tiefe + 1)).join(',\n') + '\n' + aus + '}' + (tiefe ? '' : '\n');
  return JSON.stringify(wert);
}
function hash(wert) {
  return crypto.createHash('sha256').update(typeof wert === 'string' || Buffer.isBuffer(wert) ? wert : JSON.stringify(wert)).digest('hex');
}
function stadtliste() {
  // Alle grafisch gebauten Städte: Hartwig und Sport, Volkskauf und FUNDUS (Maßstab: 220 Städte)
  const haeuser = [...require('./haeuser.json'), ...require('./haeuser-schwester.json'), ...require('./haeuser-outlet.json')];
  const namen = [...new Set(haeuser.map((h) => h.stadt))].sort((a, b) => a.localeCompare(b, 'de'));
  if (namen.length !== STADTZAHL) throw new Error('Unerwartete Stadtanzahl: ' + namen.length + ' statt ' + STADTZAHL);
  const map = new Map();
  for (const name of namen) {
    const id = kennung(name);
    if (map.has(id)) throw new Error('Mehrdeutige Stadtkennung: ' + id);
    map.set(id, name);
  }
  return map;
}
function auswahl(args, staedte) {
  args = [...args];
  const neu = args.includes('--neu'), pruefen = args.includes('--pruefen'), gegenprobe = args.includes('--gegenprobe'), messen = args.includes('--messen');
  if (Number(neu) + Number(pruefen) + Number(gegenprobe) + Number(messen) > 1) throw new Error('Nur einen Prüfmodus angeben');
  const alle = args.includes('--alle');
  if (alle && !neu && !messen) throw new Error('--alle ist nur zusammen mit --neu oder --messen erlaubt');
  // --teil n/m: nur jede m-te Stadt ab n (CI teilt die 220 Städte auf zwei Jobs)
  const teilArg = args.find((a) => a.startsWith('--teil='));
  const teil = teilArg ? teilArg.slice(7).split('/').map(Number) : null;
  args = args.filter((a) => !a.startsWith('--teil='));
  const unbekannteOptionen = args.filter((a) => a.startsWith('--') && !['--neu', '--pruefen', '--alle', '--gegenprobe', '--messen'].includes(a));
  if (unbekannteOptionen.length) throw new Error('Unbekannte Option: ' + unbekannteOptionen.join(', '));
  const ids = args.filter((a) => !a.startsWith('--')).map((a) => {
    const id = kennung(a);
    if (!staedte.has(id)) throw new Error('Unbekannte Stadt: ' + a);
    return id;
  });
  if (new Set(ids).size !== ids.length) throw new Error('Stadt doppelt angegeben');
  if (neu && !alle && !ids.length) throw new Error('--neu benötigt konkrete Stadt-IDs oder --alle');
  if (alle && ids.length) throw new Error('--alle nicht mit einzelnen Städten kombinieren');
  if (gegenprobe && ids.length !== 1) throw new Error('--gegenprobe benötigt genau eine Stadt');
  if (gegenprobe) return { neu, gegenprobe, messen, ids: [ids[0], [...staedte.keys()].find((id) => id !== ids[0])] };
  const liste = alle || !ids.length ? [...staedte.keys()] : ids;
  return { neu, gegenprobe, messen, ids: teil ? liste.filter((_, i) => i % teil[1] === teil[0] - 1) : liste };
}
function dateien(id) {
  return { json: path.join(REFERENZEN, id + '.json'), bild: path.join(BILDER, id + '.png') };
}
function unterschiede(alt, neu, schluessel, max = 4) {
  const a = new Map((alt ?? []).map((x) => [x.id, x]));
  const b = new Map((neu ?? []).map((x) => [x.id, x]));
  return [...new Set([...a.keys(), ...b.keys()])].filter((id) => JSON.stringify(a.get(id)?.[schluessel] ?? a.get(id)) !== JSON.stringify(b.get(id)?.[schluessel] ?? b.get(id))).slice(0, max);
}
function vorbereiten(daten, id, bild) {
  const ergebnis = { ...daten, stadtId: id };
  ergebnis.pruefsummen = {
    stadtplan: hash(ergebnis.stadtplan),
    geometrie: hash(ergebnis.geometrie),
    bildReferenz: hash(bild)
  };
  return ergebnis;
}
async function bilderVergleichen(seite, referenz, aktuell) {
  return seite.evaluate(async ({ referenz, aktuell, grenzen }) => {
    async function bild(base64) {
      const img = new Image();
      img.src = 'data:image/png;base64,' + base64;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      return { w: img.width, h: img.height, daten: ctx.getImageData(0, 0, img.width, img.height).data };
    }
    const a = await bild(referenz), b = await bild(aktuell);
    if (a.w !== b.w || a.h !== b.h) return { ok: false, fehler: 'Bildgröße unterschiedlich' };
    const pixel = a.w * a.h;
    let betroffen = 0, differenz = 0;
    for (let p = 0; p < a.daten.length; p += 4) {
      let max = 0;
      for (let c = 0; c < 3; c++) {
        const d = Math.abs(a.daten[p + c] - b.daten[p + c]);
        max = Math.max(max, d);
        differenz += d;
      }
      if (max > grenzen.kanal) betroffen++;
    }
    const anteilProzent = Math.round(10000 * betroffen / pixel) / 100;
    const mittelwert = Math.round(1000 * differenz / (pixel * 3)) / 1000;
    return { ok: anteilProzent <= grenzen.anteilProzent && mittelwert <= grenzen.mittelwert,
      anteilProzent, mittelwert, bildgroesse: [a.w, a.h] };
  }, { referenz: referenz.toString('base64'), aktuell, grenzen: GRENZEN });
}
async function arbeiter(ids, neu, gegenprobe = false, messen = false) {
  const { chromium } = require('playwright');
  const optionen = {
    headless: true,
    args: ['--headless=new', '--use-gl=angle', '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--js-flags=--max-old-space-size=6144']
  };
  if (process.env.CHROMIUM_PATH) optionen.executablePath = process.env.CHROMIUM_PATH;
  const browser = await chromium.launch(optionen);
  const fehler = [];
  try {
    const page = await browser.newPage({ viewport: { width: GROESSE.breite, height: GROESSE.hoehe }, deviceScaleFactor: 1 });
    page.on('pageerror', (e) => console.error('Browserfehler: ' + e.message));
    await page.goto('file://' + path.join(OUT, '.fingerabdruck.html'), { waitUntil: 'load' });
    const staedte = stadtliste();
    for (const id of ids) {
      const name = staedte.get(id), pfad = dateien(id);
      try {
        const messung = await page.evaluate(({ stadt, mutieren }) =>
          globalThis.stadtFingerabdruck(stadt, { mutiereHausbauer: mutieren }),
          { stadt: name, mutieren: gegenprobe && id === ids[0] });
        // Rein lesende Leistungsmessung: keine Referenzen schreiben oder abgleichen.
        if (messen) {
          console.log('MESSUNG;' + name + ';' + messung.leistung.drawCalls + ';' + messung.leistung.dreiecke);
          if (process.env.FINGERABDRUCK_DIAG) for (const [k, n] of messung.leistung.aufschluesselung) console.log('DIAG;' + name + ';' + n + ';' + k);
          continue;
        }
        const bild = Buffer.from(messung.bild, 'base64');
        const daten = vorbereiten(messung.daten, id, bild);
        if (neu) {
          fs.mkdirSync(BILDER, { recursive: true });
          fs.writeFileSync(pfad.json, jsonZeilen(daten));
          fs.writeFileSync(pfad.bild, bild);
          console.log('NEU ' + name + ' (' + id + '): Plan ' + daten.stadtplan.liste.length
            + ' Kacheln, Geometrie ' + daten.geometrie.gesamt.teile + ' Teile, ' + messung.leistung.dreiecke + ' Render-Dreiecke, ' + messung.leistung.drawCalls + ' Draw Calls, ' + messung.dauerMs + ' ms');
          continue;
        }
        if (!fs.existsSync(pfad.json) || !fs.existsSync(pfad.bild)) {
          throw new Error('Referenz fehlt (JSON oder PNG). Nur mit --neu ' + id + ' neu erzeugen');
        }
        const alt = JSON.parse(fs.readFileSync(pfad.json, 'utf8'));
        const altBild = fs.readFileSync(pfad.bild);
        const abweichungen = [];
        if (alt.schema !== daten.schema || alt.seed !== daten.seed || alt.stadt !== name
          || JSON.stringify(alt.profil) !== JSON.stringify(daten.profil)) abweichungen.push('Profil/Seed');
        if (alt.pruefsummen?.stadtplan !== daten.pruefsummen.stadtplan) {
          abweichungen.push('Stadtplan (' + unterschiede(alt.stadtplan?.liste, daten.stadtplan.liste, 'pruefsumme').join(', ') + ')');
        }
        if (alt.pruefsummen?.geometrie !== daten.pruefsummen.geometrie) {
          abweichungen.push('Geometrie (' + unterschiede(alt.geometrie?.kacheln, daten.geometrie.kacheln).join(', ') + ')');
        }
        if (alt.pruefsummen?.bildReferenz !== hash(altBild)) abweichungen.push('Bildreferenz beschädigt');
        const pixel = await bilderVergleichen(page, altBild, messung.bild);
        if (!pixel.ok) abweichungen.push('Bild (' + (pixel.fehler ?? pixel.anteilProzent + '% Pixel, Δ=' + pixel.mittelwert) + ')');
        if (gegenprobe && id === ids[0]) {
          if (abweichungen.some((a) => a.startsWith('Geometrie ('))
              && !abweichungen.some((a) => a.startsWith('Stadtplan ('))) {
            console.log('ERWARTET ROT ' + name + ': ausschließlich der Hausbauer verändert die Geometrie');
          } else {
            fehler.push(name + ': Gegenprobe nicht aussagekräftig: ' + abweichungen.join('; '));
            console.error('FEHLER Gegenprobe ' + name + ': ' + abweichungen.join('; '));
          }
        } else if (abweichungen.length) {
          fehler.push(name + ': ' + abweichungen.join('; '));
          console.error('FEHLER ' + name + ': ' + abweichungen.join('; ') + ' | ' + messung.leistung.drawCalls + ' Draw Calls, ' + messung.leistung.dreiecke + ' Render-Dreiecke');
        } else {
          console.log('OK ' + name + ': Plan, Geometrie, Bild; ' + messung.dauerMs + ' ms; ' + messung.leistung.drawCalls + ' Draw Calls, ' + messung.leistung.dreiecke + ' Render-Dreiecke; Bild ' + pixel.anteilProzent + '% / Δ=' + pixel.mittelwert);
        }
      } catch (e) {
        fehler.push(name + ': ' + e.message);
        console.error('FEHLER ' + name + ': ' + e.message);
      }
    }
    await page.close();
  } finally { await browser.close(); }
  if (fehler.length) process.exitCode = 1;
}
function gruppeStarten(ids, neu, gegenprobe = false, messen = false) {
  return new Promise((resolve) => {
    const kind = spawn(process.execPath, [__filename, '--intern', neu ? '--neu' : gegenprobe ? '--gegenprobe' : messen ? '--messen' : '--pruefen', ...ids], { cwd: ROOT, env: process.env });
    let aus = '', err = '', abgebrochen = false;
    const timeout = setTimeout(() => { abgebrochen = true; kind.kill('SIGKILL'); }, Math.max(160000, ZEITLIMIT_MS / 4)); // Gruppen-Zeitlimit wächst mit dem Gesamtlimit (langsame CI)
    kind.stdout.on('data', (d) => { aus += d; });
    kind.stderr.on('data', (d) => { err += d; });
    kind.on('error', (e) => { err += e.message; });
    kind.on('close', (code) => {
      clearTimeout(timeout);
      process.stdout.write(aus);
      process.stderr.write(err);
      resolve({ ids, ok: code === 0 && !abgebrochen, grund: abgebrochen ? 'Zeitüberschreitung' : 'Exit-Code ' + code });
    });
  });
}
async function hauptlauf(args) {
  if (args[0] === '--intern') {
    const neu = args[1] === '--neu';
    await arbeiter(args.slice(2), neu, args[1] === '--gegenprobe', args[1] === '--messen');
    return;
  }
  const staedte = stadtliste(), { neu, gegenprobe, messen, ids } = auswahl(args, staedte);
  fs.mkdirSync(OUT, { recursive: true });
  // Bundle nur einmal für sämtliche Gruppen erstellen. Es enthält exakt den Quellcode des Branches.
  const esbuild = require('esbuild');
  esbuild.buildSync({ entryPoints: [path.join(ROOT, 'src/fingerabdruck-inhalt.js')],
    bundle: true, format: 'iife', platform: 'browser', target: 'es2020',
    outfile: path.join(OUT, '.fingerabdruck.js'), loader: { '.json': 'json' }, logLevel: 'error' });
  fs.writeFileSync(path.join(OUT, '.fingerabdruck.html'),
    '<!doctype html><html lang="de"><meta charset="utf-8"><body style="margin:0"><script src=".fingerabdruck.js"></script></body></html>');
  console.log((neu ? 'Referenzen erneuern: ' : gegenprobe ? 'Gegenprobe Hausbauer: ' : messen ? 'Leistung messen (ohne Referenzänderung): ' : 'Fingerabdrücke prüfen: ') + ids.length + ' Städte; Bild '
    + GROESSE.breite + '×' + GROESSE.hoehe + '; max. ' + PARALLEL + ' Gruppen parallel');
  const beginn = Date.now();
  const gruppen = [];
  for (let i = 0; i < ids.length; i += GRUPPEN_GROESSE) gruppen.push(ids.slice(i, i + GRUPPEN_GROESSE));
  const ergebnisse = [];
  let position = 0;
  async function schleife() {
    while (position < gruppen.length) {
      const gruppe = gruppen[position++];
      ergebnisse.push(await gruppeStarten(gruppe, neu, gegenprobe, messen));
    }
  }
  await Promise.all(Array.from({ length: Math.min(PARALLEL, gruppen.length) }, schleife));
  const dauer = Date.now() - beginn;
  const defekt = ergebnisse.filter((g) => !g.ok);
  if (defekt.length) for (const g of defekt) console.error('FEHLER Gruppe ' + g.ids.join(', ') + ': ' + g.grund);
  console.log('Q03: ' + (defekt.length ? 'FEHLER' : 'OK') + ' – ' + ids.length + ' Städte, ' + dauer + ' ms, fehlerhafte Gruppen: ' + defekt.length);
  if (!neu && ids.length === staedte.size && dauer >= ZEITLIMIT_MS) {
    console.error('FEHLER Laufzeit über 5 Minuten (' + dauer + ' ms)');
    process.exitCode = 1;
  }
  if (defekt.length) process.exitCode = 1;
}

if (require.main === module) {
  hauptlauf(process.argv.slice(2)).catch((e) => {
    console.error('FEHLER Fingerabdruck: ' + (e.stack ?? e.message));
    process.exitCode = 1;
  });
}
module.exports = { kennung, hash, stadtliste, auswahl, unterschiede, vorbereiten, GROESSE, GRENZEN };
