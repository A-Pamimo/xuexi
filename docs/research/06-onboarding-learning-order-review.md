# Independent review — onboarding & learning order

_Scope: how a brand-new learner (someone new to China, zero Mandarin) is
onboarded and what order they meet the language in. Is the sequence aligned with
what actually matters first? Plus triage of the bug log._

---

## TL;DR

- **Onboarding flow (first launch): well aligned.** The 5-step sequence — a
  guaranteed win → the four tones → a real sentence they "just read" → the Tone
  Dojo — is pedagogically sound and does the right thing (opens to a win, teaches
  before testing, bootstraps a known-word base).
- **Ongoing learning order (Learn tab): _not_ aligned — this was the real
  problem.** New words were introduced in raw corpus-frequency order, which
  front-loads the most **abstract grammatical particles** (的, 了, 就…) — exactly
  the words that are meaningless as isolated flashcards and that have **no example
  sentences** to make them learnable. A newcomer's first three cards were
  `的 "possessive particle"`, `就 "then"`, `了 "completed-action marker"`.
- **Three genuine data/audio bugs confirmed**, one of them a whole _class_ of
  wrong dictionary readings (没 was labelled "mò / drowned", 那 "nuó / many",
  吧 "bā / bar").

Fixes for all of the above are implemented on this branch — see
"What was changed" at the bottom.

---

## 1. Onboarding flow — the good

`src/features/onboarding/OnboardingScreen.tsx` runs five steps:

1. **Welcome** — one line of positioning.
2. **First word (茶 / chá / "tea")** — teaches one concrete, single-syllable,
   audio-backed word, then a can't-fail recognition tap. A guaranteed early win
   _before_ any discrimination task. This is textbook correct.
3. **The four tones** — mā/má/mǎ/mà with contour drawings + per-tone audio.
4. **First sentence** — pulls a fully-comprehensible sentence built from the same
   40-word bootstrap set that completion marks "known", reveals it with a
   scramble + audio, and lands on "you just read Chinese." Genuine payoff moment.
5. **Into the Tone Dojo.**

Completion (`completeOnboarding`) marks 40 high-utility words known
(`BOOTSTRAP_HANZI`) so the feed is immediately comprehensible. The bootstrap set
itself is **well chosen** — concrete, high-frequency, communicative: pronouns
(我 你 他 她), core verbs (去 吃 喝 看 买), and survival nouns
(茶 水 米饭 咖啡 书 苹果 手机 朋友 学校 家 商店). No complaints here.

## 2. Learning order — the misalignment

After onboarding, the Learn queue (`appStore.reviewQueue`) introduced **new** words
in pure SUBTLEX-CH spoken-frequency order. Because the 40 bootstrap words are
already "known", the first _new_ words a learner met were the highest-frequency
words **not** in the bootstrap — and those are dominated by grammatical function
words:

| # (old order) | Word | Gloss shown | Example sentence? |
|---|---|---|---|
| 1 | 就 | in that case; then | none |
| 2 | 了 | (completed action marker) | none |
| 3 | 会 | can; know how to | none |
| 4 | 说 | to speak | none |
| 5 | 要 | to want / (auxiliary) | none |
| 6 | 在 | to exist | none |

Of the first 25 new words, **24 had no example sentence**, and a large share were
abstract markers whose flashcard gloss ("(completed action marker)") teaches a
beginner essentially nothing. This is the core misalignment:

> **Corpus frequency ≠ pedagogical priority.** The particles that dominate a
> frequency count are precisely the ones that _cannot_ be learned in isolation —
> they only mean something inside a sentence. Front-loading them as bare cards
> maximises early confusion.

### What order _should_ a newcomer to China meet things in?

Rough priority for someone who just landed, cannot speak, and needs to function:

1. **Social formulas / survival:** 你好, 谢谢, 对不起 / 不好意思, 再见, 请.
2. **Yes / no / core response:** 是, 不, 对, 好, 有 / 没有.
3. **Numbers + money:** 一–十, 百, 块 / 钱, 多少 — prices, paying, bargaining.
4. **Pointing & location:** 这个, 那个, 哪里, 在, 厕所.
5. **Food & daily needs:** 吃, 喝, 水, 茶, 饭, 菜, 要, "这个多少钱".
6. **Self & basic verbs:** 我, 你, 他, 去, 来, 看, 买.
7. **THEN grammatical scaffolding** (的, 了, 就, 会, 把, 着…) — introduced
   _through sentences_, never as bare cards.

The onboarding bootstrap already covers much of tiers 4–6. The failure was that
Learn then jumped straight to tier 7 (bare grammar) instead of reinforcing tiers
1–6 and delivering grammar in context.

## 3. Bug log — triage

### 3a. "The sound for 没 is wrong" — root cause found (a whole bug class)

`没` was stored as **`mò` / "drowned"** — a rare literary reading — instead of the
common **`méi` / "not; (have) not"**. The seed build's `bestForm` heuristic (pick
the reading with the most dictionary senses) mis-fires on polyphonic characters.
The word audio is synthesised from the _hanzi_, and neural TTS reads an isolated
没 as the standard **méi** — so the _clip was already correct_ and the **label was
the bug**; the learner saw "mò" next to audio saying "méi". A repo-wide scan found
the same corruption in a cluster:

| Hanzi | Was | Now |
|---|---|---|
| 没 | mo4 · "drowned" | **méi · "not; (have) not"** |
| 那 | nuo2 · "many" | **nà · "that; those"** |
| 吧 | ba1 · "bar (loanword)" | **ba · sentence-final particle** |
| 着 | zhao2 · "to touch" | **zhe · continuous-aspect particle** |
| 教 | jiao4 · "religion" | **jiāo · "to teach"** |
| 长 | zhang3 · "chief" | **cháng · "long"** |
| 为 | wei2 · "as (capacity of)" | **wèi · "for; because of"** |
| 数 | shu3 · "to count" | **shù · "number"** |
| 给 | gloss "to" | **"to give"** |
| 钱 | gloss "coin" | **"money"** |

### 3b. "我们 audio sounds like moaning at the beginning" — confirmed defect

`word_385.wav` (我们) is **2.23 s of three separate energy bursts** — a neural-TTS
"runaway" (the model repeats/adds filler; the breathy decay of the low third-tone
`wǒ` reads as a moan). A normal two-syllable word is ~0.6 s. A scan found **21
such runaway clips** in the shipped bundle (成为 2.6 s, 妈妈 2.6 s, 那些 2.2 s…).
These cannot be regenerated in this environment (Qwen needs a GPU + model
weights), so the fix is systemic: a build-time length guard now flags them and
writes a regeneration list. See `assets/audio/_runaway-clips.txt`; delete those
`.wav` files and re-run `npm run audio:build` on a machine with the model to fix
the bundle.

### 3c. "Words in Learn mode need sentences for context" — implemented (with a caveat)

The Learn card now shows an **"IN CONTEXT"** worked example — a comprehensible
sentence using the new word, with pinyin, translation and audio — whenever a
linked sentence exists. **Caveat:** the generated sentence pool (390 sentences)
only covers a narrow concrete vocabulary, so most abstract Learn-pool words still
have no sentence to show. The display mechanism is in place; **expanding sentence
coverage over the Learn pool is the necessary follow-up** (extend
`scripts/build-seed/sentences.ts`, ideally with real Tatoeba data once egress
allows).

## 4. What was changed on this branch

| Area | Change | Files |
|---|---|---|
| **Wrong readings (3a)** | Curated correction overlay, wired into the build **and** applied to the shipped snapshot | `scripts/build-seed/corrections.json`, `scripts/build-seed/index.ts`, `scripts/apply-seed-corrections.mjs`, `src/data/seed.json` |
| **Learn order (§2)** | Defer bare grammatical particles behind contentful words (`byLearnPriority`); 了 moves from card #2 → ~#43 | `src/stores/appStore.ts` |
| **Context sentences (3c)** | "IN CONTEXT" example on the new-word card | `src/features/reviews/ReviewScreen.tsx` |
| **Runaway audio (3b)** | Build-time length guard + regeneration list | `scripts/build-audio/index.ts`, `assets/audio/_runaway-clips.txt` |

**Verification:** `npm run typecheck` clean, `npm test` 123/123 pass,
`expo export --platform web` builds, seed hydrates with corrected data.

## 5. Recommended follow-ups (not in this branch)

1. **Expand sentence coverage** so every Learn-pool word (especially particles)
   ships with 1–2 comprehensible i+1 example sentences — this is what fully closes
   bug 3c and makes the grammar words learnable.
2. **Regenerate the 21 runaway audio clips** on a GPU box (list provided).
3. **Consider a curated tier-1 survival syllabus** (numbers, money, 多少, 哪里,
   politeness) ahead of frequency order for the very first sessions — the
   particle-deferral here is a conservative first step; 就/会/要/在 are still early
   because they aren't "pure" particles, but they're also hard in isolation.
