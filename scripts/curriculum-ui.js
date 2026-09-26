'use strict';

(() => {
  const layout = document.querySelector('.layout');
  const sidebar = layout?.querySelector(':scope > aside');
  if (!layout || !sidebar) return;

  sidebar.id = 'curriculum-sidebar';
  const mobileQuery = matchMedia('(max-width: 900px)');
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'curriculum-toc-toggle';
  toggle.setAttribute('aria-controls', sidebar.id);
  toggle.innerHTML = '<span aria-hidden="true">☰</span><span class="curriculum-toc-toggle-label">Inhalt ausblenden</span>';
  sidebar.prepend(toggle);

  const mobileButton = document.createElement('button');
  mobileButton.type = 'button';
  mobileButton.className = 'curriculum-mobile-toc';
  mobileButton.setAttribute('aria-controls', sidebar.id);
  mobileButton.innerHTML = '<span aria-hidden="true">☰</span> Inhalt';
  document.body.append(mobileButton);

  const backdrop = document.createElement('div');
  backdrop.className = 'curriculum-toc-backdrop';
  backdrop.hidden = true;
  document.body.append(backdrop);

  let collapsed = false;
  try { collapsed = localStorage.getItem('curriculum-toc-collapsed') === 'true'; } catch {}
  let mobileOpen = false;
  let returnFocus = mobileButton;
  const background = [document.querySelector('.cover'), layout.querySelector('main'), document.querySelector('footer')].filter(Boolean);

  function syncToc() {
    layout.classList.toggle('curriculum-toc-collapsed', collapsed);
    document.body.classList.toggle('curriculum-mobile-toc-open', mobileOpen && mobileQuery.matches);
    backdrop.hidden = !(mobileOpen && mobileQuery.matches);
    for (const element of background) element.inert = mobileOpen && mobileQuery.matches;
    toggle.setAttribute('aria-expanded', String(mobileQuery.matches ? mobileOpen : !collapsed));
    toggle.setAttribute('aria-label', mobileQuery.matches ? 'Inhaltsverzeichnis schließen' : collapsed ? 'Inhaltsverzeichnis einblenden' : 'Inhaltsverzeichnis einklappen');
    toggle.querySelector('.curriculum-toc-toggle-label').textContent = mobileQuery.matches ? 'Inhalt schließen' : collapsed ? 'Inhalt einblenden' : 'Inhalt ausblenden';
    mobileButton.setAttribute('aria-expanded', String(mobileOpen && mobileQuery.matches));
  }
  function closeMobileToc() {
    if (!mobileOpen) return;
    mobileOpen = false;
    syncToc();
    returnFocus.focus();
  }
  toggle.addEventListener('click', () => {
    if (mobileQuery.matches) { closeMobileToc(); return; }
    collapsed = !collapsed;
    try { localStorage.setItem('curriculum-toc-collapsed', String(collapsed)); } catch {}
    syncToc();
  });
  mobileButton.addEventListener('click', () => {
    returnFocus = mobileButton;
    mobileOpen = true;
    sidebar.querySelector('details').open = true;
    syncToc();
    toggle.focus();
  });
  backdrop.addEventListener('click', closeMobileToc);
  sidebar.addEventListener('click', event => {
    if (mobileOpen && event.target.closest('nav a[href^="#"], .top-link[href^="#"]')) closeMobileToc();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && mobileOpen) { event.preventDefault(); closeMobileToc(); }
  });
  mobileQuery.addEventListener('change', () => { mobileOpen = false; syncToc(); });
  syncToc();

  function isLocalPdf(link) {
    let url;
    try { url = new URL(link.href, location.href); } catch { return false; }
    if (!url.pathname.toLowerCase().endsWith('.pdf')) return false;
    if (url.origin === location.origin && url.pathname.includes('/downloads/')) return true;
    return url.origin === 'https://genaiedu.github.io' && url.pathname.startsWith('/LearningApps2/downloads/');
  }
  const pdfLinks = [...document.querySelectorAll('main a[href]')].filter(isLocalPdf);
  if (!pdfLinks.length) return;

  for (const link of pdfLinks) {
    link.dataset.pdfPreview = 'true';
    link.removeAttribute('download');
    const label = link.textContent.trim();
    link.textContent = /herunterladen/i.test(label)
      ? label.replace(/herunterladen/i, 'ansehen und herunterladen')
      : label + (/(?:\bPDF\b)/i.test(label) ? ' ansehen' : ' · PDF ansehen');
    link.setAttribute('aria-haspopup', 'dialog');
  }

  const dialog = document.createElement('dialog');
  dialog.className = 'curriculum-pdf-dialog';
  dialog.setAttribute('aria-labelledby', 'curriculum-pdf-title');
  dialog.innerHTML = '<div class="curriculum-pdf-toolbar"><h2 class="curriculum-pdf-title" id="curriculum-pdf-title"></h2><a class="curriculum-pdf-download" download>PDF herunterladen</a><a class="curriculum-pdf-external" target="_blank" rel="noopener">In neuem Tab öffnen</a><button class="curriculum-pdf-close" type="button" aria-label="PDF-Vorschau schließen">Schließen</button></div><iframe class="curriculum-pdf-frame" title="PDF-Vorschau"></iframe><p class="curriculum-pdf-hint">Falls die Vorschau im Browser nicht angezeigt wird, öffnen oder laden Sie die PDF-Datei über die Schaltflächen oben.</p>';
  document.body.append(dialog);
  const frame = dialog.querySelector('iframe');
  const title = dialog.querySelector('.curriculum-pdf-title');
  const download = dialog.querySelector('.curriculum-pdf-download');
  const external = dialog.querySelector('.curriculum-pdf-external');
  let pdfTrigger;
  document.addEventListener('click', event => {
    const link = event.target.closest('a[data-pdf-preview]');
    if (!link) return;
    event.preventDefault();
    pdfTrigger = link;
    const url = new URL(link.href, location.href);
    title.textContent = link.textContent.replace(/\s*(?:ansehen und herunterladen|ansehen|· PDF ansehen)\s*$/i, '').trim();
    download.href = url.href;
    external.href = url.href;
    frame.src = url.href;
    frame.title = 'PDF-Vorschau: ' + title.textContent;
    dialog.showModal();
  });
  dialog.querySelector('.curriculum-pdf-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    frame.removeAttribute('src');
    if (pdfTrigger?.isConnected) pdfTrigger.focus();
  });
})();
