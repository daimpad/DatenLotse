#!/usr/bin/env python3
"""Verkleinert eine SVG-Grafik verlustarm – ohne Fremdpaket.

WARUM: `favicon.svg` war das vollständige Logo (252 Pfade) mit zwei
Nachkommastellen in einem Raster von 2.835 Einheiten, eingebettet in den
Rahmen eines Favicon-Generators – 126 KB für eine Darstellung bei 16 bis
64 px. Bei 64 px ist eine Rastereinheit 0,02 px groß; die Präzision lag um
Größenordnungen über dem, was sichtbar ist.

WIE:
- Ein echter Pfad-Parser statt einer Zahlen-Regex. Bogen-Flags dürfen in SVG
  ohne Trenner stehen (`a5 5 0 01 10 10`); eine Regex zerlegt sie falsch –
  derselbe Fehlertyp wie `1.5.5`, der in v45 eine Grafik zerstört hat.
- Jede Koordinate wird ABSOLUT auf `--genau` Nachkommastellen gerundet und
  erst danach relativ geschrieben. Wer relative Werte rundet, häuft die
  Fehler entlang des Pfads an.
- Je Segment die kürzere Schreibweise (absolut oder relativ), Zahlen ohne
  führende Null und nur mit den nötigsten Trennern.
- Aufeinanderfolgende Pfade derselben Klasse kommen in eine Gruppe; die
  Klassennamen werden kurz. Pfade werden NICHT zusammengelegt – bei sich
  überlappenden Teilpfaden änderte das die Füllung (nonzero).

Verworfen: ein noch gröberes Raster (Koordinaten halbiert oder geviertelt,
viewBox entsprechend verkleinert). Es sparte nur 4–8 KB, kippte bei 180 px
aber einzelne Pixel um bis zu 200/255 – feine Linien veränderten sich.

Prüfen: das Ergebnis per Pixelvergleich gegen das Original halten
(siehe `tests/assets.spec.js`).

    python3 tools/shrink-svg.py favicon.svg favicon.svg --genau 0
"""
import argparse
import re
import sys

ZAHL = re.compile(r'[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?')
ANZAHL = {'M': 2, 'L': 2, 'H': 1, 'V': 1, 'C': 6, 'S': 4, 'Q': 4, 'T': 2, 'A': 7, 'Z': 0}


def tokens(d):
    """Liefert (Befehl, [Argumente]) – Bogen-Flags zeichenweise gelesen."""
    i, n, aus = 0, len(d), []
    befehl = None
    while i < n:
        ch = d[i]
        if ch in ' ,\t\n\r':
            i += 1
            continue
        if ch.isalpha():
            befehl = ch
            i += 1
            if befehl in 'Zz':
                aus.append((befehl, []))
            continue
        # Argumente zum aktuellen Befehl (implizite Wiederholung möglich)
        k = ANZAHL[befehl.upper()]
        args = []
        while len(args) < k:
            while i < n and d[i] in ' ,\t\n\r':
                i += 1
            if befehl in 'Aa' and len(args) in (3, 4):
                args.append(float(d[i]))          # Flag: genau ein Zeichen
                i += 1
                continue
            m = ZAHL.match(d, i)
            if not m:
                raise ValueError(f'kein Wert an Stelle {i}: {d[i:i+20]!r}')
            args.append(float(m.group()))
            i = m.end()
        aus.append((befehl, args))
        # implizite Wiederholung: nach M werden weitere Paare zu L
        if befehl == 'M':
            befehl = 'L'
        elif befehl == 'm':
            befehl = 'l'
    return aus


def absolut(segmente):
    """Rechnet alle Segmente auf absolute Koordinaten um."""
    x = y = sx = sy = 0.0
    aus = []
    for c, a in segmente:
        C = c.upper()
        rel = c.islower()
        if C == 'Z':
            aus.append(('Z', []))
            x, y = sx, sy
            continue
        if C == 'H':
            nx = a[0] + (x if rel else 0)
            aus.append(('H', [nx])); x = nx
            continue
        if C == 'V':
            ny = a[0] + (y if rel else 0)
            aus.append(('V', [ny])); y = ny
            continue
        if C == 'A':
            ex, ey = a[5] + (x if rel else 0), a[6] + (y if rel else 0)
            aus.append(('A', a[:5] + [ex, ey])); x, y = ex, ey
            continue
        pts = [v + ((x if j % 2 == 0 else y) if rel else 0) for j, v in enumerate(a)]
        aus.append((C, pts))
        x, y = pts[-2], pts[-1]
        if C == 'M':
            sx, sy = x, y
    return aus


def fmt(v, genau):
    v = round(v, genau)
    if v == int(v):
        s = str(int(v))
    else:
        s = f'{v:.{genau}f}'.rstrip('0').rstrip('.')
    if s.startswith('0.'):
        s = s[1:]
    elif s.startswith('-0.'):
        s = '-' + s[2:]
    return '0' if s in ('-0', '') else s


def zahl_tokens(werte, genau, flags=()):
    return [(str(int(v)) if j in flags else fmt(v, genau), j in flags) for j, v in enumerate(werte)]


def braucht_trenner(vorher, nachher):
    """Ein Leerzeichen ist nur nötig, wo die Zahlen sonst verschmölzen.
    Ein Minus beginnt immer eine neue Zahl; ein Punkt nur dann, wenn die
    vorige Zahl schon einen hat (und keinen Exponenten). Um Bogen-Flags
    herum steht immer ein Trenner – nicht jeder Leser kennt die SVG-2-Kurzform."""
    (v, v_flag), (n, n_flag) = vorher, nachher
    if v_flag or n_flag:
        return True
    if n.startswith('-'):
        return False
    if n.startswith('.') and '.' in v and 'e' not in v.lower():
        return False
    return True


def schreibe(segmente):
    """segmente: [(Befehl, [(Token, istFlag), …])]. Wiederholt sich ein Befehl
    (außer M/m), entfällt sein Buchstabe – dann gilt die Trennerregel."""
    s, letzter_befehl, letzter_token = '', None, None
    for befehl, toks in segmente:
        if befehl == letzter_befehl and befehl not in 'Mm' and toks and letzter_token:
            if braucht_trenner(letzter_token, toks[0]):
                s += ' '
        else:
            s += befehl
        for i, t in enumerate(toks):
            if i and braucht_trenner(toks[i - 1], t):
                s += ' '
            s += t[0]
        letzter_befehl = befehl
        letzter_token = toks[-1] if toks else None
    return s


def laenge(befehl, toks):
    return len(schreibe([(befehl, toks)]))


def kompakt(segmente, genau):
    """Schreibt absolute, gerundete Segmente in der jeweils kürzeren Form."""
    q = lambda v: round(v, genau)
    x = y = sx = sy = 0.0
    aus = []
    for C, a in segmente:
        if C == 'Z':
            aus.append(('z', [])); x, y = sx, sy
            continue
        if C in 'HV':
            neu = q(a[0])
            bezug = x if C == 'H' else y
            ab, re_ = (C, zahl_tokens([neu], genau)), (C.lower(), zahl_tokens([neu - bezug], genau))
            aus.append(min(ab, re_, key=lambda t: laenge(*t)))
            if C == 'H': x = neu
            else: y = neu
            continue
        if C == 'A':
            rx, ry, rot = q(a[0]), q(a[1]), q(a[2])
            ex, ey = q(a[5]), q(a[6])
            ab = ('A', zahl_tokens([rx, ry, rot, a[3], a[4], ex, ey], genau, flags=(3, 4)))
            re_ = ('a', zahl_tokens([rx, ry, rot, a[3], a[4], ex - x, ey - y], genau, flags=(3, 4)))
            aus.append(min(ab, re_, key=lambda t: laenge(*t))); x, y = ex, ey
            continue
        pts = [q(v) for v in a]
        rel = [v - (x if j % 2 == 0 else y) for j, v in enumerate(pts)]
        ab, re_ = (C, zahl_tokens(pts, genau)), (C.lower(), zahl_tokens(rel, genau))
        # Das erste M bleibt absolut; danach entscheidet die Länge
        aus.append(ab if (C == 'M' and not aus) else min(ab, re_, key=lambda t: laenge(*t)))
        x, y = pts[-2], pts[-1]
        if C == 'M':
            sx, sy = x, y
    return schreibe(aus)


def pfad_kompakt(d, genau):
    return kompakt(absolut(tokens(d)), genau)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('quelle')
    p.add_argument('ziel')
    p.add_argument('--genau', type=int, default=0, help='Nachkommastellen im Pfadraster')
    arg = p.parse_args()
    s = open(arg.quelle, encoding='utf-8').read()
    vorher = len(s.encode())

    s = re.sub(r'<metadata>.*?</metadata>', '', s, flags=re.S)
    s = re.sub(r' d="([^"]*)"', lambda m: ' d="' + pfad_kompakt(m.group(1), arg.genau) + '"', s)
    # Zahlen in Attributen von line/ellipse auf dieselbe Genauigkeit
    def runde_attr(m):
        return m.group(1) + '="' + fmt(float(m.group(2)), arg.genau) + '"'
    # nur an line/ellipse: das rx des äußeren Clip-Rechtecks liegt in einem
    # anderen Koordinatensystem und darf nicht mitskaliert werden
    s = re.sub(r'<(?:line|ellipse)\b[^>]*>',
               lambda t: re.sub(r'\b(x1|y1|x2|y2|cx|cy|rx|ry)="([-\d.]+)"', runde_attr, t.group(0)), s)
    # leere Schlusstags
    s = re.sub(r'<(path|rect|line|ellipse)([^>]*)></\1>', r'<\1\2/>', s)

    # Klassen kürzen: cls-N -> a, b, … (Reihenfolge der Definition)
    klassen = re.findall(r'\.(cls-\d+)\{', s)
    kurz = {}
    for i, k in enumerate(klassen):
        name = ''
        j = i
        while True:
            name = 'abcdefghijklmnopqrstuvwxyz'[j % 26] + name
            j = j // 26 - 1
            if j < 0:
                break
        kurz[k] = name
    for k in sorted(kurz, key=len, reverse=True):
        s = s.replace('.' + k + '{', '.' + kurz[k] + '{').replace(f'class="{k}"', f'class="{kurz[k]}"')

    # aufeinanderfolgende Elemente derselben Klasse gruppieren
    def gruppiere(m):
        teile = re.findall(r'<(?:path|line|ellipse)\b[^>]*/>', m.group(0))
        aus, lauf, klasse = [], [], None
        def schliessen():
            if not lauf:
                return
            if len(lauf) == 1:
                aus.append(lauf[0])
            else:
                aus.append(f'<g class="{klasse}">' + ''.join(
                    re.sub(r' class="[^"]*"', '', t) for t in lauf) + '</g>')
        for t in teile:
            k = re.search(r' class="([^"]*)"', t)
            k = k.group(1) if k else None
            if k != klasse or k is None:
                schliessen(); lauf, klasse = [], k
            lauf.append(t)
        schliessen()
        return ''.join(aus)
    s = re.sub(r'(?:<(?:path|line|ellipse)\b[^>]*/>)+', gruppiere, s)
    s = re.sub(r'>\s+<', '><', s)

    open(arg.ziel, 'w', encoding='utf-8').write(s)
    nachher = len(s.encode())
    print(f'{arg.quelle}: {vorher:,} → {nachher:,} Bytes ({100 - nachher * 100 // vorher} % kleiner)')


if __name__ == '__main__':
    sys.exit(main())
