'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {webcrypto} = require('node:crypto');
const sync = require('../scripts/kunsttresor-sync.js');
const A = '2'.repeat(26), B = '3'.repeat(26), C = '4'.repeat(26);
const clone = value => JSON.parse(JSON.stringify(value));
const payload = (label, score = 0) => ({app:'kunsttresor',version:1,savedAt:Date.now(),state:{label,score},best:score,progress:{wins:score},history:{rooms:[label]},gallery:{liked:[label]}});
function storage() { const values = new Map(); return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)}; }
function fixture(overrides={}) {
  const profiles = new Map([[null,payload('gast',7)]]), local = storage(), session = storage();
  let profileId = null, current = clone(profiles.get(null));
  const adapter = {
    getProfileId:()=>profileId,
    getSnapshot:()=>clone(current),
    validateSnapshot:value=>{assert.equal(value.app,'kunsttresor');assert.ok(value.state);return value;},
    readProfileSnapshot:id=>profiles.has(id)?clone(profiles.get(id)):null,
    replaceSnapshot:(id,value)=>{profileId=id;current=clone(value);profiles.set(id,clone(value));},
    freshSnapshot:()=>payload('frisch',0)
  };
  const server = new Map([[A,{profileId:'profil-aaaa-001',appId:'kunsttresor',state:payload('A',10),revision:1,updatedAt:'2026-10-21T20:00:00Z'}],[B,{profileId:'profil-bbbb-002',appId:'kunsttresor',state:payload('B',20),revision:1,updatedAt:'2026-10-21T20:00:00Z'}],[C,{profileId:'profil-cccc-003',appId:'kunsttresor',state:null,revision:0,updatedAt:null}]]);
  const requests=[], hooks={};
  async function fetcher(url,options) {
    const code=options.headers.Authorization.slice(7), saved=server.get(code), body=options.body?JSON.parse(options.body):null;
    requests.push({code,method:options.method,body,signal:options.signal});
    if(hooks.before)await hooks.before({code,method:options.method,body,signal:options.signal});
    if(!saved)return {ok:false,status:401,json:async()=>({error:'invalid_code',message:'Ungültiger Lerncode.'})};
    if(saved.disabled)return {ok:false,status:403,json:async()=>({error:'code_disabled',message:'Dieser Lerncode wurde deaktiviert.'})};
    if(options.method==='GET')return {ok:true,status:200,json:async()=>clone(saved)};
    if(body.baseRevision!==saved.revision)return {ok:false,status:409,json:async()=>({error:'revision_conflict',message:'Neuerer Stand vorhanden.',revision:saved.revision,updatedAt:saved.updatedAt})};
    saved.state=clone(body.state);saved.revision++;saved.updatedAt='2026-10-21T20:01:00Z';
    if(hooks.afterWrite)await hooks.afterWrite({code,body,saved});
    return {ok:true,status:200,json:async()=>({profileId:saved.profileId,appId:saved.appId,revision:saved.revision,updatedAt:saved.updatedAt})};
  }
  const options={adapter,fetcher,local,session,crypto:webcrypto,apiBase:'https://example.test',delay:60000,...overrides};
  let controller=sync.createController(options);
  return {adapter,get controller(){return controller;},options,server,requests,hooks,profiles,local,session,
    edit(label,score){current=payload(label,score);profiles.set(profileId,clone(current));controller.changed();},
    reload(){controller.destroy();profileId=sync.storedProfileId(local,session);current=clone(profiles.get(profileId)||payload('frisch'));controller=sync.createController(options);return controller;}
  };
}
async function select(f,code,direction='download'){await f.controller.connect(code);await f.controller.chooseDirection(direction);}
test('Lerncodes accept copied groups but reject short or invalid secrets',()=>{
  assert.equal(sync.normalizeCode(sync.formatCode(A).toLowerCase().replaceAll('-',' ')),A);
  assert.throws(()=>sync.normalizeCode('123456'));
  assert.throws(()=>sync.normalizeCode('I'.repeat(26)));
  assert.notEqual(sync.scopedKey('game','profil-aaaa-001'),sync.scopedKey('game','profil-bbbb-002'));
});
test('every manual connect waits for a direction before replacing or uploading anything',async t=>{
  const f=fixture();t.after(()=>f.controller.destroy());
  await f.controller.connect(A);
  assert.equal(f.controller.getStatus().awaitingChoice,true);
  assert.equal(f.controller.getStatus().enabled,false);
  assert.equal(f.adapter.getSnapshot().state.label,'gast');
  assert.equal(f.requests.filter(r=>r.method==='PUT').length,0);
  await f.controller.chooseDirection('download');
  assert.equal(f.adapter.getSnapshot().state.label,'A');
  await f.controller.connect(B);
  assert.equal(f.adapter.getSnapshot().state.label,'A');
  assert.equal(f.controller.getStatus().awaitingChoice,true);
  await f.controller.chooseDirection('download');
  assert.equal(f.adapter.getSnapshot().state.label,'B');
  assert.deepEqual(f.adapter.getSnapshot().gallery.liked,['B']);
  assert.equal(f.profiles.get(null).state.label,'gast');
  assert.equal(f.server.get(A).state.state.label,'A');
});
test('explicit upload copies the currently visible latest JSON state to the chosen code',async t=>{
  const f=fixture();t.after(()=>f.controller.destroy());
  await select(f,A);await f.controller.connect(B);f.edit('A-latest-visible',18);
  await f.controller.chooseDirection('upload');
  assert.equal(f.controller.getProfileId(),'profil-bbbb-002');
  assert.equal(f.server.get(B).state.state.label,'A-latest-visible');
  assert.deepEqual(f.server.get(B).state.gallery.liked,['A-latest-visible']);
  assert.equal(f.profiles.get('profil-aaaa-001').state.label,'A-latest-visible');
  assert.equal(f.server.get(A).state.state.label,'A');
});
test('empty profiles disable download and never auto-copy; fresh is explicit',async t=>{
  const f=fixture();t.after(()=>f.controller.destroy());
  await select(f,A);await f.controller.connect(C);
  assert.equal(f.controller.getStatus().remoteAvailable,false);
  await f.controller.chooseDirection('download');
  assert.equal(f.server.get(C).state,null);
  assert.equal(f.adapter.getSnapshot().state.label,'A');
  await f.controller.chooseDirection('fresh');
  assert.equal(f.server.get(C).state.state.label,'frisch');
  assert.equal(f.server.get(A).state.state.label,'A');
});
test('cancelling a direction keeps the current game locally with sync paused',async t=>{
  const f=fixture();t.after(()=>f.controller.destroy());
  await select(f,A);await f.controller.connect(C);f.edit('A-while-choosing',19);
  f.controller.cancelChoice();const count=f.requests.length;
  await f.controller.flush();await f.controller.refresh();
  assert.equal(f.requests.length,count);
  assert.equal(f.adapter.getSnapshot().state.label,'A-while-choosing');
  assert.equal(f.controller.getStatus().enabled,false);
});
test('pause retains the visible profile, persists disabled, and causes no requests even after reload',async t=>{
  const f=fixture();t.after(()=>f.controller.destroy());
  await select(f,A);f.controller.setEnabled(false);f.edit('A-local-only',17);
  const count=f.requests.length;
  await f.controller.flush();await f.controller.refresh();
  assert.equal(f.requests.length,count);
  assert.equal(f.adapter.getSnapshot().state.label,'A-local-only');
  assert.equal(sync.storedConnection(f.local,f.session).enabled,false);
  f.reload();await f.controller.resume();
  assert.equal(f.requests.length,count);
  assert.equal(f.adapter.getSnapshot().state.label,'A-local-only');
  assert.equal(f.controller.getStatus().enabled,false);
  assert.equal(f.controller.hasUnsavedChanges(),false);
});
test('turning sync back on asks for a direction and does not transfer local offline edits automatically',async t=>{
  const f=fixture();t.after(()=>f.controller.destroy());
  await select(f,A);f.controller.setEnabled(false);f.edit('A-offline',18);
  await f.controller.setEnabled(true);
  assert.equal(f.controller.getStatus().awaitingChoice,true);
  assert.equal(f.controller.getStatus().enabled,false);
  assert.equal(f.adapter.getSnapshot().state.label,'A-offline');
  assert.equal(f.server.get(A).state.state.label,'A');
  await f.controller.chooseDirection('upload');
  assert.equal(f.server.get(A).state.state.label,'A-offline');
  assert.equal(f.controller.getStatus().enabled,true);
});
test('enabled reload always downloads the current database before any upload, even over an old dirty cache',async t=>{
  const f=fixture();t.after(()=>f.controller.destroy());
  await select(f,A);f.edit('A-unsent-old-cache',33);
  f.server.get(A).state=payload('A-newest-database',40);f.server.get(A).revision=2;
  const count=f.requests.length;f.reload();
  assert.equal(f.adapter.getSnapshot().state.label,'A-unsent-old-cache');
  await f.controller.resume();
  assert.deepEqual(f.requests.slice(count).map(r=>r.method),['GET']);
  assert.equal(f.adapter.getSnapshot().state.label,'A-newest-database');
  assert.equal(f.controller.getStatus().ready,true);
  f.edit('A-after-startup-download',41);await f.controller.flush();
  assert.equal(f.server.get(A).state.state.label,'A-after-startup-download');
  assert.equal(f.requests.at(-1).body.baseRevision,2);
});
test('failed startup download keeps the local view and forbids uploads until a successful download',async t=>{
  const f=fixture();t.after(()=>f.controller.destroy());
  await select(f,A);f.edit('A-local-before-reload',33);f.reload();
  f.hooks.before=async({method})=>{if(method==='GET')throw Error('Offline');};
  await f.controller.resume();
  assert.equal(f.controller.getStatus().ready,false);
  assert.equal(f.adapter.getSnapshot().state.label,'A-local-before-reload');
  f.edit('A-local-during-offline-start',34);const count=f.requests.length;await f.controller.flush();
  assert.equal(f.requests.length,count);
  assert.equal(f.server.get(A).state.state.label,'A');
  f.hooks.before=null;await f.controller.refresh();
  assert.equal(f.adapter.getSnapshot().state.label,'A');
  assert.equal(f.controller.getStatus().ready,true);
  assert.equal(f.requests.at(-1).method,'GET');
});
test('pause aborts a startup GET and a late result cannot change the local game',{timeout:3000},async t=>{
  const f=fixture();let release,started;t.after(()=>{release?.();f.controller.destroy();});
  await select(f,A);f.edit('A-cached',31);f.reload();
  const waiting=new Promise(resolve=>started=resolve);
  f.hooks.before=async()=>{started();await new Promise(resolve=>release=resolve);};
  const startup=f.controller.resume();await waiting;
  f.controller.setEnabled(false);
  assert.equal(f.requests.at(-1).signal.aborted,true);
  release();await startup;
  assert.equal(f.adapter.getSnapshot().state.label,'A-cached');
  assert.equal(f.controller.getStatus().enabled,false);
  assert.equal(sync.storedConnection(f.local,f.session).enabled,false);
});
test('pause aborts an in-flight PUT and stale confirmation cannot re-enable sync',{timeout:3000},async t=>{
  const f=fixture();let release,accepted;t.after(()=>{release?.();f.controller.destroy();});
  const waiting=new Promise(resolve=>accepted=resolve);
  f.hooks.afterWrite=async()=>{accepted();await new Promise(resolve=>release=resolve);};
  await select(f,A);f.edit('A-already-accepted',12);const saving=f.controller.flush();await waiting;
  f.controller.setEnabled(false);assert.equal(f.requests.at(-1).signal.aborted,true);
  f.edit('A-after-pause',13);release();await saving;
  assert.equal(f.controller.getStatus().enabled,false);
  assert.equal(f.adapter.getSnapshot().state.label,'A-after-pause');
  assert.equal(f.server.get(A).state.state.label,'A-already-accepted');
  const count=f.requests.length;await f.controller.refresh();assert.equal(f.requests.length,count);
});
test('forgetting a code removes credentials but keeps the local visible profile across reload',async t=>{
  const f=fixture();t.after(()=>f.controller.destroy());
  await select(f,A);f.edit('A-local-before-forget',13);f.controller.disconnect();
  assert.equal(f.local.getItem(sync.CONNECTION_KEY),null);
  assert.equal(f.session.getItem(sync.SESSION_KEY),null);
  assert.equal(f.adapter.getSnapshot().state.label,'A-local-before-forget');
  assert.equal(sync.storedProfileId(f.local,f.session),'profil-aaaa-001');
  const count=f.requests.length;f.reload();await f.controller.resume();
  assert.equal(f.adapter.getSnapshot().state.label,'A-local-before-forget');
  assert.equal(f.requests.length,count);
  assert.equal(f.controller.getProfileId(),null);
});
test('legacy tab credentials migrate to persistent enabled login before profile keys are chosen',()=>{
  const local=storage(),session=storage();session.setItem(sync.SESSION_KEY,JSON.stringify({profileId:'profil-aaaa-001',code:A}));
  assert.equal(sync.storedProfileId(local,session),'profil-aaaa-001');
  assert.deepEqual(sync.storedConnection(local,session),{profileId:'profil-aaaa-001',code:A,enabled:true});
  assert.equal(session.getItem(sync.SESSION_KEY),null);
  assert.ok(local.getItem(sync.CONNECTION_KEY));
});
test('a stale response from a previous code cannot block or modify saving a newly selected profile',{timeout:3000},async t=>{
  const f=fixture();let release,accepted;t.after(()=>{release?.();f.controller.destroy();});
  const waitAccepted=new Promise(resolve=>accepted=resolve);
  f.hooks.afterWrite=async({code})=>{if(code===A){accepted();await new Promise(resolve=>release=resolve);}};
  await select(f,A);f.edit('A-in-flight',12);const previous=f.controller.flush();await waitAccepted;
  await select(f,C,'fresh');assert.equal(f.server.get(C).state.state.label,'frisch');
  await select(f,B);f.edit('B-new',22);await f.controller.flush();
  assert.equal(f.server.get(B).state.state.label,'B-new');
  release();await previous;
  assert.equal(f.controller.getProfileId(),'profil-bbbb-002');
  assert.equal(f.controller.getStatus().kind,'saved');
});
test('concurrent changes stop autosave and require explicit resolution',async t=>{
  const f=fixture();t.after(()=>f.controller.destroy());
  await select(f,A);
  f.server.get(A).state=payload('A-other-browser',30);f.server.get(A).revision=2;
  f.edit('A-local',11);await f.controller.flush();
  assert.equal(f.controller.getStatus().kind,'conflict');
  assert.equal(f.server.get(A).state.state.label,'A-other-browser');
  await f.controller.resolveConflict(false);
  assert.equal(f.adapter.getSnapshot().state.label,'A-other-browser');
  assert.equal(f.controller.hasUnsavedChanges(),false);
});
test('an accepted write with a lost response is reconciled before later edits',async t=>{
  const f=fixture();t.after(()=>f.controller.destroy());let drop=true;
  f.hooks.afterWrite=async()=>{if(drop){drop=false;throw Error('Netz unterbrochen.');}};
  await select(f,A);f.edit('A-accepted',11);await f.controller.flush();
  assert.equal(f.controller.getStatus().kind,'offline');assert.equal(f.server.get(A).revision,2);
  f.edit('A-later',12);await f.controller.flush();
  assert.equal(f.controller.getStatus().kind,'saved');
  assert.equal(f.server.get(A).state.state.label,'A-later');assert.equal(f.server.get(A).revision,3);
});
test('a failed new code leaves the original local profile intact and paused',async t=>{
  const f=fixture();t.after(()=>f.controller.destroy());
  await select(f,A);await f.controller.connect('5'.repeat(26));
  assert.equal(f.controller.getProfileId(),'profil-aaaa-001');
  assert.equal(f.adapter.getSnapshot().state.label,'A');assert.equal(f.controller.getStatus().enabled,false);
  f.edit('A-after-error',15);const count=f.requests.length;await f.controller.flush();assert.equal(f.requests.length,count);
});
test('refresh preserves edits made while its remote snapshot is being hashed',{timeout:3000},async t=>{
  let pause=false,release,started;const startedHash=new Promise(resolve=>started=resolve);
  const crypto={randomUUID:()=>webcrypto.randomUUID(),subtle:{async digest(...args){if(pause){pause=false;started();await new Promise(resolve=>release=resolve);}return webcrypto.subtle.digest(...args);}}};
  const f=fixture({crypto});t.after(()=>{release?.();f.controller.destroy();});
  await select(f,A);pause=true;const refreshing=f.controller.refresh();await startedHash;
  f.edit('A-during-refresh-hash',24);release();await refreshing;
  assert.equal(f.adapter.getSnapshot().state.label,'A-during-refresh-hash');
  await f.controller.flush();assert.equal(f.server.get(A).state.state.label,'A-during-refresh-hash');
});
test('a no-op save hash does not clear a newer edit made while hashing',{timeout:3000},async t=>{
  let pause=false,release,started;const startedHash=new Promise(resolve=>started=resolve);
  const crypto={randomUUID:()=>webcrypto.randomUUID(),subtle:{async digest(...args){if(pause){pause=false;started();await new Promise(resolve=>release=resolve);}return webcrypto.subtle.digest(...args);}}};
  const f=fixture({crypto});t.after(()=>{release?.();f.controller.destroy();});
  await select(f,A);f.controller.changed();pause=true;const saving=f.controller.flush();await startedHash;
  f.edit('A-during-no-op-hash',25);release();await saving;
  assert.equal(f.controller.hasUnsavedChanges(),true);
  await f.controller.flush();assert.equal(f.server.get(A).state.state.label,'A-during-no-op-hash');
});
test('new edits during an explicit download require another choice instead of being overwritten',{timeout:3000},async t=>{
  const f=fixture();let release,started;t.after(()=>{release?.();f.controller.destroy();});
  await f.controller.connect(A);const waiting=new Promise(resolve=>started=resolve);
  f.hooks.before=async()=>{started();await new Promise(resolve=>release=resolve);};
  const selecting=f.controller.chooseDirection('download');await waiting;
  f.edit('gast-new-live-edit',9);release();await selecting;
  assert.equal(f.adapter.getSnapshot().state.label,'gast-new-live-edit');
  assert.equal(f.controller.getStatus().awaitingChoice,true);
  assert.equal(f.controller.getStatus().enabled,false);
});
test('failed connection persistence disables sync and removes any old enabled credential',async t=>{
  const f=fixture();t.after(()=>f.controller.destroy());
  await select(f,A);
  const set=f.local.setItem;
  f.local.setItem=(key,value)=>{if(key===sync.CONNECTION_KEY&&JSON.parse(value).profileId==='profil-bbbb-002')throw Error('Quota exceeded');set(key,value);};
  await select(f,B);
  assert.equal(f.adapter.getSnapshot().state.label,'B');
  assert.equal(f.controller.getStatus().enabled,false);
  assert.equal(f.controller.getStatus().kind,'error');
  assert.equal(f.local.getItem(sync.CONNECTION_KEY),null);
  const count=f.requests.length;f.reload();await f.controller.resume();
  assert.equal(f.adapter.getSnapshot().state.label,'B');
  assert.equal(f.requests.length,count);
  f.local.setItem=set;await select(f,A);
  f.local.setItem=(key,value)=>{if(key===sync.CONNECTION_KEY)throw Error('Quota exceeded');set(key,value);};
  f.controller.setEnabled(false);
  assert.equal(f.controller.getStatus().enabled,false);
  assert.equal(f.controller.getStatus().kind,'error');
  assert.equal(f.local.getItem(sync.CONNECTION_KEY),null);
});
test('a disabled-code PUT pauses persistently, keeps local data and credentials, and permits explicit use after reactivation',async t=>{
  const f=fixture();t.after(()=>f.controller.destroy());
  await select(f,A);f.server.get(A).disabled=true;f.edit('A-local-while-disabled',55);
  await f.controller.flush();
  assert.equal(f.controller.getStatus().enabled,false);
  assert.equal(f.controller.getStatus().ready,false);
  assert.equal(f.controller.getStatus().conflicted,false);
  assert.match(f.controller.getStatus().message,/Lerncode wurde deaktiviert/);
  assert.deepEqual(sync.storedConnection(f.local,f.session),{profileId:'profil-aaaa-001',code:A,enabled:false});
  assert.equal(f.adapter.getSnapshot().state.label,'A-local-while-disabled');
  assert.equal(f.server.get(A).state.state.label,'A');
  const count=f.requests.length;
  f.edit('A-local-after-disable',56);await f.controller.flush();await f.controller.refresh();
  f.reload();await f.controller.resume();
  assert.equal(f.requests.length,count);
  assert.equal(f.adapter.getSnapshot().state.label,'A-local-after-disable');
  await f.controller.setEnabled(true);
  assert.equal(f.requests.length,count+1);
  assert.equal(f.controller.getStatus().enabled,false);
  assert.match(f.controller.getStatus().message,/Lerncode wurde deaktiviert/);
  f.server.get(A).disabled=false;await f.controller.setEnabled(true);
  assert.equal(f.controller.getStatus().awaitingChoice,true);
  assert.equal(f.server.get(A).state.state.label,'A');
  await f.controller.chooseDirection('upload');
  assert.equal(f.controller.getStatus().enabled,true);
  assert.equal(f.server.get(A).state.state.label,'A-local-after-disable');
});
test('a disabled-code startup GET preserves the local cache and switches off before any upload or retry',async t=>{
  const f=fixture();t.after(()=>f.controller.destroy());
  await select(f,A);f.edit('A-local-startup',27);f.server.get(A).disabled=true;f.reload();
  const count=f.requests.length;await f.controller.resume();
  assert.deepEqual(f.requests.slice(count).map(r=>r.method),['GET']);
  assert.equal(f.adapter.getSnapshot().state.label,'A-local-startup');
  assert.equal(f.controller.getStatus().enabled,false);
  assert.equal(f.controller.getStatus().conflicted,false);
  assert.match(f.controller.getStatus().message,/Lerncode wurde deaktiviert/);
  const after=f.requests.length;await f.controller.flush();await f.controller.refresh();f.reload();await f.controller.resume();
  assert.equal(f.requests.length,after);
  assert.equal(f.adapter.getSnapshot().state.label,'A-local-startup');
});
test('deactivation while awaiting a direction or resolving a conflict never uploads or replaces the local profile',async t=>{
  const f=fixture();t.after(()=>f.controller.destroy());
  await select(f,A);await f.controller.connect(B);f.server.get(B).disabled=true;
  const count=f.requests.filter(r=>r.method==='PUT').length;
  await f.controller.chooseDirection('download');
  assert.equal(f.controller.getStatus().awaitingChoice,false);
  assert.equal(f.controller.getStatus().enabled,false);
  assert.equal(f.adapter.getSnapshot().state.label,'A');
  assert.equal(f.requests.filter(r=>r.method==='PUT').length,count);
  assert.equal(sync.storedConnection(f.local,f.session).code,A);
  await f.controller.setEnabled(true);await f.controller.chooseDirection('download');
  f.server.get(A).state=payload('A-other-browser',31);f.server.get(A).revision=2;
  f.edit('A-local-conflict',32);await f.controller.flush();
  assert.equal(f.controller.getStatus().conflicted,true);
  f.server.get(A).disabled=true;await f.controller.resolveConflict(false);
  assert.equal(f.controller.getStatus().conflicted,false);
  assert.equal(f.controller.getStatus().enabled,false);
  assert.equal(f.adapter.getSnapshot().state.label,'A-local-conflict');
  assert.match(f.controller.getStatus().message,/Lerncode wurde deaktiviert/);
});
