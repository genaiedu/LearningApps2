'use strict';

// The formulations are school-level drafting aids, not official grade definitions.
const chemistryAssessment = (() => {
  const grades = [
    [15, 'sehr gut plus', 'Der Prüfling erklärt auch komplexe chemische Vorgänge umfassend und präzise, verknüpft Stoff-, Teilchen- und Symbolebene eigenständig und prüft alternative Deutungen sowie Modellgrenzen überzeugend.'],
    [14, 'sehr gut', 'Der Prüfling erklärt komplexe chemische Zusammenhänge sicher und differenziert, überträgt Modelle eigenständig auf neue Fragestellungen und begründet seine Deutungen mit tragfähigen Belegen; nur einzelne Vertiefungen bleiben offen.'],
    [13, 'sehr gut minus', 'Der Prüfling zeigt ein vertieftes chemisches Verständnis, verbindet verschiedene Darstellungsebenen überwiegend selbstständig und bewältigt anspruchsvollen Transfer; kleinere Unsicherheiten begrenzen einzelne Modell- oder Verfahrensreflexionen.'],
    [12, 'gut plus', 'Der Prüfling erklärt die relevanten chemischen Zusammenhänge vollständig und sicher, verbindet Beobachtungen mit geeigneten Modellen und begründet Auswertungen und Übertragungen eigenständig; besonders anspruchsvolle Grenzen werden weniger differenziert erfasst.'],
    [11, 'gut', 'Der Prüfling erklärt chemische Reaktionen und Struktur–Eigenschafts-Beziehungen fachlich sicher, nutzt Darstellungen und Verfahren angemessen und begründet vergleichbare neue Anwendungen weitgehend selbstständig; vereinzelte Ungenauigkeiten bleiben begrenzt.'],
    [10, 'gut minus', 'Der Prüfling beherrscht die wesentlichen chemischen Konzepte sicher und deutet vertraute Daten und Reaktionen schlüssig; bei anspruchsvolleren Verknüpfungen und der Reflexion von Annahmen benötigt er gelegentlich gezielte Impulse.'],
    [9, 'befriedigend plus', 'Der Prüfling stellt wesentliche chemische Inhalte geordnet und überwiegend sicher dar und erklärt zentrale Zusammenhänge zwischen Befund, Modell und Gleichung; naheliegender Transfer gelingt, anspruchsvollere Begründungen benötigen Unterstützung.'],
    [8, 'befriedigend', 'Der Prüfling erklärt grundlegende chemische Zusammenhänge im Allgemeinen zutreffend und wendet vertraute Verfahren angemessen an; einzelne Lücken beim Wechsel der Darstellungsebene und bei weiterführenden Deutungen können durch fachliche Impulse teilweise geklärt werden.'],
    [7, 'befriedigend minus', 'Der Prüfling erfasst wesentliche chemische Sachverhalte, erklärt deren Ursachen und Teilchenvorgänge jedoch nicht durchgehend sicher; vertraute Anwendungen sind insgesamt tragfähig, Begründungen und weiterführende Auswertungen bleiben wiederholt lückenhaft.'],
    [6, 'ausreichend plus', 'Der Prüfling verfügt über überwiegend gesicherte chemische Grundlagen und bearbeitet einfache, vertraute Reaktionen oder Auswertungen weitgehend zutreffend; die Verbindung von Stoff- und Teilchenebene gelingt ansatzweise, Transfer bleibt begrenzt.'],
    [5, 'ausreichend', 'Der Prüfling weist grundlegende chemische Kenntnisse nach und bewältigt einfache Anwendungen teilweise mit Unterstützung; wesentliche Befunde werden erkannt, obwohl Erklärungen, Gleichungen oder Fachsprache deutliche Mängel zeigen.'],
    [4, 'schwach ausreichend', 'Der Prüfling zeigt teilweise gesicherte chemische Grundlagen, kann sie aber nur eingeschränkt mit Beobachtungen und Darstellungen verbinden; erhebliche Lücken in Auswertung und Erklärung bleiben auch nach Hilfen bestehen.'],
    [3, 'mangelhaft plus', 'Der Prüfling lässt notwendige chemische Grundkenntnisse und einzelne zutreffende Ansätze erkennen; erhebliche Fehler bei Reaktionsdeutungen, Darstellungen oder Verfahren verhindern eine insgesamt tragfähige Erklärung, erscheinen aber durch gezielte Nacharbeit behebbar.'],
    [2, 'mangelhaft', 'Der Prüfling gibt einzelne chemische Grundlagen zutreffend wieder, wendet sie auch mit Hilfen häufig fehlerhaft an und verbindet Beobachtungen kaum mit geeigneten Modellen; vorhandene Grundkenntnisse lassen eine Behebung der Mängel erwarten.'],
    [1, 'mangelhaft minus', 'Der Prüfling zeigt notwendige chemische Grundkenntnisse nur in wenigen Ansätzen; selbst einfache Reaktionsdeutungen oder Auswertungen misslingen weitgehend trotz Unterstützung, einzelne Grundlagen bleiben jedoch erkennbar und entwicklungsfähig.'],
    [0, 'ungenügend', 'Der Prüfling weist die notwendigen chemischen Grundkenntnisse nicht hinreichend nach; auch mit gezielten Hilfen entstehen keine tragfähigen Verbindungen zwischen Befund, Modell und Darstellung, und grundlegende Fehlvorstellungen bleiben bestehen.']
  ].map(([points, label, text]) => ({points, label, text}));
  const areas = {
    model: ['Modellverständnis und Darstellungsebenen',
      'Stoff-, Teilchen- und Symbolebene werden sicher verknüpft; Annahmen und Grenzen des verwendeten Modells werden differenziert reflektiert.',
      'Beobachtungen werden mithilfe geeigneter Teilchenmodelle schlüssig erklärt; Modellannahmen werden überwiegend selbstständig benannt.',
      'Vertraute Beobachtungen werden im Allgemeinen mit passenden Modellen erklärt; bei der Verbindung der Darstellungsebenen bleiben einzelne Lücken.',
      'Wesentliche Beobachtungen werden erkannt und ansatzweise auf Teilchenvorgänge bezogen; die Erklärung benötigt teilweise Unterstützung.',
      'Einzelne Modellbegriffe sind bekannt, werden aber häufig nicht tragfähig mit dem beobachteten Vorgang verbunden.',
      'Auch mit Hilfen entsteht keine fachlich tragfähige Modellvorstellung zum untersuchten Vorgang.'],
    reaction: ['Reaktionen und Reaktionsgleichungen',
      'Reaktionsgleichungen werden fachlich präzise entwickelt und mit Stoffveränderung, Ladungs- und Stoffbilanz sowie dem passenden Reaktionskonzept begründet.',
      'Reaktionsgleichungen und Reaktionskonzepte werden sicher verwendet und in vergleichbaren neuen Fällen überwiegend selbstständig begründet.',
      'Vertraute Reaktionen werden im Allgemeinen richtig dargestellt; beim Begründen von Teilreaktionen oder beim Übertragen treten Unsicherheiten auf.',
      'Einfache bekannte Reaktionen werden teilweise zutreffend beschrieben oder ausgeglichen; zentrale Bilanzierungen benötigen Unterstützung.',
      'Einzelne Reaktionsansätze sind erkennbar, wesentliche Stoff- oder Ladungsbilanzen und chemische Deutungen bleiben jedoch fehlerhaft.',
      'Grundlegende Reaktionsdarstellungen und Stoff- oder Ladungsbilanzen gelingen auch mit gezielten Hilfen nicht.'],
    calculation: ['Berechnungen und quantitative Deutung',
      'Größenbeziehungen werden eigenständig ausgewählt und begründet; Einheiten, Annahmen und Aussagegrenzen der Rechnung werden sicher geprüft.',
      'Geeignete Größenbeziehungen werden sicher genutzt; mehrschrittige Rechnungen und die chemische Bedeutung der Ergebnisse werden schlüssig erläutert.',
      'Vertraute Rechnungen sind im Allgemeinen tragfähig; bei der Auswahl mehrerer Beziehungen oder der Deutung von Annahmen bleiben Lücken.',
      'Einfache geübte Rechnungen gelingen teilweise mit Unterstützung; Größen, Einheiten und Ergebnisdeutung sind nicht durchgehend sicher.',
      'Einzelne Größen und Rechenansätze sind bekannt, werden jedoch häufig fehlerhaft verknüpft; die chemische Ergebnisdeutung bleibt unzureichend.',
      'Auch mit Hilfen wird kein tragfähiger Ansatz zur einfachen quantitativen Fragestellung entwickelt.'],
    experiment: ['Experimentelle Auswertung und Erkenntnisgewinnung',
      'Beobachtung und Deutung werden konsequent getrennt; Datenqualität, Störeinflüsse und alternative Verfahren werden differenziert geprüft.',
      'Messdaten werden sachgerecht ausgewertet und chemisch erklärt; wichtige Unsicherheiten und die Aussagegrenzen des Verfahrens werden begründet.',
      'Vertraute Messdaten werden im Allgemeinen angemessen ausgewertet; Unsicherheiten oder alternative Deutungen werden nur teilweise berücksichtigt.',
      'Zentrale Beobachtungen und einfache Auswertungsschritte werden erkannt; Deutung und Verfahrensbegründung benötigen Unterstützung.',
      'Einzelne Befunde werden wiedergegeben, aber häufig mit Deutungen verwechselt oder nicht sachgerecht ausgewertet.',
      'Auch mit Hilfen werden die wesentlichen Befunde und ihre Bedeutung für die Fragestellung nicht fachlich tragfähig erfasst.'],
    argument: ['Chemische Argumentation und begründete Urteile',
      'Die Argumentation verbindet chemische Belege, offengelegte Kriterien und Gegenargumente zu einem eigenständigen, differenziert begrenzten Urteil.',
      'Chemische Schlussfolgerungen werden durch geeignete Belege und Kriterien gestützt; wichtige Einwände werden überwiegend selbstständig berücksichtigt.',
      'Wesentliche chemische Belege und Zusammenhänge werden nachvollziehbar dargestellt; die Abwägung bleibt bei komplexeren Einwänden lückenhaft.',
      'Eine grundlegende chemische Schlussfolgerung wird erkennbar; Belege und Kriterien werden teilweise erst nach Hilfestellung verbunden.',
      'Einzelne Aussagen sind fachlich zutreffend, tragen aber kein hinreichend begründetes chemisches Urteil.',
      'Auch mit Hilfen entsteht keine fachlich tragfähige Begründung zur gestellten chemischen Frage.']
  };
  function compose(points, selected, generalText) {
    const grade = grades.find(g => g.points === Number(points));
    if (!grade) throw new RangeError('Ungültige Punktstufe');
    if (typeof generalText !== 'string' || !generalText.trim()) throw new Error('Die allgemeine Formulierung zur Punktstufe fehlt.');
    const band = points >= 13 ? 1 : points >= 10 ? 2 : points >= 7 ? 3 : points >= 4 ? 4 : points >= 1 ? 5 : 6;
    const keys = [...new Set(selected)].filter(k => Object.hasOwn(areas, k));
    return [generalText.trim(), grade.text, ...keys.map(k => areas[k][band])].join('\n\n');
  }
  return {grades, areas, compose};
})();

if (typeof module !== 'undefined' && module.exports) module.exports = chemistryAssessment;
if (typeof document !== 'undefined') {
  // Read the existing general list rather than maintain a competing copy of it.
  const generalByPoints = new Map();
  for (const row of document.querySelectorAll('#abitur-bewertung ~ .table-wrap tbody tr')) {
    const cells = row.querySelectorAll('td');
    const match = cells[0]?.textContent.match(/·\s*(\d+)/);
    if (match && cells[1]) generalByPoints.set(Number(match[1]), cells[1].textContent.trim());
  }
  for (const builder of document.querySelectorAll('[data-chemistry-formulations]')) {
    const output = builder.querySelector('textarea');
    const status = builder.querySelector('[role="status"]');
    const confirmation = builder.querySelector('[data-confirmation]');
    const question = builder.querySelector('[data-confirmation-message]');
    const confirmButton = builder.querySelector('[data-confirm]');
    let pending = null;
    const hideConfirmation = () => { confirmation.hidden = true; pending = null; };
    const askBeforeReplacing = (action, message, buttonLabel) => {
      if (!output.value.trim()) { hideConfirmation(); action(); return; }
      pending = action;
      question.textContent = message;
      confirmButton.textContent = buttonLabel;
      confirmation.hidden = false;
      status.textContent = 'Bitte die Rückfrage direkt im Formular bestätigen oder abbrechen.';
    };
    confirmButton.addEventListener('click', () => {
      const action = pending;
      hideConfirmation();
      if (action) action();
    });
    builder.querySelector('[data-cancel]').addEventListener('click', () => {
      hideConfirmation();
      status.textContent = 'Der vorhandene Entwurf bleibt unverändert.';
    });
    builder.querySelector('[data-compose]').addEventListener('click', () => {
      const points = Number(builder.querySelector('select').value);
      if (!generalByPoints.has(points)) {
        status.textContent = 'Die allgemeine Formulierung konnte nicht gelesen werden. Bitte die Seite neu laden; der vorhandene Entwurf bleibt erhalten.';
        return;
      }
      askBeforeReplacing(() => {
        output.value = chemistryAssessment.compose(points,
        [...builder.querySelectorAll('input:checked')].map(input => input.value), generalByPoints.get(points));
        status.textContent = 'Vorlage für die Vorbereitung erstellt. Bitte auf Prüfungsaufgaben und erwartbare Leistungen zuschneiden; nicht während der Prüfung verwenden.';
      }, 'Den vorhandenen Entwurf durch die neu gewählten Bausteine ersetzen?', 'Ja, Entwurf ersetzen');
    });
    builder.querySelector('[data-clear]').addEventListener('click', () => {
      askBeforeReplacing(() => {
        output.value = ''; builder.querySelector('select').value = '11';
        for (const input of builder.querySelectorAll('input')) input.checked = false;
        status.textContent = 'Auswahl und Entwurf zurückgesetzt.';
      }, 'Den vorhandenen Entwurf und die Auswahl zurücksetzen?', 'Ja, zurücksetzen');
    });
    builder.querySelector('[data-copy]').addEventListener('click', async () => {
      if (!output.value.trim()) { status.textContent = 'Bitte zunächst einen Entwurf erstellen.'; return; }
      try { await navigator.clipboard.writeText(output.value); status.textContent = 'Entwurf kopiert.'; }
      catch { output.focus(); output.select(); status.textContent = 'Text markiert. Bitte mit der Kopierfunktion Ihres Geräts kopieren.'; }
    });
  }
}
