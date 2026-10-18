// Pictures and extra Korean labels from Wikimedia. Only used when the phone is
// online; the dictionary itself never needs the network.
const HEADERS = { 'Api-User-Agent': 'KidDictionary/1.0 (personal family app)' };

export type Picture = { uri: string; caption: string; page: string };

const cache = new Map<string, Promise<Picture | null>>();
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

function commonsThumb(file: string, width = 640): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file.replace(/ /g, '_'))}?width=${width}`;
}

async function fromWikidata(qid: string): Promise<Picture | null> {
  const j = await getJson(
    `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${qid}&property=P18&format=json&origin=*`,
  );
  const file: string | undefined = j?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
  if (!file) return null;
  return {
    uri: commonsThumb(file),
    caption: 'Wikimedia Commons',
    page: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, '_'))}`,
  };
}

async function fromWikipedia(title: string): Promise<Picture | null> {
  const j = await getJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
  if (!j || j.type === 'disambiguation') return null;
  const src = j.thumbnail?.source ?? j.originalimage?.source;
  if (!src) return null;
  return { uri: src, caption: 'Wikipedia', page: j.content_urls?.mobile?.page ?? '' };
}

// Tries the Wikidata item WordNet links to this meaning first (most precise),
// then the English Wikipedia article with the same name.
export function findPicture(word: string, wikidataIds: string[]): Promise<Picture | null> {
  const key = word + '|' + wikidataIds.join(',');
  let p = cache.get(key);
  if (!p) {
    p = (async () => {
      for (const q of wikidataIds.slice(0, 2)) {
        const pic = await fromWikidata(q);
        if (pic) return pic;
      }
      return fromWikipedia(word);
    })();
    cache.set(key, p);
  }
  return p;
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
