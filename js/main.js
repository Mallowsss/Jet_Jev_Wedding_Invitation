/* ===================================================
   WEDDING LOADING SCREEN — main.js
   =================================================== */

let appState = 'loading';

const screens = {
  loading:  document.getElementById('screen-loading'),
  envelope: document.getElementById('screen-envelope'),
};

function transitionTo(next) {
  screens[appState].classList.remove('screen-active');
  appState = next;
  screens[next].classList.add('screen-active');
}

/* ── SCREEN 1: falling sparkles ── */
function createLoadingSparkles() {
  const container = document.getElementById('loading-sparkles');
  const W = window.innerWidth;
  const H = window.innerHeight;

  for (let i = 0; i < 20; i++) {
    const el = document.createElement('div');
    el.className = 'sparkle-particle';
    const x = Math.random() * W;
    const delay = Math.random() * 5;
    const duration = Math.random() * 10 + 10;
    el.style.cssText = `left:${x}px;top:-20px;--fall-dist:${H + 40}px;animation-duration:${duration}s;animation-delay:${delay}s;`;
    el.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z" fill="rgba(255,255,255,0.4)"/>
      <path d="M19 15l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" fill="rgba(255,255,255,0.3)"/>
      <path d="M5 3l.7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7z" fill="rgba(255,255,255,0.25)"/>
    </svg>`;
    container.appendChild(el);
  }
}

/* ── SCREEN 2: pulsing sparkles ── */
function createEnvelopeSparkles() {
  const container = document.getElementById('envelope-sparkles');
  const W = window.innerWidth;
  const H = window.innerHeight;

  for (let i = 0; i < 30; i++) {
    const el = document.createElement('div');
    el.className = 'sparkle-pulse';
    el.style.cssText = `left:${Math.random()*W}px;top:${Math.random()*H}px;animation-duration:${Math.random()*3+2}s;animation-delay:${Math.random()*5}s;`;
    el.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none">
      <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z" fill="rgba(255,255,255,0.6)"/>
      <path d="M19 15l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" fill="rgba(255,255,255,0.45)"/>
    </svg>`;
    container.appendChild(el);
  }
}

/* ── SCREEN 2: floating hearts ── */
function createFloatingHeartsRing() {
  const ring = document.getElementById('floating-hearts-ring');
  const W = window.innerWidth;
  const H = window.innerHeight;

  const positions = [];
  const safeCX = W * 0.5;
  const safeCY = H * 0.5;
  const safeW  = W * 0.52;
  const safeH  = H * 0.62;

  let attempts = 0;
  while (positions.length < 8 && attempts < 200) {
    attempts++;
    const x = Math.random() * W;
    const y = Math.random() * H;
    const inSafe = Math.abs(x - safeCX) < safeW && Math.abs(y - safeCY) < safeH;
    if (!inSafe) positions.push({ x, y });
  }

  positions.forEach((pos, i) => {
    const el = document.createElement('div');
    el.className = 'float-heart';
    const delay    = i * 0.35;
    const duration = 2.8 + Math.random() * 1.5;
    el.style.cssText = `left:${pos.x}px;top:${pos.y}px;animation-duration:${duration}s;animation-delay:${delay}s;`;
    el.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        fill="rgba(255,255,255,0.3)" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"/>
    </svg>`;
    ring.appendChild(el);
  });
}

/* ── Handle "Open Invitation" → navigate directly to main wedding site ── */
function handleOpenEnvelope() {
  // Forward the invite token so main.html can also validate it
  const params = new URLSearchParams(window.location.search);
  const token  = params.get('invite');
  window.location.href = token ? 'main.html?invite=' + encodeURIComponent(token) : 'main.html';
}

/* ── Init ── */
function init() {
  screens.loading.classList.add('screen-active');
  createLoadingSparkles();
  createEnvelopeSparkles();
  createFloatingHeartsRing();

  setTimeout(() => { transitionTo('envelope'); }, 4000);
}

document.addEventListener('DOMContentLoaded', init);
