/* Qualitative Lewis structures: atoms and electron pairs are conserved.
   The three teaching states are not a calculated reaction trajectory. */
(()=>{
  'use strict';
  function init(){
    const $=id=>document.getElementById(id),lab=$('concept-lab'),scene=$('reaction-stage');
    const compact=window.matchMedia('(max-width:650px)'),reduced=window.matchMedia('(prefers-reduced-motion:reduce)');
    const steps=['Ausgangsteilchen','Bindungsänderung','Produkte'];
    const models={
      acid:{title:'HCl gibt ein Proton an Wasser ab.',equation:'\\[\\mathrm{HCl+H_2O\\longrightarrow Cl^-+H_3O^+}\\]',
        labels:[['HCl · Säure','H₂O · Base'],['HCl gibt ab','H₂O nimmt auf'],['Cl⁻ · konjugierte Base','H₃O⁺ · konjugierte Säure']],
        explanations:[
          'HCl ist der Protonendonator. Das O-Atom des Wassers besitzt zwei freie Elektronenpaare; eines kann eine Bindung zum Proton bilden. Wasser ist hier die Brønsted-Base.',
          'Das Proton wechselt von Cl zu O. Gleichzeitig bleibt das bisherige H–Cl-Bindungspaar vollständig am Chlor. Ein freies Elektronenpaar des O-Atoms bildet die neue O–H-Bindung. Die gebogenen Pfeile zeigen diese Elektronenpaarverschiebungen.',
          'Aus HCl wird Cl⁻, aus H₂O wird H₃O⁺. Chlor besitzt jetzt ein zusätzliches freies Elektronenpaar; Sauerstoff hat drei O–H-Bindungen und noch ein freies Paar. Die Gesamtladung bleibt null. In Wasser liegt das Proton hydratisiert vor; es fliegt nicht als isoliertes H⁺ umher.'
        ]},
      base:{title:'Wasser gibt ein Proton an Ammoniak ab.',equation:'\\[\\mathrm{H_2O+NH_3\\rightleftharpoons OH^-+NH_4^+}\\]',
        labels:[['H₂O · Säure','NH₃ · Base'],['H₂O gibt ab','NH₃ nimmt auf'],['OH⁻ · konjugierte Base','NH₄⁺ · konjugierte Säure']],
        explanations:[
          'Hier ist Wasser der Protonendonator und damit die Brønsted-Säure. Das N-Atom des Ammoniaks besitzt ein freies Elektronenpaar und kann damit ein Proton binden. Ammoniak ist die Brønsted-Base.',
          'Ein Proton des Wassers wird an N gebunden. Das bisherige O–H-Bindungspaar bleibt am O-Atom; das freie Paar des N-Atoms bildet die neue N–H-Bindung. Beide Änderungen gehören zu demselben Protonenübergang.',
          'Aus H₂O wird OH⁻ mit drei freien Elektronenpaaren am O-Atom. Aus NH₃ wird NH₄⁺ mit vier N–H-Bindungen und keinem freien Paar am N-Atom. Gezeigt ist ein einzelner Übergang: Im Gleichgewicht reagiert nur ein kleiner Teil des Ammoniaks. Auch die Rückreaktion ist möglich.'
        ]},

      lewis:{title:'Borsäure bindet eine weitere OH-Gruppe aus Wasser.',equation:'\\[\\mathrm{B(OH)_3+2\\,H_2O\\rightleftharpoons B(OH)_4^-+H_3O^+}\\]',
        labels:[['B(OH)₃ · Lewis-Säure','Zwei H₂O-Moleküle'],['O stellt das Bindungspaar bereit','Weiteres Wasser nimmt H⁺ auf'],['B(OH)₄⁻ · vier B–O-Bindungen','H₃O⁺ · saure Wirkung']],
        explanations:[
          'Borsäure besitzt am Borzentrum drei B–O-Bindungen. Bor kann ein weiteres Elektronenpaar aufnehmen: Es ist der Lewis-Säureteil. Zwei Wassermoleküle sind für die Gesamtbilanz nötig. Die freien Elektronenpaare der drei vorhandenen OH-Gruppen sind zur Übersicht nicht eingezeichnet.',
          'Schematisch koppeln wir zwei Bindungsänderungen: Ein O-Atom stellt sein freies Paar für die neue B–O-Bindung bereit. Eine seiner O–H-Bindungen wird gelöst; ihr Elektronenpaar bleibt bei diesem O. Das zweite Wasser bindet dieses Proton mit einem eigenen freien Paar. Die drei Pfeile verfolgen Elektronenpaare, nicht frei fliegende Protonen. Das ist eine Bilanzdarstellung, keine Behauptung eines einstufigen Reaktionsmechanismus.',
          'Bor ist jetzt an vier OH-Gruppen gebunden: B(OH)₄⁻. Die Umgebung des Boratoms ist tetraedrisch, hier mit Keilbindungen projiziert. Das andere Wasser wurde zu H₃O⁺. Die Ladungen −1 und +1 gleichen sich aus. Borsäure wirkt in dieser Gesamtreaktion sauer, indem ihr Borzentrum eine weitere OH-Gruppe bindet – nicht durch einfache Abgabe eines Protons aus einer der drei ursprünglichen OH-Gruppen.'
        ]},
      comparison:{title:'Ein freies Elektronenpaar wird zum Bindungspaar.',equation:'\\[\\mathrm{H_3N{:}+BF_3\\longrightarrow H_3N\\!\\longrightarrow\\!BF_3}\\]',
        labels:[['NH₃ · Lewis-Base','BF₃ · Lewis-Säure'],['N stellt das Paar bereit','B nimmt das Paar an'],['N · vier Bindungen','B · vier Bindungen']],
        explanations:[
          'Das N-Atom in NH₃ hat ein freies Elektronenpaar. Das B-Atom in BF₃ besitzt drei Bindungen und damit sechs Elektronen in seiner Valenzschale; es kann ein weiteres Elektronenpaar annehmen. NH₃ ist die Lewis-Base, BF₃ die Lewis-Säure.',
          'N und B nähern sich. Das freie Elektronenpaar des N-Atoms wird für beide Atome zum gemeinsamen Bindungspaar. Der gebogene Pfeil beginnt am Elektronenpaar und endet am B-Atom. Kein Proton wird übertragen, und kein Elektronenpaar verlässt das entstehende Addukt.',
          'Es entsteht das insgesamt neutrale Addukt H₃N–BF₃. Beide Elektronen der neuen B–N-Bindung stammen von N. In der Lewis-Strichformel mit vier gewöhnlichen Bindungen ergeben sich die Formalladungen N⁺ und B⁻; das sind keine zwei getrennten Ionen. B erreicht das Oktett und seine Umgebung wird tetraedrisch. Der gerade Pfeil N → B in der Formel kennzeichnet die Herkunft des Bindungspaars.'
        ]}
    };
    let kind='acid',progress=0,step=0,frame=null,started=0,startProgress=0;
    const clamp=n=>Math.max(0,Math.min(1,n)),mix=(a,b,t)=>a+(b-a)*t;
    const smooth=n=>{const t=clamp(n);return t*t*(3-2*t);};
    // Turn the drawing on narrow screens; labels remain upright.
    const point=(x,y)=>compact.matches?[230+(y-200)*.95,105+(x-200)*.65]:[x,y];
    const number=n=>Number(n.toFixed(2));
    function atom(symbol,x,y,{active=false,charge='',id=''}={}){
      const [px,py]=point(x,y);
      return `<g class="reaction-atom${active?' is-active':''}"${id?` data-atom="${id}"`:''}><text x="${number(px)}" y="${number(py)}">${symbol}</text>${charge?`<text class="reaction-charge" x="${number(px+20)}" y="${number(py-18)}">${charge}</text>`:''}</g>`;
    }
    function bond(x1,y1,x2,y2,{opacity=1,active=false,partial=false,wedge=false,hashed=false,id=''}={}){
      if(opacity<=0)return '';
      const [ax,ay]=point(x1,y1),[bx,by]=point(x2,y2),dx=bx-ax,dy=by-ay,length=Math.hypot(dx,dy),ux=dx/length,uy=dy/length;
      const a=[ax+ux*23,ay+uy*23],b=[bx-ux*23,by-uy*23],attrs=`class="reaction-bond${active?' is-active':''}${partial?' is-partial':''}" opacity="${number(opacity)}"${id?` data-bond="${id}"`:''}`;
      if(wedge)return `<path ${attrs} d="M${number(a[0])} ${number(a[1])} L${number(b[0]-uy*7)} ${number(b[1]+ux*7)} L${number(b[0]+uy*7)} ${number(b[1]-ux*7)} Z"/>`;
      if(hashed)return Array.from({length:7},(_,i)=>{const t=(i+1)/8,cx=mix(a[0],b[0],t),cy=mix(a[1],b[1],t),w=7*t;return `<line ${attrs} x1="${number(cx-uy*w)}" y1="${number(cy+ux*w)}" x2="${number(cx+uy*w)}" y2="${number(cy-ux*w)}"/>`;}).join('');
      return `<line ${attrs} x1="${number(a[0])}" y1="${number(a[1])}" x2="${number(b[0])}" y2="${number(b[1])}"/>`;
    }
    function pair(x,y,{active=false,vertical=false,id=''}={}){
      const [px,py]=point(x,y),d=compact.matches?5:5.5;
      return `<g class="reaction-pair${active?' is-active':''}"${id?` data-pair="${id}"`:''}><circle cx="${number(px+(vertical?0:-d))}" cy="${number(py+(vertical?-d:0))}" r="3.3"/><circle cx="${number(px+(vertical?0:d))}" cy="${number(py+(vertical?d:0))}" r="3.3"/></g>`;
    }
    function arrow(a,c,b){
      const [ax,ay]=point(...a),[cx,cy]=point(...c),[bx,by]=point(...b);
      return `<path class="reaction-electron-arrow" d="M${number(ax)} ${number(ay)} Q${number(cx)} ${number(cy)} ${number(bx)} ${number(by)}" marker-end="url(#reaction-electron-head)"/>`;
    }
    function protonDrawing(t){
      const p=smooth(t),donor=230,acceptor=670,y=200,hx=mix(donor+94,acceptor-94,p),hy=y-45*Math.sin(Math.PI*p),final=t>=1;
      let art='';
      const oldStrength=1-p,newStrength=p;
      art+=bond(donor,y,hx,hy,{opacity:oldStrength,partial:t>0&&t<1,active:true,id:'old-proton-bond'});
      art+=bond(hx,hy,acceptor,y,{opacity:newStrength,partial:t>0&&t<1,active:true,id:'new-proton-bond'});
      // The donor's original bond pair stays on the donor, and the acceptor's
      // lone pair becomes the new bond pair; neither is erased or duplicated.
      art+=pair(mix((donor+donor+94)/2,donor+35,p),y,{active:true,id:'donor-bond-pair'});
      art+=pair(mix(acceptor-35,acceptor-47,p),y,{active:true,id:'acceptor-pair'});
      art+=atom('H',hx,hy,{active:true,id:'transferred-hydrogen'});
      if(kind==='acid'){
        art+=atom('Cl',donor,y,{charge:final?'−':'',id:'donor'});
        art+=pair(donor-37,y,{vertical:true})+pair(donor,y-39)+pair(donor,y+39);
        art+=atom('O',acceptor,y,{charge:final?'+':'',id:'acceptor'})+pair(acceptor,y-39);
        for(const [x,dy] of [[acceptor+73,-61],[acceptor+73,61]])art+=bond(acceptor,y,x,y+dy)+atom('H',x,y+dy);
      }else{
        art+=atom('O',donor,y,{charge:final?'−':'',id:'donor'});
        art+=pair(donor,y-39)+pair(donor,y+39)+bond(donor,y,donor-73,y-61)+atom('H',donor-73,y-61);
        art+=atom('N',acceptor,y,{charge:final?'+':'',id:'acceptor'});
        for(const [x,dy] of [[acceptor+70,-74],[acceptor+94,0],[acceptor+70,74]])art+=bond(acceptor,y,x,y+dy)+atom('H',x,y+dy);
      }
      if(step===1){
        art+=arrow([acceptor-36,y-10],[hx+100,hy-108],[hx+8,hy-19]);
        art+=arrow([donor+41,y+9],[donor+63,y+79],[donor+25,y+25]);
      }
      return art;
    }
    function lewisDrawing(t){
      const approach=smooth(t),joining=smooth((t-.4)/.6),nx=mix(230,378,approach),bx=mix(670,522,approach),y=200,final=t>=1;
      let art=bond(nx,y,bx,y,{opacity:joining,active:true,partial:t>0&&t<1,id:'coordinate-bond'});
      const nHs=[[nx-80,y],[nx-50,y-82],[nx-50,y+82]];
      nHs.forEach(([x,yy],i)=>{art+=bond(nx,y,x,yy,{wedge:i===1,hashed:i===2})+atom('H',x,yy);});
      // BF3 starts trigonal planar. The product uses wedge/hash notation for
      // its tetrahedral B environment; this remains a 2-D projection.
      const initialFs=[[0,-94],[81,47],[-81,47]],finalFs=[[80,0],[45,-85],[45,85]];
      initialFs.forEach(([dx,dy],i)=>{
        const x=bx+mix(dx,finalFs[i][0],joining),yy=y+mix(dy,finalFs[i][1],joining);
        art+=bond(bx,y,x,yy,{wedge:final&&i===1,hashed:final&&i===2})+atom('F',x,yy);
      });
      art+=pair(mix(nx+35,(nx+bx)/2,joining),y,{active:true,id:'nitrogen-pair'});
      art+=atom('N',nx,y,{charge:final?'+':'',id:'nitrogen'})+atom('B',bx,y,{charge:final?'−':'',id:'boron'});
      if(step===1)art+=arrow([nx+35,y-10],[(nx+bx)/2,y-110],[bx-20,y-18]);
      return art;
    }

    function boricDrawing(t){
      const p=smooth(t),final=t>=1,bx=mix(230,300,p),oy=200,ox=mix(480,400,p),wx=mix(720,670,p);
      const hx=mix(555,590,p),hy=mix(155,200,p);
      let art=bond(bx,oy,ox,oy,{opacity:p,active:true,partial:!final,id:'boric-coordinate-bond'});
      art+=bond(ox,oy,hx,hy,{opacity:1-p,active:true,partial:t>0,id:'boric-old-oh'});
      art+=bond(wx,oy,hx,hy,{opacity:p,active:true,partial:!final,id:'boric-new-oh'});
      const initial=[[-100,0],[50,-87],[50,87]],product=[[-80,0],[-30,-85],[-30,85]];
      initial.forEach(([dx,dy],i)=>{
        const x=bx+mix(dx,product[i][0],p),y=oy+mix(dy,product[i][1],p);
        const length=Math.hypot(x-bx,y-oy),hhx=x+(x-bx)/length*55,hhy=y+(y-oy)/length*55;
        art+=bond(bx,oy,x,y,{wedge:final&&i===1,hashed:final&&i===2})+atom('O',x,y,{id:'boric-oxygen-'+i});
        art+=bond(x,y,hhx,hhy)+atom('H',hhx,hhy,{id:'boric-hydrogen-'+i});
      });
      art+=atom('B',bx,oy,{charge:final?'−':'',id:'boric-boron'});
      art+=atom('O',ox,oy,{id:'incoming-oxygen'})+bond(ox,oy,ox+55,oy+75)+atom('H',ox+55,oy+75,{id:'incoming-hydrogen'});
      art+=atom('O',wx,oy,{charge:final?'+':'',id:'hydronium-oxygen'});
      [[60,-65],[60,65]].forEach(([dx,dy],i)=>{art+=bond(wx,oy,wx+dx,oy+dy)+atom('H',wx+dx,oy+dy,{id:'water-hydrogen-'+i});});
      art+=atom('H',hx,hy,{active:true,id:'boric-transferred-hydrogen'});
      // These highlighted pairs are conserved. Dots on a bond are its pair,
      // not a second pair. Other lone pairs are omitted consistently.
      art+=pair(mix(ox-35,(bx+ox)/2,p),oy,{active:true,id:'boric-acceptor-pair'});
      art+=pair(mix((480+555)/2,ox, p),mix(177.5,oy-39,p),{active:true,id:'boric-old-bond-pair'});
      art+=pair(mix(wx-35,(wx+hx)/2,p),oy,{active:true,id:'boric-water-pair'});
      if(step===1){
        art+=arrow([ox-35,oy-10],[(bx+ox)/2,oy-100],[bx+20,oy-18]);
        art+=arrow([(ox+hx)/2,(oy+hy)/2],[ox+60,oy-100],[ox+15,oy-28]);
        art+=arrow([wx-35,oy-10],[hx+75,hy-85],[hx+14,hy-14]);
      }
      return art;
    }
    function draw(){
      const width=compact.matches?460:900,height=compact.matches?565:360;
      scene.dataset.reactionKind=kind;scene.dataset.progress=String(number(progress));
      scene.innerHTML=`<svg class="reaction-scene" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="reaction-svg-title reaction-svg-desc"><title id="reaction-svg-title">${models[kind].title} ${steps[step]}.</title><desc id="reaction-svg-desc">${models[kind].explanations[step]}</desc><defs><marker id="reaction-electron-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M1 1 L9 5 L1 9 Z"/></marker></defs>${kind==='lewis'?boricDrawing(progress):kind==='comparison'?lewisDrawing(progress):protonDrawing(progress)}</svg>`;
    }
    function playLabel(){
      const b=$('reaction-play');b.textContent=frame!==null?'Animation anhalten':reduced.matches?'Produkte zeigen':progress>=1?'Noch einmal abspielen':'Animation abspielen';b.setAttribute('aria-pressed',String(frame!==null));
    }
    function information(){
      $('reaction-title').textContent=models[kind].title;
      $('reaction-left-label').textContent=models[kind].labels[step][0];$('reaction-right-label').textContent=models[kind].labels[step][1];
      $('reaction-explanation').textContent=models[kind].explanations[step];
      $('reaction-status').textContent=`${step+1} von 3 · ${steps[step]}`;
      lab.querySelectorAll('[data-reaction-step]').forEach(b=>{const selected=Number(b.dataset.reactionStep)===step;b.setAttribute('aria-pressed',String(selected));if(selected)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
      $('reaction-legend').textContent=kind==='lewis'?'Farbiges H: Protonenübergang zwischen den Wassermolekülen · drei hervorgehobene Elektronenpaare bleiben erhalten · Punkte auf Bindungen zählen nicht zusätzlich · übrige freie Paare sind weggelassen. Keil / gestrichelter Keil: Bindung vor / hinter der Zeichenebene.':kind==='comparison'?'Punkte: Elektronenpaare · gebogener Pfeil: Elektronenpaarverschiebung · Keil / gestrichelter Keil: Bindung vor / hinter der Zeichenebene. Die Punkte auf der B–N-Bindung heben ihr Bindungspaar hervor; sie zählen nicht zusätzlich. Freie Paare an F sind zur Übersicht weggelassen.':'Farbiges H: übertragenes Proton · Punkte: Elektronenpaare · gebogene Pfeile: Elektronenpaarverschiebungen. Bindungsstriche stehen ebenfalls für Elektronenpaare; Punkte auf einem Strich heben dieses Paar nur hervor.';
      playLabel();
    }
    function stop(){if(frame!==null)window.cancelAnimationFrame(frame);frame=null;playLabel();}
    function setStep(next){stop();step=next;progress=next/2;draw();information();}
    function select(next){if(!models[next])return;stop();kind=next;step=0;progress=0;
      lab.querySelectorAll('button[data-reaction]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.reaction===kind)));
      window.AcidTypeset.replace($('reaction-equation'),models[kind].equation);draw();information();
    }
    function tick(time){
      if(started===null)started=time;
      progress=clamp(startProgress+(time-started)/6500);
      const next=progress>=1?2:progress>=.25?1:0;
      if(next!==step){step=next;information();}
      draw();
      if(progress>=1){frame=null;information();return;}
      frame=window.requestAnimationFrame(tick);
    }
    lab.querySelectorAll('button[data-reaction]').forEach(b=>b.addEventListener('click',()=>select(b.dataset.reaction)));
    lab.querySelectorAll('[data-reaction-step]').forEach(b=>b.addEventListener('click',()=>setStep(Number(b.dataset.reactionStep))));
    $('reaction-restart').addEventListener('click',()=>setStep(0));
    $('reaction-play').addEventListener('click',()=>{
      if(frame!==null){stop();return;}
      if(reduced.matches){setStep(2);return;}
      if(progress>=1)setStep(0);
      startProgress=progress;started=null;frame=window.requestAnimationFrame(tick);playLabel();
    });
    compact.addEventListener('change',draw);
    reduced.addEventListener('change',()=>{if(reduced.matches&&frame!==null)setStep(2);else playLabel();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
    select('acid');
    return{select,stop};
  }
  window.AcidReactionLab={init};
})();
