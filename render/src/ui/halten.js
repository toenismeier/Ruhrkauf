// E54: Zähler (Stepper) mit Gedrückthalten. Nach 400 ms zählt der Knopf selbst weiter, erst langsam, dann schneller.
// Die Panels zeichnen sich bei jedem Klick neu; der Knopf wird deshalb über seine Lage (n-ter Stepper, erster/letzter Knopf)
// jedes Mal neu gesucht. Der Klick beim Loslassen wird geschluckt, wenn schon wiederholt wurde.
export function haltenAn(wurzel = document) {
  let timer = 0, n = 0, wiederholt = false, ziel = null;
  const stopp = () => { clearTimeout(timer); timer = 0; ziel = null; };
  const knopf = () => {
    if (!ziel) return null;
    const st = document.querySelectorAll('.hw-stepper')[ziel.index];
    const b = st?.querySelectorAll(':scope > button')[ziel.seite];
    return b && !b.disabled ? b : null;
  };
  const schritt = () => {
    const b = knopf(); if (!b) return stopp();
    wiederholt = true; n++;
    b.click();
    timer = setTimeout(schritt, n < 6 ? 180 : n < 20 ? 90 : 45);
  };
  wurzel.addEventListener('pointerdown', (ev) => {
    const b = ev.target.closest?.('.hw-stepper > button');
    if (!b || b.disabled) return;
    const st = b.parentElement, alle = [...document.querySelectorAll('.hw-stepper')];
    ziel = { index: alle.indexOf(st), seite: [...st.querySelectorAll(':scope > button')].indexOf(b) };
    n = 0; wiederholt = false;
    clearTimeout(timer); timer = setTimeout(schritt, 400);
  }, true);
  for (const t of ['pointerup', 'pointercancel']) wurzel.addEventListener(t, () => { if (timer || ziel) stopp(); }, true);
  wurzel.addEventListener('click', (ev) => {
    if (!wiederholt || !ev.isTrusted) return;
    if (ev.target.closest?.('.hw-stepper > button')) { ev.stopPropagation(); ev.preventDefault(); }
    wiederholt = false;
  }, true);
}
