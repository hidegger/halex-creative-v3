/* ============================================================
   Halex — Creative · hero key visual
   A slow horizontal scroll of Japanese candlesticks (a trading
   terminal tape). Most candles stay quiet in muted slate; a scanner
   periodically "locks" onto a candle, lights it bright mint and runs
   a little computation read-out, then drifts on. Looped, unhurried,
   same palette + tempo as the rest of the hero.
   ============================================================ */
(function () {
  'use strict';
  const canvas = document.getElementById('candleTape');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const MINT = '118,251,204';
  const SLATE = '90,106,130';   // muted candle bodies
  const DIM = '58,70,88';       // very quiet candles

  let W = 0, H = 0, dpr = Math.min(devicePixelRatio || 1, 2);
  function resize() {
    const r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  addEventListener('resize', resize);

  // ---- candle geometry ----
  const STEP = 38;          // px between candle centers
  const BODY_W = 17;        // candle body width
  const SPEED = 8;          // px / second  (slow drift)

  // procedural, continuous price series — sum of sines so it never
  // jumps as candles recycle. Returns a "close" value in [-1, 1]-ish.
  function priceAt(i) {
    return (
      Math.sin(i * 0.10) * 0.55 +
      Math.sin(i * 0.043 + 1.7) * 0.32 +
      Math.sin(i * 0.21 + 0.6) * 0.18 +
      Math.sin(i * 0.017 + 4.1) * 0.6
    );
  }
  // deterministic pseudo-random for wick length / quietness per candle
  function rnd(i) {
    const x = Math.sin(i * 127.1 + 11.3) * 43758.5453;
    return x - Math.floor(x);
  }

  function candle(i) {
    const open = priceAt(i);
    const close = priceAt(i + 1);
    const up = close >= open;
    const span = Math.abs(close - open);
    const wick = 0.12 + rnd(i) * 0.5;
    const hi = Math.max(open, close) + wick * (0.4 + rnd(i + 9) * 0.6);
    const lo = Math.min(open, close) - wick * (0.4 + rnd(i + 3) * 0.6);
    return { open, close, up, hi, lo, span, quiet: rnd(i + 5) < 0.45 };
  }

  // map price value → screen y. amplitude scaled to stage height.
  function priceMap() {
    const cy = H * 0.5;
    const amp = Math.min(H * 0.30, 280);
    return (v) => cy - v * amp;
  }

  // ---- scanner state machine ----
  // locks onto candle indices, holds, then jumps to the next.
  const scan = {
    idx: null, born: 0, hold: 3200, gap: 1300,
    state: 'idle', stateBorn: 0, value: 0, dir: 1,
  };
  // lock only onto candles sitting in the LEFT half of the screen, so the
  // analysis never overlaps the headline / buttons on the right.
  function pickTarget(baseX, now) {
    const targetX = W * (0.17 + rnd(Math.floor(now / 91) + idxSeed++) * 0.18); // 0.17W..0.35W
    const idx = Math.round((targetX - baseX) / STEP);
    scan.idx = idx;
    scan.born = now;
    scan.state = 'lock';
    scan.stateBorn = now;
    const c = candle(idx);
    scan.dir = c.up ? 1 : -1;
    scan.value = (0.04 + rnd(idx + 21) * 1.9);
  }
  let idxSeed = 0;

  // ---- ambient faint glints: a few quiet candles pulse mint softly ----
  function glint(i, now) {
    // slow per-candle shimmer, mostly invisible
    return 0.5 + 0.5 * Math.sin(now * 0.0011 + i * 0.9);
  }

  const t0 = performance.now();
  function frame(now) {
    const elapsed = (now - t0) / 1000;
    const offset = elapsed * SPEED;       // world px scrolled
    ctx.clearRect(0, 0, W, H);

    const yOf = priceMap();
    // anchor: candle 0 starts off the right edge and flows left
    // world x for candle i = baseX + i*STEP - offset
    const baseX = -offset;
    const firstI = Math.floor((-baseX - BODY_W) / STEP) - 1;
    const lastI = Math.ceil((W - baseX + BODY_W) / STEP) + 1;

    // ---- scanner scheduling ----
    if (!reduce) {
      if (scan.state === 'idle' && now - scan.born > scan.gap) {
        pickTarget(baseX, now);
      } else if (scan.state === 'lock' && now - scan.stateBorn > scan.hold) {
        scan.state = 'idle';
        scan.born = now;
      }
      // if the locked candle scrolled off-screen, release early
      if (scan.idx != null && (scan.idx < firstI + 1 || scan.idx > lastI - 1)) {
        scan.state = 'idle'; scan.born = now;
      }
    }

    // baseline mid-line (very faint)
    ctx.strokeStyle = 'rgba(140,151,166,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H * 0.5); ctx.lineTo(W, H * 0.5); ctx.stroke();

    // ---- draw the quiet scrolling tape ----
    let focalX = null, focalC = null;
    for (let i = firstI; i <= lastI; i++) {
      const x = baseX + i * STEP;
      const c = candle(i);

      // the locked candle is drawn large, on top, AFTER the tape
      if (i === scan.idx && scan.state === 'lock') { focalX = x; focalC = c; continue; }

      const yO = yOf(c.open), yC = yOf(c.close);
      const yH = yOf(c.hi), yL = yOf(c.lo);
      const bodyTop = Math.min(yO, yC);
      const bodyH = Math.max(2, Math.abs(yC - yO));

      // edge fade so the tape dissolves at left/right margins
      const ef = Math.max(0, Math.min(1, x / 160, (W - x) / 160));
      const g = glint(i, now);
      const base = c.quiet ? 0.10 : 0.24;
      const alpha = (base + g * (c.quiet ? 0.05 : 0.11)) * ef;
      const col = (rnd(i + 1) < 0.16) ? MINT : (c.quiet ? DIM : SLATE);

      ctx.globalAlpha = 1;
      ctx.strokeStyle = `rgba(${col},${alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, yH); ctx.lineTo(x, yL); ctx.stroke();

      if (c.up) {
        ctx.strokeStyle = `rgba(${col},${Math.min(1, alpha + 0.15)})`;
        ctx.lineWidth = 1.3;
        ctx.strokeRect(x - BODY_W / 2, bodyTop, BODY_W, bodyH);
        ctx.fillStyle = `rgba(${col},${alpha * 0.12})`;
        ctx.fillRect(x - BODY_W / 2, bodyTop, BODY_W, bodyH);
      } else {
        ctx.fillStyle = `rgba(${col},${alpha})`;
        ctx.fillRect(x - BODY_W / 2, bodyTop, BODY_W, bodyH);
      }
    }
    ctx.globalAlpha = 1;

    // ---- the magnified candle under analysis, anchored in the left half ----
    if (focalC) drawFocus(focalX, focalC, yOf, now);

    if (!reduce) raf = requestAnimationFrame(frame);
  }

  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  // The candle the system "locks" onto: blown up to ~half the screen height,
  // sitting in the left half, wrapped in a focus frame with a live read-out.
  function drawFocus(x, c, yOf, now) {
    const appear = easeOut(Math.min(1, (now - scan.stateBorn) / 420));

    // vertical centre: follow the candle's price but clamp so the big candle
    // always fits comfortably inside the stage
    const yMid = Math.max(H * 0.40, Math.min(H * 0.56, yOf((c.hi + c.lo) / 2)));
    const wickHalf = (H * 0.235) * appear;      // total ≈ 47% of stage height
    const bodyHalf = wickHalf * 0.46;
    const bodyW = Math.max(38, W * 0.028);
    const up = c.up;

    ctx.save();

    // big candle — bright mint, glowing
    ctx.shadowColor = `rgba(${MINT},0.85)`;
    ctx.shadowBlur = 26;
    ctx.strokeStyle = `rgba(${MINT},0.95)`;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(x, yMid - wickHalf); ctx.lineTo(x, yMid + wickHalf); ctx.stroke();

    if (up) {
      ctx.lineWidth = 2.6;
      ctx.strokeRect(x - bodyW / 2, yMid - bodyHalf, bodyW, bodyHalf * 2);
      ctx.shadowBlur = 0;
      ctx.fillStyle = `rgba(${MINT},0.16)`;
      ctx.fillRect(x - bodyW / 2, yMid - bodyHalf, bodyW, bodyHalf * 2);
    } else {
      ctx.fillStyle = `rgba(${MINT},0.92)`;
      ctx.fillRect(x - bodyW / 2, yMid - bodyHalf, bodyW, bodyHalf * 2);
      ctx.shadowBlur = 0;
    }

    // focus frame — big, occupies the left portion of the screen
    const fw = Math.min(W * 0.22, 360);          // frame half-width-ish
    const left = x - fw * 0.5, right = x + fw * 0.5;
    const top = yMid - wickHalf - 34, bot = yMid + wickHalf + 34;
    const br = 22;                                // bracket arm length

    ctx.globalAlpha = appear;
    ctx.strokeStyle = `rgba(${MINT},0.85)`;
    ctx.lineWidth = 1.6;
    ctx.shadowColor = `rgba(${MINT},0.5)`;
    ctx.shadowBlur = 10;
    const corners = [
      [left, top, 1, 1], [right, top, -1, 1],
      [left, bot, 1, -1], [right, bot, -1, -1],
    ];
    for (const [cx, cy, sx, sy] of corners) {
      ctx.beginPath();
      ctx.moveTo(cx + sx * br, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + sy * br);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // sweeping computation line inside the frame
    const sweepY = top + ((now * 0.16) % (bot - top));
    ctx.strokeStyle = `rgba(${MINT},0.4)`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(left + 4, sweepY); ctx.lineTo(right - 4, sweepY); ctx.stroke();

    // crosshair tick on the close price (body edge of the magnified candle)
    ctx.fillStyle = `rgba(${MINT},0.95)`;
    ctx.beginPath(); ctx.arc(x, yMid - bodyHalf * (up ? 1 : -1), 3, 0, Math.PI * 2); ctx.fill();

    // read-out chip above the frame
    const lbl = (scan.dir > 0 ? '▲ +' : '▼ −') + scan.value.toFixed(2) + '%';
    ctx.font = '500 15px "JetBrains Mono", monospace';
    const tw = ctx.measureText(lbl).width;
    const lx = x - tw / 2, ly = top - 30;
    ctx.fillStyle = 'rgba(8,12,16,0.88)';
    ctx.fillRect(lx - 11, ly - 16, tw + 22, 26);
    ctx.strokeStyle = `rgba(${MINT},0.5)`;
    ctx.lineWidth = 1;
    ctx.strokeRect(lx - 11, ly - 16, tw + 22, 26);
    ctx.fillStyle = `rgba(${MINT},0.96)`;
    ctx.fillText(lbl, lx, ly + 3);

    // typing caption below the frame
    const cap = 'ANALYSING';
    const shown = cap.slice(0, Math.max(0, Math.floor(appear * cap.length)));
    ctx.font = '500 11px "JetBrains Mono", monospace';
    ctx.fillStyle = `rgba(${MINT},0.6)`;
    ctx.fillText(shown, x - 30, bot + 22);

    ctx.restore();
  }

  let raf;
  frame(performance.now());            // initial synchronous paint
  if (!reduce) raf = requestAnimationFrame(frame);
})();
