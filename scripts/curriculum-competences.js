(() => {
  'use strict';
  const payload = document.getElementById('competence-data');
  if (!payload) return;
  const definitions = JSON.parse(payload.textContent);
  const dialog = document.createElement('dialog');
  dialog.className = 'competence-dialog';
  dialog.setAttribute('aria-labelledby', 'competence-heading');
  dialog.innerHTML = '<div class="competence-dialog-header"><h2 id="competence-heading"></h2><button type="button" class="competence-close" aria-label="Kompetenzfenster schließen" autofocus>Schließen ×</button></div><div class="competence-dialog-body"></div>';
  document.body.append(dialog);
  const content = dialog.querySelector('.competence-dialog-body');
  let opener;
  function paragraph(text, className) {
    if (!text) return;
    const p = document.createElement('p');
    p.textContent = text;
    if (className) p.className = className;
    content.append(p);
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('button[data-competence]');
    if (!button) return;
    const entry = definitions[button.dataset.competence];
    if (!entry) return;
    if (!dialog.open) opener = button;
    dialog.querySelector('h2').textContent = entry.title;
    content.replaceChildren();
    paragraph(entry.context, 'competence-context');
    paragraph(entry.lead);
    paragraph(entry.text, 'competence-wording');
    const wording = content.querySelector('.competence-wording');
    if (wording) {
      const text = wording.textContent;
      const prefix = entry.context?.startsWith('Einführungsphase') ? 'EF-' :
        entry.context?.startsWith('Qualifikationsphase') ? 'Q-' :
        entry.context?.includes('ersten Stufe') ? 'SI1-' :
        entry.context?.includes('zweiten Stufe') ? 'SI2-' : '';
      const fragment = document.createDocumentFragment();
      let end = 0;
      for (const match of text.matchAll(/\b(?:UF|S|E|K|B|F|M|R)\d{1,2}\b/g)) {
        const key = definitions[prefix + match[0]] ? prefix + match[0] : match[0];
        if (!definitions[key] || key === button.dataset.competence) continue;
        fragment.append(text.slice(end, match.index));
        const ref = document.createElement('button');
        ref.type = 'button'; ref.className = 'competence-ref';
        ref.dataset.competence = key;
        ref.setAttribute('aria-haspopup', 'dialog');
        ref.textContent = match[0]; fragment.append(ref);
        end = match.index + match[0].length;
      }
      fragment.append(text.slice(end)); wording.replaceChildren(fragment);
    }
    paragraph(entry.note, 'competence-note');
    if (entry.url) {
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.href = entry.url;
      a.textContent = entry.source + ' · Original öffnen';
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      p.append(a); content.append(p);
    } else paragraph(entry.source, 'competence-note');
    for (const link of entry.links || []) {
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.href = link.url;
      a.textContent = link.label;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      p.append(a); content.append(p);
    }
    dialog.showModal();
    content.scrollTop = 0;
  });
  dialog.querySelector('.competence-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => opener?.focus({preventScroll:true}));
})();
