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
      const bytes = await ProtectedMaterialsCrypto.open(id, SpiegelweltTeacherData[id], password);
      if (request !== generation || !dialog.open) { bytes.fill(0); return; }
      const url = URL.createObjectURL(new Blob([bytes], {type: 'application/pdf'})); bytes.fill(0);
      const link = document.createElement('a'); link.href = url; link.download = id + '.pdf';
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      status.textContent = 'PDF freigegeben. Eine heruntergeladene Kopie bleibt lesbar; bitte nicht an Schülerinnen und Schüler weitergeben.';
    } catch (_) { if (request === generation) status.textContent = 'Passwort falsch oder Entschlüsselung nicht verfügbar. Bitte über HTTPS öffnen und erneut versuchen.'; }
    finally { if (request === generation) submit.disabled = false; }
  });
})();
