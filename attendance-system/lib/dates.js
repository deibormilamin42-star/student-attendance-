// All "today" logic uses APP_TZ so it is correct even though Render runs in UTC.
const TZ = process.env.APP_TZ || 'Asia/Kolkata';
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

const today = () => fmt.format(new Date()); // YYYY-MM-DD

const isDate = (s) =>
  /^\d{4}-\d{2}-\d{2}$/.test(s || '') && new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) === s;

const isMonth = (s) => /^\d{4}-(0[1-9]|1[0-2])$/.test(s || '');
const monthStart = (d = today()) => d.slice(0, 7) + '-01';

function addDays(s, n) {
  const d = new Date(s + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function daysInMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}
function shiftMonth(ym, n) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}
const prettyDate = (s) =>
  s ? new Date(s + 'T00:00:00Z').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '';
const weekday = (s, style = 'short') =>
  new Date(s + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: style, timeZone: 'UTC' });
const monthLabel = (ym) =>
  new Date(ym + '-01T00:00:00Z').toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

module.exports = { TZ, today, isDate, isMonth, monthStart, addDays, daysInMonth, shiftMonth, prettyDate, weekday, monthLabel };
