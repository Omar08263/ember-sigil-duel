// Ember Sigils — the renderer.
// One job: turn the game state into DOM. It rebuilds the table on every
// change, so what you see is always exactly what the state holds, and the
// screenshots show the real game. Cards are DOM, not canvas, so their text
// stays crisp when the screenshot shrinks to thumbnail size.
import { CARD_BY_ID, ELEMENTS, keywordLabel } from './config.js';
import { SCREEN_LOSS, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN, gameSummary } from './state.js';

const RIVAL_NAME = 'Rival — the Ashen Duelist';

/** Escape text before it goes into the DOM (all of it is ours, but be safe). */
function esc(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** The element badge: a coloured shape AND a name, never colour alone. */
export function elementBadge(element) {
  const el = ELEMENTS[element];
  return `<span class="element-badge" style="--el:${el.color};--eld:${el.dark}">`
    + `<span class="element-glyph">${el.glyph}</span><span class="element-name">${el.name}</span></span>`;
}

/** Ten mana pips, filled up to `mana` of `maxMana`. */
function manaPips(mana, maxMana) {
  let pips = '';
  for (let i = 0; i < 10; i += 1) {
    pips += `<span class="mana-pip${i < mana ? ' filled' : ''}${i < maxMana ? '' : ' locked'}">◆</span>`;
  }
  return `<span class="mana-pips">${pips}</span>`;
}

/** A face-down card back for the rival's hand. */
function cardBack(index) {
  return `<div class="card card-back" style="--i:${index}"><div class="card-back-sigil">✦</div></div>`;
}

/**
 * One card face: cost gem top-left, name, element badge, art glyph,
 * keyword, effect text, and attack/health pips for creatures.
 * `size` is 'hand' or 'board'; `extra` adds state classes (playable, selected, ...).
 */
export function cardFace(cardId, options = {}) {
  const card = CARD_BY_ID[cardId];
  const size = options.size || 'hand';
  const extra = options.extra || '';
  const attack = options.attack !== undefined ? options.attack : card.attack;
  const health = options.health !== undefined ? options.health : card.health;
  const maxHealth = options.maxHealth !== undefined ? options.maxHealth : card.health;
  const hurt = health < maxHealth ? ' hurt' : '';
  const keyword = keywordLabel(card.keyword || '');
  const stats = card.kind
    ? `<div class="card-spell-tag">SPELL</div>`
    : `<div class="card-stats"><span class="stat-atk" title="Attack">⚔ ${attack}</span>`
      + `<span class="stat-hp${hurt}" title="Health">♥ ${health}</span></div>`;
  const text = card.kind ? card.text : (keyword ? `${keyword} — ${cardText(card)}` : cardText(card));
  return `<div class="card ${size} el-${card.element} ${extra}" data-card="${card.id}">`
    + `<div class="card-cost">${card.cost}</div>`
    + `<div class="card-name">${esc(card.name)}</div>`
    + `<div class="card-art"><span class="card-glyph">${ELEMENTS[card.element].glyph}</span></div>`
    + `<div class="card-element">${elementBadge(card.element)}</div>`
    + `<div class="card-text">${esc(text)}</div>`
    + stats
    + (options.counter ? '<div class="card-counter">COUNTER +1/+1</div>' : '')
    + '</div>';
}

/** The one-line ability text a creature card shows. */
function cardText(card) {
  if (card.keyword === 'guard') return 'Must be attacked first.';
  if (card.keyword === 'swift') return 'Can attack at once.';
  return 'A loyal sigil creature.';
}

/** A board creature: the same face, smaller, with its live stats and its uid for clicks. */
function boardCard(creature, view) {
  const selectable = view.attackerUid === creature.uid ? ' selected' : '';
  const canAttack = creature.canAttack && view.state.active === creature.owner && view.state.screen === SCREEN_PLAY
    ? ' can-attack' : '';
  const targetable = view.targeting && creature.owner !== view.state.active ? ' targetable' : '';
  return `<div class="board-slot" data-uid="${creature.uid}">`
    + cardFace(creature.cardId, {
      size: 'board', extra: selectable + canAttack + targetable,
      attack: creature.attack, health: creature.health, maxHealth: creature.maxHealth,
      counter: creature.counter,
    })
    + '</div>';
}

/** The hero bar for one side: name, big HP total, mana pips, deck count. */
function heroBar(who, view) {
  const active = view.state.active === (who.isRival ? 'rival' : 'player');
  return `<div class="hero-bar${active ? ' active-turn' : ''}">`
    + `<div class="hero-portrait ${who.isRival ? 'rival' : 'you'}">${who.isRival ? 'R' : 'Y'}</div>`
    + `<div class="hero-name">${who.isRival ? RIVAL_NAME : 'You — the Sigil Keeper'}</div>`
    + `<div class="hero-hp"><span class="hp-heart">♥</span><span class="hp-number">${Math.max(0, who.hp)}</span>`
    + `<span class="hp-max">/ ${who.maxHp} HP</span></div>`
    + `<div class="hero-mana">${manaPips(who.mana, who.maxMana)}<span class="mana-text">${who.mana}/${who.maxMana} mana</span></div>`
    + `<div class="hero-deck">Deck: ${who.deck.length} cards</div>`
    + '</div>';
}

/** The right sidebar: turn controls, the element cycle, and the game log. */
function sidebar(state, view) {
  const turnLabel = state.winner ? 'Game over' : (state.active === 'player' ? 'Your turn' : 'Rival thinking…');
  return `<aside class="sidebar">`
    + `<div class="turn-box"><div class="turn-label">${turnLabel}</div>`
    + `<div class="turn-number">Turn ${state.turn}</div>`
    + `<button class="end-turn" id="end-turn" ${state.active === 'player' && state.screen === SCREEN_PLAY ? '' : 'disabled'}>End Turn ⏎</button>`
    + `<button class="mute-btn" id="mute-btn">${view.muted ? 'Sound: off' : 'Sound: on'}</button></div>`
    + `<div class="cycle-box"><div class="cycle-title">Sigil cycle — counter for +1/+1</div>`
    + `<div class="cycle-row"><span class="cycle-item el-ember">▲ Ember</span><span class="cycle-arrow">›</span>`
    + `<span class="cycle-item el-thorn">◆ Thorn</span><span class="cycle-arrow">›</span>`
    + `<span class="cycle-item el-gale">● Gale</span><span class="cycle-arrow">›</span>`
    + `<span class="cycle-item el-tide">■ Tide</span><span class="cycle-arrow">›</span>`
    + `<span class="cycle-item el-ember">▲ Ember</span></div>`
    + `<div class="cycle-note">Play a creature whose sigil beats the foe's last played sigil to gain +1/+1.</div></div>`
    + `<div class="log-box"><div class="log-title">Battle log</div>`
    + `<div class="log-lines">${state.log.slice(-14).map((line) => `<div class="log-line">${esc(line)}</div>`).join('')}</div></div>`
    + '</aside>';
}

/** The title screen: the game's name, what it is, how to play, and Start. */
function titleScreen() {
  return `<div class="overlay title-screen"><div class="title-panel">`
    + '<div class="title-kicker">A DUEL OF SIGILS</div>'
    + '<h1 class="game-title">EMBER<br>SIGILS</h1>'
    + '<p class="title-sub">A card duel of four elements. Outwit the Ashen Duelist, break their sigil, and take the table.</p>'
    + '<div class="how-to"><div class="how-title">HOW TO PLAY</div>'
    + '<div class="how-line"><b>1.</b> Play cards with mana — crystals grow by 1 each turn, up to 10.</div>'
    + '<div class="how-line"><b>2.</b> Creatures attack the turn after they arrive — <b>Swift</b> ones attack at once, <b>Guard</b> ones must be attacked first.</div>'
    + '<div class="how-line"><b>3.</b> Counter the foe\'s last sigil in the cycle ▲›◆›●›■›▲ for +1/+1. Reduce the rival to 0 HP to win.</div>'
    + '<div class="how-line"><b>Keys:</b> 1–7 play hand cards · Enter ends the turn · Esc returns here · M mutes.</div></div>'
    + '<button class="start-btn" id="start-btn">START DUEL</button>'
    + '<div class="title-foot">30 HP each · 30-card decks · original game, art and sounds</div>'
    + '</div></div>';
}

/** The win / loss screen: a banner, the game's numbers, and Play Again. */
function endScreen(state) {
  const won = state.screen === SCREEN_WIN;
  const summary = gameSummary(state);
  return `<div class="overlay end-screen"><div class="end-panel ${won ? 'win' : 'loss'}">`
    + `<div class="end-banner">${won ? '★ VICTORY ★' : 'DEFEAT'}</div>`
    + `<div class="end-sub">${won ? 'The rival sigil shatters. The table is yours.' : 'Your sigil fades. The Duelist keeps the table — for now.'}</div>`
    + '<div class="end-stats">'
    + `<div class="end-stat"><span class="end-stat-num">${summary.turns}</span><span class="end-stat-label">turns</span></div>`
    + `<div class="end-stat"><span class="end-stat-num">${summary.damageDealt}</span><span class="end-stat-label">damage dealt</span></div>`
    + `<div class="end-stat"><span class="end-stat-num">${summary.cardsPlayed}</span><span class="end-stat-label">cards played</span></div>`
    + `<div class="end-stat"><span class="end-stat-num">${summary.creaturesSummoned}</span><span class="end-stat-label">creatures summoned</span></div>`
    + `<div class="end-stat"><span class="end-stat-num">${summary.yourHp} – ${summary.rivalHp}</span><span class="end-stat-label">final HP (you – rival)</span></div>`
    + '</div>'
    + '<button class="start-btn" id="again-btn">PLAY AGAIN</button>'
    + '</div></div>';
}

/**
 * Render the whole table into #app.
 * `view` carries the interaction state: selected hand index, selected attacker uid,
 * targeting mode ('attack' | 'bolt' | null), mute state, and the state itself.
 */
export function renderGame(state, view) {
  const app = document.getElementById('app');
  const targetingHint = view.targeting === 'bolt'
    ? 'Choose a target for Sigil Bolt — click an enemy creature or the rival hero.'
    : view.targeting === 'attack'
      ? 'Choose a target — click an enemy creature or the rival hero.'
      : '';
  let html = '<div class="table">';
  html += '<div class="table-main">';
  html += heroBar(state.rival, view);
  html += '<div class="rival-hand">' + state.rival.hand.map((_, i) => cardBack(i)).join('') + '</div>';
  html += '<div class="board-row rival-board">' + state.rival.board.map((c) => boardCard(c, view)).join('') + '</div>';
  html += `<div class="table-mid"><span class="mid-label">${targetingHint || '— THE TABLE —'}</span></div>`;
  html += '<div class="board-row player-board">' + state.player.board.map((c) => boardCard(c, view)).join('') + '</div>';
  html += heroBar(state.player, view);
  html += `<div class="player-hand${state.player.hand.length > 6 ? ' hand-crowded' : ''}">`;
  state.player.hand.forEach((cardId, i) => {
    const card = CARD_BY_ID[cardId];
    const playable = state.active === 'player' && state.screen === SCREEN_PLAY && state.player.mana >= card.cost;
    const selected = view.selectedHand === i ? ' selected' : '';
    const extra = (playable ? ' playable' : ' unplayable') + selected;
    html += `<div class="hand-slot" data-hand="${i}">` + cardFace(cardId, { size: 'hand', extra }) + '</div>';
  });
  html += '</div>';
  html += '</div>';
  html += sidebar(state, view);
  html += '</div>';
  if (state.screen === SCREEN_TITLE) html += titleScreen();
  if (state.screen === SCREEN_WIN || state.screen === SCREEN_LOSS) html += endScreen(state);
  app.innerHTML = html;
}
