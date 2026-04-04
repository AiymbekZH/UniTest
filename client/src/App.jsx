import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Lazy-loaded pages (code splitting)
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
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
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
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
      <Route path="/admin" element={<PrivateRoute><AdminPanel /></PrivateRoute>} />

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
    </Suspense>
  );
}
