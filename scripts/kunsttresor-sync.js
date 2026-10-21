(function (root) {
  'use strict';
  const shared = typeof module !== 'undefined' && module.exports
    ? require('../../LearningApps/scripts/learning-profile.js') : root.LearningProfile;
  if (!shared) throw Error('Die gemeinsame Lerncode-Anbindung konnte nicht geladen werden.');
  const api = {...shared,
    storedConnection: (local,session) => shared.storedConnection(local,session,{appId:'kunsttresor',rememberDevice:true}),
    storedProfileId: (local,session) => shared.storedProfileId(local,session,{appId:'kunsttresor',rememberDevice:true}),
    createController: options => shared.createController({rememberDevice:true,...options,appId:'kunsttresor'}),
    mount: (adapter, container, options={}) => shared.mount(adapter, {...options,appId:'kunsttresor',rememberDevice:true,container})
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KunstLerncode = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
