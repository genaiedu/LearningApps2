(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TypoCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function luminance(hex){if(!/^#[0-9a-f]{6}$/i.test(hex))throw Error('Sechsstellige Hexfarbe erforderlich');const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];}
  function contrast(a,b){const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
  function escapeTex(text){const map={'\\':'\\textbackslash{}','{':'\\{','}':'\\}','%':'\\%','$':'\\$','&':'\\&','_':'\\_','#':'\\#','~':'\\textasciitilde{}','^':'\\textasciicircum{}'};return String(text||'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/[\\{}%$&_#~^]/g,c=>map[c]);}
  function paragraphs(text){return String(text||'').replace(/\r\n?/g,'\n').split(/\n\s*\n/).map(p=>escapeTex(p).replace(/\n/g,' ')).join('\n\n');}
  function texDocument({kind='bericht',title='Mein Dokument',author='',date='',recipient='',body='',engine='pdftex'}={}){
    if(!['bericht','brief','einladung','protokoll'].includes(kind))throw Error('Unbekannter Dokumenttyp');
    if(!['pdftex','luatex'].includes(engine))throw Error('Unbekannte Engine');
    const e=escapeTex, b=paragraphs(body), letter=kind==='brief';
    let s='% Typografie-Atelier · DIN A4 · Eingaben sind Text, keine TeX-Befehle.\n% Engine: '+(engine==='luatex'?'LuaLaTeX':'pdfLaTeX')+'\n';
    s+='\\documentclass[11pt,a4paper,ngerman]{'+(letter?'scrlttr2':'scrartcl')+'}\n';
    s+=engine==='luatex'?'\\usepackage{fontspec}\n% Falls TeX Gyre nicht installiert ist, bleiben die Standardschriften aktiv.\n\\IfFontExistsTF{TeX Gyre Pagella}{\\setmainfont{TeX Gyre Pagella}}{}\n\\IfFontExistsTF{TeX Gyre Heros}{\\setsansfont{TeX Gyre Heros}}{}\n':'\\usepackage[T1]{fontenc}\n\\usepackage[utf8]{inputenc}\n\\usepackage{tgpagella}\n\\usepackage{tgheros}\n';
    s+='\\usepackage[ngerman]{babel}\n\\usepackage{microtype}\n';
    if(letter)s+='\\setkomafont{subject}{\\normalfont\\bfseries}\n';
    else s+='\\setkomafont{disposition}{\\normalfont\\bfseries}\n\\setkomafont{section}{\\normalsize\\bfseries}\n\\setkomafont{title}{\\normalfont\\LARGE}\n\\setkomafont{author}{\\normalfont\\normalsize}\n\\setkomafont{date}{\\normalfont\\normalsize}\n';
    if(!letter)s+='\\usepackage[left=28mm,right=28mm,top=25mm,bottom=30mm]{geometry}\n';
    if(letter){s+='\\setkomavar{fromname}{'+e(author)+'}\n\\setkomavar{date}{'+e(date)+'}\n\\setkomavar{subject}{'+e(title)+'}\n\\begin{document}\n\\begin{letter}{'+e(recipient).replace(/\n/g,'\\\\\n')+'}\n\\opening{Sehr geehrte Damen und Herren,}\n'+b+'\n\\closing{Mit freundlichen Grüßen}\n\\end{letter}\n\\end{document}\n';}
    else if(kind==='einladung'){s+='\\pagestyle{empty}\n\\begin{document}\n\\begin{center}\n{\\normalsize\\itshape Einladung\\par}\n\\bigskip\n{\\LARGE '+e(title)+'\\par}\n\\bigskip\n'+e(date)+'\\par\n\\end{center}\n\\bigskip\n'+b+'\n\\bigskip\n\\begin{flushright}\n'+e(author)+'\n\\end{flushright}\n\\end{document}\n';}
    else {s+='\\title{'+e(title)+'}\n\\author{'+e(author)+'}\n\\date{'+e(date)+'}\n\\begin{document}\n\\maketitle\n'+(kind==='protokoll'?'\\section*{Ergebnisse und Vereinbarungen}\n':'\\section*{Darstellung}\n')+b+'\n\\end{document}\n';}
    return s;
  }
  function shuffle(items,random=Math.random){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function canon(width=210,height=297){return {width,height,inner:width/9,outer:2*width/9,top:height/9,bottom:2*height/9,textWidth:width*2/3,textHeight:height*2/3};}
  function fontWeight(font,requested){const regular=font.files.filter(f=>f.style==='normal');const variable=regular.find(f=>Array.isArray(f.weight));if(variable)return Math.max(variable.weight[0],Math.min(variable.weight[1],Number(requested)));const weights=regular.map(f=>Number(f.weight));return weights.sort((a,b)=>Math.abs(a-requested)-Math.abs(b-requested))[0];}
  return {luminance,contrast,escapeTex,paragraphs,texDocument,shuffle,canon,fontWeight};
});
