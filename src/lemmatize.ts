// Guesses base forms for an inflected English word ("valleys" -> "valley",
// "hiking" -> "hike"), most likely first. Irregular forms (ran, mice) come from the forms table.
export function baseCandidates(q: string): string[] {
  const w = q.toLowerCase().trim();
  const out: string[] = [];
  const add = (s: string) => {
    if (s.length >= 2 && s !== w && !out.includes(s)) out.push(s);
  };
  // "hop" + ed -> "hopped", so a single consonant after one vowel ("hoped", "lived",
  // "noted") usually means the base ends in a silent e.
  const cvc = (s: string) => /^[^aeiou]*[aeiouy][^aeiouwxy]$/.test(s);
  // "stopped" -> "stop", but "passed" -> "pass", "called" -> "call".
  const undouble = (stem: string) => {
    const last = stem[stem.length - 1];
    if (stem.length > 2 && last === stem[stem.length - 2]) {
      if ('slfz'.includes(last)) {
        add(stem);
        add(stem.slice(0, -1));
      } else {
        add(stem.slice(0, -1));
        add(stem);
      }
      return true;
    }
    return false;
  };
  // -ed / -ing / -er / -est on a stem: "hoped" -> hope, "hiking" -> hike, "bigger" -> big.
  const suffix = (stem: string) => {
    if (undouble(stem)) return;
    if (cvc(stem)) {
      add(stem + 'e');
      add(stem);
    } else {
      add(stem);
      add(stem + 'e');
    }
  };

  // "dies", "lies", "ties" -> die, lie, tie; longer "-ies" -> "-y" (studies -> study).
  if (w.endsWith('ies')) add(w.length <= 4 ? w.slice(0, -1) : w.slice(0, -3) + 'y');
  if (w.endsWith('s') && !w.endsWith('ss')) {
    // "-es" is only added after s, x, z, ch, sh, o (boxes, wishes, goes); otherwise "games" -> game.
    if (/(s|x|z|ch|sh|o)es$/.test(w)) {
      add(w.slice(0, -2));
      add(w.slice(0, -1));
    } else {
      add(w.slice(0, -1));
      if (w.endsWith('es')) add(w.slice(0, -2));
    }
  }
  // "serves" -> serve above; "wolves" -> wolf (most are in the forms table already).
  if (w.endsWith('ves')) {
    add(w.slice(0, -3) + 'f');
    add(w.slice(0, -3) + 'fe');
  }
  if (w.endsWith('ied')) add(w.length <= 4 ? w.slice(0, -1) : w.slice(0, -3) + 'y');
  if (w.endsWith('eed') && w.length <= 5) add(w.slice(0, -1)); // "freed", "agreed"
  if (w.endsWith('ed')) suffix(w.slice(0, -2));
  if (w.endsWith('ing')) {
    const stem = w.slice(0, -3);
    if (stem.length === 2 && stem.endsWith('y')) add(stem.slice(0, -1) + 'ie'); // dying, lying
    suffix(stem);
  }
  if (w.endsWith('ier')) add(w.slice(0, -3) + 'y');
  if (w.endsWith('iest')) add(w.slice(0, -4) + 'y');
  if (w.endsWith('er')) suffix(w.slice(0, -2));
  if (w.endsWith('est')) suffix(w.slice(0, -3));
  if (w.endsWith('ly')) {
    if (w.endsWith('ily')) add(w.slice(0, -3) + 'y');
    add(w.slice(0, -2));
  }
  return out;
}
