"""Build original A4 page studies, outlined SVGs and a font-self-contained offline lab.

The shared JS scene description is the source for every preview and export.
FontTools and ReportLab use only existing, locally licensed fonts.
"""
from pathlib import Path
import argparse
import base64
import json
import math
import subprocess
import tempfile
import zipfile
from html import escape
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont as RLFont
from reportlab.lib.colors import HexColor
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen

ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'downloads'/'typografie'/'seitenstudien'
NODE='/Users/clausunterberg/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node'
JS=ROOT/'scripts'/'typografie-seite-core.js'
W,H=210*72/25.4,297*72/25.4
CODE="const P=require(process.argv[1]);console.log(JSON.stringify({studies:P.studies,sources:P.sources,pages:P.studies.map(s=>P.scene(s))}));"
FONTS={}

def init_fonts(tmp):
    paths={'serif':ROOT/'fonts/typografie/cardo/Cardo-Regular.ttf'}
    source=ROOT/'fonts/typografie/sourcesans3/SourceSans3[wght].ttf'
    for key,weight in [('sans',400),('bold',700)]:
        original=TTFont(source)
        assert original['OS/2'].fsType==0, 'Embedding must be permitted'
        static=instantiateVariableFont(original,{'wght':weight},inplace=False)
        path=tmp/(key+'.ttf');static.save(path);paths[key]=path
    for name,path in paths.items():
        f=TTFont(path);assert f['OS/2'].fsType==0
        FONTS[name]=f;pdfmetrics.registerFont(RLFont(name,str(path)))

def draw_ops(c,ops):
    for n in ops:
        c.saveState()
        if n['kind']=='group':
            c.transform(*n['matrix']);draw_ops(c,n['children'])
        elif n['kind']=='rect':
            c.setFillColor(HexColor(n['color']));c.rect(n['x'],n['y'],n['w'],n['h'],fill=1,stroke=0)
        elif n['kind']=='line':
            c.setStrokeColor(HexColor(n['color']));c.setLineWidth(n['width'])
            if n.get('dash'):c.setDash(*map(float,n['dash'].split()))
            c.line(n['x1'],n['y1'],n['x2'],n['y2'])
        elif n['kind']=='text':
            width=pdfmetrics.stringWidth(n['text'],n['font'],n['size'])
            x=n['x']-(width/2 if n.get('anchor')=='middle' else 0)
            c.translate(x,n['y']);c.scale(1,-1)
            c.setFillColor(HexColor(n['color']));c.setFont(n['font'],n['size']);c.drawString(0,0,n['text'])
        c.restoreState()

def draw_page(c,page,x=0,y=0,scale=1):
    c.saveState();c.translate(x,H-y);c.scale(scale,-scale)
    # A page really ends at its edge. Study 18 deliberately bleeds the title.
    p=c.beginPath();p.rect(0,0,W,H);c.clipPath(p,stroke=0)
    draw_ops(c,page['ops']);c.restoreState()

def svg_ops(ops):
    out=[]
    for n in ops:
        if n['kind']=='group':out.append('<g transform="matrix('+ ' '.join(str(v) for v in n['matrix'])+')">'+svg_ops(n['children'])+'</g>')
        elif n['kind']=='rect':out.append(f'<rect x="{n["x"]}" y="{n["y"]}" width="{n["w"]}" height="{n["h"]}" fill="{n["color"]}"/>')
        elif n['kind']=='line':out.append(f'<path d="M{n["x1"]},{n["y1"]} L{n["x2"]},{n["y2"]}" stroke="{n["color"]}" stroke-width="{n["width"]}"'+(f' stroke-dasharray="{n["dash"]}"' if n.get('dash') else '')+'/>')
        else:
            f=FONTS[n['font']];gs=f.getGlyphSet();cmap=f.getBestCmap();upem=f['head'].unitsPerEm
            width=sum(f['hmtx'][cmap[ord(ch)]][0] for ch in n['text'])
            scale=n['size']/upem
            x=n['x']-(width*scale/2 if n.get('anchor')=='middle' else 0)
            paths=[];advance=0
            for ch in n['text']:
                name=cmap[ord(ch)];pen=SVGPathPen(gs);gs[name].draw(pen);d=pen.getCommands()
                if d:paths.append(f'<path transform="translate({advance} 0)" d="{d}"/>')
                advance+=f['hmtx'][name][0]
            out.append(f'<g fill="{n["color"]}" transform="translate({x} {n["y"]}) scale({scale} {-scale})" aria-label="{escape(n["text"],quote=True)}">'+''.join(paths)+'</g>')
    return ''.join(out)

def write_svg(page,path):
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 {W} {H}" role="img" aria-label="{escape(page["title"],quote=True)}"><title>{escape(page["title"])}</title><desc>Eigene DIN-A4-Gestaltungsstudie. Buchstaben als Vektorpfade, keine externen Fonts.</desc>'+svg_ops(page['ops'])+'</svg>'
    path.write_text(svg,encoding='utf-8')

def text(c,s,x,y,size=12,font='sans',color='#202823'):
    c.setFillColor(HexColor(color));c.setFont(font,size);c.drawString(x,H-y,s)

def paragraph(c,s,x,y,width=490,size=12,leading=18,font='sans'):
    words=s.split();line=''
    for word in words:
        candidate=(line+' '+word).strip()
        if line and pdfmetrics.stringWidth(candidate,font,size)>width:
            text(c,line,x,y,size,font);y+=leading;line=word
        else:line=candidate
    if line:text(c,line,x,y,size,font);y+=leading
    return y

def footer(c,num):text(c,'TYPOGRAFIE-ATELIER / DIE SEITE',52,808,9);text(c,str(num),W-70,808,10)

GUIDES=[
  ('Richtung und Eingriff',[
    ('Eine Aufgabe für jede Ebene','Ein langer Absatz braucht eine verlässliche Leserichtung. Ein kurzer Plakattitel darf dagegen unterbrechen. Halte Datum, Ort, Namen und Anweisungen vollständig lesbar.'),
    ('Randklammer','Eine um 90 Grad gedrehte Zeile kann neben mehreren waagerechten Absätzen ein gemeinsames Thema markieren. Abstand und eine begrenzte Farbe verbinden die Bereiche.'),
    ('Scheren oder drehen','Scherung verzerrt Zeichen auf einer waagerechten Grundlinie. Sie ist kein echter kursiver Schriftschnitt. Drehung kippt Zeichen und Grundlinie gemeinsam; die einzelnen Formen bleiben unverzerrt.'),
    ('Banderole','Die deckende Fläche kann eine Aussage sichtbar zurückweisen. Hier ist der verdeckte Text erfunden. Bei realen Quellen braucht es korrekte Zuschreibung und einen Zugang zum vollständigen Text.'),
    ('Prüfen','Beobachte deine eigene Reaktion. Kopfneigen ist eine mögliche Wirkung, keine garantierte Reaktion jedes Lesers. Frage eine zweite Person, ohne ihr vorher den vorgesehenen Blickweg zu erklären.')]),
  ('Farbe und Lesbarkeit',[
    ('Buchstaben oder Fläche','Farbige Schrift setzt einen Akzent an den Zeichen. Schrift in einem Farbfeld erzeugt eine zusammengehörige Zone und ein größeres visuelles Gewicht. Beides ist nicht austauschbar.'),
    ('Positiv und negativ','Ein kurzer kräftiger Titel auf dunklem Grund kann funktionieren, während ein feiner kleiner Absatz dort schwerer zu lesen ist. Bildschirmexperimente sind keine Druckvorschriften; Papier und Verfahren verlangen eigene Proben.'),
    ('Hell und dunkel','Stark unterschiedliche Farbtöne können ähnliche Helligkeit haben. Reiner Farbkontrast ersetzt keine Hell-Dunkel-Trennung. Die Graustufenprobe ist keine Simulation jeder Farbsehschwäche.'),
    ('Messung','WCAG AA verwendet für gewöhnlichen Webtext 4,5:1, für große Webschrift 3:1. Groß bedeutet 18 pt oder 14 pt fett. Das ist eine Farbteilprüfung für sRGB, keine Drucknorm oder vollständige Qualitätsprüfung.'),
    ('Farbe auf Farbe','Viele spontane Kombinationen misslingen. Zwei farbige Komponenten können aber gut lesbar sein, wenn ihre Helligkeiten weit genug auseinanderliegen. Dunkelblau auf einem sehr hellen warmen Grund ist das Gegenbeispiel zum pauschalen Verbot.')]),
  ('Komposition der Seite',[
    ('Mittelachse','Eine mittelsymmetrische Seite und ein zentrierter Absatz sind verschiedene Entscheidungen. Ein mittig platzierter Textblock kann innen linksbündig sein.'),
    ('Goldener Schnitt','Das Ganze verhält sich zum größeren Teil wie der größere zum kleineren. Ungefähr 61,8 zu 38,2 Prozent teilen hier die Nutzbreite, nicht die Papierbreite. Das Verhältnis ist ein Werkzeug, kein Schönheitsbeweis.'),
    ('Verschiedene Konstruktionen','DIN A4 besitzt das Verhältnis 1 zu Wurzel 2, nicht 1 zu 1,618. Die Neunteilung des klassischen Satzspiegels ist nicht automatisch der Goldene Schnitt.'),
    ('Asymmetrie und Raster','Ungleichheit kann optisch ausgewogen sein. Gemeinsame Kanten und wiederkehrende Abstände geben Halt. Ein Raster ist eine Hilfskonstruktion, nicht der sichtbare Inhalt.'),
    ('Frei, nicht zufällig','Auch ein angeschnittener Titel braucht eine lesbare Aufgabe. Prüfe die Hauptaussage aus der Entfernung, die Gebrauchsinformation aus der Nähe und die Ordnung ohne Konstruktionslinien.')])
]

def booklet(payload):
    c=canvas.Canvas(str(DEST/'studienheft-die-seite.pdf'),pagesize=(W,H),pageCompression=1,invariant=1)
    c.setTitle('Die Seite - 18 kommentierte Gestaltungsstudien');c.setAuthor('Typografie-Atelier')
    text(c,'TEIL II / TYPOGRAFIE-ATELIER',52,75,11)
    text(c,'Die Seite',52,260,54,'serif');text(c,'18 Gestaltungsstudien',52,319,27,'serif')
    paragraph(c,'Richtung, Farbe und Seitenraum: eigene Entwürfe zum Vergleichen, Begründen und Weiterdenken.',52,404,430,15,23)
    paragraph(c,'Die Einzeldateien haben echtes DIN-A4-Format. Dieses Studienheft zeigt verkleinerte Muster mit Erläuterungen. Bewusste Gegenbeispiele sind keine Gestaltungsempfehlungen.',52,551,440,12,19)
    paragraph(c,'PDF mit eingebetteten Schriftuntergruppen. SVG mit Buchstaben als Vektorpfade. Offline-Werkstatt mit lokal eingebetteten Fonts. Keine Museumsbilder und keine externen Fontverbindungen.',52,643,440,12,19)
    text(c,'Stand 10. Oktober 2026',52,753,11);footer(c,1);c.showPage();num=2
    for title,blocks in GUIDES:
        text(c,title,52,94,29,'serif');y=153
        for heading,body in blocks:
            text(c,heading,52,y,13,'bold');y+=26;y=paragraph(c,body,52,y,490,12,18)+24
        assert y<790,(title,y);footer(c,num);c.showPage();num+=1
    for study,page in zip(payload['studies'],payload['pages']):
        text(c,study['id'].split('-')[0]+' / '+study['title'],52,43,12,'bold')
        draw_page(c,page,(W-W*.6)/2,73,.6)
        text(c,'Verkleinerte Probe 60 % - Einzeldatei in DIN A4',52,597,9)
        y=paragraph(c,study['note'],52,638,490,12,18)+17
        text(c,'Vergleichsfrage',52,y,12,'bold');y=paragraph(c,study['task'],52,y+24,490,12,18)
        assert y<791,(study['id'],y);footer(c,num);c.showPage();num+=1
    text(c,'Quellen und Arbeitsweise',52,90,30,'serif');y=150
    for title,url in payload['sources']:
        y=paragraph(c,title,52,y,490,12,18,'bold')
        # A readable, clickable shortened label avoids breaking very long URLs.
        text(c,'Originalveröffentlichung öffnen',52,y,11,'sans','#142f4f')
        c.linkURL(url,(52,H-y-3,230,H-y+12),relative=0,thickness=0);y+=48
    paragraph(c,'Alle Gestaltungsstudien sind eigene Lehrentwürfe. Die Quellen dienen der historischen Einordnung, der Plakatstrategien, der Kontrastprüfung und der Bildschirmforschung. Es wurden keine Abbildungen aus den Veröffentlichungen übernommen.',52,y+15,490,12,18)
    footer(c,num);c.save()

def offline(payload):
    fontcss=''
    for family,path,weight in [('Cardo','cardo/Cardo-Regular.woff2','400'),('Source Sans 3','sourcesans3/SourceSans3[wght].woff2','200 900')]:
        data=base64.b64encode((ROOT/'fonts/typografie'/path).read_bytes()).decode()
        fontcss+=f'@font-face{{font-family:"{family}";src:url(data:font/woff2;base64,{data}) format("woff2");font-weight:{weight};font-style:normal;font-display:swap;}}'
    licenses='\n\n'.join((ROOT/'fonts/typografie'/folder/'OFL.txt').read_text() for folder in ['cardo','sourcesans3'])
    html='''<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Die Seite - Offline-Werkstatt</title><style>FONT_CSS
*{box-sizing:border-box}body{margin:0;background:#f5f1e8;color:#202823;font:18px/1.6 "Source Sans 3",sans-serif;padding:40px}main{max-width:1150px;margin:auto}h1{font:400 56px/1.1 Cardo,serif}h2{font-size:24px}label{display:block;margin:15px 0}select,button{font:inherit;background:#fffaf0;color:#202823;border:1px solid #7b857c;padding:10px}button{cursor:pointer}input{accent-color:#a83424}article{display:grid;grid-template-columns:1fr 1fr;gap:50px;margin-top:40px}.proof{aspect-ratio:210/297;box-shadow:0 18px 35px #20282325}.proof svg{width:100%;height:100%;display:block}details{margin-top:30px}pre{white-space:pre-wrap;font:13px/1.6 monospace}a{color:inherit}#status{font-weight:600}@media(max-width:760px){body{padding:22px}h1{font-size:43px}article{grid-template-columns:1fr;gap:25px}}@media print{body{padding:0}header,.controls,.explanation,details{display:none}article{display:block;margin:0}.proof{box-shadow:none;width:210mm;height:297mm}@page{size:A4;margin:0}}
article>div{min-width:0}select{display:block;width:100%;max-width:100%;margin-top:8px}button{max-width:100%;margin-bottom:8px}pre,a{overflow-wrap:anywhere}
</style><main><header><p>TYPOGRAFIE-ATELIER / TEIL II</p><h1>Die Seite</h1><p>18 eigene DIN-A4-Studien. Diese Datei enthält ihre Schriftdateien und benötigt keine Internetverbindung. Einige Studien zeigen bewusst misslungene Entscheidungen. Quellenlinks werden erst beim Anklicken geöffnet.</p></header><article><div class="controls"><label>Gestaltungsstudie<select id="choice"></select></label><label><input id="gray" type="checkbox"> Graustufenvergleich</label><label><input id="guides" type="checkbox"> Konstruktionslinien</label><button id="reset">Ausgangspunkte wiederherstellen</button><button id="print">Diese Studie drucken</button><p id="status"></p><div class="explanation"><h2 id="name"></h2><p id="note"></p><h2>Vergleichsfrage</h2><p id="task"></p><p>Der Druck zeigt nur die gewählte Musterseite. Im Druckdialog A4, keine zusätzlichen Kopfzeilen und 100 % wählen. Farbflächen benötigen gegebenenfalls die Freigabe für Hintergrundgrafiken. Ein randloser Entwurf bleibt von den Möglichkeiten deines Druckers abhängig.</p></div></div><div class="proof" id="proof"></div></article><details><summary>Veröffentlichungen und Fontlizenzen</summary><ul id="sources"></ul><pre>LICENSES</pre></details></main><script>CORE_JS</script><script>
const P=TypoPage,S=STUDIES,C=document.getElementById('choice');S.forEach(s=>{const o=document.createElement('option');o.value=s.id;o.textContent=s.id.slice(0,2)+' · '+s.title;C.append(o)});function update(){const s=S.find(s=>s.id===C.value);document.getElementById('proof').innerHTML=P.svg(P.scene(s,{gray:document.getElementById('gray').checked,guides:document.getElementById('guides').checked}));for(const k of ['name','note','task'])document.getElementById(k).textContent=s[k==='name'?'title':k];document.getElementById('status').textContent=s.mode==='bad'?'Bewusstes Gegenbeispiel: zu wenig Helligkeitskontrast.':'';}for(const id of ['choice','gray','guides'])document.getElementById(id).addEventListener('input',update);document.getElementById('reset').onclick=()=>{C.value=S[0].id;document.getElementById('gray').checked=false;document.getElementById('guides').checked=false;update()};document.getElementById('print').onclick=()=>window.print();P.sources.forEach(([title,url])=>{const li=document.createElement('li'),a=document.createElement('a');a.textContent=title;a.href=url;a.target='_blank';a.rel='noopener noreferrer';li.append(a);document.getElementById('sources').append(li)});update();
</script></html>'''
    html=html.replace('FONT_CSS',fontcss).replace('LICENSES',escape(licenses)).replace('CORE_JS',JS.read_text().replace('</script','<\\/script')).replace('STUDIES',json.dumps(payload['studies'],ensure_ascii=False))
    (DEST/'seitenstudien-offline.html').write_text(html,encoding='utf-8')

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--node',default=NODE);args=parser.parse_args()
    payload=json.loads(subprocess.check_output([args.node,'-e',CODE,str(JS)],text=True));DEST.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='typografie-seitenfonts-') as tmp:
        init_fonts(Path(tmp))
        for page in payload['pages']:
            c=canvas.Canvas(str(DEST/(page['id']+'.pdf')),pagesize=(W,H),pageCompression=1,invariant=1);c.setTitle(page['title']);c.setAuthor('Typografie-Atelier');draw_page(c,page);c.showPage();c.save();write_svg(page,DEST/(page['id']+'.svg'))
        booklet(payload);offline(payload)
    for folder in ['cardo','sourcesans3']:(DEST/(folder+'-OFL.txt')).write_text((ROOT/'fonts/typografie'/folder/'OFL.txt').read_text())
    with zipfile.ZipFile(DEST/'seitenstudien-18-pdf-svg.zip','w',zipfile.ZIP_DEFLATED) as z:
        paths=[DEST/(p['id']+'.'+ext) for p in payload['pages'] for ext in ['pdf','svg']]+[DEST/'studienheft-die-seite.pdf',DEST/'seitenstudien-offline.html',DEST/'cardo-OFL.txt',DEST/'sourcesans3-OFL.txt']
        for path in paths:z.write(path,path.name)
    print(json.dumps({'studies':len(payload['pages']),'pdfs':19,'svg':18,'offline':1,'destination':str(DEST)},ensure_ascii=False))

if __name__=='__main__':main()
