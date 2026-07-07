<!-- Generated 2026-07-07 by the xuexi learning-consult multi-agent workflow.
     2 teams (Opus chiefs + Sonnet/Haiku workers) + lead consultant. Citations adversarially audited. -->

# Engagement & Habit Formation — Team Report

# Xuexi Engagement & Habit Formation — Revamp Report

**Team:** Engagement & Habit Formation · **Owner:** Chief · **Date:** 2026-07-06
**Scope:** Re-anchor xuexi's engagement layer to the stated ethic — *anchor dopamine to genuine progress* — using audited evidence and best-in-class competitor teardowns.

**Evidence-handling rule used throughout:** Claims are graded. "Confirmed" findings are treated as evidence. "Partially-supported" findings are used but flagged (usually because a *statistic or authorship in the source claim was wrong* even though the underlying paper is real — I cite the corrected version). Anything unverifiable is raised only as an explicit, labeled hypothesis. Industry numbers (Duolingo's own blog) are used as *directional product signal*, never as academic evidence, and are excluded from the References section.

---

## 1. Executive Summary

- **Streaks are real behavior-change tools, not vanity metrics — but their harm is real too.** Consecutive-completion streaks causally increase persistence via *goal commitment*, not reward size (Mehr et al., 2025, confirmed). The harm from breakage is driven by *internal self-attribution* ("I failed") and is measurably attenuated by repair mechanics (Silverman & Barasch, 2023, confirmed; PLOS ONE, 2026, confirmed but small-N). **Keep the streak; re-engineer breakage into a no-guilt, externally-attributed, always-recoverable event.**

- **Xuexi's XP + "golden" random multipliers are its single largest ethical risk.** XP is *engagement-contingent*, the exact reward type with the strongest documented undermining of intrinsic motivation (Deci, Koestner & Ryan, 1999: d = −0.40, confirmed). Maximal simultaneous gamification predicts a **4–6 month retention/motivation cliff** (Hanus & Fox, 2015, partially-supported). **De-emphasize numeric XP; shift the reward salience to competence signals and progress feedback.**

- **Competence feedback is the highest-leverage motivational asset xuexi has, and it already owns the infrastructure.** Competence-need satisfaction is the strongest proximal predictor of autonomous motivation (β ≈ 0.31–0.34; 2022 meta, partially-supported), yet points/levels/leaderboards do *not* raise perceived competence — they only raise output quantity (Mekler et al., 2017; Sailer et al., 2017, both confirmed). **FSRS accuracy, Tone Dojo accuracy %, and the character-mastery grid are the assets to amplify.**

- **Reject leaderboards outright.** Leaderboards produce non-autonomous motivation at *every* rank — complacency at the top, ego-threat at the bottom (Internet Research, 2023, confirmed). This is the clearest evidence-based divergence from Duolingo/HelloChinese and it aligns with xuexi's ethic. If social is added, use **cooperative/bilateral accountability** (relatedness), not rank tables.

- **The first 7 days and the 66-day automaticity horizon should govern the entire early lifecycle.** Habit automaticity takes a median of 66 days and single missed days don't reset it (Lally et al., 2010, confirmed); the first week is the highest-risk dropout window (Dai, Milkman & Riis, 2014, confirmed). **Front-load competence wins, set a 10-week expectation explicitly, and capture a self-concordant "why" and an if-then plan at onboarding.**

- **Notifications should be one autonomy-supportive, context-stable, if-then-framed cue per day — not a FOMO engine.** Context stability drives automaticity independent of frequency (Stojanovic, Grund & Fries, 2022, confirmed); controlling language triggers reactance (Frontiers in Communication, 2019, confirmed). Xuexi's offline-first posture is an asset here — lean into fewer, better cues.

- **Xuexi's pedagogy is already best-in-class vs. every competitor teardown** (FSRS > Duolingo's engagement-tuned SRS and Pimsleur's 1967 fixed GIR; audio-first + Tone Dojo beats Anki's text-first default; auto-generated Feed cards beat Anki/Pleco's content-creation burden). **The revamp is about disarming the engagement layer's risks, not rebuilding the learning core.**

- **The three mechanics to change first:** (1) supplement the day-streak with a **rolling hit-rate** frame to kill catastrophic-miss anxiety; (2) convert "golden" *random* multipliers into **earned, performance-tied** bonuses; (3) **weight XP by cognitive demand** (FSRS difficulty, Tone accuracy) so grinding is structurally impossible.

---

## 2. Evidence-Based Principles

Each principle is stated, then followed by its supporting citation(s) and grade.

**P1 — Consecutive-completion streaks cause genuine persistence via goal commitment, not reward magnitude.** They are a legitimate motivational scaffold, but they do not guarantee the *content* completed is substantive.
> Mehr et al. (2025), *The motivating power of streaks*, OBHDP — **confirmed** (6 pre-registered studies, N = 4,493; mechanism = consecutive-completion requirement, not escalating reward).

**P2 — Streak breakage harms through internal self-attribution, and repair mechanisms measurably attenuate that harm.** Freezes and grace periods are ethical safeguards, not gimmicks.
> Silverman & Barasch (2023), *On or Off Track*, Journal of Consumer Research 49(6) — **confirmed** (66.23% vs 57.86% completion driven by *log framing*, not behavior; repair attenuates harm).

**P3 — Effort accelerates near goals (goal-gradient) and artificial head-starts nearly double completion (endowed progress).** Milestone spacing and an endowed onboarding "day 1" are concrete levers.
> Kivetz, Urminsky & Zheng (2006), JMR 43(1); Nunes & Drèze (2006), JCR 32(4) — **confirmed** (endowed progress 34% vs 19% ≈ 1.79×).

**P4 — High streak attachment can cause weeks-long grief on forced loss, but user-controlled (voluntary) cessation eliminates nearly all harm, and long-term practice is not abandoned.** Agency is the safety mechanism.
> PLOS ONE (2026), *The dark side of streaking*, 21(5):e0317254 — **confirmed but small/qualitative (N = 17)**; treat direction as solid, magnitudes as illustrative.

**P5 — A 7-day streak threshold separates sustained learners from early dropouts; freezes give a modest, real retention lift without inflating superficial engagement.**
> Duolingo product data (3.6× course completion at 7-day streak; freeze +0.38% DAL) — **industry signal, not academic**; Huynh & Iida (2017), APJITM 6(2) — **partially-supported** (streaks motivate advanced learners more than beginners). ⚠️ The "14% Day-14 retention" figure in circulation is wrong — Duolingo's own data attributes 14% to **Day-7**, not Day-14.

**P6 — Expected, engagement-contingent tangible/numeric rewards undermine intrinsic motivation; verbal/informational feedback enhances it.** This is the core CET result.
> Deci, Koestner & Ryan (1999), Psychological Bulletin 125(6) — **confirmed** (engagement-contingent d = −0.40, completion −0.36, performance −0.28; verbal reward free-choice +0.33, self-reported interest +0.31; 128 experiments). Undermining is stronger for children than college students.

**P7 — Variable-ratio reinforcement is extinction-resistant and boosts short-term output, but stacking many game elements risks reward saturation and a novelty-decay collapse of intrinsic motivation after ~4 months.**
> Eckert, Scherenberg & Klinke (2023), PMC10116860 — **partially-supported** (token game, n = 77, exercises 44→54, accuracy 40→52, both p<0.001; ⚠️ the audit's original author attribution was wrong — corrected here). Hanus & Fox (2015), Computers & Education 80 — **partially-supported** (gamified section lower motivation/satisfaction/exam scores; ⚠️ 16-week study, n=105 unconfirmed, original URL wrong).

**P8 — Gamification reliably lifts relatedness and autonomy-as-attitude but has minimal effect on *competence*; competence must be earned through real feedback.**
> Li, Hew & Du (2024), Educational Technology R&D — **partially-supported** (autonomy g = 0.638, relatedness g = 1.776, competence g = 0.277; ⚠️ audit misattributed authors — corrected).

**P9 — Game elements sort into SDT clusters: badges/leaderboards/performance-graphs → competence & meaningfulness; avatars/story/teammates → relatedness; *neither* reliably raises autonomy-as-freedom-of-decision.**
> Sailer, Hense, Mayr & Mandl (2017), Computers in Human Behavior — **confirmed** (N = 419).

**P10 — Points, levels, and leaderboards alone do not raise intrinsic motivation or perceived competence; they raise output *quantity* only.** They are motivationally neutral scaffolding.
> Mekler, Brühlmann, Tuch & Opwis (2017), Computers in Human Behavior — **confirmed**.

**P11 — Informational-vs-controlling framing is the primary sign-flipping moderator for any reward or feedback.**
> Deci, Koestner & Ryan (1999) — **confirmed** (see P6).

**P12 — Leaderboards produce non-autonomous motivation at every position** — complacency at the top, ego-threat at the bottom.
> *Internet Research* 33(7) (2023), leaderboard-position study — **confirmed** (trait-competitiveness d = 0.36 as a specific simple effect; overall moderation not globally significant — noted).

**P13 — Competence-need satisfaction is the strongest proximal predictor of autonomous motivation (β ≈ 0.31–0.34); autonomy contributes independently (β ≈ 0.25–0.27).** Younger learners lean on structural autonomy support; adults on internalized competence.
> *Pathways to Student Motivation* meta-analysis (2022), PMC8935530 — **partially-supported** (β values confirmed; the "competence pathways strengthen with age" half is an inference, not directly stated).

**P14 — Context-stable cues drive habit automaticity independent of repetition frequency; median automaticity is ~66 days (range 18–254), and missing a single day does not reset the curve.**
> Lally et al. (2010), European Journal of Social Psychology 40(6) — **confirmed**; Stojanovic, Grund & Fries (2022), PMC9226889 — **confirmed** (context stability b = 0.020, p<0.001).

**P15 — Implementation-intention (if-then) plans produce medium-to-large gains in goal attainment (d ≈ 0.65), especially for "failures to get started."**
> Gollwitzer (1999), American Psychologist 54(7); Gollwitzer & Sheeran (2006), Advances in Experimental Social Psychology 38 — **partially-supported** (d = 0.65 and d = 0.61 for get-started confirmed; ⚠️ meta was in *Advances in ESP*, not *American Psychologist*; the "d = 0.77 derailment" sub-figure is unverified).

**P16 — Delivering cues at receptive moments substantially improves response; poorly-timed cues cause dismissal and reactance.**
> Mehrotra et al. (2016), CHI; Pielot et al. (2017), UbiComp — **partially-supported** (5-fold / 66.6% success uplift confirmed; ⚠️ the widely-quoted "77%" is an F1-score gain in a model, not a user response-rate gain).

**P17 — Autonomy-supportive, implicit, choice-preserving language reduces psychological reactance; controlling language triggers it even when the content is beneficial.**
> Frontiers in Communication (2019), reactance & health-communication review, 4:56 — **confirmed**.

**P18 — Excessive/low-relevance notifications impose real attentional cost (~23-min recovery) and daily blasts drive abandonment; fewer, context-relevant cues sustain engagement.**
> Mark et al. (2008), CHI (23-min recovery — **confirmed**); stress-management app study, PLOS ONE (2017), PMC5207732 — **confirmed** (daily notifications → 53% quit within 2 weeks; no benefit of "intelligent" over static). ⚠️ The "34–65% dismissal in 5s" and "30–40% frequency-cut raises CTR" figures are **not** traceable to peer-reviewed sources — do not cite as evidence.

**P19 — Habit automaticity takes ~10 weeks, not 21 days; telling users this prevents discouragement dropout.**
> Lally et al. (2010); Gardner, Lally & Wardle (2012), Br J Gen Pract, PMC3505409 — **confirmed**.

**P20 — Self-concordant (intrinsically chosen) goals sustain more effort and attainment than external/guilt-driven goals.**
> Sheldon & Elliot (1999), *Self-concordance model*, JPSP 76(3) — **partially-supported** (claims accurate; ⚠️ audit URL pointed to the 2001 follow-up, not the 1999 paper).

**P21 — Early mastery experiences build *habit-specific* self-efficacy, which enters a virtuous cycle with automaticity and shields new habits from competing motivations.**
> Stojanovic, Fries & Grund (2021), *Self-Efficacy in Habit Building*, Frontiers in Psychology — **partially-supported** (all stats confirmed: HSE→automaticity b = 0.416, automaticity→HSE b = 0.327, HSE→reduced interference b = −0.141; ⚠️ audit misattributed authors — corrected).

**P22 — The first week is the highest-risk dropout window; temporal landmarks ("fresh starts") boost re-initiation.**
> Dai, Milkman & Riis (2014), *The Fresh Start Effect*, Management Science — **confirmed** (directional; some cited percentages are rounded/selective).

---

## 3. What the Leading Chinese-Learning Apps Do

### Comparison table

| Dimension | Duolingo | HelloChinese | Anki / SuperMemo | Pleco | Pimsleur / Glossika |
|---|---|---|---|---|---|
| **Governing objective** | CURR / DAU (learning secondary) | Engagement metrics over outcomes | Pure retention infra; no engagement motive | Utility/reference; no engagement layer | Session rhythm; anti-gamification |
| **SRS quality** | Engagement-tuned, non-FSRS | Standard SRS | **FSRS (best-in-class)**; SM-18 | Transparent score÷100 | Pimsleur GIR (fixed 1967 intervals); Glossika opaque |
| **Streaks** | Streak + freeze + guilt notifications | Fragile all-or-nothing | Community add-on only, no cushion | None (deliberately) | None |
| **Variable rewards** | Treasure chests (operant, effective but engagement-first) | Gold-coin random multiplier (slot-machine) | None | None | None |
| **Leaderboards** | 10-tier leagues (drives XP grinding) | Yes (distracts to rank-chasing) | None (FLUX add-on = cautionary tale) | None | None |
| **Tone/pronunciation** | **Inadequate**; lenient ASR validates wrong tones | Visual pitch feedback (sound) but ASR sometimes lenient | Text-first default (critical gap) | Reference only | Pimsleur backward-syllable drill (good); Glossika record-without-feedback (poor) |
| **Audio** | Slow textbook TTS | Native + video | User-managed, optional | Reference TTS | High-quality native, multi-speaker; hands-free ambient mode |
| **Content burden** | Curated, linear path | Curated HSK curriculum | **On user** (blank slate) | On user (auto card from lookup) | Curated, linear/gated |
| **Grammar** | None for Mandarin (fails) | Explained every lesson (good) | None | None | Implicit induction |
| **Onboarding** | Linear path removes choice paralysis | Structured | None (jargon wall) | Weak/undocumented | Overestimates level → churn |
| **Ceiling** | HSK 3–4 | ~HSK 4 | Very high (power users) | N/A (tool) | A0–B1 |

### What to borrow

- **From Duolingo:** streak + freeze pairing; sub-5-minute "trivially easy to start" session design; milestone escalation at 7/30/100/365 days; **bilateral friend-streak accountability (22% daily-completion lift — the most actionable social number in the space, and it comes from mutual stakes, not rank)**; progressive feature unlock (Paradox-of-Choice reduction); AI-timed *but user-bounded* notification copy.
- **From HelloChinese:** visual tone-pitch feedback; HSK-graded progression; "explain the grammar" discipline (xuexi should add glossary/note affordances to Feed cards).
- **From Anki/SuperMemo:** FSRS *desired-retention slider* exposed to the learner; **hit-rate framing instead of raw streak**; hard daily new-item cap with 30-day load projection; leech detection routed to "hear this word in context" (Feed) rather than more drilling; time-budgeted sessions (kill zombie mode); calendar heatmap; honest retention % on Stats; atomic one-fact cards with source-sentence context; SuperMemo's *incremental reading* as inspiration for the Feed→Review pipeline.
- **From Pleco:** frictionless tap-to-gloss → one-tap card creation; **transparent SRS logic** (show *why* an interval grew); free core, never paywall FSRS; real-world OCR/scan integration.
- **From Pimsleur/Glossika:** forced production before model reveal (don't auto-advance; prompt anticipation first); backward-syllable tone deconstruction micro-drill; **hands-free ambient audio mode** for Feed/Review (captures commute/chore hours every screen-first app misses); 15–20 min session discipline; multi-speaker high-variability audio (matches tone-perception research); implicit-grammar stance.

### What to avoid

- **Any daily-learning cap behind a timer/paywall** (Duolingo's Energy system — punishes correct answers; pedagogically indefensible).
- **Stranger leaderboards / leagues** — drives grinding + ego-threat; zero accountability benefit (P12). This is the sharpest evidence-based divergence.
- **Guilt/anxiety-optimized notifications** (Duo-owl threat persona) — produces anxiety-compliance that collapses when the anxiety bond breaks (P17, P18).
- **XP weighted by task count** — instantly breeds grinding of easy/known cards.
- **Lenient tone ASR** — validating wrong tones is worse than no feedback (Duolingo + HelloChinese's shared failure). If xuexi adds recording, it must give acoustic feedback or not claim assessment (Glossika's mistake).
- **Recognition-only formats** (multiple-choice, word-bank) — illusion of mastery; keep FSRS active recall.
- **Slow TTS / permanent pinyin crutch** — keep Qwen3 natural speed; pinyin transient (tap-to-gloss), hanzi primary.
- **Engagement-overriding SRS scheduling** — FSRS must be the sole scheduling authority; never surface "easy" reviews for DAU.
- **All-or-nothing streaks; paid streak repair** — monetizing unavoidable life disruption is the clearest betrayal of xuexi's ethic.
- **Onboarding that overestimates level** (Glossika) or throws jargon (Anki) — the first week must feel achievable.

---

## 4. Concrete Recommendations, Mapped to Xuexi's Actual Features

### 4.1 Gamification — XP, levels, golden multipliers, combo meter

**The core problem:** XP is engagement-contingent (P6, d = −0.40), the golden *random* multiplier makes reward salient and unpredictable (amplifying overjustification risk), and the full stack running simultaneously invites a 4-month novelty collapse (P7). Yet points/levels are motivationally neutral, not intrinsically motivating (P10). This is directly at odds with "anchor dopamine to genuine progress."

**Change:**

1. **Weight XP by cognitive demand, not completion.** A new HSK 5 FSRS card or a high-accuracy Tone Dojo combo must yield strictly more XP than tapping a known beginner card. *Why:* removes the grinding incentive structurally (avoid-list from Duolingo/HelloChinese teardowns) and ties the number to real effort (P11 informational framing).
2. **Convert "golden" multipliers from random to earned.** Trigger bonus tiers on *performance events* — a Tone Dojo combo peak, a clean FSRS session at high retrievability — not on chance or mere showing up. *Why:* HelloChinese's random gold-coin multiplier is explicitly on the avoid-list (slot-machine effect); a performance-contingent bonus is informational, not controlling (P11), and still delivers the variable-magnitude dopamine benefit the Duolingo treasure-chest research documents — just anchored to learning.
3. **Demote numeric XP in the UI; promote competence summaries.** Replace "earn 50 XP" framing with post-session competence feedback: *"You identified 91% of third tones correctly — up 8% from last week."* *Why:* verbal/informational feedback enhances intrinsic motivation (P6: +0.31/+0.33) where numeric reward undermines it; competence is the strongest predictor of autonomous motivation (P13) and the one thing points *don't* deliver (P8, P10).
4. **Rotate game elements instead of running all at once.** Enable a subset early (combo meter, character grid), introduce a new mechanic around the 3-month mark to re-trigger novelty. *Why:* directly targets the Hanus & Fox / novelty-decay cliff (P7). *Flag: mixed/weaker evidence — Hanus & Fox is partially-supported and the "feature rotation" fix is a reasoned hypothesis, not directly tested. Ship as an A/B experiment (see §5).*
5. **Keep the combo meter and character-mastery grid — they are your best assets.** The combo meter is a moment-to-moment mastery signal (competence cluster, P9), superior to raw XP (P10). The grid is a performance-graph (P9) and a natural home for endowed/milestone mechanics (P3).

### 4.2 Streaks and freezes

**Keep the day streak — it is validated (P1) and matches every teardown's "borrow" list.** But re-engineer breakage.

1. **Supplement the day-streak with a rolling 6-week hit-rate** ("41 of 42 days — 98%"). *Why:* a missed day moves the number ~2% instead of destroying it — this is the Anki/SuperMemo "borrow" that directly defuses the catastrophic-miss grief documented in PLOS ONE (P4) and HelloChinese's all-or-nothing failure, while preserving the daily signal (P1).
2. **Make freeze equip proactive and pre-day-end, never retroactive.** *Why:* proactively equipping a freeze recreates the *voluntary cessation* condition (minimal harm); a silent break is the *forced loss* condition (grief) — agency is the mechanism (P4).
3. **Add earned streak-repair tokens** (earned via extra substantive practice), and never surface a broken-streak notification without an immediate recovery path in the same view. *Why:* repair demonstrably attenuates harm and re-engages (P2); breakage-without-repair is the specific harm trigger.
4. **Rewrite all streak copy to external attribution and habit-scaffold framing.** Use *"Life happens — your streak is safe for 24 hours"* and *"you studied 27 of the last 30 days"* on return. Never *"You are a 90-day learner"* (identity fusion) or *"Don't lose your streak"* (controlling). *Why:* internal attribution is what hurts (P2); identity-fusion amplifies grief (P4); controlling language triggers reactance (P17).
5. **Space milestones at 7 / 14 / 30 / 60 / 100 / 365 days with visible "Day 6 of 7" progress**, and grant an **endowed Day-1 streak on completing onboarding.** *Why:* goal-gradient predicts effort acceleration approaching each milestone; endowed progress ~doubles early completion and is ethically clean because the endowed day reflects a genuinely completed task (P3). 7 days is the make-or-break threshold (P5).
6. **Evolve framing by level:** motivational novelty (combo, bonuses) for HSK 1–2; loss-aversion around established streaks for HSK 3+. *Why:* Huynh & Iida — streaks motivate advanced learners more (P5, partially-supported; treat as a testable hypothesis).

### 4.3 The Comprehensible-Input Feed

1. **Keep it as the default sub-5-minute entry point** and the low-activation-energy session even on bad days. *Why:* "trivially easy to start" is the borrowed Duolingo/Glossika principle; frequency beats duration for SRS-adjacent learning.
2. **Add a hands-free ambient mode** (audio-only, auto-advance after a pause, background playback) for the Feed and Review queues. *Why:* Glossika's Listening-Only mode is the single most underrated engagement feature — it captures commute/chore hours screen-first apps miss. **Guardrail:** ambient passive scrolling alone must *not* earn XP or streak credit — only a successful FSRS recall or Tone ID does (xuexi ethic; Pimsleur/Glossika avoid-list).
3. **Forced anticipation before gloss reveal:** after sentence audio, pause and prompt the user to anticipate meaning before revealing the gloss; don't auto-advance. *Why:* forced production before model reveal is the core mechanism behind Pimsleur GIR's effectiveness.
4. **Keep hanzi primary, pinyin transient (tap-to-gloss), Qwen3 at natural speed with multi-speaker variety.** *Why:* permanent pinyin becomes a crutch and slow TTS blocks real listening transfer (both on the avoid-list); high-variability multi-speaker audio matches tone-perception research.
5. **Route FSRS leech cards back into the Feed** ("hear this word in context") rather than re-drilling. *Why:* the flashcard-fluency trap (recognition ≠ comprehension) is Anki's most damaging failure; the fix is comprehensible input, not more isolated drill.

### 4.4 FSRS Reviews

1. **Protect FSRS as the sole scheduling authority.** Never override for engagement. *Why:* engagement-tuned SRS is Duolingo's documented failure and on the avoid-list; FSRS's 20–30% efficiency edge is a core competitive advantage.
2. **Expose one learner-facing desired-retention slider (80/90/95%)** with the review-load tradeoff shown, and surface per-card stability/retrievability ("your memory of this item is at 78%"). *Why:* metacognitive transparency is the Anki/Pleco "borrow" and the Pimsleur/Glossika "avoid" (opaque scheduling) — and it is genuinely *informational* competence feedback (P11, P13).
3. **Hard daily new-item cap with 30-day load projection** before the Feed/Review adds cards. *Why:* unbounded card debt is Anki's single largest structural failure (the "500-card wall" cortisol trigger); xuexi's auto-generation makes this preventable.
4. **Cap overdue reviews shown per session (~50) and time-budget sessions (~15 min, progress-by-time not card-count).** On return after a gap: *"you were away — let's ease back in,"* never a wall. *Why:* prevents zombie-mode false retention (Anki avoid-list) and defuses review-debt grief.
5. **Always show the source sentence on the answer side; keep cards atomic** (hanzi→meaning OR audio→meaning, never compound). *Why:* Wozniak's 20-rules / atomic-card principle; context lifts comprehension over decontextualized recall.
6. **Show honest retention % on Stats.** *Why:* anchors the whole gamification layer to a real learning signal (P13; Anki "borrow").

### 4.5 Tone Dojo

1. **Keep high-variability multi-speaker design + combo meter — these are pedagogically and motivationally correct.** The combo meter is per-trial competence signaling (P9, P13); high-variability audio produces more durable tone categories.
2. **Prioritize verbal/audio feedback over numeric.** "Great third tone!" plus a real accuracy % over time, above raw XP. *Why:* verbal reward enhances intrinsic motivation; numeric/tangible undermines, more so for younger users (P6). Haptics are fine as sensory feedback but should not be the *reward*.
3. **Add a backward-syllable tone-deconstruction micro-drill** (hear a syllable tone-by-tone, final→initial). *Why:* the Pimsleur technique reviewers credit for tone-2/tone-3 gains.
4. **Never soften tone accuracy for engagement.** If self-recording is ever added, it must give acoustic feedback (pitch-contour / tone-classification) or make no assessment claim. *Why:* lenient tone feedback is Duolingo/HelloChinese/Glossika's shared, first-order failure.

### 4.6 Content & sequencing

1. **Preserve HSK-graded i+1 sequencing and the implicit-grammar stance** (no grammar tab, no rule cards) — but add optional glossary/notes on Feed cards. *Why:* implicit induction from graded input is right (Glossika borrow), but HelloChinese shows learners still want *explanation available* for structurally distant features (aspect markers, measure words, topic-prominence).
2. **Progressive feature unlock in onboarding:** Feed first → FSRS after ~10 cards → Tone Dojo after first review. *Why:* Paradox-of-Choice reduction (Duolingo 2022 path redesign borrow); lowers early cognitive load in the highest-risk week (P22).
3. **Keep sessions varied within a stable daily slot** (rotate Tone Dojo / Feed / FSRS as the lead activity). *Why:* Glossika's identical-every-day format causes autopilot; session variety within a consistent time-slot is the synthesis no competitor achieves — and stable timing drives automaticity (P14).

### 4.7 Onboarding & first two weeks (the highest-leverage window)

1. **Capture a self-concordant "why"** (heritage, travel, business, media, curiosity) and display it persistently on the home screen ("Learning Mandarin for: connecting with family"). *Why:* self-concordant goals sustain effort; the cue should be the self-chosen value when motivation dips in weeks 2–4 (P20).
2. **Capture one if-then plan** ("If I finish my morning coffee, I open xuexi for 5 minutes") and use *the user's own trigger* to time the first daily notification. *Why:* implementation intentions produce d ≈ 0.65, strongest for "failures to get started" (P15); a self-generated plan beats an external prompt.
3. **Set a 10-week expectation explicitly** ("most learners feel this get automatic around week 6–10; one missed day won't set you back"). *Why:* prevents discouragement dropout from the false 21-day myth; aligns with the freeze mechanic (P19, P14).
4. **Front-load competence wins in the first 5–7 days** (early Tone Dojo success, character grid visibly filling) with behavior-specific feedback ("your first 10 tones at 90% accuracy"), never generic "Great job!" *Why:* early mastery seeds habit-specific self-efficacy that later defends the habit (P21); first week is the highest-risk window (P22).
5. **Use temporal-landmark framing for re-engagement** ("New week, new streak"; "This month is unwritten"). *Why:* fresh-start effect empirically lowers the cost of re-initiation (P22).

### 4.8 Notifications

1. **One high-quality, context-stable, user-timed cue per day** at a user-selected slot; suppress low-receptivity windows (early morning, late night). *Why:* context stability drives automaticity independent of frequency (P14); daily blasts drive abandonment (P18); receptivity-timing lifts response (P16). Offline-first is an asset here.
2. **If-then, progress, and choice framing only.** "When you finish lunch, review 10 characters?" / "3 cards due in your FSRS queue" / "You're 8 characters from 100 — review now?" Offer options ("tone game, new vocab, or review?"). Never "You must complete your streak" or "Don't lose your streak." *Why:* if-then framing primes execution (P15); implicit/choice-preserving language avoids reactance (P17); guilt notifications are on every teardown's avoid-list.
3. **Never optimize copy for anxiety.** Report genuine progress or offer useful info. *Why:* anxiety-compliance collapses when the bond breaks (P17, P18; Duolingo cautionary case).

---

## 5. What to Measure (Metrics & Experiments)

**North-star guardrail:** unlike Duolingo's CURR, xuexi's engagement metrics must be validated against *learning* proxies (FSRS retention %, tone accuracy trend, input-hours) — not DAU alone.

**Core cohort analyses**
- **7-day activation rate** (share reaching a 7-day streak) as the primary early-lifecycle KPI; cohort by onboarding variant (P5, P22).
- **Heavy-gamification-early → 6-month retention correlation.** Do users who lean hardest on XP/multipliers early show *lower* 6-month retention and lower intrinsic-motivation survey scores? Direct test of P7 / Hanus & Fox.
- **Intrinsic-motivation survey** at 30/90/180 days: "I learn Mandarin because I want to speak it" vs "…to earn XP." Track the ratio over time.

**Priority A/B experiments**
1. **XP visibility:** numeric XP prominent vs. replaced by competence summaries → 30-day *and* 180-day retention + intrinsic-motivation score (tests P6/P10/P13).
2. **Golden multiplier — random vs. performance-earned vs. off:** measure session persistence (short-term) *and* 6-month retention + motivation (tests P7/P11).
3. **Streak frame — raw day-streak vs. rolling hit-rate:** measure post-miss return rate and self-reported anxiety (tests P2/P4).
4. **Endowed Day-1 streak vs. start-from-zero:** early completion rate (tests P3; expect ~1.8× directionally).
5. **Notification: one user-timed if-then cue vs. multiple generic reminders:** click-through, dismissal, mute rate, downstream review completion (tests P15/P16/P18).
6. **Feature rotation vs. all-elements-on:** motivation and retention at 3 and 6 months (tests P7 fix — flagged as weaker evidence).
7. **Onboarding "why + if-then + 10-week expectation" vs. control:** first-week survival and week-2–4 retention (tests P15/P19/P20/P21/P22).

**Instrumentation to add**
- Per-card FSRS retention %, stability, retrievability (also learner-facing).
- Tone Dojo accuracy trend per tone (esp. tones 2/3).
- XP-per-minute and XP-per-difficulty-unit, to *detect grinding* (flat XP across difficulty = grinding leak).
- Projected 30-day review load vs. actual (card-debt early-warning).
- Freeze-equip timing (proactive vs. retroactive/absent) correlated with post-break return.

**Explicitly do not optimize:** raw DAU, session count, or streak length in isolation — these are the "engagement theater" metrics the teardowns warn against.

---

## 6. References (verified academic sources only)

*Industry/product blogs (e.g., Duolingo) and unverifiable figures are intentionally excluded. Papers graded "partially-supported" appear here with their corrected bibliographic details.*

1. Dai, H., Milkman, K. L., & Riis, J. (2014). *The Fresh Start Effect: Temporal Landmarks Motivate Aspirational Behavior.* Management Science. https://pubsonline.informs.org/doi/10.1287/mnsc.2014.1901
2. Deci, E. L., Koestner, R., & Ryan, R. M. (1999). *A Meta-Analytic Review of Experiments Examining the Effects of Extrinsic Rewards on Intrinsic Motivation.* Psychological Bulletin, 125(6), 627–668. https://www.researchgate.net/publication/12712628
3. Eckert, M., Scherenberg, V., & Klinke, C. (2023). *How a token-based game may elicit the reward prediction error and increase engagement of students in elementary school. A pilot study.* https://pmc.ncbi.nlm.nih.gov/articles/PMC10116860/
4. Gardner, B., Lally, P., & Wardle, J. (2012). *Making health habitual: the psychology of 'habit-formation' and general practice.* British Journal of General Practice. https://pmc.ncbi.nlm.nih.gov/articles/PMC3505409/
5. Gollwitzer, P. M. (1999). *Implementation Intentions: Strong Effects of Simple Plans.* American Psychologist, 54(7), 493–503. https://doi.org/10.1037/0003-066X.54.7.493
6. Gollwitzer, P. M., & Sheeran, P. (2006). *Implementation Intentions and Goal Achievement: A Meta-Analysis of Effects and Processes.* Advances in Experimental Social Psychology, 38, 69–119. https://www.semanticscholar.org/paper/c4deb3507fe725ce6363c1735f1ba83bab20d665
7. Hanus, M. D., & Fox, J. (2015). *Assessing the effects of gamification in the classroom: A longitudinal study on intrinsic motivation, social comparison, satisfaction, effort, and academic performance.* Computers & Education, 80, 152–161. https://www.researchgate.net/publication/265644737
8. Huynh, D., & Iida, H. (2017). *An Analysis of Winning Streak's Effects in Language Course of 'Duolingo'.* Asia-Pacific Journal of Information Technology and Multimedia, 6(2), 23–29.
9. Kivetz, R., Urminsky, O., & Zheng, Y. (2006). *The Goal-Gradient Hypothesis Resurrected: Purchase Acceleration, Illusionary Goal Progress, and Customer Retention.* Journal of Marketing Research, 43(1), 39–58. https://journals.sagepub.com/doi/abs/10.1509/jmkr.43.1.39
10. Lally, P., van Jaarsveld, C. H. M., Potts, H. W. W., & Wardle, J. (2010). *How are habits formed: Modelling habit formation in the real world.* European Journal of Social Psychology, 40(6), 998–1009. https://onlinelibrary.wiley.com/doi/abs/10.1002/ejsp.674
11. Li, L., Hew, K. F., & Du, J. (2024). *Gamification enhances student intrinsic motivation, perceptions of autonomy and relatedness, but minimal impact on competency: a meta-analysis and systematic review.* Educational Technology Research and Development. https://doi.org/10.1007/s11423-023-10337-7 (ERIC EJ1424760)
12. Mark, G., Gudith, D., & Klocke, U. (2008). *The Cost of Interrupted Work: More Speed and Stress.* CHI 2008.
13. Mehr, K., et al. (2025). *The motivating power of streaks: Increasing persistence is as easy as 1, 2, 3.* Organizational Behavior and Human Decision Processes. https://www.sciencedirect.com/science/article/pii/S0749597825000032
14. Mehrotra, A., Pejovic, V., Vermeulen, J., Hendley, R., & Musolesi, M. (2016). *My Phone and Me: Understanding People's Receptivity to Mobile Notifications.* CHI 2016. https://www.researchgate.net/publication/288154432
15. Mekler, E. D., Brühlmann, F., Tuch, A. N., & Opwis, K. (2017). *Towards understanding the effects of individual gamification elements on intrinsic motivation and performance.* Computers in Human Behavior. https://www.semanticscholar.org/paper/70a4d654151234924c0a7ce7822f12108bf3db49
16. Nunes, J. C., & Drèze, X. (2006). *The Endowed Progress Effect: How Artificial Advancement Increases Effort.* Journal of Consumer Research, 32(4), 504–512.
17. Pielot, M., Cardoso, B., Katevas, K., Serrà, J., Matic, A., & Oliver, N. (2017). *Beyond Interruptibility: Predicting Opportune Moments to Engage Mobile Phone Users.* UbiComp / IMWUT.
18. Pielot, M., et al. (2018). *Dismissed! A Detailed Exploration of How Mobile Phone Users Interact with Push Notifications.* MobileHCI 2018. https://www.interruptions.net/literature/Pielot-MobileHCI18.pdf
19. *Psychological reactance and persuasive health communication: A review of the literature.* (2019). Frontiers in Communication, 4:56. https://www.frontiersin.org/articles/10.3389/fcomm.2019.00056/full
20. Sailer, M., Hense, J. U., Mayr, S. K., & Mandl, H. (2017). *How gamification motivates: An experimental study of the effects of specific game design elements on psychological need satisfaction.* Computers in Human Behavior. https://www.sciencedirect.com/science/article/pii/S074756321630855X
21. Sheldon, K. M., & Elliot, A. J. (1999). *Goal striving, need satisfaction, and longitudinal well-being: The self-concordance model.* Journal of Personality and Social Psychology, 76(3), 482–497. https://pubmed.ncbi.nlm.nih.gov/10101878/
22. Silverman, J., & Barasch, A. (2023). *On or Off Track: How (Broken) Streaks Affect Consumer Decisions.* Journal of Consumer Research, 49(6), 1095–1117. https://academic.oup.com/jcr/article-abstract/49/6/1095/6623414
23. Stojanovic, M., Fries, S., & Grund, A. (2021). *Self-Efficacy in Habit Building: How General and Habit-Specific Self-Efficacy Influence Behavioral Automatization and Motivational Interference.* Frontiers in Psychology. https://www.frontiersin.org/articles/10.3389/fpsyg.2021.643753/full
24. Stojanovic, M., Grund, A., & Fries, S. (2022). *[Context stability and habit automaticity].* Frontiers in Psychology. https://pmc.ncbi.nlm.nih.gov/articles/PMC9226889/
25. *The dark side of streaking: Examining the backfire potential of run streaking in recreational runners who broke a long-term streak.* (2026). PLOS ONE, 21(5): e0317254. https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0317254
26. *Pathways to Student Motivation: A Meta-Analysis of Antecedents of Autonomous and Controlled Motivations.* (2022). https://pmc.ncbi.nlm.nih.gov/articles/PMC8935530/
27. *[Leaderboard positions and motivation via competence satisfaction/frustration in a gamified crowdsourcing task].* (2023). Internet Research, 33(7). https://www.emerald.com/intr/article/33/7/1/178330/
28. *[Effect of timing and frequency of push notifications on usage of a smartphone-based stress management intervention].* (2017). PLOS ONE. https://pmc.ncbi.nlm.nih.gov/articles/PMC5207732/
29. MCII meta-analysis (2021). Frontiers in Psychology. https://pmc.ncbi.nlm.nih.gov/articles/PMC8149892/
30. Lepper, M. R., Greene, D., & Nisbett, R. E. (1973). *Undermining children's intrinsic interest with extrinsic reward: A test of the "overjustification" hypothesis.* Journal of Personality and Social Psychology, 28(1), 129–137.

**Evidence caveats flagged for the team:** (a) The Duolingo 7-day (3.6×) and freeze (+0.38% DAL) numbers are industry data, not peer-reviewed — use as directional signal only; the circulating "14% Day-14 retention" figure is wrong (it is Day-7). (b) Hanus & Fox (novelty-decay) and the feature-rotation fix are the weakest link in the chain — ship §5 experiment #6 before committing. (c) The mobile if-then "7.5×" figure comes from Pirolli et al. (2017), not a Torous RCT, and is a non-randomized OR. (d) "34–65% 5-second dismissal" and "30–40% frequency cut raises CTR" are **not** peer-reviewed — excluded as evidence. (e) PLOS ONE streaking (N=17) is qualitative — direction solid, magnitudes illustrative.
