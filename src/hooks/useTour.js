import { useState, useEffect } from 'react';

/**
 * Pops a screen tour the first time the user lands on a screen.
 * Returns { open, run, close } — the screen mounts <Tour open={open} ...>
 * and Settings can call run() to replay manually.
 */
export const useTour = (tourId, store) => {
  const seen = !!store.tutorialState?.[tourId];
  const [open, setOpen] = useState(false);

  // On first ever visit (after onboarding done), auto-launch.
  // Re-check `seen` DENTRO il setTimeout: protezione race se durante i 600ms
  // l'utente (o un'altra tab via storage event) marca il tour come visto.
  useEffect(() => {
    if (!store.booted) return;
    if (seen) return;
    const t = setTimeout(() => {
      // Anti-race: leggi lo state corrente al momento del fire, non quello
      // catturato 600ms fa nella closure.
      if (store.tutorialState?.[tourId]) return;
      setOpen(true);
    }, 600);
    return () => clearTimeout(t);
  }, [store.booted, seen, tourId]);

  const close = (reason) => {
    setOpen(false);
    if (reason === 'done' || reason === 'skip') {
      store.markTutorialSeen(tourId);
    }
  };
  const run = () => setOpen(true);

  return { open, run, close };
};
