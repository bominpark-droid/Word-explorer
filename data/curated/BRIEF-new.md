# Brief: new kid dictionary entries for words the dictionary is missing

Read `data/curated/BRIEF.md` first: it is the entry schema and the quality rules.
Follow it exactly, with the changes below. Also look at one existing file, e.g.
`data/curated/everyday-1.json`, to see the style.

Do NOT call any mcp__hearthbot__ tools. No network. Do not run git. Write only the output files named in your task.

## What is different from BRIEF.md
- Your input is a plain list of words (one per line, most common first). These words are NOT in the
  dictionary yet, or (function-word list) the dictionary only has odd technical meanings for them
  (e.g. "in" = inch, "it" = information technology). A child who types them now gets nothing useful.
- First decide for each word: write an entry, or leave it out. LEAVE OUT (just don't write an entry):
  - first names and surnames of ordinary people (david, smith, jessica), unless the word is also an ordinary English word (then write the ordinary meaning only);
  - brands, companies, apps, websites, TV shows, sports teams (facebook, nfl, iphone, netflix);
  - abbreviations and fragments (ll, ve, st, etc, pp, vol, ltd), internet slang, misspellings without apostrophes (dont, im, thats);
  - profanity, sexual or adult words, drug words, slurs; anything not suitable for a 9-year-old;
  - non-English words, very technical/rare words you are unsure about.
  WRITE an entry for: real English words a child could meet in books, school or daily life
  (e.g. everyone, something, myself, cannot, upon, whose, toward); countries, continents, oceans,
  US states, major world cities and famous places (topic "geography", pos "proper noun",
  Korean = standard Korean name, e.g. "London" → "런던", ko_simple says what and where it is);
  very famous historical people a 4th grader learns about (Lincoln, Washington — but "washington" also
  means the state and the capital city: give each meaning its own sense, max 3 senses);
  common holidays, days, months, languages and nationalities if missing.
- Proper nouns: write "word" with the normal capital letter ("London", "Texas", "Korea"). Korea: say
  South Korea and North Korea respectfully and factually.
- `forms`: [] for proper nouns and most function words.
- `picture`: false always.
- Number of senses: 1 normally; for function words up to 3 senses that a child really meets
  (e.g. "in": inside something; during a time; using a language/way). Each sense: 2 examples.
- Topic: "basic" for function words (pronouns, prepositions, conjunctions, determiners, helping verbs,
  question words, numbers, greetings); "geography" for places; "us-history"/"world-history" for people
  and events; otherwise "everyday".
- pos may also be: "determiner", "helping verb", "interjection", "number" (besides the BRIEF.md list).
- `ko` must be what a Korean dictionary lists (e.g. "in" → "~ 안에, ~에", "because" → "왜냐하면, ~ 때문에",
  "myself" → "나 자신, 내가 직접"). Be accurate; if unsure, leave the word out.
- `simple` for function words: explain how the word is used, in very easy English
  (e.g. "because": "A word you use to give the reason for something.").

## Output
Write JSON arrays of at most 80 entries per file to the exact paths given in your task
(e.g. `/home/claude/curated-new/out/new-1-1.json`, `new-1-2.json`, ...). Validate each file after writing:
`python3 -c "import json,sys;d=json.load(open(sys.argv[1]));print(len(d))" FILE`.
Every entry must have every key of the schema. No duplicates. Finish with one line:
"done: X entries written, Y words left out".
