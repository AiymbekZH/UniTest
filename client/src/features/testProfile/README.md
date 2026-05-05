# `features/testProfile/`

Self-contained shell for the **Test Profile** page (`/test-profile/:shareLink`).

Replaces the legacy `pages/TestProfile.jsx` 659-line monolith with a
composable set of focused sections, sidebar widgets, and modals.

## Public surface

```js
import { TestProfilePage } from 'features/testProfile';
```

Only `TestProfilePage` is re-exported. All other modules are internal
implementation details — you should NOT import a section or modal
directly from outside this folder. That contract lets the layout
evolve without breaking the rest of the app.

`pages/TestProfile.jsx` is a thin re-export kept for backwards-compat
so the existing lazy-route in `App.jsx` continues to work without
edits.

## Layout

```
features/testProfile/
├── index.js                          ← public barrel
├── TestProfilePage.jsx               ← shell / orchestrator
├── README.md                         ← this file
├── hooks/
│   ├── useTestProfileData.js         ← parallel fetcher
│   └── useShareLink.js               ← derived URLs (profile/direct/tg/wa/qr)
├── utils/
│   ├── difficultyMeta.js             ← score → {label, color, gradient}
│   ├── questionTypeLabel.js          ← type → i18n label
│   └── formatDate.js                 ← lang-aware Intl helpers
├── states/
│   ├── TestProfileSkeleton.jsx       ← full-page skeleton
│   └── TestWindowClosedCard.jsx      ← 403 NOT_STARTED / ENDED card
├── sections/                         ← main column blocks
│   ├── TestHero.jsx
│   ├── TestMetaCard.jsx
│   ├── DifficultyBar.jsx
│   ├── RatingCard.jsx
│   ├── QuestionPreviewCard.jsx       ← NEW
│   ├── MyHistoryCard.jsx             ← NEW
│   ├── ScoreDistributionCard.jsx     ← NEW
│   ├── RelatedTestsRail.jsx          ← NEW
│   └── LeaderboardPreview.jsx
├── sidebar/
│   ├── LaunchPanel.jsx               ← Start CTA + share row + practice
│   └── StickyMobileCTA.jsx           ← bottom-anchored mobile CTA
└── modals/
    ├── ChunkyModal.jsx               ← shared modal shell
    ├── QrModal.jsx
    ├── ReportModal.jsx
    └── ShareSheet.jsx                ← unified share sheet
```

## Data flow

`TestProfilePage` is the only stateful component. It calls
`useTestProfileData(shareLink, user)` once on mount, which fans out
**seven** parallel requests via `Promise.allSettled`:

| # | Endpoint                                         | Section that consumes it     |
|---|--------------------------------------------------|------------------------------|
| 1 | `GET /tests/share/:shareLink`                    | (the prereq — sets `test`)   |
| 2 | `GET /results/leaderboard/:testId`               | `LeaderboardPreview`         |
| 3 | `GET /results/my-attempts/:testId`               | `LaunchPanel` (used count)   |
| 4 | `GET /tests/:id/my-rating`                       | `RatingCard`                 |
| 5 | `GET /tests/:id/my-difficulty-rating`            | `RatingCard`                 |
| 6 | `GET /results/distribution/:testId`              | `ScoreDistributionCard`      |
| 7 | `GET /tests/:id/related?limit=4`                 | `RelatedTestsRail`           |
| 8 | `GET /results/my-attempts-list/:testId`          | `MyHistoryCard`              |

Endpoints 3-5 and 8 only fire for logged-in users (returns null
sentinel for guests). Failures are isolated by `allSettled` — a 500
on the related-tests endpoint never blocks the rest of the page from
rendering.

## New server endpoints

Two new endpoints were added for this feature:

- **`GET /api/results/distribution/:testId`** — 5-bucket histogram
  (0-20 / 20-40 / 40-60 / 60-80 / 80-100), plus `average`, `median`,
  and `percentile` (logged-in users only). See
  `server/routes/results.js`.
- **`GET /api/tests/:id/related?limit=4`** — related tests by tag
  intersection, falling back to same-creator. Public tests only. See
  `server/routes/tests.js`.

## i18n

All UI text routes through `useLanguage()` and `t(key, params)`. New
keys live in `client/src/context/LanguageContext.jsx` under the
`// TestProfile rebuild (v2)` blocks for `en`, `ru`, `kz`, and `es`.

When adding new copy, add the key to all four language sections — the
fallback chain is `currentLang → en` so a missing key still renders
*something*, but you'll see English text on a non-English page, which
is jarring for users.

## Mobile UX notes

- The desktop sidebar is `lg:sticky lg:top-20`. The Start CTA stays
  in view during scroll on `>= lg` viewports, so the mobile-only
  `StickyMobileCTA` is hidden via `lg:hidden` to avoid double UI.
- `StickyMobileCTA` only appears once the user scrolls past 480px,
  giving a chance for the hero CTA to be the primary affordance for
  short visits.
- `ShareSheet` uses `bottomSheetOnMobile` so it docks to the bottom
  of the viewport on phones (familiar mobile share-sheet pattern)
  while remaining a centered card on desktop.

## Adding a new section

1. Create the component under `sections/` with `chunky-card` styling
   and consume `useLanguage()` for any text.
2. Mount it inside the main column of `TestProfilePage.jsx`.
3. If you need new data, plumb the request into
   `useTestProfileData.js` so the fan-out stays in one place.
4. Add any new i18n keys to all four language blocks.
5. Update this README's layout tree.
