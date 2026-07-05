import { syllableToMarks, toMarks, toneNumbersOf } from './pinyin';

describe('pinyin tone marks', () => {
  it('places marks on the correct vowel', () => {
    expect(syllableToMarks('ni3')).toBe('nǐ');
    expect(syllableToMarks('hao3')).toBe('hǎo'); // a wins
    expect(syllableToMarks('gou3')).toBe('gǒu'); // o in ou wins
    expect(syllableToMarks('xie4')).toBe('xiè'); // e wins over i
    expect(syllableToMarks('shui3')).toBe('shuǐ'); // last vowel
    expect(syllableToMarks('lai2')).toBe('lái');
  });

  it('handles ü written as v or u:', () => {
    expect(syllableToMarks('lv4')).toBe('lǜ');
    expect(syllableToMarks('nu:3')).toBe('nǚ');
  });

  it('leaves neutral tone (5) or toneless input unmarked', () => {
    expect(syllableToMarks('ma5')).toBe('ma');
    expect(syllableToMarks('de')).toBe('de');
  });

  it('converts whole strings', () => {
    expect(toMarks('ni3 hao3')).toBe('nǐ hǎo');
    expect(toMarks('zhong1 guo2')).toBe('zhōng guó');
  });

  it('extracts tone numbers', () => {
    expect(toneNumbersOf('ni3 hao3')).toEqual([3, 3]);
    expect(toneNumbersOf('zhong1 guo2 ren2')).toEqual([1, 2, 2]);
    expect(toneNumbersOf('de')).toEqual([5]);
  });
});
