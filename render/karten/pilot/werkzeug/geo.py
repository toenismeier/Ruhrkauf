import math
LAT0, LON0 = 51.4550, 7.0120
KX = 111320 * math.cos(math.radians(LAT0)); KZ = 110574
def xz(lon, lat):  # x Ost, z Süd, Meter (wie render/karten/essen.json)
    return ((lon - LON0) * KX, -(lat - LAT0) * KZ)
def ring(coords): return [xz(*c[:2]) for c in coords]
