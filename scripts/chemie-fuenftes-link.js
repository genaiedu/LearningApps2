document.addEventListener('DOMContentLoaded', () => {
  const chapter = document.getElementById('fuenftes');
  const schoolLinks = document.querySelector('#links .curriculum-resource-group ul');
  if (!chapter || !schoolLinks) return;

  const chapterLink = document.createElement('a');
  chapterLink.href = 'chemie-fuenftes-abiturfach.html';
  chapterLink.className = 'button button--secondary';
  chapterLink.textContent = 'Kapitel 16 als eigene Webseite öffnen';
  const chapterActions = document.createElement('div');
  chapterActions.className = 'actions';
  chapterActions.append(chapterLink);
  chapter.after(chapterActions);

  const listItem = document.createElement('li');
  const indexLink = document.createElement('a');
  indexLink.href = 'chemie-fuenftes-abiturfach.html';
  indexLink.textContent = 'Fünftes Abiturfach · Vorbereitung und Aufgabenbeispiele';
  listItem.append(indexLink);
  schoolLinks.append(listItem);
});
