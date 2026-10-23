// Category symbols for card backs and the result card. Original line drawings
// on a 64×64 grid. The "symbol" field in pools.json picks one by name; unknown
// names fall back to "sigil".

const SHAPES = {
  book: `
    <path d="M32 18c-7-5-17-6-24-3v34c7-3 17-2 24 3 7-5 17-6 24-3V15c-7-3-17-2-24 3z"/>
    <path d="M32 18v34"/>
    <path d="M14 24c4-1 9-1 13 1M14 32c4-1 9-1 13 1M37 25c4-2 9-2 13-1M37 33c4-2 9-2 13-1"/>`,
  eye: `
    <path d="M5 32c7-11 17-17 27-17s20 6 27 17c-7 11-17 17-27 17S12 43 5 32z"/>
    <circle cx="32" cy="32" r="9"/>
    <path d="M32 26l1.6 4.4L38 32l-4.4 1.6L32 38l-1.6-4.4L26 32l4.4-1.6z" fill="currentColor" stroke="none"/>`,
  gear: `
    <circle cx="32" cy="32" r="20" stroke-width="7" stroke-dasharray="7.85 7.85" stroke-linecap="butt"/>
    <circle cx="32" cy="32" r="15"/>
    <circle cx="32" cy="32" r="5"/>`,
  compass: `
    <circle cx="32" cy="32" r="22"/>
    <path d="M32 5l5 22 22 5-22 5-5 22-5-22-22-5 22-5z"/>
    <circle cx="32" cy="32" r="3" fill="currentColor" stroke="none"/>`,
  mask: `
    <path d="M12 14c12-5 28-5 40 0 2 20-6 36-20 40C18 50 10 34 12 14z"/>
    <path d="M19 27c3-3 8-3 11 0-3 3-8 3-11 0zM34 27c3-3 8-3 11 0-3 3-8 3-11 0z"/>
    <path d="M25 41c4 3 10 3 14 0"/>`,
  swords: `
    <path d="M12 12l34 34M52 12L18 46"/>
    <path d="M40 50l10-10M14 40l10 10"/>
    <path d="M47 47l6 6M17 47l-6 6"/>`,
  reroll: `
    <path d="M50 26A20 20 0 0 0 15 22"/>
    <path d="M14 11v11h11"/>
    <path d="M14 38a20 20 0 0 0 35 4"/>
    <path d="M50 53V42H39"/>`,
  sigil: `
    <path d="M32 8l24 24-24 24L8 32z"/>
    <circle cx="32" cy="32" r="8"/>`,
};

export function symbol(name, className = 'sigil') {
  const tpl = document.createElement('template');
  tpl.innerHTML =
    `<svg class="${className}" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" ` +
    `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">` +
    `${SHAPES[name] ?? SHAPES.sigil}</svg>`;
  return tpl.content.firstElementChild;
}
