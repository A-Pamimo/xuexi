# 学习 xuexi

A Mandarin Chinese learning app for **iOS and web** that borrows the reward loops
of doomscrolling and gaming — variable rewards, infinite feeds, streaks, combos,
instant feedback — and points them at scientifically-backed language acquisition:
**comprehensible input**, **FSRS spaced repetition**, and **high-variability tone
training**.

Built with React Native + Expo (single codebase for iOS + web), fully
**offline-first** — usable with zero network, which matters because the target
user travels in mainland China where Western services are unreliable.

> Formerly speced as "TonePulse"; renamed **xuexi** (学习, "to learn").

---

## What's implemented (MVP milestones M1–M5)

| Milestone | Feature |
|---|---|
| **M1** | Expo/TS scaffold, SQLite schema, seed-data pipeline, build-time audio pipeline |
| **M2** | FSRS review loop (`ts-fsrs`) — hanzi→meaning and audio→meaning, opens to a preloaded win |
| **M3** | Tone Dojo — rapid-fire, multi-speaker tone ID with contour drawing, combo, haptics, sound |
| **M4** | Swipe feed — i+1 sentence selection, tap-to-gloss + add-to-SRS, pinyin toggle, autoplay |
| **M5** | Gamification — XP/levels, variable rewards, streak integrity, collection grid, input-hours odometer, weekly recap |

Onboarding (pinyin/tone primer → Tone Dojo) gates first launch and bootstraps a
known-word base so the feed is immediately comprehensible.

## Run it

```bash
npm install

# Web (fastest to try)
npm run web              # dev server → open the printed localhost URL
npm run export:web       # static SPA build into dist/

# iOS
npm run ios              # simulator (needs Xcode)
npm start                # then scan the QR with Expo Go on a device
```

The app ships with content + audio already generated (`assets/db`, `assets/audio`,
`src/data`), so `npm run web` works immediately with **no network**.

## Tests & checks

```bash
npm test          # jest: FSRS, pinyin, gamification, feed selection
npm run typecheck # tsc --noEmit (strict mode)
node scripts/smoke-web.mjs   # headless: cold-load + onboarding→dojo→tabs, asserts <10s & no JS errors
```

Verification status (spec `<verification>`):

- ✅ FSRS intervals grow after Good/Easy, shrink after Again (`src/lib/srs.test.ts`)
- ✅ Cold web launch reaches a completable action in **<10s**, zero JS errors (`scripts/smoke-web.mjs` → ~0.3s)
- ✅ Tone Dojo uses **≥3 distinct speaker voices per tone** (`audio_refs`)
- ✅ Feed never serves a sentence below the **85% known-word floor** (`src/features/feed/selection.test.ts`)
- ✅ `expo export --platform web` produces a working build (`dist/`)

## Architecture

```
app/                      expo-router routes (opens to a win, never a menu)
  (tabs)/                 Feed | Reviews | Tone Dojo | Stats
  onboarding.tsx
src/
  features/{feed,reviews,toneDojo,stats,onboarding}/
  lib/
    srs.ts                FSRS wrapper (ts-fsrs) — isolated + unit-tested
    juice.ts              central haptics + sound (tunable) for every scored interaction
    pinyin.ts             tone-number ↔ tone-mark conversion
    audio.ts              expo-av playback of bundled clips (no runtime TTS)
    gamification.ts       XP/levels, variable reward, streak integrity — unit-tested
    db/                   store (content from bundled seed + progress persistence)
  stores/appStore.ts      Zustand — the one place that mutates state
  data/seed.json          content snapshot (bundled) + audioAssets.ts (require manifest)
scripts/
  build-seed/             datasets → assets/db/xuexi-seed.db + src/data/seed.json
  build-audio/            TTS → assets/audio + audio_refs + audioAssets.ts
assets/{db,audio}/        prebuilt, offline
```

**Data layer (offline-first).** Immutable content (words, sentences, audio refs)
is hydrated from a bundled snapshot generated from the canonical SQLite DB
(`assets/db/xuexi-seed.db`). Mutable progress (FSRS cards, sessions, tone
results, stats) is kept in memory for synchronous reads and written through to a
platform adapter — `expo-file-system` on native, `localStorage` on web. This
keeps the app identical and fully offline on iOS and web without depending on the
`expo-sqlite` web (wasm) path (see plan risk R1).

## Content pipelines (build-time only)

```bash
npm run seed:build    # words + sentences → SQLite + seed.json
npm run audio:build   # multi-speaker audio → assets/audio + manifest
```

**Seed data.** Words come from
[complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary)
(HSK 3.0 levels 1–3, ~2200 words with pinyin, gloss, radical, frequency),
enriched with per-character decomposition from
[makemeahanzi](https://github.com/skishore/makemeahanzi). Graded i+1 sentences are
generated from a hand-verified beginner vocabulary pool (correct pinyin, gloss and
English inflection), each linked to its real word rows for tap-to-gloss.

**Audio.** The pipeline is **provider-pluggable**. The spec's documented default
is **edge-tts** (multiple `zh-CN` neural voices); set `XUEXI_TTS=edge` on a
machine that can reach it. It defaults to the offline **espeak-ng** provider,
which needs no network at build *or* runtime and yields ≥3 distinct speaker
variants per tone — clips are downsampled and bundled. UI sound effects are
synthesized procedurally. `XUEXI_AUDIO_FULL=1` generates word audio for every
HSK1 word (larger bundle).

### Notes on this build environment

Two spec sources are gated by the sandbox's egress policy and have documented
fallbacks that a normal dev machine can swap back:

- **Tatoeba** (intended sentence source, CC-BY) — `downloads.tatoeba.org` is
  blocked, so sentences are generated (well-suited to strict i+1). A Tatoeba
  ingestion module can be added under `scripts/build-seed`.
- **edge-tts** — Microsoft's TTS endpoint is blocked, so audio defaults to
  offline espeak-ng.

## Attributions & licenses

- CC-CEDICT-derived data via complete-hsk-vocabulary — CC BY-SA.
- makemeahanzi character data — LGPL / Arphic PL.
- Tatoeba (when enabled) — CC BY 2.0 FR.
- Audio generated at build time with espeak-ng (GPL tool; generated audio bundled).

## Not in this MVP

Handwriting/speech recognition, social features, accounts/Supabase sync, AI chat
tutor, iPad layout (spec `<exclude_for_now>`). Polish pass (reanimated
transitions, richer sound design) is milestone M6; TestFlight + optional Supabase
sync is M7.
