// Rebuild after editing the TS integration or vendored engine. npm install esbuild
const path=require('node:path');
require('esbuild').buildSync({entryPoints:[path.join(__dirname,'mo-rechenlabor-worker.ts')],bundle:true,format:'iife',platform:'browser',target:'es2020',minify:true,legalComments:'inline',outfile:path.join(__dirname,'mo-rechenlabor-worker.js'),banner:{js:'/* Generated from mo-rechenlabor-worker.ts. Integration GPL-2.0; GANSU-Lite BSD-3-Clause, vendor/gansu-lite/LICENSE.txt. */'}});
