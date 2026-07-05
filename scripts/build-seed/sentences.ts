/**
 * Graded sentence generator.
 *
 * The spec's intended sentence source is Tatoeba (CC-BY). In this build
 * environment Tatoeba's download host is blocked by egress policy. Rather than
 * emit ungrammatical combinations from noisy auto-tagged POS data, we generate
 * from a small, hand-verified pool of beginner vocabulary (correct pinyin, gloss
 * and English inflection). Every slot word is linked back to its real word row
 * (by hanzi) so tap-to-gloss and add-to-SRS work from the feed.
 *
 * This keeps feed sentences natural and strictly i+1 (only common HSK1 words),
 * which is exactly what the comprehensible-input algorithm wants. A real Tatoeba
 * ingestion module can be added for machines with network access.
 */
import type { Word } from '../../src/lib/types';

export interface GeneratedSentence {
  hanzi: string;
  pinyin: string;
  glossEn: string;
  wordIds: number[];
  sourceTag: string;
  hskLevel: number;
}

interface Verb {
  hanzi: string;
  pinyin: string;
  en: string; // base form
  en3: string; // third-person singular
  objects: Noun[]; // semantically compatible objects
}
interface Noun {
  hanzi: string;
  pinyin: string;
  en: string;
  count: boolean; // count noun -> takes an article
}
interface Adj {
  hanzi: string;
  pinyin: string;
  en: string;
}

const SUBJECTS = [
  { hanzi: '我', pinyin: 'wo3', en: 'I', be: 'am', have: 'have', third: false },
  { hanzi: '你', pinyin: 'ni3', en: 'You', be: 'are', have: 'have', third: false },
  { hanzi: '他', pinyin: 'ta1', en: 'He', be: 'is', have: 'has', third: true },
  { hanzi: '她', pinyin: 'ta1', en: 'She', be: 'is', have: 'has', third: true },
];

// Concrete nouns reused across templates.
const N = {
  cha: { hanzi: '茶', pinyin: 'cha2', en: 'tea', count: false },
  shui: { hanzi: '水', pinyin: 'shui3', en: 'water', count: false },
  mifan: { hanzi: '米饭', pinyin: 'mi3 fan4', en: 'rice', count: false },
  kafei: { hanzi: '咖啡', pinyin: 'ka1 fei1', en: 'coffee', count: false },
  shu: { hanzi: '书', pinyin: 'shu1', en: 'book', count: true },
  pingguo: { hanzi: '苹果', pinyin: 'ping2 guo3', en: 'apple', count: true },
  zhongwen: { hanzi: '中文', pinyin: 'zhong1 wen2', en: 'Chinese', count: false },
  cai: { hanzi: '菜', pinyin: 'cai4', en: 'food', count: false },
  mianbao: { hanzi: '面包', pinyin: 'mian4 bao1', en: 'bread', count: false },
  shouji: { hanzi: '手机', pinyin: 'shou3 ji1', en: 'phone', count: true },
} satisfies Record<string, Noun>;

// Verbs paired only with sensible objects, so no "eat water" nonsense.
const VERBS: Verb[] = [
  { hanzi: '吃', pinyin: 'chi1', en: 'eat', en3: 'eats', objects: [N.mifan, N.pingguo, N.mianbao, N.cai] },
  { hanzi: '喝', pinyin: 'he1', en: 'drink', en3: 'drinks', objects: [N.cha, N.shui, N.kafei] },
  { hanzi: '买', pinyin: 'mai3', en: 'buy', en3: 'buys', objects: [N.shu, N.pingguo, N.mianbao, N.shouji, N.cai] },
  { hanzi: '看', pinyin: 'kan4', en: 'read', en3: 'reads', objects: [N.shu] },
  { hanzi: '写', pinyin: 'xie3', en: 'write', en3: 'writes', objects: [N.zhongwen] },
  { hanzi: '做', pinyin: 'zuo4', en: 'make', en3: 'makes', objects: [N.cai, N.mianbao, N.kafei] },
  { hanzi: '学', pinyin: 'xue2', en: 'study', en3: 'studies', objects: [N.zhongwen] },
];

const NOUNS: Noun[] = Object.values(N);

interface Place {
  hanzi: string;
  pinyin: string;
  en: string;
}
const PLACES: Place[] = [
  { hanzi: '学校', pinyin: 'xue2 xiao4', en: 'school' },
  { hanzi: '中国', pinyin: 'zhong1 guo2', en: 'China' },
  { hanzi: '家', pinyin: 'jia1', en: 'home' },
  { hanzi: '商店', pinyin: 'shang1 dian4', en: 'the store' },
  { hanzi: '北京', pinyin: 'bei3 jing1', en: 'Beijing' },
];

const LIKE_NOUNS: Noun[] = [
  ...NOUNS,
  { hanzi: '狗', pinyin: 'gou3', en: 'dogs', count: false },
  { hanzi: '猫', pinyin: 'mao1', en: 'cats', count: false },
  { hanzi: '中国', pinyin: 'zhong1 guo2', en: 'China', count: false },
  { hanzi: '老师', pinyin: 'lao3 shi1', en: 'the teacher', count: false },
];

const HAVE_NOUNS: Noun[] = [
  { hanzi: '朋友', pinyin: 'peng2 you5', en: 'friend', count: true },
  { hanzi: '书', pinyin: 'shu1', en: 'book', count: true },
  { hanzi: '狗', pinyin: 'gou3', en: 'dog', count: true },
  { hanzi: '猫', pinyin: 'mao1', en: 'cat', count: true },
  { hanzi: '手机', pinyin: 'shou3 ji1', en: 'phone', count: true },
  { hanzi: '问题', pinyin: 'wen4 ti2', en: 'question', count: true },
];

const ADJS: Adj[] = [
  { hanzi: '高兴', pinyin: 'gao1 xing4', en: 'happy' },
  { hanzi: '忙', pinyin: 'mang2', en: 'busy' },
  { hanzi: '累', pinyin: 'lei4', en: 'tired' },
  { hanzi: '高', pinyin: 'gao1', en: 'tall' },
  { hanzi: '好', pinyin: 'hao3', en: 'good' },
  { hanzi: '漂亮', pinyin: 'piao4 liang5', en: 'beautiful' },
];

function article(n: Noun): string {
  if (!n.count) return n.en;
  return /^[aeiou]/i.test(n.en) ? `an ${n.en}` : `a ${n.en}`;
}

export function generateSentences(
  words: Word[],
  _posOf: (w: Word) => string[],
  target = 1500,
): GeneratedSentence[] {
  const idByHanzi = new Map(words.map((w) => [w.hanzi, w.id]));
  const hskByHanzi = new Map(words.map((w) => [w.hanzi, w.hskLevel]));
  const idsFor = (...hanzis: string[]) =>
    hanzis.map((h) => idByHanzi.get(h)).filter((x): x is number => x != null);
  const hsk = (...hanzis: string[]) =>
    Math.max(1, ...hanzis.map((h) => hskByHanzi.get(h) ?? 1));

  const out: GeneratedSentence[] = [];
  const seen = new Set<string>();
  const emit = (
    parts: { hanzi: string; pinyin: string }[],
    glossEn: string,
    ids: number[],
    hskLevel: number,
    sourceTag = 'graded',
  ) => {
    const hanzi = parts.map((p) => p.hanzi).join('') + '。';
    if (seen.has(hanzi)) return;
    seen.add(hanzi);
    out.push({
      hanzi,
      pinyin: parts.map((p) => p.pinyin).join(' '),
      glossEn,
      wordIds: ids,
      sourceTag,
      hskLevel,
    });
  };

  // Optional time adverbials multiply natural variety ("Today, I ...").
  const TIMES = [
    null,
    { hanzi: '今天', pinyin: 'jin1 tian1', en: 'Today' },
    { hanzi: '现在', pinyin: 'xian4 zai4', en: 'Now' },
  ];
  const withTime = (
    t: { hanzi: string; pinyin: string; en: string } | null,
    parts: { hanzi: string; pinyin: string }[],
    gloss: string,
    ids: number[],
    lvl: number,
  ) => {
    if (t) {
      // Lowercase the clause after the comma, but never the pronoun "I".
      const rest = gloss.startsWith('I ')
        ? gloss
        : `${gloss.charAt(0).toLowerCase()}${gloss.slice(1)}`;
      emit(
        [t, ...parts],
        `${t.en}, ${rest}`,
        [...idsFor(t.hanzi), ...ids],
        Math.max(lvl, hsk(t.hanzi)),
      );
    } else {
      emit(parts, gloss, ids, lvl);
    }
  };

  // Template A: [subj] [verb] [compatible noun]. — natural transitive sentences.
  for (const t of TIMES) {
    for (const s of SUBJECTS) {
      for (const v of VERBS) {
        for (const n of v.objects) {
          withTime(
            t,
            [s, v, n],
            `${s.en} ${s.third ? v.en3 : v.en} ${article(n)}.`,
            idsFor(s.hanzi, v.hanzi, n.hanzi),
            hsk(v.hanzi, n.hanzi),
          );
          if (out.length >= target) return out;
        }
      }
    }
  }
  // Template F: [subj] 去 [place]. — "Today, I go to school."
  for (const t of TIMES) {
    for (const s of SUBJECTS) {
      for (const p of PLACES) {
        withTime(
          t,
          [s, { hanzi: '去', pinyin: 'qu4' }, p],
          `${s.en} ${s.third ? 'goes' : 'go'} to ${p.en}.`,
          idsFor(s.hanzi, '去', p.hanzi),
          hsk('去', p.hanzi),
        );
        if (out.length >= target) return out;
      }
    }
  }
  // Template B: [subj] 喜欢 [noun]. — "She likes coffee."
  for (const s of SUBJECTS) {
    for (const n of LIKE_NOUNS) {
      emit(
        [s, { hanzi: '喜欢', pinyin: 'xi3 huan5' }, n],
        `${s.en} ${s.third ? 'likes' : 'like'} ${n.en}.`,
        idsFor(s.hanzi, '喜欢', n.hanzi),
        hsk('喜欢', n.hanzi),
      );
      if (out.length >= target) return out;
    }
  }
  // Template C: [subj] 很 [adj]. — "You are very busy."
  for (const s of SUBJECTS) {
    for (const a of ADJS) {
      emit(
        [s, { hanzi: '很', pinyin: 'hen3' }, a],
        `${s.en} ${s.be} very ${a.en}.`,
        idsFor(s.hanzi, '很', a.hanzi),
        hsk(a.hanzi),
      );
      if (out.length >= target) return out;
    }
  }
  // Template D: [subj] 有 [count-noun]. — "I have a friend."
  for (const s of SUBJECTS) {
    for (const n of HAVE_NOUNS) {
      emit(
        [s, { hanzi: '有', pinyin: 'you3' }, { hanzi: '一个', pinyin: 'yi2 ge4' }, n],
        `${s.en} ${s.have} ${article(n)}.`,
        idsFor(s.hanzi, '有', n.hanzi),
        hsk(n.hanzi),
      );
      if (out.length >= target) return out;
    }
  }
  // Template E: 这是 [noun]. — "This is a book."
  for (const n of NOUNS) {
    emit(
      [{ hanzi: '这', pinyin: 'zhe4' }, { hanzi: '是', pinyin: 'shi4' }, n],
      `This is ${article(n)}.`,
      idsFor('这', '是', n.hanzi),
      hsk(n.hanzi),
    );
    if (out.length >= target) return out;
  }
  return out;
}
