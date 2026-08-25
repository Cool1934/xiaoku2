// ========== 在这里添加你的音乐文件 ==========
const MUSIC_FILES = [
  { file: '战火燃烧(压声版).mp3', title: '战火燃烧(压声版)', artist: 'ku小酷' },
  { file: '春庭雪(0.9x版DJ Wave版).mp3', title: '春庭雪(0.9x版DJ Wave版)', artist: '邓寓君(等什么君)',
  lyric: '[ti:春庭雪 (0.9x版DJ Wave版)]\n[ar:邓寓君(等什么君)]\n[al:春庭雪 (DJ Wave版)]\n[00:00.00]春庭雪 (0.9x版DJ Wave版) - 邓寓君(等什么君)\n[00:02.87]词：清彦\n[00:03.41]曲：爆款\n[00:03.96]庭中梨花谢又一年\n[00:12.10]立清宵月华洒空阶\n[00:19.85]梦里笙箫奏旧乐\n[00:23.95]梦醒泪染胭脂面\n[00:28.64]小重山念一遍又一遍\n[00:37.66]闻更漏咽频教前尘辞长夜\n[00:45.33]久无眠深坐对宫檐\n[00:53.47]多情最是春庭雪\n[00:57.27]年年落满离人苑\n[01:01.95]薛涛笺上言若如初见\n[01:09.80]这一世\n[01:12.32]太漫长却止步咫尺天涯间\n[01:18.09]谁仍记那梨花若雪时节\n[01:26.58]我心匪石不可转\n[01:30.60]我心匪席不可卷\n[01:35.31]空凝眸情字深浅无解\n[02:54.71]庭中梨花谢又一年\n[03:02.85]立清宵月华洒空阶\n[03:10.65]梦里笙箫奏旧乐\n[03:14.78]梦醒泪染胭脂面\n[03:19.46]小重山念一遍又一遍\n[03:28.44]闻更漏咽频教前尘辞长夜\n[03:36.14]久无眠深坐对宫檐\n[03:44.29]多情最是春庭雪\n[03:48.11]年年落满离人苑\n[03:52.77]薛涛笺上言若如初见\n[04:00.75]这一世\n[04:03.30]太漫长却止步咫尺天涯间\n[04:08.92]谁仍记那梨花若雪时节\n[04:17.45]我心匪石不可转\n[04:21.42]我心匪席不可卷\n[04:26.16]空凝眸情字深浅无解\n[04:34.04]这一世\n[04:36.39]太漫长却止步咫尺天涯间\n[04:42.27]谁仍记那梨花若雪时节\n[04:50.62]我心匪石不可转\n[04:54.75]我心匪席不可卷\n[04:59.51]空凝眸情字深浅无解\n[05:08.01]春欲晚梨花谢又一年' },
  { file: '酷王（超然版）.mp3', title: '酷王（超然版）', artist: 'ku小酷' },
  // 继续加... 格式: { file: 'music/xxx.mp3', title: '歌名', artist: '歌手' }
];
// ==========================================

const audio = new Audio();
audio.preload = 'metadata'; // 仅预加载元数据，减少内存/流量，避免卡顿
let currentIndex = 0;
let isPlaying = false;
let shuffleMode = false;
let loopMode = false;
let lyricLines = []; // [{ time, text }] 当前歌曲解析后的歌词行
let lyricReady = false;

// ---------- 歌词解析 ----------
// 支持格式：每行 "[mm:ss]文本" 或 "[mm:ss.xx]文本"，按时间升序
function parseLyric(raw) {
  if (!raw) return [];
  const result = [];
  const re = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,2}))?\]\s*(.*)/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    const min = parseInt(m[1], 10);
    const sec = parseInt(m[2], 10);
    const t = min * 60 + sec + (m[3] ? parseInt(m[3], 10) / 100 : 0);
    const text = m[4].trim();
    if (text) result.push({ time: t, text });
  }
  result.sort((a, b) => a.time - b.time);
  return result;
}

function renderLyricPanel() {
  const scroll = document.getElementById('lyric-scroll');
  scroll.innerHTML = '';
  if (!lyricReady || lyricLines.length === 0) {
    const tip = document.createElement('div');
    tip.className = 'lyric-tip';
    tip.textContent = '暂无歌词';
    scroll.appendChild(tip);
    return;
  }
  lyricLines.forEach((line, i) => {
    const div = document.createElement('div');
    div.className = 'lyric-line';
    div.dataset.index = i;
    div.textContent = line.text;
    scroll.appendChild(div);
  });
}

function updateLyric(currentTime) {
  if (!lyricReady || lyricLines.length === 0) return;
  // 二分找当前时间对应的行（最后一行的 time <= currentTime）
  let lo = 0, hi = lyricLines.length - 1, active = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lyricLines[mid].time <= currentTime) { active = mid; lo = mid + 1; }
    else hi = mid - 1;
  }
  const scroll = document.getElementById('lyric-scroll');
  const lines = scroll.querySelectorAll('.lyric-line');
  lines.forEach((el, i) => {
    const isActive = i === active;
    if (el.classList.contains('active') !== isActive) {
      el.classList.toggle('active', isActive);
      if (isActive) {
        // 将当前行滚动到面板可视区中部
        const panel = document.getElementById('lyric-panel');
        const top = el.offsetTop - panel.clientHeight / 2 + el.clientHeight / 2;
        scroll.scrollTop = Math.max(0, top);
      }
    }
  });
}

// ---------- 加载状态提示 ----------
function setLoadStatus(msg) {
  const el = document.getElementById('load-status');
  if (!el) return;
  if (msg) { el.textContent = msg; el.classList.add('show'); }
  else { el.classList.remove('show'); }
}

// DOM
const playBtn = document.getElementById('play');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const shuffleBtn = document.getElementById('shuffle');
const loopBtn = document.getElementById('loop');
const progress = document.getElementById('progress');
const volumeSlider = document.getElementById('volume');
const currentTimeEl = document.getElementById('current-time');
const durationEl = document.getElementById('duration');
const titleEl = document.getElementById('title');
const artistEl = document.getElementById('artist');
const vinyl = document.getElementById('vinyl');
const playlistEl = document.getElementById('playlist');
const searchInput = document.getElementById('search');

// ---------- rAF 节流：把高频 DOM 写操作合并到一帧 ----------
let rafScheduled = false;
let pendingProgress = null; // { value, currentText, durationText }

function scheduleProgressUpdate(value, currentText, durationText) {
  pendingProgress = { value, currentText, durationText };
  if (rafScheduled) return;
  rafScheduled = true;
  requestAnimationFrame(flushProgressUpdate);
}

function flushProgressUpdate() {
  rafScheduled = false;
  if (!pendingProgress) return;
  const { value, currentText, durationText } = pendingProgress;
  // 仅值变化时写入，避免无效重绘
  if (progress.value !== value) progress.value = value;
  if (currentTimeEl.textContent !== currentText) currentTimeEl.textContent = currentText;
  if (durationEl.textContent !== durationText) durationEl.textContent = durationText;
  pendingProgress = null;
}

// ---------- 播放列表渲染 ----------
function renderPlaylist() {
  playlistEl.innerHTML = '';
  MUSIC_FILES.forEach((track, i) => {
    const li = document.createElement('li');
    li.dataset.title = track.title.toLowerCase();
    li.dataset.artist = track.artist.toLowerCase();
    li.textContent = `${track.title} — ${track.artist}`;
    li.onclick = () => { loadTrack(i); if (!isPlaying) togglePlay(); };
    playlistEl.appendChild(li);
  });
}

// ---------- 搜索（按歌曲名 + 歌手名） ----------
function applySearch() {
  const q = searchInput.value.trim().toLowerCase();
  let visibleCount = 0;
  [...playlistEl.children].forEach(li => {
    if (li.classList.contains('no-result')) return;
    const match = !q || li.dataset.title.includes(q) || li.dataset.artist.includes(q);
    li.classList.toggle('hidden', !match);
    if (match) visibleCount++;
  });
  // 无结果提示
  let tip = playlistEl.querySelector('.no-result');
  if (visibleCount === 0) {
    if (!tip) {
      tip = document.createElement('li');
      tip.className = 'no-result';
      tip.textContent = '没有找到匹配的歌曲';
      playlistEl.appendChild(tip);
    }
  } else if (tip) {
    tip.remove();
  }
}

searchInput.addEventListener('input', applySearch);

// ---------- 加载/播放控制 ----------
function loadTrack(index) {
  currentIndex = index;
  const track = MUSIC_FILES[index];
  audio.src = track.file;
  titleEl.textContent = track.title;
  artistEl.textContent = track.artist;

  // 歌词：支持 track.lyric（字符串）或 track.lyricFile（外部 .lrc 路径）
  lyricLines = parseLyric(track.lyric || '');
  lyricReady = lyricLines.length > 0;
  if (!lyricReady && track.lyricFile) {
    fetch(track.lyricFile).then(r => r.ok ? r.text() : '').then(raw => {
      lyricLines = parseLyric(raw);
      lyricReady = lyricLines.length > 0;
      renderLyricPanel();
    }).catch(() => {});
  } else {
    renderLyricPanel();
  }

  // 高亮当前曲目
  [...playlistEl.children].forEach((li, i) => {
    if (li.classList.contains('no-result')) return;
    li.classList.toggle('active', i === index);
  });

  progress.value = 0;
  currentTimeEl.textContent = '0:00';
  durationEl.textContent = '0:00';
  setLoadStatus('');

  // 显式触发加载，让解码器开始缓冲，避免首次 play 卡住
  try { audio.load(); } catch (e) {}
}

function togglePlay() {
  if (!audio.src) return;
  if (isPlaying) {
    audio.pause();
    return;
  }
  // 可播守卫：数据未准备好时先等待 canplay，避免 play() promise 挂起/卡死
  const tryPlay = () => {
    setLoadStatus('');
    const p = audio.play();
    if (p && typeof p.catch === 'function') p.catch(err => {
      console.log('播放失败:', err);
      setLoadStatus('播放失败，跳过...');
      setTimeout(() => nextTrack(), 800);
    });
  };
  if (audio.readyState >= 3 /* HAVE_FUTURE_DATA */) {
    tryPlay();
  } else {
    setLoadStatus('加载中…');
    const onCanPlay = () => { audio.removeEventListener('canplay', onCanPlay); tryPlay(); };
    audio.addEventListener('canplay', onCanPlay);
    // 兜底：2.5s 仍没 canplay 直接尝试（部分浏览器事件不可靠）
    setTimeout(() => { audio.removeEventListener('canplay', onCanPlay); if (!isPlaying) tryPlay(); }, 2500);
  }
}

function nextTrack() {
  if (shuffleMode) {
    let next;
    do { next = Math.floor(Math.random() * MUSIC_FILES.length); }
    while (next === currentIndex && MUSIC_FILES.length > 1);
    loadTrack(next);
  } else {
    loadTrack((currentIndex + 1) % MUSIC_FILES.length);
  }
  if (isPlaying) safePlay();
}

function prevTrack() {
  loadTrack((currentIndex - 1 + MUSIC_FILES.length) % MUSIC_FILES.length);
  if (isPlaying) safePlay();
}

// 切歌后续播：等待 canplay 再 play，避免缓冲未完成导致卡住
function safePlay() {
  const go = () => audio.play().catch(() => {});
  if (audio.readyState >= 3) go();
  else {
    const fn = () => { audio.removeEventListener('canplay', fn); go(); };
    audio.addEventListener('canplay', fn);
  }
}

// ---------- 事件绑定 ----------
playBtn.onclick = togglePlay;

audio.onplay = () => {
  isPlaying = true;
  playBtn.textContent = '⏸';
  vinyl.classList.add('playing');
};

audio.onpause = () => {
  isPlaying = false;
  playBtn.textContent = '▶';
  vinyl.classList.remove('playing');
};

audio.onended = () => {
  if (loopMode) {
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } else {
    nextTrack();
  }
};

// 缓冲等待：数据不足时暂停旋转、提示加载中，避免"假死"
audio.onwaiting = () => {
  setLoadStatus('加载中…');
  vinyl.classList.remove('playing');
};
// 缓冲恢复：数据充足继续播放并恢复旋转
audio.onplaying = () => {
  setLoadStatus('');
  if (isPlaying) vinyl.classList.add('playing');
};
// 加载/解码错误：提示并自动跳过下一首，防止卡死在当前曲
audio.onerror = () => {
  setLoadStatus('音频加载失败，跳过...');
  vinyl.classList.remove('playing');
  setTimeout(() => { if (MUSIC_FILES.length > 1) nextTrack(); }, 1000);
};

// 进度更新（已通过 rAF 节流，避免频繁 DOM 写入导致卡顿）
audio.ontimeupdate = () => {
  if (!audio.duration) return;
  const ratio = (audio.currentTime / audio.duration) * 100;
  scheduleProgressUpdate(ratio, formatTime(audio.currentTime), formatTime(audio.duration));
  updateLyric(audio.currentTime);
};

progress.oninput = () => {
  if (audio.duration) {
    audio.currentTime = (progress.value / 100) * audio.duration;
  }
};

volumeSlider.oninput = () => {
  audio.volume = volumeSlider.value / 100;
};

prevBtn.onclick = prevTrack;
nextBtn.onclick = nextTrack;

shuffleBtn.onclick = () => {
  shuffleMode = !shuffleMode;
  shuffleBtn.style.opacity = shuffleMode ? '1' : '0.5';
};

loopBtn.onclick = () => {
  loopMode = !loopMode;
  loopBtn.style.opacity = loopMode ? '1' : '0.5';
};

// 键盘快捷键
document.onkeydown = (e) => {
  if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
  if (e.code === 'ArrowLeft') prevTrack();
  if (e.code === 'ArrowRight') nextTrack();
};

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// ---------- 初始化 ----------
function init() {
  renderPlaylist();
  loadTrack(0);
  audio.volume = 0.8;
}

init();
