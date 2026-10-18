export type Example = { en: string; ko: string };

export type KidSense = {
  pos: string;
  simple: string;
  ko: string;
  ko_simple: string;
  examples: Example[];
};

export type WordRow = { id: number; word: string; kid: number };

export type DictSense = {
  pos: string;
  def: string;
  examples: string[];
  wikidata: string | null;
  synonyms: string[];
  // Optional easy layer written for common words (data/gloss): easy English, Korean, one example.
  easy: string | null;
  ko: string | null;
  exampleEn: string | null;
  exampleKo: string | null;
};

export type Entry = {
  id: number;
  word: string;
  ipa: string | null;
  topic: string | null;
  picture: boolean;
  kidSenses: KidSense[];
  dictSenses: DictSense[];
};
