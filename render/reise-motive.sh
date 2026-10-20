#!/bin/bash
# Erzeugt die drei Reisemotive (bilder/reise-{ruhr,altstadt,hafen}.jpg) aus dem Kit. Aufruf im Ordner render/.
set -e
for n in ruhr altstadt hafen; do node render-katalog.js _reise-$n out/roh-$n.png; done
python3 -c "
from PIL import Image
for n in ['ruhr','altstadt','hafen']:
    Image.open(f'out/roh-{n}.png').convert('RGB').crop((0,90,1400,2190)).save(f'bilder/reise-{n}.jpg', quality=82, optimize=True, progressive=True)"
