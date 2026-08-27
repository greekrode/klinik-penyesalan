(function () {
  'use strict';
  var campaign = 'capital-market-masterclass-2026';
  var seenKey = 'kp:promo:' + campaign + ':seen';
  // Boundaries are explicit Jakarta time, independent of the visitor's timezone.
  var earlyBirdEnd = Date.parse('2026-09-19T00:00:00+07:00');
  // Conservative cutoff: do not advertise registration once the first class starts.
  var promotionEnd = Date.parse('2026-10-03T00:00:00+07:00');

  function pricing(now) {
    return { active: now < promotionEnd, earlyBird: now < earlyBirdEnd,
      individual: now < earlyBirdEnd ? 'Rp1.388.000' : 'Rp1.588.000',
      group: now < earlyBirdEnd ? 'Rp6.000.000' : 'Rp7.000.000' };
  }
  function hasSeen(stores) {
    return stores.some(function (storage) {
      try { return storage.getItem(seenKey) === '1'; } catch (_) { return false; }
    });
  }
  function remember(stores) {
    // Fall back to this session if persistent storage is blocked.
    return stores.some(function (storage) {
      try { storage.setItem(seenKey, '1'); return true; } catch (_) { return false; }
    });
  }
  function track(analytics, name, action) {
    try {
      if (typeof analytics === 'function') analytics('event', {
        name: name, data: { campaign: campaign, action: action }
      });
    } catch (_) { /* Analytics failure must never block registration. */ }
  }
  function nextSlide(current, direction, count) {
    return (current + direction + count) % count;
  }
  function swipeDirection(dx, dy) {
    return Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.2 ? (dx < 0 ? 1 : -1) : 0;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { pricing: pricing, hasSeen: hasSeen, remember: remember,
      track: track, nextSlide: nextSlide, swipeDirection: swipeDirection,
      seenKey: seenKey, earlyBirdEnd: earlyBirdEnd, promotionEnd: promotionEnd };
    return;
  }
  var banner = document.getElementById('kp-masterclass');
  if (!banner) return;
  var preview = document.documentElement.hasAttribute('data-promo-preview');
  var forcePreview = preview && new URLSearchParams(location.search).get('mode') !== 'first-visit';
  var stores = [];
  ['localStorage', 'sessionStorage'].forEach(function (type) {
    try { if (window[type]) stores.push(window[type]); } catch (_) {}
  });
  // Preview state never marks the real campaign as seen, even if hosted together.
  if (preview) seenKey += ':preview';
  var returnBar = document.getElementById('kp-promo-return');
  var reopen = document.getElementById('kp-promo-reopen');
  var close = banner.querySelector('.kp-promo__close');
  var price = pricing(Date.now());
  if (!price.active) return;
  function refreshPricing() {
    price = pricing(Date.now());
    document.getElementById('kp-promo-deadline').textContent = price.earlyBird ? 's.d. 18 September 2026' : 'Harga reguler per orang';
    document.getElementById('kp-promo-individual-label').textContent = price.earlyBird ? 'Individual · Early bird' : 'Individual · Reguler';
    document.getElementById('kp-promo-group-label').textContent = price.earlyBird ? 'Grup · Early bird' : 'Grup · Reguler';
    document.getElementById('kp-promo-individual-price').textContent = price.individual;
    document.getElementById('kp-promo-group-price').textContent = price.group;
    ['individual', 'group'].forEach(function (tier) {
      document.getElementById('kp-promo-' + tier + '-regular').hidden = !price.earlyBird;
      document.getElementById('kp-promo-' + tier + '-saving').hidden = !price.earlyBird;
    });
  }
  refreshPricing();
  function emit(name, action) { track(window.va, name, action); }
  var observed = false;
  var manual = false;
  var timer;
  var visible = false;
  var observer;
  function markSeen() { if (!forcePreview) remember(stores); }
  function impression() {
    if (observed || !banner.open || document.visibilityState !== 'visible') return;
    observed = true;
    markSeen();
    emit('Masterclass Viewed', manual ? 'reopened' : 'automatic');
    if (observer) observer.disconnect();
  }
  function queueImpression() {
    clearTimeout(timer);
    if (!observed && visible && banner.open && document.visibilityState === 'visible') {
      timer = setTimeout(impression, 1000);
    }
  }
  function show(fromReopen) {
    refreshPricing();
    if (!price.active) return;
    manual = fromReopen;
    banner.returnValue = '';
    banner.showModal();
    document.documentElement.classList.add('kp-promo-open');
    banner.querySelector('.kp-promo__body').scrollTop = 0;
    returnBar.hidden = true;
    if (!observed && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(function (entries) {
        visible = entries.some(function (entry) { return entry.isIntersecting && entry.intersectionRatio >= 0.8; });
        queueImpression();
      }, { threshold: [0, 0.8] });
      // Track the visible title, not the whole panel (which is taller on phones).
      observer.observe(document.getElementById('kp-promo-title'));
    } else if (!observed) {
      visible = true;
      queueImpression();
    }
    if (fromReopen) {
      emit('Masterclass Reopened', 'return_link');
    }
    close.focus({ preventScroll: true });
  }
  if (!forcePreview && hasSeen(stores)) returnBar.hidden = false;
  else show(false);
  document.addEventListener('visibilitychange', function () {
    refreshPricing();
    if (!price.active) {
      if (banner.open) banner.close('expired');
      document.documentElement.classList.remove('kp-promo-open');
      returnBar.hidden = true;
      clearTimeout(timer);
      if (observer) observer.disconnect();
    } else queueImpression();
  });
  function dismiss(reason) {
    impression();
    markSeen();
    emit('Masterclass Dismissed', reason);
    banner.close(reason);
  }
  close.addEventListener('click', function () { dismiss('close_button'); });
  banner.addEventListener('cancel', function (event) {
    event.preventDefault();
    dismiss('escape_key');
  });
  banner.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && banner.open) {
      event.preventDefault();
      event.stopPropagation();
      dismiss('escape_key');
    }
  });
  banner.addEventListener('close', function () {
    document.documentElement.classList.remove('kp-promo-open');
    returnBar.hidden = banner.returnValue === 'expired';
    clearTimeout(timer);
    if (observer) observer.disconnect();
    if (!returnBar.hidden) reopen.focus({ preventScroll: true });
  });
  reopen.addEventListener('click', function () { show(true); });
  document.getElementById('kp-promo-checkout').addEventListener('click', function () {
    refreshPricing();
    impression();
    markSeen();
    emit('Masterclass Checkout Clicked', price.earlyBird ? 'early_bird' : 'regular');
  });
  document.getElementById('kp-promo-checkout').addEventListener('auxclick', function (event) {
    if (event.button === 1) {
      refreshPricing();
      impression(); markSeen();
      emit('Masterclass Checkout Clicked', price.earlyBird ? 'early_bird' : 'regular');
    }
  });
  document.getElementById('kp-promo-admin').addEventListener('click', function () {
    impression(); markSeen();
    emit('Masterclass Admin Clicked', 'contact_person');
  });
  var groupToggle = document.getElementById('kp-promo-group-toggle');
  var groupPanel = document.getElementById('kp-promo-group-panel');
  groupToggle.addEventListener('click', function () {
    var expanded = groupToggle.getAttribute('aria-expanded') !== 'true';
    groupToggle.setAttribute('aria-expanded', String(expanded));
    groupToggle.querySelector('span').textContent = expanded ? '−' : '+';
    groupPanel.hidden = !expanded;
    if (expanded) {
      refreshPricing();
      impression(); markSeen();
      emit('Masterclass Group Pricing Opened', 'group_prices');
      groupPanel.scrollIntoView({ block: 'nearest' });
    }
  });
  var page = 0;
  var buttons = banner.querySelectorAll('[data-promo-page]');
  var slides = banner.querySelectorAll('.kp-promo__slide');
  var carousel = document.getElementById('kp-promo-carousel');
  var trackElement = document.getElementById('kp-promo-track');
  var caption = document.getElementById('kp-promo-slide-caption');
  function selectPage(next) {
    if (page === next) return;
    impression();
    markSeen();
    page = next;
    trackElement.style.transform = 'translateX(-' + (page * 100) + '%)';
    slides.forEach(function (slide, index) {
      slide.setAttribute('aria-hidden', String(index !== page));
      slide.inert = index !== page;
    });
    document.getElementById('kp-promo-page').textContent = page === 0 ? '01 / 02' : '02 / 02';
    caption.firstChild.textContent = page === 0 ? 'Hari 1 & 2 ' : 'Hari 3 & 4 ';
    caption.querySelector('span').textContent = page === 0 ? '3 & 10 Oktober 2026' : '17 & 24 Oktober 2026';
    buttons.forEach(function (button, i) { button.setAttribute('aria-pressed', String(i === page)); });
    emit('Masterclass Speakers Viewed', page === 0 ? 'days_1_2' : 'days_3_4');
  }
  buttons.forEach(function (button, index) {
    button.addEventListener('click', function () { selectPage(index); });
  });
  document.getElementById('kp-promo-prev').addEventListener('click', function () {
    selectPage(nextSlide(page, -1, slides.length));
  });
  document.getElementById('kp-promo-next').addEventListener('click', function () {
    selectPage(nextSlide(page, 1, slides.length));
  });
  banner.querySelector('.kp-promo__experts').addEventListener('keydown', function (event) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    selectPage(nextSlide(page, event.key === 'ArrowRight' ? 1 : -1, slides.length));
  });
  var pointerStart;
  carousel.addEventListener('pointerdown', function (event) {
    if (!event.isPrimary || event.button !== 0 || event.target.closest('button')) return;
    pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
    carousel.setPointerCapture(event.pointerId);
  });
  carousel.addEventListener('pointercancel', function () { pointerStart = null; });
  carousel.addEventListener('pointerup', function (event) {
    if (!pointerStart || event.pointerId !== pointerStart.id) return;
    var direction = swipeDirection(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
    pointerStart = null;
    if (direction) selectPage(nextSlide(page, direction, slides.length));
  });
})();
