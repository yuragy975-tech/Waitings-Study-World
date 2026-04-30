"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatDuration,
  isFunctionWord,
  type DisplayMode,
  type Material,
  type Segment,
} from "@/lib/listening";
import { useSentenceBook, type GrammarNote } from "@/lib/sentencebook";
import { ShadowingPanel } from "@/components/ShadowingPanel";
import { speakEnglish } from "@/lib/tts";

const MODE_OPTIONS: { value: DisplayMode; label: string; hint: string }[] = [
  { value: "blind", label: "🔴 全盲", hint: "整段模糊，只看节奏" },
  { value: "half", label: "🟡 半显示", hint: "只显示功能词" },
  { value: "full", label: "🔵 全显示", hint: "完全清晰" },
];

const RATE_OPTIONS = [0.75, 1, 1.25];

type Token = { kind: "word"; text: string } | { kind: "gap"; text: string };

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

type ParaphraseResp = { paraphrase: string; translation: string; grammar: GrammarNote[] };
type SelectionInfo = { text: string; x: number; y: number };
type ParaphraseState =
  | { phase: "loading"; original: string }
  | { phase: "done"; original: string; result: ParaphraseResp }
  | { phase: "error"; original: string; error: string };

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
  const [selectionInfo, setSelectionInfo] = useState<SelectionInfo | null>(null);
  const [paraphraseState, setParaphraseState] = useState<ParaphraseState | null>(null);

  const { addSentence, entries } = useSentenceBook();

  const rafRef = useRef<number>(0);
  useEffect(() => {
    function tick() {
      const audio = audioRef.current;
      if (audio && !audio.paused) setCurrentTime(audio.currentTime);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Dismiss floating toolbar when clicking outside
  useEffect(() => {
    if (!selectionInfo) return;
    function onMouseDown() {
      setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.toString().trim() === "") setSelectionInfo(null);
      }, 150);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [selectionInfo]);

  const hasWhisperAlignment = material.segments.some(s => s.words && s.words.length > 0);
  const scale = hasWhisperAlignment || !realDuration || material.durationSec <= 0
    ? 1 : realDuration / material.durationSec;

  const scaledSegments = useMemo(
    () => material.segments.map(s => ({
      ...s,
      startSec: s.startSec * scale,
      endSec: s.endSec * scale,
      words: s.words?.map(w => ({ ...w, startSec: w.startSec * scale, endSec: w.endSec * scale })),
    })),
    [material.segments, scale],
  );

  const displayDuration = realDuration ?? material.durationSec;
  const introSec = material.introSec ?? 0;
  const effectiveTime = currentTime < introSec ? -1 : currentTime;

  const activeIndex = useMemo(() => {
    if (effectiveTime < 0) return -1;
    return scaledSegments.findIndex(s => effectiveTime >= s.startSec && effectiveTime < s.endSec);
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
    const usable = audio && !audio.error && audio.readyState >= 2 && !isNaN(audio.duration) && audio.duration > 0;
    if (!usable) { setAudioMissing(true); speakEnglish(seg.text); return; }
    if (segmentStopRef.current !== null) { window.clearTimeout(segmentStopRef.current); segmentStopRef.current = null; }
    audio.currentTime = seg.startSec;
    audio.play().catch(() => { setAudioMissing(true); speakEnglish(seg.text); });
    const durMs = ((seg.endSec - seg.startSec) / (audio.playbackRate || 1)) * 1000;
    segmentStopRef.current = window.setTimeout(() => { audio.pause(); segmentStopRef.current = null; }, Math.max(200, durMs));
  }

  function handleTextMouseUp() {
    if (mode === "blind") return;
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? "";
    if (text.length < 3) { setSelectionInfo(null); return; }
    try {
      const range = sel!.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectionInfo({
        text,
        x: Math.max(80, Math.min(rect.left + rect.width / 2, window.innerWidth - 80)),
        y: rect.top + window.scrollY,
      });
    } catch { setSelectionInfo(null); }
  }

  async function handleParaphrase() {
    if (!selectionInfo) return;
    const original = selectionInfo.text;
    setSelectionInfo(null);
    setParaphraseState({ phase: "loading", original });
    try {
      const r = await fetch("/api/paraphrase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentence: original }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message ?? `HTTP ${r.status}`);
      setParaphraseState({ phase: "done", original, result: data as ParaphraseResp });
    } catch (e) {
      setParaphraseState({ phase: "error", original, error: e instanceof Error ? e.message : "网络错误" });
    }
  }

  function handleSaveToBook(withParaphrase: boolean) {
    if (!paraphraseState || paraphraseState.phase !== "done") return;
    const { original, result } = paraphraseState;
    addSentence({
      original,
      paraphrase: withParaphrase ? result.paraphrase : null,
      translation: withParaphrase ? result.translation : null,
      grammar: withParaphrase ? result.grammar : [],
      source: { materialId: material.id, materialTitle: material.title, segmentIndex: -1 },
    });
  }

  return (
    <div className="space-y-5">
      {/* Player controls */}
      <div className="rounded-2xl border border-card-border bg-card-bg p-4 sm:p-5">
        <audio
          ref={audioRef}
          src={material.audioUrl}
          preload="metadata"
          onLoadedMetadata={e => { const d = e.currentTarget.duration; if (!isNaN(d) && d > 0) setRealDuration(d); }}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={() => setAudioMissing(true)}
        />
        <div className="flex items-center gap-3 flex-wrap">
          <button type="button" onClick={togglePlay}
            className="px-4 py-2 rounded-xl bg-accent text-accent-fg font-medium hover:opacity-90">
            {playing ? "⏸ 暂停" : "▶ 播放"}
          </button>
          <span className="text-sm text-muted tabular-nums">
            {formatDuration(currentTime)} / {formatDuration(displayDuration)}
          </span>
          <div className="ml-auto flex items-center gap-1.5 text-xs">
            <button type="button" onClick={() => setShowShadowing(v => !v)}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                showShadowing
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60"
              }`}>
              🎤 跟读
            </button>
            {RATE_OPTIONS.map(r => (
              <button key={r} type="button" onClick={() => setRate(r)}
                className={`px-2.5 py-1 rounded-md font-medium ${
                  rate === r ? "bg-accent text-accent-fg" : "bg-accent-light text-muted hover:text-foreground"
                }`}>
                {r}x
              </button>
            ))}
          </div>
        </div>
        <input type="range" min={0} max={displayDuration} step={0.1} value={currentTime}
          onChange={e => jumpTo(Number(e.target.value))} className="w-full mt-3 accent-foreground" />
        {showShadowing && (
          <ShadowingPanel
            durationSec={displayDuration}
            onPlayFromStart={() => { jumpTo(0); audioRef.current?.play().catch(() => setAudioMissing(true)); }}
            onClose={() => setShowShadowing(false)}
          />
        )}
        {audioMissing && (
          <p className="mt-3 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 rounded-lg p-2.5 leading-relaxed">
            ⚠️ 音频文件未找到。请把 mp3 放到{" "}
            <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">public{material.audioUrl}</code>。
            下方文本依然可点词查词。
          </p>
        )}
      </div>

      {/* Display mode selector */}
      <div className="flex items-center gap-2 flex-wrap text-sm">
        <span className="text-muted">挖空：</span>
        {MODE_OPTIONS.map(opt => (
          <button key={opt.value} type="button" onClick={() => setMode(opt.value)} title={opt.hint}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              mode === opt.value
                ? "bg-accent text-accent-fg"
                : "bg-card-bg border border-card-border text-foreground hover:bg-accent-light"
            }`}>
            {opt.label}
          </button>
        ))}
        {mode !== "blind" && (
          <span className="text-xs text-muted/70 ml-1">划选文字可同义改写 · 点单词可查词</span>
        )}
      </div>

      {/* Continuous transcript */}
      <div
        className="rounded-2xl border border-card-border bg-card-bg p-5 sm:p-7 text-lg leading-loose"
        onMouseUp={handleTextMouseUp}
      >
        <span className={mode === "blind" ? "blur-md select-none pointer-events-none" : ""}>
          {scaledSegments.map((seg, i) => {
            const isActive = i === activeIndex;
            const isPast = activeIndex > i;
            const prevEndSec = i > 0 ? scaledSegments[i - 1].endSec : undefined;
            const hasWordTimings = !!seg.words && seg.words.length > 0;
            return (
              <span key={i}>
                {hasWordTimings
                  ? renderKaraoke(seg, prevEndSec, mode, effectiveTime, isActive, isPast, onWordClick)
                  : renderFromText(seg.text, mode, isPast, onWordClick)}
                {" "}
              </span>
            );
          })}
        </span>
      </div>

      {/* Floating selection toolbar */}
      {selectionInfo && (
        <div
          className="fixed z-40 -translate-x-1/2 -translate-y-full pointer-events-auto"
          style={{ left: selectionInfo.x, top: selectionInfo.y - 8 }}
        >
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); handleParaphrase(); }}
            className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-sm font-medium shadow-xl hover:bg-violet-700 transition-colors whitespace-nowrap"
          >
            ✨ 同义改写
          </button>
        </div>
      )}

      {/* Paraphrase modal */}
      {paraphraseState && (
        <ParaphraseModal
          state={paraphraseState}
          alreadySaved={entries.some(e => e.original.trim().toLowerCase() === paraphraseState.original.trim().toLowerCase())}
          onClose={() => setParaphraseState(null)}
          onSave={handleSaveToBook}
          onWordClick={onWordClick}
        />
      )}
    </div>
  );
}

function ParaphraseModal({
  state,
  alreadySaved,
  onClose,
  onSave,
  onWordClick,
}: {
  state: ParaphraseState;
  alreadySaved: boolean;
  onClose: () => void;
  onSave: (withParaphrase: boolean) => void;
  onWordClick: (w: string) => void;
}) {
  const [saved, setSaved] = useState(false);

  function save(withParaphrase: boolean) {
    onSave(withParaphrase);
    setSaved(true);
  }

  const isSaved = saved || alreadySaved;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative w-full max-w-lg rounded-2xl bg-card-bg border border-card-border p-5 sm:p-6 max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <button type="button" onClick={onClose}
          className="absolute top-4 right-4 text-xl text-muted hover:text-foreground leading-none">
          ×
        </button>
        <h3 className="font-semibold text-foreground mb-4">✨ 同义改写</h3>

        {/* Original sentence */}
        <div className="mb-4 p-3 rounded-xl bg-accent-light">
          <p className="text-xs text-muted mb-1.5">原句</p>
          <p className="text-sm text-foreground leading-relaxed">
            <ClickableWords text={state.original} onClickWord={onWordClick} />
          </p>
          <button type="button" onClick={() => speakEnglish(state.original)}
            className="mt-1.5 text-xs text-muted hover:text-foreground transition-colors">
            🔊 朗读原句
          </button>
        </div>

        {state.phase === "loading" && (
          <div className="text-center py-8 text-sm text-muted">AI 改写中…</div>
        )}

        {state.phase === "error" && (
          <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3">
            ⚠️ {state.error}
          </p>
        )}

        {state.phase === "done" && (
          <div className="space-y-3">
            {/* Paraphrase */}
            <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-900/50">
              <p className="text-xs text-violet-600 dark:text-violet-300 mb-1.5">改写版本（点单词可查词）</p>
              <p className="text-sm text-violet-900 dark:text-violet-100 leading-relaxed">
                <ClickableWords text={state.result.paraphrase} onClickWord={onWordClick} />
              </p>
              <button type="button" onClick={() => speakEnglish(state.result.paraphrase)}
                className="mt-1.5 text-xs text-violet-500 hover:text-violet-700 dark:hover:text-violet-300 transition-colors">
                🔊 朗读改写
              </button>
            </div>

            {/* Translation */}
            {state.result.translation && (
              <p className="text-sm text-muted px-1">🇨🇳 {state.result.translation}</p>
            )}

            {/* Grammar notes */}
            {state.result.grammar.length > 0 && (
              <div className="space-y-1.5">
                {state.result.grammar.map((g, i) => (
                  <div key={i} className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-950 px-3 py-2">
                    <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">{g.point}</span>
                    <span className="text-xs text-amber-900/80 dark:text-amber-100/80 ml-2">{g.explanation}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Save actions */}
            {isSaved ? (
              <p className="text-center text-sm text-emerald-700 dark:text-emerald-400 py-2">
                ✓ 已加入句子本
              </p>
            ) : (
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => save(true)}
                  className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors">
                  保存原句 + 改写
                </button>
                <button type="button" onClick={() => save(false)}
                  className="flex-1 py-2.5 rounded-xl bg-accent-light text-foreground text-sm font-medium hover:opacity-80 transition-opacity">
                  只保存原句
                </button>
              </div>
            )}
          </div>
        )}

        <button type="button" onClick={onClose}
          className="mt-4 w-full py-2.5 rounded-xl bg-accent-light text-foreground text-sm font-medium hover:opacity-80 transition-opacity">
          关闭
        </button>
      </div>
    </div>
  );
}

function ClickableWords({ text, onClickWord }: { text: string; onClickWord: (w: string) => void }) {
  const tokens = tokenize(text);
  return (
    <>
      {tokens.map((t, i) =>
        t.kind === "gap" ? (
          <span key={i}>{t.text}</span>
        ) : (
          <button key={i} type="button" onClick={() => onClickWord(t.text)}
            className="cursor-pointer hover:text-accent transition-colors">
            {t.text}
          </button>
        )
      )}
    </>
  );
}

function renderKaraoke(
  segment: Segment,
  prevSegmentEndSec: number | undefined,
  mode: DisplayMode,
  currentTime: number,
  active: boolean,
  past: boolean,
  onClickWord: (w: string) => void,
) {
  const words = prevSegmentEndSec !== undefined
    ? segment.words!.filter(w => w.startSec >= prevSegmentEndSec)
    : segment.words!;

  return words.map((w, i) => {
    const cleanWord = w.text.replace(/[^A-Za-z']/g, "");
    const isFn = isFunctionWord(cleanWord);
    const showMask = mode === "half" && !isFn && cleanWord.length > 0;

    if (showMask) {
      return (
        <span key={i}>
          <span className="text-muted/60 font-mono tracking-wider">{maskWord(cleanWord)}</span>
          {" "}
        </span>
      );
    }

    const zoneEnd = i < words.length - 1 ? words[i + 1].startSec : segment.endSec;
    let progress: number;
    if (past) progress = 1;
    else if (!active) progress = 0;
    else if (currentTime <= w.startSec) progress = 0;
    else if (currentTime >= zoneEnd) progress = 1;
    else { const d = zoneEnd - w.startSec; progress = d > 0 ? (currentTime - w.startSec) / d : 1; }

    return (
      <span key={i}>
        <KaraokeWord text={w.text} progress={progress} onClick={() => cleanWord && onClickWord(cleanWord)} />
        {" "}
      </span>
    );
  });
}

function KaraokeWord({ text, progress, onClick }: { text: string; progress: number; onClick: () => void }) {
  const color = progress <= 0
    ? "text-muted"
    : progress < 1
      ? "text-amber-500 dark:text-amber-400"
      : "text-foreground";
  return (
    <button type="button" onClick={onClick}
      className={`cursor-pointer transition-colors duration-150 ${color}`}>
      {text}
    </button>
  );
}

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
        <span key={i} className="text-muted/60 font-mono tracking-wider">{maskWord(t.text)}</span>
      );
    }
    return (
      <button key={i} type="button" onClick={() => onClickWord(t.text)}
        className={`rounded px-0.5 transition-colors cursor-pointer ${past ? "text-foreground" : "text-muted hover:text-foreground"}`}>
        {t.text}
      </button>
    );
  });
}
