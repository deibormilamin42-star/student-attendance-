const crypto = require('crypto');

module.exports = (req, res, next) => {
  if (!req.session.csrf) req.session.csrf = crypto.randomBytes(24).toString('hex');
  res.locals.csrfToken = req.session.csrf;

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const sent = Buffer.from(String((req.body && req.body._csrf) || ''));
    const real = Buffer.from(req.session.csrf);
    if (sent.length !== real.length || !crypto.timingSafeEqual(sent, real)) {
      return res.status(403).render('error', {
        title: 'Session expired', code: 403,
        message: 'Your form expired or was invalid. Go back, refresh the page and try again.',
      });
    }
  }
  next();
};
