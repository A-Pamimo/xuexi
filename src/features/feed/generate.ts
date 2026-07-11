/**
 * Template-bounded i+1 sentence generator (spec content_strategy: the curated
 * pool must never run dry). When the hand-authored sentence pool thins, this
 * composes fresh, grammatical Mandarin from the learner's OWN known-word set so
 * every generated card is >=85% known by construction — the comprehensible-input
 * floor (selection.ts FEED_FLOOR_KNOWN_RATIO) can never be violated because we
 * only ever slot in known words plus a couple of known function words.
 *
 * We stay both grammatical AND sensible (not merely known) via:
 *   (a) a tiny set of FIXED templates (S+V+O, S+很+Adj);
 *   (b) curated allow-lists for the closed-ish classes (pronouns, transitive
 *       verbs, stative adjectives); and
 *   (c) a verb→object COLLOCATION map, so we never pair a verb with an object it
 *       can't sensibly take (no "drink phone" / "wear gate"). A slot that can't be
 *       filled sensibly is skipped — we never emit odd or ungrammatical output.
 *
 * Yield: every (subject × verb × collocating-object) and (subject × adjective)
 * combination the learner knows is a candidate, so the generator scales with
 * vocabulary rather than being capped at the number of known pronouns.
 *
 * Pure and unit-tested; no RN imports.
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

/** Clean English pronoun glosses (CC-CEDICT ones are noisy with parentheticals). */
const PRONOUN_GLOSS: Record<string, string> = {
  我: 'I', 你: 'you', 您: 'you', 他: 'he', 她: 'she', 它: 'it',
  我们: 'we', 你们: 'you', 他们: 'they', 她们: 'they',
};

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

/** Strip CC-CEDICT parentheticals and collapse whitespace for a clean display gloss. */
function cleanGloss(gloss: string): string {
  return firstSense(gloss).replace(/\s*\([^)]*\)/g, '').trim();
}

/**
 * Clean gloss for a VERB slot. Polysemous verbs list a noun sense first in
 * CC-CEDICT (教 "religion; …; to teach", 关 "mountain pass; …; to close"), so we
 * prefer the first "to …" sense and drop the infinitive marker — "teach", not
 * "religion". Falls back to the plain first sense if none is marked verbal.
 */
function verbGloss(gloss: string): string {
  const senses = gloss.split(';').map((s) => s.trim());
  const verbal = senses.find((s) => /^to\s+\w/i.test(s));
  return cleanGloss(verbal ?? senses[0] ?? gloss).replace(/^to\s+/i, '');
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
 * The subset of stative adjectives that sensibly describe a PERSON, so the
 * S+很+Adj template (subject is always a pronoun) doesn't emit odd pairings like
 * "you are white/expensive/difficult". Object-property adjectives (colors, 贵,
 * 难, 远…) are kept out of this template.
 */
const PERSON_ADJECTIVES = new Set([
  '好', '高', '忙', '累', '快', '慢', '漂亮', '好看', '高兴', '开心', '胖', '瘦', '早', '晚',
]);

/**
 * Verb → sensible direct objects (COLLOCATION map). The gloss heuristic can tell
 * "to X" verbs from non-verbs, but it can't tell which objects a verb sensibly
 * takes — so we pin, per transitive verb, the everyday objects it collocates
 * with. We only ever emit a S+V+O pair that appears here, so output is natural
 * ("eat rice", "drink tea", "read a book"), never absurd ("drink phone"). A verb
 * with no known collocating object is simply skipped. Every hanzi here is HSK 1-3.
 */
const VERB_OBJECTS: Record<string, string[]> = {
  吃: ['饭', '米饭', '菜', '面条', '苹果', '面包', '鸡蛋'],
  喝: ['水', '茶', '咖啡', '牛奶'],
  看: ['书', '报纸', '电视', '电脑', '手机', '画', '花', '狗', '猫'],
  读: ['书', '报纸', '信', '字', '课'],
  写: ['信', '字', '书', '课'],
  买: ['水', '茶', '菜', '米饭', '苹果', '书', '报纸', '车', '手机', '衣服', '鞋', '花', '咖啡', '牛奶', '面包', '鸡蛋'],
  卖: ['菜', '苹果', '书', '报纸', '车', '手机', '衣服', '鞋', '花', '咖啡', '面包'],
  爱: ['狗', '猫', '书', '茶', '咖啡', '花', '歌', '菜', '中文'],
  喜欢: ['狗', '猫', '书', '茶', '咖啡', '花', '歌', '菜', '车', '手机', '苹果', '中文'],
  学: ['字', '课', '中文'],
  学习: ['字', '课', '中文'],
  教: ['字', '课', '中文'],
  找: ['书', '车', '钱', '手机', '狗', '猫', '信', '报纸'],
  做: ['菜', '饭', '米饭', '面条', '面包', '鸡蛋'],
  用: ['电脑', '手机', '车', '钱', '电视'],
  听: ['歌', '课'],
  开: ['门', '窗户', '车', '电视', '电脑', '手机'],
  关: ['门', '窗户', '电视', '电脑', '手机'],
  带: ['书', '钱', '手机', '狗', '猫', '苹果', '面包'],
  穿: ['衣服', '鞋'],
  洗: ['衣服', '车', '苹果', '菜', '鞋'],
  画: ['画', '花', '狗', '猫'],
  唱: ['歌'],
  拿: ['书', '钱', '手机', '苹果', '信', '报纸', '花'],
  放: ['书', '钱', '手机', '苹果'],
  送: ['书', '花', '钱', '苹果', '面包', '牛奶'],
  要: ['水', '茶', '菜', '米饭', '苹果', '书', '车', '手机', '衣服', '鞋', '花', '咖啡', '牛奶', '面包', '鸡蛋', '钱'],
  换: ['钱', '衣服', '鞋', '手机', '电脑', '车'],
  数: ['钱', '苹果', '鸡蛋', '书'],
};

/**
 * Curated base-form English for each verb in VERB_OBJECTS. The seed's terse
 * single-sense glosses are unreliable for verbs (教 "religion", 关 "mountain
 * pass", 带 "band"), so we pin correct verb glosses here — the study aid must
 * never mislead. Anything not listed falls back to verbGloss().
 */
const VERB_GLOSS: Record<string, string> = {
  吃: 'eat', 喝: 'drink', 看: 'see', 读: 'read', 写: 'write', 买: 'buy', 卖: 'sell',
  爱: 'love', 喜欢: 'like', 学: 'study', 学习: 'study', 教: 'teach', 找: 'find',
  做: 'make', 用: 'use', 听: 'listen to', 开: 'open', 关: 'close', 带: 'bring',
  穿: 'wear', 洗: 'wash', 画: 'draw', 唱: 'sing', 拿: 'hold', 放: 'put', 送: 'give',
  要: 'want', 换: 'change', 数: 'count',
};

interface SlotWord {
  id: number;
  hanzi: string;
  pinyin: string;
  gloss: string; // clean display gloss
}

function toSlot(w: Word): SlotWord {
  const gloss = PRONOUN_GLOSS[w.hanzi] ?? cleanGloss(w.glossEn);
  return { id: w.id, hanzi: w.hanzi, pinyin: w.pinyinNumbered, gloss };
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
 * Compose grammatical, sensible i+1 sentences from known words. Returns up to
 * `count` sentences with NEGATIVE ids (so they never collide with seed sentence
 * ids), each guaranteed >=85% known — in fact 100% known-plus-known-particle.
 * Emits fewer than `count` (or none) rather than ever producing odd output.
 */
export function generateSentences(inputs: GenerateInputs): Sentence[] {
  const { words, knownWordIds, count } = inputs;
  const rng = inputs.rng ?? Math.random;
  if (count <= 0) return [];

  const known = words.filter((w) => knownWordIds.has(w.id));
  const knownHanzi = new Set(known.map((w) => w.hanzi));

  // Bucket known words. Pronouns/adjectives come from inference + allow-lists;
  // verbs are gated on the collocation map (a verb is only usable if we know at
  // least one object it sensibly takes AND the learner knows that object).
  const pronouns: SlotWord[] = [];
  const adjectives: SlotWord[] = [];
  const objectByHanzi = new Map<string, SlotWord>();
  for (const w of known) {
    if (inferPos(w) === 'pronoun') pronouns.push(toSlot(w));
    if (inferPos(w) === 'adjective' && PERSON_ADJECTIVES.has(w.hanzi)) adjectives.push(toSlot(w));
    objectByHanzi.set(w.hanzi, toSlot(w));
  }

  // Verb slot + its known, sensible objects (from the collocation map).
  const verbEntries: { verb: SlotWord; objects: SlotWord[] }[] = [];
  for (const w of known) {
    const objs = VERB_OBJECTS[w.hanzi];
    if (!objs || WEAK_VERB_GLOSS.test(w.glossEn)) continue;
    const objSlots = objs
      .filter((h) => knownHanzi.has(h))
      .map((h) => objectByHanzi.get(h))
      .filter((s): s is SlotWord => !!s);
    if (objSlots.length > 0) {
      const gloss = VERB_GLOSS[w.hanzi] ?? verbGloss(w.glossEn);
      verbEntries.push({ verb: { ...toSlot(w), gloss }, objects: objSlots });
    }
  }

  const henKnown = knownWordIds.has(HEN.id);

  // Enumerate every sensible S+V+O and S+很+Adj combination, then shuffle so the
  // feed varies rather than fixating on the first subject/verb. Bounded work: the
  // known vocabulary is small (hundreds of words), so the product stays modest.
  const svoCombos: SlotWord[][] = [];
  for (const subj of pronouns) {
    for (const { verb, objects } of verbEntries) {
      for (const obj of objects) {
        if (subj.id === obj.id) continue; // no 你…你 echo
        svoCombos.push([subj, verb, obj]);
      }
    }
  }
  const henSlot: SlotWord = { ...HEN, gloss: 'very' };
  const adjCombos: SlotWord[][] = [];
  if (henKnown) {
    for (const subj of pronouns) {
      for (const adj of adjectives) adjCombos.push([subj, henSlot, adj]);
    }
  }

  // Interleave 2 action sentences : 1 adjective sentence so both templates show.
  const svo = shuffle(svoCombos, rng);
  const adj = shuffle(adjCombos, rng);
  const ordered: SlotWord[][] = [];
  let si = 0;
  let ai = 0;
  while (si < svo.length || ai < adj.length) {
    if (si < svo.length) ordered.push(svo[si++]!);
    if (si < svo.length) ordered.push(svo[si++]!);
    if (ai < adj.length) ordered.push(adj[ai++]!);
  }

  const out: Sentence[] = [];
  const seenHanzi = new Set<string>();
  let nextId = -1;
  for (const parts of ordered) {
    if (out.length >= count) break;
    const hanzi = parts.map((p) => p.hanzi).join('') + '。';
    if (seenHanzi.has(hanzi)) continue; // de-dupe surface forms
    seenHanzi.add(hanzi);
    out.push({
      id: nextId--,
      hanzi,
      pinyin: parts.map((p) => p.pinyin).join(' '),
      glossEn: glossFor(parts),
      wordIds: parts.map((p) => p.id),
      // Generated i+1 fillers, near-fully known -> top difficulty band.
      difficultyScore: 1,
      audioRef: null,
      sourceTag: 'generated',
    });
  }

  return out;
}

/** English copula agreement for the handful of pronoun subjects we use. */
function copulaFor(subjectHanzi: string): string {
  if (subjectHanzi === '我') return 'am';
  if (subjectHanzi === '他' || subjectHanzi === '她' || subjectHanzi === '它') return 'is';
  return 'are'; // 你/您/我们/你们/他们/她们
}

/**
 * Best-effort English gloss for a generated sentence. S+V+O reads "I eat rice"
 * (verb stripped of its "to " infinitive marker); S+很+Adj reads "you are busy".
 * A study aid, not a translation engine.
 */
function glossFor(parts: SlotWord[]): string {
  if (parts.length === 3 && parts[1]!.hanzi === HEN.hanzi) {
    return `${parts[0]!.gloss} ${copulaFor(parts[0]!.hanzi)} ${parts[2]!.gloss}`;
  }
  return parts
    .map((p, i) => (i === 1 ? p.gloss.replace(/^to\s+/, '') : p.gloss))
    .join(' ');
}
