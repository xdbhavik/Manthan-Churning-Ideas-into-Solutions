import confetti from 'canvas-confetti';

/**
 * Triggers a celebratory particle burst in the institutional Indian tricolor palette
 * with a tasteful animated checkmark overlay pill.
 * Duration: ~1.8 seconds.
 */
export function triggerTricolorConfetti(message?: string) {
  // Check prefers-reduced-motion
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  // 1. Tasteful animated checkmark pill overlay
  if (typeof document !== 'undefined') {
    const existing = document.getElementById('portal-celebration-pill');
    if (!existing) {
      const banner = document.createElement('div');
      banner.id = 'portal-celebration-pill';
      banner.style.cssText = `
        position: fixed;
        top: 20%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.85);
        background: rgba(255, 255, 255, 0.98);
        backdrop-filter: blur(16px);
        border: 1px solid #E2E8F0;
        box-shadow: 0 20px 45px -10px rgba(10, 37, 64, 0.22), 0 0 0 1px rgba(19, 136, 8, 0.2);
        border-radius: 9999px;
        padding: 12px 28px;
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 99999;
        opacity: 0;
        transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        pointer-events: none;
      `;
      banner.innerHTML = `
        <div style="width: 34px; height: 34px; border-radius: 50%; background: #ECFDF5; border: 2px solid #10B981; display: flex; align-items: center; justify-content: center; color: #059669; font-size: 20px; font-weight: bold; flex-shrink: 0; box-shadow: 0 2px 6px rgba(16, 185, 129, 0.2);">
          ✓
        </div>
        <div style="display: flex; flex-direction: column;">
          <span style="font-family: 'IBM Plex Sans', -apple-system, sans-serif; font-weight: 700; font-size: 14px; color: #0A2540; line-height: 1.2;">
            ${message || 'Action Approved & Recorded'}
          </span>
          <span style="font-size: 10px; font-weight: 700; color: #138808; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 2px;">
            National Innovation Portal
          </span>
        </div>
      `;
      document.body.appendChild(banner);
      requestAnimationFrame(() => {
        banner.style.opacity = '1';
        banner.style.transform = 'translate(-50%, -50%) scale(1)';
      });
      setTimeout(() => {
        banner.style.opacity = '0';
        banner.style.transform = 'translate(-50%, -50%) scale(0.92)';
        setTimeout(() => banner.remove(), 400);
      }, 2400);
    }
  }

  // 2. Dual-corner tricolor particle burst
  const colors = ['#FF9933', '#FFFFFF', '#138808', '#0A2540', '#FFAE5C'];
  const end = Date.now() + 1500;

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors,
      zIndex: 9999,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors,
      zIndex: 9999,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };

  frame();
}
