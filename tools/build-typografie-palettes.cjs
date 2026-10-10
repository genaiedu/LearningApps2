'use strict';
const fs=require('node:fs'),path=require('node:path');
const A=require('../scripts/typografie-ansicht-core.js');
const css=['/* Generated from the checked reading palettes in typografie-ansicht-core.js. */'];
for(const p of A.palettes)for(const mode of ['light','dark']){
  css.push('html[data-palette="'+p.id+'"][data-theme="'+mode+'"]{',
    '  color-scheme:'+mode+';',
    ...Object.entries(p[mode]).map(([key,value])=>'  --'+key+':'+value+';'),'}');
}
fs.writeFileSync(path.resolve(__dirname,'../styles/typografie-palettes.css'),css.join('\n')+'\n');
console.log('Exported four reading palettes, each with a light and dark version.');
