"""Read the actual catalogue webfonts; emit a reproducible audit to stdout.

No font changes or network. Glyph presence is not a reading-quality test.
Run with FontTools + Brotli; save generated JSON via the project's file workflow.
"""
from pathlib import Path
from hashlib import sha256
import argparse, json
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
GERMAN = 'ÄÖÜäöüß'
OPTIONAL = 'ẞ€„“–'
OPTICAL = {'inter':'fonts/typografie/inter/Inter[opsz,wght].ttf',
           'dmsans':'fonts/typografie/dmsans/DMSans[opsz,wght].ttf'}
NAME_TESTS = {
    'Türkisch': 'ÇçĞğİıÖöŞşÜü',
    'Polnisch': 'ĄąĆćĘęŁłŃńÓóŚśŹźŻż',
    'Tschechisch': 'ÁáČčĎďÉéĚěÍíŇňÓóŘřŠšŤťÚúŮůÝýŽž',
    'Rumänisch': 'ĂăÂâÎîȘșȚț',
    'Ungarisch': 'ÁáÉéÍíÓóÖöŐőÚúÜüŰű',
    'Kyrillisch': 'АБВГҐДЂЃЕЁЄЖЗЅИІЇЈЙКЌЛЉМНЊОПРСТЋУЎФХЦЧЏШЩЪЫЬЭЮЯабвгґдђѓеёєжзѕиіїјйкќлљмнњопрстћуўфхцчџшщъыьэюя',
}

def codepoint_ranges(codepoints):
    ranges = []
    for codepoint in sorted(codepoints):
        if ranges and codepoint == ranges[-1][1] + 1:
            ranges[-1][1] = codepoint
        else:
            ranges.append([codepoint, codepoint])
    return ranges

def prefer_complete_files(catalogue):
    """Reuse full originals already bundled locally; never edit a font or sibling.

    Only replace a web subset if every old codepoint survives. Prefer an already
    active complete webfont over an additional TTF; preserve real variable axes.
    """
    def charset(source):
        with TTFont(ROOT / source['path']) as font:
            return {c for c,g in (font.getBestCmap() or {}).items() if g != '.notdef' and font.getGlyphID(g) != 0}
    def bounds(weight):
        return weight if isinstance(weight,list) else [weight,weight]
    def covers(candidate,source):
        a,b=bounds(candidate['weight']);c,d=bounds(source['weight'])
        return candidate['style']==source['style'] and a<=c<=d<=b
    for family in catalogue['families']:
        candidates=[]
        for path in sorted((ROOT/'fonts'/'typografie'/family['id']).glob('*.ttf')):
            with TTFont(path) as font:
                axes={a.axisTag:[a.minValue,a.maxValue] for a in font['fvar'].axes} if 'fvar' in font else {}
                italic=bool(font['OS/2'].fsSelection & 1 or font['head'].macStyle & 2)
                candidates.append({'path':str(path.relative_to(ROOT)),
                                   'weight':axes.get('wght',font['OS/2'].usWeightClass),
                                   'style':'italic' if italic else 'normal','axes':axes})
        known={s['path']:charset(s) for s in family['files']+candidates}
        chosen=[]
        for source in family['files']:
            old=known[source['path']]
            active=[s for s in family['files'] if covers(s,source) and old < known[s['path']]]
            full=[s for s in candidates if covers(s,source) and old < known[s['path']]]
            options=active or full
            target=max(options,key=lambda s:len(known[s['path']])) if options else source
            if not any(s['path']==target['path'] and s['weight']==target['weight'] and s['style']==target['style'] for s in chosen):
                chosen.append(dict(target))
        family['files']=chosen
    catalogue['existingFiles']=len({s['path'] for f in catalogue['families'] for s in f['files'] if s['path'].startswith('../')})

def catalogue_coverage(complete=False):
    """Audit every actual catalogue file, not the full upstream font project.

    Print the enriched catalogue; do not write it. Retain each file's identity
    and hash: a union across weights would hide real gaps in a Regular cut.
    """
    catalogue = json.loads((ROOT / 'data/typografie-fonts.json').read_text())
    if complete:
        prefer_complete_files(catalogue)
    total = 0
    for family in catalogue['families']:
        for source in family['files']:
            path = ROOT / source['path']
            actual_hash = sha256(path.read_bytes()).hexdigest()
            # The coverage describes today's local bytes, not an older subset.
            source['sha256'] = actual_hash
            with TTFont(path) as font:
                cmap = {c:g for c,g in (font.getBestCmap() or {}).items() if g != '.notdef' and font.getGlyphID(g) != 0}
                source['coverage'] = {
                    'ranges': codepoint_ranges(cmap),
                    'testMissing': {label: ''.join(c for c in text if ord(c) not in cmap) for label,text in NAME_TESTS.items()},
                }
            total += 1
    catalogue['coverageAudit'] = {
        'checked': '2026-10-19', 'files': len({s['path'] for f in catalogue['families'] for s in f['files']}), 'cuts': total, 'tests': NAME_TESTS,
        'method': 'Unicode-cmap jeder tatsächlich geladenen Archivdatei, ohne .notdef; keine Vereinigung verschiedener Schnitte. NFC für Eingaben in der Werkstatt. Die Proben sind keine vollständigen Sprachtests und keine Prüfung der Lesbarkeit oder Zeichenpositionierung.',
    }
    return catalogue

def axis_bounds(axis):
    return [int(value) if float(value).is_integer() else float(value) for value in (axis.minValue, axis.maxValue)]

def inspect_family(family):
    records = []
    for source in family['files']:
        path = ROOT / source['path']
        with TTFont(path) as font:
            cmap = font.getBestCmap() or {}
            def missing(chars):
                return ''.join(c for c in chars if not cmap.get(ord(c)) or cmap.get(ord(c)) == '.notdef')
            axes = {a.axisTag: axis_bounds(a) for a in font['fvar'].axes} if 'fvar' in font else {}
            tags = set()
            for table in ('GSUB', 'GPOS'):
                if table in font and font[table].table.FeatureList:
                    tags.update(x.FeatureTag for x in font[table].table.FeatureList.FeatureRecord)
            weight = axes.get('wght', [font['OS/2'].usWeightClass] * 2)
            italic = bool(font['OS/2'].fsSelection & 1 or font['head'].macStyle & 2)
            records.append({'path': source['path'], 'sha256': sha256(path.read_bytes()).hexdigest(),
                            'germanMissing': missing(GERMAN), 'optionalMissing': missing(OPTIONAL),
                            'longSPresent': not missing('ſ'),
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
                            'axes':{a.axisTag:axis_bounds(a) for a in font['fvar'].axes}})
    return {'id': family['id'], 'name': family['name'], 'files': records, 'cuts': cuts, 'opticalFiles':optical,
            'germanMissing': ''.join(c for c in GERMAN if any(c in r['germanMissing'] for r in records)),
            'optionalMissing': ''.join(c for c in OPTIONAL if any(c in r['optionalMissing'] for r in records)),
            'licensePresent': (ROOT / family['licensePath']).is_file()}

def build():
    catalogue = json.loads((ROOT / 'data/typografie-fonts.json').read_text())
    return {'checked':'2026-10-19','requiredGerman':GERMAN,'optionalCharacters':OPTIONAL,
            'scope':'Tatsächliche lokale Webdateien des Schriftarchivs, nicht alle bei Google erhältlichen Schnitte. cmap-Zeichenzuordnung, OS/2, fvar und OpenType-Tags; kein automatischer Lesbarkeits- oder Lizenzrechtsentscheid.',
            'families':[inspect_family(f) for f in catalogue['families']]}

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', action='store_true', help='Regenerate data/typografie-fontaudit.json from local files.')
    parser.add_argument('--catalogue-coverage', action='store_true', help='Print the catalogue with measured Unicode coverage; does not write files.')
    parser.add_argument('--prefer-complete-files', action='store_true', help='Use already available full original files instead of character subsets; requires --catalogue-coverage.')
    args = parser.parse_args()
    if args.prefer_complete_files and not args.catalogue_coverage:
        parser.error('--prefer-complete-files requires --catalogue-coverage')
    report = json.dumps(catalogue_coverage(args.prefer_complete_files) if args.catalogue_coverage else build(), ensure_ascii=False, indent=2) + '\n'
    if args.catalogue_coverage:
        print(report, end='')
        raise SystemExit(0)
    if args.output:
        (ROOT / 'data/typografie-fontaudit.json').write_text(report)
        print('Updated local font audit.')
    else:
        print(report, end='')
