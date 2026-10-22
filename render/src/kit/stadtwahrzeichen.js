// Wiederverwendbares Katalogmodul: gezeichnete Stadt- und Wahrzeichensymbole für die Reise.
// Keine generischen Fragezeichen oder externen Bilder; ein besuchter Stadtplan darf das Symbol ersetzen.
const ART = Object.freeze({
  tor: '<path d="M8 27H52M11 31V49M49 31V49M14 30L17 17H43L46 30M17 19V26M43 19V26M23 31V48M37 31V48M19 49H41M17 17H43"/><path d="M25 17L29 11L34 17M8 50H52"/>',
  dom: '<path d="M10 49V27L16 27V17L20 10L24 17V29H36V17L40 10L44 17V27H50V49M18 29H42M29 49V35H35V49M13 35H19M41 35H47M16 17H24M36 17H44M8 49H52"/>',
  hafen: '<path d="M7 46Q16 49 24 46T42 46T53 46M10 36L17 44H45L52 36Z M16 35V16M16 19H36L27 28H16M23 15H46M44 15V35M37 25H44M33 35V28M7 52Q16 55 24 52T42 52T53 52"/>',
  turm: '<path d="M29 8V13M25 13H33M23 16H35L32 23L36 26H20L24 23Z M27 27L23 46H33L29 27M17 47H40M14 51H44M12 32H20M36 32H47"/>',
  skyline: '<path d="M7 50H53M10 50V31H19V50M22 50V21H32V50M25 21V13M36 50V28H42V50M44 50V17H51V50M47 17V11M12 36H17M12 41H17M24 27H30M24 33H30M37 34H41M46 24H49M46 31H49M46 38H49"/>',
  industrie: '<path d="M8 50V31L21 38V31L34 38V26H49V50Z M40 26V11H45V26M12 43H18M24 43H30M36 43H43M7 50H53"/>',
  altstadt: '<path d="M8 50V29L18 20L29 29V50M29 50V22L41 13L52 22V50M12 31H23M33 24H48M14 38H21M35 33H43M17 50V43H23V50M39 50V40H46V50M6 50H54"/>',
  schloss: '<path d="M8 50V28H15V20H25V27H35V20H45V28H52V50M21 50V35H39V50M25 50V40H35V50M15 30V38M45 30V38M7 50H53M11 20V15H17V20M43 20V15H49V20"/>',
  fluss: '<path d="M4 50Q13 43 22 49T40 48T56 46M4 55Q13 48 22 54T40 53T56 51M12 35L23 20L34 35M17 35V28H29V35M37 36L47 26L53 36M41 36V31H49V36"/>',
  rathaus: '<path d="M8 50V29H52V50M8 29L30 18L52 29M26 50V37H34V50M12 35H19M41 35H48M14 44H19M41 44H46M27 18V12H33V18M7 50H53"/>'
});
const STADT = {
  Berlin: 'tor', Potsdam: 'schloss',
  Köln: 'dom', Dresden: 'dom', Aachen: 'dom', Münster: 'dom', Erfurt: 'dom',
  München: 'dom', Hamburg: 'hafen', Bremen: 'hafen', Kiel: 'hafen',
  Lübeck: 'hafen', Rostock: 'hafen', Bremerhaven: 'hafen', Wilhelmshaven: 'hafen',
  Emden: 'hafen', Flensburg: 'hafen', Stralsund: 'hafen', Düsseldorf: 'turm',
  Frankfurt: 'skyline', Essen: 'industrie', Duisburg: 'industrie',
  Dortmund: 'industrie', Bochum: 'industrie', Oberhausen: 'industrie',
  Gelsenkirchen: 'industrie', Stuttgart: 'schloss', Karlsruhe: 'schloss',
  Schwerin: 'schloss', Heidelberg: 'schloss', Hannover: 'rathaus',
  Leipzig: 'rathaus', Nürnberg: 'altstadt', Augsburg: 'altstadt',
  Bamberg: 'altstadt', Regensburg: 'altstadt', Freiburg: 'altstadt',
  Heidelberg: 'schloss', Passau: 'fluss', Koblenz: 'fluss', Mainz: 'dom'
};
const TYP = {
  dom: 'dom', altstadt: 'altstadt', residenz: 'schloss',
  flussknick: 'fluss', zweiarme: 'fluss', bahnhof: 'rathaus',
  raster: 'skyline', ring: 'rathaus'
};
export function stadtSymbolArt(stadt) {
  const name = typeof stadt === 'string' ? stadt : stadt.name;
  const typ = typeof stadt === 'string' ? '' : stadt.archetyp;
  const region = typeof stadt === 'string' ? '' : stadt.region;
  return STADT[name] ?? TYP[typ] ?? (/nord/i.test(region) ? 'hafen' : /ost/i.test(region) ? 'altstadt' : 'rathaus');
}
/** Einfarbiges Symbol, mit einem stabilen Stadttyp statt zufälliger Bildauswahl. */
export function stadtSymbolSVG(stadt) {
  const art = stadtSymbolArt(stadt);
  return '<svg class="reise-wahrzeichen" viewBox="0 0 60 60" focusable="false" aria-hidden="true">' +
    '<rect x="0.5" y="0.5" width="59" height="59" rx="9" fill="#eef1f2" stroke="#dce3e6"/>' +
    '<g fill="none" stroke="#3b5e70" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">' +
    ART[art] + '</g></svg>';
}
