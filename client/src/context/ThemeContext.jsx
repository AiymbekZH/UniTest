import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};

// mode: 'light' | 'dark' | 'system'
const STORAGE_KEY = 'unitest_theme';
const VALID_MODES = ['light', 'dark', 'system'];

function readSavedMode() {
  const saved = localStorage.getItem(STORAGE_KEY);
  // Backward compatibility: legacy 'auto' (time-based) -> 'system'
  if (saved === 'auto') return 'system';
  if (VALID_MODES.includes(saved)) return saved;
  // Default to system on first visit
  return 'system';
}

function getSystemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolveDark(mode) {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  // system
  return getSystemPrefersDark();
}

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState(readSavedMode);
  const [dark, setDark] = useState(() => resolveDark(readSavedMode()));

  // Apply .dark class on <html> + cleanup legacy night-mode class
  useEffect(() => {
    const root = document.documentElement;
    const isDark = resolveDark(mode);
    setDark(isDark);

    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');

    // Legacy class cleanup (was used by old auto/22:00 mode)
    root.classList.remove('night-mode');

    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  // Listen to OS preference changes when in 'system' mode
  useEffect(() => {
    if (mode !== 'system') return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      setDark(e.matches);
      const root = document.documentElement;
      if (e.matches) root.classList.add('dark');
      else root.classList.remove('dark');
    };
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else mq.addListener(handler); // Safari < 14
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', handler);
      else mq.removeListener(handler);
    };
  }, [mode]);

  const cycleTheme = useCallback(() => {
    setMode(prev => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'system';
      return 'light';
    });
  }, []);

  // Legacy alias
  const toggleTheme = cycleTheme;

  return (
    <ThemeContext.Provider value={{ dark, mode, toggleTheme, cycleTheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
