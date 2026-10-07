(() => {
  'use strict';
  const dialog = document.getElementById('teacher-download');
  const form = dialog.querySelector('form'), input = form.querySelector('input');
  const status = form.querySelector('[role=status]'), submit = form.querySelector('[type=submit]');
  let generation = 0;
  document.querySelectorAll('[data-teacher-pdf]').forEach(button => button.addEventListener('click', () => {
    generation++; form.reset(); status.textContent = ''; submit.disabled = false;
    dialog.dataset.id = button.dataset.teacherPdf; dialog.showModal(); input.focus();
  }));
  dialog.querySelector('[data-close]').onclick = () => dialog.close();
  dialog.addEventListener('close', () => { generation++; form.reset(); status.textContent = ''; });
  window.addEventListener('pagehide', () => dialog.close());
  form.addEventListener('submit', async event => {
    event.preventDefault(); const request = ++generation, id = dialog.dataset.id;
    const password = input.value; input.value = ''; submit.disabled = true;
    status.textContent = 'Dokument wird entschlüsselt …';
    try {
      let records = SpiegelweltTeacherData;
      if (location.protocol === 'https:' || location.protocol === 'http:') {
        const response = await fetch('scripts/spiegelwelt-teacher-data.js?fresh=' + Date.now(), {cache: 'no-store'});
        if (!response.ok) throw new Error('Aktuelle Unterlagen nicht verfügbar');
        const text = await response.text();
        const marker = 'globalThis.SpiegelweltTeacherData = ';
        const start = text.indexOf(marker);
        if (start < 0) throw new Error('Ungültige Unterlagen');
        records = JSON.parse(text.slice(start + marker.length).trim().replace(/;$/, ''));
      }
      const bytes = await ProtectedMaterialsCrypto.open(id, records[id], password);
      if (request !== generation || !dialog.open) { bytes.fill(0); return; }
      const url = URL.createObjectURL(new Blob([bytes], {type: 'application/pdf'})); bytes.fill(0);
      const link = document.createElement('a'); link.href = url; link.download = id + '-2026-10-07-revision-3.pdf';
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      status.textContent = 'PDF freigegeben. Eine heruntergeladene Kopie bleibt lesbar; bitte nicht an Schülerinnen und Schüler weitergeben.';
    } catch (_) { if (request === generation) status.textContent = 'Passwort falsch oder Entschlüsselung nicht verfügbar. Bitte über HTTPS öffnen und erneut versuchen.'; }
    finally { if (request === generation) submit.disabled = false; }
  });
})();
