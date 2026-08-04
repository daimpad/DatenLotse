#!/usr/bin/env python3
"""Schneidet Font Awesome auf die tatsächlich verwendeten Icons zu.

DatenLotse liefert Schriften und Icons lokal aus – null externe Aufrufe. Der
Preis dafür ist, dass das komplette Font-Awesome-Paket im Repo liegt: 74 KB CSS
mit 1.895 Icon-Regeln und 300 KB Schriftdateien mit rund 2.000 Glyphen. Benutzt
werden davon knapp 80. Dieses Werkzeug erzeugt aus dem vollständigen Paket die
Teilmenge, die die App wirklich braucht.

    python3 tools/build-icons.py            # erzeugen/aktualisieren
    python3 tools/build-icons.py --check    # nur prüfen (Exit 1, wenn veraltet)

Erzeugt werden:
    assets/fonts/fa/icons.min.css
    assets/fonts/webfonts/fa-<familie>.subset.woff2

Die vollständigen Originaldateien (`all.min.css`, `fa-*.woff2`) bleiben im Repo
liegen – sie sind die Quelle für die Neuerzeugung und werden zur Laufzeit nicht
mehr geladen.

Das Zuschneiden der CSS ist rein subtraktiv: es werden ausschließlich die
`--fa`-Regeln nicht verwendeter Icons und die @font-face-Blöcke nicht benutzter
Familien entfernt. Der Rest bleibt Wort für Wort das Original – so kann das
Zuschneiden das Verhalten der Bibliothek nicht verändern.

Voraussetzung nur für das Erzeugen (nicht für die App, nicht für die Tests):
    pip install fonttools brotli
"""

import glob
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def sources():
    """Quellen, in denen nach Icon-Klassen gesucht wird.

    Die statischen Wissensseiten geh&ouml;ren dazu: sie werden aus denselben Daten
    erzeugt, tragen aber eigenes Markup. Reihenfolge im Build deshalb erst
    `npm run wissen`, dann `npm run icons`.
    """
    rel = ['index.html', 'js/app.js', 'css/styles.css']
    rel += sorted(os.path.relpath(p, ROOT)
                  for p in glob.glob(os.path.join(ROOT, 'wissen', '**', 'index.html'),
                                     recursive=True))
    return rel

FA_CSS = 'assets/fonts/fa/all.min.css'
OUT_CSS = 'assets/fonts/fa/icons.min.css'
WEBFONTS = 'assets/fonts/webfonts'

# Familie → (Font-Awesome-Familienname, Gewicht, Originaldatei, Zieldatei)
FAMILIES = {
    'solid': ('Font Awesome 6 Free', '900', 'fa-solid-900.woff2', 'fa-solid-900.subset.woff2'),
    'regular': ('Font Awesome 6 Free', '400', 'fa-regular-400.woff2', 'fa-regular-400.subset.woff2'),
    'brands': ('Font Awesome 6 Brands', '400', 'fa-brands-400.woff2', 'fa-brands-400.subset.woff2'),
}

# Kürzel im Markup → Familie
PREFIXES = {'fas': 'solid', 'fa-solid': 'solid',
            'far': 'regular', 'fa-regular': 'regular',
            'fab': 'brands', 'fa-brands': 'brands'}

HEADER = """/*!
 * Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com
 * License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License)
 * Copyright 2024 Fonticons, Inc.
 *
 * Zugeschnitten fuer DatenLotse durch tools/build-icons.py –
 * enthaelt nur die tatsaechlich verwendeten Icons. Nicht von Hand bearbeiten.
 */
"""


def read(rel):
    with open(os.path.join(ROOT, rel), encoding='utf-8') as fh:
        return fh.read()


def icon_map(css):
    """name → codepoint aus den `--fa`-Regeln des vollständigen Pakets."""
    out = {}
    for selectors, code in re.findall(r'([^{}]+)\{--fa:"(\\[0-9a-f]+)"\}', css):
        cp = int(code[1:], 16)
        for sel in selectors.split(','):
            sel = sel.strip()
            if sel.startswith('.fa-'):
                out[sel[1:]] = cp
    return out


def used_icons(known):
    """Verwendete Icon-Klassen und Familien aus den Quelldateien.

    Gegen `known` abgeglichen, damit weder Modifikatoren (`fa-fw`) noch
    Falschtreffer aus Fliesstext (`checkliste-muster`) im Ergebnis landen.
    """
    icons, families = set(), set()
    for rel in sources():
        text = read(rel)
        for name in re.findall(r'\bfa-[a-z0-9-]+\b', text):
            if name in known:
                icons.add(name)
        for token in re.findall(r'\bfa[srb]\b|\bfa-(?:solid|regular|brands)\b', text):
            families.add(PREFIXES[token])
    return icons, families


def build_css(full, icons, families, known):
    """Vollständige CSS auf die benötigten Regeln zusammenstreichen."""
    css = full

    # 1) Alle @font-face-Blöcke entfernen; die benötigten werden neu geschrieben.
    #    Die v4-Kompatibilitätsblöcke ("FontAwesome", "Font Awesome 5 …") sind
    #    Altlasten für Markup, das DatenLotse nicht verwendet.
    css = re.sub(r'@font-face\{[^{}]*\}', '', css)

    # 2) Icon-Regeln nicht verwendeter Icons entfernen. Eine Regel kann mehrere
    #    Aliasse tragen ('.fa-js-square,.fa-square-js') – dann bleiben nur die
    #    tatsächlich benutzten Selektoren stehen.
    def keep(m):
        sels = [s.strip() for s in m.group(1).split(',')]
        sels = [s for s in sels if s.startswith('.fa-') and s[1:] in icons]
        return (','.join(sels) + '{--fa:"' + m.group(2) + '"}') if sels else ''

    css = re.sub(r'([^{}]+)\{--fa:"(\\[0-9a-f]+)"\}', keep, css)

    # 3) Lizenzkopf des Originals durch den eigenen ersetzen.
    css = re.sub(r'^/\*!.*?\*/\s*', '', css, flags=re.S)

    # 4) Leerzeilen aus den entfernten Blöcken einsammeln.
    css = re.sub(r'\n{2,}', '\n', css).strip()

    # 5) @font-face für die benutzten Familien. `swap` statt `block`: bis die
    #    Icon-Schrift da ist, soll der Text sichtbar bleiben statt zu warten.
    faces = []
    for fam in sorted(families):
        name, weight, _, out = FAMILIES[fam]
        faces.append(
            '@font-face{font-family:"%s";font-style:normal;font-weight:%s;'
            'font-display:swap;src:url(../webfonts/%s) format("woff2")}'
            % (name, weight, out))

    return HEADER + '\n'.join(faces) + '\n' + css + '\n'


def build_fonts(icons, families, known, write):
    """Schriftdateien auf die benötigten Codepunkte zuschneiden."""
    try:
        from fontTools import subset
        from fontTools.ttLib import TTFont
    except ImportError:
        if write:
            sys.exit('fonttools fehlt – bitte "pip install fonttools brotli" ausfuehren.')
        return {}

    unicodes = sorted({known[n] for n in icons})
    result = {}
    for fam in sorted(families):
        _, _, src, dst = FAMILIES[fam]
        font = TTFont(os.path.join(ROOT, WEBFONTS, src))
        # Nur die Codepunkte behalten, die die Schrift überhaupt kennt –
        # ein Solid-Icon steckt nicht auch in der Regular-Schrift.
        have = set(font.getBestCmap())
        opts = subset.Options()
        opts.flavor = 'woff2'
        opts.desubroutinize = True
        opts.notdef_outline = True
        subsetter = subset.Subsetter(options=opts)
        subsetter.populate(unicodes=[u for u in unicodes if u in have])
        subsetter.subset(font)
        path = os.path.join(ROOT, WEBFONTS, dst)
        if write:
            font.save(path)
        font.close()
        result[dst] = os.path.getsize(path) if os.path.exists(path) else 0
    return result


def main():
    check = '--check' in sys.argv
    full = read(FA_CSS)
    known = icon_map(full)
    icons, families = used_icons(known)

    css = build_css(full, icons, families, known)
    path = os.path.join(ROOT, OUT_CSS)
    current = read(OUT_CSS) if os.path.exists(path) else None

    if check:
        if current != css:
            print('VERALTET: %s stimmt nicht mit den verwendeten Icons ueberein.' % OUT_CSS)
            print('Bitte "npm run icons" ausfuehren und das Ergebnis mitcommitten.')
            return 1
        missing = [FAMILIES[f][3] for f in families
                   if not os.path.exists(os.path.join(ROOT, WEBFONTS, FAMILIES[f][3]))]
        if missing:
            print('FEHLT: %s' % ', '.join(missing))
            return 1
        print('aktuell: %d Icons, %d Familien' % (len(icons), len(families)))
        return 0

    with open(path, 'w', encoding='utf-8') as fh:
        fh.write(css)
    sizes = build_fonts(icons, families, known, True)

    # Nicht mehr benötigte Teilmengen aufräumen, damit keine Leiche bleibt.
    for fam, (_, _, _, dst) in FAMILIES.items():
        if fam not in families:
            stale = os.path.join(ROOT, WEBFONTS, dst)
            if os.path.exists(stale):
                os.remove(stale)
                print('entfernt: %s' % dst)

    print('%s: %d Icons, %.1f KB (vorher %.1f KB)'
          % (OUT_CSS, len(icons), len(css) / 1024, len(full) / 1024))
    for name, size in sorted(sizes.items()):
        orig = next(s for _, _, s, d in FAMILIES.values() if d == name)
        before = os.path.getsize(os.path.join(ROOT, WEBFONTS, orig))
        print('%s: %.1f KB (vorher %.1f KB)' % (name, size / 1024, before / 1024))
    return 0


if __name__ == '__main__':
    sys.exit(main())
