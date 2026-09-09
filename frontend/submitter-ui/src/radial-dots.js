export function initRadialDots(selector = '.bg-surface-crisp.rounded-xl') {
  const cards = document.querySelectorAll(selector);

  // Grid configuration
  const DOT_SPACING = 28;     // Distance between dots in pixels
  const BASE_RADIUS = 0.7;    // Fine, understated resting dots
  const MAX_RADIUS = 2.25;    // Clearly visible pulse without becoming bulky
  const WAVE_SPEED = 2.4;     // Speed of the radial ripple
  const WAVE_FREQUENCY = 0.015; // Frequency of the waves
  const mouseRadius = 160;

  function noise(x, y, salt = 0) {
    const value = Math.sin(x * 127.1 + y * 311.7 + salt * 74.7) * 43758.5453123;
    return value - Math.floor(value);
  }

  cards.forEach(card => {
    // Add relative positioning if not present
    if (getComputedStyle(card).position === 'static') {
      card.style.position = 'relative';
    }
    card.style.overflow = 'hidden';

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '0';
    canvas.style.pointerEvents = 'none';

    // Put canvas as first child
    card.insertBefore(canvas, card.firstChild);
    
    // Vignette
    const vignette = document.createElement('div');
    vignette.style.position = 'absolute';
    vignette.style.inset = '0';
    vignette.style.zIndex = '0';
    vignette.style.pointerEvents = 'none';
    vignette.style.background = 'radial-gradient(ellipse at center, transparent 40%, rgba(255, 255, 255, 0.8) 85%, transparent 100%)';
    card.insertBefore(vignette, canvas.nextSibling);

    // Make sure other children have higher z-index
    Array.from(card.children).forEach(child => {
      if (child !== canvas && child !== vignette) {
        if (getComputedStyle(child).position === 'static') {
          child.style.position = 'relative';
        }
        if (!child.style.zIndex || parseInt(child.style.zIndex) < 1) {
          child.style.zIndex = '1';
        }
      }
    });

    const ctx = canvas.getContext('2d');
    let width, height;
    let dpr = window.devicePixelRatio || 1;
    let mouse = { x: -9999, y: -9999 };

    function resize() {
      const rect = card.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      if (width === 0 || height === 0) return; // Hidden elements
      dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    if (window.ResizeObserver) {
      const resizeObserver = new ResizeObserver(() => resize());
      resizeObserver.observe(card);
    } else {
      window.addEventListener("resize", resize);
    }

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    });

    card.addEventListener('mouseleave', () => {
      mouse.x = -9999;
      mouse.y = -9999;
    });

    resize();

    function render(currentTime) {
      if (!card.offsetParent) {
         requestAnimationFrame(render);
         return;
      }
      
      // Attempt to resize if it was previously hidden and size was 0
      if (width === 0 || height === 0) {
        resize();
      }

      const time = currentTime * 0.001;
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      const cols = Math.ceil(width / DOT_SPACING);
      const rows = Math.ceil(height / DOT_SPACING);
      const offsetX = (width % DOT_SPACING) / 2;
      const offsetY = (height % DOT_SPACING) / 2;

      for (let i = 0; i <= cols; i++) {
        for (let j = 0; j <= rows; j++) {
          const x = offsetX + i * DOT_SPACING;
          const y = offsetY + j * DOT_SPACING;

          const distCenter = Math.hypot(x - centerX, y - centerY);

          const phaseJitter = (noise(i, j, 1) - 0.5) * 1.15;
          const amplitude = 0.72 + noise(i, j, 2) * 0.28;
          const drift = Math.sin(time * 0.55 + noise(i, j, 3) * Math.PI * 2) * 0.18;
          const wave = Math.sin(distCenter * WAVE_FREQUENCY - time * WAVE_SPEED + phaseJitter + drift);
          let intensity = Math.pow(Math.max(0, (wave + 1) / 2) * amplitude, 3.2);

          const distMouse = Math.hypot(x - mouse.x, y - mouse.y);
          if (distMouse < mouseRadius) {
            const mouseBoost = Math.pow(1 - distMouse / mouseRadius, 2);
            intensity = Math.min(1, intensity + mouseBoost * 0.85);
          }

          const radius = BASE_RADIUS + intensity * (MAX_RADIUS - BASE_RADIUS);
          const alpha = 0.2 + intensity * 0.76;

          ctx.beginPath();
          const angle = Math.atan2(y - centerY, x - centerX);
          const length = radius * (1.15 + intensity * 0.55);
          const halfWidth = Math.max(0.38, radius * 0.42);
          ctx.ellipse(x, y, length, halfWidth, angle, 0, Math.PI * 2);

          if (intensity > 0.38) {
            ctx.shadowColor = "rgba(14, 165, 233, 0.85)";
            ctx.shadowBlur = 4 + (intensity - 0.38) * 20;
            ctx.fillStyle = `rgba(3, 105, 161, ${alpha})`;
          } else {
            ctx.shadowBlur = 0;
            ctx.fillStyle = `rgba(29, 78, 216, ${alpha})`;
          }

          ctx.fill();
        }
      }

      requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
  });
}
