(function(root,factory){
  const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TypoMathPairs=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const examples={
    fraction:['x_{1,2}=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}','Zähler und Nenner stehen übereinander; die Wurzel umfasst den gesamten Ausdruck.'],
    integral:['\\int_0^1 x^2\\,\\mathrm{d}x=\\frac{1}{3}','Grenzen gehören zum Integral. Hier steht das Differential d bewusst aufrecht.'],
    units:['v=3{,}2\\,\\mathrm{m\\,s^{-1}},\\qquad \\sin(\\alpha)=\\frac{a}{c}','Variable v und Winkel α sind kursiv; Einheit und Funktionsname sin stehen aufrecht.'],
    matrix:['A=\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}','Die Klammern passen zur zweizeiligen Matrix. Ein normaler Klammerbuchstabe reicht dafür nicht.'],
    symbols:['\\sum_{k=1}^{n}\\alpha_k=\\beta,\\qquad \\mathbf{F}=m\\mathbf{a}','Griechische Buchstaben, Summenzeichen und fette Vektorzeichen gehören zum selben mathematischen Schriftsystem.']
  };
  const bodies={
    cardo:{name:'Cardo',group:'serif'},garamond:{name:'EB Garamond',group:'serif'},
    baskerville:{name:'Libre Baskerville',group:'serif'},goudy:{name:'Goudy Bookletter 1911',group:'serif'},
    sourcesans:{name:'Source Sans 3',group:'sans'},inter:{name:'Inter',group:'sans'}
  };
  const fonts={
    newcm:{name:'New Computer Modern',kind:'Klassischer TeX-Ausdruck',body:'garamond',
      serif:'Mit EB Garamond oder Cardo bleibt die Seite buchbetont. Die feinere, anders gezeichnete Formel darf als Rechnung erkennbar bleiben; es ist keine identische Schriftfamilie.',
      sans:'Neben einer serifenlosen Leseschrift entsteht ein bewusstes Signal: Hier beginnt die Rechnung. Das kann in einem Lerntext hilfreich sein. Prüfe, ob die feinere Formel gegenüber dem kräftigeren Text zurückfällt.'},
    stix2:{name:'STIX Two',kind:'Publikationsorientierte Antiqua',body:'baskerville',
      serif:'Libre Baskerville bietet hier eine kräftigere Antiqua als Partner. Vergleiche vor allem Ziffern, Kursiven und die Dunkelheit der Zeile. Die Kombination ist eine Gestaltungsprobe, kein gemeinsamer Familienschnitt.',
      sans:'Source Sans 3 oder Inter können die Erläuterung klar vom mathematischen Ausdruck unterscheiden. Dieser Serif–Sans-Kontrast funktioniert, wenn Größe und Schriftfarbe nicht auseinanderlaufen.'},
    pagella:{name:'Gyre Pagella',kind:'Breitere, schreibbetonte Antiqua',body:'cardo',
      serif:'Cardo oder Goudy Bookletter 1911 nehmen den buchbetonten, schreibnahen Ausdruck auf. Achte darauf, ob die breiteren Formeln in deine Spalte passen. Ähnliche Stimmung bedeutet nicht gleiche Buchstaben.',
      sans:'Eine humanistische Sans wie Source Sans 3 kann den schreibbetonten Ausdruck aufnehmen, ohne die Serifen nachzuahmen. Inter erzeugt einen deutlich sachlicheren Gegenpol. Beides sollte an einer ganzen Seite geprüft werden.'},
    fira:{name:'Fira Math',kind:'Serifenloser Formelsatz',body:'sourcesans',
      serif:'Serifentext und serifenlose Formel sind kein Fehler. Die Formel wirkt dadurch deutlich anders, oft technischer. Prüfe, ob diese Trennung zum Text passt oder die Rechnung unangemessen hervorhebt.',
      sans:'Mit Source Sans 3 entsteht eine humanistisch geprägte serifenlose Paarung; mit Inter eine sachlichere. Das ist keine gemeinsame Familie. Vergleiche besonders x-Höhe, Breite und Gewicht, statt allein auf fehlende Serifen zu achten.'}
  };
  function settings(input={}){
    const font=Object.hasOwn(fonts,input.font)?input.font:'newcm';
    const body=Object.hasOwn(bodies,input.body)?input.body:fonts[font].body;
    const example=Object.hasOwn(examples,input.example)?input.example:'fraction';
    return {font,body,example};
  }
  function advice(font,body){const s=settings({font,body});return bodies[s.body].name+' · '+fonts[s.font][bodies[s.body].group];}
  return {examples,bodies,fonts,settings,advice};
});
