/**
 * ESLint configuration for UniTest_Client.
 *
 * The single purpose of this file in the current iteration is to enforce
 * Requirement 3.1 from the `lottie-animated-icons` spec:
 *
 *   "THE UniTest_Client SHALL изолировать Lottie_Runtime в отдельный
 *    Lottie_Chunk, отсутствующий в Initial_Bundle."
 *
 * That is: no file that participates in the eager (Initial_Bundle) import
 * graph rooted at `client/src/main.jsx` may statically import the Lottie
 * runtime (`lottie-web` and its sub-paths) or `LottiePlayer` — both must
 * be reached only through dynamic `import(...)` / `React.lazy(...)` so
 * that Vite/Rollup splits them off into a separate Lottie_Chunk.
 *
 * Implementation note: the `no-restricted-imports` rule below only fires
 * on static ES `import` declarations (and `require(...)`). Dynamic
 * `import('lottie-web/build/player/lottie_light')` inside `LottiePlayer`
 * and `React.lazy(() => import('./LottiePlayer.jsx'))` inside
 * `LottieIcon` are intentionally NOT caught — that is the whole point.
 *
 * The override below applies to the entire `src/**` tree because the
 * eager-import graph rooted at `main.jsx` is, in the absence of route
 * splitting, effectively the whole tree. Files that legitimately need
 * Lottie continue to use dynamic import and pass the rule.
 *
 * See: .kiro/specs/lottie-animated-icons/requirements.md (Requirement 3.1)
 *      .kiro/specs/lottie-animated-icons/design.md  (section "Lottie_Chunk")
 */

/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  rules: {},
  overrides: [
    {
      // Eager-graph guard: every file reachable by static imports starting
      // from `client/src/main.jsx`. We keep the glob broad on purpose —
      // dynamic imports remain allowed, so files that legitimately load
      // Lottie at runtime (LottieIcon.jsx, LottiePlayer.jsx) are not
      // affected by this rule. See Requirement 3.1.
      files: ['src/**/*.{js,jsx,mjs,cjs}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: 'lottie-web',
                message:
                  'Static import of lottie-web is forbidden — it would land in the Initial_Bundle. Load it via dynamic import inside LottiePlayer (Requirement 3.1).',
              },
              {
                name: 'lottie-web/build/player/lottie_light',
                message:
                  'Static import of lottie_light is forbidden — load it via dynamic import inside LottiePlayer (Requirement 3.1).',
              },
              {
                name: 'lottie-react',
                message:
                  'lottie-react would pull the full lottie-web runtime into the Initial_Bundle. Use the project-local LottieIcon component instead (Requirement 3.1).',
              },
            ],
            patterns: [
              {
                group: [
                  'lottie-web/*',
                  '**/LottieIcon/LottiePlayer',
                  '**/LottieIcon/LottiePlayer.*',
                  '**/LottieIcon/LottiePlayer.jsx',
                ],
                message:
                  'LottiePlayer and lottie-web internals must be reached via React.lazy / dynamic import only (Requirement 3.1).',
              },
            ],
          },
        ],
      },
    },
  ],
};
