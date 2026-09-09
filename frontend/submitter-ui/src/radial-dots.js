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

  // Inject CSS to handle z-indexing robustly for current and future children
  if (!document.getElementById('radial-dots-style')) {
    const style = document.createElement('style');
    style.id = 'radial-dots-style';
    style.textContent = `
      ${selector} {
        position: relative;
        overflow: hidden;
      }
      ${selector} > * {
        position: relative;
        z-index: 1;
      }
      ${selector} > canvas.radial-canvas,
      ${selector} > div.radial-vignette {
        position: absolute !important;
        inset: 0 !important;
        width: 100% !important;
        height: 100% !important;
        z-index: 0 !important;
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  cards.forEach(card => {

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.className = 'radial-canvas';

    // Put canvas as first child
    card.insertBefore(canvas, card.firstChild);
    
    // Vignette
    const vignette = document.createElement('div');
    vignette.className = 'radial-vignette';
    vignette.style.background = 'radial-gradient(ellipse at center, rgba(255,255,255,0) 40%, rgba(255, 255, 255, 0.8) 85%, rgba(255,255,255,1) 100%)';
    card.insertBefore(vignette, canvas.nextSibling);

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
      const rect = card.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
         requestAnimationFrame(render);
         return;
      }
      
      // Attempt to resize if it was previously hidden and size was 0
      if (width !== rect.width || height !== rect.height) {
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
