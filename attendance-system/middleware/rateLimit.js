// Tiny in-memory login throttle (per IP + email). Enough for a single small server.
const WINDOW = 15 * 60 * 1000;
const MAX = 8;
const hits = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of hits) if (now > v.reset) hits.delete(k);
}, 5 * 60 * 1000).unref();

exports.blocked = (key) => {
  const r = hits.get(key);
  return !!r && Date.now() <= r.reset && r.n >= MAX;
};
exports.fail = (key) => {
  const now = Date.now();
  const r = hits.get(key);
  if (!r || now > r.reset) hits.set(key, { n: 1, reset: now + WINDOW });
  else r.n += 1;
};
exports.clear = (key) => hits.delete(key);
