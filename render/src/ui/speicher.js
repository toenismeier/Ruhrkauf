// Lokaler Spielstand. IndexedDB statt localStorage, da Bestandskohorten und Historie gross werden koennen.
// Keine Netzwerkuebertragung. Format und GameState-Version vor dem Laden pruefen.
const NAME = 'hartwig-spielstand';
const STORE = 'staende';
const KEY = 'autosave';
export const FORMAT = 2;
let queue = Promise.resolve();

function oeffneDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('IndexedDB ist auf diesem Geraet nicht verfuegbar.')); return; }
    const r = indexedDB.open(NAME, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onerror = () => reject(r.error ?? new Error('Datenbank konnte nicht geoeffnet werden.'));
    r.onsuccess = () => {
      const db = r.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
  });
}

async function aktion(modus, ausfuehren) {
  const db = await oeffneDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, modus);
    let wert;
    tx.oncomplete = () => { db.close(); resolve(wert); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error('Speicherfehler.')); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error('Speichervorgang abgebrochen.')); };
    try {
      const req = ausfuehren(tx.objectStore(STORE));
      if (req) req.onsuccess = () => { wert = req.result; };
    } catch (e) {
      tx.abort();
    }
  });
}

function pruefen(datensatz) {
  if (!datensatz) return null;
  if (datensatz.format !== FORMAT || datensatz.spiel?.version !== 2) {
    throw new Error('Dieser Spielstand hat ein altes, nicht mehr unterstütztes Format (Maßstab-Version 2 erforderlich). Der alte Stand wurde nicht verändert. Bitte ein neues Spiel starten oder den Stand löschen.');
  }
  const s = datensatz.spiel;
  if (!Number.isInteger(s.woche) || s.woche < 0 ||
      !Array.isArray(s.haeuser) || !Array.isArray(s.historie) ||
      !s.hq || !s.einkauf || !s.eigenmarken || !s.vorstand || !s.produkte || !s.marketing?.stand) {
    throw new Error('Der gespeicherte Spielstand ist unvollstaendig. Er wurde nicht geaendert.');
  }
  return datensatz;
}

export async function laden() {
  // Laufende Schreibvorgaenge abschliessen, bevor der neueste Stand gelesen wird.
  await queue;
  return pruefen(await aktion('readonly', (store) => store.get(KEY)));
}

export function speichern(spiel, stadt, ui = {}) {
  if (!spiel || spiel.version !== 2) return Promise.reject(new Error('Kein gueltiges Spiel gestartet.'));
  // Wichtig: Zustand jetzt einfrieren. Eine laufende Simulation darf die wartende Transaktion nicht veraendern.
  const datensatz = { format: FORMAT, datum: new Date().toISOString(), stadt, spiel: structuredClone(spiel), ui: structuredClone(ui) };
  const naechste = queue.then(() => aktion('readwrite', (store) => store.put(datensatz, KEY)));
  queue = naechste.catch(() => {}); // Nach einem Fehler weitere Speicherungen weiterhin erlauben.
  return naechste;
}

export async function loeschen() {
  await queue;
  return aktion('readwrite', (store) => store.delete(KEY));
}

 
// Wiederverwendbare, benannte Filter gehören zum Gerät, nicht zum Engine-Spielstand.
const AUSWAHL_KEY = 'portfolio-filter';
export async function auswahlFilterLaden() {
  const daten = await aktion('readonly', (store) => store.get(AUSWAHL_KEY));
  return Array.isArray(daten) ? daten : [];
}
export async function auswahlFilterSpeichern(name, filter) {
  const titel = String(name ?? '').trim().slice(0, 60);
  if (!titel) throw new Error('Bitte einen Namen für die Auswahl eingeben.');
  await queue;
  const alt = await auswahlFilterLaden();
  const neu = [...alt.filter((eintrag) => eintrag.name !== titel), { name: titel, filter: structuredClone(filter) }].slice(-25);
  const naechste = aktion('readwrite', (store) => store.put(neu, AUSWAHL_KEY));
  queue = naechste.catch(() => {});
  await naechste;
  return neu;
}
