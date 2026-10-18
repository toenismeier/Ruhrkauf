// Ungefähre Lage der Städte (Breite, Länge) und Standorteigenschaften für die Hauptverwaltung.
// Dient nur der Erreichbarkeit der Häuser (Reiseindex), nicht der Grafik.

export const KOORDINATEN: Record<string, [number, number]> = {
  Berlin: [52.52, 13.4], Hamburg: [53.55, 10.0], München: [48.14, 11.58], Köln: [50.94, 6.96], Frankfurt: [50.11, 8.68],
  Düsseldorf: [51.23, 6.78], Stuttgart: [48.78, 9.18], Essen: [51.46, 7.01], Dortmund: [51.51, 7.47], Bremen: [53.08, 8.8],
  Leipzig: [51.34, 12.37], Dresden: [51.05, 13.74], Hannover: [52.37, 9.73], Nürnberg: [49.45, 11.08], Duisburg: [51.43, 6.76],
  Bochum: [51.48, 7.22], Wuppertal: [51.26, 7.15], Bielefeld: [52.02, 8.53], Bonn: [50.74, 7.1], Münster: [51.96, 7.63],
  Mannheim: [49.49, 8.47], Karlsruhe: [49.01, 8.4], Augsburg: [48.37, 10.9], Wiesbaden: [50.08, 8.24], Mönchengladbach: [51.19, 6.44],
  Gelsenkirchen: [51.51, 7.1], Aachen: [50.78, 6.08], Braunschweig: [52.27, 10.52], Kiel: [54.32, 10.13], Chemnitz: [50.83, 12.92],
  Halle: [51.48, 11.97], Magdeburg: [52.13, 11.63], Freiburg: [47.99, 7.85], Krefeld: [51.33, 6.56], Mainz: [49.99, 8.25],
  Lübeck: [53.87, 10.69], Erfurt: [50.98, 11.03], Oberhausen: [51.47, 6.85], Rostock: [54.09, 12.1], Kassel: [51.31, 9.48],
  Hagen: [51.36, 7.47], Potsdam: [52.39, 13.06], Saarbrücken: [49.24, 6.99], Hamm: [51.68, 7.82], Ludwigshafen: [49.48, 8.44],
  Oldenburg: [53.14, 8.21], Mülheim: [51.43, 6.88], Osnabrück: [52.28, 8.05], Leverkusen: [51.03, 6.98], Darmstadt: [49.87, 8.65],
  Heidelberg: [49.4, 8.69], Solingen: [51.17, 7.08], Regensburg: [49.01, 12.1], Paderborn: [51.72, 8.75], Ingolstadt: [48.77, 11.43],
  Würzburg: [49.79, 9.95], Ulm: [48.4, 9.99], Wolfsburg: [52.42, 10.79], Göttingen: [51.54, 9.92], Pforzheim: [48.89, 8.7],
  Offenbach: [50.1, 8.77], Heilbronn: [49.14, 9.22], Bremerhaven: [53.55, 8.58], Trier: [49.75, 6.64], Koblenz: [50.36, 7.59],
  Jena: [50.93, 11.59], Siegen: [50.87, 8.02], Hildesheim: [52.15, 9.95], Cottbus: [51.76, 14.33], Gütersloh: [51.91, 8.38],
  Recklinghausen: [51.61, 7.2], Bottrop: [51.52, 6.93], Reutlingen: [48.49, 9.21], Erlangen: [49.6, 11.0], Fürth: [49.48, 10.99],
  Bamberg: [49.89, 10.89], Bayreuth: [49.95, 11.58], Landshut: [48.54, 12.15], Rosenheim: [47.86, 12.12], Kempten: [47.73, 10.31],
  Passau: [48.57, 13.43], Konstanz: [47.66, 9.18], Esslingen: [48.74, 9.31], Ludwigsburg: [48.9, 9.19], Tübingen: [48.52, 9.06],
  Gießen: [50.58, 8.68], Marburg: [50.81, 8.77], Fulda: [50.55, 9.68], Hanau: [50.13, 8.92], Wetzlar: [50.56, 8.5],
  Lüneburg: [53.25, 10.41], Celle: [52.62, 10.08], Flensburg: [54.79, 9.44], Neumünster: [54.07, 9.98], Stralsund: [54.31, 13.09],
  Schwerin: [53.63, 11.41], Zwickau: [50.72, 12.5], Görlitz: [51.15, 14.99], Dessau: [51.84, 12.24], Gera: [50.88, 12.08],
  Weimar: [50.98, 11.33], Neuss: [51.2, 6.69], Düren: [50.8, 6.48], Wesel: [51.66, 6.62], Iserlohn: [51.38, 7.7],
  Lüdenscheid: [51.22, 7.63], Witten: [51.44, 7.34], Marl: [51.66, 7.09], Moers: [51.45, 6.63], Kaiserslautern: [49.44, 7.77],
  Worms: [49.63, 8.36], Speyer: [49.32, 8.43], Offenburg: [48.47, 7.94], Lörrach: [47.61, 7.66], Ravensburg: [47.78, 9.61],
  Aschaffenburg: [49.98, 9.15], Schweinfurt: [50.05, 10.23], Hof: [50.32, 11.92], Amberg: [49.44, 11.86], Straubing: [48.88, 12.57],
  Neubrandenburg: [53.56, 13.26], 'Frankfurt (Oder)': [52.35, 14.55], Wilhelmshaven: [53.53, 8.11], Emden: [53.37, 7.21],
  Herford: [52.11, 8.67], Detmold: [51.94, 8.88], Minden: [52.29, 8.92],
};

/** Verkehrsknoten (ICE-Knoten mit Flughafen in der Nähe): Wege in die Häuser sind kürzer. */
export const KNOTEN = new Set(['Berlin', 'Hamburg', 'München', 'Köln', 'Frankfurt', 'Düsseldorf', 'Stuttgart', 'Hannover', 'Leipzig',
  'Nürnberg', 'Dortmund', 'Essen', 'Duisburg', 'Bremen', 'Dresden', 'Mannheim']);

/** Ballungsräume mit großem Fachkräftepool (Rhein-Ruhr, Rhein-Main, Stuttgart, München, Berlin, Hamburg). */
export const BALLUNGSRAUM = new Set([
  'Essen', 'Dortmund', 'Duisburg', 'Bochum', 'Gelsenkirchen', 'Oberhausen', 'Mülheim', 'Hagen', 'Hamm', 'Recklinghausen', 'Bottrop',
  'Witten', 'Marl', 'Moers', 'Düsseldorf', 'Köln', 'Bonn', 'Wuppertal', 'Solingen', 'Leverkusen', 'Krefeld', 'Neuss', 'Mönchengladbach',
  'Frankfurt', 'Wiesbaden', 'Mainz', 'Darmstadt', 'Offenbach', 'Hanau', 'Stuttgart', 'Esslingen', 'Ludwigsburg', 'München', 'Berlin',
  'Potsdam', 'Hamburg',
]);

/** Entfernung in 100 km (flache Näherung, für Mitteleuropa ausreichend). */
export function abstand100(a: string, b: string): number {
  const p = KOORDINATEN[a];
  const q = KOORDINATEN[b];
  if (!p || !q) return 3;
  const dy = (p[0] - q[0]) * 111;
  const dx = (p[1] - q[1]) * 111 * Math.cos(((p[0] + q[0]) / 2) * (Math.PI / 180));
  return Math.sqrt(dx * dx + dy * dy) / 100;
}
