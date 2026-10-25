// Flow and state for the Story Forge. Nothing here is stored or sent anywhere:
// state lives in memory and is gone on refresh.

import { loadContent, ContentError } from './content.js';
import { draw } from './random.js';
import * as ui from './render.js';

const CONTENT_URL = 'content/pools.json';
const TILES_PER_STEP = 4;
const DEV = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);

const root = document.getElementById('app');

let categories = [];
let run = null;

function newRun(mode) {
  return {
    mode, // 'open' | 'blind', fixed for the whole run
    stepIndex: 0,
    tiles: [],
    selectedIndex: null, // open mode: highlighted but not yet confirmed
    picked: false, // a choice has been locked in on this step
    revealed: false, // blind mode: the flip animation has finished
    rerollUsed: false,
    choices: [], // [{ category, option }] in step order
  };
}

const currentCategory = () => categories[run.stepIndex];

function showIntro(options) {
  run = null;
  ui.renderIntro(root, { categories }, { start: startRun }, options);
}

function startRun(mode) {
  run = newRun(mode);
  dealStep();
}

function dealStep() {
  run.tiles = draw(currentCategory().options, TILES_PER_STEP);
  run.selectedIndex = null;
  run.picked = false;
  run.revealed = false;
  showStep();
}

function showStep(options) {
  ui.renderStep(
    root,
    {
      mode: run.mode,
      category: currentCategory(),
      stepNumber: run.stepIndex + 1,
      totalSteps: categories.length,
      tiles: run.tiles,
      rerollAvailable: !run.rerollUsed,
    },
    { select, confirm, pick, next, reroll },
    options,
  );
}

function lockIn(index) {
  run.picked = true;
  run.choices.push({ category: currentCategory(), option: run.tiles[index] });
}

function select(index) {
  if (run.mode !== 'open' || run.picked) return;
  run.selectedIndex = index;
  ui.markSelected(root, index);
}

function confirm() {
  if (run.mode !== 'open' || run.picked || run.selectedIndex === null) return;
  lockIn(run.selectedIndex);
  advance();
}

async function pick(index) {
  if (run.mode !== 'blind' || run.picked) return;
  lockIn(index);
  await ui.revealBlind(root, index, { rerollAvailable: !run.rerollUsed });
  run.revealed = true;
}

function next() {
  if (run.mode !== 'blind' || !run.picked) return;
  advance();
}

// Open mode: usable before confirming. Blind mode: usable only after the
// reveal, and it throws away the card just drawn.
function reroll() {
  if (run.rerollUsed) return;
  const blind = run.mode === 'blind';
  if (blind ? !run.revealed : run.picked) return;
  if (blind) run.choices.pop();
  run.rerollUsed = true;
  run.tiles = draw(currentCategory().options, TILES_PER_STEP, run.tiles);
  run.selectedIndex = null;
  run.picked = false;
  run.revealed = false;
  showStep({ focusTiles: true });
  ui.announce(
    blind
      ? 'Card discarded. Four new face-down cards dealt. This pick is final.'
      : 'Four new cards drawn. You have no re-rolls left.',
  );
}

function advance() {
  run.stepIndex += 1;
  if (run.stepIndex < categories.length) dealStep();
  else ui.renderResult(root, { choices: run.choices }, { restart: () => showIntro() });
}

async function boot() {
  try {
    categories = await loadContent(CONTENT_URL, { dev: DEV });
  } catch (err) {
    const problems = err instanceof ContentError ? err.problems : [String(err)];
    console.error('[content] pools.json could not be used:\n' + problems.map((p) => `  - ${p}`).join('\n'));
    ui.renderError(root, problems);
    return;
  }
  showIntro({ focus: false });
}

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch((err) => DEV && console.warn('Service worker not registered:', err));
}

boot();
