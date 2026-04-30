// 通用前奏检测：找到音频中第一句正式内容开始的时间
//
// 策略：
// 1. 找第一个 greeting 词（Hello / Hi / Welcome）的 startSec → 之前都是前奏
// 2. 没有 greeting 时，找音乐符号 ♪ 的范围作为前奏
// 3. 完全没有前奏特征 → introSec = 0

const MUSIC_RE = /[♪♫♩♬]/;

export function detectIntroSec(segments) {
  if (!segments.length) return 0;

  // 策略 1：在前 8 个 segment 的 words 里找 greeting
  for (const seg of segments.slice(0, 8)) {
    const words = seg.words || [];
    for (const w of words) {
      const clean = w.text.toLowerCase().replace(/[^a-z]/g, "");
      if (clean === "hello" || clean === "hi" || clean === "welcome") {
        return w.startSec > 1 ? Math.round(w.startSec * 10) / 10 : 0;
      }
    }
    // 没有逐词时间戳时退化到 segment 级别
    if (!words.length && /\b(hello|hi|welcome)\b/i.test(seg.text)) {
      return seg.startSec > 1 ? Math.round(seg.startSec * 10) / 10 : 0;
    }
  }

  // 策略 2：没有 greeting，看音乐符号
  let introEnd = 0;
  for (const seg of segments.slice(0, 6)) {
    for (const w of seg.words || []) {
      if (MUSIC_RE.test(w.text)) {
        introEnd = Math.max(introEnd, w.endSec);
      }
    }
  }
  if (introEnd > 0) {
    for (const seg of segments.slice(0, 6)) {
      if (seg.startSec < introEnd + 1.5 && seg.endSec <= introEnd + 3) {
        introEnd = Math.max(introEnd, seg.endSec);
      }
    }
  }

  return introEnd > 1 ? Math.round(introEnd * 10) / 10 : 0;
}
