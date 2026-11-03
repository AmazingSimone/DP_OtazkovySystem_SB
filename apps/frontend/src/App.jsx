import { CssBaseline, ThemeProvider } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { ThemeModeContext } from './contexts/ThemeModeContext';
import { router } from './Router';
import getTheme from './theme';

function App() {
  const [mode, setMode] = useState(() => {
    // Get saved theme mode from localStorage or default to 'light'
    return localStorage.getItem('themeMode') || 'light';
  });

  useEffect(() => {
    // Save theme mode to localStorage whenever it changes
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  const theme = useMemo(() => getTheme(mode), [mode]);

  const toggleThemeMode = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeModeContext.Provider value={{ mode, toggleThemeMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}

export default App;
