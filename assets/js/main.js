// IGO Groups — site interactions: nav, theme, counters, filters, scroll-reveal, particle network
document.addEventListener('DOMContentLoaded', function () {
  // Mobile nav toggle
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      links.classList.toggle('open');
      toggle.classList.toggle('active');
    });
  }

  // Sticky nav: add elevated/blurred style once scrolled
  var navbar = document.querySelector('.navbar');
  function onNavScroll() {
    if (!navbar) return;
    if (window.scrollY > 8) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');
  }
  window.addEventListener('scroll', onNavScroll, { passive: true });
  onNavScroll();

  // Dark mode toggle
  var themeBtn = document.getElementById('themeToggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('igo-theme', isDark ? 'dark' : 'light');
    });
  }

  // Animated counters
  var counters = document.querySelectorAll('.num[data-count]');
  var animated = false;
  function animateCounters() {
    if (animated) return;
    var triggerEl = counters[0];
    if (!triggerEl) return;
    var rect = triggerEl.getBoundingClientRect();
    if (rect.top > window.innerHeight) return;
    animated = true;
    counters.forEach(function (el) {
      var target = parseInt(el.getAttribute('data-count'), 10) || 0;
      var duration = 1200;
      var start = null;
      function step(ts) {
        if (!start) start = ts;
        var progress = Math.min((ts - start) / duration, 1);
        el.textContent = Math.floor(progress * target).toLocaleString('en-IN');
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = target.toLocaleString('en-IN') + '+';
      }
      requestAnimationFrame(step);
    });
  }
  window.addEventListener('scroll', animateCounters, { passive: true });
  animateCounters();

  // Animated counters — "The Numbers That Define Us" stat cards (independent
  // of the generic .num counter above, since these need per-card suffixes
  // like "K+" and some entries with no suffix at all).
  var bigStats = document.querySelectorAll('.stat-big-num[data-count]');
  var bigStatsAnimated = false;
  function animateBigStats() {
    if (bigStatsAnimated) return;
    var triggerEl = bigStats[0];
    if (!triggerEl) return;
    var rect = triggerEl.getBoundingClientRect();
    if (rect.top > window.innerHeight) return;
    bigStatsAnimated = true;
    bigStats.forEach(function (el) {
      var target = parseInt(el.getAttribute('data-count'), 10) || 0;
      var suffix = el.getAttribute('data-suffix') || '';
      var duration = 1400;
      var start = null;
      function step(ts) {
        if (!start) start = ts;
        var progress = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(eased * target).toLocaleString('en-IN') + (progress >= 1 ? suffix : '');
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = target.toLocaleString('en-IN') + suffix;
      }
      requestAnimationFrame(step);
    });
  }
  window.addEventListener('scroll', animateBigStats, { passive: true });
  animateBigStats();

  // Brand directory filter (brands.html only)
  var grid = document.getElementById('brandsGrid');
  if (grid) {
    var filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterButtons.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var filterVal = btn.getAttribute('data-filter');
        grid.querySelectorAll('.dir-card').forEach(function (card) {
          if (filterVal === 'all' || card.getAttribute('data-status') === filterVal) {
            card.style.display = '';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });
  }

  // Scroll-reveal animations. Elements are visible by default (see CSS);
  // only elements starting below the fold get opted into the hidden
  // pre-reveal state, then faded in via IntersectionObserver. Above-the-fold
  // content is never hidden, so a slow/failed observer can never leave it invisible.
  var revealEls = document.querySelectorAll('[data-reveal]');
  if (revealEls.length) {
    var vh = window.innerHeight;
    var lazyEls = [];
    revealEls.forEach(function (el, i) {
      el.style.transitionDelay = (Math.min(i % 4, 3) * 80) + 'ms';
      var rect = el.getBoundingClientRect();
      if (rect.top >= vh || rect.bottom <= 0) {
        el.classList.add('reveal-pending');
        lazyEls.push(el);
      }
    });
    if (lazyEls.length && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.remove('reveal-pending');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
      lazyEls.forEach(function (el) { io.observe(el); });
    } else {
      lazyEls.forEach(function (el) { el.classList.remove('reveal-pending'); });
    }
  }

  // Ecosystem / hero particle-network canvas backgrounds
  var nets = document.querySelectorAll('.particle-net');
  nets.forEach(function (canvas) { initParticleNetwork(canvas); });

  // ---------- Liquid glass: cursor-tracked spotlight on cards & glass panels ----------
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hoverCapable = window.matchMedia && window.matchMedia('(hover: hover)').matches;
  var spotlightSelector = '.card, .brand-card, .eco-item, .testi-card, .subcat-card, .proj-cat, .mini-card, .glass-panel, ' +
    '.bento-card, .vm-card, .leader-card, .testi-card-new, .offer-card, .why-card';

  if (!reduceMotion && hoverCapable) {
    var spotlightTicking = false;
    var lastPointerEvent = null;
    function applySpotlight() {
      spotlightTicking = false;
      if (!lastPointerEvent) return;
      var target = lastPointerEvent.target.closest(spotlightSelector);
      if (!target) return;
      var rect = target.getBoundingClientRect();
      var x = ((lastPointerEvent.clientX - rect.left) / rect.width) * 100;
      var y = ((lastPointerEvent.clientY - rect.top) / rect.height) * 100;
      target.style.setProperty('--mx', x + '%');
      target.style.setProperty('--my', y + '%');
    }
    document.addEventListener('pointermove', function (e) {
      if (!e.target.closest(spotlightSelector)) return;
      lastPointerEvent = e;
      if (!spotlightTicking) {
        spotlightTicking = true;
        requestAnimationFrame(applySpotlight);
      }
    }, { passive: true });

    // ---------- Liquid glass: magnetic pull on primary CTAs ----------
    var magneticEls = document.querySelectorAll('.btn-primary, .btn-glass, .magnetic');
    magneticEls.forEach(function (el) {
      var raf = null, tx = 0, ty = 0;
      el.addEventListener('mousemove', function (e) {
        var rect = el.getBoundingClientRect();
        tx = ((e.clientX - rect.left) / rect.width - 0.5) * 10;
        ty = ((e.clientY - rect.top) / rect.height - 0.5) * 10;
        if (!raf) {
          raf = requestAnimationFrame(function () {
            el.style.transform = 'translate(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px)';
            raf = null;
          });
        }
      });
      el.addEventListener('mouseleave', function () {
        if (raf) cancelAnimationFrame(raf);
        raf = null;
        el.style.transform = '';
      });
    });
  }
});

function initParticleNetwork(canvas) {
  var ctx = canvas.getContext('2d');
  if (!ctx) return;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var w, h, nodes;
  var density = parseInt(canvas.getAttribute('data-density'), 10) || 36;
  var color = canvas.getAttribute('data-color') || '46,184,92';

  function size() {
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function makeNodes() {
    nodes = [];
    for (var i = 0; i < density; i++) {
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: 1.4 + Math.random() * 1.6
      });
    }
  }

  size();
  makeNodes();
  window.addEventListener('resize', function () { size(); makeNodes(); });

  function tick() {
    var maxDist = Math.max(90, Math.min(w, h) * 0.22);
    ctx.clearRect(0, 0, w, h);
    var i, j;
    for (i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > w) n.vx *= -1;
      if (n.y < 0 || n.y > h) n.vy *= -1;
    }
    for (i = 0; i < nodes.length; i++) {
      for (j = i + 1; j < nodes.length; j++) {
        var a = nodes[i], b = nodes[j];
        var dx = a.x - b.x, dy = a.y - b.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < maxDist) {
          ctx.strokeStyle = 'rgba(' + color + ',' + (0.16 * (1 - dist / maxDist)) + ')';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    for (i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + color + ',0.55)';
      ctx.fill();
    }
    requestAnimationFrame(tick);
  }
  tick();
}
/* ---------- Global Modal Logic ---------- */
function openModal(title, subtitle, description, featuresArray, ctaText, ctaLink) {
  let overlay = document.getElementById('igo-global-modal');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'igo-global-modal';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <div>
            <h2 class="modal-title" id="modal-title-el"></h2>
            <div class="modal-subtitle" id="modal-subtitle-el"></div>
          </div>
          <button class="modal-close" onclick="closeModal()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div class="modal-body">
          <p id="modal-desc-el"></p>
          <h3 id="modal-features-title">Highlights</h3>
          <div class="modal-features" id="modal-features-el"></div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" onclick="closeModal()">Close</button>
          <a href="#" class="btn btn-primary" id="modal-cta-el"></a>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeModal();
    });
  }

  document.getElementById('modal-title-el').textContent = title;
  document.getElementById('modal-subtitle-el').textContent = subtitle;
  document.getElementById('modal-desc-el').innerHTML = description;

  const featsEl = document.getElementById('modal-features-el');
  featsEl.innerHTML = '';
  if (featuresArray && featuresArray.length > 0) {
    document.getElementById('modal-features-title').style.display = 'block';
    featuresArray.forEach(f => {
      let div = document.createElement('div');
      div.className = 'modal-feature-item';
      div.textContent = f;
      featsEl.appendChild(div);
    });
  } else {
    document.getElementById('modal-features-title').style.display = 'none';
  }

  const ctaEl = document.getElementById('modal-cta-el');
  if (ctaLink) {
    ctaEl.style.display = 'inline-block';
    ctaEl.textContent = ctaText || 'Visit Website';
    ctaEl.href = ctaLink;
    if (/^https?:\/\//i.test(ctaLink)) {
      ctaEl.target = '_blank';
      ctaEl.rel = 'noopener';
    } else {
      ctaEl.removeAttribute('target');
      ctaEl.removeAttribute('rel');
    }
  } else {
    ctaEl.style.display = 'none';
  }

  // Force reflow
  void overlay.offsetWidth;
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const overlay = document.getElementById('igo-global-modal');
  if (overlay) {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }
}

/* ---------- Image Lightbox (department team/banner photos) ---------- */
function openImageLightbox(src, alt) {
  let overlay = document.getElementById('igo-img-lightbox');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'igo-img-lightbox';
    overlay.className = 'img-lightbox-overlay';
    overlay.innerHTML = `
      <button class="img-lightbox-close" onclick="closeImageLightbox()" aria-label="Close">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
      <img class="img-lightbox-img" id="igo-img-lightbox-img" src="" alt="">
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeImageLightbox();
    });
  }
  document.getElementById('igo-img-lightbox-img').src = src;
  document.getElementById('igo-img-lightbox-img').alt = alt || '';
  void overlay.offsetWidth;
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeImageLightbox() {
  const overlay = document.getElementById('igo-img-lightbox');
  if (overlay) {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closeImageLightbox();
});

/* ══════════════════════════════════════════════════════════════
   LIQUID GLASS 2.0 — MOTION ENGINE
   Scroll progress, 3D card tilt, ambient cursor light, hero depth.
   All transform/opacity only; gated behind hover + reduced-motion.
══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover = window.matchMedia && window.matchMedia('(hover: hover)').matches;

  // ── Scroll progress hairline (all devices) ──
  var bar = document.createElement('div');
  bar.className = 'scroll-progress';
  document.body.appendChild(bar);
  var barTick = false;
  function paintBar() {
    barTick = false;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(window.scrollY / max, 1) : 0) + ')';
  }
  window.addEventListener('scroll', function () {
    if (!barTick) { barTick = true; requestAnimationFrame(paintBar); }
  }, { passive: true });
  paintBar();

  if (reduce || !canHover) return;

  // ── 3D perspective tilt on cards ──
  var tiltSel = '.card, .brand-card, .bento-card, .offer-card, .leader-card, ' +
    '.testi-card-new, .testi-card, .vm-card, .eco-item, .glass-panel, .why-card, ' +
    '.mini-card, .subcat-card, .milestone-card';
  document.querySelectorAll(tiltSel).forEach(function (el) {
    var raf = null, rx = 0, ry = 0;
    el.addEventListener('pointerenter', function () {
      el.classList.add('tilting');
      el.style.transition = 'transform 0.14s ease-out';
    });
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      rx = ((e.clientY - r.top) / r.height - 0.5) * -5;
      ry = ((e.clientX - r.left) / r.width - 0.5) * 5;
      if (!raf) {
        raf = requestAnimationFrame(function () {
          el.style.transform = 'perspective(900px) rotateX(' + rx.toFixed(2) +
            'deg) rotateY(' + ry.toFixed(2) + 'deg) translateY(-4px)';
          raf = null;
        });
      }
    });
    el.addEventListener('pointerleave', function () {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      el.classList.remove('tilting');
      el.style.transition = '';
      el.style.transform = '';
    });
  });

  // ── Ambient cursor light (soft lerp-following glow) ──
  var glow = document.createElement('div');
  glow.className = 'ambient-glow';
  document.body.appendChild(glow);

  var mx = window.innerWidth / 2, my = window.innerHeight / 3;
  var gx = mx, gy = my;

  document.addEventListener('pointermove', function (e) {
    mx = e.clientX; my = e.clientY;
  }, { passive: true });

  (function ambientLoop() {
    gx += (mx - gx) * 0.08;
    gy += (my - gy) * 0.08;
    glow.style.transform = 'translate3d(' + gx.toFixed(1) + 'px,' + gy.toFixed(1) + 'px,0)';
    requestAnimationFrame(ambientLoop);
  })();
});
