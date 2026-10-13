/* The entry course uses the same checked calculations, but its own learning state. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./saeuren-basen-core.js'),require('./saeuren-basen-aufgaben.js'));
  else root.AcidEntry=factory(root.AcidMission,root.AcidTasks);
})(typeof globalThis!=='undefined'?globalThis:this,function(C,T){
  'use strict';
  const lessons=[
    {id:'protonen',stems:['begriffe-0','begriffe-4','begriffe-7']},
    {id:'ph',stems:['ph-0','ph-1','saeuren-0','basen-0']},
    {id:'schwach',stems:['saeuren-1','basen-1','konstanten-0']},
    {id:'titration',stems:['titration-0','titration-2','titration-4','titration-5']},
    {id:'puffer',stems:['puffer-0','puffer-1','puffer-2','puffer-5']},
    {id:'kurve',stems:['kurven-1','kurven-4','kurven-2','kurven-3','kurven-7','titration-transfer_phosphate']}
  ];
  const slots=lessons.flatMap(lesson=>lesson.stems.map(stem=>({lesson:lesson.id,stem}))),cache=new Map();
  function bank(seed){
    if(!cache.has(seed)){
      cache.set(seed,new Map(T.bank(seed).map(task=>[task.id,task])));
      if(cache.size>8)cache.delete(cache.keys().next().value);
    }
    return cache.get(seed);
  }
  function task(slot,seed){
    const spec=slots.find(item=>item.stem===slot);if(!spec)throw Error('Unbekannte Einstiegsaufgabe');
    const variant=Math.floor(C.rng(seed^0x51AC)()*3),source=bank(seed).get(slot+'-'+variant);
    if(!source)throw Error('Einstiegsaufgabe fehlt');
    const result={...source,lesson:spec.lesson,slot};
    if(result.math){
      result.math=result.math.replace(/c_0V_0/g,'c_0\\cdot V_0').replace(/(K_\\mathrm\{)([sbw])(\})/g,(_,start,index,end)=>start+index.toUpperCase()+end).replace(/(K_\\mathrm\{[SB]\})c_0/g,'$1\\cdot c_0');
      if(slot==='saeuren-1'){
        result.math=result.math.replace(/\bx\b/g,'c(\\mathrm{H_3O^+})');
        result.symbols='c₀ ist die Anfangskonzentration; K_S und pK_S gehören zur Säure. α ist der geschätzte protolysierte Anteil c(H₃O⁺)/c₀. Die Wasserkonzentration wird näherungsweise als konstant behandelt. Konzentrationswerte im Logarithmus stehen in mol/L; pH ist einheitenlos.';
      }
      if(slot==='basen-1'){
        result.math=result.math.replace(/\by\b/g,'c(\\mathrm{OH^-})');
        result.symbols='c₀ ist die Anfangskonzentration; K_B und pK_B gehören zur Base. α ist der geschätzte protolysierte Anteil c(OH⁻)/c₀. pK_W ≈ 14 gilt bei 25 °C. Die Wasserkonzentration wird näherungsweise als konstant behandelt. Konzentrationswerte im Logarithmus stehen in mol/L; pOH und pH sind einheitenlos.';
        result.hint='Berechne c(OH⁻) ≈ √(K_B · c₀), prüfe c(OH⁻)/c₀ ≤ 0,05 und gehe über pOH zum pH.';
      }
      // One equation per line, including wide inherited worked solutions on phones.
      result.math=result.math.replace(/,\\quad/g,'\\]\\[').replace(/,\\qquad/g,'\\]\\[');
    }
    return result;
  }
  function fresh(seed){return {version:1,seed:seed>>>0,mode:'full',entries:{}};}
  function restore(value,seed){
    const state=fresh(seed);
    if(value?.version!==1||!Number.isInteger(value.seed)||value.seed<0||value.seed>0xffffffff)return state;
    state.seed=value.seed;state.mode=value.mode==='simple'?'simple':'full';
    for(const {stem} of slots){
      const entry=value.entries?.[stem];if(!entry||typeof entry!=='object')continue;
      state.entries[stem]={seed:Number.isInteger(entry.seed)&&entry.seed>=0&&entry.seed<=0xffffffff?entry.seed:state.seed,
        value:typeof entry.value==='string'?entry.value.slice(0,500):'',hint:entry.hint===true,revealed:entry.revealed===true,studied:entry.studied===true||(entry.studied===undefined&&entry.revealed===true&&entry.solved!==true),
        solved:false,attempts:Number.isInteger(entry.attempts)&&entry.attempts>=0?Math.min(entry.attempts,10000):0};
      const saved=state.entries[stem];saved.solved=entry.solved===true&&accepts(task(stem,saved.seed),saved.value);
    }
    return state;
  }
  function accepts(item,value){
    // Accept a correctly rounded three-significant-figure pH at values >= 10.
    const absolute=['pH','pOH','pK'].includes(item.unit)&&Math.abs(item.answer)>=10?.055:item.absolute;
    return C.accepts({...item,absolute},value);
  }
  return {lessons,slots,task,fresh,restore,accepts};
});
