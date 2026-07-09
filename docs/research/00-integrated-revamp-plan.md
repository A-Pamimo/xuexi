<!-- Generated 2026-07-07 by the xuexi learning-consult multi-agent workflow.
     2 teams (Opus chiefs + Sonnet/Haiku workers) + lead consultant. Citations adversarially audited. -->

# xuexi — Integrated Revamp Plan

# xuexi Unified Revamp Plan
### Lead Learning Consultant — Integrated Pedagogy + Engagement Roadmap
*Date: 2026-07-06 · Ethic of record: anchor dopamine to genuine progress*

---

## 1. Executive Summary

xuexi does not need a redesign. Its three load-bearing systems — the comprehensible-input Feed, FSRS spaced retrieval, and the Tone Dojo — each sit on top of a confirmed meta-analytic finding, and both teams independently judged the *learning core* to be best-in-class versus every reviewed textbook and app. The revamp is about **calibration, sequencing, and disarming the engagement layer** so that dopamine tracks real progress instead of running against it.

Three convictions drive everything below:

1. **The engagement layer, not the learning core, is where the risk lives.** XP is engagement-contingent (the exact reward type with the strongest documented undermining of intrinsic motivation, d ≈ −0.40), the "golden" *random* multiplier is a slot-machine, and running the full gamification stack at once invites a ~4-month novelty-collapse cliff. Fixing these is P0. None of it touches FSRS or the Feed's pedagogy.

2. **There is one genuine pedagogy/engagement conflict, and learning wins it.** The engagement team wants to "keep high-variability multi-speaker" Tone Dojo as-is because variability builds durable tone categories. The pedagogy team shows that constant multi-speaker training from session one **actively harms low-aptitude beginners**. These are both true. The resolution is not compromise — it is **adaptive talker-count scaffolding**: single canonical speaker until an accuracy threshold, then widen. This preserves the engagement asset (the combo meter, the per-trial competence signal) while removing the documented harm. High variability becomes an *earned progression*, not a default.

3. **The highest-ROI content change is a database join, not a rewrite.** Re-anchoring the vocabulary pool on spoken-frequency (SUBTLEX-CH) with HSK demoted to a label fixes a systematic under-exposure of hundreds of high-frequency real-speech words. This is the single biggest lever in either report and it ships without touching the app shell.

The unifying test for every feature: **if an engagement metric rises but delayed retention / real comprehension does not, the feature has failed the ethic and ships off.**

---

## 2. Unified Design Principles (pedagogy + engagement, together)

These fuse both teams' principle sets. Each is stated so a PM can act on it.

**U1 — Reward difficulty and retention; never speed, logins, or task count.** XP must be weighted by cognitive demand (FSRS difficulty × retrievability, Tone accuracy), so grinding known cards is structurally impossible. *This is where the two teams converge hardest:* desirable-difficulty pedagogy and CET reward theory both point at the same fix. (Pedagogy P8; Engagement P6/P10.)

**U2 — Competence feedback is the reward.** Replace numeric-XP salience with informational/verbal competence signals ("you identified 91% of third tones, up 8%"). Points and levels are motivationally *neutral* — they lift output quantity, not competence or intrinsic motivation — while informational feedback is the strongest proximal driver of autonomous motivation. xuexi already owns the competence infrastructure (FSRS %, Tone accuracy, mastery grid); amplify it. (Pedagogy P4/P3; Engagement P6/P8/P10/P13.)

**U3 — Input and retrieval are one pipeline, not two features.** Incidental Feed input yields large-but-incomplete per-item gains (~13–17%); durable form-learning needs ~10–20 *spaced* encounters. Therefore every glossed word auto-promotes into FSRS, and a single unified frequency-anchored known-word model counts every encounter (Feed *or* Review) toward that target. (Pedagogy P2/P4/P5.)

**U4 — Form-focus and grammar are reactive, never front-loaded.** Reactive Focus-on-Form matched pre-taught instruction in effectiveness; this licenses tappable, contrastive grammar/tone notes triggered by repeated encounters, and forbids an English grammar track. (Pedagogy P3; Engagement §4.6 — "explanation available, never a rule tab.")

**U5 — Variability is earned, difficulty is adaptive, floors are per-user.** Tone Dojo talker-count, Feed coverage (98% acquisition / 95% challenge / ~90% audio-only), and FSRS difficulty all scale to the individual. High variability and 95% coverage are *challenge modes you graduate into*, because both help intermediates and hurt beginners. (Pedagogy P1/P10; Engagement U5 mirror in feature-unlock.)

**U6 — Agency is the safety mechanism for every habit mechanic.** Streak breakage harms through *internal self-attribution*; user-controlled cessation (proactive freeze) nearly eliminates that harm. Notifications must be autonomy-supportive, if-then framed, one per day. Controlling language ("Don't lose your streak") triggers reactance even when the content is beneficial. (Engagement P2/P4/P15/P17.)

**U7 — Front-load the phonological system and early competence wins.** Every classroom text front-loads pinyin/tones before vocabulary; the first 7 days are the highest-risk dropout window and early mastery seeds habit-specific self-efficacy. Combine them: onboarding = a short tone/pinyin primer that is *also* the user's first competence win. (Pedagogy §3 front-load; Engagement P21/P22.)

**U8 — Passive exposure is welcome but never counts as progress.** Hands-free ambient audio captures commute/chore hours, but only a successful FSRS recall or Tone ID earns XP or streak credit. Passive scrolling earning rewards would be the purest violation of the ethic. (Engagement §4.3 guardrail; Pedagogy P2 "input is not complete.")

**U9 — Tones are a permanent progression, not an onboarding screen.** Every textbook treats tones as "solved" after chapter two; the evidence says they require ongoing high-variability identification training that retains at 6 months. Tone Dojo recurs for the life of the account. (Pedagogy P9/§3; Engagement §4.5.)

**U10 — Measure engagement against learning, not DAU.** North-star guardrail: every engagement KPI is validated against a learning proxy (delayed retention, tone-accuracy trend, real-comprehension cloze). Do not optimize raw DAU, session count, or streak length in isolation. (Both teams' §5.)

---

## 3. What We Learned From Real Products (textbooks + apps)

**The clean synthesis:** the textbook world knows *what content to teach and in what order to introduce the sound system*; the app world knows *how to build a daily habit* — and each is catastrophic at the other's job. xuexi's opportunity is to be the first product that does both, because it already has the two scarce assets neither camp combines: auto-generated graded input (kills the Anki/Pleco content-creation burden) and FSRS (beats every app's engagement-tuned or fixed-interval scheduler).

**Copy (best-in-class, evidence-backed):**
- **Phonological front-load + disyllabic-first tone sequencing** (Integrated Chinese, HSK Standard Course): drill tone *pairs* before trisyllabic/sentence — matches natural speech and the HVPT curriculum.
- **Situational embedding + controlled recurrence of 10–30 encounters per word** (HSK, Boya, Mandarin Companion / Chinese Breeze graded readers): this is literally the Feed→FSRS target, validated from the reading-pedagogy side.
- **Semantic-radical decomposition on tap** (NPCR, Heisig primitives) — but see divergence below.
- **Streak + proactive freeze, endowed Day-1, milestone escalation at 7/30/100/365, sub-5-minute sessions, bilateral friend-streak accountability (22% completion lift from mutual stakes), progressive feature unlock** (Duolingo).
- **Learner-facing desired-retention slider, transparent "why this interval grew," hard new-item cap with load projection, honest retention %, leech→context routing** (Anki/SuperMemo/Pleco).
- **Hands-free ambient audio, forced anticipation before reveal, backward-syllable tone deconstruction, multi-speaker native audio** (Pimsleur/Glossika).

**Diverge (where best-in-class is wrong, or right-for-the-wrong-goal):**
- **Reject leaderboards/leagues outright.** They produce non-autonomous motivation at *every* rank — complacency at the top, ego-threat at the bottom, zero accountability benefit. This is the sharpest evidence-based divergence from Duolingo/HelloChinese and it aligns perfectly with xuexi's ethic. If social ships, use cooperative bilateral accountability only.
- **Reject the "tones are solved" fallacy** shared by *every* textbook (U9).
- **Reject frequency-blind sequencing.** Heisig buries 不/是/我 for months (不 at position #924); IC forces 贵姓 in Lesson 1. HSK itself omits ~650 high-frequency spoken words. Copy the *front-load*, reject the *order*.
- **Reject overlaid radical markings / colored components** — they empirically *harm* recognition. Decomposition must be tap-to-reveal on a clean grid, never default overlay. (This is where we diverge from the naïve "copy Heisig" instinct.)
- **Reject lenient tone ASR** (Duolingo + HelloChinese + Glossika's shared first-order failure): validating a wrong tone is worse than no feedback. If recording is ever added it gives acoustic pitch-contour feedback or makes no assessment claim.
- **Reject random reward + guilt notifications + engagement-tuned scheduling + monetized streak repair** — the entire "engagement theater" playbook that treats the learner as a retention metric.
- **Reject single-speaker studio TTS** ("textbook shock"): xuexi's multi-speaker Qwen3-TTS is a genuine structural advantage — but sequence it adaptively (§4 conflict resolution), don't blast all speakers from day one.

---

## 4. Prioritized Roadmap (P0 / P1 / P2)

Each item names the xuexi feature, the change, and the backing (research + product precedent).

### P0 — Ship first (highest ROI or active harm/ethics risk)

**P0-1 · Content: re-anchor vocab on SUBTLEX-CH spoken frequency.**
Join the vocab table to SUBTLEX-CH; make frequency rank (contextual-diversity sub-measure) the primary sequencing axis, HSK grade a label. Build a coverage-gap report and inject the ~650 high-frequency words missing from HSK 1–6 at their true rank (seed from Hacking Chinese lists). *Backing:* Nation 2006 coverage math + Cai & Brysbaert 2010 (SUBTLEX-CH predicts real exposure); precedent — graded readers' controlled-recurrence principle. *Why P0:* biggest lever in either report, a database join, no app-shell change.

**P0-2 · Tone Dojo: adaptive talker-count scaffolding. (Resolves the one real conflict — in favor of learning.)**
Start every beginner with a *single canonical speaker* until they clear ~70% on easy tone pairs, then progressively widen the speaker pool as mastery rises. Optional 30-second pitch-aptitude pretest routes low-aptitude users into the low-variability tier longer. Keep identification + trial-by-trial corrective feedback and the combo meter. *Backing:* Sadakata & McQueen 2014 + Uchihara et al. 2025 (high variability helps intermediates, does nothing for beginners, *harms* low-aptitude beginners); engagement precedent — combo-meter competence signal (Sailer 2017). *Why P0:* the current constant-multi-speaker game replicates a documented harm condition from session one. This is a safety fix, and it directly overrides the engagement report's "keep multi-speaker as-is."

**P0-3 · Gamification: kill the two ethics violations.**
(a) **Weight XP by cognitive demand** — a new HSK-5 FSRS card or high-accuracy tone combo yields strictly more than tapping a known card. (b) **Convert "golden" multipliers from random to earned** — trigger on performance events (combo peak, clean high-retrievability FSRS session), never chance or login. *Backing:* Deci/Koestner/Ryan 1999 (engagement-contingent reward d ≈ −0.40; informational framing flips the sign); Wilson 2019 desirable-difficulty (soft); precedent — HelloChinese's random gold-coin multiplier is on every teardown's avoid-list. *Why P0:* these are the two features most directly at odds with "anchor dopamine to genuine progress."

**P0-4 · Streaks: re-engineer breakage into a no-guilt, recoverable event.**
Supplement the day-streak with a rolling 6-week hit-rate ("41 of 42 days — 98%"); make freeze proactive/pre-day-end (never retroactive); add earned repair tokens; never show a broken-streak notice without an in-view recovery path; rewrite all copy to external attribution ("Life happens — your streak is safe for 24h"). Never monetize repair. *Backing:* Silverman & Barasch 2023 (internal attribution is the harm; repair attenuates it), PLOS ONE 2026 (agency eliminates grief), Mehr 2025 (streaks work via commitment); precedent — Anki hit-rate framing + Duolingo freeze. *Why P0:* cheap, defuses the streak's real harm, protects wellbeing.

**P0-5 · Feed→FSRS coupling: auto-promote glossed words.**
Any word tapped 1–2× in the Feed enters the FSRS queue; unify the known-word model across Feed and Reviews so every encounter counts toward ~10–20 exposures. *Backing:* He et al. 2026 (interactional L1 glosses d ≈ 1.49), Schmitt 2008 / van Zeeland & Schmitt 2013 (10–20 encounters); precedent — SuperMemo incremental reading. *Why P0:* turns opportunistic glossing into durable learning; it is the pipeline the product is actually built on.

### P1 — Next (high value, more build)

**P1-1 · Feed: two coverage modes + default reading+listening + anticipation gate.** Acquisition mode = 98% known tokens (default), Challenge = 95%, audio-only may relax to ~90%; adaptive per-user floor via gloss-tap rate; never audio-only by default; pause-and-anticipate before gloss reveal; cap new-word density ≤5%. *Backing:* Kremmel 2023, Nation 2006, Webb 2023; precedent — Pimsleur forced anticipation.

**P1-2 · FSRS: metacognitive transparency + load protection.** Learner-facing desired-retention slider (80/90/95%) with load tradeoff; surface per-card stability/retrievability; hard daily new-item cap with 30-day projection; cap ~50 overdue/session; audit initial intervals toward near-uniform (1-3-7-14 over 1-5-15); couple interval sizing to a user-stated retention goal. *Backing:* Karpicke & Roediger 2007, Cepeda 2008, Mettler 2016; precedent — Anki/Pleco transparency, avoid Glossika opacity.

**P1-3 · Onboarding & first two weeks.** Phonological-primer-as-first-win; capture a self-concordant "why" (shown on home) + one if-then plan (times the daily cue); set explicit 10-week automaticity expectation; front-load competence wins with behavior-specific feedback; progressive unlock (Feed → FSRS after ~10 cards → Tone Dojo after first review); endowed Day-1 streak. *Backing:* Gollwitzer 1999 (if-then d ≈ 0.65), Sheldon & Elliot 1999, Lally 2010, Dai/Milkman/Riis 2014, Stojanovic 2021; precedent — Duolingo path linearization.

**P1-4 · Notifications: one autonomy-supportive cue/day.** User-selected slot, if-then/progress/choice framing, suppress low-receptivity windows, never guilt/controlling copy. *Backing:* Stojanovic 2022 (context stability > frequency), Frontiers Communication 2019 (reactance), PLOS ONE 2017 (daily blasts → 53% quit); offline-first is an asset here.

**P1-5 · Character grid: tap-to-reveal semantic-radical decomposition.** Clean grid, no default overlays; component-mnemonic surfaced only *after* two failed hanzi→meaning reviews (rescue cue); reactive confusable-pair cards (己/已/巳); recognition-first, handwriting optional (never a gate). *Backing:* Wang/Pei/Wu/Su 2017, Hou & Jiang 2022 (overlays harm), Feng 2022, Shen & Ke 2007.

**P1-6 · Hands-free ambient mode** for Feed/Review — with the U8 guardrail (passive exposure earns no XP/streak). *Backing:* precedent — Glossika listening-only; Webb 2023 (input value).

### P2 — Later (valuable, lower urgency or weaker evidence)

**P2-1 · Reactive Focus-on-Form pop-ups** — compact contrastive *table* after a pattern is met ~3+ times; one-line pattern tag on the gloss card. *Backing:* Norris & Ortega 2000; precedent — HSK tables, avoid IC prose.
**P2-2 · Trainable per-user forgetting model** (HLR-style) to cut scheduling error. *Backing:* Settles & Meeder 2016.
**P2-3 · Game-element rotation** (subset early, new mechanic ~3-month mark). *Backing:* Hanus & Fox 2015 (novelty-decay, *partially-supported*). **Ship as A/B before committing — weakest evidence plank.**
**P2-4 · Cooperative bilateral accountability** (friend-streak, mutual stakes) if social is ever added — never leaderboards. *Backing:* Duolingo 22% lift signal; Internet Research 2023 (leaderboards harm at every rank).
**P2-5 · Backward-syllable tone micro-drill; weekly recap that surfaces the science** ("you've seen 是 14× across 9 days — spaced, not crammed"); HSK counts as celebration milestones framed as input-hours/characters-mastered, not "level attained." *Backing:* Cepeda 2006, Mawson & Kang 2025.
**P2-6 · Production (deferred).** No speaking feature now; if added, gate F0/pitch-contour feedback behind perceptual accuracy. *Backing:* Wang/Jongman/Sereno 2003, Uchihara 2024 (transfer weak/fading — justifies waiting).

---

## 5. Guardrails (explicit limits protecting learning & wellbeing)

1. **FSRS is the sole scheduling authority.** Never surface an "easy" or early review to boost DAU. Engagement-tuned scheduling is Duolingo's documented failure.
2. **Passive exposure never earns progress credit.** Only a successful FSRS recall or Tone ID grants XP/streak. Ambient-mode scrolling earns nothing.
3. **XP is never weighted by task count or speed.** Flat XP-per-difficulty-unit across a session is a grinding leak and must alarm.
4. **No random/chance-based rewards.** All bonuses are performance-contingent. No treasure-chest slot-machine mechanics.
5. **No leaderboards, leagues, or stranger ranking.** Social, if any, is cooperative and bilateral only.
6. **No monetized or retroactive streak repair; no all-or-nothing streak.** Repair is earned through substantive practice; freeze is proactive; life disruption is never a paywall.
7. **No guilt/anxiety-optimized notifications; max one cue/day; controlling language banned.** Anxiety-compliance collapses when the bond breaks.
8. **Tone accuracy is never softened for engagement.** No lenient ASR; assessment claims require real acoustic feedback.
9. **No front-loaded English grammar track; no handwriting gate; no default radical overlays.** All three are empirically counterproductive or unnecessary.
10. **High-variability Tone Dojo and 95% Feed coverage are earned tiers, never beginner defaults** — because both help intermediates and *harm* low-aptitude beginners.
11. **The kill-switch rule:** any feature whose A/B raises an engagement metric while delayed retention / real-comprehension stays flat or drops **fails the ethic and ships off**, regardless of DAU impact.

---

## 6. Open Questions / Where Evidence Is Thin

- **The "85% desirable-difficulty rule" is the weakest pedagogy plank.** Source is gradient-descent/neural-net learning; human-vocabulary extension is speculative and the audit found fabricated authorship. Use ~80–85% as a *soft* steering target for FSRS difficulty; **build no hard difficulty gate on it.**
- **Exact FSRS interval ratios are directionally confirmed but numerically unsettled.** Near-uniform > aggressive-expanding is solid; the specific percentages are A/B starting points, not constants. Run the interval-shape test (30-day delayed recall as primary).
- **Feature-rotation as the fix for the ~4-month novelty cliff is a reasoned hypothesis, not tested.** Hanus & Fox is partially-supported. Gate P2-3 behind experiment #6 before committing.
- **Radical-awareness effect sizes had corrupted metadata and a non-significant proficiency moderator.** Pitch decomposition as "modest, intermediate+" gains — not guaranteed.
- **"Streaks motivate advanced learners more than beginners" (Huynh & Iida)** is partially-supported; treat level-differentiated streak framing as a testable hypothesis.
- **Industry signals are directional only.** Duolingo's 7-day 3.6× and freeze +0.38% DAL are not peer-reviewed; the circulating "14% Day-14 retention" figure is wrong (it is Day-7). The friend-streak 22% and mobile if-then multipliers are non-randomized ORs.
- **The "competence pathways strengthen with age" and audio-only ~90% floor** are inferences at the edge of their evidence; validate with the coverage-mode and sequencing experiments.

**Flagship experiments to resolve the above (run in this order):** (1) SUBTLEX-CH vs HSK sequencing — primary: authentic-audio cloze at matched hours; (2) Tone Dojo adaptive vs constant-multi-speaker — primary: untrained-talker accuracy + Week-1 churn, segmented by pitch aptitude (this is *also* the safety check on P0-2); (3) XP-numeric vs competence-summary — primary: 180-day retention + intrinsic-motivation score; (4) golden random vs earned vs off; (5) streak raw-day vs rolling hit-rate — primary: post-miss return + self-reported anxiety.

---

## 7. Consolidated References

*Grading preserved from source teams: [C] confirmed · [P] partially-supported (paper real; a statistic or authorship in the original claim was corrected) · [weak] hypothesis/mixed. Industry blog figures are directional signal, not evidence, and are excluded.*

**Vocabulary, input & sequencing**
- Cai, Q., & Brysbaert, M. (2010). SUBTLEX-CH: Chinese word and character frequencies based on film subtitles. *PLOS ONE, 5*(6), e10729. [P]
- He, S., Shaari, A. H., & Ng, L. S. (2026). The effects of glosses on English L2 incidental vocabulary learning through reading: A meta-analysis. *Frontiers in Language Sciences, 5*, 1815571. [C]
- Kremmel, B., Indrarathne, B., Kormos, J., & Suzuki, S. (2023). Unknown vocabulary density and reading comprehension: Replicating Hu and Nation (2000). *Language Learning, 73*(4). [C]
- Nation, I. S. P. (2006). How large a vocabulary is needed for reading and listening? *Canadian Modern Language Review, 63*(1), 59–82. [C]
- Schmitt, N. (2008). Instructed second language vocabulary learning. *Language Teaching Research, 12*(3), 329–363. [P]
- van Zeeland, H., & Schmitt, N. (2013). Incidental vocabulary acquisition through L2 listening: A dimensions approach. *System, 41*(3), 609–624. [P]
- Webb, S., Uchihara, T., & Yanagisawa, A. (2023). How effective is second language incidental vocabulary learning? A meta-analysis. *Language Teaching, 56*(2), 161–180. [C]
- Xu, X., & Li, J. (2020). Concreteness/abstractness ratings for two-character Chinese words in MELD-SCH. *PLOS ONE, 15*(6), e0232133. [P]
- Lei et al. (2025). HSK coverage of authentic Chinese audio. *System.* [P — DOI incomplete; verify] · Hacking Chinese (2014). *What important words are missing from HSK?* (practitioner source.)

**Spacing, retrieval & instruction**
- Cepeda, N. J., et al. (2006). Distributed practice in verbal recall tasks: A review and quantitative synthesis. *Psychological Bulletin, 132*(3), 354–380. [P]
- Cepeda, N. J., et al. (2008). Spacing effects in learning: A temporal ridgeline of optimal retention. *Psychological Science, 19*(11), 1095–1102. [P]
- Karpicke, J. D., & Roediger, H. L. (2007). Expanding retrieval promotes short-term retention, but equally spaced retrieval enhances long-term retention. *JEP:LMC, 33*(4), 704–719. [P]
- Mawson & Kang (2025). The distributed practice effect on classroom learning: A meta-analytic review. [P]
- Mettler, E., Massey, C. M., & Kellman, P. J. (2016). A comparison of adaptive and fixed schedules of practice. *JEP: General, 145*(7), 897–917. [P]
- Norris, J. M., & Ortega, L. (2000). Effectiveness of L2 instruction: A research synthesis and meta-analysis. *Language Learning, 50*(3), 417–528. [C]
- Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning. *Psychological Science, 17*(3), 249–255. [P]
- Settles, B., & Meeder, B. (2016). A trainable spaced repetition model for language learning (Duolingo HLR). *ACL 2016.* [P]
- Wilson, R. C., Shenhav, A., Straccia, M., & Cohen, J. D. (2019). The eighty-five percent rule for optimal learning. *Nature Communications, 10*, 4646. [weak — scope caveat: gradient-descent learning; human extension speculative]

**Tone / phonetic training**
- Sadakata, M., & McQueen, J. M. (2014). Individual aptitude in Mandarin lexical tone perception predicts effectiveness of high-variability training. *Frontiers in Psychology, 5*, 1318. [C]
- Uchihara, T., Karas, M., & Thomson, R. I. (2025). High variability phonetic training: A meta-analysis of L2 perceptual training studies. *SSLA, 47*(3). [C]
- Uchihara, T., Karas, M., & Thomson, R. I. (2024). Does perceptual HVPT improve L2 speech production? *Applied Psycholinguistics, 45*(4). [P]
- Wang, Y., Spence, M. M., & Sereno, J. A. (1999). Training American listeners to perceive Mandarin tones. *JASA, 106*(6), 3649–3658. [P]
- Wang, Y., Jongman, A., & Sereno, J. A. (2003). Acoustic and perceptual evaluation of Mandarin tone productions before and after perceptual training. *JASA, 113*(2), 1033–1043. [P]

**Characters / orthography**
- Feng, X., Mak, W. Y., Wang, S., & Cai, Q. (2022). How characters are learned leaves its mark on the neural substrates of Chinese reading. *eNeuro.* [P]
- Guan, C. Q., et al. (2021). Effect of handwriting on visual word recognition in Chinese bilingual children and adults. *Frontiers in Psychology, 12*, 628160. [P]
- Hou & Jiang (2022). Interference effects of radical markings and stroke-order animations on Chinese character learning among L2 learners. *Frontiers in Psychology.* [P]
- Shen, H. H., & Ke, C. (2007). Radical awareness and word acquisition among nonnative learners of Chinese. *Modern Language Journal, 91*(1). [P]
- Wang, X., Pei, M., Wu, Y., & Su, Y. (2017). Semantic radicals contribute more than phonetic radicals to the recognition of Chinese phonograms. *Frontiers in Psychology, 8*, 2230. [P]
- Zang et al. (2025). The association between metalinguistic awareness and Chinese word reading: A three-level meta-analysis. *Language Learning.* [P]

**Streaks, gamification & motivation (SDT/CET)**
- Deci, E. L., Koestner, R., & Ryan, R. M. (1999). A meta-analytic review of experiments examining the effects of extrinsic rewards on intrinsic motivation. *Psychological Bulletin, 125*(6), 627–668. [C]
- Eckert, M., Scherenberg, V., & Klinke, C. (2023). How a token-based game may elicit the reward prediction error… *PMC10116860.* [P]
- Hanus, M. D., & Fox, J. (2015). Assessing the effects of gamification in the classroom: A longitudinal study. *Computers & Education, 80*, 152–161. [P]
- Huynh, D., & Iida, H. (2017). An analysis of winning streak's effects in Duolingo. *APJITM, 6*(2), 23–29. [P]
- Kivetz, R., Urminsky, O., & Zheng, Y. (2006). The goal-gradient hypothesis resurrected. *JMR, 43*(1), 39–58. [C]
- Lepper, M. R., Greene, D., & Nisbett, R. E. (1973). Undermining children's intrinsic interest with extrinsic reward. *JPSP, 28*(1), 129–137. [C]
- Li, L., Hew, K. F., & Du, J. (2024). Gamification enhances intrinsic motivation, autonomy, relatedness; minimal impact on competence. *ETR&D.* [P]
- Mehr, K., et al. (2025). The motivating power of streaks. *OBHDP.* [C]
- Mekler, E. D., Brühlmann, F., Tuch, A. N., & Opwis, K. (2017). Towards understanding the effects of individual gamification elements. *Computers in Human Behavior.* [C]
- Nunes, J. C., & Drèze, X. (2006). The endowed progress effect. *JCR, 32*(4), 504–512. [C]
- *Pathways to Student Motivation: A Meta-Analysis of Antecedents of Autonomous and Controlled Motivations* (2022). PMC8935530. [P]
- PLOS ONE (2026). The dark side of streaking. *21*(5), e0317254. [C — small/qualitative, N=17]
- Sailer, M., Hense, J. U., Mayr, S. K., & Mandl, H. (2017). How gamification motivates. *Computers in Human Behavior.* [C]
- Silverman, J., & Barasch, A. (2023). On or off track: How (broken) streaks affect consumer decisions. *JCR, 49*(6), 1095–1117. [C]
- *Internet Research, 33*(7) (2023). Leaderboard positions and motivation via competence satisfaction/frustration. [C]

**Habit formation, goals & notifications**
- Dai, H., Milkman, K. L., & Riis, J. (2014). The fresh start effect. *Management Science.* [C]
- Gardner, B., Lally, P., & Wardle, J. (2012). Making health habitual. *Br. J. General Practice.* [C]
- Gollwitzer, P. M. (1999). Implementation intentions: Strong effects of simple plans. *American Psychologist, 54*(7), 493–503. [P]
- Gollwitzer, P. M., & Sheeran, P. (2006). Implementation intentions and goal achievement: A meta-analysis. *Advances in Experimental Social Psychology, 38*, 69–119. [P]
- Lally, P., et al. (2010). How are habits formed: Modelling habit formation in the real world. *EJSP, 40*(6), 998–1009. [C]
- Mark, G., Gudith, D., & Klocke, U. (2008). The cost of interrupted work. *CHI 2008.* [C]
- Mehrotra, A., et al. (2016). Understanding people's receptivity to mobile notifications. *CHI 2016.* [P]
- Pielot, M., et al. (2017/2018). Beyond interruptibility; Dismissed! *UbiComp / MobileHCI.* [P]
- PLOS ONE (2017). Effect of timing/frequency of push notifications on a stress-management app. PMC5207732. [C]
- Frontiers in Communication (2019). Psychological reactance and persuasive health communication. *4*:56. [C]
- Sheldon, K. M., & Elliot, A. J. (1999). Goal striving, need satisfaction, and longitudinal well-being: the self-concordance model. *JPSP, 76*(3), 482–497. [P]
- Stojanovic, M., Fries, S., & Grund, A. (2021). Self-efficacy in habit building. *Frontiers in Psychology.* [P]
- Stojanovic, M., Grund, A., & Fries, S. (2022). Context stability and habit automaticity. *Frontiers in Psychology*, PMC9226889. [C]
- MCII meta-analysis (2021). *Frontiers in Psychology*, PMC8149892. [P]

**Product teardowns (non-academic, directional):** Integrated Chinese; New Practical Chinese Reader; HSK Standard Course; Boya Chinese; Heisig RSH; Mandarin Companion / Chinese Breeze graded readers; Duolingo; HelloChinese; Anki / SuperMemo; Pleco; Pimsleur / Glossika.
