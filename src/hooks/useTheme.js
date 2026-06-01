import { useEffect, useRef } from 'react';
import { applyTheme } from '../data/themes.js';

/**
 * Hook tema (light/dark, accent applicato runtime).
 *
 * v0.8.1: dopo il primo paint, aggiungiamo la classe `theme-anim` su <html>
 * così le successive transizioni light/dark sono morbide (CSS transition
 * sul body bg/color). Il primo paint NON deve animare — altrimenti vedi
 * il bg navy fadarsi in light all'avvio se l'utente è in light mode.
 */
export const useTheme = (themeId, mode = 'dark') => {
  const isFirstRunRef = useRef(true);
  useEffect(() => {
    applyTheme(themeId, mode);
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
      // Defer di un frame così il primo paint avviene senza transition,
      // poi attivo l'animazione per i cambi futuri.
      requestAnimationFrame(() => {
        document.documentElement.classList.add('theme-anim');
      });
    }
  }, [themeId, mode]);
};
