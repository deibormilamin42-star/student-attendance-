require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const PgStore = require('connect-pg-simple')(session);
const helmet = require('helmet');
const pool = require('./db');
const { requireAuth } = require('./middleware/auth');
const csrf = require('./middleware/csrf');
const dates = require('./lib/dates');
const { LOW, pctClass } = require('./lib/util');

if (!process.env.DATABASE_URL || !process.env.SESSION_SECRET) {
  console.error('Missing DATABASE_URL or SESSION_SECRET environment variable.');
  process.exit(1);
}

const isProd = process.env.NODE_ENV === 'production';
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1); // Render sits behind a proxy
app.use(helmet({ contentSecurityPolicy: false }));

// Cheap endpoints that must not create sessions (health checks, uptime pings, browsers)
app.get('/healthz', (req, res) => res.type('text').send('ok'));
app.get('/favicon.ico', (req, res) => res.status(204).end());

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: isProd ? '1h' : 0 }));

app.use(session({
  store: new PgStore({ pool, createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
  },
}));

// Helpers available in every view
app.locals.pretty = dates.prettyDate;
app.locals.weekday = dates.weekday;
app.locals.monthLabel = dates.monthLabel;
app.locals.pctClass = pctClass;
app.locals.LOW = LOW;

app.use((req, res, next) => {
  req.flash = (type, msg) => { req.session.flash = { type, msg }; };
  res.locals.user = req.session.user || null;
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  res.locals.active = '';
  res.locals.today = dates.today();
  next();
});
app.use(csrf);

app.get('/', (req, res) => res.redirect(req.session.user ? '/dashboard' : '/login'));
app.use('/', require('./routes/auth'));
app.use('/dashboard', requireAuth, require('./routes/dashboard'));
app.use('/classes', requireAuth, require('./routes/classes'));
app.use('/students', requireAuth, require('./routes/students'));
app.use('/attendance', requireAuth, require('./routes/attendance'));
app.use('/reports', requireAuth, require('./routes/reports'));
app.use('/users', requireAuth, require('./routes/users'));
app.use('/account', requireAuth, require('./routes/account'));

app.use((req, res) =>
  res.status(404).render('error', { title: 'Not found', code: 404, message: 'That page does not exist.' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).render('error', {
    title: 'Something went wrong', code: 500,
    message: 'An unexpected error occurred. Please try again in a moment.',
  });
});

process.on('unhandledRejection', (e) => console.error('Unhandled rejection:', e));

app.listen(process.env.PORT || 3000, () => console.log('Server running'));
