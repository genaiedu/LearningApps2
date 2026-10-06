"""Reproducible acquisition of measured UV/Vis data, not synthetic peak fitting.
Run with bundled Python. Raw downloads are cached in tmp/uvvis-sources.
Source workbooks are read-only; generated JSON retains acquisition metadata.
"""
import concurrent.futures, hashlib, html, io, json, pathlib, re, subprocess, time
import openpyxl
ROOT=pathlib.Path(__file__).resolve().parents[1]
CACHE=ROOT.parent/'tmp'/'uvvis-sources'
CACHE.mkdir(parents=True,exist_ok=True)
BASE='https://www.photochemcad.com'
def get(url):
    target=CACHE/(hashlib.sha256(url.encode()).hexdigest()[:24]+'.raw')
    if not target.exists():
        subprocess.run(['curl','-L','--fail','--silent','--show-error','--max-time','40','--retry','1',url,'-o',str(target)],check=True)
    return target.read_bytes()
def plain(s):return html.unescape(re.sub('<[^>]*>',' ',s)).strip()
def table(s):
    pairs=re.findall(r'<th[^>]*>(.*?)</th>\s*<td[^>]*>(.*?)</td>',s,re.S)
    out={}
    for k,v in pairs:
        if plain(k) not in out:out[plain(k)]=re.sub(r'\s+',' ',plain(v))
    return out
CATEGORIES=[('aromatic-hydrocarbons',20,'Aromaten'),('azo-dyes',19,'Azofarbstoffe'),('arylmethane-dyes',11,'Arylmethanfarbstoffe'),('xanthenes',8,'Xanthenfarbstoffe'),('biomolecules',8,'Biomoleküle'),('polyenes-polyynes',6,'Konjugierte Systeme')]
def photochem(url,category):
    page=get(url).decode();meta=table(page)
    links=re.findall(r'href="([^"]+\.absorption\.txt)"',page)
    if not links:return None
    dataURL=BASE+links[0] if links[0].startswith('/') else links[0]
    raw=get(dataURL).decode('utf-8-sig');points=[]
    for line in raw.splitlines():
        cols=line.split()
        if len(cols)>=2:
            try:x,y=map(float,cols[:2])
            except ValueError:continue
            if 190<=x<=850:points.append([x,y])
    points.sort()
    if len(points)<30:return None
    cas=meta.get('CAS','');smiles='';cid=None
    try:
        props=json.loads(get('https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/'+cas+'/property/CanonicalSMILES/JSON'))['PropertyTable']['Properties'][0]
        smiles=props.get('ConnectivitySMILES') or props.get('CanonicalSMILES') or '';cid=props['CID']
    except Exception as e:print('Structure lookup unavailable',meta.get('Name'),str(e)[:50],flush=True)
    return dict(id=meta['PhotochemCAD ID'],name=meta['Name'],category=category,cas=cas,smiles=smiles,cid=cid,source=url,dataURL=dataURL,credit='Masahiko Taniguchi; Jonathan S. Lindsey · PhotochemCAD 3',instrument=meta.get('Instrument'),date=meta.get('Date'),solvent=meta.get('Solvent'),unit='epsilon',peakReference=meta.get('Absorption Coefficient'),points=points,sha256=hashlib.sha256(raw.encode()).hexdigest(),note='Gemessene Absorptionskurve mit Literatur-Skalierung des molaren Absorptionskoeffizienten. Keine berechneten Gaußbanden. Negative Basislinienwerte bleiben im Quelldatensatz erhalten.',rights='Öffentlich angebotene numerische Forschungsdaten; Quellenverweis auf PhotochemCAD. Keine Übernahme von Datenbankgrafiken oder Programmcode.',retrieved='2026-10-06')
def main():
    jobs=[]
    for slug,count,label in CATEGORIES:
        url=BASE+'/databases/common-compounds/'+slug
        try:page=get(url).decode()
        except Exception:continue
        links=list(dict.fromkeys(BASE+x for x in re.findall(r'href="(/databases/common-compounds/'+slug+r'/[^"?#]+)"',page)))
        # Always include the matched auxiliary-group teaching pair.
        if slug=='aromatic-hydrocarbons':
            links=[BASE+'/databases/common-compounds/'+slug+'/'+x for x in ['benzene','aniline','phenol','toluene','anisole']]+links
            links=list(dict.fromkeys(links))
        jobs.extend((link,label) for link in links[:count])
    records=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        future={pool.submit(photochem,*job):job for job in jobs}
        for f in concurrent.futures.as_completed(future):
            try:
                record=f.result()
                if record:records.append(record);print(record['id'],record['name'],len(record['points']),bool(record['smiles']),flush=True)
            except Exception as e:print('FAILED',future[f],e,flush=True)
    records=[r for r in records if r['smiles']]
    records.sort(key=lambda r:r['id'])
    files=json.loads(get('https://data.mendeley.com/public-api/datasets/jp2j9hz6v9/files?folder_id=root&version=1'))
    ph=[];ph_records=[]
    mapping={'20160621MO-pH.xlsx':('in H2O',1,2,12,'J03','Methylorange'), '20150702MR-pH.xlsx':('Sheet1',1,2,10,'J02','Methylrot'), '20160106BPB-pH.xlsx':('Sheet1',0,1,10,None,'Bromphenolblau'), '20170123TB-pH.xlsx':('spectrum',0,1,20,'L11','Thymolblau'), 'CRspectrum.xlsx':('spectrum',0,1,20,'J17','Kongorot')}
    wanted=['20160621MO-pH.xlsx','20150702MR-pH.xlsx','20160106BPB-pH.xlsx','20170123TB-pH.xlsx','CRspectrum.xlsx']
    for f in files:
        if f['filename'] not in wanted:continue
        raw=get(f['content_details']['download_url']);book=openpyxl.load_workbook(io.BytesIO(raw),read_only=True,data_only=True)
        sheet_name,xcol,startcol,count,parent,name=mapping[f['filename']]
        rows=list(book[sheet_name].values)
        first=next(i for i,row in enumerate(rows) if isinstance(row[xcol],(int,float)) and row[xcol]==250)
        header=rows[first-1]
        # The spectrum sheet has a contiguous measured wavelength axis; other
        # workbook sheets contain derived fits and must never become spectra.
        source_rows=[]
        for row in rows[first:]:
            if not isinstance(row[xcol],(int,float)) or not 250<=row[xcol]<=800:break
            if source_rows and row[xcol]!=source_rows[-1][xcol]+1:break
            source_rows.append(row)
        assert len(source_rows)==551,(f['filename'],len(source_rows))
        if parent:base=next(r for r in records if r['id']==parent)
        else:
            props=json.loads(get('https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/115-39-9/property/CanonicalSMILES/JSON'))['PropertyTable']['Properties'][0]
            base=dict(smiles=props.get('ConnectivitySMILES') or props.get('CanonicalSMILES'),cid=props['CID'],cas='115-39-9',category='Indikatoren')
        curves=[]
        for col in range(startcol,startcol+count):
            pH=float(re.search(r'[0-9]+(?:\.[0-9]+)?',str(header[col])).group())
            points=[[row[xcol],row[col]] for row in source_rows]
            assert all(isinstance(y,(int,float)) for x,y in points)
            curves.append(dict(pH=pH,points=points))
        ph_records.append(dict(id='PH-'+(parent or 'BPB'),name=name+' · pH-Messreihe',category='Indikatoren · pH',smiles=base['smiles'],cid=base['cid'],cas=base['cas'],source='https://data.mendeley.com/datasets/jp2j9hz6v9/1',dataURL=f['content_details']['download_url'],credit='Satoru Goto · Tokyo University of Science (2026)',instrument='Shimadzu UV-2600',solvent='Wässrige pH-Messreihe',unit='absorbance',curves=curves,points=curves[-1]['points'],sheet=sheet_name,sha256=hashlib.sha256(raw).hexdigest(),rights='CC BY 4.0 · https://creativecommons.org/licenses/by/4.0/',note='Original-Absorbanz bei 1 cm Schichtdicke. Konzentration in der übernommenen Tabelle nicht angegeben: nur relative Verdünnung, keine molare Quantifizierung. Struktur zeigt die Stammverbindung, nicht sämtliche pH-abhängigen Protonierungsformen.',retrieved='2026-10-06'))
        print('PH IMPORT',name,len(curves),len(source_rows),flush=True)
        ph.append(dict(filename=f['filename'],download=f['content_details']['download_url'],sha256=hashlib.sha256(raw).hexdigest()))
    # Manual digitization of the *A* trace, Figure 2, Zanoni et al. (2010).
    # Pixel calibration on the original 414 x 373 image: x=43 -> 220 nm,
    # x=402 -> 900 nm; y=197 -> A=0, y=8 -> A=.3. VIS only, to avoid
    # confusing the overlapping A/C curves in the UV. No Gaussian fitting.
    pixel_trace=[(165,197),(175,196),(185,196),(195,193),(205,184),(215,172),(225,154),(235,136),(240,129),(245,123),(250,121),(254,124),(258,133),(262,146),(266,162),(270,176),(274,187),(278,193),(282,196),(290,198),(300,198),(315,197),(330,197),(350,197)]
    points=[[round(220+(x-43)*680/359,2),round((197-y)*.3/189,5)] for x,y in pixel_trace]
    props=json.loads(get('https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/860-22-0/property/CanonicalSMILES/JSON'))['PropertyTable']['Properties'][0]
    indigo=dict(id='IC-FIG2',name='Indigocarmin · digitalisierte Messkurve',category='Indigoide Farbstoffe',smiles=props.get('ConnectivitySMILES') or props.get('CanonicalSMILES'),cid=props['CID'],cas='860-22-0',unit='absorbance',points=points,solvent='Wasser',instrument='Hewlett Packard 8453 · Quarzküvette 1 cm',source='https://doi.org/10.1590/S1984-82502010000400014',dataURL='https://minio.scielo.br/documentstore/2175-9790/RzKZyQkgWDc4SR63crDfRjC/c2a7830cbba2cff1b1a15b1cbd01a76431dcc8d4.jpg',credit='T. B. Zanoni, A. A. Cardoso, M. V. B. Zanoni, A. A. P. Ferreira (2010) · Abb. 2, Kurve A',rights='CC BY-NC 4.0 · nichtkommerzielle Lehrnutzung · verändert: Kurve aus Abbildung digitalisiert',referenceConcentration=1e-5,note='Aus Abb. 2, Kurve A manuell abgelesene VIS-Messkurve; grafische Genauigkeit etwa ±0,005 A. Original: 10 µmol/L, 1 cm. Nur relative Skalierung in der Simulation; keine präzise molare Quantifizierung. Indigocarmin ist ein wasserlöslicher Indigo-Farbstoff, nicht Indigo selbst.',retrieved='2026-10-06',digitized=True)
    out=dict(version=1,compiled='2026-10-06',substances=records+ph_records+[indigo],phFiles=ph)
    dest=ROOT/'data'/'uvvis-spectra.json';dest.parent.mkdir(exist_ok=True)
    dest.write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')))
    print('OUTPUT',len(records),dest.stat().st_size,flush=True)
if __name__=='__main__':main()
