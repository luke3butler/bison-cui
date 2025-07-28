import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../services/api';
import type { Preferences, Theme } from '../types';
import { COLLAPSE_MODE_VALUES, type CollapseMode } from '../constants/collapse-modes';
import { getToolDefaultCollapsed } from '../utils/tool-collapse';

interface PreferencesContextType {
  preferences: Preferences | null;
  theme: Theme;
  updatePreferences: (updates: Partial<Preferences>) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
  // Tool collapse functionality
  toolCollapseMode: CollapseMode;
  setToolCollapseMode: (mode: CollapseMode) => void;
  getToolDefaultCollapsed: (toolName: string) => boolean;
}

const THEME_KEY = 'cui-theme';
const TOOL_COLLAPSE_KEY = 'cui-tool-collapse-settings';


const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Local tool collapse mode state (client-only, localStorage)
  const [toolCollapseMode, setToolCollapseModeState] = useState<CollapseMode>(() => {
    const stored = localStorage.getItem(TOOL_COLLAPSE_KEY);
    return (stored && COLLAPSE_MODE_VALUES.includes(stored as CollapseMode)) 
      ? stored as CollapseMode 
      : 'expanded';
  });

  const getSystemTheme = (): 'light' | 'dark' => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem(THEME_KEY);
    const colorScheme = (stored === 'light' || stored === 'dark' || stored === 'system') ? stored : 'system';
    const mode = colorScheme === 'system' ? getSystemTheme() : colorScheme;
    return { mode, colorScheme, toggle: () => {} };
  });

  // Load preferences once on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        setIsLoading(true);
        const prefs = await api.getPreferences();
        setPreferences(prefs);
        
        const mode = prefs.colorScheme === 'system' ? getSystemTheme() : prefs.colorScheme;
        setTheme(prev => ({ ...prev, colorScheme: prefs.colorScheme, mode }));
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load preferences'));
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, []);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme.mode);
    localStorage.setItem(THEME_KEY, theme.colorScheme);
  }, [theme.mode, theme.colorScheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme.colorScheme !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setTheme(prev => ({ ...prev, mode: e.matches ? 'dark' : 'light' }));
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme.colorScheme]);

  // Persist tool collapse mode to localStorage
  useEffect(() => {
    localStorage.setItem(TOOL_COLLAPSE_KEY, toolCollapseMode);
  }, [toolCollapseMode]);

  const updatePreferences = useCallback(async (updates: Partial<Preferences>) => {
    try {
      const updatedPrefs = await api.updatePreferences(updates);
      setPreferences(updatedPrefs);
      
      if (updates.colorScheme) {
        const mode = updates.colorScheme === 'system' ? getSystemTheme() : updates.colorScheme;
        setTheme(prev => ({ ...prev, colorScheme: updates.colorScheme!, mode }));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update preferences'));
      throw err;
    }
  }, []);

  const toggle = useCallback(async () => {
    // Cycle through: light -> dark -> system -> light
    let newColorScheme: 'light' | 'dark' | 'system';
    if (theme.colorScheme === 'light') {
      newColorScheme = 'dark';
    } else if (theme.colorScheme === 'dark') {
      newColorScheme = 'system';
    } else {
      newColorScheme = 'light';
    }
    
    await updatePreferences({ colorScheme: newColorScheme });
  }, [theme.colorScheme, updatePreferences]);

  // Tool collapse functionality
  const setToolCollapseMode = useCallback((mode: CollapseMode) => {
    setToolCollapseModeState(mode);
  }, []);

  const getToolDefaultCollapsedCallback = useCallback((toolName: string): boolean => {
    return getToolDefaultCollapsed(toolCollapseMode, toolName);
  }, [toolCollapseMode]);

  const themeWithToggle: Theme = {
    ...theme,
    toggle
  };

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    preferences, 
    theme: themeWithToggle, 
    updatePreferences, 
    isLoading, 
    error,
    // Tool collapse functionality
    toolCollapseMode,
    setToolCollapseMode,
    getToolDefaultCollapsed: getToolDefaultCollapsedCallback
  }), [preferences, themeWithToggle, updatePreferences, isLoading, error, toolCollapseMode, setToolCollapseMode, getToolDefaultCollapsedCallback]);

  return (
    <PreferencesContext.Provider value={contextValue}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferencesContext() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferencesContext must be used within a PreferencesProvider');
  }
  return context;
}