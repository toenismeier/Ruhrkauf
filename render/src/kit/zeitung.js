// Kleine redaktionelle Iso-Illustrationen, komplett aus dem eigenen Grafik-Kit.
// SVG statt Screenshots: deterministisch, ressourcenschonend und ohne fremde Bildrechte.
const FARBE = {
  haus: { fassade: '#d6c3a4', dach: '#796552', seite: '#a99272', akzent: '#b43e32' },
  konkurrenz: { fassade: '#bfced8', dach: '#344f66', seite: '#7897ab', akzent: '#b87837' },
  markt: { fassade: '#d1d7cf', dach: '#506556', seite: '#92a294', akzent: '#6b7f56' },
  politik: { fassade: '#dbcdbd', dach: '#54515b', seite: '#a6a0a5', akzent: '#8a3740' },
};
export function zeitungsBild(bild = 'haus', nummer = 0) {
  const c = FARBE[bild] || FARBE.haus;
  const fenster = [];
  for (let stock = 0; stock < 4; stock++) for (let n = 0; n < 5; n++) {
    const x = 90 + n * 35, y = 103 + stock * 24;
    fenster.push('<path d="M' + x + ' ' + y + 'v-13l20-6v13z" fill="' + (stock % 2 ? '#6b8791' : '#abc1c4') + '" stroke="#556b71" stroke-width="1.5"/>');
  }
  const muster = nummer % 2 ? '<path d="M75 209h215l53-43" stroke="#756f64" stroke-width="4" fill="none"/>' : '';
  return '<svg class="zb-isobild" viewBox="0 0 420 260" role="img" aria-label="Isometrische Zeichnung eines Warenhauses">' +
    '<rect width="420" height="260" fill="#e1e5df"/><path d="M10 222 260 135 412 180 173 260Z" fill="#cbc8bf"/>' +
    '<path d="M72 78 260 22 340 60 153 119Z" fill="' + c.dach + '"/>' +
    '<path d="M72 78 153 119 153 229 72 185Z" fill="' + c.seite + '"/>' +
    '<path d="M153 119 340 60 340 171 153 229Z" fill="' + c.fassade + '"/>' +
    '<path d="M151 188 342 130v18l-191 58Z" fill="' + c.akzent + '"/>' +
    '<path d="M151 208 342 150v5l-191 58Z" fill="#eee8db"/>' +
    fenster.join('') + '<path d="M194 210v-34l52-16v34" fill="#597784" stroke="#485e63" stroke-width="3"/>' +
    '<path d="M98 147v22l24 13v-22z" fill="#55717c"/>' + muster +
    '<path d="M50 204 215 254M260 238l108-36" stroke="#f3eee3" stroke-width="2"/>' +
    '</svg>';
}
