"""Extract unchanged glyphs and measured terminal edges for the font-space study.

Edges are explicitly selected from the outlines, not invented glyph decorations.
Generate locally with the bundled Python and FontTools; no runtime font parser.
"""
from pathlib import Path
import json, hashlib
from fontTools.ttLib import TTFont
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen

ROOT=Path(__file__).resolve().parents[1]
IDS={'poppins','abel','sourcesans3','belleza','limelight','breeserif','robotoslab','podkova','ebgaramond','librebodoni'}
CHARACTERS='HOagcefrst'

def extract(entry):
    candidates=[f for f in entry['files'] if f['style']=='normal']
    def distance(f):
        weight=f['weight']
        return 0 if isinstance(weight,list) and weight[0]<=400<=weight[1] else abs((weight[0] if isinstance(weight,list) else weight)-400)
    source=min(candidates,key=distance)
    path=ROOT/source['path'];font=TTFont(path)
    axes={a.axisTag:a.defaultValue for a in font['fvar'].axes} if 'fvar' in font else {}
    if 'wght' in axes:axes['wght']=400
    glyphset=font.getGlyphSet(location=axes or None);cmap=font.getBestCmap();glyphs={}
    for character in CHARACTERS:
        glyph=glyphset[cmap[ord(character)]]
        bounds=BoundsPen(glyphset);glyph.draw(bounds)
        pen=SVGPathPen(glyphset);glyph.draw(pen)
        glyphs[character]={'bounds':list(bounds.bounds),'advance':glyph.width,'path':pen.getCommands()}
    return {'id':entry['id'],'name':entry['name'],'source':source['path'],'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
            'axes':axes,'copyright':font['name'].getDebugName(0),'license':entry['license'],'licensePath':entry['licensePath'],
            'fontProject':entry['source'],'glyphs':glyphs}

def main():
    catalogue=json.loads((ROOT/'data/typografie-fonts.json').read_text())
    data={'checked':'2026-10-10','method':'Unveränderte Konturen aus den tatsächlich verwendeten lokalen Webfonts, Gewicht 400; weitere Achsen auf Standardwert. Die Markierungen benennen einzelne Originalkanten, keine ganzen Schriftfamilien.',
          'families':[extract(e) for e in catalogue['families'] if e['id'] in IDS]}
    (ROOT/'data/typografie-schriftenraum.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    print('Font space:',len(data['families']),'families; actual glyph outlines extracted.')

if __name__=='__main__':main()
