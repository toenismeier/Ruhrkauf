'use strict';
const assert = require('node:assert/strict');
const { kennung, hash, stadtliste, auswahl, unterschiede, vorbereiten, GROESSE, GRENZEN }
  = require('../pruef-fingerabdruck');

assert.equal(kennung('Düsseldorf'), 'duesseldorf');
assert.equal(kennung('Köln'), 'koeln');
assert.equal(kennung('Münster'), 'muenster');
assert.equal(kennung('Görlitz'), 'goerlitz');
assert.equal(kennung('Straße'), 'strasse');
assert.equal(hash('x'), hash('x'));
assert.notEqual(hash('x'), hash('y'));
assert.deepEqual(GROESSE, { breite: 512, hoehe: 1024 });
assert(GRENZEN.anteilProzent > 0 && GRENZEN.anteilProzent <= 2);

const staedte = stadtliste();
assert.equal(staedte.size, 220);
assert(staedte.has('essen'));
assert(staedte.has('berlin'));
assert.equal(auswahl([], staedte).ids.length, 220);
assert.deepEqual(auswahl(['--neu', 'essen', 'bochum'], staedte).ids, ['essen', 'bochum']);
assert.equal(auswahl(['--neu', '--alle'], staedte).ids.length, 220);
assert.equal(auswahl(['--gegenprobe', 'essen'], staedte).ids.length, 2);
assert.throws(() => auswahl(['--neu'], staedte), /benötigt/);
assert.throws(() => auswahl(['--neu', '--pruefen'], staedte), /Nur einen/);
assert.throws(() => auswahl(['--pruefen', 'unbekannt'], staedte), /Unbekannte Stadt/);

const alt = [{ id: 'Haus/1', teile: 1, dreiecke: 12 }, { id: 'Haus/2', teile: 2 }];
const neu = [{ id: 'Haus/1', teile: 1, dreiecke: 14 }, { id: 'Haus/2', teile: 2 }];
assert.deepEqual(unterschiede(alt, neu), ['Haus/1']);
assert.deepEqual(unterschiede(alt, alt), []);
const basis = { schema: 1, stadt: 'Essen', stadtplan: { liste: [] }, geometrie: { kacheln: [] } };
const ref = vorbereiten(basis, 'essen', Buffer.from('bilddaten'));
assert.equal(ref.stadtId, 'essen');
assert.equal(ref.pruefsummen.stadtplan.length, 64);
assert.equal(ref.pruefsummen.bildReferenz, hash(Buffer.from('bilddaten').toString()));
console.log('OK Q03: 220 Stadt-IDs, CLI-Modi, Abweichungserkennung und SHA-256.');
