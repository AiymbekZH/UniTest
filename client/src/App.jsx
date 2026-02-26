import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateTest from './pages/CreateTest';
import TakeTest from './pages/TakeTest';
import ResultPage from './pages/ResultPage';
import TestResults from './pages/TestResults';
import MyTests from './pages/MyTests';
import MyResults from './pages/MyResults';
import QuestionBank from './pages/QuestionBank';
import Leaderboard from './pages/Leaderboard';
import TestProfile from './pages/TestProfile';
import Profile from './pages/Profile';
import UserProfile from './pages/UserProfile';
import AdminPanel from './pages/AdminPanel';

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }
  return isAuthenticated ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
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
      <Route path="/admin" element={<PrivateRoute><AdminPanel /></PrivateRoute>} />

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}
