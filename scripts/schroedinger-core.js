/* Nonrelativistic, time-independent one-particle models. SI internally;
   chart coordinates in nm (box/well) or oscillator lengths (oscillator). */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SchroedingerCore=api;})(typeof globalThis==='object'?globalThis:this,()=>{
  'use strict';
  const h=6.62607015e-34,hbar=h/(2*Math.PI),me=9.1093837139e-31,eV=1.602176634e-19;
  const factorial=n=>{let p=1;for(let i=2;i<=n;i++)p*=i;return p;};
  function hermite(n,x){if(!n)return 1;let a=1,b=2*x;for(let k=1;k<n;k++){const c=2*x*b-2*k*a;a=b;b=c;}return b;}
  function box(n,L,mass=1){
    const energy=h*h*n*n/(8*me*mass*(L*1e-9)**2)/eV;
    const psi=x=>x<0||x>L?0:Math.sqrt(2/L)*Math.sin(n*Math.PI*x/L);
    const primitive=u=>u-Math.sin(2*n*Math.PI*u)/(2*n*Math.PI);
    return {n,L,energy,psi,density:x=>psi(x)**2,probability:(a,b)=>primitive(Math.min(1,b))-primitive(Math.max(0,a)),lambda:2*L/n};
  }
  function finiteWell(width,depth,mass=1){
    const a=width/2,z0=a*1e-9*Math.sqrt(2*me*mass*depth*eV)/hbar,states=[];
    // Smooth phase condition avoids poles of tan/cot and spurious roots.
    for(let j=0;j<100;j++){
      const target=(j+1)*Math.PI/2;if(target>=z0+Math.PI/2-1e-12)break;
      let lo=0,hi=z0;for(let i=0;i<90;i++){const mid=(lo+hi)/2;if(mid+Math.asin(Math.min(1,mid/z0))<target)lo=mid;else hi=mid;}
      const z=(lo+hi)/2,k=z/a,q=Math.sqrt(Math.max(0,z0*z0-z*z)),kappa=q/a,even=j%2===0;
      const edge=even?Math.cos(z):Math.sin(z);
      const normInside=a+(even?1:-1)*Math.sin(2*z)/(2*k),normOutside=edge*edge/kappa;
      const A=1/Math.sqrt(normInside+normOutside);
      const psi=x=>A*(Math.abs(x)<=a?(even?Math.cos(k*x):Math.sin(k*x)):(even?1:Math.sign(x))*edge*Math.exp(-kappa*(Math.abs(x)-a)));
      states.push({index:j,even,z,z0,k,kappa,energy:depth*(z/z0)**2,psi,density:x=>psi(x)**2,outside:A*A*normOutside,width,depth});
    }
    return states;
  }
  function oscillator(n,quantum=1){
    const psi=x=>hermite(n,x)*Math.exp(-x*x/2)/Math.sqrt(2**n*factorial(n)*Math.sqrt(Math.PI));
    return {n,energy:(n+.5)*quantum,psi,density:x=>psi(x)**2,turning:Math.sqrt(2*n+1)};
  }
  function integrate(f,a,b,steps=4000){if(steps%2)steps++;const dx=(b-a)/steps;let sum=f(a)+f(b);for(let i=1;i<steps;i++)sum+=(i%2?4:2)*f(a+i*dx);return sum*dx/3;}
  return {h,hbar,me,eV,factorial,hermite,box,finiteWell,oscillator,integrate};
});
