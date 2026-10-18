// Katalog Porträts: 48 Zufallspersonen aus zufallsMerkmale(seed) plus Merkmalsreihen (Haar, Kleidung, Hautton, Brille, Alter).
import { portraetSVG, zufallsMerkmale, MERKMAL_WERTE } from '../kit/portraet.js';

const KW = 200, KH = 236, SP = 8;
const eintraege = [];
for (let i = 1; i <= 48; i++) { const m = zufallsMerkmale(i); eintraege.push({ m, titel: `Seed ${i}`, unter: `${m.geschlecht} · ${m.alter} J. · ${m.haar} · ${m.kleidung}` }); }
const basis = { geschlecht: 'w', haarfarbe: 'dunkelbraun', brille: 'keine', kleidungFarbe: 'marine', hautton: 'mittel', alter: 40, kleidung: 'blazer' };
for (const haar of MERKMAL_WERTE.haar) eintraege.push({ m: { ...basis, geschlecht: ['glatze', 'halbglatze', 'seitenscheitel', 'kurz'].includes(haar) ? 'm' : 'w', haar }, titel: `Haar ${haar}` });
const farben = ['marine', 'anthrazit', 'bordeaux', 'petrol', 'camel', 'hellblau', 'rosa', 'senf'];
MERKMAL_WERTE.kleidung.forEach((k, i) => eintraege.push({ m: { ...basis, geschlecht: ['anzug', 'hemd'].includes(k) ? 'm' : 'w', haar: ['anzug', 'hemd'].includes(k) ? 'seitenscheitel' : 'bob', kleidung: k, kleidungFarbe: farben[i] }, titel: `Kleidung ${k}`, unter: farben[i] }));
MERKMAL_WERTE.hautton.forEach((h, i) => eintraege.push({ m: { ...basis, geschlecht: i % 2 ? 'm' : 'w', haar: i % 2 ? 'kurz' : 'lang', haarfarbe: i > 2 ? 'schwarz' : 'braun', hautton: i, kleidung: i % 2 ? 'hemd' : 'bluse', kleidungFarbe: 'weiß' }, titel: `Hautton ${i} ${h}` }));
for (const b of MERKMAL_WERTE.brille) eintraege.push({ m: { ...basis, geschlecht: 'm', haar: 'kurz', brille: b, kleidung: 'anzug' }, titel: `Brille ${b}` });
for (const [alter, hf] of [[28, 'blond'], [45, 'braun'], [55, 'braun'], [62, 'grau'], [68, 'weiß']]) eintraege.push({ m: { ...basis, geschlecht: 'm', haar: 'seitenscheitel', haarfarbe: hf, alter, kleidung: 'anzug', kleidungFarbe: 'anthrazit' }, titel: `Alter ${alter}`, unter: hf });
for (const bart of ['drei', 'voll', 'schnauz']) eintraege.push({ m: { ...basis, geschlecht: 'm', haar: 'kurz', haarfarbe: 'braun', bart, kleidung: 'pullover', kleidungFarbe: 'olive' }, titel: `Bart ${bart}` });

const spalten = 8, kopf = 70;
const blatt = document.createElement('canvas');
blatt.width = spalten * KW; blatt.height = kopf + Math.ceil(eintraege.length / spalten) * KH;
const g = blatt.getContext('2d');
g.fillStyle = '#1d262e'; g.fillRect(0, 0, blatt.width, blatt.height);
g.fillStyle = '#fff'; g.font = 'bold 34px "DejaVu Sans", Arial'; g.fillText('Porträts: Vorstand und Kandidaten (fiktiv)', 20, 48);
window.fehler = [];
const lade = (svg) => new Promise((ok, f) => { const im = new Image(); im.onload = () => ok(im); im.onerror = f; im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
(async () => {
  for (let i = 0; i < eintraege.length; i++) {
    const e = eintraege[i], x = (i % spalten) * KW, y = kopf + Math.floor(i / spalten) * KH;
    g.fillStyle = '#223744'; g.fillRect(x + SP / 2, y + SP / 2, KW - SP, KH - SP);
    try { const im = await lade(portraetSVG(e.m, 180)); g.drawImage(im, x + 10, y + 6, 180, 180); } catch (err) { window.fehler.push(e.titel + ': ' + err); }
    g.fillStyle = '#fff'; g.font = 'bold 15px "DejaVu Sans", Arial'; g.fillText(e.titel, x + 10, y + 204, KW - 20);
    if (e.unter) { g.fillStyle = '#8fa1ae'; g.font = '12px "DejaVu Sans", Arial'; g.fillText(e.unter, x + 10, y + 222, KW - 20); }
  }
  window.bild = blatt.toDataURL('image/png'); window.fertig = true;
})();
