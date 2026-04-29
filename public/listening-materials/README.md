# 怎么加新素材

每个素材是一个**子文件夹**，文件夹名 = 素材 id（只能用 `a-z 0-9 _ -`，不能用中文/空格）。

## 标准结构

```
public/listening-materials/
├── bbc-six-min-2026-01/      <- 这个文件夹名就是 id
│   ├── audio.mp3              <- 音频文件
│   └── meta.json              <- 元数据 + 字幕 + 时间戳
└── ted-short-talk/
    ├── audio.mp3
    └── meta.json
```

## meta.json 格式

```json
{
  "title": "Why People Love Coffee",
  "source": "BBC 6 Minute English",
  "level": "beginner",
  "durationSec": 360,
  "coverGradient": "from-amber-400 via-orange-500 to-rose-500",
  "audioFile": "audio.mp3",
  "segments": [
    { "startSec": 0, "endSec": 6, "text": "Coffee is one of the most popular drinks." },
    { "startSec": 6, "endSec": 12, "text": "Many people drink it every morning." }
  ]
}
```

字段说明：

| 字段 | 类型 | 说明 |
|---|---|---|
| `title` | string | 素材标题（卡片大字） |
| `source` | string | 来源（卡片小字，如 BBC、TED、CNN） |
| `level` | `"beginner"` / `"intermediate"` / `"advanced"` | 难度三档：初级/中级/高级 |
| `durationSec` | number | 总时长（秒）。建议跟最后一段 `endSec` 对齐 |
| `coverGradient` | string | Tailwind 渐变 class（不包含 `bg-gradient-to-br`），见下方调色板 |
| `audioFile` | string（可选） | 音频文件名，默认 `audio.mp3` |
| `segments` | array | 句子级时间戳（核心数据） |

## 推荐调色板

复制下面任一行作为 `coverGradient` 的值：

```
from-amber-400 via-orange-500 to-rose-500       ← 暖橙（食物/生活）
from-sky-400 via-blue-500 to-indigo-600         ← 海洋（科技/商业）
from-emerald-400 via-teal-500 to-cyan-600       ← 自然（环保/旅行）
from-purple-400 via-fuchsia-500 to-pink-500     ← 紫粉（艺术/文化）
from-yellow-400 via-amber-500 to-orange-500     ← 阳光（教育/儿童）
from-zinc-700 via-zinc-800 to-zinc-900          ← 暗色（新闻/严肃）
```

## 怎么从 BBC 6 Minute English 拿素材

1. 打开 https://www.bbc.co.uk/learningenglish/english/features/6-minute-english
2. 选一期 → 点 `Download audio` 下载 mp3
3. 点 `Download transcript` 下载 pdf 文字稿
4. 新建文件夹 `public/listening-materials/bbc-2026-01-15/`（自取一个 id）
5. 把 mp3 改名 `audio.mp3` 放进去
6. 自己把 pdf 里的文字稿手工切成 `segments`：
   - 每句一行，估一下每句什么时刻开始（用 mp3 播放器看时间戳）
   - **不需要精确到毫秒**，整秒就行
7. 写好 `meta.json`，刷新 `/listening` 就出现了

## 时间戳偷懒法

如果懒得对齐时间戳，可以**全部按等长平均分**：

- 假设音频 60 秒、共 12 句 → 每句 5 秒
- `segments` 写成 `{startSec: 0, endSec: 5}`、`{startSec: 5, endSec: 10}`…
- 跟随光标会不太准，但功能能跑

未来阶段 3b 会有 AI 自动切句对齐，那时候这个工作就免了。

## 重要

- 素材**不会**自动提交到 GitHub —— mp3 太大，已在 `.gitignore` 里
- 但 `meta.json` 是文字，会被提交，所以**别在 meta.json 里写敏感信息**
- 版权：BBC/TED 个人学习 OK，公开发布需走授权
