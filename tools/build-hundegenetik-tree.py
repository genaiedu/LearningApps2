"""Extract the published geometry, NOT an invented or newly inferred phylogeny.

Input: Parker et al. 2017, Cell Reports, Fig. 1, PDF page 3, CC BY 4.0.
Usage: python build-hundegenetik-tree.py /path/to/Parker_etal_2017.pdf
Requires PyMuPDF. Outputs vectors and a search index for the PDF's live labels.
"""
from pathlib import Path
import sys, json, math, html
import pymupdf as fitz

root = Path(__file__).resolve().parents[1]
page = fitz.open(sys.argv[1])[2]
box = fitz.Rect(50, 70, 555, 515)
center = (307, 302)
def rgb(c):
    return '#' + ''.join(f'{round(x*255):02x}' for x in c) if c else 'none'
def xy(p):
    return f'{p.x:.4f},{p.y:.4f}'
drawings = [d for d in page.get_drawings() if box.contains(d['rect'])]
colored = [d for d in drawings if d['color'] and max(d['color'])-min(d['color']) > .04]
colors = sorted(set(rgb(d['color']) for d in colored))
palette = {c: f'group-{i}' for i,c in enumerate(colors)}
def group_for(rect):
    cx,cy = (rect[0]+rect[2])/2, (rect[1]+rect[3])/2
    def dist(d):
        r=d['rect'];return math.hypot(cx-(r.x0+r.x1)/2,cy-(r.y0+r.y1)/2)
    return palette[rgb(min(colored,key=dist)['color'])]

parts=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="50 70 505 445" role="img" aria-labelledby="tree-svg-title tree-svg-desc">',
 '<title id="tree-svg-title">Genetische Verwandtschaft von 161 Hunderassen</title>',
 '<desc id="tree-svg-desc">Interaktive Adaption der unveränderten Verzweigungsgeometrie aus Parker und Mitarbeitenden, 2017, Abbildung 1. Keine Zeitachse und kein vollständiger historischer Stammbaum.</desc>']
bounds={g:[9999,9999,-9999,-9999] for g in palette.values()}
for d in drawings:
    commands=[];end=None
    for item in d['items']:
        kind=item[0]
        if kind in ('l','c'):
            start=item[1]
            if end is None or abs(end.x-start.x)+abs(end.y-start.y)>.001:commands.append('M'+xy(start))
            if kind=='l':commands.append('L'+xy(item[2]));end=item[2]
            else:commands.append('C'+ ' '.join(xy(p) for p in item[2:]));end=item[-1]
        elif kind=='re':
            r=item[1];commands.append(f'M{r.x0},{r.y0}H{r.x1}V{r.y1}H{r.x0}Z');end=None
        elif kind=='qu':
            q=item[1];commands.append('M'+xy(q.ul)+'L'+xy(q.ur)+'L'+xy(q.lr)+'L'+xy(q.ll)+'Z');end=None
    if d.get('closePath'):commands.append('Z')
    stroke,fill=rgb(d.get('color')),rgb(d.get('fill'))
    r=d['rect'];radius=math.hypot((r.x0+r.x1)/2-center[0],(r.y0+r.y1)/2-center[1])
    colorful_fill=d.get('fill') and max(d['fill'])-min(d['fill'])>.04 and max(r.width,r.height)>4
    is_color=stroke in palette or fill in palette or colorful_fill
    group=palette[stroke] if stroke in palette else (palette[fill] if fill in palette else group_for(r))
    # Original filled letters lie on the perimeter; bootstrap stars are small and internal.
    kind='branches' if is_color or fill=='none' else ('confidence' if max(r.width,r.height)<4 and radius<153 else 'labels')
    if is_color:
        b=bounds[group];b[0]=min(b[0],r.x0);b[1]=min(b[1],r.y0);b[2]=max(b[2],r.x1);b[3]=max(b[3],r.y1)
    parts.append(f'<path class="tree-{kind}" data-group="{group}" d="{" ".join(commands)}" fill="{fill}" stroke="{stroke}" stroke-width="{(d.get("width") or .5):.3f}" stroke-linejoin="round"/>')

labels=[]
for block in page.get_text('dict')['blocks']:
    for line in block.get('lines',[]):
        r=line['bbox']
        if not box.contains(fitz.Rect(r)):continue
        name=''.join(s['text'] for s in line['spans']).strip()
        if len(name)<3 or name.startswith('='):continue
        group=group_for(r)
        idx=len(labels)
        labels.append(dict(id=f'label-{idx}',name=name,box=[round(n,3) for n in r],group=group))
        parts.append(f'<g class="tree-labels tree-live-label" data-label="label-{idx}" data-group="{group}">')
        angle=math.degrees(math.atan2(line['dir'][1],line['dir'][0]))
        for span in line['spans']:
            x,y=span['origin'];text=html.escape(span['text'])
            parts.append(f'<text x="{x:.3f}" y="{y:.3f}" transform="rotate({angle:.4f} {x:.3f} {y:.3f})" fill="#202020" font-family="Arial,sans-serif" font-size="{span["size"]:.4f}">{text}</text>')
        parts.append('</g>')
parts.append('</svg>')
asset=root/'assets/hundegenetik';asset.mkdir(parents=True,exist_ok=True)
(asset/'parker-2017.svg').write_text('\n'.join(parts),encoding='utf-8')
(root/'data/hundegenetik-tree.json').write_text(json.dumps(dict(source='https://doi.org/10.1016/j.celrep.2017.03.079',license='CC BY 4.0',bounds=list(box),labels=labels,groups=[dict(id=g,color=c,box=[round(x,3) for x in bounds[g]]) for c,g in palette.items()],note='Geometrie aus Abb. 1 extrahiert; nicht neu berechnet. Suchindex enthält die maschinenlesbaren Beschriftungen des Original-PDFs.'),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
page.get_pixmap(matrix=fitz.Matrix(2,2),clip=box).save('/private/tmp/hundegenetik-tree-source.png')
print(f'{len(drawings)} Vektorelemente, {len(labels)} maschinenlesbare Beschriftungen, {len(colors)} Originalfarben')
