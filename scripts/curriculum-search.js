'use strict';
(() => {
  const input = document.querySelector('#search');
  const status = document.querySelector('#search-status');
  const sidebar = document.querySelector('.layout > aside');
  const chapters = [...document.querySelectorAll('.chapter')];
  if (!input || !status || !sidebar || !chapters.length) return;
  const navigation = sidebar.querySelector('nav');
  const empty = document.querySelector('#empty');
  if (empty) empty.hidden = true;
  input.setAttribute('aria-controls', 'curriculum-search-results');
  input.setAttribute('autocomplete', 'off');
  const results = document.createElement('section');
  results.id = 'curriculum-search-results';
  results.className = 'curriculum-search-results';
  results.setAttribute('aria-label', 'Fundstellen');
  results.hidden = true;
  status.after(results);
  const bar = document.createElement('div');
  bar.className = 'curriculum-search-bar';
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', 'Suchtreffer durchgehen');
  bar.hidden = true;
  bar.innerHTML = '<span class="curriculum-search-position" role="status" aria-live="polite"></span><button type="button" data-search-action="previous" aria-label="Vorheriger Treffer" title="Vorheriger Treffer (Umschalt + Eingabetaste im Suchfeld)">↑</button><button type="button" data-search-action="next" aria-label="Nächster Treffer" title="Nächster Treffer (Eingabetaste im Suchfeld)">↓</button><button type="button" data-search-action="list">Fundstellen</button><button type="button" data-search-action="clear" aria-label="Suche beenden" title="Suche beenden">×</button>';
  document.body.append(bar);
  const position = bar.querySelector('.curriculum-search-position');
  let hits = [], active = -1, timer, lastQuery = '', shown = 0;
  let groups = [], marks = [];

  // Index actual text nodes. Existing links, dialog triggers and listeners stay intact.
  function indexDocument() {
    const indexed = [];
    chapters.forEach(chapter => {
      chapter.hidden = false;
      const contexts = new Map();
      let chapterTitle = '', sectionTitle = '', detailTitle = '';
      for (const el of chapter.querySelectorAll('h2,h3,h4,h5,h6,p,li,td,th,dt,dd,figcaption,summary')) {
        if (el.tagName === 'H2') { chapterTitle = el.textContent.trim(); sectionTitle = ''; detailTitle = ''; }
        if (el.tagName === 'H3') { sectionTitle = el.textContent.trim(); detailTitle = ''; }
        if (/^H[4-6]$/.test(el.tagName)) detailTitle = el.textContent.trim();
        contexts.set(el, [chapterTitle, sectionTitle, detailTitle].filter(Boolean));
      }
      let previousGroup;
      const walker = document.createTreeWalker(chapter, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (!node.parentElement || node.parentElement.closest('script,style,button:not([data-competence]),select,textarea,[aria-hidden="true"],dialog')) continue;
        const block = node.parentElement.closest('p,li,td,th,h2,h3,h4,h5,h6,dt,dd,figcaption,summary') || node.parentElement;
        if (!previousGroup || previousGroup.element !== block) {
          const group = { element: block, context: contexts.get(block) || [chapter.querySelector('h2')?.textContent.trim() || 'Curriculum'], raw: '', nodes: [] };
          previousGroup = group; indexed.push(group);
        }
        const group = previousGroup;
        group.nodes.push({ node, start: group.raw.length, end: group.raw.length + node.length });
        group.raw += node.textContent;
      }
    });
    for (const group of indexed) {
      // Map normalized whitespace back to original offsets, including inline links.
      group.text = ''; group.starts = []; group.ends = [];
      const chunks = /\s+|\S/gu;
      let m;
      while ((m = chunks.exec(group.raw))) {
        const value = /^\s/u.test(m[0]) ? ' ' : m[0];
        group.text += value;
        for (let i = 0; i < value.length; i++) {
          group.starts.push(m.index); group.ends.push(m.index + m[0].length);
        }
      }
    }
    return indexed;
  }
  function clearMarks() {
    const parents = new Set();
    for (const mark of marks) {
      if (!mark.isConnected) continue;
      parents.add(mark.parentNode);
      mark.replaceWith(document.createTextNode(mark.textContent));
    }
    for (const parent of parents) parent.normalize();
    marks = [];
  }
  function appendSnippet(container, hit) {
    const { text } = hit.group;
    const from = Math.max(0, hit.start - 65), to = Math.min(text.length, hit.end + 85);
    container.append((from ? '… ' : '') + text.slice(from, hit.start));
    const highlight = document.createElement('mark');
    highlight.textContent = text.slice(hit.start, hit.end);
    container.append(highlight, text.slice(hit.end, to) + (to < text.length ? ' …' : ''));
  }
  function showMore() {
    results.querySelector('.curriculum-search-more')?.remove();
    let list = results.querySelector('ol');
    if (!list) { list = document.createElement('ol'); results.append(list); }
    const end = Math.min(hits.length, shown + 50);
    for (; shown < end; shown++) {
      const hit = hits[shown], li = document.createElement('li'), button = document.createElement('button');
      button.type = 'button'; button.dataset.searchHit = String(shown);
      button.className = 'curriculum-search-result';
      const heading = document.createElement('span'); heading.className = 'curriculum-search-context';
      heading.textContent = `${shown + 1}. ${hit.group.context.join(' › ')}`;
      const snippet = document.createElement('span'); snippet.className = 'curriculum-search-snippet';
      appendSnippet(snippet, hit); button.append(heading, snippet); li.append(button); list.append(li);
    }
    if (shown < hits.length) {
      const more = document.createElement('button'); more.type = 'button'; more.className = 'curriculum-search-more';
      more.textContent = `Weitere Fundstellen (${shown} von ${hits.length} angezeigt)`;
      more.addEventListener('click', showMore); results.append(more);
    }
    updateSelection();
  }
  function updateSelection() {
    for (const button of results.querySelectorAll('[data-search-hit]')) {
      if (Number(button.dataset.searchHit) === active) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    }
    position.textContent = active < 0 ? `${hits.length} Treffer` : `Treffer ${active + 1} von ${hits.length}`;
  }
  function goTo(index) {
    if (!hits.length) return;
    if (active >= 0) hits[active].marks.forEach(mark => mark.classList.remove('curriculum-search-current'));
    active = (index + hits.length) % hits.length;
    const hit = hits[active];
    hit.marks.forEach(mark => mark.classList.add('curriculum-search-current'));
    const target = hit.marks[0];
    for (let parent = target.parentElement; parent; parent = parent.parentElement) if (parent.tagName === 'DETAILS') parent.open = true;
    document.dispatchEvent(new CustomEvent('curriculum:search-navigate'));
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
    updateSelection();
  }
  function search() {
    clearTimeout(timer);
    const query = input.value.trim().replace(/\s+/g, ' ');
    if (query === lastQuery) return;
    lastQuery = query; clearMarks(); hits = []; active = -1; shown = 0;
    results.replaceChildren(); results.hidden = !query; bar.hidden = true;
    if (navigation) navigation.hidden = !!query;
    if (query.length < 2) {
      status.textContent = query ? 'Bitte mindestens zwei Zeichen eingeben.' : '';
      return;
    }
    groups = indexDocument();
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(escaped, 'giu');
    const segments = new Map();
    for (const group of groups) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(group.text))) {
        const hit = { group, start: match.index, end: match.index + match[0].length, marks: [] };
        hits.push(hit);
        const from = group.starts[hit.start], to = group.ends[hit.end - 1];
        for (const entry of group.nodes) {
          if (entry.end <= from || entry.start >= to) continue;
          const chunk = { from: Math.max(0, from - entry.start), to: Math.min(entry.node.length, to - entry.start), hit };
          if (!segments.has(entry.node)) segments.set(entry.node, []);
          segments.get(entry.node).push(chunk);
        }
      }
    }
    for (const [node, chunks] of segments) {
      const fragment = document.createDocumentFragment(); let cursor = 0;
      for (const chunk of chunks) {
        fragment.append(node.textContent.slice(cursor, chunk.from));
        const mark = document.createElement('mark'); mark.className = 'curriculum-search-match';
        mark.textContent = node.textContent.slice(chunk.from, chunk.to);
        fragment.append(mark); chunk.hit.marks.push(mark); marks.push(mark); cursor = chunk.to;
      }
      fragment.append(node.textContent.slice(cursor)); node.replaceWith(fragment);
    }
    const sections = new Set(hits.map(hit => hit.group.context.slice(0, 2).join(' › '))).size;
    status.textContent = hits.length ? `${hits.length} Treffer in ${sections} ${sections === 1 ? 'Abschnitt' : 'Abschnitten'}. Fundstelle anklicken oder mit Enter zum nächsten Treffer springen.` : `Keine Fundstelle für „${query}“.`;
    bar.hidden = !hits.length; showMore();
  }
  function clearSearch() {
    input.value = ''; search();
  }
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(search, 220); });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); search(); goTo(active < 0 ? (event.shiftKey ? hits.length - 1 : 0) : active + (event.shiftKey ? -1 : 1)); }
    if (event.key === 'Escape') { event.preventDefault(); clearSearch(); }
  });
  results.addEventListener('click', event => {
    const button = event.target.closest('[data-search-hit]');
    if (button) goTo(Number(button.dataset.searchHit));
  });
  bar.addEventListener('click', event => {
    const action = event.target.closest('[data-search-action]')?.dataset.searchAction;
    if (action === 'next') goTo(active + 1);
    if (action === 'previous') goTo(active < 0 ? hits.length - 1 : active - 1);
    if (action === 'clear') clearSearch();
    if (action === 'list') {
      document.dispatchEvent(new CustomEvent('curriculum:search-open'));
      sidebar.querySelector('details').open = true;
      while (shown <= active) showMore();
      const selected = active >= 0 ? results.querySelector(`[data-search-hit="${active}"]`) : input;
      selected.focus({ preventScroll: true });
      selected.scrollIntoView({ block: 'nearest' });
    }
  });
  window.addEventListener('beforeprint', clearSearch);
})();
