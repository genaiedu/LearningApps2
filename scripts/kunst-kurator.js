(function (root) {
  'use strict';
  const baseFields = ['date','style','artist','technique'];
  const fieldsFor=state=>[...baseFields,...(state?.options?.title||state?.fieldCount===5?['title']:[])];
  const fieldNames = {title:'Werktitel',date:'Datierung',style:'Stilzuordnung',artist:'Künstlername',technique:'Technik'};
  const hash = text => { let n=2166136261; for(const character of text) n=Math.imul(n^character.codePointAt(0),16777619); return n>>>0; };
  const join = items => items.length < 2 ? items[0] || '' : items.slice(0,-1).join(', ')+' und '+items.at(-1);
  const title = work => work.titleDe || work.galleryTitle || work.title;
  const quote = text => '„'+text+'“';
  function chooser(work,state) {
    const index=Math.max(0,state.ids.indexOf(work.id));
    const room=state.ids.join('|')+'|'+state.escaped;
    const selected=new Map(), families=new Map();
    // Adjacent cards use different variants of the same opening bank. The room
    // identity also changes phrasing when a work returns in a later round.
    return (key,bank) => {
      if(selected.has(key)) return bank[selected.get(key)];
      let position=(hash(room+'|'+key)+index+(key.startsWith('opening') ? 0 : hash(work.id+'|'+key)))%bank.length;
      // The two sections must not address the reader with the same sentence
      // pattern immediately twice, even when their subject matter differs.
      const family=['looking-','practitioners-','artist-known-'].find(prefix=>key.startsWith(prefix));
      if(family && families.get(family)===position) position=(position+1)%bank.length;
      if(family) families.set(family,position);
      selected.set(key,position);return bank[position];
    };
  }
  function dateSpan(text) {
    if (typeof text !== 'string') return null;
    const main=text.split(/[,;]/)[0].trim(); // A later cast or print is not the model/negative date.
    const ancient=main.match(/\b(\d{1,4})(?:\s*[–\-/]\s*(\d{1,4}))?\s*(v\.\s*Chr\.|n\.\s*Chr\.|BCE|CE)/i);
    if(ancient){
      const sign=/^(v\.|BCE)/i.test(ancient[3])?-1:1;
      const values=[Number(ancient[1])*sign,Number(ancient[2]||ancient[1])*sign];
      const approximate=/\b(um|ca\.?|circa|about|around)\b/i.test(main);
      return {min:Math.min(...values),max:Math.max(...values),approximate};
    }
    const decade=main.match(/^(\d{3})0s$/);
    if(decade) return {min:Number(decade[1]+'0'),max:Number(decade[1]+'9'),approximate:true};
    const match=main.match(/\b(1\d{3}|20\d{2})(?:\s*[–\-/]\s*(?:ca\.\s*)?(\d{1,4}))?/);
    if(!match) return null;
    const start=Number(match[1]); let end=match[2] ? Number(match[2]) : start;
    if(match[2] && match[2].length<4) {
      const magnitude=10**match[2].length;
      end=Math.floor(start/magnitude)*magnitude+end;
      if(end<start) end+=magnitude;
    }
    if(end<start || end-start>200) return null;
    const approximate=/\b(um|ca\.?|circa|about|around)\b/i.test(main);
    if(/\b(after|nach)\b/i.test(main)) return {min:start,max:Infinity,approximate:true};
    if(/\b(before|vor|by|bis)\b/i.test(main)) return {min:-Infinity,max:end,approximate:true};
    return {min:start-(approximate?5:0),max:end+(approximate?5:0),approximate};
  }
  function stage(date,profile) {
    const span=dateSpan(date), range=profile?.range;
    if(!span || !range || !Number.isFinite(span.min) || !Number.isFinite(span.max)) return 'open';
    if(span.max<range[0]) return 'before';
    if(span.min>range[1]) return 'after';
    if(span.min<range[0] || span.max>range[1]) return 'overlap';
    if(span.max<=range[0]+(range[1]-range[0])*.2) return 'early';
    return 'within';
  }
  function outcomes(work,state,pool) {
    const fields=fieldsFor(state);
    const first=state.attemptLog?.find(entry=>entry.attempt===1)?.choices[work.id];
    const last=state.review?.choices?.[work.id] || state.choices?.[work.id] || {};
    const result=Object.fromEntries(fields.map(field=>[field,{first:first ? first[field]===work[field] : null,correct:last[field]===work[field],value:last[field] || ''}]));
    const unresolved=state.ids.filter(id => {
      const other=pool.find(item=>item.id===id), selection=state.review?.choices?.[id] || state.choices?.[id];
      return other && fields.some(field=>selection?.[field]!==other[field]);
    });
    return {total:fields.length,fields:result,firstCount:first ? fields.filter(field=>result[field].first).length : null,
      finalCount:fields.filter(field=>result[field].correct).length,
      fixed:fields.filter(field=>result[field].first===false && result[field].correct),
      regressed:fields.filter(field=>result[field].first===true && !result[field].correct),
      soleObstacle:state.phase==='lost' && unresolved.length===1 && unresolved[0]===work.id};
  }
  function temporalConflict(selection,knowledge) {
    const profile=knowledge?.styles?.[selection?.style], span=dateSpan(selection?.date), origin=profile?.origin;
    // Only substantial gaps, not borderline dates or open-ended catalogue dates.
    // An origin describes the historical movement, not the first-ever similar form.
    if(!origin || !span || !Number.isFinite(span.max) || span.max>origin.year-40) return null;
    return {style:selection.style,date:selection.date,origin,profile};
  }
  function roomHint(state,knowledge) {
    if(state?.phase!=='playing' || state.attempts!==1 || !state.review?.choices) return '';
    if(!state.ids.some(id=>temporalConflict(state.review.choices[id],knowledge))) return '';
    const hints=[
      'Eine deiner Kombinationen schickt eine Stilrichtung weit vor ihre Entstehungszeit. Die Zeitreise bleibt unerlaubt – welche Zuordnung würdest du noch einmal prüfen?',
      'Ein zeitlicher Widerspruch versteckt sich im Raum: Eine Stilrichtung müsste hier schon existieren, lange bevor sie entstand.',
      'Nicht jede Zeitreise funktioniert. Irgendwo hast du eine Stilrichtung deutlich vor ihrer historischen Entstehung verortet.',
      'Prüfe die innere Logik deiner Kombinationen: Eine Stilrichtung ist in einer Zeit gelandet, in der es die Bewegung noch gar nicht gab.',
      'Eine Kombination läuft der Kunstgeschichte weit voraus. Überlege, ob alle gewählten Stilrichtungen in den zugeordneten Zeiten schon möglich waren.',
      'Die Jahreszahlen enthalten noch eine Falle: Mindestens eine Stilbewegung wurde deutlich vor ihre Entstehung zurückversetzt.'
    ];
    return hints[hash(state.ids.join('|'))%hints.length];
  }
  function opening(work,state,outcome,pick) {
    const artwork=quote(title(work)), who=work.artist;
    if(work.attribution==='unknown'){
      const response=outcome.finalCount===outcome.total ? 'Deine letzte Zuordnung stimmt vollständig.' : outcome.soleObstacle ? 'Hier blieb die letzte Hürde des Raums.' : 'Bei deiner letzten Zuordnung blieb noch etwas offen.';
      return response+' Unbekannter Künstler: '+pick('opening-anonymous',[
        `Bei ${artwork} ist der Name des Künstlers nicht überliefert. Wir schauen deshalb besonders auf Form, Material und den belegten historischen Zusammenhang.`,
        `${artwork} hat eine Geschichte, auch ohne bekannten Urheber. „Unbekannter Künstler“ ist hier die ehrliche Katalogangabe, kein Rätselname.`,
        `Nimm ${artwork} zunächst als eigenständiges Werk ernst. Der unbekannte Künstlername lässt sich nicht erraten; Form und Werkquelle geben uns andere Anhaltspunkte.`,
        `Wir können ${artwork} zeitlich und kulturell einordnen, ohne seinem Urheber einen erfundenen Namen zu geben. Lass uns die vorhandenen Spuren ansehen.`,
        `Bei ${artwork} gehört die unbekannte Urheberschaft zur Überlieferung. Das nimmt dem Werk weder seine Qualität noch seine mögliche Aussage.`,
        `Der Name hinter ${artwork} ist nicht gesichert. Die sinnvolle Frage lautet hier nicht „Wen erkenne ich?“, sondern „Welche Beobachtungen trägt der Werkbeleg?“`
      ]);
    }
    if(['sculpture','relief'].includes(work.artForm)){
      const response=outcome.finalCount===outcome.total ? 'Deine letzte Zuordnung passt.' : 'Lass uns deine Zuordnung noch einmal am Werk prüfen.';
      return response+' '+pick('opening-sculpture',[
        `${artwork} von ${who} lebt von Körper, Oberfläche und Raum. Die Fotografie zeigt uns davon einen Blickwinkel, nicht die ganze plastische Form.`,
        `Bei ${artwork} von ${who} schauen wir auf die räumliche Form und ihre Herstellung. Material, Modelljahr und ausgeführte Fassung sind unterschiedliche Fragen.`,
        `${artwork} von ${who} ist keine gemalte Fläche. Achte auf den Zusammenhang von Volumen, Licht und Oberfläche; die Aufnahme kann ihn betonen oder verdecken.`,
        `Bleiben wir bei ${artwork} von ${who}. Ein zweiter Blick auf die plastische Form ist hilfreicher als ein schneller Schluss aus der Farbe des Fotos.`
      ]);
    }
    if(work.artForm==='photograph'){
      const response=outcome.finalCount===outcome.total ? 'Deine letzte Zuordnung passt.' : 'Lass uns die noch offenen Zuordnungen genauer ansehen.';
      return response+' '+pick('opening-photograph',[
        `${artwork} von ${who} ist eine Fotografie. Bildgestaltung und fotografisches Druckverfahren sind zwei verschiedene Spuren.`,
        `Bei ${artwork} von ${who} lohnt es sich, Ausschnitt, Licht und Tonwerte getrennt von den Angaben zum Abzug zu betrachten.`,
        `Nimm ${artwork} von ${who} als Ausgangspunkt. Die Aufnahme zeigt eine bewusste Bildentscheidung; das konkrete Verfahren ist im Katalog belegt.`,
        `${artwork} von ${who} gibt uns Anlass zu einem zweiten Blick: Was erzählt die Komposition, und was verrät erst die Werkquelle über die Herstellung?`,
        `Schauen wir bei ${artwork} von ${who} auf das Licht und die Anordnung im Bild. Ein späterer Abzug kann lange nach der ursprünglichen Aufnahme entstanden sein.`,
        `Bei dieser Fotografie von ${who}, ${artwork}, sind Beobachtung und Quellenprüfung Partner: Nicht jeder fotografische Prozess lässt sich am Bildschirm sicher erkennen.`
      ]);
    }
    if(outcome.soleObstacle) return pick('opening-obstacle',[
      `Bei ${artwork} blieb die letzte Hürde dieses Raums. Lass uns das Bild von ${who} noch einmal mit etwas anderen Fragen ansehen.`,
      `Die übrigen Werke hattest du vollständig zugeordnet; hier blieb etwas offen. ${artwork} von ${who} bietet eine gute Gelegenheit, die entscheidenden Spuren genauer zu lesen.`,
      `Dieser Raum scheiterte zuletzt an den Zuordnungen zu ${artwork}. Das ist kein Urteil über deinen Blick: Wir nehmen uns das Bild von ${who} jetzt in Ruhe vor.`,
      `Gerade dieses Werk hielt das Schloss geschlossen. Bei ${artwork} von ${who} lohnt es sich, zwischen Material, Bildsprache und Entstehungszeit zu unterscheiden.`,
      `Nur bei ${artwork} waren zuletzt noch Zuordnungen falsch. Komm, wir schauen gemeinsam auf das Werk von ${who} – nicht auf den Punktestand.`,
      `${artwork} war die verbliebene Stolperstelle. Ich würde dir bei diesem Werk von ${who} nicht mehr Merkwörter geben, sondern einen anderen Weg durchs Bild zeigen.`
    ]);
    if(outcome.regressed.length) return pick('opening-regressed',[
      `Zunächst richtig, später verändert: ${join(outcome.regressed.map(field=>fieldNames[field]))}. Bei ${artwork} von ${who} gehen wir den Spuren noch einmal nach.`,
      `Du hattest bei ${artwork} bereits eine richtige Spur und hast sie später verlassen: ${join(outcome.regressed.map(field=>fieldNames[field]))}. Schauen wir, was beim Werk von ${who} für die ursprüngliche Zuordnung spricht.`,
      `Bei ${artwork} war nicht alles von Anfang an verkehrt. Deine erste Zuordnung passte in diesen Punkten: ${join(outcome.regressed.map(field=>fieldNames[field]))}. Wir betrachten das Bild von ${who} noch einmal, ohne den ersten Eindruck vorschnell zu verwerfen.`,
      `Interessant ist deine Korrektur bei ${artwork}: Eine zunächst richtige Antwort ging dabei verloren. Bei ${who} nehmen wir deshalb Bildbeobachtung und historische Kontrolle getrennt in den Blick.`
    ]);
    if(outcome.finalCount===outcome.total && outcome.firstCount===outcome.total) return pick('opening-clear',[
      `${artwork} von ${who}: Hier stimmten deine Zuordnungen schon beim ersten Prüfen. Ich zeige dir, welche Beobachtungen deine Lösung zusätzlich absichern können.`,
      `Dieses Werk hast du auf Anhieb vollständig zugeordnet. Bleiben wir noch einen Moment bei ${artwork} von ${who} und schauen, was über den richtigen Namen hinaus interessant ist.`,
      `Bei ${artwork} lagst du gleich richtig. Vielleicht hast du ${who} erkannt; vielleicht bist du über Farbe und Form gegangen. Beides lässt sich jetzt mit der historischen Einordnung verbinden.`,
      `Dein erster Schlüssel passte hier. An ${artwork} von ${who} können wir aus der richtigen Antwort eine begründete machen.`,
      `Alle ${outcome.total===5?'fünf':'vier'} Antworten saßen bei diesem Bild bereits im ersten Versuch. Bei ${artwork} von ${who} lohnt sich deshalb die nächste Frage: Welche Spuren lassen sich auch auf unbekannte Werke übertragen?`,
      `${artwork} von ${who} bereitete dir in der Prüfung keine Schwierigkeiten. Nimm aus diesem Bild dennoch mehr mit als ein Etikett – vor allem einen Weg des Hinschauens.`,
      `Hier warst du von Beginn an auf der richtigen Spur. ${artwork} von ${who} nehmen wir als Ausgangspunkt, um Material und Bildsprache auseinanderzuhalten.`,
      `Das hast du direkt richtig eingeordnet. Bei ${artwork} von ${who} möchte ich deinen Blick nun von der Antwort auf die möglichen Indizien lenken.`
    ]);
    if(outcome.finalCount===outcome.total && outcome.fixed.length) return pick('opening-fixed',[
      `Bei ${artwork} hast du nachgebessert: ${join(outcome.fixed.map(field=>fieldNames[field]))}. Am Ende passte alles. Schauen wir, was dir beim Werk von ${who} künftig die erste Zuordnung erleichtern kann.`,
      `Du hast bei ${artwork} von ${who} nachgebessert – erfolgreich. Eine veränderte Antwort kann ein guter Lernschritt sein, wenn du nun auch weißt, welche Beobachtung dahintersteht.`,
      `${artwork} war nach deiner Korrektur vollständig richtig. Wir gehen bei ${who} noch einen Schritt weiter: von der passenden Kombination zu ihren möglichen Bildspuren.`,
      `Dein zweiter Blick hat sich bei ${artwork} ausgezahlt. Jetzt nehmen wir das Werk von ${who} zum Anlass, diese Korrektur mit sichtbaren und historischen Hinweisen zu verbinden.`,
      `Zunächst blieb bei ${artwork} etwas offen; zuletzt hast du alle ${outcome.total===5?'fünf':'vier'} Antworten getroffen. Lass uns bei ${who} festhalten, was beim nächsten Mal helfen kann.`,
      `Du hast die Spur bei diesem Werk wiedergefunden. An ${artwork} von ${who} lässt sich gut üben, wie Beobachtung und Zeitwissen einander kontrollieren.`,
      `Bei ${artwork} führte deine Überarbeitung zur richtigen Lösung. Ich würde dir zum Werk von ${who} jetzt vor allem die Merkmale mitgeben, die du an einem neuen Bild wieder suchen kannst.`,
      `Hier hast du umgedacht und richtig zugeordnet. ${artwork} von ${who} bleibt deshalb nicht nur eine gelöste Aufgabe, sondern ein nützlicher Vergleich für den nächsten Raum.`
    ]);
    if(outcome.finalCount===outcome.total) return pick('opening-correct',[
      `Die letzten Zuordnungen zu ${artwork} waren vollständig richtig${state.phase==='lost' ? ' – auch wenn der Raum insgesamt nicht aufging' : ''}. Schauen wir genauer auf das Werk von ${who}.`,
      `Bei ${artwork} von ${who} passt deine letzte Lösung. Ich möchte dir dazu die Beobachtungen zeigen, die aus einem Treffer ein wiederverwendbares Wissen machen.`,
      `Dieses Bild hattest du zuletzt komplett richtig eingeordnet. Mit ${artwork} von ${who} können wir nun in Ruhe fragen, warum die Zuordnung plausibel ist.`,
      `${artwork} ist in deiner letzten Prüfung richtig zugeordnet. Beim Werk von ${who} suchen wir jetzt nach den Spuren, die sich auch ohne bekannte Namen lesen lassen.`
    ]);
    if(state.phase==='lost') return pick('opening-last-hurdles',[
      `Zu ${artwork} blieben falsche Antworten stehen; auch daran scheiterte der Raum. Lass uns das Werk von ${who} noch einmal anschauen – diesmal ohne Zeitdruck.`,
      `Dieses Werk gehörte zu den ungelösten Hürden beim Spielende. Bei ${artwork} von ${who} zeige ich dir, welche Spuren beim nächsten Versuch helfen können.`,
      `Die Tür blieb geschlossen, und bei ${artwork} passte zuletzt noch nicht alles. Wir nehmen das Bild von ${who} jetzt nicht als Niederlage, sondern als Gelegenheit zum genaueren Hinsehen.`,
      `Hier lag eine der Stolperstellen deiner letzten Prüfung. Komm noch einmal mit zu ${artwork} von ${who}; Material, Bildsprache und Zeit lassen sich getrennt betrachten.`,
      `Bei ${artwork} blieb am Ende etwas ungeklärt. Die Runde ist vorbei, aber dein Blick auf das Werk von ${who} muss damit nicht enden.`,
      `Deine letzten Antworten zu ${artwork} waren noch nicht vollständig richtig. Statt des geschlossenen Schlosses betrachten wir jetzt das Werk von ${who} und seine möglichen Hinweise.`,
      `Dieses Bild trug dazu bei, dass der Raum nicht aufging. An ${artwork} von ${who} würde ich dir einen anderen Weg zur Einordnung zeigen.`,
      `Beim Spielende war ${artwork} noch eine offene Frage. Lass uns gemeinsam auf das Bild von ${who} zurückkommen und mögliche Indizien mit dem Katalog vergleichen.`
    ]);
    return pick('opening-unresolved',[
      `Bei ${artwork} von ${who} blieb in deiner letzten Lösung noch etwas offen. Ich würde dir zunächst vorschlagen, die Art der Farb- oder Linienarbeit von der Stilfrage zu trennen.`,
      `Dieses Bild hat dich in der Prüfung noch nicht zu allen richtigen Zuordnungen geführt. Lass uns ${artwork} von ${who} noch einmal anschauen, ohne sofort einen Künstlernamen zu suchen.`,
      `Wir bleiben kurz bei ${artwork}. Nicht alle letzten Antworten passten zum Werk von ${who}; für den nächsten Blick sind die Unterschiede zwischen Material und Bildsprache besonders hilfreich.`,
      `${artwork} von ${who} war noch eine Stolperstelle. Statt dir einfach die Antwort vorzulesen, würde ich deinen Blick auf die möglichen Indizien lenken.`,
      `Die letzte Zuordnung zu ${artwork} war noch nicht vollständig. Nimm das Werk von ${who} als Vergleichsbild mit – seine Einordnung wird leichter, wenn du mehrere Spuren zusammenführst.`,
      `Beim Werk von ${who} lohnt sich ein neuer Anlauf. ${artwork} erklärt sich nicht durch einen einzigen Hinweis, sondern durch das Zusammenspiel von Malweise und Zeitkontext.`,
      `Hier blieb ein Fragezeichen. Bei ${artwork} von ${who} gehen wir jetzt nicht vom falschen Häkchen aus, sondern von Fragen, die du an das Bild stellen kannst.`,
      `Für ${artwork} stimmten zuletzt noch nicht alle Antworten. Schauen wir gemeinsam auf das Werk von ${who}: Welche Hinweise sind sichtbar, und welche muss der Katalog liefern?`
    ]);
  }
  const aliases = {'hilairegermainedgardegas':'edgardegas','josephmallordwilliamturner':'jmwturner','williamturner':'jmwturner','titian':'tizian','raphael':'raffael','rembrandt':'rembrandtvanrijn','charlesfrancoisdaubigny':'charlesfrancoisdaubigny','pietroperugino':'perugino','henrilautrec':'henridetoulouselautrec'};
  function artistKey(name) {
    const key=String(name).replace(/^(de|en):/,'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z]/g,'');
    return aliases[key] || key;
  }
  function artistRelation(work,profile,field,pool,pick) {
    if(work.attribution==='unknown')return field==='style'?'':pick('artist-anonymous',[
      'Die unbekannten Urheber verschiedener Werke sind nicht als eine einzige Künstlerpersönlichkeit zu verstehen.',
      'Der Personenname ist nicht überliefert. Die Bezeichnung erlaubt keine Aussage über ein gemeinsames Œuvre aller anonymen Arbeiten.',
      'Hier vergleichen wir Werkstatttraditionen und einzelne Objekte, nicht ein erfundenes Œuvre eines „unbekannten Künstlers“.'
    ]);
    const key=artistKey(work.artistIdentity || work.artist);
    const known=profile.artists.some(name=>artistKey(name)===key || artistKey(name)===artistKey(work.artist));
    if(known) return pick('artist-known-'+field,[
      `${work.artist} gehört selbst zu den hier genannten wichtigen Namen.`,
      `Mit ${work.artist} hast du zugleich ein wichtiges Beispiel dieses Zusammenhangs vor dir.`,
      `Der Name ${work.artist} passt also nicht nur zu diesem Einzelwerk, sondern auch zum größeren historischen Zusammenhang.`,
      `${work.artist} ist in dieser Einordnung kein zufälliger Gast: Der Name gehört zu den wichtigen Beispielen.`
    ]);
    if(field==='style') return '';
    const count=pool.filter(other=>other.id!==work.id && artistKey(other.artistIdentity || other.artist)===key && other.technique===work.technique).length;
    if(count>=3) return pick('artist-archive',[
      `Auch im Spielarchiv begegnet dir ${work.artist} noch mit ${count} weiteren Werken dieser Technik – ein Vergleich lohnt sich.`,
      `Dieses Werk steht im Spielarchiv nicht allein: Dort sind ${count} weitere Arbeiten von ${work.artist} mit derselben Technik verzeichnet.`,
      `Für weitere Vergleiche findest du im Spielarchiv ${count} andere Werke von ${work.artist} mit dieser Technik. Das beschreibt unser Archiv, nicht das gesamte Œuvre.`
    ]);
    return pick('artist-work-only',[
      `Bei ${work.artist} ist diese Materialwahl für das vorliegende Werk dokumentiert; ob sie für das gesamte Œuvre typisch ist, bleibt damit offen.`,
      `Für dieses Werk von ${work.artist} ist die Technik belegt. Eine einzelne Arbeit sagt noch nicht, wie häufig sie im übrigen Œuvre vorkommt.`,
      `Das Material gehört hier zum gesicherten Werkbefund von ${work.artist}. Daraus würde ich noch keine Aussage über eine übliche oder seltene Arbeitsweise ableiten.`
    ]);
  }
  function looking(profile,field,pick) {
    const offset=hash(pick('clue-seed',[profile.definition,profile.period]))%profile.clues.length;
    const clues=join([profile.clues[offset],profile.clues[(offset+1)%profile.clues.length]]);
    return pick('looking-'+field,[
      `Prüfe im vergrößerten Bild diese Hinweise: ${clues}. Das sind mögliche Indizien, keine automatisch sicheren Beweise.`,
      `Ich würde deinen Blick auf ${clues} lenken. Prüfe selbst, wie deutlich diese Hinweise hier zu erkennen sind.`,
      `Achte beim zweiten Hinschauen auf ${clues}. Solche Beobachtungen können die Zuordnung stützen.`,
      `Eine hilfreiche Suchfrage lautet: Findest du ${clues}? Vergrößere dafür lieber eine kleine Partie, statt nur den Gesamteindruck zu betrachten.`,
      `Als Anhaltspunkte bieten sich ${clues} an. Nicht jedes Werk zeigt beide Merkmale gleich deutlich.`,
      `Versuche einmal, ${clues} im Bild zu finden. Mehrere zusammenpassende Hinweise sind aussagekräftiger als ein einzelnes Detail.`,
      `Lass den Namen kurz beiseite und suche diese Merkmale: ${clues}. So erhältst du eine Spur, die auch bei unbekannten Bildern helfen kann.`,
      `Woran ließe sich diese Einordnung prüfen? Mögliche Indizien sind ${clues}. Entscheidend bleibt, ob du sie im Werk tatsächlich nachvollziehen kannst.`,
      `Nimm eine gut erkennbare Bildpartie und prüfe sie auf ${clues}. Das ist ein möglicher Weg zur Lösung, kein starres Rezept.`,
      `Für deinen nächsten Blick würde ich ${clues} als Suchhinweise mitgeben. Ihre Deutlichkeit hängt auch von der Qualität der Aufnahme ab.`
    ]);
  }
  function practitioners(profile,field,pick) {
    const names=join(profile.artists);
    if(profile.anonymousTradition)return pick('practitioners-tradition-'+field,[
      `Historische Vergleichspunkte sind ${names}. Die Urheber bleiben häufig unbenannt.`,
      `Für den Vergleich helfen diese Werkstattzusammenhänge: ${names}. Einzelne Künstler sind damit nicht sicher identifiziert.`,
      `Diese Tradition lässt sich über ${names} erschließen; überlieferte Personen- und Werkstattnamen sind zu unterscheiden.`
    ]);
    return pick('practitioners-'+field,[
      `Wichtige Vergleichsnamen sind ${names}.`,
      `Zum Wiedererkennen helfen dir Vergleichswerke von ${names}.`,
      `Merke dir dafür nicht nur einen Namen: ${names} zeigen wichtige Ausprägungen.`,
      `Als historische Vergleichspunkte bieten sich ${names} an.`,
      `Ein größerer Zusammenhang öffnet sich über Werke von ${names}.`,
      `Beispiele, an denen du deinen Blick schulen kannst, liefern ${names}.`
    ]);
  }
  function periodText(work,profile,pick) {
    const relation=stage(work.date,profile), date=quote(work.date);
    const framing=pick('style-context',[`Zeitlicher Rahmen: ${profile.period}.`,`Historischer Schwerpunkt: ${profile.period}.`,`Zur Einordnung in die Zeit: ${profile.period}.`]);
    const comparisons={
      within:[`Die Werkdatierung ${date} liegt innerhalb dieses Orientierungsrahmens.`,`Mit der Datierung ${date} gehört das Bild zeitlich in diesen Rahmen.`,`Die Angabe ${date} passt zur hier beschriebenen Phase.`],
      early:[`Die Datierung ${date} fällt in den frühen Teil dieses Rahmens – das allein macht das Werk noch nicht zu einem der allerersten Beispiele.`,`Zeitlich liegt ${date} am Anfang dieses Orientierungsrahmens, nicht automatisch am Anfang der gesamten Entwicklung.`,`Mit ${date} steht das Werk zeitlich eher am Beginn dieser Phase; ein Vorrang als Pionierwerk wäre gesondert zu belegen.`],
      overlap:[`Die Datierung ${date} berührt eine Grenze dieses groben Rahmens. Solche Übergänge sind keine scharfen Stilwechsel.`,`${date} liegt im Grenzbereich dieses Orientierungsrahmens; Datierungsunsicherheit und Übergänge müssen mitgedacht werden.`,`Bei ${date} reicht der Datierungsbereich über eine dieser ungefähren Grenzen. Ein Grenzjahr ist kein Stilbeweis.`],
      before:[`Die Werkangabe ${date} liegt davor. Das kann auf Vorläufer oder auf eine weiter gefasste Werkzuordnung hinweisen; ein Pionierstatus lässt sich daraus allein nicht ableiten.`,`Mit ${date} liegt dieses Werk vor dem genannten Kernzeitraum. Ähnliche Formen können früher auftreten; prüfe hier besonders die genaue Werkquelle.`,`${date} fällt vor diese Schwerpunktphase. Das ist eine zeitliche Besonderheit der Zuordnung, noch kein Beleg dafür, dass das Bild den Stil erfunden hat.`],
      after:[`Die Werkangabe ${date} liegt später. Die frühere Schwerpunktphase macht spätere Arbeiten nicht automatisch zu bloßen Nachahmungen.`,`Mit ${date} ist dieses Bild zeitlich ein späteres Beispiel unter dieser Zuordnung. Ob bewusste Fortführung oder eigenständige Neuerung: Das Datum allein entscheidet es nicht.`,`${date} liegt nach dem genannten Kernzeitraum. Ich würde das als Anlass zum Vergleichen nehmen, nicht als vorschnelles Urteil über Originalität.`],
      open:[`Die Werkquelle nennt ${date}; bei diesem weiten Begriff beziehungsweise dieser offenen Datierung verzichte ich auf eine starre Einordnung als früh oder spät.`,`Für dieses Werk ist ${date} verzeichnet. Der Zusammenhang lässt sich hier nicht sinnvoll auf ein scharf abgegrenztes Zeitfenster reduzieren.`,`Die Datierung lautet ${date}. Ein weiter Stilbegriff oder eine offene Zeitangabe verlangt mehr Vorsicht als ein einfacher Vergleich zweier Jahreszahlen.`]
    };
    return framing+' '+pick('period-'+relation,comparisons[relation]);
  }
  function confusion(work,outcome,knowledge,pick) {
    const technique=outcome.fields.technique, style=outcome.fields.style;
    const names=technique.value;
    if(!technique.correct && names.startsWith('Öl auf ') && work.technique.startsWith('Öl auf ')) return pick('confusion-support',[
      `Du hattest ${quote(names)} gewählt. Bei ${quote(work.technique)} ändert sich hier der Träger, nicht das Bindemittel. Diesen Unterschied kannst du aus dem Bild allein oft gar nicht sicher bestimmen.`,
      `Zwischen deiner Wahl ${quote(names)} und ${quote(work.technique)} liegt vor allem eine Trägerfrage. Das ist kein Fehler, den ein schärferer Blick auf die Farben zwangsläufig verhindert hätte.`,
      `Hier waren Ölfarbe und Bildträger leicht zu vermischen: Deine Antwort war ${quote(names)}, belegt ist ${quote(work.technique)}. Für Holz, Leinwand oder Karton ist der Katalog oft unverzichtbar.`
    ]);
    if(!technique.correct && ['Radierung','Kupferstich','Holzschnitt','Lithografie'].includes(names) && ['Radierung','Kupferstich','Holzschnitt','Lithografie'].includes(work.technique)) return `Du hattest ${quote(names)} statt ${quote(work.technique)} gewählt. Vergleiche nicht bloß Schwarz und Weiß, sondern die Entstehung der gedruckten Linie: geschnitten, geätzt oder auf eine Druckfläche gezeichnet.`;
    if(!style.correct && ['Impressionismus','Postimpressionismus','Pointillismus'].includes(style.value) && ['Impressionismus','Postimpressionismus','Pointillismus'].includes(work.style)) return `Deine Wahl ${quote(style.value)} liegt kunsthistorisch in der Nachbarschaft von ${quote(work.style)}. Vergleiche besonders, ob die Farbe einen flüchtigen Eindruck einfängt oder die Formen systematisch neu aufbaut; die Begriffe überschneiden sich zum Teil.`;
    if(!style.correct && ['Gotik','Gotische Malerei','Internationale Gotik'].includes(style.value) && ['Gotik','Gotische Malerei','Internationale Gotik'].includes(work.style)) return `Mit ${quote(style.value)} warst du im richtigen größeren Umfeld. ${quote(work.style)} ist die genauere Werkzuordnung; die Begriffe sind verwandt, keine strikt getrennten Welten.`;
    const profile=knowledge.styles[work.style];
    if(!style.correct && profile?.kind.includes('Schule')) return `Du hattest ${quote(style.value)} zugeordnet. Bei ${quote(work.style)} spielt neben der Bildform auch der regionale Werkstattzusammenhang eine Rolle – nicht alles davon lässt sich ohne Vorwissen sehen.`;
    return '';
  }
  function explain(work,state,knowledge,pool=[]) {
    if(!work || !state || state.phase==='playing') return null;
    const technique=knowledge?.techniques?.[work.technique], style=knowledge?.styles?.[work.style];
    if(!technique || !style) return null;
    const pick=chooser(work,state), outcome=outcomes(work,state,pool), note=knowledge.workNotes?.[work.id];
    const mistake=[confusion(work,outcome,knowledge,pick),outcome.fields.title&&!outcome.fields.title.correct?'Zum Werktitel: Im Katalog heißt dieses Werk '+quote(title(work))+'. Vergleiche den Titel noch einmal mit dem dargestellten Motiv. Nicht jeder Titel beschreibt das Sichtbare wörtlich; die dokumentierte Werkangabe bleibt maßgeblich.':''].filter(Boolean).join(' ');
    const techFacts=[looking(technique,'technique',pick),technique.definition];
    if(pick('tech-order',[false,true])) techFacts.reverse();
    const techContext=pick('tech-context',[
      `Zeitkontext dieser Technik: ${technique.period}.`,
      `Ihr historischer Schwerpunkt: ${technique.period}.`,
      `Zur zeitlichen Einordnung: ${technique.period}.`,
      `Historischer Überblick: ${technique.period}.`
    ]);
    const techPeople=practitioners(technique,'technique',pick);
    const techArtist=artistRelation(work,technique,'technique',pool,pick);
    const styleFacts=[style.definition,looking(style,'style',pick)];
    if(pick('style-order',[false,true])) styleFacts.reverse();
    const styleTime=periodText(work,style,pick);
    const stylePeople=practitioners(style,'style',pick);
    const styleArtist=artistRelation(work,style,'style',pool,pick);
    const techParagraphs=[techFacts.join(' ')+' '+technique.caution,techContext+' '+techPeople+' '+techArtist];
    const styleParagraphs=[styleFacts.join(' ')+' '+style.caution,styleTime+' '+stylePeople+(styleArtist ? ' '+styleArtist : '')];
    // These are different narrative routes, not independent synonym switches.
    if(pick('route',[0,1,2,3])===1) styleParagraphs.reverse();
    if(pick('route',[0,1,2,3])===2) techParagraphs.reverse();
    const sections=[
      {field:'technique',label:pick('tech-heading',['Farbe, Linie, Material','Die Spur der Technik','Wie wurde es gemacht?','Am Material genauer hinsehen']),answer:work.technique,paragraphs:techParagraphs},
      {field:'style',label:pick('style-heading',['Bildsprache und Zeit','Die historische Spur','Was die Formen erzählen','Einordnung statt Etikett']),answer:work.style,paragraphs:styleParagraphs}
    ];
    if(!outcome.fields.style.correct && outcome.fields.technique.correct) sections.reverse();
    else if(outcome.fields.style.correct===outcome.fields.technique.correct && pick('section-order',[false,true])) sections.reverse();
    const finalSelection=state.review?.choices?.[work.id] || state.choices?.[work.id];
    const firstSelection=state.attemptLog?.find(entry=>entry.attempt===1)?.choices[work.id];
    const finalConflict=temporalConflict(finalSelection,knowledge), firstConflict=temporalConflict(firstSelection,knowledge);
    const conflict=finalConflict || firstConflict;
    const temporal=conflict ? (finalConflict ? pick('time-final',[
      `Du hast ${quote(conflict.style)} mit ${quote(conflict.date)} verbunden.`,
      `In deiner letzten Antwort trafen ${quote(conflict.style)} und ${quote(conflict.date)} aufeinander.`,
      `Die Kombination ${quote(conflict.style)} und ${quote(conflict.date)} enthält einen konkreten Zeitwiderspruch.`,
      `Hier löst sich der Zeitreise-Hinweis auf: Du hattest ${quote(conflict.style)} der Zeit ${quote(conflict.date)} zugeordnet.`
    ]) : pick('time-first',[
      `Im ersten Versuch hattest du ${quote(conflict.style)} mit ${quote(conflict.date)} verbunden; diese Kombination hast du später geändert.`,
      `Erinnerst du dich an den Zeitreise-Hinweis? In deiner ersten Prüfung stand hier ${quote(conflict.style)} zusammen mit ${quote(conflict.date)}. In der letzten Antwort nicht mehr.`,
      `Deine Überarbeitung hat diesen Zeitwiderspruch beseitigt: Zunächst war ${quote(conflict.style)} der Zeit ${quote(conflict.date)} zugeordnet.`,
      `Ein Rückblick auf deinen ersten Versuch: ${quote(conflict.style)} und ${quote(conflict.date)} konnten zeitlich nicht zusammenpassen. Diese Kombination ist in deiner letzten Antwort nicht mehr enthalten.`
    ]))+' '+conflict.origin.statement+' Als bereits bestehende Bewegung passt der Stil deshalb nicht zu dieser frühen Zeit. Einzelne ähnliche Bildmittel können älter sein als die Bewegung.' : '';
    const sources=[...new Set([...technique.sources,...style.sources,...(note?.sources || []),...(conflict?.profile.sources || [])])].map(id=>knowledge.sources[id]).filter(Boolean);
    return {opening:opening(work,state,outcome,pick),sections,mistake,temporal,workNote:note?.text || '',sources,outcome};
  }
  const api={explain,outcomes,dateSpan,stage,temporalConflict,roomHint,artistKey};
  if(typeof module!=='undefined' && module.exports) module.exports=api;
  else root.KunstKurator=api;
})(typeof globalThis!=='undefined' ? globalThis : this);
