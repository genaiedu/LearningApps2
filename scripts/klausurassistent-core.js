(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();else root.KlausurDefaults=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const durationSource='https://bass.schule.nrw/6083.htm';
  const blank=value=>!String(value??'').trim();
  const names={chemie:'Chemie',physik:'Physik',biologie:'Biologie'};
  function minimumYear(state){return state.version==='2026'?2027+(state.phase.startsWith('Q1')?1:state.phase.startsWith('Q2')?2:0):2025;}
  function duration(state,sources){
    const {subject,version,phase,half,mode}=state,lk=phase.endsWith('LK');
    const curriculum=sources[subject].curriculum+(subject==='physik'?'#klausuren':'#abschnitt-22');
    if(mode==='abitur'){
      const examYear=Number(state.year)+1,verified=version==='2022'&&examYear>=2026&&examYear<=2029;
      return {minutes:lk?300:255,selection:true,abitur:true,provisional:!verified,
        source:verified?(examYear===2026?'https://bass.schule.nrw/19857.htm':durationSource):sources[subject].construction,
        note:verified?'Abitur '+examYear+': '+(lk?'300':'255')+' Minuten einschließlich Auswahlzeit. Die reguläre NRW-Dauer ist bereits eingesetzt; besondere fachpraktische Verlängerungen sind nicht automatisch enthalten.':
          'Planungswert nach der bisherigen Abiturkonstruktion: '+(lk?'300':'255')+' Minuten einschließlich Auswahlzeit. Für das gewählte Prüfungsjahr ist dies hier nicht als verbindlich bestätigt; der Prompt verlangt die Prüfung der jahrgangsbezogenen Vorgaben. Du musst dafür keinen eigenen Nachweis eintragen.'};
    }
    const pre=phase.startsWith('Q2')&&half==='2';
    if(pre)return {source:version==='2026'?sources[subject].construction:curriculum,minutes:lk?300:255,selection:true,provisional:version==='2026',note:version==='2026'?
      'Vorabitur: '+(lk?'300':'255')+' Minuten einschließlich Auswahlzeit als vorläufiger Planungswert. Die für das Prüfungsjahr geltende Dauer muss beim Entwurf anhand der amtlichen Vorgaben geprüft werden.':
      'Vorabitur unter Abiturbedingungen: Gesamtdauer einschließlich Auswahlzeit laut Curriculum. Die Vorgaben des konkreten Prüfungsjahres bleiben maßgeblich.'};
    if(subject==='biologie'&&version==='2022')return {source:curriculum,minutes:phase==='EF'?90:phase.startsWith('Q1')?(lk?(half==='1'?155:180):(half==='1'?110:135)):(lk?225:180),selection:false,provisional:false,note:'Vorgabe aus der schulischen Klausurdauer-Übersicht im Biologiecurriculum. Du kannst die Dauer anpassen.'};
    return {source:curriculum,minutes:phase==='EF'?90:phase.startsWith('Q1')?(lk?135:90):(lk?(version==='2026'?180:225):135),selection:false,provisional:false,note:'Klausurdauer aus dem jeweiligen Curriculum. Du kannst sie anpassen; der Prompt benennt Abweichungen ausdrücklich.'};
  }
  function topics(state){
    const abitur=state.mode==='abitur',year=Number(state.year)+1;
    return abitur?'Keine thematische Einschränkung: Erstelle einen vollständigen Abitur-Übungsaufgabensatz im Fach '+names[state.subject]+' für '+(state.phase.endsWith('LK')?'Leistungskurs':'Grundkurs')+', Abitur '+year+'. Bestimme die vollständige prüfungsrelevante Breite aus dem gewählten Kernlehrplan und den amtlichen jahrgangsbezogenen Abiturvorgaben. Wähle geeignete Themen und Methoden selbst. Dies ist keine Bestätigung des tatsächlich erteilten Unterrichts; kennzeichne die Unterrichtsvoraussetzungen im Lehrkraftteil zum Abgleich. Frage nicht allein wegen einer fehlenden Themenliste erneut nach.':
      'Planungsentwurf für '+names[state.subject]+', '+state.phase+': Wähle zusammenhängende Themen und Methoden aus dem schulinternen Curriculum für diese Kursstufe und dieses Halbjahr. Es liegen keine konkreten Angaben zum tatsächlich erteilten Unterricht vor. Weise deine Themenwahl und die vorausgesetzten Kenntnisse im Lehrkraftteil aus; die Lehrkraft muss sie vor dem Einsatz mit dem Unterricht abgleichen. Behaupte nicht, die Lernenden hätten diese Inhalte bereits behandelt oder geübt.';
  }
  function aids(state){return 'Hilfsmittel nach den für '+names[state.subject]+' und '+(state.mode==='abitur'?'das gewählte Abiturjahr':'diese Kursstufe und Klausurart')+' geltenden Vorgaben festlegen und im Lehrkraftteil belegen. Zulassung von Taschenrechner, Wörterbuch und gegebenenfalls amtlicher Formelsammlung anhand der Originalvorgaben prüfen; keine zusätzlichen Hilfsmittel frei erfinden.';}
  function comparison(value){return value==='yes'?'ja · Vergleichsunterlagen berücksichtigen':value==='no'?'nein':'nicht angegeben · keine bestätigte Aussage über frühere Klausuren';}
  function proposal(id,state,info){
    const values={year:Math.max(2026,minimumYear(state)),'exam-year':Math.max(2026,minimumYear(state))+1,minutes:info.minutes,topics:topics(state),aids:aids(state),
      'custom-points':100,'context-choice':'ai',practice:'unspecified',previous:'unspecified',
      'comparison-notes':state.files?.length?'Vergleichsunterlagen: '+state.files.join('; ')+'. Die genaue Zuordnung ist aus den hochgeladenen Dateien zu klären.':'Vergleichsunterlagen wurden angekündigt, aber noch nicht beschrieben. Vor einer Ähnlichkeitsprüfung in der KI anfordern; keine bereits erfolgte Prüfung behaupten.'};
    if(id==='context')id='context-choice';
    const reasons={year:'Schuljahr passend zur gewählten Kohorte.','exam-year':'Prüfungsjahr passend zur gewählten Kohorte.',minutes:info.note,topics:'Ein transparenter Curriculum-Planungsentwurf, keine erfundene Unterrichtsbestätigung.',aids:'Zulässige Hilfsmittel aus den Originalvorgaben bestimmen lassen.',
      'custom-points':'100 BE als anpassbarer schulischer Planungswert.','context-choice':'Einen fachlich passenden Kontext entwickeln lassen statt einen fehlenden Kontext zu erfinden.',practice:'Keine Angabe ist nicht gleichbedeutend mit Nein.',previous:'Keine Angabe ist nicht gleichbedeutend mit Nein.','comparison-notes':'Fehlende Unterlagen bleiben ausdrücklich als offen gekennzeichnet.'};
    return Object.hasOwn(values,id)?{id,value:String(values[id]),reason:reasons[id]}:null;
  }
  function completionIds(state,issues){
    const ids=[...issues];
    if(state.mode!=='abitur'&&blank(state.topics))ids.push('topics');
    if(blank(state.aids))ids.push('aids');
    if(blank(state.minutes))ids.push('minutes');
    if(blank(state.year))ids.push(state.mode==='abitur'?'exam-year':'year');
    if(state.contextChoice==='teacher'&&blank(state.context))ids.push('context');
    return [...new Set(ids)];
  }
  return {minimumYear,duration,topics,aids,comparison,proposal,completionIds};
});
