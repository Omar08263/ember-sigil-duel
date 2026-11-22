// Ember Sigils — logic tests (node:test, standard library only).
// Run: node --test tests/game.test.mjs   (from the repository root)
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDeck, CARD_BY_ID, DECK_LIST, DECK_SIZE, makeRng } from '../game/src/config.js';
import { autopilotTurn, playTurn } from '../game/src/ai.js';
import { stageShot } from '../game/src/shots.js';
import {
  attack, beginTurn, canPlayCard, checkWinner, drawCards, endTurn,
  newGame, playCard, startGame,
} from '../game/src/state.js';

test('deck build: 30 cards, same seed shuffles the same way', () => {
  const a = buildDeck(makeRng(7));
  const b = buildDeck(makeRng(7));
  const c = buildDeck(makeRng(8));
  assert.equal(a.length, DECK_SIZE);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  const counts = {};
  for (const id of a) counts[id] = (counts[id] || 0) + 1;
  for (const [id, copies] of DECK_LIST) assert.equal(counts[id], copies, id);
});

test('turn flow: start draws 3+3, turn 1 gives 1 mana, end turn passes and grows mana', () => {
  const state = newGame(7);
  startGame(state);
  assert.equal(state.player.hand.length, 4); // 3 opening + 1 turn draw
  assert.equal(state.rival.hand.length, 3);
  assert.equal(state.player.mana, 1);
  assert.equal(state.active, 'player');
  assert.equal(endTurn(state), true);
  assert.equal(state.active, 'rival');
  assert.equal(state.rival.mana, 1);
  assert.equal(endTurn(state), true);
  assert.equal(state.turn, 2);
  assert.equal(state.player.mana, 2);
});

test('playing a creature spends mana and lands on the board; a 1-cost Swift can attack at once', () => {
  const state = newGame(11);
  startGame(state);
  // Force a known hand: a Swift 1-cost Gale Wisp plus mana to play it.
  state.player.hand = ['gale-wisp', 'ember-imp'];
  state.player.mana = 2;
  assert.equal(canPlayCard(state, 'player', 0), true);
  assert.equal(playCard(state, 'player', 0), true);
  assert.equal(state.player.mana, 1);
  assert.equal(state.player.board.length, 1);
  assert.equal(state.player.board[0].canAttack, true);
  assert.equal(attack(state, 'player', state.player.board[0].uid, 'hero'), true);
  assert.equal(state.rival.hp, 28);
});

test('Guard blocks the hero: attacks must go through a Guard first', () => {
  const state = newGame(13);
  startGame(state);
  state.rival.board = [{
    uid: 99, cardId: 'coral-crab', owner: 'rival', attack: 2, health: 4,
    maxHealth: 4, keyword: 'guard', element: 'tide', canAttack: true, counter: false,
  }];
  state.player.board = [{
    uid: 98, cardId: 'flame-hound', owner: 'player', attack: 3, health: 2,
    maxHealth: 2, keyword: '', element: 'ember', canAttack: true, counter: false,
  }];
  assert.equal(attack(state, 'player', 98, 'hero'), false);
  assert.equal(attack(state, 'player', 98, 99), true);
  assert.equal(state.rival.board[0].health, 1);
  assert.equal(state.player.board.length, 0); // traded: 3-attack into 2-attack kills the hound too
});

test('element counter: a creature beating the foe last element gains +1/+1', () => {
  const state = newGame(17);
  startGame(state);
  state.rival.lastElement = 'ember'; // Tide beats Ember
  state.player.hand = ['tide-tadpole'];
  state.player.mana = 3;
  assert.equal(playCard(state, 'player', 0), true);
  assert.equal(state.player.board[0].attack, 2);
  assert.equal(state.player.board[0].health, 3);
  assert.equal(state.player.board[0].counter, true);
});

test('spells: Bolt kills a 3-health creature, Mend heals, Insight draws 2', () => {
  const state = newGame(19);
  startGame(state);
  state.rival.board = [{
    uid: 97, cardId: 'ember-imp', owner: 'rival', attack: 2, health: 3,
    maxHealth: 3, keyword: '', element: 'ember', canAttack: false, counter: false,
  }];
  state.player.hand = ['bolt', 'mend', 'insight'];
  state.player.mana = 10;
  state.player.hp = 20;
  assert.equal(playCard(state, 'player', 0, 97), true);
  assert.equal(state.rival.board.length, 0);
  assert.equal(playCard(state, 'player', 0), true); // Mend is now index 0
  assert.equal(state.player.hp, 26);
  const handBefore = state.player.hand.length;
  assert.equal(playCard(state, 'player', 0), true); // Insight
  assert.equal(state.player.hand.length, handBefore + 1); // drew 2, played 1
});

test('fatigue: drawing from an empty deck hurts, growing each time', () => {
  const state = newGame(23);
  startGame(state);
  state.player.deck = [];
  const hp = state.player.hp;
  drawCards(state, 'player', 1);
  assert.equal(state.player.hp, hp - 1);
  drawCards(state, 'player', 1);
  assert.equal(state.player.hp, hp - 3);
});

test('AI determinism: the same state always takes the same turn', () => {
  const run = () => {
    const state = newGame(29);
    startGame(state);
    playTurn(state, 'player');
    return JSON.stringify({
      hp: [state.player.hp, state.rival.hp],
      board: [state.player.board.map((c) => c.cardId), state.rival.board.map((c) => c.cardId)],
      hand: state.player.hand.length, mana: state.player.mana, log: state.log.slice(-3),
    });
  };
  assert.equal(run(), run());
});

test('full AI-vs-AI games always end with a winner inside 80 turns', () => {
  for (const seed of [7, 31, 37, 41, 43]) {
    const state = newGame(seed);
    startGame(state);
    for (let i = 0; i < 80 && !state.winner; i += 1) {
      autopilotTurn(state, state.active, false);
    }
    assert.ok(state.winner, `seed ${seed} produced no winner`);
    assert.ok(state.screen === 'win' || state.screen === 'loss');
  }
});

test('staging reproducibility: the same seed stages the same play frame', () => {
  const stage = (seed) => {
    const state = newGame(seed);
    const out = stageShot('play', state);
    return JSON.stringify({ ...out, turn: state.turn, hp: [state.player.hp, state.rival.hp],
      board: [state.player.board.map((c) => c.cardId), state.rival.board.map((c) => c.cardId)],
      hand: [state.player.hand, state.rival.hand] });
  };
  assert.equal(stage(7), stage(7));
  assert.notEqual(stage(7), stage(8));
});

test('staging: win shot really wins, loss shot really loses, play shot is mid-game', () => {
  const win = newGame(7);
  const winOut = stageShot('win', win);
  assert.equal(winOut.screen, 'win');
  assert.equal(win.winner, 'player');
  assert.ok(win.rival.hp <= 0);

  const loss = newGame(7);
  const lossOut = stageShot('loss', loss);
  assert.equal(lossOut.screen, 'loss');
  assert.equal(loss.winner, 'rival');
  assert.ok(loss.player.hp <= 0);

  const play = newGame(7);
  const playOut = stageShot('play', play);
  assert.equal(playOut.screen, 'play');
  assert.equal(play.turn, 6);
  assert.ok(play.player.board.length + play.rival.board.length >= 2, 'mid-game table has creatures');
  assert.ok(play.player.hand.length >= 2 && play.rival.hand.length >= 2, 'both hands hold cards');
});

test('winner check: reducing the rival to 0 HP ends the game as a win', () => {
  const state = newGame(53);
  startGame(state);
  state.rival.hp = 1;
  state.player.board = [{
    uid: 96, cardId: 'ember-imp', owner: 'player', attack: 2, health: 1,
    maxHealth: 1, keyword: '', element: 'ember', canAttack: true, counter: false,
  }];
  assert.equal(attack(state, 'player', 96, 'hero'), true);
  assert.equal(state.winner, 'player');
  assert.equal(state.screen, 'win');
  checkWinner(state);
});
