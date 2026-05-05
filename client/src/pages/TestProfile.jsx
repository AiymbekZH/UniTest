// Backward-compat re-export.
//
// Routes in App.jsx already lazy-import './pages/TestProfile' so
// keeping a default export here saves a router-level edit. The real
// page lives in features/testProfile/TestProfilePage.jsx — see the
// README in that folder for the architecture.

export { default } from '../features/testProfile/TestProfilePage';
