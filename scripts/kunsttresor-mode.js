/* The experiment is opt-in. The unqualified URL always remains classical. */
window.KunstWallEnabled=new URLSearchParams(location.search).get('modus')==='wand';
if(window.KunstWallEnabled)document.documentElement.classList.add('kunst-wall');
