export const haptic = (type = 'light') => {
  if (!('vibrate' in navigator)) return;
  const patterns = {
    light: 10,
    medium: 15,
    heavy: 25,
    success: [10, 40, 10],
    warning: [15, 80, 15],
    error: [30, 50, 30],
    milestone: [20, 30, 20, 30, 40],
  };
  try { navigator.vibrate(patterns[type] || 10); } catch (e) {}
};
