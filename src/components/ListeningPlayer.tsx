"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatDuration,
  isFunctionWord,
  type DisplayMode,
  type Material,
  type Segment,
  type WordTiming,
} from "@/lib/listening";
import { SentenceActionBar } from "@/components/SentenceActionBar";
import { ShadowingPanel } from "@/components/ShadowingPanel";
import { speakEnglish } from "@/lib/tts";

const MODE_OPTIONS: { value: DisplayMode; label: string; hint: string }[] = [
  { value: "blind", label: "🔴 全盲", hint: "整段模糊，只看节奏" },
  { value: "half", label: "🟡 半显示", hint: "只显示功能词" },
  { value: "full", label: "🔵 全显示", hint: "完全清晰" },
];

const RATE_OPTIONS = [0.75, 1, 1.25];

type Token =
  | { kind: "word"; text: string }
  | { kind: "gap"; text: string };

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const re = /([A-Za-z]+(?:'[A-Za-z]+)?)|([^A-Za-z]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m[1]) tokens.push({ kind: "word", text: m[1] });
    else if (m[2]) tokens.push({ kind: "gap", text: m[2] });
  }
  return tokens;
}

function maskWord(w: string): string {
  return "_".repeat(Math.max(2, Math.min(8, w.length)));
}

export function ListeningPlayer({
  material,
  onWordClick,
}: {
  material: Material;
  onWordClick: (word: string) => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [mode, setMode] = useState<DisplayMode>("blind");
  const [audioMissing, setAudioMissing] = useState(false);
  const [realDuration, setRealDuration] = useState<number | null>(null);
  const [showShadowing, setShowShadowing] = useState(false);

  // 用 requestAnimationFrame 做 60fps 平滑时间更新
  const rafRef = useRef<number>(0);
  useEffect(() => {
    function tick() {
      const audio = audioRef.current;
      if (audio && !audio.paused) {
        setCurrentTime(audio.currentTime);
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const hasWhisperAlignment = material.segments.some(
    (s) => s.words && s.words.length > 0,
  );
  const scale =
    hasWhisperAlignment || !realDuration || material.durationSec <= 0
      ? 1
      : realDuration / material.durationSec;

  const scaledSegments = useMemo(
    () =>
      material.segments.map((s) => ({
        ...s,
        startSec: s.startSec * scale,
        endSec: s.endSec * scale,
        words: s.words?.map((w) => ({
          ...w,
          startSec: w.startSec * scale,
          endSec: w.endSec * scale,
        })),
      })),
    [material.segments, scale],
  );

  const displayDuration = realDuration ?? material.durationSec;
  const introSec = material.introSec ?? 0;

  // 前奏期间不移动光标
  const effectiveTime = currentTime < introSec ? -1 : currentTime;

  const activeIndex = useMemo(() => {
    if (effectiveTime < 0) return -1;
    return scaledSegments.findIndex(
      (s) => effectiveTime >= s.startSec && effectiveTime < s.endSec,
    );
  }, [effectiveTime, scaledSegments]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = rate;
  }, [rate]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => setAudioMissing(true));
    else audio.pause();
  }

  function jumpTo(sec: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = sec;
    setCurrentTime(sec);
  }

  const segmentStopRef = useRef<number | null>(null);
  function playSegment(seg: Segment) {
    const audio = audioRef.current;
    const usable =
      audio &&
      !audio.error &&
      audio.readyState >= 2 &&
      !isNaN(audio.duration) &&
      audio.duration > 0;
    if (!usable) {
      setAudioMissing(true);
      speakEnglish(seg.text);
      return;
    }
    if (segmentStopRef.current !== null) {
      window.clearTimeout(segmentStopRef.current);
      segmentStopRef.current = null;
    }
    audio.currentTime = seg.startSec;
    audio.play().catch(() => {
      setAudioMissing(true);
      speakEnglish(seg.text);
    });
    const durMs = ((seg.endSec - seg.startSec) / (audio.playbackRate || 1)) * 1000;
    segmentStopRef.current = window.setTimeout(() => {
      audio.pause();
      segmentStopRef.current = null;
    }, Math.max(200, durMs));
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-5">
        <audio
          ref={audioRef}
          src={material.audioUrl}
          preload="metadata"
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            if (!isNaN(d) && d > 0) setRealDuration(d);
          }}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={() => setAudioMissing(true)}
        />

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={togglePlay}
            className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium hover:opacity-90"
          >
            {playing ? "⏸ 暂停" : "▶ 播放"}
          </button>
          <span className="text-sm text-zinc-500 dark:text-zinc-400 tabular-nums">
            {formatDuration(currentTime)} / {formatDuration(displayDuration)}
          </span>
          <div className="ml-auto flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setShowShadowing((v) => !v)}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                showShadowing
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60"
              }`}
            >
              🎤 跟读
            </button>
            {RATE_OPTIONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRate(r)}
                className={`px-2.5 py-1 rounded-md font-medium ${
                  rate === r
                    ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                {r}x
              </button>
            ))}
          </div>
        </div>

        <input
          type="range"
          min={0}
          max={displayDuration}
          step={0.1}
          value={currentTime}
          onChange={(e) => jumpTo(Number(e.target.value))}
          className="w-full mt-3 accent-zinc-900 dark:accent-zinc-100"
        />

        {showShadowing && (
          <ShadowingPanel
            durationSec={displayDuration}
            onPlayFromStart={() => {
              jumpTo(0);
              const audio = audioRef.current;
              if (audio) audio.play().catch(() => setAudioMissing(true));
            }}
            onClose={() => setShowShadowing(false)}
          />
        )}

        {audioMissing && (
          <p className="mt-3 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 rounded-lg p-2.5 leading-relaxed">
            ⚠️ 音频文件未找到。请把 mp3 放到{" "}
            <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">
              public{material.audioUrl}
            </code>
            。下方文本依然可点词查词。
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap text-sm">
        <span className="text-zinc-500 dark:text-zinc-400">挖空：</span>
        {MODE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setMode(opt.value)}
            title={opt.hint}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              mode === opt.value
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 sm:p-7 space-y-4 text-lg leading-loose">
        {scaledSegments.map((seg, i) => (
          <div key={i}>
            <SegmentLine
              segment={seg}
              mode={mode}
              active={i === activeIndex}
              past={activeIndex > i}
              currentTime={effectiveTime}
              onClickWord={onWordClick}
              onJump={() => jumpTo(seg.startSec)}
            />
            <SentenceActionBar
              sentence={seg.text}
              source={{
                materialId: material.id,
                materialTitle: material.title,
                segmentIndex: i,
              }}
              visible={mode !== "blind"}
              onPlay={() => playSegment(seg)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 句子行 ────────────────────────────────────────── */

function SegmentLine({
  segment,
  mode,
  active,
  past,
  currentTime,
  onClickWord,
  onJump,
}: {
  segment: Segment;
  mode: DisplayMode;
  active: boolean;
  past: boolean;
  currentTime: number;
  onClickWord: (w: string) => void;
  onJump: () => void;
}) {
  const blurClass = mode === "blind" ? "blur-md select-none" : "";
  const hasWordTimings = !!segment.words && segment.words.length > 0;

  return (
    <p
      className={`relative rounded-lg transition-all px-2 py-1 -mx-2 ${
        active
          ? "bg-emerald-50/60 dark:bg-emerald-950/30"
          : ""
      }`}
    >
      <button
        type="button"
        onClick={onJump}
        title="跳到这一句"
        className="absolute -left-7 top-2 text-xs text-zinc-300 dark:text-zinc-700 hover:text-emerald-600 dark:hover:text-emerald-400 hidden sm:block"
      >
        ▶
      </button>
      <span className={blurClass}>
        {hasWordTimings
          ? renderKaraoke(segment, mode, currentTime, active, past, onClickWord)
          : renderFromText(segment.text, mode, past, onClickWord)}
      </span>
    </p>
  );
}

/* ── 卡拉OK歌词效果 ──────────────────────────────── */

function renderKaraoke(
  segment: Segment,
  mode: DisplayMode,
  currentTime: number,
  active: boolean,
  past: boolean,
  onClickWord: (w: string) => void,
) {
  const words = segment.words!;
  return words.map((w, i) => {
    const cleanWord = w.text.replace(/[^A-Za-z']/g, "");
    const isFn = isFunctionWord(cleanWord);
    const showMask = mode === "half" && !isFn && cleanWord.length > 0;

    if (showMask) {
      return (
        <span key={i}>
          <span className="text-zinc-400 dark:text-zinc-600 font-mono tracking-wider">
            {maskWord(cleanWord)}
          </span>
          {" "}
        </span>
      );
    }

    // 每个词的有效区间：从自己的 startSec 到下一个词的 startSec
    const zoneEnd = i < words.length - 1 ? words[i + 1].startSec : segment.endSec;
    let progress: number;
    if (past) {
      progress = 1;
    } else if (!active) {
      progress = 0;
    } else if (currentTime <= w.startSec) {
      progress = 0;
    } else if (currentTime >= zoneEnd) {
      progress = 1;
    } else {
      const d = zoneEnd - w.startSec;
      progress = d > 0 ? (currentTime - w.startSec) / d : 1;
    }

    return (
      <span key={i}>
        <KaraokeWord
          text={w.text}
          progress={progress}
          onClick={() => cleanWord && onClickWord(cleanWord)}
        />
        {" "}
      </span>
    );
  });
}

function KaraokeWord({
  text,
  progress,
  onClick,
}: {
  text: string;
  progress: number;
  onClick: () => void;
}) {
  if (progress <= 0) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="relative text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer transition-colors"
      >
        {text}
      </button>
    );
  }

  if (progress >= 1) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="relative text-emerald-600 dark:text-emerald-400 cursor-pointer"
      >
        {text}
      </button>
    );
  }

  // 正在播放的词：渐进填色 + 竖线光标
  const pct = `${Math.round(progress * 100)}%`;
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative inline-block cursor-pointer"
    >
      {/* 底层：未播放颜色 */}
      <span className="text-zinc-400 dark:text-zinc-500">{text}</span>
      {/* 顶层：已播放颜色，宽度随进度裁剪 */}
      <span
        className="absolute left-0 top-0 text-emerald-600 dark:text-emerald-400 overflow-hidden whitespace-nowrap pointer-events-none"
        style={{ width: pct }}
      >
        {text}
      </span>
      {/* 竖线光标 */}
      <span
        className="absolute top-0 w-[2px] h-full bg-emerald-500 dark:bg-emerald-400 pointer-events-none"
        style={{ left: pct }}
      />
    </button>
  );
}

/* ── 无逐词时间戳的降级渲染 ────────────────────────── */

function renderFromText(
  text: string,
  mode: DisplayMode,
  past: boolean,
  onClickWord: (w: string) => void,
) {
  const tokens = tokenize(text);
  return tokens.map((t, i) => {
    if (t.kind === "gap") return <span key={i}>{t.text}</span>;
    if (mode === "half" && !isFunctionWord(t.text)) {
      return (
        <span
          key={i}
          className="text-zinc-400 dark:text-zinc-600 font-mono tracking-wider"
        >
          {maskWord(t.text)}
        </span>
      );
    }
    return (
      <button
        key={i}
        type="button"
        onClick={() => onClickWord(t.text)}
        className={`rounded px-0.5 transition-colors cursor-pointer ${
          past
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
        }`}
      >
        {t.text}
      </button>
    );
  });
}
