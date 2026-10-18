# Brief: easy English + Korean meaning for WordNet senses

Audience: a Korean-American 4th grader (age 9-10) in a US school; a Korean-speaking parent also reads it.
Input: a JSON array `/home/claude/gloss/in-NNN.json` (200 entries), each
`{"sid","pos","words":[headword, synonyms...],"def":WordNet definition,"ex":one WordNet example or null}`.
The first item of `words` is the headword the child looked up. The entry describes THIS sense (def) of that word.

Do NOT call any mcp__hearthbot__ tools. No network. Read only your input file and this brief;
write only under `/home/claude/gloss/out/`.

## Output
For your input in-NNN.json write 4 files `/home/claude/gloss/out/out-NNN-1.json` ... `-4.json`, each a JSON array
of 50 entries (the entries in the same order as the input: 1-50, 51-100, ...). Validate each file after writing with
`python3 -c "import json,sys;d=json.load(open(sys.argv[1]));print(len(d))" FILE`.

Entry (exact keys):
```json
{"sid":"<copy from input>",
 "easy":"To make a sound with your voice because something is funny.",
 "ko":"웃다",
 "ex":{"en":"I laughed so hard that milk came out of my nose.","ko":"나는 너무 크게 웃어서 코로 우유가 나왔다."}}
```
Or, to leave a sense out: `{"sid":"...","skip":true}`.

## Rules (quality over speed)
- `easy`: 1-2 short sentences a 9-year-old understands, using very common words; never use the headword or a harder word to define it; correct for THIS sense (the def), not another sense. Do not just copy the WordNet def.
- `ko`: short standard Korean dictionary equivalent(s) of the headword in this sense, e.g. "웃다", "골짜기, 계곡". Only what you are sure is a real, standard Korean meaning for this sense. If unsure, use skip. Never invent a term. Korean verbs/adjectives in dictionary form (-다).
- `ex`: ONE vivid, concrete, easy-to-remember example sentence using the headword (or its inflected form) in this sense, under 20 words, kid-relevant (school, family, pets, sports, nature). `ko` is a natural Korean translation, not word for word.
- skip: very rare, technical, archaic, slangy/vulgar, adult, or offensive senses; senses too obscure for a child; senses where the headword is part of a name or a different word. When in doubt about meaning or Korean, skip. Skipping is fine and expected for a minority of entries.
- No profanity, sexual or violent adult content. Respectful on people and nations.
- Output must be valid JSON in UTF-8, straight quotes escaped properly. Do not output anything but the files; finish with one line: "done in-NNN: X glossed, Y skipped".
