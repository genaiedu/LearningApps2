"""Verify the real downloadable artifacts, not only their link labels."""
from pathlib import Path
import unittest
import zipfile
import pdfplumber
from pypdf import PdfReader

DEST=Path(__file__).resolve().parents[1]/'downloads/typografie/seitenstudien'

class PageStudies(unittest.TestCase):
    def test_a4_and_embedded_fonts(self):
        studies=sorted(DEST.glob('[0-9][0-9]-*.pdf'));self.assertEqual(len(studies),18)
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
        r=PdfReader(DEST/'studienheft-die-seite.pdf');self.assertEqual(len(r.pages),23)
        alltext='\n'.join(p.extract_text() for p in r.pages)
        for term in ['Richtung und Eingriff','Farbe und Lesbarkeit','Komposition der Seite','Vergleichsfrage','61,8','4,5:1']:self.assertIn(term,alltext)
        self.assertEqual(len(r.pages[-1]['/Annots']),6)

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
        with zipfile.ZipFile(DEST/'seitenstudien-18-pdf-svg.zip') as z:
            self.assertIsNone(z.testzip());self.assertEqual(len(z.namelist()),40)
            for name in ['seitenstudien-offline.html','studienheft-die-seite.pdf','cardo-OFL.txt','sourcesans3-OFL.txt']:self.assertIn(name,z.namelist())

if __name__=='__main__':unittest.main()
