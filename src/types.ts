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
