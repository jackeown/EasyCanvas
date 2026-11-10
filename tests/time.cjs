const assert = require('node:assert/strict');
const {formatTime, getTimeLabel} = require('../helpers');
const stamp = Date.UTC(2026, 0, 1, 12, 34, 56, 123);
assert.equal(getTimeLabel(1, 2, 0, 500), '250ms', 'Legacy millisecond formatting remains available');
assert.equal(getTimeLabel(1, 1, stamp, stamp + 30000), new Date(stamp + 30000).getSeconds() + 's');
for (const span of [500, 30000, 1800000, 86400000, 604800000, 157680000000]) {
  for (const zone of ['UTC', 'Europe/Vienna', 'America/New_York']) {
    const label = formatTime(stamp, span, {locale: 'en-GB', timeZone: zone});
    assert.ok(label && !label.includes('Invalid'), `${span}, ${zone}: usable label`);
  }
}
const clock = {locale: 'en-GB', timeZone: 'Europe/Vienna', timeFormat: {hour:'2-digit', minute:'2-digit', hourCycle:'h23'}};
assert.equal(formatTime(Date.UTC(2026, 2, 29, 0, 30), 3600000, clock), '01:30');
assert.equal(formatTime(Date.UTC(2026, 2, 29, 1, 30), 3600000, clock), '03:30', 'Intl handles the spring DST transition');
assert.match(formatTime(stamp, 500, {locale:'en-GB', timeZone:'UTC'}), /123/, 'Subsecond precision retained');
assert.equal(formatTime(stamp, 604800000, {locale:'en-GB', timeZone:'UTC', timeFormat:{year:'numeric'}}), '2026');
assert.throws(() => formatTime(stamp, 1000, {timeZone:'Not/AZone'}), RangeError);
console.log('PASS: legacy time labels, subsecond precision, locales/zones, custom fields, and DST boundaries.');
