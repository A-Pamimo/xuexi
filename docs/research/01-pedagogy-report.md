<!-- Generated 2026-07-07 by the xuexi learning-consult multi-agent workflow.
     2 teams (Opus chiefs + Sonnet/Haiku workers) + lead consultant. Citations adversarially audited. -->

# Pedagogy & Curriculum — Team Report

# Curriculum & Pedagogy Team Report: Revamping xuexi

*Prepared by the Chief, Curriculum & Pedagogy. Evidence tiering: **[C]** = confirmed in audit; **[P]** = partially-supported (core claim holds, bibliographic metadata was corrupted and has been corrected in References); **[weak]** = hypothesis only, evidence mixed or out-of-scope. Product teardowns are labeled **[T]**.*

---

## 1. Executive Summary

- **xuexi's architecture is already aligned with the strongest evidence.** The three load-bearing mechanisms — comprehensible-input Feed, FSRS spaced retrieval, and multi-speaker Tone Dojo — each map onto a confirmed meta-analytic finding. The revamp is about *calibration and sequencing*, not redesign.
- **The single biggest content lever is sequencing.** HSK grading systematically under-exposes learners to hundreds of high-frequency real-speech words. Re-anchoring the vocabulary pool on a spoken-frequency corpus (SUBTLEX-CH) is the highest-ROI change and is a database join, not a rewrite. **[C: Nation 2006; P: Cai & Brysbaert 2010]**
- **Tone Dojo carries a real, evidence-based risk for absolute beginners.** High talker-variability *helps high-aptitude learners and actively hurts low-aptitude beginners*. A constant multi-speaker game from session one replicates the harmful condition. Adaptive speaker-count scaffolding is a required fix, not a nicety. **[C: Sadakata & McQueen 2014; C: Uchihara, Karas & Thomson 2025]**
- **The Feed alone cannot carry acquisition; the Feed→Reviews pipeline is the product.** Incidental input yields large but incomplete per-item gains (~13–17%); durable form-learning needs ~10–20 spaced retrieval encounters. This validates coupling gloss-taps directly into FSRS. **[C: Webb, Uchihara & Yanagisawa 2023; P: van Zeeland & Schmitt 2013; P: Schmitt 2008]**
- **Explicit form-focus is justified — but only reactively.** Focus-on-Form (triggered by input encounters) matched pre-taught Focus-on-FormS in effectiveness; this licenses lightweight, tappable grammar/tone notes but forbids a front-loaded English grammar track. **[C: Norris & Ortega 2000]**
- **Every leading textbook front-loads the phonological system before vocabulary, and every one except graded readers treats tones as "solved" afterward.** xuexi should copy the front-load and reject the "solved" fallacy — Tone Dojo must be a permanent progression, not an onboarding screen. **[T: Integrated Chinese, NPCR, HSK Standard Course]**
- **Recognition-first is the correct mobile priority; handwriting is optional.** Recognition-only study activates native-like reading networks and matches handwriting on immediate accuracy. Component/radical awareness (semantic, not phonetic; tap-to-reveal, never overlaid) is the retention upgrade worth adding. **[P: Feng et al. 2022; P: Wang, Pei, Wu & Su 2017; P: Hou & Jiang 2022]**
- **Gamification must reward difficulty and retention, not speed or logins** — this is both the stated ethic and what the "desirable difficulty" evidence implies. Where a headline number is popularly cited but scientifically shaky (e.g., the "85% rule"), we flag it and do not build hard gates on it. **[weak: Wilson et al. 2019]**

---

## 2. Evidence-Based Principles

**P1 — Keep the Feed above a comprehension floor, but treat 95% and 98% coverage as different modes.**
The 98% known-token threshold is real but learner-dependent; a non-WEIRD replication could not fully confirm it, meaning the floor must adapt per user. **[C: Kremmel, Indrarathne, Kormos & Suzuki 2023]** Nation's synthesis independently fixes 98% as the comprehension threshold and 6,000–9,000 word families as the coverage target. **[C: Nation 2006]** For audio-primary content the floor can relax toward ~90%. **[P: van Zeeland & Schmitt 2013]**

**P2 — Incidental input is a legitimate acquisition engine but not a complete one.**
Meta-analysis of 24 studies (N=2,771): Hedges' g = 1.14 immediate / 0.93 delayed; per-item proportional gains 13–17% by modality; reading (or reading+listening) beats audio-only; **spaced substantially beat massed.** **[C: Webb, Uchihara & Yanagisawa 2023]**

**P3 — Explicit, reactive form-focus outperforms pure implicit exposure for form.**
49-study synthesis: explicit instruction produced larger effects than implicit; Focus-on-Form ≈ Focus-on-FormS (reactive is sufficient). Caveat: explicit *outcome measures* may inflate the explicit advantage. **[C: Norris & Ortega 2000]**

**P4 — User-triggered (interactional) glosses are the high-efficacy variant, and L1 glosses beat L2.**
26-study meta-analysis: overall d = 0.935; interactional/experimental glosses d = 1.494; static positional glosses only d = 0.375; L1 > L2. xuexi's tap-to-reveal English gloss is precisely the best-supported design. **[C: He, Shaari & Shi 2026]**

**P5 — Vocabulary is incremental; ~10–20 spaced encounters are needed for consolidated knowledge.**
Listening consolidation needs ≥15 encounters **[P: van Zeeland & Schmitt 2013]**; Schmitt's review puts usable knowledge at ~10–20 exposures. **[P: Schmitt 2008]** This is the quantitative justification for the Feed→FSRS handoff.

**P6 — Adaptive spacing beats fixed schedules; spacing should scale with the retention goal; uniform ≥ aggressive-expanding for long-term retention.**
Adaptive vs fixed: d = 0.56–0.57 (yoked-control d = 0.74–0.80). **[P: Mettler, Massey & Kellman 2016]** Optimal inter-study interval ≈ 20–40% of a 1-week goal, declining to 5–10% for a 1-year goal. **[P: Cepeda et al. 2008]** Equally-spaced retrieval beat expanding at delayed test. **[P: Karpicke & Roediger 2007]** Testing beats restudy; trainable forgetting models cut recall-prediction error ~45%. **[P: Roediger & Karpicke 2006; Settles & Meeder 2016]**

**P7 — Distributed practice beats massed for L2 vocabulary (classroom d ≈ 0.54).** **[P: Cepeda et al. 2006; Mawson & Kang 2025]**

**P8 — Desirable difficulty: aim practice near ~80–85% success.**
The "85% rule" gives a convenient target, **but the source paper is about gradient-descent/neural-net learning and its extension to human vocabulary is explicitly speculative; the audit also found the finding's author list was fabricated.** Treat as a soft heuristic, not a validated law. **[weak: Wilson, Shenhav, Straccia & Cohen 2019]**

**P9 — HVPT (identification, multi-talker, with corrective feedback) reliably improves Mandarin tone ID, generalizes to new speakers, and retains at 6 months.** Identification g = 0.95 > discrimination g = 0.57. **[P: Wang, Spence & Sereno 1999; C: Uchihara, Karas & Thomson 2025]**

**P10 — Talker count helps only intermediate+; it does nothing for beginners and *harms* low-pitch-aptitude beginners.** Higher-proficiency learners gained up to g = 1.44 with six talkers; beginners gained nothing extra. Low-aptitude learners improved most under *low* variability and were hindered by high variability. **[C: Uchihara et al. 2025; C: Sadakata & McQueen 2014]**

**P11 — Perception-only training transfers to production (~18% gain), but untrained-item generalization is weak (g≈0.20) and fades.** No production feature is required now; if added later, gate it behind perceptual accuracy. **[P: Wang, Jongman & Sereno 2003; P: Uchihara, Karas & Thomson 2024]**

**P12 — For characters: semantic radicals aid recognition; phonetic regularity does not (behaviorally/neurally); overlaid radical markings *harm* recognition; recognition-only ≈ handwriting for early accuracy and activates native reading networks.** **[P: Wang, Pei, Wu & Su 2017; P: Hou & Jiang 2022; P: Feng, Mak, Wang & Cai 2022; P: Guan et al. 2021]**

**P13 — Frequency-first sequencing is the most direct path to coverage; spoken-subtitle frequency (SUBTLEX-CH) predicts real exposure better than written corpora; HSK misaligns with spoken frequency (~650 high-frequency words absent from HSK 1–6).** Concreteness/imageability are valid *secondary* tiebreakers only. **[C: Nation 2006; P: Cai & Brysbaert 2010; P: Lei et al. 2025 / Hacking Chinese 2014; P: Xu & Li 2020]**

---

## 3. What the Leading Textbooks/Courses Do

### Comparison table

| Dimension | Integrated Chinese | New Practical Chinese Reader | HSK Standard Course | Boya Chinese | Heisig RSH | Graded Readers (MC / Chinese Breeze) |
|---|---|---|---|---|---|---|
| **Method** | PPP; English grammar notes | Grammar-communicative + audio-lingual drill | Structural-situational, test-aligned (PPP) | Structure-Situation-Function; Chinese-language grammar | Character-first mnemonic isolation | Extensive reading / comprehensible input |
| **Phonology front-load** | Yes (Basics) | Yes (2 prep lessons) | Yes (Lessons 1–2) | Light, pinyin-supported | None (no tones/pinyin at all) | None (assumes pinyin known) |
| **Ongoing tone training** | No (treated as solved) | Some drills, multi-speaker | Tone-collocation drills, isolated from meaning | Weak / passive | None | None (passive via audio) |
| **Sequencing basis** | Topical/situational (not frequency) | Component-then-graded | HSK syllabus (frequency-ish, test-driven) | HSK + function, ~2× vocab breadth | Component-complexity (不 at #924!) | Frequency/HSK-aligned, controlled |
| **Vocab load** | 40–80/lesson (too high) | 20–30/lesson | Exact HSK counts (150→5000) | ~1000/level | 3000 chars in isolation | Controlled recurrence (10–30 encounters) |
| **SRS / spaced review** | None (5-lesson recap) | Cyclical review | None | None | Anki (community, external) | Incidental recurrence only |
| **Character approach** | Topic-ordered; stroke order in separate workbook | Component→radical→char, stroke order | Radical decomposition + stroke order | Gradual, recognition-oriented | Primitive decomposition + handwriting output | In running prose |
| **Register/authenticity** | Artificial dialogues | Somewhat stiff/formal | "Drenched in happiness," inauthentic | Student-life relevant | N/A | Engaging narrative (strength) |
| **Self-study fit** | Hostile (needs teacher) | Classroom | Classroom | Classroom | Solo-capable | Solo-capable |

### What to borrow
- **Phonological front-load before vocabulary** (all classroom texts). Onboard with 3–5 tone/pinyin orientation cards + a Tone Dojo primer before the Feed opens. **[T: IC Basics; HSK L1–2; NPCR prep]**
- **Disyllabic-first tone-collocation sequencing** — drill tone *pairs* (T3+T3, T2+T4…) before trisyllabic and sentence-level, matching natural speech. **[T: HSK Standard Course]**
- **Situational embedding of every new word** — each Feed card is a micro-scenario (who/to whom/context), not a decontextualized example. **[T: HSK; Boya Structure-Situation-Function]**
- **Semantic-radical / component decomposition on tap** in the character grid, with shared-component nodes. **[T: NPCR; Heisig primitive system]**
- **Controlled recurrence targeting 10–30 encounters per word** across the reading history — the graded-reader design principle, which is exactly P5. **[T: Mandarin Companion / Chinese Breeze]**
- **Narrative/episodic framing and morpheme-aware glosses** (e.g., 工作 = 工 + 作). **[T: NPCR Gubo/Palanka; HSK morphology; Boya]**
- **Scaffold-then-withdraw for characters** (Heisig's Stories→Plots→Elements), but *automated per-character via FSRS* rather than per-chapter. **[T: Heisig]**

### What to avoid
- **English/Chinese metalinguistic grammar as the primary mode** (IC's English paragraphs; Boya's Chinese-only notes learners skip). **[T]** Contradicts P3's *reactive* finding.
- **Single-speaker, studio-paced audio** — the documented cause of "textbook shock." xuexi's multi-speaker Qwen3-TTS is a genuine structural advantage; never normalize to one voice. **[T: IC, HSK]**
- **Batch vocabulary loads (40–80/lesson) with no retention infrastructure.** **[T: IC, NPCR]** Violates P5–P7.
- **Frequency-blind sequencing** — Heisig's component-complexity order buries 不/是/我 for months; IC forces 贵姓 in Lesson 1. **[T]** Violates P13 and the stated ethic.
- **Overlaid radical markings / colored component highlighting** — empirically *harms* recognition. **[T; P: Hou & Jiang 2022]**
- **Treating tones as "done" after onboarding.** **[T: all classroom texts]**
- **Emotionally flat, exam-driven, or dated content** — "drenched in happiness" HSK dialogues suppress emotional salience and memorability. **[T: HSK]**
- **Handwriting as a progression gate / characters-first-then-language.** **[T: Heisig]** Violates P12.

---

## 4. Concrete Recommendations Mapped to xuexi Features

### 4.1 Content & Sequencing (highest priority)
1. **Re-anchor the vocabulary pool on SUBTLEX-CH spoken frequency.** Join the vocab table to SUBTLEX-CH on word form; make frequency rank (or its contextual-diversity sub-measure) the primary sequencing axis, with HSK grade as a *scaffold/label*, not the driver. **Why:** Nation's coverage math + SUBTLEX-CH's superior prediction of real exposure; xuexi's subtitle-like TTS register maps directly onto the corpus. **[C: Nation 2006; P: Cai & Brysbaert 2010]**
2. **Build a coverage-gap report** and inject the ~650 high-frequency words missing from HSK 1–6 at their true frequency rank. Start from the Hacking Chinese lists (HSK 1–3: 39 words; HSK 4: 67). **[P: Lei et al. 2025 / Hacking Chinese 2014]**
3. **Add a `learnability_score` column (MELD-SCH concreteness) as a secondary sort only** — surface concrete/imageable words first *within* a frequency band; never promote low-frequency abstract items above high-frequency ones. **[P: Xu & Li 2020]**
4. **Preserve the pragmatic early cluster** (greetings→family→time→hobbies→transactions) as a co-constraint on the frequency sort. **[T: IC first 5 lessons]**
5. **Inject emotional and register variety** (humor, confusion, surprise, informal/social-media register); refresh content quarterly. **[T: HSK avoid; Boya/graded-reader borrow]**

### 4.2 Comprehensible-Input Feed
6. **Two explicit coverage modes.** "Acquisition mode" cards = 98% known tokens (default); "Challenge mode" = 95%. Never treat them interchangeably. Audio-primary cards may relax to ~90%. **[C: Kremmel 2023, Nation 2006; P: van Zeeland & Schmitt 2013]**
7. **Adaptive per-user floor via a comprehension proxy.** Track gloss-tap rate per card; a rising rate means coverage is too low → tighten unknown-word density for that user. High gloss-tap rate on a card should feed back into the generator. **[C: Kremmel 2023; He 2026]**
8. **Default to reading+listening (text+audio together), never audio-only,** because reading yields the highest lexical gain and Mandarin's orthographic load makes simultaneous channels matter more. **[C: Webb et al. 2023]**
9. **Gloss = L1 (English) primary, plus 2–3 senses and top compound(s)** (好 → "good; well; very" + 好吃/爱好). Keep it tap-triggered (interactional), never always-on inline. **[C: He et al. 2026]** Avoid Heisig-style single-keyword monosemy. **[T]**
10. **Cap new-word density ≤5% per sentence** (1 new / ~20). **[C: Nation 2006]**

### 4.3 Reviews (FSRS) — audit and couple
11. **Promote glossed words into FSRS.** Any word tapped 1–2× in the Feed enters the retrieval queue — this operationalizes the gloss→retrieval→consolidation chain and turns opportunistic glossing into durable learning. **[C: He et al. 2026; P: Schmitt 2008]**
12. **Audit initial intervals for over-aggressive expansion.** Prefer modest, near-uniform ratios (≈1d–3d–7d–14d) over 1d–5d–15d; uniform beat expanding for long-term retention. **[P: Karpicke & Roediger 2007]**
13. **Couple interval sizing to a user-stated retention goal** ("remember for a month" vs "master for a year"), scaling the inter-study interval per Cepeda's ridgeline (~20–40% down to 5–10% of the goal horizon). **[P: Cepeda et al. 2008]**
14. **Monitor per-card success distributions.** Cards persistently >90% → raise difficulty; <70% → lower it; steer toward the ~80–85% zone as a *soft* target (flagged evidence). **[weak: Wilson et al. 2019]**
15. **Keep a unified frequency-anchored "known-word" model shared by Feed and Reviews** so every encounter (Feed or Review) counts toward the ~10–20 exposure target. **[P: Schmitt 2008; van Zeeland & Schmitt 2013]**
16. **Roadmap: a trainable per-user forgetting model** (HLR-style) to cut scheduling error. **[P: Settles & Meeder 2016]**

### 4.4 Tone Dojo (highest *risk* item)
17. **Adaptive talker-count scaffolding — required.** Start every beginner with a *single canonical speaker* until they clear an accuracy threshold (e.g., ~70% on easy tone pairs), then progressively widen the speaker pool as XP/mastery rises. Beginners gain nothing from many talkers and low-aptitude beginners are *harmed*. **[C: Sadakata & McQueen 2014; Uchihara et al. 2025]**
18. **Optional 30-second pitch-aptitude pretest** on first launch to route low-aptitude users into the low-variability tier longer. **[C: Sadakata & McQueen 2014]**
19. **Keep identification + trial-by-trial corrective feedback** (already correct; the higher-effect format, g=0.95 vs 0.57). **[C: Uchihara et al. 2025]**
20. **Disyllabic-first curriculum:** tone pairs before trisyllabic before sentence-level. **[T: HSK]**
21. **Anchor tones to meaningful syllables** (ma = mother/hemp/horse/scold), never naked syllables — improves memorability. **[T: HSK avoid]**
22. **Make Tone Dojo permanent, surfaced at onboarding and recurring** — not a one-time screen. **[T: IC/HSK avoid]**
23. **Defer production; if added later, gate a minimal pitch-recording/F0-feedback screen behind a perceptual accuracy threshold.** Perception-only already yields a production dividend. **[P: Wang, Jongman & Sereno 2003; Uchihara et al. 2024]**

### 4.5 Character grid & orthography
24. **Add tap-to-reveal semantic-radical decomposition** with tappable shared-component nodes; keep the grid itself clean and unadorned. **Never overlay radical markings/colors by default** — they harm recognition. **[P: Wang, Pei, Wu & Su 2017; Hou & Jiang 2022]**
25. **Optionally label phonetic components** with pinyin and 2–3 same-phonetic characters as an *implicit pattern* aid — but do not rely on phonetic radicals for recognition gains. **[P: Wang, Pei, Wu & Su 2017]**
26. **Component-based mnemonic as a rescue cue** surfaced only after a learner fails a hanzi→meaning review twice (elaborative encoding at the point of consolidation failure). Let advanced users author their own notes (self-generation effect). **[T: Heisig, applied reactively]**
27. **Keep recognition-first; handwriting stays optional** ("aids memory encoding," never a gate). **[P: Feng et al. 2022; Guan et al. 2021]**
28. **Reactive confusable-pair cards** (己/已/巳, 土/士) triggered by FSRS error patterns. **[T: Heisig community]**

### 4.6 Gamification & ethics
29. **Reward difficulty and retention, not speed or logins.** Golden multipliers/combo should trigger on mastery gains and correct handling of harder cards, not on streak length alone — directly serving "anchor dopamine to genuine progress." **[weak/soft: Wilson et al. 2019; T: graded-reader ethics note]**
30. **Use HSK thresholds (150/300/600/1200/2500) as celebration milestones** — a validated external benchmark — while framing headline progress as *input-hours* and *characters mastered*, not "HSK level attained." **[T: HSK borrow; Boya avoid exam-framing]**
31. **Surface the science in weekly recap** ("you've now seen 是 14 times across 9 days — spaced, not crammed") to counter the intuitive but inferior appeal of massed study. **[P: Cepeda et al. 2006; Mawson & Kang 2025]**

### 4.7 Grammar (net-new, minimal)
32. **Reactive Focus-on-Form pop-ups** triggered when a learner meets a pattern ~3+ times: a compact contrastive *table* (not prose), optional and tappable, with a one-line pattern tag on the gloss card. Do **not** pre-teach grammar in English paragraphs. **[C: Norris & Ortega 2000; T: IC/Boya avoid, HSK table-borrow]**

---

## 5. What to Measure (Metrics & Experiments)

**Instrumentation to add**
- Per-card gloss-tap rate (comprehension proxy), per-word encounter counter (Feed + Reviews unified), per-card FSRS success rate, Tone Dojo accuracy by tone-pair and by talker-count tier, character-grid mastery transitions.

**Core experiments**
1. **Sequencing A/B (flagship):** HSK-ordered vs SUBTLEX-CH-ordered vocab pool. *Primary:* authentic-audio comprehension (cloze on held-out native clips) at matched study-hours; *secondary:* words-to-90%-coverage. **Predicts frequency-first wins (P13).**
2. **Tone Dojo scaffolding RCT:** constant multi-speaker vs adaptive single→multi. Segment by a pitch-aptitude pretest. *Primary:* tone-ID accuracy on **untrained talkers** + Week-1 churn. **Hypothesis: adaptive reduces beginner churn and raises low-aptitude gains (P10).** This is also a safety check on a known harm.
3. **Gloss→FSRS coupling:** auto-promote tapped words vs not. *Primary:* delayed (1-week/1-month) retention of Feed-encountered words. **(P4–P5.)**
4. **Interval-shape test:** near-uniform vs aggressive-expanding first intervals. *Primary:* 30-day delayed recall (not same-session fluency). **(P6.)**
5. **Coverage-mode test:** 95% vs 98% acquisition-mode cards. *Primary:* incidental acquisition per card + self-reported comprehension + drop-off. **(P1–P2.)**
6. **Register/emotion test:** flat vs emotionally-varied Feed content, matched difficulty. *Primary:* delayed recall + session length. **(HSK avoid-finding.)**

**Guardrail metrics (ethics):** ensure XP/streak engagement gains never come with flat or negative *learning* outcomes (delayed retention, real-comprehension). If engagement rises but retention doesn't, the feature fails the stated ethic and ships off.

---

## 6. References (verified academic sources; bibliographic errors from the audit corrected)

- Cai, Q., & Brysbaert, M. (2010). *SUBTLEX-CH: Chinese word and character frequencies based on film subtitles.* PLOS ONE, 5(6), e10729. https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0010729
- Cepeda, N. J., Vul, E., Rohrer, D., Wixted, J. T., & Pashler, H. (2008). *Spacing effects in learning: A temporal ridgeline of optimal retention.* Psychological Science, 19(11), 1095–1102. https://laplab.ucsd.edu/articles/Cepeda%20et%20al%202008_psychsci.pdf
- Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D. (2006). *Distributed practice in verbal recall tasks: A review and quantitative synthesis.* Psychological Bulletin, 132(3), 354–380.
- Feng, X., Mak, W. Y. (M.), Wang, S., & Cai, Q. (2022). *How characters are learned leaves its mark on the neural substrates of Chinese reading.* eNeuro, 2022. https://pmc.ncbi.nlm.nih.gov/articles/PMC9787807/
- Guan, C. Q., et al. (2021). *Effect of handwriting on visual word recognition in Chinese bilingual children and adults.* Frontiers in Psychology, 12, 628160. https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2021.628160/full
- He, S., Shaari, A. H., & Ng, L. S. (2026). *The effects of glosses on English L2 incidental vocabulary learning through reading: A meta-analysis.* Frontiers in Language Sciences, 5, 1815571. https://www.frontiersin.org/journals/language-sciences/articles/10.3389/flang.2026.1815571/full
- Hou, & Jiang. (2022). *Interference effects of radical markings and stroke order animations on Chinese character learning among L2 learners.* Frontiers in Psychology. https://pmc.ncbi.nlm.nih.gov/articles/PMC9403612/
- Karpicke, J. D., & Roediger, H. L. (2007). *Expanding retrieval practice promotes short-term retention, but equally spaced retrieval enhances long-term retention.* Journal of Experimental Psychology: Learning, Memory, and Cognition, 33(4), 704–719.
- Kremmel, B., Indrarathne, B., Kormos, J., & Suzuki, S. (2023). *Unknown vocabulary density and reading comprehension: Replicating Hu and Nation (2000).* Language Learning, 73(4). https://onlinelibrary.wiley.com/doi/abs/10.1111/lang.12622
- Lei, et al. (2025). *[HSK coverage of authentic Chinese audio].* System / ScienceDirect. https://www.sciencedirect.com/science/article/pii/S2666799125000267 *(DOI incomplete in source; verify before formal citation.)*
- Mawson, & Kang. (2025). *The distributed practice effect on classroom learning: A meta-analytic review of applied research.* https://pmc.ncbi.nlm.nih.gov/articles/PMC12189222/
- Mettler, E., Massey, C. M., & Kellman, P. J. (2016). *A comparison of adaptive and fixed schedules of practice.* Journal of Experimental Psychology: General, 145(7), 897–917. https://pmc.ncbi.nlm.nih.gov/articles/PMC6028005/
- Nation, I. S. P. (2006). *How large a vocabulary is needed for reading and listening?* Canadian Modern Language Review, 63(1), 59–82. https://eric.ed.gov/?id=EJ750537
- Norris, J. M., & Ortega, L. (2000). *Effectiveness of L2 instruction: A research synthesis and quantitative meta-analysis.* Language Learning, 50(3), 417–528. https://onlinelibrary.wiley.com/doi/abs/10.1111/0023-8333.00136
- Roediger, H. L., & Karpicke, J. D. (2006). *Test-enhanced learning: Taking memory tests improves long-term retention.* Psychological Science, 17(3), 249–255. https://journals.sagepub.com/doi/abs/10.1111/j.1467-9280.2006.01693.x
- Sadakata, M., & McQueen, J. M. (2014). *Individual aptitude in Mandarin lexical tone perception predicts effectiveness of high-variability training.* Frontiers in Psychology, 5, 1318. https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2014.01318/full
- Schmitt, N. (2008). *Instructed second language vocabulary learning.* Language Teaching Research, 12(3), 329–363. https://journals.sagepub.com/doi/10.1177/1362168808089921
- Settles, B., & Meeder, B. (2016). *A trainable spaced repetition model for language learning.* Proceedings of ACL 2016. (Duolingo HLR.)
- Shen, H. H., & Ke, C. (2007). *Radical awareness and word acquisition among nonnative learners of Chinese.* The Modern Language Journal, 91(1) (r = 0.46).
- Uchihara, T., Karas, M., & Thomson, R. I. (2025). *High variability phonetic training (HVPT): A meta-analysis of L2 perceptual training studies.* Studies in Second Language Acquisition, 47(3). https://www.cambridge.org/core/journals/studies-in-second-language-acquisition/article/high-variability-phonetic-training-hvpt-a-metaanalysis-of-l2-perceptual-training-studies/6ABB8C1F32D88D53EA8D05A4565E76F6
- Uchihara, T., Karas, M., & Thomson, R. I. (2024). *Does perceptual high variability phonetic training improve L2 speech production? A meta-analysis of perception–production connection.* Applied Psycholinguistics, 45(4). https://www.cambridge.org/core/journals/applied-psycholinguistics/article/E38D8F5CE65DC708137B0E95F97C6BC7
- van Zeeland, H., & Schmitt, N. (2013). *Incidental vocabulary acquisition through L2 listening: A dimensions approach.* System, 41(3), 609–624. https://www.researchgate.net/publication/259127122
- Wang, X., Pei, M., Wu, Y., & Su, Y. (2017). *Semantic radicals contribute more than phonetic radicals to the recognition of Chinese phonograms.* Frontiers in Psychology, 8, 2230. https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2017.02230/full
- Wang, Y., Spence, M. M., & Sereno, J. A. (1999). *Training American listeners to perceive Mandarin tones.* Journal of the Acoustical Society of America, 106(6), 3649–3658. https://pubs.aip.org/asa/jasa/article/106/6/3649
- Wang, Y., Jongman, A., & Sereno, J. A. (2003). *Acoustic and perceptual evaluation of Mandarin tone productions before and after perceptual training.* JASA, 113(2), 1033–1043. https://pubmed.ncbi.nlm.nih.gov/12597196/
- Webb, S., Uchihara, T., & Yanagisawa, A. (2023). *How effective is second language incidental vocabulary learning? A meta-analysis.* Language Teaching, 56(2), 161–180. https://www.cambridge.org/core/journals/language-teaching/article/E38E3468FD2090B1FA3051051DE8E70C
- Wilson, R. C., Shenhav, A., Straccia, M., & Cohen, J. D. (2019). *The eighty five percent rule for optimal learning.* Nature Communications, 10, 4646. https://www.nature.com/articles/s41467-019-12552-4 *(Scope caveat: gradient-descent/neural-net learning; human-vocabulary extension is speculative.)*
- Xu, X., & Li, J. (2020). *Concreteness/abstractness ratings for two-character Chinese words in MELD-SCH.* PLOS ONE, 15(6), e0232133. https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0232133
- Zang, et al. (2025). *The association between metalinguistic awareness and Chinese word reading: A three-level meta-analysis.* Language Learning. https://onlinelibrary.wiley.com/doi/full/10.1111/lang.12708

*Non-academic but cited practitioner source:* Hacking Chinese (2014), *What important words are missing from HSK?* https://www.hackingchinese.com/what-important-words-are-missing-from-hsk/

**Evidence-weakness flags for the team:** (1) The "85% rule" (P8) is the weakest plank — do not build hard difficulty gates on it. (2) All FSRS-scheduling ratios (P6) are *directionally* confirmed but the specific percentages in several sources were understated or unverified — treat interval numbers as starting points to A/B, not settled constants. (3) Radical-awareness effect sizes (P12) had corrupted metadata and a non-significant proficiency moderator — pitch component features as "modest, intermediate+" gains, not guaranteed. (4) Production-transfer generalization (P11) is weak and fading — justifies *not* rushing a speaking feature.
