# My Music Player

一个可直接部署到 **GitHub Pages** 的精美本地音乐播放器（深色玻璃拟态 UI + 旋转黑胶）。

## 功能
- 播放 / 暂停、上一首 / 下一首、随机、单曲循环
- 进度条拖拽 + 实时时间、音量调节
- 键盘快捷键：`空格` 播放暂停，`←` `→` 切歌
- **搜索播放列表**：按歌曲名 / 歌手名实时过滤（播放列表顶部搜索框）
- 自适应手机 & 电脑，已做性能优化（rAF 节流、GPU 加速、弱设备降级），减少卡顿

## 快速开始

1. 把你的 mp3 文件放进 `music/` 目录。
2. 打开 `app.js`，在 `MUSIC_FILES` 里按格式添加歌曲：
   ```js
   { file: 'music/你的歌.mp3', title: '歌名', artist: '歌手' }
   ```
3. 将整个文件夹 push 到 GitHub 仓库。
4. 仓库 **Settings → Pages → Source 选 `Deploy from a branch` → Branch 选 `main` / `root` → Save**。
5. 访问 `https://你的用户名.github.io/仓库名` 即可。

## 项目结构
```
.
├── index.html   # 页面结构（含搜索框）
├── style.css    # 样式 + 性能优化
├── app.js       # 播放器核心 + 搜索逻辑
├── music/       # 放你的 mp3
└── README.md
```

> 整个代码体积仅约 12KB，远小于 25MB；音乐文件自行放入 `music/`，单文件建议 ≤50MB。
