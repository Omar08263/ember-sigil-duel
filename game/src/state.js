// Ember Sigils — the game state and the rules.
// One job: hold the whole game in plain data and apply every legal move.
// No DOM here, no randomness except the seeded rng, so Node tests and the
// screenshot staging can play the real rules forward exactly.
import {
  buildDeck, CARD_BY_ID, DECK_SIZE, elementBeats, ELEMENTS, FATIGUE_STEP,
  HAND_LIMIT, makeRng, MAX_MANA, STARTING_HAND, STARTING_HP,
} from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WIN = 'win';
export const SCREEN_LOSS = 'loss';

let nextCreatureId = 1;

/** A creature on the board: a played card with live attack/health and its turn flags. */
export function makeCreature(cardId, owner, counterBonus) {
  const card = CARD_BY_ID[cardId];
  return {
    uid: nextCreatureId,
    cardId,
    owner,
    attack: card.attack + (counterBonus ? 1 : 0),
    health: card.health + (counterBonus ? 1 : 0),
    maxHealth: card.health + (counterBonus ? 1 : 0),
    keyword: card.keyword,
    element: card.element,
    canAttack: card.keyword === 'swift',
    counter: counterBonus,
  };
}

/** One side of the duel: hero, mana, deck, hand, board, and the running totals. */
export function makePlayer(name, isRival, deck) {
  return {
    name, isRival, hp: STARTING_HP, maxHp: STARTING_HP,
    mana: 0, maxMana: 0, deck, hand: [], board: [],
    fatigue: 0, lastElement: null,
    damageDealt: 0, cardsPlayed: 0, creaturesSummoned: 0,
  };
}

/** A fresh game. `seed` drives both decks and every draw, so the same seed replays the same game. */
export function newGame(seed = 7) {
  nextCreatureId = 1;
  const rng = makeRng(seed);
  const player = makePlayer('You', false, buildDeck(rng));
  const rival = makePlayer('Rival', true, buildDeck(rng));
  const state = {
    seed, rng, turn: 1, active: 'player', screen: SCREEN_TITLE,
    player, rival, winner: null, turnsPlayed: 0,
    log: ['Welcome to Ember Sigils. Press Enter or click Start Duel.'],
  };
  return state;
}

/** The other side of `side` ('player' | 'rival'). */
export function otherSide(side) {
  return side === 'player' ? 'rival' : 'player';
}

/** Append a line to the game log (newest last, capped at 60 lines). */
export function addLog(state, text) {
  state.log.push(text);
  if (state.log.length > 60) state.log.splice(0, state.log.length - 60);
}

/** Draw `count` cards for `side`; an empty deck deals growing fatigue damage instead. */
export function drawCards(state, side, count) {
  const who = state[side];
  for (let i = 0; i < count; i += 1) {
    if (who.deck.length === 0) {
      who.fatigue += FATIGUE_STEP;
      who.hp -= who.fatigue;
      addLog(state, `${who.name} takes ${who.fatigue} fatigue damage (empty deck).`);
      checkWinner(state);
      if (state.winner) return;
      continue;
    }
    if (who.hand.length >= HAND_LIMIT) {
      who.deck.shift();
      addLog(state, `${who.name}'s hand is full — a card burns away.`);
      continue;
    }
    who.hand.push(who.deck.shift());
  }
}

/** Begin the game: both sides draw their opening hands and the player takes turn 1. */
export function startGame(state) {
  state.screen = SCREEN_PLAY;
  drawCards(state, 'player', STARTING_HAND);
  drawCards(state, 'rival', STARTING_HAND);
  beginTurn(state, 'player');
  addLog(state, 'Turn 1 — your move. Play a card, then attack.');
}

/** Give `side` its mana for the new turn, ready its creatures and draw a card. */
export function beginTurn(state, side) {
  const who = state[side];
  state.active = side;
  who.maxMana = Math.min(MAX_MANA, state.turn);
  who.mana = who.maxMana;
  for (const creature of who.board) creature.canAttack = true;
  drawCards(state, side, 1);
  if (state.winner) return;
  addLog(state, `Turn ${state.turn} — ${who.name} draws a card (${who.mana} mana).`);
}

/** End the current turn and hand over to the other side. */
export function endTurn(state) {
  if (state.screen !== SCREEN_PLAY || state.winner) return false;
  const next = otherSide(state.active);
  if (next === 'player') state.turn += 1;
  beginTurn(state, next);
  return true;
}

/** The element-counter bonus: a creature gains +1/+1 when its element beats the foe's last played element. */
export function counterBonusFor(state, side, element) {
  const foe = state[otherSide(side)];
  return foe.lastElement !== null && elementBeats(element, foe.lastElement);
}

/**
 * Play the hand card at `handIndex` for `side`.
 * Creatures land on the board; spells resolve at once. `targetUid` (or 'hero')
 * is the chosen target for Sigil Bolt. Returns true when the card was played.
 */
export function playCard(state, side, handIndex, targetUid = null) {
  const who = state[side];
  const foe = state[otherSide(side)];
  if (state.screen !== SCREEN_PLAY || state.active !== side || state.winner) return false;
  if (handIndex < 0 || handIndex >= who.hand.length) return false;
  const cardId = who.hand[handIndex];
  const card = CARD_BY_ID[cardId];
  if (who.mana < card.cost) return false;

  if (card.kind === 'bolt' && targetUid === null) return false;
  if (card.kind === 'bolt' && targetUid !== 'hero') {
    const target = foe.board.find((c) => c.uid === targetUid);
    if (!target) return false;
  }

  who.hand.splice(handIndex, 1);
  who.mana -= card.cost;
  who.cardsPlayed += 1;
  who.lastElement = card.element;

  if (!card.kind) {
    const bonus = counterBonusFor(state, side, card.element);
    const creature = makeCreature(cardId, side, bonus);
    nextCreatureId += 1;
    who.board.push(creature);
    who.creaturesSummoned += 1;
    addLog(state, `${who.name} plays ${card.name} (${card.attack + (bonus ? 1 : 0)}/${card.health + (bonus ? 1 : 0)})${bonus ? ' — COUNTER! +1/+1' : ''}.`);
    return true;
  }

  if (card.kind === 'bolt') {
    if (targetUid === 'hero') {
      foe.hp -= 3;
      who.damageDealt += 3;
      addLog(state, `${who.name} casts Sigil Bolt at ${foe.name} for 3 damage.`);
    } else {
      const target = foe.board.find((c) => c.uid === targetUid);
      target.health -= 3;
      who.damageDealt += 3;
      addLog(state, `${who.name} casts Sigil Bolt at ${CARD_BY_ID[target.cardId].name} for 3 damage.`);
      removeDead(state, otherSide(side));
    }
  } else if (card.kind === 'mend') {
    const healed = Math.min(6, who.maxHp - who.hp);
    who.hp += healed;
    addLog(state, `${who.name} casts Tide Mend and heals ${healed}.`);
  } else if (card.kind === 'insight') {
    addLog(state, `${who.name} casts Gale Insight and draws 2 cards.`);
    drawCards(state, side, 2);
  } else if (card.kind === 'surge') {
    addLog(state, `${who.name} casts Thorn Surge — 2 damage to every enemy creature.`);
    for (const creature of foe.board) {
      creature.health -= 2;
      who.damageDealt += 2;
    }
    removeDead(state, otherSide(side));
  }
  checkWinner(state);
  return true;
}

/** Remove creatures at 0 health from `side`'s board, logging each fall. */
export function removeDead(state, side) {
  const who = state[side];
  const fallen = who.board.filter((c) => c.health <= 0);
  if (fallen.length === 0) return;
  who.board = who.board.filter((c) => c.health > 0);
  for (const creature of fallen) {
    addLog(state, `${CARD_BY_ID[creature.cardId].name} falls.`);
  }
}

/**
 * A board creature attacks: `targetUid` is an enemy creature's uid, or 'hero'.
 * Guard creatures must be attacked first. Both creatures trade damage.
 * Returns true when the attack happened.
 */
export function attack(state, side, attackerUid, targetUid) {
  const who = state[side];
  const foe = state[otherSide(side)];
  if (state.screen !== SCREEN_PLAY || state.active !== side || state.winner) return false;
  const attacker = who.board.find((c) => c.uid === attackerUid);
  if (!attacker || !attacker.canAttack) return false;

  if (targetUid !== 'hero') {
    const guards = foe.board.filter((c) => c.keyword === 'guard');
    const target = foe.board.find((c) => c.uid === targetUid);
    if (!target) return false;
    if (guards.length > 0 && target.keyword !== 'guard') return false;
    target.health -= attacker.attack;
    attacker.health -= target.attack;
    who.damageDealt += attacker.attack;
    addLog(state, `${who.name}'s ${CARD_BY_ID[attacker.cardId].name} strikes ${CARD_BY_ID[target.cardId].name} for ${attacker.attack}.`);
    attacker.canAttack = false;
    removeDead(state, otherSide(side));
    removeDead(state, side);
  } else {
    const guards = foe.board.filter((c) => c.keyword === 'guard');
    if (guards.length > 0) return false;
    foe.hp -= attacker.attack;
    who.damageDealt += attacker.attack;
    addLog(state, `${who.name}'s ${CARD_BY_ID[attacker.cardId].name} hits ${foe.name} for ${attacker.attack}.`);
    attacker.canAttack = false;
  }
  checkWinner(state);
  return true;
}

/** Set the winner and the end screen when either hero falls. */
export function checkWinner(state) {
  if (state.winner) return;
  if (state.rival.hp <= 0) {
    state.winner = 'player';
    state.screen = SCREEN_WIN;
    state.turnsPlayed = state.turn;
    addLog(state, 'Victory! The rival sigil shatters.');
  } else if (state.player.hp <= 0) {
    state.winner = 'rival';
    state.screen = SCREEN_LOSS;
    state.turnsPlayed = state.turn;
    addLog(state, 'Defeat. Your sigil fades.');
  }
}

/** A short, plain-English summary of the game for the end screens. */
export function gameSummary(state) {
  const you = state.player;
  const foe = state.rival;
  return {
    turns: state.turnsPlayed || state.turn,
    yourHp: Math.max(0, you.hp),
    rivalHp: Math.max(0, foe.hp),
    damageDealt: you.damageDealt,
    cardsPlayed: you.cardsPlayed,
    creaturesSummoned: you.creaturesSummoned,
    cardsLeft: you.deck.length,
  };
}

/** True when the hand card at `handIndex` can legally be played right now. */
export function canPlayCard(state, side, handIndex) {
  const who = state[side];
  if (state.screen !== SCREEN_PLAY || state.active !== side) return false;
  if (handIndex < 0 || handIndex >= who.hand.length) return false;
  return who.mana >= CARD_BY_ID[who.hand[handIndex]].cost;
}
