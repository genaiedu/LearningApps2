"""Verify full editable font embedding and restrained typography in all eight DOCX."""
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET
from html.parser import HTMLParser
from uuid import UUID
from hashlib import sha256
from urllib.parse import unquote, urlsplit
import json
import posixpath
import unittest

ROOT = Path(__file__).resolve().parents[1]
NS = {'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
      'r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
W = '{'+NS['w']+'}'
R = '{'+NS['r']+'}'
NAMES = ['brief-a4','kurzbericht-a4','einladung-a4','ergebnisprotokoll-a4']

class Links(HTMLParser):
    def __init__(self):
        super().__init__(); self.ids=[]; self.paths=[]; self.anchors=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:self.ids.append(a['id'])
        for k in ['href','src']:
            v=a.get(k,'')
            if v.startswith('#'):self.anchors.append(v[1:])
            elif v and not v.startswith(('https:','http:','mailto:','data:')):self.paths.append(v)

class Templates(unittest.TestCase):
    def test_archived_originals_preserved_but_downloads_link_to_google(self):
        data=json.loads((ROOT/'data'/'typografie-fonts.json').read_text())
        self.assertEqual(len(data['families']),30)
        html=(ROOT/'typografie-atelier.html').read_text()
        with ZipFile(ROOT/data['desktopCollection']) as collection:
            self.assertIsNone(collection.testzip())
            self.assertIn('LIES-MICH.txt',collection.namelist())
            for font in data['families']:
                with self.subTest(font=font['name']), ZipFile(ROOT/font['desktop']) as z:
                    self.assertIsNone(z.testzip())
                    self.assertNotIn('href="'+font['desktop']+'"',html)
                    self.assertIn('https://fonts.google.com/specimen/'+font['name'].replace(' ','+'),html)
                    prefix=font['id']+'/'
                    license_name=Path(font['licensePath']).name
                    self.assertIn('Apache License' if font['id']=='robotoslab' else 'SIL OPEN FONT LICENSE',z.read(prefix+license_name).decode())
                    instructions=z.read(prefix+'INSTALLATION.txt').decode()
                    self.assertIn('Mac:',instructions)
                    self.assertIn('Windows:',instructions)
                    ttf=[n for n in z.namelist() if n.endswith('.ttf')]
                    self.assertTrue(ttf)
                    self.assertFalse(any(n.endswith('.woff2') for n in z.namelist()))
                    for name in z.namelist():
                        self.assertEqual(collection.read(name),z.read(name))
                        if name.endswith(('.ttf','.otf')):
                            self.assertEqual((ROOT/'fonts'/'typografie'/name).read_bytes(),z.read(name))
                            self.assertIn(z.read(name)[:4],[b'\x00\x01\x00\x00',b'OTTO'])
                    for original in font.get('desktopFiles',[]):
                        self.assertEqual(sha256((ROOT/original['path']).read_bytes()).hexdigest(),original['sha256'])
            self.assertEqual(len({n.split('/')[0] for n in collection.namelist() if '/' in n}),30)

    def test_goudy_desktop_package(self):
        data=json.loads((ROOT/'data'/'typografie-fonts.json').read_text())
        font=next(f for f in data['families'] if f['id']=='goudybookletter1911')
        folder=ROOT/'fonts'/'typografie'/'goudybookletter1911'
        original=(folder/'GoudyBookletter1911.ttf').read_bytes()
        self.assertEqual(sha256(original).hexdigest(),font['files'][0]['sha256'])
        with ZipFile(ROOT/font['desktop']) as z:
            self.assertEqual(z.testzip(),None)
            self.assertEqual(z.read('goudybookletter1911/GoudyBookletter1911.ttf'),original)
            self.assertIn('SIL OPEN FONT LICENSE',z.read('goudybookletter1911/OFL.txt').decode())
            instructions=z.read('goudybookletter1911/INSTALLATION.txt').decode()
            for wording in ['Mac:','Windows:','Regular-Schnitt','keine eigenen Bold- oder Italic-Schnitte']:
                self.assertIn(wording,instructions)

    def test_all_eight(self):
        for base in NAMES:
            for modern in [False,True]:
                name=base+('-modern' if modern else '')
                with self.subTest(document=name), ZipFile(ROOT/'downloads'/'typografie'/(name+'.docx')) as z:
                    family='Source Sans 3' if modern else 'Cardo'
                    folder=ROOT/'fonts'/'typografie'/('sourcesans3/static' if modern else 'cardo')
                    files={'Regular':'SourceSans3-Regular.ttf','Bold':'SourceSans3-Bold.ttf',
                           'Italic':'SourceSans3-It.ttf','BoldItalic':'SourceSans3-BoldIt.ttf'} if modern else {
                           'Regular':'Cardo-Regular.ttf','Bold':'Cardo-Bold.ttf','Italic':'Cardo-Italic.ttf'}
                    table=ET.fromstring(z.read('word/fontTable.xml'))
                    font=next(f for f in table.findall('w:font',NS) if f.get(W+'name')==family)
                    rels={r.get('Id'):r.get('Target') for r in ET.fromstring(z.read('word/_rels/fontTable.xml.rels'))}
                    for variant,original in files.items():
                        e=font.find('w:embed'+variant,NS); self.assertIsNotNone(e)
                        self.assertEqual(e.get(W+'subsetted'),'0')
                        target=posixpath.normpath(posixpath.join('word',rels[e.get(R+'id')]))
                        data=bytearray(z.read(target))
                        key=UUID(e.get(W+'fontKey').strip('{}')).bytes[::-1]
                        for i in range(32):data[i]^=key[i%16]
                        self.assertEqual(sha256(data).digest(),sha256((folder/original).read_bytes()).digest())
                        if modern:
                            # Browser compatibility: static TrueType contours, not CFF or VF.
                            from struct import unpack_from
                            tags={bytes(data[12+i*16:16+i*16]) for i in range(unpack_from('>H',data,4)[0])}
                            self.assertEqual(data[:4],b'\x00\x01\x00\x00')
                            self.assertIn(b'glyf',tags);self.assertNotIn(b'CFF ',tags);self.assertNotIn(b'fvar',tags)
                    settings=ET.fromstring(z.read('word/settings.xml'))
                    self.assertEqual(len(settings.findall('w:embedTrueTypeFonts',NS)),1)
                    license_path='customXml/'+family.lower().replace(' ','')+'-license.xml'
                    self.assertIn('SIL OPEN FONT LICENSE',ET.fromstring(z.read(license_path)).text.upper())
                    doc=ET.fromstring(z.read('word/document.xml'))
                    size=doc.find('.//w:pgSz',NS)
                    self.assertAlmostEqual(int(size.get(W+'w')),11906,delta=1)
                    self.assertAlmostEqual(int(size.get(W+'h')),16838,delta=1)
                    styles=ET.fromstring(z.read('word/styles.xml'))
                    for style_id in ['Normal','Heading1','Heading2']:
                        st=next(s for s in styles.findall('w:style',NS) if s.get(W+'styleId')==style_id)
                        self.assertEqual(st.find('w:rPr/w:sz',NS).get(W+'val'),'24')
                        self.assertEqual(st.find('w:rPr/w:rFonts',NS).get(W+'ascii'),family)
                    self.assertFalse(doc.findall('.//w:pBdr',NS))
                    self.assertFalse(any(n.endswith('vbaProject.bin') for n in z.namelist()))
                    self.assertFalse(any(r.get('TargetMode')=='External' for r in ET.fromstring(z.read('word/_rels/document.xml.rels'))))

    def test_app_links_and_ids(self):
        p=Links();p.feed((ROOT/'typografie-atelier.html').read_text())
        self.assertEqual(len(p.ids),len(set(p.ids)))
        for anchor in p.anchors:self.assertIn(anchor,p.ids)
        for path in p.paths:self.assertTrue((ROOT/unquote(urlsplit(path).path)).exists(),path)
        for base in NAMES:
            for suffix in ['','-modern']:
                self.assertIn('downloads/typografie/'+base+suffix+'.docx',p.paths)

    def test_browser_previews_match_the_exact_documents_and_every_page_exists(self):
        from struct import unpack
        documents=json.loads((ROOT/'data/typografie-document-previews.json').read_text())['documents']
        self.assertEqual(set(documents),{base+suffix for base in NAMES for suffix in ['', '-modern']})
        hashes=set()
        for name,entry in documents.items():
            with self.subTest(document=name):
                source=ROOT/entry['download']
                self.assertEqual(entry['download'],'downloads/typografie/'+name+'.docx')
                self.assertEqual(entry['sourceSha256'],sha256(source.read_bytes()).hexdigest())
                self.assertTrue(entry['text']);self.assertTrue(entry['pages'])
                with ZipFile(source) as z:
                    body=ET.fromstring(z.read('word/document.xml')).find('w:body',NS)
                    paragraphs=[]
                    for paragraph in body.findall('w:p',NS):
                        text=''.join(e.text or '' if e.tag==W+'t' else '\n' if e.tag==W+'br' else '\t' if e.tag==W+'tab' else '' for e in paragraph.iter())
                        if text.strip():paragraphs.append(text)
                    self.assertEqual(entry['text'],paragraphs)
                for index,page in enumerate(entry['pages'],1):
                    self.assertEqual(page['src'],f'downloads/typografie/vorschau/{name}-{index}.png')
                    data=(ROOT/page['src']).read_bytes()
                    self.assertEqual(data[:8],b'\x89PNG\r\n\x1a\n')
                    self.assertEqual(unpack('>II',data[16:24]),(page['width'],page['height']))
                    self.assertGreater(page['width'],1400)
                    self.assertAlmostEqual(page['width']/page['height'],210/297,delta=.002)
                    self.assertEqual(page['sha256'],sha256(data).hexdigest());hashes.add(page['sha256'])
        self.assertEqual(len(hashes),8)

if __name__=='__main__':unittest.main()
