<!-- B1 — Product identity direction. Doc only. No code changes; nothing renamed. -->

# xuexi — Product Identity Direction

## The critique, stated plainly

Right now the app wears four different costumes and hopes you don't notice the seams.
The code says so out loud:

- **Tone Dojo** — a martial-arts arcade (combo meters, escalating pitch, 60-second rounds).
- **The Feed** — TikTok. The source file literally says *"doomscroll"* and *"swipe feed."*
- **Stats** — a Pokédex ("*progress porn*," "*glowing by mastery*," a character-collection grid).
- **Onboarding** — a neutral tutorial that then dumps you into the dojo.

Four borrowed worlds — dojo, doomscroll, Pokédex, arcade — stapled together. Each is individually
competent and collectively incoherent. `theme.ts` already gestures at a way out with a private
aesthetic note — *"Calm Focus, Living Ink"* — but only the color tokens obey it. The surfaces don't.
This document commits the whole product to that one world and tells each surface how to express it.

The Browser Company critique is correct: pick **one** aesthetic and let it govern everything, or the
app reads as a features list rather than a thing with a point of view.

---

## The one world: **Living Ink**

**The pitch, in a sentence:** a quiet ink studio where the language is alive on the page — hanzi
breathe, tones move like brushstrokes, and everything you do leaves a mark that stays.

**Mood.** Calm, literary, a little reverent. The opposite of a slot machine. This is the feeling of
a good notebook and a sharp pen at a clean desk — reading-first, unhurried, but *not* sleepy: the
language itself is the moving, living element on an otherwise still surface. Confidence, not
urgency. We never shout. When we celebrate, we do it the way ink does — a stroke lands, it dries,
it's permanent.

**Why this world and not another.** It's the only frame that's *native* to the subject. Chinese is a
writing system before it's anything else; every learner's first real "whoa" is a character resolving
from strokes into meaning. Dojo/arcade/Pokédex are all imported from outside the language and fight
the reading-first pedagogy the research already committed us to (85% comprehensible input, honest
metrics, no dark patterns). Ink is the one metaphor that makes the *ethics* feel like *style*: a mark
that's earned and permanent is the visual rhyme of a streak that requires real learning.

### One visual anchor: **the wet-ink stroke**

Every accent moment in the app is the same primitive — **a single brushstroke being laid down and
drying.** Not a particle burst, not confetti, not a coin. A stroke.

- It has *weight and direction* (it enters, it settles), so it reads as intentional, not decorative.
- It **dries into permanence** — the celebratory version and the resting-state version are the same
  mark at two moments in time. Reward and record are literally the same object. That is the ethics
  guardrail rendered as a visual.
- It reuses what exists: the four tone colors (`tone1..tone4`) are already the app's signature and
  vary in lightness (colorblind-aware). The stroke *is* a tone color drying onto the low-chroma
  neutral surface. No new palette; we retire the borrowed iconography, not the tokens.

Anchor rule of thumb: **if an effect couldn't be drawn with one loaded brush, it doesn't belong.**

---

## How each surface expresses Living Ink

The point isn't to re-skin four themes into one skin. It's that each surface is a different *room in
the same studio*, doing the same thing — putting a mark on a page — at a different tempo.

**Onboarding — "the first stroke."** Drop the tutorial framing. The very first screen is one hanzi
drawing *itself*, stroke by stroke, then speaking. You tap a tone and watch the contour drawn as a
brush gesture (the `ToneContour` component already animates a line — lean into it as *ink*, reduce it
to the drawn line, kill the arcade chrome). Your first action leaves your first permanent mark. The
promise of the whole app is delivered in ten seconds: *your learning becomes ink that stays.*

**Feed — "the reading table."** Kill the word "doomscroll." Same vertical full-screen cards, but the
metaphor is turning pages at a table, not scrolling a firehose. Autoplay stays; the pacing is the
change — no infinite dopamine tug, a calm page that waits for you. Tapping a word doesn't just gloss
it: it *inks* it into your collection (the same stroke, the same permanence as Stats). The 85% known
floor is what makes the page feel readable instead of anxious — that floor is now a *feeling*, not
just a selector invariant.

**Learn / Reviews — "practice sheets."** SRS reviews are handwriting practice, not a quiz app. A
correct answer lays the stroke down cleanly (`juice.correct()` → the wet-ink land); a wrong answer is
a stroke that smudges and asks you to redraw — corrective, never punitive, no red-buzzer arcade
energy. The upcoming `BuildExercise` (assemble a sentence) is composing a line on the page.

**Dojo → "the tone studio."** This is the biggest retreat from pastiche. Keep the *pedagogy* of Tone
Dojo (rapid-fire, high-variability, multi-speaker discrimination — it's well-founded) and drop the
*dojo*. No belts, no combos-as-arcade. The combo meter becomes **ink saturation**: a run of correct
answers deepens the stroke's color; a miss lets it dry where it is. Same escalation psychology,
expressed as a brush loading with ink instead of a fighting-game hit counter. Rounds still exist;
they're "pages," not "matches."

**Stats — "the finished manuscript."** Kill "Pokédex" and "progress porn." The character grid stays,
but each known character is a **completed brushstroke that has dried** — mastery is depth and
permanence of ink, not a glow-up collectible. Input-hours odometer, streak, level: all rendered as
*accumulated marks on a page you're filling*. The emotional beat is "look how much I've written,"
which is honest (it maps 1:1 to real input) and native to the subject, versus "gotta catch 'em all,"
which is a borrowed compulsion loop we explicitly don't want.

---

## The signature "whoa" moment: **First Ink**

One moment the whole product is built to deliver, early and repeatably:

> **You meet a character you don't know. You watch it draw itself, stroke by stroke, hear it spoken,
> then see it in a real sentence you can *actually read* — and it dries onto your page as a
> permanent mark that's now yours.**

Mechanically it's a beat we can already build from existing parts: stroke-order animation → audio →
the character surfacing inside an 85%-comprehensible feed sentence → the wet-ink stroke drying into
the Stats grid. The "whoa" is the compression: *stranger → understood → permanently mine,* in one
continuous gesture, in seconds. It's the app's thesis (comprehensible input becomes durable memory)
made physical.

**Reduced-motion behavior (hard constraint):** when `useReducedMotion()` is true, First Ink
collapses to its final state — the finished character, already drawn and "dry," with the sentence and
the grid mark present. No stroke animation, no drying. Same information, same permanence, zero
motion. The moment must survive being still.

---

## Names

The current name is, literally, the word **"learn"** (xuéxí / 学习). It's a placeholder describing the
category, not a brand — un-ownable, un-searchable, no point of view. Candidates below all lean into
the Living Ink world. (Domain/store notes are eyeball estimates for prioritization, **not** cleared —
each needs a real trademark + availability check before we commit.)

1. **Inkwell**
   *One-line rationale:* the vessel the whole aesthetic pours from — quiet, literary, "a well you
   draw from," and it makes the ink metaphor the brand, not just the UI.
   *Viability:* strong concept fit; `inkwell.com` almost certainly taken/premium, and "Inkwell"
   collides with existing apps/tools — likely needs a modifier ("Inkwell Chinese," `getinkwell`,
   `inkwell.app`). App Store name probably needs a qualifier.

2. **Húyǔ / Huyu** *(壶语 — "the pot speaks," or read loosely as "language from the vessel")*
   *One-line rationale:* a real, pronounceable Mandarin word that ties ink-vessel to *speech*; signals
   the subject without being the generic verb "learn."
   *Viability:* short `.com` (`huyu.com`) likely taken; the App Store name is distinctive and
   low-collision. Risk: tone/spelling ambiguity for non-speakers — needs a clear tagline.

3. **Strokes**
   *One-line rationale:* dead-literal to the anchor (a character *is* strokes; progress *is*
   strokes), warm and human, reads as both "brushstrokes" and "small steps."
   *Viability:* generic dictionary word → `.com` gone, high search collision (swimming, keyboards,
   medical). Best as `strokes.app` with heavy modifier; probably too generic to defend. Include as
   the "safe, obvious" option to measure the others against.

4. **Míng / Ming** *(明 — "bright / to understand," the sun-and-moon character)*
   *One-line rationale:* means *comprehension* — the exact promise (input you can understand) — and
   its own glyph is a beautiful visual anchor; short, global-friendly.
   *Viability:* very short → `ming.com` long gone (premium), and "Ming" carries dynasty/name
   baggage. Store name is clean and memorable; would live at `ming.app` / `learnming`. Strong brand,
   contested domain.

5. **Rùnbǐ / Runbi** *(润笔 — "to moisten the brush," the gesture right before writing)*
   *One-line rationale:* names the *instant before the first stroke* — anticipation, readiness,
   the beginner's exact posture; poetic and unmistakably ours.
   *Viability:* obscure enough that `runbi.com` / `runbi.app` are plausibly gettable and search is
   near-empty (low collision, easy to own) — but it's the hardest to pronounce/spell cold, so it
   trades ownability for immediate legibility.

**Opinionated recommendation.** Lead with **Inkwell** for immediate legibility (the aesthetic *is*
the name, anyone gets it in one beat), with **Runbi** as the strong "ownable and distinctive" backup
if trademark/domain checks kill Inkwell. Ming is the high-ceiling wildcard if we can clear the
domain. Strokes is the floor. Kill "learn."
