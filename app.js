(() => {
'use strict';

/* ============ setup ============ */
const canvas = document.getElementById('sky');
const ctx = canvas.getContext('2d');
const bgm = document.getElementById('bgm');
const letterEl = document.getElementById('letter');
const muteBtn = document.getElementById('mute');
const icoOn = document.getElementById('ico-on');
const icoOff = document.getElementById('ico-off');

let W = 0, H = 0, bgGrad = null;
const T0 = performance.now();
const now = () => (performance.now() - T0) / 1000;

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#05081a'); bgGrad.addColorStop(0.55, '#0d1230'); bgGrad.addColorStop(1, '#140f2c');
}
window.addEventListener('resize', resize);
resize();

/* ============ sprites ============ */
function glowSprite(r, g, b) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.18, `rgba(${r},${g},${b},0.85)`);
  gr.addColorStop(0.45, `rgba(${r},${g},${b},0.28)`);
  gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  return c;
}
function softDot() {
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const x = c.getContext('2d');
  const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 32, 32);
  return c;
}
function sharpStar() {
  const c = document.createElement('canvas'); c.width = c.height = 48;
  const x = c.getContext('2d');
  x.translate(24, 24); x.fillStyle = 'rgba(255,255,255,1)';
  x.beginPath();
  x.moveTo(0, -11); x.quadraticCurveTo(1.6, -1.6, 11, 0); x.quadraticCurveTo(1.6, 1.6, 0, 11);
  x.quadraticCurveTo(-1.6, 1.6, -11, 0); x.quadraticCurveTo(-1.6, -1.6, 0, -11);
  x.fill();
  const gr = x.createRadialGradient(0, 0, 0, 0, 0, 24);
  gr.addColorStop(0, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(-24, -24, 48, 48);
  return c;
}
const SPR = {
  rose: glowSprite(255, 150, 185), silver: glowSprite(190, 208, 255),
  gold: glowSprite(245, 207, 138), white: glowSprite(235, 240, 255),
  dot: softDot(), sharp: sharpStar()
};
function drawGlow(sprite, x, y, size, alpha) {
  ctx.globalAlpha = alpha;
  ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
  ctx.globalAlpha = 1;
}

/* ============ starfield ============ */
const stars = [];
(function initStars() {
  const N = Math.min(760, Math.round(120000 / 160));
  for (let i = 0; i < N; i++) {
    const zr = Math.random();
    stars.push({
      fx: Math.random(), fy: Math.random(),
      z: zr < 0.55 ? 0.25 : (zr < 0.85 ? 0.55 : 1.0),
      r: 0.7 + Math.random() * 1.5,
      ph: Math.random() * Math.PI * 2, sp: 0.4 + Math.random() * 1.1
    });
  }
})();

/* ============ zones & wishes ============ */
const WISHES = ['Giữa triệu người', 'Tìm thấy nhau là duyên', 'Giữ nhau là phúc', 'Bên nhau là nhà'];
const zones = [
  { fx: 0.23, fy: 0.27 }, { fx: 0.76, fy: 0.22 }, { fx: 0.78, fy: 0.64 }, { fx: 0.24, fy: 0.68 }
].map((z, i) => {
  const cl = [];
  for (let k = 0; k < 24; k++) {
    const a = Math.random() * Math.PI * 2, d = 12 + Math.random() * 52;
    cl.push({ dx: Math.cos(a) * d, dy: Math.sin(a) * d * 0.82, r: 0.8 + Math.random() * 1.6, ph: Math.random() * 6.28 });
  }
  return { ...z, i, lit: false, litAt: 0, cluster: cl };
});
let wishFx = null; // {text, x, y, t0}

/* ============ particles ============ */
const parts = [];
function spawn(o) { if (parts.length < 900) parts.push(Object.assign({ life: 0 }, o)); }
function burst(x, y, n, sprites, speed, size, life, grav) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = (0.25 + Math.random() * 0.75) * speed;
    spawn({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.12,
      max: life * (0.6 + Math.random() * 0.7), size: size * (0.6 + Math.random() * 0.8),
      spr: sprites[(Math.random() * sprites.length) | 0], grav: grav || 0, drag: 1.6, sway: 0
    });
  }
}

/* ============ state ============ */
const MID = () => ({ x: W / 2, y: Math.min(H * 0.38, H * 0.945 - 433) });
const S = {
  phase: 'OPEN', phaseAt: 0,
  seeker: { x: W / 2, y: H * 0.46 }, target: null,
  second: { x: 0, y: 0, alpha: 0 }, hold: 0, holding: false,
  burstDone: false, nextFw: 0, musicStarted: false
};
function setPhase(p) { S.phase = p; S.phaseAt = now(); }

/* ============ music ============ */
function startMusic() {
  if (S.musicStarted) return; S.musicStarted = true;
  bgm.play().catch(() => {});
}
muteBtn.addEventListener('click', () => {
  startMusic();
  bgm.muted = !bgm.muted;
  icoOn.style.display = bgm.muted ? 'none' : '';
  icoOff.style.display = bgm.muted ? '' : 'none';
});

/* ============ flow ============ */
function beginSearch() { setPhase('SEARCH'); S.target = null; }
function toMeet() {
  setPhase('MEET');
  S.second.x = W * 0.9; S.second.y = H * 0.2; S.second.alpha = 0; S.hold = 0;
}
function restart() {
  zones.forEach(z => { z.lit = false; });
  wishFx = null; S.hold = 0; S.burstDone = false;
  S.seeker.x = W / 2; S.seeker.y = H * 0.46; S.target = null;
  letterEl.classList.remove('show');
  setPhase('OPEN');
}

canvas.addEventListener('pointerdown', e => {
  startMusic();
  const x = e.clientX, y = e.clientY;
  if (S.phase === 'OPEN') {
    if (Math.hypot(x - S.seeker.x, y - S.seeker.y) < 120) beginSearch();
  } else if (S.phase === 'SEARCH') {
    S.target = { x, y };
  } else if (S.phase === 'MEET') {
    S.holding = true;
  } else if (S.phase === 'FINALE' && now() - S.phaseAt > 3) {
    const m = MID();
    if (Math.hypot(x - m.x, y - m.y) < 160) restart();
  }
});
canvas.addEventListener('pointermove', e => {
  if (S.phase === 'SEARCH' && e.buttons) S.target = { x: e.clientX, y: e.clientY };
});
window.addEventListener('pointerup', () => { S.holding = false; });
window.addEventListener('pointercancel', () => { S.holding = false; });

/* ============ helpers ============ */
const clamp01 = v => Math.max(0, Math.min(1, v));
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeInOut = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
function lubDub(t) {
  const s = (t % 1.15) / 1.15;
  const g = (c, w) => Math.exp(-Math.pow((s - c) / w, 2));
  return g(0.03, 0.09) + 0.55 * g(0.30, 0.07);
}
function drawSpaced(text, cx, cy, spacing) {
  const widths = [...text].map(ch => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
  let x = cx - total / 2;
  const prev = ctx.textAlign; ctx.textAlign = 'left';
  [...text].forEach((ch, i) => { ctx.fillText(ch, x, cy); x += widths[i] + spacing; });
  ctx.textAlign = prev;
}

/* ============ update ============ */
function update(dt, t) {
  // particles age on real time so slow devices do not accumulate them
  const pdt = rawDt;
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.life += pdt;
    if (p.life >= p.max) { parts.splice(i, 1); continue; }
    const d = Math.exp(-p.drag * pdt);
    p.vx *= d; p.vy = p.vy * d + p.grav * pdt;
    p.x += p.vx * pdt + (p.sway ? Math.sin(t * 2.2 + p.ph) * p.sway * pdt : 0);
    p.y += p.vy * pdt;
  }

  if (S.phase === 'SEARCH') {
    if (S.target) {
      const dx = S.target.x - S.seeker.x, dy = S.target.y - S.seeker.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 2) {
        const step = Math.min(dist, rawDt * 340 * (0.35 + dist / 160));
        S.seeker.x += dx / dist * step; S.seeker.y += dy / dist * step;
      }
      if (Math.random() < rawDt * 34) {
        spawn({ x: S.seeker.x + (Math.random() - 0.5) * 10, y: S.seeker.y + (Math.random() - 0.5) * 10, vx: (Math.random() - 0.5) * 14, vy: 8 + Math.random() * 16, max: 0.5 + Math.random() * 0.35, size: 9 + Math.random() * 10, spr: SPR.rose, grav: 6, drag: 0.6, sway: 0, ph: Math.random() * 6.28 });
      }
    }
    zones.forEach(z => {
      if (z.lit) return;
      const zx = z.fx * W, zy = z.fy * H;
      if (Math.hypot(S.seeker.x - zx, S.seeker.y - zy) < 76) {
        z.lit = true; z.litAt = t;
        burst(zx, zy, 20, [SPR.rose, SPR.gold, SPR.white], 120, 16, 0.8, 26);
        wishFx = { text: WISHES[z.i], x: zx, y: Math.max(84, zy - 66), t0: t };
        if (zones.every(q => q.lit)) setTimeout(() => { if (S.phase === 'SEARCH') toMeet(); }, 1500);
      }
    });
  }

  if (S.phase === 'MEET') {
    S.second.alpha = Math.min(1, S.second.alpha + rawDt / 1.2);
    S.hold = clamp01(S.hold + (S.holding ? rawDt / 2.4 : -rawDt / 7));
    const m = MID(), e = easeInOut(S.hold);
    const sx = m.x - 54, sy = m.y, ex = m.x + 54, ey = m.y;
    S.seeker.x += (sx - S.seeker.x) * Math.min(1, rawDt * 2.2);
    S.seeker.y += (sy - S.seeker.y) * Math.min(1, rawDt * 2.2);
    S.second.x += ((W * 0.9 + (ex - W * 0.9) * e) - S.second.x) * Math.min(1, rawDt * 3);
    S.second.y += ((H * 0.2 + (ey - H * 0.2) * e) - S.second.y) * Math.min(1, rawDt * 3);
    if (S.hold >= 1) { setPhase('CLIMAX'); S.burstDone = false; }
  }

  if (S.phase === 'CLIMAX') {
    const e = t - S.phaseAt, m = MID();
    if (e < 1.25) {
      const a = e * 4.6, r = 96 - 70 * (e / 1.25);
      S.seeker.x = m.x + Math.cos(a) * r; S.seeker.y = m.y + Math.sin(a) * r * 0.9;
      S.second.x = m.x - Math.cos(a) * r; S.second.y = m.y - Math.sin(a) * r * 0.9;
      if (Math.random() < 0.7) spawn({ x: S.seeker.x, y: S.seeker.y, vx: 0, vy: 0, max: 0.4, size: 20, spr: SPR.rose, grav: 0, drag: 0, sway: 0, ph: 0 });
    } else if (!S.burstDone) {
      S.burstDone = true;
      burst(m.x, m.y, 120, [SPR.rose, SPR.gold, SPR.white, SPR.silver], 280, 19, 1.15, 60);
      S.nextFw = t + 0.4;
    }
    if (S.burstDone && e < 6.5 && t > S.nextFw) {
      S.nextFw = t + 0.45 + Math.random() * 0.3;
      burst(W * (0.12 + Math.random() * 0.76), H * (0.08 + Math.random() * 0.3), 16, [SPR.gold, SPR.rose, SPR.white], 120, 12, 0.85, 46);
    }
    if (e > 3.9) { setPhase('FINALE'); letterEl.classList.add('show'); }
  }

  if (S.phase === 'FINALE') {
    if (Math.random() < dt * 2.4) {
      spawn({ x: Math.random() * W, y: -12, vx: 0, vy: 24 + Math.random() * 30, max: 5.5, size: 12 + Math.random() * 15, spr: Math.random() < 0.5 ? SPR.white : SPR.gold, grav: 2, drag: 0.05, sway: 14, ph: Math.random() * 6.28 });
    }
  }
}

/* ============ draw ============ */
function drawOrb(x, y, sprite, base, t, alpha) {
  const p = lubDub(t);
  const s = base * (1 + 0.13 * p);
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(sprite, x, y, s * 3.9, (0.5 + 0.28 * p) * alpha);
  drawGlow(SPR.white, x, y, s * 1.05, 0.9 * alpha);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = alpha;
  ctx.beginPath(); ctx.arc(x, y, s * 0.30, 0, 6.2832);
  ctx.fillStyle = '#fff'; ctx.fill(); ctx.globalAlpha = 1;
}

function drawRings(cx, cy, form, t, withNames) {
  const R = 88 * form, off = 54 * form;
  if (R < 2) return;
  const pulse = 1 + 0.012 * Math.sin(t * 0.9);
  ctx.save();
  ctx.globalAlpha = form;
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(SPR.gold, cx - off, cy, R * 2.6, 0.20 * form);
  drawGlow(SPR.rose, cx + off, cy, R * 2.6, 0.17 * form);
  ctx.globalCompositeOperation = 'source-over';
  ctx.lineWidth = 3; ctx.shadowBlur = 16; ctx.shadowColor = 'rgba(245,207,138,0.9)';
  ctx.strokeStyle = '#f7d774';
  ctx.beginPath(); ctx.arc(cx - off, cy, R * pulse, 0, 6.2832); ctx.stroke();
  ctx.strokeStyle = '#ffb3c8'; ctx.shadowColor = 'rgba(255,150,185,0.9)';
  ctx.beginPath(); ctx.arc(cx + off, cy, R * pulse, 0, 6.2832); ctx.stroke();
  // weave: redraw one arc of the gold ring over the rose ring at the top crossing
  const iy = Math.sqrt(Math.max(0, R * R - off * off));
  ctx.strokeStyle = '#f7d774'; ctx.shadowColor = 'rgba(245,207,138,0.9)';
  ctx.beginPath(); ctx.arc(cx - off, cy, R * pulse, Math.atan2(-iy, off) - 0.42, Math.atan2(-iy, off) + 0.42); ctx.stroke();
  ctx.restore();
  if (withNames > 0) {
    ctx.save(); ctx.globalAlpha = withNames; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowBlur = 8; ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.fillStyle = '#fff3f6';
    const fit = (text) => {
      let s = 26;
      ctx.font = `700 ${s}px DancingScript, cursive`;
      while (ctx.measureText(text).width > 100 && s > 14) { s -= 1; ctx.font = `700 ${s}px DancingScript, cursive`; }
    };
    fit('Thu Hằng'); ctx.fillText('Thu Hằng', cx - off, cy + 1);
    fit('Tuấn Anh'); ctx.fillText('Tuấn Anh', cx + off, cy + 1);
    ctx.restore();
  }
}

function draw(t) {
  ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, W, H);
  // nebula washes
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(SPR.rose, W * 0.82, H * 0.14, Math.max(W, H) * 0.9, 0.05);
  drawGlow(SPR.silver, W * 0.1, H * 0.86, Math.max(W, H) * 0.8, 0.04);
  ctx.globalCompositeOperation = 'source-over';

  // stars with parallax from seeker offset
  const px = (S.seeker.x - W / 2) / W, py = (S.seeker.y - H / 2) / H;
  for (const s of stars) {
    const a = 0.25 + 0.75 * Math.abs(Math.sin(t * s.sp + s.ph));
    const x = s.fx * W - px * s.z * 14, y = s.fy * H - py * s.z * 14;
    if (s.z === 1.0) { drawGlow(SPR.sharp, x, y, 11 * s.r, a * 0.8); }
    else { drawGlow(SPR.dot, x, y, (s.z === 0.55 ? 5.5 : 4) * s.r, a * (s.z === 0.55 ? 0.6 : 0.45)); }
  }

  // zones
  const activeIdx = zones.findIndex(z => !z.lit);
  zones.forEach((z, i) => {
    const zx = z.fx * W, zy = z.fy * H;
    ctx.globalCompositeOperation = 'lighter';
    z.cluster.forEach(c => {
      const tw = 0.5 + 0.5 * Math.sin(t * 1.7 + c.ph);
      const alpha = z.lit ? 0.42 + 0.33 * tw : (i === activeIdx && S.phase === 'SEARCH' ? 0.30 + 0.30 * tw : 0.16 + 0.14 * tw);
      drawGlow(z.lit ? SPR.gold : SPR.white, zx + c.dx, zy + c.dy, c.r * 4.4, alpha);
    });
    if (i === activeIdx && S.phase === 'SEARCH') {
      const rr = 62 + 10 * Math.sin(t * 2.0);
      ctx.globalAlpha = 0.16 + 0.10 * Math.sin(t * 2.0);
      ctx.beginPath(); ctx.arc(zx, zy, rr, 0, 6.2832);
      ctx.strokeStyle = '#ffd9a0'; ctx.lineWidth = 1.4; ctx.stroke(); ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = 'source-over';
  });

  // particles
  ctx.globalCompositeOperation = 'lighter';
  for (const p of parts) {
    const a = Math.sin(Math.PI * Math.min(1, p.life / p.max));
    drawGlow(p.spr, p.x, p.y, p.size * 2.2, a * 0.85);
  }
  ctx.globalCompositeOperation = 'source-over';

  const m = MID();
  if (S.phase === 'OPEN') {
    // halo invitation ring
    const rr = 54 + 12 * Math.sin(t * 1.4);
    ctx.save(); ctx.globalAlpha = 0.20 + 0.10 * Math.sin(t * 1.4);
    ctx.beginPath(); ctx.arc(S.seeker.x, S.seeker.y, rr, 0, 6.2832);
    ctx.strokeStyle = '#ffd9a0'; ctx.lineWidth = 1.4; ctx.stroke(); ctx.restore();
    drawOrb(S.seeker.x, S.seeker.y, SPR.rose, 30, t, 1);
  } else if (S.phase === 'SEARCH') {
    drawOrb(S.seeker.x, S.seeker.y, SPR.rose, 26, t, 1);
  } else if (S.phase === 'MEET') {
    // progress ring around the midpoint
    ctx.save();
    ctx.beginPath(); ctx.arc(m.x, m.y, 86, 0, 6.2832);
    ctx.strokeStyle = 'rgba(255,233,242,0.14)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(m.x, m.y, 86, -Math.PI / 2, -Math.PI / 2 + S.hold * 6.2832);
    ctx.strokeStyle = '#f5cf8a'; ctx.lineWidth = 2.6; ctx.shadowBlur = 10; ctx.shadowColor = 'rgba(245,207,138,0.8)'; ctx.stroke();
    ctx.restore();
    drawOrb(S.seeker.x, S.seeker.y, SPR.rose, 26, t, 1);
    drawOrb(S.second.x, S.second.y, SPR.silver, 26, t, S.second.alpha);
  } else if (S.phase === 'CLIMAX' || S.phase === 'FINALE') {
    const e = S.phase === 'CLIMAX' ? t - S.phaseAt : 99;
    if (S.phase === 'CLIMAX' && e < 1.25) {
      drawOrb(S.seeker.x, S.seeker.y, SPR.rose, 24, t, 1);
      drawOrb(S.second.x, S.second.y, SPR.silver, 24, t, 1);
    } else {
      const form = S.phase === 'FINALE' ? 1 : easeOut(clamp01((e - 1.25) / 1.3));
      const flash = S.phase === 'CLIMAX' ? Math.max(0, 1 - (e - 1.25) / 0.7) : 0;
      if (flash > 0) { ctx.globalCompositeOperation = 'lighter'; drawGlow(SPR.white, m.x, m.y, Math.max(W, H) * 1.05, flash * 0.32); ctx.globalCompositeOperation = 'source-over'; }
      const nameA = S.phase === 'FINALE' ? 1 : clamp01((e - 2.3) / 1.0);
      drawRings(m.x, m.y, form, t, nameA);
      if (nameA > 0) {
        const dateA = S.phase === 'FINALE' ? 1 : clamp01((e - 2.9) / 0.9);
        ctx.save(); ctx.globalAlpha = dateA * nameA; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '600 14px PlayfairDisplay, serif'; ctx.fillStyle = '#ffe9f2';
        try { ctx.letterSpacing = '4px'; } catch (err) {}
        ctx.fillText('KỶ NIỆM NGÀY CƯỚI · 01.11', m.x, m.y + 128);
        ctx.restore();
      }
      if (S.phase === 'FINALE') {
        // two small lights orbit each other forever, top corner
        const cx = W * 0.84, cy = H * 0.12, a = t * 1.05;
        drawGlow(SPR.rose, cx + Math.cos(a) * 15, cy + Math.sin(a) * 15, 34, 0.8);
        drawGlow(SPR.silver, cx - Math.cos(a) * 15, cy - Math.sin(a) * 15, 30, 0.8);
      }
    }
  }
  // wish text drawn last so it always stays readable
  if (wishFx) {
    const age = t - wishFx.t0;
    if (age > 4.3) wishFx = null;
    else {
      const a = age < 0.6 ? age / 0.6 : (age > 3.4 ? 1 - (age - 3.4) / 0.9 : 1);
      ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '600 32px DancingScript, cursive';
      const tw = ctx.measureText(wishFx.text).width;
      const cx = Math.max(tw / 2 + 12, Math.min(W - tw / 2 - 12, wishFx.x));
      ctx.shadowBlur = 6; ctx.shadowColor = 'rgba(8,3,16,0.9)';
      ctx.fillStyle = 'rgba(16,6,22,0.55)';
      ctx.fillText(wishFx.text, cx, wishFx.y + 2);
      ctx.shadowBlur = 14; ctx.shadowColor = 'rgba(255,150,185,0.85)';
      ctx.fillStyle = '#ffe9f2';
      ctx.fillText(wishFx.text, cx, wishFx.y);
      ctx.restore();
    }
  }
}

/* ============ loop ============ */
let last = now(), rawDt = 0;
function frame() {
  const t = now();
  rawDt = Math.min(0.25, t - last);
  const dt = Math.min(0.05, t - last); last = t;
  update(dt, t);
  draw(t);
  requestAnimationFrame(frame);
}
if (document.fonts && document.fonts.load) {
  document.fonts.load('700 29px DancingScript'); document.fonts.load('600 31px DancingScript'); document.fonts.load('600 14px PlayfairDisplay');
}
requestAnimationFrame(frame);

/* ============ test hooks ============ */
window.__gift = {
  phase: () => S.phase,
  zonesLit: () => zones.filter(z => z.lit).length,
  seeker: () => ({ x: Math.round(S.seeker.x), y: Math.round(S.seeker.y) }),
  zonePos: i => ({ x: Math.round(zones[i].fx * W), y: Math.round(zones[i].fy * H) }),
  start: () => { startMusic(); if (S.phase === 'OPEN') beginSearch(); },
  setTarget: (x, y) => { S.target = { x, y }; },
  hold: b => { S.holding = !!b; },
  holdVal: () => Math.round(S.hold * 100) / 100,
  skipToMeet: () => { zones.forEach(z => z.lit = true); toMeet(); },
  letterShown: () => letterEl.classList.contains('show'),
  wish: () => wishFx ? { text: wishFx.text, age: Math.round((now() - wishFx.t0) * 10) / 10 } : null,
  place: (x, y) => { S.seeker.x = x; S.seeker.y = y; },
  restart: () => restart()
};
})();
