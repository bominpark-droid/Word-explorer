// Guesses base forms for an inflected English word ("valleys" -> "valley",
// "hiking" -> "hike"). Irregular forms (ran, mice) come from the forms table.
export function baseCandidates(q: string): string[] {
  const w = q.toLowerCase().trim();
  const out: string[] = [];
  const add = (s: string) => {
    if (s.length >= 2 && s !== w && !out.includes(s)) out.push(s);
  };
  const doubled = (s: string) => s.length > 2 && s[s.length - 1] === s[s.length - 2];

  if (w.endsWith('ies')) add(w.slice(0, -3) + 'y');
  if (w.endsWith('ves')) {
    add(w.slice(0, -3) + 'f');
    add(w.slice(0, -3) + 'fe');
  }
  if (w.endsWith('es')) add(w.slice(0, -2));
  if (w.endsWith('s') && !w.endsWith('ss')) add(w.slice(0, -1));
  if (w.endsWith('ied')) add(w.slice(0, -3) + 'y');
  if (w.endsWith('ed')) {
    const stem = w.slice(0, -2);
    if (doubled(stem)) add(stem.slice(0, -1));
    add(stem);
    add(w.slice(0, -1));
  }
  if (w.endsWith('ing')) {
    const stem = w.slice(0, -3);
    if (doubled(stem)) add(stem.slice(0, -1));
    add(stem);
    add(stem + 'e');
  }
  if (w.endsWith('ier')) add(w.slice(0, -3) + 'y');
  if (w.endsWith('iest')) add(w.slice(0, -4) + 'y');
  if (w.endsWith('er')) {
    const stem = w.slice(0, -2);
    if (doubled(stem)) add(stem.slice(0, -1));
    add(stem);
    add(w.slice(0, -1));
  }
  if (w.endsWith('est')) {
    const stem = w.slice(0, -3);
    if (doubled(stem)) add(stem.slice(0, -1));
    add(stem);
    add(w.slice(0, -2));
  }
  if (w.endsWith('ly')) {
    add(w.slice(0, -2));
    if (w.endsWith('ily')) add(w.slice(0, -3) + 'y');
  }
  return out;
}
