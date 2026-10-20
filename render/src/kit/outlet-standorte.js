// Ordnet FUNDUS-Randlagen echten Gewerbeblöcken des Außenrings zu.
// Der Stadtplan selbst reserviert dafür bewusst keine innerstädtische Fachmarkt-Parzelle.
export function outletImAussenring(plan, standorte = []) {
  const gesucht = standorte.filter((s) => s.rolle === 'outlet' && s.lage === 'rand');
  if (!gesucht.length) return [];
  const platziert = [];
  const benutzt = new Set();
  for (const st of gesucht) {
    const bl = (plan.aussen?.bloecke ?? []).filter((b) =>
      !benutzt.has(b.id) && ['gewerbe', 'sonder', 'dicht', 'siedlung'].includes(b.zone) &&
      b.w >= st.w + 6 && b.d >= st.d + 6 &&
      Object.values(b.rand ?? {}).some((r) => r.strasse)
    );
    // Erst vorhandene Gewerbe-/Fachmarktstandorte, dann größere Randparzellen.
    bl.sort((a, b) =>
      (a.zone === 'gewerbe' ? 0 : a.zone === 'sonder' ? 1 : 2) -
      (b.zone === 'gewerbe' ? 0 : b.zone === 'sonder' ? 1 : 2) ||
      (a.w * a.d - st.w * st.d) - (b.w * b.d - st.w * st.d) ||
      a.id.localeCompare(b.id)
    );
    const b = bl[0];
    if (!b) continue;
    benutzt.add(b.id);
    // Bestehende Vorortbelegung ablösen: eine einzige eigenständige Gewerbeparzelle.
    b.zone = 'gewerbe';
    b.bauten = []; b.flaechen = []; b.hecken = []; b.baeume = [];
    const p = {
      id: 'aussen-' + st.id, typ: 'slot:outlet',
      x: b.x + (b.w - st.w) / 2, z: b.z + (b.d - st.d) / 2,
      w: st.w, d: st.d, seed: plan.seed + st.id.length * 103,
      region: plan.region, cluster: plan.typ, ecke: 'block',
      lage: 'rand', standort: st, front: ['+z', '+x'], block: b.id,
    };
    plan.aussen.bauten.push(p);
    plan.standorte.push({ ...st, parzelle: p.id, typ: p.typ, block: b.id, lage: 'rand' });
    platziert.push(p.id);
  }
  plan.aussen.outletStandorte = platziert;
  return platziert;
}
