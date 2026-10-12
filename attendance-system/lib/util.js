const LOW = Number(process.env.LOW_ATTENDANCE || 75);

exports.LOW = LOW;
exports.clean = (v, max = 100) => String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
exports.toId = (v) => (/^\d{1,9}$/.test(String(v || '')) ? Number(v) : null);
exports.pctClass = (p) => (p == null ? '' : p >= LOW ? 'ok' : 'bad');
exports.notFound = (res, what = 'page') =>
  res.status(404).render('error', { title: 'Not found', code: 404, message: `That ${what} could not be found.` });
