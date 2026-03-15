# UniTest — Ideas & Improvements

## UX / UI

1. **i18n for all pages** — Login, Register, MyTests, MyResults, Groups, and many modals still have hardcoded Russian strings. Migrate everything to `LanguageContext` with `t()` keys for EN/RU/KZ consistency.

2. **Dark mode audit** — Some pages (Dashboard menu button, certain hover states) have subtle dark mode gaps. Run through every page in dark mode and fix mismatches.

3. **Skeleton loading consistency** — Skeleton loaders on groups list and test list cards use different padding/radius than the actual cards. Unify them.

4. **Mobile navigation** — The Navbar hamburger menu could benefit from a slide-in drawer instead of a dropdown, especially on smaller screens.

5. **Toast positioning** — Some pages use `top-right`, some use `top-center`. Standardize across the app.

6. **Empty states** — Add illustrated empty states (SVG illustrations) instead of just icons + text for empty groups, empty tests, no results, etc.

7. **Keyboard shortcuts** — Add Ctrl+K / Cmd+K command palette for power users (navigate to create test, groups, profile, etc.).

## Features

8. **Group chat improvements**:
   - Read receipts / "seen by" indicator
   - Typing indicator (would need WebSocket or more frequent polling)
   - File/image sharing in chat
   - Message reactions (like, thumbs up)
   - Pin important messages
   - Unread message count badge on group cards

9. **Test analytics dashboard** — For test creators: show aggregate stats, score distribution histogram, average time per question, hardest questions, drop-off points.

10. **Student dashboard** — Personal learning analytics: tests taken over time, average scores by category, improvement trends, weak areas.

11. **Notifications system** — Real-time (or polled) notifications for: new test assigned to group, new chat messages, test graded (essay), group invite received.

12. **Question bank categories** — Allow teachers to organize saved questions into folders/tags for easier reuse.

13. **Test scheduling** — Let teachers schedule tests to auto-open and auto-close at specific times (start/end date is already in the model but not enforced client-side).

14. **CSV/Excel export of results** — For teachers: export all results of a test to CSV with student name, score, time, individual question answers.

15. **Plagiarism detection** — For essay questions: compare student answers against each other and flag similar submissions.

16. **Collaborative test creation** — Allow multiple teachers to co-edit a test simultaneously (would need conflict resolution).

## Technical / Infrastructure

17. **WebSocket migration** — Replace polling for chat with Socket.io for real-time messages. Could also use for notifications and live test monitoring.

18. **Image optimization** — User avatars and media in questions are stored as-is. Add server-side image resizing/compression (sharp) and serve via CDN.

19. **Rate limiting** — Add express-rate-limit to critical endpoints (login, register, AI generate, chat messages) to prevent abuse.

20. **Caching** — Add Redis caching for frequently accessed data: test metadata, leaderboard, user profiles.

21. **Error tracking** — Integrate Sentry or similar for frontend/backend error tracking in production.

22. **E2E testing** — Add Cypress or Playwright tests for critical flows: login, create test, take test, view results.

23. **API documentation** — Generate Swagger/OpenAPI docs from the Express routes for API consumers.

24. **Bundle analysis** — Run `vite-bundle-visualizer` to identify large dependencies. recharts, framer-motion, and tiptap are likely the biggest — consider lazy loading charts and the rich text editor.

25. **Environment variables** — Some config (like AI model name "GPT-5.2") is hardcoded in frontend. Move to `.env` for easier updates.

## Quick Wins

26. **Favicon & meta tags** — Add proper Open Graph tags and a favicon for better social sharing.

27. **404 page** — Currently SPA fallback shows blank for invalid routes. Add a styled 404 page.

28. **Password strength meter** — On registration page, show password strength indicator.

29. **Test preview** — Allow teachers to preview the test-taking experience before publishing (partially exists but could be more prominent).

30. **Copy test** — "Duplicate test" button for teachers to quickly create a variant from an existing test.
