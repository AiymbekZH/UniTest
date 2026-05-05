import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import toast, { Toaster, ToastBar } from 'react-hot-toast';

/**
 * Theme-aware Toaster wrapper.
 *
 * The plain <Toaster> previously hard-coded a dark slate background
 * (`#0f172a`), which looked correct on dark theme and obviously wrong
 * (a black popover floating over a beige page) on light theme. This
 * wrapper picks the palette from the active theme via useTheme and
 * recomposes the toastOptions on each render so a theme toggle
 * propagates to in-flight toasts on the next render cycle.
 *
 * Why a tiny component and not a useMemo'd object inside App?
 * <Toaster> reads style/options at mount time AND for new toasts; a
 * fresh element via wrapping ensures the props update cleanly when
 * the theme flips. The toast-bar dismiss button colors also follow.
 */
function ThemedToaster() {
  const { dark } = useTheme();

  // Palette pairs. Light is intentionally subtle: a white card with
  // slate text on a soft border. Dark mirrors the previous look.
  const palette = dark
    ? {
        background: '#0f172a',
        color: '#f8fafc',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        shadow: '0 24px 60px -32px rgba(15, 23, 42, 0.8)',
        dismissBg: 'rgba(255, 255, 255, 0.08)',
        dismissBgHover: 'rgba(255, 255, 255, 0.14)',
        dismissColor: '#cbd5e1',
        dismissColorHover: '#ffffff',
      }
    : {
        background: '#ffffff',
        color: '#0f172a',
        border: '1px solid rgba(15, 23, 42, 0.10)',
        shadow: '0 12px 36px -16px rgba(15, 23, 42, 0.18)',
        dismissBg: 'rgba(15, 23, 42, 0.06)',
        dismissBgHover: 'rgba(15, 23, 42, 0.12)',
        dismissColor: '#64748b',
        dismissColorHover: '#0f172a',
      };

  return (
    <Toaster
      position="top-right"
      gutter={10}
      toastOptions={{
        duration: 2600,
        style: {
          background: palette.background,
          color: palette.color,
          border: palette.border,
          borderRadius: '16px',
          padding: '14px 16px',
          boxShadow: palette.shadow,
        },
        success: { duration: 2200 },
        error: { duration: 3000 },
      }}
    >
      {(toastItem) => (
        <ToastBar toast={toastItem}>
          {({ icon, message }) => (
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex-shrink-0">{icon}</div>
              <div className="min-w-0 flex-1 text-sm leading-5">{message}</div>
              <button
                type="button"
                onClick={() => toast.dismiss(toastItem.id)}
                className="ml-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs transition"
                style={{
                  background: palette.dismissBg,
                  color: palette.dismissColor,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = palette.dismissBgHover;
                  e.currentTarget.style.color = palette.dismissColorHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = palette.dismissBg;
                  e.currentTarget.style.color = palette.dismissColor;
                }}
                aria-label="Dismiss notification"
              >
                x
              </button>
            </div>
          )}
        </ToastBar>
      )}
    </Toaster>
  );
}

// Lazy-loaded pages (code splitting)
const AuthPage = lazy(() => import('./pages/AuthPage'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CreateTest = lazy(() => import('./pages/CreateTest'));
const TakeTest = lazy(() => import('./pages/TakeTest'));
const ResultPage = lazy(() => import('./pages/ResultPage'));
const TestResults = lazy(() => import('./pages/TestResults'));
const MyTests = lazy(() => import('./pages/MyTests'));
const MyResults = lazy(() => import('./pages/MyResults'));
const QuestionBank = lazy(() => import('./pages/QuestionBank'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const TestProfile = lazy(() => import('./pages/TestProfile'));
const Profile = lazy(() => import('./pages/Profile'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const Groups = lazy(() => import('./pages/Groups'));
// Phase 2: new mobile-first chat shell mounted at /chat. Replaces the
// old /messages flow (which now 301-redirects here via the Routes below).
const Chat = lazy(() => import('./pages/Chat'));
// Phase 3: sticker pack management (+ AI generation). Lives at /stickers
// and is reachable from the in-chat sticker picker's settings button.
const MyStickersPage = lazy(() => import('./pages/MyStickersPage'));
const ArenaCodePage = lazy(() => import('./pages/ArenaCodePage'));
const ArenaHostPage = lazy(() => import('./pages/ArenaHostPage'));
const ArenaResultsPage = lazy(() => import('./pages/ArenaResultsPage'));
const ArenaHubPage = lazy(() => import('./pages/ArenaHubPage'));
const ArenaQuickStart = lazy(() => import('./pages/ArenaQuickStart'));
const CreateArenaTest = lazy(() => import('./pages/CreateArenaTest'));
const MyArenaTests = lazy(() => import('./pages/MyArenaTests'));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-surface">
    <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
  </div>
);

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <PageLoader />;
  return isAuthenticated ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
      {/* Public routes */}
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/*" element={<ResetPassword />} />
      <Route path="/test/:shareLink" element={<TakeTest />} />
      <Route path="/test-profile/:shareLink" element={<TestProfile />} />
      <Route path="/result/:id" element={<ResultPage />} />
      <Route path="/leaderboard/:testId" element={<Leaderboard />} />
      <Route path="/user/:id" element={<UserProfile />} />
      <Route path="/profile/:id" element={<UserProfile />} />
      <Route path="/u/:username" element={<UserProfile />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/arena" element={<PrivateRoute><ArenaHubPage /></PrivateRoute>} />
      <Route path="/arena/code/:joinCode" element={<ArenaCodePage />} />
      <Route path="/arena/results/:roomId" element={<ArenaResultsPage />} />

      {/* Protected routes */}
      <Route path="/create-test" element={<PrivateRoute><CreateTest /></PrivateRoute>} />
      <Route path="/edit-test/:id" element={<PrivateRoute><CreateTest /></PrivateRoute>} />
      <Route path="/my-tests" element={<PrivateRoute><MyTests /></PrivateRoute>} />
      <Route path="/my-results" element={<PrivateRoute><MyResults /></PrivateRoute>} />
      <Route path="/results/:testId" element={<PrivateRoute><TestResults /></PrivateRoute>} />
      <Route path="/question-bank" element={<PrivateRoute><QuestionBank /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="/groups" element={<PrivateRoute><Groups /></PrivateRoute>} />
      {/* /messages was the Phase-0 chat page. The file was removed in
          Phase 5; this redirect handles any old links or bookmarks
          still pointing at it. */}
      <Route path="/messages" element={<Navigate to="/chat" replace />} />
      {/* New unified chat (Phase 2). Three URL forms drive the layout: */}
      <Route path="/chat" element={<PrivateRoute><Chat /></PrivateRoute>} />
      <Route path="/chat/:kind/:chatId" element={<PrivateRoute><Chat /></PrivateRoute>} />
      {/* Phase 3: sticker pack management. */}
      <Route path="/stickers" element={<PrivateRoute><MyStickersPage /></PrivateRoute>} />
      <Route path="/arena/host/:roomId" element={<PrivateRoute><ArenaHostPage /></PrivateRoute>} />
      <Route path="/arena/quick-start" element={<PrivateRoute><ArenaQuickStart /></PrivateRoute>} />
      <Route path="/arena/templates" element={<PrivateRoute><MyArenaTests /></PrivateRoute>} />
      <Route path="/arena-tests/new" element={<PrivateRoute><CreateArenaTest /></PrivateRoute>} />
      <Route path="/arena-tests/:id/edit" element={<PrivateRoute><CreateArenaTest /></PrivateRoute>} />
      <Route path="/admin" element={<PrivateRoute><AdminPanel /></PrivateRoute>} />

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>

      <ThemedToaster />
    </Suspense>
  );
}
