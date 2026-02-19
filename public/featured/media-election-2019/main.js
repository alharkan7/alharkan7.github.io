/* ═══════════════════════════════════════════════
   BEYOND THE SCREEN — Main Script
   Media Effects on Indonesia's 2019 Election
═══════════════════════════════════════════════ */

// ─── SCROLL RESTORATION ─────────────────────────
// Disable browser scroll-position restoration on mobile immediately.
// The browser restores saved scroll offsets during page load — potentially
// *after* DOMContentLoaded fires — which would undo our scrollTo(0) call
// and cause the sticky viz tab bar to peek below the hero section.
// Setting this to 'manual' here (top-level, synchronous) prevents that entirely.
if (typeof history !== 'undefined' && 'scrollRestoration' in history) {
  if (window.innerWidth <= 900) {
    history.scrollRestoration = 'manual';
  }
}

// ─── SECTION MAP ────────────────────────────────
const SECTIONS = [
  { textId: 'section-context', vizId: 'viz-context', navIndex: 0 },
  { textId: 'section-problem', vizId: 'viz-problem', navIndex: 1 },
  { textId: 'section-methodology', vizId: 'viz-methodology', navIndex: 2 },
  { textId: 'section-finding1', vizId: 'viz-finding1', navIndex: 3 },
  { textId: 'section-finding2', vizId: 'viz-finding2', navIndex: 4 },
  { textId: 'section-bigpicture', vizId: 'viz-bigpicture', navIndex: 5 },
  { textId: 'section-conclusion', vizId: 'viz-conclusion', navIndex: 6 },
];

let currentViz = 'viz-context';
let vizInitialized = {};

// ─── SCROLL EVENT (progress bar + mobile section tracker) ────
window.addEventListener('scroll', () => {
  const scrolled = window.scrollY;
  const total = document.documentElement.scrollHeight - window.innerHeight;
  document.getElementById('progress-bar').style.width = (scrolled / total * 100) + '%';
  document.getElementById('main-nav').classList.toggle('scrolled', scrolled > 80);

  // On mobile we use scroll-position tracking instead of IntersectionObserver
  if (isMobile()) updateActiveSectionMobile();
}, { passive: true });

// ─── MOBILE: SCROLL-POSITION SECTION TRACKER ──────────────────
// The IntersectionObserver misfires when a large sticky element (viz panel)
// offsets the effective viewport. Scroll-position tracking is more reliable.
function getStickyOffset() {
  // Height of the sticky viz column (tab bar + panels) sitting above the text
  const viz = document.getElementById('viz-column')?.offsetHeight || 300;
  return viz;
}

let _lastActiveSectionId = null;
function updateActiveSectionMobile() {
  const stickyH = getStickyOffset();
  // The visible reading area starts just below the sticky viz column
  // and extends to the bottom of the viewport.
  const readingTop = window.scrollY + stickyH;
  const readingBottom = window.scrollY + window.innerHeight;
  // Use a point 30% into the visible reading area as the "active" line.
  // This ensures a section is only considered active once its content
  // is meaningfully visible—not the instant its top edge peeks under
  // the sticky viz.
  const activeLine = readingTop + (readingBottom - readingTop) * 0.3;

  // ── Early first-section trigger ───────────────────────────────────────────
  // On mobile the viz is sticky-ABOVE the text. The viz panel becomes 25%
  // visible when scrollY ≈ vizHeight × 0.25. The text section-context only
  // reaches the activeLine when scrollY ≈ 0.7 × innerHeight + 90 — a ~600 px
  // gap during which the viz is fully on screen but the chart stays blank.
  // Pre-seeding active=SECTIONS[0] when the viz is ≥25% visible fires
  // drawTimeline() as soon as the user sees the chart area.
  let active = window.scrollY >= stickyH * 0.25 ? SECTIONS[0] : null;

  for (const s of SECTIONS) {
    const el = document.getElementById(s.textId);
    if (!el) continue;
    // IMPORTANT: el.offsetTop is relative to its offsetParent (#text-column,
    // which has position:relative), NOT the document top. We must use
    // getBoundingClientRect() + scrollY to get the absolute document position
    // so it's comparable with our activeLine (also in document coordinates).
    const absTop = el.getBoundingClientRect().top + window.scrollY;
    if (absTop <= activeLine) active = s;
    else break; // sections are in order, stop early
  }

  if (!active || active.textId === _lastActiveSectionId) return;
  _lastActiveSectionId = active.textId;

  // Update text section highlight
  SECTIONS.forEach(s => {
    const el = document.getElementById(s.textId);
    if (el) el.classList.toggle('is-active', s.textId === active.textId);
  });

  switchViz(active.vizId);
  syncMobileTab(active.vizId);
  updateNavDots(active.navIndex);
  updateHash(active.textId);
}

// ─── DESKTOP: INTERSECTION OBSERVER ───────────────────────────
// Only attached when NOT on mobile (checked after DOM ready in initDesktop).
const observerOptions = {
  root: null,
  // Active zone: top 10% → 50% of viewport.
  // Sections become active as they enter the LOWER half of the viewport
  // (crossing the 50% mark), giving the user the full remaining section scroll
  // to watch the visualization animate — not just the last 30%.
  // This also fixes the first viz firing too early: it now fires when the user
  // scrolls section-context into view rather than at page load.
  rootMargin: '-10% 0px -50% 0px',
  threshold: 0,
};

const observer = new IntersectionObserver((entries) => {
  if (isMobile()) return; // mobile uses scroll-position tracker instead
  entries.forEach(entry => {
    const section = SECTIONS.find(s => s.textId === entry.target.id);
    if (!section) return;
    const textEl = document.getElementById(section.textId);
    if (entry.isIntersecting) {
      textEl.classList.add('is-active');
      switchViz(section.vizId);
      updateNavDots(section.navIndex);
      updateHash(section.textId);
    } else {
      textEl.classList.remove('is-active');
    }
  });
}, observerOptions);

SECTIONS.forEach(s => {
  const el = document.getElementById(s.textId);
  if (el) observer.observe(el);
});

// ─── VIZ SWITCHER ───────────────────────────────
function switchViz(nextVizId) {
  const needsInit = !vizInitialized[nextVizId];

  // Skip entirely only if we're already showing this viz AND it's already drawn.
  // When needsInit is true we must still call initViz even if currentViz matches
  // (e.g. viz-context is the default active panel but hasn't been animated yet).
  if (nextVizId === currentViz && !needsInit) return;

  if (nextVizId !== currentViz) {
    const current = document.getElementById(currentViz);
    const next = document.getElementById(nextVizId);
    if (!current || !next) return;

    current.classList.remove('active');
    current.classList.add('exiting');
    setTimeout(() => current.classList.remove('exiting'), 900);

    next.classList.add('active');
    currentViz = nextVizId;
  }

  if (needsInit) {
    vizInitialized[nextVizId] = true;
    initViz(nextVizId);
  }
}

function initViz(id) {
  const map = {
    'viz-context': drawTimeline,
    'viz-problem': drawBubbles,
    'viz-methodology': drawSEM,
    'viz-finding1': drawScatter,
    'viz-finding2': drawMatrix,
    'viz-bigpicture': drawBars,
    'viz-conclusion': drawMap,
  };
  if (map[id]) map[id]();
}

// ─── NAV DOTS ───────────────────────────────────
function updateNavDots(activeIndex) {
  document.querySelectorAll('.nav-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === activeIndex);
  });
}

// ─── URL HASH SYNC ──────────────────────────────
function updateHash(sectionId) {
  const newHash = '#' + sectionId;
  if (window.location.hash !== newHash) {
    history.replaceState(null, '', newHash);
  }
}

// ─── HERO COUNTER ANIMATION ─────────────────────
const counters = document.querySelectorAll('.stat-num');
const counterObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCounter(entry.target);
      counterObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });
counters.forEach(c => counterObserver.observe(c));

function animateCounter(el) {
  const target = +el.dataset.target;
  const duration = 1800;
  const start = performance.now();
  function update(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    el.textContent = Math.floor(ease * target).toLocaleString();
    if (t < 1) requestAnimationFrame(update);
    else el.textContent = target.toLocaleString();
  }
  requestAnimationFrame(update);
}

// ─── HERO PARTICLE CANVAS ───────────────────────
(function initHeroCanvas() {
  const canvas = document.getElementById('hero-canvas');
  const ctx = canvas.getContext('2d');
  let particles = [];
  let W, H;

  function resize() {
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < 90; i++) {
    particles.push({
      x: Math.random() * 1200,
      y: Math.random() * 800,
      r: Math.random() * 2.5 + 0.5,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      a: Math.random() * 0.5 + 0.15,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x % W, p.y % H, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(44,62,80,${p.a * 0.35})`;
      ctx.fill();
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x += W;
      if (p.y < 0) p.y += H;
    });
    // draw subtle connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(44,62,80,${0.06 * (1 - dist / 100)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
})();

// ═══════════════════════════════════════════
// VIZ 1: MEDIA GROWTH TIMELINE
// ═══════════════════════════════════════════
function drawTimeline(targetId = 'chart-timeline', legendId = 'legend-timeline') {
  const el = document.getElementById(targetId);
  if (!el) return;
  // Fixed dimensions for viewBox scaling
  const W = 600;
  const H = 400;
  const M = { top: 20, right: 70, bottom: 50, left: 50 };
  const iW = W - M.left - M.right;
  const iH = H - M.top - M.bottom;

  const data = [
    { year: 2000, internet: 1.9, tv: 88, radio: 68 },
    { year: 2002, internet: 3.6, tv: 89, radio: 66 },
    { year: 2004, internet: 5.6, tv: 90, radio: 64 },
    { year: 2006, internet: 8.4, tv: 90, radio: 62 },
    { year: 2008, internet: 13.1, tv: 91, radio: 59 },
    { year: 2010, internet: 19.5, tv: 92, radio: 57 },
    { year: 2012, internet: 27.2, tv: 92, radio: 55 },
    { year: 2014, internet: 40.4, tv: 93, radio: 50 },
    { year: 2016, internet: 56.1, tv: 94, radio: 47 },
    { year: 2018, internet: 71.2, tv: 93, radio: 43 },
    { year: 2019, internet: 73.7, tv: 93, radio: 42 },
  ];

  const svg = d3.select(el)
    .attr('viewBox', `0 0 ${W} ${H}`)
    .append('g').attr('transform', `translate(${M.left},${M.top})`);

  const x = d3.scaleLinear().domain([2000, 2019]).range([0, iW]);
  const y = d3.scaleLinear().domain([0, 100]).range([iH, 0]);

  // Gridlines
  svg.append('g').attr('class', 'grid')
    .call(d3.axisLeft(y).ticks(5).tickSize(-iW).tickFormat(''));

  // Axes
  svg.append('g').attr('class', 'axis')
    .attr('transform', `translate(0,${iH})`)
    .call(d3.axisBottom(x).tickFormat(d3.format('d')).ticks(6));
  svg.append('g').attr('class', 'axis')
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => d + '%'));

  const colors = { internet: '#2980B9', tv: '#1E8449', radio: '#C0392B' };
  const series = ['internet', 'tv', 'radio'];

  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.value))
    .curve(d3.curveMonotoneX);

  series.forEach(key => {
    const lineData = data.map(d => ({ year: d.year, value: d[key] }));
    const path = svg.append('path')
      .datum(lineData)
      .attr('fill', 'none')
      .attr('stroke', colors[key])
      .attr('stroke-width', key === 'internet' ? 3 : 2)
      .attr('d', line);

    const totalLength = path.node().getTotalLength();
    path
      .attr('stroke-dasharray', totalLength)
      .attr('stroke-dashoffset', totalLength)
      .transition().duration(1400).delay(series.indexOf(key) * 300)
      .ease(d3.easeCubicInOut)
      .attr('stroke-dashoffset', 0);

    // Dots for last point
    const last = lineData[lineData.length - 1];
    svg.append('circle')
      .attr('cx', x(last.year)).attr('cy', y(last.value))
      .attr('r', 5).attr('fill', colors[key])
      .attr('opacity', 0)
      .transition().delay(1700).attr('opacity', 1);

    svg.append('text')
      .attr('x', x(last.year) + 7)
      .attr('y', y(last.value) + 4)
      .attr('fill', colors[key])
      .style('font-family', 'Inter,sans-serif')
      .style('font-size', '11px')
      .style('font-weight', '700')
      .text(key === 'internet' ? 'Internet' : key === 'tv' ? 'TV' : 'Radio')
      .attr('opacity', 0)
      .transition().delay(1800).attr('opacity', 1);
  });

  // Annotation: 2015 crossover
  svg.append('line')
    .attr('x1', x(2015)).attr('x2', x(2015))
    .attr('y1', 0).attr('y2', iH)
    .attr('stroke', '#D4AC0D').attr('stroke-dasharray', '4,3').attr('stroke-width', 1.5)
    .attr('opacity', 0).transition().delay(2000).attr('opacity', 0.7);
  svg.append('text')
    .attr('x', x(2015) + 6).attr('y', 16)
    .attr('fill', '#D4AC0D')
    .style('font-size', '10px').style('font-family', 'Inter,sans-serif').style('font-weight', '600')
    .text('Digital rises')
    .attr('opacity', 0).transition().delay(2100).attr('opacity', 1);

  // Legend
  const leg = document.getElementById(legendId);
  if (leg) leg.innerHTML = series.map(k => `
    <div class="legend-item">
      <div class="legend-swatch" style="background:${colors[k]};height:${k === 'internet' ? '3px' : '2px'}"></div>
      <span>${k.charAt(0).toUpperCase() + k.slice(1)} Penetration</span>
    </div>
  `).join('');
}

// ═══════════════════════════════════════════
// VIZ 2: VARIABLES BUBBLE MAP
// ═══════════════════════════════════════════
function drawBubbles(targetId = 'chart-bubbles') {
  const el = document.getElementById(targetId);
  if (!el) return;
  // Fixed dimensions for viewBox scaling
  const W = 600;
  const H = 450;

  const svg = d3.select(el).attr('viewBox', `0 0 ${W} ${H}`);
  const cx = W / 2, cy = H / 2;

  // Center nodes
  const centers = [
    { id: 'turnout', label: 'Voter\nTurnout', x: cx - 110, y: cy, r: 44, color: '#1A5276', text: 'white' },
    { id: 'direction', label: 'Vote\nDirection', x: cx + 110, y: cy, r: 44, color: '#C0392B', text: 'white' },
  ];

  // Variable bubbles
  // Fact-checked: Replaced GDP/Cap with Literacy (Melek Aksara) based on Table 4.1
  const vars = [
    { label: 'TV', cat: 'media', angle: -100, dist: 190, r: 30, color: '#2E86AB' },
    { label: 'Radio', cat: 'media', angle: -140, dist: 185, r: 30, color: '#2E86AB' },
    { label: 'Internet', cat: 'media', angle: -60, dist: 195, r: 30, color: '#2E86AB' },
    // Newspaper: pushed to -160°/dist208 so it clears Voter Turnout (107px > 74px radii-sum)
    // and is well separated from Literacy. r increased to 30 so the full word fits inside.
    { label: 'Newspaper', cat: 'media', angle: -160, dist: 208, r: 30, color: '#5DADE2' },
    { label: 'Google', cat: 'media', angle: -20, dist: 180, r: 26, color: '#5DADE2' },
    { label: 'Religion', cat: 'socio', angle: 70, dist: 180, r: 28, color: '#1E8449' },
    { label: 'Ethnicity', cat: 'socio', angle: 110, dist: 190, r: 28, color: '#1E8449' },
    { label: 'Poverty', cat: 'econ', angle: 145, dist: 185, r: 26, color: '#D4AC0D' },
    // Literacy: pushed to 163°/dist200 — 100px from Voter Turnout, 134px from Newspaper
    { label: 'Literacy', cat: 'econ', angle: 163, dist: 200, r: 26, color: '#D4AC0D' },
  ];

  const toRad = d => d * Math.PI / 180;

  // Draw connection lines first
  vars.forEach((v, i) => {
    const vx = cx + Math.cos(toRad(v.angle)) * v.dist;
    const vy = cy + Math.sin(toRad(v.angle)) * v.dist;
    centers.forEach(c => {
      svg.append('line')
        .attr('x1', vx).attr('y1', vy)
        .attr('x2', c.x).attr('y2', c.y)
        .attr('stroke', v.color)
        .attr('stroke-width', 1)
        .attr('opacity', 0)
        .transition().delay(i * 80 + 400).duration(500)
        .attr('opacity', 0.15);
    });
  });

  // Center outcome circles
  centers.forEach(c => {
    const g = svg.append('g').attr('transform', `translate(${c.x},${c.y})`);
    g.append('circle').attr('r', 0).attr('fill', c.color)
      .transition().duration(600).attr('r', c.r);
    g.append('text').attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
      .style('font-family', 'Inter,sans-serif').style('font-size', '11px').style('font-weight', '700')
      .attr('fill', 'white').attr('pointer-events', 'none')
      .selectAll('tspan').data(c.label.split('\n')).join('tspan')
      .attr('x', 0).attr('dy', (_, i) => i === 0 ? '-0.4em' : '1.2em')
      .text(d => d);
  });

  // Variable bubbles — supports multi-line labels via '\n'
  vars.forEach((v, i) => {
    const vx = cx + Math.cos(toRad(v.angle)) * v.dist;
    const vy = cy + Math.sin(toRad(v.angle)) * v.dist;
    const g = svg.append('g').attr('transform', `translate(${vx},${vy})`).attr('opacity', 0);
    g.transition().delay(i * 80 + 200).duration(500).attr('opacity', 1);
    g.append('circle').attr('r', v.r).attr('fill', v.color).attr('opacity', 0.85);

    const lines = v.label.split('\n');
    const textEl = g.append('text')
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
      .style('font-family', 'Inter,sans-serif').style('font-size', '9.5px').style('font-weight', '600')
      .attr('fill', 'white').attr('pointer-events', 'none');
    if (lines.length === 1) {
      textEl.text(v.label);
    } else {
      textEl.selectAll('tspan').data(lines).join('tspan')
        .attr('x', 0).attr('dy', (_, j) => j === 0 ? '-0.4em' : '1.2em')
        .text(d => d);
    }
  });

  // Category labels — anchored to corners where no bubbles exist
  // "MEDIA VARIABLES" → top-left (TV bubble is upper-centre so shifting left clears it)
  svg.append('text').attr('x', 12).attr('y', 18)
    .attr('fill', '#2E86AB').style('font-family', 'Inter,sans-serif').style('font-size', '11px')
    .style('font-weight', '700').attr('text-anchor', 'start').text('MEDIA VARIABLES');
  // "SOCIOLOGICAL + ECONOMIC" → bottom-right (Ethnicity/Religion bubbles are bottom-centre/left)
  svg.append('text').attr('x', W - 12).attr('y', H - 8)
    .attr('fill', '#1E8449').style('font-family', 'Inter,sans-serif').style('font-size', '11px')
    .style('font-weight', '700').attr('text-anchor', 'end').text('SOCIOLOGICAL + ECONOMIC');
}

// ═══════════════════════════════════════════
// VIZ 3: SEM-PLS PATH DIAGRAM
// ═══════════════════════════════════════════
function drawSEM(targetId = 'chart-sem') {
  const el = document.getElementById(targetId);
  if (!el) return;
  // Fixed dimensions for viewBox scaling
  const W = 600;
  const H = 400;
  const svg = d3.select(el).attr('viewBox', `0 0 ${W} ${H}`);

  // Defs: markers
  const defs = svg.append('defs');
  ['sig', 'insig'].forEach(t => {
    defs.append('marker')
      .attr('id', `arrow-${t}`)
      .attr('viewBox', '0 -5 10 10').attr('refX', 10).attr('refY', 0)
      .attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto')
      .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', t === 'sig' ? '#C0392B' : '#AAA');
  });

  // Fact-check correction: Shifted Y, sorted layers
  const nodes = [
    { id: 'tv', label: 'TV', x: 80, y: 40, w: 90, h: 36, color: '#2C3E50' },
    { id: 'radio', label: 'Radio', x: 80, y: 110, w: 90, h: 36, color: '#C0392B' },
    { id: 'internet', label: 'Internet', x: 80, y: 180, w: 90, h: 36, color: '#2C3E50' },
    { id: 'news', label: 'Newspaper', x: 80, y: 250, w: 90, h: 36, color: '#2C3E50' },
    { id: 'google', label: 'Google', x: 80, y: 320, w: 90, h: 36, color: '#2C3E50' },
    { id: 'turnout', label: 'Voter\nTurnout', x: W - 120, y: 100, w: 100, h: 50, color: '#1A5276' },
    { id: 'direct', label: 'Vote\nDirection', x: W - 120, y: 240, w: 100, h: 50, color: '#922B21' },
  ];

  /* 
     Fact-check Corrections based on Table 4.3:
     Radio -> Turnout: beta = 0.612 (sig)
     Radio -> Direct (Demokrat): beta = -0.399 (sig)
     TV -> Direct (Nasdem): beta = -0.527 (sig)
     Google -> Direct (Gerindra/PKB): beta = -0.694 (Gerindra), -0.537 (PKB). Used -0.69.
  */
  const paths = [
    { from: 'radio', to: 'turnout', sig: true, coef: 'β=0.61*' },
    { from: 'tv', to: 'turnout', sig: false, coef: 'ns' },
    { from: 'internet', to: 'turnout', sig: false, coef: 'ns' },
    { from: 'google', to: 'direct', sig: true, coef: 'β=-0.69*' },
    { from: 'tv', to: 'direct', sig: true, coef: 'β=-0.53*' },
    { from: 'radio', to: 'direct', sig: true, coef: 'β=-0.40*' },
    { from: 'news', to: 'direct', sig: false, coef: 'ns' },
    { from: 'internet', to: 'direct', sig: false, coef: 'ns' },
  ];

  // Sort paths so non-significant (dotted) are drawn first (underneath)
  paths.sort((a, b) => (a.sig === b.sig) ? 0 : a.sig ? 1 : -1);

  const getNode = id => nodes.find(n => n.id === id);

  // Draw connections
  paths.forEach((p, i) => {
    const from = getNode(p.from), to = getNode(p.to);
    const x1 = from.x + from.w, y1 = from.y + from.h / 2;
    const x2 = to.x, y2 = to.y + to.h / 2;
    const mx = (x1 + x2) / 2;

    const path = svg.append('path')
      .attr('d', `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`)
      .attr('fill', 'none')
      .attr('stroke', p.sig ? '#C0392B' : '#CCC')
      .attr('stroke-width', p.sig ? 2.5 : 1.5)
      .attr('stroke-dasharray', p.sig ? 'none' : '5,4')
      .attr('marker-end', `url(#arrow-${p.sig ? 'sig' : 'insig'})`)
      .attr('opacity', 0);

    path.transition().delay(i * 120 + 300).duration(600).attr('opacity', 1);

    if (p.sig) {
      const totalLen = path.node().getTotalLength();
      path
        .attr('stroke-dasharray', `${totalLen} ${totalLen}`)
        .attr('stroke-dashoffset', totalLen)
        .transition().delay(i * 120 + 300).duration(800).ease(d3.easeCubicInOut)
        .attr('stroke-dashoffset', 0).attr('opacity', 1)
        .on('end', function () {
          d3.select(this).attr('stroke-dasharray', 'none');
        });
    }

    // Path coefficient label
    svg.append('text')
      .attr('x', mx).attr('y', (y1 + y2) / 2 - 5)
      .attr('text-anchor', 'middle')
      .style('paint-order', 'stroke')
      .style('stroke', '#F9F8F5') // Paper color outline
      .style('stroke-width', '3px')
      .style('stroke-linecap', 'butt')
      .style('stroke-linejoin', 'miter')
      .attr('fill', p.sig ? '#C0392B' : '#AAA')
      .style('font-family', 'Inter,sans-serif')
      .style('font-size', '9.5px').style('font-weight', p.sig ? '700' : '400')
      .text(p.coef)
      .attr('opacity', 0).transition().delay(i * 120 + 800).attr('opacity', 1);
  });

  // Draw nodes
  nodes.forEach((n, i) => {
    const g = svg.append('g').attr('opacity', 0);
    g.transition().delay(i * 60).duration(400).attr('opacity', 1);
    g.append('rect')
      .attr('x', n.x).attr('y', n.y).attr('width', n.w).attr('height', n.h)
      .attr('rx', 8).attr('fill', n.color)
      .attr('filter', 'drop-shadow(0 2px 6px rgba(0,0,0,0.2))');
    g.selectAll('text').data(n.label.split('\n')).join('text')
      .attr('x', n.x + n.w / 2)
      .attr('y', (_, j, arr) => n.y + n.h / 2 + (j - (arr.length - 1) / 2) * 14)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
      .attr('fill', 'white').style('font-family', 'Inter,sans-serif')
      .style('font-size', '11px').style('font-weight', '600').text(d => d);
  });

  // Legend
  svg.append('circle').attr('cx', 20).attr('cy', H - 20).attr('r', 5).attr('fill', '#C0392B');
  svg.append('text').attr('x', 30).attr('y', H - 16).style('font-size', '10px')
    .style('font-family', 'Inter,sans-serif').attr('fill', '#666').text('Significant (p<0.05)');
  svg.append('line').attr('x1', 150).attr('x2', 170).attr('y1', H - 20).attr('y2', H - 20)
    .attr('stroke', '#CCC').attr('stroke-dasharray', '4,3').attr('stroke-width', 1.5);
  svg.append('text').attr('x', 175).attr('y', H - 16).style('font-size', '10px')
    .style('font-family', 'Inter,sans-serif').attr('fill', '#AAA').text('Not significant');
}

// ═══════════════════════════════════════════
// VIZ 4: RADIO vs. TURNOUT SCATTERPLOT
// ═══════════════════════════════════════════
function drawScatter(targetId = 'chart-scatter', tooltipParent = '#viz-finding1') {
  const el = document.getElementById(targetId);
  if (!el) return;
  // Fixed dimensions for viewBox scaling
  const W = 600;
  const H = 400;
  const M = { top: 20, right: 120, bottom: 55, left: 55 };
  const iW = W - M.left - M.right;
  const iH = H - M.top - M.bottom;

  const provinces = [
    { name: 'Aceh', radio: 52, turnout: 83.2, island: 'Sumatra' },
    { name: 'Sumatera Utara', radio: 55, turnout: 76.4, island: 'Sumatra' },
    { name: 'Sumatera Barat', radio: 58, turnout: 82.1, island: 'Sumatra' },
    { name: 'Riau', radio: 48, turnout: 77.8, island: 'Sumatra' },
    { name: 'Jambi', radio: 50, turnout: 79.5, island: 'Sumatra' },
    { name: 'Sumatera Selatan', radio: 45, turnout: 75.2, island: 'Sumatra' },
    { name: 'Bengkulu', radio: 55, turnout: 81.3, island: 'Sumatra' },
    { name: 'Lampung', radio: 49, turnout: 78.6, island: 'Sumatra' },
    { name: 'Kep. Bangka', radio: 53, turnout: 80.1, island: 'Sumatra' },
    { name: 'Kep. Riau', radio: 42, turnout: 71.2, island: 'Sumatra' },
    { name: 'DKI Jakarta', radio: 35, turnout: 68.9, island: 'Java' },
    { name: 'Jawa Barat', radio: 40, turnout: 72.3, island: 'Java' },
    { name: 'Jawa Tengah', radio: 52, turnout: 82.4, island: 'Java' },
    { name: 'DI Yogyakarta', radio: 56, turnout: 84.7, island: 'Java' },
    { name: 'Jawa Timur', radio: 54, turnout: 81.8, island: 'Java' },
    { name: 'Banten', radio: 38, turnout: 73.1, island: 'Java' },
    { name: 'Bali', radio: 60, turnout: 86.2, island: 'Bali' },
    { name: 'NTB', radio: 62, turnout: 84.9, island: 'Nusa Tenggara' },
    { name: 'NTT', radio: 65, turnout: 87.1, island: 'Nusa Tenggara' },
    { name: 'Kalimantan Barat', radio: 44, turnout: 74.5, island: 'Kalimantan' },
    { name: 'Kalimantan Tengah', radio: 47, turnout: 76.8, island: 'Kalimantan' },
    { name: 'Kalimantan Selatan', radio: 50, turnout: 79.2, island: 'Kalimantan' },
    { name: 'Kalimantan Timur', radio: 43, turnout: 72.6, island: 'Kalimantan' },
    { name: 'Kalimantan Utara', radio: 45, turnout: 74.1, island: 'Kalimantan' },
    { name: 'Sulawesi Utara', radio: 57, turnout: 83.5, island: 'Sulawesi' },
    { name: 'Sulawesi Tengah', radio: 55, turnout: 80.9, island: 'Sulawesi' },
    { name: 'Sulawesi Selatan', radio: 59, turnout: 84.3, island: 'Sulawesi' },
    { name: 'Sulawesi Tenggara', radio: 56, turnout: 82.7, island: 'Sulawesi' },
    { name: 'Gorontalo', radio: 60, turnout: 85.6, island: 'Sulawesi' },
    { name: 'Sulawesi Barat', radio: 58, turnout: 83.8, island: 'Sulawesi' },
    { name: 'Maluku', radio: 63, turnout: 86.0, island: 'Maluku' },
    { name: 'Maluku Utara', radio: 65, turnout: 87.5, island: 'Maluku' },
    { name: 'Papua Barat', radio: 61, turnout: 85.4, island: 'Papua' },
    { name: 'Papua', radio: 66, turnout: 88.0, island: 'Papua' },
  ];

  const islandColors = {
    'Java': '#2C3E50', 'Sumatra': '#2980B9', 'Kalimantan': '#D4AC0D',
    'Sulawesi': '#1E8449', 'Bali': '#C0392B', 'Nusa Tenggara': '#8E44AD',
    'Maluku': '#E67E22', 'Papua': '#16A085',
  };

  const svg = d3.select(el).attr('viewBox', `0 0 ${W} ${H}`)
    .append('g').attr('transform', `translate(${M.left},${M.top})`);

  const x = d3.scaleLinear().domain([32, 70]).range([0, iW]);
  const y = d3.scaleLinear().domain([65, 92]).range([iH, 0]);

  svg.append('g').attr('class', 'grid')
    .call(d3.axisLeft(y).ticks(5).tickSize(-iW).tickFormat(''));
  svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${iH})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(d => d + '%'));
  svg.append('g').attr('class', 'axis')
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => d + '%'));

  // Axis labels
  svg.append('text').attr('x', iW / 2).attr('y', iH + 44).attr('text-anchor', 'middle')
    .style('font-family', 'Inter,sans-serif').style('font-size', '11px').attr('fill', '#666')
    .text('Radio Consumption (% population)');
  svg.append('text').attr('transform', 'rotate(-90)').attr('x', -iH / 2).attr('y', -40)
    .attr('text-anchor', 'middle').style('font-family', 'Inter,sans-serif').style('font-size', '11px')
    .attr('fill', '#666').text('Voter Turnout (%)');

  // Trend line (OLS)
  const xVals = provinces.map(d => d.radio), yVals = provinces.map(d => d.turnout);
  const n = xVals.length;
  const xMean = d3.mean(xVals), yMean = d3.mean(yVals);
  const slope = d3.sum(xVals.map((xi, i) => (xi - xMean) * (yVals[i] - yMean))) /
    d3.sum(xVals.map(xi => (xi - xMean) ** 2));
  const intercept = yMean - slope * xMean;
  const trendLine = svg.append('line')
    .attr('x1', x(32)).attr('y1', y(slope * 32 + intercept))
    .attr('x2', x(32)).attr('y2', y(slope * 32 + intercept))
    .attr('stroke', '#C0392B').attr('stroke-width', 2).attr('stroke-dasharray', '6,3').attr('opacity', 0.7);
  trendLine.transition().delay(provinces.length * 40 + 200).duration(800)
    .attr('x2', x(70)).attr('y2', y(slope * 70 + intercept));

  // Tooltip
  const tooltip = d3.select(tooltipParent).append('div').attr('class', 'd3-tooltip');

  // Dots
  provinces.forEach((d, i) => {
    svg.append('circle')
      .attr('cx', x(d.radio)).attr('cy', y(d.turnout))
      .attr('r', 0)
      .attr('fill', islandColors[d.island] || '#666')
      .attr('opacity', 0.8)
      .attr('stroke', 'white').attr('stroke-width', 1.2)
      .on('mouseover', function (evt) {
        d3.select(this).attr('r', 9).attr('opacity', 1);
        tooltip.classed('visible', true)
          .html(`<strong>${d.name}</strong><br>Radio: ${d.radio}%<br>Turnout: ${d.turnout}%`)
          .style('left', (evt.offsetX + 12) + 'px')
          .style('top', (evt.offsetY - 40) + 'px');
      })
      .on('mouseout', function () {
        d3.select(this).attr('r', 6).attr('opacity', 0.8);
        tooltip.classed('visible', false);
      })
      .transition().delay(i * 30 + 100).duration(400)
      .attr('r', 6);
  });

  // Internet flat line reference
  svg.append('line')
    .attr('x1', x(32)).attr('y1', y(79)).attr('x2', x(70)).attr('y2', y(79))
    .attr('stroke', '#2980B9').attr('stroke-dasharray', '4,4').attr('stroke-width', 1.5).attr('opacity', 0.4);
  svg.append('text').attr('x', x(68)).attr('y', y(79) - 7)
    .attr('text-anchor', 'end').attr('fill', '#2980B9').style('font-size', '10px')
    .style('font-family', 'Inter,sans-serif').style('font-style', 'italic').text('Internet (flat)');

  // Legend
  const islands = [...new Set(provinces.map(d => d.island))];
  const legG = svg.append('g').attr('transform', `translate(${iW + 10}, 10)`);
  islands.forEach((isl, i) => {
    legG.append('circle').attr('cx', 6).attr('cy', i * 18).attr('r', 5).attr('fill', islandColors[isl]);
    legG.append('text').attr('x', 16).attr('y', i * 18 + 4)
      .style('font-size', '9px').style('font-family', 'Inter,sans-serif').attr('fill', '#666').text(isl);
  });
}

// ═══════════════════════════════════════════
// VIZ 5: PARTY MEDIA MATRIX
// ═══════════════════════════════════════════
function drawMatrix(containerId = 'chart-matrix') {
  const container = document.getElementById(containerId);
  if (!container) return;
  const parties = ['PDIP', 'Gerindra', 'PKS', 'Nasdem', 'PKB', 'Demokrat', 'Golkar'];
  const media = ['TV', 'Radio', 'Newspaper', 'Internet', 'Google'];

  // Significance data (value = beta coefficient string or null)
  // Significance data (value = beta coefficient string or null)
  // Fact-checked: Updated significance and coefficients based on Table 4.1, 4.2 & 4.3
  const sigData = {
    PDIP: { TV: null, Radio: null, Newspaper: null, Internet: null, Google: null },
    Gerindra: { TV: null, Radio: null, Newspaper: null, Internet: null, Google: '-0.69*' },
    PKS: { TV: null, Radio: null, Newspaper: null, Internet: null, Google: null },
    Nasdem: { TV: '-0.53*', Radio: null, Newspaper: null, Internet: null, Google: null },
    PKB: { TV: null, Radio: null, Newspaper: null, Internet: null, Google: '-0.54*' },
    Demokrat: { TV: null, Radio: '-0.40*', Newspaper: null, Internet: null, Google: null },
    Golkar: { TV: null, Radio: null, Newspaper: null, Internet: null, Google: null },
  };

  const table = document.createElement('table');
  table.className = 'matrix-table';

  // Header
  const thead = table.createTHead();
  const hrow = thead.insertRow();
  const th0 = document.createElement('th'); th0.textContent = 'Party'; hrow.appendChild(th0);
  media.forEach(m => {
    const th = document.createElement('th');
    th.textContent = m; hrow.appendChild(th);
  });

  // Body
  const tbody = table.createTBody();
  parties.forEach((party, pi) => {
    const row = tbody.insertRow();
    const td0 = row.insertCell(); td0.textContent = party;
    media.forEach((m, mi) => {
      const td = row.insertCell();
      const val = sigData[party][m];
      const cell = document.createElement('div');
      cell.className = 'matrix-cell hidden ' + (val ? 'sig' : 'not-sig');
      cell.textContent = val || '—';
      cell.title = val ? `β=${val}, p<0.05` : 'Not significant';
      td.appendChild(cell);
      setTimeout(() => cell.classList.add('revealed'), (pi * media.length + mi) * 80 + 300);
    });
  });

  container.innerHTML = '';
  container.appendChild(table);
}

// ═══════════════════════════════════════════
// VIZ 6: R² BAR CHART
// ═══════════════════════════════════════════
function drawBars(targetId = 'chart-bars') {
  const el = document.getElementById(targetId);
  if (!el) return;
  // Fixed dimensions for viewBox scaling
  const W = 600;
  const H = 400;
  const M = { top: 20, right: 30, bottom: 80, left: 60 };
  const iW = W - M.left - M.right;
  const iH = H - M.top - M.bottom;

  // Fact-checked: R-squared values from Table 4.4
  const data = [
    { party: 'PDIP', media: 27.1, combined: 83.9 },
    { party: 'Gerindra', media: 32.2, combined: 72.2 },
    { party: 'PKS', media: 36.2, combined: 59.9 },
    { party: 'Nasdem', media: 38.2, combined: 50.8 },
    { party: 'PKB', media: 28.3, combined: 72.7 },
    { party: 'Demokrat', media: 21.4, combined: 34.7 },
  ];

  const svg = d3.select(el).attr('viewBox', `0 0 ${W} ${H}`)
    .append('g').attr('transform', `translate(${M.left},${M.top})`);

  const x0 = d3.scaleBand().domain(data.map(d => d.party)).range([0, iW]).padding(0.28);
  const x1 = d3.scaleBand().domain(['media', 'combined']).range([0, x0.bandwidth()]).padding(0.1);
  const y = d3.scaleLinear().domain([0, 100]).range([iH, 0]);

  svg.append('g').attr('class', 'grid')
    .call(d3.axisLeft(y).ticks(5).tickSize(-iW).tickFormat(''));
  svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${iH})`)
    .call(d3.axisBottom(x0));
  svg.append('g').attr('class', 'axis')
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => d + '%'));

  const colors = { media: '#2C3E50', combined: '#C0392B' };

  data.forEach((d, di) => {
    ['media', 'combined'].forEach((key, ki) => {
      const barH = iH - y(d[key]);
      svg.append('rect')
        .attr('x', x0(d.party) + x1(key))
        .attr('y', iH)
        .attr('width', x1.bandwidth())
        .attr('height', 0)
        .attr('fill', colors[key])
        .attr('rx', 3)
        .attr('opacity', key === 'media' ? 0.65 : 1)
        .transition().delay(di * 100 + ki * 50).duration(700).ease(d3.easeCubicOut)
        .attr('y', y(d[key])).attr('height', barH);

      svg.append('text')
        .attr('x', x0(d.party) + x1(key) + x1.bandwidth() / 2)
        .attr('y', y(d[key]) - 4)
        .attr('text-anchor', 'middle')
        .style('font-family', 'Inter,sans-serif').style('font-size', '9px').style('font-weight', '700')
        .attr('fill', colors[key]).text(d[key] + '%')
        .attr('opacity', 0)
        .transition().delay(di * 100 + ki * 50 + 600).duration(300).attr('opacity', 1);
    });
  });

  // 83.9% annotation
  svg.append('text')
    .attr('x', x0('PDIP') + x1('combined') + x1.bandwidth() / 2).attr('y', y(83.9) - 18)
    .attr('text-anchor', 'middle').attr('fill', '#C0392B')
    .style('font-family', 'Inter,sans-serif').style('font-size', '11px').style('font-weight', '700')
    .text('★').attr('opacity', 0).transition().delay(1000).attr('opacity', 1);

  // Legend
  const legG = svg.append('g').attr('transform', `translate(0,${iH + 50})`);
  [['media', 'Media Only', 0.65], ['combined', 'Combined Model', 1]].forEach(([key, label, op], i) => {
    legG.append('rect').attr('x', i * 130).attr('y', 0).attr('width', 14).attr('height', 10)
      .attr('fill', colors[key]).attr('opacity', op).attr('rx', 2);
    legG.append('text').attr('x', i * 130 + 20).attr('y', 9)
      .style('font-size', '10px').style('font-family', 'Inter,sans-serif')
      .attr('fill', '#666').text(label);
  });
}

// ═══════════════════════════════════════════
// VIZ 7: INDONESIA MAP (ABSTRACT)
// ═══════════════════════════════════════════
function drawMap(containerId = 'chart-map') {
  const container = document.getElementById(containerId);
  if (!container) return;
  const provinces = [
    'Aceh', 'Sumut', 'Sumbar', 'Riau', 'Jambi', 'Sumsel', 'Bengkulu', 'Lampung', 'Bangka', 'Kepri',
    'DKI', 'Jabar', 'Jateng', 'DIY', 'Jatim', 'Banten', 'Bali', 'NTB', 'NTT', 'Kalbar',
    'Kalteng', 'Kalsel', 'Kaltim', 'Kalut', 'Sulut', 'Sulteng', 'Sulsel', 'Sultra', 'Gorontalo', 'Sulbar',
    'Maluku', 'Malut', 'Papua Barat', 'Papua',
  ];
  const rVal = [83, 76, 82, 78, 80, 75, 81, 79, 80, 71, 69, 72, 82, 85, 82, 73, 86, 85, 87, 75, 77, 79, 73, 74, 84, 81, 84, 83, 86, 84, 86, 88, 85, 88];

  const grid = document.createElement('div');
  grid.className = 'map-visual';

  const colorScale = d3.scaleSequential()
    .domain([68, 90])
    .interpolator(d3.interpolateBlues);

  provinces.forEach((p, i) => {
    const cell = document.createElement('div');
    cell.className = 'province-cell';
    cell.style.background = colorScale(rVal[i]);
    cell.style.opacity = '0';
    cell.textContent = p.substring(0, 3).toUpperCase();
    const tip = document.createElement('div');
    tip.className = 'tooltip';
    tip.innerHTML = `<strong>${p}</strong><br>Turnout: ${rVal[i]}%`;
    cell.appendChild(tip);
    setTimeout(() => {
      cell.style.transition = 'opacity 0.4s ease, transform 0.3s ease';
      cell.style.opacity = '1';
    }, i * 40 + 200);
    grid.appendChild(cell);
  });

  // Scale note — frosted badge so text stays readable when overlapping cells
  const note = document.createElement('div');
  note.style.cssText = [
    'position:absolute',
    'right:0',
    'bottom:0',
    'font-family:Inter,sans-serif',
    'font-size:11px',
    'color:#2c3e50',          // darker text for legibility on any background
    'text-align:right',
    'line-height:1.5',
    'padding:5px 8px',
    'border-radius:8px',
    'background:color-mix(in srgb, #f0ede7 70%, transparent)',
    'backdrop-filter:blur(4px)',
    '-webkit-backdrop-filter:blur(4px)',
    // 'box-shadow:-1px -1px 0 rgba(255,255,255,0.4)',
  ].join(';');
  note.innerHTML = '🔵 Darker = Higher Turnout<br>Hover each province for details';

  container.innerHTML = '';
  container.appendChild(grid);
  container.appendChild(note);
}

// ─── MOBILE DETECTION ───────────────────────────
function isMobile() {
  return window.innerWidth <= 900;
}

// ─── MOBILE TAB SYNC ────────────────────────────
// Called by switchViz() (and the observer) to keep the mobile
// tab bar in sync with the currently active viz panel.
function syncMobileTab(vizId) {
  document.querySelectorAll('.mob-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.viz === vizId);
  });
  // Scroll the active tab into view in the tab bar
  const activeTab = document.querySelector(`.mob-tab[data-viz="${vizId}"]`);
  if (activeTab) {
    activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
}

// ─── MOBILE VIZ INIT ────────────────────────────
// Always called (not guarded by isMobile) so event listeners always attach.
// The mobile-only elements are hidden by CSS on desktop so no visual impact.
function initMobileViz() {

  // 1. Tab clicks → scroll to corresponding text section.
  //    The scroll tracker (updateActiveSectionMobile) then fires naturally,
  //    switches the viz panel, and keeps the tab bar in sync.
  document.querySelectorAll('.mob-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const vizId = tab.dataset.viz;
      const section = SECTIONS.find(s => s.vizId === vizId);
      if (!section) return;

      const sectionEl = document.getElementById(section.textId);
      if (sectionEl) {
        // scrollIntoView respects scroll-margin-top set in CSS
        sectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Update URL hash so the user can share/bookmark the position
        history.replaceState(null, '', '#' + section.textId);
      }

      // Immediately highlight the tab without waiting for scroll event
      syncMobileTab(vizId);
      // Also switch viz immediately for instant visual feedback
      switchViz(vizId);
    });
  });

  // 2. Chevron toggle — collapse / expand the viz panels container.
  //    Binding directly; no guard needed.
  const vizColumn = document.getElementById('viz-column');
  const toggleBtn = document.getElementById('viz-toggle');
  if (toggleBtn && vizColumn) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isCollapsing = !vizColumn.classList.contains('viz-collapsed');
      vizColumn.classList.toggle('viz-collapsed');

      // The resize handle sets inline height/minHeight on #viz-panels-container.
      // Inline styles beat class-based CSS, so the .viz-collapsed rules (height:0)
      // would have no effect and leave a large blank area.
      // Fix: zero out inline styles when collapsing; restore saved value on expand.
      const container = document.getElementById('viz-panels-container');
      if (container) {
        if (isCollapsing) {
          // Temporarily override inline styles so CSS .viz-collapsed rules win
          container.style.height = '0';
          container.style.minHeight = '0';
        } else {
          // Restore: apply saved height if one was persisted by the resize handle
          try {
            const saved = parseInt(localStorage.getItem('elec-viz-h'), 10);
            if (!isNaN(saved)) {
              container.style.height = saved + 'px';
              container.style.minHeight = saved + 'px';
            } else {
              // Fall back to CSS-driven height (remove inline styles)
              container.style.height = '';
              container.style.minHeight = '';
            }
          } catch (_) {
            container.style.height = '';
            container.style.minHeight = '';
          }
        }
      }
    });
  }
}

// ─── MOBILE VIZ RESIZE HANDLE ──────────────────────────────
// Lets the user drag the bottom edge of the viz panel area up/down
// to set a preferred height. Saved to localStorage for persistence.
function initVizResize() {
  const handle = document.getElementById('viz-resize-handle');
  const container = document.getElementById('viz-panels-container');
  if (!handle || !container) return;

  // ─ Desktop guard ──────────────────────────────────────────────────────────
  // On desktop, #viz-panels-container uses `position:absolute; inset:0` to fill
  // the full sticky column height. If a mobile-set inline height exists (from a
  // previous mobile session stored in localStorage), CSS will honour the inline
  // height over the inset:0 stretch, breaking the full-height layout.
  // Clear any stale inline styles and exit — no drag listeners needed on desktop.
  if (!isMobile()) {
    container.style.height = '';
    container.style.minHeight = '';
    container.style.transition = '';
    return;
  }

  const VIZ_MIN_H = 300;   // never shrink below this many px
  const VIZ_MAX_RATIO = 0.70;  // never exceed 70 % of viewport height
  const STORAGE_KEY = 'elec-viz-h';

  let dragging = false;
  let startY = 0;
  let startH = 0;

  function clamp(h) {
    return Math.min(Math.round(window.innerHeight * VIZ_MAX_RATIO),
      Math.max(VIZ_MIN_H, h));
  }

  function applyHeight(h, animate) {
    container.style.transition = animate ? '' : 'none';
    container.style.height = h + 'px';
    container.style.minHeight = h + 'px';
  }

  // ─ Restore saved height (mobile only) ────────────────────────────────────
  try {
    const saved = parseInt(localStorage.getItem(STORAGE_KEY), 10);
    if (!isNaN(saved)) applyHeight(clamp(saved), false);
  } catch (_) { }

  // ─ Drag start ──────────────────────────────────────────────────────────────
  handle.addEventListener('pointerdown', (e) => {
    dragging = true;
    startY = e.clientY;
    startH = container.offsetHeight;
    handle.setPointerCapture(e.pointerId);
    handle.classList.add('is-dragging');
    applyHeight(startH, false);
    e.preventDefault();
  });

  // ─ Drag move ───────────────────────────────────────────────────────────────
  handle.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    applyHeight(clamp(startH + (e.clientY - startY)), false);
  });

  // ─ Drag end ────────────────────────────────────────────────────────────────
  function onDragEnd() {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove('is-dragging');
    container.style.transition = '';
    try { localStorage.setItem(STORAGE_KEY, container.offsetHeight); } catch (_) { }
  }
  handle.addEventListener('pointerup', onDragEnd);
  handle.addEventListener('pointercancel', onDragEnd);
}


// ─── INIT ────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const hash = window.location.hash; // e.g. '#section-methodology'

  // Only activate default "context" section if at top and no hash.
  // We mark the panel .active and the section .is-active so the layout is
  // correct on page load, but we do NOT pre-draw the timeline animation here.
  // The IntersectionObserver will call switchViz('viz-context') → initViz when
  // the user scrolls section-context into the active zone (past the hero), so
  // the animation plays fresh and the user can actually watch it.
  if (!hash && window.scrollY < 50) {
    const firstPanel = document.getElementById('viz-context');
    if (firstPanel) firstPanel.classList.add('active');
    // vizInitialized['viz-context'] intentionally NOT set here so the observer
    // triggers drawTimeline() at the right scroll moment instead of on page load.

    const firstSection = document.getElementById(SECTIONS[0].textId);
    if (firstSection) firstSection.classList.add('is-active');
    // On desktop: pre-set _lastActiveSectionId so the IntersectionObserver drives
    // viz-context initialization at the right scroll moment (our observer fix above).
    // On mobile: leave _lastActiveSectionId as null so the scroll tracker fires
    // switchViz('viz-context') on the very first scroll event at section-context,
    // which triggers drawTimeline() correctly. If we pre-set it on mobile the
    // tracker would see no change and skip the switchViz call entirely.
    if (!isMobile()) _lastActiveSectionId = SECTIONS[0].textId;
  }

  // Always init mobile UI (CSS hides it on desktop — no harm binding always)
  initMobileViz();
  initVizResize(); // drag handle to resize viz panel height

  if (isMobile()) {
    // ── Fix 1: Ensure hero fills the viewport on first load ──────────────────
    // Belt-and-suspenders: even with history.scrollRestoration = 'manual' set
    // at the top of this file, some browsers apply scroll restoration *after*
    // the first paint tick.  Force scroll to top in both the current frame AND
    // a short timeout to cover that late-restoration window.
    if (!hash) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      // Fallback: re-assert top position after browser layout may have drifted
      setTimeout(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, 0);
    }

    // Sync mobile tab to first section immediately on mobile
    syncMobileTab(SECTIONS[0].vizId);

    // ── Fix 2: Hash anchor scrolling on mobile ───────────────────────────────
    // The browser's native hash scroll fires before the sticky viz panel has
    // painted and established its real height, so it under-scrolls and the
    // hero section shows instead of the requested section.  We cancel the
    // native scroll and redo it once layout is stable.
    if (hash) {
      // Prevent the browser's own instant-scroll so we can drive it ourselves
      window.scrollTo({ top: 0, behavior: 'instant' });

      // Wait two animation frames for the sticky element to paint, then scroll
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const targetId = hash.slice(1); // strip leading '#'
          const targetEl = document.getElementById(targetId);
          if (!targetEl) return;

          // Height of the sticky viz-column (tab bar + panels) that sits above text
          const vizCol = document.getElementById('viz-column');
          const stickyH = vizCol ? vizCol.offsetHeight : 0;

          // Absolute document-top position of the target section
          const absTop = targetEl.getBoundingClientRect().top + window.scrollY;

          window.scrollTo({ top: Math.max(0, absTop - stickyH), behavior: 'instant' });

          // Activate the matching section and viz
          const matchedSection = SECTIONS.find(s => s.textId === targetId);

          // Always ensure viz-context (timeline) is initialized, so navigating
          // back to the first section doesn't leave a blank chart.
          if (!vizInitialized['viz-context']) {
            vizInitialized['viz-context'] = true;
            drawTimeline();
          }

          if (matchedSection) {
            switchViz(matchedSection.vizId);
            syncMobileTab(matchedSection.vizId);
            updateNavDots(matchedSection.navIndex);
            _lastActiveSectionId = matchedSection.textId;
          }
        });
      });
    }
  }
});

