"use client";

interface SpeakButtonProps {
  word: string;
  accent: "us" | "uk";
  size?: "sm" | "md";
}

// 有道 TTS：type=1 英式 / type=2 美式。免费、无需 key、稳定。
function getAudioUrl(word: string, accent: "us" | "uk"): string {
  const type = accent === "us" ? 2 : 1;
  return `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=${type}`;
}

export function SpeakButton({ word, accent, size = "md" }: SpeakButtonProps) {
  function play() {
    const audio = new Audio(getAudioUrl(word, accent));
    audio.play().catch(() => {
      // 自动播放被浏览器阻止 / 网络异常等，静默失败
    });
  }

  const flag = accent === "us" ? "🇺🇸" : "🇬🇧";
  const label = accent === "us" ? "美式发音" : "英式发音";

  const sizeClass =
    size === "sm"
      ? "text-sm px-1.5 py-0.5"
      : "text-base px-2 py-1";

  return (
    <button
      type="button"
      onClick={play}
      aria-label={label}
      title={label}
      className={`${sizeClass} rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors`}
    >
      {flag}
    </button>
  );
}
