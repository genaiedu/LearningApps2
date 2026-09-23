/* The host knows the prize, always opens an unchosen losing door, and always offers a switch. */
(function (root) {
  'use strict';
  const doors = [0, 1, 2];
  const pick = (items, random = Math.random) => items[Math.floor(random() * items.length)];
  function reveal(prize, first, random = Math.random) {
    if (!doors.includes(prize) || !doors.includes(first)) throw new RangeError('Ungültige Tornummer.');
    return pick(doors.filter(door => door !== prize && door !== first), random);
  }
  function decide(prize, first, opened, switchDoor) {
    if (!doors.includes(prize) || !doors.includes(first) || !doors.includes(opened) || opened === prize || opened === first) {
      throw new RangeError('Der Moderator muss ein anderes Nietentor öffnen.');
    }
    const final = switchDoor ? doors.find(door => door !== first && door !== opened) : first;
    return { final, won: final === prize };
  }
  function simulate(count, random = Math.random) {
    let switchWins = 0, stayWins = 0;
    for (let i = 0; i < count; i++) {
      const prize = pick(doors, random), first = pick(doors, random), opened = reveal(prize, first, random);
      switchWins += Number(decide(prize, first, opened, true).won);
      stayWins += Number(decide(prize, first, opened, false).won);
    }
    return { count, switchWins, stayWins };
  }
  const api = { pick, reveal, decide, simulate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MontyEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
