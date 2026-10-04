"""Static working-copy export checks. Run with Python and python-docx/pypdf/lxml."""
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import unittest

from docx import Document
from docx.oxml.ns import qn
from lxml import html
from pypdf import PdfReader

REPO = Path(__file__).resolve().parents[1]
STEM = 'Curriculum_Chemie_Arbeitskopie_Thomaeum_Sek_I_und_II'
DEFINITIONS = [
    'Gelerntes im vertrauten Zusammenhang wiedergeben und geübte Verfahren sicher einsetzen.',
    'Bekanntes selbstständig ordnen, erklären und auf vergleichbare neue Situationen übertragen.',
    'Komplexe neue Probleme eigenständig bearbeiten, Methoden auswählen, Lösungen begründen und das Vorgehen reflektieren.',
]


class WorkingCopyExport(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.doc = Document(REPO / 'downloads' / f'{STEM}.docx')
        cls.pdf = PdfReader(REPO / 'downloads' / f'{STEM}.pdf')
        cls.web = html.fromstring((REPO / 'chemie-curriculum-arbeitskopie.html').read_text())
        cls.text = ''.join(cls.doc._element.xpath('//w:t/text()'))
        cls.printed = '\n'.join(page.extract_text() or '' for page in cls.pdf.pages)

    def test_one_canonical_afb_definition_in_both_formats(self):
        printed = ''.join(self.printed.split())
        for definition in DEFINITIONS:
            self.assertEqual(self.text.count(definition), 1)
            self.assertEqual(printed.count(''.join(definition.split())), 1)
        self.assertEqual(self.text.count('Anforderungsbereiche: Für die aufgabenbezogene Zuordnung'), 1)

    def test_all_general_and_chemistry_grade_formulations(self):
        tables = self.web.get_element_by_id('abiturpruefung').getparent().xpath('.//table')
        self.assertEqual(len(tables), 2)
        printed = ''.join(self.printed.split())
        for table in tables:
            rows = table.xpath('./tbody/tr')
            self.assertEqual(len(rows), 16)
            for row in rows:
                expected = row[-1].text_content()
                self.assertIn(expected, self.text)
                self.assertIn(''.join(expected.split()), printed)

    def test_native_appendices_and_no_downloads_or_interactive_ui(self):
        headings = [p.text for p in self.doc.paragraphs if p.style.name == 'Heading 1']
        appendices = [heading for heading in headings if heading.startswith('Anhang ')]
        self.assertEqual(len(appendices), 4)
        self.assertEqual(headings[-1], '18 Quellen und Geltungsstand')
        self.assertIn('Aufgabenblatt', self.text)
        self.assertIn('Das folgende Ausgabeblatt', self.text)
        self.assertIn('Klausurergebnis und Rückmeldung', self.text)
        self.assertGreaterEqual(len(self.doc.tables), 66)
        self.assertFalse(self.doc._element.xpath('//w:sdt'))
        self.assertFalse(self.pdf.get_fields())
        for forbidden in ('download', 'herunterladen', 'Vorlage erstellen', 'Vorlage kopieren',
                          'Für die Vorlage angenommene Punktstufe', 'Hier im Fenster öffnen',
                          'Schulische Arbeitshilfe, keine neue Prüfungsordnung'):
            self.assertNotIn(forbidden.lower(), self.text.lower())
        for rel in self.doc.part.rels.values():
            if rel.is_external:
                self.assertNotIn('downloads/', rel.target_ref)
        for page in self.pdf.pages:
            for ref in page.get('/Annots', []):
                uri = ref.get_object().get('/A', {}).get('/URI', '')
                self.assertNotIn('downloads/', uri)

    def test_navigation_references_and_local_step_numbering(self):
        names = self.doc._element.xpath('//w:bookmarkStart/@w:name')
        self.assertEqual(len(names), len(set(names)))
        self.assertTrue(set(self.doc._element.xpath('//w:hyperlink/@w:anchor')).issubset(set(names)))
        self.assertIn('VV 14.2.1 bis 14.3.3', self.text)
        self.assertIn('Kapitel 2.5 und 17', self.text)
        self.assertIn('Didaktisch gefasstes Anwendungsbeispiel in Kapitel 17.', self.text)
        self.assertIn('der individuelle Gesamtaufwand folgt 14.1.', self.text)
        self.assertIn('14.2 bis 14.4 sowie 14.11 und 14.12', self.text)
        steps = next(p for p in self.doc.paragraphs if p.text.startswith('Vor Beginn: Präsentationsbogen'))
        identity = steps._p.xpath('./w:pPr/w:numPr/w:numId/@w:val')[0]
        start = self.doc.part.numbering_part.element.xpath(
            f'./w:num[@w:numId="{identity}"]/w:lvlOverride/w:startOverride/@w:val')
        self.assertEqual(start, ['1'])
        chapters = [p.text for p in self.doc.paragraphs if p.style.name == 'Heading 1' and re.match(r'^\d+ ', p.text)]
        self.assertEqual(chapters, [heading.text_content() for heading in self.web.xpath('//main//h2')])

    def test_refresh_does_not_duplicate_or_change_text(self):
        with tempfile.TemporaryDirectory(prefix='chemie-export-test-') as folder:
            output = Path(folder) / 'refresh.docx'
            subprocess.run([sys.executable, str(REPO / 'scripts/export-chemie-working-copy.py'),
                            '--output', str(output)], check=True, capture_output=True)
            refreshed = Document(output)
            self.assertEqual(''.join(refreshed._element.xpath('//w:t/text()')), self.text)
            self.assertEqual(len(refreshed.tables), len(self.doc.tables))
            self.assertEqual(len(refreshed._element.xpath('//w:bookmarkStart')),
                             len(self.doc._element.xpath('//w:bookmarkStart')))


if __name__ == '__main__':
    unittest.main()
