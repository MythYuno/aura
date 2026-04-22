import { useEffect } from 'react';
import { applyTheme } from '../data/themes.js';

export const useTheme = (themeId) => {
  useEffect(() => {
    applyTheme(themeId);
  }, [themeId]);
};
