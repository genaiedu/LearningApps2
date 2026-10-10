"""Read the actual catalogue webfonts; emit a reproducible audit to stdout.

No font changes or network. Glyph presence is not a reading-quality test.
Run with FontTools + Brotli; save generated JSON via the project's file workflow.
"""
from pathlib import Path
from hashlib import sha256
import json
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
GERMAN = 'ÄÖÜäöüß'
OPTIONAL = 'ẞ€„“–'
OPTICAL = {'inter':'fonts/typografie/inter/Inter[opsz,wght].ttf',
           'dmsans':'fonts/typografie/dmsans/DMSans[opsz,wght].ttf'}

def inspect_family(family):
    records = []
    for source in family['files']:
        path = ROOT / source['path']
        with TTFont(path) as font:
            cmap = font.getBestCmap() or {}
            def missing(chars):
                return ''.join(c for c in chars if not cmap.get(ord(c)) or cmap.get(ord(c)) == '.notdef')
            axes = {a.axisTag: [a.minValue, a.maxValue] for a in font['fvar'].axes} if 'fvar' in font else {}
            tags = set()
            for table in ('GSUB', 'GPOS'):
                if table in font and font[table].table.FeatureList:
                    tags.update(x.FeatureTag for x in font[table].table.FeatureList.FeatureRecord)
            weight = axes.get('wght', [font['OS/2'].usWeightClass] * 2)
            italic = bool(font['OS/2'].fsSelection & 1 or font['head'].macStyle & 2)
            records.append({'path': source['path'], 'sha256': sha256(path.read_bytes()).hexdigest(),
                            'germanMissing': missing(GERMAN), 'optionalMissing': missing(OPTIONAL),
                            'weight': weight, 'italic': italic, 'axes': axes,
                            'features': sorted(tags), 'kernTable': 'kern' in font})
    cuts = {key: any(r['italic'] == italic and r['weight'][0] <= weight <= r['weight'][1] for r in records)
            for key, weight, italic in [('regular',400,False),('bold',700,False),('italic',400,True),('boldItalic',700,True)]}
    optical = []
    if family['id'] in OPTICAL:
        relative = OPTICAL[family['id']]
        path = ROOT / relative
        with TTFont(path) as font:
            optical.append({'path':relative,'sha256':sha256(path.read_bytes()).hexdigest(),
                            'axes':{a.axisTag:[a.minValue,a.maxValue] for a in font['fvar'].axes}})
    return {'id': family['id'], 'name': family['name'], 'files': records, 'cuts': cuts, 'opticalFiles':optical,
            'germanMissing': ''.join(c for c in GERMAN if any(c in r['germanMissing'] for r in records)),
            'optionalMissing': ''.join(c for c in OPTIONAL if any(c in r['optionalMissing'] for r in records)),
            'licensePresent': (ROOT / family['licensePath']).is_file()}

def build():
    catalogue = json.loads((ROOT / 'data/typografie-fonts.json').read_text())
    return {'checked':'2026-10-10','requiredGerman':GERMAN,'optionalCharacters':OPTIONAL,
            'scope':'Tatsächliche lokale Webdateien des Schriftarchivs, nicht alle bei Google erhältlichen Schnitte. cmap-Zeichenzuordnung, OS/2, fvar und OpenType-Tags; kein automatischer Lesbarkeits- oder Lizenzrechtsentscheid.',
            'families':[inspect_family(f) for f in catalogue['families']]}

if __name__ == '__main__':
    print(json.dumps(build(), ensure_ascii=False, indent=2))
