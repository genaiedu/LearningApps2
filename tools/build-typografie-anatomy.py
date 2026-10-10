"""Extract accurate outline diagrams from the actual local webfont files.

No network, font modification, invented line percentages, or desktop-font substitutes.
The illustration is the unhinted outline at weight 400 (other axes at defaults).
"""
from pathlib import Path
from hashlib import sha256
import json
from fontTools.ttLib import TTFont
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen

ROOT = Path(__file__).resolve().parents[1]
ILLUSTRATED = {'ebgaramond','goudybookletter1911','cardo','librebaskerville',
               'librebodoni','sourcesans3','inter','lora','poppins'}
CHARACTERS = 'abgpxHoO'

def extract(entry):
    candidates = [f for f in entry['files'] if f['style'] == 'normal']
    def distance(file):
        weight=file['weight']
        return 0 if isinstance(weight,list) and weight[0] <= 400 <= weight[1] else abs((weight[0] if isinstance(weight,list) else weight)-400)
    source=min(candidates,key=distance)
    path=ROOT/source['path']
    font=TTFont(path)
    axes={a.axisTag:a.defaultValue for a in font['fvar'].axes} if 'fvar' in font else {}
    if 'wght' in axes:axes['wght']=400
    glyphset=font.getGlyphSet(location=axes or None)
    cmap=font.getBestCmap()
    glyphs={}
    for character in CHARACTERS:
        glyph=glyphset[cmap[ord(character)]]
        bounds=BoundsPen(glyphset);glyph.draw(bounds)
        record={'bounds':list(bounds.bounds),'advance':glyph.width}
        if entry['id'] in ILLUSTRATED:
            outline=SVGPathPen(glyphset);glyph.draw(outline)
            record['path']=outline.getCommands()
        glyphs[character]=record
    result={'id':entry['id'],'name':entry['name'],'source':source['path'],
            'license':entry['license'],'licensePath':entry['licensePath'],
            'fontProject':entry['source'],'copyright':font['name'].getDebugName(0),
            'sha256':sha256(path.read_bytes()).hexdigest(),
            'unitsPerEm':font['head'].unitsPerEm,'axes':axes,'glyphs':glyphs}
    font.close()
    return result

def main():
    catalogue=json.loads((ROOT/'data/typografie-fonts.json').read_text())
    data={'checked':'2026-10-10','method':'Konturen aus lokalen WOFF2-Dateien; Regular / Gewicht 400, weitere variable Achsen auf Standardwert. Grundlinie = Fontkoordinate 0; Höhenmarken = Konturgrenzen der jeweils genannten Zeichen. Keine Fontdatei verändert.',
          'families':[extract(entry) for entry in catalogue['families']]}
    (ROOT/'data/typografie-anatomy.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    print('Measured',len(data['families']),'local fonts;',len(ILLUSTRATED),'outline illustrations.')

if __name__=='__main__':main()
