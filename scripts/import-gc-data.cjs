/* Reproducible import of experimental 70 eV EI records. Run with Node and an
 * authenticated gh CLI. Original records are retained without modification.
 * The generated JSON contains unit-mass bins normalized to a base peak of 100.
 * Retention/response parameters below are EXPLICIT EDUCATIONAL MODEL VALUES,
 * not experimental retention times, boiling points or certified response factors.
 */
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=path.join(root,'data/gc'),raw=path.join(out,'massbank');
const entries=[
 ['methanol','Methanol','METHANOL','CH4O',.32,23,2.4,.45,'Alkohole'],
 ['ethanol','Ethanol','ETHANOL','C2H6O',.55,25,2.7,.75,'Alkohole'],
 ['propanol','Propan-1-ol','1-PROPANOL','C3H8O',1.0,30,3.1,1.15,'Alkohole'],
 ['isopropanol','Propan-2-ol','2-PROPANOL','C3H8O',.85,28,2.8,1.1,'Alkohole'],
 ['butanol','Butan-1-ol','1-BUTANOL','C4H10O',1.8,32,3.6,1.5,'Alkohole'],
 ['acetone','Aceton','ACETONE','C3H6O',.44,24,1.0,.70,'Lösungsmittel'],
 ['butanone','Butan-2-on','2-BUTANONE','C4H8O',.90,27,1.3,1.05,'Lösungsmittel'],
 ['ether','Diethylether','DIETHYL ETHER','C4H10O',.24,22,.35,1.0,'Lösungsmittel'],
 ['ethylacetate','Ethylacetat','ETHYL ACETATE','C4H8O2',.72,27,1.4,.95,'Ester'],
 ['hexane','n-Hexan','HEXANE','C6H14',1.35,31,.03,1.55,'Kohlenwasserstoffe'],
 ['heptane','n-Heptan','HEPTANE','C7H16',2.4,34,.03,1.8,'Kohlenwasserstoffe'],
 ['octane','n-Octan','OCTANE','C8H18',4.4,38,.03,2.0,'Kohlenwasserstoffe'],
 ['cyclohexane','Cyclohexan','CYCLOHEXANE','C6H12',1.30,30,.05,1.55,'Kohlenwasserstoffe'],
 ['benzene','Benzol','BENZENE','C6H6',1.20,30,.2,1.65,'Aromaten'],
 ['toluene','Toluol','TOLUENE','C7H8',2.70,34,.25,1.85,'Aromaten'],
 ['ethylbenzene','Ethylbenzol','ETHYLBENZENE','C8H10',4.60,37,.3,2.1,'Aromaten'],
 ['mxylene','m-Xylol','META XYLENE','C8H10',4.70,37,.35,2.1,'Aromaten'],
 ['pxylene','p-Xylol','PARA XYLENE','C8H10',4.75,37,.48,2.1,'Aromaten'],
 ['oxylene','o-Xylol','ORTHO XYLENE','C8H10',5.30,38,.6,2.1,'Aromaten'],
 ['limonene','Limonen','LIMONENE','C10H16',12,42,.1,2.6,'Aromastoffe'],
 ['linalool','Linalool','LINALOOL','C10H18O',17,45,2.5,2.2,'Aromastoffe'],
 ['eugenol','Eugenol','EUGENOL','C10H12O2',35,51,3.5,2.15,'Aromastoffe'],
 ['methylsalicylate','Methylsalicylat','METHYL SALICYLATE','C8H8O3',24,48,3.1,1.65,'Aromastoffe'],
 ['isoamylacetate','Isoamylacetat','ISOPENTYL ACETATE','C7H14O2',10,41,1.5,1.7,'Ester']
];
const get=(s,key)=>s.split('\n').find(l=>l.startsWith(key+': '))?.slice(key.length+2).trim()||'';
function parse(s,entry,url){
 const [id,name,search,formula,k80,enthalpy,polarity,response,group]=entry;
 if(get(s,'CH$FORMULA')!==formula||get(s,'AC$INSTRUMENT_TYPE')!=='EI-B'||!s.includes('70 eV'))throw Error('Not a matching native 70 eV EI record');
 const lines=s.split('PK$PEAK:')[1]?.split('\n').slice(1).filter(l=>/^\s+\d/.test(l));
 const bins=new Map();for(const l of lines||[]){const [mz,intensity]=l.trim().split(/\s+/).map(Number);if(Number.isFinite(mz)&&Number.isFinite(intensity)&&intensity>0)bins.set(Math.round(mz),(bins.get(Math.round(mz))||0)+intensity);}
 if(bins.size<5)throw Error('Insufficient peaks');
 const max=Math.max(...bins.values()),accession=get(s,'ACCESSION');
 return {id,name,group,formula,smiles:get(s,'CH$SMILES'),mass:Number(get(s,'CH$EXACT_MASS')),sourceName:get(s,'CH$NAME'),accession,authors:get(s,'AUTHORS'),license:get(s,'LICENSE'),instrument:get(s,'AC$INSTRUMENT'),instrumentType:get(s,'AC$INSTRUMENT_TYPE'),energy:'70 eV',originalURL:url,originalFile:'data/gc/massbank/'+accession+'.txt',sha256:crypto.createHash('sha256').update(s).digest('hex'),peaks:[...bins].sort((a,b)=>a[0]-b[0]).map(([mz,i])=>[mz,Number((i/max*100).toFixed(5))]),model:{k80,enthalpy,polarity,response},note:'Gemessenes EI-Spektrum; auf ganzzahlige m/z zusammengefasst und auf Basispeak 100 normiert. Retention und Detektorantwort sind separate Lehrmodellparameter.'};
}
async function main(){
 fs.mkdirSync(raw,{recursive:true});const substances=[];
 for(const entry of entries){
  const existing=fs.readdirSync(raw).filter(n=>n.endsWith('.txt')).map(n=>({n,s:fs.readFileSync(path.join(raw,n),'utf8')})).find(({s})=>s.split('\n').some(l=>l.toUpperCase()==='CH$NAME: '+entry[2])&&get(s,'CH$FORMULA')===entry[3]&&s.includes('70 eV'));
  let record,source;
  if(existing){record=existing.s;source='https://github.com/MassBank/MassBank-data/blob/befc8a1e2f2aef899747797c081a5d80fab12fe7/Fac_Eng_Univ_Tokyo/'+existing.n;}
  else{
   // GitHub code search has a separate, small rate limit. Avoid bursts.
   await new Promise(resolve=>setTimeout(resolve,7500));
   const q='repo:MassBank/MassBank-data "CH$NAME: '+entry[2]+'" path:Fac_Eng_Univ_Tokyo';
   const result=JSON.parse(execFileSync('gh',['api','-X','GET','search/code','-f','q='+q,'-f','per_page=15'],{encoding:'utf8'}));
   for(const item of result.items||[]){
    const url=item.html_url.replace('https://github.com/','https://raw.githubusercontent.com/').replace('/blob/','/');
    const r=await fetch(url);if(!r.ok)continue;const s=await r.text();
    if(!s.split('\n').some(l=>l.toUpperCase()==='CH$NAME: '+entry[2]))continue;
    try{parse(s,entry,item.html_url);record=s;source=item.html_url;break;}catch(_){}
   }
  }
  if(!record){console.error('MISSING',entry[0],entry[2]);continue;}
  const parsed=parse(record,entry,source);fs.writeFileSync(path.join(raw,parsed.accession+'.txt'),record);substances.push(parsed);console.log('IMPORTED',parsed.name,parsed.accession,parsed.peaks.length,parsed.license);
 }
 fs.writeFileSync(path.join(out,'library.json'),JSON.stringify({schema:1,imported:'2026-10-08',source:'MassBank official experimental records',modelNotice:'All retention and response parameters are educational model values, not measured GC retention data.',substances},null,2)+'\n');
 fs.writeFileSync(path.join(out,'library.js'),'window.GCLibrary='+JSON.stringify({schema:1,imported:'2026-10-08',substances})+';\n');
 console.log('TOTAL',substances.length);
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
