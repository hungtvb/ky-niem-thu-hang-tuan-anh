(() => {
'use strict';

/* ===== Một Đêm Trong Thành Phố — máy trạng thái theo cảnh =====
   0 phố mở (tựa) → 1 café → 2 phòng tranh → 3 phố mưa → 4 cầu kính (lặng) → 5 rooftop (đỉnh + thư)
   Mỗi cảnh: chạm vào biển hiệu của chính cảnh đó để thắp sáng câu chúc, rồi camera lia sang cảnh kế. */

const track = document.getElementById('track');
const fill = document.getElementById('progressFill');
const bgm = document.getElementById('bgm');
const letterEl = document.getElementById('letter');
const muteBtn = document.getElementById('mute');
const icoOn = document.getElementById('ico-on');
const icoOff = document.getElementById('ico-off');
const titleCard = document.getElementById('titleCard');
const lampPulse = document.getElementById('lampPulse');
const bridgePulse = document.getElementById('bridgePulse');
const replayBtn = document.getElementById('replay');

const LAST = 5;
const HOLD_AFTER_LIT = { 1: 2100, 2: 2100, 3: 2100, 4: 3400 }; // cảnh 4 là nhịp lặng: giữ lâu hơn

let idx = 0;
let started = false;
let armedAt = performance.now();      // mốc cho phép chạm (chống chạm nhầm khi đang lia cảnh)
let litState = [false, false, false, false, false, false];
let letterShown = false;
let advancing = false;

function goTo(i) {
  idx = i;
  track.style.transform = `translateX(${-i * (100 / 6)}%)`;
  fill.style.width = (i / LAST * 100) + '%';
  armedAt = performance.now() + 1000; // lia cảnh 1,5s — chỉ nhận chạm sau 1s
}

function startMusic() {
  if (started) return;
  started = true;
  bgm.volume = 0.9;
  const p = bgm.play();
  if (p && p.catch) p.catch(() => {});
}

function lightSign(sceneIdx) {
  if (litState[sceneIdx]) return;
  litState[sceneIdx] = true;
  const sign = document.getElementById('sign' + sceneIdx);
  if (sign) sign.classList.add('lit');
  if (sceneIdx === 2) document.getElementById('galleryOn').classList.add('on');
  if (sceneIdx === 4 && bridgePulse) bridgePulse.classList.add('gone');
  if (sceneIdx === 5) {
    setTimeout(showLetter, 3100);
    return;
  }
  advancing = true;
  setTimeout(() => { advancing = false; goTo(sceneIdx + 1); }, HOLD_AFTER_LIT[sceneIdx] || 2100);
}

function showLetter() {
  letterShown = true;
  const ch = document.querySelector('[data-scene="5"] .chapter');
  if (ch) ch.style.opacity = '0';
  letterEl.classList.add('show');
  letterEl.setAttribute('aria-hidden', 'false');
  replayBtn.classList.add('show');
}

function restart() {
  litState = [false, false, false, false, false, false];
  letterShown = false;
  document.querySelectorAll('.sign.lit').forEach(s => s.classList.remove('lit'));
  document.getElementById('galleryOn').classList.remove('on');
  letterEl.classList.remove('show');
  const ch = document.querySelector('[data-scene="5"] .chapter');
  if (ch) ch.style.opacity = '';
  letterEl.setAttribute('aria-hidden', 'true');
  replayBtn.classList.remove('show');
  if (bridgePulse) bridgePulse.classList.remove('gone');
  goTo(1); // nhạc giữ nguyên, tựa không hiện lại
}

document.querySelectorAll('.hotspot').forEach(h => {
  h.addEventListener('click', () => {
    if (performance.now() < armedAt || advancing) return;
    const sceneEl = h.closest('.scene');
    const sceneIdx = Number(sceneEl.dataset.scene);
    if (sceneIdx !== idx) return;
    if (h.dataset.hotspot === 'open') {
      startMusic();
      titleCard.classList.add('gone');
      lampPulse.classList.add('gone');
      advancing = true;
      setTimeout(() => { advancing = false; goTo(1); }, 650);
    } else {
      lightSign(sceneIdx);
    }
  });
});

replayBtn.addEventListener('click', (e) => { e.stopPropagation(); restart(); });

muteBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  bgm.muted = !bgm.muted;
  icoOn.style.display = bgm.muted ? 'none' : '';
  icoOff.style.display = bgm.muted ? '' : 'none';
});

/* Hooks phục vụ kiểm thử tự động — không ảnh hưởng trải nghiệm */
window.__gift = {
  get idx() { return idx; },
  get lit() { return litState.slice(); },
  get letterShown() { return letterShown; },
  get started() { return started; },
  start() { startMusic(); titleCard.classList.add('gone'); lampPulse.classList.add('gone'); goTo(1); },
  tapSign() { if (idx >= 1) lightSign(idx); },
  goto(i) { goTo(i); },
  restart
};
})();
