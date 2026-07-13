# How to Rebuild the xuéxí UI/UX

> **What this document is.** `PROJECT_SPEC.md` describes *what* the finished app looks like, screen by screen. This guide tells you *in what order to build it and how* — phased steps, concrete code recipes, and a checkpoint at the end of each phase so you can verify you're on track before moving on. Follow the phases in order: each one is a foundation the next depends on.

---

## 0. How to use this guide

### The two tracks

The design system is stack-agnostic; the recipes are not. Every recipe below is given in up to two flavors:

- **Track A — Web (the spec's stack):** React + Vite + **Tailwind CSS v4** (`@theme` tokens in CSS, component classes in `@layer components`), animation via `motion/react`, icons via `lucide-react`. This is the stack `PROJECT_SPEC.md` was written for, and CSS gives you the full effect set (pseudo-elements, SVG filters, hover states).
- **Track B — React Native / Expo (this repo's stack):** Expo + expo-router + Reanimated + `lucide-react-native`. RN has **no CSS pseudo-elements, no hover, and no `filter: url()` on native** — so several signature effects need component-level workarounds. This repo has already solved them; Track B recipes cite the real files (`src/theme.ts`, `src/components/ui.tsx`, `src/components/ScrollRoller.tsx`, `src/components/StampIcon.tsx`, `src/components/DiamondSeal.tsx`, `app/(tabs)/_layout.tsx`) so you can copy the pattern instead of reinventing it.

**Which track?** Building a fresh web app → Track A. Working in this repo, or targeting iOS/Android → Track B. Either way, read the stack-agnostic part of each phase first — that's the part you must not get wrong.

### The one-paragraph brief

If you keep nothing else (condensed from spec §8): a **mobile-first, single-column Mandarin immersion app that feels like reading a hanging scroll of rice paper**, capped top and bottom by wooden rollers. Warm paper `#F4EEDF` with fractal-noise grain; near-black ink text; **cinnabar red `#B22222` as the only true accent**, used like a seal stamp. Serif (Noto Serif SC) for almost everything; brush calligraphy (Ma Shan Zheng) for headings and big numbers; clean sans for giant hanzi. Sharp corners, double borders, 45°-rotated diamonds, corner-bracket hovers, buttons styled as carved seals and wooden plaques, icons roughened by SVG turbulence so nothing looks machine-perfect. Every pinyin syllable color-coded by tone. Calm springy motion. Dark mode is a lamp-lit "night ink" inversion. The voice is quiet and literary — the app *ends* your session ("The ink is dry") instead of begging you to continue.

---

## Phase 0 — Foundation (the non-negotiables)

Do this before writing a single screen. If the tokens, fonts, and shape rules are right, everything downstream inherits the aesthetic for free; if they're wrong, no amount of screen work saves it.

### 0.1 Color tokens

**Paper (backgrounds):**

| Token | Hex | Use |
|---|---|---|
| `paper-50` | `#F4EEDF` | main background, light cards |
| `paper-100` | `#EBE3D0` | hover fills |
| `paper-200` | `#D8CEB9` | mid-tone fills; body text in dark mode |

**Ink (text/borders/accent):**

| Token | Hex | Use |
|---|---|---|
| `ink-900` | `#0A0A0A` | headline hanzi, strongest text |
| `ink-800` | `#2A2A28` | body text |
| `ink-500` | `#7A7468` | muted/secondary text |
| `ink-primary` | `#B22222` | **cinnabar seal red — the only accent.** Active states, seals, buttons, progress |
| `ink-secondary` | `#8B0000` | dark red; the accent in dark mode |

**Dark mode ("night ink"):** background `#1C1C19` (warm charcoal — never pure black), raised surfaces `#2A2A28` / `#2D2D26`, borders `#3A3A32` or `#7A7468`, light text `#E8E2D6`, muted `#8C8578`. Same warmth as light mode, just lamp-lit.

**Tone colors** — a pedagogical system, not decoration. Every pinyin syllable, everywhere in the app, is colored by its Mandarin tone:

| Tone | Contour | Text | Pale bg |
|---|---|---|---|
| 1 | high flat | `#2F67A8` blue | `#EBF4FF` |
| 2 | rising | `#276749` green | `#F0FFF4` |
| 3 | dipping | `#9A3412` burnt orange | `#FFF7ED` |
| 4 | falling | `#991B1B` red | `#FEF2F2` |
| 5 | neutral | `#8C8578` gray | `#FDFBF7` |

Selection color: cinnabar background, paper text.

**Track A recipe** — declare everything as Tailwind v4 `@theme` variables in your main CSS (no `tailwind.config.js`):

```css
@import "tailwindcss";

@theme {
  --color-paper-50: #F4EEDF;
  --color-paper-100: #EBE3D0;
  --color-paper-200: #D8CEB9;
  --color-ink-900: #0A0A0A;
  --color-ink-800: #2A2A28;
  --color-ink-500: #7A7468;
  --color-ink-primary: #B22222;
  --color-ink-secondary: #8B0000;
  --color-tone-1: #2F67A8;
  --color-tone-2: #276749;
  --color-tone-3: #9A3412;
  --color-tone-4: #991B1B;
  --color-tone-5: #8C8578;
  --color-bg-tone-1: #EBF4FF;
  --color-bg-tone-2: #F0FFF4;
  --color-bg-tone-3: #FFF7ED;
  --color-bg-tone-4: #FEF2F2;
  --color-bg-tone-5: #FDFBF7;
}
```

Dark mode is class-based (`.dark` on `<html>`); dark hexes are applied via `dark:` utilities or hardcoded values (spec does it with hardcoded hexes).

**Track B recipe** — a single `ThemeColors` interface with two palettes, resolved per render by a `useTheme()` hook. This is exactly `src/theme.ts` (`lightColors` / `darkColors`) + `src/lib/appearance.ts` in this repo. Two Track B lessons worth stealing even on web:

1. **Contrast-gate the palette.** The repo darkens light-mode muted text to `#5E5648` and brightens dark-mode cinnabar to `#E24A4A` because the spec hexes fail WCAG AA in those contexts — and a Jest test (`theme.contrast.test.ts`) asserts AA for every documented pairing so regressions fail CI.
2. **One tone-color helper as the single source of truth** (see §2.5).

### 0.2 Typography

Load four Google fonts: **Inter**, **Ma Shan Zheng**, **Noto Serif SC**, **Noto Sans SC**.

| Role | Stack | Used for |
|---|---|---|
| `font-serif` (**the default**, on `body`) | Noto Serif SC | Nearly ALL UI text — labels, buttons, body. This is what makes it feel literary |
| `font-sans` | Inter + Noto Sans SC | **Giant display hanzi** (`font-sans font-medium` for clean strokes) and small technical text |
| `font-display` | Ma Shan Zheng | Headings, scores, big numbers — real Chinese brush calligraphy |

Recurring text idioms — apply these consistently, they're half the aesthetic:

- **Plaque inscriptions:** labels and buttons are `text-xs`–`text-sm`, bold, `uppercase`, `tracking-widest` (or `tracking-[0.2em]`).
- **Literary asides:** secondary copy is *italic serif* ("Rest your mind. The ink is dry.").
- **Giant hanzi:** `text-[4.5rem]`–`text-[7rem]`, `font-sans font-medium leading-none`, `drop-shadow-sm`.
- **Numbers:** always `tabular-nums`.

> ⚠️ **Legibility deviation (Track B, deliberate).** This repo restricts Ma Shan Zheng to **decorative hanzi wordmarks only** (the 学习 logo) and uses Noto Serif SC for headings and numerals — Ma Shan Zheng is a Chinese-only brush font with poor Latin coverage and low small-size legibility. If you rebuild, decide up front which side you take: spec-faithful (brush headings everywhere) or repo-pragmatic (brush for wordmarks only). Don't mix.

Track A: `<link>` the Google Fonts CSS and map families in `@theme` (`--font-serif`, `--font-sans`, `--font-display`). Track B: `@expo-google-fonts/*` packages loaded with `useFonts()` in the root layout; weights are baked into family names (`NotoSerifSC_500Medium`) because RN ignores numeric `fontWeight` for custom fonts — see the `fonts` object in `src/theme.ts`.

### 0.3 Shape rules

Memorize these; they apply to every element you'll ever draw:

1. **Almost no rounded corners.** `rounded-sm` (2px) or `rounded-none`. Woodblock/stamp geometry, never bubbly. (Track B: `radius = { sm: 2, md: 4, lg: 6 }` in `src/theme.ts`; `pill` exists only for genuinely circular things.)
2. **Double borders** (`border-4 border-double`, or an outer border + gap + inner border) frame ceremonial elements: completion seal, dojo emblem, settings sheet edge.
3. **45°-rotated squares** are the emblem shape: diamond seals (icon counter-rotated inside), and the tiny 6px nav active indicator.
4. **Progress bars are square-edged**, sometimes with a 1px inset padding inside a thin border — like an ink well.
5. **Nothing machine-perfect:** icon chips get irregular border-radii and a −2° rotation; icon strokes get turbulence filters (Phase 2).

### 0.4 Paper texture

The background is not flat — it's rice paper. An inline-SVG `feTurbulence` fractal-noise grain tiled over the paper color, opacity **0.08 light / 0.04 dark**.

**Track A / web:** set it as a `background-image` data-URI on `body`:

```css
body {
  background-color: var(--color-paper-50);
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E");
}
```

**Track B:** the exact generator lives in this repo as `PAPER_TEXTURE_URI(dark)` in `src/components/StampIcon.tsx` — applied to the web build's page background. On native there's no CSS background-image; either skip the grain (the warm hex carries most of the feel) or overlay a pre-rendered noise PNG / `react-native-svg` rect at low opacity.

### ✅ Phase 0 checkpoint

Render one empty screen: warm `#F4EEDF` grained background, one line of serif body text in `#2A2A28`, one uppercase tracking-widest label, one hanzi at 4.5rem in near-black sans. Toggle dark mode: warm charcoal, warm off-white text. **It should already "feel like rice paper" with zero components built.** If it feels like a default web page with a beige background, fix the fonts and grain before continuing.

---

## Phase 1 — The scroll shell

The app IS a hanging scroll. Build the frame before any content.

### 1.1 Structure (stack-agnostic)

Top to bottom, filling `100dvh`:

1. **Top wooden roller** — full-width bar, ~14–16px tall
2. **Content area** — `flex-1`, scrollable, hosts the active tab
3. **Bottom nav** — ~80px, translucent paper, 4 items
4. **Bottom wooden roller** — mirror of the top one

The whole thing is a **single centered column, `max-w-4xl`**, with a heavy ambient shadow (`shadow-[0_0_50px_rgba(0,0,0,0.5)]`) so on desktop it reads as a lit scroll hanging in a dark room; at `md+` add thin vertical ink borders (`border-x border-ink-900/20`).

### 1.2 The wooden rollers

Each roller: a vertical wood-tone gradient bar with darker **end-cap knobs** (~10–12px wide) at each side, and a 2px `black/30` border on the edge facing the paper. The gradient's dark side faces **outward** (up on the top roller, down on the bottom) — cylinder shading.

Wood tones: light mode `#8B5A2B → #CD853F` (edge → face), caps `#D2691E → #8B5A2B` with `black/40` separators; dark mode `#3e2723 → #5d4037` espresso.

**Track A:** two divs, `h-4 z-50`, `bg-gradient-to-b` (top) / `bg-gradient-to-t` (bottom), `border-b-2 border-black/30` + shadow, absolute-positioned `w-3` cap divs.

**Track B:** copy `src/components/ScrollRoller.tsx` — an `react-native-svg` `<LinearGradient>` rect (HEIGHT 14, CAP_WIDTH 10, wood constants for both schemes), `pointerEvents="none"` and hidden from assistive tech (it's pure decoration). Mounted above and below the `<Tabs>` in `app/(tabs)/_layout.tsx`, with the wrapper absorbing the safe-area insets so the rollers hug the visible screen edges.

### 1.3 Bottom nav

Translucent paper (`bg-paper-50/90 backdrop-blur-lg`), `border-t-2` faint ink line, 4 evenly spaced items. Each item is a vertical stack:

1. **A Chinese character as the icon** (`text-2xl`): 流 Feed, 学 Learn, 练 Dojo, 绩 Stats
2. A **6px cinnabar diamond** under the active tab (`w-1.5 h-1.5 rotate-45`)
3. A 10px uppercase tracking-widest English label

Active = cinnabar (light) / warm white `#E8E2D6` (dark); inactive = `ink-500`.

**Track A:** the diamond is a `motion.div layoutId="nav-indicator"` so it *glides* between tabs (shared-layout animation). Tab content switches inside `AnimatePresence mode="wait"` — old view fully exits before the new enters.

**Track B:** expo-router `<Tabs>` with a custom `tabBarIcon` — see `TabIcon` in `app/(tabs)/_layout.tsx` (serif hanzi glyph + a 6×6 `rotate: '45deg'` view when focused). The glide animation is skipped; the diamond simply appears under the focused tab. Serif uppercase `tabBarLabelStyle`, `letterSpacing: 1.5`.

### ✅ Phase 1 checkpoint

An empty scroll: wooden rollers top and bottom, grained paper between them, four hanzi tabs that switch (empty) views, diamond indicator moving with the active tab. On a wide window, the column is centered with dark space and a glow-shadow around it. Dark-mode toggle swaps to espresso rollers and charcoal paper.

---

## Phase 2 — Signature components

Build these **before any screen** — every screen is assembled from them.

### 2.1 The seal button (primary CTA)

*Intent:* a carved cinnabar seal, stamped on press.

Anatomy: transparent background; thick (~3px) cinnabar border; **double-frame** — a paper-colored gap then a thin inner cinnabar line (the double outline of a carved chop); serif, bold, uppercase, `tracking-[0.2em]`; generous padding. **Press/hover inverts it:** solid cinnabar fill, paper-colored text and inner line — like fresh seal paste. Active: scale 0.98. Dark mode swaps cinnabar for `#8B0000`.

**Track A** (`.btn-seal` in `@layer components`):

```css
.btn-seal {
  @apply relative bg-transparent font-serif font-bold uppercase tracking-[0.2em]
         px-10 py-4 rounded-sm text-ink-primary transition-all;
  border: 3px solid var(--color-ink-primary);
  /* double frame: paper ring + red ring inside the border */
  box-shadow: inset 0 0 0 2px var(--color-paper-50),
              inset 0 0 0 3px var(--color-ink-primary);
}
.btn-seal::before {           /* uneven stamp-ink grain */
  content: '';
  @apply absolute inset-0 pointer-events-none opacity-10;
  background-image: radial-gradient(currentColor 1px, transparent 1px);
  background-size: 4px 4px;
}
.btn-seal:hover {
  @apply bg-ink-primary text-paper-50;
  box-shadow: inset 0 0 0 2px var(--color-ink-primary),
              inset 0 0 0 3px var(--color-paper-50);
}
.btn-seal:active { transform: scale(0.98); }
```

**Track B:** `Button variant="seal"` in `src/components/ui.tsx` — outer `Pressable` with `borderWidth: 2.5` + `padding: 3` (the paper gap), inner `View` with `borderWidth: 1.5`, serif label with `letterSpacing: 3`, colors flipping to `onPrimary` while pressed. The dotted-grain `::before` has no RN equivalent and is omitted — acceptable loss.

### 2.2 The plaque button (secondary / answer choices)

*Intent:* an engraved wooden plaque. Used for SRS ratings and Dojo tone answers, tinted per tone color.

Anatomy: transparent; strong top/bottom rules with hairline sides (`border-y-2 border-x` at ~20% ink opacity); serif label. Signature move: **corner brackets** — 12px L-shaped cinnabar marks at top-left ┏ and bottom-right ┛ — plus a faint ink-wash tint on hover/press.

**Track A** (`.btn-plaque`): base styles on the class; brackets via `::before` (top-left, `border-t-2 border-l-2`) and `::after` (bottom-right, `border-b-2 border-r-2`), `opacity-0` → `opacity-100` on hover; hover also adds `bg-ink-900/5`.

**Track B:** `PlaqueButton` + `PlaqueCorners` in `src/components/ui.tsx`. `PlaqueCorners` is the pseudo-element replacement: two absolutely-positioned 12px views with two borders each, dropped inside any relatively-positioned container. No hover on touch — the brackets render always, and press applies a `${color}1A` (10%) wash + 0.97 scale instead.

### 2.3 The stamp icon chip

*Intent:* a hand-pressed seal around a lucide icon. Used for all chrome icons (settings, volume, close, stat icons, checkmarks).

Anatomy: ~2–3px cinnabar border with **deliberately irregular corner radii** — e.g. `6px 3px 6px 4px / 3px 6px 4px 6px` (web) or per-corner `6 / 2 / 6 / 4` (RN) — rotated **−2°**, icon in cinnabar, plus a dotted-grain overlay on web (`::after`, 2px dot grid at 20% opacity) and the `#ink-bleed` filter (§2.6).

**Track A:** `.stamp-icon` class + a `SealIcon({icon, size})` wrapper component applying `style={{ filter: 'url(#ink-bleed)' }}`.

**Track B:** `src/components/StampIcon.tsx` — per-corner radii from the `radius` scale, `transform: [{ rotate: '-2deg' }]`, and the filter applied **web-only** behind a `Platform.OS === 'web'` guard (native silently renders clean lines).

### 2.4 The diamond seal emblem

*Intent:* the ceremonial "chop" pressed at completion moments.

Anatomy: a square (~88–96px) rotated 45°, **double border** (thick outer + gap + thin inner, or `border-4 border-double`), a **counter-rotated** icon centered inside, in cinnabar (or `ink-500` gray for the Dojo intro's dormant state).

**Track A:** nested divs — outer `rotate-45 border-4 border-double border-ink-primary rounded-sm`, inner icon wrapper `-rotate-45`.

**Track B:** `src/components/DiamondSeal.tsx`. Note its one subtlety, which you must reproduce in any stack: a rotated square's diagonal overhangs its layout box, so the component reserves `size × 1.45` and centers the rotated square inside — otherwise the diamond's points clip.

### 2.5 The tone-color helper

One function family, used by *everything* that renders pinyin, tone buttons, or tone-tinted ratings — never inline tone hexes at call sites.

**Track A** (spec's `src/utils.ts`): `getToneColor(tone)` → `text-tone-N`, `getToneBorder(tone)` → `border-tone-N`, `getToneBg(tone)` → `bg-bg-tone-N`, plus `cn()` (clsx + tailwind-merge).

**Track B:** `toneColorOf(colors, tone)` in `src/theme.ts` (palette-aware, falls back to `textDim` for tone 5) and the shared `TONE_NAMES` labels.

### 2.6 The SVG ink filters

The hand-made texture layer. A hidden `<svg>` defines two filters, referenced by id:

```html
<svg aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">
  <filter id="brush-stroke" x="-20%" y="-20%" width="140%" height="140%">
    <feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="3" result="noise"/>
    <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.5"
                       xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <filter id="ink-bleed" x="-20%" y="-20%" width="140%" height="140%">
    <feTurbulence type="fractalNoise" baseFrequency="0.4" numOctaves="4" result="noise"/>
    <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5"
                       xChannelSelector="R" yChannelSelector="G" result="displaced"/>
    <feGaussianBlur stdDeviation="0.2" in="displaced"/>
  </filter>
</svg>
```

- **`#brush-stroke`** — coarse wobble; apply to bare inline icons (`BrushIcon`) so strokes look brush-drawn.
- **`#ink-bleed`** — fine edge-eating distortion; apply to stamp chips and diamond seals so edges look soaked into paper.

Render the defs **once** at app root (and again on onboarding if it renders outside the shell). Track B: `BrushFilter()` in `src/components/StampIcon.tsx` injects this markup into `document.body` on web and is a no-op on native.

### ✅ Phase 2 checkpoint

A throwaway gallery screen showing: seal button (idle + hovered/pressed), four plaque buttons tinted tones 1–4 with brackets, a row of stamp icon chips (each slightly tilted, edges subtly rough on web), a cinnabar diamond seal with a check inside, and a line of pinyin syllables each colored by tone. Every corner sharp; the only colors on screen: paper, ink, cinnabar, the four tone colors.

---

## Phase 3 — Screens, in build order

Order: **Onboarding → Feed → Learn → Dojo → Stats → Settings.** Feed is the soul; Onboarding first because it's simplest and exercises every primitive. All exact copy strings are collected in the Voice appendix (§5) — use them verbatim.

For each screen the spec (§5) is the authority on layout; below is the build skeleton, the motion, and an acceptance checklist.

### 3.1 Onboarding (3 steps, `AnimatePresence mode="wait"`)

1. **Welcome** — centered: 学习 (text-4xl serif bold tracking-widest) over `xué xí` in small letter-spaced sans; the pitch line; one seal button **"Begin"** with a brush-filtered ArrowRight.
2. **The Four Tones** — top-aligned: display heading "The Four Tones", subtitle "Pitch changes everything." Four cards stagger in from the left (`delay: i * 0.15`, from `x:-20`), one per tone, using **mā 妈 / má 麻 / mǎ 马 / mà 骂**. Each card: paper surface, faint `border-2`, `rounded-sm`; hanzi at 2.5rem in its tone color; bold pinyin in tone color + `/ contour`; `means "…"`; a stamp-icon volume button. Full-width seal button **"I understand"** at the bottom.
3. **First sentence** — centered, scales in softly: 我很好 at text-6xl (我 ink-900, 很/好 cinnabar), `wǒ hěn hǎo`, italic *"I am very good."*, then the copy line. Full-width seal button **"Enter the Studio"** completes onboarding (persist the flag).

Steps transition with a gentle vertical fade (`y:20→0` in, exit `y:-20`).

**Accept when:** stepping through never shows two steps at once; tone cards stagger; completing onboarding persists (reload skips straight to the app).

### 3.2 Feed (流) — build this one with the most care

- **Header** (absolute, floats over content; `pointer-events-none` except its button):
  - Left: **segmented progress ticks** — one `h-2 w-8` square bar per sentence. Done = solid cinnabar; current = 20% cinnabar fill, 50% border; upcoming = transparent, faint border.
  - Right: a Settings2 stamp icon on a translucent blurred paper square.
- **Body** — one sentence fills the screen, centered; **the entire surface is the tap target** to advance:
  - A wrapping row of word columns (`gap-x-2 gap-y-6`): pinyin on top (`text-sm` bold tracking-widest, **tone-colored**) above hanzi at `text-[4.5rem]` (md: `5.5rem`), near-black, `hover:scale-105`.
  - **Pinyin toggle hides via `opacity-0`, not `display:none`** — layout must not shift.
  - Per-word hover gloss: dark ink chip (`bg-ink-800`, paper text, tracking-widest serif, `rounded-sm`) with the English meaning, fading in below the character.
  - Below: full English translation, `text-xl` italic serif muted; then a Volume2 stamp-icon audio button.
  - Pinned near the bottom: pulsing `TAP ANYWHERE TO CONTINUE`.
- **Card transition:** spring (`stiffness 300, damping 30`), enter from `y:+100` faded, exit to `y:-100` — vertical TikTok flow, `AnimatePresence mode="popLayout"`.
- **End state — do not skip this.** After the last sentence: a ~96px **diamond seal** (double-bordered cinnabar, counter-rotated Check inside), display heading **"You're done for today."**, italic *"Rest your mind. The ink is dry."* **No button.** The session ends on purpose.

**Accept when:** tapping anywhere advances with the spring; ticks fill left to right; toggling pinyin causes zero layout shift; the final tap lands on the seal with no way to continue.

### 3.3 Learn (学) — flashcards

- Header row: `REVIEWS` (display font, uppercase, tracking-widest); right, a bordered counter chip `{n} / {total}`.
- Center: current hanzi enormous (`text-[7rem]`). The answer block (pinyin in tone color at text-2xl + italic meaning) is **always in the DOM but hidden** (`opacity-0 translate-y-4`), floating up on reveal — so the card never jumps.
- Fixed-height (`h-32`) bottom control zone:
  - Unrevealed: full-width seal button **"Show Answer"** with a brush Eye icon.
  - Revealed: `grid-cols-4` of plaque buttons — **Again / Hard / Good / Easy**, tinted by tone colors repurposed as severity: Again = tone-4 red, Hard = tone-3 orange, Good = tone-2 green, Easy = tone-1 blue.
- Card advance: horizontal slide (enter `x:+20`, exit `x:-20`).

**Accept when:** reveal never shifts layout; the four plaques show their brackets and color washes; rating slides in the next card.

### 3.4 Tone Dojo (练) — the game

- **Intro:** a 96px diamond seal in dormant **gray** (`ink-500`) holding a counter-rotated Volume2 stamp; display heading **"Tone Dojo"**; the italic brief; seal button **"Start Training"** with a brush Play icon.
- **Playing:**
  - Header: left `SCORE` label + big display-font tabular number; right `TIME` as `0:SS` — **at ≤10s it turns tone-4 red and pulses**.
  - Center: a 128px play-audio tile (paper surface, shadow-lg, faint border, big Volume2 stamp icon; `hover:scale-105 active:scale-95`).
  - Combo ≥3: a cinnabar `"{n}x Combo!"` in brush font pops above center (`scale 0.8→1`), re-animating on every increment (key it on the combo count).
  - Bottom: `grid-cols-2` of four tall plaque tiles (h-24, md:h-32), border-tinted per tone, labeled **"Tone N"** in display font + tone color, with a tiny uppercase contour word (*flat / rising / dipping / falling*).
  - Scoring: correct = `+10 + combo×2`, combo++; wrong = combo resets; always advance. At 0s, stop.

**Accept when:** 60-second run works end to end; timer reddens and pulses in the final 10s; combo popup re-pops on each increment.

### 3.5 Stats (绩)

- Header: **"Progress"** (display, text-3xl) + italic *"Honest metrics for real acquisition."*
- **Hero — Total Input:** full-width **dark ink card** (`bg-ink-900`, paper text, sharp corners), soft white blur-glow circle in the top-right; Clock stamp icon + `TOTAL INPUT`; a giant hours number (display font, text-6xl, tabular, tracking-tighter) + "hours"; a thin square-edged progress bar (white/20 border frame, **1px inner padding** — the ink-well detail — cinnabar fill) with right-aligned italic *"Next milestone: 100h"*. Input hours is the headline metric — never XP.
- **Stat cards** (2-col, md:4-col): paper cards, faint `border-2` — Streak (Flame stamp) and Known words (Brain stamp); icon+uppercase-label row, then big display-font value with small italic unit.
- **Character Mastery:** `grid-cols-6` of square hanzi tiles. Fill encodes mastery: >0.8 solid cinnabar with paper text; >0.4 `paper-200`; else transparent — all with thin ink borders. It should read like a seal-stamp collection sheet.

**Accept when:** the dark hero card dominates; every number is tabular; the mastery grid is stable across renders (derive from data, not `Math.random()`).

### 3.6 Settings (bottom sheet)

- Backdrop `bg-black/40 backdrop-blur-sm`, click to dismiss; the sheet springs up from `y:+100`, pinned inside the scroll column (mobile full-width; md: centered `max-w-md`).
- Distinctive edge: **`border-t-4 border-double`** (double side borders on md) — a folded paper card.
- Header: `SETTINGS` (display, uppercase, tracking-widest) + an X stamp-icon close chip.
- Two rows (paper cards, faint `border-2`): bordered icon chip (brush Sun/Moon; brush Type), bold tracking-widest title, italic subtitle, and a **custom 32px square checkbox** — `rounded-sm`; checked = cinnabar fill + white brush Check; unchecked = transparent, gray border, invisible check.

**Accept when:** the sheet stays within the scroll's width on desktop; the double top border is visible; checkboxes are square, never a native toggle.

---

## Phase 4 — Motion & polish pass

Do a dedicated pass with this table; motion is calm and springy, never zippy.

| Interaction | Spec |
|---|---|
| Tab switch | `AnimatePresence mode="wait"` — old fully exits, then new enters |
| Feed card | spring `stiffness 300, damping 30`; in from `y:+100` faded, out to `y:-100` |
| Flashcard | horizontal: in `x:+20`, out `x:-20` |
| Onboarding step | fade + `y:20→0`, exit `y:-20`; tone rows stagger `i * 0.15s` from `x:-20` |
| Nav diamond | `layoutId="nav-indicator"` shared-layout glide |
| Settings sheet | backdrop fade; sheet from `y:+100` |
| Combo popup | keyed on count; `scale 0.8→1` |
| Micro | hanzi `hover:scale-105`; big buttons `active:scale-95`; timer pulse ≤10s; hint `animate-pulse` |
| Dark toggle | `transition-colors duration-300` on the shell |

Track B: Reanimated springs/staggers with equivalent values; navigation transitions are handled by expo-router's `<Tabs>`. Honor reduced-motion — this repo gates every animation behind a `useReducedMotion()` hook (`src/lib/motion.ts`), landing elements at their final state with no travel. Do the same on web via `prefers-reduced-motion`.

Final polish items: cinnabar selection color, `tabular-nums` audit, focus-visible states on web, 44px minimum touch targets (Track B exports `HIT = 44` in `src/theme.ts`).

---

## 5. Voice & tone appendix

The writing is part of the UI. Quiet, literary, restrained — never exclamation-marked, never nagging. Canonical strings (use verbatim):

| Where | String |
|---|---|
| Onboarding pitch | "A calm place to acquire Mandarin. No slot machines, no stress." |
| Onboarding step 2 | "The Four Tones" / "Pitch changes everything." |
| Onboarding step 3 | "I am very good." / "You just read your first Chinese sentence. Let's build on that." |
| Onboarding CTAs | "Begin" → "I understand" → "Enter the Studio" |
| Feed hint | "TAP ANYWHERE TO CONTINUE" |
| Feed end | "You're done for today." / "Rest your mind. The ink is dry." |
| Learn | "REVIEWS" / "Show Answer" / Again · Hard · Good · Easy |
| Dojo | "Tone Dojo" / "Listen to the syllable. Identify the tone. 60 seconds to prove your ear." / "Start Training" |
| Stats | "Progress" / "Honest metrics for real acquisition." / "TOTAL INPUT" / "Next milestone: 100h" |

Rules for new copy: sentence case for prose; SMALL-CAPS-STYLE UPPERCASE only for plaque-inscription labels; secondary lines italic; the app may end a session but never begs for one; metaphors come from ink, paper, and practice — not from games.

---

## 6. Fidelity checklist (final review rubric)

Walk every screen against this list before calling the rebuild done:

- [ ] No corner radius above 2px anywhere, except deliberately irregular stamp-chip corners and true circles
- [ ] **Cinnabar `#B22222` is the only accent** (dark mode: its dark/bright variant) — no blues/purples/greens outside the tone system
- [ ] Every pinyin syllable, on every screen, is colored by its tone via the shared helper
- [ ] Serif is the default; sans appears only on giant hanzi and small technical text; brush font per your Phase-0 decision
- [ ] All labels/buttons: bold, uppercase, tracking-widest
- [ ] Secondary copy is italic serif
- [ ] Numbers are `tabular-nums`
- [ ] Wooden rollers cap the viewport top and bottom; paper grain visible on the background
- [ ] Ceremonial moments use the 45° diamond seal with a double border
- [ ] Stamp chips are tilted −2° with irregular corners; web icons run through the turbulence filters
- [ ] Plaque buttons show corner brackets; seal buttons invert on press
- [ ] Progress bars square-edged; the Stats hero bar has its 1px ink-well inset
- [ ] Feed pinyin toggle causes zero layout shift; Learn reveal causes zero layout shift
- [ ] The feed **ends** with the seal — no "keep going" affordance
- [ ] Dark mode is warm charcoal `#1C1C19`, never pure black; rollers go espresso
- [ ] Reduced-motion preference disables travel animations

---

## 7. Appendix — this repo vs. the spec (state as of 2026-07-13)

If you're working **in this repository**, know that the spec's design language is already substantially implemented — but on a different stack than the spec assumes, with a few deliberate deviations:

| Area | Spec says | This repo | Verdict |
|---|---|---|---|
| Stack | Vite + React 19 + Tailwind v4, `motion/react` | Expo ~52 / RN 0.76, expo-router, Reanimated, StyleSheet themes | Permanent divergence — use Track B |
| Dark-mode accent | `#8B0000` | `#E24A4A` (brightened cinnabar) | Deliberate: AA contrast on dark ground, CI-tested |
| Muted text (light) | `#7A7468` | `#5E5648` | Deliberate: AA body text on rice paper |
| Gold accent | — (not in spec) | `#E0B44A` / `#C68A3E`, reward moments only | Repo addition; keep it rare or drop it |
| Ma Shan Zheng | headings, scores, numbers | hanzi wordmarks only | Deliberate legibility call (see §0.2) |
| Pseudo-element effects (grain overlays, hover brackets) | CSS `::before`/`::after` | `PlaqueCorners` component; grain omitted on native | RN platform limit |
| "Done for today" seal | Feed end state | **Not yet implemented** — feed ends without ceremony | Real gap: build per §3.2 |
| Audio, SRS, stats data | decorative / demo / hardcoded | fully wired (expo-av, ts-fsrs, SQLite + Firestore) | Repo exceeds spec — don't regress to demo data |

The biggest single UI gap to close in this repo is the **Feed end-state diamond seal** (§3.2). Everything else in Phases 0–2 exists; treat the cited components as the canonical Track B implementations.
