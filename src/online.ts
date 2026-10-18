// Extra Korean labels from Wikidata. Only used when online; the dictionary
// itself never needs the network. (The picture feature was removed 2026-10-18
// at the owner's request; see git history before that date to bring it back.)
const HEADERS = { 'Api-User-Agent': 'KidDictionary/1.0 (personal family app)' };

const koCache = new Map<string, Promise<string | null>>();

async function getJson(url: string): Promise<any | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(url, { headers: HEADERS, signal: ctrl.signal });
    clearTimeout(t);
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

// Korean name of a Wikidata item (e.g. Q33388 -> 체로키어), used as an online
// hint for words that have no hand-written Korean meaning.
export function koreanLabel(qid: string): Promise<string | null> {
  let p = koCache.get(qid);
  if (!p) {
    p = getJson(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=labels&languages=ko&format=json&origin=*`,
    ).then((j) => j?.entities?.[qid]?.labels?.ko?.value ?? null);
    koCache.set(qid, p);
  }
  return p;
}
