"""Verify full editable font embedding and restrained typography in all eight DOCX."""
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET
from html.parser import HTMLParser
from uuid import UUID
from hashlib import sha256
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
                    files={'Regular':'SourceSans3-Regular.otf','Bold':'SourceSans3-Bold.otf',
                           'Italic':'SourceSans3-It.otf','BoldItalic':'SourceSans3-BoldIt.otf'} if modern else {
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
        for path in p.paths:self.assertTrue((ROOT/path.split('#')[0].split('?')[0]).exists(),path)
        for base in NAMES:
            for suffix in ['','-modern']:
                self.assertIn('downloads/typografie/'+base+suffix+'.docx',p.paths)

if __name__=='__main__':unittest.main()
