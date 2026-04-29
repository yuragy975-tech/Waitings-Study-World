"use client";

let cached: SpeechSynthesisVoice | null = null;

function pickBestUSVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined") return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  // 优先顺序：Google US > 系统 premium > 任何 en-US > 任何 en-*
  const prefs: ((v: SpeechSynthesisVoice) => boolean)[] = [
    (v) => /Google US English/i.test(v.name),
    (v) => /Samantha/i.test(v.name) && v.lang === "en-US",
    (v) => /Ava|Allison|Susan|Karen|Zira|Aria/i.test(v.name) && v.lang.startsWith("en"),
    (v) => /Microsoft.*English.*United States/i.test(v.name),
    (v) => /Alex/i.test(v.name),
    (v) => v.lang === "en-US",
    (v) => v.lang.startsWith("en"),
  ];

  for (const test of prefs) {
    const v = voices.find(test);
    if (v) return v;
  }
  return null;
}

export function speakEnglish(text: string, opts: { rate?: number } = {}) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  synth.cancel();

  const fire = () => {
    if (!cached) cached = pickBestUSVoice();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = opts.rate ?? 0.95;
    if (cached) u.voice = cached;
    synth.speak(u);
  };

  // Chrome 首次加载时 voices 是空的，要等 voiceschanged
  if (synth.getVoices().length === 0) {
    const handler = () => {
      synth.removeEventListener("voiceschanged", handler);
      cached = pickBestUSVoice();
      fire();
    };
    synth.addEventListener("voiceschanged", handler);
    synth.getVoices(); // 触发加载
    return;
  }

  fire();
}
