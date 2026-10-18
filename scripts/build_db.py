"""Build assets/db/dict.db from Open English WordNet (YAML source), WordNet 3.0
morphological exception lists, and the curated kid-friendly entries in data/curated/.

Usage: python scripts/build_db.py <oewn_repo_dir> <wndb_exc_dir> <curated_dir> <out_db>
"""
import glob
import json
import os
import re
import sqlite3
import sys

import yaml

try:
    Loader = yaml.CSafeLoader
except AttributeError:
    Loader = yaml.SafeLoader

oewn, excdir, curdir, out = sys.argv[1:5]
src = os.path.join(oewn, "src", "yaml")

print("loading synsets...")
synsets = {}
for f in sorted(glob.glob(os.path.join(src, "*.yaml"))):
    name = os.path.basename(f)
    if name.startswith("entries-") or name == "frames.yaml":
        continue
    with open(f, encoding="utf-8") as fh:
        data = yaml.load(fh, Loader=Loader)
    for sid, s in data.items():
        exs = []
        for e in s.get("example", []) or []:
            exs.append(e["text"] if isinstance(e, dict) else str(e))
        synsets[sid] = {
            "pos": s.get("partOfSpeech", ""),
            "def": "; ".join(s.get("definition", [])),
            "ex": exs,
            "wd": s.get("wikidata") if isinstance(s.get("wikidata"), str) else (s.get("wikidata") or [None])[0] if s.get("wikidata") else None,
            "members": s.get("members", []),
        }
print(len(synsets), "synsets")

print("loading sense orders...")
order = {}
with open(os.path.join(oewn, "src", "sense-orders.csv"), encoding="utf-8") as fh:
    for line in fh:
        parts = line.rstrip("\n").split(",")
        if len(parts) >= 3:
            order[(parts[0], parts[1])] = parts[2].split()

print("loading entries...")
entries = {}  # lemma -> list of (pos, ipa, [synset ids])
for f in sorted(glob.glob(os.path.join(src, "entries-*.yaml"))):
    with open(f, encoding="utf-8") as fh:
        data = yaml.load(fh, Loader=Loader)
    for lemma, byPos in data.items():
        lemma = str(lemma)
        for pos, e in byPos.items():
            ipa = None
            for p in e.get("pronunciation", []) or []:
                if not p.get("variety") or p.get("variety") in ("en-US", "GA"):
                    ipa = p["value"]
                    break
            if ipa is None and e.get("pronunciation"):
                ipa = e["pronunciation"][0]["value"]
            sids = [s["synset"] for s in e.get("sense", [])]
            key = (lemma.lower().replace(" ", "_"), pos)
            pref = order.get(key)
            if pref:
                rank = {p: i for i, p in enumerate(pref)}
                sids.sort(key=lambda x: rank.get(x.split("-")[0], 999))
            entries.setdefault(lemma, []).append((pos, ipa, sids, [str(x) for x in e.get("form", []) or []]))
print(len(entries), "lemmas")

POS = {"n": "noun", "v": "verb", "a": "adjective", "s": "adjective", "r": "adverb"}

print("loading curated...")
curated = {}
for f in sorted(glob.glob(os.path.join(curdir, "*.json"))):
    with open(f, encoding="utf-8") as fh:
        for item in json.load(fh):
            w = item["word"].strip()
            k = w.lower()
            if k in curated:
                # merge extra senses from another topic file
                old = curated[k]
                have = {(s["pos"], s["simple"]) for s in old["senses"]}
                old["senses"] += [s for s in item["senses"] if (s["pos"], s["simple"]) not in have and s["pos"] not in {x["pos"] for x in old["senses"]}]
                old["forms"] = sorted(set(old.get("forms", [])) | set(item.get("forms", [])))
                continue
            curated[k] = item
print(len(curated), "curated entries")

if os.path.exists(out):
    os.remove(out)
db = sqlite3.connect(out)
db.executescript(
    """
    CREATE TABLE meta(k TEXT PRIMARY KEY, v TEXT);
    CREATE TABLE words(id INTEGER PRIMARY KEY, word TEXT NOT NULL, w TEXT NOT NULL, ipa TEXT,
                       kid INTEGER NOT NULL DEFAULT 0, nsenses INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE synsets(id INTEGER PRIMARY KEY, pos TEXT, def TEXT, ex TEXT, wd TEXT, members TEXT);
    CREATE TABLE senses(word_id INTEGER, ord INTEGER, synset_id INTEGER);
    CREATE TABLE kid(word_id INTEGER PRIMARY KEY, topic TEXT, picture INTEGER, data TEXT);
    CREATE TABLE forms(form TEXT, word_id INTEGER);
    """
)

syn_rowid = {}
for i, (sid, s) in enumerate(synsets.items(), 1):
    syn_rowid[sid] = i
    db.execute(
        "INSERT INTO synsets VALUES (?,?,?,?,?,?)",
        (i, POS.get(s["pos"], s["pos"]), s["def"], json.dumps(s["ex"], ensure_ascii=False) if s["ex"] else None,
         s["wd"], json.dumps(s["members"][:8], ensure_ascii=False)),
    )

word_id = {}
next_id = 1
lower_to_ids = {}
for lemma in sorted(entries):
    recs = sorted(entries[lemma], key=lambda r: -len(r[2]))
    ipa = next((r[1] for r in recs if r[1]), None)
    sids = [sid for r in recs for sid in r[2]]
    wid = next_id
    next_id += 1
    word_id[lemma] = wid
    lower_to_ids.setdefault(lemma.lower(), []).append(wid)
    db.execute("INSERT INTO words VALUES (?,?,?,?,?,?)", (wid, lemma, lemma.lower(), ipa, 0, len(sids)))
    for o, sid in enumerate(sids):
        if sid in syn_rowid:
            db.execute("INSERT INTO senses VALUES (?,?,?)", (wid, o, syn_rowid[sid]))
    for r in recs:
        for fm in r[3]:
            db.execute("INSERT INTO forms VALUES (?,?)", (fm.lower(), wid))

added_curated = 0
for k, item in curated.items():
    ids = lower_to_ids.get(k)
    if ids:
        # prefer the exact-case match ("Cherokee" over "cherokee")
        wid = next((word_id[item["word"]] for _ in [0] if item["word"] in word_id), ids[0])
    else:
        wid = next_id
        next_id += 1
        db.execute("INSERT INTO words VALUES (?,?,?,?,?,?)", (wid, item["word"], k, None, 0, 0))
        lower_to_ids[k] = [wid]
        added_curated += 1
    db.execute("UPDATE words SET kid=1 WHERE id=?", (wid,))
    db.execute(
        "INSERT OR REPLACE INTO kid VALUES (?,?,?,?)",
        (wid, item.get("topic"), 1 if item.get("picture") else 0,
         json.dumps({"senses": item["senses"]}, ensure_ascii=False)),
    )
    for fm in item.get("forms", []) or []:
        # Keep only real inflections (valleys, hiked); drop related words the
        # writers sometimes listed ("eroded" under "erosion"), so they resolve
        # to their own headword. Irregular forms come from the WordNet lists.
        common = len(os.path.commonprefix([fm.lower(), k]))
        if fm.lower() != k and common >= max(2, len(k) - 2):
            db.execute("INSERT INTO forms VALUES (?,?)", (fm.lower(), wid))
print(added_curated, "curated words not in WordNet")

for f in glob.glob(os.path.join(excdir, "*.exc")):
    with open(f, encoding="utf-8") as fh:
        for line in fh:
            parts = line.split()
            if len(parts) < 2:
                continue
            form = parts[0].replace("_", " ")
            for base in parts[1:]:
                for wid in lower_to_ids.get(base.replace("_", " "), []):
                    db.execute("INSERT INTO forms VALUES (?,?)", (form, wid))

db.execute("CREATE TABLE f2 AS SELECT DISTINCT form, word_id FROM forms")
db.execute("DROP TABLE forms")
db.execute("ALTER TABLE f2 RENAME TO forms")
db.executescript(
    """
    CREATE INDEX words_w ON words(w);
    CREATE INDEX senses_word ON senses(word_id, ord);
    CREATE INDEX forms_form ON forms(form);
    """
)
db.execute("INSERT INTO meta VALUES ('version', ?)", (os.environ.get("DICT_VERSION", "1"),))
db.execute("INSERT INTO meta VALUES ('kid_count', ?)", (str(len(curated)),))
db.execute("INSERT INTO meta VALUES ('word_count', ?)", (str(next_id - 1),))
db.commit()
db.execute("VACUUM")
db.close()
print("wrote", out, os.path.getsize(out) // 1024, "KB")
