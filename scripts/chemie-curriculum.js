'use strict';
const chapters = [...document.querySelectorAll('.chapter')];
const input = document.querySelector('#search');
const status = document.querySelector('#search-status');
const original = chapters.map(chapter => chapter.innerHTML);
const searchable = chapters.map(chapter => chapter.textContent.toLocaleLowerCase('de'));
let timer;
function search() {
  const query = input.value.trim().toLocaleLowerCase('de');
  let count = 0;
  chapters.forEach((chapter, index) => {
    chapter.innerHTML = original[index];
    chapter.hidden = !!query && !searchable[index].includes(query);
    if (chapter.hidden) return;
    count++;
    if (!query) return;
    const walker = document.createTreeWalker(chapter, NodeFilter.SHOW_TEXT);
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const text = node.textContent, lower = text.toLocaleLowerCase('de');
      let start = 0, pos = lower.indexOf(query);
      if (pos < 0) continue;
      const fragment = document.createDocumentFragment();
      while (pos >= 0) {
        fragment.append(text.slice(start, pos));
        const mark = document.createElement('mark'); mark.textContent = text.slice(pos, pos + query.length); fragment.append(mark);
        start = pos + query.length; pos = lower.indexOf(query, start);
      }
      fragment.append(text.slice(start)); node.replaceWith(fragment);
    }
  });
  status.textContent = query ? `${count} von 15 Kapiteln gefunden` : '';
  document.querySelector('#empty').hidden = count !== 0;
}
input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(search, 180); });
document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]');
  if (link && input.value) { clearTimeout(timer); input.value = ''; search(); }
});
const printButton = document.querySelector('#print'); printButton.hidden = false;
printButton.addEventListener('click', () => window.print());
window.addEventListener('beforeprint', () => { clearTimeout(timer); input.value = ''; search(); });
if (matchMedia('(max-width:900px)').matches) document.querySelector('aside details').open = false;
