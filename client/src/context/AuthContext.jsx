import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

const ACTIVE_TOKEN_KEY = 'unitest_token';
const ACTIVE_USER_KEY = 'unitest_user';
const SAVED_SESSIONS_KEY = 'unitest_saved_sessions';

const getSessionId = (user) => user?.id || user?._id || user?.email || '';

const readSavedSessions = () => {
  try {
    const raw = localStorage.getItem(SAVED_SESSIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(session => session?.id && session?.token && session?.user) : [];
  } catch {
    return [];
  }
};

const writeSavedSessions = (sessions) => {
  localStorage.setItem(SAVED_SESSIONS_KEY, JSON.stringify(sessions));
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [savedSessions, setSavedSessions] = useState(() => readSavedSessions());
  const [loading, setLoading] = useState(true);

  const isPublicAuthPage = () => {
    const checkPath = window.location.href.toLowerCase();
    return [
      'login',
      'register',
      'forgot-password',
      'reset-password'
    ].some(path => checkPath.includes(path));
  };

  const applyActiveSession = useCallback((token, nextUser) => {
    localStorage.setItem(ACTIVE_TOKEN_KEY, token);
    localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const clearActiveSession = useCallback(() => {
    localStorage.removeItem(ACTIVE_TOKEN_KEY);
    localStorage.removeItem(ACTIVE_USER_KEY);
    setUser(null);
  }, []);

  const applyCookieOnlySession = useCallback((nextUser) => {
    localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const upsertSavedSession = useCallback((token, nextUser) => {
    const sessionId = getSessionId(nextUser);
    if (!sessionId || !token || !nextUser) return [];

    const nextSessions = [
      {
        id: sessionId,
        token,
        user: nextUser,
        lastUsedAt: new Date().toISOString()
      },
      ...readSavedSessions().filter(session => session.id !== sessionId)
    ].slice(0, 6);

    writeSavedSessions(nextSessions);
    setSavedSessions(nextSessions);
    return nextSessions;
  }, []);

  const persistSession = useCallback((token, nextUser) => {
    applyActiveSession(token, nextUser);
    upsertSavedSession(token, nextUser);
  }, [applyActiveSession, upsertSavedSession]);

  const removeSavedSession = useCallback((sessionId) => {
    const nextSessions = readSavedSessions().filter(session => session.id !== sessionId);
    writeSavedSessions(nextSessions);
    setSavedSessions(nextSessions);

    if (getSessionId(user) === sessionId) {
      clearActiveSession();
    }
  }, [clearActiveSession, user]);

  const syncCurrentSession = useCallback((nextUser) => {
    const token = localStorage.getItem(ACTIVE_TOKEN_KEY);
    if (!token || !nextUser) return;
    applyActiveSession(token, nextUser);
    upsertSavedSession(token, nextUser);
  }, [applyActiveSession, upsertSavedSession]);

  const switchAccount = useCallback(async (sessionId) => {
    const session = readSavedSessions().find(item => item.id === sessionId);
    if (!session) {
      throw new Error('Сохраненная сессия не найдена');
    }

    applyActiveSession(session.token, session.user);

    try {
      const res = await api.get('/auth/me');
      persistSession(session.token, res.data.user);
      return res.data.user;
    } catch (error) {
      removeSavedSession(sessionId);
      throw error;
    }
  }, [applyActiveSession, persistSession, removeSavedSession]);

  useEffect(() => {
    if (isPublicAuthPage()) {
      setSavedSessions(readSavedSessions());
      setLoading(false);
      return;
    }

    const token = localStorage.getItem(ACTIVE_TOKEN_KEY);
    const savedUser = localStorage.getItem(ACTIVE_USER_KEY);

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        clearActiveSession();
        setLoading(false);
        return;
      }

      api.get('/auth/me')
        .then(res => {
          syncCurrentSession(res.data.user);
        })
        .catch(() => {
          clearActiveSession();
        })
        .finally(() => setLoading(false));
    } else {
      api.get('/auth/me')
        .then(res => {
          applyCookieOnlySession(res.data.user);
        })
        .catch(() => {
          setSavedSessions(readSavedSessions());
        })
        .finally(() => setLoading(false));
    }
  }, [applyCookieOnlySession, clearActiveSession, syncCurrentSession]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    persistSession(res.data.token, res.data.user);
    return res.data;
  };

  const register = async (data) => {
    const res = await api.post('/auth/register', data);
    persistSession(res.data.token, res.data.user);
    return res.data;
  };

  const forgotPassword = async (email) => {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  };

  const resetPassword = async (token, password) => {
    const res = await api.post('/auth/reset-password', { token, password });
    return res.data;
  };

  const loginWithGoogleRedirect = () => {
    window.location.assign('/api/auth/google/start');
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore server logout errors and clear local session anyway
    }
    clearActiveSession();
    setSavedSessions(readSavedSessions());
  };

  const updateUser = useCallback((updatedUser) => {
    syncCurrentSession(updatedUser);
  }, [syncCurrentSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        savedSessions,
        login,
        register,
        forgotPassword,
        resetPassword,
        loginWithGoogleRedirect,
        logout,
        updateUser,
        switchAccount,
        removeSavedSession,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
