"""Own validated indicator drawings. Run with RDKit; no remote image assets."""
import json,re
from pathlib import Path
from rdkit import Chem
from rdkit.Chem import rdDepictor, rdMolDescriptors
from rdkit.Chem.Draw import rdMolDraw2D

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets' / 'uvvis-indicators'
OUT.mkdir(exist_ok=True)
records = {r['id']: r for r in json.loads((ROOT/'data/uvvis-spectra.json').read_text())['substances']}
manifest = {}

def drawings(key, smiles, count=2):
    mol = Chem.MolFromSmiles(smiles)
    assert mol is not None, key
    rdDepictor.Compute2DCoords(mol)
    coordinates=Chem.Conformer(mol.GetConformer())
    # Enumerate electronic resonance only: atom positions and bound H stay fixed.
    supplier = Chem.ResonanceMolSupplier(mol, Chem.ALLOW_CHARGE_SEPARATION | Chem.UNCONSTRAINED_CATIONS, 200)
    candidates = [m for m in supplier if rdMolDescriptors.CalcMolFormula(m)==rdMolDescriptors.CalcMolFormula(mol)
                  and [(a.GetAtomicNum(),a.GetTotalNumHs()) for a in m.GetAtoms()]==[(a.GetAtomicNum(),a.GetTotalNumHs()) for a in mol.GetAtoms()]]
    # Prefer distinct quinoid contributions over mere carboxylate/sulfonate shifts.
    def signature(m):
        return tuple((a.GetIdx(),a.GetFormalCharge()) for a in m.GetAtoms() if a.GetSymbol() in ('N','O')
                     and not (a.GetSymbol()=='O' and any(n.GetSymbol() in ('S','N') or (n.GetSymbol()=='C' and sum(x.GetSymbol()=='O' for x in n.GetNeighbors())==2) for n in a.GetNeighbors())))
    def score(m):
        oxy_changes=sum(abs(a.GetFormalCharge()-mol.GetAtomWithIdx(a.GetIdx()).GetFormalCharge()) for a in m.GetAtoms() if a.GetSymbol()=='O') if key.startswith(('methyl','congo')) else 0
        return sum(abs(a.GetFormalCharge()) for a in m.GetAtoms()),oxy_changes
    candidates.sort(key=score)
    selected=[mol]
    azo_atoms={a.GetIdx() for a in mol.GetAtoms() if a.GetSymbol()=='N' and any(b.GetOtherAtom(a).GetSymbol()=='N' for b in a.GetBonds())}
    if key.startswith('alizarin'):
        nitro_atoms={a.GetIdx() for a in mol.GetAtoms() if (a.GetSymbol()=='O' and any(n.GetSymbol()=='N' for n in a.GetNeighbors())) or (a.GetSymbol()=='N' and any(n.GetSymbol()=='O' for n in a.GetNeighbors()))}
        candidates.sort(key=lambda m:(sum(m.GetAtomWithIdx(i).GetFormalCharge()!=mol.GetAtomWithIdx(i).GetFormalCharge() for i in nitro_atoms),not any(m.GetAtomWithIdx(i).GetFormalCharge()<0 for i in azo_atoms),score(m)))
    for other in candidates:
        changes_azo=any(other.GetAtomWithIdx(i).GetFormalCharge()!=mol.GetAtomWithIdx(i).GetFormalCharge() for i in azo_atoms)
        if signature(other)!=signature(mol) and (not azo_atoms or changes_azo):
            selected.append(other)
            break
    if count==1: selected=[mol]
    assert len(selected)>=count, f'No distinct resonance contribution: {key}'
    info=[]
    for i,m in enumerate(selected[:count]):
        assert Chem.GetFormalCharge(m)==Chem.GetFormalCharge(mol)
        assert rdMolDescriptors.CalcMolFormula(m)==rdMolDescriptors.CalcMolFormula(mol)
        # Require identical atoms/H counts/connectivity; only electrons may move.
        assert [(a.GetAtomicNum(),a.GetTotalNumHs()) for a in m.GetAtoms()]==[(a.GetAtomicNum(),a.GetTotalNumHs()) for a in mol.GetAtoms()]
        m.RemoveAllConformers();m.AddConformer(coordinates,assignId=True)
        drawer=rdMolDraw2D.MolDraw2DSVG(1000,410)
        opt=drawer.drawOptions();opt.padding=.10;opt.bondLineWidth=2.2;opt.minFontSize=17;opt.maxFontSize=29
        opt.useBWAtomPalette()
        drawer.DrawMolecule(m);drawer.FinishDrawing()
        coords=[drawer.GetDrawCoords(j) for j in range(m.GetNumAtoms())]
        left=max(0,min(p.x for p in coords)-45);top=max(0,min(p.y for p in coords)-40)
        width=min(1000,max(p.x for p in coords)+45)-left;height=min(410,max(p.y for p in coords)+40)-top
        svg=drawer.GetDrawingText().replace("width='1000px' height='410px'",f"width='{width:.1f}px' height='{height:.1f}px'").replace("viewBox='0 0 1000 410'",f"viewBox='{left:.1f} {top:.1f} {width:.1f} {height:.1f}'")
        name=f'{key}-{i+1}.svg';(OUT/name).write_text(svg)
        info.append({'src':'assets/uvvis-indicators/'+name,'smiles':Chem.MolToSmiles(m,kekuleSmiles=True),'charge':Chem.GetFormalCharge(m),'formula':rdMolDescriptors.CalcMolFormula(m)})
    manifest[key]=info

# Azo dyes: protonation on the azo-N distal to the donating amino group.
for name,rid in [('methylorange','PH-J03'),('methylred','PH-J02'),('congored','PH-J17')]:
    m=Chem.MolFromSmiles(records[rid]['smiles'].split('.')[0])
    if name=='methylred':
        oxygen=m.GetSubstructMatch(Chem.MolFromSmarts('C(=O)[O;H1]'))[-1]
        a=m.GetAtomWithIdx(oxygen);a.SetFormalCharge(-1);a.SetNumExplicitHs(0);a.SetNoImplicit(True);Chem.SanitizeMol(m)
    drawings(name+'-base',Chem.MolToSmiles(m))
    if name!='congored':
        pair=m.GetSubstructMatch(Chem.MolFromSmarts('[N]=[N]'))
        # Locate azo-N on the ring without the dimethylamino donor.
        donor=next(a.GetIdx() for a in m.GetAtoms() if a.GetSymbol()=='N' and a.GetDegree()==3)
        distal=max(pair,key=lambda n:len(Chem.GetShortestPath(m,donor,n)))
        a=m.GetAtomWithIdx(distal);a.SetFormalCharge(1);a.SetNumExplicitHs(1)
        Chem.SanitizeMol(m)
    else:
        # Symmetric doubly azo-protonated contributor of the acidic blue form.
        # Local protonation microstates coexist; do not claim a single pure species.
        for bond in m.GetBonds():
            if bond.GetBeginAtom().GetSymbol()==bond.GetEndAtom().GetSymbol()=='N' and bond.GetBondTypeAsDouble()==2:
                ends=[bond.GetBeginAtomIdx(),bond.GetEndAtomIdx()]
                donors=[a.GetIdx() for a in m.GetAtoms() if a.GetSymbol()=='N' and a.GetDegree()==1]
                proximal=min(ends,key=lambda n:min(len(Chem.GetShortestPath(m,d,n)) for d in donors))
                a=m.GetAtomWithIdx(proximal);a.SetFormalCharge(1);a.SetNumExplicitHs(1)
        Chem.SanitizeMol(m)
    drawings(name+'-acid',Chem.MolToSmiles(m))

drawings('phenolphthalein-acid',records['L08']['smiles'],1)
drawings('phenolphthalein-base','O=C1C=CC(=C(c2ccccc2C(=O)[O-])c2ccc([O-])cc2)C=C1')
for name,ring in [('bromophenolblue','c1cc(Br)c({O})c(Br)c1'),('thymolblue','c1c(C)cc({O})c(C(C)C)c1')]:
    tail='c1ccccc1S(=O)(=O)[O-]'
    for form,ox in [('acid',['O','[O-]']),('base',['[O-]','[O-]'])]:
        smiles='[C+]('+ring.format(O=ox[0])+')('+ring.format(O=ox[1])+')'+tail
        drawings(name+'-'+form,smiles)
    if name=='thymolblue':drawings(name+'-strongacid','[C+]('+ring.format(O='O')+')('+ring.format(O='O')+')'+tail)
drawings('alizarinyellow-acid','O=C([O-])c1cc(N=Nc2ccc([N+](=O)[O-])cc2)ccc1O')
drawings('alizarinyellow-base','O=C([O-])c1cc(N=Nc2ccc([N+](=O)[O-])cc2)ccc1[O-]')
drawings('malachitegreen-acid','CN(C)c1ccc([C+](c2ccccc2)c2ccc(N(C)C)cc2)cc1')
drawings('malachitegreen-strongacid','C[NH+](C)c1ccc([C+](c2ccccc2)c2ccc(N(C)C)cc2)cc1')
drawings('malachitegreen-base','CN(C)c1ccc(C(O)(c2ccccc2)c2ccc(N(C)C)cc2)cc1',1)
(ROOT/'data/uvvis-indicator-structures.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('Validated',len(manifest),'forms;',sum(map(len,manifest.values())),'drawings')
