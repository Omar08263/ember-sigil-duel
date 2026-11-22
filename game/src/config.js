// Ember Sigils — the card pool and the rules constants.
// One job: name every card, every element and every number the game uses.
// Nothing here touches the DOM or the game state; state.js reads this.
export const ELEMENTS = {
  ember: { name: 'Ember', glyph: '▲', color: '#ff7a1a', dark: '#c2410c', beats: 'thorn' },
  thorn: { name: 'Thorn', glyph: '◆', color: '#4ade80', dark: '#15803d', beats: 'gale' },
  gale: { name: 'Gale', glyph: '●', color: '#38bdf8', dark: '#0369a1', beats: 'tide' },
  tide: { name: 'Tide', glyph: '■', color: '#818cf8', dark: '#4338ca', beats: 'ember' },
};

/** The strength cycle: Ember beats Thorn, Thorn beats Gale, Gale beats Tide, Tide beats Ember. */
export const ELEMENT_ORDER = ['ember', 'thorn', 'gale', 'tide'];

export const STARTING_HP = 30;
export const MAX_MANA = 10;
export const HAND_LIMIT = 10;
export const DECK_SIZE = 30;
export const STARTING_HAND = 3;
export const FATIGUE_STEP = 1;

/**
 * A creature card: id, name, element, cost, attack, health, keyword.
 * keyword: 'guard' (must be attacked first), 'swift' (attacks the turn it is played), '' (none).
 */
export const CREATURES = [
  { id: 'ember-imp', name: 'Ember Imp', element: 'ember', cost: 1, attack: 2, health: 1, keyword: '' },
  { id: 'cinder-pup', name: 'Cinder Pup', element: 'ember', cost: 1, attack: 1, health: 2, keyword: '' },
  { id: 'thorn-sprout', name: 'Thorn Sprout', element: 'thorn', cost: 1, attack: 1, health: 3, keyword: '' },
  { id: 'gale-wisp', name: 'Gale Wisp', element: 'gale', cost: 1, attack: 2, health: 1, keyword: 'swift' },
  { id: 'tide-tadpole', name: 'Tide Tadpole', element: 'tide', cost: 1, attack: 1, health: 2, keyword: '' },
  { id: 'flame-hound', name: 'Flame Hound', element: 'ember', cost: 2, attack: 3, health: 2, keyword: '' },
  { id: 'bramble-wolf', name: 'Bramble Wolf', element: 'thorn', cost: 2, attack: 2, health: 3, keyword: 'guard' },
  { id: 'storm-gull', name: 'Storm Gull', element: 'gale', cost: 2, attack: 3, health: 1, keyword: 'swift' },
  { id: 'coral-crab', name: 'Coral Crab', element: 'tide', cost: 2, attack: 2, health: 4, keyword: 'guard' },
  { id: 'ash-golem', name: 'Ash Golem', element: 'ember', cost: 3, attack: 4, health: 3, keyword: '' },
  { id: 'vine-treant', name: 'Vine Treant', element: 'thorn', cost: 3, attack: 3, health: 5, keyword: 'guard' },
  { id: 'sky-serpent', name: 'Sky Serpent', element: 'gale', cost: 3, attack: 4, health: 2, keyword: 'swift' },
  { id: 'wave-serpent', name: 'Wave Serpent', element: 'tide', cost: 3, attack: 3, health: 4, keyword: '' },
  { id: 'ember-phoenix', name: 'Ember Phoenix', element: 'ember', cost: 4, attack: 5, health: 4, keyword: 'swift' },
  { id: 'thorn-colossus', name: 'Thorn Colossus', element: 'thorn', cost: 4, attack: 4, health: 6, keyword: 'guard' },
  { id: 'tempest-roc', name: 'Tempest Roc', element: 'gale', cost: 4, attack: 6, health: 3, keyword: 'swift' },
  { id: 'tide-kraken', name: 'Tide Kraken', element: 'tide', cost: 5, attack: 6, health: 6, keyword: '' },
  { id: 'inferno-dragon', name: 'Inferno Dragon', element: 'ember', cost: 6, attack: 7, health: 5, keyword: '' },
  { id: 'worldroot-ancient', name: 'Worldroot Ancient', element: 'thorn', cost: 6, attack: 5, health: 8, keyword: 'guard' },
  { id: 'storm-titan', name: 'Storm Titan', element: 'gale', cost: 6, attack: 8, health: 4, keyword: 'swift' },
];

/**
 * A spell card: id, name, element, cost and what it does.
 * bolt: 3 damage to a chosen enemy creature or the rival hero.
 * mend: heal your hero 6. insight: draw 2 cards. surge: 2 damage to every enemy creature.
 */
export const SPELLS = [
  { id: 'bolt', name: 'Sigil Bolt', element: 'ember', cost: 2, kind: 'bolt', text: 'Deal 3 damage to any target.' },
  { id: 'mend', name: 'Tide Mend', element: 'tide', cost: 2, kind: 'mend', text: 'Heal your hero for 6.' },
  { id: 'insight', name: 'Gale Insight', element: 'gale', cost: 2, kind: 'insight', text: 'Draw 2 cards.' },
  { id: 'surge', name: 'Thorn Surge', element: 'thorn', cost: 3, kind: 'surge', text: 'Deal 2 damage to every enemy creature.' },
];

export const CARD_BY_ID = {};
for (const card of [...CREATURES, ...SPELLS]) CARD_BY_ID[card.id] = card;

/** How many copies of each card make one 30-card deck. */
export const DECK_LIST = [
  ['ember-imp', 2], ['cinder-pup', 2], ['thorn-sprout', 2], ['gale-wisp', 2],
  ['bramble-wolf', 2], ['flame-hound', 2], ['coral-crab', 2], ['ash-golem', 2],
  ['sky-serpent', 2], ['vine-treant', 2],
  ['ember-phoenix', 1], ['thorn-colossus', 1], ['tide-kraken', 1], ['inferno-dragon', 1],
  ['bolt', 2], ['mend', 2], ['insight', 1], ['surge', 1],
];

/** Seeded random generator (mulberry32) so a seed always builds the same deck and the same game. */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function nextRandom() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fresh 30-card deck, shuffled with the given seeded rng. */
export function buildDeck(rng) {
  const deck = [];
  for (const [id, copies] of DECK_LIST) {
    for (let i = 0; i < copies; i += 1) deck.push(id);
  }
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/** True when element `a` beats element `b` in the cycle. */
export function elementBeats(a, b) {
  return ELEMENTS[a].beats === b;
}

/** Human-readable keyword label, or '' when the card has none. */
export function keywordLabel(keyword) {
  if (keyword === 'guard') return 'GUARD';
  if (keyword === 'swift') return 'SWIFT';
  return '';
}
