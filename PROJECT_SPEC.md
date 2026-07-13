# 学习 (xuéxí) — Full Project & UI Specification

> **Purpose of this document:** A complete, self-contained description of this app — its concept, architecture, data model, and (in exhaustive detail) its visual design system and every screen — written so that another engineer or AI instance can rebuild or reinvent the UI from scratch without ever seeing the original code.

---

## 1. Product Concept

**xuéxí** is a **calm, literary Mandarin Chinese learning app**. Its one-line pitch (from `metadata.json`):

> "A calm, literary Mandarin Chinese learning app combining short-form feed mechanics with real language acquisition and spaced repetition."

### Philosophy
- **Anti-gamification, anti-anxiety.** Onboarding copy states it directly: *"A calm place to acquire Mandarin. No slot machines, no stress."* There are no hearts, no lives, no loot boxes. The Stats page tagline is *"Honest metrics for real acquisition"* — the headline metric is **total input hours**, not XP.
- **Comprehensible-input pedagogy.** The core loop is reading real sentences (a TikTok-style one-item-at-a-time feed), reinforced by spaced-repetition flashcards and a tone-ear training minigame.
- **A finite daily session.** The feed *ends*. When the day's sentences run out, the app tells you to stop: *"You're done for today. Rest your mind. The ink is dry."*

### The Four Surfaces (bottom-nav tabs)
1. **Feed (流)** — one sentence at a time, tap-to-advance immersion reading.
2. **Learn (学)** — spaced-repetition flashcard reviews (Anki-style Again/Hard/Good/Easy).
3. **Dojo (练)** — "Tone Dojo," a 60-second tone-identification reflex game with score and combo.
4. **Stats (绩)** — progress: input hours, streak, known words, character mastery grid.

Plus: a 3-step **Onboarding** flow (shown once) and a **Settings** bottom-sheet modal (dark mode, pinyin toggle).

---

## 2. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **React 19** + TypeScript, Vite 6 | SPA, single `index.html`, entry `src/main.tsx` |
| Styling | **Tailwind CSS v4** (via `@tailwindcss/vite`) | Design tokens declared in CSS `@theme` block in `src/index.css` — no `tailwind.config.js` |
| Animation | **`motion/react`** (Framer Motion successor) | `AnimatePresence`, spring transitions, `layoutId` shared-layout indicator |
| Icons | **lucide-react** | Always wrapped in custom `SealIcon` / `BrushIcon` components (see §5.4) |
| Class utils | `clsx` + `tailwind-merge` via a `cn()` helper | |
| AI (scaffolded, unused so far) | `@google/genai` — Google AI Studio app template; expects `GEMINI_API_KEY` in `.env.local` | Intended for future sentence generation / TTS |
| Persistence | `localStorage` only (demo-level) | Keys: `xuexi_onboarded`, `xuexi_dark_mode`, `xuexi_show_pinyin` |

Run: `npm install && npm run dev` (Vite on port 3000).

### File map
```
index.html                 — bare shell, #root
src/main.tsx               — ReactDOM bootstrap
src/index.css              — fonts, @theme tokens, paper texture, .btn-seal / .btn-plaque / .stamp-icon
src/App.tsx                — root shell: onboarding gate, scroll-frame chrome, tab router, bottom nav
src/types.ts               — Tone, Word, Sentence, UserStats
src/data.ts                — COMMON_WORDS (12 words), INITIAL_SENTENCES (3 sentences)
src/utils.ts               — cn(), getToneColor(), getToneBorder(), getToneBg()
src/components/Onboarding.tsx    — 3-step intro
src/components/Feed.tsx          — sentence feed
src/components/Learn.tsx         — SRS flashcards
src/components/ToneDojo.tsx      — tone game
src/components/Stats.tsx         — progress dashboard
src/components/SettingsModal.tsx — bottom sheet
src/components/Icons.tsx         — SealIcon, BrushIcon, BrushFilter (SVG filters)
```

---

## 3. The Design Language: "Ink & Paper / Ancient Scroll"

This is the soul of the app. Every visual decision evokes **traditional Chinese calligraphy, rice paper, cinnabar seal stamps, and hanging scrolls**. If you rebuild the UI, this aesthetic is the thing to preserve or deliberately reinterpret.

### 3.1 Core metaphor: the app IS a hanging scroll
- The entire app is a **single centered column, `max-w-4xl`**, filling `100dvh`, with a heavy ambient shadow (`shadow-[0_0_50px_rgba(0,0,0,0.5)]`) so on desktop it looks like a lit scroll hanging against a dark room. On `md+` it gets thin vertical ink borders (`border-x border-ink-900/20`).
- **Wooden scroll rollers** cap the top and bottom of the viewport: two full-width 16px-tall (`h-4`) bars with wood-tone vertical gradients (light mode: `#8B5A2B → #CD853F` saddle-brown/peru; dark mode: `#3e2723 → #5d4037` espresso browns), a `border-b-2 border-black/30` edge and shadow, plus 12px-wide (`w-3`) darker **end-cap knobs** absolutely positioned at each side (`#D2691E → #8B5A2B` gradients with `border-black/40` separators). The top roller's gradient runs top-to-bottom; the bottom roller mirrors it (gradient-to-t, shadow cast upward). The "paper" content scrolls between these two rollers.
- Everything between the rollers sits on **textured rice paper**: warm off-white `#F4EEDF`, overlaid with a subtle inline-SVG `feTurbulence` fractal-noise grain (opacity 0.08 light / 0.04 dark) applied as a `background-image` data-URI on `body`.

### 3.2 Color tokens (Tailwind `@theme` variables)

**Paper (backgrounds):**
| Token | Hex | Use |
|---|---|---|
| `paper-50` | `#F4EEDF` | main background, light cards |
| `paper-100` | `#EBE3D0` | hover fills |
| `paper-200` | `#D8CEB9` | mid-tone fills, dark-mode body text |

**Ink (text/borders):**
| Token | Hex | Use |
|---|---|---|
| `ink-900` | `#0A0A0A` | headline hanzi, strongest text |
| `ink-800` | `#2A2A28` | body text |
| `ink-500` | `#7A7468` | muted/secondary text |
| `ink-primary` | `#B22222` | **Cinnabar seal red** — the accent. Active states, seals, buttons, progress |
| `ink-secondary` | `#8B0000` | dark-red used as the accent in dark mode |

**Dark mode palette (hardcoded hexes, class-based `.dark`):**
- Background `#1C1C19` (near-black warm charcoal), raised surfaces `#2A2A28` / `#2D2D26`, borders `#3A3A32` or `#7A7468`, light text `#E8E2D6`, muted `#8C8578`. Body text becomes `paper-200`.

**Tone colors** — a pedagogical system: every pinyin syllable is colored by its Mandarin tone, consistently everywhere (feed pinyin, flashcards, dojo buttons, onboarding):
| Tone | Contour | Text color | Pale bg (defined, lightly used) |
|---|---|---|---|
| 1 | high flat | `#2F67A8` blue | `#EBF4FF` |
| 2 | rising | `#276749` green | `#F0FFF4` |
| 3 | dipping | `#9A3412` burnt orange | `#FFF7ED` |
| 4 | falling | `#991B1B` red | `#FEF2F2` |
| 5 | neutral | `#8C8578` gray | `#FDFBF7` |

Helpers `getToneColor(tone)` / `getToneBorder(tone)` / `getToneBg(tone)` map tone number → `text-tone-N` / `border-tone-N` / `bg-bg-tone-N` classes.

Selection color: cinnabar red background with paper text (`selection:bg-ink-primary selection:text-paper-50`).

### 3.3 Typography
Google Fonts import: **Inter**, **Ma Shan Zheng**, **Noto Serif SC**, **Noto Sans SC**.

| Token | Stack | Role |
|---|---|---|
| `font-serif` (default on body) | Noto Serif SC | Nearly ALL UI text — labels, buttons, body. Gives the literary feel |
| `font-sans` | Inter + Noto Sans SC | **Hanzi display glyphs** (big characters use `font-sans font-medium` for clean strokes) and small technical text |
| `font-display` | **Ma Shan Zheng** (a real Chinese brush-calligraphy font) | Headings, scores, big numbers |

Recurring text idioms:
- Labels/buttons: `text-xs`–`text-sm`, `font-bold`, `uppercase`, `tracking-widest` (or `tracking-[0.2em]`) — like carved plaque inscriptions.
- Secondary copy is frequently *italic serif* ("Rest your mind. The ink is dry.").
- Giant hanzi: `text-[4.5rem]`–`text-[7rem]`, `font-sans font-medium leading-none`, `drop-shadow-sm`.
- Numbers use `tabular-nums`.

### 3.4 Shape language
- **Almost no rounded corners.** Everything is `rounded-sm` (2px) or `rounded-none` — woodblock/stamp geometry, never bubbly.
- **Double borders** (`border-4 border-double`) frame ceremonial elements (completion seal, dojo emblem, settings sheet top edge).
- **Rotated squares (45°)** serve as diamond emblems: the done-for-today seal and the Dojo intro emblem are squares rotated 45° with the icon counter-rotated inside; the nav active indicator is a tiny 6px diamond.
- Progress bars are **square-edged** (`rounded-none`) — the Stats bar even has a 1px inset padding inside a thin border, like an ink well.

### 3.5 Signature components (defined in `index.css` `@layer components`)

**`.btn-seal` — the primary button ("ancient seal"):**
Transparent background; `3px solid` cinnabar border; **double-frame effect** via two inset box-shadow rings (2px paper ring + 3px red ring inside the border — like the double-outline of a carved seal); serif, bold, uppercase, `tracking-[0.2em]`; generous padding `px-10 py-4`. A `::before` overlay adds a dotted-grain texture (radial-gradient dots at 4px grid, 10% opacity) like uneven stamp ink. **Hover inverts it**: solid cinnabar fill, paper text, rings swap. Active: `scale(0.98)`. Dark mode swaps cinnabar for `ink-secondary` dark red.

**`.btn-plaque` — the secondary/answer button ("wooden plaque"):**
Transparent, thin borders (`border-y-2 border-x` at 20% ink opacity), serif. Its trick: **corner brackets** — `::before`/`::after` draw 12px L-shaped cinnabar corner marks (top-left ┏ and bottom-right ┛) that fade in on hover, plus a faint ink-wash background tint (`bg-ink-900/5`). Used for the SRS rating grid and Dojo tone answers, tinted per tone color.

**`.stamp-icon` — the seal-stamp icon chip:**
A bordered chip around a lucide icon: `3px` cinnabar border with **deliberately irregular border-radius** (`6px 3px 6px 4px / 3px 6px 4px 6px`) to look hand-carved, a dotted grain overlay (`::after`, 2px dot grid at 20%), cinnabar icon color.

### 3.6 SVG ink filters — the hand-made texture layer
A hidden `<svg>` (`BrushFilter`, rendered once at app root and on onboarding) defines two filters applied via `style={{ filter: 'url(#...)' }}`:

- **`#brush-stroke`**: `feTurbulence` (fractalNoise, baseFrequency 0.08, 3 octaves) → `feDisplacementMap` (scale 2.5) → slight `feGaussianBlur` (0.3) merged back. Makes icon strokes wobble like brush-drawn lines. Used by `BrushIcon`.
- **`#ink-bleed`**: finer turbulence (baseFrequency 0.4, 4 octaves) → displacement (1.5) → a color-matrix/composite pass that eats speckles out of edges → blur+merge. Makes edges look like ink soaked into paper. Used by `SealIcon`.

**Icon components:**
- `SealIcon({icon, size, className})` — lucide icon inside a `.stamp-icon` chip, rotated `-2deg` (imperfect hand-stamp), with `#ink-bleed`. Used for chrome icons: settings, volume, close, stat icons, checkmark.
- `BrushIcon({icon, size})` — bare lucide icon with `#brush-stroke` only. Used inline in buttons (arrow, play, eye, sun/moon, type, check).

### 3.7 Motion vocabulary
- **Tab switches**: `AnimatePresence mode="wait"` — old view exits fully before new enters.
- **Feed card advance**: spring (`stiffness 300, damping 30`), enter from `y:+100` faded, exit to `y:-100` — vertical TikTok-style flow.
- **Flashcards**: horizontal slide (enter `x:+20`, exit `x:-20`).
- **Onboarding steps**: gentle vertical fade (`y:20→0`, exit `y:-20`); tone rows stagger in (`delay: i * 0.15`, from `x:-20`).
- **Nav active dot**: `motion.div layoutId="nav-indicator"` — the diamond *glides* between tabs (shared layout animation).
- **Settings sheet**: backdrop fades; sheet slides up from `y:+100`.
- **Combo popup**: keyed on combo count, pops in with `scale 0.8→1`.
- Micro-interactions: hanzi `hover:scale-105`; big buttons `active:scale-95`; timer ≤10s turns tone-4 red and pulses; "Tap anywhere to continue" hint uses `animate-pulse`.
- Dark-mode toggle cross-fades via `transition-colors duration-300` on the shell.

---

## 4. Application Shell & State (`App.tsx`)

- State: `hasOnboarded`, `activeTab: 'feed' | 'learn' | 'dojo' | 'stats'`, `darkMode`, `showPinyin`, `isSettingsOpen`.
- On mount, hydrates from localStorage. Dark mode toggles the `dark` class on `<html>` (Tailwind class strategy).
- If not onboarded → render only `<Onboarding>` (+ the SVG filter defs). Completing sets `xuexi_onboarded`.
- Otherwise, the scroll layout, top to bottom:
  1. **Top wooden roller** (h-4, z-50, described in §3.1)
  2. **Content area** — `flex-1 overflow-y-auto`, hosts the active tab inside `AnimatePresence mode="wait"`
  3. **Bottom nav** — `h-20`, translucent paper (`bg-paper-50/90 backdrop-blur-lg`), `border-t-2` faint ink line, 4 evenly spaced items
  4. **Bottom wooden roller** (h-4)
- The Settings modal overlays inside this container (`absolute` positioning, so it stays within the scroll's width).

**Nav items** are vertical stacks: a **Chinese character as the icon** (`text-2xl font-sans`: 流 Feed, 学 Learn, 练 Dojo, 绩 Stats), then a 6px **cinnabar diamond** active indicator (`w-1.5 h-1.5 rotate-45`, animated with `layoutId`), then a 10px uppercase tracking-widest English label. Active = cinnabar text (light) / warm white `#E8E2D6` (dark); inactive = `ink-500`, hover shifts toward accent.

---

## 5. Screens, in Detail

### 5.1 Onboarding (3 steps, `AnimatePresence mode="wait"`)

**Step 1 — Welcome.** Centered column: giant `学习` (text-4xl serif bold, tracking-widest), beneath it `xué xí` in small uppercase letter-spaced sans; the pitch line ("A calm place to acquire Mandarin. No slot machines, no stress."); one `.btn-seal` **"Begin"** with a brush-filtered ArrowRight.

**Step 2 — The Four Tones.** Top-aligned (`pt-24`): Ma-Shan-Zheng heading "The Four Tones", sans subtitle "Pitch changes everything." Then four cards staggering in from the left, one per tone, using the classic **mā 妈 / má 麻 / mǎ 马 / mà 骂** (mother/hemp/horse/scold) demo. Each card: paper surface, `border-2` faint ink, `rounded-sm`; a `text-[2.5rem]` hanzi tinted its tone color; pinyin bold in tone color + `/ contour description`; `means "…"` line; a small SealIcon volume button on the right. Full-width `.btn-seal` **"I understand"** pinned at the bottom.

**Step 3 — First sentence.** Centered, scales in softly: `我很好` at text-6xl (我 in ink-900, 很/好 in cinnabar), `wǒ hěn hǎo` beneath, then italic *"I am very good."* Copy: "You just read your first Chinese sentence. Let's build on that." Full-width `.btn-seal` **"Enter the Studio"** completes onboarding.

### 5.2 Feed (tab 流) — the core experience
- **Header** (absolute, floats over content, pointer-events-none except the button):
  - Left: **segmented progress ticks** — one `h-2 w-8` square-edged bar per sentence: done = solid cinnabar; current = 20% cinnabar fill with 50% border; upcoming = transparent with faint border.
  - Right: settings button — a SealIcon Settings2 chip on a translucent blurred paper square.
- **Body**: one sentence fills the screen, centered. The **entire surface is the tap target** to advance. Layout per sentence:
  - A wrapping row of word columns (`gap-x-2 gap-y-6`): each word is pinyin on top (`text-sm bold tracking-widest`, **colored by tone**, hidden via `opacity-0` when pinyin toggle is off — layout doesn't shift) above its hanzi at **`text-[4.5rem]`** (md: `5.5rem`), near-black, `hover:scale-105`.
  - **Hover gloss tooltip** per word: dark ink chip (`bg-ink-800`, paper text, tracking-widest serif, `rounded-sm`) with the English meaning, fading in below the character.
  - Below: the full English translation, `text-xl` italic serif muted.
  - An audio button: SealIcon Volume2 on a bordered paper square (playback not wired yet).
  - Pinned near the bottom: pulsing hint `TAP ANYWHERE TO CONTINUE` (uppercase, tracking-widest, ink-500).
- **Card transition**: spring slide-up (see §3.7), `AnimatePresence mode="popLayout"`.
- **End state** (after the 3rd sentence): a **diamond seal** — 96px square, `border-4 border-double` cinnabar, rotated 45°, containing a counter-rotated ink-bleed Check icon — with the Ma Shan Zheng heading **"You're done for today."** and italic *"Rest your mind. The ink is dry."* No button. The session is over on purpose.

### 5.3 Learn (tab 学) — spaced repetition
- Header row: `REVIEWS` in Ma Shan Zheng uppercase tracking-widest; right, a bordered counter chip `{n} / 12`.
- Center: the current word's hanzi, enormous (`text-[7rem]`). Under it, the **answer block** (pinyin in tone color at text-2xl + italic meaning) which is always in the DOM but hidden (`opacity-0 translate-y-4`), floating up smoothly on reveal.
- Fixed-height (`h-32`) bottom control zone:
  - Unrevealed: full-width `.btn-seal` **"Show Answer"** with a brush Eye icon.
  - Revealed: a `grid-cols-4` of `.btn-plaque` rating buttons — **Again / Hard / Good / Easy** — colored by *tone colors semantically repurposed as severity*: Again = tone-4 red, Hard = tone-3 orange, Good = tone-2 green, Easy = tone-1 blue. Hover floods each with its color, corner brackets appear.
- Rating hides the answer and slides in the next card (cycling through the 12 words; no real SRS scheduling yet).

### 5.4 Tone Dojo (tab 练) — the ear-training game
- **Intro screen**: a 96px diamond (double-bordered, gray `ink-500`, rotated 45°) holding a counter-rotated Volume2 seal; heading **"Tone Dojo"** (Ma Shan Zheng, text-3xl); italic brief *"Listen to the syllable. Identify the tone. 60 seconds to prove your ear."*; `.btn-seal` **"Start Training"** with brush Play icon.
- **Playing state**:
  - Header: left `SCORE` label + big Ma-Shan-Zheng tabular number; right `TIME` as `0:SS` — at ≤10s it turns tone-4 red and pulses.
  - Center: a large **128px play-audio tile** (paper surface, shadow-lg, faint border, containing a big Volume2 SealIcon; `hover:scale-105 active:scale-95`). Audio itself is not wired — the target tone is random.
  - Combo ≥3 pops a cinnabar `"{n}x Combo!"` in brush font above center, re-animating on every increment.
  - Bottom: `grid-cols-2` of four tall `.btn-plaque` answer tiles (h-24, md:h-32), each border-tinted its tone color, labeled **"Tone N"** in Ma Shan Zheng tone color plus a tiny uppercase contour word (*flat / rising / dipping / falling*).
  - Scoring: correct = `+10 + combo×2`, combo++; wrong = combo resets; always advances. At 0s the game stops (currently returns to intro; no results screen yet).

### 5.5 Stats (tab 绩)
- Header: **"Progress"** (Ma Shan Zheng text-3xl) + italic *"Honest metrics for real acquisition."*
- **Hero card — Total Input** (the philosophical centerpiece): full-width **dark ink card** (`bg-ink-900`, paper text, sharp corners) with a soft white blur-glow circle in its top-right corner; a Clock SealIcon + `TOTAL INPUT` label; a giant `42.5` (Ma Shan Zheng, text-6xl, tabular, tracking-tighter) + "hours"; a thin square-edged progress bar (white 20% border frame, 1px inner padding, cinnabar fill at 42%) with right-aligned italic *"Next milestone: 100h"*.
- **Stat cards** (2-col grid, 4-col on md): paper cards with `border-2` faint ink — **Streak: 12 days** (Flame seal) and **Known: 184 words** (Brain seal). Layout: icon+uppercase label row, then big Ma-Shan-Zheng value with small italic unit.
- **Character Mastery**: a `grid-cols-6` of 24 square tiles, each showing a common hanzi (我的是在不了 repeating). Fill encodes mastery (currently `Math.random()` placeholder): >0.8 = solid cinnabar with paper text; >0.4 = `paper-200`; else transparent, all with thin ink borders. Reads like a seal-stamp collection sheet.
- All data on this screen is **hardcoded/demo**.

### 5.6 Settings (bottom-sheet modal)
- Backdrop: `bg-black/40 backdrop-blur-sm`, click to dismiss; sheet springs up from the bottom, pinned to the container (mobile full-width; md: centered `max-w-md`). Distinctive edge: **`border-t-4 border-double`** (plus double side borders on md) — the sheet looks like a folded paper card.
- Header: `SETTINGS` (Ma Shan Zheng uppercase tracking-widest) + a SealIcon X close chip.
- Two setting rows (paper cards, faint `border-2`): each has a bordered icon chip (BrushIcon Sun/Moon, or Type), a bold tracking-widest title with an italic subtitle ("Toggle dark mode" / "Show pronunciation above characters"), and a **custom square checkbox** — 32px `rounded-sm` box: checked = cinnabar fill with white brush Check; unchecked = transparent with gray border and invisible check.

---

## 6. Data Model (`types.ts`, `data.ts`)

```ts
type Tone = 1 | 2 | 3 | 4 | 5;

interface Word     { id: string; hanzi: string; pinyin: string; meaning: string; tone: Tone; }
interface Sentence { id: string; hanzi: string; pinyin: string; english: string; words: Word[]; }
interface UserStats { xp: number; level: number; streak: number; inputHours: number; knownWords: number; } // declared, not yet used
```

Seed content: `COMMON_WORDS` — 12 HSK-1-ish words keyed by pinyin (我 很 好 是 学 习 妈 麻 马 骂 中 文); `INITIAL_SENTENCES` — 3 sentences (我很好。/ 我学习中文。/ 他是好人。) whose `words` arrays reference the shared word objects (plus inline 他 and 人).

---

## 7. Current State & Known Gaps (honest inventory for the rebuilder)

- **Audio is not implemented** — every Volume2 button is decorative; Tone Dojo picks a random tone with no sound to identify.
- **No real SRS** — Learn cycles words in order; ratings all do the same thing; the `{n}/12` counter can exceed 12.
- **Stats are hardcoded** (42.5h, 12-day streak, 184 words) and the mastery grid re-randomizes every render.
- **Gemini integration is scaffolded but unused** (`@google/genai` dependency, `GEMINI_API_KEY` env, AI Studio metadata) — the clear intent is AI-generated sentences and/or TTS.
- Feed content is 3 static sentences; "done for today" is simply the end of that array.
- Only onboarding-completion, dark mode, and pinyin visibility persist.

---

## 8. Design-Intent Summary (the brief, if you keep nothing else)

Rebuild a **mobile-first, single-column Mandarin immersion app that feels like reading a hanging scroll of rice paper**, top and bottom capped by wooden rollers. Warm paper `#F4EEDF` with fractal-noise grain; near-black ink text; **cinnabar red `#B22222`** as the only true accent, used like a seal stamp. Serif (Noto Serif SC) for almost everything, brush calligraphy (Ma Shan Zheng) for headings and numbers, clean sans for the giant hanzi. Sharp corners, double borders, 45°-rotated diamond emblems, corner-bracket hover states, buttons styled as carved seals and wooden plaques, icons roughened by SVG turbulence filters so nothing looks machine-perfect. Every pinyin syllable color-coded by tone (blue/green/orange/red/gray). Motion is calm and springy: vertical card flow in the feed, a gliding diamond under the active nav tab, staggered reveals. Dark mode is a **night-ink** inversion (`#1C1C19` charcoal, dark-red `#8B0000` accent) — same warmth, lamp-lit. And the tone of voice throughout is quiet and literary: the app *ends* your session ("The ink is dry") instead of begging you to continue.
