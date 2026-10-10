"""Sample the local fonts' a contours for a decorative, genuine outline morph.

Font files are never modified. Equal-length closed rings allow interpolation;
the in-between shapes are illustrations, not additional font designs.
"""
from pathlib import Path
from hashlib import sha256
from math import ceil, hypot
import json
import re
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen

ROOT = Path(__file__).resolve().parents[1]
NAMES = ['EB Garamond', 'Source Sans 3', 'Libre Bodoni', 'Inter']

class FlatPen(BasePen):
    def __init__(self, glyphset):
        super().__init__(glyphset)
        self.contours = []
        self.current = []

    def _moveTo(self, p):
        self.current = [p]

    def _lineTo(self, p):
        self.current.append(p)

    def _curveToOne(self, p1, p2, p3):
        p0 = self.current[-1]
        length = sum(hypot(b[0]-a[0], b[1]-a[1]) for a,b in zip([p0,p1,p2], [p1,p2,p3]))
        steps = max(8, min(96, ceil(length / 2)))
        for i in range(1, steps+1):
            t = i/steps
            self.current.append(tuple((1-t)**3*p0[j]+3*(1-t)**2*t*p1[j]+3*(1-t)*t*t*p2[j]+t**3*p3[j] for j in [0,1]))

    def _closePath(self):
        if self.current[-1] == self.current[0]:
            self.current.pop()
        self.contours.append(self.current)
        self.current = []

    def _endPath(self):
        raise ValueError('A glyph contour must be closed')

def area(points):
    return sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(points, points[1:]+points[:1])) / 2

def sample(points, count):
    if area(points) < 0:
        points = list(reversed(points))
    # Every ring starts at its rightmost point; runtime aligns corresponding rings.
    start = max(range(len(points)), key=lambda i: points[i][0])
    points = points[start:]+points[:start]
    lengths = [0]
    for a,b in zip(points, points[1:]+points[:1]):
        lengths.append(lengths[-1]+hypot(b[0]-a[0], b[1]-a[1]))
    out, edge = [], 0
    for i in range(count):
        distance = lengths[-1]*i/count
        while lengths[edge+1] < distance:
            edge += 1
        a,b = points[edge], points[(edge+1)%len(points)]
        t = (distance-lengths[edge])/(lengths[edge+1]-lengths[edge]) if lengths[edge+1] != lengths[edge] else 0
        out.append([round(a[j]+(b[j]-a[j])*t, 3) for j in [0,1]])
    return out

def extract(entry):
    normal = [f for f in entry['files'] if f['style'] == 'normal']
    def distance(f):
        w = f['weight']
        return 0 if isinstance(w,list) and w[0] <= 400 <= w[1] else abs((w[0] if isinstance(w,list) else w)-400)
    source = min(normal,key=distance)
    path = ROOT/source['path']
    font = TTFont(path)
    axes = {a.axisTag:a.defaultValue for a in font['fvar'].axes} if 'fvar' in font else {}
    if 'wght' in axes:
        axes['wght'] = 400
    glyphset = font.getGlyphSet(location=axes or None)
    pen = FlatPen(glyphset)
    glyphset[font.getBestCmap()[ord('a')]].draw(pen)
    contours = sorted(pen.contours,key=lambda p:abs(area(p)),reverse=True)
    if len(contours) != 2:
        raise ValueError(entry['name']+' does not have exactly one outer contour and one counter')
    scale = 400/font['head'].unitsPerEm
    xmin = min(p[0] for ring in contours for p in ring)
    xmax = max(p[0] for ring in contours for p in ring)
    normalized = [[(145+(x-(xmin+xmax)/2)*scale, 300-y*scale) for x,y in ring] for ring in contours]
    result = {'name':entry['name'],'source':source['path'],'sha256':sha256(path.read_bytes()).hexdigest(),
              'licensePath':entry['licensePath'],'copyright':font['name'].getDebugName(0),
              'axes':axes,'contours':[sample(normalized[0],512),sample(normalized[1],256)]}
    font.close()
    return result

def main():
    catalog = json.loads((ROOT/'data/typografie-fonts.json').read_text())
    entries = {f['name']:f for f in catalog['families']}
    text = re.search(r"const text='([^']+)';", (ROOT/'scripts/typografie-hero-core.js').read_text()).group(1)
    # Nominal advances for the script-free downloadable standstill; the live
    # hero measures its actual rendered word widths after the font loads.
    source = extract(entries['Source Sans 3'])['source']
    font = TTFont(ROOT/source)
    glyphs = font.getGlyphSet(location={'wght':400})
    cmap = font.getBestCmap()
    widths = [round(sum(glyphs[cmap[ord(c)]].width for c in word)*12.8/font['head'].unitsPerEm,3) for word in text.split(' ')]
    font.close()
    data = {'character':'a','emSize':400,'baseline':300,'text':text,'wordWidths':widths,
            'method':'Konturen lokaler Regular-Fonts, Gewicht 400. Einheitlicher Schriftgrad und gemeinsame Grundlinie; horizontal optisch zentriert. Geschlossene Konturen für die Animation fein abgetastet. Zwischenformen sind Illustrationen, keine weiteren Schriftarten.',
            'families':[extract(entries[name]) for name in NAMES]}
    (ROOT/'data/typografie-hero.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n')
    print('Prepared four local a outlines, each with an outer contour and counter.')

if __name__ == '__main__':
    main()
