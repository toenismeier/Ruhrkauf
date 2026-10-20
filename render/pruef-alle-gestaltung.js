// Alle exportierten Städte in kleinen Batches prüfen, damit die Planungsdaten nicht gleichzeitig im Speicher liegen.
const esbuild = require('esbuild');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname, out = path.join(root, 'out');
fs.mkdirSync(out, { recursive: true });
const hauskataloge = ['./haeuser.json', './haeuser-schwester.json', './haeuser-outlet.json'].flatMap((datei) => require(datei));
const staedte = [...new Set(hauskataloge.map((h) => h.stadt))].sort((a,b)=>a.localeCompare(b,'de'));
console.log('Gestaltung: ' + staedte.length + ' Städte in den aktuellen Exporten (Soll: 220).');
const protokoll = [], fehler = [];
for (let i = 0; i < staedte.length; i += 5) {
  const gruppe = staedte.slice(i, i + 5);
  const r = spawnSync(process.execPath, ['pruef-gestaltung.js', gruppe.join(',')], {
    cwd: root, encoding: 'utf8', timeout: 180000, maxBuffer: 16 * 1024 * 1024,
  });
  const text = r.stdout || '';
  const zeile = text.split('\n').find((l) => l.startsWith('Verstöße (Grenzwerte GESTALTUNG.md)'));
  if (r.error || r.status !== 0 || !zeile) fehler.push(gruppe.join(',') + ': Prüfung nicht erfolgreich: ' + (r.error?.message || r.stderr || 'Protokoll fehlt'));
  else {
    const zahlen = zeile.match(/\d+/g)?.map(Number) || [];
    if (zahlen.length !== gruppe.length) fehler.push(gruppe.join(',') + ': Auswertung unvollständig: ' + zeile);
    else for(let k=0;k<gruppe.length;k++) if(zahlen[k]>0) fehler.push(gruppe[k] + ': ' + zahlen[k] + ' Gestaltungsverstöße');
  }
  protokoll.push(gruppe.join(', ') + ': ' + (zeile ?? 'FEHLER'));
  console.log('Gestaltung ' + Math.min(i+5,staedte.length) + '/' + staedte.length + ': ' + (zeile ? zeile.trim() : 'Fehler'));
}
fs.writeFileSync(path.join(out, 'massstab-gestaltung.txt'), protokoll.join('\n') + '\n' + fehler.join('\n') + '\n');
if(fehler.length){fehler.forEach(f=>console.error('FEHLER '+f));process.exitCode=1}
else console.log('Gestaltung: alle ' + staedte.length + ' exportierten Städte ohne Verstöße');
