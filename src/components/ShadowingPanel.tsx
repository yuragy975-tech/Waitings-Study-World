"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";

type Phase = "playing" | "ready" | "recording" | "done";

export function ShadowingPanel({
  durationSec,
  onPlayFromStart,
  onClose,
}: {
  durationSec: number;
  onPlayFromStart: () => void;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("playing");
  const [elapsed, setElapsed] = useState(0);
  const [micError, setMicError] = useState(false);
  const { audioUrl, analyserRef, start, stop, reset } = useAudioRecorder();

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | undefined>(undefined);

  function clearAll() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    clearInterval(intervalRef.current);
    if (animFrameRef.current !== undefined) cancelAnimationFrame(animFrameRef.current);
  }

  function addTimer(fn: () => void, ms: number) {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
  }

  function drawWaveform() {
    const canvas = canvasRef.current;
    if (!canvas || !analyserRef.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const frame = () => {
      if (!analyserRef.current) return;
      const data = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteTimeDomainData(data);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.strokeStyle = "#fca5a5";
      ctx.lineWidth = 1;
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      ctx.beginPath();
      const sliceW = canvas.width / data.length;
      let x = 0;
      for (let i = 0; i < data.length; i++) {
        const y = (data[i] / 128) * (canvas.height / 2);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceW;
      }
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2;
      ctx.stroke();
      animFrameRef.current = requestAnimationFrame(frame);
    };
    animFrameRef.current = requestAnimationFrame(frame);
  }

  const doStart = useCallback(() => {
    clearAll();
    reset();
    setMicError(false);
    setElapsed(0);
    setPhase("playing");
    onPlayFromStart();

    const playMs = Math.max(2000, durationSec * 1000 + 1000);
    addTimer(() => {
      setPhase("ready");
      addTimer(() => {
        setPhase("recording");
        setElapsed(0);
        start().then((ok) => {
          if (!ok) {
            setMicError(true);
            setPhase("done");
            return;
          }
          requestAnimationFrame(() => drawWaveform());

          intervalRef.current = setInterval(() => {
            setElapsed((e) => +(e + 0.1).toFixed(1));
          }, 100);

          const recMs = Math.max(2000, durationSec * 1000 + 500);
          addTimer(() => {
            stop();
            clearInterval(intervalRef.current);
            if (animFrameRef.current !== undefined) cancelAnimationFrame(animFrameRef.current);
            setPhase("done");
          }, recMs);
        });
      }, 1200);
    }, playMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationSec, onPlayFromStart]);

  useEffect(() => {
    doStart();
    return () => clearAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleManualStop() {
    stop();
    clearAll();
    if (animFrameRef.current !== undefined) cancelAnimationFrame(animFrameRef.current);
    setPhase("done");
  }

  function skipToRecord() {
    clearAll();
    reset();
    setMicError(false);
    setElapsed(0);
    setPhase("ready");
    addTimer(() => {
      setPhase("recording");
      start().then((ok) => {
        if (!ok) { setMicError(true); setPhase("done"); return; }
        requestAnimationFrame(() => drawWaveform());
        intervalRef.current = setInterval(() => {
          setElapsed((e) => +(e + 0.1).toFixed(1));
        }, 100);
        const recMs = Math.max(2000, durationSec * 1000 + 500);
        addTimer(() => {
          stop();
          clearInterval(intervalRef.current);
          if (animFrameRef.current !== undefined) cancelAnimationFrame(animFrameRef.current);
          setPhase("done");
        }, recMs);
      });
    }, 1200);
  }

  const pct = Math.min(100, (elapsed / durationSec) * 100);

  return (
    <div className="mt-4 rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-red-700 dark:text-red-300">
          🎤 镜像跟读
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-muted hover:text-foreground px-1.5 py-0.5 rounded hover:bg-accent-light"
        >
          ✕ 关闭
        </button>
      </div>

      {phase === "playing" && (
        <div className="space-y-2">
          <p className="text-sm text-red-600 dark:text-red-400 animate-pulse">
            ▶ 原声播放中，请认真听全篇...
          </p>
          <button
            type="button"
            onClick={skipToRecord}
            className="text-xs px-3 py-1.5 rounded-lg bg-accent-light text-muted hover:opacity-80"
          >
            跳过，直接跟读 →
          </button>
        </div>
      )}

      {phase === "ready" && (
        <p className="text-base font-bold text-red-600 dark:text-red-400 animate-pulse text-center py-2">
          准备跟读...
        </p>
      )}

      {phase === "recording" && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
            <span className="text-sm text-red-700 dark:text-red-300 font-medium tabular-nums">
              录音中 {elapsed.toFixed(1)}s / {durationSec.toFixed(0)}s
            </span>
            <button
              type="button"
              onClick={handleManualStop}
              className="ml-auto text-xs px-3 py-1.5 rounded-lg bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200 hover:bg-red-300 dark:hover:bg-red-800"
            >
              停止录音
            </button>
          </div>
          {/* progress bar */}
          <div className="h-1.5 w-full bg-red-100 dark:bg-red-900/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-400 dark:bg-red-500 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <canvas
            ref={canvasRef}
            width={600}
            height={56}
            className="w-full rounded-xl bg-card-bg border border-red-100 dark:border-red-900"
          />
        </div>
      )}

      {phase === "done" && (
        <div className="space-y-2.5">
          {micError ? (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              ⚠️ 无法访问麦克风，请在浏览器设置中允许麦克风权限后重试。
            </p>
          ) : audioUrl ? (
            <>
              <p className="text-xs text-muted font-medium">你的跟读录音：</p>
              <audio controls src={audioUrl} className="w-full" />
            </>
          ) : (
            <p className="text-sm text-muted animate-pulse">处理中...</p>
          )}
          <div className="flex gap-2 flex-wrap pt-1">
            <button
              type="button"
              onClick={doStart}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60 font-medium"
            >
              🔄 重新来一遍
            </button>
            <button
              type="button"
              onClick={skipToRecord}
              className="text-xs px-3 py-1.5 rounded-lg bg-accent-light text-foreground hover:opacity-80"
            >
              🎤 直接再录一遍
            </button>
            <button
              type="button"
              onClick={() => { onPlayFromStart(); }}
              className="text-xs px-3 py-1.5 rounded-lg bg-accent-light text-foreground hover:opacity-80"
            >
              🔊 再听原声
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
