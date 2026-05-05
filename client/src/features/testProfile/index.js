// Public surface for the testProfile feature. Anything outside this
// folder should import from `features/testProfile` (this barrel) and
// not reach into individual section/sidebar/modal files. That keeps
// the internal layout free to evolve without breaking callers.

export { default as TestProfilePage } from './TestProfilePage';
