"""Verify the real downloadable artifacts, not only their link labels."""
from pathlib import Path
import unittest
import zipfile
import pdfplumber
from pypdf import PdfReader

DEST=Path(__file__).resolve().parents[1]/'downloads/typografie/seitenstudien'

class PageStudies(unittest.TestCase):
    def test_a4_and_embedded_fonts(self):
        studies=sorted(DEST.glob('[0-9][0-9]-*.pdf'));self.assertEqual(len(studies),19)
        for path in studies:
            reader=PdfReader(path);self.assertEqual(len(reader.pages),1)
            page=reader.pages[0];self.assertAlmostEqual(float(page.mediabox.width),210*72/25.4,places=3);self.assertAlmostEqual(float(page.mediabox.height),297*72/25.4,places=3)
            fonts=page['/Resources']['/Font'].get_object();embedded=[]
            for ref in fonts.values():
                f=ref.get_object();desc=f.get('/FontDescriptor')
                if desc:embedded.append(bool(desc.get_object().get('/FontFile2')))
            self.assertTrue(embedded and all(embedded),path.name)
            self.assertIn('23. Oktober',page.extract_text(),path.name)

    def test_booklet_has_all_studies_and_clickable_sources(self):
        r=PdfReader(DEST/'studienheft-die-seite.pdf');self.assertEqual(len(r.pages),24)
        alltext='\n'.join(p.extract_text() for p in r.pages)
        for term in ['Richtung und Eingriff','Farbe und Lesbarkeit','Komposition der Seite','Vergleichsfrage','61,8','4,5:1']:self.assertIn(term,alltext)
        self.assertEqual(len(r.pages[-1]['/Annots']),6)

    def test_combination_is_in_booklet_and_printed_with_upright_stems(self):
        r=PdfReader(DEST/'studienheft-die-seite.pdf')
        text=r.pages[8].extract_text()
        for term in ['19 / Geschert, dann gedreht','senkrechten Stämme des H','Querlinie','Studien 03 und 04']:
            self.assertIn(term,text)
        self.assertIn('Scheren, drehen, kombinieren',r.pages[1].extract_text())
        with pdfplumber.open(DEST/'19-aufrechte-diagonale.pdf') as pdf:
            char=next(ch for ch in pdf.pages[0].chars if ch['text']=='H' and ch['size']>40)
            a,b,c,d,_,_=char['matrix']
            self.assertAlmostEqual(c,0,places=6)
            self.assertGreater(b,0)
            self.assertGreater(d,0)
            self.assertAlmostEqual(a*d-b*c,1,places=5)
            self.assertIn('SourceSans3-Bold',char['fontname'])
            regular=next(ch for ch in pdf.pages[0].chars if ch['text']=='E' and ch['size']<20)
            self.assertIn('SourceSans3-Regular',regular['fontname'])

    def test_unintended_text_never_leaves_page(self):
        for path in sorted(DEST.glob('[0-9][0-9]-*.pdf')):
            with pdfplumber.open(path) as pdf:
                p=pdf.pages[0]
                for ch in p.chars:
                    # Only the first title in the free composition deliberately bleeds.
                    if path.name.startswith('18-') and ch['size']>70:continue
                    self.assertGreaterEqual(ch['x0'],-.2,(path.name,ch['text'],ch['x0']))
                    self.assertLessEqual(ch['x1'],p.width+.2,(path.name,ch['text'],ch['x1']))
                    self.assertGreaterEqual(ch['top'],-.2,(path.name,ch['text'],ch['top']))
                    self.assertLessEqual(ch['bottom'],p.height+.2,(path.name,ch['text'],ch['bottom']))

    def test_zip_contains_exactly_the_offered_artifacts_and_licenses(self):
        with zipfile.ZipFile(DEST/'seitenstudien-19-pdf-svg.zip') as z:
            self.assertIsNone(z.testzip());self.assertEqual(len(z.namelist()),42)
            for name in ['seitenstudien-offline.html','studienheft-die-seite.pdf','19-aufrechte-diagonale.pdf','19-aufrechte-diagonale.svg','cardo-OFL.txt','sourcesans3-OFL.txt']:self.assertIn(name,z.namelist())

if __name__=='__main__':unittest.main()
