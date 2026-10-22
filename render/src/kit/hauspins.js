// Q22: Hauspins für die Spielkarte. Die Spitze sitzt auf der tatsächlichen Dachmitte,
// nicht auf dem Grundstück. Keine Änderung an Stadtplan, Hausmodell oder Engine.
import { THREE } from './basis.js';
import { fussabdruck } from './bauer.js';

export function dachpunkt(parzelle, abmessung, hoehe) {
  if (!parzelle || !abmessung || !Number.isFinite(abmessung.w) || !Number.isFinite(abmessung.d)
      || !Number.isFinite(hoehe)) return null;
  const { w, d } = abmessung, p = parzelle, ecke = p.ecke ?? '+x+z';
  const x = ecke === 'block' ? p.x + Math.max(0, (p.w - w) / 2)
    : ecke.includes('+x') ? p.x + p.w - w : p.x;
  const z = ecke === 'block' ? p.z + Math.max(0, (p.d - d) / 2)
    : ecke.includes('+z') ? p.z + p.d - d : p.z;
  return { x: x + w / 2, y: Math.max(0, hoehe), z: z + d / 2 };
}

export function hausDachpunkt(eintrag, haus) {
  return dachpunkt(eintrag?.p, haus ? fussabdruck(haus) : null, eintrag?.e?.hoehe);
}

export function hausFormat(haus) {
  if (haus?.klasse === 'premium') return 'premium';
  if (haus?.format === 'sport') return 'sport';
  if (haus?.format === 'outlet') return 'fundus';
  if (haus?.format === 'schwester') return 'volkskauf';
  return 'warenhaus';
}

const STIL = {
  warenhaus: { farbe: '#bf312e', zeichen: 'H' },
  sport: { farbe: '#11694d', zeichen: 'S' },
  volkskauf: { farbe: '#235b92', zeichen: 'V' },
  fundus: { farbe: '#8b2464', zeichen: 'F' },
  premium: { farbe: '#be913e', zeichen: '♛' },
};

export function pinZustand(haus, zustand) {
  const stati = [zustand?.status, ...(zustand?.zusatz ?? [])];
  if (['geschlossen', 'raeumung', 'leer', 'verfall'].some((s) => stati.includes(s)) ||
      (haus?.substanz ?? 100) < 35) return 'warnung';
  if (stati.includes('umbau')) return 'umbau';
  if (stati.includes('aktion')) return 'aktion';
  return null;
}

function kreis(k, x, y, r, farbe) {
  k.beginPath(); k.arc(x, y, r, 0, Math.PI * 2); k.fillStyle = farbe; k.fill();
}
function pinTextur(format, zustand) {
  const stil = STIL[format] ?? STIL.warenhaus;
  const c = document.createElement('canvas'); c.width = 256; c.height = 320;
  const k = c.getContext('2d');
  k.save();
  k.shadowColor = 'rgba(15,24,31,0.62)'; k.shadowBlur = 18; k.shadowOffsetY = 10;
  k.beginPath(); k.moveTo(128, 306);
  k.bezierCurveTo(110, 269, 35, 181, 35, 125);
  k.arc(128, 125, 93, Math.PI, 0, false);
  k.bezierCurveTo(221, 181, 146, 269, 128, 306);
  k.closePath(); k.fillStyle = stil.farbe; k.fill();
  k.restore();
  k.lineWidth = 13; k.strokeStyle = '#ffffff'; k.stroke();
  k.lineWidth = 4; k.strokeStyle = format === 'premium' ? '#563d1d' : '#27303a'; k.stroke();
  kreis(k, 128, 125, 66, format === 'premium' ? '#fff5db' : '#ffffff');
  k.lineWidth = 3; k.strokeStyle = format === 'premium' ? '#71501f' : stil.farbe;
  k.beginPath(); k.arc(128, 125, 67, 0, Math.PI * 2); k.stroke();
  k.font = format === 'premium' ? 'bold 112px Georgia, serif' : 'bold 100px Arial, sans-serif';
  k.textBaseline = 'middle'; k.textAlign = 'center'; k.fillStyle = format === 'premium' ? '#79521a' : stil.farbe;
  k.fillText(stil.zeichen, 128, 130);
  if (zustand) {
    const text = zustand === 'aktion' ? '%' : zustand === 'umbau' ? 'U' : '!';
    const farbe = zustand === 'aktion' ? '#1d6b4e' : zustand === 'umbau' ? '#b96b20' : '#ba292a';
    kreis(k, 203, 55, 39, '#ffffff'); kreis(k, 203, 55, 32, farbe);
    k.font = 'bold 43px Arial, sans-serif'; k.fillStyle = '#ffffff'; k.fillText(text, 203, 58);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function nameTextur(name) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 96;
  const k = c.getContext('2d');
  k.fillStyle = '#fff7e8'; k.strokeStyle = '#aa8143'; k.lineWidth = 5;
  k.beginPath(); k.roundRect(5, 6, 502, 84, 19); k.fill(); k.stroke();
  k.fillStyle = '#57391c'; k.textAlign = 'center'; k.textBaseline = 'middle';
  let groesse = 48; k.font = 'bold 48px Arial, sans-serif';
  while (k.measureText(name).width > 463 && groesse > 25) {
    groesse -= 2; k.font = 'bold ' + groesse + 'px Arial, sans-serif';
  }
  k.fillText(name, 256, 49, 463);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Ein Sprite pro Haus; am unteren Ende des Pins liegt exakt der Dachanker. */
export function baueHauspin(scene, haus, eintrag, zustand) {
  const dach = hausDachpunkt(eintrag, haus);
  if (!dach) return null;
  const format = hausFormat(haus), signal = pinZustand(haus, zustand);
  const pin = new THREE.Sprite(new THREE.SpriteMaterial({
    map: pinTextur(format, signal), transparent: true, depthTest: false, depthWrite: false,
  }));
  pin.center.set(0.5, 0);
  pin.position.set(dach.x, dach.y, dach.z);
  pin.renderOrder = 35;
  pin.userData = { hausId: haus.id, format, signal, dach };
  scene.add(pin);
  let namensschild = null;
  if (format === 'premium') {
    namensschild = new THREE.Sprite(new THREE.SpriteMaterial({
      map: nameTextur(haus.name), transparent: true, depthTest: false, depthWrite: false,
    }));
    namensschild.renderOrder = 36;
    namensschild.userData = { hausId: haus.id, premiumName: true };
    scene.add(namensschild);
  }
  return { pin, namensschild };
}

/** Gleiche Mindestgröße bei weitem Zoom, statt in der Fernsicht winzig zu werden. */
export function pinGroessen(pins, zoomHalb, bildHoehe) {
  if (!(bildHoehe > 0) || !(zoomHalb > 0)) return;
  const weltJePixel = zoomHalb * 2 / bildHoehe;
  const hoehe = (zoomHalb > 145 ? 39 : 47) * weltJePixel;
  for (const { pin, namensschild } of pins) {
    pin.scale.set(hoehe * 0.8, hoehe, 1);
    if (namensschild) {
      namensschild.visible = zoomHalb <= 105;
      namensschild.position.set(pin.position.x, pin.position.y + hoehe * 1.20, pin.position.z);
      namensschild.scale.set(145 * weltJePixel, 29 * weltJePixel, 1);
    }
  }
}
