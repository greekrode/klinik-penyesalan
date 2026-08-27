# Capital Market Masterclass — design preview

Status: local review only. `index.html`, Vercel settings, and production are unchanged.

## Open

```sh
rtk proxy node preview/server.mjs
```

- Desktop: http://127.0.0.1:4173/preview/masterclass
- Phone frame: http://127.0.0.1:4173/preview/phone
- First-visit test: http://127.0.0.1:4173/preview/masterclass?mode=first-visit

The normal design URL always displays the banner. The first-visit URL remembers
visibility across reloads using a preview-only storage key. It never alters the
production campaign's seen state. The local analytics replacement logs events to
the console; the bottom-left preview disclosure shows the latest interaction.
No test analytics are sent to Vercel. The local server deliberately does not run
market-data APIs; the existing homepage's fallbacks are not current market data.

## Design and behavior

- Centered native modal with surrounding homepage space, a lighter dimmed/blurred backdrop, inert background, and page
  scroll locking. Close button and Escape dismiss it; focus returns to reopening.
- Original images 2 and 3 are actual inline slides, with previous/next arrows,
  position dots, left/right keyboard navigation, and horizontal swipe/drag.
  There is no autoplay and no image link that navigates away.
- Individual and student offers are visible immediately; group pricing expands
  through the “Harga grup · 5 orang” button. All offers retain regular
  prices crossed out: individual Rp1.588.000 → Rp1.388.000; mahasiswa
  Rp1.588.000 → Rp788.000; group (5 people) Rp7.000.000 → Rp6.000.000.
  Exact savings are Rp200.000, Rp800.000, and Rp1.000.000 respectively.
  The student comparison explicitly uses the regular individual price; it does
  not invent a separate former student price. E-mail/KTM eligibility remains.
- Mobile puts the intact carousel after the compact heading, ahead of two price
  columns. Current prices are 24px and regular prices 13px at 390px (21px/12px at
  320px). Desktop retains its split editorial layout. A compact “Hubungi Admin”
  WhatsApp button sits beside “Daftar” in the pinned footer; the contact number
  remains in its accessible label and tooltip.
- The modal body scrolls internally on short/mobile screens, with the close
  button at the top and the registration action pinned at the bottom.
- Register opens the provided Lynk destination in a new tab, with campaign UTMs.
- A visible title for one second marks the campaign seen. An explicit dismissal
  or checkout interaction also marks it seen. Reopening remains available.
- Seen state is per browser, not per account or across devices. Clearing browser
  data makes a visitor new again. Blocked local storage falls back to session
  storage; if both are blocked, repeat visits cannot be remembered.
- The early-bird campaign ends at 2026-09-19 00:00 Asia/Jakarta. Individual and
  group offers then display regular prices with their strike-throughs/savings
  removed. Student pricing and its comparison to regular remain unchanged.
- Conservative proposed promotion cutoff: 2026-10-03 00:00 Asia/Jakarta, before
  the first class. Revisit this before rollout if late registration is allowed.
- No session times were provided. No times or investment-return promises added.

## Analytics findings (2026-08-27)

- The existing homepage already loads `/_vercel/insights/script.js` and uses
  `window.va('event', ...)` for tool, Discord, and social clicks.
- The live site's analytics script returned HTTP 200 and valid JavaScript.
- The Vercel connector identified project `klinik-penyesalan` under the Pro team
  `roderick-projects`. Project API output did not expose analytics enablement.
- Event ingestion/dashboard counts were NOT verified: the browser reached the
  Vercel sign-in screen. No settings were changed or paid add-ons enabled.
- Official docs: https://vercel.com/docs/analytics/custom-events and
  https://vercel.com/docs/analytics/limits-and-pricing . Custom events are
  supported on Pro; this component limits each event to two non-personal
  properties (`campaign`, `action`).
- The provided Lynk destination is wired unchanged apart from UTMs. Automated
  fresh HTTP access returned 403, so the current listing/checkout content was
  not verified. The event details/pricing come from the supplied posters.

Events: `Masterclass Viewed`, `Masterclass Checkout Clicked`,
`Masterclass Dismissed`, `Masterclass Reopened`, `Masterclass Speakers Viewed`,
`Masterclass Admin Clicked`, `Masterclass Group Pricing Opened`.
Dismissals distinguish close button and Escape. Group expansion emits
`action: group_prices`. Posters remain an inline carousel, not outbound links.

Checkout clicks measure outbound intent, not purchases. Purchase attribution
requires a Lynk-supported conversion source and is not implemented here.

## Verification

```sh
rtk proxy node --test tests/masterclass.test.cjs
rtk git diff --check
```

Thirteen automated tests cover Jakarta boundaries, expiry, storage fallback,
campaign isolation, analytics payloads/failures, unchanged homepage wiring,
carousel wrapping, swipe direction filtering, accessible group disclosure,
adjacent contact/registration links, and
correct strike-through comparisons/savings for each offer.
Browser verification is performed on the revised modal, including native modal
state, page scroll lock, Escape/close, focus containment, carousel, and responsive
layout. The registration footer stays visible while the modal body scrolls.
At 390 × 844, the full first carousel slide, individual/student prices, group
button, and both footer actions fit in the initial centered modal. Group prices
start collapsed and can scroll internally when expanded. The backdrop now uses
48% dimming and 2px blur, with visible homepage margins above and below.
The revised layout was checked at 320 × 740, 390 × 844, 768 × 1024, and
1440 × 900 without horizontal modal overflow. At the two tested phone sizes,
the carousel, price comparisons, collapsed group button, and both actions fit
initially. Group disclosure, carousel navigation, Escape, focus restoration,
and reopening were rechecked after the compact-layout change.
The first-visit flow was rechecked on a fresh localhost origin: first load opens
the modal, a visible impression marks it seen, and reload shows only reopening.
Desktop drag, carousel arrows/keyboard, and close/Escape were checked in-browser.
Swipe thresholds and vertical-scroll rejection are unit-tested; no physical
touchscreen-device test was performed.

Known existing issue: the unmodified homepage footer's non-wrapping link row
extends the document to approximately 502px at a 390px viewport. The new banner
does not overflow. This unrelated issue is not changed in this preview.

## Rollout after design approval

1. Optimize the supplied full-resolution PNG assets for web delivery without
   changing the artwork; retain full-resolution downloads as appropriate.
2. Mount `banner.html` below the homepage header, load `banner.css` and deferred
   `campaign.js`, and retain the existing Vercel analytics loader. Do not deploy
   the preview attribute, local analytics stub, or local server as production UI.
3. Confirm Lynk listings, session times if they should be displayed, and cutoff.
4. Verify real impression and click events in Vercel before considering tracking
   operational. Ad blockers and blocked storage can affect measurements.
