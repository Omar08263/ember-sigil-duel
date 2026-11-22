# Ember Sigils — a card duel of four elements

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/Omar08263/ember-sigil-duel/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/Omar08263/ember-sigil-duel/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

Two duelists, four sigils, one table. You are the Sigil Keeper; across the
table sits the Ashen Duelist. Spend mana crystals to play creatures and
spells from your 30-card deck, outwit a rival who reads the table and
counter-plays, and break their sigil — reduce them to 0 HP — before they
break yours.

## Play

Serve `game/` with any static server and open `index.html` in desktop Chrome:

```
node serve.ts
# → http://localhost:8080
```

No build step, no network request, no library: the game is plain
JavaScript modules, DOM cards drawn in code, and sounds synthesized
with WebAudio. Everything it loads is a file under `game/`.

- **Click a hand card** — play it (spells that need a target ask you to pick one)
- **Click one of your creatures, then an enemy creature or the rival hero** — attack
- **1–7** — play the hand card in that slot
- **Enter / Space** — end turn
- **Esc** — back to the title screen
- **M** — mute

## The rules

- **30 HP each, 30-card decks.** Mana grows by 1 each turn, up to 10.
  Drawing from an empty deck deals growing fatigue damage.
- **Creatures** have a cost, attack and health. They attack the turn after
  they arrive — **Swift** ones attack at once, **Guard** ones must be
  attacked first.
- **Spells:** Sigil Bolt (3 damage to any target), Tide Mend (heal 6),
  Gale Insight (draw 2), Thorn Surge (2 damage to every enemy creature).
- **The sigil cycle:** Ember ▲ beats Thorn ◆ beats Gale ● beats Tide ■
  beats Ember. Play a creature whose sigil beats the foe's last played
  sigil and it gains **+1/+1** — the counter is the whole mind game, and
  the rival uses it too.
- **The rival** plays its mana curve, casts spells when they help, trades
  up when it can, and goes for lethal when it sees it. Its intent is
  written in the battle log, so you can read it — and counter it.

## Layout

- `game/index.html` — the page; `game/src/style.css` — the table and cards
- `game/src/config.js` — the card pool, the elements, the numbers
- `game/src/state.js` — the game state and every legal move (pure logic)
- `game/src/ai.js` — the rival's brain and the screenshot autopilot
- `game/src/render.js` — the state turned into DOM
- `game/src/input.js` — mouse and keyboard, translated into moves
- `game/src/audio.js` — every sound, synthesized with WebAudio
- `game/src/shots.js` — the four screenshot scenes, staged by playing the
  real rules forward from a fixed seed
- `game/src/main.js` — the entry point and the game loop
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to
  `/output` and writes `dossier.json`
- `screenshots/` — the four screenshots: title, mid-game table, victory, defeat

## Tests

```
node --test tests/game.test.mjs
```

Twelve tests: deck build, turn flow, Guard, the element counter, spells,
fatigue, AI determinism, full AI-vs-AI games that always end with a winner,
and staging reproducibility (same seed, same frame).

An original game: its own names, art, sounds and rules — no commercial
game was copied.
