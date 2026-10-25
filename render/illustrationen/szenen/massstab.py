# Maßstab-Motiv: so detailliert und sauber muss jedes Motiv sein (Vergleich Coffee 05).
from werkzeug import *
S = {}
S['kanal-tv'] = {'groesse': 'karte', 'formen': [
  q(0, 0, 0, 1.6, 0.5, 0.06, HOLZ_ROT), q(0, 0, 0.5, 1.6, 0.5, 0.06, '#9a4126', fase=0.01),
  q(-0.77, 0, 0.06, 0.06, 0.5, 0.44, HOLZ_ROT), q(0.77, 0, 0.06, 0.06, 0.5, 0.44, HOLZ_ROT),
  q(0, 0.22, 0.06, 1.5, 0.04, 0.44, '#6d2c19'), q(0, 0, 0.27, 1.5, 0.48, 0.03, HOLZ_ROT), q(0, 0, 0.06, 0.04, 0.48, 0.44, HOLZ_ROT),
  q(-0.38, -0.02, 0.06, 0.56, 0.36, 0.13, '#e4e6e8', fase=0.01), q(0.38, -0.02, 0.30, 0.56, 0.36, 0.13, '#e4e6e8', fase=0.01),
  q(-0.38, -0.205, 0.10, 0.12, 0.01, 0.04, METALL), q(0.38, -0.205, 0.34, 0.12, 0.01, 0.04, METALL),
  q(0, 0.05, 0.56, 0.36, 0.2, 0.02, '#2a2b2e'), q(0, 0.06, 0.58, 0.06, 0.05, 0.14, '#2a2b2e'),
  q(0, 0.06, 0.70, 1.7, 0.05, 0.98, '#232427', fase=0.01),
  bild(0, 0.033, 0.735, 1.62, 0.91, 'flaechen/schirm-hartwig.png')] + lautsprecher(-1.08, 0.05) + lautsprecher(1.08, 0.05)}
