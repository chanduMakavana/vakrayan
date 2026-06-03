let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play a physical, mechanical tick sound (triggered on segment change on the wheel)
 */
export function playTick() {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    // Quick sweep down for a snappy click/tick
    osc.frequency.setValueAtTime(450, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.04);
    
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.05);
  } catch (e) {
    console.warn("Audio Context playback failed:", e);
  }
}

/**
 * Play a crisp sweep sound (triggered when adding to cart)
 */
export function playZip() {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(650, ctx.currentTime + 0.15);
    
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.16);
  } catch (e) {
    console.warn("Audio Context playback failed:", e);
  }
}

/**
 * Play a high-pitched, sparkling arpeggio chime (triggered when landing on a discount code)
 */
export function playWinChime() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 arpeggio
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      
      gain.gain.setValueAtTime(0.08, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.25);
      
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.3);
    });
  } catch (e) {
    console.warn("Audio Context playback failed:", e);
  }
}

/**
 * Play a rich, multi-oscillator chord progression (triggered on payment success)
 */
export function playSuccessChime() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const chord = [261.63, 329.63, 392.00, 523.25, 659.25]; // C4, E4, G4, C5, E5 chord
    chord.forEach((freq, idx) => {
      // Create detuned pair for a lush chorus sound
      [0, 1.5].forEach((detune) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq + detune, now);
        
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.linearRampToValueAtTime(0.025, now + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2 + idx * 0.06);
        
        osc.start(now);
        osc.stop(now + 1.4 + idx * 0.06);
      });
    });
  } catch (e) {
    console.warn("Audio Context playback failed:", e);
  }
}

/**
 * Physics-driven HTML5 Canvas Confetti explosion system
 * @param {HTMLCanvasElement} canvas The canvas element to render particles onto
 */
export function triggerConfetti(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const colors = [
    '#6366f1', // Electric Indigo
    '#e11d48', // Crimson
    '#10b981', // Emerald
    '#f59e0b', // Gold
    '#0ea5e9', // Sky Blue
    '#111111'  // Minimalist Slate
  ];

  const particles = [];
  const particleCount = 100;

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: rect.width / 2,
      y: rect.height + 10, // Burst up from the bottom center
      vx: (Math.random() - 0.5) * 16,
      vy: -Math.random() * 18 - 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 5 + 5,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 8,
      opacity: 1,
      shape: Math.random() > 0.45 ? 'rect' : 'circle',
      drag: 0.95,
      gravity: 0.4
    });
  }

  let animationFrameId = null;

  function update() {
    ctx.clearRect(0, 0, rect.width, rect.height);
    let active = false;

    particles.forEach(p => {
      p.vx *= p.drag;
      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;

      if (p.vy > 0) {
        p.opacity -= 0.016; // Fade out slowly as they fall
      }

      if (p.opacity > 0 && p.y < rect.height + 20 && p.x > -20 && p.x < rect.width + 20) {
        active = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, 2 * Math.PI);
          ctx.fill();
        }
        ctx.restore();
      }
    });

    if (active) {
      animationFrameId = requestAnimationFrame(update);
    } else {
      ctx.clearRect(0, 0, rect.width, rect.height);
      cancelAnimationFrame(animationFrameId);
    }
  }

  update();
}
