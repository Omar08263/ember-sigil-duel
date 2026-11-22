// Ember Sigils — the input.
// One job: listen to mouse and keyboard and call the handlers main.js gives it.
// It knows nothing about the rules; it only translates a click or a key into
// "the player did this". Keys: 1–7 play hand cards, Enter/Space ends the turn,
// Esc goes back to the title, M toggles sound.
export function bindInput(handlers) {
  const app = document.getElementById('app');

  app.addEventListener('click', (event) => {
    const start = event.target.closest('#start-btn');
    if (start) { handlers.onStart(); return; }
    const again = event.target.closest('#again-btn');
    if (again) { handlers.onAgain(); return; }
    const endTurn = event.target.closest('#end-turn');
    if (endTurn) { handlers.onEndTurn(); return; }
    const mute = event.target.closest('#mute-btn');
    if (mute) { handlers.onMute(); return; }
    const handSlot = event.target.closest('.hand-slot');
    if (handSlot) { handlers.onHandClick(Number(handSlot.dataset.hand)); return; }
    const boardSlot = event.target.closest('.board-slot');
    if (boardSlot) { handlers.onBoardClick(Number(boardSlot.dataset.uid)); return; }
    const rivalHero = event.target.closest('.hero-bar');
    if (rivalHero && rivalHero.querySelector('.hero-portrait.rival')) {
      handlers.onRivalHeroClick();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key >= '1' && event.key <= '7') {
      handlers.onHandClick(Number(event.key) - 1);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (handlers.onStartVisible()) { handlers.onStart(); return; }
      handlers.onEndTurn();
      return;
    }
    if (event.key === 'Escape') { handlers.onEscape(); return; }
    if (event.key === 'm' || event.key === 'M') { handlers.onMute(); }
  });
}
