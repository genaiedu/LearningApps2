(function (root) {
  'use strict';
  const shared = typeof module !== 'undefined' && module.exports
    ? require('../../LearningApps/scripts/learning-profile.js') : root.LearningProfile;
  if (!shared) throw Error('Die gemeinsame Lerncode-Anbindung konnte nicht geladen werden.');
  const api = {...shared,
    createController: options => shared.createController({...options, appId:'kunsttresor'}),
    mount: (adapter, container) => shared.mount(adapter, {appId:'kunsttresor', container})
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KunstLerncode = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
