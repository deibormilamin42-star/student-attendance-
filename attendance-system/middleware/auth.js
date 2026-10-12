exports.requireAuth = (req, res, next) =>
  req.session.user ? next() : res.redirect('/login');

exports.requireAdmin = (req, res, next) =>
  req.session.user && req.session.user.role === 'admin'
    ? next()
    : res.status(403).render('error', { title: 'Not allowed', code: 403, message: 'You need administrator access for this action.' });
