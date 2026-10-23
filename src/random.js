// Randomness helpers. Uses crypto.getRandomValues so draws are unbiased
// and not predictable from Math.random's seed.

export function randomInt(n) {
  // Rejection sampling avoids modulo bias.
  const limit = Math.floor(0x100000000 / n) * n;
  const buf = new Uint32Array(1);
  do {
    crypto.getRandomValues(buf);
  } while (buf[0] >= limit);
  return buf[0] % n;
}

export function shuffle(items) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Draw `count` distinct options from `pool`. Options listed in `avoid` are
// only used if the pool runs out of fresh ones.
export function draw(pool, count, avoid = []) {
  const avoidIds = new Set(avoid.map((o) => o.id));
  const fresh = shuffle(pool.filter((o) => !avoidIds.has(o.id)));
  const stale = shuffle(pool.filter((o) => avoidIds.has(o.id)));
  return shuffle([...fresh, ...stale].slice(0, count));
}
