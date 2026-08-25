// ========== 在这里添加你的音乐文件 ==========
const MUSIC_FILES = [
  { file: 'music/song1.mp3', title: 'Song One', artist: 'Artist A' },
  { file: 'music/song2.mp3', title: 'Song Two', artist: 'Artist B' },
  { file: 'music/song3.mp3', title: 'Song Three', artist: 'Artist C' },
  // 继续加... 格式: { file: 'music/xxx.mp3', title: '歌名', artist: '歌手' }
];
// ==========================================

const audio = new Audio();
audio.preload = 'metadata'; // 仅预加载元数据，减少内存/流量，避免卡顿
let currentIndex = 0;
let isPlaying = false;
let shuffleMode = false;
let loopMode = false;

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

  // 高亮当前曲目
  [...playlistEl.children].forEach((li, i) => {
    if (li.classList.contains('no-result')) return;
    li.classList.toggle('active', i === index);
  });

  progress.value = 0;
  currentTimeEl.textContent = '0:00';
  durationEl.textContent = '0:00';
}

function togglePlay() {
  if (!audio.src) return;
  if (isPlaying) {
    audio.pause();
  } else {
    audio.play().catch(err => console.log('播放失败:', err));
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
  if (isPlaying) audio.play().catch(() => {});
}

function prevTrack() {
  loadTrack((currentIndex - 1 + MUSIC_FILES.length) % MUSIC_FILES.length);
  if (isPlaying) audio.play().catch(() => {});
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

// 进度更新（已通过 rAF 节流，避免频繁 DOM 写入导致卡顿）
audio.ontimeupdate = () => {
  if (!audio.duration) return;
  const ratio = (audio.currentTime / audio.duration) * 100;
  scheduleProgressUpdate(ratio, formatTime(audio.currentTime), formatTime(audio.duration));
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
