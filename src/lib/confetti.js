const COLORS = ['#BEF264', '#67E8F9', '#F0ABFC', '#FDE047', '#D8B4FE', '#FCA5A5'];

export const launchConfetti = (container, count = 40) => {
  if (!container) return;
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    piece.style.cssText = `
      position: absolute;
      width: ${6 + Math.random() * 6}px;
      height: ${6 + Math.random() * 6}px;
      pointer-events: none;
      left: ${Math.random() * 100}%;
      top: 0;
      background: ${COLORS[Math.floor(Math.random() * COLORS.length)]};
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      animation: confettiFall 2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      animation-delay: ${Math.random() * 0.3}s;
      transform: rotate(${Math.random() * 360}deg);
    `;
    container.appendChild(piece);
    setTimeout(() => piece.remove(), 2500);
  }
};

// Register keyframe once
if (typeof document !== 'undefined' && !document.getElementById('confetti-kf')) {
  const style = document.createElement('style');
  style.id = 'confetti-kf';
  style.textContent = `
    @keyframes confettiFall {
      0% { transform: translateY(-20px) rotate(0); opacity: 1; }
      100% { transform: translateY(500px) rotate(720deg); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}
