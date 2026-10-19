/* A new German, rule-based interpretation of ELIZA; not the original DOCTOR script. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ElizaCore = factory();
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const clean = value => String(value || '').normalize('NFC').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1200);
  const quote = value => '„' + value.trim().replace(/[.!?;,]+$/, '') + '“';
  // One pass: substitutions are not reprocessed. Quoted fragments are used
  // where German case and inflection cannot be safely inferred from a pattern.
  const reflections = { ich: 'Sie', mich: 'Sie', mir: 'Ihnen', mein: 'Ihr', meine: 'Ihre', meinen: 'Ihren', meinem: 'Ihrem', meiner: 'Ihrer', meines: 'Ihres', bin: 'sind', habe: 'haben', kann: 'können', werde: 'werden', will: 'wollen', muss: 'müssen' };
  function reflect(value) {
    return clean(value).replace(/[\p{L}]+/gu, word => reflections[word.toLocaleLowerCase('de')] || word);
  }
  const rules = [
    ['identity', /\b(?:bist du|sind sie|wer bist|wer sind|verstehst du|verstehen sie|bewusstsein|fühlst du|fühlen sie|echte ki|sprachmodell|chatgpt)\b/i, [
      'Ich bin eine regelbasierte ELIZA-Nachbildung. Ich habe weder Gefühle noch Verständnis; meine Antworten entstehen aus Sprachmustern.',
      'Meine Rückfragen können persönlich wirken. Dahinter stehen aber feste Regeln, kein Bewusstsein und kein Sprachmodell.'
    ]],
    ['computer', /\b(?:computer|programm|roboter|maschine|algorithmus|eliza)\b/i, [
      'Was erwarten Sie von einem Gespräch mit einem Computer?', 'Woran würden Sie erkennen, ob eine Antwort wirklich Verständnis zeigt?', 'Was unterscheidet dieses Gespräch für Sie von einem Gespräch mit einem Menschen?'
    ]],
    ['family', /\b(?:mutter|vater|eltern|familie|schwester|bruder|tochter|sohn|kinder|kindheit|oma|opa)\b/i, [
      'Erzählen Sie mir mehr über Ihre Familie.', 'Welche Erinnerung verbinden Sie damit?', 'Welche Rolle spielt Ihre Familie für das, was Sie gerade beschäftigt?'
    ]],
    ['dream', /\b(?:traum|träume|geträumt|träumen)\b/i, [
      'Was fällt Ihnen zu diesem Traum ein?', 'Welche Einzelheit ist Ihnen besonders in Erinnerung geblieben?', 'Sehen Sie eine Verbindung zu etwas, das Sie im Alltag beschäftigt?'
    ]],
    ['remember', /\bich erinnere mich (.+)/i, [
      m => 'Was ist Ihnen an dieser Erinnerung wichtig: ' + quote(m[1]) + '?', 'Warum kommt Ihnen diese Erinnerung gerade jetzt in den Sinn?'
    ]],
    ['feel', /\bich fühle mich (.+)/i, [
      m => 'Seit wann fühlen Sie sich ' + m[1].replace(/[.!?]+$/, '') + '?', 'Was geht diesem Gefühl gewöhnlich voraus?', 'Können Sie eine Situation beschreiben, in der das anders ist?'
    ]],
    ['sad', /\b(?:traurig|unglücklich|einsam|verzweifelt|deprimiert|niedergeschlagen|schlecht|bedrückt)\b/i, [
      'Was beschäftigt Sie dabei am meisten?', 'Wann tritt dieses Gefühl besonders auf?', 'Möchten Sie genauer beschreiben, was Sie damit meinen?'
    ]],
    ['afraid', /\b(?:angst|ängstlich|fürchte|befürchte|sorge|sorgen)\b/i, [
      'Was genau beunruhigt Sie daran?', 'Welche Situation haben Sie dabei vor Augen?', 'Was wäre für Sie in dieser Situation anders, wenn diese Sorge nicht da wäre?'
    ]],
    ['happy', /\b(?:glücklich|zufrieden|fröhlich|freue|begeistert)\b/i, [
      'Was trägt besonders dazu bei?', 'Was bedeutet dieses Gefühl für Sie?', 'Können Sie ein konkretes Beispiel nennen?'
    ]],
    ['need', /\bich (?:brauche|benötige) (.+)/i, [
      m => 'Was würde es für Sie bedeuten, ' + quote(m[1]) + ' zu bekommen?', 'Was macht Ihnen dieses Bedürfnis gerade jetzt deutlich?', 'Was wäre dann anders?'
    ]],
    ['wish', /\bich (?:wünsche mir|möchte|will) (.+)/i, [
      m => 'Was bedeutet Ihnen dieser Wunsch: ' + quote(m[1]) + '?', 'Was würde sich dadurch für Sie ändern?', 'Was ist Ihnen daran besonders wichtig?'
    ]],
    ['cannot', /\bich (?:kann nicht|kann (?:das|es) nicht)\b/i, [
      'Was hält Sie Ihrer Ansicht nach davon ab?', 'Gab es eine Situation, in der es Ihnen doch gelungen ist?', 'Was müsste anders sein, damit es möglich wäre?'
    ]],
    ['am', /\bich bin (.+)/i, [
      m => 'Was meinen Sie genauer, wenn Sie sagen: ' + quote('Ich bin ' + m[1]) + '?', 'Seit wann sehen Sie sich so?', 'Was hat Sie zu dieser Einschätzung gebracht?'
    ]],
    ['because', /\bweil (.+)/i, [
      'Ist das für Sie der wichtigste Grund?', 'Welche anderen Gründe könnten eine Rolle spielen?', 'Was bedeutet dieser Zusammenhang für Sie?'
    ]],
    ['why', /\bwarum\b/i, [
      'Welche Erklärung haben Sie selbst dafür?', 'Was würde eine Antwort auf diese Frage für Sie verändern?', 'Was macht Ihnen diese Frage wichtig?'
    ]],
    ['always', /\b(?:immer|nie|niemals|alle|jeder|niemand)\b/i, [
      'Fällt Ihnen eine Ausnahme ein?', 'Können Sie ein bestimmtes Beispiel nennen?', 'Trifft das wirklich in jeder Situation zu?'
    ]],
    ['think', /\bich (?:denke|glaube|finde|meine)[,:]?\s+(.+)/i, [
      m => 'Was führt Sie zu diesem Gedanken: ' + quote(m[1]) + '?', 'Wie sicher sind Sie sich dabei?', 'Welche andere Sichtweise wäre möglich?'
    ]],
    ['sorry', /\b(?:entschuldigung|verzeihung|tut mir leid|entschuldige)\b/i, [
      'Sie müssen sich hier nicht entschuldigen. Was möchten Sie sagen?', 'Was veranlasst Sie, sich zu entschuldigen?'
    ]],
    ['perhaps', /\b(?:vielleicht|eventuell|möglicherweise)\b/i, [
      'Was lässt Sie zögern?', 'Welche Möglichkeit erscheint Ihnen am ehesten zutreffend?', 'Was macht Sie unsicher?'
    ]],
    ['work', /\b(?:arbeit|beruf|schule|unterricht|prüfung|studium|chef|kollegen)\b/i, [
      'Was daran beschäftigt Sie besonders?', 'Wie erleben Sie Ihren Alltag dort?', 'Gibt es eine bestimmte Situation, die Ihnen dazu einfällt?'
    ]],
    ['friend', /\b(?:freund|freundin|freunde|partner|partnerin|beziehung)\b/i, [
      'Was ist Ihnen an dieser Beziehung wichtig?', 'Wie erleben Sie diese Situation?', 'Was wünschen Sie sich in diesem Zusammenhang?'
    ]],
    ['you', /\b(?:du|dich|dir|dein|deine)\b/i, [
      'Was bringt Sie dazu, das über mich zu sagen?', 'Ich kann nur auf Sprachmuster reagieren. Was beschäftigt Sie an Ihrer Aussage?', 'Was erwarten Sie von meiner Antwort?'
    ]],
    ['yes', /^(?:ja|genau|stimmt|richtig|sicher)[.!\s]*$/i, [
      'Was bestärkt Sie darin?', 'Können Sie das etwas näher erläutern?', 'Was fällt Ihnen noch dazu ein?'
    ]],
    ['no', /^(?:nein|nicht wirklich|keineswegs)[.!\s]*$/i, [
      'Womit sind Sie nicht einverstanden?', 'Wie würden Sie es stattdessen beschreiben?', 'Können Sie mir genauer sagen, was nicht zutrifft?'
    ]],
    ['hello', /^(?:hallo|guten tag|hi|hey|guten abend|guten morgen)[!.\s]*$/i, [
      'Guten Tag. Was beschäftigt Sie?', 'Worüber möchten Sie sprechen?'
    ]],
    ['thanks', /\b(?:danke|vielen dank)\b/i, [
      'Was nehmen Sie aus unserem bisherigen Gespräch mit?', 'Möchten Sie noch etwas ansprechen?'
    ]],
    ['question', /\?$/, [
      'Was vermuten Sie selbst?', 'Was würde Ihnen eine Antwort darauf bedeuten?', 'Was ist Ihnen an dieser Frage besonders wichtig?'
    ]]
  ];
  const fallback = ['Erzählen Sie mir mehr darüber.', 'Was ist Ihnen daran besonders wichtig?', 'Können Sie ein konkretes Beispiel nennen?', 'Was geht Ihnen dabei durch den Kopf?', 'Was möchten Sie dazu noch sagen?'];
  const safety = /\b(?:suizid\w*|selbstmord\w*|selbstverletz\w*|umbringen|vergewaltig\w*)\b|\b(?:mich|mir) (?:selbst )?(?:töten|verletzen|weh ?tun)\b|\bnicht mehr leben\b|\bleben (?:hat|habe) keinen sinn\b/i;
  class Eliza {
    constructor() { this.reset(); }
    reset() { this.turn = 0; this.last = ''; this.counts = new Map(); this.memories = []; }
    pick(id, answers, match) {
      const count = this.counts.get(id) || 0;
      this.counts.set(id, count + 1);
      const answer = answers[count % answers.length];
      return { text: typeof answer === 'function' ? answer(match) : answer, rule: id };
    }
    respond(value) {
      const input = clean(value);
      if (!input) return { text: 'Bitte geben Sie einen Satz ein.', rule: 'empty' };
      if (safety.test(input)) return { text: 'Diese Simulation ist für Krisen nicht geeignet und kann Ihnen dabei nicht helfen. Bitte wenden Sie sich an einen Menschen, dem Sie vertrauen, und an professionelle Hilfe. Wenn Sie unmittelbar in Gefahr sind, kontaktieren Sie den örtlichen Notruf.', rule: 'safety' };
      const normalized = input.toLocaleLowerCase('de');
      this.turn++;
      if (normalized === this.last) return this.pick('repeat', ['Sie wiederholen Ihre Aussage. Was möchten Sie daran besonders hervorheben?', 'Gibt es dazu noch eine andere Formulierung?']);
      this.last = normalized;
      for (const [id, pattern, answers] of rules) {
        const match = input.match(pattern);
        if (!match) continue;
        if (['family', 'wish', 'work', 'friend'].includes(id) && !this.memories.includes(input)) this.memories.push(input);
        if (this.memories.length > 4) this.memories.shift();
        return this.pick(id, answers, match);
      }
      if (this.memories.length && this.turn % 4 === 0) return { text: 'Sie sagten vorhin: ' + quote(this.memories.shift()) + '. Was fällt Ihnen jetzt dazu ein?', rule: 'memory' };
      return this.pick('fallback', fallback);
    }
  }
  return Object.freeze({ Eliza, clean, reflect });
});
