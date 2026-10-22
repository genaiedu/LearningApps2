"""Set the shared teaching content as two real, independently typeset PDFs."""
import argparse
import json
import re
import subprocess
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.units import mm
from reportlab.platypus import BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, PageBreak, KeepTogether, Flowable

parser = argparse.ArgumentParser()
parser.add_argument('--node', default='node')
args = parser.parse_args()
ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = ROOT.parent
V = json.loads(subprocess.check_output([args.node, '-e', 'process.stdout.write(JSON.stringify(require(process.argv[1])))', str(ROOT/'scripts/kohelet-inhalte.js')], text=True))
OUT = WORKSPACE/'output/pdf'
MATERIAL = ROOT/'material/kohelet'
OUT.mkdir(parents=True, exist_ok=True)
MATERIAL.mkdir(parents=True, exist_ok=True)
fonts = ROOT/'fonts/typografie'
for name, file in [('Fira','firasans/FiraSans-Regular.ttf'),('FiraBold','firasans/FiraSans-Bold.ttf'),('FiraItalic','firasans/FiraSans-Italic.ttf'),('GaramondItalic','ebgaramond/static/EBGaramond-Italic.ttf')]:
    pdfmetrics.registerFont(TTFont(name, str(fonts/file)))
pdfmetrics.registerFontFamily('Fira', normal='Fira', bold='FiraBold', italic='FiraItalic', boldItalic='FiraBold')
INK = colors.HexColor('#2c2d2c')
BLUE = colors.HexColor('#245ca8')
MUTED = colors.HexColor('#5d615e')
LINE = colors.HexColor('#c6ccc5')
styles = {
    'body': ParagraphStyle('body', fontName='Fira', fontSize=11.4, leading=17.1, textColor=INK, alignment=TA_LEFT, spaceAfter=10, allowWidows=0, allowOrphans=0),
    'small': ParagraphStyle('small', fontName='Fira', fontSize=9, leading=13.4, textColor=MUTED, spaceAfter=9),
    'label': ParagraphStyle('label', fontName='FiraBold', fontSize=9, leading=12, textColor=BLUE, spaceAfter=13, keepWithNext=True),
    'title': ParagraphStyle('title', fontName='FiraBold', fontSize=31, leading=35, textColor=INK, spaceAfter=13, keepWithNext=True),
    'subtitle': ParagraphStyle('subtitle', fontName='GaramondItalic', fontSize=28, leading=31, textColor=BLUE, spaceAfter=24, keepWithNext=True),
    'heading': ParagraphStyle('heading', fontName='FiraBold', fontSize=18, leading=22, textColor=INK, spaceBefore=14, spaceAfter=14, keepWithNext=True),
    'taskheading': ParagraphStyle('taskheading', fontName='FiraBold', fontSize=19, leading=23, textColor=INK, spaceAfter=16, keepWithNext=True),
    'subheading': ParagraphStyle('subheading', fontName='FiraBold', fontSize=11.4, leading=17, textColor=INK, spaceBefore=8, spaceAfter=9, keepWithNext=True),
}
def txt(s):
    return escape(str(s).replace('–','-').replace('—','-').replace('\u2011','-'))
def p(s, style='body'):
    return Paragraph(txt(s), styles[style])
def footer(canvas, doc):
    canvas.saveState()
    x = 17.5*mm if doc.page % 2 else 35*mm
    canvas.setStrokeColor(LINE)
    canvas.line(x, 276*mm, x+157.5*mm, 276*mm)
    canvas.setFont('Fira', 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(x, 280.5*mm, 'KOHELET & GREGOR · '+doc.subject)
    canvas.drawRightString(x+157.5*mm, 35*mm, str(doc.page))
    canvas.restoreState()
def document(target, title, subject, story):
    doc = BaseDocTemplate(str(target), pagesize=(210*mm,297*mm), title=title, author='LearningApps · Claus Unterberg', subject=subject)
    odd = Frame(17.5*mm,49.5*mm,157.5*mm,222.75*mm,leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0)
    even = Frame(35*mm,49.5*mm,157.5*mm,222.75*mm,leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0)
    doc.addPageTemplates([PageTemplate(id='odd',frames=[odd],onPage=footer,autoNextPageTemplate='even'),PageTemplate(id='even',frames=[even],onPage=footer,autoNextPageTemplate='odd')])
    doc.build(story)
    return target.read_bytes()
def source_notes(ids):
    out=[]
    for id in ids:
        source=next(s for s in V['sources'] if s['id']==id)
        out.append(Paragraph(f'<link href="{escape(source["url"], {chr(34): "&quot;"})}" color="#245ca8">{txt(source["title"])}</link>',styles['small']))
    return out

story=[p('RELIGION · BEGLEITTEXT','label'),p('Was bleibt?','title'),p('Kohelet und Gregor im Gespräch','subtitle'),p('Zwei Originale, unterschiedliche Auslegungen und die Frage nach ihrer Bedeutung heute.'),p('Ein eigener redaktioneller Gesprächsvorschlag mit Quellen. Die vollständigen Übersetzungen stehen in getrennten Textausgaben. Die deutschen Übersetzungen sind KI-Arbeitsfassungen ohne unabhängige philologische Abnahme.','small'),PageBreak()]
for section in V['essay']:
    story.append(p(section['title'],'heading'))
    story.extend(p(text) for text in section['paras'][:-1])
    story.append(KeepTogether([p(section['paras'][-1]),*source_notes(section['sources'])]))
story.extend([PageBreak(),p('Quellen und Einordnung','heading')])
for source in V['sources']:
    entry=[p(source['title'],'subheading'),p(source['note'],'small')]
    # Short clickable reference instead of a long, poorly breaking URL.
    entry.append(Paragraph(f'<link href="{escape(source["url"], {chr(34): "&quot;"})}" color="#245ca8">Quelle online öffnen</link>',styles['small']))
    story.append(KeepTogether(entry))
essay_target=OUT/'kohelet-gregor-begleittext.pdf'
MATERIAL.joinpath('begleittext.pdf').write_bytes(document(essay_target,'Kohelet und Gregor · Begleittext','Begleittext',story))
essay_text='Kohelet und Gregor · Was bleibt?\n\nRedaktioneller Begleittext. Eigene KI-Arbeitsübersetzungen ohne unabhängige philologische Abnahme.\n\n'
for section in V['essay']:
    essay_text+=section['title']+'\n\n'+'\n\n'.join(section['paras'])+'\n\n'
    for id in section['sources']:
        s=next(s for s in V['sources'] if s['id']==id)
        essay_text+=s['title']+'\n'+s['url']+'\n'
    essay_text+='\n'
MATERIAL.joinpath('begleittext.txt').write_text(essay_text.rstrip()+'\n',encoding='utf8')

# Slightly closer task spacing keeps an entire assignment together, including
# its final checklist; the font size and DIV12 text rectangle stay unchanged.
styles['small'].leading=12.4
styles['small'].spaceAfter=6
styles['body'].leading=16.6
styles['body'].spaceAfter=8
styles['subheading'].spaceBefore=6
styles['subheading'].spaceAfter=7
story=[p('RELIGION · TEXTARBEIT','label'),p('Mit dem Text denken','title'),p('Sechzehn Arbeitsaufträge','subtitle'),p('Kohelet vollständig und Gregors acht Homilien sind die Textgrundlage. Wähle Aufträge mit deiner Lehrkraft oder folge den vier Lernwegen: genau lesen, Übersetzungen vergleichen, Auslegungen prüfen und ins Gespräch bringen.'),p('Arbeitsregel','subheading'),p('Unterscheide Beobachtung, Deutung und heutiges Urteil. Belege mit Koheletversen oder der jeweiligen Homilie. Rekonstruiere eine Position fair, prüfe einen Einwand und benenne verbleibende Fragen.'),p('Persönliche Angaben zu deinem Glauben oder deinen Erfahrungen sind nicht erforderlich. Die freie Textarbeit hat keine einzige vorgeschriebene Mustermeinung.','small'),p('Textausgaben und App','subheading'),Paragraph('<link href="https://genaiedu.github.io/LearningApps2/kohelet-gregor.html" color="#245ca8">genaiedu.github.io/LearningApps2/kohelet-gregor.html</link>', styles['body']),p('Die Arbeitsübersetzungen wurden mit KI erarbeitet und noch nicht unabhängig philologisch abgenommen. Jüdisches Buch, christliche Rezeption und heutige Perspektiven bleiben unterscheidbar.','small')]
tasks_text='Kohelet und Gregor · Arbeitsaufträge\n\n'
for i, task in enumerate(V['tasks'],1):
    story.extend([PageBreak(),p(f'{i:02d} / '+next(path['title'] for path in V['paths'] if path['id']==task['path']),'label'),p(task['title'],'taskheading'),p(task['time']+' · Einzelarbeit, dann Austausch','small'),p('Textgrundlage','subheading'),p(' · '.join(t['label'] for t in task['texts']))])
    supp=V['supplements'].get(task.get('supplement',''))
    if supp:
        story.extend([p(supp['title'],'subheading'),p(supp['text'],'small')]);story.extend(source_notes(supp['sources']))
    if task.get('essay'):
        section=next(s for s in V['essay'] if s['id']==task['essay'])
        story.append(p('Zusätzlich: Begleittext, Abschnitt „'+section['title']+'“.','small'))
    story.append(p('Arbeitsweg','subheading'))
    for n, step in enumerate(task['steps'],1):
        story.append(p(f'{n}. {step}'))
    story.extend([p('Dein Ergebnis','subheading'),p(task['product']),p('Hilfe bei Bedarf','subheading'),p(task['hint'],'small'),p('Vor dem Abschließen prüfen','subheading')])
    story.extend(p('- '+check,'small') for check in task['checks'])
    tasks_text+=str(i)+'. '+task['title']+'\n\nTextgrundlage: '+' · '.join(t['label'] for t in task['texts'])+'\n\n'
    if supp:tasks_text+=supp['title']+'\n'+supp['text']+'\n\n'
    tasks_text+='\n'.join(f'{n}. {step}' for n,step in enumerate(task['steps'],1))+'\n\nErgebnis: '+task['product']+'\n\nHilfe: '+task['hint']+'\n\nPrüfen:\n'+'\n'.join('- '+c for c in task['checks'])+'\n\n'
task_target=OUT/'kohelet-gregor-arbeitsauftraege.pdf'
MATERIAL.joinpath('arbeitsauftraege.pdf').write_bytes(document(task_target,'Kohelet und Gregor · Arbeitsaufträge','Arbeitsaufträge',story))
MATERIAL.joinpath('arbeitsauftraege.txt').write_text(tasks_text.rstrip()+'\n',encoding='utf8')
print(json.dumps({'begleittext':str(essay_target),'arbeitsauftraege':str(task_target),'tasks':len(V['tasks']),'essaySections':len(V['essay'])},ensure_ascii=False))
