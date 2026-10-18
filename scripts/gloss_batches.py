"""Cuts the most common English words into batches of WordNet senses that still
need an easy definition + Korean meaning (data/gloss/*.json).

Needs `pip install wordfreq` (only used here to rank words by how common they are).

Usage: python scripts/gloss_batches.py <dict.db> <out_dir> [top_n=8000] [senses_per_word=4] [batch_size=400] [skip_words=0] [first_batch=1]
Each word gets its first senses_per_word senses plus the first sense of every other part of speech.
skip_words/first_batch extend an earlier run: e.g. `... 12000 2 200 5000 54` adds words 5,001-12,000 as in-054.json onward.
Writes <out_dir>/in-001.json, in-002.json, ... (most common words first).
Senses that already have a gloss in data/gloss/ are skipped.
"""
import glob
import json
import os
import sqlite3
import sys

from wordfreq import top_n_list

db_path, out_dir = sys.argv[1:3]
top_n = int(sys.argv[3]) if len(sys.argv) > 3 else 8000
per_word = int(sys.argv[4]) if len(sys.argv) > 4 else 4
batch = int(sys.argv[5]) if len(sys.argv) > 5 else 400
skip_words = int(sys.argv[6]) if len(sys.argv) > 6 else 0
first = int(sys.argv[7]) if len(sys.argv) > 7 else 1

done = set()
for f in glob.glob(os.path.join(os.path.dirname(__file__), "..", "data", "gloss", "*.json")):
    done.update(g["sid"] for g in json.load(open(f, encoding="utf-8")))

db = sqlite3.connect(db_path)
heads = {}
for wid, w, kid, ns in db.execute("SELECT id, w, kid, nsenses FROM words WHERE w GLOB '[a-z]*' AND w NOT LIKE '% %'"):
    if w.isalpha():
        heads.setdefault(w, []).append((kid, ns, wid))

seen, items = set(), []
if first > 1:  # extending: don't repeat senses already in earlier batches
    for f in glob.glob(os.path.join(out_dir, "in-*.json")):
        seen.update(e["sid"] for e in json.load(open(f, encoding="utf-8")))
count = 0
for rank, w in enumerate(top_n_list("en", 40000)):
    if rank < 100:  # function words (a, in, of...): WordNet lists odd senses first
        continue
    if w not in heads:
        continue
    kid, ns, wid = max(heads[w])
    if kid == 2:  # already has a hand-written entry
        continue
    count += 1
    if count > top_n:
        break
    if count <= skip_words:
        continue
    rows = db.execute(
        "SELECT y.sid, y.pos, y.def, y.ex, y.members FROM senses x JOIN synsets y ON y.id = x.synset_id "
        "WHERE x.word_id = ? ORDER BY x.ord", (wid,)).fetchall()
    # The first few senses, plus the first sense of every part of speech
    # (WordNet lists all nouns first, so "laugh" the verb would otherwise be missed).
    pick, poses = rows[:per_word], {r[1] for r in rows[:per_word]}
    for r in rows[per_word:]:
        if r[1] not in poses:
            poses.add(r[1])
            pick.append(r)
    for sid, pos, d, ex, members in pick:
        if sid in seen or sid in done:
            continue
        seen.add(sid)
        words = [w] + [m for m in json.loads(members) if m.lower() != w][:4]
        items.append({"sid": sid, "pos": pos, "words": words, "def": d,
                      "ex": (json.loads(ex)[0] if ex else None)})

os.makedirs(out_dir, exist_ok=True)
if first == 1:
    for f in glob.glob(os.path.join(out_dir, "in-*.json")):
        os.remove(f)
for i in range(0, len(items), batch):
    n = i // batch + first
    with open(os.path.join(out_dir, f"in-{n:03d}.json"), "w", encoding="utf-8") as fh:
        json.dump(items[i:i + batch], fh, ensure_ascii=False, indent=0)
print(len(items), "senses in", (len(items) + batch - 1) // batch, "batches")
