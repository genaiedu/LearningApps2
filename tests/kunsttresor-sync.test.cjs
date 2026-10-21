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
    freshSnapshot:()=>payload('frisch',0),
    signOut:()=>{profiles.delete(profileId);profileId=null;current=payload('frisch',0);profiles.set(null,clone(current));}
  };
  const server = new Map([[A,{profileId:'profil-aaaa-001',appId:'kunsttresor',state:payload('A',10),revision:1,updatedAt:'2026-10-21T20:00:00Z'}],[B,{profileId:'profil-bbbb-002',appId:'kunsttresor',state:payload('B',20),revision:1,updatedAt:'2026-10-21T20:00:00Z'}],[C,{profileId:'profil-cccc-003',appId:'kunsttresor',state:null,revision:0,updatedAt:null}]]);
  const requests=[], hooks={};
  async function fetcher(url,options) {
    const code=options.headers.Authorization.slice(7), saved=server.get(code), body=options.body?JSON.parse(options.body):null;
    requests.push({code,method:options.method,body,signal:options.signal});
    if(hooks.before)await hooks.before({code,method:options.method,body,signal:options.signal});
    if(!saved)return {ok:false,status:401,json:async()=>({error:'invalid_code',message:'Ungültiger Lerncode.'})};
    if(options.method==='DELETE'){assert.deepEqual(body,{confirmation:'delete-profile'});server.delete(code);return{ok:true,status:200,json:async()=>({deleted:true,profileId:saved.profileId})};}
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
test('profile deletion needs explicit confirmation, targets the whole profile and signs out only after confirmation',async t=>{
  const f=fixture();t.after(()=>f.controller.destroy());await select(f,A);await assert.rejects(f.controller.deleteRemoteProfile(''),/bestätigt/);assert.ok(f.server.has(A));
  await f.controller.deleteRemoteProfile('delete-profile');assert.equal(f.server.has(A),false);assert.equal(f.server.has(B),true);assert.equal(f.adapter.getProfileId(),null);assert.equal(f.controller.getStatus().kind,'disconnected');assert.equal(f.profiles.has('profil-aaaa-001'),false);
});
test('failed deletion preserves local progress and leaves synchronization paused for retry',async t=>{
  const f=fixture();t.after(()=>f.controller.destroy());await select(f,A);f.edit('keep-this',22);f.hooks.before=async({method})=>{if(method==='DELETE')throw Error('Offline');};
  await f.controller.deleteRemoteProfile('delete-profile');assert.ok(f.server.has(A));assert.equal(f.adapter.getSnapshot().state.label,'keep-this');assert.equal(f.controller.getStatus().enabled,false);assert.equal(f.controller.getStatus().kind,'error');
});
test('Lerncodes accept copied groups but reject short or invalid secrets',()=>{
  assert.equal(sync.normalizeCode(sync.formatCode(A).toLowerCase().replaceAll('-',' ')),A);
  assert.throws(()=>sync.normalizeCode('123456'));
  assert.throws(()=>sync.normalizeCode('I'.repeat(26)));
  assert.notEqual(sync.scopedKey('game','profil-aaaa-001'),sync.scopedKey('game','profil-bbbb-002'));
});
test('the code never enters localStorage or sessionStorage; reload makes no automatic request',async t=>{
  const f=fixture();t.after(()=>f.controller.destroy());await select(f,A);f.edit('unsent',33);
  assert.equal(f.local.getItem(sync.CONNECTION_KEY),null);assert.equal(f.session.getItem(sync.SESSION_KEY),null);
  const count=f.requests.length;f.reload();await f.controller.resume();assert.equal(f.requests.length,count);assert.equal(f.controller.getProfileId(),null);assert.equal(f.adapter.getProfileId(),null);
  assert.equal(f.profiles.get('profil-aaaa-001').state.label,'unsent');
});
test('unsubmitted local progress survives reload and is offered explicitly before either side is replaced',async t=>{
  const f=fixture();t.after(()=>f.controller.destroy());await select(f,A);f.edit('A-unsent',33);f.reload();await f.controller.resume();
  await f.controller.connect(A);assert.equal(f.controller.getStatus().localAvailable,true);assert.equal(f.controller.getStatus().localNewer,true);
  assert.equal(f.server.get(A).state.state.label,'A');assert.equal(f.profiles.get('profil-aaaa-001').state.label,'A-unsent');
  await f.controller.chooseDirection('cached');assert.equal(f.adapter.getSnapshot().state.label,'A-unsent');assert.equal(f.server.get(A).state.state.label,'A-unsent');
});
test('an offline failed save cannot disappear when the same code is reconnected after reload',async t=>{
  const f=fixture();t.after(()=>f.controller.destroy());await select(f,A);f.edit('offline-progress',34);
  f.hooks.before=async({method})=>{if(method==='PUT')throw Error('Offline');};await f.controller.flush();assert.equal(f.controller.getStatus().kind,'offline');f.reload();await f.controller.resume();
  f.hooks.before=null;await f.controller.connect(A);assert.equal(f.controller.getStatus().localNewer,true);assert.equal(f.profiles.get('profil-aaaa-001').state.label,'offline-progress');
  await f.controller.chooseDirection('cached');assert.equal(f.server.get(A).state.state.label,'offline-progress');
});
test('pausing preserves the visible state but signing out removes that profile and opens a blank guest',async t=>{
  const f=fixture();t.after(()=>f.controller.destroy());await select(f,A);f.edit('local',12);f.controller.setEnabled(false);
  assert.equal(f.adapter.getSnapshot().state.label,'local');assert.equal(f.controller.getStatus().enabled,false);
  f.controller.disconnect();assert.equal(f.adapter.getProfileId(),null);assert.equal(f.adapter.getSnapshot().state.label,'frisch');assert.equal(f.profiles.has('profil-aaaa-001'),false);
  assert.equal(f.server.get(A).state.state.label,'A');f.reload();await f.controller.resume();assert.equal(f.adapter.getSnapshot().state.label,'frisch');
});
test('legacy stored secrets are removed without opening their cached profile or contacting the service',()=>{
  const local=storage(),session=storage();local.setItem(sync.CONNECTION_KEY,JSON.stringify({profileId:'profil-aaaa-001',code:A,enabled:true}));session.setItem(sync.SESSION_KEY,JSON.stringify({profileId:'profil-aaaa-001',code:A}));local.setItem(sync.VIEW_KEY,JSON.stringify({profileId:'profil-aaaa-001'}));
  assert.equal(sync.storedProfileId(local,session),null);assert.equal(local.getItem(sync.CONNECTION_KEY),null);assert.equal(session.getItem(sync.SESSION_KEY),null);assert.equal(local.getItem(sync.VIEW_KEY),null);
});
test('the shared controller routes other applications separately and requires an explicit app identifier',async t=>{
  const shared=require('../../LearningApps/scripts/learning-profile.js'),f=fixture(),requests=[];t.after(()=>f.controller.destroy());
  const controller=shared.createController({...f.options,appId:'kraefte-labor',fetcher:async(url,options)=>{requests.push(url);return{ok:true,json:async()=>({profileId:'profil-aaaa-001',appId:'kraefte-labor',state:payload('force'),revision:1})};}});t.after(()=>controller.destroy());
  await controller.connect(A);assert.ok(requests[0].endsWith('/api/state/kraefte-labor'));assert.equal(controller.getStatus().awaitingChoice,true);
  assert.throws(()=>shared.createController(f.options),/Kennung/);
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
