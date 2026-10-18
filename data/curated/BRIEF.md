# Brief: kid-friendly English-English-Korean dictionary entries

You are writing dictionary entries for a Korean-American 4th grader (age 9-10) in a US school.
The child reads English well enough for 4th grade but meets hard words in science, social studies,
history (e.g. Native American tribes) and chapter books. A parent who speaks Korean will also use it.

Only write files under data/curated/.

## Output
Write JSON files named `data/curated/<DOMAIN>-<n>.json` (n = 1,2,3,...), each a JSON array of about
80-100 entries, so a single file write never gets too big. Validate each file with
`python3 -c "import json,sys;d=json.load(open(sys.argv[1]));print(len(d))" FILE` after writing.

Entry schema (exact keys):
```json
{
  "word": "valley",                      // headword, lowercase unless a proper noun (Cherokee, Congress)
  "topic": "geography",                  // one of: life-science, earth-space, physical-science, geography, civics-economics, native-americans, us-history, world-history, academic, ela, math, everyday
  "senses": [                            // 1 sense normally; 2-3 only if a kid really meets several meanings
    {
      "pos": "noun",                     // noun | verb | adjective | adverb | proper noun | phrase | preposition | conjunction | pronoun
      "simple": "A low, long stretch of land between hills or mountains. A river often runs through it.",
      "ko": "골짜기, 계곡",               // short Korean equivalent(s), what a Korean dictionary would list
      "ko_simple": "산과 산 사이에 길게 낮게 들어간 땅",  // the simple definition in natural, child-friendly Korean
      "examples": [
        {"en": "We hiked down into the green valley and splashed in the river.", "ko": "우리는 초록빛 골짜기로 걸어 내려가 강물에서 물장구를 쳤다."},
        {"en": "The Grand Canyon is so deep that a valley looks tiny next to it.", "ko": "..."}
      ]
    }
  ],
  "forms": ["valleys"],                  // common inflections a kid might type (plural, past tense, -ing); [] if none
  "picture": true                        // true if a photo/drawing would clearly help understanding (concrete things, places, animals, tools, landforms, historical objects)
}
```

## Quality rules (most important)
- `simple`: written for a 9-year-old. Use the most common 2000 English words; never use the headword or a harder word to define it. 1-2 short sentences. Be factually correct (a teacher will check).
- `ko`: accurate standard Korean dictionary equivalents. If you are not sure of the Korean term, give the description instead; never invent a term. For proper nouns (tribes, people, places) give the standard Korean transliteration used in Korean encyclopedias (e.g. Cherokee → 체로키족) and say what it is in ko_simple.
- Examples: exactly 2 per sense. Make them vivid, concrete, kid-relevant and easy to remember (school, family, pets, sports, games, nature trips, a little humor is good). The first example should show the meaning very clearly. Keep each under ~20 words. Korean translations natural, not word-for-word.
- Native American / history content: respectful and accurate, present tense where the nation still exists today ("The Cherokee Nation is a Native American nation. Many Cherokee people live in Oklahoma today."). Avoid stereotypes. Prefer "Native American" / nation names. Explain words like "tepee", "longhouse", "wampum" accurately and note which peoples used them.
- No duplicates within your list. Pick words a US 3rd-5th grade student actually meets in that subject (textbooks like science/social studies units, state history, chapter books). Mix of hard and medium words; skip words that are too basic (cat, run, big) unless in "everyday" domain where mid-level words are the target.
