// Ember Sigils — the rival's brain.
// One job: decide what the rival does on its turn, and what the autopilot
// does when it steers either side for the screenshots. Every choice is
// deterministic: same state, same move, so a seed always replays the same game.
import { CARD_BY_ID } from './config.js';
import { attack, endTurn, playCard } from './state.js';

/** Value of a creature card in hand: stats per mana, with Guard and Swift worth a little extra. */
export function cardValue(card) {
  if (card.kind) return 0;
  let value = (card.attack + card.health) / Math.max(1, card.cost);
  if (card.keyword === 'guard') value += 0.6;
  if (card.keyword === 'swift') value += 0.6;
  return value;
}

/** The best enemy creature for Sigil Bolt: the biggest threat it can kill outright. */
export function bestBoltTarget(state, side) {
  const foeBoard = state[side === 'player' ? 'rival' : 'player'].board;
  let best = null;
  for (const creature of foeBoard) {
    if (creature.health > 3) continue;
    const threat = creature.attack * 2 + (creature.keyword === 'guard' ? 1 : 0);
    if (best === null || threat > best.threat) best = { uid: creature.uid, threat };
  }
  return best === null ? null : best.uid;
}

/**
 * Play one sensible turn for `side`: spend mana on the best cards first,
 * cast spells only when they help, then attack — lethal first, then the
 * best trades, then straight at the hero. Returns the list of moves made.
 */
export function playTurn(state, side) {
  const moves = [];
  const who = state[side];
  const foe = state[side === 'player' ? 'rival' : 'player'];

  // Spells first when they clearly help.
  for (let i = who.hand.length - 1; i >= 0; i -= 1) {
    const card = CARD_BY_ID[who.hand[i]];
    if (card.kind === 'insight' && who.hand.length <= 5 && who.deck.length > 0) {
      if (playCard(state, side, i)) moves.push(`cast ${card.name}`);
    } else if (card.kind === 'mend' && who.hp <= who.maxHp - 6 && who.mana >= card.cost) {
      if (playCard(state, side, i)) moves.push(`cast ${card.name}`);
    } else if (card.kind === 'surge' && foe.board.length >= 2 && who.mana >= card.cost) {
      if (playCard(state, side, i)) moves.push(`cast ${card.name}`);
    } else if (card.kind === 'bolt' && who.mana >= card.cost) {
      const lethal = foe.hp <= 3;
      const target = lethal ? 'hero' : bestBoltTarget(state, side);
      if (target !== null && playCard(state, side, i, target)) {
        moves.push(`cast ${card.name} at ${target === 'hero' ? 'hero' : 'creature'}`);
      }
    }
    if (state.winner) return moves;
  }

  // Creatures: best value first, while the mana lasts.
  let played = true;
  while (played && !state.winner) {
    played = false;
    let bestIndex = -1;
    let bestValue = 0;
    for (let i = 0; i < who.hand.length; i += 1) {
      const card = CARD_BY_ID[who.hand[i]];
      if (card.kind) continue;
      if (who.mana < card.cost) continue;
      const value = cardValue(card);
      if (value > bestValue) { bestValue = value; bestIndex = i; }
    }
    if (bestIndex >= 0 && playCard(state, side, bestIndex)) {
      moves.push(`play ${CARD_BY_ID[who.hand[bestIndex]] ? 'card' : 'card'}`);
      played = true;
    }
  }
  if (state.winner) return moves;

  // Attacks: lethal first.
  const ready = () => who.board.filter((c) => c.canAttack);
  const foeHp = () => foe.hp;
  let totalReady = ready().reduce((sum, c) => sum + c.attack, 0);
  const guards = foe.board.filter((c) => c.keyword === 'guard');
  if (guards.length === 0 && totalReady >= foeHp()) {
    for (const creature of [...ready()]) {
      if (attack(state, side, creature.uid, 'hero')) moves.push(`attack hero with ${CARD_BY_ID[creature.cardId].name}`);
      if (state.winner) return moves;
    }
    return moves;
  }

  // Then the best trades: kill a creature without dying, Guard first.
  for (const creature of [...ready()]) {
    if (state.winner) return moves;
    let target = null;
    let bestScore = 0;
    for (const enemy of foe.board) {
      if (guards.length > 0 && enemy.keyword !== 'guard') continue;
      if (enemy.health > creature.attack) continue;
      const score = enemy.attack * 2 + enemy.health + (enemy.keyword === 'guard' ? 2 : 0)
        - (creature.health <= enemy.attack ? creature.attack + creature.health : 0);
      if (score > bestScore) { bestScore = score; target = enemy; }
    }
    if (target && bestScore > 0) {
      if (attack(state, side, creature.uid, target.uid)) {
        moves.push(`attack ${CARD_BY_ID[target.cardId].name} with ${CARD_BY_ID[creature.cardId].name}`);
      }
    }
  }

  // Whatever can still attack goes at the hero (unless a Guard blocks the way).
  if (foe.board.filter((c) => c.keyword === 'guard').length === 0) {
    for (const creature of [...ready()]) {
      if (state.winner) return moves;
      if (attack(state, side, creature.uid, 'hero')) {
        moves.push(`attack hero with ${CARD_BY_ID[creature.cardId].name}`);
      }
    }
  }
  return moves;
}

/**
 * The rival's whole turn: play it, then hand back. Used by the game loop
 * and by the screenshot staging when the rival is the one moving.
 */
export function takeRivalTurn(state) {
  const moves = playTurn(state, 'rival');
  if (!state.winner) endTurn(state);
  return moves;
}

/**
 * The autopilot that steers a side in the screenshot staging: it plays the
 * same sensible turn as the rival brain. `passive` plays nothing and never
 * attacks, so the other side wins — that is how the win and loss shots are staged.
 */
export function autopilotTurn(state, side, passive = false) {
  if (passive) {
    endTurn(state);
    return ['pass'];
  }
  const moves = playTurn(state, side);
  if (!state.winner) endTurn(state);
  return moves;
}
