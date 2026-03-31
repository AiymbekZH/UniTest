import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};

// mode: 'light' | 'dark' | 'auto'
function resolveTheme(mode) {
  if (mode === 'auto') {
    const hour = new Date().getHours();
    return hour >= 22 || hour < 6;
  }
  return mode === 'dark';
}

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem('unitest_theme');
    if (saved === 'auto' || saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [dark, setDark] = useState(() => resolveTheme(mode));

  // Apply dark class to <html>
  useEffect(() => {
    const root = document.documentElement;
    const isDark = resolveTheme(mode);
    setDark(isDark);

    if (isDark) {
      root.classList.add('dark');
      // Ultra-dark night mode (after 22:00)
      if (mode === 'auto') {
        root.classList.add('night-mode');
      } else {
        root.classList.remove('night-mode');
      }
    } else {
      root.classList.remove('dark', 'night-mode');
    }
    localStorage.setItem('unitest_theme', mode);
  }, [mode]);

  // Re-check auto mode every minute (for auto-switch at 22:00/06:00)
  useEffect(() => {
    if (mode !== 'auto') return;
    const interval = setInterval(() => {
      setDark(resolveTheme('auto'));
      const root = document.documentElement;
      if (resolveTheme('auto')) {
        root.classList.add('dark', 'night-mode');
      } else {
        root.classList.remove('dark', 'night-mode');
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [mode]);

  const cycleTheme = useCallback(() => {
    setMode(prev => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'auto';
      return 'light'; // auto → light
    });
  }, []);

  // Legacy toggle for backward compatibility
  const toggleTheme = cycleTheme;

  return (
    <ThemeContext.Provider value={{ dark, mode, toggleTheme, cycleTheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
