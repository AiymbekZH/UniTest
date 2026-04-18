import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import toast, { Toaster, ToastBar } from 'react-hot-toast';

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
const Messages = lazy(() => import('./pages/Messages'));

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
      <Route path="/dashboard" element={<Dashboard />} />

      {/* Protected routes */}
      <Route path="/create-test" element={<PrivateRoute><CreateTest /></PrivateRoute>} />
      <Route path="/edit-test/:id" element={<PrivateRoute><CreateTest /></PrivateRoute>} />
      <Route path="/my-tests" element={<PrivateRoute><MyTests /></PrivateRoute>} />
      <Route path="/my-results" element={<PrivateRoute><MyResults /></PrivateRoute>} />
      <Route path="/results/:testId" element={<PrivateRoute><TestResults /></PrivateRoute>} />
      <Route path="/question-bank" element={<PrivateRoute><QuestionBank /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="/groups" element={<PrivateRoute><Groups /></PrivateRoute>} />
      <Route path="/messages" element={<PrivateRoute><Messages /></PrivateRoute>} />
      <Route path="/admin" element={<PrivateRoute><AdminPanel /></PrivateRoute>} />

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>

      <Toaster
        position="top-right"
        gutter={10}
        toastOptions={{
          duration: 2600,
          style: {
            background: '#0f172a',
            color: '#f8fafc',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: '16px',
            padding: '14px 16px',
            boxShadow: '0 24px 60px -32px rgba(15, 23, 42, 0.8)'
          },
          success: {
            duration: 2200
          },
          error: {
            duration: 3000
          }
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
                  className="ml-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/8 text-xs text-slate-300 transition hover:bg-white/14 hover:text-white"
                  aria-label="Dismiss notification"
                >
                  x
                </button>
              </div>
            )}
          </ToastBar>
        )}
      </Toaster>
    </Suspense>
  );
}
