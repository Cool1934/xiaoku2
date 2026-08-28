// ========== 在这里添加你的音乐文件 ==========
const MUSIC_FILES = [
  { file: '解散名门.mp3', title: '解散名门', artist: '鹿崽' },
  { file: '战火燃烧(压声版).mp3', title: '战火燃烧(压声版)', artist: 'ku小酷', lyricFile:'战火燃烧(压声版).lrc' },
  { file: '解散四个家族_缩混.mp3', title: '解散四个家族', artist: 'ku小酷', lyricFile:'解散四个家族.lrc' },
  { file: '谢谢有你.mp3', title: '谢谢有你', artist: '豌拜集团', lyricFile:'小酷输出 1.lrc' },
  { file: '酷王（超然版）.mp3', title: '酷王（超然版）', artist: 'ku小酷', lyricFile:'酷王（超然版）.lrc' },
  { file: '御剑挥刀在出战(超燃版).mp3', title: '御剑挥刀在出战(超燃版)', artist: '夜魔', lyricFile:'御剑挥刀在出战(超燃版).lrc' },
  // 继续加... 格式: { file: 'music/xxx.mp3', title: '歌名', artist: '歌手'}
  // 歌词可选: lyric:'[mm:ss]文本\n...' 或 lyricFile:'music/xxx.lrc'
];
// ==========================================

const audio = new Audio();
audio.preload = 'auto';

let currentIndex = 0;
let isPlaying = false;
let shuffleMode = false;
let loopMode = false;
let playPending = false;   // 缓冲守卫：等待 canplay 后自动播
let userPreloadMode = 'auto'; // auto | full | stream（用户手动选择）
let lastBufferEval = 0;

// DOM
const playBtn   = document.getElementById('play');
const prevBtn   = document.getElementById('prev');
const nextBtn   = document.getElementById('next');
const shuffleBtn= document.getElementById('shuffle');
const loopBtn   = document.getElementById('loop');
const progress  = document.getElementById('progress');
const volumeSlider = document.getElementById('volume');
const titleEl   = document.getElementById('title');
const artistEl  = document.getElementById('artist');
const vinyl     = document.getElementById('vinyl');
const playlistEl= document.getElementById('playlist');
const searchEl  = document.getElementById('search');
const lyricPanel= document.getElementById('lyric-panel');
const statusEl  = document.getElementById('status');
const bufferBar = document.getElementById('buffer-bar');
const bufferFill= document.getElementById('buffer-bar-fill');
const bufferText= document.getElementById('buffer-bar-text');
const bufferedBadge = document.getElementById('buffered-badge');
const bufferedText  = document.getElementById('buffered-text');
const tooltipEl     = document.getElementById('progress-tooltip');
const preloadSwitch = document.getElementById('preload-switch');
const preloadOpts   = preloadSwitch.querySelectorAll('.preload-options span');

// ---------- 工具 ----------
function formatTime(s) {
  if (!isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function setStatus(msg, kind) {
  if (!msg) { statusEl.classList.remove('visible'); statusEl.textContent = ''; return; }
  statusEl.textContent = msg;
  statusEl.className = 'status visible' + (kind ? ' ' + kind : '');
}

// ---------- 预加载模式 ----------
function applyPreloadMode(mode) {
  userPreloadMode = mode;
  preloadSwitch.dataset.mode = mode;
  preloadOpts.forEach(o => o.classList.toggle('active', o.dataset.mode === mode));
  if (mode === 'full') {
    audio.preload = 'auto';
    setStatus('已切换为「全量预加载」模式', 'info');
  } else if (mode === 'stream') {
    audio.preload = 'metadata';
    setStatus('已切换为「流式缓冲」模式', 'info');
  } else {
    audio.preload = 'auto'; // auto 默认全量，由自适应逻辑按需降级
    setStatus('已切换为「自动」模式（自适应网络）', 'info');
  }
  setTimeout(() => { if (statusEl.textContent.includes('切换为')) setStatus(''); }, 2200);
}
preloadSwitch.addEventListener('click', (e) => {
  const span = e.target.closest('.preload-options span');
  const order = ['auto', 'full', 'stream'];
  let next;
  if (span) next = span.dataset.mode;
  else next = order[(order.indexOf(userPreloadMode) + 1) % order.length];
  applyPreloadMode(next);
});

// ---------- 初始化 ----------
function init() {
  renderPlaylist();
  applyPreloadMode('auto');
  if (MUSIC_FILES.length) loadTrack(0, true);
  audio.volume = 0.8;
}

function renderPlaylist() {
  playlistEl.innerHTML = '';
  MUSIC_FILES.forEach((track, i) => {
    const li = document.createElement('li');
    li.dataset.title = (track.title || '').toLowerCase();
    li.dataset.artist = (track.artist || '').toLowerCase();
    li.textContent = `${track.title} — ${track.artist}`;
    li.onclick = () => loadTrack(i);
    playlistEl.appendChild(li);
  });
}

function loadTrack(index, initial) {
  if (!MUSIC_FILES.length) return;
  currentIndex = index;
  const track = MUSIC_FILES[index];
  audio.src = track.file;
  audio.load(); // 显式触发解码器开始缓冲
  titleEl.textContent = track.title;
  artistEl.textContent = track.artist;
  [...playlistEl.children].forEach((li, i) => li.classList.toggle('active', i === index));
  progress.value = 0;
  bufferedBadge.textContent = '已缓冲 0%';
  bufferedText.textContent = '已缓冲 0:00 / 0:00';
  tooltipEl.textContent = '已缓冲 0:00 / 0:00';
  loadLyric(track);
  // 未播过则仅加载不自动播（避免首屏自动播放被浏览器拦截）
  if (!initial && isPlaying) {
    playPending = true;
    setStatus('加载中…');
    audio.play().catch(() => { /* 等待 canplay */ });
  } else {
    playPending = false;
  }
}

// ---------- 播放控制 ----------
function togglePlay() {
  if (!audio.src) return;
  if (isPlaying) audio.pause();
  else {
    playPending = true;
    setStatus(audio.readyState >= 3 ? '播放中' : '加载中…');
    audio.play().catch(() => { /* 等待缓冲 */ });
  }
}
function nextTrack() {
  if (shuffleMode) {
    let next; do { next = Math.floor(Math.random() * MUSIC_FILES.length); }
    while (next === currentIndex && MUSIC_FILES.length > 1);
    loadTrack(next);
  } else loadTrack((currentIndex + 1) % MUSIC_FILES.length);
  if (isPlaying) { playPending = true; audio.play().catch(()=>{}); }
}
function prevTrack() {
  loadTrack((currentIndex - 1 + MUSIC_FILES.length) % MUSIC_FILES.length);
  if (isPlaying) { playPending = true; audio.play().catch(()=>{}); }
}

// ---------- 事件 ----------
playBtn.onclick = togglePlay;
prevBtn.onclick = prevTrack;
nextBtn.onclick = nextTrack;

audio.onplay = () => { isPlaying = true; playBtn.textContent = '⏸'; vinyl.classList.add('playing'); };
audio.onpause = () => { isPlaying = false; playBtn.textContent = '▶'; vinyl.classList.remove('playing'); };

audio.oncanplay = () => {
  if (playPending) { playPending = false; setStatus(''); audio.play().catch(()=>{}); }
};

audio.onwaiting = () => {
  if (isPlaying) { setStatus('缓冲中…'); vinyl.classList.remove('playing'); }
};
audio.onplaying = () => { setStatus(''); vinyl.classList.add('playing'); };

audio.onerror = () => {
  setStatus(`音频加载失败，跳过…`, 'warn');
  playPending = false;
  setTimeout(() => { setStatus(''); nextTrack(); }, 1200);
};

audio.onended = () => {
  if (loopMode) { audio.currentTime = 0; audio.play().catch(()=>{}); }
  else { nextTrack(); if (isPlaying) audio.play().catch(()=>{}); }
};

// 进度 + 缓冲（rAF 节流）
let rafPending = false;
function updateProgress() {
  rafPending = false;
  const dur = audio.duration || 0;
  if (dur && isFinite(dur)) {
    const pct = (audio.currentTime / dur) * 100;
    progress.value = pct;
    // 缓冲范围
    let bufferedEnd = 0;
    if (audio.buffered.length) bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
    const bufPct = dur ? Math.min(100, (bufferedEnd / dur) * 100) : 0;
    const playedPct = (audio.currentTime / dur) * 100;
    progress.style.background =
      `linear-gradient(90deg,#e94560 0 ${playedPct}%,rgba(255,255,255,.45) ${playedPct}% ${bufPct}%,rgba(255,255,255,.16) ${bufPct}% 100%)`;
    bufferedBadge.textContent = `已缓冲 ${Math.round(bufPct)}%`;
    bufferedText.textContent = `已缓冲 ${formatTime(bufferedEnd)} / ${formatTime(dur)}`;
    tooltipEl.textContent = `已缓冲 ${formatTime(bufferedEnd)} / ${formatTime(dur)}`;
    // 顶部缓冲条：若未播完且缓冲没到 100%，显示加载进度
    if (bufPct < 100 && !isPlaying) { showBufferBar(bufPct); }
    else if (bufPct >= 100) { hideBufferBar(); }
    // 自适应评估（auto 模式下）
    if (userPreloadMode === 'auto') evaluateAdaptive(bufferedEnd, dur);
    // 歌词跟随
    highlightLyric(audio.currentTime);
  }
}
audio.ontimeupdate = () => { if (!rafPending) { rafPending = true; requestAnimationFrame(updateProgress); } };

function showBufferBar(pct) {
  bufferBar.classList.add('visible');
  bufferFill.style.width = pct + '%';
  bufferText.textContent = `加载中 ${Math.round(pct)}%`;
}
function hideBufferBar() { bufferBar.classList.remove('visible'); bufferFill.style.width = '100%'; }

// ---------- 自适应预加载 ----------
function evaluateAdaptive(bufferedEnd, dur) {
  const now = performance.now();
  if (now - lastBufferEval < 4000) return; // 每 4s 评估一次
  lastBufferEval = now;
  const ahead = bufferedEnd - audio.currentTime; // 缓冲区领先量
  if (ahead < 5 && dur > 15) {
    // 缓冲跟不上 → 降级为流式
    if (audio.preload !== 'metadata') {
      audio.preload = 'metadata';
      setStatus('网络较慢，已切换为流式缓冲', 'warn');
      setTimeout(() => { if (statusEl.textContent.includes('流式')) setStatus(''); }, 2600);
    }
  } else if (ahead > 25) {
    // 缓冲充裕 → 恢复全量
    if (audio.preload !== 'auto') {
      audio.preload = 'auto';
      setStatus('网络恢复，已恢复全量预加载', 'info');
      setTimeout(() => { if (statusEl.textContent.includes('恢复')) setStatus(''); }, 2600);
    }
  }
}

// ---------- 交互 ----------
progress.oninput = () => {
  if (audio.duration && isFinite(audio.duration)) {
    audio.currentTime = (progress.value / 100) * audio.duration;
  }
};
volumeSlider.oninput = () => { audio.volume = volumeSlider.value / 100; };

shuffleBtn.onclick = () => { shuffleMode = !shuffleMode; shuffleBtn.style.opacity = shuffleMode ? '1' : '0.5'; };
loopBtn.onclick    = () => { loopMode = !loopMode; loopBtn.style.opacity = loopMode ? '1' : '0.5'; };

document.onkeydown = (e) => {
  if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
  if (e.code === 'ArrowLeft') prevTrack();
  if (e.code === 'ArrowRight') nextTrack();
};

// ---------- 搜索 ----------
searchEl.oninput = () => {
  const q = searchEl.value.trim().toLowerCase();
  let any = false;
  [...playlistEl.children].forEach(li => {
    if (!li.classList.contains('no-match')) {
      const hit = !q || li.dataset.title.includes(q) || li.dataset.artist.includes(q);
      li.classList.toggle('hidden', !hit);
      if (hit) any = true;
    }
  });
  const existing = playlistEl.querySelector('.no-match');
  if (!any && q) {
    if (!existing) { const li = document.createElement('li'); li.className = 'no-match'; li.textContent = '没有找到匹配的歌曲'; playlistEl.appendChild(li); }
  } else if (existing) existing.remove();
};

// ---------- 歌词 ----------
let lyricLines = []; // {time,text}
function parseLyric(text) {
  const lines = [];
  const re = /\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,2}))?\]\s*(.*)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const t = (+m[1]) * 60 + (+m[2]) + (m[3] ? (+m[3]) / 100 : 0);
    if (m[4] !== undefined) lines.push({ time: t, text: m[4].trim() });
  }
  lines.sort((a, b) => a.time - b.time);
  return lines;
}
function loadLyric(track) {
  lyricLines = [];
  lyricPanel.innerHTML = '<div class="lyric-empty">暂无歌词</div>';
  if (!track) return;
  if (track.lyric) { renderLyric(parseLyric(track.lyric)); return; }
  if (track.lyricFile) {
    fetch(track.lyricFile).then(r => r.ok ? r.text() : '').then(t => {
      const lines = parseLyric(t);
      if (lines.length) renderLyric(lines);
    }).catch(() => {});
  }
}
function renderLyric(lines) {
  lyricLines = lines;
  if (!lines.length) { lyricPanel.innerHTML = '<div class="lyric-empty">暂无歌词</div>'; return; }
  lyricPanel.innerHTML = lines.map((l, i) => `<div class="lyric-line" data-i="${i}" data-time="${l.time}">${l.text || '&nbsp;'}</div>`).join('');
  lyricPanel.querySelectorAll('.lyric-line').forEach(el => {
    el.onclick = () => {
      const t = parseFloat(el.dataset.time);
      if (isFinite(t)) { audio.currentTime = t; if (!isPlaying) togglePlay(); }
    };
  });
}
function highlightLyric(time) {
  if (!lyricLines.length) return;
  let idx = 0;
  for (let i = 0; i < lyricLines.length; i++) if (time >= lyricLines[i].time) idx = i;
  const cur = lyricPanel.querySelector('.lyric-line.active');
  if (cur && +cur.dataset.i === idx) return;
  lyricPanel.querySelectorAll('.lyric-line').forEach(el => el.classList.remove('active'));
  const target = lyricPanel.querySelector(`.lyric-line[data-i="${idx}"]`);
  if (target) {
    target.classList.add('active');
    const panelH = lyricPanel.clientHeight;
    lyricPanel.scrollTop = target.offsetTop - panelH / 2 + target.clientHeight / 2;
  }
}

init();
