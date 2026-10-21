// N02: selbst gezeichnete, deterministische SVG-Endszenen. Keine Fremdbilder.
import { esc } from '../ui/format.js';

const fenster = (x, y, hell, art) =>
  '<rect x="' + x + '" y="' + y + '" width="19" height="28" rx="2" fill="' + hell + '"/>' +
  (art === 'zerschlagen' ? '<path d="M'+x+' '+(y+15)+'h19" stroke="#868b8a" stroke-width="3"/>' : '');
function gebaeude(x, breite, hoehe, art, i) {
  const grau = art === 'zerschlagen';
  const farben = grau ? ['#777e85', '#8b9091', '#697078'] : ['#d1b6a0', '#a8b9bf', '#e2bf9e', '#b1aa95'];
  const y = 323 - hoehe, f = farben[i % farben.length];
  let out = '<rect x="'+x+'" y="'+y+'" width="'+breite+'" height="'+hoehe+'" fill="'+f+'"/>' +
    '<path d="M'+(x-3)+' '+y+'h'+(breite+6)+'" stroke="'+(grau ? '#4c535a' : '#61564a')+'" stroke-width="8"/>';
  const cols = Math.floor((breite - 18) / 32);
  for (let row=0; row < Math.floor((hoehe-65)/43); row++) for(let col=0; col<cols; col++)
    out += fenster(x+13+col*32, y+15+row*43, grau?'#434b51':((row+col+i)%3===0?'#ffde91':'#607f88'),art);
  out += '<rect x="'+(x+5)+'" y="275" width="'+(breite-10)+'" height="40" fill="'+(grau?'#525b61':'#365e54')+'"/>';
  if(grau) out += '<path d="M'+(x+8)+' 281h'+(breite-16)+'m-'+(breite-16)+' 10h'+(breite-16)+'m-'+(breite-16)+' 10h'+(breite-16)+'" stroke="#a3a5a5" stroke-width="3"/>';
  else out += '<rect x="'+(x+12)+'" y="283" width="'+(breite-24)+'" height="27" fill="#e4c6a0"/>';
  return out;
}
function person(x, y, farbe) {
  return '<circle cx="'+x+'" cy="'+(y-17)+'" r="5" fill="#d8ac88"/><path d="M'+x+' '+(y-12)+'v19m-9-10h18m-12 10-5 12m11-12 6 12" stroke="'+farbe+'" stroke-width="6" fill="none" stroke-linecap="round"/>';
}
export function spielendeSzene(art, kaeufer = '') {
  const grau = art === 'zerschlagen';
  const winter = art === 'saniert';
  const bg = grau ? '#a6adb0' : winter ? '#19324a' : art === 'investor' ? '#567585' : '#daae7b';
  const himmel = '<rect width="680" height="400" fill="'+bg+'"/>' +
    (winter ? '<circle cx="572" cy="52" r="22" fill="#ffebb6"/>' : '<circle cx="558" cy="70" r="36" fill="'+(grau?'#c0c5c5':'#f0dbab')+'"/>');
  let stadt = '';
  [[0,135,185],[139,118,240],[259,151,205],[414,140,270],[557,123,210]].forEach(([x,b,h],i)=> {stadt+=gebaeude(x,b,h,art,i)});
  let zusatz = '<rect y="323" width="680" height="77" fill="'+(winter?'#d8e5e8':grau?'#898f91':'#d5c3aa')+'"/>';
  if(winter) {
    for(let x=15; x<680; x+=34) zusatz += '<path d="M'+x+' 37q17 12 34 0" stroke="#d6b772" stroke-width="2" fill="none"/>' +
      '<circle cx="'+(x+17)+'" cy="43" r="5" fill="'+(x%3===0?'#ec8a59':'#ffec90')+'"/>';
    for(let i=0;i<29;i++) zusatz+='<circle cx="'+((i*107)%680)+'" cy="'+((i*59)%315)+'" r="'+(i%3+2)+'" fill="#fff" opacity=".85"/>';
    for(let i=0;i<17;i++) zusatz+=person(22+i*38,350+(i%3)*7,['#8d3c34','#2a5e77','#80643d'][i%3]);
  } else if(grau) {
    for(let i=0;i<6;i++) zusatz+='<path d="M'+(22+i*116)+' 348l68 0" stroke="#696d70" stroke-width="4" stroke-dasharray="8 9"/>';
    zusatz += '<rect x="211" y="288" width="255" height="41" fill="#e7d2a1" stroke="#5c5c58" stroke-width="3"/>' +
      '<text x="338" y="315" text-anchor="middle" font-size="21" font-weight="900" fill="#5b2b2a">RÄUMUNGSVERKAUF</text>';
  } else if(art==='investor') {
    zusatz += '<g transform="translate(225 240)"><path d="M0 87q58-32 103-5l27 20-10 21H3Z" fill="#2a3f58"/>' +
      '<path d="M245 87q-58-32-103-5l-27 20 10 21h117Z" fill="#353f49"/>' +
      '<path d="M98 78l39 6 18-6 30 15-27 11-34-7-20 5-25-17Z" fill="#e8b78f" stroke="#9e704c" stroke-width="3"/>' +
      '<circle cx="132" cy="48" r="19" fill="#e9bc63" stroke="#8b6c2e" stroke-width="5"/>' +
      '<path d="M132 66v23m0-10h17m-9 0v11" stroke="#8b6c2e" stroke-width="6" stroke-linecap="round"/></g>' +
      '<rect x="104" y="24" width="472" height="52" rx="8" fill="#153a4b" opacity=".94"/>' +
      '<text x="340" y="57" font-size="22" text-anchor="middle" fill="white" font-weight="700">'+esc(kaeufer || 'Neuer Eigentümer')+'</text>';
  } else {
    zusatz += '<g transform="translate(286 226)"><rect x="0" y="0" width="116" height="108" rx="5" fill="#705744"/>' +
      '<rect x="12" y="9" width="92" height="80" fill="#e8dbbe"/><path d="M22 70l24-32 19 14 32-33" fill="none" stroke="#2f8058" stroke-width="7"/>' +
      '<text x="58" y="103" text-anchor="middle" fill="#fff" font-size="12">5 JAHRE</text></g>';
  }
  return '<svg class="se-illustration" viewBox="0 0 680 400" role="img" aria-label="'+
    (grau?'Verlassene Warenhäuser':winter?'Weihnachtlich beleuchtete, belebte Innenstadt':art==='investor'?'Schlüsselübergabe an den Käufer':'Fünf Jahre Unternehmensführung')+
    '" xmlns="http://www.w3.org/2000/svg">'+himmel+stadt+zusatz+'</svg>';
}
