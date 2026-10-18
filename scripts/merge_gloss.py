"""Merges agent output (gloss/out/out-*.json) into data/gloss/gloss-NNN.json, one file per input batch.
Drops skipped/incomplete entries and entries with unknown sids.
Usage: python scripts/merge_gloss.py <gloss_dir containing in-*.json and out/>"""
import glob, json, os, re, sys
d = sys.argv[1]
dest = os.path.join(os.path.dirname(__file__), "..", "data", "gloss")
os.makedirs(dest, exist_ok=True)
tot = 0
for inf in sorted(glob.glob(os.path.join(d, "in-*.json"))):
    n = re.search(r"in-(\d+)", inf).group(1)
    outs = sorted(glob.glob(os.path.join(d, "out", f"out-{n}-*.json")))
    sids = {e["sid"] for e in json.load(open(inf, encoding="utf-8"))}
    if len(outs) < (len(sids) + 49) // 50:  # agent still writing this batch
        continue
    keep = []
    for f in outs:
        for g in json.load(open(f, encoding="utf-8")):
            ex = g.get("ex") or {}
            if g.get("skip") or g["sid"] not in sids or not (g.get("easy") and g.get("ko") and ex.get("en") and ex.get("ko")):
                continue
            keep.append({"sid": g["sid"], "easy": g["easy"].strip(), "ko": g["ko"].strip(), "ex": {"en": ex["en"].strip(), "ko": ex["ko"].strip()}})
    json.dump(keep, open(os.path.join(dest, f"gloss-{n}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    tot += len(keep)
print(tot, "glosses")
