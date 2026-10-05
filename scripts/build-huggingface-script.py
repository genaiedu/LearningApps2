"""Create the downloadable speaker script from the same source as the web slides."""
import json
from html import escape
from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, KeepTogether

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / "huggingface-fall-data.js").read_text().split("=", 1)[1].strip().removesuffix(";"))
font_options = [
    ("/System/Library/Fonts/Supplemental/Arial.ttf", "/System/Library/Fonts/Supplemental/Arial Bold.ttf"),
    ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
]
regular, bold = next(pair for pair in font_options if all(Path(p).exists() for p in pair))
pdfmetrics.registerFont(TTFont("Script", regular))
pdfmetrics.registerFont(TTFont("ScriptBold", bold))
pdfmetrics.registerFontFamily("Script", normal="Script", bold="ScriptBold", italic="Script", boldItalic="ScriptBold")
ink, blue = colors.HexColor("#192c43"), colors.HexColor("#236855")
styles = {
    "title": ParagraphStyle("title", fontName="ScriptBold", fontSize=22, leading=26, textColor=ink, spaceAfter=12),
    "label": ParagraphStyle("label", fontName="ScriptBold", fontSize=10, leading=14, textColor=blue, spaceAfter=10),
    "body": ParagraphStyle("body", fontName="Script", fontSize=10.5, leading=15.2, textColor=ink, spaceAfter=12),
    "small": ParagraphStyle("small", fontName="Script", fontSize=9, leading=13, textColor=ink, spaceAfter=7),
    "question": ParagraphStyle("question", fontName="ScriptBold", fontSize=12, leading=16, textColor=ink, spaceAfter=12, keepWithNext=True),
    "deep_body": ParagraphStyle("deep_body", fontName="Script", fontSize=10.5, leading=14, textColor=ink, spaceAfter=9),
}
def clean(text):
    return escape(text.replace("–", "-").replace("—", "-").replace("‑", "-"))
def p(text, style="body"):
    return Paragraph(clean(text), styles[style])
out = ROOT / "output/pdf/huggingface-fall-begleitskript.pdf"
out.parent.mkdir(parents=True, exist_ok=True)
doc = SimpleDocTemplate(str(out), pagesize=A4, rightMargin=46, leftMargin=46, topMargin=52, bottomMargin=45,
    title="Der Hugging-Face-Fall - Vortragsskript", author="Claus Unterberg")
story = [p("DER HUGGING-FACE-FALL", "label"), p("Vortragsskript zur animierten Fallgeschichte", "title"),
    p(f"{len(data['slides'])} Folien mit schrittweisen Szenen. Stand: " + data["date"]),
    p("So passt der Vortrag zum Bild", "label"),
    p(data["slides"][0]["transitionNote"], "small"),
    p("Weiter zeigt zunächst den nächsten Aufbau und erst nach dem letzten Aufbau die nächste Folie. Die farbige Regiezeile beschreibt das Bild, darunter steht der passende Sprechtext. Neue Agenten erscheinen zuerst groß mit ihrer Kennung und einem kurzen Tätigkeits-Sticker. Beim Weitergehen schrumpfen sie an ihren Platz. Im abschließenden Organigramm werden die Porträts mit ihren Aufgaben wiederholt."),
    p("Der HTML-Auftakt wartet auf Start; Vollbild und Einstellungen bleiben davor zugänglich. Pause und Fortsetzen verändern die Filmposition nicht. Gegen Ende entsteht bereits die echte Titelfolie im selben Bildbereich. Szene abspielen zeigt gewöhnliche Folien im Abstand von vier Sekunden und stoppt am Ende. Die HTML-Animation zur Aufarbeitung und die Quintessenz halten jeweils in vier Etappen an. Nach der Entdeckung bleibt die Ansicht stehen. Erst Schwarm auflösen startet die sechssekündige symbolische Flucht. Pause und Fortsetzen sind möglich; auch ihr Schlussbild wartet auf den nächsten Klick. Weiter startet jeweils die nächste Etappe. Die Zusatzmaterialien bleiben die letzte Folie. Für einen begleitenden Vortrag empfiehlt sich das manuelle Weitergehen. Der Schalter für reduzierte Bewegung ändert keine Inhalte. Die Folienübersicht erlaubt direkte Sprünge."),
    p("Die wichtigsten Klarstellungen sind in den Sprechtext eingearbeitet. Vertiefung bei Nachfragen bietet unmittelbar bei der passenden Folie zusätzliche Erläuterungen. Diese optionalen Abschnitte müssen nicht mit vorgetragen werden. Die Fragen aus dem begleitenden Gespräch sind nur sprachlich bereinigt; einen getrennten Frage-Antwort-Anhang gibt es nicht.", "small"),
    p("Zeit und Darstellung", "label"),
    p("Alle Kalenderdaten beziehen sich auf 2026. Uhrzeiten aus der METR-Rekonstruktion sind UTC. Im deutschen Sommer liegt die Ortszeit zwei Stunden später. Berichtszeiten werden nicht stillschweigend in Ortszeit umgerechnet."),
    p("Kennungen wie PHASEONE10841 oder LILY stammen aus den Protokollen. Die Farben und Figuren sind grafische Erzählmittel. Organigramme zeigen schematische, situationsabhängige Arbeitsverteilung, keine vollständige oder dauerhaft feste Befehlshierarchie. Wo wir Gruppen zusammenfassen, entsprechen ihre Figuren keiner gezählten Anzahl realer Instanzen."),
    p("Digitale Signaturen sichern die Zuordnung einer Nachricht zu einem Schlüssel. Sie verschlüsseln ihren Inhalt nicht. Die Agenten nutzen vorhandene Kryptografie und entwickeln ein Verfahren für ihr Nachrichtenbrett, keinen neuen kryptografischen Algorithmus."),
    p("Konzeption und Bereitstellung: Claus Unterberg", "small")]
for i, s in enumerate(data["slides"]):
    story.append(PageBreak())
    story.extend([p(f"FOLIE {i+1:02d} / {len(data['slides'])}   ·   {s['chapter']}", "label"), p(s["title"], "title"), p(s["date"] + " · 2026", "label"), p(s["lead"])])
    for j, text in enumerate(s["notes"]):
        # Split long sequences into balanced script pages.
        if j and len(s["notes"]) > 4 and j % 3 == 0:
            story.extend([PageBreak(), p(f"FOLIE {i+1:02d} / {len(data['slides'])} · Fortsetzung", "label"), p(s["title"], "title")])
        block = [p(f"AUFBAU {j+1} / BILD: " + s["cues"][j], "label")]
        for milestone in s.get("population", []):
            if milestone["step"] == j:
                info = data["populations"][milestone["phase"]]
                block.append(p("Größenordnung: " + info["label"] + " / " + info["scope"] + ". " + info["detail"] + " Quelle: METR / Redwood. Silhouetten symbolisch, nicht ein Vogel pro Agent.", "small"))
        for q in s.get("quotes", []):
            if q["step"] == j:
                block.extend([p(q["speaker"] + " / " + q["kind"], "small"), p("EN: " + q["en"], "small"), p("DE (eigene Übersetzung): " + q["de"], "small")])
        block.append(p(text))
        if j == len(s["notes"]) - 1:
            ids = list(dict.fromkeys(s["sources"] + (["metr"] if s.get("population") else [])))
            block.append(p("Quellen: " + (", ".join(f"[{next(k+1 for k, x in enumerate(data['sources']) if x['id']==sid)}]" for sid in ids) if ids else "Eigene didaktische Einordnung."), "small"))
        story.append(KeepTogether(block))
    for item in s.get("deepDives", []):
        story.extend([PageBreak(),
                      p(f"FOLIE {i+1:02d} / {len(data['slides'])} · VERTIEFUNG BEI NACHFRAGEN", "label"),
                      p(s["title"], "title"),
                      p(f"Passend zu Aufbau {item['step']+1}. Optionales Hintergrundwissen, kein zusätzlicher Folienaufbau.", "small"),
                      p(item["question"], "question")])
        story.extend(p(text, "deep_body") for text in item["answer"])
        if item.get("note"):
            story.append(p(item["note"], "small"))
        links = []
        for sid in item["sources"]:
            source = data["speakerSources"][sid]
            links.append('<link href="' + escape(source["url"], quote=True) + '" color="#236855">' + clean(source["name"]) + '</link>')
        story.append(Paragraph("Quellen / Einordnung: " + "<br/>".join(links), styles["small"]))
story.extend([PageBreak(), p("Quellen und Nutzung", "title"), p("Stand: " + data["date"] + ". Die Darstellung fasst die Originalberichte für ein allgemeines Publikum zusammen. Animationen und sinngemäße Aussagen sind keine Originalaufnahmen. Das Skript enthält keine ausführbaren Angriffsschritte.")])
for i, source in enumerate(data["sources"]):
    story.append(p(f"[{i+1}] {source['name']} - {source['date']}", "label"))
    story.append(p(source["scope"]))
    url = source["url"]
    story.append(Paragraph('<link href="' + escape(url, quote=True) + '" color="#236855">' + escape(url) + "</link>", styles["small"]))
    story.append(Spacer(1, 12))
story.append(p("Hinweis zur Quellenkritik: Berichte unterscheiden sich in Perspektive und Untersuchungsumfang. Spätere Erkenntnisse können die Rekonstruktion ergänzen. Betreiberangaben werden als solche kenntlich gemacht. Die Fallgeschichte ist keine Aussage über sämtliche heutigen KI-Systeme."))
story.append(p("Konzeption und Bereitstellung: Claus Unterberg. Erzähltext und grafische Vereinfachungen sind für diese Präsentation formuliert. Es werden keine erfundenen Dialoge als Originalzitate ausgegeben."))
def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#ccd4df"))
    canvas.line(46, 34, A4[0]-46, 34)
    canvas.setFont("Script", 8)
    canvas.setFillColor(ink)
    canvas.drawString(46, 22, "KI verstehen / Begleitskript / " + data["date"])
    canvas.drawRightString(A4[0]-46, 22, str(doc.page))
    canvas.restoreState()
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(out)
