export const C = {
  bg: '#FFF8EF',
  card: '#FFFFFF',
  ink: '#1E2540',
  sub: '#5D6683',
  faint: '#A0A6B8',
  line: '#EFE6D8',
  blue: '#4F5BD5',
  blueSoft: '#EEF0FF',
  star: '#FFB400',
  starSoft: '#FFF4D6',
  green: '#16936A',
  greenSoft: '#E4F6EE',
  koBg: '#FFF0E5',
  koInk: '#D2561B',
  red: '#D64545',
};

// Soft card shadow (iOS/web) + elevation (Android).
export const shadow = {
  shadowColor: '#7A5A2B',
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};

export const POS_KO: Record<string, string> = {
  noun: '명사',
  verb: '동사',
  adjective: '형용사',
  adverb: '부사',
  'proper noun': '고유명사',
  phrase: '구',
  preposition: '전치사',
  conjunction: '접속사',
  pronoun: '대명사',
  determiner: '한정사',
  'helping verb': '조동사',
  interjection: '감탄사',
  number: '수사',
};

export const TOPIC_LABEL: Record<string, string> = {
  'life-science': 'Life Science 생명과학',
  'earth-space': 'Earth & Space 지구·우주',
  'physical-science': 'Physical Science 물리·화학',
  geography: 'Geography 지리',
  'civics-economics': 'Civics & Economics 사회·경제',
  'native-americans': 'Native Americans 아메리카 원주민',
  'us-history': 'US History 미국사',
  'world-history': 'World History 세계사',
  academic: 'School Words 학습 용어',
  ela: 'Reading & Writing 국어(영어)',
  math: 'Math 수학',
  everyday: 'Story Words 책 속 단어',
  basic: 'Basic Words 기본 단어',
};
