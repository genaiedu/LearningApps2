/* Eigene schematische Erklärzeichnungen; keine historische Vermessung. */
(function(root){
  'use strict';let serial=0;
  const line=(x1,y1,x2,y2,cls='ink-line',extra='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}" ${extra}/>`;
  const text=(x,y,s,cls='',anchor='start')=>`<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${s}</text>`;
  function defs(){const id='moehne-arrow-'+(++serial);return {id,html:`<defs><marker id="${id}" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4 0 8Z" fill="var(--water-line)"/></marker><marker id="${id}-ink" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4 0 8Z" fill="var(--red)"/></marker></defs>`};}
  function rivers(){const d=defs();return d.html+
    `<path d="M960 95C915 80 890 120 855 130" class="water-line" marker-end="url(#${d.id})"/><path d="M900 300C890 240 855 205 820 180" class="water-line" marker-end="url(#${d.id})"/><path d="M740 132Q790 108 850 130L865 175Q807 195 745 171Z" class="water-shape"/><path d="M738 150C675 155 655 175 640 214S605 258 555 258" class="water-line" marker-end="url(#${d.id})"/><path d="M570 310C565 285 558 273 555 258C465 252 460 280 375 270S250 260 175 270L90 270" class="water-line" marker-end="url(#${d.id})"/><path d="M65 325L65 80" class="water-line" marker-end="url(#${d.id})"/>`+
    text(970,65,'Möhne','','end')+text(970,315,'Heve','','end')+text(800,100,'Möhnesee','', 'middle')+line(735,120,735,181,'accent-line')+text(690,101,'Staumauer','label-small map-detail','middle')+
    text(680,218,'Himmelpforten','label-small map-detail')+text(575,242,'Neheim','label-small')+text(415,246,'Ruhr','', 'middle')+text(350,310,'Schwerte / Hagen','label-small map-detail','middle')+text(160,310,'Raum Hattingen / Essen','label-small map-detail','middle')+text(65,55,'Rhein','', 'middle')+
    text(68,353,'Fließrichtung zur Nordsee','label-small')+`<circle cx="555" cy="258" r="5" class="accent-fill"/>`+text(100,180,'Flusssystem der Ruhr','label-muted');}
  function build(phase){const n=Math.max(0,Math.min(5,Math.round(phase))),d=defs(),p=[];
    p.push(d.html,`<path d="M35 48Q250 30 480 55T965 40L965 400Q780 365 555 397T35 390Z" class="land-shape"/>`);
    p.push(`<path d="M55 240C210 215 350 255 480 235S740 230 945 230" stroke="var(--water)" stroke-width="52" fill="none"/>`);
    p.push(`<path d="M55 240C210 215 350 255 480 235S740 230 945 230" class="${n>=2?'water-line dashed':'flow-line flowing'}" opacity="${n>=2?.25:1}" ${n<2?`marker-end="url(#${d.id})"`:''}/>`);
    if(n>=1)p.push(`<path d="M255 228Q285 88 410 90L690 90Q820 90 805 228" fill="none" stroke="var(--paper)" stroke-width="44"/><path d="M255 228Q285 88 410 90L690 90Q820 90 805 228" fill="none" stroke="var(--ink)" stroke-width="2" stroke-dasharray="6 5"/><path d="M410 69L690 69L690 111L410 111Z" fill="var(--stone)" opacity=".5"/>`,text(330,62,'Graben','label-small','middle'),text(550,58,'Stollen · 305 m','label-small','middle'));
    if(n>=2&&n<5)p.push(`<path d="M255 228Q285 88 410 90L690 90Q820 90 805 228" class="flow-line flowing" marker-end="url(#${d.id})"/>`,`<path d="M350 182L350 288M735 183L735 288" stroke="var(--stone)" stroke-width="22"/>`,text(350,323,'Absperrung','label-small','middle'),text(735,323,'Absperrung','label-small','middle'),`<path d="M365 172L720 172L720 292L365 292Z" fill="var(--paper)" stroke="var(--muted)" stroke-dasharray="5 5"/>`);
    if(n===3)p.push(`<path d="M505 145Q540 170 505 292L570 305Q620 210 590 145Z" fill="var(--surface)" stroke="var(--muted)" stroke-dasharray="5 5"/>`,text(548,360,'Baugrube','', 'middle'));
    if(n>=4)p.push(`<path d="M530 145Q580 230 530 310L571 310Q620 230 571 145Z" class="stone-shape"/>`,text(565,360,'Staumauer','', 'middle'));
    if(n===5)p.push(`<path d="M55 150Q170 145 280 175L525 175Q554 235 525 291L280 295Q170 315 55 300Z" class="water-shape"/>`,text(230,204,'Stausee','', 'middle'),line(580,245,945,245,'flow-line flowing',`marker-end="url(#${d.id})"`));
    p.push(text(70,357,'Zufluss','label-small'),text(930,357,'Abfluss','label-small','end'),text(500,417,n<2?'Der Fluss fließt im bisherigen Bett.':n<5?'Das Wasser umgeht den geschützten Arbeitsbereich.':'Wasser wird zurückgehalten und weiterhin gezielt abgegeben.','label-small scene-foot','middle'));
    return p.join('');}
  function wall(value=75){const f=Math.max(0,Math.min(100,Number(value)))/100,d=defs(),top=350-f*265,p=[d.html];
    p.push(`<path d="M30 350L30 ${top}L356 ${top}L356 350Z" class="water-shape"/>`,`<path d="M350 70L393 70Q420 195 535 350L350 350Z" class="stone-shape"/>`,`<path d="M25 350L707 350L707 395L25 395Z" class="land-shape"/>`);
    p.push(line(460,300,610,300,'water-line',`marker-end="url(#${d.id})"`),line(360,300,460,300,'water-line'),text(575,277,'Auslass','label-small'));
    for(let i=1;i<=4;i++){const y=top+(350-top)*i/5,len=14+f*i*12;p.push(line(344-len,y,344,y,'accent-line',`marker-end="url(#${d.id}-ink)"`));}
    p.push(line(400,145,400,290,'accent-line',`marker-end="url(#${d.id}-ink)"`),text(423,185,'Eigengewicht','label-small'),text(120,315,'Wasserdruck','label-small'),text(28,45,'Wasserseite','label-muted'),text(570,45,'Luftseite','label-muted'),text(365,425,'Tragfähiger Untergrund','label-small','middle'));
    return p.join('');}
  function attack(phase){const n=Math.max(0,Math.min(4,Math.round(phase))),d=defs(),p=[d.html];
    p.push(`<path d="M30 215L785 215L785 380L30 380Z" class="water-shape"/><path d="M30 380L970 380L970 420L30 420Z" class="land-shape"/>`);
    p.push(`<path d="M785 160L827 160Q850 290 930 380L785 380Z" class="stone-shape"/>`);
    p.push(`<path d="M587 225L587 370M587 245L630 265L587 285L630 305L587 325L630 345M630 225L630 370M587 245L630 225M587 285L630 265M587 325L630 305M587 365L630 345" class="ink-line" opacity=".6"/>`,text(605,410,'Torpedonetz','label-small','middle'),text(850,125,'Staumauer','', 'middle'),text(70,250,'Wasser','label-small'));
    if(n<=1)p.push(`<path d="M150 100L240 100L280 70L300 70L277 100L350 100L365 110L270 120L240 145L225 145L235 118L165 118Z" fill="var(--muted)"/>`,text(247,55,'Britischer Bomber','label-small','middle'));
    if(n===1)p.push(`<path d="M260 195Q325 100 390 211Q460 100 525 211Q610 115 680 211L766 211" class="accent-line dashed"/><circle cx="760" cy="209" r="10" class="accent-fill bounce"/>`,text(415,170,'Sprünge über die Oberfläche','label-small','middle'));
    if(n===2)p.push(`<circle cx="777" cy="280" r="13" class="accent-fill"/><g class="pressure-wave"><circle cx="777" cy="280" r="53" class="accent-line"/><circle cx="777" cy="280" r="83" class="accent-line"/></g>`,text(445,334,'Sprengwirkung unter Wasser','label-small','middle'));
    if(n>=3)p.push(`<path d="M785 160L827 160L846 234L810 266L843 296L785 323Z" class="water-shape"/><path d="M820 264Q878 230 975 285M813 287Q888 295 975 350" class="flow-line flowing" marker-end="url(#${d.id})"/>`,text(505,145,'Beschädigung → größerer Bruch','label-small','middle'));
    if(n===4)p.push(`<path d="M870 347Q910 318 975 335L975 379L893 379Z" class="water-shape"/>`,text(480,80,'Die Flut folgt dem Tal zur Möhne und Ruhr.','label-small','middle'));
    return p.join('');}
  const api={rivers,build,wall,attack};if(typeof module==='object'&&module.exports)module.exports=api;root.MoehneDraw=api;
})(typeof globalThis!=='undefined'?globalThis:this);
