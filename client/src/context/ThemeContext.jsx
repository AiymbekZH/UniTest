import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem('unitest_theme_mode') || 'auto';
  });
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const updateTheme = () => {
      let isDark = false;
      if (themeMode === 'dark') {
        isDark = true;
      } else if (themeMode === 'light') {
        isDark = false;
      } else { // auto
        const hour = new Date().getHours();
        if (hour >= 22 || hour < 6) { // night mode
          isDark = true;
        } else {
          isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
      }
      
      setDark(isDark);
      const root = document.documentElement;
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    updateTheme();
    localStorage.setItem('unitest_theme_mode', themeMode);

    if (themeMode === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => updateTheme();
      mediaQuery.addEventListener('change', listener);
      const interval = setInterval(updateTheme, 60000); 
      
      return () => {
        mediaQuery.removeEventListener('change', listener);
        clearInterval(interval);
      };
    }
  }, [themeMode]);

  const toggleTheme = () => {
    if (themeMode === 'auto') setThemeMode('dark');
    else if (themeMode === 'dark') setThemeMode('light');
    else setThemeMode('light'); // Changed to toggle auto -> dark -> light -> auto but let's just make toggle cycle
  };

  const cycleTheme = () => {
    const modes = ['auto', 'dark', 'light'];
    const idx = modes.indexOf(themeMode);
    setThemeMode(modes[(idx + 1) % modes.length]);
  };

  return (
    <ThemeContext.Provider value={{ dark, themeMode, setThemeMode, toggleTheme: cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
