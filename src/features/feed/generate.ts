/**
 * Template-bounded i+1 sentence generator (spec content_strategy: the curated
 * pool must never run dry). When the hand-authored sentence pool thins, this
 * composes fresh, grammatical Mandarin from the learner's OWN known-word set so
 * every generated card is >=85% known by construction — the comprehensible-input
 * floor (selection.ts FEED_FLOOR_KNOWN_RATIO) can never be violated because we
 * only ever slot in known words plus a couple of known function words.
 *
 * We stay grammatical (not merely known) by (a) using a tiny set of FIXED
 * templates and (b) filling each slot only with a word whose rough part of
 * speech — inferred from its English gloss — matches the slot. If a template
 * can't be safely filled from what's known, we skip it: we never emit an
 * ungrammatical sentence. Pure and unit-tested; no RN imports.
 */
import type { Sentence, Word } from '../../lib/types';

/** Rough part of speech we can infer from a word's gloss, coarse by design. */
type Pos = 'pronoun' | 'verb' | 'adjective' | 'noun';

export interface GenerateInputs {
  words: Word[];
  knownWordIds: Set<number>;
  count: number;
  /** Injectable RNG for deterministic tests; defaults to Math.random. */
  rng?: () => number;
}

/**
 * Function words the templates lean on. These carry the grammar, so a template
 * that needs one is skipped unless the learner already knows it (keeping the
 * known ratio honest — the particle counts toward the sentence's wordIds).
 */
const HEN = { hanzi: '很', pinyin: 'hen3', id: 148 }; // adverb of degree

/**
 * Pronouns are a closed class the gloss heuristic can't reliably tag, so we pin
 * the common ones by hanzi. Only those actually present in `words` AND known are
 * used, so the set self-limits to the learner's vocabulary.
 */
const PRONOUN_HANZI = new Set(['我', '你', '您', '他', '她', '它', '我们', '你们', '他们', '她们']);

/**
 * Verbs whose gloss reads like a state/linking/existential verb ("to be",
 * "to have", "to want to") take a noun-ish complement awkwardly and produce
 * stilted output in a bare S+V+O frame, so we exclude them from the object
 * template and let the plainer action verbs through.
 */
const WEAK_VERB_GLOSS =
  /\b(to be|there is|there are|to have|would like|used to|to seem|to become|to compare|to resemble|to belong|to equal|to cost|to weigh|to give birth|to be surnamed|to be called|to be located)\b/i;

/**
 * Object nouns are filtered to concrete, countable-ish things: abstract or
 * grammatical glosses (particles, measure words, "of ~'s") make bad objects and
 * are dropped. Best-effort — the 85% floor is guaranteed regardless.
 */
const ABSTRACT_NOUN_GLOSS =
  /\b(particle|marker|measure word|surname|prefix|suffix|classifier|adverb|conjunction|preposition|pronoun|interjection|abbr|onomatopoeia)\b/i;

/**
 * Words that gloss as a bare short phrase but are NOT valid direct objects:
 * numbers, locatives/directions, time and place deictics, quantity/degree words.
 * These slip past the "single common noun" shape test (their glosses look like
 * "eight" / "inside" / "there"), so we reject them explicitly to keep S+V+O
 * grammatical. Best-effort; the known-word floor holds regardless.
 */
const NON_OBJECT_GLOSS =
  /\b(eight|nine|ten|zero|one|two|three|four|five|six|seven|hundred|thousand|inside|outside|above|below|behind|front|left|right|middle|side|here|there|where|now|then|today|tomorrow|yesterday|day|morning|noon|evening|night|o'clock|this|that|these|those|some|every|each|all|both|very|really|also|already|still|just|only|again|together)\b/i;

function firstSense(gloss: string): string {
  // Glosses are "sense; sense; sense" — the first sense is the most salient.
  return (gloss.split(';')[0] ?? gloss).trim();
}

/**
 * Infer a coarse part of speech from an English gloss. Deliberately
 * conservative: anything ambiguous returns null and simply isn't used as filler.
 */
export function inferPos(word: Word): Pos | null {
  if (PRONOUN_HANZI.has(word.hanzi)) return 'pronoun';

  const sense = firstSense(word.glossEn).toLowerCase();
  if (sense.length === 0) return null;

  // "to X" is the CC-CEDICT convention for verbs.
  if (/^to\s+\w/.test(sense)) return 'verb';

  // Predicate adjectives: CC-CEDICT tags them "(adj.)" or glosses them as a bare
  // quality. We accept a curated shortlist of unambiguous stative adjectives so
  // the S+很+Adj frame stays grammatical (many bare glosses are actually nouns).
  if (/\(adj\.?\)|\badjective\b/.test(sense)) return 'adjective';
  if (STATIVE_ADJECTIVES.has(word.hanzi)) return 'adjective';

  // A single common English noun with no verb/particle markers -> treat as noun.
  // We screen the FULL gloss for grammatical markers (particle/measure word/…)
  // so e.g. 的 "of; ~'s (possessive particle)" is rejected despite a bare first
  // sense of "of".
  if (
    !ABSTRACT_NOUN_GLOSS.test(word.glossEn) &&
    !NON_OBJECT_GLOSS.test(sense) &&
    !/\bto\b/.test(sense) &&
    !/\(.*\)/.test(sense) &&
    /^[a-z][a-z\s-]*$/.test(sense) &&
    sense.split(/\s+/).length <= 3
  ) {
    return 'noun';
  }

  return null;
}

/**
 * Curated stative adjectives (HSK 1-3) whose glosses are bare qualities and read
 * naturally after 很. Pinning them avoids misreading e.g. 热 ("to warm up") as a
 * verb or 红 ("red") as a noun. Anything not listed simply won't fill the Adj
 * slot — we prefer skipping to emitting something odd.
 */
const STATIVE_ADJECTIVES = new Set([
  '好', '大', '小', '高', '长', '短', '多', '少', '快', '慢',
  '忙', '累', '热', '冷', '红', '白', '黑', '新', '旧', '贵',
  '便宜', '漂亮', '好看', '好吃', '高兴', '开心', '难', '容易', '重要', '远',
  '近', '早', '晚', '胖', '瘦', '干净', '安静', '简单',
]);

/**
 * Curated SIMPLE TRANSITIVE verbs for the S+V+O frame. The gloss heuristic can
 * tell "to X" verbs apart from non-verbs, but it CANNOT tell a plain transitive
 * verb (吃 eat) from an intransitive (跑 run), a stative (开心 be happy), or a
 * verb-object compound that already carries its object (帮忙 help, 说话 speak).
 * Appending an object to any of those is ungrammatical, so — as with the
 * adjectives — we pin an allow-list of verbs that reliably take a bare noun
 * object. Anything not listed never fills the V slot; we skip rather than risk
 * bad output. All HSK 1-3 and known-safe with a noun object.
 */
const TRANSITIVE_VERBS = new Set([
  '吃', '喝', '看', '读', '写', '买', '卖', '爱', '喜欢', '学',
  '学习', '教', '找', '做', '用', '听', '开', '关', '带', '穿',
  '洗', '画', '唱', '打', '拿', '放', '送', '要', '换', '数',
]);

/**
 * Curated concrete OBJECT nouns for the S+V+O frame — everyday countable things
 * that read naturally as a direct object. Same rationale as the verb list: the
 * gloss shape test lets through numbers, locatives and abstract nouns, so we pin
 * a shortlist of safe objects instead. Skipped if none are known.
 */
const OBJECT_NOUNS = new Set([
  '水', '茶', '饭', '米饭', '菜', '面条', '苹果', '书', '报纸', '信',
  '车', '电视', '电脑', '手机', '衣服', '鞋', '狗', '猫', '花', '画',
  '歌', '字', '门', '窗户', '咖啡', '牛奶', '面包', '鸡蛋', '课', '钱',
]);

interface SlotWord {
  id: number;
  hanzi: string;
  pinyin: string;
  gloss: string;
}

function toSlot(w: Word): SlotWord {
  return { id: w.id, hanzi: w.hanzi, pinyin: w.pinyinNumbered, gloss: firstSense(w.glossEn) };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * Compose grammatical i+1 sentences from known words. Returns up to `count`
 * sentences with NEGATIVE ids (so they never collide with seed sentence ids),
 * each guaranteed >=85% known — in fact 100% known-plus-known-particle. Emits
 * fewer than `count` (or none) rather than ever producing ungrammatical output.
 */
export function generateSentences(inputs: GenerateInputs): Sentence[] {
  const { words, knownWordIds, count } = inputs;
  const rng = inputs.rng ?? Math.random;
  if (count <= 0) return [];

  // Bucket known words by inferred POS. Unknown-POS words are simply ignored.
  const known = words.filter((w) => knownWordIds.has(w.id));
  const pronouns: SlotWord[] = [];
  const verbs: SlotWord[] = [];
  const adjectives: SlotWord[] = [];
  const nouns: SlotWord[] = [];
  for (const w of known) {
    // Pronouns and adjectives come from POS inference; verbs and objects are
    // gated on curated allow-lists (see TRANSITIVE_VERBS / OBJECT_NOUNS) because
    // gloss inference alone can't guarantee a grammatical S+V+O fill.
    if (inferPos(w) === 'pronoun') pronouns.push(toSlot(w));
    if (inferPos(w) === 'adjective') adjectives.push(toSlot(w));
    if (TRANSITIVE_VERBS.has(w.hanzi) && !WEAK_VERB_GLOSS.test(w.glossEn)) verbs.push(toSlot(w));
    if (OBJECT_NOUNS.has(w.hanzi)) nouns.push(toSlot(w));
  }

  const henKnown = knownWordIds.has(HEN.id);

  const svo = shuffle(pronouns, rng);
  const svoVerbs = shuffle(verbs, rng);
  const svoNouns = shuffle(nouns, rng);
  const adjSubjects = shuffle(pronouns, rng);
  const adjs = shuffle(adjectives, rng);

  const out: Sentence[] = [];
  const seenHanzi = new Set<string>();
  let nextId = -1;

  const push = (parts: SlotWord[]): void => {
    const hanzi = parts.map((p) => p.hanzi).join('') + '。';
    if (seenHanzi.has(hanzi)) return; // de-dupe surface forms across templates
    seenHanzi.add(hanzi);
    out.push({
      id: nextId--,
      hanzi,
      pinyin: parts.map((p) => p.pinyin).join(' '),
      glossEn: glossFor(parts),
      wordIds: parts.map((p) => p.id),
      // These are generated i+1 fillers, near-fully known -> top difficulty band.
      difficultyScore: 1,
      audioRef: null,
      sourceTag: 'generated',
    });
  };

  // Template A — Subject + Verb + Object (我 吃 米饭 -> "I eat rice").
  // Round-robin across subjects/verbs/objects so we don't fixate on one word.
  let vi = 0;
  let ni = 0;
  if (svo.length > 0 && svoVerbs.length > 0 && svoNouns.length > 0) {
    for (const subj of svo) {
      if (out.length >= count) break;
      const verb = svoVerbs[vi % svoVerbs.length]!;
      const obj = svoNouns[ni % svoNouns.length]!;
      vi++;
      ni++;
      // Avoid a subject == object echo (e.g. 你 ... 你); rare but sloppy.
      if (subj.id === obj.id) continue;
      push([subj, verb, obj]);
    }
  }

  // Template B — Subject + 很 + Adjective (你 很 高 -> "You are tall").
  // 很 is the neutral-degree copula-adjective glue; requires it be known.
  if (henKnown && adjSubjects.length > 0 && adjs.length > 0) {
    let ai = 0;
    for (const subj of adjSubjects) {
      if (out.length >= count) break;
      const adj = adjs[ai % adjs.length]!;
      ai++;
      push([subj, { ...HEN, gloss: 'very' }, adj]);
    }
  }

  return out.slice(0, count);
}

/**
 * Best-effort English gloss for a generated sentence, assembled from the slot
 * glosses. It's a study aid, not a translation engine, so we keep it simple and
 * readable rather than trying to conjugate.
 */
function glossFor(parts: SlotWord[]): string {
  return parts.map((p) => p.gloss).join(' ');
}
