// Zahlenformate der Oberfläche (gemeinsam für Cockpit, HQ, Einkauf, Eigenmarken).
import { einstellung } from './einstellungen.js';
export const fmt = new Intl.NumberFormat('de-DE');
export function geld(x) {
  const a = Math.abs(x), v = x < 0 ? '−' : '';
  if (einstellung('zahlen') === 'voll') return `${v}${fmt.format(Math.round(a))} €`;
  if (a >= 1e9) return `${v}${(a / 1e9).toLocaleString('de-DE', { maximumFractionDigits: 2 })} Mrd. €`;
  if (a >= 1e6) return `${v}${(a / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Mio. €`;
  if (a >= 1e4) return `${v}${fmt.format(Math.round(a / 1e3))} Tsd. €`;
  return `${v}${fmt.format(Math.round(a))} €`;
}
export const pz = (x, n = 0) => `${(x * 100).toLocaleString('de-DE', { minimumFractionDigits: n, maximumFractionDigits: n })} %`;
export const dez = (x, n = 1) => (x ?? 0).toLocaleString('de-DE', { minimumFractionDigits: n, maximumFractionDigits: n });
export const kwVon = (w) => (((w % 52) + 52) % 52) + 1;
export const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/** Q31: Interne Cluster-IDs (hc-ost-2, premium-flagships) nie anzeigen; Name aus der Organisation, sonst lesbarer Ersatz. */
const REGION_NAME = { nord: 'Nord', ost: 'Ost', sued: 'Süd', 'süd': 'Süd', west: 'West', mitte: 'Mitte' };
export function clusterName(s, id) {
  if (id == null || id === '') return 'ohne Cluster';
  const c = s?.organisation?.hauscluster?.find((x) => x.id === id);
  if (c?.name) return c.name;
  const m = /^hc-([a-zäöü]+)-(\d+)$/i.exec(String(id));
  if (m) return `Cluster ${REGION_NAME[m[1].toLowerCase()] ?? m[1]} ${m[2]}`;
  return REGION_NAME[String(id).toLowerCase()] ?? String(id);
}
