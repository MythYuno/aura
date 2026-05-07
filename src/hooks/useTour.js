import { useState, useEffect } from 'react';

/**
 * Pops a screen tour the first time the user lands on a screen.
 * Returns { open, run, close } — the screen mounts <Tour open={open} ...>
 * and Settings can call run() to replay manually.
 */
export const useTour = (tourId, store) => {
  const seen = !!store.tutorialState?.[tourId];
  const [open, setOpen] = useState(false);

  // On first ever visit (after onboarding done), auto-launch
  useEffect(() => {
    if (!store.booted) return;
    if (seen) return;
    // Small delay so screen has time to render and data-tut elements exist
    const t = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(t);
  }, [store.booted, seen]);

  const close = (reason) => {
    setOpen(false);
    if (reason === 'done' || reason === 'skip') {
      store.markTutorialSeen(tourId);
    }
  };
  const run = () => setOpen(true);

  return { open, run, close };
};
