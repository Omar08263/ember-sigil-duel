// Ember Sigils — the screenshot scenes behind ?shot=title|play|win|loss.
// Each one plays the real rules forward from a fresh game with a fixed seed,
// steered by the same autopilot the rival uses, so the frame is what a real
// game really looks like and the same seed always gives the same frame.
// title: a fresh table under the title screen.
// play: both sides play sensibly until turn 6 — a full mid-game table.
// win: the player plays sensibly, the rival passes every turn — a real win.
// loss: the rival plays sensibly, the player passes every turn — a real loss.
import { autopilotTurn } from './ai.js';
import { SCREEN_LOSS, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN, newGame, startGame } from './state.js';

const PLAY_UNTIL_TURN = 6;
const MAX_TURNS = 80;

/** Play turns forward until `stop(state)` is true or the turn cap hits. */
function playForward(state, stop, playerPassive, rivalPassive) {
  for (let i = 0; i < MAX_TURNS && !state.winner && !stop(state); i += 1) {
    if (state.active === 'player') autopilotTurn(state, 'player', playerPassive);
    else autopilotTurn(state, 'rival', rivalPassive);
  }
}

/**
 * Set `state` to the named scene and return the screen to show.
 * Any other name is the title scene.
 */
export function stageShot(name, state) {
  if (name === 'play') {
    startGame(state);
    playForward(state, (s) => s.turn >= PLAY_UNTIL_TURN && s.active === 'player', false, false);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'win') {
    startGame(state);
    playForward(state, () => false, false, true);
    return { screen: state.winner === 'player' ? SCREEN_WIN : SCREEN_PLAY };
  }
  if (name === 'loss') {
    startGame(state);
    playForward(state, () => false, true, false);
    return { screen: state.winner === 'rival' ? SCREEN_LOSS : SCREEN_PLAY };
  }
  return { screen: SCREEN_TITLE };
}

/** A fresh game for staging, always from the same seed unless told otherwise. */
export function stagedGame(seed = 7) {
  return newGame(seed);
}
