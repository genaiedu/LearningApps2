"""Build the local font catalogue and licensed font packages from Google Fonts.

Run with the bundled workspace Python. Network is build-time only, never runtime.
Original upstream TTFs are preserved; WOFF2 conversion does not alter outlines.
"""
from pathlib import Path
from urllib.request import Request, urlopen
from concurrent.futures import ThreadPoolExecutor
from fontTools.ttLib import TTFont
import argparse, hashlib, json, re, zipfile

ROOT = Path(__file__).resolve().parents[1]
SIBLING = ROOT.parent / 'LearningApps'
DEST = ROOT / 'fonts' / 'typografie'
FAMILIES = [
    ('Poppins','poppins','sans','Geometrische Sans','Große, fast kreisförmige Formen. Für Überschriften und kurze Absätze; dicht gesetzte lange Texte sorgfältig prüfen.'),
    ('Outfit','outfit','sans','Geometrische Sans','Ein ruhiger geometrischer Begleiter für Navigation, Zahlen und moderne Überschriften.'),
    ('Bangers','bangers','display','Comic / Display','Lebendige Comic-Stimme. Für wenige große Wörter, nicht für Erklärtexte.'),
    ('Zilla Slab','zillaslab','serif','Slab Serif','Kräftige, blockartige Serifen. Gibt Zwischenüberschriften und Zitaten eine stabile Kontur.'),
    ('Lora','lora','serif','Zeitgenössische Text-Antiqua','Kalligrafisch beeinflusste Formen mit deutlichen Serifen. Für Artikel und erzählende Texte.'),
    ('Montserrat','montserrat','sans','Geometrische Sans','An urbaner Beschriftung orientiert. Prägnante Titel; breite Buchstaben brauchen Raum.'),
    ('DM Mono','dmmono','mono','Monospace','Alle Zeichen haben dieselbe Laufweite. Nützlich für Code, nicht mit Tabellenziffern einer Proportionalschrift verwechseln.'),
    ('Oswald','oswald','sans','Schmale Grotesk','Schmal und aufrecht. Gut für kurze plakative Titel; nicht bloß eine künstlich gestauchte Schrift.'),
    ('Righteous','righteous','display','Geometrische Display','Markante Rundungen und geschlossene Formen. Als Akzent, nicht als neutrale Leseschrift.'),
    ('Bebas Neue','bebasneue','display','Schmale Versal-Display','Titelstimme mit Versalcharakter. Kleine Fließtexte verlieren die Wortbilder von Kleinbuchstaben.'),
    ('Dancing Script','dancingscript','script','Verbundene Schreibschrift','Verbundene Buchstaben und schwungvoller Rhythmus. Für kurze persönliche Zeilen; nicht sperren.'),
    ('DM Sans','dmsans','sans','Zeitgenössische Sans','Zurückhaltende Formen für Oberflächen und Artikel. Im kleinen Grad Abstand und Zeilenhöhe prüfen.'),
    ('Plus Jakarta Sans','plusjakartasans','sans','Geometrische Sans','Breite, klare Formen. Funktioniert in Überschriften und strukturierten Benutzeroberflächen.'),
    ('Forum','forum','serif','Display-Antiqua','Schmale, klassisch wirkende Formen. Elegant für kurze Titel; nur ein vorhandener Schnitt.'),
    ('Caveat','caveat','script','Handschrift','Unregelmäßiger, handschriftlicher Rhythmus. Nicht jede Handschrift verbindet alle Buchstaben.'),
    ('Nunito','nunito','sans','Gerundete Sans','Weiche Endungen. Freundliche Oberfläche, ohne daraus eine automatische Empfehlung für jede Zielgruppe abzuleiten.'),
    ('Inter','inter','sans','UI-Sans','Für Bildschirmoberflächen entwickelt. Deutliche Kleinbuchstaben und flexible Gewichte.'),
    ('Archivo Black','archivoblack','display','Schwere Display-Grotesk','Sehr kräftiger Titelschnitt. Nicht für ganze Seiten in kleiner Schrift gedacht.'),
    ('Cardo','cardo','serif','Renaissance-inspirierte Antiqua','Buchschrift nach historischen Vorbildern, mit umfangreichem Zeichenvorrat. Kein exaktes Modell einer venezianischen Jenson-Schrift.'),
    ('EB Garamond','ebgaramond','serif','Französische Renaissance-Antiqua','Garamond-inspirierte Buchschrift mit echten Kursiven und OpenType-Funktionen. Gut für differenzierte Satzproben.'),
    ('Libre Bodoni','librebodoni','serif','Klassizistische Antiqua / Didone','Starker Strichkontrast und feine Serifen. Große Grade betonen die Eleganz; kleine Grade auf schwachen Displays testen.'),
    ('Source Sans 3','sourcesans3','sans','Humanistische Sans','Offene Formen und humanistischer Rhythmus. Für Erklärtexte, Navigation und Tabellen.'),
    ('Libre Baskerville','librebaskerville','serif','Barocke Antiqua / Transitional','Baskerville-inspirierte Interpretation für Bildschirmtext. Mehr Strichkontrast und aufrechtere Formen als viele Renaissance-Antiqua-Schriften.'),
    ('Goudy Bookletter 1911','goudybookletter1911','serif','Venezianisch geprägte Renaissance-Antiqua','Nach Frederic Goudys Kennerley Oldstyle: schräge e-Querlinie, geringer Strichkontrast und schräg betonte Rundungen. Eine moderne Interpretation, keine originale Jenson-Drucktype. Ein echter Regular-Schnitt; kein mitgelieferter Bold oder Italic.'),
]
SLUGS = {'Zilla Slab':'zilla-slab','DM Mono':'dm-mono','Bebas Neue':'bebas-neue','Dancing Script':'dancing-script','DM Sans':'dm-sans','Plus Jakarta Sans':'plus-jakarta-sans','Archivo Black':'archivo-black'}
NEW = {'cardo','ebgaramond','librebodoni','sourcesans3','librebaskerville','goudybookletter1911'}
RAW = 'https://raw.githubusercontent.com/google/fonts/main/ofl/'

def get(url):
    with urlopen(Request(url, headers={'User-Agent':'LearningApps-Typografie-build'}),timeout=60) as r:
        return r.read()

def build_family(row):
    name, directory, group, classification, advice = row
    base = RAW + directory + '/'
    metadata = get(base+'METADATA.pb').decode()
    license_bytes = get(base+'OFL.txt')
    folder = DEST / directory
    folder.mkdir(parents=True,exist_ok=True)
    (folder/'OFL.txt').write_bytes(license_bytes)
    (folder/'METADATA.pb').write_text(metadata)
    designer = re.search(r'^designer: "([^"]+)"',metadata,re.M).group(1)
    entry = dict(name=name,id=directory,group=group,classification=classification,advice=advice,designer=designer,license='SIL OFL 1.1',source='https://github.com/google/fonts/tree/main/ofl/'+directory,licensePath='fonts/typografie/'+directory+'/OFL.txt',files=[],uses=[])
    if directory in NEW:
        files = list(dict.fromkeys(re.findall(r'filename: "([^"]+\.ttf)"',metadata)))
        for filename in files:
            content = get(base+filename.replace('[','%5B').replace(']','%5D'))
            (folder/filename).write_bytes(content)
            font = TTFont(folder/filename)
            entry['features']=sorted(set(entry.get('features',[]))|({r.FeatureTag for r in font['GSUB'].table.FeatureList.FeatureRecord} if 'GSUB' in font else set()))
            italic = bool(font['head'].macStyle & 2) or 'Italic' in filename
            axes = {a.axisTag:[a.minValue,a.maxValue] for a in font['fvar'].axes} if 'fvar' in font else {}
            weight = axes.get('wght',font['OS/2'].usWeightClass)
            out = filename.removesuffix('.ttf')+'.woff2'
            font.flavor='woff2'; font.save(folder/out)
            entry['files'].append(dict(path='fonts/typografie/'+directory+'/'+out,weight=weight,style='italic' if italic else 'normal',axes=axes,sha256=hashlib.sha256(content).hexdigest()))
        desktop_files=files+['OFL.txt','METADATA.pb']
        extra_note=''
        if directory=='goudybookletter1911':
            extra_note='Goudy Bookletter 1911 enthält einen echten Regular-Schnitt (400), keine eigenen Bold- oder Italic-Schnitte. Nicht künstlich fett oder kursiv als weitere Original-Schnitte ausgeben.\nGestaltung: Barry Schwartz, nach Frederic Goudys Kennerley Oldstyle.\n'
        if directory=='sourcesans3':
            # The Google Fonts family is also published by its original maintainer.
            # Full static OTFs avoid variable-font compatibility issues in Word.
            upstream='https://raw.githubusercontent.com/adobe-fonts/source-sans/release/'
            (folder/'static').mkdir(exist_ok=True)
            static_names=['SourceSans3-Regular.otf','SourceSans3-Bold.otf','SourceSans3-It.otf','SourceSans3-BoldIt.otf']
            for filename in static_names:
                (folder/'static'/filename).write_bytes(get(upstream+'OTF/'+filename))
            (folder/'static'/'LICENSE.txt').write_bytes(get(upstream+'LICENSE.md'))
            desktop_files += ['static/'+f for f in static_names+['LICENSE.txt']]
            entry['desktopStatic']={'source':'https://github.com/adobe-fonts/source-sans/tree/release/OTF','files':['fonts/typografie/sourcesans3/static/'+f for f in static_names],'licensePath':'fonts/typografie/sourcesans3/static/LICENSE.txt'}
            extra_note='Zusätzlich: vollständige statische Original-OTFs von Adobe, dem ursprünglichen freien Source-Sans-Projekt (kein Adobe-Abo erforderlich). Für die modernen Wordvorlagen verwendet. Quelle: '+entry['desktopStatic']['source']+'\nDie statischen und variablen Fassungen nicht gleichzeitig installieren. Für Word bei Kompatibilitätsproblemen die Dateien im Unterordner static verwenden. Lizenz: static/LICENSE.txt.\n'
        with zipfile.ZipFile(folder/(directory+'-desktop.zip'),'w',zipfile.ZIP_DEFLATED) as archive:
            for filename in desktop_files:
                archive.write(folder/filename, directory+'/'+filename)
            archive.writestr(directory+'/INSTALLATION.txt', 'Originale TTF-Dateien aus dem offiziellen Google-Fonts-Repository.\nMac: ZIP entpacken, TTF/OTF doppelklicken, in Schriftsammlung installieren. Word neu starten.\nWindows: ZIP entpacken, TTF/OTF rechtsklicken > Installieren. Word neu starten.\nVariable Dateien enthalten mehrere Gewichte; bei älteren Programmen die Kompatibilität prüfen.\nKeine WOFF2-Dateien installieren. Vorlagen verändern keine installierten Systemschriften.\nLizenz und Copyright: beiliegende OFL.txt.\nQuelle: '+entry['source']+'\n'+extra_note)
        entry['desktop']='fonts/typografie/'+directory+'/'+directory+'-desktop.zip'
        entry['new']=True
    else:
        slug = SLUGS.get(name,name.lower())
        for path in sorted((SIBLING/'fonts').glob(slug+'-v*-latin-*.woff2')):
            suffix=path.stem.split('-latin-')[1]
            entry['files'].append(dict(path='../LearningApps/fonts/'+path.name,weight=400 if suffix=='regular' else int(suffix),style='normal',axes={}))
            font=TTFont(path)
            entry['features']=sorted(set(entry.get('features',[]))|({r.FeatureTag for r in font['GSUB'].table.FeatureList.FeatureRecord} if 'GSUB' in font else set()))
        if not entry['files']: raise RuntimeError('No existing font '+name)
        entry['new']=False
    return entry

def main(selected=None):
    DEST.mkdir(parents=True,exist_ok=True)
    rows=[row for row in FAMILIES if selected is None or row[1] in selected]
    if selected and set(selected)-{row[1] for row in rows}:
        raise ValueError('Unknown font family')
    catalogue_path=ROOT/'data'/'typografie-fonts.json'
    previous=json.loads(catalogue_path.read_text()) if selected else None
    with ThreadPoolExecutor(max_workers=5) as pool:
        updated=list(pool.map(build_family,rows))
    if previous:
        by_id={entry['id']:entry for entry in previous['families']}
        by_id.update({entry['id']:entry for entry in updated})
        entries=[by_id[row[1]] for row in FAMILIES]
    else:
        entries=updated
    # Report direct source references, not an assertion about rendered glyphs.
    for repo in [SIBLING,ROOT]:
        for path in sorted(repo.rglob('*')):
            if path.suffix not in {'.html','.css'} or any(p in {'tmp','vendor','node_modules','.git','fonts'} for p in path.parts): continue
            if 'typografie' in path.name: continue
            text=path.read_text(errors='replace')
            for entry in updated:
                if any(Path(f['path']).name in text for f in entry['files']):
                    rel=str(path.relative_to(repo))
                    entry['uses'].append(dict(repo=repo.name,path=rel,url='https://genaiedu.github.io/'+repo.name+'/'+rel))
    out={'checked':'2026-10-09','families':entries,'existingFamilies':sum(not e['new'] for e in entries),'existingFiles':sum(len(e['files']) for e in entries if not e['new']),'method':'Direkte Dateinamen-Referenzen in HTML/CSS; kein Laufzeit-Nachweis. MathJax, Icon- und Schachfonts sind keine Textschriftfamilien dieses Katalogs.'}
    (ROOT/'data'/'typografie-fonts.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
    css=[]
    for e in entries:
        for f in e['files']:
            # CSS resides one level below the app, so relative paths gain ../.
            weight=' '.join(str(int(w)) for w in f['weight']) if isinstance(f['weight'],list) else str(f['weight'])
            css.append('@font-face{font-family:"'+e['name']+'";src:url("../'+f['path']+'") format("woff2");font-weight:'+weight+';font-style:'+f['style']+';font-display:swap;}')
    (ROOT/'styles'/'typografie-fonts.css').write_text('\n'.join(css)+'\n')
    print(f"Catalogue: {len(entries)} families, {out['existingFamilies']} existing / {out['existingFiles']} existing WOFF2 files, {len(NEW)} new licensed desktop packages.")

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--family',action='append',help='Update only this family; preserve all other existing font assets and metadata.')
    main(parser.parse_args().family)
