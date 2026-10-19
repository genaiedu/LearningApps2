"""New school examples: exact geometry, full real font embedding and ragged data blocks."""
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as E
from uuid import UUID
import hashlib,json,posixpath,struct,subprocess,unittest
ROOT=Path(__file__).resolve().parents[1]
NS={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
W='{'+NS['w']+'}';R='{'+NS['r']+'}'
BASES=['brief','kurzbericht','einladung','ergebnisprotokoll','arbeitsblatt','elternbrief']

class Examples(unittest.TestCase):
    def test_all_twelve(self):
        previews=json.loads((ROOT/'data/typografie-document-previews.json').read_text())['documents']
        for base in BASES:
            for modern in [False,True]:
                name=base+'-a4-zw12'+('-modern' if modern else '')
                target=ROOT/'downloads/typografie'/(name+'.docx')
                with self.subTest(name=name),ZipFile(target) as z:
                    self.assertEqual(previews[name]['sourceSha256'],hashlib.sha256(target.read_bytes()).hexdigest())
                    document=E.fromstring(z.read('word/document.xml'))
                    styles=E.fromstring(z.read('word/styles.xml'))
                    sty={s.get(W+'styleId'):s for s in styles.findall('w:style',NS)}
                    body='Fira Sans' if modern else 'EB Garamond'
                    self.assertEqual(sty['Normal'].find('w:rPr/w:rFonts',NS).get(W+'ascii'),body)
                    self.assertEqual(sty['Metadaten'].find('w:rPr/w:rFonts',NS).get(W+'ascii'),'Fira Sans')
                    self.assertEqual(sty['Metadaten'].find('w:pPr/w:jc',NS).get(W+'val'),'left')
                    section=document.find('.//w:sectPr',NS)
                    margins=section.find('w:pgMar',NS)
                    spread=base in ['kurzbericht','ergebnisprotokoll']
                    for side,mm in {'top':24.75,'bottom':49.5,'left':17.5 if spread else 26.25,'right':35 if spread else 26.25}.items():
                        self.assertAlmostEqual(int(margins.get(W+side)),mm*1440/25.4,delta=1)
                    settings=E.fromstring(z.read('word/settings.xml'))
                    self.assertEqual(settings.find('w:mirrorMargins',NS) is not None,spread)
                    fonts=E.fromstring(z.read('word/fontTable.xml'))
                    self.assertEqual({f.get(W+'name') for f in fonts},{'EB Garamond','Fira Sans'})
                    relations={r.get('Id'):r.get('Target') for r in E.fromstring(z.read('word/_rels/fontTable.xml.rels'))}
                    for font in fonts:
                        family=font.get(W+'name');prefix='EBGaramond' if family=='EB Garamond' else 'FiraSans'
                        folder=ROOT/'fonts/typografie'/('ebgaramond/static' if family=='EB Garamond' else 'firasans')
                        for cut in ['Regular','Italic','Bold','BoldItalic']:
                            embed=font.find('w:embed'+cut,NS);self.assertIsNotNone(embed)
                            payload=bytearray(z.read(posixpath.normpath(posixpath.join('word',relations[embed.get(R+'id')]))))
                            key=UUID(embed.get(W+'fontKey').strip('{}')).bytes[::-1]
                            for i in range(32):payload[i]^=key[i%16]
                            self.assertEqual(payload,(folder/(prefix+'-'+cut+'.ttf')).read_bytes())
                            tags={bytes(payload[12+i*16:16+i*16]) for i in range(struct.unpack_from('>H',payload,4)[0])}
                            self.assertNotIn(b'fvar',tags)
                        self.assertIn(b'SIL OPEN FONT LICENSE',z.read('customXml/'+prefix+'-OFL.xml'))
                    if base=='ergebnisprotokoll':
                        data=[p for p in document.findall('.//w:body/w:p',NS) if ''.join(p.itertext()).startswith(('Datum und Zeit:','Aufgabe:'))]
                        self.assertEqual(len(data),2)
                        for p in data:self.assertEqual(p.find('w:pPr/w:pStyle',NS).get(W+'val'),'Metadaten')

    def test_abitur_reuses_the_existing_template(self):
        html=(ROOT/'typografie-atelier.html').read_text()
        self.assertNotIn('downloads/typografie/klausur-a4-zw12',html)
        for link in ['downloads/Blankoklausur_Naturwissenschaften.docx','downloads/Blankoklausur_Naturwissenschaften.pdf','klausurassistent.html?fach=chemie&amp;design=abitur2025','klausurvorlage-vorschau.html?design=abitur2025&amp;seite=1']:
            self.assertIn(link,html)
        self.assertNotIn('d=base(\'Klausur',(ROOT/'tools/build-typografie-schulbeispiele.py').read_text())

if __name__=='__main__':unittest.main()
