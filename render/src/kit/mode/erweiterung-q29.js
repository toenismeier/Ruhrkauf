// Q29: eigene Silhouetten und Zeichner dieses Chats (Konfliktvermeidung zwischen Q27, Q28, Q29).
// SILHOUETTEN: neue Einträge oder Ersatz bestehender (gleiche id überschreibt den Basiseintrag), Format wie in silhouetten.js.
// ZEICHNER: { name: (S, t, p) => void } – in SILHOUETTEN als zeichner: 'z:name' verwenden.
// Home/Living modern und ruhig (Steingut, Leinen, Bouclé, Glas, Holz, Rattan), Beauty, Spielwaren.

import { TEXTIL } from './q29-textil.js';
import { TISCH } from './q29-tisch.js';
import { DEKO } from './q29-deko.js';
import { BEAUTY } from './q29-beauty.js';
import { SPIEL } from './q29-spiel.js';

const z = (gruppe, name, material, farbe, p = {}) => ({ gruppe, zeichner: 'z:' + name, p, material, farbe, model: null });
const home = (name, material, farbe, p) => z('home', name, material, farbe, p);
const beauty = (name, farbe, material = 'kosmetik', p) => z('beauty', name, material, farbe, p);
const spiel = (name, farbe, material, p) => z('spielzeug', name, material, farbe, p);

export const SILHOUETTEN = {
  // Home Textil (ersetzt bettwaesche, serviette)
  bettwaesche: home('bettwaesche', 'leinen', 'salbei'),
  bettdecke: home('bettdecke', 'baumwolle', 'weiß'),
  kopfkissen: home('kopfkissen', 'baumwolle', 'offwhite'),
  spannbettlaken: home('spannbettlaken', 'baumwolle', 'sand'),
  tagesdecke: home('tagesdecke', 'baumwolle', 'salbei'),
  badematte: home('badematte', 'frottee', 'sand'),
  waffelhandtuch: home('waffelhandtuch', 'waffel', 'offwhite'),
  tischdecke: home('tischdecke', 'leinen', 'ecru'),
  tischlaeufer: home('tischlaeufer', 'leinen', 'terrakotta'),
  vorhang: home('vorhang', 'leinen', 'beige'),
  serviette: home('serviette', 'leinen', 'salbei'),
  // Tisch und Küche (ersetzt teller, glas)
  teller: home('teller', 'steingut', 'offwhite'),
  geschirrset: home('geschirrset', 'steingut', 'sand'),
  schalen: home('schalen', 'steingut', 'salbei'),
  besteck: home('besteck', 'edelstahl', 'silber'),
  glas: home('glas', 'glas', 'hellblau'),
  wasserglas: home('wasserglas', 'glas', 'hellblau'),
  weinglas: home('weinglas', 'glas', 'bordeaux'),
  becherset: home('becherset', 'steingut', 'petrol'),
  teekanne: home('teekanne', 'steingut', 'ecru'),
  topf: home('topf', 'edelstahl', 'silber'),
  pfanne: home('pfanne', 'aluminium', 'anthrazit'),
  schneidebrett: home('schneidebrett', 'holz', 'camel'),
  vorratsglas: home('vorratsglas', 'glas', 'hellgrau'),
  servierplatte: home('servierplatte', 'steingut', 'creme'),
  // Deko und Wohnen
  tischleuchte: home('tischleuchte', 'keramik', 'salbei'),
  spiegel: home('spiegel', 'messing', 'gold'),
  laterne: home('laterne', 'metall', 'anthrazit'),
  kerzenhalter: home('kerzenhalter', 'messing', 'gold'),
  pflanze: home('pflanze', 'keramik', 'terrakotta'),
  duftstaebchen: home('duftstaebchen', 'glas', 'bordeaux'),
  aufbewahrungsbox: home('aufbewahrungsbox', 'leinen', 'beige'),
  waeschekorb: home('waeschekorb', 'rattan', 'camel'),
  wanduhr: home('wanduhr', 'holz', 'camel'),
  bilderrahmenset: home('bilderrahmenset', 'holz', 'schwarz'),
  dekoschale: home('dekoschale', 'steingut', 'sand'),
  // Beauty (ersetzt creme, parfum, lippenstift)
  creme: beauty('creme', 'altrosa'),
  tiegel: beauty('tiegel', 'braun', 'glas'),
  parfum: beauty('parfum', 'flieder', 'glas', { form: 'eckig' }),
  lippenstift: beauty('lippenstift', 'rot'),
  mascara: beauty('mascara', 'schwarz'),
  nagellack: beauty('nagellack', 'bordeaux'),
  lidschatten: beauty('lidschatten', 'altrosa'),
  foundation: beauty('foundation', 'beige', 'glas'),
  serum: beauty('serum', 'braun', 'glas'),
  tube: beauty('tube', 'mint'),
  pumpspender: beauty('pumpspender', 'anthrazit', 'keramik'),
  duschgel: beauty('duschgel', 'petrol'),
  rasierer: beauty('rasierer', 'marine'),
  haarbuerste: beauty('haarbuerste', 'camel', 'holz'),
  // Spielwaren (ersetzt plueschtier)
  holzspielzeug: spiel('holzspielzeug', 'rot', 'holz'),
  puzzle: spiel('puzzle', 'salbei', 'pappe'),
  bauklotze: spiel('bauklotze', 'koralle', 'holz'),
  puppe: spiel('puppe', 'hellblau', 'baumwolle'),
  plueschtier: spiel('plueschtier', 'camel', 'pluesch'),
};

export const ZEICHNER = { ...TEXTIL, ...TISCH, ...DEKO, ...BEAUTY, ...SPIEL };
