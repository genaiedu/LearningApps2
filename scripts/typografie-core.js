(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TypoCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function luminance(hex){if(!/^#[0-9a-f]{6}$/i.test(hex))throw Error('Sechsstellige Hexfarbe erforderlich');const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];}
  function contrast(a,b){const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
  function escapeTex(text){const map={'\\':'\\textbackslash{}','{':'\\{','}':'\\}','%':'\\%','$':'\\$','&':'\\&','_':'\\_','#':'\\#','~':'\\textasciitilde{}','^':'\\textasciicircum{}'};return String(text||'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/[\\{}%$&_#~^]/g,c=>map[c]);}
  function paragraphs(text){return String(text||'').replace(/\r\n?/g,'\n').split(/\n\s*\n/).map(p=>escapeTex(p).replace(/\n/g,' ')).join('\n\n');}
  function texDocument({kind='bericht',title='Mein Dokument',author='',date='',recipient='',body='',engine='pdftex',variant='classic'}={}){
    if(!['bericht','brief','einladung','protokoll'].includes(kind))throw Error('Unbekannter Dokumenttyp');
    if(!['pdftex','luatex'].includes(engine))throw Error('Unbekannte Engine');
    if(!['classic','modern'].includes(variant))throw Error('Unbekannte Gestaltung');
    const e=escapeTex,b=paragraphs(body),letter=kind==='brief',modern=variant==='modern',spread=['bericht','protokoll'].includes(kind),font=modern?String.raw`\sffamily`:String.raw`\rmfamily`;
    const lines=['% Typografie-Atelier · DIN A4 · Zwölferteilung · keine DIN-5008-Zertifizierung.','% Engine: '+(engine==='luatex'?'LuaLaTeX':'pdfLaTeX'),String.raw`\documentclass[12pt,a4paper,ngerman,DIV=12,BCOR=0mm,${spread?'twoside':'oneside'}]{${letter?'scrlttr2':'scrartcl'}}`];
    lines.push(String.raw`\usepackage{iftex}`,String.raw`\usepackage[T1]{fontenc}`,String.raw`\ifPDFTeX`,String.raw`  \usepackage[utf8]{inputenc}`,String.raw`\else`,String.raw`  \usepackage[utf8]{luainputenc}`,String.raw`\fi`,String.raw`\usepackage[type1]{ebgaramond}`,String.raw`\usepackage[type1${modern?',sfdefault':''}]{FiraSans}`,String.raw`\usepackage[ngerman]{babel}`,String.raw`\usepackage{microtype}`,String.raw`\usepackage{ragged2e}`);
    lines.push(String.raw`\usepackage[top=24.75mm,bottom=49.5mm,${spread?'inner=17.5mm,outer=35mm':'left=26.25mm,right=26.25mm'},headheight=12pt,headsep=8mm,footskip=12mm]{geometry}`,String.raw`\newcommand{\datenschrift}{\sffamily\small\firalining\firatabular}`,String.raw`\setlength{\parindent}{${modern?'0pt':'1em'}}`,String.raw`\setlength{\parskip}{${modern?'.5\\baselineskip':'0pt'}}`);
    if(letter){
      lines.push(String.raw`\KOMAoptions{foldmarks=false,fromalign=left,fromrule=false}`,String.raw`\setkomafont{subject}{${font}\bfseries}`,String.raw`\setkomafont{fromname}{\datenschrift}`,String.raw`\setkomafont{fromaddress}{\datenschrift}`,String.raw`\setkomafont{pagenumber}{\datenschrift}`,String.raw`\setkomafont{addressee}{\datenschrift}`,String.raw`\setkomafont{refname}{\datenschrift}`,String.raw`\setkomafont{refvalue}{\datenschrift}`);
      for(const [key,value]of [['toaddrhpos',20],['toaddrvpos',45],['toaddrwidth',85],['toaddrheight',45],['backaddrheight',17.7],['refvpos',98.5],['firstfootvpos',279]])lines.push(String.raw`\setplength{${key}}{${value}mm}`);
      lines.push(String.raw`\setkomavar{fromname}{${e(author)}}`,String.raw`\setkomavar{fromaddress}{[Straße und Hausnummer]\\{} [Postleitzahl Ort]}`,String.raw`\setkomavar{date}{${e(date)}}`,String.raw`\setkomavar{subject}{${e(title)}}`,String.raw`\begin{document}`);
      lines.push(String.raw`\RaggedRight`,String.raw`\setlength{\parindent}{0pt}`,String.raw`\setlength{\parskip}{.5\baselineskip}`);
      lines.push(String.raw`\begin{letter}{${e(recipient).split('\n').join(String.raw`\\`+'\n')}}`,String.raw`\opening{Sehr geehrte Damen und Herren,}`,b,String.raw`\closing{Mit freundlichen Grüßen}`,String.raw`\end{letter}`,String.raw`\end{document}`);
    }else{
      lines.push(String.raw`\setkomafont{disposition}{${font}\bfseries}`,String.raw`\setkomafont{section}{${font}\normalsize\bfseries}`,String.raw`\setkomafont{subsection}{${font}\normalsize\itshape}`,String.raw`\setkomafont{title}{${font}\LARGE\bfseries}`,String.raw`\setkomafont{author}{\datenschrift}`,String.raw`\setkomafont{date}{\datenschrift}`,String.raw`\usepackage{scrlayer-scrpage}`,String.raw`\clearpairofpagestyles`,String.raw`\setkomafont{pageheadfoot}{\datenschrift}`,String.raw`\setkomafont{pagenumber}{\datenschrift}`,String.raw`\ofoot*{\pagemark}`);
      if(kind==='einladung'){
        lines.push(String.raw`\begin{document}`);if(modern)lines.push(String.raw`\RaggedRight`);
        lines.push(String.raw`\begin{center}`,String.raw`{\normalsize\itshape Einladung\par}`,String.raw`\bigskip`,String.raw`{\LARGE\bfseries ${e(title)}\par}`,String.raw`\bigskip`,String.raw`{\datenschrift ${e(date)}}`,String.raw`\end{center}`,String.raw`\bigskip`,b,String.raw`\bigskip`,e(author),String.raw`\end{document}`);
      }else{
        lines.push(String.raw`\title{${e(title)}}`,String.raw`\author{${e(author)}}`,String.raw`\date{${e(date)}}`,String.raw`\begin{document}`);if(modern)lines.push(String.raw`\RaggedRight`);
        lines.push(String.raw`\maketitle`,kind==='protokoll'?String.raw`\section*{Ergebnisse und Vereinbarungen}`:String.raw`\section*{Darstellung}`,b,String.raw`\end{document}`);
      }
    }
    return lines.join('\n')+'\n';
  }
  function shuffle(items,random=Math.random){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function canon(width=210,height=297){return {width,height,inner:width/9,outer:2*width/9,top:height/9,bottom:2*height/9,textWidth:width*2/3,textHeight:height*2/3};}
  function fontWeight(font,requested){const regular=font.files.filter(f=>f.style==='normal');const variable=regular.find(f=>Array.isArray(f.weight));if(variable)return Math.max(variable.weight[0],Math.min(variable.weight[1],Number(requested)));const weights=regular.map(f=>Number(f.weight));return weights.sort((a,b)=>Math.abs(a-requested)-Math.abs(b-requested))[0];}
  return {luminance,contrast,escapeTex,paragraphs,texDocument,shuffle,canon,fontWeight};
});
