import { useEffect } from 'react';
import { applyTheme } from '../data/themes.js';

export const useTheme = (themeId, mode = 'dark') => {
  useEffect(() => {
    applyTheme(themeId, mode);
  }, [themeId, mode]);
};
