const { test } = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../scripts/monty-engine.js');

test('Every first choice and prize position: host always reveals another losing door', () => {
  for (let prize = 0; prize < 3; prize++) for (let first = 0; first < 3; first++) {
    for (const random of [() => 0, () => .999999]) {
      const opened = engine.reveal(prize, first, random);
      assert.notEqual(opened, prize);
      assert.notEqual(opened, first);
      const stay = engine.decide(prize, first, opened, false);
      const change = engine.decide(prize, first, opened, true);
      assert.equal(stay.won, prize === first);
      assert.equal(change.won, prize !== first);
      assert.notEqual(change.won, stay.won);
      assert.notEqual(change.final, opened);
    }
  }
});
test('For each fixed first choice, switching wins in two of the three equally likely prize placements', () => {
  for (let first = 0; first < 3; first++) {
    let switchWins = 0, stayWins = 0;
    for (let prize = 0; prize < 3; prize++) {
      const opened = engine.reveal(prize, first, () => 0);
      switchWins += Number(engine.decide(prize, first, opened, true).won);
      stayWins += Number(engine.decide(prize, first, opened, false).won);
    }
    assert.equal(switchWins, 2); assert.equal(stayWins, 1);
  }
});
test('Invalid reveals cannot be evaluated as legitimate games', () => {
  assert.throws(() => engine.decide(0, 1, 0, true), RangeError);
  assert.throws(() => engine.decide(0, 1, 1, true), RangeError);
  assert.throws(() => engine.reveal(3, 1), RangeError);
});
test('Comparison simulation evaluates the same draw with both strategies', () => {
  const result = engine.simulate(1000);
  assert.equal(result.count, 1000);
  assert.equal(result.switchWins + result.stayWins, 1000);
});
