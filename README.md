# Fantasy Story Forge

A small web tool for a creative writing workshop. Students click through six steps (Subgenre, Magic, Technology Level, Setting, Character Role and Central Conflict) and pick one of four cards at each step. At the end they get a **Character & World** card to write a short story from.

It is a static site: plain HTML, CSS and JavaScript, no build step, no framework, no backend. Nothing about the student is stored or sent anywhere.

---

## Editing the content

All cards live in **`content/pools.json`**. You never need to touch the code to change them.

### The structure

```json
{
  "categories": [
    {
      "id": "magic",
      "label": "Magic",
      "symbol": "eye",
      "options": [
        { "id": "song", "title": "Song-Weaving", "description": "Magic is sung. ..." }
      ]
    }
  ]
}
```

| Field | What it does |
| --- | --- |
| `id` (category) | Internal name. Must be unique. Not shown to students. |
| `label` | The heading students see ("Magic", "Character Role"). |
| `symbol` | The drawing on the card back. One of: `book`, `eye`, `gear`, `compass`, `mask`, `swords`. Anything else shows a plain diamond. |
| `options` | The cards in this category. **At least 8**; 12 is the intended number. |
| `id` (option) | Internal name, unique *within its category*. Lower case with hyphens is easiest: `"forbidden-art"`. |
| `title` | Card title. Aim for 1–4 words. |
| `description` | One or two sentences, ideally 30 words or fewer. |

**Step order** is the order of the categories in the file. To swap two steps, move the whole category block. The progress indicator counts the categories automatically.

### Easiest way to edit

1. Open the repository on GitHub and go to `content/pools.json`.
2. Click the pencil icon (Edit), make your changes and click **Commit changes**.
3. Vercel redeploys automatically; the live site updates in under a minute.

### Things that commonly break JSON

- A missing comma between two options: `}` followed by `{` needs `},` in between.
- A comma after the *last* option in a list: `}` directly before `]` must **not** have a comma.
- Straight double quotes only (`"`). Curly quotes (`“ ”`) pasted from Word break the file. Apostrophes inside text (`don't`) are fine.

### What happens if the file is wrong

The site checks the file every time it loads. If anything is wrong (bad JSON, a category with fewer than 8 options, a missing title, a duplicate id) the site shows a screen listing **every** problem with its category and option number, instead of the cards. Fix them and reload.

When you run the site locally (see below), descriptions over 30 words and titles over 4 words are also reported as warnings in the browser console. They do not stop the site.

### Content notes

`CONTENT_NOTES.md` lists the drafted options I think are weakest, with reasons. Review those first.

---

## Running it locally

Opening `index.html` by double-clicking does **not** work: browsers block a page opened from disk from loading its own data file. Run a tiny local web server from the project folder instead. Either of these works:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

```sh
npx serve .
# then open the address it prints
```

Stop the server with Ctrl+C.

---

## Deploying to Vercel

One-time setup:

1. Log in at vercel.com **with GitHub**.
2. **Add New… → Project**, then **Import** this repository. If it isn't listed, use *Adjust GitHub App Permissions* to give Vercel access to it.
3. Settings:
   - **Framework Preset:** Other
   - **Root Directory:** `./`
   - **Build Command:** leave empty
   - **Output Directory:** `.` (or leave at the default)
4. Click **Deploy**.

After that, every push to `main` redeploys automatically. Give students the main production address (`<project>.vercel.app`, renameable under *Settings → Domains*), not a preview URL: preview URLs may ask for a Vercel login.

The repository is private; the deployed site is public to anyone with the link.

---

## Privacy and offline use

- No cookies, no analytics, no local storage, no accounts. A run lives only in the open tab and disappears on refresh.
- No external requests. The fonts are stored in `fonts/`, not loaded from Google. A Content Security Policy in `index.html` blocks the page from contacting any other server, even by accident.
- `sw.js` is a small service worker that caches the site's own files after the first visit, so a refresh still works if the classroom Wi-Fi drops. It always tries the network first, so content edits show up as soon as the device is online.

---

## Project structure

```
index.html            page shell, security policy, font preloads
sw.js                 offline cache
favicon.svg
content/pools.json    all card content (edit this)
src/main.js           flow and state: steps, picks, re-roll
src/render.js         screens, tiles, flip/reveal, result card
src/content.js        loading and validating pools.json
src/random.js         unbiased shuffling and drawing
src/symbols.js        card-back symbols (inline SVG)
src/styles.css        all styling
fonts/                Cormorant Garamond and Source Serif 4 (SIL Open Font License)
CONTENT_NOTES.md      review notes on the drafted content
```

### Behaviour in brief

- At each step, 4 options are drawn at random from that category, with no repeats within the step. Categories are independent: earlier picks never filter later ones.
- **Open cards:** tap to select (changeable), then *Confirm choice*.
- **Blind draw:** tap a face-down card. It flips and locks immediately, then the other three flip face-up, dimmed, so the student sees what they missed. Then *Next step*.
- **One re-roll per run**, usable on any step before picking. It replaces all four cards with four that weren't just shown.
- No going back. *Start over* on the result screen needs two presses, so a stray tap can't wipe a card a student is writing from.
- Keyboard: Tab to move, Enter or Space to pick. With *reduce motion* switched on in the operating system, card flips become fades.

### Adding features later

The result card is built by `buildResultCard()` in `src/render.js`, separately from the screen around it, so a print or download feature can reuse it. `renderResult()` takes an `extras` list of elements that appear between the card and the *Start over* button: that is where a writing brief or a generated character name would go.
