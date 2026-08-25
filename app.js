// ========== 在这里添加你的音乐文件 ==========
const MUSIC_FILES = [
  { file: '战火燃烧(压声版).mp3', title: 'Song One', artist: 'Artist A' },
  { file: '春庭雪(0.9x版DJ Wave版).mp3', title: 'Song Two', artist: 'Artist B' },
  { file: '酷王（超然版）.mp3', title: 'Song Three', artist: 'Artist C' },
  // 继续加... 格式: { file: 'music/xxx.mp3', title: '歌名', artist: '歌手' }
];
// ==========================================

const audio = new Audio();
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

// 初始化
function init() {
  renderPlaylist();
  loadTrack(0);
  audio.volume = 0.8;
}

function renderPlaylist() {
  playlistEl.innerHTML = '';
  MUSIC_FILES.forEach((track, i) => {
    const li = document.createElement('li');
    li.textContent = `${track.title} — ${track.artist}`;
    li.onclick = () => { loadTrack(i); if (!isPlaying) togglePlay(); };
    playlistEl.appendChild(li);
  });
}

function loadTrack(index) {
  currentIndex = index;
  const track = MUSIC_FILES[index];
  audio.src = track.file;
  titleEl.textContent = track.title;
  artistEl.textContent = track.artist;

  // 高亮列表
  [...playlistEl.children].forEach((li, i) => {
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

// 事件
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

audio.ontimeupdate = () => {
  if (audio.duration) {
    progress.value = (audio.currentTime / audio.duration) * 100;
    currentTimeEl.textContent = formatTime(audio.currentTime);
    durationEl.textContent = formatTime(audio.duration);
  }
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

init();
