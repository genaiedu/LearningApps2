/* Progressive reading structure. Original text, models and controls are moved,
   never copied, shortened or replaced. The unenhanced document stays complete. */
(function () {
  'use strict';
  const app = document.body.dataset.readingApp;
  if (!app || document.body.classList.contains('reading-ready')) return;
  const main = document.querySelector('main');
  const chapterNav = main?.querySelector('.chapter-nav');
  if (!chapterNav) return;
  const make = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const readingText = node => node.nodeType === 3 ? node.textContent : node.nodeName === 'BR' ? ' ' : [...node.childNodes].map(readingText).join('');
  const title = element => readingText(element).replace(/\s+/g, ' ').trim();
  const direct = (parent, selector) => [...parent.children].find(node => node.matches(selector));
  const sections = [];
  const groups = [];

  // A subchapter gains its own breathing space, without changing any paragraph.
  function stations(section) {
    const headings = [...section.children].filter(node => node.matches('h3.subchapter[id]'));
    for (const [index, heading] of headings.entries()) {
      const stop = headings[index + 1];
      const siblings = [];
      let node = heading;
      while (node && node !== stop) { siblings.push(node); node = node.nextElementSibling; }
      const station = make('div', 'reading-station');
      station.setAttribute('aria-labelledby', heading.id);
      section.insertBefore(station, heading);
      const number = make('p', 'reading-station-number', String(index + 1).padStart(2, '0'));
      number.setAttribute('aria-hidden', 'true');
      station.append(number, ...siblings);
    }
    if (headings.length > 2) {
      const route = make('nav', 'reading-route');
      route.setAttribute('aria-label', 'Lesestationen: ' + title(section.querySelector('h2')));
      for (const heading of headings) {
        const link = make('a', '', title(heading));
        link.href = '#' + heading.id;
        route.append(link);
      }
      const lead = direct(section, 'p.lead') || direct(section, 'h2');
      lead?.after(route);
    }
  }

  function addSection(section, group) {
    const heading = section.querySelector('h2');
    if (!heading || !section.id) return;
    const item = { element: section, heading, id: section.id, label: title(heading), group };
    sections.push(item);
    group.items.push(item);
    section.classList.add('reading-section');
    if (app === 'typografie') stations(section);
  }

  if (app === 'typografie') {
    const labels = { zeichen: 'I · Zeichen', papier: 'II · Papier', bildschirm: 'III · Bildschirm', web: 'Vertiefung · Webseiten bauen' };
    for (const part of main.querySelectorAll('.atelier-part')) {
      const group = { label: labels[part.dataset.part], items: [], subitems: [] };
      groups.push(group);
      for (const section of part.children) if (section.matches('section.chapter')) addSection(section, group);
    }
    const appendix = { label: 'Nachschlagen & Weiterdenken', items: [], subitems: [] };
    groups.push(appendix);
    for (const section of main.children) if (section.matches('section.chapter')) addSection(section, appendix);
    for (const visual of main.querySelectorAll('#tschichold .wrap>.two-col>div:last-child,#buchsatz>.two-col>.spread')) {
      visual.classList.add('reading-visual');
    }
  } else {
    const group = { label: 'Spiegelwelt · Die Entdeckungsreise', items: [], subitems: [] };
    groups.push(group);
    for (const section of main.children) if (section.matches('section[id]:not(.cinema)')) addSection(section, group);
    sciencePairs();
  }

  // Make existing visual explanations the companion of the full reading track.
  function sciencePairs() {
    const mirror = document.getElementById('spiegel');
    if (mirror) {
      const visual = direct(mirror, '.molecule-lab');
      const text = [...mirror.children].filter(node => node.matches('.teaching-text,.margin-note,.reading-guide'));
      if (visual && text.length) {
        const pair = make('div', 'reading-pair reading-mirror-pair');
        const track = make('div', 'reading-track');
        mirror.insertBefore(pair, text[0]);
        visual.classList.add('reading-visual');
        track.append(...text);
        pair.append(visual, track);
      }
    }
    const definitions = [
      ['mischung', '.mixture-lab', '.mixture-visual', '.mixture-settings', '.teaching-text,.explain-strip,.worked-example,.reading-guide'],
      ['kagan', '.nonlinear-lab', '.chart-panel', '.curve-controls', '.teaching-text,.reading-guide,.worked-example,.derivation'],
      ['soai', '.feedback-lab', '.feedback-art', '.feedback-controls', '.teaching-text,.dark-note,.reading-guide']
    ];
    for (const [id, labSelector, visualSelector, controlsSelector, textSelector] of definitions) {
      const section = document.getElementById(id);
      if (!section) continue;
      const scope = direct(section, '.wrap') || section;
      const lab = direct(scope, labSelector);
      const visual = lab && direct(lab, visualSelector);
      const controls = lab && direct(lab, controlsSelector);
      if (!visual || !controls) continue;
      const text = [...scope.children].filter(node => node.matches(textSelector));
      const track = make('div', 'reading-track');
      if (text[0] && (text[0].compareDocumentPosition(lab) & Node.DOCUMENT_POSITION_FOLLOWING)) {
        scope.insertBefore(lab, text[0]);
      }
      lab.classList.add('reading-pair');
      visual.classList.add('reading-visual');
      controls.classList.add('reading-controls');
      track.append(controls, ...text);
      lab.append(track);
    }
  }

  // Reuse the complete headings for orientation; do not introduce summaries of
  // author voices. Those deliberately remain untouched, including the closing one.
  for (const group of groups) {
    for (const section of group.items) {
      group.subitems.push(section);
      const children = section.element.querySelectorAll('h3.subchapter[id],.history-station[id]');
      for (const child of children) {
        const heading = child.matches('h3') ? child : child.querySelector('h3');
        if (heading) group.subitems.push({ element: child, id: child.id, label: title(heading), group, section });
      }
    }
  }

  for (const [index, section] of sections.entries()) {
    const next = sections[index + 1];
    if (!next) continue;
    const bridge = make('nav', 'reading-next');
    bridge.setAttribute('aria-label', 'Weiter nach ' + section.label);
    const link = make('a');
    link.href = '#' + next.id;
    link.append(make('small', '', next.group === section.group ? 'Als Nächstes' : next.group.label), make('span', '', next.label), make('b', 'reading-next-arrow', '→'));
    bridge.append(link);
    const container = direct(section.element, '.wrap') || section.element;
    container.append(bridge);
  }

  const compass = make('nav', 'reading-compass');
  compass.setAttribute('aria-label', 'Orientierung im Lesepfad');
  const location = make('div', 'reading-location');
  const groupLabel = make('span', 'reading-group');
  const currentTitle = make('span', 'reading-current');
  location.append(groupLabel, currentTitle);
  const count = make('span', 'reading-count');
  const menu = make('details', 'reading-menu');
  const summary = make('summary', '', 'Inhalt & Lesestationen');
  const menuBody = make('div', 'reading-menu-body');
  const menuLinks = new Map();
  for (const group of groups) {
    if (!group.items.length) continue;
    const block = make('div', 'reading-menu-group');
    block.append(make('p', '', group.label));
    const list = make('ul');
    for (const item of group.subitems) {
      const row = make('li', item.section ? 'reading-menu-subitem' : '');
      const link = make('a', '', item.label);
      link.href = '#' + item.id;
      link.addEventListener('click', () => {
        menu.open = false;
        // Keep native anchor history and give keyboard users the new reading point.
        setTimeout(() => {
          if (!item.element.hasAttribute('tabindex')) item.element.setAttribute('tabindex', '-1');
          item.element.focus({ preventScroll: true });
        }, 0);
      });
      menuLinks.set(item, link);
      row.append(link); list.append(row);
    }
    block.append(list); menuBody.append(block);
  }
  menu.append(summary, menuBody);
  const line = make('div', 'reading-compass-line');
  line.append(location, count, menu);
  const meter = make('div', 'reading-meter');
  meter.setAttribute('aria-hidden', 'true');
  const fill = make('i'); meter.append(fill);
  compass.append(line, meter);
  chapterNav.after(compass);
  document.body.classList.add('reading-ready');

  let previous;
  let scheduled = false;
  const targets = groups.flatMap(group => group.subitems);
  function update() {
    scheduled = false;
    const top = compass.getBoundingClientRect().bottom + 28;
    let active = targets[0];
    for (const item of targets) if (item.element.getBoundingClientRect().top <= top) active = item;
    if (!active) return;
    if (active !== previous) {
      groupLabel.textContent = active.group.label;
      currentTitle.textContent = active.label;
      count.textContent = String(active.group.subitems.indexOf(active) + 1).padStart(2, '0') + ' / ' + String(active.group.subitems.length).padStart(2, '0');
      for (const [item, link] of menuLinks) {
        if (item === active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      }
      previous = active;
    }
    const section = active.section || active;
    const rect = section.element.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (top - rect.top) / Math.max(1, rect.height)));
    fill.style.width = progress * 100 + '%';
  }
  function schedule() { if (!scheduled) { scheduled = true; requestAnimationFrame(update); } }
  function metrics() {
    const height = chapterNav.getBoundingClientRect().height;
    document.body.style.setProperty('--reading-nav-height', app === 'typografie' ? height + 'px' : '0px');
    const total = (app === 'typografie' ? height : 0) + compass.getBoundingClientRect().height;
    document.documentElement.style.setProperty('--reading-offset', total + 24 + 'px');
    // Sticky figures must fit; otherwise they remain an ordinary reading block.
    for (const visual of main.querySelectorAll('.reading-visual')) {
      visual.classList.toggle('reading-visual-tall', visual.getBoundingClientRect().height > innerHeight - total - 40);
    }
    schedule();
  }
  menu.addEventListener('toggle', () => {
    summary.setAttribute('aria-expanded', String(menu.open));
    const current = menuBody.querySelector('[aria-current]');
    if (menu.open && current) menuBody.scrollTop += current.getBoundingClientRect().top - menuBody.getBoundingClientRect().top - 70;
  });
  document.addEventListener('pointerdown', event => { if (menu.open && !menu.contains(event.target)) menu.open = false; });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && menu.open) { menu.open = false; summary.focus(); event.preventDefault(); } });
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', metrics, { passive: true });
  if (window.ResizeObserver) {
    const observer = new ResizeObserver(metrics);
    observer.observe(chapterNav);
    for (const visual of main.querySelectorAll('.reading-visual')) observer.observe(visual);
  }
  document.fonts?.ready.then(metrics);
  metrics();
}());
