'use strict';
if (matchMedia('(max-width:900px)').matches) document.querySelector('aside details').open = false;

const themeButton = document.querySelector('#theme-toggle');
const themePreference = matchMedia('(prefers-color-scheme: dark)');
let chosenTheme;
try { chosenTheme = localStorage.getItem('chemie-curriculum-theme'); } catch {}
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeButton.setAttribute('aria-pressed', String(theme === 'dark'));
}
if (themeButton) {
  setTheme(chosenTheme === 'dark' || chosenTheme === 'light'
    ? chosenTheme : themePreference.matches ? 'dark' : 'light');
  themeButton.hidden = false;
  themeButton.addEventListener('click', () => {
    chosenTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    setTheme(chosenTheme);
    try { localStorage.setItem('chemie-curriculum-theme', chosenTheme); } catch {}
  });
  themePreference.addEventListener('change', event => {
    if (chosenTheme !== 'dark' && chosenTheme !== 'light') setTheme(event.matches ? 'dark' : 'light');
  });
}
