// Screens and tiles. Builds DOM only; all state lives in main.js.
// Content text is always inserted as text nodes, never as HTML.

import { symbol } from './symbols.js';

const REVEAL_BEAT_MS = 750;
const REVEAL_BEAT_REDUCED_MS = 380;
const START_OVER_ARM_MS = 4000;

const NUMBER_WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

// ---------- helpers ----------

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

function mount(root, screen, focusTarget) {
  root.replaceChildren(screen);
  window.scrollTo(0, 0);
  focusTarget?.focus({ preventScroll: true });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function announce(message) {
  const el = document.getElementById('announcer');
  if (!el) return;
  el.textContent = '';
  requestAnimationFrame(() => {
    el.textContent = message;
  });
}

// ---------- opening screen ----------

export function renderIntro(root, { categories }, actions, { focus = true } = {}) {
  const count = NUMBER_WORDS[categories.length] ?? String(categories.length);
  const title = h('h1', { class: 'intro-title', id: 'intro-title', tabindex: '-1' }, 'Fantasy Story Forge');

  const modeButton = (mode, name, text) =>
    h(
      'button',
      { class: `mode-option mode-option--${mode}`, type: 'button', onclick: () => actions.start(mode) },
      h('span', { class: 'mode-name' }, name),
      h('span', { class: 'mode-text' }, text),
    );

  const screen = h(
    'section',
    { class: 'screen screen--intro', 'aria-labelledby': 'intro-title' },
    h('div', { class: 'intro-sigils', 'aria-hidden': 'true' }, categories.map((c) => symbol(c.symbol))),
    title,
    h(
      'p',
      { class: 'intro-lede' },
      `${count} steps, ${count.toLowerCase()} choices. At the end you will hold a character and a world. ` +
        'Your task is to write their story.',
    ),
    h('ol', { class: 'intro-steps' }, categories.map((c) => h('li', {}, c.label))),
    h('h2', { class: 'intro-question' }, 'How do you want to draw?'),
    h(
      'div',
      { class: 'mode-options' },
      modeButton('open', 'Open cards', 'See all four options at every step, and choose the one you want.'),
      modeButton('blind', 'Blind draw', 'Pick one of four face-down cards at every step. Fate decides; you write.'),
    ),
    h(
      'p',
      { class: 'intro-note' },
      'You get one re-roll for the whole run: with open cards before you choose, with a blind draw after you see your card. ' +
        'Once you start, the mode cannot be changed.',
    ),
  );

  mount(root, screen, focus ? title : null);
}

// ---------- step screen ----------

export function renderStep(root, view, actions, { focusTiles = false } = {}) {
  const { mode, category, stepNumber, totalSteps, tiles, rerollAvailable } = view;
  const blind = mode === 'blind';
  const isLast = stepNumber === totalSteps;
  const tint = stepNumber % 2 ? 'oxblood' : 'forest';

  const heading = h('h2', { class: 'step-title', id: 'step-title', tabindex: '-1' }, category.label);

  const tileButtons = tiles.map((option, i) =>
    blind
      ? blindTile(option, i, tiles.length, category, tint, () => actions.pick(i))
      : openTile(option, () => actions.select(i)),
  );

  const primary = blind
    ? h('button', { class: 'btn btn-primary', type: 'button', 'data-role': 'next', hidden: true, onclick: actions.next },
        isLast ? 'See your card' : 'Next step')
    : h('button', { class: 'btn btn-primary', type: 'button', 'data-role': 'confirm', disabled: true, onclick: actions.confirm },
        'Confirm choice');

  const reroll = h(
    'button',
    {
      class: 'reroll',
      type: 'button',
      'data-role': 'reroll',
      // Blind mode: the re-roll only unlocks after the reveal.
      disabled: blind || !rerollAvailable,
      'aria-describedby': 'reroll-help',
      onclick: actions.reroll,
    },
    h('span', { class: 'reroll-coin', 'aria-hidden': 'true' }, symbol('reroll', 'reroll-icon')),
    h('span', { class: 'reroll-text' }, rerollAvailable ? 'Re-roll (1 left)' : 'Re-roll used'),
  );

  const screen = h(
    'section',
    { class: `screen screen--step screen--${mode}`, 'aria-labelledby': 'step-title' },
    h(
      'header',
      { class: 'step-header' },
      h('p', { class: 'step-progress' }, `Step ${stepNumber} of ${totalSteps}`),
      progressPips(stepNumber, totalSteps),
      heading,
      h(
        'p',
        { class: 'step-hint' },
        blind
          ? 'Four cards lie face down. Pick one and it is revealed at once.'
          : 'Read the four cards and select one. Then confirm your choice.',
      ),
    ),
    h('div', { class: 'tiles', 'data-count': String(tiles.length) }, tileButtons),
    h(
      'div',
      { class: 'action-bar' },
      reroll,
      h(
        'p',
        { class: 'action-status', 'data-role': 'status' },
        blind ? (rerollAvailable ? 'Pick a card. You can re-roll once you see it.' : 'Pick a card. This pick is final.') : 'Select a card.',
      ),
      primary,
    ),
    h(
      'p',
      { class: 'sr-only', id: 'reroll-help' },
      blind
        ? 'After your card is revealed: discards it and deals four new face-down cards. You get one re-roll for the whole run.'
        : 'Replaces all four cards with new ones. You get one re-roll for the whole run.',
    ),
  );

  mount(root, screen, focusTiles ? tileButtons[0] : heading);
}

function progressPips(stepNumber, totalSteps) {
  return h(
    'ol',
    { class: 'step-pips', 'aria-hidden': 'true' },
    Array.from({ length: totalSteps }, (_, i) =>
      h('li', { class: i + 1 < stepNumber ? 'is-done' : i + 1 === stepNumber ? 'is-current' : '' }),
    ),
  );
}

function cardFace(option, { ribbon = '', hidden = false } = {}) {
  return h(
    'span',
    { class: 'tile-face parchment', 'aria-hidden': hidden ? 'true' : null },
    h('span', { class: 'tile-ribbon', 'aria-hidden': ribbon ? 'true' : null }, ribbon),
    h('span', { class: 'tile-title' }, option.title),
    h('span', { class: 'tile-desc' }, option.description),
  );
}

function openTile(option, onSelect) {
  return h(
    'button',
    { class: 'tile tile--open', type: 'button', 'aria-pressed': 'false', onclick: onSelect },
    h('span', { class: 'tile-inner' }, cardFace(option, { ribbon: 'Selected' })),
  );
}

function blindTile(option, index, total, category, tint, onPick) {
  // The face is in the DOM so the card keeps its size when it flips, but it is
  // hidden from assistive tech and from find-in-page until revealed.
  return h(
    'button',
    { class: 'tile tile--blind', type: 'button', 'aria-label': `Face-down card ${index + 1} of ${total}`, onclick: onPick },
    h(
      'span',
      { class: 'tile-inner' },
      h(
        'span',
        { class: 'tile-back', 'data-tint': tint },
        h('span', { class: 'tile-back-sigil' }, symbol(category.symbol)),
        h('span', { class: 'tile-back-label' }, category.label),
      ),
      cardFace(option, { hidden: true }),
    ),
  );
}

// Open mode: highlight one tile and enable Confirm.
export function markSelected(root, index) {
  const tiles = [...root.querySelectorAll('.tile')];
  tiles.forEach((tile, i) => tile.setAttribute('aria-pressed', String(i === index)));
  root.querySelector('[data-role="confirm"]').disabled = false;
  const title = tiles[index].querySelector('.tile-title').textContent;
  root.querySelector('[data-role="status"]').textContent = `Selected: ${title}`;
}

// Blind mode: flip the picked card, then the rest (dimmed), then show Next
// and, if the run still has it, the re-roll.
export async function revealBlind(root, pickedIndex, { rerollAvailable }) {
  const tiles = [...root.querySelectorAll('.tile')];
  const beat = prefersReducedMotion() ? REVEAL_BEAT_REDUCED_MS : REVEAL_BEAT_MS;
  const status = root.querySelector('[data-role="status"]');

  root.querySelector('.tiles').classList.add('is-locked');
  tiles.forEach((tile) => tile.setAttribute('aria-disabled', 'true'));

  const picked = tiles[pickedIndex];
  flip(picked, 'Your card', 'is-chosen');
  const title = picked.querySelector('.tile-title').textContent;
  const description = picked.querySelector('.tile-desc').textContent;
  status.textContent = `You drew: ${title}`;
  announce(`You drew ${title}. ${description}`);

  await wait(beat);
  tiles.forEach((tile, i) => i !== pickedIndex && flip(tile, 'Not chosen', 'is-missed'));
  await wait(beat);

  const next = root.querySelector('[data-role="next"]');
  if (!next) return; // screen was replaced mid-animation
  next.hidden = false;
  next.focus();
  root.querySelector('[data-role="reroll"]').disabled = !rerollAvailable;
  if (rerollAvailable) status.textContent = `You drew: ${title}. Keep it, or re-roll once.`;
  tiles.forEach((tile) => {
    tile.disabled = true;
    tile.removeAttribute('aria-disabled');
  });
}

function flip(tile, ribbonText, stateClass) {
  tile.removeAttribute('aria-label');
  tile.classList.add('is-flipped', stateClass);
  const face = tile.querySelector('.tile-face');
  face.removeAttribute('aria-hidden');
  face.querySelector('.tile-ribbon').textContent = ribbonText;
}

// ---------- result screen ----------

// The card on its own, so later features (print, download) can reuse it.
export function buildResultCard(choices) {
  return h(
    'article',
    { class: 'result-card parchment', 'aria-labelledby': 'result-title' },
    h(
      'header',
      { class: 'result-head' },
      h('p', { class: 'result-kicker' }, 'Your'),
      h('h2', { class: 'result-heading', id: 'result-title', tabindex: '-1' }, 'Character & World'),
    ),
    h(
      'div',
      { class: 'result-grid' },
      choices.map(({ category, option }) =>
        h(
          'section',
          { class: 'result-entry' },
          h('h3', { class: 'result-label' }, symbol(category.symbol), category.label),
          h('p', { class: 'result-title' }, option.title),
          h('p', { class: 'result-desc' }, option.description),
        ),
      ),
    ),
  );
}

// `extras` is a list of extra elements (writing brief, print button, ...)
// placed between the card and the Start over button.
export function renderResult(root, { choices, extras = [] }, actions) {
  const card = buildResultCard(choices);
  const startOver = startOverButton(actions.restart);

  const screen = h(
    'section',
    { class: 'screen screen--result', 'aria-labelledby': 'result-title' },
    card,
    extras,
    h('div', { class: 'result-actions' }, startOver),
  );

  mount(root, screen, card.querySelector('#result-title'));
}

// Two presses needed, so a stray tap doesn't wipe the card a student is writing from.
function startOverButton(onConfirmed) {
  const label = 'Start over';
  let timer = null;
  const button = h('button', { class: 'btn btn-secondary', type: 'button' }, label);
  button.addEventListener('click', () => {
    if (button.dataset.armed) {
      clearTimeout(timer);
      onConfirmed();
      return;
    }
    button.dataset.armed = 'true';
    button.textContent = 'Press again to start over';
    announce('Press again to start over. Your card will be cleared.');
    timer = setTimeout(() => {
      delete button.dataset.armed;
      button.textContent = label;
    }, START_OVER_ARM_MS);
  });
  return button;
}

// ---------- error screen ----------

export function renderError(root, problems) {
  const title = h('h1', { class: 'error-title', tabindex: '-1' }, 'The Story Forge cannot start');
  const screen = h(
    'section',
    { class: 'screen screen--error', role: 'alert' },
    title,
    h('p', {}, 'There is a problem with the content file, content/pools.json:'),
    h('ul', { class: 'error-list' }, problems.map((p) => h('li', {}, p))),
    h('p', { class: 'error-help' }, 'Fix the file and reload the page. Students: please tell your teacher.'),
  );
  mount(root, screen, title);
}
