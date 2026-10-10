"""Render real DOCX pages for a browser-independent, locally hosted preview."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
import json
from pathlib import Path
import shutil
import subprocess
import sys
from docx import Document
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
NAMES={'brief-a4':'Sachlicher Brief','kurzbericht-a4':'Kurzbericht',
       'einladung-a4':'Einladung','ergebnisprotokoll-a4':'Ergebnisprotokoll'}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--renderer',type=Path,required=True)
    parser.add_argument('--workdir',type=Path,required=True)
    args=parser.parse_args()
    args.workdir.mkdir(parents=True,exist_ok=True)
    destination=ROOT/'downloads/typografie/vorschau'
    destination.mkdir(parents=True,exist_ok=True)
    jobs=[(base+suffix,title,bool(suffix)) for base,title in NAMES.items() for suffix in ['', '-modern']]

    def render(job):
        name,title,modern=job
        source=ROOT/'downloads/typografie'/f'{name}.docx'
        work=args.workdir/name
        subprocess.run([sys.executable,str(args.renderer.resolve()),str(source),
                        '--output_dir',str(work),'--dpi','180'],check=True,cwd=args.workdir)
        pages=sorted(work.glob('page-*.png'),key=lambda p:int(p.stem.split('-')[1]))
        if not pages:raise RuntimeError(f'No rendered pages for {name}')
        record={'title':title,'variant':'Modern' if modern else 'Klassisch',
                'download':str(source.relative_to(ROOT)),
                'sourceSha256':sha256(source.read_bytes()).hexdigest(),
                'text':[p.text for p in Document(source).paragraphs if p.text.strip()], 'pages':[]}
        for index,page in enumerate(pages,1):
            target=destination/f'{name}-{index}.png'
            shutil.copyfile(page,target)
            with Image.open(target) as image:width,height=image.size
            record['pages'].append({'src':str(target.relative_to(ROOT)), 'width':width,'height':height,
                                    'sha256':sha256(target.read_bytes()).hexdigest()})
        return name,record

    with ThreadPoolExecutor(max_workers=2) as pool:
        documents=dict(pool.map(render,jobs))
    manifest={'description':'Unveränderte Satzansichten aus den angebotenen Worddateien. Lokale Seitengrafiken, keine externe Dokumentkonvertierung.',
              'documents':documents}
    (ROOT/'data/typografie-document-previews.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    print(f'{len(documents)} documents, {sum(len(d["pages"]) for d in documents.values())} pages')

if __name__=='__main__':main()
