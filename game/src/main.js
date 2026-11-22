// Ember Sigils — the entry point.
// One job: own the interaction state (what is selected, what is being
// targeted), call the rules, and re-render. With ?shot=title|play|win|loss
// it stages that scene deterministically instead of starting an interactive
// game, and reports the staged state on window.__shotState for the driver.
import { takeRivalTurn } from './ai.js';
import { soundAttack, soundFall, soundLoss, soundPlayCard, soundSpell, soundTurn, soundWin, toggleMute } from './audio.js';
import { bindInput } from './input.js';
import { renderGame } from './render.js';
import { stageShot, stagedGame } from './shots.js';
import {
  SCREEN_LOSS, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN,
  attack, canPlayCard, endTurn, newGame, playCard, startGame,
} from './state.js';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || 7) || 7;

let state = newGame(seed);
let view = { state, selectedHand: null, attackerUid: null, targeting: null, muted: false };
let rivalTimer = null;

function clearSelection() {
  view.selectedHand = null;
  view.attackerUid = null;
  view.targeting = null;
}

/** Re-render and, when the game just ended, play the end sound. */
function refresh() {
  const wasScreen = state.screen;
  view.state = state;
  renderGame(state, view);
  if (wasScreen === SCREEN_WIN) soundWin();
  if (wasScreen === SCREEN_LOSS) soundLoss();
}

/** The rival takes its turn after a short beat, so the player sees it happen. */
function scheduleRivalTurn() {
  if (rivalTimer !== null) clearTimeout(rivalTimer);
  rivalTimer = setTimeout(() => {
    rivalTimer = null;
    if (state.screen !== SCREEN_PLAY || state.active !== 'rival' || state.winner) return;
    const before = state.log.length;
    takeRivalTurn(state);
    if (state.log.length > before) soundTurn();
    clearSelection();
    refresh();
  }, 900);
}

/** Play the hand card at `index`: a creature lands, a spell may need a target. */
function playHandCard(index) {
  if (state.screen !== SCREEN_PLAY || state.active !== 'player') return;
  if (index < 0 || index >= state.player.hand.length) return;
  const card = state.player.hand[index];
  if (!canPlayCard(state, 'player', index)) return;
  if (card === 'bolt') {
    view.selectedHand = index;
    view.targeting = 'bolt';
    refresh();
    return;
  }
  const wasBoard = state.player.board.length;
  if (playCard(state, 'player', index)) {
    if (state.player.board.length > wasBoard) soundPlayCard();
    else soundSpell();
    clearSelection();
    refresh();
  }
}

/** Attack with the selected creature, or select it first. */
function attackWith(uid) {
  if (view.attackerUid === uid) { clearSelection(); refresh(); return; }
  view.attackerUid = uid;
  view.targeting = 'attack';
  view.selectedHand = null;
  refresh();
}

/** Resolve the pending target choice: a creature uid or 'hero'. */
function chooseTarget(targetUid) {
  if (view.targeting === 'bolt' && view.selectedHand !== null) {
    const index = view.selectedHand;
    if (playCard(state, 'player', index, targetUid)) soundSpell();
    clearSelection();
    refresh();
    return;
  }
  if (view.targeting === 'attack' && view.attackerUid !== null) {
    const uid = view.attackerUid;
    const beforeRivalBoard = state.rival.board.length;
    const beforePlayerBoard = state.player.board.length;
    if (attack(state, 'player', uid, targetUid)) {
      soundAttack();
      if (state.rival.board.length < beforeRivalBoard || state.player.board.length < beforePlayerBoard) soundFall();
    }
    clearSelection();
    refresh();
  }
}

function onEndTurn() {
  if (state.screen !== SCREEN_PLAY || state.active !== 'player' || state.winner) return;
  clearSelection();
  soundTurn();
  endTurn(state);
  refresh();
  if (state.active === 'rival' && !state.winner) scheduleRivalTurn();
}

function onStart() {
  if (state.screen === SCREEN_TITLE) {
    startGame(state);
    refresh();
  } else if (state.screen === SCREEN_WIN || state.screen === SCREEN_LOSS) {
    onAgain();
  }
}

function onAgain() {
  state = newGame(seed);
  view = { state, selectedHand: null, attackerUid: null, targeting: null, muted: view.muted };
  clearSelection();
  refresh();
}

function onEscape() {
  if (state.screen === SCREEN_PLAY) {
    state.screen = SCREEN_TITLE;
    clearSelection();
    refresh();
  }
}

bindInput({
  onStart,
  onAgain,
  onEndTurn,
  onMute: () => { view.muted = toggleMute(); refresh(); },
  onHandClick: (index) => {
    if (view.targeting === 'bolt') { clearSelection(); refresh(); return; }
    if (view.attackerUid !== null) { clearSelection(); refresh(); return; }
    playHandCard(index);
  },
  onBoardClick: (uid) => {
    const creature = state.player.board.find((c) => c.uid === uid);
    if (creature && state.active === 'player') { attackWith(uid); return; }
    if (view.targeting) chooseTarget(uid);
  },
  onRivalHeroClick: () => {
    if (view.targeting) chooseTarget('hero');
  },
  onStartVisible: () => state.screen === SCREEN_TITLE || state.screen === SCREEN_WIN || state.screen === SCREEN_LOSS,
  onEscape,
});

if (shotName) {
  // Staged mode: play the real rules forward to the named scene and freeze it.
  state = stagedGame(seed);
  stageShot(shotName, state);
  view.state = state;
  renderGame(state, view);
  window.__shotState = {
    shot: shotName,
    seed,
    screen: state.screen,
    turn: state.turn,
    playerHp: state.player.hp,
    rivalHp: state.rival.hp,
    playerHand: state.player.hand.length,
    rivalHand: state.rival.hand.length,
    playerBoard: state.player.board.map((c) => c.cardId),
    rivalBoard: state.rival.board.map((c) => c.cardId),
    playerMana: state.player.mana,
    log: state.log.slice(-4),
  };
} else {
  renderGame(state, view);
}
