/* =============================================
   JET & JEV WEDDING — script.js
   Original RSVP + SendGrid logic fully preserved.
   Fixed: Google Maps syntax, scroll performance, and element safeguards.
   ============================================= */

// ═══════════════════════════════════════════════════════════════
//  INVITATION TOKEN — validate on page load
// ═══════════════════════════════════════════════════════════════

/** The token from ?invite=<token> in the URL. */
let _inviteToken = null;

/**
 * Returns true when the site is being accessed locally (dev/host preview)
 * OR when ?host=true is in the URL (for editing on the live server).
 * In both cases token validation is skipped so the host can browse freely.
 */
function _isHostAccess() {
  const hostname = window.location.hostname;
  const isLocal  = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '';
  const params   = new URLSearchParams(window.location.search);
  return isLocal || params.get('host') === 'true';
}

(async function validateInviteToken() {
  // ── HOST / DEV BYPASS ────────────────────────────────────────────────────
  if (_isHostAccess()) {
    console.log('🔓 Host/dev access — token check skipped.');
    return;
  }
  // ────────────────────────────────────────────────────────────────────────

  const params = new URLSearchParams(window.location.search);
  const token  = params.get('invite');

  if (!token) {
    _showLockedPage('no_token');
    return;
  }

  try {
    const res  = await fetch(`/api/validate-token?invite=${encodeURIComponent(token)}`);
    const data = await res.json();

    if (!res.ok || !data.valid) {
      _showLockedPage(data.reason || 'invalid_token');
      return;
    }

    // Valid token — store it for RSVP submission
    _inviteToken = token;

    // Personalise the greeting if a welcome element exists
    const greetEl = document.getElementById('inviteGuestName');
    if (greetEl && data.name) {
      greetEl.textContent = data.name.split(' ')[0];
      greetEl.closest('[id^="inviteGreeting"]')?.classList.remove('hidden');
    }

  } catch (err) {
    console.error('Token validation error:', err);
    _showLockedPage('network_error');
  }
})();

function _showLockedPage(reason) {
  function _applyLock() {
    document.querySelectorAll('body > *:not(#inviteLockScreen)').forEach(el => {
      el.style.display = 'none';
    });

    let lock = document.getElementById('inviteLockScreen');
    if (!lock) {
      lock = document.createElement('div');
      lock.id = 'inviteLockScreen';
      lock.innerHTML = _lockScreenHTML(reason);
      document.body.appendChild(lock);
    } else {
      lock.style.display = '';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _applyLock);
  } else {
    _applyLock();
  }
}

function _lockScreenHTML(reason) {
  const messages = {
    no_token:      { title: 'Invitation Required', body: 'This wedding site is only accessible through a personal invitation link. If you received one, please use the link from your invitation.' },
    invalid_token: { title: 'Invalid Invitation',  body: 'This invitation link is not valid. Please check the link you received, or contact the couple if you believe this is an error.' },
    network_error: { title: 'Connection Error',    body: 'We couldn\'t verify your invitation. Please check your internet connection and refresh the page.' },
  };
  const { title, body } = messages[reason] || messages['invalid_token'];

  return `
<div style="
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  background:linear-gradient(135deg,#667686 0%,#97adc2 100%);
  font-family:'Inter',Arial,sans-serif;
  padding:24px;
">
  <div style="
    background:#fff;
    border-radius:20px;
    padding:48px 40px;
    max-width:420px;
    width:100%;
    text-align:center;
    box-shadow:0 20px 60px rgba(0,0,0,0.15);
  ">
    <div style="font-size:48px;margin-bottom:20px;">💌</div>
    <h1 style="
      font-family:Georgia,serif;
      color:#667686;
      font-size:24px;
      margin:0 0 16px;
    ">${title}</h1>
    <p style="
      color:#878787;
      font-size:15px;
      line-height:1.7;
      margin:0 0 32px;
    ">${body}</p>
    <div style="
      border-top:1px solid #f0f0f0;
      padding-top:24px;
      font-size:13px;
      color:#aaa;
      font-style:italic;
    ">Jet & Jev · June 29, 2026</div>
  </div>
</div>`;
}

// -----------------------------------------------
// MUSIC CONTROL
// -----------------------------------------------
let isPlaying = false;
 
function _syncMusicUI() {
  const btn = document.getElementById('musicBtn');
  const soundWaves = document.getElementById('soundWaves');
  if (!btn) return;
  if (isPlaying) {
    btn.setAttribute('aria-label', 'Pause music');
    if (soundWaves) soundWaves.style.display = 'block';
    btn.classList.add('playing'); // Toggles a class in case your CSS uses it
  } else {
    btn.setAttribute('aria-label', 'Play music');
    if (soundWaves) soundWaves.style.display = 'none';
    btn.classList.remove('playing');
  }
}
 
function startMusicIfNeeded() {
  const bgMusic = document.getElementById('bgMusic');
  if (isPlaying || !bgMusic) return;
  bgMusic.play()
    .then(() => { 
      isPlaying = true;  
      _syncMusicUI(); 
    })
    .catch(() => { 
      isPlaying = false; 
      _syncMusicUI(); 
    });
}
 
window.toggleMusic = function() {
  const bgMusic = document.getElementById('bgMusic');
  if (!bgMusic) return;

  if (isPlaying) {
    bgMusic.pause();
    isPlaying = false;
    _syncMusicUI();
  } else {
    // Fixed: Wrapping play inside a promise sequence so state stays 
    // accurate even if the browser blocks execution initially.
    bgMusic.play()
      .then(() => {
        isPlaying = true;
        _syncMusicUI();
      })
      .catch((err) => {
        console.warn("Playback prevented by browser policy:", err);
        isPlaying = false;
        _syncMusicUI();
      });
  }
};
 
// Initial automatic attempt after a brief loading buffer
setTimeout(startMusicIfNeeded, 800);
 
// Safe triggers to catch modern browser autoplay bypass rules
window.addEventListener('scroll', function _onScrollPlay() {
  startMusicIfNeeded();
  window.removeEventListener('scroll', _onScrollPlay);
}, { passive: true });
 
document.addEventListener('click', function _onClickPlay() {
  startMusicIfNeeded();
  document.removeEventListener('click', _onClickPlay);
}, { once: true });
 
document.addEventListener('mouseover', function _onHoverPlay() {
  startMusicIfNeeded();
  document.removeEventListener('mouseover', _onHoverPlay);
}, { once: true });

// -----------------------------------------------
// COUNTDOWN TIMER
// -----------------------------------------------
const targetDate = new Date('2026-06-29T00:00:00').getTime();

function updateCountdown() {
  const now        = new Date().getTime();
  const difference = targetDate - now;
  if (difference > 0) {
    renderDigits('days',    Math.floor(difference / (1000 * 60 * 60 * 24)), 3);
    renderDigits('hours',   Math.floor((difference / (1000 * 60 * 60)) % 24), 2);
    renderDigits('minutes', Math.floor((difference / 1000 / 60) % 60), 2);
    renderDigits('seconds', Math.floor((difference / 1000) % 60), 2);
  }
}

function renderDigits(id, value, length) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = String(value).padStart(length, '0').split('')
    .map(d => `<div class="flip-digit">${d}</div>`).join('');
}

updateCountdown();
setInterval(updateCountdown, 1000);

// -----------------------------------------------
// CALENDAR
// -----------------------------------------------
function generateCalendar() {
  const calendar    = document.getElementById('calendar');
  if (!calendar) return;
  const daysOfWeek  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const firstDay    = 1; // June 1 2026 = Monday
  const daysInMonth = 30;
  const weddingDay  = 29;

  calendar.innerHTML = ''; // Clear prior entries if any

  daysOfWeek.forEach(day => {
    const h = document.createElement('div');
    h.className = 'calendar-day-header';
    h.textContent = day;
    calendar.appendChild(h);
  });

  for (let i = 0; i < firstDay; i++) {
    const e = document.createElement('div');
    e.className = 'calendar-day empty';
    calendar.appendChild(e);
  }

  for (let i = 1; i <= daysInMonth; i++) {
    const d = document.createElement('div');
    d.className = i === weddingDay ? 'calendar-day wedding' : 'calendar-day normal';
    d.textContent = i;
    calendar.appendChild(d);
  }
}

generateCalendar();

// -----------------------------------------------
// RSVP STATE
// -----------------------------------------------
let selectedAttendance = '';

window.scrollToRsvp = function() {
  document.getElementById('rsvp')?.scrollIntoView({ behavior: 'smooth' });
};

window.showAttendanceType = function() {
  hide('rsvpInitial');
  show('rsvpAttendanceType');
};

window.selectAttendance = function(type) {
  selectedAttendance = type;
  const label = document.getElementById('attendanceTypeLabel');
  if (label) {
    label.textContent = type === 'in-person'
      ? '🏛️ Attending in-person at the venue'
      : '💻 Joining via Zoom';
  }
  hide('rsvpAttendanceType');
  show('rsvpForm');
};

window.goBackToAttendance = function() {
  hide('rsvpForm');
  show('rsvpAttendanceType');
};

window.showDecline = function() {
  hide('rsvpInitial');
  show('rsvpDecline');
};

window.resetRsvp = function() {
  selectedAttendance = '';
  ['rsvpAttendanceType','rsvpForm','rsvpDecline','rsvpSuccess','rsvpNotListed'].forEach(hide);
  const nameEl   = document.getElementById('fullName');
  const emailEl  = document.getElementById('email');
  const submitEl = document.getElementById('submitBtn');
  if (nameEl)   nameEl.value    = '';
  if (emailEl)  emailEl.value   = '';
  if (submitEl) { submitEl.disabled = false; submitEl.textContent = 'Submit RSVP ✓'; }
  show('rsvpInitial');
};

// -----------------------------------------------
// RSVP FORM SUBMISSION
// -----------------------------------------------
window.submitRsvp = async function(event) {
  console.log("🚀🚀🚀 submitRsvp FUNCTION CALLED 🚀🚀🚀");
  event.preventDefault();

  const nameEl  = document.getElementById('fullName');
  const emailEl = document.getElementById('email');
  const btn     = document.getElementById('submitBtn');

  const name       = nameEl ? nameEl.value.trim() : '';
  const email      = emailEl ? emailEl.value.trim() : '';
  const attendance = selectedAttendance;

  console.log('=== FRONTEND: Form submitted ===');
  console.log('Name:', name);
  console.log('Email:', email);
  console.log('Attendance:', attendance);

  if (!name || !email || !attendance) return;

  if (!_inviteToken) {
    showToast('Your invitation link is required to RSVP. Please use your personal link.');
    return;
  }

  if (btn) {
    btn.disabled    = true;
    btn.textContent = 'Sending… ✉️';
  }

  try {
    const res = await fetch('/api/rsvp', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, email, attendance, inviteToken: _inviteToken }),
    });

    const data = await res.json();
    console.log('Data:', data);

    if (res.ok && data.success) {
      if (data.onList) {
        const tableEl = document.getElementById('confirmedTable');
        if (tableEl) {
          tableEl.textContent = data.table ? `Table ${data.table}` : 'Details coming soon';
        }
        hide('rsvpForm');
        show('rsvpSuccess');
        showToast(`Welcome, ${name.split(' ')[0]}! Check your email for confirmation. 💙`);
      } else {
        hide('rsvpForm');
        show('rsvpNotListed');
      }
      setTimeout(window.resetRsvp, 8000);
    } else {
      showToast('Something went wrong. Please try again.');
      if (btn) { btn.disabled = false; btn.textContent = 'Submit RSVP ✓'; }
    }

  } catch (err) {
    console.error('=== FRONTEND: ERROR ===', err.message);
    showToast('Network error. Please check your connection and try again.');
    if (btn) { btn.disabled = false; btn.textContent = 'Submit RSVP ✓'; }
  }
};

// -----------------------------------------------
// TOAST
// -----------------------------------------------
function showToast(message) {
  const toast  = document.getElementById('toast');
  const msgEl  = document.getElementById('toastMessage');
  if (!toast || !msgEl) return;
  msgEl.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 5000);
}

// -----------------------------------------------
// GOOGLE MAPS
// -----------------------------------------------
window.openMaps = function() {
  const address = encodeURIComponent('City Garden Suites, 1158 A. Mabini Street, Ermita, Manila');
  window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank');
};

// -----------------------------------------------
// HELPERS
// -----------------------------------------------
function show(id) { const el = document.getElementById(id); if (el) el.classList.remove('hidden'); }
function hide(id) { const el = document.getElementById(id); if (el) el.classList.add('hidden'); }

// -----------------------------------------------
// GLOBAL ERROR HANDLERS
// -----------------------------------------------
window.addEventListener('error', function(e) {
  console.error('💥 GLOBAL ERROR:', e.message, 'at', e.filename, 'line', e.lineno);
});
window.addEventListener('unhandledrejection', function(e) {
  console.error('💥 UNHANDLED PROMISE REJECTION:', e.reason);
});

// ═══════════════════════════════════════════════════════════════
//  MULTI-TAB NAVIGATION
// ═══════════════════════════════════════════════════════════════
const siteNav     = document.getElementById('siteNav');
const hamburger   = document.getElementById('hamburger');
const mobileNav   = document.getElementById('mobileNav');
const navLinkEls = document.querySelectorAll('.nav-links .nav-link');
const mobileLinkEls = document.querySelectorAll('.mobile-link');

let currentTab = 'home';

function updateNavState() {
  if (!siteNav) return;
  const atTop = window.scrollY < 50;
  siteNav.classList.remove('transparent', 'solid', 'frosted');
  if (atTop) {
    siteNav.classList.add(currentTab === 'home' ? 'transparent' : 'frosted');
  } else {
    siteNav.classList.add('solid');
  }
}
window.addEventListener('scroll', updateNavState, { passive: true });

window.showTab = function(tabId) {
  if (tabId === currentTab) {
    if (mobileNav) mobileNav.classList.remove('open');
    return;
  }

  currentTab = tabId;

  // Hide all panels
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.remove('active', 'fade-in');
    p.style.display = 'none';
  });

  // Show target
  const target = document.getElementById('tab-' + tabId);
  if (target) {
    target.style.display = 'block';
    void target.offsetWidth; // force reflow
    target.classList.add('active', 'fade-in');
  }

  // Update active link states + flash underline
  navLinkEls.forEach(l => {
    l.classList.toggle('active', l.dataset.tab === tabId);
    l.classList.remove('active-flash');
  });
  mobileLinkEls.forEach(l => l.classList.toggle('active', l.dataset.tab === tabId));
  
  const clickedLink = document.querySelector('.nav-links .nav-link[data-tab="' + tabId + '"]');
  if (clickedLink) {
    clickedLink.classList.add('active-flash');
    setTimeout(() => clickedLink.classList.remove('active-flash'), 600);
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (mobileNav) mobileNav.classList.remove('open');
  
  const floatingMusicBtn = document.getElementById('musicBtn');
  if (floatingMusicBtn) floatingMusicBtn.classList.remove('hidden-by-menu');

  updateNavState();

  // Reset target view states and re-observe elements
  setTimeout(() => {
    const panel = document.getElementById('tab-' + tabId);
    if (panel) {
      panel.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(el => {
        el.classList.remove('visible');
      });
    }
    observeReveals();
  }, 50);
};

// Attach nav link click handlers
navLinkEls.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    window.showTab(link.dataset.tab);
  });
});

mobileLinkEls.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    window.showTab(link.dataset.tab);
  });
});

if (hamburger) {
  hamburger.addEventListener('click', () => {
    if (!mobileNav) return;
    const isOpen = mobileNav.classList.toggle('open');
    const floatingMusicBtn = document.getElementById('musicBtn');
    if (floatingMusicBtn) {
      floatingMusicBtn.classList.toggle('hidden-by-menu', isOpen);
    }
  });
}

document.addEventListener('click', e => {
  if (!mobileNav || !hamburger) return;
  if (
    mobileNav.classList.contains('open') &&
    !mobileNav.contains(e.target) &&
    !hamburger.contains(e.target)
  ) {
    mobileNav.classList.remove('open');
    const btn = document.getElementById('musicBtn');
    if (btn) btn.classList.remove('hidden-by-menu');
  }
});

// ═══════════════════════════════════════════════════════════════
//  SHARE HASHTAG
// ═══════════════════════════════════════════════════════════════
window.shareHashtag = function() {
  const text = '#VERLYNfoundherTHROlove — Join us for Jet & Jev\'s wedding on June 29, 2026! 💙';
  if (navigator.share) {
    navigator.share({ title: 'Jet & Jev Wedding', text }).catch(() => {});
  } else {
    navigator.clipboard.writeText('#VERLYNfoundherTHROlove').then(() => {
      showToast('Hashtag copied! ✨  #VERLYNfoundherTHROlove');
    }).catch(() => {
      showToast('#VERLYNfoundherTHROlove');
    });
  }
};

// ═══════════════════════════════════════════════════════════════
//  FAQ ACCORDION
// ═══════════════════════════════════════════════════════════════
window.toggleFaq = function(el) {
  const wasActive = el.classList.contains('active');

  document.querySelectorAll('.faq-item').forEach(item => {
    item.classList.remove('active');
    const chevron = item.querySelector('.faq-chevron');
    if (chevron) chevron.classList.remove('up');
  });

  if (!wasActive) {
    el.classList.add('active');
    const chevron = el.querySelector('.faq-chevron');
    if (chevron) chevron.classList.add('up');
  }
};

// ═══════════════════════════════════════════════════════════════
//  SCROLL-REVEAL (IntersectionObserver Optimized)
// ═══════════════════════════════════════════════════════════════
let revealObserver;

function initRevealObserver() {
  let staggerIndex = 0;

  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = staggerIndex * 55;
        staggerIndex++;
        setTimeout(() => entry.target.classList.add('visible'), delay);
        revealObserver.unobserve(entry.target);
      }
    });
    setTimeout(() => { staggerIndex = 0; }, 600);
  }, { threshold: 0.05, rootMargin: '0px 0px -20px 0px' });

  observeReveals();
}

function observeReveals() {
  if (!revealObserver) return;
  document.querySelectorAll('.reveal:not(.visible), .reveal-left:not(.visible), .reveal-right:not(.visible), .reveal-scale:not(.visible)').forEach(el => {
    revealObserver.observe(el);
  });
}

// ═══════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════
(function init() {
  const homePanel = document.getElementById('tab-home');
  if (homePanel) {
    homePanel.style.display = 'block';
    homePanel.classList.add('active');
  }

  updateNavState();
  
  // Set up the intersection observer once on initialization
  initRevealObserver();

  console.log('✅ Script loaded successfully');
})();

// -----------------------------------------------
// RSVP SECTION — parallax constraint
// -----------------------------------------------
document.addEventListener('DOMContentLoaded', function () {
  var section = document.getElementById('rsvp');
  var bg      = document.getElementById('rsvpBg');
  if (!section || !bg) return;
 
  function tick() {
    var offset = section.getBoundingClientRect().top * -0.4;
    bg.style.transform = 'translateY(' + offset + 'px)';
  }
 
  window.addEventListener('scroll', tick, { passive: true });
  window.addEventListener('resize', tick, { passive: true });
  tick();
});
