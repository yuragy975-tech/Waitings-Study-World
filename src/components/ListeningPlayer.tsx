"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatDuration,
  isFunctionWord,
  type DisplayMode,
  type Material,
  type Segment,
} from "@/lib/listening";
import { SentenceActionBar } from "@/components/SentenceActionBar";
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

  const activeIndex = useMemo(() => {
    return material.segments.findIndex(
      (s) => currentTime >= s.startSec && currentTime < s.endSec,
    );
  }, [currentTime, material.segments]);

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

  // 播放某一段（用真音频，到 endSec 自动停）
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
      // 真音频不可用，用最好的美式 TTS 兜底
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
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
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
            {formatDuration(currentTime)} / {formatDuration(material.durationSec)}
          </span>
          <div className="ml-auto flex items-center gap-1.5 text-xs">
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
          max={material.durationSec}
          step={0.1}
          value={currentTime}
          onChange={(e) => jumpTo(Number(e.target.value))}
          className="w-full mt-3 accent-zinc-900 dark:accent-zinc-100"
        />

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
        {material.segments.map((seg, i) => (
          <div key={i}>
            <SegmentLine
              segment={seg}
              mode={mode}
              active={i === activeIndex}
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

function SegmentLine({
  segment,
  mode,
  active,
  onClickWord,
  onJump,
}: {
  segment: Segment;
  mode: DisplayMode;
  active: boolean;
  onClickWord: (w: string) => void;
  onJump: () => void;
}) {
  const tokens = useMemo(() => tokenize(segment.text), [segment.text]);

  const blurClass =
    mode === "blind"
      ? "blur-md select-none"
      : active
        ? ""
        : "";

  return (
    <p
      className={`relative rounded-lg transition-all px-2 py-1 -mx-2 ${
        active
          ? "bg-emerald-50 dark:bg-emerald-950/40 ring-2 ring-emerald-400 dark:ring-emerald-700"
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
        {tokens.map((t, i) => {
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
              className="hover:bg-emerald-100 dark:hover:bg-emerald-900/50 hover:text-emerald-900 dark:hover:text-emerald-200 rounded px-0.5 transition-colors cursor-pointer"
            >
              {t.text}
            </button>
          );
        })}
      </span>
    </p>
  );
}
