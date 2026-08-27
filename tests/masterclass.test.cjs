const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const promo = require('../assets/promotions/capital-market-2026/campaign.js');
const store = () => { const values = new Map(); return { getItem: k => values.get(k), setItem: (k, v) => values.set(k, v) }; };
const denied = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };

test('early bird is inclusive of September 18 in Jakarta, then switches to regular', () => {
  assert.equal(promo.pricing(Date.parse('2026-09-18T23:59:59+07:00')).individual, 'Rp1.388.000');
  assert.equal(promo.pricing(Date.parse('2026-09-19T00:00:00+07:00')).individual, 'Rp1.588.000');
  assert.equal(promo.pricing(Date.parse('2026-09-18T17:00:00Z')).earlyBird, false);
  assert.equal(promo.pricing(Date.parse('2026-09-18T23:59:59+07:00')).group, 'Rp6.000.000');
  assert.equal(promo.pricing(Date.parse('2026-09-19T00:00:00+07:00')).group, 'Rp7.000.000');
});
test('registration promotion ends at the start of the first class date in Jakarta', () => {
  assert.equal(promo.pricing(promo.promotionEnd - 1).active, true);
  assert.equal(promo.pricing(promo.promotionEnd).active, false);
});
test('unseen visitors become seen only after explicit recording', () => {
  const local = store();
  assert.equal(promo.hasSeen([local]), false);
  assert.equal(promo.remember([local]), true);
  assert.equal(promo.hasSeen([local]), true);
  assert.equal(local.getItem(promo.seenKey), '1');
});
test('campaign key is namespaced and does not inherit another campaign', () => {
  const local = store(); local.setItem('kp:promo:old:seen', '1');
  assert.equal(promo.hasSeen([local]), false);
});
test('blocked persistent storage falls back to session storage', () => {
  const session = store();
  assert.equal(promo.remember([denied, session]), true);
  assert.equal(promo.hasSeen([denied, session]), true);
});
test('fully blocked storage is nonfatal', () => {
  assert.equal(promo.remember([denied]), false);
  assert.equal(promo.hasSeen([denied]), false);
});
test('tracking uses existing Vercel API with at most two non-personal properties', () => {
  const events = []; promo.track((...args) => events.push(args), 'Masterclass Checkout Clicked', 'early_bird');
  assert.deepEqual(events, [['event', { name: 'Masterclass Checkout Clicked', data: {
    campaign: 'capital-market-masterclass-2026', action: 'early_bird'
  } }]]);
});
test('missing or failing analytics cannot break the promotion', () => {
  assert.doesNotThrow(() => promo.track(undefined, 'click', 'early_bird'));
  assert.doesNotThrow(() => promo.track(() => { throw Error('offline'); }, 'click', 'early_bird'));
});
test('preview assets are not enabled on the real homepage', () => {
  const homepage = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  assert.equal(homepage.includes('capital-market-2026'), false);
});

test('carousel wraps in both directions', () => {
  assert.equal(promo.nextSlide(0, 1, 2), 1);
  assert.equal(promo.nextSlide(1, 1, 2), 0);
  assert.equal(promo.nextSlide(0, -1, 2), 1);
});
test('horizontal swipes navigate while taps and vertical scrolling do not', () => {
  assert.equal(promo.swipeDirection(-100, 12), 1);
  assert.equal(promo.swipeDirection(100, 12), -1);
  assert.equal(promo.swipeDirection(12, 2), 0);
  assert.equal(promo.swipeDirection(50, 90), 0);
  assert.equal(promo.swipeDirection(0, 0), 0);
});
test('native modal keeps individual pricing visible and group pricing behind an accessible button', () => {
  const html = fs.readFileSync(path.join(__dirname, '../assets/promotions/capital-market-2026/banner.html'), 'utf8');
  assert.match(html, /<dialog[^>]+aria-modal="true"/);
  assert.doesNotMatch(html, /poster-link/);
  assert.match(html, /id="kp-promo-group-toggle"[^>]+aria-expanded="false"[^>]+aria-controls="kp-promo-group-panel"/);
  assert.match(html, /id="kp-promo-group-panel" hidden/);
  for (const price of ['Rp1.388.000', 'Rp1.588.000', 'Rp788.000', 'Rp6.000.000', 'Rp7.000.000']) assert.ok(html.includes(price));
  assert.ok(html.includes('Hubungi Admin'));
  assert.ok(html.includes('0813 1525 4075'));
  assert.equal((html.match(/class="kp-promo__slide"/g) || []).length, 2);
  const footer = html.split('class="kp-promo__footer"')[1];
  assert.ok(footer.includes('id="kp-promo-admin"'));
  assert.ok(footer.includes('id="kp-promo-checkout"'));
});

test('each offer shows the correct regular-price strike-through and saving', () => {
  const html = fs.readFileSync(path.join(__dirname, '../assets/promotions/capital-market-2026/banner.html'), 'utf8');
  const offers = [
    { id: 'individual', regular: 1588000, price: 1388000, saving: 200000 },
    { id: 'student', regular: 1588000, price: 788000, saving: 800000 },
    { id: 'group', regular: 7000000, price: 6000000, saving: 1000000 }
  ];
  const rupiah = value => 'Rp' + new Intl.NumberFormat('id-ID').format(value);
  for (const offer of offers) {
    const block = html.split('id="kp-promo-' + offer.id + '"')[1].split('</dd>')[0];
    assert.ok(block.includes('<s>' + rupiah(offer.regular) + '</s>'));
    assert.ok(block.includes(rupiah(offer.price)));
    assert.ok(block.includes('Hemat ' + rupiah(offer.saving)));
    assert.equal(offer.regular - offer.price, offer.saving);
  }
  assert.match(html, /Mahasiswa dibandingkan dengan harga reguler individual/);
});
