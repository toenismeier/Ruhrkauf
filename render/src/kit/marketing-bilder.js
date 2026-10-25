import { ILLUSTRATIONEN } from '../ui/illustrationen-daten.js';
/** Q16: selbst gezeichnete SVG-Motive, keine Übernahme aus Vorlagen. */
export const MARKETING_KANAL_INFO = {
  "prospekt": [
    "Der Wochenprospekt bündelt Angebote und erzeugt kurzfristige Besuche. Die Verteilung lässt sich regional verstärken.",
    "Agentur"
  ],
  "anzeigen": [
    "Anzeigen erreichen insbesondere die Leserschaft regionaler Zeitungen. Sie ergänzen den Prospekt um lokale Präsenz.",
    "Agentur"
  ],
  "plakat": [
    "Plakate sichern Sichtbarkeit in Innenstädten und an Haltestellen. Wiederholung stützt die Markenbekanntheit.",
    "Agentur"
  ],
  "radio": [
    "Radiospots bewerben Aktionen in der Region. Ihre Wirkung baut sich über mehrere Wochen auf.",
    "Agentur"
  ],
  "tv": [
    "Fernsehwerbung stärkt die Marke bundesweit. Die hohe Reichweite entfaltet ihre Wirkung zeitverzögert.",
    "Agentur"
  ],
  "online": [
    "Such- und Displayanzeigen begleiten konkrete Kaufabsichten. Das Budget beeinflusst kurzfristig die Reichweite.",
    "Inhouse"
  ],
  "social": [
    "Social-Media-Kampagnen sprechen insbesondere jüngere Gruppen an. Wiederholte Motive können an Wirkung verlieren.",
    "Inhouse"
  ],
  "schaufenster": [
    "Schaufenster zeigen Saisonware und Aktionen direkt am Standort. Die Präsentation bindet die Werbung an das Haus.",
    "Inhouse"
  ],
  "crm": [
    "Mailings und Kundenkartenkommunikation aktivieren bekannte Kundschaft. Kampagnenversand wird weiterhin im CRM gesteuert.",
    "Inhouse"
  ]
};
// P4 (E47): gibt es eine gerenderte Kanal-Illustration, wird sie statt der Strichzeichnung verwendet.
export const kanalBildSVG = function bildKanal(id) {
  const ill = ILLUSTRATIONEN['kanal-' + id];
  if (ill) return `<img class="hw-ill hw-kanalbild" src="${ill.u}" width="${ill.b}" height="${ill.h}" alt="Hartwig-Werbemotiv: ${id}" decoding="async">`;
  const gegenstand = {
    prospekt: '<rect x="36" y="24" width="112" height="108" rx="3" fill="#fff" stroke="#3b4248" stroke-width="3"/><rect x="46" y="34" width="92" height="27" fill="#b32632"/><text x="92" y="53" font-size="13" font-weight="700" text-anchor="middle" fill="#fff">HARTWIG</text><rect x="46" y="70" width="46" height="47" fill="#d8d2c7"/><path d="M98 73h38M98 83h38M98 93h34M98 103h36M98 113h26" stroke="#8a8986" stroke-width="4"/>',
    anzeigen: '<rect x="25" y="27" width="140" height="106" rx="2" fill="#fff" stroke="#555a5d" stroke-width="3"/><path d="M36 42h118" stroke="#555a5d" stroke-width="3"/><text x="95" y="38" font-size="10" font-weight="700" text-anchor="middle" fill="#333">STADTNACHRICHTEN</text><rect x="35" y="53" width="60" height="62" fill="#b32632"/><text x="65" y="79" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">HARTWIG</text><path d="M104 57h47M104 67h47M104 77h45M104 87h45M104 97h45M104 107h35M35 122h117" stroke="#858c8e" stroke-width="4"/>',
    plakat: '<rect x="48" y="15" width="94" height="108" rx="3" fill="#faf9f6" stroke="#39434b" stroke-width="4"/><rect x="58" y="25" width="74" height="71" fill="#b32632"/><text x="95" y="52" fill="#fff" font-size="14" font-weight="700" text-anchor="middle">HARTWIG</text><text x="95" y="73" fill="#fff" font-size="10" text-anchor="middle">FÜR DEINE STADT</text><path d="M64 105h62" stroke="#444" stroke-width="4"/><path d="M70 123v27M120 123v27" stroke="#39434b" stroke-width="5"/>',
    radio: '<rect x="32" y="45" width="127" height="83" rx="9" fill="#fff" stroke="#424d53" stroke-width="4"/><rect x="43" y="59" width="73" height="43" rx="3" fill="#d9dedf"/><path d="M52 87L114 59M40 45l45-26" stroke="#424d53" stroke-width="4"/><circle cx="136" cy="79" r="12" fill="#b32632"/><circle cx="136" cy="111" r="5" fill="#424d53"/><text x="80" y="120" font-size="10" font-weight="700" text-anchor="middle" fill="#424d53">HARTWIG</text>',
    tv: '<rect x="19" y="29" width="151" height="92" rx="7" fill="#3f494e"/><rect x="28" y="38" width="133" height="74" rx="3" fill="#e7e5df"/><rect x="35" y="45" width="119" height="57" fill="#b32632"/><text x="94" y="76" font-size="18" font-weight="800" text-anchor="middle" fill="#fff">HARTWIG</text><path d="M82 121v12M107 121v12M70 135h50" stroke="#424d53" stroke-width="5"/>',
    online: '<rect x="24" y="25" width="142" height="103" rx="7" fill="#fff" stroke="#465056" stroke-width="4"/><path d="M25 48h140" stroke="#465056" stroke-width="3"/><circle cx="37" cy="37" r="4" fill="#b32632"/><circle cx="49" cy="37" r="4" fill="#a7a7a4"/><rect x="39" y="60" width="111" height="28" fill="#b32632"/><text x="94" y="78" font-size="15" font-weight="700" text-anchor="middle" fill="#fff">HARTWIG</text><path d="M40 101h91M40 112h70" stroke="#919998" stroke-width="5"/>',
    social: '<rect x="52" y="13" width="87" height="138" rx="12" fill="#39434b"/><rect x="59" y="26" width="73" height="111" rx="5" fill="#fff"/><rect x="64" y="33" width="63" height="58" fill="#b32632"/><text x="96" y="61" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">HARTWIG</text><path d="M70 100h51M70 110h45" stroke="#909596" stroke-width="4"/><path d="M78 121l8 6 9-6 9 6 8-6" fill="none" stroke="#b32632" stroke-width="3"/>',
    schaufenster: '<rect x="20" y="36" width="150" height="94" fill="#fff" stroke="#465056" stroke-width="4"/><rect x="30" y="45" width="130" height="74" fill="#d5e5e7"/><path d="M95 46v72M20 130h150" stroke="#465056" stroke-width="5"/><rect x="35" y="51" width="53" height="15" fill="#b32632"/><text x="61" y="62" fill="#fff" font-size="9" text-anchor="middle" font-weight="700">HARTWIG</text><path d="M57 77l-10 16 4 17h25l3-17-10-16zM125 77l-11 16 4 17h25l3-17-10-16z" fill="#a9a197"/>',
    crm: '<rect x="38" y="28" width="113" height="100" rx="6" fill="#fff" stroke="#465056" stroke-width="4"/><rect x="47" y="38" width="95" height="23" fill="#b32632"/><text x="95" y="54" fill="#fff" font-size="13" font-weight="700" text-anchor="middle">HARTWIG</text><path d="M47 72l46 28 48-28" fill="none" stroke="#889596" stroke-width="4"/><path d="M49 117l33-24M141 117l-34-24" fill="none" stroke="#889596" stroke-width="3"/>',
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190 160" role="img" aria-label="Hartwig-Werbemotiv: ${id}"><rect width="190" height="160" rx="8" fill="#f0eee9"/><rect y="140" width="190" height="20" fill="#e2dfd8"/>${gegenstand[id] ?? gegenstand.prospekt}</svg>`;
};
export const stadtSymbolSVG = function bildStadt(name) {
  const n = String(name).toLowerCase();
  const turm = '<rect x="46" y="20" width="7" height="46" fill="#59636a"/><circle cx="49.5" cy="24" r="9" fill="#b32632"/><path d="M49 6v9" stroke="#59636a" stroke-width="3"/>';
  const dom = '<path d="M18 74V40l8-10 7 10v34h8V40l8-10 7 10v34h10" fill="#9aa19e"/><path d="M20 38l6-25 6 25M43 38l6-25 6 25" fill="none" stroke="#59636a" stroke-width="4"/>';
  const skyline = '<rect x="13" y="42" width="12" height="31" fill="#7f8b8e"/><rect x="30" y="26" width="14" height="47" fill="#65767e"/><rect x="48" y="34" width="17" height="39" fill="#a1a8a5"/><rect x="69" y="20" width="15" height="53" fill="#6c7c80"/>';
  const rathaus = '<path d="M15 72V40h69v32M32 40V28h36v12M44 28V15h12v13" fill="#a4aaaa"/><path d="M47 15l3-9 3 9" fill="#b32632"/><path d="M24 51h8M42 51h8M60 51h8M24 62h8M60 62h8" stroke="#fff" stroke-width="4"/>';
  const zeche = '<path d="M21 73L38 18H64L81 73M19 73h64M34 37h34M28 54h47" stroke="#677579" stroke-width="5" fill="none"/><rect x="40" y="22" width="22" height="9" fill="#b32632"/>';
  const hafen = '<path d="M10 72h80M25 72V29l25-14 25 14v43M36 72V39h27v33" stroke="#68767d" stroke-width="4" fill="none"/><path d="M18 74q8-6 16 0t16 0t16 0t16 0" fill="none" stroke="#a1b8be" stroke-width="4"/>';
  const motif = n.includes('köln') ? dom : n.includes('berlin') || n.includes('stuttgart') || n.includes('düsseldorf') ? turm : n.includes('essen') || n.includes('bochum') ? zeche : n.includes('hamburg') || n.includes('bremen') ? hafen : n.includes('hannover') || n.includes('münchen') || n.includes('dresden') ? rathaus : skyline;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 85" role="img" aria-label="Stadtzeichen ${String(name).replace(/&/g, '&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;')}"><path d="M3 76h94" stroke="#59636a" stroke-width="3"/>${motif}</svg>`;
};
