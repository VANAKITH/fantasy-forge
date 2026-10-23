// Loads and validates content/pools.json.

export const MIN_OPTIONS = 8;
const MAX_DESCRIPTION_WORDS = 30;
const MAX_TITLE_WORDS = 4;

export class ContentError extends Error {
  constructor(problems) {
    super(problems.join('\n'));
    this.name = 'ContentError';
    this.problems = problems;
  }
}

export async function loadContent(url, { dev = false } = {}) {
  let text;
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new ContentError([`Could not load ${url} (the server answered ${res.status}).`]);
    text = await res.text();
  } catch (err) {
    if (err instanceof ContentError) throw err;
    throw new ContentError([
      `Could not load ${url}. If you opened index.html directly from your computer, ` +
        'start a local web server instead (see README.md).',
    ]);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new ContentError([describeJsonError(url, err, text)]);
  }

  const problems = validate(data);
  if (problems.length) throw new ContentError(problems);

  if (dev) for (const warning of lint(data)) console.warn(`[content] ${warning}`);
  return data.categories;
}

// Returns a list of human-readable problems; an empty list means the data is usable.
export function validate(data) {
  if (!isObject(data) || !Array.isArray(data.categories)) {
    return ['The file must contain an object with a "categories" list.'];
  }
  const problems = [];
  if (data.categories.length === 0) problems.push('The "categories" list is empty.');

  const categoryIds = new Set();
  data.categories.forEach((cat, ci) => {
    const where = `Category ${ci + 1}${hasText(cat?.id) ? ` ("${cat.id}")` : ''}`;
    if (!isObject(cat)) {
      problems.push(`${where} is not an object.`);
      return;
    }
    if (!hasText(cat.id)) problems.push(`${where} needs an "id".`);
    else if (categoryIds.has(cat.id)) problems.push(`${where}: the id "${cat.id}" is already used by another category.`);
    else categoryIds.add(cat.id);

    if (!hasText(cat.label)) problems.push(`${where} needs a "label".`);
    if (cat.symbol !== undefined && typeof cat.symbol !== 'string') problems.push(`${where}: "symbol" must be text.`);

    if (!Array.isArray(cat.options)) {
      problems.push(`${where} needs an "options" list.`);
      return;
    }
    if (cat.options.length < MIN_OPTIONS) {
      problems.push(`${where} has ${cat.options.length} option${cat.options.length === 1 ? '' : 's'}; it needs at least ${MIN_OPTIONS}.`);
    }

    const optionIds = new Set();
    cat.options.forEach((opt, oi) => {
      const optWhere = `${where}, option ${oi + 1}${hasText(opt?.id) ? ` ("${opt.id}")` : ''}`;
      if (!isObject(opt)) {
        problems.push(`${optWhere} is not an object.`);
        return;
      }
      for (const field of ['id', 'title', 'description']) {
        if (!hasText(opt[field])) problems.push(`${optWhere} needs a "${field}".`);
      }
      if (hasText(opt.id)) {
        if (optionIds.has(opt.id)) problems.push(`${optWhere}: the id "${opt.id}" appears more than once in this category.`);
        optionIds.add(opt.id);
      }
    });
  });
  return problems;
}

// Style checks that don't block loading; shown in the console on localhost only.
export function lint(data) {
  const warnings = [];
  for (const cat of data.categories) {
    for (const opt of cat.options) {
      const words = countWords(opt.description);
      if (words > MAX_DESCRIPTION_WORDS) warnings.push(`${cat.id}/${opt.id}: description has ${words} words (aim for ${MAX_DESCRIPTION_WORDS} or fewer).`);
      const titleWords = countWords(opt.title);
      if (titleWords > MAX_TITLE_WORDS) warnings.push(`${cat.id}/${opt.id}: title has ${titleWords} words (aim for ${MAX_TITLE_WORDS} or fewer).`);
    }
  }
  return warnings;
}

function describeJsonError(url, err, text) {
  let where = '';
  const pos = /position (\d+)/.exec(err.message);
  if (pos && !/line \d+/.test(err.message)) {
    const before = text.slice(0, Number(pos[1]));
    const line = before.split('\n').length;
    const column = before.length - before.lastIndexOf('\n');
    where = ` (line ${line}, column ${column})`;
  }
  return `${url} is not valid JSON: ${err.message}${where}. A missing comma, quote or bracket near that spot is the usual cause.`;
}

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const hasText = (v) => typeof v === 'string' && v.trim() !== '';
const countWords = (s) => s.trim().split(/\s+/).length;
