/* Unrelaxed spin-summed singlet-CIS state density. Integration GPL-2.0.
 * D_occ = 2I - X X^T; D_vir = X^T X; D_occ,vir = 0.
 * Full amplitudes are required, including small and off-diagonal terms.
 * Reference: Q-Chem manual 6.1, 10.2.8 (particle/hole density matrices).
 */
import {Matrix} from '../vendor/gansu-lite/src/linalg/matrix';
export function cisDensityMO(amplitudes:number[],nocc:number,n:number):Matrix {
  const nv=n-nocc;
  if(amplitudes.length!==nocc*nv||amplitudes.some(x=>!Number.isFinite(x)))throw Error('Ungültiger CIS-Vektor.');
  const norm=amplitudes.reduce((s,x)=>s+x*x,0);
  if(Math.abs(norm-1)>1e-6)throw Error('CIS-Vektor nicht normiert.');
  const d=new Matrix(n,n);
  for(let i=0;i<nocc;i++)for(let j=0;j<nocc;j++){
    let hole=0;for(let a=0;a<nv;a++)hole+=amplitudes[i*nv+a]*amplitudes[j*nv+a];
    d.set(i,j,(i===j?2:0)-hole);
  }
  for(let a=0;a<nv;a++)for(let b=0;b<nv;b++){
    let electron=0;for(let i=0;i<nocc;i++)electron+=amplitudes[i*nv+a]*amplitudes[i*nv+b];
    d.set(nocc+a,nocc+b,electron);
  }
  return d;
}
export function densityAO(d:Matrix,c:Matrix):Matrix {
  const n=c.rows,tmp=new Matrix(n,n),out=new Matrix(n,n);
  for(let i=0;i<n;i++)for(let j=0;j<n;j++){
    let v=0;for(let k=0;k<n;k++)v+=c.get(i,k)*d.get(k,j);tmp.set(i,j,v);
  }
  for(let i=0;i<n;i++)for(let j=0;j<n;j++){
    let v=0;for(let k=0;k<n;k++)v+=tmp.get(i,k)*c.get(j,k);out.set(i,j,v);
  }
  return out;
}
