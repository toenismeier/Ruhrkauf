// N11: Vier voneinander getrennte Spielstände in IndexedDB, ohne Server und ohne Cache.
// Bestehende Autosaves aus Datenbankversion 1 bleiben lesbar.
const NAME = 'hartwig-spielstand';
const STORE = 'staende';
const INFOS = 'informationen';
export const FORMAT = 2;
export const PLAETZE = ['autosave', 'platz-1', 'platz-2', 'platz-3'];
const MAX_DATEI = 40 * 1024 * 1024;
const MAX_INHALT = 160 * 1024 * 1024;
let queue = Promise.resolve();

function platzPruefen(platz) {
  if (!PLAETZE.includes(platz)) throw new Error('Unbekannter Speicherplatz.');
  return platz;
}

function fehlerText(e) {
  if (e?.name === 'QuotaExceededError' || e?.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    return new Error('Der Gerätespeicher ist voll. Bitte Spielstände exportieren und Speicherplatz freigeben.');
  return e instanceof Error ? e : new Error('Der Spielstand konnte nicht verarbeitet werden.');
}

function oeffneDb() {
  return new Promise((resolve, reject) => {
    try {
      if (typeof indexedDB === 'undefined') throw new Error('IndexedDB ist auf diesem Gerät nicht verfügbar.');
      const r = indexedDB.open(NAME, 2);
      r.onupgradeneeded = () => {
        if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE);
        if (!r.result.objectStoreNames.contains(INFOS)) r.result.createObjectStore(INFOS);
      };
      r.onerror = () => reject(fehlerText(r.error));
      r.onblocked = () => reject(new Error('Bitte andere geöffnete Hartwig-Fenster schließen.'));
      r.onsuccess = () => {
        const db = r.result;
        db.onversionchange = () => db.close();
        resolve(db);
      };
    } catch (e) { reject(fehlerText(e)); }
  });
}

async function transaktion(namen, modus, arbeit) {
  const db = await oeffneDb();
  return new Promise((resolve, reject) => {
    let tx, wert;
    let fertig = false;
    const ablehnen = (e) => {
      if (fertig) return;
      fertig = true; db.close(); reject(fehlerText(e));
    };
    try {
      tx = db.transaction(namen, modus);
      tx.oncomplete = () => { if (!fertig) { fertig = true; db.close(); resolve(wert); } };
      tx.onerror = () => ablehnen(tx.error);
      tx.onabort = () => ablehnen(tx.error ?? new Error('Speichervorgang abgebrochen.'));
      arbeit(tx, (v) => { wert = v; });
    } catch (e) {
      try { tx?.abort(); } catch {}
      ablehnen(e);
    }
  });
}

function pruefen(datensatz) {
  if (!datensatz) return null;
  if (datensatz.format !== FORMAT || datensatz.spiel?.version !== 2)
    throw new Error('Dieser Spielstand hat ein altes, nicht mehr unterstütztes Format (Maßstab-Version 2 erforderlich). Der alte Stand wurde nicht verändert. Bitte ein neues Spiel starten oder den Stand löschen.');
  const s = datensatz.spiel;
  if (!Number.isInteger(s.woche) || s.woche < 0 ||
      !Number.isFinite(s.cash) || !Array.isArray(s.haeuser) || !Array.isArray(s.historie) ||
      !s.hq || !s.einkauf || !s.eigenmarken || !s.vorstand || !s.produkte || !s.marketing?.stand)
    throw new Error('Der Spielstand ist unvollständig. Er wurde nicht geändert.');
  if (typeof datensatz.stadt !== 'string' || !datensatz.stadt.length)
    throw new Error('Die Startstadt im Spielstand ist ungültig.');
  return datensatz;
}

function bildPruefen(bild) {
  return typeof bild === 'string' && bild.length <= 150000 &&
    /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(bild) ? bild : null;
}

function infoVon(d, platz) {
  if (!d) return null;
  const s = d.spiel;
  const n = String(d.name ?? (platz === 'autosave' ? 'Automatisch' : 'Spielstand')).trim().slice(0, 60);
  const unbegrenzt = s.szenario?.id === 'sandkasten' || s.szenario?.regeln?.sandkasten === true;
  return {
    platz, name: n || 'Spielstand', datum: d.datum, woche: s.woche,
    szenario: unbegrenzt ? 'Sandkasten' : String(s.szenario?.name ?? s.szenario?.id ?? s.szenario ?? s.schwierigkeit ?? 'Standard').slice(0, 80),
    unbegrenzt, cash: s.cash, bild: bildPruefen(d.bild), stadt: d.stadt
  };
}

export async function laden(platz = 'autosave') {
  try {
    platzPruefen(platz);
    await queue;
    const d = await transaktion([STORE], 'readonly', (tx, set) => {
      const r = tx.objectStore(STORE).get(platz);
      r.onsuccess = () => set(r.result ?? null);
    });
    return pruefen(d);
  } catch (e) { throw fehlerText(e); }
}

export async function liste() {
  try {
    await queue;
    const infos = await transaktion([INFOS], 'readonly', (tx, set) => {
      const r = tx.objectStore(INFOS).getAll();
      r.onsuccess = () => set(r.result);
    });
    const ergebnis = Object.fromEntries(infos.filter((i) => PLAETZE.includes(i.platz)).map((i) => [i.platz, i]));
    // Lazy Migration: alte Datenbank V1 hatte nur einen Autosave ohne Metadaten.
    if (!ergebnis.autosave) {
      const alt = await laden('autosave');
      if (alt) ergebnis.autosave = infoVon(alt, 'autosave');
    }
    return PLAETZE.map((platz) => ergebnis[platz] ?? null);
  } catch (e) { throw fehlerText(e); }
}

export function speichern(spiel, stadt, ui = {}, platz = 'autosave', name = '', bild = null, importDatum = null) {
  try {
    platzPruefen(platz);
    if (!spiel || spiel.version !== 2) throw new Error('Kein gültiges Spiel gestartet.');
    // Vor dem Warten auf die Schreibwarteschlange kopieren, da die Engine weiterläuft.
    const datensatz = {
      format: FORMAT, datum: importDatum && Number.isFinite(new Date(importDatum).getTime()) ? new Date(importDatum).toISOString() : new Date().toISOString(), stadt,
      spiel: structuredClone(spiel), ui: structuredClone(ui),
      name: String(name || (platz === 'autosave' ? 'Automatisch' : 'Spielstand')).trim().slice(0, 60),
      bild: bildPruefen(bild)
    };
    pruefen(datensatz);
    const info = infoVon(datensatz, platz);
    const naechste = queue.then(() => transaktion([STORE, INFOS], 'readwrite', (tx) => {
      tx.objectStore(STORE).put(datensatz, platz);
      tx.objectStore(INFOS).put(info, platz);
    }));
    queue = naechste.catch(() => {});
    return naechste;
  } catch (e) { return Promise.reject(fehlerText(e)); }
}

export async function loeschen(platz = 'autosave') {
  try {
    platzPruefen(platz);
    const naechste = queue.then(() => transaktion([STORE, INFOS], 'readwrite', (tx) => {
      tx.objectStore(STORE).delete(platz);
      tx.objectStore(INFOS).delete(platz);
    }));
    queue = naechste.catch(() => {});
    return await naechste;
  } catch (e) { throw fehlerText(e); }
}

async function gzip(bytes) {
  if (typeof CompressionStream === 'undefined')
    throw new Error('Gzip-Export benötigt eine aktuelle Safari-Version.');
  return new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
}

async function entpacken(datei) {
  if (typeof DecompressionStream === 'undefined')
    throw new Error('Gzip-Import benötigt eine aktuelle Safari-Version.');
  const reader = datei.stream().pipeThrough(new DecompressionStream('gzip')).getReader();
  const teile = [];
  let laenge = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      laenge += value.byteLength;
      if (laenge > MAX_INHALT) throw new Error('Die entpackte Datei ist zu groß.');
      teile.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  const roh = new Uint8Array(laenge);
  let p = 0;
  for (const teil of teile) { roh.set(teil, p); p += teil.byteLength; }
  return new TextDecoder('utf-8', { fatal: true }).decode(roh);
}

export async function exportieren(platz = 'autosave') {
  try {
    const d = await laden(platz);
    if (!d) throw new Error('Der Speicherplatz ist leer.');
    const bytes = new TextEncoder().encode(JSON.stringify(d));
    const strom = await gzip(bytes);
    return new Response(strom).blob();
  } catch (e) { throw fehlerText(e); }
}

export async function importieren(datei, platz = 'platz-1') {
  try {
    platzPruefen(platz);
    if (!datei || !Number.isFinite(datei.size) || datei.size < 2 || datei.size > MAX_DATEI)
      throw new Error('Die Datei ist leer oder zu groß (maximal 40 MB).');
    const text = await entpacken(datei);
    const d = pruefen(JSON.parse(text));
    // Erst nach vollständiger Prüfung schreiben. Keine laufende Partie überschreiben.
    await speichern(d.spiel, d.stadt, d.ui ?? {}, platz, d.name ?? 'Importiert', d.bild, d.datum);
    return infoVon(d, platz);
  } catch (e) { throw fehlerText(e); }
}
