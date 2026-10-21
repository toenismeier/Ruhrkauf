// Selbst gezeichnete Szenariokarten: keine externen Bildressourcen, keine Zufallszahlen.
const BILDER = {
  standard: ['#477d8c', '#f5ca85', 'M0 80L30 56L58 74L96 43L126 65L165 31L220 65V110H0Z'],
  schutzschirm: ['#355d78', '#add1cf', 'M0 89L35 58L77 87L120 34L166 72L220 47V110H0Z'],
  lockdown: ['#5d667c', '#bdc3d2', 'M0 76L42 54L77 68L112 40L157 68L220 46V110H0Z'],
  fusion: ['#567e68', '#eec887', 'M0 88L33 44L79 70L110 36L155 68L220 48V110H0Z'],
  investor: ['#7c6655', '#e4bf88', 'M0 90L26 63L76 78L116 34L149 66L220 42V110H0Z'],
  aufbruch: ['#3a8290', '#ffdb9d', 'M0 78L46 51L94 65L133 27L176 62L220 38V110H0Z'],
  sandkasten: ['#7399a3', '#fbdda5', 'M0 82L38 56L82 71L119 41L158 64L220 50V110H0Z'],
};
export function szenarioBild(id) {
  const [himmel, licht, berge] = BILDER[id] ?? BILDER.standard;
  const fenster = Array.from({length: 9}, (_, i) => '<rect x="' + (19 + (i % 3) * 12) + '" y="' + (76 + Math.floor(i / 3) * 12) + '" width="5" height="7" fill="#d7e7dc"/>').join('');
  const sonder = id === 'lockdown' ? '<path d="M70 107L70 70L151 70V107M70 80H151" stroke="#e7aba3" stroke-width="5"/>' :
    id === 'schutzschirm' ? '<path d="M177 22L196 30V49L177 62L158 49V30Z" fill="#e5e8e0" stroke="#516e83" stroke-width="3"/>' :
    id === 'aufbruch' ? '<path d="M166 46L183 27L200 39M183 27V66" stroke="#f6f0cc" stroke-width="6" fill="none"/>' :
    id === 'fusion' ? '<rect x="124" y="59" width="42" height="51" fill="#c8b7a3"/><rect x="133" y="65" width="24" height="7" fill="#ebc46b"/>' :
    id === 'investor' ? '<path d="M165 57L165 15M153 28L165 15L177 28" stroke="#ffe2aa" stroke-width="5" fill="none"/>' :
    id === 'sandkasten' ? '<circle cx="184" cy="25" r="13" fill="#fff1b7"/>' : '';
  return '<svg viewBox="0 0 220 110" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Illustration einer fiktiven Innenstadt"><rect width="220" height="110" fill="' + himmel + '"/><circle cx="175" cy="29" r="21" fill="' + licht + '"/><path d="' + berge + '" fill="#537b80"/><rect x="10" y="65" width="60" height="45" fill="#e9dcc3"/><rect x="18" y="57" width="48" height="8" fill="#a94f43"/>' + fenster + '<rect x="95" y="48" width="45" height="62" fill="#d9d1bc"/><path d="M91 48L118 30L144 48" fill="#895e50"/><rect x="109" y="70" width="14" height="40" fill="#426477"/><rect x="152" y="73" width="60" height="37" fill="#c9d7cf"/><path d="M148 73H216" stroke="#a9524a" stroke-width="8"/><path d="M0 109H220" stroke="#555d62" stroke-width="4"/>' + sonder + '</svg>';
}
