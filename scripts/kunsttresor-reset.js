(function (root) {
  'use strict';
  const prefix = 'kunsttresor-';
  function createSequence() {
    const steps = [1,2,4];
    let position = 0;
    return step => {
      position = step === steps[position] ? position+1 : step === steps[0] ? 1 : 0;
      if (position !== steps.length) return false;
      position = 0;
      return true;
    };
  }
  function ownedKeys(storage) {
    const keys = [];
    for (let i=0;i<storage.length;i++) {
      const key = storage.key(i);
      if (typeof key === 'string' && key.startsWith(prefix)) keys.push(key);
    }
    return keys;
  }
  function clearAppStorage(accessors) {
    // Enumerate both stores before deleting anything. Never clear the shared
    // GitHub Pages origin: other learning apps have their own saved data here.
    const stores = accessors.map(access => { const storage=access(); return {storage,keys:ownedKeys(storage)}; });
    let failed = false;
    for (const {storage,keys} of stores) for (const key of keys) {
      try { storage.removeItem(key); } catch { failed = true; }
    }
    for (const {storage} of stores) if (ownedKeys(storage).length) failed = true;
    if (failed) throw Error('Die Kunsttresor-Daten konnten nicht vollständig gelöscht werden. Bitte erlaube den Browserspeicher und versuche es erneut.');
  }
  const api = {createSequence,clearAppStorage};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KunstReset = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
